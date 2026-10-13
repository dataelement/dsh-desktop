// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
const source = await readFile(resolve('packages/dsh-desktop-office/client.js'), 'utf8')
const image = 'data:image/png;base64,iVBORw0KGgo='
const templates = [
  { id: 'government-notice', title: '公文写作 · 通知', titleEn: 'Official notice', mode: 'word', category: '公文写作', pages: 4, pageAspectRatios: Array(4).fill(0.707), revision: 'a'.repeat(24), thumbnail: image },
  { id: 'coffee-market', title: '中国现制咖啡市场调研报告', titleEn: 'Coffee market research', mode: 'word', category: '调研分析', pages: 2, pageAspectRatios: [0.707, 0.707], revision: 'b'.repeat(24), thumbnail: image },
  { id: 'annual-business', title: '年度经营与客户分析', titleEn: 'Annual business', mode: 'excel', category: '经营分析', pages: 5, pageAspectRatios: [1.6, 0.7, 0.85, 0.8, 0.9], revision: 'c'.repeat(24), thumbnail: image, sheets: [{ name: '经营总览', pages: [1, 2] }, { name: '增长测算', pages: [3] }, { name: '增长质量', pages: [4, 5] }] }
]
let root, container, cleanup = []
afterEach(async () => { if (root) await act(async () => root.unmount()); for (const dispose of cleanup.splice(0)) dispose?.(); container?.remove(); root = null; delete window.__ModuleLoader__ })

async function fixture({ bound = true, remote = {}, english = false, deferState = false, examples = templates } = {}) {
  let plugin, dictionaries, store, sessionId = bound ? 'session-a' : undefined
  const seats = new Map(), calls = [], held = new Map(), failures = new Map(), states = new Map([['session-a', { mode: null, ...remote }]])
  const hooks = new Map()
  let releaseInitial
  if (deferState) held.set('state', new Promise(resolve => { releaseInitial = resolve }))
  window.__ModuleLoader__ = { load({ factory }) { plugin = factory(name => { if (name === 'react') return React; throw new Error(name) }) } }
  new Function(source)()
  const connection = { rpc: { async call(channel, endpoint, payload, signal) {
    expect(channel).toBe('/api'); expect(endpoint).toBe('office-templates'); endpoint = payload.endpoint; const { endpoint: operation, ...args } = payload; payload = args; calls.push({ endpoint, payload, signal })
    const requestKey = endpoint === 'preview' ? `preview:${payload.page}` : endpoint
    if (held.has(requestKey)) await held.get(requestKey)
    else if (held.has(endpoint)) await held.get(endpoint)
    signal.throwIfAborted()
    const failureKey = failures.has(requestKey) ? requestKey : endpoint
    if (failures.has(failureKey)) { const message = failures.get(failureKey); failures.delete(failureKey); return { ok: false, error: { message } } }
    if (endpoint === 'preview') return { ok: true, value: { page: payload.page, image, pages: examples.find(item => item.id === payload.templateId).pages } }
    let state = states.get(payload.sessionId) ?? { mode: null }
    if (endpoint === 'mode') state = { mode: payload.mode, selectedTemplateId: null }
    if (endpoint === 'select') state = { ...state, selectedTemplateId: payload.templateId }
    if (endpoint === 'deselect') state = { ...state, selectedTemplateId: null }
    states.set(payload.sessionId, state)
    return { ok: true, value: { ...state, templates: examples } }
  } } }
  const ctx = { get: () => connection, effect(run) { cleanup.push(run()) }, on(name, hook) { hooks.set(name, hook) }, locale: { register(_ns, value) { dictionaries = value; return () => {} } },
    slots: { inject(_seat, run) { run() }, register(meta, component) { store = meta.inject().store; seats.set(meta.name, component) } } }
  plugin.apply(ctx)
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  const t = key => dictionaries[english ? 'en' : 'zh'][key] ?? key
  function render() { root.render(React.createElement(React.Fragment, null, ...['conversation.hero.modeActions', 'conversation.input.accessory', 'conversation.hero.dock'].map(seat => React.createElement(seats.get(seat), { key: seat, sessionId, session: { blank: true }, store, t })))) }
  await act(async () => render())
  async function click(label) {
    const scope = container.querySelector('dialog[open]') ?? container
    const button = [...scope.querySelectorAll('button')].find(element => element.textContent === label || element.getAttribute('aria-label') === label)
    expect(button, label).toBeDefined(); await act(async () => button.click())
  }
  return { calls, store, click, states, async reset() { await act(async () => hooks.get('connection/reset')()) },
    async releaseInitial() { await act(async () => { held.delete('state'); releaseInitial?.() }) }, fail(endpoint, message) { failures.set(endpoint, message) },
    hold(endpoint) { let release; held.set(endpoint, new Promise(resolve => release = resolve)); return async () => { await act(async () => { held.delete(endpoint); release() }) } },
    async switchSession(id) { sessionId = id; await act(async () => render()) } }
}

