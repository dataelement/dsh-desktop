// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('market installer UI', () => {
  let root
  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('uses the desktop bridge, preserves an installation error and permits retry', async () => {
    vi.useFakeTimers()
    let finishPoll
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ phase: 'absent' }) })
      .mockImplementationOnce(() => new Promise(resolve => { finishPoll = resolve }))
    let rejectInstall
    const installMarket = vi.fn()
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectInstall = reject }))
      .mockResolvedValueOnce({ status: 202, payload: { phase: 'installing' } })
    let client
    const source = readFileSync(resolve('packages/dsh-desktop-market-installer/client.js'), 'utf8')
    runInNewContext(source, {
      window: { __ModuleLoader__: { load(entry) { client = entry.factory(createRequire(import.meta.url)) } } },
      __DSH_BOOT__: { entries: [] }, document, fetch, setTimeout, clearTimeout,
      dshDesktop: { installMarket }
    })
    let Component
    client.apply({
      effect(callback) { callback() }, locale: { register() {}, bind: () => key => key },
      slots: { inject(_name, callback) { callback() }, register(options, component) { if (options.id === 'market') Component = component } }
    })
    const element = document.createElement('div')
    document.body.append(element)
    root = createRoot(element)
    await act(async () => { root.render(React.createElement(Component, { t: key => key })) })
    await act(async () => { element.querySelector('button').click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(850) })
    await act(async () => { rejectInstall(new Error('Request rejected.')) })
    await act(async () => { finishPoll({ ok: true, json: async () => ({ phase: 'absent' }) }) })
    expect(element.textContent).toContain('Request rejected.')
    expect(element.querySelector('button').textContent).toBe('retry')
    expect(element.querySelector('button').disabled).toBe(false)
    await act(async () => { element.querySelector('button').click() })
    expect(installMarket).toHaveBeenCalledTimes(2)
    expect(element.textContent).toContain('installing')
    expect(fetch.mock.calls.every(([path]) => path.endsWith('/status'))).toBe(true)
  })
})
