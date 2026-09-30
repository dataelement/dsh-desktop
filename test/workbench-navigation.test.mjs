import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const Service = { tracker: Symbol('service-tracker') }

// Execute the installed Workspace service so these tests cover the patched
// navigation behavior while keeping Cordis boot and the renderer out of scope.
const source = await readFile(new URL('../node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js', import.meta.url), 'utf8')
const workbenchSource = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
const classStart = source.indexOf('class extends', source.indexOf('var UiWorkspaceService ='))
const classEnd = source.indexOf('\n\t\t};', classStart) + '\n\t\t};'.length
const recentStart = source.indexOf('function recentWorkspace(', classEnd)
const recentEnd = source.indexOf('\n\t\t//#endregion', recentStart)
if ([classStart, classEnd, recentStart, recentEnd].some(index => index < 0)) throw new Error('Workspace service extraction failed; check the installed Harness navigation module.')
const UiWorkspaceService = vm.runInNewContext(`(() => {
  ${source.slice(recentStart, recentEnd)}
  return (${source.slice(classStart, classEnd).trim().replace(/;$/, '')})
})()`, { _deepseek_ai_cordis: { Service: class {} }, AbortController, AbortSignal, console, setTimeout, clearTimeout })
let apply, Workbenches
vm.runInNewContext(workbenchSource, {
  window: { __ModuleLoader__: { load({ factory }) {
    const client = factory((name) => {
      if (name === 'react') return { createElement() {}, Component: class {} }
      if (name === '@deepseek-ai/cordis') return { Service }
      if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Switch: () => null }
      throw new Error(`Unexpected module ${name}`)
    })
    apply = client.apply
    Workbenches = client.Workbenches
  } } },
  setTimeout, clearTimeout, AbortController
})

function mainViewOf(sessionState) {
  return Object.keys(sessionState.byId).find(id => sessionState.byId[id].retainedBy?.mainView > 0)
}