it('refreshes the unbound catalogue after a connection reset while preserving the chosen format', async () => {
  const f = await fixture({ bound: false }); await f.click('Word')
  await f.reset()
  expect(f.calls.filter(call => call.endpoint === 'state')).toHaveLength(2)
  expect(f.store.snapshot().loaded).toBe(true)
  expect(f.store.snapshot().mode).toBe('word')
  expect(container.querySelectorAll('[data-office-template]')).toHaveLength(2)
})

it('completes the current catalogue load when the connection resets during the first request', async () => {
  const f = await fixture({ bound: false, deferState: true })
  expect(f.store.snapshot().loading).toBe(true)
  await f.reset(); await f.releaseInitial()
  expect(f.calls.filter(call => call.endpoint === 'state')).toHaveLength(2)
  expect(f.store.snapshot().loaded).toBe(true)
  expect(f.store.snapshot().templates).toHaveLength(3)
  await f.click('Word')
  expect(container.querySelectorAll('[data-office-template]')).toHaveLength(2)
})

it('selects a card directly and keeps the eye preview independent of selection', async () => {
  const f = await fixture(); await f.click('Word')
  await f.click('查看案例 中国现制咖啡市场调研报告')
  expect(f.calls.some(call => call.endpoint === 'select')).toBe(false)
  await f.click('关闭预览'); await f.click('选用案例 中国现制咖啡市场调研报告')
  expect(container.querySelector('dialog')).toBeNull()
  expect(container.querySelector('[data-office-selected]').dataset.officeSelected).toBe('coffee-market')
  expect(f.calls.filter(call => call.endpoint === 'select')).toHaveLength(1)
  await f.click('查看案例 公文写作 · 通知')
  expect(container.querySelector('[data-office-selected]').dataset.officeSelected).toBe('coffee-market')
  await f.click('做同款')
  expect(container.querySelector('[data-office-selected]').dataset.officeSelected).toBe('government-notice')
})

it('locks direct card choices while the host is saving a selection', async () => {
  const f = await fixture(); await f.click('Word'); const release = f.hold('select')
  await f.click('选用案例 中国现制咖啡市场调研报告')
  expect([...container.querySelectorAll('.dso-card button')].every(button => button.disabled)).toBe(true)
  await release()
  expect(container.querySelector('[data-office-selected]').dataset.officeSelected).toBe('coffee-market')
})

it('keeps keyboard focus inside the preview and returns to its opening control', async () => {
  const f = await fixture(); await f.click('Word')
  const opener = container.querySelector('[aria-label="查看案例 中国现制咖啡市场调研报告"]')
  opener.focus(); await f.click('查看案例 中国现制咖啡市场调研报告')
  const dialog = container.querySelector('dialog'), close = dialog.querySelector('[aria-label="关闭预览"]'), use = dialog.querySelector('.dso-use')
  expect(document.activeElement).toBe(close)
  const tab = async shiftKey => act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })))
  await tab(true); expect(document.activeElement).toBe(use)
  await tab(false); expect(document.activeElement).toBe(close)
  await f.click('关闭预览'); expect(document.activeElement).toBe(opener)
})

