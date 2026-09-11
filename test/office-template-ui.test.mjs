// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.ResizeObserver = class { observe() {} disconnect() {} }
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
let plugin
window.__ModuleLoader__ = { load: definition => { plugin = definition.factory(() => React) } }
new Function(await readFile(path.resolve('packages/dsh-office/client.js'), 'utf8'))()
const templates = JSON.parse(await readFile(path.resolve('packages/dsh-office/templates/catalog.json'), 'utf8')).map(item => ({ ...item, title: item.id, mode: item.mode ?? 'word', thumbnail: 'data:image/webp;base64,YQ==' }))
let root, container
afterEach(async () => { if (root) await act(() => root.unmount()); container?.remove(); root = null })
async function fixture() {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  const store = new plugin.ModeStore(), calls = [], waits = new Map(), failures = new Set()
  let sessionId = 'a', state = { mode: 'word', templates }
  const rpc = { async call(_route, endpoint, payload) {
    calls.push({ endpoint, ...payload })
    if (waits.has(endpoint)) await waits.get(endpoint)
    if (failures.delete(`${endpoint}:${payload.page}`)) throw new Error('Temporary failure')
    if (endpoint === 'template/preview') return { ok: true, value: { status: 'ok', data: { image: `data:image/webp;base64,${payload.templateId}-${payload.page}`, page: payload.page } } }
    if (endpoint === 'mode') state = { ...state, mode: payload.mode }
    return { ok: true, value: { status: 'ok', data: { sessionId: payload.sessionId, ...state } } }
  } }
  store.update('a', { ...state, loading: false })
  function render() { root.render(React.createElement(plugin.TemplateDock, { rpc, store, sessionId, session: { blank: true }, t: x => x })) }
  await act(render)
  return { store, rpc, calls, failures, async click(label) {
    const button = [...container.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === label || b.textContent === label)
    expect(button, label).toBeDefined(); await act(async () => button.click())
  }, async switchSession() { sessionId = 'b'; store.update('b', { mode:'word',templates,selectedTemplateId:null,loading:false }); await act(render) },
  hold(endpoint) { let release; waits.set(endpoint, new Promise(r => release = r)); return async () => { await act(async () => { waits.delete(endpoint); release() }) } } }
}
it('opens the whole report from a card and closes without selecting a template or adding an accessory', async () => {
  const f = await fixture()
  expect(container.querySelectorAll('.wbo-template-card')).toHaveLength(3)
  expect(container.querySelector('.wbo-template-heading')).toBeNull()
  f.failures.add('template/preview:3')
  await f.click('preview equity-research')
  expect(container.querySelector('dialog[open]').textContent).toContain('1 / 12')
  expect(container.querySelectorAll('[data-report-page]')).toHaveLength(12)
  expect(container.querySelectorAll('dialog img')).toHaveLength(11)
  expect(container.querySelector('[data-report-page="12"] img').src).toContain('equity-research-12')
  expect(container.querySelector('dialog [role=alert]').textContent).toContain('Temporary failure')
  await f.click('retry 3'); expect(container.querySelectorAll('dialog img')).toHaveLength(12)
  expect(container.querySelectorAll('dialog button')).toHaveLength(1)
  expect(container.querySelector('dialog [data-native-wheel-owner]')).not.toBeNull()
  await f.click('close'); expect(container.querySelector('dialog')).toBeNull()
  expect(f.calls.every(call => call.endpoint === 'template/preview')).toBe(true)
  expect(container.querySelector('[aria-pressed]')).toBeNull()
  expect(container.querySelector('.wbo-selected')).toBeNull()
})
it('retires the preview on session or mode changes and ignores old page responses', async () => {
  const f = await fixture()
  const release = f.hold('template/preview')
  await f.click('preview coffee-market')
  await f.switchSession(); await release()
  expect(container.querySelector('dialog')).toBeNull()
  expect(f.store.snapshot('b').selectedTemplateId).toBeNull()
  await act(() => f.store.update('b', { mode: 'excel' }))
  expect(container.querySelectorAll('.wbo-template-card')).toHaveLength(3)
  expect(container.querySelector('[data-office-template-dock]')?.getAttribute('data-office-template-dock')).toBe('excel')
})
it('serializes mode changes and refreshes so an older state response cannot reopen the gallery', async () => {
  const f = await fixture(), release = f.hold('state')
  let refresh, select
  await act(async () => { refresh = f.store.request(f.rpc, 'a', 'state'); select = f.store.request(f.rpc, 'a', 'mode', 'excel') })
  await release(); await act(async () => { await refresh; await select })
  expect(f.store.snapshot('a').mode).toBe('excel')
  expect(container.querySelectorAll('.wbo-template-card')).toHaveLength(3)
  expect(container.querySelector('[data-office-template-dock]')?.getAttribute('data-office-template-dock')).toBe('excel')
  expect(f.calls.map(c => c.endpoint)).toEqual(['state','mode'])
})

