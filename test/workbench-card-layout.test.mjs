import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const code = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')

// Mount the public Market component and its real controller. Layout dimensions
// are verified separately in Electron: jsdom only checks DOM/state/accessibility.
async function mountCard({ state = 'normal', language = 'zh' } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  dom.window.localStorage.setItem('dsh-workbench-enabled', 'true')
  let client
  dom.window.__ModuleLoader__ = { load({ factory }) {
    client = factory(name => name === 'react' ? React : name === '@deepseek-ai/cordis' ? { Service: { tracker: Symbol('tracker') } } : { Switch: () => null, Toast: () => null })
  } }
  vm.runInNewContext(code, { window: dom.window, document: dom.window.document, setTimeout, clearTimeout, AbortController })
  const locale = { active: language }
  const ctx = { fiber: { entry: { options: { name: 'helper' } } }, locale: { getSnapshot: () => locale, subscribe: () => () => {} } }
  const service = new client.Workbenches(ctx, async () => { throw new Error('Unexpected network request') })
  service.remoteCatalog = [{ id: 'owner/helper', owner: 'owner', repository: 'helper', name: 'Helper', url: 'https://github.com/owner/helper', category: 'other', categoryName: 'Other', version: state === 'normal' ? '1.0.0' : '1.1.0', distribution: { type: 'npm', name: 'helper', version: '1.1.0' }, description: { zh: 'Description '.repeat(40), en: 'Description '.repeat(40) }, screenshots: [] }]
  const installed = state !== 'install-failure'
  if (installed) {
    service.native = { status: 'ready', bundles: { helper: { name: 'helper', installed: true, enabled: true, version: '1.0.0', removable: true } } }
    service.installs = { 'owner/helper': { catalogId: 'owner/helper', pluginName: 'helper', version: '1.0.0' } }
  }
  if (installed) {
    service.state.added = ['owner/helper']
    service.state.pinned = ['owner/helper']
    if (state !== 'load-failure' && state !== 'restart') service.register({ title: 'Helper', repository: 'https://github.com/owner/helper', version: '1.0.0' }, () => null)
  }
  if (state === 'unremovable') {
    service.remoteCatalog = []
    service.installs = {}
    service.native.bundles.helper.removable = false
    service.native.bundles.helper.readOnlyReason = 'management-required'
  }
  service.ready = true
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
