// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { resolve } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true })
afterEach(() => {
  document.body.replaceChildren()
  delete window.dshDesktop
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
  vi.restoreAllMocks()
})

it('uses Harness locale for desktop actions, preserves the local deletion dialog, and disposes registrations', async () => {
  const source = await readFile(resolve('packages/dsh-desktop-client-ui/client.js'), 'utf8')
  let definition
  let active = 'ja'
  const dictionaries = new Map()
  const registrations = []
  const effects = []
  const confirm = vi.fn(() => false)
  vm.runInNewContext(source, {
    document: {
      getElementById: document.getElementById.bind(document),
      createElement: document.createElement.bind(document),
      head: document.head,
      documentElement: { get lang() { throw new Error('DOM language must not be read') } }
    },
    setTimeout: callback => { callback() },
    window: { __ModuleLoader__: { load: (value) => { definition = value } }, dshDesktop: { openInFinder: vi.fn() }, confirm }
  })
  const plugin = definition.factory((id) => {
    if (id === 'react') return {
      createElement: (type, props, ...children) => ({ type, props, children }),
      useState: (initial) => [initial, vi.fn()]
    }
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return { MenuItemButton: 'menu-item' }
    throw new Error(id)
  })
  plugin.apply({
    effect: (setup) => { const dispose = setup(); if (dispose) effects.push(dispose) },
    locale: {
      register: (ns, messages) => { dictionaries.set(ns, messages); return () => dictionaries.delete(ns) },
      bind: (ns) => (key, params = {}) => {
        const messages = dictionaries.get(ns)
        const value = messages?.[active]?.[key] ?? messages?.en?.[key]
        if (!value) throw new Error(`Missing ${ns}:${active}:${key}`)
        return value.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match)
      }
    },
    slots: {
      inject: (_name, callback) => { const result = callback(); if (result?.[Symbol.iterator]) for (const _entry of result) void _entry; return result },
      register: (config, component) => { registrations.push({ config, component }); return () => {} }
    }
  })
  for (const [namespace, messages] of dictionaries) {
    const languages = ['dsh-desktop-actions', 'dsh-desktop-repair'].includes(namespace)
      ? ['de', 'en', 'es', 'fr', 'ja', 'pt', 'ru', 'zh']
      : ['en', 'zh']
    expect(Object.keys(messages).sort()).toEqual(languages)
    for (const entries of Object.values(messages)) {
      expect(Object.keys(entries).sort()).toEqual(Object.keys(messages.en ?? {}).sort())
      for (const [key, value] of Object.entries(entries)) {
        expect(value.trim()).not.toBe('')
        expect(value.match(/\{\w+\}/g) ?? []).toEqual(messages.en?.[key]?.match(/\{\w+\}/g) ?? [])
      }
    }
  }
  const deletion = registrations.find(item => item.config.id === 'desktop-delete-session')
  const injected = deletion.config.inject()
  const sessionProps = { ...injected, sessionId: 'session', displayTitle: '<My session>', useMenuOpenState: () => [true, vi.fn()] }
  const japanese = deletion.component(sessionProps)
  // The local shell-owned dialog intentionally has zh/en copy, with locale fallback.
  expect(japanese.children).toContain('Delete session permanently')
  japanese.props.onSelect()
  expect(injected.deletion.getSnapshot()).toMatchObject({ sessionId: 'session', displayTitle: '<My session>' })
  expect(confirm).not.toHaveBeenCalled()
  const dialog = registrations.find(item => item.config.id === 'desktop-delete-session-dialog')
  const dialogProps = dialog.config.inject()
  const description = dialogProps.t('description', { name: injected.deletion.getSnapshot().displayTitle })
  expect(description).toContain('<My session>')
  expect(description).not.toContain('{name}')
  expect(registrations.some(item => item.config.name === 'settings.sidebar.footer')).toBe(false)
  active = 'fr'
  expect(deletion.component(sessionProps).children).toContain('Delete session permanently')
  const unread = registrations.find(item => item.config.id === 'desktop-unread-session')
  expect(unread.component({ ...unread.config.inject(), unread: false, useMenuOpenState: () => [true, vi.fn()] }).children).toContain('Marquer comme non lu')
  for (const dispose of effects) dispose()
  expect(dictionaries.size).toBe(0)
})