function fixture() {
  const service = Object.create(UiWorkspaceService.prototype)
  let navigation = new AbortController()
  const sessionState = { phase: 'ready', ids: [], byId: {} }
  const workspaceState = { phase: 'ready', items: [{ workspaceId: 'project', path: '/project', createdAt: '2026-01-01T00:00:00Z', sessionIds: [] }], archivedSessionIds: [] }
  const listeners = new Set()
  const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
  service.sessionStarter = null
  service.sessionOpener = null
  service.sessionReuseFilter = null
  service.view = { markSessionRead: vi.fn() }
  service.sessionFilter = null
  service.sessionFilterUnsubscribe = null
  let visibilityRevision = 0
  const visibilityListeners = new Set()
  service.sessionVisibility = {
    getSnapshot: () => visibilityRevision,
    set: value => { visibilityRevision = value; for (const listener of visibilityListeners) listener() },
    subscribe: listener => { visibilityListeners.add(listener); return () => visibilityListeners.delete(listener) }
  }
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
    create: vi.fn(async ({ workspaceId, sessionId }) => {
      const target = workspaceState.items.find(item => item.workspaceId === workspaceId)
      if (!target) throw new Error(`Unknown workspace: ${workspaceId}`)
      const id = sessionId ?? 'new-session'
      if (!sessionState.byId[id]) sessionState.ids.push(id)
      sessionState.byId[id] = { id, sessionId: id, blank: true, cwd: target.path, displayTitle: 'New Session' }
      if (!target.sessionIds.includes(id)) target.sessionIds.push(id)
      return id
    }),
    // The real controller has no selection: uiWorkspace retains the main view
    // and the list projects that retention onto the summary.
    retainInfo: id => ({
      getSnapshot: () => {
        const retainedBy = sessionState.byId[id]?.retainedBy ?? {}
        return { referenceCount: Object.values(retainedBy).reduce((sum, count) => sum + count, 0), retainedBy }
      },
      subscribe
    }),
    retain: vi.fn((target, { source }) => {
      const id = typeof target === 'string' ? target : target.parentSessionId
      if (!sessionState.byId[id]) throw new Error(`Session not projected before retain: ${id}`)
      const count = delta => {
        const summary = sessionState.byId[id]
        const retainedBy = { ...summary.retainedBy, [source]: (summary.retainedBy?.[source] ?? 0) + delta }
        sessionState.byId[id] = { ...summary, retainedBy }
        for (const listener of listeners) listener()
      }
      count(1)
      return { sessionId: id, release: vi.fn(() => count(-1)) }
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
    fiber: { name: 'dsh-media-workbench', entry: { options: { name: 'dsh-media-workbench' } } },
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
  ctx.fiber.entry = { options: { name: 'huaxue' } }
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
  controller.lastSession = mainViewOf(sessionState)
  return {
    controller,
    dispose() {
      for (const cleanup of cleanups.reverse()) cleanup()
      controller.dispose()
    }
  }
}

describe('native Workspace navigation with workbench routing', () => {
  it('removes workspace folders that have no sessions in the active scope', () => {
    expect(source).toContain('sessionIds: workspace.sessionIds.filter(isSessionVisible)')
    expect(source).toContain('.filter((workspace) => workspace.sessionIds.length > 0)')
    expect(source).toContain('if (g.sessions.length === 0) continue;')
  })

  it('registers one reactive sidebar session filter and restores all sessions on release', () => {
    const { service } = fixture()
    const listeners = new Set()
    let active = 'writer'
    const release = service.registerSessionFilter((sessionId) => sessionId.startsWith(active), (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    })
    expect(service.isSessionVisible('writer-1')).toBe(true)
    expect(service.isSessionVisible('research-1')).toBe(false)
    expect(() => service.registerSessionFilter(() => true, () => () => {})).toThrow('already registered')
    active = 'research'
    for (const listener of listeners) listener()
    expect(service.sessionVisibility.getSnapshot()).toBe(2)
    expect(service.isSessionVisible('research-1')).toBe(true)
    release()
    expect(service.isSessionVisible('writer-1')).toBe(true)
    expect(listeners.size).toBe(0)
  })

  it('opens the initially connected workspace when no later navigation intervenes', async () => {
    const { service, listeners } = fixture()
    const cleanup = service.watchNavigation()
    await vi.waitFor(() => expect(service.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' }))
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
    expect(service.sessions.retain).not.toHaveBeenCalled()
    expect(service.sessions.create).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it('routes even a repeat click on the same session, then restores native opening on release', () => {
    const { service, sessionState } = fixture()
    const handler = vi.fn(() => true)
    const release = service.registerSessionOpener(handler)
    service.openSession('bound-session')
    expect(handler).toHaveBeenCalledWith('bound-session', 'explicit-session')
    expect(service.sessions.retain).not.toHaveBeenCalled()
    expect(() => service.registerSessionOpener(() => true)).toThrow('already registered')
    release()
    release()
    const second = service.registerSessionOpener(() => false)
    release()
    expect(() => service.registerSessionOpener(() => true)).toThrow('already registered')
    sessionState.byId['ordinary-session'] = { id: 'ordinary-session', sessionId: 'ordinary-session' }
    service.openSession('ordinary-session')
    expect(service.sessions.retain).toHaveBeenCalledWith('ordinary-session', { source: 'mainView' })
    expect(service.ctx.layout.selectPanel).toHaveBeenCalledWith(null)
    second()
  })

  it('marks a session opened indirectly through openWorkspace with the workspace source', async () => {
    const { service } = fixture()
    const handler = vi.fn(() => false)
    service.registerSessionOpener(handler)

    await service.openWorkspace('project')

    expect(handler).toHaveBeenCalledWith('new-session', 'workspace', { workspaceId: 'project', created: true })
    expect(service.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' })
  })

  it('keeps native mode when switching to a workspace whose blank session belongs to a workbench', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    const bound = 'workbench-blank'
    sessionState.ids.push(bound)
    sessionState.byId[bound] = { id: bound, sessionId: bound, blank: true, cwd: '/project' }
    workspaceState.items[0].sessionIds.push(bound)
    const { controller, dispose } = attachWorkbenchRouting(uiWorkspace, sessionState, workspaceState)
    controller.state.active = null
    controller.state.sessionBindings[bound] = 'media-workbench'

    await uiWorkspace.openWorkspace('project')
    await vi.waitFor(() => expect(uiWorkspace.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' }))

    expect(uiWorkspace.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project' })
    expect(mainViewOf(sessionState)).toBe('new-session')
    expect(controller.state.active).toBeNull()
    expect(controller.state.sessionBindings['new-session']).toBeUndefined()
    expect(uiWorkspace.sessions.retain).not.toHaveBeenCalledWith(bound, { source: 'mainView' })
    dispose()
  })

  it('reuses an ordinary blank and ignores a workbench blank when native mode switches workspaces', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    const bound = 'workbench-blank'
    const ordinary = 'ordinary-blank'
    sessionState.ids.push(bound, ordinary)
    sessionState.byId[bound] = { id: bound, sessionId: bound, blank: true, cwd: '/project' }
    sessionState.byId[ordinary] = { id: ordinary, sessionId: ordinary, blank: true, cwd: '/project' }
    workspaceState.items[0].sessionIds.push(bound, ordinary)
    const { controller, dispose } = attachWorkbenchRouting(uiWorkspace, sessionState, workspaceState)
    controller.state.active = null
    controller.state.sessionBindings[bound] = 'media-workbench'

    await uiWorkspace.openWorkspace('project')

    expect(uiWorkspace.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project', sessionId: ordinary })
    expect(mainViewOf(sessionState)).toBe(ordinary)
    expect(controller.state.active).toBeNull()
    expect(uiWorkspace.sessions.retain).not.toHaveBeenCalledWith(bound, { source: 'mainView' })
    dispose()
  })

  it.each(['writer', 'research-notebook', 'media-workbench'])('binds New Session to the active %s workbench', async (workbenchId) => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    workspaceState.items.push({ workspaceId: 'target-project', path: '/target', createdAt: '2026-01-02T00:00:00Z', sessionIds: [] })
    sessionState.ids.push('old-recent')
    sessionState.byId['old-recent'] = { id: 'old-recent', sessionId: 'old-recent', cwd: '/project', displayTitle: 'Old recent' }
    workspaceState.items[0].sessionIds.push('old-recent')
    const ctx = { fiber: { name: workbenchId, entry: { options: { name: workbenchId } } }, sessions: { ...uiWorkspace.sessions, refresh: vi.fn(async () => {}) }, workspaces: uiWorkspace.workspaces, layout: uiWorkspace.ctx.layout, uiWorkspace }
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
    uiWorkspace.registerSessionStarter((workspaceId) => {
      controller.run(controller.newSession(workspaceId))
      return true
    })
    uiWorkspace.startSession('target-project')
    await vi.waitFor(() => expect(uiWorkspace.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' }))
    await controller.queue

    expect(uiWorkspace.sessions.create).toHaveBeenCalledTimes(1)
    expect(uiWorkspace.sessions.create).toHaveBeenCalledWith({ workspaceId: 'target-project' })
    expect(controller.state.sessionBindings['new-session']).toBe(workbenchId)
    expect(controller.state.recentSessions[workbenchId]).toBe('new-session')
    expect(controller.state.active).toBe(workbenchId)
    expect(uiWorkspace.sessions.retain).not.toHaveBeenCalledWith('old-recent', { source: 'mainView' })
  })

  it('does not reuse a blank session already bound to a workbench when native New Session is clicked', async () => {
    const { service, sessionState, workspaceState } = fixture()
    const blankId = 'workbench-blank'
    sessionState.ids.push(blankId)
    sessionState.byId[blankId] = { id: blankId, sessionId: blankId, blank: true, cwd: '/project' }
    workspaceState.items[0].sessionIds.push(blankId)
    service.startSession('project')
    await vi.waitFor(() => expect(service.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' }))
    expect(service.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project' })
    expect(service.sessions.retain).not.toHaveBeenCalledWith(blankId, { source: 'mainView' })
    expect(sessionState.byId['new-session']).toMatchObject({ blank: true, cwd: '/project' })
    expect(workspaceState.items[0].sessionIds).toContain('new-session')
  })

  it('falls back to native New Session after the workbench is closed', async () => {
    const { service } = fixture()
    const handler = vi.fn(() => false)
    service.registerSessionStarter(handler)
    service.startSession('project')
    await vi.waitFor(() => expect(service.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' }))
    expect(handler).toHaveBeenCalledWith('project')
    expect(service.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project' })
    expect(service.ctx.layout.selectPanel).toHaveBeenCalledWith(null)
  })

  it('leaves the active workbench when workspace navigation opens a session owned by a removed provider', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    const removedSession = 'research-notebook-blank'
    sessionState.ids.push(removedSession)
    sessionState.byId[removedSession] = {
      id: removedSession, sessionId: removedSession, blank: true, cwd: '/project', displayTitle: 'New Session'
    }
    workspaceState.items[0].sessionIds.push(removedSession)

    const ctx = {
      fiber: { name: 'writer', entry: { options: { name: 'writer' } } },
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

    const retain = uiWorkspace.sessions.retain.getMockImplementation()
    uiWorkspace.sessions.retain.mockImplementation((...args) => {
      const reference = retain(...args)
      controller.selectionChanged()
      return reference
    })
    uiWorkspace.registerSessionOpener((sessionId) => {
      const id = controller.state.sessionBindings[sessionId]
      if (!controller.ready || !id || !controller.state.added.includes(id) || !controller.catalog.has(id)) return false
      controller.run(controller.open(id, sessionId))
      return true
    })

    await uiWorkspace.openWorkspace('project')
    await controller.queue

    expect(uiWorkspace.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project', sessionId: removedSession })
    expect(uiWorkspace.sessions.retain).toHaveBeenCalledWith(removedSession, { source: 'mainView' })
    expect(mainViewOf(sessionState)).toBe(removedSession)
    expect(controller.state.active).toBeNull()
    expect(controller.state.sessionBindings[removedSession]).toBe('research-notebook')
    expect(controller.state.recentSessions).toEqual({})
    expect(request).toHaveBeenCalledOnce()
    expect(workbenchSource).toContain('registerSessionStarter(')
  })

  it('creates a new media-workbench session without adopting an ordinary blank on workspace switch', async () => {
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
    await vi.waitFor(() => expect(uiWorkspace.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' }))

    expect(uiWorkspace.sessions.create).toHaveBeenCalledOnce()
    expect(mainViewOf(sessionState)).toBe('new-session')
    expect(controller.state.active).toBe('media-workbench')
    expect(controller.state.sessionBindings).toEqual({ [bound]: 'huaxue', 'new-session': 'media-workbench' })
    expect(controller.state.recentSessions).toEqual({ huaxue: bound, 'media-workbench': 'new-session' })
    expect(controller.state.sessionBindings[ordinary]).toBeUndefined()
    dispose()
  })

  it('creates an owner-bound session when workspace navigation finds another workbench blank', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    const bound = 'huaxue-blank'
    sessionState.ids.push(bound)
    sessionState.byId[bound] = { id: bound, sessionId: bound, blank: true, cwd: '/project' }
    workspaceState.items[0].sessionIds.push(bound)
    const { controller, dispose } = attachWorkbenchRouting(uiWorkspace, sessionState, workspaceState)
    controller.state.sessionBindings[bound] = 'huaxue'
    controller.state.recentSessions.huaxue = bound

    await uiWorkspace.openWorkspace('project')
    await vi.waitFor(() => expect(uiWorkspace.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' }))

    expect(uiWorkspace.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project' })
    expect(mainViewOf(sessionState)).toBe('new-session')
    expect(controller.state.active).toBe('media-workbench')
    expect(controller.state.sessionBindings['new-session']).toBe('media-workbench')
    expect(controller.state.recentSessions).toEqual({ huaxue: bound, 'media-workbench': 'new-session' })
    dispose()
  })

  it('creates and binds a session when the switched workspace was empty', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    workspaceState.items.push({ workspaceId: 'empty-project', path: '/empty', createdAt: '2026-01-02T00:00:00Z', sessionIds: [] })
    const { controller, dispose } = attachWorkbenchRouting(uiWorkspace, sessionState, workspaceState)

    await uiWorkspace.openWorkspace('empty-project')
    await vi.waitFor(() => expect(uiWorkspace.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' }))

    expect(uiWorkspace.sessions.create).toHaveBeenCalledWith({ workspaceId: 'empty-project' })
    expect(uiWorkspace.sessions.create).toHaveBeenCalledOnce()
    expect(controller.state.active).toBe('media-workbench')
    expect(controller.state.sessionBindings['new-session']).toBe('media-workbench')
    expect(controller.state.recentSessions['media-workbench']).toBe('new-session')
    dispose()
  })

  it('does not reuse an existing session already owned by the active workbench on workspace switch', async () => {
    const { service: uiWorkspace, sessionState, workspaceState } = fixture()
    const owned = 'media-owned-blank'
    sessionState.ids.push(owned)
    sessionState.byId[owned] = { id: owned, sessionId: owned, blank: true, cwd: '/project' }
    workspaceState.items[0].sessionIds.push(owned)
    const { controller, dispose } = attachWorkbenchRouting(uiWorkspace, sessionState, workspaceState)
    controller.state.sessionBindings[owned] = 'media-workbench'
    controller.state.recentSessions['media-workbench'] = owned

    await uiWorkspace.openWorkspace('project')
    await vi.waitFor(() => expect(uiWorkspace.sessions.retain).toHaveBeenCalledWith('new-session', { source: 'mainView' }))

    expect(uiWorkspace.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project' })
    expect(controller.state.sessionBindings[owned]).toBe('media-workbench')
    expect(controller.state.sessionBindings['new-session']).toBe('media-workbench')
    expect(controller.state.recentSessions['media-workbench']).toBe('new-session')
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
    await vi.waitFor(() => expect(mainViewOf(sessionState)).toBe(bound))

    expect(controller.state.active).toBe('huaxue')
    expect(controller.state.recentSessions.huaxue).toBe(bound)
    expect(uiWorkspace.sessions.create).not.toHaveBeenCalled()
    dispose()
  })

  it('waits for selected-session consumers to release before permanent deletion', async () => {
    const { service: uiWorkspace, sessionState } = fixture()
    const current = 'doomed'
    sessionState.ids.push(current)
    sessionState.byId[current] = { id: current, sessionId: current, cwd: '/project' }
    uiWorkspace.openSession(current)
    const conversation = uiWorkspace.sessions.retain(current, { source: 'conversation' })
    uiWorkspace.sessions.delete = vi.fn(async () => {
      expect(uiWorkspace.sessions.retainInfo(current).getSnapshot().referenceCount).toBe(0)
      expect(uiWorkspace.selection.getSnapshot()).toEqual({})
    })
    setTimeout(() => conversation.release(), 0)

    await uiWorkspace.deleteSession(current)

    expect(uiWorkspace.sessions.delete).toHaveBeenCalledWith(current)
    expect(mainViewOf(sessionState)).toBeUndefined()
    expect(uiWorkspace.selection.getSnapshot()).toEqual({})
  })

  it('does not steal later panel navigation when permanent deletion fails', async () => {
    const { service: uiWorkspace, sessionState } = fixture()
    const current = 'retained'
    const failure = new Error('session is still busy')
    let rejectDelete
    sessionState.ids.push(current)
    sessionState.byId[current] = { id: current, sessionId: current, cwd: '/project' }
    uiWorkspace.sessions.delete = vi.fn(() => new Promise((_resolve, reject) => { rejectDelete = reject }))
    uiWorkspace.openSession(current)

    const deleting = uiWorkspace.deleteSession(current)
    await vi.waitFor(() => expect(uiWorkspace.sessions.delete).toHaveBeenCalledWith(current))
    uiWorkspace.ctx.layout.selectPanel('desktop-workbenches')
    rejectDelete(failure)
    await expect(deleting).rejects.toBe(failure)

    expect(mainViewOf(sessionState)).toBeUndefined()
    expect(uiWorkspace.selection.getSnapshot()).toEqual({})
    expect(uiWorkspace.ctx.layout.selectPanel).toHaveBeenLastCalledWith('desktop-workbenches')
  })
})
