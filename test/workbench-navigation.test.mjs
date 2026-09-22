import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const Service = { tracker: Symbol('service-tracker') }

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
let apply, Workbenches
vm.runInNewContext(workbenchSource, {
  window: { __ModuleLoader__: { load({ factory }) {
    const client = factory((name) => {
      if (name === 'react') return { createElement() {}, Component: class {} }
      if (name === '@deepseek-ai/cordis') return { Service }
      throw new Error(`Unexpected module ${name}`)
    })
    apply = client.apply
    Workbenches = client.Workbenches
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
  let selection = {}
  service.selection = { getSnapshot: () => selection, set: value => { selection = value } }
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
    clear: vi.fn(() => { sessionState.current = undefined }),
    retain: vi.fn(target => {
      const id = typeof target === 'string' ? target : target.parentSessionId
      if (!sessionState.byId[id]) throw new Error(`Session not projected before retain: ${id}`)
      service.sessions.open(id)
      return { sessionId: id, release: vi.fn() }
    }),
    refreshSubagents: vi.fn(),
    subagentAddress: vi.fn(() => undefined)
  }
  return { service, sessionState, workspaceState, listeners }
}

function attachWorkbenchRouting(uiWorkspace, sessionState, workspaceState) {
  let controller
  let revision = 0
  const cleanups = []
  const ctx = {
    sessions: { ...uiWorkspace.sessions, refresh: vi.fn(async () => {}) },
    fiber: { name: 'dsh-media-workbench' },
    workspaces: uiWorkspace.workspaces,
    layout: uiWorkspace.ctx.layout,
    uiWorkspace,
    reflect: { provide: (_name, value) => { controller = value } },
    slots: { inject: vi.fn() },
    effect: (callback, label) => {
      if (['workbenches: styles', 'workbenches: lifecycle'].includes(label)) return
      const cleanup = callback()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
    }
  }
  apply(ctx)
  controller.request = vi.fn(async (_url, options = {}) => Response.json({
    revision: options.method === 'POST' ? ++revision : revision,
    state: options.body ? JSON.parse(options.body).state : controller.state
  }))
  controller.remoteCatalog = [
    { id: 'media-workbench', distribution: { name: 'dsh-media-workbench' }, description: { zh: '' }, screenshots: [] },
    { id: 'huaxue', distribution: { name: 'huaxue' }, description: { zh: '' }, screenshots: [] }
  ]
  controller.register({ title: 'Media Workbench' }, () => null)
  ctx.fiber.name = 'huaxue'
  controller.register({ title: 'Huaxue' }, () => null)
  controller.state = {
    version: 1,
    added: ['media-workbench', 'huaxue'],
    pinned: ['media-workbench', 'huaxue'],
    favorites: [],
    active: 'media-workbench',
    sessionBindings: {},
    recentSessions: {},
    notes: {}
  }
  controller.ready = true
  controller.lastSession = sessionState.current
  return {
    controller,
    dispose() {
      for (const cleanup of cleanups.reverse()) cleanup()
      controller.dispose()
    }
  }
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
    // connectWorkspace first resolves the default preset, so creation starts asynchronously.
    await vi.waitFor(() => expect(service.sessions.create).toHaveBeenCalledOnce())
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
    expect(handler).toHaveBeenCalledWith('bound-session', 'explicit-session')
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

  it('marks a session opened indirectly through openWorkspace with the workspace source', async () => {
    const { service } = fixture()
    const handler = vi.fn(() => false)
    service.registerSessionOpener(handler)

    await service.openWorkspace('project')

    expect(handler).toHaveBeenCalledWith('new-session', 'workspace')
    expect(service.sessions.open).toHaveBeenCalledWith('new-session')
  })

  it.each(['writer', 'research-notebook', 'media-workbench'])('keeps native New Session ordinary even while %s is open', async (workbenchId) => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    workspaceState.items.push({ workspaceId: 'target-project', path: '/target', createdAt: '2026-01-02T00:00:00Z', sessionIds: [] })
    sessionState.ids.push('old-recent')
    sessionState.byId['old-recent'] = { id: 'old-recent', sessionId: 'old-recent', cwd: '/project', displayTitle: 'Old recent' }
    workspaceState.items[0].sessionIds.push('old-recent')
    const ctx = { fiber: { name: workbenchId }, sessions: { ...uiWorkspace.sessions, refresh: vi.fn(async () => {}) }, workspaces: uiWorkspace.workspaces, layout: uiWorkspace.ctx.layout, uiWorkspace }
    const request = vi.fn(async () => Response.json({ revision: 2, state: controller.state }))
    const controller = new Workbenches(ctx, request)
    controller.remoteCatalog = [{ id: workbenchId, distribution: { name: workbenchId }, description: { zh: '' }, screenshots: [] }]
    controller.register({ title: workbenchId }, () => null)
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
      fiber: { name: 'writer' },
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
    controller.remoteCatalog = [{ id: 'writer', distribution: { name: 'writer' }, description: { zh: '' }, screenshots: [] }]
    controller.register({ title: 'Writer' }, () => null)
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

  it('keeps media-workbench active and prefers an unbound blank session when workspace navigation first finds a huaxue session', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    const bound = 'huaxue-blank'
    const ordinary = 'ordinary-blank'
    sessionState.ids.push(bound, ordinary)
    sessionState.byId[bound] = { id: bound, sessionId: bound, blank: true, cwd: '/project' }
    sessionState.byId[ordinary] = { id: ordinary, sessionId: ordinary, blank: true, cwd: '/project' }
    workspaceState.items[0].sessionIds.push(bound, ordinary)
    const { controller, dispose } = attachWorkbenchRouting(uiWorkspace, sessionState, workspaceState)
    controller.state.sessionBindings[bound] = 'huaxue'
    controller.state.recentSessions.huaxue = bound

    await uiWorkspace.openWorkspace('project')
    await vi.waitFor(() => expect(uiWorkspace.sessions.open).toHaveBeenCalledWith(ordinary))

    expect(uiWorkspace.sessions.create).not.toHaveBeenCalled()
    expect(sessionState.current).toBe(ordinary)
    expect(controller.state.active).toBe('media-workbench')
    expect(controller.state.sessionBindings).toEqual({ [bound]: 'huaxue' })
    expect(controller.state.recentSessions).toEqual({ huaxue: bound })
    dispose()
  })

  it('creates an ordinary unbound session when workspace navigation only finds a huaxue-bound blank', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    const bound = 'huaxue-blank'
    sessionState.ids.push(bound)
    sessionState.byId[bound] = { id: bound, sessionId: bound, blank: true, cwd: '/project' }
    workspaceState.items[0].sessionIds.push(bound)
    const { controller, dispose } = attachWorkbenchRouting(uiWorkspace, sessionState, workspaceState)
    controller.state.sessionBindings[bound] = 'huaxue'
    controller.state.recentSessions.huaxue = bound

    await uiWorkspace.openWorkspace('project')
    await vi.waitFor(() => expect(uiWorkspace.sessions.open).toHaveBeenCalledWith('new-session'))

    expect(uiWorkspace.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project' })
    expect(sessionState.current).toBe('new-session')
    expect(controller.state.active).toBe('media-workbench')
    expect(controller.state.sessionBindings['new-session']).toBeUndefined()
    expect(controller.state.recentSessions).toEqual({ huaxue: bound })
    dispose()
  })

  it('still switches to huaxue when its bound session is opened explicitly', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    const bound = 'huaxue-blank'
    sessionState.ids.push(bound)
    sessionState.byId[bound] = { id: bound, sessionId: bound, blank: true, cwd: '/project' }
    workspaceState.items[0].sessionIds.push(bound)
    const { controller, dispose } = attachWorkbenchRouting(uiWorkspace, sessionState, workspaceState)
    controller.state.sessionBindings[bound] = 'huaxue'

    uiWorkspace.openSession(bound)
    await controller.queue
    await vi.waitFor(() => expect(sessionState.current).toBe(bound))

    expect(controller.state.active).toBe('huaxue')
    expect(controller.state.recentSessions.huaxue).toBe(bound)
    expect(uiWorkspace.sessions.create).not.toHaveBeenCalled()
    dispose()
  })
})