async function mountUtilities(bridge) {
  const source = await readFile(resolve('packages/dsh-desktop-client-ui/client.js'), 'utf8')
  let definition
  let active = 'zh'
  const dictionaries = new Map()
  const effects = []
  let registration
  window.dshDesktop = bridge
  vm.runInNewContext(source, {
    document,
    window: { dshDesktop: bridge, __ModuleLoader__: { load: value => { definition = value } } },
    Error
  })
  const plugin = definition.factory(id => {
    if (id === 'react') return React
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return { Tooltip: ({ children }) => children }
    throw new Error(id)
  })
  plugin.apply({
    effect: setup => { const cleanup = setup(); if (cleanup) effects.push(cleanup) },
    locale: {
      register: (ns, messages) => { dictionaries.set(ns, messages); return () => dictionaries.delete(ns) },
      // Like Harness bind(), this function identity stays stable across switches.
      bind: ns => (key, params = {}) => {
        const template = dictionaries.get(ns)?.[active]?.[key] ?? dictionaries.get(ns)?.en?.[key]
        if (!template) throw new Error(`Missing ${ns}:${active}:${key}`)
        return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match)
      }
    },
    slots: {
      inject: (_name, callback) => { const result = callback(); if (result?.[Symbol.iterator]) for (const _entry of result) void _entry; return result },
      register: (config, component) => {
        if (config.id === 'desktop-utilities') registration = { config, component }
        return () => {}
      }
    }
  })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const props = { ...registration.config.inject(), wide: true }
  const render = () => root.render(React.createElement(registration.component, props))
  await act(async () => { render() })
  let disposed = false
  return {
    container,
    async language(locale) { active = locale; await act(async () => { render() }) },
    async clickRepair() {
      await act(async () => { container.querySelector('[data-dsh-repair-entry]').click() })
    },
    async dispose() {
      if (disposed) return
      disposed = true
      await act(async () => { root.unmount() })
      for (const cleanup of effects.reverse()) cleanup()
      container.remove()
      expect(dictionaries.size).toBe(0)
    }
  }
}

it('retranslates status and ok-false internal errors with a stable Harness translator', async () => {
  const unsubscribe = vi.fn()
  const bridge = {
    getMobileStatus: vi.fn(async () => { throw new Error('status transport unavailable') }),
    onMobileStatus: vi.fn(() => unsubscribe),
    openRepairAgent: vi.fn(async () => ({ ok: false })),
    openMobilePairing: vi.fn(async () => {})
  }
  const view = await mountUtilities(bridge)
  try {
    expect(view.container.querySelector('[role=alert]').textContent).toBe('无法读取手机连接状态')
    await view.language('ja')
    expect(view.container.querySelector('[role=alert]').textContent).toBe('接続状態を取得できません。')
    expect(bridge.getMobileStatus).toHaveBeenCalledTimes(1)
    expect(bridge.onMobileStatus).toHaveBeenCalledTimes(1)
    await view.clickRepair()
    expect(view.container.querySelector('[role=alert]').textContent).toBe('修復を開けません。もう一度お試しください。')
    await view.language('fr')
    expect(view.container.querySelector('[role=alert]').textContent).toBe('Impossible d’ouvrir la réparation. Réessayez.')
  } finally { await view.dispose() }
  expect(unsubscribe).toHaveBeenCalledTimes(1)
})

it('keeps rejected and returned external diagnostics verbatim after switching language', async () => {
  const bridge = {
    getMobileStatus: vi.fn(async () => ({ connected: false })),
    openRepairAgent: vi.fn()
      .mockRejectedValueOnce(new Error('EACCES: diagnostic <raw>'))
      .mockResolvedValueOnce({ ok: false, error: 'backend diagnostic / original' })
  }
  const view = await mountUtilities(bridge)
  try {
    await view.clickRepair()
    expect(view.container.querySelector('[role=alert]').textContent).toBe('EACCES: diagnostic <raw>')
    await view.language('ja')
    expect(view.container.querySelector('[role=alert]').textContent).toBe('EACCES: diagnostic <raw>')
    expect(view.container.querySelector('[role=alert]').children).toHaveLength(0)
    await view.clickRepair()
    await view.language('de')
    expect(view.container.querySelector('[role=alert]').textContent).toBe('backend diagnostic / original')
  } finally { await view.dispose() }
})

it('ignores pending status and operation outcomes after unmount and unsubscribes', async () => {
  let rejectStatus
  let resolveOperation
  const status = new Promise((_resolve, reject) => { rejectStatus = reject })
  const operation = new Promise(resolve => { resolveOperation = resolve })
  const unsubscribe = vi.fn()
  const view = await mountUtilities({
    getMobileStatus: () => status,
    onMobileStatus: () => unsubscribe,
    openRepairAgent: () => operation
  })
  await view.clickRepair()
  expect(view.container.querySelector('[data-dsh-repair-entry]').disabled).toBe(true)
  await view.dispose()
  await act(async () => {
    rejectStatus(new Error('late status failure'))
    resolveOperation({ ok: false })
  })
  expect(unsubscribe).toHaveBeenCalledTimes(1)
  expect(document.querySelector('[data-dsh-utility-error]')).toBeNull()
})
