import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SESSION_FORMAT_VERSION, SessionId, SessionSeq } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

// version tracks the patch-filename suffix; every Harness upgrade renames all of them
const patchedPackages = [
  {
    name: 'dsh-session-persistence',
    version: '0.1.5-rc.2',
    file: 'lib/index.js',
    markers: ['does not support deletion', 'delete(_id, _options)', 'Permanently remove one stored Session identity']
  },
  {
    name: 'dsh-session-persistence-jsonl',
    version: '0.1.5-rc.2',
    file: 'lib/index.js',
    markers: ['async delete(id, options)', 'this.tracker.claimWrite(id)', 'this.coldLogMemo.delete(id)']
  },
  {
    name: 'dsh-workspace',
    version: '0.1.5-rc.2',
    file: 'lib/index.js',
    markers: ['forgetSession(sessionId)', 'archivedSessionIds: state.archivedSessionIds.filter']
  },
  {
    name: 'dsh-api-session-controller',
    version: '0.1.5-rc.2',
    file: 'lib/index.js',
    markers: ['disposeOwned(sessionId)', 'await persistence.delete(request.sessionId)', 'workspaceRegistry.forgetSession(request.sessionId)']
  },
  {
    name: 'dsh-api-session-controller',
    version: '0.1.5-rc.2',
    file: 'lib/client.js',
    markers: ['SessionDeleteError', 'this.remote.session.delete({ sessionId })', 'if (this.watched === sessionId) this.watched = void 0']
  },
  {
    name: 'dsh-api-session-controller',
    version: '0.1.5-rc.2',
    file: 'lib/typert.host.js',
    markers: ["id: '@deepseek-ai/dsh-api-session-controller#session/delete'", "method: 'delete'"]
  },
  {
    name: 'dsh-client-ui-workspace',
    version: '0.1.5-rc.2',
    file: 'lib/client.js',
    markers: ['delete.session', 'danger: true', 'Workspace files are kept', 'await sessions.delete(sessionId)']
  }
] as const

describe('permanent session deletion dependency patches', () => {
  it.each(patchedPackages)('$name patch is reproducible and installed', async ({ name, file, markers, version }) => {
    const [patch, installed] = await Promise.all([
      readFile(path.join(projectRoot, 'patches', `@deepseek-ai+${name}+${version}.patch`), 'utf8'),
      readFile(path.join(projectRoot, 'node_modules', '@deepseek-ai', name, file), 'utf8')
    ])

    for (const marker of markers) {
      expect(patch).toContain(marker)
      expect(installed).toContain(marker)
    }
  })

  it('states the destructive retention boundary in both locales', async () => {
    const ui = await readFile(
      path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-workspace', 'lib', 'client.js'),
      'utf8'
    )

    expect(ui).toContain('工作区文件会保留。此操作无法撤销。')
    expect(ui).toContain('Workspace files are kept. This can’t be undone.')
  })

  it('removes one materialized JSONL log without touching another session', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-desktop-session-delete-'))
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    const fiber = await ctx.plugin(JsonlSessionPersistence, { root, compression: 'none' })
    const persistence = ctx.sessionPersistence as typeof ctx.sessionPersistence & {
      delete(id: ReturnType<typeof SessionId>): Promise<boolean>
    }
    const removed = SessionId('desktop-delete-removed')
    const kept = SessionId('desktop-delete-kept')
    const event = [{ type: 'turn/start', seq: SessionSeq(0), time: 1, data: { turn: 1 } }] as const

    // 0.1.5 replaced the append/load seam with per-session handles: `create`
    // hands back the single write handle, and `flush` is the durability
    // barrier that materializes the artifact deletion has to find.
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
      await seed(removed, 1)
      await seed(kept, 2)

      expect(await persistence.delete(removed)).toBe(true)
      expect((await persistence.list()).map((snapshot) => snapshot.header.id)).toEqual([kept])
      expect(await persistence.stat(removed)).toBeUndefined()
      expect((await persistence.stat(kept))?.header.id).toBe(kept)
      // A second delete of the same id is a no-op, not a failure.
      expect(await persistence.delete(removed)).toBe(false)
      expect(await persistence.delete(SessionId('desktop-delete-missing'))).toBe(false)
    } finally {
      await fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })
})
