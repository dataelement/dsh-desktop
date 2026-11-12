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
  if (state === 'restart') service.recordApplication('project-helper', { application: 'restart-required' }, 'owner/helper', 'install')
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


describe('community prototype provenance', () => {
  it.each(['xyb-openharness-dsh-plugins', 'another-owner'])('labels only official fallback artwork for %s', async owner => {
    const ui = await mountCard()
    try {
      const id = `${owner}/gastric-workbench`
      await React.act(async () => {
        ui.service.remoteCatalog.push({ id, owner, repository: 'gastric-workbench', name: 'Prototype fixture', url: `https://github.com/${id}`, category: 'other', categoryName: 'Other', version: '1.0.0', distribution: { type: 'npm', name: 'prototype-fixture', version: '1.0.0' }, description: { zh: 'Fixture', en: 'Fixture' }, screenshots: [] })
        ui.service.publish()
      })
      const card = [...ui.document.querySelectorAll('.dshWbCard')].find(card => card.textContent.includes('Prototype fixture'))
      expect(card).toBeTruthy()
      if (owner === 'xyb-openharness-dsh-plugins') {
        expect(card.textContent).toContain('原型 · 模拟资料')
        expect(card.querySelector('img').alt).toContain('模拟资料')
        await React.act(async () => card.querySelector('.dshWbMediaOpen').click())
        expect(ui.document.querySelector('[role="dialog"]').textContent).toContain('图片来自社区公开原型，内容为模拟资料。')
      } else {
        expect(card.querySelector('.dshWbPrototypeLabel')).toBeNull()
        expect(card.querySelector('.dshWbCardScreenshot')).toBeNull()
      }
    } finally { await ui.close() }
  })
})

