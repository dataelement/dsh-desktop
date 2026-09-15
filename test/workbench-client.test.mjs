import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyState, validateState } from '../packages/dsh-desktop-workbenches/state.mjs'

const code = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
let Workbenches, Market, submissionAgentPrompt, localWorkbenchAgentPrompt, reviewSubmissionAgentPrompt, copySubmissionPrompt
vm.runInNewContext(code, {
  window: { __ModuleLoader__: { load({ factory }) {
    const client = factory((name) => {
      if (name === 'react') return { createElement() {}, Component: class {} }
      throw new Error(`Unexpected module ${name}`)
    })
    Workbenches = client.Workbenches
    Market = client.Market
    submissionAgentPrompt = client.submissionAgentPrompt
    localWorkbenchAgentPrompt = client.localWorkbenchAgentPrompt
    reviewSubmissionAgentPrompt = client.reviewSubmissionAgentPrompt
    copySubmissionPrompt = client.copySubmissionPrompt
  } } },
  setTimeout: (...args) => setTimeout(...args), clearTimeout: (...args) => clearTimeout(...args), AbortController
})

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

async function fixture(initial = emptyState()) {
  let stored = { revision: 0, state: structuredClone(initial) }
  let storedSubmissions = []
  const list = { current: null, ids: ['old', 'writer-1', 'writer-2', 'research-1'], byId: {} }
  for (const id of list.ids) list.byId[id] = { sessionId: id, displayTitle: id }
  const projects = [{ workspaceId: 'project-1', title: 'User project', sessionIds: [...list.ids] }]
  let sessionCount = 0
  let navigation = new AbortController()
  let service
  const ctx = {
    sessions: {
      list: { getSnapshot: () => list },
      refresh: vi.fn(async () => {}),
      open: vi.fn((id) => { list.current = id; service?.selectionChanged() }),
      clear: vi.fn(() => { list.current = null; service?.selectionChanged() }),
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
      beginNavigation: vi.fn(() => { navigation.abort(); navigation = new AbortController(); return navigation.signal })
    },
    uiWorkspace: { pickDirectory: vi.fn(async () => '/chosen/new-project') },
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
    if (url === '/api/desktop-workbenches/submissions') {
      if (options.method !== 'POST') return Response.json({ submissions: storedSubmissions })
      const submission = { id: `submission-${storedSubmissions.length + 1}`, status: 'pending', createdAt: '2026-09-14T00:00:00.000Z', ...JSON.parse(options.body) }
      storedSubmissions = [submission, ...storedSubmissions]
      return Response.json({ submission }, { status: 201 })
    }
    if (options.method !== 'POST') return Response.json(stored)
    const payload = JSON.parse(options.body)
    if (payload.revision !== stored.revision) return Response.json({ error: 'Conflict' }, { status: 409 })
    try {
      stored = { revision: stored.revision + 1, state: validateState(payload.state, stored.state) }
      return Response.json(stored)
    } catch (error) { return Response.json({ error: error.message }, { status: error.status || 500 }) }
  })
  service = new Workbenches(ctx, request)
  service.register({ id: 'writer', title: 'Writer' }, () => null)
  service.register({ id: 'research', title: 'Research' }, () => null)
  await service.load()
  return {
    service, ctx, request, list,
    saved: () => structuredClone(stored), submissions: () => structuredClone(storedSubmissions),
    externalUpdate: (state = stored.state) => { stored = { revision: stored.revision + 1, state: structuredClone(state) } }
  }
}

const boundState = () => ({ ...emptyState(), added: ['writer', 'research'],
  sessionBindings: { 'writer-1': 'writer', 'writer-2': 'writer', 'research-1': 'research' },
  recentSessions: { writer: 'writer-1', research: 'research-1' }, notes: { writer: 'Retained business draft' } })

