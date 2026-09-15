import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

describe('Office settings client lifecycle', () => {
  it('loads newly advertised bundles through the real module system while retaining existing state', async () => {
    let definition
    vm.runInNewContext(await readFile(new URL('../node_modules/@deepseek-ai/dsh-client-modules/lib/client.js', import.meta.url), 'utf8'), {
      window: { __ModuleLoader__: { load: value => { definition = value } } }
    })
    const { ClientModuleSystem, parseBootManifest } = definition.factory()
    const core = { draft: 'Keep this unsent draft' }
    const target = { mode: 'queue', pendingQueue: [] }
    const graph = ids => ({
      rev: ids.join(','),
      entries: ids.map(id => ({ id, rev: '1', url: `/plugins/${id}?rev=1`, ...(id === 'dsh-office' ? { external: ['dsh-ppt-composer/client'] } : {}) })),
      batches: [{ phase: 'application', rev: '1', url: '/plugins/combined.js', entries: ids }]
    })
    const arrivals = []
    const modules = new ClientModuleSystem({
      manifest: parseBootManifest(graph(['core'])), staticModules: {},
      bootstrapModule: { id: 'core', exports: core }, registrationTarget: target,
      loadBundle: async url => {
        arrivals.push(url)
        const id = url.slice('/plugins/'.length).split('?')[0]
        target.load({ id, factory: require => id === 'dsh-office' ? { ppt: require('dsh-ppt-composer/client') } : { ready: true } })
      }
    })
    modules.updateGraph(graph(['core', 'dsh-ppt-composer', 'dsh-office']))
    expect((await modules.import('dsh-office')).ppt.ready).toBe(true)
    expect(arrivals).toEqual(['/plugins/dsh-ppt-composer?rev=1', '/plugins/dsh-office?rev=1'])
    expect(await modules.import('core')).toBe(core)
    expect(() => modules.updateGraph({})).toThrow()
    expect(await modules.import('core')).toBe(core)
  })

  it.each([false, true])('registers one switch and restores Office occupants (cold disabled client: %s)', async cold => {
    const source = await readFile(new URL('../packages/dsh-desktop-office-controls/client.js', import.meta.url), 'utf8')
    let definition, registration
    let server = { phase: 'idle', enabled: !cold, applied: !cold, generation: 0 }
    let fail = false
    const interval = vi.fn()
    const requests = []
    vm.runInNewContext(source, {
      window: { __ModuleLoader__: { load: value => { definition = value } } },
      document: { createElement: () => ({ dataset: {}, remove() {} }), head: { appendChild() {} } },
      setInterval: interval, clearInterval() {},
      fetch: async (url, options) => {
        requests.push(options)
        if (fail) throw new Error('offline')
        if (url.endsWith('?clients=1')) return { ok: true, json: async () => ({ plugins: [{ id: 'dsh-ppt-composer' }, { id: 'dsh-office' }] }) }
        if (options.method === 'POST') {
          const { enabled } = JSON.parse(options.body)
          server = { ...server, enabled, applied: enabled, generation: server.generation + 1 }
        }
        return { ok: true, json: async () => server }
      }
    })
    const element = (type, props, ...children) => typeof type === 'function'
      ? type({ ...props, children }) : ({ type, props: { ...props, children } })
    const React = {
      createElement: element,
      useSyncExternalStore: (_subscribe, snapshot) => snapshot()
    }
    let nativeDefinition
    vm.runInNewContext(await readFile(new URL('../node_modules/@deepseek-ai/dsh-client-ui-settings-plugins/lib/client.js', import.meta.url), 'utf8'), {
      window: { __ModuleLoader__: { load: value => { nativeDefinition = value } } }
    })
    const native = nativeDefinition.factory(name => {
      if (name === 'react') return React
      if (name === 'react/jsx-runtime') return {
        jsx: (type, { children, ...props }) => element(type, props, children),
        jsxs: (type, { children, ...props }) => element(type, props, ...children)
      }
      if (name === '@deepseek-ai/dsh-client-ui-primitives') return {
        Switch: props => element('button', { ...props, role: 'switch' })
      }
      return {}
    })
    const plugin = definition.factory(name => name === 'react' ? React : native)
    const entry = name => ({
      options: { name }, disabled: false,
      async update({ disabled }) { this.disabled = disabled }
    })
    const entries = (cold ? ['unrelated'] : ['dsh-ppt-composer', 'dsh-office', 'unrelated']).map(entry)
    const disposers = []
    plugin.apply({
      loader: { await: async () => {}, entries: () => entries, create: async ({ name }) => { entries.push(entry(name)) } },
      modules: { updateGraph: graph => graph },
      effect: effect => { const dispose = effect(); disposers.push(dispose); return dispose },
      locale: { register: () => () => {}, bind: () => key => key },
      slots: { inject: (_name, callback) => callback(), register: (config, component) => {
        registration = { config, component }; return () => {}
      } }
    })
    const { store, t } = registration.config.inject()
    await store.refresh()
    expect(registration.config.name).toBe('settings.plugin.control')
    expect(interval).toHaveBeenCalledOnce()
    const allNodes = node => [node, ...node.props.children.filter(child => child && typeof child === 'object').flatMap(allNodes)]
    const before = allNodes(registration.component({ store, t }))
    expect(before.filter(node => node.props.role === 'switch')).toHaveLength(1)
    await store.set(false)
    expect(entries.map(entry => entry.disabled)).toEqual(cold ? [false] : [true, true, false])
    expect(requests.find(request => request.method === 'POST').credentials).toBe('same-origin')
    expect(allNodes(registration.component({ store, t })).find(node => node.props.role === 'switch').props.checked).toBe(false)
    fail = true
    await store.set(true)
    expect(store.snapshot().state.enabled).toBe(false)
    expect(store.snapshot().error).toBeDefined()
    fail = false
    await store.set(true)
    expect(entries.map(entry => entry.disabled)).toEqual([false, false, false])
    disposers.forEach(dispose => dispose?.())
  })
})
