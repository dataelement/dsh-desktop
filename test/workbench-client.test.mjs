import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyState } from '../packages/dsh-desktop-workbenches/state.mjs'

const Service = { tracker: Symbol('service-tracker') }
let sidebarWide = false
let sidebarCollapsed = false
const document = { querySelector(selector) {
  if (selector === '[data-dsh-sidebar-root]') return sidebarWide ? { getAttribute: name => name === 'data-dsh-sidebar-wide' ? 'true' : null } : null
  if (selector === '[data-sidebar-collapsed]') return sidebarCollapsed ? {} : null
  return null
} }
const sessionValues = new Map()
const sessionStorage = {
  getItem: key => sessionValues.has(key) ? sessionValues.get(key) : null,
  setItem: (key, value) => sessionValues.set(key, String(value)),
  removeItem: key => sessionValues.delete(key),
  clear: () => sessionValues.clear()
}
// The Workbench feature is off by default; these behavior tests run as a user
// who switched it on. The default itself is covered by its own test.
const WORKBENCH_ENABLED = 'dsh-workbench-enabled'
const enabledStorage = {
  getItem: key => key === WORKBENCH_ENABLED ? 'true' : null,
  setItem: () => {},
  removeItem: () => {}
}
const clientWindow = { sessionStorage, localStorage: {
  getItem: key => sessionValues.has(key) ? sessionValues.get(key) : key === WORKBENCH_ENABLED ? 'true' : null,
  setItem: (key, value) => sessionValues.set(key, String(value)),
  removeItem: key => sessionValues.delete(key)
}, __ModuleLoader__: { load({ factory }) {
  const client = factory((name) => {
    if (name === 'react') return { createElement() {}, Component: class {} }
    if (name === '@deepseek-ai/cordis') return { Service }
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Switch: () => null }
    throw new Error(`Unexpected module ${name}`)
  })
  apply = client.apply
  clientInject = client.inject
  Workbenches = client.Workbenches
  Market = client.Market
  submissionAgentPrompt = client.submissionAgentPrompt
  developmentWorkbenchAgentPrompt = client.developmentWorkbenchAgentPrompt
  submissionWorkbenchAgentPrompt = client.submissionWorkbenchAgentPrompt
  copySubmissionPrompt = client.copySubmissionPrompt
} } }

// Windows checkout may rewrite this file to CRLF; source-contract assertions use LF.
const code = (await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')).replace(/\r\n/g, '\n')
let apply, clientInject, Workbenches, Market, submissionAgentPrompt, developmentWorkbenchAgentPrompt, submissionWorkbenchAgentPrompt, copySubmissionPrompt
vm.runInNewContext(code, {
  window: clientWindow,
  document,
  setTimeout: (...args) => setTimeout(...args), clearTimeout: (...args) => clearTimeout(...args), AbortController
})

function marketCard(service, tab = 'market') {
  let renderMarket
  let stateIndex = 0
  const testReact = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Component: class {},
    Fragment: Symbol('Fragment'),
    useState: (initial) => [stateIndex++ === 0 ? tab : initial, () => {}],
    useLayoutEffect: () => {},
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()
  }
  vm.runInNewContext(code, { window: { sessionStorage, localStorage: enabledStorage, __ModuleLoader__: { load({ factory }) {
    renderMarket = factory(name => name === 'react' ? testReact : name === '@deepseek-ai/cordis' ? { Service } : { Switch: () => null }).Market
  } } }, document, setTimeout, clearTimeout, AbortController })
  const tree = renderMarket({ service })
  const find = (node, predicate) => {
    if (Array.isArray(node)) return node.flatMap(item => find(item, predicate))
    if (!node || typeof node !== 'object') return []
    return [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)]
  }
  return find(tree, node => node.type === 'article')[0]
}

function cardButtons(card) {
  const buttons = []
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    if (node.type?.name === 'Button') buttons.push(node)
    visit(node.props?.children)
  }
  visit(card)
  return buttons.map(button => button.props.children.flat().filter(child => typeof child === 'string').join(''))
}

function interactiveMarket(service, tab = 'market') {
  let renderMarket
  let stateIndex = 0
  const state = []
  const testReact = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Component: class {},
    Fragment: Symbol('Fragment'),
    useState: (initial) => {
      const index = stateIndex++
      if (!(index in state)) state[index] = index === 0 ? tab : initial
      return [state[index], (value) => { state[index] = value }]
    },
    useLayoutEffect: () => {},
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()
  }
  vm.runInNewContext(code, { window: { sessionStorage, localStorage: enabledStorage, __ModuleLoader__: { load({ factory }) {
    renderMarket = factory(name => name === 'react' ? testReact : name === '@deepseek-ai/cordis' ? { Service } : { Switch: () => null }).Market
  } } }, document, setTimeout, clearTimeout, AbortController })
  const find = (node, predicate) => {
    if (Array.isArray(node)) return node.flatMap(item => find(item, predicate))
    if (!node || typeof node !== 'object') return []
    return [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)]
  }
  return {
    render: () => { stateIndex = 0; return renderMarket({ service }) },
    find,
    button: (tree, label) => find(tree, node => node.type?.name === 'Button' && node.props.children.flat().filter(child => typeof child === 'string').join('') === label)[0],
    modal: tree => find(tree, node => node.type?.name === 'ConfirmRemoveModal')[0]
  }
}

function sidebarSwitcher({ pinned = [], active = null, title = '工作台', workbenchId = 'writer' } = {}) {
  let renderSidebar
  let stateIndex = 0
  const state = []
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Component: class {},
    useState: initial => {
      const index = stateIndex++
      if (!(index in state)) state[index] = initial
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value }]
    },
    useRef: initial => ({ current: initial }),
    useLayoutEffect: () => {},
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()
  }
  const sandbox = { window: { sessionStorage, localStorage: clientWindow.localStorage, __ModuleLoader__: { load({ factory }) {
    factory(name => name === 'react' ? react : name === '@deepseek-ai/cordis' ? { Service } : { Switch: () => null })
  } } }, document, setTimeout, clearTimeout, AbortController }
  vm.runInNewContext(code.replace('    function MetaItem(', '    globalThis.__testSidebarSwitcher = WorkbenchSidebarSwitcher\n    function MetaItem('), sandbox)
  renderSidebar = sandbox.__testSidebarSwitcher
  const entry = { id: workbenchId, title, icon: '✦' }
  const service = {
    subscribe: () => () => {},
    getSnapshot: () => ({ state: { pinned, added: pinned, active, sessionBindings: {} }, catalog: pinned.map(() => entry), ready: true, pending: 0, marketOpen: false }),
    catalog: new Map(pinned.map(id => [id, entry])),
    activationFor: () => 'unknown',
    pluginFor: () => null,
    blocked: false,
    showMarket: vi.fn(), open: vi.fn(), openNative: vi.fn(), run: vi.fn()
  }
  let activePanelId = null
  const render = () => { stateIndex = 0; return renderSidebar({ service, wide: true, startSession: vi.fn(), usePanelInfo: selector => selector({ activePanelId }) }) }
  const find = (node, predicate) => {
    if (Array.isArray(node)) return node.flatMap(item => find(item, predicate))
    if (!node || typeof node !== 'object') return []
    return [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)]
  }
  return { render, find, service, selectPanel: id => { activePanelId = id } }
}

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); sidebarWide = false; sidebarCollapsed = false; sessionStorage.clear() })

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

// Harness 0.1.6 projects uiWorkspace's main view as a `mainView` retention.
function currentOf(list) {
  return Object.keys(list.byId).find(id => list.byId[id].retainedBy?.mainView > 0) ?? null
}

function selectIn(list, target) {
  for (const id of Object.keys(list.byId)) list.byId[id] = { ...list.byId[id], retainedBy: id === target ? { mainView: 1 } : {} }
}

function setFiberPackage(ctx, source, name = source) {
  ctx.fiber.name = name
  ctx.fiber.entry = { options: { name: source } }
}

function registerProvider(service, ctx, id, descriptor = {}, Component = () => null) {
  const source = `package-${id}`
  if (!service.remoteCatalog.some(entry => entry.id === id)) service.remoteCatalog.push({
    id, owner: 'test', repository: id, url: `https://github.com/test/${id}`, name: descriptor.title || id,
    categoryName: '其他', description: { zh: descriptor.title || id }, screenshots: [], version: '1.0.0', distribution: { name: source }
  })
  else service.remoteCatalog = service.remoteCatalog.map(entry => entry.id === id ? { ...entry, distribution: { ...entry.distribution, name: source } } : entry)
  setFiberPackage(ctx, source)
  return service.register(descriptor, Component)
}

async function fixture(initial = emptyState()) {
  let stored = { revision: 0, state: structuredClone(initial) }
  const list = { ids: ['old', 'writer-1', 'writer-2', 'research-1'], byId: {} }
  for (const id of list.ids) list.byId[id] = { sessionId: id, displayTitle: id }
  const projects = [{ workspaceId: 'project-1', title: 'User project', sessionIds: [...list.ids] }]
  let sessionCount = 0
  let navigation = new AbortController()
  let service
  const ctx = {
    fiber: { name: 'fixture', entry: { options: { name: 'fixture' } } },
    sessions: {
      list: { getSnapshot: () => list },
      refresh: vi.fn(async () => {}),
      create: vi.fn(async ({ workspaceId }) => {
        const id = `fresh-${++sessionCount}`
        list.ids.push(id)
        list.byId[id] = { sessionId: id, displayTitle: id }
        projects.find(item => item.workspaceId === workspaceId).sessionIds.push(id)
        return id
      }),
      stop: vi.fn(() => { throw new Error('Navigation must not stop tasks') })
    },
    layout: {
      selectPanel: vi.fn(),
      toggleSidebar: vi.fn(() => { sidebarCollapsed = !sidebarCollapsed }),
      beginNavigation: vi.fn(() => { navigation.abort(); navigation = new AbortController(); return navigation.signal })
    },
    uiWorkspace: {
      pickDirectory: vi.fn(async () => '/chosen/new-project'),
      openSession: vi.fn((id) => { selectIn(list, id); service?.selectionChanged() })
    },
    workspaces: {
      list: { getSnapshot: () => ({ items: projects }) },
      create: vi.fn(async ({ path }) => {
        const workspace = { workspaceId: `project-${projects.length + 1}`, title: path, sessionIds: [] }
        projects.push(workspace)
        return workspace
      })
    }
  }
  const request = vi.fn(async (url, options = {}) => {
    if (url === '/api/desktop-workbenches/catalog' || url === '/api/desktop-workbenches/catalog?force=1') return Response.json({
      stale: false,
      catalog: { schemaVersion: 2, kind: 'catalog', categories: [], workbenches: [
        { id: 'writer', owner: 'test', repository: 'writer', url: 'https://github.com/test/writer', name: 'Writer', category: 'other', description: { zh: 'Writer' }, screenshots: [], version: '1.0.0', distribution: { name: 'writer' } },
        { id: 'research', owner: 'test', repository: 'research', url: 'https://github.com/test/research', name: 'Research', category: 'other', description: { zh: 'Research' }, screenshots: [], version: '1.0.0', distribution: { name: 'research' } }
      ] }
    })
    if (options.method !== 'POST') return Response.json(stored)
    const payload = JSON.parse(options.body)
    if (payload.revision !== stored.revision) return Response.json({ error: 'Conflict' }, { status: 409 })
    try {
      stored = { revision: stored.revision + 1, state: structuredClone(payload.state) }
      return Response.json(stored)
    } catch (error) { return Response.json({ error: error.message }, { status: error.status || 500 }) }
  })
  service = new Workbenches(ctx, request)
  setFiberPackage(ctx, 'writer')
  service.register({ title: 'Writer' }, () => null)
  setFiberPackage(ctx, 'research')
  service.register({ title: 'Research' }, () => null)
  await service.load()
  return {
    service, ctx, request, list,
    saved: () => structuredClone(stored),
    externalUpdate: (state = stored.state) => { stored = { revision: stored.revision + 1, state: structuredClone(state) } }
  }
}

const boundState = () => ({ ...emptyState(), added: ['writer', 'research'],
  sessionBindings: { 'writer-1': 'writer', 'writer-2': 'writer', 'research-1': 'research' },
  recentSessions: { writer: 'writer-1', research: 'research-1' }, notes: { writer: 'Retained business draft' } })

