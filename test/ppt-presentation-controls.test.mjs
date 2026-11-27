import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import * as React from 'react'
import * as jsx from 'react/jsx-runtime'
import { expect, it, vi } from 'vitest'
const source = readFileSync('packages/ppt-runtime/adapter/lib/client.js', 'utf8')
function fixture() {
  let plugin, controls, selected = null, mode = null
  const effects = []
  const events = new EventTarget()
  events.__ModuleLoader__ = { load({ factory }) { plugin = factory(name => name === 'react' ? React : name === 'react/jsx-runtime' ? jsx : {}) } }
  vm.runInNewContext(source, { window: events, CustomEvent, AbortController, Error })
  const call = vi.fn(async (_route, endpoint, body) => {
    if (endpoint === 'presentation/mode') { mode = body.mode; selected = null }
    if (endpoint === 'template/select') { mode = body.mode; selected = body.templateId }
    return { ok: true, value: { status: 'ok', data: { presentationMode: mode, selectedTemplateId: selected, templates: [{ id: 'template-a' }] } } }
  })
  plugin.apply({ get: () => ({ rpc: { call } }), provide: (name, value) => { expect(name).toBe('desktopPresentation'); controls = value }, effect: run => effects.push(run()), locale: { register: () => () => {} }, slots: { inject: () => {} } })
  return { controls, call, dispose: () => effects.reverse().forEach(fn => fn?.()) }
}
it('updates the same presentation snapshot through the public RPC and notifies subscribers', async () => {
  const f = fixture(), changed = vi.fn()
  const unsubscribe = f.controls.subscribe('session', changed)
  try {
    expect(await f.controls.change('session', { mode: 'ppt', templateId: 'template-a' })).toBe(true)
    expect(f.controls.snapshot('session')).toMatchObject({ activeMode: 'ppt', selectedId: 'template-a', loading: false })
    expect(changed).toHaveBeenCalled()
    expect(f.controls.snapshot('another-session').selectedId).toBe(null)
    await f.controls.change('session', { mode: null })
    expect(f.controls.snapshot('session').activeMode).toBe(null)
  } finally { unsubscribe(); f.dispose() }
})
it('rejects missing sessions and cancelled or disposed operations before calling RPC', async () => {
  const f = fixture(), controller = new AbortController()
  controller.abort()
  await expect(f.controls.change('', { mode: 'ppt' })).rejects.toThrow('session')
  await expect(f.controls.change('session', { mode: 'ppt' }, controller.signal)).rejects.toThrow()
  f.dispose()
  await expect(f.controls.change('session', { mode: 'ppt' })).rejects.toThrow('session')
  expect(f.call).not.toHaveBeenCalled()
})
it('retains an actionable failure and clears loading when RPC rejects', async () => {
  const f = fixture()
  f.call.mockRejectedValueOnce(new Error('offline'))
  try {
    await expect(f.controls.change('session', { mode: 'ppt' })).rejects.toThrow('offline')
    expect(f.controls.snapshot('session')).toMatchObject({ loading: false, error: 'offline' })
  } finally { f.dispose() }
})
