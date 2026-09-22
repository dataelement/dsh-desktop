import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { afterEach, expect, it, vi } from 'vitest'

const source = await readFile(new URL('../packages/dsh-desktop-enterprise/client.js', import.meta.url), 'utf8')
let cleanup
afterEach(async () => { await cleanup?.(); vi.unstubAllGlobals() })

async function mountMarket({ action, update = false, holdRefresh = false } = {}) {
  const dom = new JSDOM('<html lang="zh-CN"><div id="root"></div></html>', { url: 'http://localhost/' })
  vi.stubGlobal('window', dom.window)
  vi.stubGlobal('document', dom.window.document)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const account = { connected: true, base: 'https://company.example', tenant: { id: '1', name: 'Old company' }, user: { id: '20' }, sessionExpiresAt: new Date(Date.now() + 60000).toISOString() }
  const plugin = { id: 'a'.repeat(32), display_name: 'JSON 格式化', description: '校验并格式化 JSON。', current_version_id: 'b'.repeat(32), versions: [{ id: 'b'.repeat(32), compatible: true, version: '1.0.0', manifest: { plugin: { publisher: '企业管理员', license: 'MIT', desktop_min: '0.1.1', permissions: [], changelog: '初始版本' }, targets: { 'darwin-arm64': {} } } }] }
  const other = { ...structuredClone(plugin), id: 'c'.repeat(32), display_name: 'URL 编码' }
  let company = 'Current company', installed = Boolean(action && action !== 'install') || update, enabled = action !== 'enable', definition
  const pendingActions = new Map()
  const installedById = new Map()
  const pendingCatalogs = []
  let catalogReads = 0
  if (installed) installedById.set(plugin.id, { plugin_id: plugin.id, version_id: update ? 'd'.repeat(32) : plugin.current_version_id, version: update ? '0.9.0' : '1.0.0', enabled })
  const snapshot = () => ({ ...account, tenant: { id: '1', name: company }, target: 'darwin-arm64', desktopVersion: '0.1.1', installReady: true, data: [plugin, other], total: 2, installed: structuredClone([...installedById.values()]) })
  const requests = []
  const fetch = async (path, options) => {
    requests.push({ path, body: options?.body && JSON.parse(options.body) })
    if (path === '/api/enterprise.state') return { ok: true, json: async () => structuredClone(account) }
    if (path === '/api/enterprise.market.action') {
      const input = JSON.parse(options.body)
      const error = action && await new Promise(resolve => pendingActions.set(input.plugin_id, resolve))
      if (error) return { ok: false, json: async () => ({ error }) }
      if (input.action === 'uninstall') installedById.delete(input.plugin_id)
      else installedById.set(input.plugin_id, { plugin_id: input.plugin_id, version_id: plugin.current_version_id, version: '1.0.0', enabled: input.action !== 'disable' })
      const result = snapshot()
      return { ok: true, json: async () => result }
    }
    const result = snapshot()
    if (holdRefresh && ++catalogReads > 1) await new Promise(resolve => pendingCatalogs.push(resolve))
    return { ok: true, json: async () => result }
  }
  dom.window.__ModuleLoader__ = { load: value => { definition = value } }
  vm.runInNewContext(source, { window: dom.window, document: dom.window.document, navigator: { language: 'zh-CN' }, Date, AbortController, fetch, CustomEvent: dom.window.CustomEvent })
  const extension = definition.factory(name => { if (name === 'react') return React; throw new Error(name) })
  const disposers = [], root = createRoot(dom.window.document.getElementById('root'))
  cleanup = async () => { await act(async () => { disposers.reverse().forEach(dispose => dispose()); root.unmount() }); dom.window.close() }
  await act(async () => {
    const dictionaries = new Map()
    extension.apply({ locale: { register: (ns, values) => { dictionaries.set(ns, values) }, bind: ns => key => dictionaries.get(ns).zh[key] }, effect: callback => { const dispose = callback(); if (dispose) disposers.push(dispose) }, slots: {
      inject: (_slot, callback) => callback(),
      register: (config, component) => { if (config.id === 'enterprise-market') root.render(component()); return () => {} }
    } })
  })
  const text = () => dom.window.document.getElementById('root').textContent
  const card = name => [...document.querySelectorAll('article')].find(item => item.querySelector('h3')?.textContent === name)
  const click = async (name, pluginName) => {
    const button = [...(pluginName ? card(pluginName) : document).querySelectorAll('button')].find(item => item.textContent === name)
    expect(button).toBeTruthy()
    await act(async () => button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })))
  }
  return {
    text, click, requests, plugin, rename: name => { company = name },
    card,
    finish: async (error, name = 'JSON 格式化') => { await act(async () => pendingActions.get(name === other.display_name ? other.id : plugin.id)(error)) },
    finishRefresh: async () => { await act(async () => pendingCatalogs.splice(0).forEach(resolve => resolve())) }
  }
}