it('keeps the preview open on its padding and dismisses it from the backdrop', async () => {
  const f = await fixture(); await f.click('Word'); await f.click('查看案例 中国现制咖啡市场调研报告')
  const dialog = container.querySelector('dialog')
  dialog.getBoundingClientRect = () => ({ left: 16, right: 1264, top: 16, bottom: 704 })
  await act(async () => dialog.dispatchEvent(new MouseEvent('click', { clientX: 24, clientY: 24, bubbles: true })))
  expect(container.querySelector('dialog')).toBe(dialog)
  await act(async () => dialog.dispatchEvent(new MouseEvent('click', { clientX: 4, clientY: 4, bubbles: true })))
  expect(container.querySelector('dialog')).toBeNull()
})

it('exposes common Word cases and selects the revision shown as a complete spread', async () => {
  const f = await fixture(); await f.click('Word')
  expect(container.querySelectorAll('[data-office-template]')).toHaveLength(2)
  await f.click('查看案例 中国现制咖啡市场调研报告')
  expect(container.querySelector('dialog[open]')).not.toBeNull()
  expect(container.textContent).toContain('第 1–2 页，共 2 页')
  expect(container.querySelectorAll('.dso-spread img')).toHaveLength(2)
  expect([...container.querySelectorAll('dialog button')].some(button => button.textContent === '放大阅读')).toBe(false)
  expect(container.querySelector('[aria-label=下一组]').disabled).toBe(true)
  await f.click('做同款')
  expect(container.querySelector('dialog')).toBeNull()
  expect(container.querySelector('[data-office-selected]')?.dataset.officeSelected).toBe('coffee-market')
  const accessory = container.querySelector('[data-office-selected]')
  expect(accessory.textContent).toBe('×')
  expect(accessory.querySelector('.dso-selected-preview').getAttribute('aria-label')).toBe('查看案例 中国现制咖啡市场调研报告')
  expect(parseFloat(accessory.querySelector('.dso-thumbnail').style.aspectRatio)).toBe(1.414)
  expect(parseFloat(container.querySelector('[data-office-template=coffee-market] .dso-thumbnail').style.aspectRatio)).toBe(1.414)
  expect(f.calls.find(call => call.endpoint === 'select').payload).toEqual({ sessionId: 'session-a', templateId: 'coffee-market', revision: 'b'.repeat(24) })
  await f.click('取消选择案例'); expect(container.querySelector('[data-office-selected]')).toBeNull()
})

it('shows four curated Word cases and previews the reviewed meeting as a spread and a final page', async () => {
  const meeting = { ...templates[1], id: 'meeting-minutes', title: '会议纪要 · 发布会筹备', titleEn: 'Launch preparation meeting minutes', pages: 3, pageAspectRatios: Array(3).fill(0.707), revision: 'e'.repeat(24) }
  const examples = [templates[0], meeting, templates[1], { ...templates[1], id: 'equity-research', title: '小米汽车研究报告', titleEn: 'Company research', revision: 'd'.repeat(24) }, templates[2]]
  const f = await fixture({ examples }); await f.click('Word')
  expect(container.querySelector('.dso-toolbar')).toBeNull()
  expect([...container.querySelectorAll('[data-office-template]')].map(node => node.dataset.officeTemplate)).toEqual(['government-notice', 'meeting-minutes', 'coffee-market', 'equity-research'])
  await f.click('查看案例 会议纪要 · 发布会筹备')
  expect(container.textContent).toContain('第 1–2 页，共 3 页')
  expect(container.querySelectorAll('.dso-spread img')).toHaveLength(2)
  await f.click('下一组')
  expect(container.textContent).toContain('第 3 页，共 3 页')
  expect(container.querySelectorAll('.dso-spread img')).toHaveLength(1)
  await f.click('做同款')
  expect(container.querySelector('[data-office-selected]').dataset.officeSelected).toBe('meeting-minutes')
  expect(f.calls.find(call => call.endpoint === 'select').payload).toEqual({ sessionId: 'session-a', templateId: 'meeting-minutes', revision: meeting.revision })
  await f.click('Excel')
  expect(container.querySelector('.dso-toolbar')).toBeNull()
  await f.click('Word')
  expect(container.querySelector('.dso-toolbar')).toBeNull()
  expect(container.querySelectorAll('[data-office-template]')).toHaveLength(4)
})

