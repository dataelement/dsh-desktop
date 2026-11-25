import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PluginManager } from '@deepseek-ai/dsh-plugin-manager'
import { TYPERT } from '@deepseek-ai/dsh-plugin-manager/typert'
import remote from '@deepseek-ai/dsh-plugin-manager/remote'
import { createGenerationPackageBackend } from '../packages/dsh-desktop-market-installer/generations/package-backend.mjs'
import { readDesired } from '../packages/dsh-desktop-market-installer/generations/registry.mjs'

// Manager 0.2.2-rc.1 compatibility regression; remove when upstream supports deferred backend publication.
const roots = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})
const patch = '- insert:\n  - id: new-row\n    name: demo-plugin\n'
const verified = { expectedName: 'demo-plugin', expectedVersion: '2.0.0', npmIntegrity: 'sha512-reviewed', replace: true }

async function writeBundle(directory, { name = 'demo-plugin', version = '2.0.0', content = patch, engines, bundle = { patch: 'cordis.patch.yml' } } = {}) {
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name, version, engines, dsh: { bundle } }))
  await writeFile(join(directory, 'cordis.patch.yml'), content)
}

async function fixture({ installed = true, restartRequired = installed, replaced = installed, candidate = {}, legacyPatch = '[]\n', generationBackend = false } = {}) {
  const home = await mkdtemp(join(tmpdir(), 'dsh-manager-deferred-'))
  roots.push(home)
  const dir = join(home, 'profiles', 'web')
  const legacy = join(dir, 'node_modules', 'demo-plugin')
  const generation = join(home, 'generation', 'node_modules', 'demo-plugin')
  await mkdir(dir, { recursive: true })
  const initial = JSON.stringify({ dependencies: installed ? { 'demo-plugin': '1.0.0' } : {}, dsh: { profile: { bundles: [] } } })
  await writeFile(join(dir, 'package.json'), initial)
  if (installed) await writeBundle(legacy, { version: '1.0.0', content: legacyPatch })
  const rollback = vi.fn(async () => { await writeFile(join(dir, 'package.json'), initial) })
  const backend = generationBackend ? createGenerationPackageBackend({
    dshHome: home, nodeExecutablePath: process.execPath, pnpmEntryPath: 'unused',
    fetchImpl: async () => Response.json({ dist: { integrity: verified.npmIntegrity } }),
    runInstall: async staging => {
      await writeBundle(join(staging, 'node_modules', 'demo-plugin'), candidate)
      await writeFile(join(staging, 'package.json'), JSON.stringify({ dependencies: { 'demo-plugin': '2.0.0' } }))
      await writeFile(join(staging, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
      return { code: 0, output: 'installed\n' }
    }
  }) : {
    supportsVerifiedInstall: true,
    install: vi.fn(async () => {
      await writeBundle(generation, candidate)
      const manifest = JSON.parse(initial)
      manifest.dependencies['demo-plugin'] = '2.0.0'
      await writeFile(join(dir, 'package.json'), JSON.stringify(manifest))
      if (!installed) {
        await mkdir(join(dir, 'node_modules'), { recursive: true })
        await symlink(generation, legacy, process.platform === 'win32' ? 'junction' : 'dir')
      }
      return { bundle: 'demo-plugin', bundleDirectory: generation, restartRequired, replaced, rollback, packageResult: { exitCode: 0, output: '', truncated: false, logPath: join(home, 'install.log') } }
    })
  }
  const hmr = {
    runExclusive: vi.fn(async operation => operation()),
    reconcileProfile: vi.fn(async () => ({ warnings: [], pending: [] }))
  }
  // Exercise the actual manager transaction, file snapshots, selection, patch composition and HMR boundary.
  const manager = Object.assign(Object.create(PluginManager.prototype), {
    profile: { dir, name: 'web', startedBundles: [], installAnchor: resolve('node_modules/@deepseek-ai/dsh/package.json') },
    ownerContext: { get: name => name === 'profileBundlePackageBackend' ? backend : name === 'hmr' ? hmr : undefined, emit: vi.fn(), parallel: vi.fn(async () => {}) },
    abort: new AbortController(), installs: new Map(), installedFrom: new Map(), packageOperations: new Set(),
    managementBundles: new Set(), ownerEntryId: 'include:manager', lockWaitMs: 1000
  })
  return { home, dir, legacy, generation, manager, backend, rollback, hmr, initial }
}

describe('Plugin Manager deferred backend publication', () => {
  it('validates and selects the new generation while leaving the old real directory and HMR untouched', async () => {
    const { manager, dir, legacy, backend, hmr } = await fixture({ legacyPatch: '[invalid' })
    const result = await manager.installBundle('demo-plugin@2.0.0', verified)
    expect(result).toMatchObject({ application: 'restart-required', restartRequired: true, restartReason: 'package-moved', bundle: 'demo-plugin', version: '2.0.0' })
    expect(JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')).dsh.profile.bundles).toEqual(['demo-plugin'])
    expect((await lstat(legacy)).isSymbolicLink()).toBe(false)
    expect(JSON.parse(await readFile(join(legacy, 'package.json'), 'utf8')).version).toBe('1.0.0')
    expect(hmr.reconcileProfile).not.toHaveBeenCalled()
    expect(backend.install).toHaveBeenCalledWith(expect.objectContaining({ expectedName: verified.expectedName, expectedVersion: verified.expectedVersion, npmIntegrity: verified.npmIntegrity }))
    expect(manager.listApplications()).toMatchObject([{ application: 'restart-required', restartRequired: true }])
  })

  it.each([{ restartRequired: true, replaced: false }, { restartRequired: false, replaced: true }])('defers either explicit restart or generic replacement (%j)', async flags => {
    const { manager, hmr } = await fixture(flags)
    expect(await manager.installBundle('demo-plugin@2.0.0', verified)).toMatchObject({ application: 'restart-required', restartRequired: true })
    expect(hmr.reconcileProfile).not.toHaveBeenCalled()
  })

  it.each([
    [{ version: '3.0.0' }, 'expectedVersion'],
    [{ name: 'other-plugin' }, 'expectedName'],
    [{ content: '[invalid' }, undefined],
    [{ bundle: {} }, undefined],
    [{ content: '- insert:\n  - id: duplicate\n    name: demo-plugin\n    name: duplicate-plugin\n' }, undefined],
    [{ bundle: { patch: 'cordis.patch.yml', platforms: ['unsupported-platform'] } }, undefined]
  ])('rolls back candidate verification/selection failure (%j)', async (candidate, diagnostic) => {
    const { manager, rollback, dir, initial, legacy, hmr } = await fixture({ candidate })
    const result = await manager.installBundle('demo-plugin@2.0.0', verified)
    expect(result.application).toBe('failed')
    if (diagnostic) expect(result.error.diagnostic).toContain(diagnostic)
    expect(rollback).toHaveBeenCalledOnce()
    expect(await readFile(join(dir, 'package.json'), 'utf8')).toBe(initial)
    expect(JSON.parse(await readFile(join(legacy, 'package.json'), 'utf8')).version).toBe('1.0.0')
    expect(hmr.reconcileProfile).not.toHaveBeenCalled()
  })

  it('restores Profile snapshots even when backend rollback throws and preserves both errors', async () => {
    const { manager, rollback, dir, initial, hmr } = await fixture({ candidate: { version: '3.0.0' } })
    const rollbackFailure = new Error('Concurrent pending generation prevents cleanup. Restart required.')
    rollback.mockRejectedValue(rollbackFailure)
    let failure
    const change = manager.change.bind(manager)
    vi.spyOn(manager, 'change').mockImplementation((operation, ...args) => change(async result => {
      try { return await operation(result) } catch (error) { failure = error; throw error }
    }, ...args))
    const result = await manager.installBundle('demo-plugin@2.0.0', verified)
    expect(result.application).toBe('failed')
    expect(failure).toBeInstanceOf(AggregateError)
    expect(failure.errors).toHaveLength(2)
    expect(failure.errors[0].message).toContain('expectedVersion')
    expect(failure.errors[1]).toBe(rollbackFailure)
    expect(failure.cause).toBe(failure.errors[0])
    expect(result.error.diagnostic).toContain('expectedVersion')
    expect(result.error.diagnostic).toContain(rollbackFailure.message)
    expect(await readFile(join(dir, 'package.json'), 'utf8')).toBe(initial)
    expect(rollback).toHaveBeenCalledOnce()
    expect(hmr.reconcileProfile).not.toHaveBeenCalled()
  })

  it('applies a new install through normal HMR with row ids from its generation', async () => {
    const { manager, dir, hmr } = await fixture({ installed: false })
    expect(await manager.installBundle('demo-plugin@2.0.0', verified)).toMatchObject({ application: 'applied', version: '2.0.0' })
    expect(hmr.reconcileProfile).toHaveBeenCalledWith(['new-row'])
    expect(JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')).dsh.profile.bundles).toEqual(['demo-plugin'])
  })

  it('integrates with the actual generation backend over a legacy real directory', async () => {
    const { manager, legacy, hmr, home } = await fixture({ generationBackend: true })
    expect(await manager.installBundle('demo-plugin@2.0.0', verified)).toMatchObject({ application: 'restart-required', restartRequired: true, version: '2.0.0' })
    expect(await readDesired(home)).toHaveLength(1)
    expect((await lstat(legacy)).isSymbolicLink()).toBe(false)
    expect(JSON.parse(await readFile(join(legacy, 'package.json'), 'utf8')).version).toBe('1.0.0')
    expect(hmr.reconcileProfile).not.toHaveBeenCalled()
  })

  it('retains compatibility evaluation of the new manifest under the advisory Desktop policy', async () => {
    const { manager } = await fixture({ candidate: { engines: { dsh: '>999999.0.0' } } })
    const warning = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    try {
      expect(await manager.installBundle('demo-plugin@2.0.0', verified)).toMatchObject({ application: 'restart-required' })
      expect(warning.mock.calls.flat().join('')).toContain('>999999.0.0')
    } finally { warning.mockRestore() }
  })

  it('uses the original resolver fallback when a backend supplies no bundleDirectory', async () => {
    const { manager, backend, hmr } = await fixture({ installed: false })
    const install = backend.install.getMockImplementation()
    backend.install.mockImplementation(async request => {
      const mutation = await install(request)
      delete mutation.bundleDirectory
      return mutation
    })
    expect(await manager.installBundle('demo-plugin@2.0.0', verified)).toMatchObject({ application: 'applied', version: '2.0.0' })
    expect(hmr.reconcileProfile).toHaveBeenCalledWith(['new-row'])
  })

  it('rolls back the actual generation registry when manager verification rejects the new manifest', async () => {
    const { manager, backend, home, dir, initial, legacy, hmr } = await fixture({ generationBackend: true })
    const install = backend.install.bind(backend)
    const wrapped = { ...backend, install: async request => {
      const mutation = await install(request)
      await writeBundle(mutation.bundleDirectory, { version: '3.0.0' })
      return mutation
    } }
    const get = manager.ownerContext.get
    manager.ownerContext.get = name => name === 'profileBundlePackageBackend' ? wrapped : get(name)
    expect(await manager.installBundle('demo-plugin@2.0.0', verified)).toMatchObject({ application: 'failed', error: { diagnostic: expect.stringContaining('expectedVersion') } })
    expect(await readDesired(home)).toEqual([])
    expect(await readFile(join(dir, 'package.json'), 'utf8')).toBe(initial)
    expect(JSON.parse(await readFile(join(legacy, 'package.json'), 'utf8')).version).toBe('1.0.0')
    expect(hmr.reconcileProfile).not.toHaveBeenCalled()
  })

  it.each([['host', TYPERT.invocations.find(entry => entry.method === 'installBundle')], ['remote', remote.spec.methods['pluginManager/installBundle']]])('preserves restartRequired through the %s result codec', (_side, method) => {
    const result = { changed: true, application: 'restart-required', restartRequired: true, restartReason: 'package-moved', target: 'demo-plugin', stage: 'enable' }
    expect(method.result.create().parse(result)).toEqual(result)
  })
})
