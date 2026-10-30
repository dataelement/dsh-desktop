// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import React, { act } from 'react'
import * as ReactDOM from 'react-dom'
import * as jsx from 'react/jsx-runtime'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const workbenchSource = await readFile(resolve('packages/dsh-desktop-workbenches/client.js'), 'utf8')
const officeSource = await readFile(resolve('packages/dsh-desktop-office/client.js'), 'utf8')
const manager = await readFile(resolve('packages/ppt-runtime/client/personal-template-manager.js'), 'utf8')
const pptSource = (await readFile(resolve('packages/ppt-runtime/adapter/lib/client.js'), 'utf8')).replace('/* PERSONAL_TEMPLATE_MANAGER */', manager)
const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
let root, container, disposers = []
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  for (const dispose of disposers.reverse()) dispose?.()
  disposers = []
  container?.remove()
  Object.defineProperty(window, 'localStorage', storageDescriptor)
  document.querySelectorAll('style[data-plugin-css]').forEach(node => node.remove())
})

it.each([
  { customFrame: false, enabled: true },
  { customFrame: true, enabled: true },
  { customFrame: false, enabled: false },
  { customFrame: true, enabled: false }
])('scopes Office/PPT visibility to active workbenches (customFrame=$customFrame, enabled=$enabled)', async ({ customFrame, enabled }) => {
  const seats = [], dictionaries = new Map()
  const ctx = {
    get: () => ({ rpc: { async call() { return { ok: true, value: { mode: null, templates: [], status: 'ok', data: { templates: [] } } } } } }),
    effect(run) { disposers.push(run()) }, on() {},
    locale: { register(ns, values) { dictionaries.set(ns, values); return () => {} } },
    slots: { inject(_seat, run) { run() }, register(meta, component) { seats.push({ meta, component, props: meta.inject('session-a') }) } }
  }
  function load(source) {
    let plugin
    window.__ModuleLoader__ = { load({ factory }) { plugin = factory(name => {
      if (name === 'react') return React
      if (name === 'react-dom') return ReactDOM
      if (name === 'react/jsx-runtime') return jsx
      if (name === '@deepseek-ai/cordis') return { Service: { tracker: Symbol('tracker') } }
      return {}
    }) } }
    new Function(source)()
    return plugin
  }
  for (const source of [officeSource, pptSource]) load(source).apply(ctx)
  Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: key => key === 'dsh-workbench-enabled' ? String(enabled) : null } })
  const { Frame } = load(workbenchSource)
  const listeners = new Set()
  const list = { subscribe: () => () => {}, getSnapshot: () => listSnapshot }
  const listSnapshot = { items: [] }
  const entry = { id: 'drawing', customFrame, Component: ({ conversation }) => React.createElement('section', null, conversation) }
  let snapshot = { state: { active: null, added: ['drawing'], sessionBindings: { 'session-a': 'drawing' } }, catalog: [entry], ready: true, pending: 0 }
  const service = {
    ctx: { sessions: { list }, workspaces: { list } },
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => snapshot,
    currentSession: () => 'session-a', defaultWorkspace: () => null, workspaceVisible: () => true
  }
  let mounts = 0
  function Conversation() {
    React.useEffect(() => { mounts++ }, [])
    return React.createElement('div', { 'data-test-conversation': '' },
      ...seats.filter(({ meta }) => meta.name === 'conversation.hero.modeActions').map(({ meta, component, props }) => React.createElement(component, {
        ...props, key: meta.id, sessionId: 'session-a', session: { blank: true }, t: key => dictionaries.get(meta.locale)?.zh[key] ?? key
      })),
      React.createElement('button', { 'data-test-other-action': '' }, 'Other mode action with long text'),
      React.createElement('input', { defaultValue: 'unfinished prompt' }))
  }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root.render(React.createElement(Frame, { service, conversation: React.createElement(Conversation) })))
  const input = container.querySelector('input')
  const office = [...container.querySelectorAll('button[data-office-mode]')]
  const ppt = container.querySelector('button[data-desktop-ppt]')
  expect(office.map(button => button.dataset.officeMode)).toEqual(['word', 'excel'])
  expect(ppt).not.toBeNull()
  const assertDisplay = hidden => {
    for (const button of office) expect(getComputedStyle(button).display === 'none').toBe(hidden)
    expect(getComputedStyle(ppt).display === 'none').toBe(hidden)
    expect(getComputedStyle(container.querySelector('[data-test-other-action]')).display).not.toBe('none')
    expect(container.querySelectorAll('[data-test-conversation]')).toHaveLength(1)
    expect(container.querySelector('input')).toBe(input)
    expect(input.value).toBe('unfinished prompt')
    expect(mounts).toBe(1)
  }
  assertDisplay(false)
  for (const active of ['drawing', null, 'drawing', null]) {
    await act(async () => {
      snapshot = { ...snapshot, state: { ...snapshot.state, active } }
      for (const listener of listeners) listener()
    })
    assertDisplay(enabled && !!active)
  }
})
