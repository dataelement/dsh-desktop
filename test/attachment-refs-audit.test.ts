import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { auditAttachmentReferences, formatAttachmentGaps } from '../src/main/state/attachment-refs'

const HEX_A = `ab${'0'.repeat(62)}`
const HEX_B = `cd${'1'.repeat(62)}`
const HEX_C = `ef${'2'.repeat(62)}`

const ID_A = `sha256:${HEX_A}`
const ID_B = `sha256:${HEX_B}`
const ID_C = `sha256:${HEX_C}`

let home: string | undefined

async function createHome(): Promise<string> {
  home = await mkdtemp(join(tmpdir(), 'dsh-attachment-audit-'))
  return home
}

async function writeSessionLog(
  root: string,
  sessionId: string,
  lines: Array<Record<string, unknown>>
): Promise<void> {
  const dir = join(root, 'sessions', 'default', sessionId)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'session.jsonl'), `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`, 'utf8')
}

async function writeObject(root: string, tree: 'objects' | 'file-objects', hex: string): Promise<void> {
  const dir = join(root, 'attachments', 'v1', tree, hex.slice(0, 2))
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, hex), 'placeholder', 'utf8')
}

afterEach(async () => {
  if (home) await rm(home, { recursive: true, force: true })
  home = undefined
})

describe('auditAttachmentReferences', () => {
  it('returns zeros when the home has no sessions', async () => {
    const root = await createHome()
    await expect(auditAttachmentReferences(root)).resolves.toEqual({
      sessionsScanned: 0,
      references: 0,
      missing: []
    })
  })

  it('reports references whose objects are missing and keeps present ones quiet (#657)', async () => {
    const root = await createHome()
    await writeObject(root, 'objects', HEX_A)
    await writeObject(root, 'file-objects', HEX_C)
    await writeSessionLog(root, 'session-1', [
      { type: 'user', blocks: [{ type: 'image', attachment: { attachmentId: ID_A, mediaType: 'image/png', name: 'present.png' } }] },
      { type: 'user', blocks: [{ type: 'image', attachment: { attachmentId: ID_A, mediaType: 'image/png', name: 'duplicate.png' } }] },
      { type: 'user', blocks: [{ type: 'image', attachment: { attachmentId: ID_B, mediaType: 'image/png', name: 'gone.png' } }] },
      { type: 'user', blocks: [{ type: 'file', attachment: { attachmentId: ID_C, name: 'from-file-objects.txt' } }] }
    ])
    await writeSessionLog(root, 'session-2', [
      { type: 'user', blocks: [{ type: 'image', attachment: { attachmentId: ID_B, mediaType: 'image/png', name: 'gone-again.png' } }] }
    ])

    const audit = await auditAttachmentReferences(root)
    expect(audit.sessionsScanned).toBe(2)
    expect(audit.references).toBe(4)
    expect(audit.missing).toEqual([
      { sessionId: 'session-1', attachmentId: ID_B, name: 'gone.png', mediaType: 'image/png' },
      { sessionId: 'session-2', attachmentId: ID_B, name: 'gone-again.png', mediaType: 'image/png' }
    ])
  })

  it('skips malformed lines and non-sha256 attachment ids', async () => {
    const root = await createHome()
    const dir = join(root, 'sessions', 'default', 'session-3')
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'session.jsonl'),
      [
        '{ this is not json',
        JSON.stringify({ attachment: { attachmentId: 'md5:whatever', name: 'ignored.png' } }),
        JSON.stringify({ attachment: { attachmentId: 'sha256:not-hex', name: 'ignored-too.png' } }),
        ''
      ].join('\n'),
      'utf8'
    )

    const audit = await auditAttachmentReferences(root)
    expect(audit).toEqual({ sessionsScanned: 1, references: 0, missing: [] })
  })

  it('merges metadata for duplicate references of the same object', async () => {
    const root = await createHome()
    await writeSessionLog(root, 'session-4', [
      { attachment: { attachmentId: ID_B } },
      { attachment: { attachmentId: ID_B, name: 'named-later.png', mediaType: 'image/png' } }
    ])

    const audit = await auditAttachmentReferences(root)
    expect(audit.missing).toEqual([
      { sessionId: 'session-4', attachmentId: ID_B, name: 'named-later.png', mediaType: 'image/png' }
    ])
  })
})

describe('formatAttachmentGaps', () => {
  it('is silent when nothing is missing', () => {
    expect(formatAttachmentGaps({ sessionsScanned: 3, references: 9, missing: [] })).toEqual([])
  })

  it('summarizes the gap count, affected sessions and first offenders', () => {
    const lines = formatAttachmentGaps({
      sessionsScanned: 2,
      references: 3,
      missing: [
        { sessionId: 'session-1', attachmentId: ID_B, name: 'gone.png' },
        { sessionId: 'session-2', attachmentId: ID_B }
      ]
    })
    expect(lines[0]).toContain('2 attachment reference(s) in 2 session(s)')
    expect(lines.some((line) => line.includes(`session-1: ${ID_B} (gone.png)`))).toBe(true)
    expect(lines.some((line) => line.includes(`session-2: ${ID_B}`))).toBe(true)
  })

  it('caps the per-reference listing and reports the remainder', () => {
    const missing = Array.from({ length: 7 }, (_, index) => ({
      sessionId: `session-${index}`,
      attachmentId: ID_B
    }))
    const lines = formatAttachmentGaps({ sessionsScanned: 7, references: 7, missing }, 5)
    expect(lines.at(-1)).toBe('  … and 2 more')
  })
})
