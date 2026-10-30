import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PluginManager } from '@deepseek-ai/dsh-plugin-manager'
import { parse } from 'yaml'
import { composeEntries, loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'
import { createGenerationPackageBackend } from '../packages/dsh-desktop-market-installer/generations/package-backend.mjs'

const roots = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function fixture({ selected = false, patch = '[]\n' } = {}) {
  const home = await mkdtemp(join(tmpdir(), 'dsh-manager-preflight-'))
  roots.push(home)
  const dir = join(home, 'profiles', 'web')
  const plugin = join(dir, 'node_modules', 'demo-plugin')
  await mkdir(plugin, { recursive: true })
  await mkdir(join(dir, '.dsh-market'), { recursive: true })
  await writeFile(join(plugin, 'package.json'), JSON.stringify({
    name: 'demo-plugin', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } }
  }))
  await writeFile(join(plugin, 'cordis.patch.yml'), '- insert:\n  - id: demo-row\n    name: demo-plugin\n')
  await writeFile(join(dir, 'package.json'), JSON.stringify({
    dependencies: { 'demo-plugin': '1.0.0' },
    dsh: { profile: { bundles: selected ? ['demo-plugin'] : [] } }
  }, null, 2) + '\n')
  await writeFile(join(dir, 'cordis.patch.yml'), patch)
  await writeFile(join(dir, '.dsh-market', 'state.json'), JSON.stringify({ disabled: selected ? [] : ['demo-plugin'], region: 'china' }))
  const backend = { ...createGenerationPackageBackend({
    dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused'
  }) }
  const manager = Object.assign(Object.create(PluginManager.prototype), {
    profile: { dir, name: 'web', installAnchor: resolve('node_modules/@deepseek-ai/dsh/package.json') },
    ownerContext: { get: name => name === 'profileBundlePackageBackend' ? backend : undefined, emit: vi.fn() },
    abort: new AbortController(),
    lockWaitMs: 1000,
    managementBundles: new Set(),
    reload: vi.fn(async () => ({ warnings: [] })),
    publishAndReload: vi.fn(async () => ({ warnings: [] }))
  })
  const bytes = () => Promise.all(['package.json', 'cordis.patch.yml', '.dsh-market/state.json'].map(file => readFile(join(dir, file), 'utf8')))
  const selection = async () => JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')).dsh.profile.bundles
  return { home, dir, plugin, manager, backend, bytes, selection }
}

