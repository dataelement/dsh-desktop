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

const code = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
let apply, Workbenches, Market, submissionAgentPrompt, developmentWorkbenchAgentPrompt, submissionWorkbenchAgentPrompt, copySubmissionPrompt
vm.runInNewContext(code, {
  window: { __ModuleLoader__: { load({ factory }) {
    const client = factory((name) => {
      if (name === 'react') return { createElement() {}, Component: class {} }
      if (name === '@deepseek-ai/cordis') return { Service }
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
  document,
  setTimeout: (...args) => setTimeout(...args), clearTimeout: (...args) => clearTimeout(...args), AbortController
})

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); sidebarWide = false; sidebarCollapsed = false })

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

function registerProvider(service, ctx, id, descriptor = {}, Component = () => null) {
  const source = `package-${id}`
  if (!service.remoteCatalog.some(entry => entry.id === id)) service.remoteCatalog.push({
    id, owner: 'test', repository: id, url: `https://github.com/test/${id}`, name: descriptor.title || id,
    categoryName: '其他', description: { zh: descriptor.title || id }, screenshots: [], version: '1.0.0', distribution: { name: source }
  })
  else service.remoteCatalog = service.remoteCatalog.map(entry => entry.id === id ? { ...entry, distribution: { ...entry.distribution, name: source } } : entry)
  ctx.fiber.name = source
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
    fiber: { name: 'fixture' },
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
    if (url === '/api/desktop-workbenches/catalog') return Response.json({
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
  ctx.fiber.name = 'writer'
  service.register({ title: 'Writer' }, () => null)
  ctx.fiber.name = 'research'
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
  it('collapses an expanded sidebar once when a workbench enters the foreground', async () => {
    const { service, ctx } = await fixture()
    sidebarWide = true
    registerProvider(service, ctx, 'writer', { title: 'Writer' })
    await service.add('writer')
    await service.open('writer')
    expect(ctx.layout.toggleSidebar).toHaveBeenCalledTimes(1)
    await service.open('writer')
    expect(ctx.layout.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('migrates legacy market identities to repository identities and preserves owned data', async () => {
    const legacy = { ...emptyState(), added: ['ming-life'], pinned: ['ming-life'], favorites: ['ming-life'], active: 'ming-life',
      sessionBindings: { old: 'ming-life' }, recentSessions: { 'ming-life': 'old' }, notes: { 'ming-life': 'Keep me' } }
    const { service, request, saved } = await fixture(legacy)
    service.remoteCatalog = [{ id: 'dataelement/dsh-ming-life', workbenchId: 'wb-dataelement-dsh-ming-life', legacyWorkbenchIds: ['ming-life'],
      owner: 'dataelement', url: 'https://github.com/dataelement/dsh-ming-life', name: 'Ming Life', categoryName: '其他',
      description: { zh: 'Ming Life' }, screenshots: [], version: '1.0.0', distribution: { name: 'ming-life' } }]

    service.migrateLegacyWorkbenchIds()
    await service.queue

    expect(request).toHaveBeenCalledWith('/api/desktop-workbenches/state/migrate', expect.objectContaining({ method: 'POST' }))
    expect(saved()).toEqual({ revision: 1, state: { ...legacy,
      added: ['dataelement/dsh-ming-life'], pinned: ['dataelement/dsh-ming-life'], favorites: ['dataelement/dsh-ming-life'], active: 'dataelement/dsh-ming-life',
      sessionBindings: { old: 'dataelement/dsh-ming-life' }, recentSessions: { 'dataelement/dsh-ming-life': 'old' }, notes: { 'dataelement/dsh-ming-life': 'Keep me' } } })
  })

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
    ctx.fiber.name = 'remote-package'
    service.register({ title: '本地标题' }, () => null)
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'owner/remote')).toMatchObject({
      id: 'owner/remote', title: '远程工作台', installed: true
    })
    service.dispose()
  })

  it('derives an unlisted local provider identity from its GitHub repository', async () => {
    const { service, ctx } = await fixture()
    ctx.fiber.name = 'local-package'
    service.register({ title: 'Local workbench', repository: 'https://github.com/Owner/Local-Workbench.git' }, () => null)
    expect(service.getSnapshot().catalog).toContainEqual(expect.objectContaining({
      id: 'owner/local-workbench', catalogId: 'owner/local-workbench', sourcePackage: 'local-package', installed: true
    }))
    service.dispose()
  })

  it('does not expose a provider when its repository disagrees with the market', async () => {
    const { service, ctx } = await fixture()
    service.remoteCatalog = [{
      id: 'owner/listed', owner: 'owner', url: 'https://github.com/owner/listed', name: 'Listed',
      categoryName: '其他', description: { zh: 'Listed' }, screenshots: [], distribution: { name: 'local-package' }
    }]
    ctx.fiber.name = 'local-package'
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

    ctx.fiber.name = 'workbench-package'
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
    ctx.fiber.name = 'workbench-package'
    service.register({ title: '工作台', version: '0.1.1' }, () => null)
    expect(service.getSnapshot().catalog.find(item => item.catalogId === 'owner/workbench')).toMatchObject({
      version: '1.2.0', listedVersion: '1.2.0'
    })

    ctx.fiber.name = 'local-package'
    service.register({ title: '本地工作台', repository: 'https://github.com/owner/local', version: '0.3.0' }, () => null)
    expect(service.getSnapshot().catalog.find(item => item.catalogId === 'owner/local')).toMatchObject({ version: '0.3.0' })
    service.dispose()
  })

  it('does not register the retired notebook templates when the plugin is applied', () => {
    let service
    const ctx = {
      fiber: { name: 'external-package' },
      reflect: { provide: (name, value) => { if (name === 'desktopWorkbenches') service = value } },
      effect: (callback, label) => {
        // Exercise registration effects without mounting DOM styles or starting network I/O.
        if (!['workbenches: styles', 'workbenches: lifecycle'].includes(label)) callback()
      },
      slots: { inject: (_name, callback) => callback(), register: vi.fn() },
      sessions: { list: { subscribe: vi.fn() } },
      uiWorkspace: { registerSessionOpener: vi.fn(), registerSessionReuseFilter: vi.fn() }
    }
    apply(ctx)
    expect(service).toBeInstanceOf(Workbenches)
    expect(service.getSnapshot().catalog).toEqual([])
    service.remoteCatalog = [{ id: 'owner/external-workbench', owner: 'owner', repository: 'external-workbench', url: 'https://github.com/owner/external-workbench', name: 'External workbench', categoryName: '其他', description: { zh: 'External workbench' }, screenshots: [], distribution: { name: 'external-package' } }]
    service.register({ title: 'External workbench' }, () => null)
    expect(service.getSnapshot().catalog.map(entry => entry.id)).toEqual(['owner/external-workbench'])
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
      useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
      useCallback: callback => callback,
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}]
    }
    vm.runInNewContext(code, { document: { createElement: () => ({ style: {} }) }, window: { __ModuleLoader__: { load({ factory }) {
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
      useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
      useCallback: callback => callback,
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}]
    }
    vm.runInNewContext(code, { document: { createElement: () => ({ style: {} }) }, window: { __ModuleLoader__: { load({ factory }) {
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
    ctx.fiber.name = 'writer'
    const id = await service.ensureSession({ folder: '/business/profile' })
    expect(ctx.workspaces.create).toHaveBeenCalledWith({ path: '/business/profile' })
    expect(ctx.uiWorkspace.pickDirectory).not.toHaveBeenCalled()
    expect(service.state.sessionBindings[id]).toBe('writer')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith(id)
  })

  it('restores an owned saved session or adopts a real unowned session without changing its workspace', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    ctx.fiber.name = 'writer'
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
    ctx.fiber.name = 'writer'
    await expect(service.ensureSession({ sessionId: 'research-1', folder: '/business' })).rejects.toThrow('不能重新绑定')
    expect(ctx.sessions.create).not.toHaveBeenCalled()
    const id = await service.ensureSession({ sessionId: 'deleted', folder: '/business' })
    expect(id).not.toBe('deleted')
    expect(service.state.sessionBindings[id]).toBe('writer')
  })

  it('deduplicates provider creation and retains original ownership without stealing focus after a switch', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    ctx.fiber.name = 'writer'
    const refresh = deferred()
    ctx.sessions.refresh.mockReturnValueOnce(refresh.promise)
    const args = { folder: '/business' }
    const first = service.ensureSession(args)
    expect(service.ensureSession(args)).toBe(first)
    await service.open('research')
    refresh.resolve()
    const id = await first
    expect(ctx.sessions.create).toHaveBeenCalledTimes(1)
    expect(service.state.sessionBindings[id]).toBe('writer')
    expect(service.state.active).toBe('research')
    expect(ctx.uiWorkspace.openSession).toHaveBeenLastCalledWith('research-1')
  })

  it('rejects inactive providers and aborts removed providers before creating a session', async () => {
    const { service, ctx } = await fixture(boundState())
    await service.open('writer')
    ctx.fiber.name = 'research'
    await expect(service.ensureSession({ folder: '/business' })).rejects.toThrow('请先打开')
    const refresh = deferred()
    ctx.sessions.refresh.mockReturnValueOnce(refresh.promise)
    ctx.fiber.name = 'writer'
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
      vm.runInNewContext(code, { document: dom.window.document, window: { __ModuleLoader__: { load({ factory }) {
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
      window: { __ModuleLoader__: { load({ factory }) {
        BrowserWorkbenches = factory(name => name === '@deepseek-ai/cordis' ? { Service } : { createElement() {}, Component: class {} }).Workbenches
      } } }
    })
    const { ctx } = await fixture()
    const service = new BrowserWorkbenches(ctx)
    await service.load()
    expect(service.ready).toBe(true)
    expect(service.error).toBe('')
    ctx.fiber.name = 'writer'
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
      useSyncExternalStore(subscribe, getSnapshot) {
        // React calls these as standalone functions, without a store receiver.
        cleanups.push(subscribe(() => {}))
        return getSnapshot()
      }
    }
    vm.runInNewContext(code, { document: { createElement: () => ({ style: {} }) }, window: { __ModuleLoader__: { load({ factory }) { Frame = factory((name) => name === 'react-dom' ? { createPortal: (node) => ({ children: [node] }) } : name === '@deepseek-ai/cordis' ? { Service } : React).Frame } } } })
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
    expect(currentOf(list)).toBe('research-1')
    expect(saved().state.active).toBe('research')
    expect(saved().state.sessionBindings['slow-created']).toBe('writer')
    expect(ctx.uiWorkspace.openSession).not.toHaveBeenCalledWith('slow-created')
    expect(ctx.sessions.stop).not.toHaveBeenCalled()
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
    expect(fullSource).toContain('切换工作台，进入不同工作方式')
    expect(fullSource).toContain('工作台把专属界面、会话和资料组织在一起。可通过左侧快捷栏在原生会话与不同工作台之间切换。')
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

  it('renders native and pinned workbench icons in a compact row above New Session', () => {
    expect(fullSource).toContain('function WorkbenchSidebarSwitcher({ service, wide, startSession })')
    expect(fullSource).toContain("'data-dsh-workbench-switcher': ''")
    expect(fullSource).toContain("'aria-label': '原生会话'")
    expect(fullSource).toContain('onClick: () => startSession()')
    expect(fullSource).toContain("ctx.slots.inject('sidebar.quickSwitcher'")
    expect(fullSource).not.toContain('function WorkbenchDock(')
    expect(fullSource).not.toContain('dshWbDockWrap')
    expect(fullSource).not.toContain("ctx.slots.inject('sidebar.footer.action'")
    expect(fullSource).not.toContain('dshWbNavItems')
  })

  it('keeps an entry path by opening added workbenches from the Workbench page', () => {
    expect(fullSource).toContain("onClick: () => service.run(service.open(entry.id)) }, '打开工作台'")
    expect(fullSource).not.toContain("dshWbInstalled', disabled: true }, '已安装'")
  })

  it('registers Workbench beside the host global panel entries', () => {
    expect(fullSource).toContain("ctx.slots.inject('sidebar.panellist'")
    expect(fullSource).toContain("id: PANEL, order: 100, label: '工作台'")
    expect(fullSource).toContain('function WorkbenchPanelIcon({ service, size = 16, active = false })')
    expect(fullSource).toContain('React.useEffect(() => service.setMarketOpen(active), [service, active])')
    expect(fullSource).not.toContain("title: '工作台市场', 'aria-label': '工作台市场'")
  })

  it('lets the Workbench page persistently show or hide the sidebar shortcut row', () => {
    expect(fullSource).toContain("const WORKBENCH_DOCK_PREF = 'dsh-workbench-dock-visible'")
    expect(fullSource).toContain("role: 'switch', 'aria-checked': dockVisible")
    expect(fullSource).toContain("h('span', null, '显示工作台快捷栏')")
    expect(fullSource).toContain('workbenchDockPreference.set(!dockVisible)')
  })

  it('shows GitHub stars and downloads, with a dash instead of a made-up zero when the catalog has no value', () => {
    expect(fullSource).toContain("h(MetaItem, { icon: 'star', label: stars === undefined ? 'GitHub Stars：暂无数据' : 'GitHub Stars'")
    expect(fullSource).toContain('entry.metrics?.githubReleaseDownloads?.value')
    expect(fullSource).toContain("value: downloads === undefined ? '—' : compactCount(downloads)")
    expect(fullSource).not.toContain("icon: 'like'")
  })

  it('shows the author as a GitHub avatar and name without an author label', () => {
    expect(fullSource).toContain('src: `https://github.com/${login}.png?size=40`')
    expect(fullSource).toContain("entry.version && h('small', null, `· v${entry.version}`)")
    expect(fullSource).not.toContain('`作者 · v${entry.version}`')
  })

  it('links the workbench name to its GitHub repository and drops the separate GitHub row', () => {
    expect(fullSource).toContain("h('a', { className: 'dshWbTitleLink', href, target: '_blank', rel: 'noopener noreferrer'")
    expect(fullSource).toContain('h(WorkbenchIcon, { entry, size: 15 })), h(EntryTitle, { entry }))')
    expect(fullSource).not.toContain("'GitHub：'")
  })

  it('keeps a direct open action when an added workbench also has an update', () => {
    expect(fullSource).toContain("state.added.includes(entry.id)\n                    ? h(React.Fragment, null,")
    expect(fullSource).toContain("onClick: () => service.run(service.open(entry.id)) }, '打开工作台'")
    expect(fullSource).toContain("installing === catalogId ? '更新中…' : '更新'")
    expect(fullSource).toContain("installing === catalogId ? '正在更新…' : '检测到更新')")
    expect(fullSource).toContain("title: `更新到 v${entry.listedVersion}`")
    expect(fullSource).not.toContain(": `更新到 v${entry.listedVersion}`),")
    expect(fullSource).toContain('.dshWbCard .dshWbActions{margin-top:auto;gap:8px;padding-top:2px;align-items:center;flex-wrap:nowrap}')
  })

  it('bookmarks favorites and opens added workbenches from their cards', () => {
    expect(fullSource).toContain("h(MarketIcon, { name: 'bookmark', size: 17 })")
    expect(fullSource).toContain("onClick: () => service.run(service.open(entry.id)) }, '打开工作台'")
    expect(fullSource).not.toContain('dshWbInstalled')
  })

  it('gives each workbench its own icon instead of the shared market glyph', () => {
    expect(fullSource).toContain("if (own && [...own].length <= 2) return h('span', { className: 'dshWbGlyph'")
    expect(fullSource).toContain("[/玄学|命理|人生|life/i, 'life']")
    expect(fullSource).toContain("if (name === 'life') return h('svg'")
    expect(fullSource).not.toContain("function WorkbenchIcon({ size = 16 }) { return h(MarketIcon, { name: 'market', size }) }")
  })

  it('marks bound sessions with the owning workbench icon through the native sidebar slot', () => {
    expect(fullSource).toContain("ctx.slots.inject('sidebar.session.leading'")
    expect(fullSource).toContain('state.sessionBindings[sessionId]')
    expect(fullSource).toContain("'aria-label': `属于${entry.title}`")
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

  it('installs a market entry, pins its repository identity, and asks for a restart', async () => {
    const { service, saved } = await fixture()
    service.remoteCatalog = [listed()]
    const calls = withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ install: { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' }, restartRequired: true }) })
    await service.installFromMarket('o/helper')
    expect(calls).toEqual(['/api/desktop-workbenches/market-install'])
    expect(service.getSnapshot()).toMatchObject({ installing: null, restartNeeded: true, installs: { 'o/helper': { pluginName: 'helper' } } })
    expect(saved().state.added).toEqual(['o/helper'])
    // Until the provider loads, the card stays a market entry awaiting restart.
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'o/helper')).toMatchObject({ installed: false })
  })

  it('merges the installed provider through its caller package identity', async () => {
    const { service, ctx, saved } = await fixture()
    service.remoteCatalog = [listed()]
    withMarket(service, { '/api/desktop-workbenches/market-install': () => Response.json({ install: { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' }, restartRequired: true }) })
    await service.installFromMarket('o/helper')
    expect(saved().state.added).toEqual(['o/helper'])
    ctx.fiber.name = 'helper'
    service.register({ title: 'Helper' }, () => null)
    expect(service.getSnapshot().catalog.find(entry => entry.catalogId === 'o/helper')).toMatchObject({ id: 'o/helper', installed: true, listedVersion: '1.0.0' })
    expect(service.marketInstallFor('o/helper')).toBe('o/helper')
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

  it('uninstalls the market package of a removed workbench but only unpins others', async () => {
    const { service, ctx, saved } = await fixture({ ...emptyState(), added: ['writer', 'o/helper'], pinned: ['writer', 'o/helper'] })
    service.remoteCatalog = [listed()]
    ctx.fiber.name = 'helper'
    service.register({ title: 'Helper' }, () => null)
    service.installs = { 'o/helper': { catalogId: 'o/helper', pluginName: 'helper', version: '1.0.0' } }
    const calls = withMarket(service, { '/api/desktop-workbenches/market-uninstall': (options) => Response.json({ restartRequired: true, got: JSON.parse(options.body) }) })
    await service.removeWorkbench('writer')
    expect(calls).toEqual([])
    await service.removeWorkbench('o/helper')
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
