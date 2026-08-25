import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { zstdCompress, constants as zstdConstants } from 'node:zlib'
import { afterAll, describe, expect, it } from 'vitest'

import { Context } from '@deepseek-ai/cordis'

// Import the patched backend; patch-package guarantees the file has our
// skip-on-corruption guards applied. We use a dynamic import so the test
// stays in TypeScript's ESM flow.
const jsonlModule = (await import(
  '@deepseek-ai/dsh-session-persistence-jsonl'
)) as typeof import('@deepseek-ai/dsh-session-persistence-jsonl')

const zstdCompressAsync = promisify(zstdCompress)

const roots: string[] = []

async function scratch(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `dsh-persist-skip-${name}-`))
  roots.push(root)
  return root
}

afterAll(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true }).catch(() => undefined)
})

/**
 * Replicate the backend's projectKey() and encodeSegment() encodings. The
 * backend keeps them private; duplicating them here keeps the test
 * self-contained without re-exporting internals. The mirrors are intentionally
 * minimal: they cover the inputs the suite actually uses.
 */
function projectKey(cwd: string): string {
  if (cwd.length === 0) throw new Error('cannot encode an empty project path')
  let readable = ''
  let separatorRun = false
  for (let i = 0; i < cwd.length; i++) {
    const code = cwd.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!separatorRun) readable += '-'
      separatorRun = true
    } else if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) {
      readable += ch
      separatorRun = false
    } else {
      readable += '~' + code.toString(16).toUpperCase().padStart(4, '0')
      separatorRun = false
    }
  }
  return `--${(readable.replace(/^-+/, '') || 'root').slice(0, 251)}--`
}

function encodeSegment(raw: string): string {
  if (raw.length === 0) throw new Error('cannot encode an empty path segment')
  if (raw === '.') return '~002E'
  if (raw === '..') return '~002E~002E'
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) out += ch
    else out += '~' + code.toString(16).toUpperCase().padStart(4, '0')
  }
  return out
}

function sessionDir(root: string, cwd: string, id: string): string {
  return join(root, projectKey(cwd), encodeSegment(id))
}

interface HeaderRecord {
  type: 'session'
  version: number
  id: string
  createdAt: number
  delegationDepth: number
  cwd: string
}

async function writeValidSession(
  root: string,
  header: HeaderRecord
): Promise<string> {
  const dir = sessionDir(root, header.cwd, header.id)
  await mkdir(dir, { recursive: true })
  const frame = await zstdCompressAsync(Buffer.from(JSON.stringify(header) + '\n', 'utf8'), {
    params: { [zstdConstants.ZSTD_c_checksumFlag]: 1 }
  })
  const path = join(dir, 'session.jsonl.zstd')
  await writeFile(path, frame)
  return path
}

/** Place a file that fails the Zstandard magic-number check, which is the
 *  fastest, cheapest reproduction of the bug we patch against. */
async function writeCorruptSession(root: string, id: string, cwd: string): Promise<string> {
  const dir = sessionDir(root, cwd, id)
  await mkdir(dir, { recursive: true })
  const path = join(dir, 'session.jsonl.zstd')
  await writeFile(path, Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x00, 0x00, 0x00]))
  return path
}

function makeBackend(root: string): {
  backend: InstanceType<typeof jsonlModule.JsonlSessionPersistence>
  warnings: string[]
} {
  const warnings: string[] = []
  // A minimal cordis context that captures logger.warn output for assertions.
  // The PersistenceCoordinator expects `ctx.sessions.list()`; we expose a stub
  // service with no live sessions so the read path can be exercised without
  // spinning up the live-session machinery.
  const ctx = new Context()
  const originalWarn = ctx.logger.warn.bind(ctx.logger)
  ctx.logger.warn = ((message: string) => {
    warnings.push(String(message))
    return originalWarn(message)
  }) as typeof ctx.logger.warn
  const noopSessions = { list: () => [] as Array<{ id: string }> }
  // The cordis proxy lets us register arbitrary services on the context.
  ;(ctx as unknown as { provide: (name: string, value: unknown) => void }).provide(
    'sessions',
    noopSessions
  )
  const backend = new jsonlModule.JsonlSessionPersistence(ctx, {
    root,
    packChunks: false,
    compression: 'zstd',
    preparedSessionCacheSize: 1,
    writeBatchMaxDelayMs: 200
  })
  return { backend, warnings }
}

describe('JSONL session persistence list() corruption resilience', () => {
  it('skips a corrupt session log and still returns the readable ones', async () => {
    const root = await scratch('skip')
    const validHeader: HeaderRecord = {
      type: 'session',
      version: 0,
      id: '00000000-0000-4000-8000-000000000001',
      createdAt: 1_700_000_000_000,
      delegationDepth: 0,
      cwd: '/tmp/proj-a'
    }
    await writeValidSession(root, validHeader)
    await writeCorruptSession(root, '00000000-0000-4000-8000-000000000002', '/tmp/proj-a')

    const { backend, warnings } = makeBackend(root)
    const headers = await backend.list()

    // Only the valid session is returned; the corrupt one is silently dropped
    // so the workspace loader can still build a workspace around the rest.
    expect(headers.map((h) => h.id)).toEqual([validHeader.id])
    expect(headers[0]?.cwd).toBe('/tmp/proj-a')

    // A single warning explains why the second session is missing; the
    // operator can still locate the file from the path in the message.
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/skipping unreadable session log/)
    expect(warnings[0]).toMatch(/00000000-0000-4000-8000-000000000002/)
  })

  it('survives a workspace where every session log is unreadable', async () => {
    const root = await scratch('all-corrupt')
    await writeCorruptSession(root, '00000000-0000-4000-8000-000000000003', '/tmp/proj-b')
    await writeCorruptSession(root, '00000000-0000-4000-8000-000000000004', '/tmp/proj-b')

    const { backend, warnings } = makeBackend(root)
    const headers = await backend.list()

    expect(headers).toEqual([])
    expect(warnings).toHaveLength(2)
  })
})
