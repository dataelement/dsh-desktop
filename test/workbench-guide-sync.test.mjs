// The plugin serves the development guide from its own package directory, so the
// guide cannot read docs/ at runtime and is committed as a copy of two documents.
// Hand-maintaining that copy is how it drifted from its sources before: a change
// to the switch description had to be made twice and was missed once. These tests
// make that drift fail loudly instead.

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../packages/dsh-desktop-workbenches/index.js'
import { renderDocumentPage } from '../scripts/workbench-doc-page.mjs'
import { SITE_DOCUMENTS, ACCEPTANCE_SOURCE, ACCEPTANCE_TARGET, GUIDE_SOURCE, GUIDE_TARGET, renderAcceptanceFromSource, renderGuideFromSource } from '../scripts/build-workbench-guide.mjs'

const root = join(import.meta.dirname, '..')
const read = path => readFileSync(join(root, path), 'utf8')

describe('bundled workbench development guide', () => {
  it('equals the development spec shipped to authors and Agents', () => {
    expect(read(GUIDE_TARGET)).toBe(renderGuideFromSource(read))
  })

  it('covers development and the local self-test only', () => {
    const guide = read(GUIDE_TARGET)
    expect(guide).toBe(read(GUIDE_SOURCE))
    expect(guide).toContain('## 1. 直接交给 AI 的任务')
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

  it('declares a request body mode on every route, as the real host requires', async () => {
    // dsh-client-connection streams the body of a route without requestBody,
    // and a GET Request cannot carry a body: such routes answer 400 in the app.
    const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-routes-'))
    try {
      const routes = []
      const connection = { fetch: { register(route) { routes.push(route) } } }
      apply({ effect: fn => fn(), inject: (_deps, callback) => callback({ connection, desktopPnpm: {} }), reflect: { provide() {} }, connection }, { root })
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
      expect(routes.some(value => value.path === '/api/desktop-workbenches/submissions')).toBe(false)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('writes both documents and their reading pages for the website at the URLs Desktop uses', () => {
    expect(SITE_DOCUMENTS.development).toEqual({
      file: 'docs/development.md', url: 'https://dshdesktop.com/workbench/docs/development.md',
      page: 'docs/development/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/development/'
    })
    expect(SITE_DOCUMENTS.acceptance).toEqual({
      file: 'docs/market-acceptance.md', url: 'https://dshdesktop.com/workbench/docs/market-acceptance.md',
      page: 'docs/market-acceptance/index.html', pageUrl: 'https://dshdesktop.com/workbench/docs/market-acceptance/'
    })
    const client = read('packages/dsh-desktop-workbenches/client.js')
    for (const doc of Object.values(SITE_DOCUMENTS)) {
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
  })
})