describe('desktop workbench client navigation', () => {
  it('renders submission as a third top-level tab with its own panel', () => {
    const source = Market.toString()
    expect(source).toContain("'aria-selected': tab === 'submit'")
    expect(source).toContain("'aria-controls': 'dsh-workbench-submit-panel'")
    expect(source).toContain("id: 'dsh-workbench-submit-panel', role: 'tabpanel'")
    expect(source).toContain('制作我的工作台')
    expect(source).toContain('1 · 了解规范')
    expect(source).toContain('2 · 用自己的 Agent 开发')
    expect(source).toContain('3 · 通过 Agent 交付')
    expect(source).toContain("tab !== 'submit' && h('input'")
    expect(source).toContain("tab !== 'submit' && h('section'")
    expect(source).not.toContain('showSubmit')
    expect(source).not.toContain("'aria-expanded'")
  })

  it('provides separate Agent prompts for local loading and review submission', () => {
    const localPrompt = localWorkbenchAgentPrompt()
    expect(localPrompt).toContain('workbench.json')
    expect(localPrompt).toContain('scripts/check-workbench-package.mjs')
    expect(localPrompt).toContain('我的工作台')
    expect(localPrompt).toContain('左侧入口')
    expect(localPrompt).toContain('不要向市场投稿')
    expect(localPrompt).toContain('不要声称已加载')
    expect(localPrompt).toContain('https://dshdesktop.com/workbench/skills/workbench-development/SKILL.md')
    expect(localPrompt).toContain('$DSH_WEB_URL/api/desktop-workbenches/development-guide')
    expect(localPrompt).toContain('docs/preset-packages.md')
    expect(submissionAgentPrompt('local')).toBe(localPrompt)

    const prompt = reviewSubmissionAgentPrompt()
    expect(prompt).toContain('workbench.json')
    expect(prompt).toContain('scripts/check-workbench-package.mjs')
    expect(prompt).toContain('不依赖 GitHub')
    expect(prompt).toContain('PNG、JPEG 或 WebP')
    expect(prompt).toContain('{ title, description, author, package, screenshot? }')
    expect(prompt).toContain('POST 到 $DSH_WEB_URL/api/desktop-workbenches/submissions')
    expect(prompt).toContain('尚未传送给平台审核')
    expect(prompt).toContain('公共工作台广场')
    expect(submissionAgentPrompt()).toBe(prompt)
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

  it('loads marketplace submissions and publishes a newly saved pending submission once', async () => {
    const { service, submissions } = await fixture()
    const payload = { title: '地图工作台', description: '比较地点与路线', author: 'Cinder', repository: 'https://github.com/example/maps', screenshot: 'data:image/png;base64,AA==' }
    const first = service.submit(payload)
    await expect(service.submit(payload)).rejects.toThrow('请勿重复提交')
    const saved = await first
    expect(saved).toMatchObject({ ...payload, status: 'pending' })
    expect(service.getSnapshot().submissions).toHaveLength(1)
    expect(submissions()).toHaveLength(1)
    await service.load()
    expect(service.getSnapshot().submissions[0]).toMatchObject({ title: '地图工作台', status: 'pending' })
  })

  it('keeps core workbenches ready when submission history cannot be loaded', async () => {
    const { service, request, saved } = await fixture()
    const state = saved()
    request.mockImplementation(async (url) => url === '/api/desktop-workbenches/submissions'
      ? Response.json({ error: 'Submission service offline' }, { status: 503 })
      : Response.json(state))
    await service.load()
    expect(service.ready).toBe(true)
    expect(service.error).toBe('')
    expect(service.getSnapshot().submissionError).toBe('Submission service offline')
    expect(service.getSnapshot().submissions).toEqual([])
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
    expect(ctx.sessions.open).toHaveBeenLastCalledWith(session)
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
      useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
      useCallback: callback => callback,
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}]
    }
    vm.runInNewContext(code, { document: { createElement: () => ({ style: {} }) }, window: { __ModuleLoader__: { load({ factory }) {
      Frame = factory((name) => name === 'react-dom' ? { createPortal: (node) => ({ children: [node] }) } : react).Frame
    } } } })
    const { service, ctx, list } = await fixture()
    const Business = () => 'Business UI'
    service.register({ id: 'standalone', title: 'Standalone', layout: { businessSide: 'left', businessWidth: 0.65 } }, Business)
    ctx.workspaces.list.getSnapshot().items.splice(0)
    list.ids.splice(0)
    list.byId = {}
    list.current = null
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

  it('creates and binds a provider business folder session without a manual picker', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    const id = await service.ensureSession({ workbenchId: 'writer', folder: '/business/profile' })
    expect(ctx.workspaces.create).toHaveBeenCalledWith({ path: '/business/profile' })
    expect(ctx.uiWorkspace.pickDirectory).not.toHaveBeenCalled()
    expect(service.state.sessionBindings[id]).toBe('writer')
    expect(ctx.sessions.open).toHaveBeenLastCalledWith(id)
  })

  it('restores an owned saved session or adopts a real unowned session without changing its workspace', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    expect(await service.ensureSession({ workbenchId: 'writer', sessionId: 'writer-2', folder: '/other' })).toBe('writer-2')
    expect(await service.ensureSession({ workbenchId: 'writer', sessionId: 'old', folder: '/other' })).toBe('old')
    expect(service.state.sessionBindings.old).toBe('writer')
    expect(service.workspaceFor('old').workspaceId).toBe('project-1')
    expect(ctx.workspaces.create).not.toHaveBeenCalled()
    expect(ctx.sessions.create).not.toHaveBeenCalled()
  })

  it('rejects conflicting ownership and recreates a deleted saved session', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    await expect(service.ensureSession({ workbenchId: 'writer', sessionId: 'research-1', folder: '/business' })).rejects.toThrow('不能重新绑定')
    expect(ctx.sessions.create).not.toHaveBeenCalled()
    const id = await service.ensureSession({ workbenchId: 'writer', sessionId: 'deleted', folder: '/business' })
    expect(id).not.toBe('deleted')
    expect(service.state.sessionBindings[id]).toBe('writer')
  })

  it('deduplicates provider creation and retains original ownership without stealing focus after a switch', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    const refresh = deferred()
    ctx.sessions.refresh.mockReturnValueOnce(refresh.promise)
    const args = { workbenchId: 'writer', folder: '/business' }
    const first = service.ensureSession(args)
    expect(service.ensureSession(args)).toBe(first)
    await service.open('research')
    refresh.resolve()
    const id = await first
    expect(ctx.sessions.create).toHaveBeenCalledTimes(1)
    expect(service.state.sessionBindings[id]).toBe('writer')
    expect(service.state.active).toBe('research')
    expect(ctx.sessions.open).toHaveBeenLastCalledWith('research-1')
  })

  it('rejects inactive providers and aborts removed providers before creating a session', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    await expect(service.ensureSession({ workbenchId: 'research', folder: '/business' })).rejects.toThrow('请先打开')
    const refresh = deferred()
    ctx.sessions.refresh.mockReturnValueOnce(refresh.promise)
    const pending = service.ensureSession({ workbenchId: 'writer', folder: '/business' })
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
    expect(list.current).toBe('writer-1')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
    await service.toggle('writer')
    expect(service.state.active).toBe('writer')
    expect(ctx.sessions.open).toHaveBeenLastCalledWith('writer-1')
    await service.toggle('research')
    expect(service.state.active).toBe('research')
    expect(ctx.sessions.open).toHaveBeenLastCalledWith('research-1')
    // Market's explicit open remains idempotently open, not a toggle.
    await service.open('research')
    expect(service.state.active).toBe('research')
  })

  it('keeps exactly one native input mounted while custom dock and default frame exchange its container', async () => {
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
      vm.runInNewContext(code, { document: dom.window.document, window: { __ModuleLoader__: { load({ factory }) {
        Frame = factory(name => name === 'react-dom' ? ReactDOM : React).Frame
      } } } })
      const { service, ctx } = await fixture(boundState())
      const snapshot = ctx.workspaces.list.getSnapshot()
      ctx.workspaces.list.getSnapshot = () => snapshot
      ctx.workspaces.list.subscribe = () => () => {}
      ctx.sessions.list.subscribe = () => () => {}
      function Dock({ conversation }) { return React.createElement('section', { 'data-test-dock': true }, conversation) }
      service.register({ id: 'dock', title: 'Dock', customFrame: true }, Dock)
      await service.add('dock')
      await service.open('writer')
      let mounts = 0
      function Native() {
        React.useEffect(() => { mounts++ }, [])
        return React.createElement('div', { contentEditable: true, suppressContentEditableWarning: true }, 'retained')
      }
      root = createRoot(dom.window.document.getElementById('root'))
      await React.act(async () => root.render(React.createElement(Frame, { service, conversation: React.createElement(Native) })))
      const input = dom.window.document.querySelector('[contenteditable]')
      expect(input).not.toBeNull()
      await React.act(async () => { ctx.sessions.open('old'); await service.queue })
      expect(service.state.active).toBe('writer')
      expect(service.state.sessionBindings.old).toBeUndefined()
      expect(dom.window.document.querySelector('.dshWbBusiness').hidden).toBe(false)
      expect(dom.window.document.querySelector('.dshWbConversation [contenteditable]')).toBe(input)
      expect(dom.window.document.querySelector('.dshWbInit')).toBeNull()
      await React.act(async () => { await service.open('dock') })
      expect(dom.window.document.querySelector('[data-test-dock] [contenteditable]')).toBe(input)
      expect(dom.window.document.querySelectorAll('[contenteditable]')).toHaveLength(1)
      expect(dom.window.document.querySelector('.dshWbBody').hidden).toBe(true)
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
    const reply = vi.fn(async (_url, options = {}) => {
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
      window: { __ModuleLoader__: { load({ factory }) {
        BrowserWorkbenches = factory(() => ({ createElement() {}, Component: class {} })).Workbenches
      } } }
    })
    const { ctx } = await fixture()
    const service = new BrowserWorkbenches(ctx)
    await service.load()
    expect(service.ready).toBe(true)
    expect(service.error).toBe('')
    service.register({ id: 'writer', title: 'Writer' }, () => null)
    await service.add('writer')
    expect(reply).toHaveBeenCalledTimes(3)
    expect(service.revision).toBe(1)
    expect(service.state.added).toEqual(['writer'])
  })

  it('renders Frame with native stores whose snapshot and subscribe methods require their receiver', async () => {
    const cleanups = []
    let Frame
    const React = {
      Component: class {},
      createElement: (type, props, ...children) => ({ type, props, children }),
      useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
      useCallback: (callback) => callback,
      useSyncExternalStore(subscribe, getSnapshot) {
        // React calls these as standalone functions, without a store receiver.
        cleanups.push(subscribe(() => {}))
        return getSnapshot()
      }
    }
    vm.runInNewContext(code, { document: { createElement: () => ({ style: {} }) }, window: { __ModuleLoader__: { load({ factory }) { Frame = factory((name) => name === 'react-dom' ? { createPortal: (node) => ({ children: [node] }) } : React).Frame } } } })
    const { service, ctx } = await fixture(boundState())
    service.register({ id: 'dock', title: 'Dock', customFrame: true }, () => null)
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
    expect(ctx.sessions.clear).not.toHaveBeenCalled()
    await service.open('writer')
    expect(saved().state.pinned).toEqual(['writer'])
    expect(ctx.sessions.clear).toHaveBeenCalledOnce()
    const session = await service.newSession('project-1')
    await service.leave()
    await service.open('writer')
    expect(ctx.sessions.open).toHaveBeenLastCalledWith(session)
    expect(saved().state.active).toBe('writer')
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

  it('restores the recent session but gives an explicitly clicked session priority', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    await service.open('research')
    await service.open('writer', 'writer-2')
    expect(ctx.sessions.open).toHaveBeenLastCalledWith('writer-2')
    expect(saved().state.recentSessions.writer).toBe('writer-2')
    await service.open('research')
    await service.open('writer')
    expect(ctx.sessions.open).toHaveBeenLastCalledWith('writer-2')
    expect(saved().state.active).toBe('writer')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
  })

  it('only the latest of overlapping workbench opens changes the visible session', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    await Promise.all([service.open('writer'), service.open('research')])
    expect(ctx.sessions.open.mock.calls).toEqual([['research-1']])
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
    ctx.sessions.open.mockClear()
    ctx.sessions.clear.mockClear()
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
    expect(ctx.sessions.open).not.toHaveBeenCalled()
    expect(ctx.sessions.clear).not.toHaveBeenCalled()
    expect(list.current).toBe('research-1')
    expect(saved().state.active).toBe(action === 'open' ? 'writer' : null)
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
  })

  it('sidebar session selection wakes its workbench, but preserves the current panel for a removed owner', async () => {
    const { service, ctx, saved } = await fixture(boundState())
    ctx.sessions.open('writer-2')
    await service.queue
    expect(saved().state.active).toBe('writer')
    expect(saved().state.recentSessions.writer).toBe('writer-2')
    await service.remove('writer')
    ctx.sessions.open('research-1')
    await service.queue
    ctx.sessions.open('writer-1')
    await service.queue
    expect(saved().state.active).toBe('research')
    expect(saved().state.added).toEqual(['research'])
    expect(saved().state.pinned).not.toContain('writer')
    expect(saved().state.sessionBindings['writer-1']).toBe('writer')
    expect(saved().state.notes.writer).toBe('Retained business draft')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
  })

  it('persists sidebar order across a controller reload', async () => {
    const { service, saved } = await fixture(boundState())
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

  it('does not let slow session creation steal focus after switching workbenches', async () => {
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
    expect(list.current).toBe('research-1')
    expect(saved().state.active).toBe('research')
    expect(saved().state.sessionBindings['slow-created']).toBe('writer')
    expect(ctx.sessions.open).not.toHaveBeenCalledWith('slow-created')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
  })

  it('keeps the active business panel when native navigation opens or clears an ordinary session', async () => {
    const { service, ctx, request, saved } = await fixture(boundState())
    await service.open('writer')
    const bindings = structuredClone(saved().state.sessionBindings)
    const recent = structuredClone(saved().state.recentSessions)
    const navigation = service.navigation
    request.mockClear()

    ctx.sessions.open('old')
    await service.queue
    expect(service.navigation).toBe(navigation + 1)
    expect(saved().state.active).toBe('writer')
    expect(saved().state.sessionBindings).toEqual(bindings)
    expect(saved().state.recentSessions).toEqual(recent)
    expect(request).not.toHaveBeenCalled()

    ctx.sessions.clear()
    await service.queue
    expect(service.navigation).toBe(navigation + 2)
    expect(saved().state.active).toBe('writer')
    expect(saved().state.sessionBindings).toEqual(bindings)
    expect(saved().state.recentSessions).toEqual(recent)
    expect(request).not.toHaveBeenCalled()
  })

  it('lets ordinary native navigation invalidate a pending workbench session open without adopting it', async () => {
    const { service, ctx, saved, list } = await fixture(boundState())
    await service.open('writer')
    const creation = deferred()
    ctx.sessions.create.mockImplementationOnce(() => creation.promise)
    const pendingCreation = service.newSession('project-1')

    ctx.sessions.open('old')
    list.byId['native-superseded'] = { sessionId: 'native-superseded', displayTitle: 'Native superseded' }
    list.ids.push('native-superseded')
    creation.resolve('native-superseded')
    await pendingCreation

    expect(list.current).toBe('old')
    expect(saved().state.active).toBe('writer')
    expect(saved().state.sessionBindings.old).toBeUndefined()
    expect(saved().state.sessionBindings['native-superseded']).toBe('writer')
    expect(ctx.sessions.open).not.toHaveBeenCalledWith('native-superseded')
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
    const { service, saved } = await fixture(boundState())
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
    const { service, saved } = await fixture(boundState())
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
    expect(ctx.sessions.open).not.toHaveBeenCalledWith('late-created')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
    await service.open('research')
    expect(saved().state.active).toBe('research')
  })

  it('still closes an explicitly left or unloaded workbench', async () => {
    const { service, saved } = await fixture(boundState())
    await service.open('writer')
    await service.leave()
    expect(saved().state.active).toBeNull()

    const unregister = service.register({ id: 'temporary', title: 'Temporary' }, () => null)
    await service.add('temporary')
    await service.open('temporary')
    unregister()
    expect(service.state.active).toBeNull()
    expect(service.catalog.has('temporary')).toBe(false)
  })
})

describe('workbench business layout contract', () => {
  it('accepts a wide left business panel while keeping host geometry bounded', async () => {
    const { service } = await fixture()
    service.register({ id: 'map', title: 'Map', embedded: true, layout: { businessSide: 'left', businessWidth: 0.65 } }, () => null)
    expect(service.catalog.get('map').layout).toEqual({ businessSide: 'left', businessWidth: 0.65 })
    expect(service.catalog.get('writer').layout).toEqual({ businessSide: 'right', businessWidth: 0.36 })
    expect(() => service.register({ id: 'bad', title: 'Bad', layout: { businessWidth: 1 } }, () => null)).toThrow(/width/)
    expect(() => service.register({ id: 'bad', title: 'Bad', layout: { businessSide: 'overlay' } }, () => null)).toThrow(/side/)
  })
})