describe('desktop workbench client navigation', () => {
  it('declares the native plugin manager injection and keeps the market available when access fails', async () => {
    expect(clientInject).toContain('remote.pluginManager')
    const { service, ctx } = await fixture()
    Object.defineProperty(ctx, 'remote', { configurable: true, get() { throw new Error('cannot get property "remote.pluginManager" without inject') } })
    await expect(service.refreshNative()).resolves.toBeUndefined()
    expect(service.native.status).toBe('unavailable')
    service.dispose()
  })

  it('uses the native plugin manager as the running-state source and hides closed workbenches', async () => {
    const { service, ctx } = await fixture({ ...boundState(), pinned: ['writer'], active: null })
    let enabled = true
    ctx.remote = { pluginManager: {
      listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'writer', enabled, installed: true, rows: [] }] })),
      setBundleEnabled: vi.fn(async (_name, next) => { enabled = next; return { ok: true, value: { changed: true, application: 'applied' } } })
    } }
    service.installs = { writer: { pluginName: 'writer' } }
    await service.refreshNative()
    expect(service.activationFor(service.catalog.get('writer'))).toBe('on')
    let ui = sidebarSwitcher({ pinned: ['writer'] })
    ui.service.activationFor = entry => service.activationFor(entry)
    expect(ui.find(ui.render(), node => node.props?.className === 'dshWbModeSwitch')).toHaveLength(1)
    await service.setPluginEnabled('writer', false)
    expect(ctx.remote.pluginManager.setBundleEnabled).toHaveBeenCalledWith('writer', false)
    expect(service.activationFor(service.catalog.get('writer'))).toBe('off')
    expect(ui.find(ui.render(), node => node.props?.className === 'dshWbModeSwitch')).toHaveLength(0)
    enabled = true // The native Plugins page changed it.
    await service.refreshNative()
    expect(service.activationFor(service.catalog.get('writer'))).toBe('on')
    expect(ui.find(ui.render(), node => node.props?.className === 'dshWbModeSwitch')).toHaveLength(1)
    ctx.remote.pluginManager.setBundleEnabled.mockResolvedValueOnce({ ok: true, value: { changed: false, application: 'failed', error: { diagnostic: 'native failure' } } })
    await expect(service.setPluginEnabled('writer', false)).rejects.toThrow('native failure')
    expect(service.activationFor(service.catalog.get('writer'))).toBe('on')
    expect(service.togglingPlugin).toBe(null)
  })

  it('keeps a disabled listed workbench controllable after its provider unloads', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'], pinned: ['o/helper'], favorites: ['o/helper'] })
    service.remoteCatalog = [{
      id: 'o/helper', owner: 'o', url: 'https://github.com/o/helper', name: 'Helper',
      categoryName: '效率', description: { zh: '整理资料。' }, screenshots: [],
      version: '1.0.0', distribution: { type: 'npm', name: 'helper', version: '1.0.0' }
    }]
    let enabled = true
    ctx.remote = { pluginManager: {
      listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'helper', installed: true, enabled }] })),
      setBundleEnabled: vi.fn(async (_name, next) => { enabled = next; return { ok: true, value: { application: 'applied' } } })
    } }
    setFiberPackage(ctx, 'helper')
    const unregister = service.register({ title: 'Helper' }, () => null)
    await service.refreshNative()
    const nav = sidebarSwitcher({ pinned: ['o/helper'], workbenchId: 'o/helper' })
    nav.service.getSnapshot = () => service.getSnapshot()
    nav.service.catalog = service.catalog
    nav.service.activationFor = entry => service.activationFor(entry)
    expect(nav.find(nav.render(), node => node.props?.className === 'dshWbModeSwitch')).toHaveLength(1)

    await service.setPluginEnabled('helper', false)
    unregister() // Native plugin shutdown unloads its client provider.
    const listedEntry = () => service.getSnapshot().catalog.find(item => item.catalogId === 'o/helper')
    expect(service.pluginFor(listedEntry())).toBe('helper')
    expect(service.activationFor(listedEntry())).toBe('off')
    expect(listedEntry().loadFailure).toBe('')
    nav.service.catalog = service.catalog
    expect(nav.find(nav.render(), node => node.props?.className === 'dshWbModeSwitch')).toHaveLength(0)

    const mine = interactiveMarket(service, 'mine')
    const card = mine.find(mine.render(), node => node.type === 'article')[0]
    const toggle = mine.find(card, node => node.props?.role === 'switch')[0]
    expect(toggle.props.disabled).toBe(false)
    expect(toggle.props['aria-checked']).toBe(false)
    expect(toggle.props.title).toBe('已关闭')
    expect(JSON.stringify(card)).not.toContain('安装失败')
    const market = interactiveMarket(service)
    const marketCard = market.find(market.render(), node => node.type === 'article')[0]
    expect(market.find(marketCard, node => node.props?.className === 'dshWbInstalled')[0].props.children).toEqual(['已安装'])
    expect(market.find(marketCard, node => node.props?.role === 'switch')).toHaveLength(0)
    const favorites = interactiveMarket(service, 'favorites')
    const favoriteCard = favorites.find(favorites.render(), node => node.type === 'article')[0]
    expect(favorites.find(favoriteCard, node => node.props?.className === 'dshWbInstalled')[0].props.children).toEqual(['已安装'])
    expect(favorites.find(favoriteCard, node => node.props?.role === 'switch')).toHaveLength(0)

    toggle.props.onClick()
    await vi.waitFor(() => expect(ctx.remote.pluginManager.setBundleEnabled).toHaveBeenCalledWith('helper', true))
    await vi.waitFor(() => expect(service.activationFor(listedEntry())).toBe('on'))
    expect(nav.find(nav.render(), node => node.props?.className === 'dshWbModeSwitch')).toHaveLength(0)
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper' }, () => null)
    nav.service.catalog = service.catalog
    expect(nav.find(nav.render(), node => node.props?.className === 'dshWbModeSwitch')).toHaveLength(1)
  })

  it('remembers an unlisted local provider when its native bundle is disabled', async () => {
    const id = 'cinderzhan/dsh-bid-workbench'
    const name = 'dsh-bid-workbench'
    const initial = { ...emptyState(), added: [id], pinned: [id] }
    const { service, ctx } = await fixture(initial)
    let enabled = true
    const pluginManager = {
      listBundles: vi.fn(async () => ({ ok: true, value: [{ name, installed: true, enabled }] })),
      setBundleEnabled: vi.fn(async (_name, next) => { enabled = next; return { ok: true, value: { application: 'applied' } } })
    }
    ctx.remote = { pluginManager }
    setFiberPackage(ctx, name)
    const unregister = service.register({ title: '投标作战室', repository: `https://github.com/${id}`,
      description: '对齐招标要求与内部证据。' }, () => null)
    await service.refreshNative()
    expect(service.remoteCatalog.some(item => item.id === id)).toBe(false)
    expect(service.installs[id]).toBeUndefined()

    await service.setPluginEnabled(name, false)
    unregister()
    const entry = service.getSnapshot().catalog.find(item => item.id === id)
    expect(entry).toMatchObject({ title: '投标作战室', sourcePackage: name, local: true, loadFailure: '' })
    expect(service.activationFor(entry)).toBe('off')
    const ui = interactiveMarket(service, 'mine')
    const card = ui.find(ui.render(), node => node.type === 'article' && node.props.key === id)[0]
    const toggle = ui.find(card, node => node.props?.role === 'switch')[0]
    expect(toggle.props.disabled).toBe(false)
    expect(toggle.props['aria-checked']).toBe(false)
    expect(JSON.stringify(card)).not.toContain('安装失败')
    toggle.props.onClick()
    await vi.waitFor(() => expect(pluginManager.setBundleEnabled).toHaveBeenCalledWith(name, true))
    await vi.waitFor(() => expect(service.activationFor(entry)).toBe('on'))

    // The stored identity also restores the disabled card on the next launch.
    enabled = false
    const restarted = await fixture(initial)
    restarted.ctx.remote = { pluginManager }
    await restarted.service.refreshNative()
    const restored = restarted.service.getSnapshot().catalog.find(item => item.id === id)
    expect(restored).toMatchObject({ title: '投标作战室', sourcePackage: name, local: true, loadFailure: '' })
    expect(restarted.service.activationFor(restored)).toBe('off')
    const nextUi = interactiveMarket(restarted.service, 'mine')
    const nextCard = nextUi.find(nextUi.render(), node => node.type === 'article' && node.props.key === id)[0]
    expect(nextUi.find(nextCard, node => node.props?.role === 'switch')[0].props.disabled).toBe(false)
  })

  it('restores the last native workspace when switching back from a workbench', async () => {
    const { service, ctx, list } = await fixture(boundState())
    const workspaces = ctx.workspaces.list.getSnapshot().items
    workspaces.push({ workspaceId: 'project-2', title: 'Other project', sessionIds: ['native-2'] })
    list.ids.push('native-2')
    list.byId['native-2'] = { sessionId: 'native-2', displayTitle: 'Native session' }
    selectIn(list, 'native-2')
    service.selectionChanged()
    await service.open('writer')

    const startSession = vi.fn()
    await service.openNative(startSession)

    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('native-2')
    expect(currentOf(list)).toBe('native-2')
    expect(startSession).not.toHaveBeenCalled()
    expect(service.state.active).toBeNull()
  })

  it('starts in the last native workspace when its previous session is gone', async () => {
    const { service, ctx, list } = await fixture(boundState())
    ctx.workspaces.list.getSnapshot().items.push({ workspaceId: 'project-2', title: 'Other project', sessionIds: ['native-2'] })
    list.ids.push('native-2')
    list.byId['native-2'] = { sessionId: 'native-2', displayTitle: 'Native session' }
    selectIn(list, 'native-2')
    service.selectionChanged()
    await service.open('writer')
    delete list.byId['native-2']

    const startSession = vi.fn()
    await service.openNative(startSession)

    expect(startSession).toHaveBeenCalledWith('project-2')
  })

  it('removes a shared workspace only from the active workbench while keeping both session groups', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    const workspace = ctx.workspaces.list.getSnapshot().items[0]
    const visibilityChanged = vi.fn()
    const unsubscribe = service.subscribeWorkspaceVisibility(visibilityChanged)
    await service.open('writer')
    const beforeRemoval = visibilityChanged.mock.calls.length
    service.publish()
    expect(visibilityChanged).toHaveBeenCalledTimes(beforeRemoval)
    expect(await service.hideWorkspace(workspace.workspaceId)).toBe(true)
    expect(visibilityChanged).toHaveBeenCalledTimes(beforeRemoval + 1)
    expect(service.workspaceVisible(workspace.workspaceId)).toBe(false)
    expect(service.defaultWorkspace()).toBeUndefined()
    expect(saved().state.hiddenWorkspaces).toEqual({ writer: [workspace.workspaceId] })
    expect(saved().state.sessionBindings).toEqual(boundState().sessionBindings)
    expect(workspace.sessionIds).toContain('writer-1')
    expect(workspace.sessionIds).toContain('research-1')
    await expect(service.newSession(workspace.workspaceId)).rejects.toThrow('已从当前工作台移除')
    await service.open('research')
    expect(service.workspaceVisible(workspace.workspaceId)).toBe(true)
    expect(service.defaultWorkspace()?.workspaceId).toBe(workspace.workspaceId)
    await service.open('writer')
    expect(service.workspaceVisible(workspace.workspaceId)).toBe(false)
    await service.openNative(vi.fn())
    expect(service.workspaceVisible(workspace.workspaceId)).toBe(true)
    unsubscribe()
  })

  it('restores a hidden workspace when its folder is explicitly added again', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    const workspace = ctx.workspaces.list.getSnapshot().items[0]
    await service.open('writer')
    await service.hideWorkspace(workspace.workspaceId)
    ctx.workspaces.create.mockResolvedValueOnce(workspace)
    const sessionId = await service.newWorkspaceSession()
    expect(ctx.workspaces.create).toHaveBeenCalledWith({ path: '/chosen/new-project' })
    expect(ctx.sessions.create).toHaveBeenCalledWith({ workspaceId: workspace.workspaceId })
    expect(saved().state.sessionBindings[sessionId]).toBe('writer')
    expect(saved().state.hiddenWorkspaces).toEqual({})
    expect(service.workspaceVisible(workspace.workspaceId)).toBe(true)
  })

  it('keeps the sidebar state unchanged when a workbench enters the foreground', async () => {
    const { service, ctx } = await fixture()
    sidebarWide = true
    registerProvider(service, ctx, 'writer', { title: 'Writer' })
    await service.add('writer')
    await service.open('writer')
    expect(ctx.layout.toggleSidebar).not.toHaveBeenCalled()
    await service.open('writer')
    expect(ctx.layout.toggleSidebar).not.toHaveBeenCalled()
  })

  it('migrates legacy market identities to repository identities and preserves owned data', async () => {
    const legacy = { ...emptyState(), added: ['ming-life'], pinned: ['ming-life'], favorites: ['ming-life'], active: 'ming-life',
      sessionBindings: { old: 'ming-life' }, recentSessions: { 'ming-life': 'old' }, notes: { 'ming-life': 'Keep me' }, hiddenWorkspaces: { 'ming-life': ['project-1'] } }
    const { service, request, saved } = await fixture(legacy)
    service.remoteCatalog = [{ id: 'dataelement/dsh-ming-life', workbenchId: 'wb-dataelement-dsh-ming-life', legacyWorkbenchIds: ['ming-life'],
      owner: 'dataelement', url: 'https://github.com/dataelement/dsh-ming-life', name: 'Ming Life', categoryName: '其他',
      description: { zh: 'Ming Life' }, screenshots: [], version: '1.0.0', distribution: { name: 'ming-life' } }]

    service.migrateLegacyWorkbenchIds()
    await service.queue

    expect(request).toHaveBeenCalledWith('/api/desktop-workbenches/state/migrate', expect.objectContaining({ method: 'POST' }))
    expect(saved()).toEqual({ revision: 1, state: { ...legacy,
      added: ['dataelement/dsh-ming-life'], pinned: ['dataelement/dsh-ming-life'], favorites: ['dataelement/dsh-ming-life'], active: 'dataelement/dsh-ming-life',
      sessionBindings: { old: 'dataelement/dsh-ming-life' }, recentSessions: { 'dataelement/dsh-ming-life': 'old' }, notes: { 'dataelement/dsh-ming-life': 'Keep me' },
      hiddenWorkspaces: { 'dataelement/dsh-ming-life': ['project-1'] } } })
  })

  it('tracks the market as the current sidebar destination and clears it when a workbench opens', async () => {
    const { service, ctx, request } = await fixture()
    service.showMarket()
    expect(service.getSnapshot().marketOpen).toBe(true)
    expect(ctx.layout.selectPanel).toHaveBeenLastCalledWith('desktop-workbenches')
    expect(request).toHaveBeenCalledWith('/api/desktop-workbenches/catalog?force=1', expect.objectContaining({ cache: 'no-store' }))
    await service.catalogRefresh

    await service.add('writer')
    await service.open('writer')
    expect(service.getSnapshot().marketOpen).toBe(false)
    expect(ctx.layout.selectPanel).toHaveBeenLastCalledWith(null)
    service.dispose()
  })

  it('refreshes the catalog without changing navigation or persisted workbench state', async () => {
    const { service, request } = await fixture(boundState())
    service.setMarketOpen(true)
    const before = structuredClone(service.state)
    request.mockImplementationOnce(async (url) => {
      expect(url).toBe('/api/desktop-workbenches/catalog?force=1')
      return Response.json({ stale: false, catalog: {
        schemaVersion: 2, kind: 'catalog', categories: [{ id: 'productivity', name: { zh: '效率' } }],
        workbenches: [{ id: 'owner/new', owner: 'owner', repository: 'new', url: 'https://github.com/owner/new', name: 'New', category: 'productivity', description: { zh: 'New' }, screenshots: [] }]
      } })
    })

    await service.refreshCatalog()

    expect(service.state).toEqual(before)
    expect(service.getSnapshot()).toMatchObject({ marketOpen: true, catalogRefreshing: false, catalogError: '' })
    expect(service.getSnapshot().catalog.some(entry => entry.catalogId === 'owner/new')).toBe(true)
  })

  it('restores the market after a renderer reload and clears the marker after leaving it', async () => {
    const first = await fixture(boundState())
    first.service.showMarket()
    await first.service.catalogRefresh
    expect(sessionStorage.getItem('dsh-desktop-workbenches.market-open.v1')).toBe('true')

    const reloaded = new Workbenches(first.ctx, first.request)
    // The sidebar icon may briefly mount inactive before the async service load
    // restores the selected panel after Cmd-R.
    reloaded.setMarketOpen(false)
    setFiberPackage(first.ctx, 'writer')
    reloaded.register({ title: 'Writer' }, () => null)
    setFiberPackage(first.ctx, 'research')
    reloaded.register({ title: 'Research' }, () => null)
    await reloaded.load()
    expect(reloaded.getSnapshot().marketOpen).toBe(true)
    expect(first.ctx.layout.selectPanel).toHaveBeenLastCalledWith('desktop-workbenches')

    await reloaded.open('writer')
    expect(sessionStorage.getItem('dsh-desktop-workbenches.market-open.v1')).toBeNull()
    const afterLeaving = new Workbenches(first.ctx, first.request)
    expect(afterLeaving.getSnapshot().marketOpen).toBe(false)
    reloaded.dispose()
    afterLeaving.dispose()
  })

  it('merges Awesome metadata with loaded providers without treating remote entries as installed', async () => {
    const { service, request } = await fixture()
    request.mockImplementation(async (url, options = {}) => {
      if (url === '/api/desktop-workbenches/catalog') return Response.json({ stale: false, catalog: {
        schemaVersion: 2, kind: 'catalog', categories: [{ id: 'content', name: { zh: '内容' } }],
        workbenches: [{ id: 'owner/remote', owner: 'owner', repository: 'remote', url: 'https://github.com/owner/remote',
          name: '远程工作台', category: 'content', description: { zh: '中文简介', en: 'English description' },
          version: '1.0.0', license: 'MIT', distribution: { type: 'github-source', name: 'remote-package', version: '1.0.0' },
          screenshots: [{ url: 'https://raw.githubusercontent.com/owner/remote/main/shot.png' }] }]
      } })
      if (options.method !== 'POST') return Response.json({ revision: 0, state: emptyState() })
      return Response.json({ revision: 1, state: JSON.parse(options.body).state })
    })
    await service.load()
    const entry = service.getSnapshot().catalog.find(item => item.catalogId === 'owner/remote')
    expect(entry).toMatchObject({ id: 'owner/remote', title: '远程工作台', category: '内容', description: '中文简介', installed: false })
    // Submissions choose from the market's own list, not a Desktop copy.
    expect(service.getSnapshot().categories).toEqual([{ id: 'content', name: '内容' }])
    await service.toggleFavorite('owner/remote')
    expect(service.state.favorites).toEqual(['owner/remote'])
    await expect(service.add('owner/remote')).rejects.toThrow('工作台当前不可用')
  })

  it('associates a provider through its caller package and repository catalog identity', async () => {
    const { service, ctx } = await fixture()
    service.remoteCatalog = [{
      id: 'owner/remote', owner: 'owner', url: 'https://github.com/owner/remote', name: '远程工作台',
      categoryName: '内容', description: { zh: '中文简介', en: 'English description' }, screenshots: [], distribution: { name: 'remote-package' }
    }]
    setFiberPackage(ctx, 'remote-package')
    service.register({ title: '本地标题' }, () => null)
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'owner/remote')).toMatchObject({
      id: 'owner/remote', title: '远程工作台', installed: true
    })
    service.dispose()
  })

  it('registers two real packages that share a generated fiber name and resolves calls by entry identity', async () => {
    const { service, ctx } = await fixture()
    service.remoteCatalog = [
      { id: 'dataelement/dsh-site-selection', owner: 'dataelement', url: 'https://github.com/dataelement/dsh-site-selection', name: '门店选址', categoryName: '运营', description: { zh: '门店选址' }, screenshots: [], distribution: { name: 'dsh-site-selection' } },
      { id: 'dataelement/dsh-ming-life', owner: 'dataelement', url: 'https://github.com/dataelement/dsh-ming-life', name: '玄学人生', categoryName: '其他', description: { zh: '玄学人生' }, screenshots: [], distribution: { name: 'ming-life' } }
    ]

    setFiberPackage(ctx, 'dsh-site-selection', 'cf')
    service.register({ title: '门店选址' }, () => null)
    setFiberPackage(ctx, 'ming-life', 'cf')
    service.register({ title: '玄学人生' }, () => null)

    expect([...service.providers.keys()]).toEqual(expect.arrayContaining(['dsh-site-selection', 'ming-life']))
    expect([...service.catalog.keys()]).toEqual(expect.arrayContaining(['dataelement/dsh-site-selection', 'dataelement/dsh-ming-life']))
    expect(service.getSnapshot().catalog.filter(entry => entry.installed).map(entry => entry.catalogId)).toEqual(expect.arrayContaining(['dataelement/dsh-site-selection', 'dataelement/dsh-ming-life']))
    await service.add('dataelement/dsh-site-selection')
    await service.add('dataelement/dsh-ming-life')
    await service.open('dataelement/dsh-site-selection')
    setFiberPackage(ctx, 'dsh-site-selection', 'cf')
    expect(service.isActive()).toBe(true)
    setFiberPackage(ctx, 'ming-life', 'cf')
    expect(service.isActive()).toBe(false)
    await expect(service.ensureSession({ folder: '/business' })).rejects.toThrow('请先打开')
  })

  it('rejects a repeated real package entry even if its generated fiber name changes', async () => {
    const { service, ctx } = await fixture()
    service.remoteCatalog = [{ id: 'dataelement/dsh-ming-life', owner: 'dataelement', url: 'https://github.com/dataelement/dsh-ming-life', name: '玄学人生', categoryName: '其他', description: { zh: '玄学人生' }, screenshots: [], distribution: { name: 'ming-life' } }]
    setFiberPackage(ctx, 'ming-life', 'cf')
    service.register({ title: '玄学人生' }, () => null)
    setFiberPackage(ctx, 'ming-life', 'another-generated-name')
    expect(() => service.register({ title: '重复的玄学人生' }, () => null)).toThrow('Duplicate workbench provider: ming-life')
    delete ctx.fiber.entry
    expect(() => service.register({ title: '缺少真实包名' }, () => null)).toThrow('client package entry name')
  })

  it('derives an unlisted local provider identity from its GitHub repository', async () => {
    const { service, ctx, saved } = await fixture()
    setFiberPackage(ctx, 'local-package')
    service.register({ title: 'Local workbench', repository: 'https://github.com/Owner/Local-Workbench.git' }, () => null)
    await service.queue
    expect(service.getSnapshot().catalog).toContainEqual(expect.objectContaining({
      id: 'owner/local-workbench', catalogId: 'owner/local-workbench', sourcePackage: 'local-package', installed: true, listed: false, local: true
    }))
    expect(saved().state.added).toContain('owner/local-workbench')
    expect(saved().state.pinned).toContain('owner/local-workbench')
    service.dispose()
  })

  it('pins an existing local provider and keeps explicit removal after reload', async () => {
    const id = 'owner/local'
    const { service, ctx, saved } = await fixture({ ...emptyState(), added: [id] })
    setFiberPackage(ctx, 'local-package')
    const unregister = service.register({ title: 'Local', repository: `https://github.com/${id}` }, () => null)
    await service.queue
    expect(saved().state.pinned).toContain(id)
    await service.remove(id)
    unregister()
    service.register({ title: 'Local', repository: `https://github.com/${id}` }, () => null)
    await service.queue
    await service.load()
    expect(saved().state.added).not.toContain(id)
    expect(saved().state.pinned).not.toContain(id)
  })

  it('adds a local provider registered before loading finishes', async () => {
    const { ctx, request, saved } = await fixture()
    const loading = new Workbenches(ctx, request)
    setFiberPackage(ctx, 'preload-local')
    loading.register({ title: 'Preload local', repository: 'https://github.com/owner/preload-local' }, () => null)
    await loading.load()
    await loading.queue
    expect(saved().state.added).toContain('owner/preload-local')
    expect(saved().state.pinned).toContain('owner/preload-local')
    loading.dispose()
  })

  it('does not expose a provider when its repository disagrees with the market', async () => {
    const { service, ctx } = await fixture()
    service.remoteCatalog = [{
      id: 'owner/listed', owner: 'owner', url: 'https://github.com/owner/listed', name: 'Listed',
      categoryName: '其他', description: { zh: 'Listed' }, screenshots: [], distribution: { name: 'local-package' }
    }]
    setFiberPackage(ctx, 'local-package')
    service.register({ title: 'Wrong', repository: 'https://github.com/owner/other' }, () => null)
    expect(service.catalog.size).toBe(0)
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'owner/listed')).toMatchObject({ installed: false })
    service.dispose()
  })

  it('reconciles a market install through its caller package identity', async () => {
    const { service, ctx, saved } = await fixture()
    service.remoteCatalog = [{
      id: 'owner/workbench', owner: 'owner', url: 'https://github.com/owner/workbench', name: '工作台',
      categoryName: '其他', description: { zh: '市场声明仓库身份' }, screenshots: [], distribution: { name: 'workbench-package' }
    }]
    service.installs = {
      'owner/workbench': { catalogId: 'owner/workbench', pluginName: 'workbench-package', version: '1.0.0' }
    }

    setFiberPackage(ctx, 'workbench-package')
    service.register({ title: '工作台' }, () => null)
    await service.queue

    const entry = service.getSnapshot().catalog.find(item => item.catalogId === 'owner/workbench')
    expect(entry).toMatchObject({ id: 'owner/workbench', catalogId: 'owner/workbench', installed: true })
    expect(saved().state.added).toEqual(['owner/workbench'])
    expect(saved().state.pinned).toEqual(['owner/workbench'])
    service.dispose()
  })

  it('uses the market version for a listed provider and keeps local provider versions', async () => {
    const { service, ctx } = await fixture()
    service.remoteCatalog = [{
      id: 'owner/workbench', owner: 'owner', url: 'https://github.com/owner/workbench', name: '工作台', version: '1.2.0',
      categoryName: '其他', description: { zh: '市场版本' }, screenshots: [], distribution: { name: 'workbench-package' }
    }]
    setFiberPackage(ctx, 'workbench-package')
    service.register({ title: '工作台', version: '0.1.1' }, () => null)
    expect(service.getSnapshot().catalog.find(item => item.catalogId === 'owner/workbench')).toMatchObject({
      version: '1.2.0', listedVersion: '1.2.0'
    })

    setFiberPackage(ctx, 'local-package')
    service.register({ title: '本地工作台', repository: 'https://github.com/owner/local', version: '0.3.0' }, () => null)
    expect(service.getSnapshot().catalog.find(item => item.catalogId === 'owner/local')).toMatchObject({ version: '0.3.0' })
    service.dispose()
  })

  it('shows an unpinned local workbench in Installed with a local badge', async () => {
    const { service, ctx } = await fixture()
    setFiberPackage(ctx, 'local-package')
    service.register({ title: '本地示例', repository: 'https://github.com/owner/local' }, () => null)
    const ui = interactiveMarket(service, 'mine')
    const cards = ui.find(ui.render(), node => node.type === 'article')
    const local = cards.find(card => card.props.key === 'owner/local')
    expect(local).toBeDefined()
    expect(ui.find(local, node => node.props?.className === 'dshWbCategory').some(node => node.props.children.includes('本地'))).toBe(true)
    expect(cardButtons(local)).toEqual([])
    expect(ui.find(local, node => node.props?.role === 'switch')).toHaveLength(1)
    service.dispose()
  })

  it('does not register the retired notebook templates when the plugin is applied', () => {
    let service
    const ctx = {
      fiber: { name: 'external-package', entry: { options: { name: 'external-package' } } },
      reflect: { provide: (name, value) => { if (name === 'desktopWorkbenches') service = value } },
      effect: (callback, label) => {
        // Exercise registration effects without mounting DOM styles or starting network I/O.
        if (!['workbenches: styles', 'workbenches: lifecycle'].includes(label)) callback()
      },
      slots: { inject: (_name, callback) => callback(), register: vi.fn() },
      sessions: { list: { subscribe: vi.fn() } },
      uiWorkspace: { registerSessionOpener: vi.fn(), registerSessionReuseFilter: vi.fn(), registerSessionFilter: vi.fn() }
    }
    apply(ctx)
    expect(service).toBeInstanceOf(Workbenches)
    expect(service.getSnapshot().catalog).toEqual([])
    service.remoteCatalog = [{ id: 'owner/external-workbench', owner: 'owner', repository: 'external-workbench', url: 'https://github.com/owner/external-workbench', name: 'External workbench', categoryName: '其他', description: { zh: 'External workbench' }, screenshots: [], distribution: { name: 'external-package' } }]
    service.register({ title: 'External workbench' }, () => null)
    expect(service.getSnapshot().catalog.map(entry => entry.id)).toEqual(['owner/external-workbench'])
    service.dispose()
  })

  it('keeps the workbench stylesheet when a client effect is retired while slots remain mounted', () => {
    const styles = []
    const testDocument = {
      querySelector: () => styles.find(style => style.dataset.pluginCss === 'dsh-desktop-workbenches') || null,
      createElement: () => ({ dataset: {}, textContent: '', remove() { styles.splice(styles.indexOf(this), 1) } }),
      head: { appendChild: style => styles.push(style) }
    }
    let applyLocal
    vm.runInNewContext(code, { window: { sessionStorage, localStorage: enabledStorage, __ModuleLoader__: { load({ factory }) {
      applyLocal = factory(name => name === 'react' ? { createElement() {}, Component: class {} } : name === '@deepseek-ai/cordis' ? { Service } : { Switch: () => null }).apply
    } } }, document: testDocument, setTimeout, clearTimeout, AbortController })
    let styleEffect
    applyLocal({ effect: (callback, label) => { if (label === 'workbenches: styles') styleEffect = callback }, slots: { inject: () => {} } })
    const cleanup = styleEffect()
    cleanup?.()
    expect(styles).toHaveLength(1)
    expect(styles[0].dataset.plugin).toBe('dsh-desktop-workbenches')
    expect(styles[0].textContent).toContain('.dshWbWorkbenchHome')
    expect(styles[0].textContent).toContain('height:232px;flex:0 0 232px')
    expect(styles[0].textContent).toContain('-webkit-line-clamp:4')
    styleEffect()
    expect(styles).toHaveLength(1)
    styles[0].dataset.plugin = 'another-plugin'
    styleEffect()
    expect(styles[0].dataset.plugin).toBe('dsh-desktop-workbenches')
    styles[0].remove()
    styleEffect()
    expect(styles).toHaveLength(1)
    expect(styles[0].dataset.plugin).toBe('dsh-desktop-workbenches')
  })

  it('restores workbench styles after head changes without a React rerender and stops observing on disposal', async () => {
    const { JSDOM } = await import('jsdom')
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
    let applyLocal
    vm.runInNewContext(code, { window: { localStorage: enabledStorage, __ModuleLoader__: { load({ factory }) {
      applyLocal = factory(name => name === 'react' ? { createElement() {}, Component: class {} } : name === '@deepseek-ai/cordis' ? { Service } : { Switch: () => null }).apply
    } } }, document: dom.window.document, MutationObserver: dom.window.MutationObserver, setTimeout, clearTimeout, AbortController })
    let styleEffect
    applyLocal({ effect: (callback, label) => { if (label === 'workbenches: styles') styleEffect = callback }, slots: { inject: () => {} } })
    const cleanup = styleEffect()
    const selector = 'style[data-plugin-css="dsh-desktop-workbenches"]'
    expect(dom.window.document.querySelectorAll(selector)).toHaveLength(1)

    dom.window.document.querySelector(selector).remove()
    await Promise.resolve()
    expect(dom.window.document.querySelectorAll(selector)).toHaveLength(1)

    const replacement = dom.window.document.createElement('head')
    dom.window.document.head.replaceWith(replacement)
    await Promise.resolve()
    expect(replacement.querySelectorAll(selector)).toHaveLength(1)

    replacement.querySelector(selector).remove()
    await Promise.resolve()
    expect(replacement.querySelectorAll(selector)).toHaveLength(1)

    cleanup()
    replacement.querySelector(selector).remove()
    await Promise.resolve()
    expect(replacement.querySelector(selector)).toBeNull()
    dom.window.close()
  })

  it.each(['research-notebook', 'writing-notebook'])('preserves retired %s data across loading, native navigation and saving', async (id) => {
    const initial = {
      ...emptyState(), added: [id], pinned: [id], active: id,
      notes: { 'research-notebook': '来源与证据', 'writing-notebook': '未发布稿件' },
      sessionBindings: { old: id }, recentSessions: { [id]: 'old' }
    }
    const { service, ctx, saved } = await fixture(initial)
    expect(service.state).toEqual(initial)
    expect(saved().state).toEqual(initial)
    expect(ctx.sessions.create).not.toHaveBeenCalled()
    expect(ctx.uiWorkspace.openSession).not.toHaveBeenCalled()
    await expect(service.add(id)).rejects.toThrow('工作台当前不可用')
    await expect(service.open(id)).rejects.toThrow('请先添加可用的工作台')
    await service.add('writer')
    await service.open('writer')
    ctx.uiWorkspace.openSession('old')
    await service.queue
    expect(service.state.active).toBeNull()
    expect(saved().state.notes).toEqual(initial.notes)
    expect(saved().state.sessionBindings).toEqual(initial.sessionBindings)
    expect(saved().state.recentSessions).toEqual(initial.recentSessions)
    expect(saved().state.added).toContain(id)
    expect(saved().state.pinned).toContain(id)
    expect(service.getSnapshot().catalog.some(entry => entry.id === id)).toBe(false)
    service.dispose()
  })

  it('renders workbench creation as a separate action instead of a collection tab', () => {
    const source = Market.toString()
    expect(source).not.toContain("'aria-selected': tab === 'submit'")
    expect(source).not.toContain("'aria-controls': 'dsh-workbench-submit-panel'")
    expect(source).toContain("id: 'dsh-workbench-submit-panel'")
    expect(source).toContain('制作我的工作台')
    expect(source).toContain('dshWbCreate')
    expect(source).toContain("'aria-selected': tab === 'favorites'")
    expect(source).toContain('我的收藏')
    expect(source).toContain('已安装')
    expect(source).toContain('把开发指令交给 Agent')
    expect(source).toContain('若你还没说明要做什么，它会先确认业务场景、目标用户和核心流程')
    expect(source).toContain('装到本机，自测确认能用')
    expect(source).toContain('需求确认并完成开发后，Agent 会把工作台装到这台 Desktop')
    expect(source).toContain('想上架，再按验收规范提交')
    // The website is the only visible document entry point in this flow.
    expect(source).toContain('href: DEVELOPMENT_PAGE_URL')
    expect(source).toContain('href: ACCEPTANCE_PAGE_URL')
    expect(source).not.toContain('离线查看')
    expect(source).toContain('复制开发指令')
    expect(source).toContain('复制投稿指令')
    // Self-use must not read as a parallel alternative to submitting.
    expect(source).not.toContain('选择交付方式')
    expect(source).not.toContain('提交到工作台广场')
    expect(source).not.toContain('submitMode')
    expect(source).toContain("tab !== 'submit' && h('div', { className: 'dshWbToolbar'")
    expect(source).toContain("tab !== 'submit' && h('section'")
    expect(source).not.toContain('showSubmit')
    expect(source).not.toContain("'aria-expanded'")
    expect(source).not.toContain('setGuideOpen')
  })

  it('provides one prompt for local development and one for submission', () => {
    const development = developmentWorkbenchAgentPrompt()
    expect(development).not.toContain('workbench.json')
    expect(development).toContain('scripts/check-workbench-package.mjs')
    expect(development).toContain('已安装的工作台')
    expect(development).toContain('左侧入口')
    expect(development).toContain('不需要上传或投稿')
    expect(development).toContain('这条通用指令没有提供业务需求')
    expect(development).toContain('业务场景、目标用户和一次任务的核心流程')
    expect(development).toContain('这个工作台要服务谁、解决什么业务场景？用户从进入到完成任务的核心步骤是什么？')
    expect(development).toContain('等待我回答')
    expect(development).toContain('答复前不要创建或修改业务代码、界面或包文件，也不要构建、打包、安装或投稿')
    expect(development).toContain('空目录且没有业务目标时，到提问为止')
    expect(development.indexOf('等待我回答')).toBeLessThan(development.indexOf('再按规范第 3 节'))
    expect(development).toContain('第 8 节“本地自测清单”')
    expect(development).toContain('不要声称已加载')
    // Prompts give the website as the one link; the bundled copies are for offline reading.
    expect(development).toContain('https://dshdesktop.com/workbench/docs/development.md')
    expect(development).not.toContain('/api/desktop-workbenches/')
    expect(development).toContain('不需要处理市场投稿或发布')
    expect(development).not.toContain('dataelement/awesome-dsh-workbench')
    expect(development).not.toContain('CONTRIBUTING.md')
    // The preset-package document describes Agent presets, not workbench packages.
    expect(development).not.toContain('preset-packages')
    expect(development).not.toContain('review-checklist')
    expect(submissionAgentPrompt('development')).toBe(development)
    expect(submissionAgentPrompt()).toBe(development)

    const submission = submissionWorkbenchAgentPrompt()
    expect(submission).toContain('这条通用指令不代表这些前提已经完成')
    expect(submission).toContain('不要凭空声称已验证或直接提交')
    expect(submission).not.toContain('我的 DSH Desktop 工作台已经做好，也装到本机验证过了')
    expect(submission).toContain('工作台市场验收规范')
    expect(submission).toContain('https://dshdesktop.com/workbench/docs/market-acceptance.md')
    expect(submission).not.toContain('/api/desktop-workbenches/')
    expect(submission).toContain('catalog/README.md')
    expect(submission).toContain('data/workbenches/<owner>__<repo>.yml')
    expect(submission).toContain('description.en')
    expect(submission).not.toContain('review-checklist')
    expect(submission).toContain('npm 包')
    expect(submission).toContain('GitHub Release')
    expect(submission).toContain('真实 PR URL')
    expect(submission).toContain('本机不保存投稿状态')
    expect(submission).not.toContain('local-draft')
    expect(submission).not.toContain('submissions.json')
    expect(submission).not.toContain('$DSH_WEB_URL/api/desktop-workbenches/submissions')
    expect(submission).not.toContain('不要把 pending 说成已经投稿成功')
    expect(submission).not.toContain('preset-packages')
    expect(submissionAgentPrompt('submission')).toBe(submission)
  })

  it('writes the author-chosen market category into the submission prompt', () => {
    expect(submissionWorkbenchAgentPrompt()).toContain('分类按市场仓库 data/categories.json 选最贴切的一个')
    const chosen = submissionWorkbenchAgentPrompt({ category: { id: 'retail', name: '零售与门店' } })
    expect(chosen).toContain('category 填 retail（零售与门店），这是作者自己选的分类，不要改成别的。')
    expect(chosen).not.toContain('选最贴切的一个')
    // A new-category idea is only relayed for "other", as one sanitized line.
    expect(submissionWorkbenchAgentPrompt({ category: { id: 'retail', name: '零售与门店' }, suggestion: '法务' })).not.toContain('建议新增分类')
    const other = submissionWorkbenchAgentPrompt({ category: { id: 'other', name: '其他' }, suggestion: ' 法务`合规\n\n## x ' })
    expect(other).toContain('category 填 other（其他）')
    expect(other).toContain('“建议新增分类：法务 合规 ## x”')
    expect(submissionWorkbenchAgentPrompt({ category: { id: 'other', name: '其他' }, suggestion: '   ' })).not.toContain('建议新增分类')
  })

  it('offers the category picker only when the market list is available', () => {
    expect(code).toContain("marketCategories.length > 0 && h('div', { className: 'dshWbSubmitCategory' }")
    expect(code).toContain("h('option', { value: '' }, '让 Agent 按规范选择')")
    expect(code).toContain("submitCategory === 'other' && h('label'")
  })

  it('copies the Agent prompt through the clipboard API', async () => {
    const writeText = vi.fn(async () => {})
    const targetWindow = { navigator: { clipboard: { writeText } } }
    await copySubmissionPrompt('Agent prompt', targetWindow)
    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText).toHaveBeenCalledWith('Agent prompt')
  })

  it('falls back to a temporary text area when the clipboard API is unavailable', async () => {
    const remove = vi.fn()
    const textarea = { style: {}, setAttribute: vi.fn(), select: vi.fn(), remove }
    const appendChild = vi.fn()
    const targetWindow = { navigator: {}, document: { createElement: vi.fn(() => textarea), body: { appendChild }, execCommand: vi.fn(() => true) } }
    await copySubmissionPrompt('Fallback prompt', targetWindow)
    expect(textarea.value).toBe('Fallback prompt')
    expect(textarea.select).toHaveBeenCalledOnce()
    expect(targetWindow.document.execCommand).toHaveBeenCalledWith('copy')
    expect(remove).toHaveBeenCalledOnce()
  })

  it('keeps no local submission state and never calls the removed submission API', async () => {
    const { service, request } = await fixture()
    expect(service.submit).toBeUndefined()
    expect(service.getSnapshot()).not.toHaveProperty('submissions')
    expect(request.mock.calls.some(([url]) => url === '/api/desktop-workbenches/submissions')).toBe(false)
  })
  it('starts a bound session from zero workspaces through the native creation flow', async () => {
    const { service, ctx } = await fixture(boundState())
    ctx.workspaces.list.getSnapshot().items.splice(0)
    await service.open('writer')
    const session = await service.newSession()
    expect(ctx.uiWorkspace.pickDirectory).toHaveBeenCalledTimes(1)
    expect(ctx.workspaces.create).toHaveBeenCalledWith({ path: '/chosen/new-project' })
    expect(ctx.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project-1' })
    expect(service.state.sessionBindings[session]).toBe('writer')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith(session)
  })

  it('allows creating a different workspace even when one already exists', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    await service.newWorkspaceSession()
    expect(ctx.sessions.create).toHaveBeenCalledWith({ workspaceId: 'project-2' })
  })

  it('cancels without creating workspace or session and deduplicates repeated clicks', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    const picker = deferred()
    ctx.uiWorkspace.pickDirectory.mockReturnValue(picker.promise)
    const first = service.newWorkspaceSession()
    const second = service.newWorkspaceSession()
    expect(first).toBe(second)
    picker.resolve(null)
    await first
    expect(ctx.uiWorkspace.pickDirectory).toHaveBeenCalledTimes(1)
    expect(ctx.workspaces.create).not.toHaveBeenCalled()
    expect(ctx.sessions.create).not.toHaveBeenCalled()
  })

  it('does not create a session in a different workbench after navigation during workspace creation', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    const creation = deferred()
    ctx.workspaces.create.mockReturnValue(creation.promise)
    const pending = service.newWorkspaceSession()
    await Promise.resolve()
    await service.open('research')
    creation.resolve({ workspaceId: 'new-project' })
    await pending
    expect(ctx.sessions.create).not.toHaveBeenCalled()
    expect(service.state.active).toBe('research')
  })

  it('surfaces workspace creation failure and allows retry', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    ctx.workspaces.create.mockRejectedValueOnce(new Error('Cannot create workspace'))
    await expect(service.newWorkspaceSession()).rejects.toThrow('Cannot create workspace')
    expect(ctx.sessions.create).not.toHaveBeenCalled()
    await service.newWorkspaceSession()
    expect(ctx.sessions.create).toHaveBeenCalledTimes(1)
  })

  it('renders business panels immediately with no workspace or session, keeping only conversation setup gated', async () => {
    let Frame
    const react = {
      createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
      Component: class {},
      useLayoutEffect: () => {},
      useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
      useCallback: callback => callback,
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}]
    }
    vm.runInNewContext(code, { document: { createElement: () => ({ style: {} }) }, window: { localStorage: enabledStorage, __ModuleLoader__: { load({ factory }) {
      Frame = factory((name) => name === 'react-dom' ? { createPortal: (node) => ({ children: [node] }) } : name === '@deepseek-ai/cordis' ? { Service } : react).Frame
    } } } })
    const { service, ctx, list } = await fixture()
    const Business = () => 'Business UI'
    registerProvider(service, ctx, 'standalone', { title: 'Standalone', layout: { businessSide: 'left', businessWidth: 0.65 } }, Business)
    ctx.workspaces.list.getSnapshot().items.splice(0)
    list.ids.splice(0)
    list.byId = {}
    selectIn(list, null)
    await service.add('standalone')
    await service.open('standalone')
    const conversation = { native: true }
    const tree = Frame({ service, conversation })
    const nodes = []
    const walk = node => {
      if (!node || typeof node !== 'object') return
      nodes.push(node)
      node.children?.flat(Infinity).forEach(walk)
    }
    walk(tree)
    const panel = nodes.find(node => node.type === 'aside')
    expect(panel.props.hidden).toBe(false)
    expect(panel.props['data-side']).toBe('left')
    expect(nodes.some(node => node.type === Business)).toBe(true)
    expect(nodes.find(node => node.children?.includes('新建工作区并开始对话')).props.disabled).toBe(false)
    expect(nodes.filter(node => node === conversation)).toHaveLength(1)
    expect(ctx.uiWorkspace.pickDirectory).not.toHaveBeenCalled()
    expect(ctx.sessions.create).not.toHaveBeenCalled()
  })

  it('keeps the native conversation usable when a pinned catalog entry has no loaded runtime', async () => {
    let Frame
    const react = {
      createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
      Component: class {},
      useLayoutEffect: () => {},
      useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
      useCallback: callback => callback,
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}]
    }
    vm.runInNewContext(code, { document: { createElement: () => ({ style: {} }) }, window: { localStorage: enabledStorage, __ModuleLoader__: { load({ factory }) {
      Frame = factory((name) => name === 'react-dom' ? { createPortal: (node) => ({ children: [node] }) } : name === '@deepseek-ai/cordis' ? { Service } : react).Frame
    } } } })
    const initial = emptyState()
    initial.added = ['missing/workbench']
    initial.pinned = ['missing/workbench']
    initial.active = 'missing/workbench'
    const { service } = await fixture(initial)
    service.remoteCatalog = [{
      id: 'missing/workbench', owner: 'missing', url: 'https://github.com/missing/workbench', name: 'Missing',
      categoryName: '其他', description: { zh: '' }, screenshots: [], version: '1.0.0', customFrame: true,
      distribution: { type: 'npm', name: 'missing-workbench' }
    }]
    service.publish()
    const conversation = { native: true }
    const tree = Frame({ service, conversation })
    const nodes = []
    const walk = node => {
      if (!node || typeof node !== 'object') return
      nodes.push(node)
      node.children?.flat(Infinity).forEach(walk)
    }
    walk(tree)
    expect(nodes.some(node => node.props?.key === 'missing/workbench')).toBe(false)
    expect(nodes.filter(node => node === conversation)).toHaveLength(1)
  })

  it('loads a legacy provider id under its canonical repository identity', async () => {
    const { service, ctx } = await fixture()
    registerProvider(service, ctx, 'legacy', { id: 'old-local-id', title: 'Legacy' })
    expect([...service.catalog.keys()]).toContain('legacy')
    expect(service.catalog.get('legacy').id).toBe('legacy')
  })

  it('creates and binds a provider business folder session without a manual picker', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    setFiberPackage(ctx, 'writer')
    const id = await service.ensureSession({ folder: '/business/profile' })
    expect(ctx.workspaces.create).toHaveBeenCalledWith({ path: '/business/profile' })
    expect(ctx.uiWorkspace.pickDirectory).not.toHaveBeenCalled()
    expect(service.state.sessionBindings[id]).toBe('writer')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith(id)
  })

  it('restores an owned saved session or adopts a real unowned session without changing its workspace', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    setFiberPackage(ctx, 'writer')
    expect(await service.ensureSession({ sessionId: 'writer-2', folder: '/other' })).toBe('writer-2')
    expect(await service.ensureSession({ sessionId: 'old', folder: '/other' })).toBe('old')
    expect(service.state.sessionBindings.old).toBe('writer')
    expect(service.workspaceFor('old').workspaceId).toBe('project-1')
    expect(ctx.workspaces.create).not.toHaveBeenCalled()
    expect(ctx.sessions.create).not.toHaveBeenCalled()
  })

  it('rejects conflicting ownership and recreates a deleted saved session', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    setFiberPackage(ctx, 'writer')
    await expect(service.ensureSession({ sessionId: 'research-1', folder: '/business' })).rejects.toThrow('不能重新绑定')
    expect(ctx.sessions.create).not.toHaveBeenCalled()
    const id = await service.ensureSession({ sessionId: 'deleted', folder: '/business' })
    expect(id).not.toBe('deleted')
    expect(service.state.sessionBindings[id]).toBe('writer')
  })

  it('deduplicates provider creation and leaves a cancelled session unbound after a switch', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    setFiberPackage(ctx, 'writer')
    const refresh = deferred()
    ctx.sessions.refresh.mockReturnValueOnce(refresh.promise)
    const args = { folder: '/business' }
    const first = service.ensureSession(args)
    expect(service.ensureSession(args)).toBe(first)
    await service.open('research')
    refresh.resolve()
    const id = await first
    expect(ctx.sessions.create).toHaveBeenCalledTimes(1)
    expect(service.state.sessionBindings[id]).toBeUndefined()
    expect(service.state.active).toBe('research')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('research-1')
  })

  it('rejects inactive providers and aborts removed providers before creating a session', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    setFiberPackage(ctx, 'research')
    await expect(service.ensureSession({ folder: '/business' })).rejects.toThrow('请先打开')
    const refresh = deferred()
    ctx.sessions.refresh.mockReturnValueOnce(refresh.promise)
    setFiberPackage(ctx, 'writer')
    const pending = service.ensureSession({ folder: '/business' })
    await service.remove('writer')
    refresh.resolve()
    await expect(pending).rejects.toThrow('已移除')
    expect(ctx.sessions.create).not.toHaveBeenCalled()
  })

  it('toggles pinned workbenches closed and open without removing data or stopping sessions', async () => {
    const { service, ctx, list } = await fixture(boundState())
    await service.open('writer')
    const pinned = [...service.state.pinned]
    const bindings = { ...service.state.sessionBindings }
    const notes = { ...service.state.notes }
    await service.toggle('writer')
    expect(service.state.active).toBeNull()
    expect(service.state.pinned).toEqual(pinned)
    expect(service.state.sessionBindings).toEqual(bindings)
    expect(service.state.notes).toEqual(notes)
    expect(currentOf(list)).toBe('writer-1')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
    await service.toggle('writer')
    expect(service.state.active).toBe('writer')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('writer-1')
    await service.toggle('research')
    expect(service.state.active).toBe('research')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('research-1')
    // Market's explicit open remains idempotently open, not a toggle.
    await service.open('research')
    expect(service.state.active).toBe('research')
  })

  it('keeps exactly one native input mounted while custom frames and the default frame exchange its container', async () => {
    const { JSDOM } = await import('jsdom')
    const React = await import('react')
    const ReactDOM = await import('react-dom')
    const { createRoot } = await import('react-dom/client')
    const dom = new JSDOM('<div id="root"></div>')
    const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
    globalThis.window = dom.window
    globalThis.document = dom.window.document
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    let root
    try {
      let Frame
      vm.runInNewContext(code, { document: dom.window.document, window: { localStorage: enabledStorage, __ModuleLoader__: { load({ factory }) {
      Frame = factory(name => name === 'react-dom' ? ReactDOM : name === '@deepseek-ai/cordis' ? { Service } : React).Frame
      } } } })
      const { service, ctx } = await fixture(boundState())
      const snapshot = ctx.workspaces.list.getSnapshot()
      ctx.workspaces.list.getSnapshot = () => snapshot
      ctx.workspaces.list.subscribe = () => () => {}
      ctx.sessions.list.subscribe = () => () => {}
      function Dock({ conversation }) { return React.createElement('section', { 'data-test-dock': true }, conversation) }
      registerProvider(service, ctx, 'dock', { title: 'Dock', customFrame: true }, Dock)
      await service.add('dock')
      await service.open('writer')
      let mounts = 0
      function Native() {
        React.useEffect(() => { mounts++ }, [])
        return React.createElement('div', { contentEditable: true, suppressContentEditableWarning: true }, 'retained')
      }
      root = createRoot(dom.window.document.getElementById('root'))
      await React.act(async () => root.render(React.createElement(Frame, { service, conversation: React.createElement(Native) })))
      expect(dom.window.document.querySelector('[data-dsh-workbench-dock]')).toBeNull()
      const input = dom.window.document.querySelector('[contenteditable]')
      expect(input).not.toBeNull()
      await React.act(async () => { ctx.uiWorkspace.openSession('old'); await service.queue })
      expect(service.state.active).toBeNull()
      expect(service.state.sessionBindings.old).toBeUndefined()
      expect(dom.window.document.querySelector('.dshWbBusiness').hidden).toBe(true)
      expect(dom.window.document.querySelector('.dshWbConversation [contenteditable]')).toBe(input)
      expect(dom.window.document.querySelector('.dshWbInit')).toBeNull()
      await React.act(async () => { await service.open('dock') })
      expect(dom.window.document.querySelector('[data-test-dock] [contenteditable]')).toBe(input)
      expect(dom.window.document.querySelector('[data-test-dock] > div').style.display).toBe('none')
      expect(dom.window.document.querySelectorAll('[contenteditable]')).toHaveLength(1)
      expect(dom.window.document.querySelector('.dshWbBody').hidden).toBe(true)
      await React.act(async () => { await service.newSession('project-1') })
      expect(dom.window.document.querySelector('[data-test-dock] > div').style.display).toBe('contents')
      await React.act(async () => { await service.toggle('dock') })
      expect(dom.window.document.querySelector('.dshWbConversation [contenteditable]')).toBe(input)
      expect(dom.window.document.querySelectorAll('[contenteditable]')).toHaveLength(1)
      await React.act(async () => { await service.open('writer') })
      expect(dom.window.document.querySelector('[contenteditable]')).toBe(input)
      expect(input.textContent).toBe('retained')
      expect(mounts).toBe(1)
    } finally {
      if (root) await React.act(async () => root.unmount())
      globalThis.window = previous.window
      globalThis.document = previous.document
      globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
      dom.window.close()
    }
  })

  it('uses the browser default fetch without rebinding its receiver to the controller', async () => {
    let BrowserWorkbenches
    const reply = vi.fn(async (url, options = {}) => {
      if (url === '/api/desktop-workbenches/catalog') return Response.json({
        stale: false, catalog: { schemaVersion: 2, kind: 'catalog', categories: [], workbenches: [
          { id: 'example/writer', name: 'Writer', category: 'writing', owner: 'example', url: 'https://github.com/example/writer', version: '1.0.0', description: { zh: '' }, screenshots: [], distribution: { type: 'npm', name: 'writer' } }
        ] }
      })
      if (url === '/api/desktop-workbenches/submissions') return Response.json({ submissions: [] })
      const state = options.method === 'POST' ? JSON.parse(options.body).state : emptyState()
      return Response.json({ revision: options.method === 'POST' ? 1 : 0, state })
    })
    // A browser native fetch checks its receiver. Define this stand-in inside
    // the VM's browser realm so an ordinary global call gets the window object,
    // while saving fetch on a controller and calling it as a method throws.
    vm.runInNewContext(`
      function fetch(...args) {
        if (this !== globalThis) throw new TypeError('Illegal invocation');
        return fetchReply(...args);
      }
      ${code}
    `, {
      fetchReply: reply,
      window: { localStorage: enabledStorage, __ModuleLoader__: { load({ factory }) {
        BrowserWorkbenches = factory(name => name === '@deepseek-ai/cordis' ? { Service } : { createElement() {}, Component: class {} }).Workbenches
      } } }
    })
    const { ctx } = await fixture()
    const service = new BrowserWorkbenches(ctx)
    await service.load()
    expect(service.ready).toBe(true)
    expect(service.error).toBe('')
    setFiberPackage(ctx, 'writer')
    service.register({ title: 'Writer' }, () => null)
    await service.add('example/writer')
    // state, catalog and market installs on load, then one state write.
    expect(reply).toHaveBeenCalledTimes(4)
    expect(service.revision).toBe(1)
    expect(service.state.added).toEqual(['example/writer'])
  })

  it('renders Frame with native stores whose snapshot and subscribe methods require their receiver', async () => {
    const cleanups = []
    let Frame
    const React = {
      Component: class {},
      createElement: (type, props, ...children) => ({ type, props, children }),
      useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
      useCallback: (callback) => callback,
      useLayoutEffect: () => {},
      useSyncExternalStore(subscribe, getSnapshot) {
        // React calls these as standalone functions, without a store receiver.
        cleanups.push(subscribe(() => {}))
        return getSnapshot()
      }
    }
    vm.runInNewContext(code, { document: { createElement: () => ({ style: {} }) }, window: { localStorage: enabledStorage, __ModuleLoader__: { load({ factory }) { Frame = factory((name) => name === 'react-dom' ? { createPortal: (node) => ({ children: [node] }) } : name === '@deepseek-ai/cordis' ? { Service } : React).Frame } } } })
    const { service, ctx } = await fixture(boundState())
    registerProvider(service, ctx, 'dock', { title: 'Dock', customFrame: true })
    await service.add('dock')
    await service.open('dock')
    const sessionSnapshot = ctx.sessions.list.getSnapshot()
    const workspaceSnapshot = ctx.workspaces.list.getSnapshot()
    class NativeStore {
      constructor(snapshot) { this.snapshot = snapshot; this.listeners = new Set(); this.reads = 0 }
      getSnapshot() { this.reads++; return this.snapshot }
      subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener) }
    }
    const sessionStore = ctx.sessions.list = new NativeStore(sessionSnapshot)
    const workspaceStore = ctx.workspaces.list = new NativeStore(workspaceSnapshot)
    const conversation = { nativeConversation: true }
    const frame = Frame({ service, conversation })
    expect(frame.type).toBe('div')
    const customHost = frame.children.find((child) => child?.props?.key === 'dock')
    expect(customHost.props.hidden).toBe(false)
    expect(customHost.props.className).toBe('dshWbCustomFrame')
    expect(code).toContain('.dshWbBusiness[data-side=left][data-embedded=true] > :first-child > header:first-child')
    expect(code).toContain('padding-inline-start:var(--dsh-frame-leading-clearance,160px)')
    expect(customHost.props.style).toMatchObject({
      position: 'relative', overflow: 'hidden', flex: 1, minHeight: 0, minWidth: 0,
      width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'
    })
    expect(sessionStore.reads).toBeGreaterThan(0)
    expect(workspaceStore.reads).toBeGreaterThan(0)
    expect(sessionStore.listeners.size).toBe(1)
    expect(workspaceStore.listeners.size).toBe(1)
    for (const cleanup of cleanups) cleanup()
    expect(sessionStore.listeners.size).toBe(0)
    expect(workspaceStore.listeners.size).toBe(0)
  })

  it('adds directly to the sidebar without navigating, then opens and restores the recent session', async () => {
    const { service, ctx, saved } = await fixture()
    await service.add('writer')
    expect(saved().state.added).toEqual(['writer'])
    expect(saved().state.pinned).toEqual(['writer'])
    expect(saved().state.active).toBe(null)
    expect(ctx.layout.selectPanel).not.toHaveBeenCalled()
    await service.open('writer')
    expect(saved().state.pinned).toEqual(['writer'])
    const session = await service.newSession('project-1')
    await service.leave()
    await service.open('writer')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith(session)
    expect(saved().state.active).toBe('writer')
  })

  it('returns to the workbench home without deleting the recent session', async () => {
    const { service, ctx, list, saved } = await fixture(boundState())
    await service.open('writer')
    expect(currentOf(list)).toBe('writer-1')

    await service.home('writer')
    expect(currentOf(list)).toBe('writer-1')
    expect(saved().state.active).toBe('writer')
    expect(saved().state.recentSessions.writer).toBe('writer-1')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()

    await service.open('writer')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('writer-1')
  })

  it('reads the current session from the main-view retention, not the removed list.current', async () => {
    const { service, ctx, list } = await fixture(boundState())
    expect(ctx.sessions.open).toBeUndefined()
    expect(ctx.sessions.clear).toBeUndefined()
    await service.open('writer')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('writer-1')
    list.current = 'old'
    expect(service.currentSession()).toBe('writer-1')
    expect(service.lastSession).toBe('writer-1')
    await expect(service.home('writer')).resolves.toBeUndefined()
  })

  it('preserves sidebar order on repeated add and restores added entries after reload', async () => {
    const { service, saved } = await fixture()
    await service.add('writer')
    await service.add('research')
    await service.reorder('research', 'writer')
    await service.add('writer')
    expect(saved().state.pinned).toEqual(['research', 'writer'])
    await service.load()
    expect(service.state.pinned).toEqual(['research', 'writer'])
    await service.remove('research')
    expect(saved().state.pinned).toEqual(['writer'])
  })

  it('moves a pinned workbench to the end and scopes sessions to the active mode', async () => {
    const { service, saved } = await fixture({ ...boundState(), pinned: ['writer', 'research'] })
    await service.reorder('writer', null)
    expect(saved().state.pinned).toEqual(['research', 'writer'])
    expect(service.sessionVisible('old')).toBe(true)
    expect(service.sessionVisible('writer-1')).toBe(false)
    await service.open('writer')
    expect(service.sessionVisible('old')).toBe(false)
    expect(service.sessionVisible('writer-1')).toBe(true)
    expect(service.sessionVisible('research-1')).toBe(false)
  })

  it('uses the Workbench setting as the master switch for navigation and session filtering', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    service.setEnabled(false)
    await service.queue
    expect(service.state.active).toBeNull()
    expect(service.sessionVisible('old')).toBe(true)
    expect(service.sessionVisible('writer-1')).toBe(true)
    expect(ctx.layout.selectPanel).toHaveBeenLastCalledWith(null)
    await expect(service.open('writer')).rejects.toThrow('工作台功能已关闭')
    service.setEnabled(true)
  })

  it('persists favorites independently from installation and lets an unavailable favorite be removed', async () => {
    const { service, saved } = await fixture()
    await service.toggleFavorite('writer')
    expect(saved().state.favorites).toEqual(['writer'])
    expect(saved().state.added).toEqual([])
    service.catalog.delete('writer')
    await service.toggleFavorite('writer')
    expect(saved().state.favorites).toEqual([])
    await expect(service.toggleFavorite('missing')).rejects.toThrow('工作台当前不可用')
  })

  it('restores the recent session but gives an explicitly clicked session priority', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    await service.open('research')
    await service.open('writer', 'writer-2')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('writer-2')
    expect(saved().state.recentSessions.writer).toBe('writer-2')
    await service.open('research')
    await service.open('writer')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('writer-2')
    expect(saved().state.active).toBe('writer')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
  })

  it('only the latest of overlapping workbench opens changes the visible session', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    await Promise.all([service.open('writer'), service.open('research')])
    expect(ctx.uiWorkspace.openSession.mock.calls).toEqual([['research-1']])
    expect(saved().state.active).toBe('research')
    expect(saved().state.pinned).toEqual(['writer', 'research'])
  })

  it.each([
    { action: 'open', panel: 'desktop-workbenches' },
    { action: 'leave', panel: 'settings' }
  ])('does not steal focus from $panel when $action finishes saving late', async ({ action, panel }) => {
    const { service, ctx, request, saved, list } = await fixture(boundState())
    await service.open('research')
    ctx.layout.selectPanel.mockClear()
    ctx.uiWorkspace.openSession.mockClear()
    const gate = deferred()
    const started = deferred()
    const handleRequest = request.getMockImplementation()
    request.mockImplementationOnce(async (...args) => {
      started.resolve()
      await gate.promise
      return handleRequest(...args)
    })
    const operation = action === 'open' ? service.open('writer') : service.leave()
    await started.promise
    // Public layout navigation supersedes a pending workbench action without
    // changing its own navigation epoch, just as opening market/settings does.
    ctx.layout.beginNavigation()
    ctx.layout.selectPanel(panel)
    gate.resolve()
    await operation
    expect(ctx.layout.selectPanel.mock.calls).toEqual([[panel]])
    expect(ctx.uiWorkspace.openSession).not.toHaveBeenCalled()
    expect(currentOf(list)).toBe('research-1')
    expect(saved().state.active).toBe(action === 'open' ? 'writer' : null)
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
  })

  it('sidebar session selection wakes its workbench, but leaves workbench mode for a removed owner', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    ctx.uiWorkspace.openSession('writer-2')
    await service.queue
    expect(saved().state.active).toBe('writer')
    expect(saved().state.recentSessions.writer).toBe('writer-2')
    await service.remove('writer')
    ctx.uiWorkspace.openSession('research-1')
    await service.queue
    ctx.uiWorkspace.openSession('writer-1')
    await service.queue
    expect(saved().state.active).toBeNull()
    expect(saved().state.added).toEqual(['research'])
    expect(saved().state.pinned).not.toContain('writer')
    expect(saved().state.sessionBindings['writer-1']).toBe('writer')
    expect(saved().state.notes.writer).toBe('Retained business draft')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
  })

  it('persists sidebar order across a controller reload', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    await service.open('writer')
    await service.open('research')
    await service.reorder('research', 'writer')
    await service.load()
    expect(saved().state.pinned).toEqual(['research', 'writer'])
    expect(service.state.pinned).toEqual(['research', 'writer'])
  })

  it('creates fresh sessions in an existing workspace without adopting legacy sessions', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    await service.open('writer')
    const first = await service.newSession('project-1')
    const second = await service.newSession('project-1')
    expect(first).not.toBe(second)
    expect(ctx.sessions.create).toHaveBeenCalledTimes(2)
    expect(ctx.sessions.create).toHaveBeenLastCalledWith({ workspaceId: 'project-1' })
    expect(saved().state.sessionBindings.old).toBeUndefined()
    expect(saved().state.sessionBindings[first]).toBe('writer')
    expect(saved().state.sessionBindings[second]).toBe('writer')
    expect(saved().state.recentSessions.writer).toBe(second)
  })

  it('does not bind or focus a slow session after switching workbenches', async () => {
    const { service, ctx, saved, list } = await fixture(boundState())
    await service.open('writer')
    const creation = deferred()
    ctx.sessions.create.mockImplementationOnce(() => creation.promise)
    const pendingCreation = service.newSession('project-1')
    await service.open('research')
    list.byId['slow-created'] = { sessionId: 'slow-created', displayTitle: 'Slow session' }
    list.ids.push('slow-created')
    creation.resolve('slow-created')
    await pendingCreation
    expect(currentOf(list)).toBe('research-1')
    expect(saved().state.active).toBe('research')
    expect(saved().state.sessionBindings['slow-created']).toBeUndefined()
    expect(ctx.uiWorkspace.openSession).not.toHaveBeenCalledWith('slow-created')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
  })

  it('suppresses selection events until a created session has its owner binding', async () => {
    const { service, ctx, list, saved } = await fixture(boundState())
    await service.open('writer')
    ctx.sessions.create.mockImplementationOnce(async ({ workspaceId }) => {
      const id = 'created-during-selection'
      list.ids.push(id)
      list.byId[id] = { sessionId: id, displayTitle: id }
      const workspace = ctx.workspaces.list.getSnapshot().items.find(item => item.workspaceId === workspaceId)
      workspace.sessionIds.push(id)
      selectIn(list, id)
      service.selectionChanged()
      return id
    })

    await service.newSession('project-1')
    await service.queue

    expect(saved().state.active).toBe('writer')
    expect(saved().state.sessionBindings['created-during-selection']).toBe('writer')
    expect(saved().state.recentSessions.writer).toBe('created-during-selection')
    expect(service.pendingSessionOwners.size).toBe(0)
    expect(service.selectionDeferred).toBe(false)
  })

  it('leaves a created session unbound when its owner is removed before creation resolves', async () => {
    const { service, ctx, list, saved } = await fixture(boundState())
    await service.open('writer')
    const creation = deferred()
    ctx.sessions.create.mockImplementationOnce(() => creation.promise)
    const pendingCreation = service.newSession('project-1')

    await service.remove('writer')
    list.ids.push('created-after-remove')
    list.byId['created-after-remove'] = { sessionId: 'created-after-remove', displayTitle: 'Created after remove' }
    creation.resolve('created-after-remove')
    await pendingCreation

    expect(saved().state.active).toBeNull()
    expect(saved().state.added).not.toContain('writer')
    expect(saved().state.sessionBindings['created-after-remove']).toBeUndefined()
    expect(ctx.uiWorkspace.openSession).not.toHaveBeenCalledWith('created-after-remove')
  })

  it('restores a created session owner and recent pointer after service reload', async () => {
    const { service, saved } = await fixture(boundState())
    await service.open('writer')
    const sessionId = await service.newSession('project-1')
    await service.load()
    expect(service.state.sessionBindings[sessionId]).toBe('writer')
    expect(service.state.recentSessions.writer).toBe(sessionId)
    expect(saved().state.sessionBindings[sessionId]).toBe('writer')
  })

  it('leaves the active workbench when native navigation opens or clears an ordinary session', async () => {
    const { service, ctx, request, saved, list } = await fixture(boundState())
    await service.open('writer')
    const bindings = structuredClone(saved().state.sessionBindings)
    const recent = structuredClone(saved().state.recentSessions)
    const navigation = service.navigation
    request.mockClear()

    ctx.uiWorkspace.openSession('old')
    await service.queue
    expect(service.navigation).toBe(navigation + 1)
    expect(saved().state.active).toBeNull()
    expect(saved().state.sessionBindings).toEqual(bindings)
    expect(saved().state.recentSessions).toEqual(recent)
    expect(request).toHaveBeenCalledOnce()

    selectIn(list, null)
    service.selectionChanged()
    await service.queue
    expect(service.navigation).toBe(navigation + 2)
    expect(saved().state.active).toBeNull()
    expect(saved().state.sessionBindings).toEqual(bindings)
    expect(saved().state.recentSessions).toEqual(recent)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('lets ordinary native navigation invalidate a pending workbench session open without adopting it', async () => {
    const { service, ctx, saved, list } = await fixture(boundState())
    await service.open('writer')
    const creation = deferred()
    ctx.sessions.create.mockImplementationOnce(() => creation.promise)
    const pendingCreation = service.newSession('project-1')

    ctx.uiWorkspace.openSession('old')
    list.byId['native-superseded'] = { sessionId: 'native-superseded', displayTitle: 'Native superseded' }
    list.ids.push('native-superseded')
    creation.resolve('native-superseded')
    await pendingCreation

    expect(currentOf(list)).toBe('old')
    expect(saved().state.active).toBeNull()
    expect(saved().state.sessionBindings.old).toBeUndefined()
    expect(saved().state.sessionBindings['native-superseded']).toBe('writer')
    expect(ctx.uiWorkspace.openSession).not.toHaveBeenCalledWith('native-superseded')
  })

  it('blocks subsequent writes after a conflict and resumes only after loading authoritative state', async () => {
    const { service, request, externalUpdate, saved } = await fixture()
    externalUpdate()
    const first = service.add('writer')
    const queued = service.add('research')
    const results = await Promise.allSettled([first, queued])
    expect(results.map(result => result.status)).toEqual(['rejected', 'rejected'])
    expect(service.blocked).toBe(true)
    expect(request.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
    await expect(service.add('research')).rejects.toThrow()
    await service.load()
    expect(service.blocked).toBe(false)
    expect(service.state.added).toEqual([])
    await service.add('research')
    expect(saved().state.added).toEqual(['research'])
  })

  it('keeps unsaved business notes across switching and debounces the latest edit', async () => {
    vi.useFakeTimers()
    const { service, ctx, saved } = await fixture(boundState())
    await service.open('writer')
    service.editNote('writer', 'First draft')
    await vi.advanceTimersByTimeAsync(200)
    service.editNote('writer', 'Final draft')
    await service.open('research')
    expect(service.getSnapshot().drafts.writer).toBe('Final draft')
    expect(saved().state.notes.writer).toBe('Retained business draft')
    await vi.advanceTimersByTimeAsync(449)
    expect(saved().state.notes.writer).toBe('Retained business draft')
    await vi.advanceTimersByTimeAsync(1)
    await service.queue
    expect(saved().state.notes.writer).toBe('Final draft')
    expect(service.getSnapshot().drafts.writer).toBeUndefined()
    expect(saved().state.active).toBe('research')
    expect(service.noteTimers.size).toBe(0)
  })

  it('retains a newer edit while an earlier save is still in flight', async () => {
    vi.useFakeTimers()
    const { service, request, saved } = await fixture(boundState())
    const gate = deferred()
    const handleRequest = request.getMockImplementation()
    request.mockImplementationOnce(async (...args) => { await gate.promise; return handleRequest(...args) })
    service.editNote('writer', 'Older draft')
    const saving = service.saveNote('writer')
    await Promise.resolve()
    service.editNote('writer', 'Newer draft')
    gate.resolve()
    await saving
    expect(saved().state.notes.writer).toBe('Older draft')
    expect(service.getSnapshot().drafts.writer).toBe('Newer draft')
    await vi.advanceTimersByTimeAsync(450)
    await service.queue
    expect(saved().state.notes.writer).toBe('Newer draft')
    expect(service.getSnapshot().drafts.writer).toBeUndefined()
  })

  it('keeps failed note drafts and retries after reload without erasing other-window changes', async () => {
    vi.useFakeTimers()
    const { service, externalUpdate, saved } = await fixture(boundState())
    const remote = boundState()
    remote.notes.research = 'Other window note'
    externalUpdate(remote)
    service.editNote('writer', 'Local unsaved draft')
    await expect(service.saveNote('writer')).rejects.toThrow()
    expect(service.getSnapshot().drafts.writer).toBe('Local unsaved draft')
    expect(service.blocked).toBe(true)
    await service.load()
    await service.queue
    expect(service.blocked).toBe(false)
    expect(saved().state.notes).toEqual({ writer: 'Local unsaved draft', research: 'Other window note' })
    expect(service.getSnapshot().drafts.writer).toBeUndefined()
  })

  it('flushes pending notes when the controller is disposed', async () => {
    vi.useFakeTimers()
    const { service, ctx, saved } = await fixture(boundState())
    service.editNote('writer', 'Last edit before closing')
    service.dispose()
    await service.queue
    expect(saved().state.notes.writer).toBe('Last edit before closing')
    expect(service.disposed).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps a late-created session unbound if its workbench was removed during creation', async () => {
    const { service, ctx, saved, list } = await fixture(boundState())
    await service.open('writer')
    const creation = deferred()
    ctx.sessions.create.mockImplementationOnce(() => creation.promise)
    const pendingCreation = service.newSession('project-1')
    await service.remove('writer')
    list.byId['late-created'] = { sessionId: 'late-created', displayTitle: 'Late session' }
    list.ids.push('late-created')
    creation.resolve('late-created')
    await expect(pendingCreation).resolves.toBe('late-created')
    expect(saved().state.sessionBindings['late-created']).toBeUndefined()
    expect(saved().state.sessionBindings['writer-1']).toBe('writer')
    expect(saved().state.notes.writer).toBe('Retained business draft')
    expect(saved().state.active).toBe(null)
    expect(service.blocked).toBe(false)
    expect(ctx.uiWorkspace.openSession).not.toHaveBeenCalledWith('late-created')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
    await service.open('research')
    expect(saved().state.active).toBe('research')
  })

  it('still closes an explicitly left or unloaded workbench', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    await service.open('writer')
    await service.leave()
    expect(saved().state.active).toBeNull()

    const unregister = registerProvider(service, ctx, 'temporary', { title: 'Temporary' })
    await service.add('temporary')
    await service.open('temporary')
    unregister()
    expect(service.state.active).toBeNull()
    expect(service.catalog.has('temporary')).toBe(false)
  })
})

