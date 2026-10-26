import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PluginManager } from '@deepseek-ai/dsh-plugin-manager'
import { TYPERT } from '@deepseek-ai/dsh-plugin-manager/typert'
import remote from '@deepseek-ai/dsh-plugin-manager/remote'

// Compatibility patch for manager 0.2.1-rc.2. Remove when upstream offers verified replacement.
const roots = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function fixture({ installed = false, backendSupported = true, target = 'demo-plugin', version = '2.0.0' } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-manager-verified-'))
  roots.push(dir)
  const manifestPath = join(dir, 'package.json')
  const initial = JSON.stringify({ dependencies: installed ? { 'demo-plugin': '1.0.0' } : {}, dsh: { profile: { bundles: [] } } })
  await writeFile(manifestPath, initial)
  const rollback = vi.fn(async () => { await writeFile(manifestPath, initial) })
  const backend = {
    supportsVerifiedInstall: backendSupported,
    install: vi.fn(async () => {
      const plugin = join(dir, 'node_modules', target)
      await mkdir(plugin, { recursive: true })
      await writeFile(join(plugin, 'package.json'), JSON.stringify({ name: target, version, dsh: { bundle: { patch: 'cordis.patch.yml' } } }))
      await writeFile(join(plugin, 'cordis.patch.yml'), '[]\n')
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
      manifest.dependencies[target] = version
      await writeFile(manifestPath, JSON.stringify(manifest))
      return { bundle: target, packageResult: { exitCode: 0, output: '' }, rollback }
    })
  }
  const manager = Object.assign(Object.create(PluginManager.prototype), {
    profile: { dir, name: 'web', installAnchor: resolve('node_modules/@deepseek-ai/dsh/package.json') },
    ownerContext: { get: name => name === 'profileBundlePackageBackend' ? backend : name === 'hmr' ? {} : undefined, emit: vi.fn() },
    abort: new AbortController(), installs: new Map(), installedFrom: new Map(),
    managementBundles: new Set(), ownerEntryId: 'include:manager',
    bundleRows: vi.fn(() => []),
    readRestoredFiles: async () => initial,
    restoreFiles: vi.fn(async text => { await writeFile(manifestPath, text) }),
    configure: async operation => operation(),
    selectBundle: vi.fn(async () => {}),
    publishAndReload: vi.fn(async () => ({ warnings: [] })),
    runPnpm: vi.fn(() => { throw new Error('Unexpected unverified pnpm fallback') })
  })
  return { dir, manager, backend, rollback, initial, manifestPath }
}

const verified = { enabled: true, expectedName: 'demo-plugin', expectedVersion: '2.0.0', npmIntegrity: 'sha512-example' }

