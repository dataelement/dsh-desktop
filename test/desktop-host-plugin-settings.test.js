import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

describe('Desktop host plugin control in Plugins settings', () => {
  it.each([false, true])('serves the Desktop card with market composed: %s', async marketComposed => {
    const registrations = []
    let client
    const source = readFileSync(new URL('../packages/dsh-desktop-market-installer/client.js', import.meta.url), 'utf8')
    runInNewContext(source, {
      window: { __ModuleLoader__: { load(entry) { client = entry.factory(createRequire(import.meta.url)) } } },
      __DSH_BOOT__: { entries: marketComposed ? [{ id: 'dshmarket' }] : [] },
      document: { querySelector: () => ({}) }
    })
    client.apply({
      effect(callback) { callback() },
      locale: { register() {}, bind: () => key => key },
      slots: {
        inject(_name, callback) { callback() },
        register(options) { registrations.push(options) }
      }
    })
    expect(registrations).toContainEqual(expect.objectContaining({ name: 'settings.plugins.tab', id: 'desktop-host-plugins' }))
    expect(registrations.some(entry => entry.name === 'settings.plugins.tab' && entry.id === 'desktop-market-management')).toBe(marketComposed)
  })
})
