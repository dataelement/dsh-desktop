import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

// Execute the installed Workspace service so these tests cover the patched
// navigation behavior while keeping Cordis boot and the renderer out of scope.
const source = await readFile(new URL('../node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js', import.meta.url), 'utf8')
const workbenchSource = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
const classStart = source.indexOf('class extends', source.indexOf('var UiWorkspaceService ='))
const classEnd = source.indexOf('\n\t\t/** Stable tie-breaking', classStart)
const recentStart = source.indexOf('function recentWorkspace(', classEnd)
const recentEnd = source.indexOf('\n\t\t//#endregion', recentStart)
if ([classStart, classEnd, recentStart, recentEnd].some(index => index < 0)) throw new Error('Workspace service extraction failed; check the installed Harness navigation module.')
const UiWorkspaceService = vm.runInNewContext(`(() => {
  ${source.slice(recentStart, recentEnd)}
  return (${source.slice(classStart, classEnd).trim().replace(/;$/, '')})
})()`, { _deepseek_ai_cordis: { Service: class {} }, AbortController, AbortSignal, console })
let Workbenches
vm.runInNewContext(workbenchSource, {
  window: { __ModuleLoader__: { load({ factory }) {
    Workbenches = factory((name) => {
      if (name === 'react') return { createElement() {}, Component: class {} }
      throw new Error(`Unexpected module ${name}`)
    }).Workbenches
  } } },
  setTimeout, clearTimeout, AbortController
})

function fixture() {
  const service = Object.create(UiWorkspaceService.prototype)
  let navigation = new AbortController()
  const sessionState = { phase: 'ready', ids: [], byId: {}, current: undefined }
  const workspaceState = { phase: 'ready', items: [{ workspaceId: 'project', path: '/project', createdAt: '2026-01-01T00:00:00Z', sessionIds: [] }], archivedSessionIds: [] }
  const listeners = new Set()
  const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
  service.sessionStarter = null
  service.sessionOpener = null
  service.connecting = new Map()
  service.lifetime = new AbortController()
  service.ctx = { layout: {
    beginNavigation: vi.fn(() => { navigation.abort(); navigation = new AbortController(); return navigation.signal }),
    selectPanel: vi.fn(() => navigation.abort())
  } }
  service.workspaces = { list: { getSnapshot: () => workspaceState, subscribe } }
  service.sessions = {
    list: { getSnapshot: () => sessionState, subscribe },
    create: vi.fn(async ({ workspaceId }) => {
      const target = workspaceState.items.find(item => item.workspaceId === workspaceId)
      if (!target) throw new Error(`Unknown workspace: ${workspaceId}`)
      const id = 'new-session'
      if (!sessionState.byId[id]) sessionState.ids.push(id)
      sessionState.byId[id] = { id, sessionId: id, blank: true, cwd: target.path, displayTitle: 'New Session' }
      if (!target.sessionIds.includes(id)) target.sessionIds.push(id)
      return id
    }),
    open: vi.fn(id => {
      if (!sessionState.byId[id]) throw new Error(`Session not projected before open: ${id}`)
      sessionState.current = id
    }),
    clear: vi.fn(() => { sessionState.current = undefined })
  }
  return { service, sessionState, workspaceState, listeners }
}

