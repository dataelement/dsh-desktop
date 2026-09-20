import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { Context } from '@deepseek-ai/cordis'
import AgentDefaultModelConfig, { AGENT_DEFAULT_MODEL_SETTINGS_SCHEMA } from '@deepseek-ai/dsh-agent-default-model'
import { buildModelCatalog } from '../node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/catalog.js'
import sessionRemote from '@deepseek-ai/dsh-api-session-controller/remote'
import { describe, expect, it, vi } from 'vitest'

const enterprise = { provider: 'bisheng-enterprise', model: 'bisheng:5' }
const gateway = { provider: 'gateway', model: 'deepseek-v4-pro' }
const previous = { provider: 'gateway', model: 'qwen', reasoningEffort: 'high' }
function createSnapshotStore(value) {
  const listeners = new Set()
  return {
    getSnapshot: () => value,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    set(next) { value = next; for (const listener of listeners) listener() },
    update(change) { const next = structuredClone(value); change(next); this.set(next) }
  }
}
const source = await readFile(new URL('../node_modules/@deepseek-ai/dsh-client-ui-model-selection/lib/client.js', import.meta.url), 'utf8')
let client
vm.runInNewContext(source, { window: { __ModuleLoader__: { load(definition) {
  client = definition.factory(id => id === '@deepseek-ai/dsh-client-store' ? { createSnapshotStore } : id === '@deepseek-ai/cordis' ? { Service: class {} } : {})
} } } })
const settle = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)) }

function fixture({ fallback = previous, defaults = enterprise, groups, connected = true, delay = false, fail = false, projection = enterprise } = {}) {
  const external = [{ id: 'gateway', name: 'Gateway', models: [{ id: 'deepseek-v4-pro', name: 'DeepSeek' }, { id: 'qwen', name: 'Qwen', reasoning: { efforts: [{ id: 'high', name: 'High' }] } }] }]
  const enterpriseGroup = { id: enterprise.provider, name: 'Enterprise', models: [{ id: enterprise.model, name: 'Enterprise model' }] }
  const value = { default: defaults, fallback, groups: groups ?? [...external, ...(connected ? [enterpriseGroup] : [])], routableProviders: ['gateway', ...(connected ? [enterprise.provider] : [])], failures: [] }
  const catalog = { store: createSnapshotStore({ status: 'ready', value, error: null }), load: async () => catalog.store.getSnapshot().value }
  const projected = createSnapshotStore({ next: projection, lastUsed: projection })
  const pending = []
  const selectModel = vi.fn(async ({ sessionId, ...selected }) => {
    if (delay) await new Promise(resolve => pending.push(resolve))
    if (fail) return { ok: false, error: { code: 'unavailable', message: 'Retry' } }
    projected.set({ next: selected, lastUsed: projection })
    return { ok: true, value: { selected } }
  })
  const directory = new client.ModelDirectory({ selectModel }, 'session-1', () => true, catalog, projected)
  const expire = () => catalog.store.set({ status: 'ready', value: { ...value, groups: value.groups.filter(group => group.id !== enterprise.provider), routableProviders: ['gateway'] }, error: null })
  return { directory, projected, catalog, selectModel, expire, release: () => pending.shift()?.() }
}

