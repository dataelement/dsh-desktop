// The plugin serves the development guide from its own package directory, so the
// guide cannot read docs/ at runtime and is committed as a copy of two documents.
// Hand-maintaining that copy is how it drifted from its sources before: a change
// to the switch description had to be made twice and was missed once. These tests
// make that drift fail loudly instead.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../packages/dsh-desktop-workbenches/index.js'
import { renderDocumentPage } from '../scripts/workbench-doc-page.mjs'
import { renderBundledGuide, SITE_DOCUMENTS, ACCEPTANCE_SOURCE, ACCEPTANCE_TARGET, ACCEPTANCE_EN_SOURCE, ACCEPTANCE_EN_TARGET, GUIDE_SOURCE, GUIDE_TARGET, GUIDE_EN_SOURCE, GUIDE_EN_TARGET, QUICKSTART_SOURCE, QUICKSTART_EN_SOURCE, renderAcceptanceFromSource, renderGuideFromSource, renderQuickstartFromSource, renderEnglishGuideFromSource, renderEnglishAcceptanceFromSource, renderEnglishQuickstartFromSource } from '../scripts/build-workbench-guide.mjs'

const root = join(import.meta.dirname, '..')
const read = path => readFileSync(join(root, path), 'utf8')

describe('bundled workbench development guide', () => {
  it('keeps offline fallback notices out of website output and requires online retrieval in prompts', () => {
    for (const [render, language, notice] of [[renderGuideFromSource, 'zh', '内置离线快照'], [renderEnglishGuideFromSource, 'en', 'Bundled offline snapshot']]) {
      const online = render(read)
      expect(online).not.toContain(notice)
      expect(renderBundledGuide(online, language)).toContain(notice)
      expect(renderBundledGuide(online, language)).toContain(online)
    }
    const client = read('packages/dsh-desktop-workbenches/client.js')
    for (const phrase of ['必须先实际获取', '记录实际获取地址和文档版本', '只有在线获取失败', '能力差异', 'actually fetch and read', 'Record the fetched URL and document version', 'Only if online retrieval fails', 'capability differences']) expect(client).toContain(phrase)
  })

  it('generates website Markdown and reading pages without bundled-copy notices', async () => {
    const site = await mkdtemp(join(tmpdir(), 'dsh-workbench-site-'))
    try {
      execFileSync(process.execPath, [join(root, 'scripts/build-workbench-guide.mjs'), '--site', site])
      for (const [doc, source, notice] of [[SITE_DOCUMENTS.development, GUIDE_SOURCE, '内置离线快照'], [SITE_DOCUMENTS.developmentEn, GUIDE_EN_SOURCE, 'Bundled offline snapshot']]) {
        expect(readFileSync(join(site, doc.file), 'utf8')).toBe(read(source))
        expect(readFileSync(join(site, doc.page), 'utf8')).not.toContain(notice)
      }
    } finally { await rm(site, { recursive: true, force: true }) }
  })

  it('equals the development spec shipped to authors and Agents', () => {
    expect(read(GUIDE_TARGET)).toBe(renderBundledGuide(renderGuideFromSource(read)))
  })

  it('guides progressive requirements conversations in both languages without a combined questionnaire', () => {
    for (const path of [GUIDE_SOURCE, GUIDE_EN_SOURCE, QUICKSTART_SOURCE, QUICKSTART_EN_SOURCE]) {
      const guide = read(path)
      expect(guide).not.toContain('合并问题')
      expect(guide).not.toContain('combined question')
      if (path.endsWith('.zh.md')) {
        expect(guide).toContain('每次只问一个')
        expect(guide).toContain('暂定名')
        expect(guide).toContain('这个工作台想叫什么名字？')
      } else {
        expect(guide).toContain('one necessary question at a time')
        expect(guide).toContain('provisional name')
        expect(guide).toContain('What would you like to call this workbench?')
      }
    }
  })

  it('offers independent trial and continued Agent verification after restart in both languages', () => {
    for (const path of [GUIDE_SOURCE, GUIDE_EN_SOURCE, QUICKSTART_SOURCE, QUICKSTART_EN_SOURCE]) {
      const guide = read(path)
      for (const phrase of path.endsWith('.zh.md')
        ? ['两条可选路径', '重启好了', '不必返回对话', '不存在单独的「添加」按钮', '安装成功不能表述为全部验收通过']
        : ['two optional paths', 'Restart complete', 'without returning to the conversation', 'no separate “Add” button', 'installation success does not mean all acceptance checks passed']) expect(guide).toContain(phrase)
    }
  })

  it('requires the final usage handoff after technical details in both authoritative guides', () => {
    for (const path of [GUIDE_SOURCE, GUIDE_EN_SOURCE, QUICKSTART_SOURCE, QUICKSTART_EN_SOURCE]) {
      const guide = read(path)
      const phrases = path.endsWith('.zh.md')
        ? ['最终回复必须以醒目的「接下来怎么用」三点提示收尾', '放在所有修改说明、自测结果、文件链接和技术附录之后', '不能在这三点之后追加内容', '1. 开发结果：', '安装失败', '2. 如何重启：', '点击顶部提示中的「立即重启」', 'Harness → 重启 Harness', '通常只需重启 Harness', '3. 去哪里打开：', '左上角「工作台」', '工作台市场 → 已安装', '带「本地」标识']
        : ['final response must end with a prominent three-point “What to do next” block', 'after all change descriptions, self-test results, file links, and technical appendices', 'do not append any content after these three points', '1. Development result:', 'installation failed', '2. How to restart:', 'click “Restart now” in the top banner', 'Harness → Restart Harness', 'normally only Harness needs restarting', '3. Where to open it:', 'upper left', 'Workbench Market → Installed', 'marked “Local,”']
      for (const phrase of phrases) expect(guide).toContain(phrase)
      if ([GUIDE_SOURCE, GUIDE_EN_SOURCE].includes(path)) {
        expect(guide).toContain('installBundle')
        expect(guide).toContain('install_local_workbench')
        expect(guide).toContain('restart-required')
      }
    }
  })

  it('keeps user-facing choices in business language while preserving technical guidance', () => {
    for (const path of [GUIDE_SOURCE, GUIDE_EN_SOURCE, QUICKSTART_SOURCE, QUICKSTART_EN_SOURCE]) {
      const guide = read(path)
      expect(guide).toContain(path.endsWith('.zh.md') ? '面向用户的沟通' : 'Communication with users')
      expect(guide).toContain(path.endsWith('.zh.md') ? '不要要求普通用户确认' : 'Do not ask ordinary users to confirm')
      expect(guide).toContain(path.endsWith('.zh.md') ? '不得捏造真实仓库' : 'a real repository must never be fabricated')
    }
    expect(read(GUIDE_SOURCE)).toContain('customFrame: true')
    expect(read(GUIDE_EN_SOURCE)).toContain('customFrame: true')
  })

  it('documents local identity separately from market publication in both languages', () => {
    for (const path of [GUIDE_SOURCE, GUIDE_EN_SOURCE, QUICKSTART_SOURCE, QUICKSTART_EN_SOURCE]) {
      const guide = read(path)
      expect(guide).toContain('2026-10-27')
      expect(guide).toContain('local:@scope/name')
      expect(guide).toContain(path.endsWith('.zh.md') ? '不需要 GitHub 账号' : 'require no GitHub account')
      expect(guide).toContain(path.endsWith('.zh.md') ? '不会自动迁移本地会话' : 'does not automatically migrate local sessions')
      expect(guide).toContain(path.endsWith('.zh.md') ? '阶段和原因' : 'stage, and reason')
    }
    for (const path of [GUIDE_SOURCE, GUIDE_EN_SOURCE]) {
      const guide = read(path)
      const clientExample = guide.split('window.__ModuleLoader__.load({')[1].split('```')[0]
      expect(clientExample).toContain('desktopWorkbenches.register({')
      expect(clientExample).not.toContain('repository:')
      expect(guide).toContain(path.endsWith('.zh.md') ? '仅在准备市场投稿' : 'Only when preparing a market submission')
      expect(guide).toContain(path.endsWith('.zh.md') ? '不能替代真实 UI 验收' : 'do not replace real UI acceptance')
      expect(guide).not.toMatch(/(?:必须|must)\*\*提供.*(?:规范的 GitHub|canonical GitHub)/)
    }
  })

  it('covers development and the local self-test only', () => {
    const guide = read(GUIDE_TARGET)
    expect(guide).toBe(renderBundledGuide(read(GUIDE_SOURCE)))
    expect(guide).toContain('## 1. 执行原则')
    expect(guide).not.toContain('开发时可以把需求与本文一起交给 AI')
    expect(guide).toContain('## 3. 包格式')
    expect(guide).toContain('## 8. 本地自测清单')
    // Listing is covered once, by the market acceptance spec.
    expect(guide).toContain('https://dshdesktop.com/workbench/docs/market-acceptance/')
    expect(guide).toContain('https://dshdesktop.com/workbench/docs/development.md')
    expect(guide).not.toContain('$DSH_WEB_URL')
    expect(guide).not.toContain('data/workbenches/')
    expect(guide).not.toContain('首次市场收录')
    expect(guide).not.toContain('screenshots.json')
    // The guide is self-contained: readers see it outside the checkout.
    expect(guide).not.toContain('../../docs/')
  })

  it('ships the market acceptance spec as its own document', () => {
    const spec = read(ACCEPTANCE_TARGET)
    expect(spec).toBe(renderAcceptanceFromSource(read))
    expect(spec).toBe(read(ACCEPTANCE_SOURCE))
    expect(spec).toContain('data/workbenches/<owner>__<repo>.yml')
    expect(spec).toContain('本机不保存投稿状态')
    expect(spec).toContain('**验收清单**')
    expect(spec).not.toContain('submissions.json')
    expect(spec).not.toContain('docs/workbench-')
    expect(spec).toContain('https://dshdesktop.com/workbench/docs/development/')
    expect(spec).toContain('https://dshdesktop.com/workbench/docs/market-acceptance.md')
    expect(spec).not.toContain('$DSH_WEB_URL')
  })

  it('ships complete English development and acceptance sources for offline use', () => {
    expect(read(GUIDE_EN_TARGET)).toBe(renderBundledGuide(renderEnglishGuideFromSource(read), 'en'))
    expect(read(ACCEPTANCE_EN_TARGET)).toBe(renderEnglishAcceptanceFromSource(read))
    expect(read(GUIDE_EN_TARGET)).toBe(renderBundledGuide(read(GUIDE_EN_SOURCE), 'en'))
    expect(read(ACCEPTANCE_EN_TARGET)).toBe(read(ACCEPTANCE_EN_SOURCE))
    expect(read(GUIDE_EN_TARGET)).toContain('## 8. Local self-test checklist')
    expect(read(ACCEPTANCE_EN_TARGET)).toContain('**Acceptance checklist**')
    expect(read(ACCEPTANCE_EN_TARGET)).toContain('data/workbenches/<owner>__<repo>.yml')
  })

  it('declares a request body mode on every route, as the real host requires', async () => {
    // dsh-client-connection streams the body of a route without requestBody,
    // and a GET Request cannot carry a body: such routes answer 400 in the app.
    const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-routes-'))
    try {
      const routes = []
      const connection = { fetch: { register(route) { routes.push(route) } } }
      apply({ effect: fn => fn(), inject: (deps, callback) => { if (!deps.includes('tools')) callback({ connection, pluginManager: {}, effect: fn => fn() }) }, reflect: { provide() {} }, connection }, { root })
      expect(routes.length).toBeGreaterThan(5)
      for (const route of routes) expect([route.path, route.requestBody]).toEqual([route.path, 'buffered'])
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('serves the guide and the acceptance spec from the local host', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-guide-'))
    try {
      const routes = []
      apply({ effect: fn => fn(), inject() {}, reflect: { provide() {} }, connection: { fetch: { register(route) { routes.push(route) } } } }, { root })
      for (const path of ['/api/desktop-workbenches/development-guide', '/api/desktop-workbenches/author-guide']) {
        const response = await routes.find(value => value.path === path).fetch(new Request(`http://localhost${path}`))
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toContain('text/markdown')
        expect(await response.text()).toBe(read(GUIDE_TARGET))
      }
      const acceptance = await routes.find(value => value.path === '/api/desktop-workbenches/market-acceptance').fetch(new Request('http://localhost/api/desktop-workbenches/market-acceptance'))
      expect(await acceptance.text()).toBe(read(ACCEPTANCE_TARGET))
      for (const path of ['/api/desktop-workbenches/development-guide-en', '/api/desktop-workbenches/author-guide-en']) {
        const response = await routes.find(value => value.path === path).fetch(new Request(`http://localhost${path}`))
        expect(response.status).toBe(200)
        expect(await response.text()).toBe(read(GUIDE_EN_TARGET))
      }
      const englishAcceptance = await routes.find(value => value.path === '/api/desktop-workbenches/market-acceptance-en').fetch(new Request('http://localhost/api/desktop-workbenches/market-acceptance-en'))
      expect(englishAcceptance.status).toBe(200)
      expect(await englishAcceptance.text()).toBe(read(ACCEPTANCE_EN_TARGET))
      expect(routes.some(value => value.path === '/api/desktop-workbenches/submissions')).toBe(false)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('serves the bundled market header image through a fixed local route', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-header-'))
    try {
      const routes = []
      apply({ effect: fn => fn(), inject() {}, reflect: { provide() {} }, connection: { fetch: { register(route) { routes.push(route) } } } }, { root })
      const route = routes.find(value => value.path === '/api/desktop-workbenches/assets/market-header.png')
      expect(route.methods).toEqual(['GET'])
      const response = await route.fetch(new Request('http://localhost/api/desktop-workbenches/assets/market-header.png'))
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/png')
      expect(Buffer.from(await response.arrayBuffer())).toEqual(readFileSync(join(import.meta.dirname, '../packages/dsh-desktop-workbenches/assets/market-header.png')))
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('writes the documents and their reading pages for the website', () => {
    expect(SITE_DOCUMENTS.development).toMatchObject({
      file: 'docs/development.md', url: 'https://dshdesktop.com/workbench/docs/development.md',
      page: 'docs/development/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/development/'
    })
    expect(SITE_DOCUMENTS.acceptance).toMatchObject({
      file: 'docs/market-acceptance.md', url: 'https://dshdesktop.com/workbench/docs/market-acceptance.md',
      page: 'docs/market-acceptance/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/market-acceptance/'
    })
    expect(SITE_DOCUMENTS.quickstart).toMatchObject({
      file: 'docs/quickstart.md', url: 'https://dshdesktop.com/workbench/docs/quickstart.md',
      page: 'docs/quickstart/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/quickstart/'
    })
    const quickstart = renderQuickstartFromSource(read)
    expect(quickstart).toBe(read(QUICKSTART_SOURCE))
    expect(quickstart).toContain('**空目录示例**')
    expect(renderEnglishQuickstartFromSource(read)).toBe(read(QUICKSTART_EN_SOURCE))
    expect(renderEnglishQuickstartFromSource(read)).toContain('**Empty-directory example**')
    for (const [zh, en] of [['development', 'developmentEn'], ['acceptance', 'acceptanceEn'], ['quickstart', 'quickstartEn']]) {
      expect(SITE_DOCUMENTS[zh].alternatePageUrl).toBe(SITE_DOCUMENTS[en].pageUrl)
      expect(SITE_DOCUMENTS[en].alternatePageUrl).toBe(SITE_DOCUMENTS[zh].pageUrl)
      expect(SITE_DOCUMENTS[en].language).toBe('en')
    }
    const client = read('packages/dsh-desktop-workbenches/client.js')
    for (const doc of [SITE_DOCUMENTS.development, SITE_DOCUMENTS.acceptance, SITE_DOCUMENTS.developmentEn, SITE_DOCUMENTS.acceptanceEn]) {
      expect(client).toContain(`'${doc.url}'`)
      expect(client).toContain(`'${doc.pageUrl}'`)
    }
  })

  it('renders a reading page that escapes the document and links its Markdown source', () => {
    const page = renderDocumentPage('# 标题\n\n| a | b |\n|---|---|\n| `<x>` | **粗** |\n\n- [ ] 任务\n\n<script>alert(1)</script>', { markdownUrl: 'https://dshdesktop.com/workbench/docs/development.md' })
    expect(page).toContain('<title>标题 — DSH Desktop</title>')
    expect(page).toContain('<td><code>&lt;x&gt;</code></td><td><strong>粗</strong></td>')
    expect(page).toContain('<input type="checkbox" disabled> 任务')
    expect(page).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(page).not.toContain('<script>')
    expect(page).toContain('<link rel="alternate" type="text/markdown" href="https://dshdesktop.com/workbench/docs/development.md">')
    const english = renderDocumentPage('# Workbench Development Standard', { markdownUrl: SITE_DOCUMENTS.developmentEn.url, language: 'en', alternatePageUrl: SITE_DOCUMENTS.development.pageUrl })
    expect(english).toContain('<html lang="en">')
    expect(english).toContain(`<a href="${SITE_DOCUMENTS.development.pageUrl}">中文</a>`)
    expect(english).toContain(`<link rel="alternate" hreflang="zh-CN" href="${SITE_DOCUMENTS.development.pageUrl}">`)
  })
})