it('localizes Word titles without a category toolbar', async () => {
  const f = await fixture({ english: true }); await f.click('Word')
  expect(container.querySelector('.dso-toolbar')).toBeNull()
  await f.click('Preview example Coffee market research')
  expect(container.querySelector('dialog header').textContent).toContain('Coffee market research')
})

it('uses Excel worksheet navigation and localized controls', async () => {
  const excel = [templates[2], { ...templates[2], id: 'logistics', titleEn: 'Logistics', category: '物流分析' }, { ...templates[2], id: 'experiments', titleEn: 'Experiments', category: '实验数据' }]
  const f = await fixture({ english: true, examples: [...templates.slice(0, 2), ...excel] }); await f.click('Excel')
  expect(container.querySelector('.dso-toolbar')).toBeNull()
  expect([...container.querySelectorAll('[data-office-template]')].map(node => node.dataset.officeTemplate)).toEqual(excel.map(item => item.id))
  expect(parseFloat(container.querySelector('[data-office-template=annual-business] .dso-thumbnail').style.aspectRatio)).toBeCloseTo(16 / 9)
  const cover = container.querySelector('[data-office-template=annual-business] .dso-thumbnail img')
  expect(parseFloat(cover.style.width)).toBeCloseTo(180)
  expect(cover.style.height).toBe('auto')
  await f.click('Select example Annual business')
  const selected = container.querySelector('[data-office-selected] .dso-thumbnail img')
  expect(selected.style.width).toBe(cover.style.width)
  expect(selected.style.height).toBe(cover.style.height)
  await f.click('Preview example Annual business')
  expect(container.textContent).toContain('Pages 1–2 of 5')
  await f.click('增长质量'); expect(container.textContent).toContain('Pages 4–5 of 5')
  expect([...container.querySelectorAll('figcaption')].map(node => node.textContent)).toEqual(['增长质量 · Page 4', '增长质量 · Page 5'])
  const lastRequests = f.calls.filter(call => call.endpoint === 'preview').length
  await act(async () => container.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
  expect(container.textContent).toContain('Pages 4–5 of 5')
  expect(f.calls.filter(call => call.endpoint === 'preview')).toHaveLength(lastRequests)
  await act(async () => container.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })))
  expect(container.textContent).toContain('Pages 1–2 of 5')
  await f.click('Close preview'); expect(container.querySelector('dialog')).toBeNull()
})

it('adopts an unbound selection once and preserves an occupied session', async () => {
  const f = await fixture({ bound: false }); await f.click('Word'); await f.click('查看案例 中国现制咖啡市场调研报告'); await f.click('做同款')
  expect(f.calls.some(call => call.endpoint === 'select')).toBe(false)
  await f.switchSession('session-new')
  expect(f.states.get('session-new').selectedTemplateId).toBe('coffee-market')
  expect(f.calls.filter(call => call.endpoint === 'select')).toHaveLength(1)
  await f.switchSession('session-a'); await f.switchSession('session-new')
  expect(f.calls.filter(call => call.endpoint === 'select')).toHaveLength(1)
})