it('shows current catalog identity and refreshes renamed companies while keeping install actions usable', async () => {
  const { text, click, requests, plugin, rename } = await mountMarket()
  expect(text()).toContain('Current company')
  expect(text()).not.toContain('Old company')
  rename('Renamed company')
  await click('刷新')
  expect(text()).toContain('Renamed company')
  expect(text()).not.toContain('Current company')
  await click('安装')
  expect(requests.find(item => item.path === '/api/enterprise.market.action').body).toEqual({ action: 'install', plugin_id: plugin.id, version_id: plugin.current_version_id })
  expect(text()).toContain('已安装')
  expect(text()).toContain('停用')
  expect(text()).toContain('卸载')
})


it.each([
  { action: 'install', label: '安装', pending: '安装中…', complete: '已安装' },
  { action: 'install', update: true, label: '更新', pending: '更新中…', complete: '已安装' },
  { action: 'enable', label: '启用', pending: '启用中…', complete: '已安装' },
  { action: 'disable', label: '停用', pending: '停用中…', complete: '已停用' },
  { action: 'uninstall', label: '卸载', pending: '卸载中…', complete: '安装' }
])('keeps $label progress on the selected plugin until the operation completes', async options => {
  const { card, click, finish, requests } = await mountMarket(options)
  await click(options.label)
  const selected = card('JSON 格式化')
  const other = card('URL 编码').querySelector('button')
  expect(other.textContent).toBe('安装')
  expect(other.disabled).toBe(false)
  expect(selected.textContent).toContain(options.pending)
  expect([...document.querySelectorAll('button[aria-busy="true"]')]).toHaveLength(1)
  // Duplicate clicks remain blocked for the plugin already being changed.
  await act(async () => selected.querySelector('button[aria-busy="true"]').click())
  expect(requests.filter(item => item.path === '/api/enterprise.market.action')).toHaveLength(1)
  await finish()
  expect(card('JSON 格式化').textContent).toContain(options.complete)
  expect(card('URL 编码').querySelector('button').textContent).toBe('安装')
  expect(card('URL 编码').querySelector('button').disabled).toBe(false)
  expect(document.querySelectorAll('button[aria-busy="true"]')).toHaveLength(0)
})

it('clears only the failed operation and restores the install controls for retry', async () => {
  const { card, click, finish } = await mountMarket({ action: 'install' })
  await click('安装')
  expect(card('URL 编码').querySelector('button').textContent).toBe('安装')
  await finish('下载失败，请重试')
  expect(card('JSON 格式化').querySelector('[role="alert"]').textContent).toBe('下载失败，请重试')
  for (const name of ['JSON 格式化', 'URL 编码']) {
    const button = card(name).querySelector('button')
    expect(button.textContent).toBe('安装')
    expect(button.disabled).toBe(false)
  }
  expect(document.querySelectorAll('button[aria-busy="true"]')).toHaveLength(0)
})


it('lets another plugin start and finish independently while the first operation is pending', async () => {
  const { card, click, finish, requests } = await mountMarket({ action: 'install' })
  await click('安装', 'JSON 格式化')
  expect(card('URL 编码').querySelector('button').disabled).toBe(false)
  await click('安装', 'URL 编码')
  expect(requests.filter(item => item.path === '/api/enterprise.market.action')).toHaveLength(2)
  expect(document.querySelectorAll('button[aria-busy="true"]')).toHaveLength(2)
  await finish(undefined, 'URL 编码')
  expect(card('URL 编码').textContent).toContain('已安装')
  expect(card('URL 编码').querySelector('button').disabled).toBe(false)
  expect(card('JSON 格式化').textContent).toContain('安装中…')
  expect(document.querySelector('[role="status"]')).toBeNull()
  await finish('下载失败，请重试')
  expect(card('JSON 格式化').querySelector('button').textContent).toBe('安装')
  expect(card('URL 编码').textContent).toContain('已安装')
  expect(card('URL 编码').querySelector('[role="alert"]')).toBeNull()
  expect(requests.filter(item => item.path.startsWith('/api/enterprise.market.catalog'))).toHaveLength(1)
})

it('preserves an operation result when an earlier catalog refresh arrives later', async () => {
  const { card, click, finish, finishRefresh } = await mountMarket({ action: 'install', holdRefresh: true })
  await click('刷新')
  await click('安装', 'JSON 格式化')
  await finish()
  expect(card('JSON 格式化').textContent).toContain('已安装')
  await finishRefresh()
  expect(card('JSON 格式化').textContent).toContain('已安装')
  expect(card('URL 编码').querySelector('button').disabled).toBe(false)
  expect(document.querySelector('[role="status"]')).toBeNull()
})
