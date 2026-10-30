import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

/**
 * Audits session logs for attachment references whose backing objects are
 * missing from the local attachments store (#657).
 *
 * When a session log references `attachmentId: sha256:…` but the object is
 * absent from `attachments/v1`, every model request for that session fails
 * deep inside the LLM transport and surfaces as a misleading `TRANSPORT`
 * error after five doomed retries. Walking the logs up front turns that into
 * a precise, actionable report.
 */

export interface AttachmentRef {
  sessionId: string
  attachmentId: string
  name?: string
  mediaType?: string
}

export interface AttachmentRefAudit {
  sessionsScanned: number
  /** Unique (session, attachmentId) pairs found across all session logs. */
  references: number
  missing: AttachmentRef[]
}

const SESSION_LOG_SUFFIX = '.jsonl'
const ATTACHMENTS_V1 = join('attachments', 'v1')
/** Object trees that may back a sha256 attachment reference. */
const OBJECT_TREES = ['objects', 'file-objects'] as const
const ATTACHMENT_ID_PATTERN = /^sha256:[a-f0-9]{64}$/

export async function auditAttachmentReferences(home: string): Promise<AttachmentRefAudit> {
  const logFiles = await listSessionLogFiles(join(home, 'sessions'))
  const missing: AttachmentRef[] = []
  const sessionIds = new Set<string>()
  let references = 0

  for (const logFile of logFiles) {
    const sessionId = basename(dirname(logFile))
    sessionIds.add(sessionId)
    const refs = await collectAttachmentRefs(logFile)
    for (const ref of refs.values()) {
      references += 1
      if (!(await attachmentObjectExists(home, ref.attachmentId))) {
        missing.push({ sessionId, ...ref })
      }
    }
  }

  return { sessionsScanned: sessionIds.size, references, missing }
}

/**
 * Human-readable import-log lines for an audit. Empty when every referenced
 * object is present.
 */
export function formatAttachmentGaps(audit: AttachmentRefAudit, limit = 5): string[] {
  if (audit.missing.length === 0) return []
  const sessions = new Set(audit.missing.map((ref) => ref.sessionId))
  const lines = [
    `warning: ${audit.missing.length} attachment reference(s) in ${sessions.size} session(s) point to objects missing from attachments/v1`,
    'sessions referencing missing objects fail every model request with a misleading transport error; restore the objects or remove the references'
  ]
  for (const ref of audit.missing.slice(0, limit)) {
    const label = ref.name ? ` (${ref.name})` : ''
    lines.push(`  ${ref.sessionId}: ${ref.attachmentId}${label}`)
  }
  if (audit.missing.length > limit) {
    lines.push(`  … and ${audit.missing.length - limit} more`)
  }
  return lines
}

async function listSessionLogFiles(root: string): Promise<string[]> {
  const logFiles: string[] = []
  const stack = [root]
  while (stack.length > 0) {
    const directory = stack.pop() as string
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        stack.push(path)
      } else if (entry.name.endsWith(SESSION_LOG_SUFFIX)) {
        logFiles.push(path)
      }
    }
  }
  return logFiles.sort()
}

async function collectAttachmentRefs(logFile: string): Promise<Map<string, Omit<AttachmentRef, 'sessionId'>>> {
  const refs = new Map<string, Omit<AttachmentRef, 'sessionId'>>()
  const text = await readFile(logFile, 'utf8').catch(() => '')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    let value: unknown
    try {
      value = JSON.parse(trimmed)
    } catch {
      continue
    }
    collectFromValue(value, refs)
  }
  return refs
}

function collectFromValue(value: unknown, refs: Map<string, Omit<AttachmentRef, 'sessionId'>>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectFromValue(item, refs)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (typeof record.attachmentId === 'string' && ATTACHMENT_ID_PATTERN.test(record.attachmentId)) {
    const existing = refs.get(record.attachmentId)
    const name = typeof record.name === 'string' ? record.name : undefined
    const mediaType = typeof record.mediaType === 'string' ? record.mediaType : undefined
    if (!existing) {
      refs.set(record.attachmentId, { attachmentId: record.attachmentId, name, mediaType })
    } else {
      refs.set(record.attachmentId, {
        attachmentId: record.attachmentId,
        name: existing.name ?? name,
        mediaType: existing.mediaType ?? mediaType
      })
    }
  }
  for (const child of Object.values(record)) collectFromValue(child, refs)
}

async function attachmentObjectExists(home: string, attachmentId: string): Promise<boolean> {
  const digest = attachmentId.slice('sha256:'.length)
  for (const tree of OBJECT_TREES) {
    const objectPath = join(home, ATTACHMENTS_V1, tree, digest.slice(0, 2), digest)
    try {
      if ((await stat(objectPath)).isFile()) return true
    } catch {
      // Try the next tree.
    }
  }
  return false
}
