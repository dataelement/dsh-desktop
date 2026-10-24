import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const code = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')

// Mount the public Market component and its real controller. Layout dimensions
// are verified separately in Electron: jsdom only checks DOM/state/accessibility.
async function mountCard({ state = 'normal', language = 'zh', listed = true, origin = 'market', evidence = {}, favorite = false, request = async () => { throw new Error('Unexpected network request') } } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  dom.window.localStorage.setItem('dsh-workbench-enabled', 'true')
  let client
  dom.window.__ModuleLoader__ = { load({ factory }) {
    client = factory(name => name === 'react' ? React : name === 'react-dom' ? { createPortal } : name === '@deepseek-ai/cordis' ? { Service: { tracker: Symbol('tracker') } } : { Switch: () => null, Toast: () => null })
  } }
  vm.runInNewContext(code, { window: dom.window, document: dom.window.document, setTimeout, clearTimeout, AbortController })
  const locale = { active: language }
  const ctx = { fiber: { entry: { options: { name: 'helper' } } }, locale: { getSnapshot: () => locale, subscribe: () => () => {} } }
  const service = new client.Workbenches(ctx, request)
  service.remoteCatalog = listed ? [{ id: 'owner/helper', owner: 'owner', repository: 'helper', name: 'Helper', url: 'https://github.com/owner/helper', category: 'other', categoryName: 'Other', version: state === 'normal' ? '1.0.0' : '1.1.0', distribution: { type: 'npm', name: 'helper', version: '1.1.0' }, description: { zh: 'Description '.repeat(40), en: 'Description '.repeat(40) }, screenshots: [], metrics: { githubStars: { value: 7 }, npmDownloads30d: { value: 12 } } }] : []
  const installed = state !== 'install-failure'
  if (installed) {
    service.native = { status: 'ready', bundles: { helper: { name: 'helper', installed: true, enabled: true, version: '1.0.0', removable: true } } }
    service.installs = { 'owner/helper': { catalogId: 'owner/helper', pluginName: 'helper', version: '1.0.0' } }
    service.packageEvidence = { helper: { origin, contentVerified: origin === 'market', ...evidence } }
  }
  if (installed) {
    service.state.added = ['owner/helper']
    service.state.pinned = ['owner/helper']
    if (state !== 'load-failure' && state !== 'restart') service.register({ title: 'Helper', repository: 'https://github.com/owner/helper', version: '1.0.0', metrics: { githubStars: { value: 99 }, npmDownloads30d: { value: 88 } } }, () => null)
  }
  if (state === 'unremovable') {
    service.remoteCatalog = []
    service.installs = {}
    service.native.bundles.helper.removable = false
    service.native.bundles.helper.readOnlyReason = 'management-required'
  }
  service.ready = true
  if (state === 'catalog-refresh') { service.catalogLoaded = true; service.catalogRefreshing = true }
  if (state === 'first-catalog-load') { service.remoteCatalog = []; service.catalogRefreshing = true }
  if (state === 'catalog-stale') { service.catalogLoaded = true; service.catalogStale = true }
  if (favorite) service.state.favorites = ['owner/helper']
  if (state === 'loading') service.installing = 'owner/helper'
  if (state === 'restart') service.pendingRestart.add('owner/helper')
  if (state === 'install-failure' || state === 'update-failure') service.installFailures.set('owner/helper', { kind: state.split('-')[0], message: 'Could not download package: fetch failed '.repeat(20) })
  service.publish()
  const root = createRoot(dom.window.document.getElementById('root'))
  await React.act(async () => root.render(React.createElement(client.Market, { service })))
  return { document: dom.window.document, service, close: async () => {
    await React.act(async () => root.unmount())
    service.dispose()
    dom.window.close()
    globalThis.window = previous.window
    globalThis.document = previous.document
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
  } }
}