describe('workbench business layout contract', () => {
  it('accepts a wide left business panel while keeping host geometry bounded', async () => {
    const { service, ctx } = await fixture()
    registerProvider(service, ctx, 'map', { title: 'Map', embedded: true, layout: { businessSide: 'left', businessWidth: 0.65 } })
    expect(service.catalog.get('map').layout).toEqual({ businessSide: 'left', businessWidth: 0.65 })
    expect(service.catalog.get('writer').layout).toEqual({ businessSide: 'right', businessWidth: 0.36 })
    expect(() => registerProvider(service, ctx, 'bad-width', { title: 'Bad', layout: { businessWidth: 1 } })).toThrow(/width/)
    expect(() => registerProvider(service, ctx, 'bad-side', { title: 'Bad', layout: { businessSide: 'overlay' } })).toThrow(/side/)
  })
})

describe('workbench market screenshot and metadata display', () => {
  const fullSource = code
  it('explains the workbench concept and the sidebar shortcut model', () => {
    expect(fullSource).toContain("tab === 'submit' ? '制作属于你的工作台' : '工作台'")
    expect(fullSource).toContain('工作台把专属界面、会话和资料组织在一起。可通过顶部快捷栏在会话与不同工作台之间切换。')
  })

  it('does not embed provider-specific market screenshots in Desktop', async () => {
    const { service, ctx } = await fixture()
    registerProvider(service, ctx, 'ming-life', { title: '玄学人生工作台' })
    expect(service.catalog.get('ming-life').screenshot).toBe('')
    expect(fullSource).not.toContain('data:image/jpeg;base64,')
    service.dispose()
  })

  it('uses a four-column desktop grid with explicit responsive reductions', () => {
    expect(fullSource).toContain('.dshWbGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}')
    expect(fullSource).toContain('.dshWbCard{min-width:0;border:1px solid var(--dsw-alias-border-l2);')
    expect(fullSource).toContain('@container workbench-market (max-width:980px){.dshWbGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}}')
    expect(fullSource).toContain('@container workbench-market (max-width:620px){.dshWbGrid{grid-template-columns:1fr}}')
    expect(fullSource).toContain('.dshWbMeta{display:grid;grid-template-columns:minmax(0,1fr) auto auto;')
    expect(fullSource).not.toContain('未安装')
  })

  it('renders a persistent Workbench home area beside the current mode and switch button', () => {
    expect(fullSource).toContain('function WorkbenchSidebarSwitcher({ service, wide, startSession, usePanelInfo })')
    expect(fullSource).toContain("'data-dsh-workbench-switcher': ''")
    expect(fullSource).toContain("className: 'dshWbModeSwitch', title: `切换工作台（当前：${active?.title || '会话'}）`, 'aria-label': `切换工作台，当前：${active?.title || '会话'}`, 'aria-haspopup': 'menu', 'aria-expanded': open")
    expect(fullSource).toContain("role: 'menu', 'aria-label': '选择会话模式'")
    expect(fullSource).toContain("role: 'menuitemradio'")
    expect(fullSource).toContain('service.openNative(startSession)')
    expect(fullSource).toContain("name: 'home'")
    expect(fullSource).not.toContain('dshWbSidebarTooltip')
    expect(fullSource).toContain("active?.title || '会话'")
    expect(fullSource).toContain("title: '工作台主页', 'aria-label': '打开工作台主页'")
    expect(fullSource).toContain('setOpen(false); service.showMarket()')
    expect(fullSource).toContain('.dshWbWorkbenchHome{display:flex;align-items:center;justify-content:flex-start;gap:8px;flex:1 1 0;min-width:88px;')
    expect(fullSource).toContain('.dshWbSidebarSwitcher[data-selected=true]{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-interactive-bg-hover)}')
    expect(fullSource).toContain('.dshWbWorkbenchHome:hover{background:var(--dsw-alias-interactive-bg-hover)}')
    expect(fullSource).toContain('min-height:36px;margin:0 2px 8px;padding:0;')
    expect(fullSource).toContain('.dshWbModeSwitch svg{flex:0 0 auto;color:var(--dsw-alias-label-tertiary)}')
    expect(fullSource).toContain('.dshWbCurrentModeLabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}')
    expect(fullSource).toContain('.dshWbModeMenu{position:absolute;z-index:32;left:2px;right:2px;')
    expect(fullSource).toContain('background:var(--dsw-alias-label-primary);color:var(--dsw-alias-label-primary-foreground)')
    expect(fullSource).toContain("ctx.slots.inject('sidebar.quickSwitcher'")
    expect(fullSource).not.toContain('function WorkbenchDock(')
    expect(fullSource).not.toContain('dshWbDockWrap')
    expect(fullSource).not.toContain("ctx.slots.inject('sidebar.footer.action'")
    expect(fullSource).not.toContain('dshWbNavItems')
  })

  it('uses one compact grip per Workbench and keeps selection rows non-draggable', () => {
    expect(fullSource).toContain("pinned.length > 1 && h('button', { type: 'button', role: 'menuitem', className: 'dshWbModeDragHandle', draggable: !disabled")
    expect(fullSource).toContain("h(MarketIcon, { name: 'gripVertical', size: 16 })")
    expect(fullSource).toContain("if (name === 'gripVertical') return h('svg', common")
    expect(fullSource).toContain("h('circle', { cx: 9, cy: 7, r: 1, fill: 'currentColor', stroke: 'none' })")
    expect(fullSource).not.toContain("className: 'dshWbModeOption', role: 'menuitemradio', draggable")
    expect(fullSource).not.toContain('dshWbModeOrder')
    expect(fullSource).not.toContain('dshWbModeOrderButton')
    expect(fullSource).not.toContain("name: 'chevronUp', size: 11")
    expect(fullSource).not.toContain("name: 'chevronDown', size: 11")
  })

  it('opens the Workbench homepage from its fixed hot area and switches by clicking the name or icon', () => {
    const ui = sidebarSwitcher({ pinned: ['writer'], active: 'writer', title: '投标作战室' })
    let tree = ui.render()
    const home = ui.find(tree, node => node.props?.className === 'dshWbWorkbenchHome')[0]
    const switchButton = ui.find(tree, node => node.props?.className === 'dshWbModeSwitch')[0]
    expect(home.props['aria-label']).toBe('打开工作台主页')
    expect(ui.find(switchButton, node => node.props?.className === 'dshWbCurrentModeLabel')[0].props.children).toEqual(['投标作战室'])
    expect(ui.find(switchButton, node => node.type?.name === 'MarketIcon' && node.props?.name === 'switch')).toHaveLength(1)
    expect(ui.find(tree, node => node.props?.className === 'dshWbCurrentMode')).toHaveLength(0)
    expect(ui.find(tree, node => node.props?.className === 'dshWbCurrentModeIcon')).toHaveLength(0)
    expect(switchButton.props['aria-expanded']).toBe(false)
    switchButton.props.onClick()
    tree = ui.render()
    expect(ui.find(tree, node => node.props?.role === 'menu')).toHaveLength(1)
    const modes = ui.find(tree, node => node.props?.role === 'menuitemradio')
    expect(modes).toHaveLength(2)
    expect(ui.find(modes[0], node => node.props?.className === 'dshWbModeOptionLabel')[0].props.children).toEqual(['会话'])
    expect(modes.map(mode => mode.props['aria-checked'])).toEqual([false, true])
    modes[0].props.onClick()
    expect(ui.service.openNative).toHaveBeenCalledOnce()
    tree = ui.render()
    expect(ui.find(tree, node => node.props?.role === 'menu')).toHaveLength(0)
    ui.find(tree, node => node.props?.className === 'dshWbModeSwitch')[0].props.onClick()
    tree = ui.render()
    home.props.onClick()
    expect(ui.service.showMarket).toHaveBeenCalledOnce()
    tree = ui.render()
    expect(ui.find(tree, node => node.props?.role === 'menu')).toHaveLength(0)
  })

  it('shows 会话 without a switch button when no Workbench is pinned', () => {
    const ui = sidebarSwitcher()
    const tree = ui.render()
    expect(ui.find(tree, node => node.props?.className === 'dshWbCurrentModeLabel')[0].props.children).toEqual(['会话'])
    expect(ui.find(tree, node => node.props?.className === 'dshWbCurrentMode')[0].props['aria-label']).toBe('当前模式：会话')
    expect(ui.find(tree, node => node.props?.className === 'dshWbModeSwitch')).toHaveLength(0)
    expect(ui.find(tree, node => node.props?.className === 'dshWbWorkbenchHome')).toHaveLength(1)
    expect(code).not.toContain('.dshWbCurrentModeIcon{')
  })

  it('supports native handle drag and drop with insertion-edge feedback', () => {
    expect(fullSource).toContain("event.dataTransfer.effectAllowed = 'move'")
    expect(fullSource).toContain("event.dataTransfer.setData('text/plain', item.id)")
    expect(fullSource).toContain("event.dataTransfer.setData('application/x-dsh-workbench-id', item.id)")
    expect(fullSource).toContain("const preview = event.currentTarget.closest('.dshWbModeOptionRow')")
    expect(fullSource).toContain("if (preview && typeof event.dataTransfer.setDragImage === 'function') event.dataTransfer.setDragImage(preview, 12, 17)")
    expect(fullSource).toContain("event.dataTransfer.dropEffect = 'move'")
    expect(fullSource).toContain("if (sourceId === targetId) {")
    expect(fullSource).toContain("if (dropTargetRef.current) { dropTargetRef.current = null; setDropTarget(null) }")
    expect(fullSource).toContain("const edge = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'")
    expect(fullSource).toContain("const remaining = pinned.filter((entry) => entry.id !== sourceId)")
    expect(fullSource).toContain("const before = edge === 'before' ? targetId : (remaining[targetIndex + 1]?.id ?? null)")
    expect(fullSource).toContain("onDragStart: (event) => onDragStart(event, item), onDragEnd: clearDrag")
    expect(fullSource).toContain("onDragOver: (event) => onDragOver(event, item.id), onDrop: (event) => onDrop(event, item.id)")
    expect(fullSource).toContain('.dshWbModeOptionRow[data-dragging=true]{opacity:.46}')
    expect(fullSource).toContain('.dshWbModeOptionRow[data-drop-edge=before]::before,.dshWbModeOptionRow[data-drop-edge=after]::after')
    expect(fullSource).not.toContain('.dshWbModeOptionRow{transition')
  })

  it('keeps grip ordering keyboard accessible and announces successful moves', () => {
    expect(fullSource).toContain("if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return")
    expect(fullSource).toContain('event.preventDefault()')
    expect(fullSource).toContain('event.stopPropagation()')
    expect(fullSource).toContain("if (event.key === 'ArrowUp' && index > 0) move(item, index, pinned[index - 1].id, index)")
    expect(fullSource).toContain("if (event.key === 'ArrowDown' && index < pinned.length - 1) move(item, index, pinned[index + 2]?.id ?? null, index + 2)")
    expect(fullSource).toContain("'aria-keyshortcuts': 'ArrowUp ArrowDown', 'aria-roledescription': '拖拽排序手柄'")
    expect(fullSource).toContain("'aria-label': `${item.title}，当前位置 ${index + 1}/${pinned.length}，使用上下方向键调整顺序`")
    expect(fullSource).toContain("setAnnouncement(`${item.title} 已移至第 ${nextPosition} 位`)")
    expect(fullSource).toContain("className: 'dshWbSrOnly', role: 'status', 'aria-live': 'polite', 'aria-atomic': true")
    expect(fullSource).not.toContain('aria-grabbed')
    expect(fullSource).toContain('.dshWbModeDragHandle:focus-visible{outline:2px solid var(--dsw-alias-label-primary);outline-offset:-2px}')
  })

  it('keeps the submit page heading only in the market header', () => {
    expect(fullSource).not.toContain('dshWbSubmitHero')
    expect(fullSource).not.toContain('制作属于你自己的工作台')
    expect(fullSource).not.toContain('照着下面三步做。只给自己用的话，做完第二步就够了。')
  })

  it('keeps the installed collection focused on native running state', () => {
    expect(fullSource).toContain("className: 'dshWbRunSwitch', role: 'switch'")
    expect(fullSource).not.toContain("onClick: () => service.run(service.open(entry.id)) }, '打开工作台'")
  })

  it('uses the top switcher as the only Workbench navigation entry', () => {
    expect(fullSource).not.toContain("ctx.slots.inject('sidebar.panellist'")
    expect(fullSource).not.toContain('function WorkbenchPanelIcon(')
    expect(fullSource).toContain("title: '工作台主页', 'aria-label': '打开工作台主页'")
  })

  it('does not fail the whole Workbench plugin when an older host lacks session filtering', () => {
    expect(fullSource).toContain("typeof ctx.uiWorkspace.registerSessionFilter === 'function'")
    expect(fullSource).toContain("typeof ctx.uiWorkspace.registerSessionStarter === 'function'")
  })

  it('keeps the shortcut row on whenever the Workbench feature is enabled', () => {
    expect(fullSource).not.toContain('WORKBENCH_DOCK_PREF')
    expect(fullSource).not.toContain('workbenchDockPreference')
    expect(fullSource).not.toContain('显示工作台快捷栏')
    expect(fullSource).toContain('if (!enabled || !wide) return null')
    expect(fullSource).toContain("h(Switch, { checked: enabled, onChange: (next) => service.setEnabled(next), label: '启用工作台功能' })")
    expect(fullSource).toContain('if (!workbenchEnabled) return conversation')
  })

  it('offers an independent catalog refresh without resetting local market controls', () => {
    const source = Market.toString()
    expect(source).toContain("const [search, setSearch] = React.useState('')")
    expect(source).toContain("const [category, setCategory] = React.useState('全部')")
    expect(source).toContain("tab === 'mine' ? service.checkUpdates() : service.refreshCatalog()")
    expect(source).toContain("tab === 'mine' ? '检查更新' : '刷新目录'")
    expect(source).toContain("h(MarketIcon, { name: 'refresh', size: 17 })")
    expect(fullSource).toContain('.dshWbRefresh[aria-busy=true] svg{animation:dshWbSpin .8s linear infinite}')
  })

  it('shows GitHub stars and downloads, with a dash instead of a made-up zero when the catalog has no value', () => {
    expect(fullSource).toContain("h(MetaItem, { icon: 'star', label: stars === undefined ? 'GitHub Stars：暂无数据' : 'GitHub Stars'")
    expect(fullSource).toContain('entry.metrics?.githubReleaseDownloads?.value')
    expect(fullSource).toContain("value: downloads === undefined ? '—' : compactCount(downloads)")
    expect(fullSource).not.toContain("icon: 'like'")
  })

  it('shows the author as a GitHub avatar and name without an author label', () => {
    expect(fullSource).toContain('src: `https://github.com/${login}.png?size=40`')
    expect(fullSource).toContain("showVersion && entry.version && h('small', null, `· v${entry.version}`)")
    expect(fullSource).toContain("h(EntryMeta, { entry, showVersion: false })")
    expect(fullSource).not.toContain('`作者 · v${entry.version}`')
  })

  it('links the workbench icon and name together without a separate GitHub icon', () => {
    expect(fullSource).toContain("h('a', { className: 'dshWbTitleLink', href, target: '_blank', rel: 'noopener noreferrer'")
    expect(fullSource).toContain("const icon = showIcon && h('span', { className: 'dshWbCardIcon'")
    expect(fullSource).toContain("h(EntryTitle, { entry, showIcon: true })")
    expect(fullSource).toContain('a.dshWbTitleLink:hover{border-bottom-color:currentColor}')
    expect(fullSource).not.toContain("className: 'dshWbRepository'")
    expect(fullSource).not.toContain("'GitHub：'")
  })

  it('gives market and favorites the same installation-only card footer', () => {
    expect(fullSource).toContain("tab === 'mine'\n                    ? h('button'")
    expect(fullSource).toContain("h('span', { className: 'dshWbInstalled', role: 'status' }, '已安装')")
    expect(fullSource).toContain("installing === catalogId ? '正在安装…' : '安装'")
    expect(fullSource).toContain('.dshWbCard .dshWbActions{margin-top:auto;min-height:36px;gap:8px;padding-top:8px;align-items:center;justify-content:flex-end;flex-wrap:nowrap}')
    expect(fullSource).toContain('height:232px;flex:0 0 232px')
    expect(fullSource).toContain('gap:8px;padding:18px 20px 16px')
  })

  it('bookmarks favorites and marks added workbenches as installed outside the installed collection', () => {
    expect(fullSource).toContain("h(MarketIcon, { name: 'bookmark', size: 17 })")
    expect(fullSource).not.toContain("onClick: () => service.run(service.open(entry.id)) }, '打开工作台'")
    expect(fullSource).toContain('dshWbInstalled')
  })

  it('gives each workbench its own icon instead of the shared market glyph', () => {
    expect(fullSource).toContain("if (own && [...own].length <= 2) return h('span', { className: 'dshWbGlyph'")
    expect(fullSource).toContain("[/投标|招标|标书|bid|tender/i, 'bid']")
    expect(fullSource).toContain("if (name === 'bid') return h('svg'")
    expect(fullSource).toContain("[/玄学|命理|人生|life/i, 'life']")
    expect(fullSource).toContain("if (name === 'life') return h('svg'")
    expect(fullSource).not.toContain("function WorkbenchIcon({ size = 16 }) { return h(MarketIcon, { name: 'market', size }) }")
  })

  it('marks bound sessions with the owning workbench icon through the native sidebar slot', () => {
    expect(fullSource).toContain("ctx.slots.inject('sidebar.session.leading'")
    expect(fullSource).toContain('state.sessionBindings[sessionId]')
    expect(fullSource).toContain("'aria-label': `属于${entry.title}`")
  })

  it('hides version on cards while retaining it in details', () => {
    expect(fullSource).toContain("h(EntryMeta, { entry, showVersion: false })")
    expect(fullSource).toContain("h(EntryMeta, { entry })")
    expect(fullSource).toContain('-webkit-line-clamp:4')
  })

  it('ScreenshotGallery is used in the detail view instead of Preview', () => {
    expect(Market.toString()).toContain('DetailModal')
    expect(fullSource).toContain('ScreenshotGallery')
    expect(fullSource).not.toMatch(/h\(Preview,.*detail: true/)
  })

  it('renders the detail modal inside the Market return tree, not after it', () => {
    // The modal must be a child of the returned element. Placing it after the
    // return statement parses fine but never renders, which silently breaks
    // "查看详情".
    const source = Market.toString()
    const start = source.indexOf("return h('section'", source.indexOf('const copyPrompt'))
    expect(start).toBeGreaterThan(-1)
    let index = source.indexOf('(', start)
    let depth = 0
    let end = -1
    for (; index < source.length; index += 1) {
      const character = source[index]
      if (character === "'" || character === '"' || character === '`') {
        const quote = character
        index += 1
        while (index < source.length && source[index] !== quote) {
          if (source[index] === '\\') index += 1
          index += 1
        }
        continue
      }
      if (character === '(') depth += 1
      else if (character === ')') {
        depth -= 1
        if (depth === 0) { end = index; break }
      }
    }
    expect(end).toBeGreaterThan(start)
    const returned = source.slice(start, end + 1)
    expect(returned).toContain('h(DetailModal')
    // Nothing executable may follow the return statement.
    const remainder = source.slice(end + 1).replace(/[\s;]+/g, '')
    expect(remainder).toBe('}')
  })

  it('portals the detail modal to document.body so panel containment cannot clip it', () => {
    // The market panel sets container-type, which makes it the containing block
    // for fixed-position descendants and clips them with its own overflow.
    const modal = fullSource.slice(fullSource.indexOf('function DetailModal'), fullSource.indexOf('function ConfirmRemoveModal'))
    const focusHook = fullSource.slice(fullSource.indexOf('function useDialogFocus'), fullSource.indexOf('function DetailModal'))
    expect(modal).toContain("require('react-dom').createPortal")
    expect(modal).toContain('document.body')
    expect(modal.indexOf('useDialogFocus')).toBeLessThan(modal.indexOf('if (!entry) return null'))
    expect(focusHook).toContain('React.useEffect')
  })

  it('card screenshot uses dedicated card-level CSS class', () => {
    expect(fullSource).toContain('dshWbCardScreenshot')
    expect(fullSource).toContain('onError: () => setFailedScreenshot(screenshot)')
  })

  it('shows screenshots as a large swipeable carousel that starts on the first image', () => {
    expect(fullSource).toContain('.dshWbCarouselTrack{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;')
    expect(fullSource).toContain('.dshWbCarouselSlide{flex:0 0 100%;scroll-snap-align:start;')
    expect(fullSource).toContain("const [index, setIndex] = React.useState(0)")
    expect(fullSource).toContain("'aria-label': '上一张'")
    expect(fullSource).toContain('dshWbDetailLightbox')
    expect(fullSource).toContain('max-width:880px')
    expect(fullSource).not.toContain('dshWbDetailGallery')
  })

  it('queries a pasted PR link without keeping any local state', async () => {
    const { service } = await fixture()
    const original = service.request
    const status = vi.fn(async () => Response.json({ number: 12, status: 'merged' }))
    service.request = (url, options) => url.startsWith('/api/desktop-workbenches/submission-status') ? status(url) : original(url, options)
    const before = JSON.stringify(service.getSnapshot())
    expect(await service.readSubmissionStatus('https://github.com/dataelement/awesome-dsh-workbench/pull/12')).toEqual({ number: 12, status: 'merged' })
    expect(status).toHaveBeenCalledWith('/api/desktop-workbenches/submission-status?url=https%3A%2F%2Fgithub.com%2Fdataelement%2Fawesome-dsh-workbench%2Fpull%2F12')
    expect(JSON.stringify(service.getSnapshot())).toBe(before)
    expect(Market.toString()).toContain('h(SubmissionStatus, { service })')
    expect(code).toContain('需修改：审核者要求修改')
  })


  const listed = (patch = {}) => ({ id: 'o/helper', owner: 'o', repository: 'helper', url: 'https://github.com/o/helper', name: 'Helper', categoryName: '效率',
    description: { zh: '整理资料。' }, screenshots: [], version: '1.0.0', distribution: { type: 'npm', name: 'helper', version: '1.0.0' }, ...patch })
  function withMarket(service, routes) {
    const original = service.request
    const calls = []
    service.request = (url, options) => {
      if (routes[url]) { calls.push(url); return Promise.resolve(routes[url](options)) }
      return original(url, options)
    }
    return calls
  }

  it('sorts market cards by visible stars, downloads, update time and name without changing the default order', async () => {
    const { service } = await fixture()
    service.remoteCatalog = [
      listed({ id: 'o/zulu', name: 'Zulu', metrics: { githubStars: { value: 2 }, npmDownloads30d: { value: 8 } }, updatedAt: '2026-01-02T00:00:00Z' }),
      listed({ id: 'o/alpha', name: 'Alpha', metrics: { githubStars: { value: 9 }, npmDownloads30d: { value: 3 } }, updatedAt: '2026-03-02T00:00:00Z' }),
      listed({ id: 'o/bravo', name: 'Bravo', metrics: { githubStars: { value: 9 }, npmDownloads30d: { value: 3 } }, updatedAt: '2026-02-02T00:00:00Z' }),
      listed({ id: 'o/missing', name: 'No metrics', updatedAt: 'invalid' })
    ]
    service.publish()
    const ui = interactiveMarket(service)
    const cards = () => ui.find(ui.render(), node => node.type === 'article').map(node => node.props.key)
    const sort = (value) => {
      const select = ui.find(ui.render(), node => node.type === 'select' && node.props['aria-label'] === '工作台排序方式')[0]
      expect(select.props.value).toBeDefined()
      expect(select.props.children.map(option => option.props.value)).toEqual(['default', 'stars', 'downloads', 'updated', 'name'])
      select.props.onChange({ target: { value } })
    }
    expect(cards()).toEqual(['o/zulu', 'o/alpha', 'o/bravo', 'o/missing'])
    sort('stars')
    expect(cards()).toEqual(['o/alpha', 'o/bravo', 'o/zulu', 'o/missing'])
    sort('downloads')
    expect(cards()).toEqual(['o/zulu', 'o/alpha', 'o/bravo', 'o/missing'])
    sort('updated')
    expect(cards()).toEqual(['o/alpha', 'o/bravo', 'o/zulu', 'o/missing'])
    sort('name')
    expect(cards()).toEqual(['o/alpha', 'o/bravo', 'o/missing', 'o/zulu'])
    sort('default')
    expect(cards()).toEqual(['o/zulu', 'o/alpha', 'o/bravo', 'o/missing'])
  })

  it('keeps sorting active while searching, filtering categories and switching collections', async () => {
    const { service } = await fixture({ ...emptyState(), added: ['o/a', 'o/b'], favorites: ['o/a', 'o/b'] })
    service.remoteCatalog = [
      listed({ id: 'o/a', name: 'Alpha', categoryName: '效率', metrics: { githubStars: { value: 1 } } }),
      listed({ id: 'o/b', name: 'Beta', categoryName: '内容', metrics: { githubStars: { value: 5 } } }),
      listed({ id: 'o/c', name: 'Charlie', categoryName: '效率', metrics: { githubStars: { value: 9 } } })
    ]
    service.publish()
    const ui = interactiveMarket(service)
    const cards = () => ui.find(ui.render(), node => node.type === 'article').map(node => node.props.key)
    const node = predicate => ui.find(ui.render(), predicate)[0]
    node(item => item.type === 'select' && item.props['aria-label'] === '工作台排序方式').props.onChange({ target: { value: 'stars' } })
    expect(cards()).toEqual(['o/c', 'o/b', 'o/a'])
    node(item => item.type === 'button' && item.props.className === 'dshWbCategoryFilter' && item.props.children[0] === '效率').props.onClick()
    expect(cards()).toEqual(['o/c', 'o/a'])
    node(item => item.type === 'input' && item.props['aria-label'] === '搜索工作台').props.onChange({ target: { value: 'Alpha' } })
    expect(cards()).toEqual(['o/a'])
    node(item => item.type === 'input' && item.props['aria-label'] === '搜索工作台').props.onChange({ target: { value: '' } })
    node(item => item.props?.id === 'dsh-workbench-favorites-tab').props.onClick()
    expect(cards()).toEqual(['o/b', 'o/a'])
    node(item => item.props?.id === 'dsh-workbench-mine-tab').props.onClick()
    expect(cards()).toEqual(['o/b', 'o/a', 'writer', 'research'])
  })

  it('opens details from the screenshot while favorite remains a separate action', async () => {
    const { service } = await fixture()
    service.remoteCatalog = [listed()]
    service.publish()
    const ui = interactiveMarket(service)
    const card = ui.find(ui.render(), node => node.type === 'article')[0]
    const media = ui.find(card, node => node.props?.className === 'dshWbMedia')[0]
    const preview = ui.find(media, node => node.props?.className === 'dshWbMediaOpen')[0]
    const favorite = ui.find(media, node => node.props?.className === 'dshWbFavorite')[0]
    expect(preview.type).toBe('button')
    expect(preview.props.type).toBe('button')
    expect(preview.props['aria-label']).toContain('Helper')
    expect(ui.find(preview, node => node === favorite)).toHaveLength(0)
    expect(cardButtons(card)).not.toContain('查看详情')
    const toggle = vi.spyOn(service, 'toggleFavorite').mockResolvedValue(undefined)
    favorite.props.onClick()
    expect(toggle).toHaveBeenCalledWith('o/helper')
    expect(ui.find(ui.render(), node => node.type?.name === 'DetailModal')[0]?.props.entry).toBeFalsy()
    preview.props.onClick()
    expect(ui.find(ui.render(), node => node.type?.name === 'DetailModal')[0].props.entry.catalogId).toBe('o/helper')
  })

  it('makes the card icon and title one repository link', async () => {
    const { service } = await fixture()
    service.remoteCatalog = [listed()]
    service.publish()
    const ui = interactiveMarket(service)
    const tree = ui.render()
    const card = ui.find(tree, node => node.type === 'article')[0]
    const title = ui.find(card, node => node.type?.name === 'EntryTitle')[0]
    const link = title.type(title.props)
    expect(link.type).toBe('a')
    expect(link.props.href).toBe('https://github.com/o/helper')
    expect(ui.find(link, node => node.props?.className === 'dshWbCardIcon')).toHaveLength(1)
    expect(ui.find(link, node => node.props?.className === 'dshWbTitleText')[0].props.children).toEqual(['Helper'])
    expect(ui.find(card, node => node.props?.className === 'dshWbRepository')).toHaveLength(0)
    const mineTab = ui.find(tree, node => node.props?.id === 'dsh-workbench-mine-tab')[0]
    expect(mineTab.props.children[0]).toMatch(/^已安装 \(\d+\)$/)
  })

  it('shows installation in market and favorites, with one native switch in Installed', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'], favorites: ['o/helper'] })
    service.remoteCatalog = [listed()]
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    let enabled = true
    ctx.remote = { pluginManager: {
      listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'helper', installed: true, enabled }] })),
      setBundleEnabled: vi.fn(async (_name, next) => { enabled = next; return { ok: true, value: { application: 'applied' } } })
    } }
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper' }, () => null)
    await service.refreshNative()
    for (const tab of ['market', 'favorites']) {
      const ui = interactiveMarket(service, tab)
      const card = ui.find(ui.render(), node => node.type === 'article')[0]
      expect(ui.find(card, node => node.props?.role === 'switch')).toHaveLength(0)
      expect(ui.find(card, node => node.props?.className === 'dshWbInstalled')[0].props.children).toEqual(['已安装'])
      expect(cardButtons(card)).toEqual([])
    }
    const ui = interactiveMarket(service, 'mine')
    let card = ui.find(ui.render(), node => node.type === 'article')[0]
    let switches = ui.find(card, node => node.props?.role === 'switch')
    expect(switches).toHaveLength(1)
    expect(switches[0].props['aria-checked']).toBe(true)
    expect(switches[0].props['aria-label']).toContain('运行状态')
    expect(cardButtons(card)).toEqual([])
    switches[0].props.onClick()
    await vi.waitFor(() => expect(ctx.remote.pluginManager.setBundleEnabled).toHaveBeenCalledWith('helper', false))
    await vi.waitFor(() => expect(service.activationFor(service.getSnapshot().catalog[0])).toBe('off'))
    card = ui.find(ui.render(), node => node.type === 'article')[0]
    switches = ui.find(card, node => node.props?.role === 'switch')
    expect(switches[0].props['aria-checked']).toBe(false)
    expect(ui.find(card, node => node.props?.className === 'dshWbInstalled')).toHaveLength(0)
  })

  it('treats an old market record as uninstalled when native inventory confirms removal', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'] })
    service.remoteCatalog = [listed()]
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [] })) } }
    await service.refreshNative()
    expect(service.marketInstallFor('o/helper')).toBeNull()
    expect(service.installedVersionFor(service.getSnapshot().catalog[0])).toBeUndefined()
    expect(service.getSnapshot().catalog[0].loadFailure).toBe('')
    const ui = interactiveMarket(service)
    const card = ui.find(ui.render(), node => node.type === 'article')[0]
    expect(ui.find(card, node => node.props?.className === 'dshWbInstalled')).toHaveLength(0)
    expect(ui.find(card, node => node.props?.className === 'dshWbFailureHint')).toHaveLength(0)
    expect(cardButtons(card)).toContain('安装')
    expect(ui.find(ui.render(), node => node.type === 'article' && node.props.key === 'o/helper')).toHaveLength(1)
    const mine = interactiveMarket(service, 'mine')
    const stale = mine.find(mine.render(), node => node.type === 'article' && node.props.key === 'o/helper')[0]
    expect(stale).toBeDefined()
    expect(mine.find(stale, node => node.props?.className === 'dshWbUninstall')[0].props['aria-label']).toBe('移除残留记录Helper')
  })

  it('forgets a stale market install before clearing the sidebar record', async () => {
    const { service, ctx, saved } = await fixture({ ...emptyState(), added: ['o/helper'], pinned: ['o/helper'] })
    service.remoteCatalog = [listed()]
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [] })) } }
    await service.refreshNative()
    let rejectRemoval = true
    const calls = withMarket(service, { '/api/desktop-workbenches/market-uninstall': () => rejectRemoval
      ? Response.json({ error: 'Unable to forget record' }, { status: 500 })
      : Response.json({ restartRequired: false }) })
    await expect(service.removeStaleWorkbenchRecord('o/helper')).rejects.toThrow('Unable to forget record')
    expect(saved().state.added).toContain('o/helper')
    expect(service.installs['o/helper']).toBeDefined()
    rejectRemoval = false
    await service.removeStaleWorkbenchRecord('o/helper')
    expect(calls).toEqual(['/api/desktop-workbenches/market-uninstall', '/api/desktop-workbenches/market-uninstall'])
    expect(saved().state.added).not.toContain('o/helper')
    expect(saved().state.pinned).not.toContain('o/helper')
    expect(service.installs['o/helper']).toBeUndefined()
  })

  it('clears a stale sidebar record after recovery forgot its market install', async () => {
    const { service, ctx, saved } = await fixture({ ...emptyState(), added: ['o/helper'], pinned: ['o/helper'] })
    service.remoteCatalog = [listed()]
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [] })) } }
    await service.refreshNative()
    await service.removeStaleWorkbenchRecord('o/helper')
    expect(saved().state.added).toEqual([])
    expect(saved().state.pinned).toEqual([])
  })

  it('lets a removed package install again despite a newer version in its stale record', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'] })
    service.remoteCatalog = [listed({ version: '1.0.0' })]
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '9.0.0' } }
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [] })) } }
    await service.refreshNative()
    const calls = withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ install: { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' }, restartRequired: true }) })
    await service.installFromMarket('o/helper')
    expect(calls).toEqual(['/api/desktop-workbenches/market-install'])
    expect(service.installs['o/helper'].version).toBe('1.0.0')
  })

  it('installs a market entry, pins its repository identity, and asks for a restart', async () => {
    const { service, saved } = await fixture()
    service.remoteCatalog = [listed()]
    const calls = withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ install: { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' }, restartRequired: true }) })
    await service.installFromMarket('o/helper')
    expect(calls).toEqual(['/api/desktop-workbenches/market-install'])
    expect(service.getSnapshot()).toMatchObject({ installing: null, restartNeeded: true, installs: { 'o/helper': { pluginName: 'helper' } } })
    expect(saved().state.added).toEqual(['o/helper'])
    // Until the provider loads, the card stays a market entry awaiting restart.
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'o/helper')).toMatchObject({ installed: false, pendingRestart: true, loadFailure: '' })
    expect(JSON.stringify(marketCard(service))).toContain('已安装')
    expect(cardButtons(marketCard(service))).not.toContain('打开工作台')
  })

  it('merges the installed provider through its caller package identity', async () => {
    const { service, ctx, saved } = await fixture()
    service.remoteCatalog = [listed()]
    withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ install: { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' }, restartRequired: true }) })
    await service.installFromMarket('o/helper')
    expect(saved().state.added).toEqual(['o/helper'])
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper' }, () => null)
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'o/helper')).toMatchObject({ id: 'o/helper', installed: true, listedVersion: '1.0.0' })
    expect(cardButtons(marketCard(service))).not.toContain('打开工作台')
    expect(JSON.stringify(marketCard(service))).toContain('已安装')
    expect(marketCard(service, 'mine')).toBeDefined()
    service.state.favorites = ['o/helper']
    service.installs['o/helper'].version = '0.9.0'
    service.publish()
    expect(cardButtons(marketCard(service))).not.toContain('更新')
    expect(cardButtons(marketCard(service, 'favorites'))).not.toContain('打开工作台')
    expect(cardButtons(marketCard(service, 'mine'))).toEqual([])
    expect(service.marketInstallFor('o/helper')).toBe('o/helper')
  })

  it('places listed or installed versions at the left of the shared card footer', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'] })
    service.remoteCatalog = [listed({ version: '2.0.0' })]
    service.publish()
    const versionIn = (tab) => {
      const ui = interactiveMarket(service, tab)
      const card = ui.find(ui.render(), node => node.type === 'article')[0]
      const footer = ui.find(card, node => node.props?.className === 'dshWbActions')[0]
      expect(footer.props.children[0].props.className).toBe('dshWbCardVersionActions')
      expect(footer.props.children[1].props.className).toBe('dshWbCardControls')
      return ui.find(footer, node => node.props?.className === 'dshWbCardVersion')[0]?.props.children[0]
    }
    expect(versionIn('market')).toBe('v2.0.0')
    service.state.favorites = ['o/helper']
    service.publish()
    expect(versionIn('favorites')).toBe('v2.0.0')

    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper', version: '0.9.0' }, () => null)
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'helper', installed: true, enabled: true, version: '1.1.0' }] })) } }
    await service.refreshNative()
    expect(versionIn('market')).toBe('v1.1.0')
    expect(versionIn('favorites')).toBe('v1.1.0')
    expect(versionIn('mine')).toBe('v1.1.0')

    ctx.remote.pluginManager.listBundles.mockResolvedValue({ ok: true, value: [{ name: 'helper', installed: true, enabled: false }] })
    await service.refreshNative()
    expect(versionIn('mine')).toBe('v1.0.0')
  })

  it('checks updates for a native-installed workbench without a market install record', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'] })
    service.remoteCatalog = [listed({ version: '0.3.4', distribution: { type: 'github-release', version: '0.3.4' } })]
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper', version: '0.3.3', repository: 'https://github.com/o/helper' }, () => null)
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'helper', installed: true, enabled: true, version: '0.3.3' }] })) } }
    await service.refreshNative()
    expect(service.installs).toEqual({})
    expect(service.getSnapshot().catalog.find(item => item.catalogId === 'o/helper')).toMatchObject({ listed: true, installedVersion: '0.3.3' })
    expect(service.updateAvailableFor(service.getSnapshot().catalog.find(item => item.catalogId === 'o/helper'))).toBe(true)
    const ui = interactiveMarket(service, 'mine')
    let card = ui.find(ui.render(), node => node.type === 'article')[0]
    const update = ui.find(card, node => node.props?.className === 'dshWbUpdate')[0]
    expect(update.props.title).toBe('更新Helper至 v0.3.4')
    expect(update.props.children.at(-1).props.children[0]).toBe('更新')
    const footer = ui.find(card, node => node.props?.className === 'dshWbActions')[0]
    const versionActions = ui.find(footer, node => node.props?.className === 'dshWbCardVersionActions')[0]
    expect(versionActions.props.children[1]).toBe(update)
    expect(ui.find(card, node => node.props?.className === 'dshWbMediaActions')[0].props.children[0].props.className).toBe('dshWbUninstall')
    expect(ui.find(card, node => node.props?.className === 'dshWbMediaActions')[0].props.children).toHaveLength(1)
    expect(ui.find(card, node => node.props?.className === 'dshWbCardVersion')[0].props.children).toEqual(['v0.3.3'])
    expect(ui.find(card, node => node.props?.role === 'switch')).toHaveLength(1)
    expect(cardButtons(card)).toEqual([])
    const check = ui.find(ui.render(), node => node.props?.['aria-label'] === '检查更新')[0]
    expect(check).toBeDefined()
    expect(check.props.children.at(-1)).toBe('检查更新')

    let finishInstall
    const calls = withMarket(service, { '/api/desktop-workbenches/market-install': () => new Promise(resolve => { finishInstall = resolve }) })
    update.props.onClick()
    await vi.waitFor(() => expect(calls).toEqual(['/api/desktop-workbenches/market-install']))
    card = ui.find(ui.render(), node => node.type === 'article')[0]
    expect(ui.find(card, node => node.props?.className === 'dshWbUpdate')[0].props.children.at(-1).props.children[0]).toBe('更新中…')
    finishInstall(Response.json({ install: { catalogId: 'o/helper', pluginName: 'helper', version: '0.3.4' }, restartRequired: true }))
    await vi.waitFor(() => expect(service.getSnapshot().restartNeeded).toBe(true))
    card = ui.find(ui.render(), node => node.type === 'article')[0]
    const pending = ui.find(card, node => node.props?.className === 'dshWbUpdate')[0]
    expect(pending.props.disabled).toBe(true)
    expect(pending.props.title).toContain('重启 Harness 后生效')
    expect(ui.find(card, node => node.props?.className === 'dshWbCardVersion')[0].props.children).toEqual(['v0.3.3'])
  })

  it('places the same short update action beside the installed version in Market, Favorites, and Installed', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'], favorites: ['o/helper'] })
    service.remoteCatalog = [listed({ version: '2.0.0' })]
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper', version: '1.0.0' }, () => null)
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'helper', installed: true, enabled: true, version: '1.0.0' }] })) } }
    await service.refreshNative()

    for (const tab of ['market', 'favorites', 'mine']) {
      const ui = interactiveMarket(service, tab)
      const card = ui.find(ui.render(), node => node.type === 'article')[0]
      const footer = ui.find(card, node => node.props?.className === 'dshWbActions')[0]
      const versionActions = ui.find(footer, node => node.props?.className === 'dshWbCardVersionActions')[0]
      expect(versionActions.props.children[0].props.children).toEqual(['v1.0.0'])
      const update = versionActions.props.children[1]
      expect(update.props.className).toBe('dshWbUpdate')
      expect(update.props.children.at(-1).props.children[0]).toBe('更新')
      expect(update.props['aria-label']).toBe('更新Helper至 v2.0.0')
      expect(ui.find(card, node => node.props?.className === 'dshWbMediaActions').flatMap(node => ui.find(node, child => child.props?.className === 'dshWbUpdate'))).toHaveLength(0)
      expect(ui.find(footer, node => node.props?.className === 'dshWbCardControls')).toHaveLength(1)
    }

    service.remoteCatalog = [listed({ version: '1.0.0' })]
    service.publish()
    for (const tab of ['market', 'favorites', 'mine']) {
      const ui = interactiveMarket(service, tab)
      const card = ui.find(ui.render(), node => node.type === 'article')[0]
      expect(ui.find(card, node => node.props?.className === 'dshWbUpdate')).toHaveLength(0)
      expect(ui.find(card, node => node.props?.className === 'dshWbCardVersionActions')).toHaveLength(1)
    }
  })

  it('offers only newer semver targets, including prereleases, and prevents downgrade', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'] })
    service.remoteCatalog = [listed({ version: '1.10.0' })]
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper', version: '1.9.0' }, () => null)
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'helper', installed: true, enabled: true, version: '1.9.0' }] })) } }
    await service.refreshNative()
    const entry = () => service.getSnapshot().catalog.find(item => item.catalogId === 'o/helper')
    const check = (target, current) => {
      service.remoteCatalog = [listed({ version: target })]
      service.native.bundles.helper.version = current
      service.publish()
      return service.updateAvailableFor(entry())
    }
    expect(check('1.10.0', '1.9.0')).toBe(true)
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.10.0' } }
    expect(check('1.10.0', '1.9.0')).toBe(true)
    service.installs = {}
    expect(check('1.9.0', '1.9.0')).toBe(false)
    expect(check('1.8.9', '1.9.0')).toBe(false)
    expect(check('1.9.0', '1.9.0-rc.2')).toBe(true)
    expect(check('1.9.0-rc.10', '1.9.0-rc.2')).toBe(true)
    expect(check('1.9.0-rc.2', '1.9.0')).toBe(false)
    expect(check('latest', '1.9.0')).toBe(false)
    expect(check('1.8.9', '1.9.0')).toBe(false)
    await expect(service.installFromMarket('o/helper')).rejects.toThrow('避免降级')
  })

  it('checks the catalog and native inventory together, then keeps the update action after a failed update', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'] })
    service.remoteCatalog = [listed({ version: '1.1.0' })]
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper', version: '1.0.0' }, () => null)
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'helper', installed: true, enabled: true, version: '1.0.0' }] })) } }
    const readCatalog = vi.spyOn(service, 'readCatalog').mockResolvedValue({ entries: [listed({ version: '1.1.0' })], categories: [], stale: false })
    await service.checkUpdates()
    expect(readCatalog).toHaveBeenCalledWith(true)
    expect(ctx.remote.pluginManager.listBundles).toHaveBeenCalledOnce()
    expect(service.getSnapshot().checkingUpdates).toBe(false)
    withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ error: 'Update rejected' }, { status: 500 }) })
    await expect(service.installFromMarket('o/helper')).rejects.toThrow('Update rejected')
    service.state.favorites = ['o/helper']
    service.publish()
    for (const tab of ['market', 'favorites', 'mine']) {
      const ui = interactiveMarket(service, tab)
      const card = ui.find(ui.render(), node => node.type === 'article')[0]
      const footer = ui.find(card, node => node.props?.className === 'dshWbActions')[0]
      const versionActions = ui.find(footer, node => node.props?.className === 'dshWbCardVersionActions')[0]
      const controls = ui.find(footer, node => node.props?.className === 'dshWbCardControls')[0]
      expect(footer.props.children).toEqual([versionActions, controls])
      expect(versionActions.props.children[0].props.children).toEqual(['v1.0.0'])
      expect(versionActions.props.children[1].props.children.at(-1).props.children[0]).toBe('更新')
      const diagnostic = versionActions.props.children[2]
      expect(diagnostic.props.className).toBe('dshWbFailureHint')
      expect(ui.find(diagnostic, node => node.props?.className === 'dshWbInstallFailed')[0].props.children).toEqual(['更新失败'])
      const icon = ui.find(diagnostic, node => node.props?.className === 'dshWbFailureIcon')[0]
      expect(icon.props['aria-label']).toBe('更新失败详情：Update rejected')
      expect(icon.props['aria-describedby']).toBe(ui.find(diagnostic, node => node.props?.role === 'tooltip')[0].props.id)
      expect(icon.props.tabIndex).toBe(0)
      expect(ui.find(diagnostic, node => node.props?.role === 'tooltip')[0].props.children).toEqual(['Update rejected'])
      expect(ui.find(controls, node => node.props?.className === 'dshWbInstallFailed')).toHaveLength(0)
      expect(ui.find(card, node => node.props?.className === 'dshWbRetry')).toHaveLength(0)
      if (tab === 'mine') expect(ui.find(controls, node => node.props?.role === 'switch')).toHaveLength(1)
      else expect(ui.find(controls, node => node.props?.className === 'dshWbInstalled')[0].props.children).toEqual(['已安装'])
    }
    expect(service.getSnapshot().restartNeeded).toBe(false)
  })

  it('explains why an unmanaged local bundle cannot be uninstalled', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['owner/local'], pinned: ['owner/local'] })
    setFiberPackage(ctx, 'local-package')
    service.register({ title: 'Local', repository: 'https://github.com/owner/local' }, () => null)
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'local-package', installed: true, enabled: true, removable: false, readOnlyReason: 'management-required' }] })) } }
    await service.refreshNative()
    const ui = interactiveMarket(service, 'mine')
    const card = ui.find(ui.render(), node => node.type === 'article' && node.props.key === 'owner/local')[0]
    expect(ui.find(card, node => node.props?.className === 'dshWbUninstallReason')[0].props.children[0]).toContain('宿主管理')
    expect(ui.find(card, node => node.props?.className === 'dshWbUninstall dshWbLocalUninstall')[0].props.disabled).toBe(true)
  })

  it('allows uninstalling a removable local bundle after its provider fails to load', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['owner/local'], pinned: ['owner/local'] })
    setFiberPackage(ctx, 'local-package')
    service.register({ title: 'Local', repository: 'https://github.com/owner/local' }, () => null)
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'local-package', installed: true, enabled: true, removable: true, error: 'Client activation failed' }] })), removeBundle: vi.fn() } }
    await service.refreshNative()
    expect(service.localRemovalStatus(service.getSnapshot().catalog.find(item => item.id === 'owner/local')).removable).toBe(true)
  })

  it('uses local provider versions and hides unknown versions', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['owner/local'] })
    setFiberPackage(ctx, 'local-package')
    const unregister = service.register({ title: 'Local', repository: 'https://github.com/owner/local', version: '0.3.0' }, () => null)
    const ui = interactiveMarket(service, 'mine')
    const card = ui.find(ui.render(), node => node.type === 'article')[0]
    expect(ui.find(card, node => node.props?.className === 'dshWbCardVersion')[0].props.children).toEqual(['v0.3.0'])

    unregister()
    service.knownProviders = { 'owner/local': { id: 'owner/local', sourcePackage: 'local-package', title: 'Local' } }
    service.publish()
    const unknown = ui.find(ui.render(), node => node.type === 'article')[0]
    expect(ui.find(unknown, node => node.props?.className === 'dshWbCardVersion')).toHaveLength(0)
  })

  it('keeps the card footer intact for module load failures in every collection', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'], pinned: ['o/helper'] })
    service.remoteCatalog = [listed({ version: '1.1.0' })]
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    ctx.modules = { entries: { state: { getSnapshot: () => ({
      failures: [{ id: 'helper', message: 'Error: incompatible client API' }]
    }) } } }
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'helper', installed: true, enabled: true, version: '1.0.0' }] })) } }
    await service.refreshNative()
    service.publish()

    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'o/helper')).toMatchObject({
      installed: false,
      loadFailure: 'Error: incompatible client API'
    })
    service.state.favorites = ['o/helper']
    const retry = vi.spyOn(service, 'installFromMarket').mockResolvedValue(undefined)
    for (const tab of ['market', 'favorites', 'mine']) {
      const ui = interactiveMarket(service, tab)
      const card = ui.find(ui.render(), node => node.type === 'article')[0]
      expect(ui.find(card, node => node.props?.className === 'dshWbMuted')).toHaveLength(0)
      const footer = ui.find(card, node => node.props?.className === 'dshWbActions')[0]
      const versionActions = ui.find(footer, node => node.props?.className === 'dshWbCardVersionActions')[0]
      const controls = ui.find(footer, node => node.props?.className === 'dshWbCardControls')[0]
      expect(footer.props.children).toEqual([versionActions, controls])
      expect(ui.find(card, node => node.props?.className === 'dshWbInstalled dshWbInstallFailed')).toHaveLength(0)
      const diagnostic = ui.find(card, node => node.props?.className === 'dshWbFailureIcon')[0]
      expect(diagnostic.props['aria-label']).toBe('加载失败详情：Error: incompatible client API')
      expect(diagnostic.props.tabIndex).toBe(0)
      expect(ui.find(versionActions.props.children[2], node => node === diagnostic)).toHaveLength(1)
      expect(ui.find(card, node => node.props?.className === 'dshWbFailureHint')[0].props.children[0].props.children).toEqual(['加载失败'])
      expect(ui.find(card, node => node.props?.className === 'dshWbRetry')).toHaveLength(0)
      const button = ui.find(card, node => node.props?.className === 'dshWbUpdate')[0]
      expect(button.props['aria-label']).toBe('更新Helper至 v1.1.0')
      expect(button.props.children.at(-1).props.children[0]).toBe('更新')
      expect(versionActions.props.children[1]).toBe(button)
      if (tab === 'mine') {
        expect(ui.find(controls, node => node.props?.role === 'switch')).toHaveLength(1)
      } else {
        expect(ui.find(controls, node => node.props?.className === 'dshWbInstalled')[0].props.children).toEqual(['已安装'])
      }
      button.props.onClick()
    }
    await vi.waitFor(() => expect(retry).toHaveBeenCalledTimes(3))
    expect(retry).toHaveBeenCalledWith('o/helper')
  })

  it('reports a provider load failure only while its native package remains installed', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'], pinned: ['o/helper'] })
    service.remoteCatalog = [listed()]
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'helper', installed: true, enabled: true }] })) } }
    await service.refreshNative()
    const entry = service.getSnapshot().catalog.find(item => item.catalogId === 'o/helper')
    expect(entry).toMatchObject({ installed: false, pendingRestart: false })
    expect(entry.loadFailure).toContain('启动后未注册')
    expect(cardButtons(marketCard(service))).toEqual([])
    expect(cardButtons(marketCard(service))).not.toContain('打开工作台')

    ctx.remote.pluginManager.listBundles.mockResolvedValue({ ok: true, value: [] })
    await service.refreshNative()
    expect(service.getSnapshot().catalog.find(item => item.catalogId === 'o/helper').loadFailure).toBe('')
    expect(service.marketInstallFor('o/helper')).toBeNull()
    expect(JSON.stringify(marketCard(service))).not.toContain('安装失败')
    expect(cardButtons(marketCard(service))).toContain('安装')
  })

  it('shows an install API error on the card and recovers after a successful retry', async () => {
    const { service } = await fixture()
    service.remoteCatalog = [listed()]
    withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ error: 'Package checksum mismatch' }, { status: 500 }) })
    await expect(service.installFromMarket('o/helper')).rejects.toThrow('Package checksum mismatch')
    expect(service.getSnapshot().catalog.find(item => item.catalogId === 'o/helper').loadFailure).toBe('Package checksum mismatch')
    expect(JSON.stringify(marketCard(service))).toContain('安装失败')
    expect(cardButtons(marketCard(service))).not.toContain('打开工作台')
    const ui = interactiveMarket(service, 'market')
    const card = ui.find(ui.render(), node => node.type === 'article')[0]
    const controls = ui.find(card, node => node.props?.className === 'dshWbCardControls')[0]
    expect(ui.find(controls, node => node.props?.className === 'dshWbFailureHint')[0].props.children[0].props.children).toEqual(['安装失败'])
    expect(ui.find(controls, node => node.props?.className === 'dshWbFailureTooltip')[0].props.children).toEqual(['Package checksum mismatch'])
    expect(ui.find(controls, node => node.props?.className === 'dshWbRetry')).toHaveLength(1)
    const clear = ui.find(controls, node => node.props?.children?.includes?.('清除失败提示'))[0]
    expect(clear).toBeDefined()
    clear.props.onClick()
    expect(service.installFailures.has('o/helper')).toBe(false)
    expect(ui.find(card, node => node.props?.className === 'dshWbUpdate')).toHaveLength(0)

    withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ install: { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' }, restartRequired: true }) })
    await service.installFromMarket('o/helper')
    expect(service.getSnapshot().catalog.find(item => item.catalogId === 'o/helper')).toMatchObject({ pendingRestart: true, loadFailure: '' })
    expect(JSON.stringify(marketCard(service))).toContain('已安装')
    expect(JSON.stringify(marketCard(service))).not.toContain('安装失败')
  })

  it('shows a failed update instead of an open action while the older provider remains registered', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['o/helper'] })
    service.remoteCatalog = [listed({ version: '1.1.0' })]
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper' }, () => null)
    withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ error: 'Update rejected' }, { status: 500 }) })

    await expect(service.installFromMarket('o/helper')).rejects.toThrow('Update rejected')
    expect(service.getSnapshot().catalog.find(item => item.catalogId === 'o/helper')).toMatchObject({ installed: true, loadFailure: 'Update rejected' })
    const ui = interactiveMarket(service, 'market')
    const card = ui.find(ui.render(), node => node.type === 'article')[0]
    expect(ui.find(card, node => node.props?.className === 'dshWbUpdate')[0].props.children.at(-1).props.children[0]).toBe('更新')
    expect(ui.find(card, node => node.props?.className === 'dshWbFailureTooltip')[0].props.children).toEqual(['Update rejected'])
    expect(ui.find(card, node => node.props?.className === 'dshWbFailureHint')[0].props.children[0].props.children).toEqual(['更新失败'])
    expect(ui.find(card, node => node.props?.className === 'dshWbInstalled')[0].props.children).toEqual(['已安装'])
    expect(ui.find(ui.find(card, node => node.props?.className === 'dshWbCardControls')[0], node => node.props?.className === 'dshWbInstallFailed')).toHaveLength(0)
    expect(cardButtons(marketCard(service))).not.toContain('打开工作台')
  })

  it('rejects malformed install records and entries not in the market', async () => {
    const { service, saved } = await fixture()
    service.remoteCatalog = [listed()]
    const calls = withMarket(service, {
      '/api/desktop-workbenches/market-install': () => Response.json({ install: { catalogId: 'other/helper', pluginName: 'helper', version: '1.0.0' }, restartRequired: true })
    })
    await expect(service.installFromMarket('o/helper')).rejects.toThrow('安装记录无效')
    expect(calls).toEqual(['/api/desktop-workbenches/market-install'])
    expect(service.getSnapshot().installs).toEqual({})
    expect(saved().state.added).toEqual([])
    await expect(service.installFromMarket('o/gone')).rejects.toThrow('已不在工作台市场')
  })

  it('uninstalls a market package through its recorded install path', async () => {
    const { service, ctx, saved } = await fixture({ ...emptyState(), added: ['o/helper'], pinned: ['o/helper'] })
    service.remoteCatalog = [listed()]
    setFiberPackage(ctx, 'helper')
    service.register({ title: 'Helper' }, () => null)
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    const calls = withMarket(service, { '/api/desktop-workbenches/market-uninstall': (options) => Response.json({ restartRequired: true, got: JSON.parse(options.body) }) })
    await service.removeWorkbench('o/helper')
    expect(calls).toEqual(['/api/desktop-workbenches/market-uninstall'])
    expect(service.getSnapshot()).toMatchObject({ installs: {}, restartNeeded: true })
    expect(saved().state.added).toEqual([])
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'o/helper').installed).toBe(false)
    const ui = interactiveMarket(service, 'mine')
    expect(ui.find(ui.render(), node => node.type === 'article' && node.props.key === 'o/helper')).toHaveLength(0)
  })

  it('uninstalls a removable local bundle before clearing its record and card', async () => {
    const { service, ctx, saved } = await fixture({ ...emptyState(), added: ['owner/local'], pinned: ['owner/local'] })
    setFiberPackage(ctx, 'local-package')
    service.register({ title: 'Local', repository: 'https://github.com/owner/local' }, () => null)
    let installed = true
    ctx.remote = { pluginManager: {
      listBundles: vi.fn(async () => ({ ok: true, value: installed ? [{ name: 'local-package', installed: true, enabled: true, removable: true }] : [] })),
      removeBundle: vi.fn(async () => { installed = false; return { ok: true, value: { changed: true, application: 'restart-required' } } })
    } }
    await service.refreshNative()
    expect(service.getSnapshot().catalog.some(entry => entry.id === 'owner/local')).toBe(true)
    await service.removeWorkbench('owner/local')
    expect(ctx.remote.pluginManager.removeBundle).toHaveBeenCalledExactlyOnceWith('local-package')
    expect(saved().state.added).toEqual([])
    expect(saved().state.pinned).toEqual([])
    expect(service.getSnapshot().catalog.some(entry => entry.id === 'owner/local')).toBe(false)
    expect(service.getSnapshot().restartNeeded).toBe(true)
    const ui = interactiveMarket(service, 'mine')
    expect(ui.find(ui.render(), node => node.type === 'article' && node.props.key === 'owner/local')).toHaveLength(0)
  })

  it('keeps a local workbench when native removal fails or is not applied', async () => {
    const { service, ctx, saved } = await fixture({ ...emptyState(), added: ['owner/local'], pinned: ['owner/local'] })
    setFiberPackage(ctx, 'local-package')
    service.register({ title: 'Local', repository: 'https://github.com/owner/local' }, () => null)
    ctx.remote = { pluginManager: {
      listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'local-package', installed: true, enabled: true, removable: true }] })),
      removeBundle: vi.fn()
    } }
    await service.refreshNative()
    for (const result of [
      { ok: false, error: { diagnostic: 'remote failure' } },
      { ok: true, value: { changed: false, application: 'failed', error: { diagnostic: 'native failure' } } },
      { ok: true, value: { changed: false, application: 'cancelled' } },
      { ok: true, value: { changed: true, application: 'overridden' } },
      { ok: true, value: { changed: false, application: 'applied' } }
    ]) {
      ctx.remote.pluginManager.removeBundle.mockResolvedValueOnce(result)
      await expect(service.removeWorkbench('owner/local')).rejects.toThrow()
      expect(saved().state.added).toEqual(['owner/local'])
      expect(service.getSnapshot().catalog.some(entry => entry.id === 'owner/local')).toBe(true)
      expect(service.removingPlugin).toBe(null)
    }
  })

  it('refuses to clear a local record when its native bundle is not removable', async () => {
    const { service, ctx, saved } = await fixture({ ...emptyState(), added: ['owner/local'] })
    setFiberPackage(ctx, 'local-package')
    service.register({ title: 'Local', repository: 'https://github.com/owner/local' }, () => null)
    ctx.remote = { pluginManager: {
      listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'local-package', installed: true, enabled: true, removable: false }] })),
      removeBundle: vi.fn()
    } }
    await service.refreshNative()
    const ui = interactiveMarket(service, 'mine')
    const card = ui.find(ui.render(), node => node.type === 'article' && node.props.key === 'owner/local')[0]
    expect(ui.find(card, node => node.props?.className === 'dshWbUninstall dshWbLocalUninstall')[0].props.disabled).toBe(true)
    await expect(service.removeWorkbench('owner/local')).rejects.toThrow('不可卸载')
    expect(ctx.remote.pluginManager.removeBundle).not.toHaveBeenCalled()
    expect(saved().state.added).toEqual(['owner/local'])
  })

  it('shows a hover-only uninstall action only in Installed and opens the existing confirmation', async () => {
    const { service } = await fixture({ ...emptyState(), added: ['o/helper'], pinned: ['o/helper'] })
    service.remoteCatalog = [listed()]
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    service.publish()
    for (const tab of ['market', 'favorites']) {
      const ui = interactiveMarket(service, tab)
      const card = ui.find(ui.render(), node => node.type === 'article')[0]
      if (card) expect(ui.find(card, node => node.props?.className === 'dshWbUninstall')).toHaveLength(0)
    }
    const ui = interactiveMarket(service, 'mine')
    const tree = ui.render()
    const card = ui.find(tree, node => node.type === 'article')[0]
    const media = ui.find(card, node => node.props?.className === 'dshWbMedia')[0]
    const uninstall = ui.find(media, node => node.props?.className === 'dshWbUninstall')[0]
    expect(uninstall.props['aria-label']).toBe('卸载Helper')
    expect(uninstall.props.disabled).toBe(false)
    expect(ui.modal(tree)).toBeUndefined()
    uninstall.props.onClick()
    const modal = ui.modal(ui.render())
    expect(modal.props.entry.id).toBe('o/helper')
    expect(modal.props.uninstall).toBe(true)
    expect(typeof service.removeWorkbench).toBe('function')
  })

  it('offers local native uninstall but disables unknown failed Installed cards', async () => {
    const { service, ctx } = await fixture({ ...emptyState(), added: ['owner/local', 'o/helper'] })
    service.remoteCatalog = [listed()]
    setFiberPackage(ctx, 'local-package')
    service.register({ title: 'Local', repository: 'https://github.com/owner/local' }, () => null)
    ctx.remote = { pluginManager: { listBundles: vi.fn(async () => ({ ok: true, value: [{ name: 'local-package', installed: true, enabled: true, removable: true }] })), removeBundle: vi.fn() } }
    await service.refreshNative()
    await service.queue
    const ui = interactiveMarket(service, 'mine')
    const local = ui.find(ui.render(), node => node.type === 'article' && node.props.key === 'owner/local')[0]
    const uninstall = ui.find(local, node => node.props?.className === 'dshWbUninstall dshWbLocalUninstall')[0]
    expect(uninstall.props.disabled).toBe(false)
    uninstall.props.onClick()
    const modal = ui.modal(ui.render())
    expect(modal.props.entry.id).toBe('owner/local')
    expect(modal.props.nativeUninstall).toBe(true)
    // The missing package remains manageable until its stale sidebar record is cleared.
    const stale = ui.find(ui.render(), node => node.type === 'article' && node.props.key === 'o/helper')[0]
    expect(ui.find(stale, node => node.props?.className === 'dshWbUninstall')[0].props['aria-label']).toBe('移除残留记录Helper')
  })

  it('offers installation in market cards and keeps update and uninstall services', () => {
    const source = Market.toString()
    expect(source).toContain('service.installFromMarket(catalogId)')
    expect(source).not.toContain('`更新到 v${entry.listedVersion}`')
    expect(source).toContain("awaitingRestart ? '重启后生效'")
    expect(source).toContain('service.removeWorkbench(removing)')
    expect(fullSource).toContain('async removeWorkbench(id)')
    expect(code).toContain('工作台安装变更需要重启 Harness 后生效')
  })

  it('points the submit panel at a market PR instead of a local draft', () => {
    const source = Market.toString()
    expect(source).not.toContain('SubmitSuccess')
    expect(source).not.toContain('localDrafts')
    expect(fullSource).not.toContain('投稿已保存到本机')
    expect(source).toContain('提交 PR 就是进入审核')
    expect(source).toContain('工作台市场仓库')
  })
  it('uses a focused confirmation dialog for removal instead of inline card copy', () => {
    const source = Market.toString()
    expect(source).toContain('ConfirmRemoveModal')
    expect(source).not.toContain("removing === entry.id && h('div'")
    expect(fullSource).toContain("'aria-labelledby': 'dsh-workbench-remove-title'")
    expect(fullSource).toContain("'aria-describedby': 'dsh-workbench-remove-description'")
    expect(fullSource).toContain('market.inert = true')
    expect(fullSource).toContain('已有会话、项目文件和工作台笔记都会保留')
  })

  it('implements roving keyboard navigation for the three collection tabs', () => {
    const source = Market.toString()
    expect(source).toContain("event.key === 'ArrowRight'")
    expect(source).toContain("event.key === 'ArrowLeft'")
    expect(source).toContain("event.key === 'Home'")
    expect(source).toContain("event.key === 'End'")
    expect(source).toContain("tabIndex: tab === 'favorites' ? 0 : -1")
    expect(source).toContain("tabIndex: tab === 'mine' ? 0 : -1")
    expect(source).not.toContain("tabIndex: tab === 'local' ? 0 : -1")
    expect(source).toContain("entry.local ? '本地'")
  })
})


