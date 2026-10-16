import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { RemoteError, remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

type Header = { id: string; origin?: string; parentSession?: string }

// The command controller is private to the upstream bundle. Evaluate its actual
// installed class with the two ownership helpers so these exercise the Host
// deletion path instead of repeating its branching in a test double.
async function commandController() {
  const source = await readFile(path.resolve('node_modules/@deepseek-ai/dsh-api-session-controller/lib/index.js'), 'utf8')
  const file = ts.createSourceFile('session-controller.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const helpers = ['hasApiSessionSubagentOwner', 'apiSessionSubagentOwnershipError'].map((name) => {
    const declaration = file.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name)
    if (!declaration) throw new Error(`Missing upstream helper ${name}`)
    return declaration.getText(file)
  })
  const classDeclaration = file.statements.flatMap((statement) => ts.isVariableStatement(statement)
    ? [...statement.declarationList.declarations]
    : []).find((declaration) => declaration.name.getText(file) === 'SessionCommandController')
  if (!classDeclaration?.initializer) throw new Error('Missing upstream SessionCommandController')
  return vm.runInNewContext(`${helpers.join('\n')}\n(${classDeclaration.initializer.getText(file)})`, {
    RemoteError,
    remoteErrorOf
  }) as new (ctx: unknown, agents: unknown, cwd: string) => {
    delete(request: { sessionId: string }): Promise<{ deleted: boolean }>
  }
}

function fixture() {
  const attached = new Map<string, { header: Header }>()
  const live = new Map<string, { id: string; session: { header: Header } }>()
  const stored = new Map<string, { header: Header }>()
  const persistence = {
    stat: vi.fn(async (id: string) => stored.get(id)),
    delete: vi.fn(async (id: string) => stored.delete(id))
  }
  const forgetSession = vi.fn(async (_id: string) => {})
  const emit = vi.fn()
  const ctx = {
    get: (name: string) => name === 'sessionPersistence' ? persistence : undefined,
    agents: { get: (id: string) => live.get(id), isOwnedBy: vi.fn().mockReturnValue(false) },
    sessions: { get: (id: string) => attached.get(id) },
    workspaceRegistry: { forgetSession },
    emit
  }
  const agents = {
    disposeOwned: vi.fn(async (id: string) => {
      live.delete(id)
      attached.delete(id)
      return true
    })
  }
  return { attached, live, stored, persistence, forgetSession, emit, ctx, agents }
}

describe('Host permanent session deletion', () => {
  it('deletes a live session whose durable log is already absent', async () => {
    const f = fixture()
    const sessionId = 'session-live-without-log'
    f.attached.set(sessionId, { header: { id: sessionId } })
    f.live.set(sessionId, { id: sessionId, session: { header: { id: sessionId } } })
    const Controller = await commandController()

    await expect(new Controller(f.ctx, f.agents, '').delete({ sessionId })).resolves.toEqual({ deleted: false })
    expect(f.persistence.stat).not.toHaveBeenCalled()
    expect(f.forgetSession).toHaveBeenCalledWith(sessionId)
    expect(f.persistence.delete).toHaveBeenCalledWith(sessionId)
  })

  it('cleans a missing cold session and emits removal for stale client rows', async () => {
    const f = fixture()
    const sessionId = 'session-missing-log'
    const Controller = await commandController()

    await expect(new Controller(f.ctx, f.agents, '').delete({ sessionId })).resolves.toEqual({ deleted: false })
    expect(f.persistence.stat).toHaveBeenCalledWith(sessionId)
    expect(f.forgetSession).toHaveBeenCalledWith(sessionId)
    expect(f.persistence.delete).not.toHaveBeenCalled()
    expect(f.emit).toHaveBeenCalledWith('api-session/removed', sessionId)
  })

  it('deletes a stored session using its header without reading the event log', async () => {
    const f = fixture()
    const sessionId = 'session-stored'
    f.stored.set(sessionId, { header: { id: sessionId } })
    const Controller = await commandController()

    await expect(new Controller(f.ctx, f.agents, '').delete({ sessionId })).resolves.toEqual({ deleted: true })
    expect(f.stored.has(sessionId)).toBe(false)
    expect(f.emit).toHaveBeenCalledWith('api-session/removed', sessionId)
  })

  it('refuses to delete a subagent session', async () => {
    const f = fixture()
    const sessionId = 'session-subagent'
    f.stored.set(sessionId, { header: { id: sessionId, origin: 'subagent' } })
    const Controller = await commandController()

    await expect(new Controller(f.ctx, f.agents, '').delete({ sessionId })).rejects.toMatchObject({ code: 'session/agent-busy' })
    expect(f.forgetSession).not.toHaveBeenCalled()
    expect(f.persistence.delete).not.toHaveBeenCalled()
  })

  it('keeps metadata and artifacts when another capability owns the live agent', async () => {
    const f = fixture()
    const sessionId = 'session-busy'
    f.live.set(sessionId, { id: sessionId, session: { header: { id: sessionId } } })
    f.agents.disposeOwned.mockImplementationOnce(async () => false)
    const Controller = await commandController()

    await expect(new Controller(f.ctx, f.agents, '').delete({ sessionId })).rejects.toMatchObject({ code: 'session/agent-busy' })
    expect(f.forgetSession).not.toHaveBeenCalled()
    expect(f.persistence.delete).not.toHaveBeenCalled()
  })

  it('reports a storage failure instead of treating it as an absent log', async () => {
    const f = fixture()
    const sessionId = 'session-storage-failure'
    f.stored.set(sessionId, { header: { id: sessionId } })
    f.persistence.delete.mockRejectedValueOnce(new Error('disk I/O failed'))
    const Controller = await commandController()

    await expect(new Controller(f.ctx, f.agents, '').delete({ sessionId })).rejects.toMatchObject({ code: 'gateway/internal' })
    expect(f.emit).not.toHaveBeenCalled()
  })
})