describe('charity entry flow', () => {
  const buttonByText = (root, text) => [...root.querySelectorAll('button')].find(node => node.textContent.trim() === text)
  const click = async node => {
    expect(node).not.toBeNull()
    expect(node).not.toBeUndefined()
    await React.act(async () => node.click())
  }
  const enter = async ui => click(ui.document.querySelector('[aria-label="进入小胰宝公益专区"]'))
  const searchFor = async (input, value) => {
    const view = input.ownerDocument.defaultView
    await React.act(async () => {
      // React DOM is imported before this per-test jsdom window. Its input
      // polyfill observes focused key events instead of the native input event.
      input.attachEvent ||= () => {}
      input.detachEvent ||= () => {}
      input.focus()
      Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value').set.call(input, value)
      input.dispatchEvent(new view.KeyboardEvent('keyup', { key: 'a', bubbles: true }))
    })
  }

  it.each(['zh', 'en'])('exposes the full charity coverage and opens onboarding from the more-conditions chip in %s', async language => {
    const ui = await mountCard({ language })
    try {
      const entry = ui.document.querySelector('.dshWbCharityEntry')
      expect(entry.querySelector('.dshWbCharityEntryMedia img').getAttribute('src')).toBe('/api/desktop-workbenches/assets/charity-banner.png')
      const tags = entry.querySelector('.dshWbCharityTags')
      expect(tags.closest('[aria-hidden="true"]')).toBeNull()
      expect(tags.children).toHaveLength(4)
      const conditionTags = [...tags.children].slice(0, 3)
      for (const tag of conditionTags) {
        expect(tag.textContent.trim().length).toBeGreaterThan(0)
        expect(tag.closest('[aria-hidden="true"]')).toBeNull()
      }
      if (language === 'zh') {
        expect(conditionTags.map(tag => tag.textContent)).toEqual(['胰腺癌', '肺癌', '乳腺癌'])
        expect(entry.querySelector('.dshWbCharityCoverage').textContent).toContain('覆盖更多癌种与罕见病')
      }
      const more = tags.querySelector(language === 'zh' ? '[aria-label="浏览更多病种工作台"]' : '[aria-label="Browse more condition workbenches"]')
      expect(more.tagName).toBe('BUTTON')
      expect(more).toBe(tags.lastElementChild)
      expect(more.disabled).toBe(false)
      // A collection entry must not replace or alter the neighboring workbench.
      const ordinaryCard = ui.document.querySelector('article.dshWbCard')
      expect(ordinaryCard.querySelector('.dshWbTitleText').textContent).toBe('Helper')
      expect(ordinaryCard.querySelector('.dshWbCharityTags')).toBeNull()
      await click(more)
      expect(ui.document.querySelector('.dshWbCharity').textContent).toContain(language === 'zh' ? '欢迎来到小胰宝' : 'Welcome to Xiaoyibao')
      expect(ui.document.querySelector('.dshWbCharityEntry')).toBeNull()
    } finally { await ui.close() }
  })

  it('replaces market navigation with the first-visit guide, and remembers skipping it on re-entry', async () => {
    const ui = await mountCard()
    try {
      await enter(ui)
      const welcome = ui.document.querySelector('.dshWbCharity')
      expect(welcome.textContent).toContain('欢迎来到小胰宝')
      expect(welcome.textContent).toContain('找到病种工作台')
      expect(welcome.textContent).toContain('安装到 DSH')
      expect(welcome.textContent).toContain('开始整理资料')
      expect(ui.document.querySelector('.dshWbToolbar')).toBeNull()
      await click(buttonByText(welcome, '跳过介绍，直接浏览'))
      expect(ui.document.querySelector('.dshWbCharity').textContent).toContain('找到您的病种工作台')
      expect(ui.document.querySelector('.dshWbCharity').textContent).not.toContain('Helper')
      await click(ui.document.querySelector('[aria-label="返回工作台市场"]'))
      expect(ui.document.querySelector('.dshWbToolbar')).not.toBeNull()
      expect(ui.document.querySelector('.dshWbCharityEntry')).not.toBeNull()
      await enter(ui)
      expect(ui.document.querySelector('.dshWbCharity').textContent).not.toContain('欢迎来到小胰宝')
      expect(ui.document.querySelector('.dshWbCharity').textContent).toContain('找到您的病种工作台')
    } finally { await ui.close() }
  })

  it('filters community progress projects by disease and never offers to install unpublished projects', async () => {
    const ui = await mountCard()
    try {
      await enter(ui)
      await click(buttonByText(ui.document.querySelector('.dshWbCharity'), '查找我的病种工作台'))
      const projects = () => ui.document.querySelector('.dshWbCharityProjects')
      expect(projects().textContent).toContain('项目介绍')
      expect(projects().textContent).toContain('肺癌')
      expect(projects().textContent).toContain('乳腺癌')
      const progressLinks = [...projects().querySelectorAll('a')].filter(link => link.textContent.includes('查看进展'))
      expect(progressLinks.length).toBeGreaterThan(0)
      for (const link of progressLinks) {
        expect(link.href).toMatch(/^https:\/\/github\.com\/xyb-openharness-dsh-plugins\//)
        expect(link.rel).toContain('noopener')
      }
      expect([...projects().querySelectorAll('button')].some(button => /^(安装|正在安装)/.test(button.textContent.trim()))).toBe(false)
      const input = ui.document.querySelector('[aria-label="搜索病种工作台"]')
      await searchFor(input, '肺癌')
      expect(projects().textContent).toContain('肺癌')
      expect(projects().textContent).not.toContain('乳腺癌')
      await searchFor(input, 'no-matching-condition')
      expect(projects().querySelector('a')).toBeNull()
      await searchFor(input, '')
      expect(projects().textContent).toContain('乳腺癌')
    } finally { await ui.close() }
  })

  it('uses the market card frame and real prototype previews without fabricated versions or installation actions', async () => {
    const ui = await mountCard()
    try {
      const marketCard = ui.document.querySelector('article.dshWbCard')
      const frameClasses = [...marketCard.children].map(node => node.className)
      await enter(ui)
      await click(buttonByText(ui.document.querySelector('.dshWbCharity'), '跳过介绍，直接浏览'))
      const grid = ui.document.querySelector('.dshWbGrid.dshWbCharityProjects')
      expect(grid).not.toBeNull()
      const cards = [...grid.querySelectorAll('article.dshWbCard.dshWbCharityProject')]
      expect(cards).toHaveLength(14)
      for (const card of cards) {
        expect([...card.children].map(node => node.className)).toEqual(frameClasses)
        const body = card.querySelector('.dshWbCardBody')
        expect(body.querySelector('.dshWbCardTitle h2')).not.toBeNull()
        const title = body.querySelector('.dshWbTitleText')
        expect(card.querySelector('[title="' + title.textContent + '"]')).not.toBeNull()
        expect(body.querySelector('.dshWbAuthorRow .dshWbCardVersion.dshWbCharityStatus').textContent).toBe('项目介绍')
        expect(body.querySelector('.dshWbCardDescription')).not.toBeNull()
        expect(body.querySelector('.dshWbActions')).toBe(body.lastElementChild)
        const image = card.querySelector('.dshWbCardScreenshot')
        expect(image.getAttribute('src')).toMatch(/^\/api\/desktop-workbenches\/assets\/charity-projects\/[a-z]+\.webp$/)
        expect(image.alt).toContain('原型')
        expect(card.querySelector('.dshWbMetrics')).toBeNull()
        expect([...card.querySelectorAll('button')].some(button => /安装/.test(button.textContent))).toBe(false)
        const about = [...card.querySelectorAll('a')].find(link => link.textContent.includes('查看介绍'))
        expect(about.href).toBe('https://github.com/xyb-openharness-dsh-plugins/.github/blob/main/PROJECTS.md')
      }
      const card = cards.find(card => card.querySelector('.dshWbTitleText').textContent === '胰腺癌工作台')
      const thumbnail = card.querySelector('.dshWbCardScreenshot').getAttribute('src')
      const preview = card.querySelector('.dshWbMediaOpen')
      preview.focus()
      await click(preview)
      const dialog = ui.document.querySelector('.dshWbModal[role="dialog"]')
      expect(dialog).not.toBeNull()
      expect(dialog.getAttribute('aria-label')).toContain('胰腺癌工作台')
      expect(dialog.querySelector('.dshWbCarouselSlide img').getAttribute('src')).toBe(thumbnail)
      await click(dialog.querySelector('.dshWbCarouselSlide'))
      const lightbox = ui.document.querySelector('.dshWbDetailLightbox[role="dialog"]')
      expect(lightbox.querySelector('img').getAttribute('src')).toBe(thumbnail)
      await click(lightbox.querySelector('[aria-label="关闭截图预览"]'))
      expect(ui.document.querySelector('.dshWbDetailLightbox')).toBeNull()
      expect(ui.document.querySelector('.dshWbModal')).toBe(dialog)
      await click(buttonByText(dialog, '关闭'))
      expect(ui.document.querySelector('[role="dialog"]')).toBeNull()
      expect(ui.document.activeElement).toBe(preview)
      await click(preview)
      await React.act(async () => ui.document.dispatchEvent(new ui.document.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
      expect(ui.document.querySelector('[role="dialog"]')).toBeNull()
    } finally { await ui.close() }
  })

  it('keeps real listed workbench installation pending and recoverable in the shared charity card', async () => {
    let finishRequest
    const calls = []
    const id = 'xyb-openharness-dsh-plugins/psych-install-fixture'
    const ui = await mountCard({ request: (path, options) => {
      calls.push({ path, options })
      return new Promise(resolve => { finishRequest = resolve })
    } })
    try {
      await React.act(async () => {
        ui.service.remoteCatalog.push({ id, owner: 'xyb-openharness-dsh-plugins', repository: 'psych-install-fixture', name: '心理支持安装测试工作台', url: `https://github.com/${id}`, category: 'other', categoryName: 'Other', version: '1.0.0', distribution: { type: 'npm', name: 'psych-install-fixture', version: '1.0.0' }, description: { zh: '心理支持与情绪记录', en: 'Psychological support and mood records' }, screenshots: [] })
        ui.service.publish()
      })
      await enter(ui)
      await click(buttonByText(ui.document.querySelector('.dshWbCharity'), '跳过介绍，直接浏览'))
      const card = () => [...ui.document.querySelectorAll('.dshWbCharityProject')].find(card => card.querySelector('.dshWbTitleText').textContent === '心理支持安装测试工作台')
      expect(card().classList.contains('dshWbCard')).toBe(true)
      expect(card().querySelector('.dshWbActions')).toBe(card().querySelector('.dshWbCardBody').lastElementChild)
      const install = buttonByText(card(), '安装')
      expect(install.disabled).toBe(false)
      await click(install)
      expect(calls).toHaveLength(1)
      expect(calls[0].path).toBe('/api/desktop-workbenches/market-install')
      expect(JSON.parse(calls[0].options.body)).toEqual({ id })
      expect(ui.service.installing).toBe(id)
      expect(buttonByText(card(), '正在安装…').disabled).toBe(true)
      finishRequest(Response.json({ error: 'Package currently unavailable' }, { status: 502 }))
      await React.act(async () => {})
      expect(ui.service.installing).toBeNull()
      expect(ui.service.state.added).not.toContain(id)
      expect(ui.document.querySelector('.dshWbCharity').textContent).toContain('Package currently unavailable')
      expect(buttonByText(card(), '安装').disabled).toBe(false)
    } finally { await ui.close() }
  })

  it('shows all fourteen introductions once, applies community classifications and combines category with search', async () => {
    const ui = await mountCard()
    try {
      await enter(ui)
      await click(buttonByText(ui.document.querySelector('.dshWbCharity'), '跳过介绍，直接浏览'))
      const group = ui.document.querySelector('.dshWbCharityCategories')
      expect(group.getAttribute('aria-label')).toBe('按社区项目分类筛选')
      expect([...group.querySelectorAll('button')].map(button => button.textContent)).toEqual(['全部', '癌种工作台', '罕见病工作台', '跨病种支撑'])
      const category = value => group.querySelector(`[data-category="${value}"]`)
      const cards = () => [...ui.document.querySelectorAll('.dshWbCharityProjects article')]
      const titles = () => cards().map(card => card.querySelector('.dshWbTitleText').textContent)
      expect(cards()).toHaveLength(14)
      expect(new Set(titles()).size).toBe(14)
      expect([...ui.document.querySelectorAll('.dshWbCharityStatus')].every(status => status.textContent === '项目介绍')).toBe(true)
      await click(category('cancer'))
      expect(category('cancer').getAttribute('aria-pressed')).toBe('true')
      expect(cards()).toHaveLength(11)
      expect(titles().filter(title => title.includes('胃肠间质瘤'))).toHaveLength(1)
      expect(titles().some(title => title.includes('肌营养'))).toBe(false)
      const input = ui.document.querySelector('[aria-label="搜索病种工作台"]')
      await searchFor(input, 'GIST')
      expect(cards()).toHaveLength(1)
      expect(titles()[0]).toContain('胃肠间质瘤')
      await click(category('rare'))
      expect(cards()).toHaveLength(1)
      expect(input.value).toBe('GIST')
      expect(titles()[0]).toContain('胃肠间质瘤')
      await searchFor(input, '')
      expect(cards()).toHaveLength(3)
      expect(titles().some(title => title.includes('ATTR') || title.includes('淀粉'))).toBe(true)
      await searchFor(input, '乳腺癌')
      expect(cards()).toHaveLength(0)
      await click(category('cancer'))
      expect(cards()).toHaveLength(1)
      expect(titles()[0]).toContain('乳腺癌')
      await click(ui.document.querySelector('.dshWbCharityCollection [data-collection="mine"]'))
      expect(input.value).toBe('')
      expect(category('all').getAttribute('aria-pressed')).toBe('true')
      await click(ui.document.querySelector('.dshWbCharityCollection [data-collection="find"]'))
      expect(input.value).toBe('')
      expect(cards()).toHaveLength(14)
    } finally { await ui.close() }
  })

  it.each([
    ['al-amyloidosis-fixture', 'AL amyloidosis workbench', '转甲状腺素蛋白淀粉样变性工作台', '转甲状腺素'],
    ['esophagogastric-junction-fixture', 'Esophagogastric junction workbench', '胃癌工作台', '胃癌']
  ])('keeps the distinct gallery project visible when an official %s catalog entry is present', async (repository, title, galleryTitle, query) => {
    const ui = await mountCard()
    const owner = 'xyb-openharness-dsh-plugins'
    const id = `${owner}/${repository}`
    try {
      await React.act(async () => {
        ui.service.remoteCatalog.push({ id, owner, repository, name: title, url: `https://github.com/${id}`, category: 'other', categoryName: 'Other', version: '1.0.0', distribution: { type: 'npm', name: repository, version: '1.0.0' }, description: { zh: title, en: title }, screenshots: [] })
        ui.service.publish()
      })
      await enter(ui)
      await click(buttonByText(ui.document.querySelector('.dshWbCharity'), '跳过介绍，直接浏览'))
      expect(ui.document.querySelector('.dshWbCharityCategories [data-category="all"]').getAttribute('aria-pressed')).toBe('true')
      const titles = () => [...ui.document.querySelectorAll('.dshWbCharityProjects article .dshWbTitleText')].map(heading => heading.textContent)
      // Official identity keeps a new community workbench visible in All,
      // but a related disease name must not replace a distinct gallery project.
      expect(titles()).toContain(title)
      expect(titles().filter(value => value === galleryTitle)).toHaveLength(1)
      await searchFor(ui.document.querySelector('[aria-label="搜索病种工作台"]'), query)
      expect(titles()).toContain(galleryTitle)
      expect(titles()).not.toContain(title)
    } finally { await ui.close() }
  })

  it('recognizes published official support workbenches, and filters installed and local providers by provenance', async () => {
    const ui = await mountCard()
    const officialId = 'xyb-openharness-dsh-plugins/psych-fixture'
    const sourcePackage = 'charity-support-fixture'
    const catalogEntry = (id, owner) => ({ id, owner, repository: 'psych-fixture', name: '官方心理支持工作台', url: `https://github.com/${id}`, category: 'other', categoryName: 'Other', version: '1.0.0', distribution: { type: 'npm', name: owner === 'xyb-openharness-dsh-plugins' ? sourcePackage : 'unrelated-support-fixture', version: '1.0.0' }, description: { zh: '心理支持与情绪记录', en: 'Psychological support and mood records' }, screenshots: [] })
    try {
      await React.act(async () => {
        ui.service.remoteCatalog.push(catalogEntry(officialId, 'xyb-openharness-dsh-plugins'), catalogEntry('unrelated-owner/psych-fixture', 'unrelated-owner'))
        ui.service.publish()
      })
      await enter(ui)
      await click(buttonByText(ui.document.querySelector('.dshWbCharity'), '跳过介绍，直接浏览'))
      const support = () => ui.document.querySelector('.dshWbCharityCategories [data-category="support"]')
      const projects = () => ui.document.querySelector('.dshWbCharityProjects')
      await click(support())
      expect(projects().querySelectorAll('article')).toHaveLength(1)
      expect(projects().textContent).toContain('官方心理支持工作台')
      expect(projects().querySelector(`a[href="https://github.com/${officialId}"]`)).not.toBeNull()
      expect(projects().querySelector('a[href*="unrelated-owner"]')).toBeNull()
      expect(buttonByText(projects(), '安装').disabled).toBe(false)
      await React.act(async () => {
        // Registration and inventory are real service inputs; keep readiness off
        // while introducing fixture providers so registration does not fetch state.
        ui.service.ready = false
        ui.service.ctx.fiber.entry.options.name = sourcePackage
        ui.service.native.bundles[sourcePackage] = { name: sourcePackage, installed: true, enabled: true, version: '1.0.0', removable: true }
        ui.service.installs[officialId] = { catalogId: officialId, pluginName: sourcePackage, version: '1.0.0' }
        ui.service.register({ title: '官方心理支持工作台', repository: `https://github.com/${officialId}`, version: '1.0.0' }, () => null)
        ui.service.state.added.push(officialId)
        ui.service.ctx.fiber.entry.options.name = 'local-unrelated-cancer-fixture'
        ui.service.native.bundles['local-unrelated-cancer-fixture'] = { name: 'local-unrelated-cancer-fixture', installed: true, enabled: true, version: '1.0.0' }
        ui.service.register({ title: '本地心理支持与肺癌工作台', version: '1.0.0' }, () => null)
        ui.service.state.added.push('local:local-unrelated-cancer-fixture')
        ui.service.ctx.fiber.entry.options.name = 'helper'
        ui.service.ready = true
        ui.service.publish()
      })
      await click(ui.document.querySelector('.dshWbCharityCollection [data-collection="mine"]'))
      expect(projects().querySelectorAll('article')).toHaveLength(1)
      expect(projects().textContent).toContain('官方心理支持工作台')
      expect(projects().textContent).not.toContain('本地心理支持与肺癌工作台')
      expect(projects().textContent).not.toContain('Helper')
      await click(support())
      expect(projects().querySelectorAll('article')).toHaveLength(1)
      await click(ui.document.querySelector('.dshWbCharityCategories [data-category="cancer"]'))
      expect(projects().querySelectorAll('article')).toHaveLength(0)
    } finally { await ui.close() }
  })

  it('keeps the charity installed collection scoped and supports keyboard tab switching', async () => {
    const ui = await mountCard()
    try {
      await enter(ui)
      await click(buttonByText(ui.document.querySelector('.dshWbCharity'), '跳过介绍，直接浏览'))
      const installedTab = ui.document.querySelector('.dshWbCharityCollection [data-collection="mine"]')
      const findTab = ui.document.querySelector('.dshWbCharityCollection [data-collection="find"]')
      await click(installedTab)
      expect(installedTab.getAttribute('aria-selected')).toBe('true')
      const projects = ui.document.querySelector('.dshWbCharityProjects')
      expect(projects.getAttribute('aria-labelledby')).toBe(installedTab.id)
      expect(projects.textContent).not.toContain('Helper')
      expect(projects.querySelector('article')).toBeNull()
      await React.act(async () => installedTab.dispatchEvent(new ui.document.defaultView.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })))
      expect(findTab.getAttribute('aria-selected')).toBe('true')
      expect(ui.document.activeElement).toBe(findTab)
      expect(projects.textContent).toContain('乳腺癌')
    } finally { await ui.close() }
  })

  it('opens the usage guide and can return to the market without creating or installing anything', async () => {
    let requests = 0
    const ui = await mountCard({ request: async () => { requests++; throw new Error('Unexpected network request') } })
    try {
      await enter(ui)
      await click(buttonByText(ui.document.querySelector('.dshWbCharity'), '跳过介绍，直接浏览'))
      await click(buttonByText(ui.document.querySelector('.dshWbCharity'), '使用指南'))
      const guide = ui.document.querySelector('.dshWbCharityGuide')
      expect(guide.textContent).toContain('社区官方使用指南')
      expect(guide.querySelector('.dshWbCharityGuideSource')).toBeNull()
      expect(guide.querySelector('.dshWbCharityGuideScope')).toBeNull()
      expect([...guide.querySelectorAll('.dshWbCharityUsageSteps h3')].map(heading => heading.textContent)).toEqual(['新建档案与资料目录', '导入并解析资料', '逐项核对结果'])
      const usage = [...guide.querySelectorAll('a')].find(link => link.textContent.includes('阅读官方使用指南'))
      expect(usage.href).toBe('https://github.com/xyb-openharness-dsh-plugins/.github/blob/main/USAGE.md')
      expect(usage.rel).toContain('noopener')
      expect([...guide.querySelectorAll('a')].some(link => link.href === 'https://github.com/xyb-openharness-dsh-plugins/.github/blob/main/INSTALL.md')).toBe(true)
      expect(guide.textContent).not.toContain('可以稍后添加')
      await click(ui.document.querySelector('[aria-label="返回工作台市场"]'))
      expect(ui.document.querySelector('.dshWbCharity')).toBeNull()
      expect(ui.document.querySelector('.dshWbCharityEntry')).not.toBeNull()
      expect(requests).toBe(0)
    } finally { await ui.close() }
  })

  it('shows English entry and onboarding copy in the English host locale', async () => {
    const ui = await mountCard({ language: 'en' })
    try {
      await click(ui.document.querySelector('.dshWbCharityEntry button'))
      const welcome = ui.document.querySelector('.dshWbCharity')
      expect(welcome.textContent).toContain('Welcome to Xiaoyibao')
      expect(welcome.textContent).not.toContain('欢迎来到小胰宝')
      const skip = [...welcome.querySelectorAll('button')].find(button => /skip/i.test(button.textContent))
      await click(skip)
      expect(ui.document.querySelector('.dshWbCharitySearch')).not.toBeNull()
      expect(ui.document.querySelector('.dshWbCharity').textContent).not.toContain('找到您的病种工作台')
    } finally { await ui.close() }
  })
})
