import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { zstdCompressSync } from 'node:zlib'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SESSION_FORMAT_VERSION, SessionId, SessionSeq } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { describe, expect, it, vi } from 'vitest'

async function findLog(root: string, id: string): Promise<string> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  const match = entries.find(
    (entry) => entry.isFile() && entry.name.endsWith('.jsonl.zstd') && entry.parentPath.includes(id)
  )
  if (!match) throw new Error(`no log for ${id}`)
  return path.join(match.parentPath, match.name)
}

describe('corrupt JSONL session log patch', () => {
  it.each([
    ['garbage bytes', Buffer.from('not a zstd frame at all')],
    ['a header frame holding more than one line', zstdCompressSync(Buffer.from('{"version":1}\n{"type":"x"}\n'))]
  ])('keeps listing the other sessions when one log is %s', async (_label, bytes) => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-desktop-session-corrupt-'))
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    const fiber = await ctx.plugin(JsonlSessionPersistence, { root, compression: 'zstd' })
    const persistence = ctx.sessionPersistence
    const warn = vi.spyOn(ctx.logger, 'warn')
    const corrupt = SessionId('desktop-corrupt-broken')
    const kept = SessionId('desktop-corrupt-kept')
    const event = [{ type: 'turn/start', seq: SessionSeq(0), time: 1, data: { turn: 1 } }] as const

    const seed = async (id: ReturnType<typeof SessionId>, createdAt: number): Promise<void> => {
      const handle = await persistence.create({ version: SESSION_FORMAT_VERSION, id, createdAt, isSeeded: false })
      try {
        await handle.append(event)
        await handle.flush()
      } finally {
        await handle.close()
      }
    }

    try {
      await seed(corrupt, 1)
      await seed(kept, 2)
      const brokenPath = await findLog(root, corrupt)
      await fiber.dispose()

      await writeFile(brokenPath, bytes)
      const reopened = new Context()
      await reopened.plugin(SessionStore)
      const reader = await reopened.plugin(JsonlSessionPersistence, { root, compression: 'zstd' })
      const reopenedWarn = vi.spyOn(reopened.logger, 'warn')
      try {
        const ids = (await reopened.sessionPersistence.list()).map((snapshot) => snapshot.header.id)
        expect(ids).toEqual([kept])
        expect(reopenedWarn).toHaveBeenCalledWith(expect.stringContaining('skipped unreadable session log'))
        expect(reopenedWarn).toHaveBeenCalledWith(expect.stringContaining(brokenPath))
      } finally {
        await reader.dispose()
      }
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('skipped unreadable session log'))
    } finally {
      await fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })
})
