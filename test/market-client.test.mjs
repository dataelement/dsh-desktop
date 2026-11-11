import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const code = await readFile(new URL('../packages/dsh-desktop-market-installer/client.js', import.meta.url), 'utf8')
const ok = value => ({ ok: true, value })
const bundle = (extra = {}) => ({ name: 'dshmarket', installed: true, availability: 'profile', enabled: true, removable: true, version: '1.66.47', ...extra })
const changed = (extra = {}) => ok({ changed: true, application: 'restart-required', stage: 'enable', target: 'dshmarket', enabled: true, ...extra })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve() }

function setup({ bundles = [], composed = false, language = 'en', desktop = {} } = {}) {
  let inventory = bundles
  let exported
  let dictionaries
  let style
  const slots = new Map()
  const disposers = []
  const events = new Map()
  const resetEvents = new Map()
  const listen = map => (name, callback) => { map.set(name, callback); return () => map.delete(name) }
  const fetch = vi.fn(() => { throw new Error('HTTP calls are forbidden, including calls without Origin') })
  const setTimeout = vi.fn(() => { throw new Error('Polling is forbidden') })
  const manager = {
    listBundles: vi.fn(async () => ok(inventory)),
    installBundle: vi.fn(async () => { inventory = [bundle()]; return changed() }),
    setBundleEnabled: vi.fn(async () => { inventory = [bundle()]; return changed() }),
    removeBundle: vi.fn(async () => { inventory = []; return changed({ stage: 'remove', enabled: false }) })
  }
  let activeRender
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => {
      const current = activeRender
      const index = current.index++
      if (!(index in current.state)) current.state[index] = initial
      return [current.state[index], value => { current.state[index] = typeof value === 'function' ? value(current.state[index]) : value }]
    },
    useEffect: effect => { if (!activeRender.mounted) activeRender.effects.push(effect) },
    useSyncExternalStore: (_subscribe, snapshot) => snapshot()
  }
  const document = {
    querySelector: () => style,
    createElement: () => ({ dataset: {}, remove: vi.fn(() => { style = undefined }) }),
    head: { appendChild: item => { style = item } }
  }
  const sandbox = { document, fetch, setTimeout, dshDesktop: desktop,
    __DSH_BOOT__: { entries: composed ? [{ id: 'dshmarket' }] : [] },
    window: { addEventListener: vi.fn(), removeEventListener: vi.fn(), __ModuleLoader__: { load({ factory }) { exported = factory(() => React) } } }
  }
  vm.runInNewContext(code, sandbox)
  const ctx = {
    remote: { pluginManager: manager, $on: listen(events) }, on: listen(resetEvents),
    effect: effect => { const dispose = effect(); if (typeof dispose === 'function') disposers.push(dispose) },
    locale: { register: (_ns, value) => { dictionaries = value }, bind: () => key => dictionaries[language][key] },
    slots: { inject: (_name, register) => register(), register: (options, Component) => { slots.set(options.id, { Component, props: options.inject() }) } }
  }
  exported.apply(ctx)
  const controller = slots.get(composed ? 'desktop-market-management' : 'market').props.controller
  const mount = id => {
    const { Component, props } = slots.get(id)
    const current = { index: 0, state: [], effects: [], mounted: false }
    return { render() {
      activeRender = current; current.index = 0
      const tree = Component(props)
      if (!current.mounted) { current.mounted = true; for (const effect of current.effects) effect() }
      return tree
    } }
  }
  return { manager, controller, slots, dictionaries: () => dictionaries, mount, events, resetEvents, fetch, setTimeout,
    inject: exported.inject, getStyle: () => style,
    dispose: () => {
      for (const dispose of disposers.reverse()) dispose()
      expect(fetch).not.toHaveBeenCalled()
      expect(setTimeout).not.toHaveBeenCalled()
    } }
}
function find(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => find(child, predicate))
  if (!node || typeof node !== 'object') return []
  return [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)]
}
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : ''
const button = (tree, label) => find(tree, node => node.type === 'button' && text(node) === label)[0]