describe('enterprise model selection recovery', () => {
  it('clears the expired selection immediately and commits the previous model before unblocking input', async () => {
    const app = fixture({ delay: true })
    expect(app.directory.store.getSnapshot().current).toEqual(enterprise)
    app.expire()
    expect(app.directory.store.getSnapshot()).toMatchObject({ current: null, routable: false })
    await settle()
    expect(app.selectModel).toHaveBeenCalledWith({ sessionId: 'session-1', ...previous })
    app.release(); await settle()
    expect(app.directory.store.getSnapshot()).toMatchObject({ current: previous, routable: true })
    app.directory.dispose()
  })

  it('recovers an expired default on a new conversation after restart', async () => {
    const app = fixture({ connected: false, projection: null })
    await settle()
    expect(app.selectModel).toHaveBeenCalledWith({ sessionId: 'session-1', ...previous })
    expect(app.directory.store.getSnapshot().current).toEqual(previous)
    app.directory.dispose()
  })

  it('uses the available default when the previous model was removed', async () => {
    const app = fixture({ connected: false, fallback: { provider: 'removed', model: 'old' }, defaults: gateway })
    await settle()
    expect(app.directory.store.getSnapshot().current).toEqual(gateway)
    app.directory.dispose()
  })

  it('uses an available external model for legacy settings without preference history', async () => {
    const app = fixture({ connected: false, fallback: null })
    await settle()
    expect(app.directory.store.getSnapshot().current).toEqual(gateway)
    app.directory.dispose()
  })

  it('shows an empty blocked selection when every external model is unavailable', async () => {
    const app = fixture({ connected: false, groups: [] })
    await settle()
    expect(app.directory.store.getSnapshot()).toMatchObject({ current: null, routable: false })
    expect(app.selectModel).not.toHaveBeenCalled()
    app.directory.dispose()
  })

  it('keeps a healthy enterprise selection and a user-selected external model', async () => {
    for (const projection of [enterprise, gateway]) {
      const app = fixture({ projection })
      await settle()
      expect(app.directory.store.getSnapshot().current).toEqual(projection)
      expect(app.selectModel).not.toHaveBeenCalled()
      app.directory.dispose()
    }
  })

  it('keeps input blocked after a rejected fallback and permits an explicit retry', async () => {
    const app = fixture({ connected: false, fail: true })
    await settle()
    expect(app.directory.store.getSnapshot()).toMatchObject({ current: null, routable: false, status: 'error' })
    expect(app.selectModel).toHaveBeenCalledTimes(1)
    app.selectModel.mockImplementationOnce(async ({ sessionId, ...selected }) => {
      app.projected.set({ next: selected, lastUsed: enterprise })
      return { ok: true, value: { selected } }
    })
    await app.directory.select(gateway)
    expect(app.directory.store.getSnapshot()).toMatchObject({ current: gateway, routable: true })
    app.directory.dispose()
  })

  it('recovers when one authorized enterprise model is removed while other models remain', async () => {
    const app = fixture({ groups: [{ id: 'gateway', name: 'Gateway', models: [{ id: gateway.model, name: 'DeepSeek' }] }, { id: enterprise.provider, name: 'Enterprise', models: [{ id: 'bisheng:8', name: 'Another model' }] }] })
    await settle()
    expect(app.directory.store.getSnapshot().current).toEqual(gateway)
    app.directory.dispose()
  })

  it('preserves selection while a routed enterprise catalog has a temporary lookup failure', async () => {
    const app = fixture()
    const value = app.catalog.store.getSnapshot().value
    app.catalog.store.set({ status: 'ready', value: { ...value, groups: value.groups.filter(group => group.id !== enterprise.provider), failures: [{ id: enterprise.provider, name: 'Enterprise', message: 'Timeout' }] }, error: null })
    await settle()
    expect(app.selectModel).not.toHaveBeenCalled()
    expect(app.directory.store.getSnapshot().current).toEqual(enterprise)
    app.directory.dispose()
  })

  it('serializes automatic recovery before a newer manual selection', async () => {
    const app = fixture({ connected: false, delay: true })
    await settle()
    const manual = app.directory.select(gateway)
    expect(app.selectModel).toHaveBeenCalledTimes(1)
    app.release(); await settle()
    expect(app.selectModel).toHaveBeenCalledTimes(2)
    app.release(); await manual; await settle()
    expect(app.projected.getSnapshot().next).toEqual(gateway)
    expect(app.directory.store.getSnapshot().current).toEqual(gateway)
    app.directory.dispose()
  })

  it('discards obsolete reasoning effort when falling back to a changed model', async () => {
    const app = fixture({ connected: false, fallback: { ...gateway, reasoningEffort: 'retired' } })
    await settle()
    expect(app.selectModel).toHaveBeenCalledWith({ sessionId: 'session-1', ...gateway })
    app.directory.dispose()
  })
})

describe('durable model preference', () => {
  it('accepts existing settings without a previous provider preference', () => {
    expect(AGENT_DEFAULT_MODEL_SETTINGS_SCHEMA({ ...gateway })).toEqual(gateway)
  })
  it('retains the previous provider across enterprise model changes and host restarts', async () => {
    let saved = { ...previous }
    const open = async () => {
      const ctx = new Context()
      ctx.provide('settings', {
        installSection(_ctx, _namespace, _schema, _entry, options) { options.setSource(() => saved) },
        replace: async (_namespace, next) => { saved = AGENT_DEFAULT_MODEL_SETTINGS_SCHEMA(structuredClone(next)) }
      })
      const fiber = await ctx.plugin(AgentDefaultModelConfig, gateway)
      return { service: ctx.agentDefaultModel, close: () => fiber.dispose() }
    }
    let host = await open()
    await host.service.saveSelection(enterprise)
    await host.service.saveSelection({ ...enterprise, model: 'bisheng:8' })
    expect(host.service.fallbackSelection(enterprise.provider)).toEqual(previous)
    await host.close(); host = await open()
    expect(host.service.fallbackSelection(enterprise.provider)).toEqual(previous)
    await host.close()
  })

  it('passes the fallback through the host catalog and strict remote contract', async () => {
    const catalog = await buildModelCatalog({ agentDefaultModel: { currentSelection: () => enterprise, fallbackSelection: () => previous }, llm: { listProviders: () => [] } })
    expect(catalog.fallback).toEqual(previous)
    const descriptor = sessionRemote.descriptors.find(item => item.method === 'modelCatalog')
    expect(descriptor.result.schema.parse(catalog).fallback).toEqual(previous)
  })

  it('preserves the recovery preference in the actual browser RPC codec', async () => {
    const source = await readFile(new URL('../node_modules/@deepseek-ai/dsh-api-remotes/lib/client.js', import.meta.url), 'utf8')
    let plugin
    vm.runInNewContext(source, { window: { __ModuleLoader__: { load: definition => { plugin = definition.factory(() => ({})) } } } })
    const descriptors = []
    await plugin.apply({ remote: { $mount: async contribution => { descriptors.push(...contribution.descriptors); return async () => {} } } })
    const descriptor = descriptors.find(item => item.namespace === 'session' && item.method === 'modelCatalog')
    const value = { default: enterprise, fallback: previous, groups: [], failures: [], routableProviders: [] }
    expect(descriptor.result.schema.parse(value).fallback).toEqual(previous)
  })
})
