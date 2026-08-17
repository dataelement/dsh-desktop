import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SESSION_FORMAT_VERSION, SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const version = '0.1.0-rc.6'

const patchedPackages = [
  {
    name: 'dsh-session-persistence',
    file: 'lib/index.js',
    markers: ['assertDeletable(id)', 'async delete(id)', 'await this.backend.deleteStored(id)']
  },
  {
    name: 'dsh-session-persistence-jsonl',
    file: 'lib/index.js',
    markers: ['delete(id) {', 'return this.coordinator.delete(id)', 'async deleteStored(id)']
  },
  {
    name: 'dsh-workspace',
    file: 'lib/index.js',
    markers: ['forgetSession(sessionId)', 'archivedSessionIds: state.archivedSessionIds.filter']
  },
  {
    name: 'dsh-api-remotes',
    file: 'lib/index.js',
    markers: ['agentFor.disposeOwned = async', 'handles.delete(sessionId)']
  },
  {
    name: 'dsh-host-apiproxy',
    file: 'lib/index.js',
    markers: ['"session.delete"', 'await persistence.delete(sessionId)', 'workspaceRegistry.forgetSession(sessionId)']
  },
  {
    name: 'dsh-client-runtime',
    file: 'lib/client.js',
    markers: ['SessionDeleteError', 'this.api.sessions.delete({ sessionId })', 'if (this.watched === sessionId) this.watched = void 0']
  },
  {
    name: 'dsh-client-connection',
    file: 'lib/client.js',
    markers: ['sessionDeleteValueSchema', 'delete: (payload, signal) => this.callUnary("session.delete"', 'case "session.delete"']
  },
  {
    name: 'dsh-client-ui-workspace',
    file: 'lib/client.js',
    markers: ['delete.session', 'danger: true', 'Workspace files are kept', 'await ctx.sessions.delete(sessionId)']
  }
] as const

describe('permanent session deletion dependency patches', () => {
  it.each(patchedPackages)('$name patch is reproducible and installed', async ({ name, file, markers }) => {
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
    const event = [{ type: 'turn/start', seq: 0, time: 1, data: { turn: 1 } }] as const

    try {
      await persistence.create({ version: SESSION_FORMAT_VERSION, id: removed, createdAt: 1 })
      await persistence.append(removed, event)
      await persistence.create({ version: SESSION_FORMAT_VERSION, id: kept, createdAt: 2 })
      await persistence.append(kept, event)

      expect(await persistence.delete(removed)).toBe(true)
      expect((await persistence.list()).map((header) => header.id)).toEqual([kept])
      await expect(persistence.load(removed)).rejects.toThrow(/not found/i)
      expect((await persistence.load(kept)).meta.id).toBe(kept)
      expect(await persistence.delete(SessionId('desktop-delete-missing'))).toBe(false)
    } finally {
      await fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })
})
