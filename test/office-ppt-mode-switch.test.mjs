// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import React, { act } from 'react'
import * as jsx from 'react/jsx-runtime'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const officeSource = await readFile(resolve('packages/dsh-desktop-office/client.js'), 'utf8')
const manager = await readFile(resolve('packages/ppt-runtime/client/personal-template-manager.js'), 'utf8')
const pptSource = (await readFile(resolve('packages/ppt-runtime/adapter/lib/client.js'), 'utf8')).replace('/* PERSONAL_TEMPLATE_MANAGER */', manager)
let root, container, disposers = []
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  for (const dispose of disposers.reverse()) dispose?.()
  disposers = []; container?.remove(); document.querySelectorAll('style[data-plugin-css]').forEach(node => node.remove())
})

async function fixture(bound = true) {
  const sessionId = bound ? 'session-a' : undefined
  let catalogueRequests = 0, releaseCatalogue
  const cataloguePending = new Promise(yes => { releaseCatalogue = yes })
  disposers.push(releaseCatalogue)
  const office = [{ id: 'excel-example', title: 'Excel example', mode: 'excel', revision: 'a'.repeat(24), pages: 1, pageAspectRatios: [1.6], thumbnail: 'data:image/png;base64,iVBORw0KGgo=' }]
  const ppt = [{ id: 'ppt-example', name: 'PPT example', category: 'business', palette: { background: 'FFFFFF', surface: 'F4F4F4', text: '242424', muted: '666666', accent: '3888FF', secondary: 'E7E7E9' } }]
  const seats = [], dictionaries = new Map()
  let documentMode = bound ? 'excel' : null, presentationMode = null, acknowledge, rejectMode
  const pending = new Promise((yes, no) => { acknowledge = yes; rejectMode = no })
  const connection = { rpc: { async call(route, endpoint, payload) {
    if (route === '/api') {
      if (payload.endpoint === 'mode') { documentMode = payload.mode; presentationMode = null }
      return { ok: true, value: { mode: documentMode, presentationMode, selectedTemplateId: null, templates: office } }
    }
    if (endpoint === 'template/catalog' && ++catalogueRequests > 1) await cataloguePending
    if (endpoint === 'presentation/mode') {
      // Host commits before its acknowledgement arrives; another choice may follow.
      presentationMode = payload.mode; documentMode = null
      await pending
    }
    return { ok: true, value: { status: 'ok', data: { templates: ppt, presentationMode, documentMode, selectedTemplateId: null } } }
  } } }
  const ctx = {
    get: () => connection,
    effect(run) { disposers.push(run()) }, on() {},
    locale: { register(ns, values) { dictionaries.set(ns, values); return () => {} } },
    slots: { inject(_seat, run) { run() }, register(meta, component) { seats.push({ meta, component, props: meta.inject(sessionId) }) } }
  }
  for (const source of [officeSource, pptSource]) {
    let plugin
    window.__ModuleLoader__ = { load({ factory }) { plugin = factory(name => name === 'react' ? React : name === 'react/jsx-runtime' ? jsx : {}) } }
    new Function(source)(); plugin.apply(ctx)
  }
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  const parts = seats.filter(({ meta }) => ['conversation.hero.modeActions', 'conversation.hero.dock'].includes(meta.name))
  await act(async () => root.render(React.createElement(React.Fragment, null, parts.map(({ meta, component, props }) => React.createElement(component, {
    ...props, key: meta.name + meta.id, sessionId, session: { blank: true }, t: key => dictionaries.get(meta.locale)?.zh[key] ?? key
  })))))
  const officeStore = seats.find(({ meta }) => meta.id === 'desktop-office').props.store
  const history = []; disposers.push(officeStore.subscribe(sessionId, () => history.push(officeStore.snapshot(sessionId).mode)))
  return {
    history,
    async click(label) { await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === label).click()) },
    async finish(error) { await act(async () => error ? rejectMode(new Error(error)) : acknowledge()) },
    panels() { return { office: container.querySelector('[data-office-dock]')?.dataset.officeDock ?? null, ppt: !!container.querySelector('[data-office-ppt-template-panel]') } }
  }
}

it('replaces Excel with PPT once the Host confirms the new mode', async () => {
  const f = await fixture()
  expect(f.panels()).toEqual({ office: 'excel', ppt: false })
  await f.click('PPT')
  expect(f.panels()).toEqual({ office: 'excel', ppt: false })
  await f.finish()
  expect(f.panels()).toEqual({ office: null, ppt: true })
})

it('preserves the current panel and displays an error when PPT switching fails', async () => {
  const f = await fixture(); await f.click('PPT'); await f.finish('Mode switch failed')
  expect(f.panels()).toEqual({ office: 'excel', ppt: false })
  expect(container.querySelector('[role=alert]')?.textContent).toContain('Mode switch failed')
})

it('keeps a newer Word choice when an older PPT acknowledgement arrives', async () => {
  const f = await fixture(); await f.click('PPT'); await f.click('Word')
  expect(f.panels()).toEqual({ office: 'word', ppt: false })
  f.history.length = 0
  await f.finish()
  expect(f.history.every(mode => mode === 'word')).toBe(true)
  expect(f.panels()).toEqual({ office: 'word', ppt: false })
})

it('keeps preloaded PPT examples when switching from unbound Excel', async () => {
  const f = await fixture(false)
  await f.click('Excel')
  await f.click('PPT')
  expect(f.panels()).toEqual({ office: null, ppt: true })
  expect(container.textContent).toContain('PPT example')
})