describe('native Workspace navigation with workbench routing', () => {
  it('opens the initially connected workspace when no later navigation intervenes', async () => {
    const { service, listeners } = fixture()
    const cleanup = service.watchNavigation()
    await vi.waitFor(() => expect(service.sessions.open).toHaveBeenCalledWith('new-session'))
    expect(service.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project' })
    cleanup()
    expect(listeners.size).toBe(0)
  })

  it('does not reopen a native session after a workbench supersedes initial navigation', async () => {
    const { service, listeners } = fixture()
    let finish
    service.sessions.create.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const cleanup = service.watchNavigation()
    service.ctx.layout.beginNavigation()
    finish('late-session')
    // Wait until connectWorkspace has completed its own cleanup as well.
    await vi.waitFor(() => expect(service.connecting.size).toBe(0))
    for (const listener of listeners) listener()
    expect(service.sessions.open).not.toHaveBeenCalled()
    expect(service.sessions.create).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it('routes even a repeat click on the same session, then restores native opening on release', () => {
    const { service, sessionState } = fixture()
    sessionState.current = 'bound-session'
    const handler = vi.fn(() => true)
    const release = service.registerSessionOpener(handler)
    service.openSession('bound-session')
    expect(handler).toHaveBeenCalledWith('bound-session')
    expect(service.sessions.open).not.toHaveBeenCalled()
    expect(() => service.registerSessionOpener(() => true)).toThrow('already registered')
    release()
    release()
    const second = service.registerSessionOpener(() => false)
    release()
    expect(() => service.registerSessionOpener(() => true)).toThrow('already registered')
    sessionState.byId['ordinary-session'] = { id: 'ordinary-session', sessionId: 'ordinary-session' }
    service.openSession('ordinary-session')
    expect(service.sessions.open).toHaveBeenCalledWith('ordinary-session')
    expect(service.ctx.layout.selectPanel).toHaveBeenCalledWith(null)
    second()
  })

  it.each(['writer', 'research-notebook', 'media-workbench'])('keeps native New Session ordinary even while %s is open', async (workbenchId) => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    workspaceState.items.push({ workspaceId: 'target-project', path: '/target', createdAt: '2026-01-02T00:00:00Z', sessionIds: [] })
    sessionState.ids.push('old-recent')
    sessionState.byId['old-recent'] = { id: 'old-recent', sessionId: 'old-recent', cwd: '/project', displayTitle: 'Old recent' }
    workspaceState.items[0].sessionIds.push('old-recent')
    const ctx = { sessions: { ...uiWorkspace.sessions, refresh: vi.fn(async () => {}) }, workspaces: uiWorkspace.workspaces, layout: uiWorkspace.ctx.layout, uiWorkspace }
    const request = vi.fn(async () => Response.json({ revision: 2, state: controller.state }))
    const controller = new Workbenches(ctx, request)
    controller.register({ id: workbenchId, title: workbenchId }, () => null)
    controller.state = {
      version: 1,
      added: [workbenchId],
      pinned: [workbenchId],
      active: workbenchId,
      sessionBindings: { 'old-recent': workbenchId },
      recentSessions: { [workbenchId]: 'old-recent' },
      notes: {}
    }
    controller.ready = true
    uiWorkspace.startSession('target-project')
    await vi.waitFor(() => expect(uiWorkspace.sessions.open).toHaveBeenCalledWith('new-session'))

    expect(uiWorkspace.sessions.create).toHaveBeenCalledTimes(1)
    expect(uiWorkspace.sessions.create).toHaveBeenCalledWith({ workspaceId: 'target-project' })
    expect(controller.state.sessionBindings['new-session']).toBeUndefined()
    expect(controller.state.recentSessions[workbenchId]).toBe('old-recent')
    expect(controller.state.active).toBe(workbenchId)
    expect(uiWorkspace.sessions.open).not.toHaveBeenCalledWith('old-recent')
  })

  it('does not reuse a blank session already bound to a workbench when native New Session is clicked', async () => {
    const { service, sessionState, workspaceState } = fixture()
    const blankId = 'workbench-blank'
    sessionState.ids.push(blankId)
    sessionState.byId[blankId] = { id: blankId, sessionId: blankId, blank: true, cwd: '/project' }
    workspaceState.items[0].sessionIds.push(blankId)
    service.startSession('project')
    await vi.waitFor(() => expect(service.sessions.open).toHaveBeenCalledWith('new-session'))
    expect(service.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project' })
    expect(service.sessions.open).not.toHaveBeenCalledWith(blankId)
    expect(sessionState.byId['new-session']).toMatchObject({ blank: true, cwd: '/project' })
    expect(workspaceState.items[0].sessionIds).toContain('new-session')
  })

  it('falls back to native New Session after the workbench is closed', async () => {
    const { service } = fixture()
    const handler = vi.fn(() => false)
    service.registerSessionStarter(handler)
    service.startSession('project')
    await vi.waitFor(() => expect(service.sessions.open).toHaveBeenCalledWith('new-session'))
    expect(handler).toHaveBeenCalledWith('project')
    expect(service.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project' })
    expect(service.ctx.layout.selectPanel).toHaveBeenCalledWith(null)
  })

  it('keeps the active workbench when connectWorkspace reuses a blank session owned by a removed provider', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    const removedSession = 'research-notebook-blank'
    sessionState.ids.push(removedSession)
    sessionState.byId[removedSession] = {
      id: removedSession, sessionId: removedSession, blank: true, cwd: '/project', displayTitle: 'New Session'
    }
    workspaceState.items[0].sessionIds.push(removedSession)

    const ctx = {
      sessions: {
        ...uiWorkspace.sessions,
        refresh: vi.fn(async () => {})
      },
      workspaces: uiWorkspace.workspaces,
      layout: uiWorkspace.ctx.layout,
      uiWorkspace
    }
    const request = vi.fn(async () => Response.json({ revision: 1, state: controller.state }))
    const controller = new Workbenches(ctx, request)
    controller.register({ id: 'writer', title: 'Writer' }, () => null)
    controller.state = {
      version: 1,
      added: ['writer'],
      pinned: ['writer'],
      active: 'writer',
      sessionBindings: { [removedSession]: 'research-notebook' },
      recentSessions: {},
      notes: {}
    }
    controller.ready = true
    controller.lastSession = undefined

    uiWorkspace.sessions.open.mockImplementation((id) => {
      sessionState.current = id
      controller.selectionChanged()
    })
    uiWorkspace.registerSessionOpener((sessionId) => {
      const id = controller.state.sessionBindings[sessionId]
      if (!controller.ready || !id || !controller.state.added.includes(id) || !controller.catalog.has(id)) return false
      controller.run(controller.open(id, sessionId))
      return true
    })

    await uiWorkspace.openWorkspace('project')
    await controller.queue

    expect(uiWorkspace.sessions.create).not.toHaveBeenCalled()
    expect(uiWorkspace.sessions.open).toHaveBeenCalledWith(removedSession)
    expect(sessionState.current).toBe(removedSession)
    expect(controller.state.active).toBe('writer')
    expect(controller.state.sessionBindings[removedSession]).toBe('research-notebook')
    expect(controller.state.recentSessions).toEqual({})
    expect(request).not.toHaveBeenCalled()
    expect(workbenchSource).not.toContain('registerSessionStarter(')
  })
})
