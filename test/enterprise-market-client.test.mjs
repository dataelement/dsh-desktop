import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'

const source = await readFile(new URL('../packages/dsh-desktop-enterprise/client.js', import.meta.url), 'utf8')
const disposers = []
afterEach(() => { for (const dispose of disposers.splice(0).reverse()) dispose(); vi.useRealTimers() })

async function client(initial, language = 'zh') {
  let account = initial, definition, resolveState
  const events = new Map(), registrations = new Map()
  const node = () => ({ textContent: '' })
  const window = {
    __ModuleLoader__: { load: value => { definition = value } },
    addEventListener: (name, listener) => events.set(name, listener),
    removeEventListener: (name) => events.delete(name),
    setInterval, clearInterval
  }
  vm.runInNewContext(source, {
    window, navigator: { language: 'zh-CN' }, Date, AbortController,
    document: { documentElement: { lang: 'zh-CN' }, getElementById: () => null, createElement: node, head: { appendChild() {} }, visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    fetch: async () => ({ ok: true, json: async () => resolveState ? new Promise(resolve => { resolveState(resolve) }) : structuredClone(account) })
  })
  const plugin = definition.factory(id => {
    if (id === 'react') return { createElement: (type, props) => ({ type, props }) }
    throw new Error(id)
  })
  const dictionaries = new Map()
  plugin.apply({
    locale: { register: (ns, values) => { dictionaries.set(ns, values) }, bind: ns => key => dictionaries.get(ns)[language][key] },
    effect: callback => { const dispose = callback(); if (dispose) disposers.push(dispose) },
    slots: {
      inject: (_slot, callback) => callback(),
      register: (config, component) => {
        registrations.set(config.id, { config, component })
        return () => registrations.delete(config.id)
      }
    }
  })
  const sync = () => events.get('dsh-desktop:enterprise-account-changed')()
  await new Promise(resolve => setImmediate(resolve))
  return { registrations, events, sync, set: value => { account = value }, defer: capture => { resolveState = capture } }
}

const account = { connected: true, base: 'https://bisheng.example', tenant: { id: '1', name: '企业一' }, user: { id: '20' }, sessionExpiresAt: new Date(Date.now() + 60000).toISOString() }

describe('enterprise plugins entry', () => {
  it('adds 来自企业 after login, replaces account context on tenant switch, and removes it on logout', async () => {
    const app = await client({ connected: false })
    expect(app.registrations.has('enterprise-market')).toBe(false)
    app.set(account); await app.sync()
    const entry = app.registrations.get('enterprise-market')
    expect(entry.config.name).toBe('settings.plugins.tab')
    expect(entry.config.label()).toBe('来自企业')
    expect(entry.component().props.account.tenant.id).toBe('1')
    app.set({ ...account, tenant: { id: '2', name: '企业二' } }); await app.sync()
    expect(app.registrations.get('enterprise-market').component().props.account.tenant.id).toBe('2')
    app.set({ connected: false }); await app.sync()
    expect(app.registrations.has('enterprise-market')).toBe(false)
    expect(app.registrations.has('enterprise-account')).toBe(true)
  })
  it('discards an older login response arriving after logout and removes expired sessions', async () => {
    const app = await client(account)
    let release
    app.defer(resolve => { release = resolve })
    const stale = app.sync()
    await new Promise(resolve => setImmediate(resolve))
    app.defer(null); app.set({ connected: false }); await app.sync()
    release(account); await stale
    expect(app.registrations.has('enterprise-market')).toBe(false)
    app.set({ ...account, sessionExpiresAt: '2000-01-01T00:00:00Z' }); await app.sync()
    expect(app.registrations.has('enterprise-market')).toBe(false)
  })
  it('keeps the tab registered and supplies updated display data for the same account', async () => {
    const app = await client(account)
    const entry = app.registrations.get('enterprise-market')
    app.set({ ...account, tenant: { ...account.tenant, name: '更新后的企业' } }); await app.sync()
    expect(app.registrations.get('enterprise-market')).toBe(entry)
    expect(entry.component().props.account.tenant.name).toBe('更新后的企业')
  })
})

 it('uses the product English dictionary for the enterprise tab', async () => {
   const app = await client(account, 'en')
   expect(app.registrations.get('enterprise-market').config.label()).toBe('From enterprise')
 })