it.each([{ mode: 'excel', selectedTemplateId: 'annual-business' }, { mode: null, presentationMode: 'ppt' }])('keeps an existing output format during staged adoption: %j', async remote => {
  const f = await fixture({ bound: false, remote }); await f.click('Word'); await f.click('查看案例 中国现制咖啡市场调研报告'); await f.click('做同款'); await f.switchSession('session-a')
  expect(f.calls.filter(call => call.endpoint === 'mode' || call.endpoint === 'select')).toHaveLength(0)
  expect(f.states.get('session-a')).toEqual(remote)
})

it('keeps selection errors visible inside the modal and allows a retry', async () => {
  const f = await fixture(); await f.click('Word'); await f.click('查看案例 中国现制咖啡市场调研报告'); f.fail('select', '模板版本已更新')
  await f.click('做同款'); expect(container.querySelector('dialog [role=alert]')?.textContent).toBe('模板版本已更新')
  await f.click('做同款'); expect(container.querySelector('[data-office-selected]')).not.toBeNull()
})

it('locks a pending choice and keeps another session free of a stale modal completion', async () => {
  const f = await fixture(); await f.click('Word'); await f.click('查看案例 中国现制咖啡市场调研报告'); const release = f.hold('select')
  await f.click('做同款'); expect(container.querySelector('.dso-use').disabled).toBe(true)
  await f.switchSession('session-b'); await f.click('Word'); await f.click('查看案例 公文写作 · 通知')
  await release(); expect(container.querySelector('dialog')?.getAttribute('aria-label')).toBe('公文写作 · 通知')
})

it('clears the staged Word choice when the PPT composer is chosen', async () => {
  const f = await fixture({ bound: false }); await f.click('Word')
  await act(async () => window.dispatchEvent(new CustomEvent('dsh-office-mode-change', { detail: { origin: 'ppt' } })))
  expect(container.querySelector('[data-office-dock]')).toBeNull(); expect(f.store.snapshot().mode).toBeNull()
})

it('preserves modal page fit in both dimensions and owns its styles through the plugin lifecycle', async () => {
  await fixture()
  const css = document.querySelector('style[data-plugin="desktop-office"]').textContent
  expect(css).toContain('object-fit:contain'); expect(css).toContain('height:100%'); expect(css).toContain('min-height:0')
  expect(css).not.toMatch(/#[a-f0-9]{3,8}\b/i)
})


it('pages Word spreads by two with keyboard navigation and bounded requests', async () => {
  const f = await fixture(); await f.click('Word'); await f.click('查看案例 公文写作 · 通知')
  const label = () => container.querySelector('dialog [role=status]').textContent
  const key = async value => act(async () => container.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })))
  expect(label()).toBe('第 1–2 页，共 4 页')
  expect([...container.querySelectorAll('figcaption')].map(node => node.textContent)).toEqual(['第 1 页', '第 2 页'])
  await f.click('下一组'); expect(label()).toBe('第 3–4 页，共 4 页')
  expect(document.activeElement).toBe(container.querySelector('dialog'))
  expect(container.querySelector('[aria-label=下一组]').disabled).toBe(true)
  await key('ArrowLeft'); expect(label()).toBe('第 1–2 页，共 4 页')
  await key('ArrowRight'); expect(label()).toBe('第 3–4 页，共 4 页')
  await key('Home'); expect(label()).toBe('第 1–2 页，共 4 页')
  await key('End'); expect(label()).toBe('第 3–4 页，共 4 页')
  expect(f.calls.filter(call => call.endpoint === 'preview').map(call => call.payload.page)).toEqual([1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4])
})

it('shows an odd final Word page and localizes the spread controls', async () => {
  const examples = [{ ...templates[0], pages: 5, pageAspectRatios: Array(5).fill(0.707) }]
  const f = await fixture({ english: true, examples }); await f.click('Word'); await f.click('Preview example Official notice')
  expect(container.textContent).toContain('Pages 1–2 of 5')
  await act(async () => container.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })))
  expect(container.textContent).toContain('Page 5 of 5')
  expect(container.querySelectorAll('.dso-spread img')).toHaveLength(1)
  expect(container.querySelector('figcaption').textContent).toBe('Page 5')
  expect(container.querySelector('[aria-label="Next spread"]').disabled).toBe(true)
  await f.click('Previous spread'); expect(container.textContent).toContain('Pages 3–4 of 5')
  expect(f.calls.filter(call => call.endpoint === 'preview').map(call => call.payload.page)).toEqual([1, 2, 5, 3, 4])
})