describe('Plugin Manager switch preflight', () => {
  it('rejects before selection is saved, even when the mutation hook also rejects', async () => {
    const { manager, backend, bytes } = await fixture()
    const before = await bytes()
    backend.validateSwitch = vi.fn(async () => { throw new Error('invalid patch layer') })
    backend.switched = vi.fn(async () => { throw new Error('invalid patch layer') })
    const result = await manager.setBundleEnabled('demo-plugin', true)
    expect(result.application).toBe('failed')
    expect(await bytes()).toEqual(before)
    expect(backend.validateSwitch).toHaveBeenCalledWith({ name: 'demo-plugin', enabled: true, rowIds: ['demo-row'] })
    expect(backend.switched).not.toHaveBeenCalled()
  })

  it('validates metadata, then preflights, then saves, then records the switch', async () => {
    const { manager, backend, selection } = await fixture()
    const events = []
    const bundleRows = manager.bundleRows.bind(manager)
    manager.bundleRows = name => { events.push('metadata'); return bundleRows(name) }
    backend.validateSwitch = vi.fn(async request => {
      expect(request).toEqual({ name: 'demo-plugin', enabled: true, rowIds: ['demo-row'] })
      expect(await selection()).toEqual([])
      events.push('validate')
    })
    backend.switched = vi.fn(async request => {
      expect(request).toEqual({ name: 'demo-plugin', enabled: true, rowIds: ['demo-row'] })
      expect(await selection()).toEqual(['demo-plugin'])
      events.push('switched')
    })
    expect((await manager.setBundleEnabled('demo-plugin', true)).application).toBe('restart-required')
    expect(events.indexOf('metadata')).toBeLessThan(events.indexOf('validate'))
    expect(events.indexOf('validate')).toBeLessThan(events.indexOf('switched'))
    expect(backend.validateSwitch).toHaveBeenCalledTimes(1)
    expect(backend.switched).toHaveBeenCalledTimes(1)
  })

  it('retains original bundle and protected-manager guards before either backend hook', async () => {
    const { manager, backend, bytes } = await fixture({ selected: true })
    const before = await bytes()
    backend.validateSwitch = vi.fn(async () => { throw new Error('wrong error precedence') })
    backend.switched = vi.fn()
    manager.managementBundles.add('demo-plugin')
    const protectedResult = await manager.setBundleEnabled('demo-plugin', false)
    expect(protectedResult.application).toBe('failed')
    expect(JSON.stringify(protectedResult.error)).toContain('management-required')
    const missingResult = await manager.setBundleEnabled('missing-plugin', true)
    expect(missingResult.application).toBe('failed')
    expect(missingResult.error.code).toBe('operation-error')
    expect(missingResult.error.diagnostic).toContain('cannot resolve profile bundle')
    expect(await bytes()).toEqual(before)
    expect(backend.validateSwitch).not.toHaveBeenCalled()
    expect(backend.switched).not.toHaveBeenCalled()
  })

  it('does not bypass metadata validation when a bundle patch is broken', async () => {
    const { manager, backend, plugin, bytes } = await fixture()
    await writeFile(join(plugin, 'cordis.patch.yml'), '- insert: [\n')
    const before = await bytes()
    backend.validateSwitch = vi.fn()
    backend.switched = vi.fn()
    expect((await manager.setBundleEnabled('demo-plugin', true)).application).toBe('failed')
    expect(await bytes()).toEqual(before)
    expect(backend.validateSwitch).not.toHaveBeenCalled()
    expect(backend.switched).not.toHaveBeenCalled()
  })

  it('does not call the mutating hook as a fallback when validation is unsupported', async () => {
    const { manager, backend } = await fixture()
    delete backend.validateSwitch
    backend.switched = vi.fn()
    expect((await manager.setBundleEnabled('demo-plugin', true)).application).toBe('restart-required')
    expect(backend.switched).toHaveBeenCalledTimes(1)
    expect(backend.switched).toHaveBeenCalledWith({ name: 'demo-plugin', enabled: true, rowIds: ['demo-row'] })
  })

  it('leaves direct selection callers outside the switch hook contract', async () => {
    const { manager, backend, selection } = await fixture({ selected: true })
    backend.validateSwitch = vi.fn(async () => { throw new Error('not a switch operation') })
    backend.switched = vi.fn()
    await manager.selectBundle('demo-plugin', false)
    expect(await selection()).toEqual([])
    expect(backend.validateSwitch).not.toHaveBeenCalled()
    expect(backend.switched).not.toHaveBeenCalled()
  })

  for (const patch of ['- id: demo-row\n  config: [\n', '- id: demo-row\n  disabled: true\n  disabled: false\n']) {
    for (const selected of [false, true]) {
      for (const enabled of [false, true]) {
        it(`preserves all profile bytes for invalid YAML ${JSON.stringify(patch)} (${selected} -> ${enabled})`, async () => {
          const { manager, bytes } = await fixture({ selected, patch })
          const before = await bytes()
          const result = await manager.setBundleEnabled('demo-plugin', enabled)
          expect(result.application).toBe('failed')
          expect(result.changed).toBe(false)
          expect(await bytes()).toEqual(before)
        })
      }
    }
  }

  it('keeps custom config on its original row in actual Harness profile composition', async () => {
    const { manager, dir, plugin } = await fixture({ patch: '- id: unrelated\n- id: demo-row\n  disabled: true\n  config:\n    retained: custom-value\n' })
    await writeFile(join(plugin, 'cordis.patch.yml'), '- insert:\n  - id: unrelated\n    name: unrelated-plugin\n    config: { retained: baseline }\n  - id: demo-row\n    name: demo-plugin\n    config: { retained: default }\n')
    expect((await manager.setBundleEnabled('demo-plugin', true)).application).toBe('restart-required')
    const profile = loadProfileDirectory('dsh', dir, resolve('node_modules/@deepseek-ai/dsh/package.json'))
    const warnings = []
    const entries = composeEntries([...profile.layers.map(layer => layer.patches), profile.patches], warning => warnings.push(warning))
    expect(warnings).toEqual([])
    expect(entries.find(entry => entry.id === 'unrelated').config).toEqual({ retained: 'baseline' })
    expect(entries.find(entry => entry.id === 'demo-row').config).toEqual({ retained: 'custom-value' })
    expect(profile.layers.map(layer => layer.packageName)).toEqual(['demo-plugin'])
  })

  it('uses the real backend to preserve custom config while enabling and disabling', async () => {
    const { manager, dir } = await fixture({ patch: '- id: unrelated\n- id: demo-row\n  disabled: true\n  config:\n    retained: custom-value\n' })
    expect((await manager.setBundleEnabled('demo-plugin', true)).application).toBe('restart-required')
    const expected = [{ id: 'unrelated' }, { id: 'demo-row', config: { retained: 'custom-value' } }]
    expect(parse(await readFile(join(dir, 'cordis.patch.yml'), 'utf8'))).toEqual(expected)
    await writeFile(join(dir, 'cordis.patch.yml'), '- id: unrelated\n- id: demo-row\n  disabled: false\n  config:\n    retained: custom-value\n')
    expect((await manager.setBundleEnabled('demo-plugin', false)).application).toBe('restart-required')
    expect(parse(await readFile(join(dir, 'cordis.patch.yml'), 'utf8'))).toEqual(expected)
  })
})
