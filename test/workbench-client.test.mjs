import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyState, validateState } from '../packages/dsh-desktop-workbenches/state.mjs'

const code = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
let apply, Workbenches, Market, submissionAgentPrompt, developmentWorkbenchAgentPrompt, submissionWorkbenchAgentPrompt, copySubmissionPrompt
vm.runInNewContext(code, {
  window: { __ModuleLoader__: { load({ factory }) {
    const client = factory((name) => {
      if (name === 'react') return { createElement() {}, Component: class {} }
      throw new Error(`Unexpected module ${name}`)
    })
    apply = client.apply
    Workbenches = client.Workbenches
    Market = client.Market
    submissionAgentPrompt = client.submissionAgentPrompt
    developmentWorkbenchAgentPrompt = client.developmentWorkbenchAgentPrompt
    submissionWorkbenchAgentPrompt = client.submissionWorkbenchAgentPrompt
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
    uiWorkspace: {
      pickDirectory: vi.fn(async () => '/chosen/new-project'),
      openSession: vi.fn((id) => ctx.sessions.open(id))
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
    if (url === '/api/desktop-workbenches/catalog') return Response.json({
      stale: false,
      catalog: { schemaVersion: 2, kind: 'catalog', categories: [], workbenches: [] }
    })
    if (options.method !== 'POST') return Response.json(stored)
    const payload = JSON.parse(options.body)
    if (payload.revision !== stored.revision) return Response.json({ error: 'Conflict' }, { status: 409 })
    try {
      stored = { revision: stored.revision + 1, state: validateState(payload.state, stored.state, payload.migrations) }
      return Response.json(stored)
    } catch (error) { return Response.json({ error: error.message }, { status: error.status || 500 }) }
  })
  service = new Workbenches(ctx, request)
  service.register({ id: 'writer', title: 'Writer' }, () => null)
  service.register({ id: 'research', title: 'Research' }, () => null)
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
  it('tracks the market as the current sidebar destination and clears it when a workbench opens', async () => {
    const { service, ctx } = await fixture()
    service.showMarket()
    expect(service.getSnapshot().marketOpen).toBe(true)
    expect(ctx.layout.selectPanel).toHaveBeenLastCalledWith('desktop-workbenches')

    await service.add('writer')
    await service.open('writer')
    expect(service.getSnapshot().marketOpen).toBe(false)
    expect(ctx.layout.selectPanel).toHaveBeenLastCalledWith(null)
    service.dispose()
  })

  it('merges Awesome metadata with loaded providers without treating remote entries as installed', async () => {
    const { service, request } = await fixture()
    request.mockImplementation(async (url, options = {}) => {
      if (url === '/api/desktop-workbenches/catalog') return Response.json({ stale: false, catalog: {
        schemaVersion: 2, kind: 'catalog', categories: [{ id: 'content', name: { zh: '内容' } }],
        workbenches: [{ id: 'owner/remote', workbenchId: 'remote-workbench', owner: 'owner', repository: 'remote', url: 'https://github.com/owner/remote',
          name: '远程工作台', category: 'content', description: { zh: '中文简介', en: 'English description' },
          version: '1.0.0', license: 'MIT', distribution: { type: 'github-source', version: '1.0.0' },
          screenshots: [{ url: 'https://raw.githubusercontent.com/owner/remote/main/shot.png' }] }]
      } })
      if (options.method !== 'POST') return Response.json({ revision: 0, state: emptyState() })
      return Response.json({ revision: 1, state: JSON.parse(options.body).state })
    })
    await service.load()
    const entry = service.getSnapshot().catalog.find(item => item.catalogId === 'owner/remote')
    expect(entry).toMatchObject({ id: 'owner/remote', title: '远程工作台', category: '内容', description: '中文简介', installed: false })
    await service.toggleFavorite('owner/remote')
    expect(service.state.favorites).toEqual(['owner/remote'])
    await expect(service.add('owner/remote')).rejects.toThrow('工作台当前不可用')
  })

  it('associates an installed provider only through its canonical repository URL', async () => {
    const { service } = await fixture()
    service.remoteCatalog = [{
      id: 'owner/remote', owner: 'owner', url: 'https://github.com/owner/remote', name: '远程工作台',
      categoryName: '内容', description: { zh: '中文简介', en: 'English description' }, screenshots: []
    }]
    service.register({ id: 'runtime-id', title: '本地标题', repository: 'https://github.com/owner/remote/' }, () => null)
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'owner/remote')).toMatchObject({
      id: 'runtime-id', title: '远程工作台', installed: true
    })
    service.dispose()
  })

  it('reconciles a market install through its declared runtime ID when no repository descriptor exists', async () => {
    const { service, saved } = await fixture()
    service.remoteCatalog = [{
      id: 'owner/legacy', workbenchId: 'legacy-workbench', owner: 'owner', url: 'https://github.com/owner/legacy', name: '旧版工作台',
      categoryName: '其他', description: { zh: '市场声明运行时 ID' }, screenshots: []
    }]
    service.installs = {
      'owner/legacy': { catalogId: 'owner/legacy', pluginName: 'legacy-workbench', workbenchId: 'legacy-workbench', version: '1.0.0' }
    }

    service.register({ id: 'legacy-workbench', title: '旧版工作台' }, () => null)
    await service.queue

    const entry = service.getSnapshot().catalog.find(item => item.catalogId === 'owner/legacy')
    expect(entry).toMatchObject({ id: 'legacy-workbench', catalogId: 'owner/legacy', installed: true })
    expect(saved().state.added).toEqual(['legacy-workbench'])
    expect(saved().state.pinned).toEqual(['legacy-workbench'])
    service.dispose()
  })

  it('migrates a registered market workbench from its legacy ID without losing sessions or notes', async () => {
    const initial = { ...emptyState(), added: ['legacy-workbench'], pinned: ['legacy-workbench'], active: 'legacy-workbench',
      sessionBindings: { old: 'legacy-workbench' }, recentSessions: { 'legacy-workbench': 'old' }, notes: { 'legacy-workbench': '旧笔记' } }
    const { service, saved, request } = await fixture(initial)
    service.remoteCatalog = [{ id: 'owner/workbench', workbenchId: 'wb-owner-workbench', legacyWorkbenchIds: ['legacy-workbench'],
      owner: 'owner', url: 'https://github.com/owner/workbench', name: '工作台', categoryName: '其他', description: { zh: '迁移' }, screenshots: [] }]
    service.register({ id: 'wb-owner-workbench', title: '工作台' }, () => null)
    await service.queue
    expect(request).toHaveBeenCalledWith('/api/desktop-workbenches/state/migrate', expect.any(Object))
    expect(saved().state).toMatchObject({ added: ['wb-owner-workbench'], pinned: ['wb-owner-workbench'], active: 'wb-owner-workbench',
      sessionBindings: { old: 'wb-owner-workbench' }, recentSessions: { 'wb-owner-workbench': 'old' }, notes: { 'wb-owner-workbench': '旧笔记' } })
    service.dispose()
  })

  it('hides retired IDs from old-state cards, counts and sidebar while retaining other unavailable providers', async () => {
    const ids = ['research-notebook', 'writer', 'writing-notebook', 'missing-provider']
    const initial = {
      ...emptyState(), added: ids, pinned: ids,
      notes: { 'research-notebook': '研究资料', 'writing-notebook': '创作草稿' },
      sessionBindings: { old: 'research-notebook' }, recentSessions: { 'research-notebook': 'old' }
    }
    const { service, saved } = await fixture(initial)
    let client, Sidebar
    vm.runInNewContext(code, {
      window: { __ModuleLoader__: { load({ factory }) {
        client = factory(() => ({ ...React,
          useState: (value) => React.useState(value === 'market' ? 'mine' : value),
          useSyncExternalStore: (_subscribe, snapshot) => snapshot()
        }))
      } } }
    })
    client.apply({
      effect: () => {},
      slots: {
        inject: (_name, callback) => callback(),
        register: (descriptor, Component) => { if (descriptor.name === 'sidebar.footer.action') Sidebar = Component }
      }
    })
    const market = renderToStaticMarkup(React.createElement(client.Market, { service }))
    const sidebar = renderToStaticMarkup(React.createElement(Sidebar, { service, wide: true }))
    for (const html of [market, sidebar]) {
      expect(html).not.toContain('research-notebook')
      expect(html).not.toContain('writing-notebook')
      expect(html).toContain('missing-provider')
      expect(html).toContain('Writer')
    }
    expect(market).toContain('已安装的工作台 (2)')
    expect(market).toContain('提供此工作台的插件当前未加载。')
    expect(sidebar).toContain('missing-provider（不可用）')
    expect(sidebar).toMatch(/aria-label="Writer向上移动" disabled=""/)
    expect(sidebar).toMatch(/aria-label="missing-provider（不可用）向下移动" disabled=""/)
    expect(service.state).toEqual(initial)
    expect(saved().state).toEqual(initial)
    service.dispose()
  })

  it('does not register the retired notebook templates when the plugin is applied', () => {
    let service
    const ctx = {
      reflect: { provide: (name, value) => { if (name === 'desktopWorkbenches') service = value } },
      effect: (callback, label) => {
        // Exercise registration effects without mounting DOM styles or starting network I/O.
        if (!['workbenches: styles', 'workbenches: lifecycle'].includes(label)) callback()
      },
      slots: { inject: (_name, callback) => callback(), register: vi.fn() },
      sessions: { list: { subscribe: vi.fn() } },
      uiWorkspace: { registerSessionOpener: vi.fn() }
    }
    apply(ctx)
    expect(service).toBeInstanceOf(Workbenches)
    expect(service.getSnapshot().catalog).toEqual([])
    service.register({ id: 'external-workbench', title: 'External workbench' }, () => null)
    expect(service.getSnapshot().catalog.map(entry => entry.id)).toEqual(['external-workbench'])
    service.dispose()
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
    expect(ctx.sessions.open).not.toHaveBeenCalled()
    await expect(service.add(id)).rejects.toThrow('工作台当前不可用')
    await expect(service.open(id)).rejects.toThrow('请先添加可用的工作台')
    await service.add('writer')
    await service.open('writer')
    ctx.sessions.open('old')
    await service.queue
    expect(service.state.active).toBe('writer')
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
    expect(source).toContain('已安装的工作台')
    expect(source).toContain('把开发指令交给 Agent')
    expect(source).toContain('装到本机，自测确认能用')
    expect(source).toContain('想上架，再按验收规范提交')
    // Step links open the website pages; the bundled copies stay reachable offline.
    expect(source).toContain('href: DEVELOPMENT_PAGE_URL')
    expect(source).toContain('href: ACCEPTANCE_PAGE_URL')
    expect(source).toContain("'离线查看'")
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
    expect(source).toContain("setGuideOpen('author')")
    expect(source).toContain("setGuideOpen('acceptance')")
    expect(source).not.toContain('GUIDE_PAGE')
    expect(code).toContain("service.request(doc.api, { cache: 'no-store', credentials: 'same-origin' })")
    expect(code).toContain("acceptance: { api: ACCEPTANCE_API, url: ACCEPTANCE_PAGE_URL, title: '工作台市场验收规范'")
    expect(code).toContain("'官方地址：', h('a', { href: doc.url")
  })

  it('provides one prompt for local development and one for submission', () => {
    const development = developmentWorkbenchAgentPrompt()
    expect(development).not.toContain('workbench.json')
    expect(development).toContain('scripts/check-workbench-package.mjs')
    expect(development).toContain('已安装的工作台')
    expect(development).toContain('左侧入口')
    expect(development).toContain('不需要上传或投稿')
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
    const reply = vi.fn(async (url, options = {}) => {
      if (url === '/api/desktop-workbenches/catalog') return Response.json({
        stale: false, catalog: { schemaVersion: 2, kind: 'catalog', categories: [], workbenches: [] }
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
    // state, catalog and market installs on load, then one state write.
    expect(reply).toHaveBeenCalledTimes(4)
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
    expect(ctx.sessions.clear).not.toHaveBeenCalled()
    const session = await service.newSession('project-1')
    await service.leave()
    await service.open('writer')
    expect(ctx.sessions.open).toHaveBeenLastCalledWith(session)
    expect(saved().state.active).toBe('writer')
  })

  it('returns to the workbench home without deleting the recent session', async () => {
    const { service, ctx, list, saved } = await fixture(boundState())
    await service.open('writer')
    expect(list.current).toBe('writer-1')
    ctx.sessions.clear.mockClear()

    await service.home('writer')
    expect(ctx.sessions.clear).not.toHaveBeenCalled()
    expect(list.current).toBe('writer-1')
    expect(saved().state.active).toBe('writer')
    expect(saved().state.recentSessions.writer).toBe('writer-1')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()

    await service.open('writer')
    expect(ctx.sessions.open).toHaveBeenLastCalledWith('writer-1')
  })

  it('uses uiWorkspace navigation when the current sessions service has no open or clear methods', async () => {
    const { service, ctx, list } = await fixture(boundState())
    ctx.uiWorkspace.openSession.mockImplementation((id) => { list.current = id; service.selectionChanged() })
    delete ctx.sessions.open
    delete ctx.sessions.clear

    await expect(service.open('writer')).resolves.toBeUndefined()
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('writer-1')
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

describe('workbench market screenshot and metadata display', () => {
  const fullSource = code
  it('explains the workbench concept and the persistent sidebar switching model', () => {
    expect(fullSource).toContain('切换工作台，进入不同工作方式')
    expect(fullSource).toContain('工作台把专属界面、会话和资料组织在一起。选择适合当前任务的工作台，并随时从左侧切换。')
  })

  it('does not embed provider-specific market screenshots in Desktop', async () => {
    const { service } = await fixture()
    service.register({ id: 'ming-life', title: '玄学人生工作台' }, () => null)
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

  it('marks the market entry as the current page and uses the dedicated market action', () => {
    expect(fullSource).toContain("'aria-current': marketOpen ? 'page' : undefined")
    expect(fullSource).toContain('onClick: () => service.showMarket()')
    expect(fullSource).toContain("h(MarketIcon, { name: 'market', size: 15 })")
    expect(fullSource).toContain('.dshWbNavIcon{display:grid;place-items:center;width:26px;height:26px;flex-shrink:0;border:0;')
    expect(fullSource).not.toContain('.dshWbNavHeader{display:flex;align-items:center;gap:4px;min-width:0;padding-bottom:5px;border-bottom:1px')
  })

  it('only shows installation and like metrics when the catalog provides real values', () => {
    expect(fullSource).not.toContain("compactCount(installs) : '0'")
    expect(fullSource).not.toContain("compactCount(likes) : '0'")
    expect(fullSource).toContain('Number.isFinite(installs)')
    expect(fullSource).toContain('Number.isFinite(likes)')
  })

  it('includes version display in EntryMeta when available', () => {
    expect(fullSource).toContain('entry.version')
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

  it('ScreenshotGallery supports multiple screenshots with gallery- and lightbox CSS' , () => {
    expect(fullSource).toContain('dshWbDetailGallery')
    expect(fullSource).toContain('dshWbDetailThumb')
    expect(fullSource).toContain('dshWbDetailLightbox')
    expect(fullSource).toContain('screenshotsFor')
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


  const listed = (patch = {}) => ({ id: 'o/helper', workbenchId: 'helper', owner: 'o', repository: 'helper', url: 'https://github.com/o/helper', name: 'Helper', categoryName: '效率',
    description: { zh: '整理资料。' }, screenshots: [], version: '1.0.0', distribution: { type: 'npm', version: '1.0.0' }, ...patch })
  function withMarket(service, routes) {
    const original = service.request
    const calls = []
    service.request = (url, options) => {
      if (routes[url]) { calls.push(url); return Promise.resolve(routes[url](options)) }
      return original(url, options)
    }
    return calls
  }

  it('installs a market entry, pins it when its runtime ID is known, and asks for a restart', async () => {
    const { service, saved } = await fixture()
    service.remoteCatalog = [listed()]
    const calls = withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ install: { catalogId: 'o/helper', workbenchId: 'helper', version: '1.0.0' }, restartRequired: true }) })
    await service.installFromMarket('o/helper')
    expect(calls).toEqual(['/api/desktop-workbenches/market-install'])
    expect(service.getSnapshot()).toMatchObject({ installing: null, restartNeeded: true, installs: { 'o/helper': { workbenchId: 'helper' } } })
    expect(saved().state.added).toEqual(['helper'])
    // Until the provider loads, the card stays a market entry awaiting restart.
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'o/helper')).toMatchObject({ installed: false })
  })

  it('merges the installed provider through the declared runtime ID even without a repository descriptor', async () => {
    const { service, saved } = await fixture()
    service.remoteCatalog = [listed()]
    withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ install: { catalogId: 'o/helper', workbenchId: 'helper', version: '1.0.0' }, restartRequired: true }) })
    await service.installFromMarket('o/helper')
    expect(saved().state.added).toEqual(['helper'])
    service.register({ id: 'helper', title: 'Helper' }, () => null)
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'o/helper')).toMatchObject({ id: 'helper', installed: true, listedVersion: '1.0.0' })
    expect(service.marketInstallFor('helper')).toBe('o/helper')
  })

  it('keeps an install still running a pre-namespace release as one installed card that can update', async () => {
    const { service } = await fixture()
    service.remoteCatalog = [listed({ workbenchId: 'wb-o-helper', legacyWorkbenchIds: ['helper'], version: '1.1.0' })]
    service.installs = { 'o/helper': { catalogId: 'o/helper', workbenchId: 'helper', version: '1.0.0' } }
    service.register({ id: 'helper', title: 'Helper' }, () => null)
    const cards = service.getSnapshot().catalog.filter(entry => entry.catalogId === 'o/helper' || entry.id === 'helper')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ id: 'helper', installed: true, listedVersion: '1.1.0' })
  })

  it('does not claim a legacy-ID provider for a listing that was never installed from the market', async () => {
    const { service } = await fixture()
    service.remoteCatalog = [listed({ workbenchId: 'wb-o-helper', legacyWorkbenchIds: ['helper'] })]
    service.register({ id: 'helper', title: 'Helper' }, () => null)
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'o/helper')).toMatchObject({ installed: false })
  })

  it('rolls back an install whose runtime ID shadows a loaded workbench, and refuses entries not in the market', async () => {
    const { service, saved } = await fixture()
    service.remoteCatalog = [listed()]
    const calls = withMarket(service, {
      '/api/desktop-workbenches/market-install': () => Response.json({ install: { workbenchId: 'writer', version: '1.0.0' }, restartRequired: true }),
      '/api/desktop-workbenches/market-uninstall': () => Response.json({ restartRequired: true })
    })
    await expect(service.installFromMarket('o/helper')).rejects.toThrow('与本机已有的工作台相同')
    expect(calls).toEqual(['/api/desktop-workbenches/market-install', '/api/desktop-workbenches/market-uninstall'])
    expect(service.getSnapshot().installs).toEqual({})
    expect(saved().state.added).toEqual([])
    await expect(service.installFromMarket('o/gone')).rejects.toThrow('已不在工作台市场')
  })

  it('uninstalls the market package of a removed workbench but only unpins others', async () => {
    const { service, saved } = await fixture({ ...emptyState(), added: ['writer', 'helper'], pinned: ['writer', 'helper'] })
    service.remoteCatalog = [listed()]
    service.register({ id: 'helper', title: 'Helper', repository: 'https://github.com/o/helper/' }, () => null)
    service.installs = { 'o/helper': { workbenchId: 'helper', version: '1.0.0' } }
    const calls = withMarket(service, { '/api/desktop-workbenches/market-uninstall': (options) => Response.json({ restartRequired: true, got: JSON.parse(options.body) }) })
    await service.removeWorkbench('writer')
    expect(calls).toEqual([])
    await service.removeWorkbench('helper')
    expect(calls).toEqual(['/api/desktop-workbenches/market-uninstall'])
    expect(service.getSnapshot()).toMatchObject({ installs: {}, restartNeeded: true })
    expect(saved().state.added).toEqual([])
  })

  it('offers install, update, pending-restart and uninstall from the market cards', () => {
    const source = Market.toString()
    expect(source).toContain('service.installFromMarket(catalogId)')
    expect(source).toContain('`更新到 v${entry.listedVersion}`')
    expect(source).toContain("'重启后生效'")
    expect(source).toContain('service.uninstallFromMarket(catalogId)')
    expect(source).toContain('service.removeWorkbench(removing)')
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
  })
})
