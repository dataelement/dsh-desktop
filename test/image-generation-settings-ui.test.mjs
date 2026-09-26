// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { DEFAULTS, MODEL_CATALOG } from '../packages/dsh-image-generation/lib/provider.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

it('registers the image settings tab in 0.1.7 and opens the configuration form', async () => {
  const source = await readFile(resolve('packages/dsh-image-generation/client.js'), 'utf8')
  const primitives = await readFile(createRequire(resolve('package.json')).resolve('@deepseek-ai/dsh-client-ui-primitives'), 'utf8')
  const exports = primitives.match(/export \{([^}]+)\}/)[1].split(',').map(value => value.trim())
  let plugin
  const require = name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return new Proxy({}, { get(_target, key) {
      expect(exports).toContain(key)
      if (key === 'Menu') return ({ anchor }) => anchor
      return props => React.createElement('svg', props)
    } })
    throw new Error(name)
  }
  new Function('window', source)({ __ModuleLoader__: { load({ factory }) { plugin = factory(require) } } })
  const entries = [], disposers = []
  plugin.apply({
    uiConversation: { events: { register() {} } },
    locale: { register() {}, bind: () => key => key },
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose) },
    slots: {
      inject(name, fn) { if (['settings.plugins.tab', 'conversation.chat.node'].includes(name)) fn() },
      register(options, Component) { entries.push({ options, Component }) }
    }
  })
  const entry = entries.find(item => item.options.name === 'settings.plugins.tab')
  expect(entry.options.id).toBe('image-generation')
  expect(entry.options.label()).toBe('title')
  const settings = { revision: 0, provider: 'bytedance', writable: true, catalogs: MODEL_CATALOG,
    profiles: Object.fromEntries(Object.entries(DEFAULTS).map(([name, defaults]) => [name, { ...defaults, configured: false }])) }
  const fetchMock = vi.fn(async () => ({ ok: true, text: async () => JSON.stringify(settings) }))
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => root.render(React.createElement(entry.Component, { t: key => key, ...entry.options.inject() })))
    await act(async () => container.querySelector('button[aria-expanded]').click())
    expect(container.querySelector('form')).not.toBeNull()
    expect(container.querySelector('input[type=password]')).not.toBeNull()
    expect(container.querySelector('button[type=submit]').textContent).toBe('save')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')
  } finally {
    await act(async () => root.unmount())
    container.remove()
    disposers.reverse().forEach(dispose => dispose())
    vi.unstubAllGlobals()
  }
})