describe('compact workbench card states', () => {
  it.each([
    ['local', {}, 'zh', '本地修改不会带入新版本'],
    ['market', { updateRisk: 'modified', contentVerified: false }, 'zh', '检测到当前安装内容已被修改'],
    ['market', { updateRisk: 'modified' }, 'en', 'The installed content has been modified']
  ])('uses the compact confirmation only for reliable %s risk in %s', async (origin, evidence, language, copy) => {
    let requests = 0
    const ui = await mountCard({ state: 'update-available', origin, evidence, language, request: async () => { requests++; return Response.json({ error: 'simulated only' }, { status: 400 }) } })
    try {
      const update = ui.document.querySelector('.dshWbUpdate')
      update.focus()
      await React.act(async () => update.click())
      const dialog = ui.document.querySelector('[role="dialog"]')
      expect(dialog).not.toBeNull()
      expect(requests).toBe(0)
      expect(dialog.classList.contains('dshWbConfirm')).toBe(true)
      expect(dialog.querySelector('.dshWbConfirmIcon svg')).not.toBeNull()
      expect(dialog.querySelector('h2').textContent).toBe(language === 'en' ? 'Update “Helper”?' : '更新「Helper」？')
      expect(dialog.querySelector('h2').style.fontSize).toBe('18px')
      expect(dialog.querySelector('.dshWbMuted').textContent).toContain(copy)
      expect(ui.document.defaultView.getComputedStyle(dialog).maxWidth).toBe('430px')
      expect(ui.document.defaultView.getComputedStyle(dialog).padding).toBe('24px')
      expect(ui.document.defaultView.getComputedStyle(dialog.querySelector('.dshWbActions')).justifyContent).toBe('flex-end')
      const [cancel, confirm] = [...dialog.querySelectorAll('button')]
      expect(ui.document.activeElement).toBe(cancel)
      // Existing compact confirmation rules handle narrow windows; the shared
      // CSS stacks its buttons at 640px instead of overflowing the dialog.
      expect(code).toContain('.dshWbConfirm .dshWbActions{flex-direction:column;align-items:stretch}')
      confirm.focus()
      await React.act(async () => ui.document.dispatchEvent(new ui.document.defaultView.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })))
      expect(ui.document.activeElement).toBe(cancel)
      await React.act(async () => { ui.service.installing = 'owner/helper'; ui.service.publish() })
      expect(cancel.disabled).toBe(true)
      expect(confirm.disabled).toBe(true)
      await React.act(async () => ui.document.dispatchEvent(new ui.document.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
      expect(ui.document.querySelector('[role="dialog"]')).toBe(dialog)
      await React.act(async () => ui.document.querySelector('.dshWbModalBackdrop').click())
      expect(ui.document.querySelector('[role="dialog"]')).toBe(dialog)
      await React.act(async () => { ui.service.installing = null; ui.service.publish() })
      await React.act(async () => ui.document.dispatchEvent(new ui.document.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
      expect(ui.document.querySelector('[role="dialog"]')).toBeNull()
      expect(requests).toBe(0)
    } finally { await ui.close() }
  })

  it.each([
    ['market', { contentVerified: false }],
    ['market', { contentVerified: undefined }],
    ['unknown', { contentVerified: false }]
  ])('updates an ordinary %s installation without interrupting for unverified legacy evidence', async (origin, evidence) => {
    let requests = 0
    const ui = await mountCard({ state: 'update-available', origin, evidence, request: async () => { requests++; return Response.json({ error: 'simulated only' }, { status: 400 }) } })
    try {
      await React.act(async () => ui.document.querySelector('.dshWbUpdate').click())
      expect(ui.document.querySelector('[role="dialog"]')).toBeNull()
      expect(requests).toBe(1)
    } finally { await ui.close() }
  })

  it.each(['local', 'modified'])('opens the compact dialog when the API discovers fresh %s risk after the page loaded', async risk => {
    let requests = 0
    const ui = await mountCard({ state: 'update-available', evidence: { updateRisk: null }, request: async () => {
      requests++
      return Response.json({ error: 'Confirm update', code: 'confirmation_required', params: { updateRisk: risk } }, { status: 409 })
    } })
    try {
      await React.act(async () => ui.document.querySelector('.dshWbUpdate').click())
      const dialog = ui.document.querySelector('[role="dialog"]')
      expect(dialog.classList.contains('dshWbConfirm')).toBe(true)
      expect(dialog.querySelector('.dshWbMuted').textContent).toContain(risk === 'local' ? '本地修改不会带入新版本' : '检测到当前安装内容已被修改')
      expect(ui.service.error).toBe('')
      expect(ui.service.installFailures.size).toBe(0)
      expect(ui.document.querySelector('.dshWbFailureHint')).toBeNull()
      await React.act(async () => [...dialog.querySelectorAll('button')].find(button => button.textContent === '取消').click())
      expect(ui.document.querySelector('[role="dialog"]')).toBeNull()
      expect(requests).toBe(1)
    } finally { await ui.close() }
  })

  it.each([['zh', '正在更新目录…'], ['en', 'Updating catalog…']])('announces lightweight catalog progress in %s without blocking cached cards', async (language, label) => {
    const ui = await mountCard({ state: 'catalog-refresh', language })
    try {
      const progress = ui.document.querySelector('.dshWbCatalogProgress')
      expect(progress.getAttribute('role')).toBe('status')
      expect(progress.getAttribute('aria-live')).toBe('polite')
      expect(progress.textContent).toBe(label)
      expect(progress.querySelector('svg')).not.toBeNull()
      expect(ui.document.querySelectorAll('article')).toHaveLength(1)
      expect(ui.document.querySelector('.dshWbMediaOpen').disabled).toBe(false)
      expect(ui.document.querySelector('.dshWbFavorite').disabled).toBe(false)
      expect(ui.document.querySelector('.dshWbRefresh').getAttribute('aria-busy')).toBe('true')
    } finally { await ui.close() }
  })

  it('shows first catalog loading instead of a false empty discovery result', async () => {
    const ui = await mountCard({ state: 'first-catalog-load' })
    try {
      expect(ui.document.querySelector('.dshWbCatalogProgress').textContent).toBe('正在首次读取市场目录…')
      expect(ui.document.querySelector('.dshWbEmpty')).toBeNull()
    } finally { await ui.close() }
  })

  it('keeps cached cards and offers retry when the online refresh returns stale data', async () => {
    const ui = await mountCard({ state: 'catalog-stale' })
    try {
      expect(ui.document.querySelector('.dshWbNotice').textContent).toContain('在线市场暂时无法更新，正在显示上一次成功读取的目录。')
      expect([...ui.document.querySelectorAll('.dshWbNotice button')].find(button => button.textContent === '重试').disabled).toBe(false)
      expect(ui.document.querySelectorAll('article')).toHaveLength(1)
    } finally { await ui.close() }
  })

  it.each(['local', 'unknown'])('hides market affordances for an unlisted %s provider in card and detail', async origin => {
    const ui = await mountCard({ listed: false, origin })
    try {
      const mine = [...ui.document.querySelectorAll('[role="tab"]')].find(tab => tab.textContent.startsWith('已安装'))
      await React.act(async () => mine.click())
      const card = ui.document.querySelector('article.dshWbCard')
      expect(card.querySelector('.dshWbMetrics')).toBeNull()
      expect(card.querySelector('.dshWbTitleLink').tagName).toBe('SPAN')
      expect(card.querySelector('.dshWbRoundButton')).toBeNull()
      expect(card.querySelector('.dshWbFavorite')).toBeNull()
      expect(card.querySelector('.dshWbAuthor')).not.toBeNull()
      expect(card.querySelector('.dshWbCardVersion')).not.toBeNull()
      expect(card.querySelector('.dshWbRunSwitch')).not.toBeNull()
      expect(card.querySelector('.dshWbUninstall')).not.toBeNull()
      await React.act(async () => card.querySelector('.dshWbMediaOpen').click())
      const detail = ui.document.querySelector('[role="dialog"]')
      expect(detail).not.toBeNull()
      expect(detail.querySelector('.dshWbMetrics')).toBeNull()
      expect(detail.querySelector('.dshWbTitleLink').tagName).toBe('SPAN')
      expect(detail.querySelector('.dshWbAuthor')).not.toBeNull()
    } finally { await ui.close() }
  })

  it.each([['zh', '取消收藏Helper', '取消收藏'], ['en', 'Remove Helper from favorites', 'Remove favorite']])('lets a favorite unlisted provider be removed in %s without market signals', async (language, label, tooltip) => {
    const ui = await mountCard({ listed: false, favorite: true, language, request: path => {
      expect(path).toBe('/api/desktop-workbenches/state/write')
      return Response.json({ revision: 1 })
    } })
    try {
      const favoritesTab = ui.document.getElementById('dsh-workbench-favorites-tab')
      await React.act(async () => favoritesTab.click())
      const card = ui.document.querySelector('article.dshWbCard')
      expect(card).not.toBeNull()
      expect(card.querySelector('.dshWbMetrics')).toBeNull()
      expect(card.querySelector('.dshWbTitleLink').tagName).toBe('SPAN')
      expect(card.querySelector('.dshWbRoundButton')).toBeNull()
      const removeFavorite = card.querySelector('.dshWbFavorite')
      expect(removeFavorite.getAttribute('aria-label')).toBe(label)
      expect(removeFavorite.getAttribute('aria-pressed')).toBe('true')
      expect(ui.document.getElementById(removeFavorite.getAttribute('aria-describedby')).textContent).toBe(tooltip)
      await React.act(async () => { removeFavorite.click(); await ui.service.queue })
      expect(ui.service.state.favorites).toEqual([])
      expect(ui.document.querySelector('article.dshWbCard')).toBeNull()
      expect(favoritesTab.textContent).toBe(`${language === 'zh' ? '我的收藏' : 'Favorites'} (0)`)
    } finally { await ui.close() }
  })

  it('lets an unavailable old favorite be removed from Favorites', async () => {
    const ui = await mountCard({ request: path => {
      expect(path).toBe('/api/desktop-workbenches/state/write')
      return Response.json({ revision: 1 })
    } })
    try {
      ui.service.state.favorites = ['retired/workbench']
      ui.service.catalog.clear()
      ui.service.providers.clear()
      ui.service.knownProviders = {}
      ui.service.remoteCatalog = []
      ui.service.installs = {}
      ui.service.native.bundles = {}
      ui.service.publish()
      await React.act(async () => ui.document.getElementById('dsh-workbench-favorites-tab').click())
      const card = ui.document.querySelector('article.dshWbCard')
      expect(card).not.toBeNull()
      expect(card.querySelector('.dshWbMetrics')).toBeNull()
      expect(card.querySelector('.dshWbRoundButton')).toBeNull()
      const removeFavorite = card.querySelector('.dshWbFavorite')
      expect(removeFavorite.getAttribute('aria-pressed')).toBe('true')
      expect(ui.document.getElementById(removeFavorite.getAttribute('aria-describedby')).textContent).toBe('取消收藏')
      await React.act(async () => { removeFavorite.click(); await ui.service.queue })
      expect(ui.service.state.favorites).toEqual([])
      expect(ui.document.querySelector('article.dshWbCard')).toBeNull()
    } finally { await ui.close() }
  })

  it('keeps market metrics, links and favorite for a listed workbench installed locally', async () => {
    const ui = await mountCard({ listed: true, origin: 'local' })
    try {
      const card = ui.document.querySelector('article.dshWbCard')
      expect(card.querySelector('.dshWbMetrics')).not.toBeNull()
      expect(card.querySelector('.dshWbTitleLink').tagName).toBe('A')
      expect(card.querySelector('.dshWbRoundButton')).not.toBeNull()
      expect(card.querySelector('.dshWbFavorite')).not.toBeNull()
      await React.act(async () => card.querySelector('.dshWbMediaOpen').click())
      const detail = ui.document.querySelector('[role="dialog"]')
      expect(detail.querySelector('.dshWbMetrics')).not.toBeNull()
      expect(detail.querySelector('.dshWbTitleLink').tagName).toBe('A')
    } finally { await ui.close() }
  })

  it.each(['normal', 'update', 'loading', 'restart', 'install-failure', 'update-failure', 'load-failure'])('keeps %s actions inside one stable footer structure', async state => {
    const ui = await mountCard({ state })
    try {
      const card = ui.document.querySelector('article.dshWbCard')
      expect(card).not.toBeNull()
      expect([...card.children].map(node => node.className)).toEqual(['dshWbMedia', 'dshWbCardBody'])
      const footer = card.querySelector('.dshWbActions')
      expect(footer).toBe(card.querySelector('.dshWbCardBody').lastElementChild)
      expect([...footer.children].map(node => node.className)).toEqual(['dshWbCardVersionActions', 'dshWbCardControls'])
      expect(card.querySelector('.dshWbInstallFailed')).toBeNull()
      expect(card.textContent).not.toContain('替换为市场版')
      if (state === 'normal') expect(card.querySelector('.dshWbUpdate')).toBeNull()
      if (['normal', 'update', 'loading', 'restart'].includes(state)) expect(card.querySelector('.dshWbFailureHint')).toBeNull()
      if (state === 'update') expect(card.querySelector('.dshWbUpdate').textContent).toBe('更新')
      if (state === 'loading') expect(card.querySelector('.dshWbUpdate').textContent).toBe('更新中…')
      if (state === 'restart') expect(card.querySelector('.dshWbUpdate').textContent).toBe('重启后生效')
    } finally { await ui.close() }
  })

  it.each([['install-failure', '安装失败'], ['update-failure', '更新失败'], ['load-failure', '加载失败']])('exposes %s details through a focusable icon and associated tooltip', async (state, label) => {
    const ui = await mountCard({ state })
    try {
      const hint = ui.document.querySelector('.dshWbFailureHint')
      const icon = hint.querySelector('.dshWbFailureIcon')
      expect(hint.children).toHaveLength(2)
      expect(icon.tabIndex).toBe(0)
      expect(icon.getAttribute('aria-label')).toContain(label)
      const tooltip = ui.document.getElementById(icon.getAttribute('aria-describedby'))
      expect(tooltip.getAttribute('role')).toBe('tooltip')
      expect(tooltip.textContent).toContain(label)
      expect(tooltip.textContent).toContain(state === 'load-failure' ? '启动后未注册' : 'fetch failed')
      icon.focus()
      expect(ui.document.activeElement).toBe(icon)
      if (state === 'install-failure') {
        const dismiss = ui.document.querySelector('button[aria-label="清除失败提示"]')
        expect(dismiss.textContent).toBe('×')
        await React.act(async () => dismiss.click())
        expect(ui.document.querySelector('.dshWbFailureHint')).toBeNull()
      }
    } finally { await ui.close() }
  })

  it.each([
    ['install-failure', '.dshWbRetry', '正在重试安装Helper'],
    ['update-failure', '.dshWbUpdate', '正在更新Helper']
  ])('keeps the %s action spinning while its retry request is pending, then stops on failure', async (state, selector, busyLabel) => {
    let finishRequest
    let calls = 0
    const ui = await mountCard({ state, request: path => {
      expect(path).toBe('/api/desktop-workbenches/market-install')
      calls++
      return new Promise(resolve => { finishRequest = resolve })
    } })
    try {
      const action = () => ui.document.querySelector(`article.dshWbCard ${selector}`)
      expect(action()).not.toBeNull()
      expect(action().getAttribute('aria-busy')).toBe('false')
      await React.act(async () => { action().click() })
      expect(calls).toBe(1)
      expect(action()).not.toBeNull()
      expect(action().disabled).toBe(true)
      expect(action().getAttribute('aria-busy')).toBe('true')
      expect(action().getAttribute('aria-label')).toBe(busyLabel)
      expect(ui.document.querySelector('style').textContent).toContain(`${selector}[aria-busy=true] svg`)
      expect(ui.document.querySelector('style').textContent).toContain('svg{animation:dshWbSpin .8s linear infinite}')
      expect(ui.document.querySelector('style').textContent).toContain('@media(prefers-reduced-motion:reduce)')
      finishRequest(Response.json({ error: 'Still unavailable' }, { status: 502 }))
      await React.act(async () => {})
      expect(action()).not.toBeNull()
      expect(action().disabled).toBe(false)
      expect(action().getAttribute('aria-busy')).toBe('false')
      expect(ui.document.querySelector('.dshWbFailureHint').textContent).toContain('Still unavailable')
    } finally { await ui.close() }
  })

  it.each(['zh', 'en'])('makes a disabled uninstall reason keyboard reachable in %s', async language => {
    const ui = await mountCard({ state: 'unremovable', language })
    try {
      const installedTab = [...ui.document.querySelectorAll('[role="tab"]')].find(tab => tab.textContent.startsWith(language === 'en' ? 'Installed' : '已安装'))
      await React.act(async () => installedTab.click())
      const card = ui.document.querySelector('article.dshWbCard')
      const uninstall = card.querySelector('.dshWbUninstall')
      expect(uninstall.disabled).toBe(true)
      const icon = card.querySelector('.dshWbRemovalHint [tabindex="0"]')
      expect(icon).not.toBeNull()
      icon.focus()
      expect(ui.document.activeElement).toBe(icon)
      const tooltip = ui.document.getElementById(icon.getAttribute('aria-describedby'))
      expect(tooltip.getAttribute('role')).toBe('tooltip')
      expect(tooltip.textContent).toContain(language === 'en' ? 'managed by the host' : '由宿主管理')
      expect(icon.getAttribute('aria-label')).toBe(tooltip.textContent)
      expect(uninstall.getAttribute('aria-describedby')).toBe(tooltip.id)
      await React.act(async () => uninstall.click())
      expect(ui.document.querySelector('[role="dialog"]')).toBeNull()
    } finally { await ui.close() }
  })

  it('retains complete English labels when compact controls hide their text', async () => {
    const ui = await mountCard({ state: 'update-failure', language: 'en' })
    try {
      expect(ui.document.querySelector('.dshWbUpdate').getAttribute('aria-label')).toBe('Update Helper to v1.1.0')
      expect(ui.document.querySelector('.dshWbFailureIcon').getAttribute('aria-label')).toContain('Update failed details: Could not download')
    } finally { await ui.close() }
  })
})
