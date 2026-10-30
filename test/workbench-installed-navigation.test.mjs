import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it } from 'vitest'

const source = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>')
let root
let previousWindow, previousDocument, previousAct
function client() {
  let exports
  vm.runInNewContext(source.replace('return { apply, inject:', 'return { Preview, ScreenshotGallery, apply, inject:'), {
    window: { localStorage: { getItem: key => key === 'dsh-workbench-enabled' ? 'true' : null, setItem() {} }, __ModuleLoader__: { load({ factory }) {
      exports = factory(name => name === 'react' ? React : name === '@deepseek-ai/cordis' ? { Service: { tracker: Symbol() } } : { Switch: () => null })
    } } }, document: dom.window.document, setTimeout, clearTimeout, AbortController
  })
  return exports
}
function service({ listed = true, added = true } = {}) {
  const { Workbenches } = client()
  const ctx = { fiber: { entry: { options: { name: 'animation-package' } } }, layout: { beginNavigation() {} } }
  const value = new Workbenches(ctx)
  value.ready = true
  value.state.added = added ? ['example/animation'] : []
  value.installs = { 'example/animation': { pluginName: 'animation-package', version: '1.0.0' } }
  value.remoteCatalog = listed ? [{ id: 'example/animation', name: 'Animation', description: { zh: 'Animation', en: 'Animation' }, screenshots: [{ url: 'https://example.com/market.png' }], distribution: { name: 'animation-package' } }] : []
  value.commit = async mutate => { mutate(value.state); value.publish() }
  value.run = promise => promise
  return value
}
afterEach(async () => {
  if (root) {
    await act(async () => root.unmount())
    root = null
    globalThis.window = previousWindow
    globalThis.document = previousDocument
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct
  }
})
function mount(Component, entry) {
  previousWindow = globalThis.window
  previousDocument = globalThis.document
  previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  root = createRoot(dom.window.document.getElementById('root'))
  const render = async next => act(async () => root.render(React.createElement(Component, { entry: next })))
  return { render, error: async img => act(async () => img.dispatchEvent(new dom.window.Event('error'))), node: dom.window.document.getElementById('root') }
}

