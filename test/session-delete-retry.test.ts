import { readFile, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

type SessionCommandControllerConstructor = new (
  ctx: object,
  agents: object,
  defaultCwd: string
) => {
  delete(request: { sessionId: string }): Promise<{ deleted: true }>
  readSessionState(sessionId: string): Promise<{ header: { origin: string } }>
}

async function loadSessionCommandController(): Promise<SessionCommandControllerConstructor> {
  const modulePath = path.resolve('node_modules/@deepseek-ai/dsh-api-session-controller/lib/index.js')
  const source = await readFile(modulePath, 'utf8')
  const testModulePath = path.join(path.dirname(modulePath), `.session-command-controller-test-${randomUUID()}.mjs`)
  const exportLine = 'export { ApiSessionNotFound, SessionController, SessionController as default, SessionFileReferences, SessionSkillCatalog, buildModelCatalog };'

  await writeFile(testModulePath, source.replace(exportLine, 'export { ApiSessionNotFound, SessionCommandController, SessionController, SessionController as default, SessionFileReferences, SessionSkillCatalog, buildModelCatalog };'))
  try {
    const module = await import(pathToFileURL(testModulePath).href)
    return module.SessionCommandController as SessionCommandControllerConstructor
  } finally {
    await rm(testModulePath, { force: true })
  }
}

describe('session deletion transaction', () => {
  it('cleans Workspace metadata before a persistence failure and succeeds on retry', async () => {
    const SessionCommandController = await loadSessionCommandController()
    const sessionId = 'session-delete-retry'
    let persisted = true
    let attached = true
    const order: string[] = []
    const forgetSession = vi.fn(async () => {
      order.push('forget')
      attached = false
    })
    const removePersistedSession = vi.fn(async () => {
      order.push('delete')
      if (removePersistedSession.mock.calls.length === 1) throw new Error('transient persistence failure')
      persisted = false
      return true
    })
    const controller = new SessionCommandController({
      agents: { get: () => undefined },
      sessions: { get: () => undefined },
      workspaceRegistry: { forgetSession },
      get: (name: string) => name === 'sessionPersistence' ? { delete: removePersistedSession } : undefined,
      emit: vi.fn()
    }, {
      disposeOwned: vi.fn(async () => false)
    }, process.cwd())
    controller.readSessionState = vi.fn(async () => {
      if (!persisted) throw new Error('session should not be inspected after a successful delete')
      return { header: { origin: 'user' } }
    })

    await expect(controller.delete({ sessionId })).rejects.toThrow('failed to delete session')
    expect(order).toEqual(['forget', 'delete'])
    expect(attached).toBe(false)
    expect(persisted).toBe(true)

    await expect(controller.delete({ sessionId })).resolves.toEqual({ deleted: true })
    expect(order).toEqual(['forget', 'delete', 'forget', 'delete'])
    expect(attached).toBe(false)
    expect(persisted).toBe(false)
  })
})