describe('Plugin Manager verified install boundary', () => {
  it('owns defensive process-local application state across management entry points', async () => {
    const { manager } = await fixture()
    expect(manager.listApplications()).toEqual([])
    await manager.change(async result => { result.restartReason = 'module-comparison' }, { target: 'demo-plugin', stage: 'enable' }, 'enable')
    expect(manager.listApplications()).toMatchObject([{ target: 'demo-plugin', application: 'restart-required', restartReason: 'module-comparison' }])
    const copy = manager.listApplications()
    copy[0].application = 'applied'
    expect(manager.listApplications()[0].application).toBe('restart-required')
    await manager.change(async () => {}, { target: 'demo-plugin', stage: 'enable' }, 'enable')
    expect(manager.listApplications()).toMatchObject([{ target: 'demo-plugin', application: 'applied' }])
    expect(manager.listApplications()).toHaveLength(1)
    const other = await fixture()
    expect(other.manager.listApplications()).toEqual([])
  })

  it.each([
    ['host', TYPERT.invocations.find(invocation => invocation.method === 'installBundle')],
    ['remote', remote.spec.methods['pluginManager/installBundle']]
  ])('preserves verified options through %s codecs and schema metadata', (_side, method) => {
    const parameter = method.parameters.find(parameter => parameter.name === 'options')
    const options = { ...verified, replace: true }
    for (const codec of [parameter.codec, parameter.strictCodec]) {
      expect(codec.create().parse(options)).toEqual(options)
      expect(codec.create().safeParse({ ...options, replace: 'yes' }).success).toBe(false)
      expect(codec.jsonSchema.properties).toMatchObject({
        expectedName: { type: 'string' }, expectedVersion: { type: 'string' },
        npmIntegrity: { type: 'string' }, replace: { type: 'boolean' }
      })
    }
  })

  it.each(['demo-plugin@2.0.0', 'https://example.test/demo.tgz', join(tmpdir(), 'demo.tgz'), join(tmpdir(), 'missing-directory')])('forwards verification for %s even without parsed.name', async spec => {
    const { manager, backend } = await fixture()
    const result = await manager.installBundle(spec, verified)
    expect(result.application).toBe('applied')
    expect(result).toMatchObject({ bundle: 'demo-plugin', version: '2.0.0' })
    expect(backend.install).toHaveBeenCalledWith(expect.objectContaining({ expectedName: 'demo-plugin', expectedVersion: '2.0.0', npmIntegrity: 'sha512-example' }))
    expect(manager.publishAndReload).toHaveBeenCalledOnce()
    expect(manager.runPnpm).not.toHaveBeenCalled()
  })

  it('allows an explicit verified replacement with HMR', async () => {
    const { manager, backend } = await fixture({ installed: true })
    expect(await manager.installBundle('https://example.test/demo.tgz', { ...verified, replace: true })).toMatchObject({ application: 'applied', version: '2.0.0' })
    expect(backend.install).toHaveBeenCalledOnce()
  })

  it('rejects an already installed expectedName without replacement before mutation', async () => {
    const { manager, backend } = await fixture({ installed: true })
    expect(await manager.installBundle('https://example.test/demo.tgz', verified)).toMatchObject({ error: { code: 'already-installed' } })
    expect(backend.install).not.toHaveBeenCalled()
  })

  it.each([
    ['other-plugin@2.0.0', verified],
    ['demo-plugin@2.0.0', { replace: true }],
    ['demo-plugin@2.0.0', { ...verified, expectedVersion: '' }],
    ['demo-plugin@2.0.0', { ...verified, npmIntegrity: false }],
    ['demo-plugin@2.0.0', { ...verified, replace: 'yes' }]
  ])('rejects conflicting or invalid options before mutation (%s)', async (spec, options) => {
    const { manager, backend } = await fixture()
    expect(await manager.installBundle(spec, options)).toMatchObject({ error: { code: 'invalid-spec' } })
    expect(backend.install).not.toHaveBeenCalled()
  })

  it('rejects a known local path manifest that conflicts with expectedName', async () => {
    const { dir, manager, backend } = await fixture()
    const source = join(dir, 'source')
    await mkdir(source)
    await writeFile(join(source, 'package.json'), JSON.stringify({ name: 'other-plugin' }))
    expect(await manager.installBundle(source, verified)).toMatchObject({ error: { code: 'invalid-spec' } })
    expect(backend.install).not.toHaveBeenCalled()
  })

  it.each([undefined, false])('fails closed for an unsupported backend (%s)', async supported => {
    const { manager, backend } = await fixture()
    backend.supportsVerifiedInstall = supported
    expect(await manager.installBundle('demo-plugin@2.0.0', verified)).toMatchObject({ application: 'failed', error: { diagnostic: expect.stringContaining('does not support verified') } })
    expect(backend.install).not.toHaveBeenCalled()
    expect(manager.runPnpm).not.toHaveBeenCalled()
  })

  it('does not fall back when a capable backend declines a verified install', async () => {
    const { manager, backend } = await fixture()
    backend.install.mockResolvedValue(undefined)
    expect(await manager.installBundle('demo-plugin@2.0.0', verified)).toMatchObject({ application: 'failed', error: { diagnostic: expect.stringContaining('declined verified') } })
    expect(manager.runPnpm).not.toHaveBeenCalled()
  })

  it.each([{ target: 'other-plugin' }, { version: '3.0.0' }])('rolls back mismatched installed identity/version (%j)', async options => {
    const { manager, rollback, initial, manifestPath } = await fixture(options)
    expect(await manager.installBundle('https://example.test/demo.tgz', verified)).toMatchObject({ application: 'failed' })
    expect(rollback).toHaveBeenCalledOnce()
    expect(await readFile(manifestPath, 'utf8')).toBe(initial)
    expect(manager.selectBundle).not.toHaveBeenCalled()
    expect(manager.publishAndReload).not.toHaveBeenCalled()
  })

  it.each(['@deepseek-ai/dsh-plugin-manager', 'management-bundle'])('protects known manager package %s before mutation', async name => {
    const { manager, backend } = await fixture()
    manager.managementBundles.add('management-bundle')
    expect(await manager.installBundle('https://example.test/manager.tgz', { expectedName: name, replace: true })).toMatchObject({ error: { code: 'management-required' } })
    expect(backend.install).not.toHaveBeenCalled()
  })

  it('rolls back a protected identity discovered only after installation', async () => {
    const { manager, rollback } = await fixture({ target: '@deepseek-ai/dsh-plugin-manager' })
    expect(await manager.installBundle('https://example.test/unknown.tgz')).toMatchObject({ error: { code: 'management-required' } })
    expect(rollback).toHaveBeenCalledOnce()
    expect(manager.publishAndReload).not.toHaveBeenCalled()
  })
})