it('retries a failed right page as a complete Word spread', async () => {
  const f = await fixture(); await f.click('Word'); f.fail('preview:2', '第二页加载失败'); await f.click('查看案例 中国现制咖啡市场调研报告')
  expect(container.querySelector('dialog [role=alert]').textContent).toContain('第二页加载失败')
  expect(container.querySelectorAll('.dso-spread img')).toHaveLength(0)
  expect(container.querySelector('.dso-use').disabled).toBe(true)
  await f.click('重新加载')
  expect(container.querySelectorAll('.dso-spread img')).toHaveLength(2)
  expect(container.querySelector('.dso-use').disabled).toBe(false)
  expect(f.calls.filter(call => call.endpoint === 'preview').map(call => call.payload.page)).toEqual([1, 2, 1, 2])
})

it('cancels both old Word page requests when a newer spread opens', async () => {
  const f = await fixture(); await f.click('Word'); const release = f.hold('preview:2'); await f.click('查看案例 公文写作 · 通知')
  const oldRequests = f.calls.filter(call => call.endpoint === 'preview')
  expect(container.querySelectorAll('.dso-spread img')).toHaveLength(0)
  await f.click('下一组')
  expect(oldRequests.every(call => call.signal.aborted)).toBe(true)
  expect([...container.querySelectorAll('figcaption')].map(node => node.textContent)).toEqual(['第 3 页', '第 4 页'])
  await release()
  expect([...container.querySelectorAll('figcaption')].map(node => node.textContent)).toEqual(['第 3 页', '第 4 页'])
})

it('pages Excel spreads across worksheets and keeps an odd last page bounded', async () => {
  const f = await fixture(); await f.click('Excel'); await f.click('查看案例 年度经营与客户分析')
  const captions = () => [...container.querySelectorAll('figcaption')].map(node => node.textContent)
  expect(captions()).toEqual(['经营总览 · 第 1 页', '经营总览 · 第 2 页'])
  await f.click('下一组')
  expect(captions()).toEqual(['增长测算 · 第 3 页', '增长质量 · 第 4 页'])
  expect(container.querySelector('.dso-sheets [aria-pressed=true]').textContent).toBe('增长测算')
  await f.click('下一组')
  expect(captions()).toEqual(['增长质量 · 第 5 页'])
  expect(container.querySelector('[aria-label=下一组]').disabled).toBe(true)
  await f.click('上一组')
  expect(captions()).toEqual(['增长测算 · 第 3 页', '增长质量 · 第 4 页'])
  expect(f.calls.filter(call => call.endpoint === 'preview').map(call => call.payload.page)).toEqual([1, 2, 3, 4, 5, 3, 4])
})

it('loads an Excel pair atomically and retries both pages after a worksheet failure', async () => {
  const f = await fixture(); await f.click('Excel'); f.fail('preview:2', '工作表加载失败'); await f.click('查看案例 年度经营与客户分析')
  expect(container.querySelector('dialog [role=alert]').textContent).toContain('工作表加载失败')
  expect(container.querySelectorAll('.dso-spread img')).toHaveLength(0)
  expect(container.querySelector('.dso-use').disabled).toBe(true)
  await f.click('重新加载')
  expect(container.querySelectorAll('.dso-spread img')).toHaveLength(2)
  expect(f.calls.filter(call => call.endpoint === 'preview').map(call => call.payload.page)).toEqual([1, 2, 1, 2])
  await f.click('做同款')
  expect(container.querySelector('[data-office-selected]').dataset.officeSelected).toBe('annual-business')
})