describe('sidebar central panel selection', () => {
  it('clears workbench selection when Plugins opens even with stale market restoration state', () => {
    const ui = sidebarSwitcher()
    const snapshot = ui.service.getSnapshot()
    ui.service.getSnapshot = () => ({ ...snapshot, marketOpen: true })
    const home = () => ui.find(ui.render(), node => node.props?.className === 'dshWbWorkbenchHome')[0]
    ui.selectPanel('desktop-workbenches')
    expect(home().props['aria-current']).toBe('page')
    expect(ui.find(ui.render(), node => node.props?.['data-dsh-workbench-switcher'] === '')[0].props['data-selected']).toBe('true')
    ui.selectPanel('plugins')
    expect(home().props['aria-current']).toBeUndefined()
    expect(ui.find(ui.render(), node => node.props?.['data-dsh-workbench-switcher'] === '')[0].props['data-selected']).toBeUndefined()
    ui.selectPanel(null)
    expect(home().props['aria-current']).toBeUndefined()
    ui.selectPanel('desktop-workbenches')
    expect(home().props['aria-current']).toBe('page')
  })
})

describe('workbench feature default', () => {
  function loadWorkbenches(stored) {
    const values = new Map(stored === undefined ? [] : [[WORKBENCH_ENABLED, stored]])
    let FreshWorkbenches
    vm.runInNewContext(code, {
      window: {
        sessionStorage,
        localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) },
        __ModuleLoader__: { load({ factory }) {
          FreshWorkbenches = factory(name => name === '@deepseek-ai/cordis' ? { Service } : { createElement() {}, Component: class {}, Switch: () => null }).Workbenches
        } }
      },
      document, setTimeout, clearTimeout, AbortController
    })
    return FreshWorkbenches
  }

  async function openError(stored) {
    const { ctx } = await fixture(boundState())
    const service = new (loadWorkbenches(stored))(ctx)
    try {
      await service.open('research')
      return undefined
    } catch (error) {
      return error.message
    }
  }

  it('keeps workbenches off until the user switches the feature on', async () => {
    expect(await openError(undefined)).toBe('工作台功能已关闭。')
    expect(await openError('false')).toBe('工作台功能已关闭。')
    expect(await openError('true')).not.toBe('工作台功能已关闭。')
  })
})