describe('recommended market ordinary PluginManager client', () => {
  it('installs through the remote contract with no HTTP calls (including no-Origin calls) or polling', async () => {
    const app = setup()
    await flush()
    expect(app.inject).toContain('remote.pluginManager')
    expect(app.controller.getSnapshot().status.phase).toBe('absent')
    const page = app.mount('market')
    expect(text(page.render())).toContain('Recommended version · ^1.66.47')
    button(page.render(), 'Install plugin market').props.onClick()
    await flush()
    expect(app.manager.installBundle).toHaveBeenCalledExactlyOnceWith('dshmarket@^1.66.47', { enabled: true })
    expect(app.controller.getSnapshot().status).toMatchObject({ phase: 'installed', enabled: true, application: 'restart-required', installedVersion: '1.66.47' })
    expect(text(page.render())).toContain('Restart Harness once')
    expect(app.fetch).not.toHaveBeenCalled()
    expect(app.setTimeout).not.toHaveBeenCalled()
    app.dispose()
  })

  it('holds the busy state across changed events and ignores duplicate install/remove attempts', async () => {
    const app = setup()
    await flush()
    const pending = deferred()
    app.manager.installBundle.mockReturnValueOnce(pending.promise)
    const installing = app.controller.install()
    const page = app.mount('market')
    expect(button(page.render(), 'Install plugin market').props.disabled).toBe(true)
    await app.events.get('plugin-manager/changed')()
    expect(app.controller.getSnapshot().status.phase).toBe('installing')
    await app.controller.install()
    await app.controller.uninstall()
    expect(app.manager.installBundle).toHaveBeenCalledTimes(1)
    expect(app.manager.removeBundle).not.toHaveBeenCalled()
    pending.resolve(changed())
    await installing
    expect(app.controller.getSnapshot().status.phase).not.toBe('installing')
    app.dispose()
  })

  it.each(['failed', 'cancelled', 'overridden'])('does not mistake ok:true application=%s for installation success and allows retry', async application => {
    const app = setup()
    await flush()
    app.manager.installBundle.mockResolvedValueOnce(changed({ application, error: { code: 'operation-error', diagnostic: 'install rejected' } }))
    await app.controller.install()
    const page = app.mount('market')
    expect(text(page.render())).toContain('install rejected')
    expect(button(page.render(), 'Try again').props.disabled).toBe(false)
    await app.controller.install()
    expect(app.controller.getSnapshot().error).toBeUndefined()
    expect(app.controller.getSnapshot().status.enabled).toBe(true)
    app.dispose()
  })

  it.each([
    { ok: false, error: { code: 'remote-error', diagnostic: 'remote rejected' } },
    new Error('connection lost')
  ])('recovers from transport failure without staying busy', async result => {
    const app = setup()
    await flush()
    if (result instanceof Error) app.manager.installBundle.mockRejectedValueOnce(result)
    else app.manager.installBundle.mockResolvedValueOnce(result)
    await app.controller.install()
    expect(app.controller.getSnapshot().error).toMatch(/remote rejected|connection lost/)
    expect(app.controller.getSnapshot().status.phase).not.toBe('installing')
    await app.controller.install()
    expect(app.manager.installBundle).toHaveBeenCalledTimes(2)
    app.dispose()
  })

  it('enables an installed disabled market instead of reinstalling and distinguishes applied results', async () => {
    const app = setup({ bundles: [bundle({ enabled: false })] })
    await flush()
    const page = app.mount('market')
    expect(button(page.render(), 'Enable plugin market').props.disabled).toBe(false)
    app.manager.setBundleEnabled.mockImplementationOnce(async () => changed({ application: 'applied' }))
    await app.controller.install()
    expect(app.manager.setBundleEnabled).toHaveBeenCalledExactlyOnceWith('dshmarket', true)
    expect(app.manager.installBundle).not.toHaveBeenCalled()
    expect(app.controller.getSnapshot().status.application).toBe('applied')
    app.dispose()
  })

  it('refreshes inventory after manager changes and connection resets, ignoring stale reads', async () => {
    const app = setup()
    await flush()
    const stale = deferred()
    app.manager.listBundles.mockReturnValueOnce(stale.promise)
    const oldRefresh = app.events.get('plugin-manager/changed')()
    app.manager.listBundles.mockResolvedValueOnce(ok([bundle({ enabled: false })]))
    await app.resetEvents.get('connection/reset')()
    stale.resolve(ok([])); await oldRefresh
    expect(app.controller.getSnapshot().status).toMatchObject({ phase: 'installed', enabled: false })
    app.dispose()
  })

  it('reports inventory failures and repairs missing packages with installBundle', async () => {
    const app = setup({ bundles: [bundle({ availability: 'missing' })] })
    await flush()
    expect(app.controller.getSnapshot().status.phase).toBe('incomplete')
    app.manager.listBundles.mockResolvedValueOnce({ ok: false, error: { diagnostic: 'inventory unavailable' } })
    await app.controller.refresh()
    expect(app.controller.getSnapshot().error).toBe('inventory unavailable')
    await app.controller.install()
    expect(app.manager.installBundle).toHaveBeenCalledTimes(1)
    app.dispose()
  })

  it('uses ordinary removeBundle and retains its restart outcome without touching the desktop uninstall bridge', async () => {
    const uninstallMarket = vi.fn()
    const app = setup({ composed: true, bundles: [bundle()], desktop: { uninstallMarket } })
    await flush()
    const page = app.mount('desktop-market-management')
    expect(button(page.render(), 'Uninstall plugin market').props.disabled).toBe(false)
    const pending = deferred()
    app.manager.removeBundle.mockImplementationOnce(async () => { await pending.promise; return changed({ stage: 'remove', enabled: false }) })
    const removing = app.controller.uninstall()
    expect(button(page.render(), 'Uninstall plugin market').props.disabled).toBe(true)
    await app.controller.uninstall()
    expect(app.manager.removeBundle).toHaveBeenCalledExactlyOnceWith('dshmarket')
    pending.resolve(); await removing
    expect(app.controller.getSnapshot().status.application).toBe('restart-required')
    expect(uninstallMarket).not.toHaveBeenCalled()
    app.dispose()
  })

  it.each([
    changed({ application: 'failed', error: { diagnostic: 'remove failed' } }),
    changed({ changed: false }),
    { ok: false, error: { diagnostic: 'remove unavailable' } }
  ])('exposes failed/no-op removal and re-enables the uninstall action', async result => {
    const app = setup({ composed: true, bundles: [bundle()] })
    await flush()
    app.manager.removeBundle.mockResolvedValueOnce(result)
    await app.controller.uninstall()
    const page = app.mount('desktop-market-management')
    expect(text(page.render())).toContain('Plugin market could not be uninstalled.')
    expect(button(page.render(), 'Uninstall plugin market').props.disabled).toBe(false)
    expect(app.controller.getSnapshot().error).toBeTruthy()
    await app.controller.uninstall()
    expect(app.controller.getSnapshot().status.phase).toBe('uninstalled')
    expect(text(page.render())).toContain('Plugin market uninstalled')
    app.dispose()
  })

  it('cleans up events, style and subscriptions, and ignores pending operations after disposal', async () => {
    const app = setup()
    await flush()
    const notify = vi.fn()
    const unsubscribe = app.controller.subscribe(notify)
    await app.controller.refresh()
    expect(notify).toHaveBeenCalledTimes(1)
    unsubscribe()
    const pending = deferred()
    app.manager.installBundle.mockReturnValueOnce(pending.promise)
    const installing = app.controller.install()
    const snapshot = app.controller.getSnapshot()
    const style = app.getStyle()
    const reads = app.manager.listBundles.mock.calls.length
    app.dispose()
    pending.resolve(changed()); await installing
    expect(app.controller.getSnapshot()).toBe(snapshot)
    expect(app.manager.listBundles).toHaveBeenCalledTimes(reads)
    expect(app.events.size).toBe(0)
    expect(app.resetEvents.size).toBe(0)
    expect(style.remove).toHaveBeenCalledTimes(1)
    expect(app.getStyle()).toBeUndefined()
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('ignores pending inventory after disposal', async () => {
    const app = setup()
    await flush()
    const pending = deferred()
    app.manager.listBundles.mockReturnValueOnce(pending.promise)
    const refreshing = app.controller.refresh()
    const snapshot = app.controller.getSnapshot()
    app.dispose()
    pending.resolve(ok([bundle()])); await refreshing
    expect(app.controller.getSnapshot()).toBe(snapshot)
  })

  it('honors the host restartRequired flag even when the manager applied its persisted change', async () => {
    const app = setup()
    await flush()
    app.manager.installBundle.mockResolvedValueOnce(changed({ application: 'applied', restartRequired: true }))
    app.manager.listBundles.mockResolvedValueOnce(ok([bundle()]))
    await app.controller.install()
    expect(app.controller.getSnapshot().status.application).toBe('restart-required')
    expect(text(app.mount('market').render())).toContain('Restart Harness once')
    app.dispose()
  })

  it('offers enable in the composed management tab and respects a non-removable bundle', async () => {
    const app = setup({ composed: true, bundles: [bundle({ enabled: false, removable: false })] })
    await flush()
    const tree = app.mount('desktop-market-management').render()
    expect(button(tree, 'Uninstall plugin market').props.disabled).toBe(true)
    expect(button(tree, 'Enable plugin market').props.disabled).toBe(false)
    button(tree, 'Enable plugin market').props.onClick()
    await flush()
    expect(app.manager.setBundleEnabled).toHaveBeenCalledExactlyOnceWith('dshmarket', true)
    app.dispose()
  })

  it('keeps the built-in image market conflict guard', async () => {
    const desktop = {
      getBuiltInImageGenerationStatus: vi.fn(async () => ({ enabled: false, marketActive: true })),
      setBuiltInImageGenerationEnabled: vi.fn()
    }
    const app = setup({ desktop })
    const control = app.mount('desktop-host-plugins')
    control.render(); await flush()
    const tree = control.render()
    expect(find(tree, node => node.type === 'input')[0].props.disabled).toBe(true)
    expect(text(tree)).toContain('Disable the market version')
    expect(desktop.setBuiltInImageGenerationEnabled).not.toHaveBeenCalled()
    app.dispose()
  })

  it.each([
    [false, false, 'en'], [false, true, 'zh'], [true, false, 'zh'], [true, true, 'en']
  ])('offers explicit replacement in composed=%s enabled=%s locale=%s without changing selection', async (composed, enabled, language) => {
    const app = setup({ composed, language, bundles: [bundle({ version: '1.66.40', enabled })] })
    await flush()
    const copy = app.dictionaries()[language]
    const page = app.mount(composed ? 'desktop-market-management' : 'market')
    const label = copy.update + ' · dshmarket@^1.66.47'
    const pending = deferred()
    app.manager.installBundle.mockImplementationOnce(async () => {
      await pending.promise
      return changed({ application: 'applied', restartRequired: true, enabled })
    })
    button(page.render(), label).props.onClick()
    expect(app.controller.getSnapshot().status.phase).toBe('installing')
    expect(button(page.render(), label).props.disabled).toBe(true)
    expect(text(page.render())).toContain(copy.installing)
    await app.controller.update()
    expect(app.manager.installBundle).toHaveBeenCalledExactlyOnceWith('dshmarket@^1.66.47', { expectedName: 'dshmarket', replace: true, enabled })
    expect(app.manager.setBundleEnabled).not.toHaveBeenCalled()
    pending.resolve(); await flush()
    expect(app.controller.getSnapshot().status).toMatchObject({ phase: 'installed', enabled, application: 'restart-required' })
    expect(text(page.render())).toContain(copy.updateRestartHint)
    expect(button(page.render(), copy.restart)).toBeDefined()
    app.dispose()
  })

  it.each(['failed', 'cancelled', 'overridden'])('retains a disabled selection and permits retry after replacement application=%s', async application => {
    const app = setup({ composed: true, bundles: [bundle({ enabled: false })] })
    await flush()
    const page = app.mount('desktop-market-management')
    app.manager.installBundle.mockResolvedValueOnce(changed({ application, error: { diagnostic: 'replacement failed' } }))
    await app.controller.update()
    expect(app.controller.getSnapshot().status.enabled).toBe(false)
    expect(text(page.render())).toContain('Recommended plugin market update failed.')
    expect(text(page.render())).toContain('replacement failed')
    expect(button(page.render(), 'Update/reinstall recommended version · dshmarket@^1.66.47').props.disabled).toBe(false)
    app.manager.installBundle.mockResolvedValueOnce(changed({ application: 'applied', enabled: false }))
    await app.controller.update()
    expect(app.controller.getSnapshot().error).toBeUndefined()
    expect(text(page.render())).toContain('Recommended version updated; the enabled setting is preserved.')
    app.dispose()
  })

  it.each(['2.0.0', '3.1.0-beta.1', undefined, 'invalid'])('prevents recommended-major replacement for installed version %s', async version => {
    const app = setup({ bundles: [bundle({ version })] })
    await flush()
    const page = app.mount('market')
    expect(button(page.render(), 'Update/reinstall recommended version · dshmarket@^1.66.47').props.disabled).toBe(true)
    expect(text(page.render())).toContain('avoid a downgrade')
    await app.controller.update()
    expect(app.manager.installBundle).not.toHaveBeenCalled()
    app.dispose()
  })

  it.each(['zh', 'en'])('preserves the recommended entry and built-in image enable/restart behavior in %s', async language => {
    const desktop = {
      getBuiltInImageGenerationStatus: vi.fn(async () => ({ enabled: false, marketActive: false })),
      setBuiltInImageGenerationEnabled: vi.fn(async () => ({ ok: true })),
      restartHarness: vi.fn(async () => ({ ok: true }))
    }
    const app = setup({ language, desktop })
    await flush()
    const copy = app.dictionaries()[language]
    const page = app.mount('market')
    expect(text(page.render())).toContain(copy.community)
    expect(app.dictionaries().zh).toHaveProperty('enable')
    expect(Object.keys(app.dictionaries().zh).sort()).toEqual(Object.keys(app.dictionaries().en).sort())
    const control = app.mount('desktop-host-plugins')
    control.render(); await flush()
    const input = find(control.render(), node => node.type === 'input')[0]
    expect(input.props.disabled).toBe(false)
    await input.props.onChange({ preventDefault() {} })
    expect(desktop.setBuiltInImageGenerationEnabled).toHaveBeenCalledExactlyOnceWith(true)
    await button(control.render(), copy.builtInImageRestart).props.onClick()
    expect(desktop.restartHarness).toHaveBeenCalledTimes(1)
    app.dispose()
  })
})