describe('installed workbench navigation recovery', () => {
  for (const listed of [true, false]) it(`repins an already added market install after delayed registration (listed=${listed})`, async () => {
    const value = service({ listed })
    value.reconcileMarketInstalls()
    expect(value.state.pinned).toEqual([])
    const unregister = value.register({ title: 'Animation' }, () => null)
    expect(value.state.pinned).toEqual(['example/animation'])
    unregister()
    value.register({ title: 'Animation' }, () => null)
    expect(value.state.pinned).toEqual(['example/animation'])
    value.native = { status: 'ready', bundles: { 'animation-package': { installed: true, enabled: false } } }
    value.reconcileMarketInstalls()
    expect(value.state.pinned).toEqual(['example/animation'])
  })
  it('recovers a market pin after catalog refresh resolves provider attribution without changing sessions', async () => {
    const value = service()
    const refreshed = value.remoteCatalog
    value.remoteCatalog = [{ ...refreshed[0], id: 'example/outdated-attribution' }]
    value.state.active = 'example/animation'
    value.state.sessionBindings = { 'session-1': 'example/animation' }
    value.state.notes = { 'example/animation': 'Keep my note' }
    value.register({ title: 'Animation' }, () => null)
    expect(value.catalog.size).toBe(0)
    expect(value.state.pinned).toEqual([])
    expect(value.state.active).toBe('example/animation')
    value.readCatalog = async () => ({ entries: refreshed, categories: [], stale: false })
    await value.refreshCatalog()
    expect(value.catalog.has('example/animation')).toBe(true)
    expect(value.state.pinned).toEqual(['example/animation'])
    expect(value.state.active).toBe('example/animation')
    expect(value.state.sessionBindings).toEqual({ 'session-1': 'example/animation' })
    expect(value.state.notes).toEqual({ 'example/animation': 'Keep my note' })
  })
  it('waits for registered providers and resumes after feature reloading', () => {
    const value = service()
    value.blocked = true
    value.register({ title: 'Animation' }, () => null)
    expect(value.state.pinned).toEqual([])
    value.blocked = false
    value.reconcileMarketInstalls()
    expect(value.state.pinned).toEqual(['example/animation'])
    value.state.pinned = []
    value.ready = false
    value.reconcileMarketInstalls()
    expect(value.state.pinned).toEqual([])
    value.ready = true
    value.reconcileMarketInstalls()
    expect(value.state.pinned).toEqual(['example/animation'])
  })
  it('does not resurrect explicitly removed installs while their old provider still exists', async () => {
    const value = service()
    value.register({ title: 'Animation' }, () => null)
    value.removedWorkbenchIds.add('example/animation')
    delete value.installs['example/animation']
    await value.remove('example/animation')
    value.reconcileMarketInstalls()
    value.reconcileLocalProviders()
    expect(value.state.added).toEqual([])
    expect(value.state.pinned).toEqual([])
  })
  it('renders published screenshots in Installed without installation provenance or local images', async () => {
    const { Market } = client()
    const value = service()
    value.register({ title: 'Animation' }, () => null)
    value.native = { status: 'ready', bundles: { 'animation-package': { installed: true, enabled: true, version: '1.0.0' } } }
    value.publish()
    const view = mount(() => React.createElement(Market, { service: value }))
    await view.render()
    await act(async () => view.node.querySelector('#dsh-workbench-mine-tab').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })))
    expect(view.node.querySelector('#dsh-workbench-mine-tab').getAttribute('aria-selected')).toBe('true')
    const card = view.node.querySelector('article')
    expect(card.querySelector('img.dshWbCardScreenshot').src).toBe('https://example.com/market.png')
  })
})

describe('market preview image lifecycle', () => {
  it('prefers published images, tries each candidate once, and recovers after metadata changes', async () => {
    const { Preview } = client()
    const entry = { id: 'example/animation', title: 'Animation', listed: true, screenshot: 'https://example.com/stale.png', screenshots: ['https://example.com/first.png', 'https://example.com/second.png'] }
    const view = mount(Preview, entry)
    await view.render(entry)
    expect(view.node.querySelector('img').src).toBe(entry.screenshots[0])
    await view.error(view.node.querySelector('img'))
    expect(view.node.querySelector('img').src).toBe(entry.screenshots[1])
    await view.error(view.node.querySelector('img'))
    expect(view.node.querySelector('img').src).toBe(entry.screenshot)
    await view.error(view.node.querySelector('img'))
    expect(view.node.querySelector('img')).toBeNull()
    await view.render({ ...entry })
    expect(view.node.querySelector('img')).toBeNull()
    await view.render({ ...entry, screenshots: ['https://example.com/repaired.png'] })
    expect(view.node.querySelector('img').src).toBe('https://example.com/repaired.png')
  })
  it('removes broken gallery slides and stops once all images fail', async () => {
    const { ScreenshotGallery } = client()
    const entry = { id: 'example/animation', title: 'Animation', screenshots: ['https://example.com/a.png', 'https://example.com/b.png'] }
    const view = mount(ScreenshotGallery, entry)
    await view.render(entry)
    await view.error(view.node.querySelector('img'))
    expect(view.node.querySelectorAll('img')).toHaveLength(1)
    await view.error(view.node.querySelector('img'))
    expect(view.node.querySelectorAll('img')).toHaveLength(0)
    await view.render({ ...entry })
    expect(view.node.querySelectorAll('img')).toHaveLength(0)
    await view.render({ ...entry, screenshots: ['https://example.com/c.png'] })
    expect(view.node.querySelector('img').src).toBe('https://example.com/c.png')
  })
})