it('previews every Excel sheet and closes with Escape, preserving the composer', async () => {
  const f = await fixture()
  await act(() => f.store.update('a', { mode:'excel' }))
  await f.click('preview port-cargo')
  expect(container.querySelectorAll('[role=tab]')).toHaveLength(5)
  await f.click('作业明细')
  expect(container.querySelectorAll('[data-report-page]')).toHaveLength(1)
  expect(container.querySelector('[data-report-page="5"] img').src).toContain('port-cargo-5')
  await act(() => container.querySelector('dialog').dispatchEvent(new Event('cancel', {cancelable:true})))
  expect(container.querySelector('dialog')).toBeNull()
  expect(f.calls.every(call => call.endpoint === 'template/preview')).toBe(true)
})

it('navigates all six worksheets, restores scroll and cached pages, and uses worksheet-specific page ratios', async () => {
  const f = await fixture()
  await act(() => f.store.update('a', { mode:'excel' }))
  await f.click('preview annual-business')
  expect([...container.querySelectorAll('[role=tab]')].map(t => t.textContent)).toEqual(['经营总览','增长测算','增长质量','客户留存','月度经营数据','客户批次数据'])
  expect(container.querySelectorAll('[data-report-page]')).toHaveLength(10)
  const panel = container.querySelector('[role=tabpanel]')
  panel.scrollTop = 1250
  await act(() => panel.dispatchEvent(new Event('scroll')))
  const count = f.calls.length
  await f.click('增长测算')
  expect(container.querySelector('[role=tabpanel]').scrollTop).toBe(0)
  expect(container.querySelectorAll('[data-report-page]')).toHaveLength(3)
  expect(container.querySelector('[data-report-page="13"] img').src).toContain('annual-business-13')
  await f.click('经营总览')
  expect(container.querySelector('[role=tabpanel]').scrollTop).toBe(1250)
  expect(f.calls.length).toBe(count + 3)
  const first = container.querySelector('[role=tab]')
  await act(() => first.dispatchEvent(new KeyboardEvent('keydown', { key:'End', bubbles:true })))
  expect(container.querySelector('[role=tab][aria-selected=true]').textContent).toBe('客户批次数据')
  expect(container.querySelector('[data-report-page="20"] img').alt).toContain('客户批次数据')
  expect(parseFloat(container.querySelector('.wbo-page-paper').style.aspectRatio)).toBe(templates.find(t=>t.id==='annual-business').previewPages[19].aspectRatio)
  expect(document.activeElement.textContent).toBe('客户批次数据')
  expect(f.calls.every(call => call.endpoint === 'template/preview')).toBe(true)
  await f.click('close')
  expect(document.activeElement.getAttribute('aria-label')).not.toBe('close')
})

it('switches sheets during loading, ignores retired responses and retries a failed segment', async () => {
  const f = await fixture()
  await act(() => f.store.update('a', { mode:'excel' }))
  const release = f.hold('template/preview')
  await f.click('preview annual-business')
  await f.click('客户留存')
  f.failures.add('template/preview:17')
  await release()
  expect(container.querySelectorAll('[data-report-page]')).toHaveLength(2)
  expect(container.querySelector('[data-report-page="1"]')).toBeNull()
  expect(container.querySelector('[data-report-page="17"] [role=alert]')).not.toBeNull()
  await f.click('retry 17')
  expect(container.querySelectorAll('dialog img')).toHaveLength(2)
  await f.click('经营总览')
  expect(container.querySelectorAll('dialog img')).toHaveLength(10)
  await f.switchSession()
  expect(container.querySelector('dialog')).toBeNull()
})
