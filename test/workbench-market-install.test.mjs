import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readInstallEvidence } from '../packages/dsh-desktop-workbenches/install-evidence.mjs'
import { apply } from '../packages/dsh-desktop-workbenches/index.js'
import {
  createMarketInstallStore, MAX_PACKAGE_BYTES, MarketInstallError, readPackedManifest, resolveInstallTarget
} from '../packages/dsh-desktop-workbenches/market-install.mjs'

const roots = []
afterEach(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})
async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-market-install-'))
  roots.push(root)
  return root
}

function tarEntry(name, content) {
  const header = Buffer.alloc(512)
  header.write(name, 0, 'utf8')
  header.write('0000644\0', 100)
  header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124)
  header.write('0', 156)
  header.write('ustar\0', 257)
  const body = Buffer.alloc(Math.ceil(content.length / 512) * 512)
  Buffer.from(content).copy(body)
  return Buffer.concat([header, body])
}
const packed = (manifest, extra = []) => gzipSync(Buffer.concat([
  ...extra,
  tarEntry('package/package.json', JSON.stringify(manifest)),
  Buffer.alloc(1024)
]))
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const commit = 'c'.repeat(40)
const entry = (distribution, patch = {}) => ({ id: 'project-helper', catalogId: 'o__project-helper', version: distribution.version, distribution, ...patch })

describe('workbench market install targets', () => {
  it('pins npm installs to the exact version and carries the index integrity', async () => {
    const target = await resolveInstallTarget(entry({ type: 'npm', name: '@o/helper', version: '1.2.0', integrity: 'sha512-x', sha256: 'a'.repeat(64) }))
    expect(target).toMatchObject({ pluginSpec: '@o/helper@1.2.0', expectedPluginName: '@o/helper', expectedVersion: '1.2.0', npmIntegrity: 'sha512-x' })
  })

  it('verifies a Release package before installing it from a temporary file', async () => {
    const bytes = packed({ name: 'project-helper', version: '2.0.0' }, [tarEntry('package/README.md', 'hello')])
    const fetchImpl = vi.fn(async () => new Response(bytes))
    const temporaryRoot = await tempRoot()
    const target = await resolveInstallTarget(entry({ type: 'github-release', version: '2.0.0', url: 'https://github.com/o/r/releases/download/v2/w.tgz', sha256: sha256(bytes) }), { fetchImpl, temporaryRoot })
    expect(target.expectedPluginName).toBe('project-helper')
    expect(target.pluginSpec).toMatch(/^file:.*workbench\.tgz$/)
    const file = target.pluginSpec.slice('file:'.length)
    expect(await readFile(file)).toEqual(bytes)
    await target.cleanup()
    expect(existsSync(file)).toBe(false)
  })

  it('refuses a Release package whose checksum, version or size does not match the index', async () => {
    const bytes = packed({ name: 'project-helper', version: '2.0.0' })
    const release = (patch) => entry({ type: 'github-release', version: '2.0.0', url: 'https://github.com/o/r/releases/download/v2/w.tgz', sha256: sha256(bytes), ...patch })
    await expect(resolveInstallTarget(release({ sha256: 'f'.repeat(64) }), { fetchImpl: async () => new Response(bytes) })).rejects.toThrow(/SHA-256/)
    await expect(resolveInstallTarget(release({ version: '3.0.0' }), { fetchImpl: async () => new Response(bytes) })).rejects.toThrow(/lists 3\.0\.0/)
    const huge = new Response('x', { headers: { 'content-length': String(MAX_PACKAGE_BYTES + 1) } })
    await expect(resolveInstallTarget(release(), { fetchImpl: async () => huge })).rejects.toThrow(/larger than/)
    await expect(resolveInstallTarget(release(), { fetchImpl: async () => new Response('', { status: 404 }) })).rejects.toThrow('HTTP 404')
  })

  it('reads the package name from the pinned commit for source installs', async () => {
    const fetchImpl = vi.fn(async () => Response.json({ name: 'project-helper', version: '0.3.0' }))
    const target = await resolveInstallTarget(entry({ type: 'github-source', version: '0.3.0', url: 'https://github.com/o/r', commit }), { fetchImpl })
    expect(fetchImpl.mock.calls[0][0]).toBe(`https://raw.githubusercontent.com/o/r/${commit}/package.json`)
    expect(target).toMatchObject({ pluginSpec: `github:o/r#${commit}`, expectedPluginName: 'project-helper', expectedVersion: '0.3.0' })
  })

  it('reads package.json only from the top-level package directory', () => {
    expect(readPackedManifest(packed({ name: 'a', version: '1.0.0' }, [tarEntry('package/sub/package.json', '{"name":"nested"}')]))).toEqual({ name: 'a', version: '1.0.0' })
    expect(() => readPackedManifest(Buffer.from('not gzip'))).toThrow(MarketInstallError)
    expect(() => readPackedManifest(gzipSync(Buffer.alloc(1024)))).toThrow(/does not contain/)
  })

  it('keeps market install records in their own file', async () => {
    const root = await tempRoot()
    const store = createMarketInstallStore(root)
    expect(await store.read()).toEqual({})
    await store.record('project-helper', { catalogId: 'o__project-helper', pluginName: 'project-helper', version: '1.0.0' })
    expect(JSON.parse(await readFile(join(root, 'market-installs.json'), 'utf8')).installs['project-helper'].version).toBe('1.0.0')
    await store.forget('project-helper')
    expect(await store.read()).toEqual({})
  })

  it('forgets only the recovered package across repository identities', async () => {
    const root = await tempRoot()
    const store = createMarketInstallStore(root)
    await store.record('o/first', { catalogId: 'o/first', pluginName: 'shared', version: '1.0.0' })
    await store.record('o/second', { catalogId: 'o/second', pluginName: 'shared', version: '1.0.0' })
    await store.record('other/kept', { catalogId: 'other/kept', pluginName: 'kept', version: '1.0.0' })
    await store.forgetPlugin('shared')
    expect(await store.read()).toEqual({ 'other/kept': { catalogId: 'other/kept', pluginName: 'kept', version: '1.0.0' } })
    expect(JSON.parse(await readFile(join(root, 'market-installs.json'), 'utf8')).installs).toEqual(await store.read())
  })
})

describe('workbench market install routes', () => {
  const sha = 'a'.repeat(64)
  const index = {
    schemaVersion: 2, kind: 'catalog', categories: [{ id: 'other', name: { zh: '其他' } }],
    workbenches: [{
      id: 'o/project-helper', owner: 'o', repository: 'project-helper', url: 'https://github.com/o/project-helper', name: '项目助手', category: 'other',
      description: { zh: '整理资料。', en: 'Notes.' }, version: '1.2.0', sourceCommit: commit, license: 'MIT',
      distribution: { type: 'npm', name: 'project-helper', version: '1.2.0', url: 'https://registry.npmjs.org/project-helper/-/project-helper-1.2.0.tgz', integrity: 'sha512-abc', sha256: sha, bytes: 10 },
      screenshots: [{ url: 'https://raw.githubusercontent.com/o/project-helper/main/a.png', alt: 'a', width: 1, height: 1, bytes: 1, sha256: sha }], probe: { status: 'ok' }
    }]
  }
  const outcome = (application = 'applied', patch = {}) => ({ changed: true, application, bundle: 'project-helper', stage: 'enable', warnings: [], ...patch })
  const manager = (patch = {}) => ({
    listBundles: vi.fn(async () => []), listPlugins: vi.fn(async () => []),
    installBundle: vi.fn(async () => outcome()), removeBundle: vi.fn(async () => outcome()),
    setBundleEnabled: vi.fn(async () => outcome()), ...patch
  })
  const KEY = 'o/project-helper'
  async function host(pluginManager, catalog = index, fetchCatalog) {
    const home = await tempRoot()
    vi.stubEnv('DSH_HOME', home)
    const root = join(home, 'desktop-workbenches')
    const routes = []
    const connection = { fetch: { register(route) { routes.push(route) } } }
    // The catalog reader captures fetch when the plugin applies.
    vi.stubGlobal('fetch', fetchCatalog || vi.fn(async url => Response.json(String(url).endsWith('/package.json') ? { name: 'project-helper', version: '1.2.0' } : catalog)))
    apply({ effect: fn => fn(), reflect: { provide() {} }, connection, inject(deps, callback) { if (pluginManager && !deps.includes('tools')) callback({ connection, pluginManager, effect: fn => fn() }) } }, { root })
    const call = async (path, body) => {
      const route = routes.find(value => value.path === path)
      if (!route) return undefined
      const response = await route.fetch(new Request(`http://localhost${path}`, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }))
      return { status: response.status, body: await response.json() }
    }
    return { root, home, call }
  }

  it('stays browse-only when Desktop has no package service', async () => {
    const { call } = await host(undefined)
    expect(await call('/api/desktop-workbenches/market-install', { id: KEY })).toBeUndefined()
    expect((await call('/api/desktop-workbenches/market-installs')).body).toEqual({ installs: {}, packages: {}, lifecycle: null })
  })

  it('reads local installation readiness without starting or awaiting catalog network requests', async () => {
    let resolve
    const fetchCatalog = vi.fn(() => new Promise(done => { resolve = done }))
    const { call } = await host(undefined, index, fetchCatalog)
    expect((await call('/api/desktop-workbenches/market-installs')).body).toEqual({ installs: {}, packages: {}, lifecycle: null })
    expect(fetchCatalog).not.toHaveBeenCalled()
    const refresh = call('/api/desktop-workbenches/catalog')
    try {
      expect((await call('/api/desktop-workbenches/market-installs')).body).toEqual({ installs: {}, packages: {}, lifecycle: null })
      expect(fetchCatalog).toHaveBeenCalledTimes(1)
    } finally { resolve(Response.json(index)) }
    expect((await refresh).status).toBe(200)
  })

  it('installs through the manager and exposes actual application', async () => {
    const installBundle = vi.fn(async () => outcome())
    const { call, root } = await host(manager({ installBundle }))
    const result = await call('/api/desktop-workbenches/market-install', { id: KEY })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ application: 'applied', restartRequired: false, install: { catalogId: 'o/project-helper', pluginName: 'project-helper', version: '1.2.0', source: 'npm' } })
    expect(installBundle).toHaveBeenCalledWith('project-helper@1.2.0', { enabled: true, expectedName: 'project-helper', expectedVersion: '1.2.0', npmIntegrity: 'sha512-abc', replace: false })
    expect(Object.keys((await call('/api/desktop-workbenches/market-installs')).body.installs)).toEqual([KEY])
  })

  async function installedPackage(home, spec = 'file:/development/local') {
    const profile = join(home, 'profiles', 'web')
    const directory = join(profile, 'node_modules', 'project-helper')
    await mkdir(directory, { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { 'project-helper': spec } }))
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'project-helper', version: '1.2.0', dsh: { client: { entry: './client.js' } } }))
    await writeFile(join(directory, 'client.js'), 'local workbench code')
    return directory
  }

  it.each([undefined, false, 'true', 1])('rejects direct replacement without boolean confirmation (%s)', async confirmedReplacement => {
    const installBundle = vi.fn(async () => outcome())
    const { call, root, home } = await host(manager({ installBundle }))
    const directory = await installedPackage(home)
    const store = createMarketInstallStore(root)
    await store.record(KEY, { pluginName: 'project-helper', version: '1.2.0', fingerprint: 'stale' })
    const before = await readFile(join(root, 'market-installs.json'), 'utf8')
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY, confirmedReplacement })).status).toBe(409)
    expect(installBundle).not.toHaveBeenCalled()
    expect(await readFile(join(directory, 'client.js'), 'utf8')).toBe('local workbench code')
    expect(await readFile(join(root, 'market-installs.json'), 'utf8')).toBe(before)
  })

  it('checks the resolved source package name when the catalog does not declare it', async () => {
    const catalog = structuredClone(index)
    catalog.workbenches[0].distribution = { type: 'github-source', version: '1.2.0', url: 'https://github.com/o/project-helper', commit }
    const installBundle = vi.fn(async () => outcome())
    const { call, home } = await host(manager({ installBundle }), catalog)
    await installedPackage(home)
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY })).status).toBe(409)
    expect(installBundle).not.toHaveBeenCalled()
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY, confirmedReplacement: true })).status).toBe(200)
  })

  it('allows explicitly confirmed replacement and verified market updates', async () => {
    const installBundle = vi.fn(async () => outcome())
    const { call, home } = await host(manager({ installBundle }))
    await installedPackage(home, '1.2.0')
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY, confirmedReplacement: true })).status).toBe(200)
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY })).status).toBe(200)
    expect(installBundle).toHaveBeenCalledTimes(2)
  })

  it('requires confirmation only for positively detected market content changes', async () => {
    const installBundle = vi.fn(async () => outcome())
    const { call, home, root } = await host(manager({ installBundle }))
    const directory = await installedPackage(home, '1.2.0')
    const initial = (await readInstallEvidence({}, home, ['project-helper']))['project-helper']
    await createMarketInstallStore(root).record(KEY, { pluginName: 'project-helper', version: '1.2.0', fingerprint: initial.fingerprint })
    await writeFile(join(directory, 'client.js'), 'changed same-version code')
    expect(await call('/api/desktop-workbenches/market-install', { id: KEY })).toMatchObject({ status: 409, body: { code: 'confirmation_required', params: { updateRisk: 'modified' } } })
    expect(installBundle).not.toHaveBeenCalled()
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY, confirmedReplacement: true })).status).toBe(200)
    expect(installBundle).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['1.2.0', 'npm', undefined],
    ['github:o/project-helper#commit', 'github-source', undefined],
    ['file:/tmp/market-release.tgz', 'github-release', undefined],
    ['1.2.0', 'npm', 'a'.repeat(64)],
    ['file:/tmp/market-release.tgz', 'github-release', 'a'.repeat(64)]
  ])('updates historical market installs without prompting (%s, %s)', async (spec, source, fingerprint) => {
    const installBundle = vi.fn(async () => outcome())
    const { call, home, root } = await host(manager({ installBundle }))
    await installedPackage(home, spec)
    await createMarketInstallStore(root).record(KEY, { pluginName: 'project-helper', version: '1.2.0', source, fingerprint })
    const packages = (await call('/api/desktop-workbenches/market-installs')).body.packages
    expect(packages['project-helper']).toMatchObject({ origin: 'market', contentVerified: false, updateRisk: null })
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY })).status).toBe(200)
    expect(installBundle).toHaveBeenCalledTimes(1)
  })

  it.each(['file:/development/local', 'link:/development/local', 'file:/development/local.tgz'])('protects unreadable explicitly local installs (%s)', async spec => {
    const installBundle = vi.fn(async () => outcome())
    const { call, home } = await host(manager({ installBundle }))
    const directory = await installedPackage(home, spec)
    await writeFile(join(directory, 'package.json'), '{invalid')
    expect((await readInstallEvidence({}, home, ['project-helper']))['project-helper']).toMatchObject({ origin: 'local', updateRisk: 'local' })
    expect(await call('/api/desktop-workbenches/market-install', { id: KEY })).toMatchObject({ status: 409, body: { code: 'confirmation_required', params: { updateRisk: 'local' } } })
    expect(installBundle).not.toHaveBeenCalled()
  })

  it('updates unreadable historical release archives without inferring local modifications', async () => {
    const installBundle = vi.fn(async () => outcome())
    const { call, home, root } = await host(manager({ installBundle }))
    const directory = await installedPackage(home, 'file:/tmp/release.tgz')
    await createMarketInstallStore(root).record(KEY, { pluginName: 'project-helper', version: '1.2.0', source: 'github-release' })
    await writeFile(join(directory, 'package.json'), '{invalid')
    expect((await readInstallEvidence(await createMarketInstallStore(root).read(), home))['project-helper']).toMatchObject({ origin: 'market', updateRisk: null })
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY })).status).toBe(200)
    expect(installBundle).toHaveBeenCalledTimes(1)
  })

  it('does not treat unknown or unreadable remote evidence as detected local modifications', async () => {
    const installBundle = vi.fn(async () => outcome())
    const { call, home } = await host(manager({ installBundle }))
    const directory = await installedPackage(home, '1.2.0')
    await writeFile(join(directory, 'package.json'), '{invalid')
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY })).status).toBe(200)
    expect(installBundle).toHaveBeenCalledTimes(1)
  })

  it.each(['applied', 'restart-required', 'overridden', 'failed', 'cancelled'])('exposes actual %s outcome instead of package heuristics', async application => {
    const result = outcome(application, application === 'restart-required' ? { restartReason: 'package-moved' } : {})
    const { call } = await host(manager({ installBundle: vi.fn(async () => result) }))
    expect(await call('/api/desktop-workbenches/market-install', { id: KEY })).toMatchObject({
      status: ['failed', 'cancelled'].includes(application) ? 409 : 200,
      body: { application, result, restartRequired: application === 'restart-required', reloadRequired: false, actionRequired: application === 'restart-required' ? 'restart' : 'none' }
    })
  })

  it('does not record a failed installation but retains validated provenance after activation failure', async () => {
    const service = manager({ installBundle: vi.fn(async () => outcome('failed', { stage: 'install', bundle: undefined })) })
    const { call } = await host(service)
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY })).status).toBe(409)
    expect((await call('/api/desktop-workbenches/market-installs')).body.installs).toEqual({})
    service.installBundle.mockResolvedValue(outcome('failed', { error: { code: 'activation' } }))
    expect((await call('/api/desktop-workbenches/market-install', { id: KEY })).status).toBe(409)
    expect((await call('/api/desktop-workbenches/market-installs')).body.installs[KEY]).toMatchObject({ pluginName: 'project-helper' })
  })

  it('clears stale provenance when inventory confirms the package is absent', async () => {
    const service = manager({ removeBundle: vi.fn(async () => outcome('failed', { error: { code: 'not-removable' } })) })
    const { call, root } = await host(service)
    const store = createMarketInstallStore(root)
    await store.record(KEY, { catalogId: KEY, pluginName: 'project-helper', version: '1.2.0' })
    await store.record('o/kept', { catalogId: 'o/kept', pluginName: 'kept', version: '1.0.0' })
    expect(await call('/api/desktop-workbenches/market-uninstall', { id: KEY })).toMatchObject({
      status: 200, body: { application: 'applied', restartRequired: false, result: { target: 'project-helper', stage: 'remove' } }
    })
    expect(service.listBundles).toHaveBeenCalledOnce()
    expect(service.removeBundle).not.toHaveBeenCalled()
    expect(await store.read()).toEqual({ 'o/kept': { catalogId: 'o/kept', pluginName: 'kept', version: '1.0.0' } })
  })

  it('retains stale provenance when inventory cannot confirm package absence', async () => {
    const service = manager({ listBundles: vi.fn(async () => { throw new Error('Inventory unavailable') }) })
    const { call, root } = await host(service)
    const store = createMarketInstallStore(root)
    await store.record(KEY, { catalogId: KEY, pluginName: 'project-helper', version: '1.2.0' })
    expect((await call('/api/desktop-workbenches/market-uninstall', { id: KEY })).status).toBe(500)
    expect(service.removeBundle).not.toHaveBeenCalled()
    expect((await store.read())[KEY]).toBeDefined()
  })

  it('delegates removal and keeps provenance until removal is applied', async () => {
    const service = manager({ listBundles: vi.fn(async () => [{ name: 'project-helper', installed: true, removable: true }]) })
    const { call } = await host(service)
    await call('/api/desktop-workbenches/market-install', { id: KEY })
    service.removeBundle.mockResolvedValueOnce(outcome('restart-required'))
    expect((await call('/api/desktop-workbenches/market-uninstall', { id: KEY })).body.restartRequired).toBe(true)
    expect((await call('/api/desktop-workbenches/market-installs')).body.installs[KEY]).toBeDefined()
    expect((await call('/api/desktop-workbenches/market-uninstall', { id: KEY })).body.application).toBe('applied')
    expect(service.removeBundle).toHaveBeenCalledWith('project-helper')
    expect((await call('/api/desktop-workbenches/market-installs')).body.installs).toEqual({})
  })

  it('shares manager inventory and switches through the same lifecycle owner', async () => {
    const bundles = [{ name: 'project-helper', installed: true, enabled: false, rows: [] }]
    const plugins = [{ id: 'helper-server', state: 'disabled' }]
    const service = manager({ listBundles: vi.fn(async () => bundles), listPlugins: vi.fn(async () => plugins) })
    const { call } = await host(service)
    expect((await call('/api/desktop-workbenches/market-installs')).body.lifecycle).toEqual({ bundles, plugins, applications: [] })
    await call('/api/desktop-workbenches/market-install', { id: KEY })
    expect(service.installBundle.mock.calls[0][1].replace).toBe(true)
    expect((await call('/api/desktop-workbenches/market-enabled', { id: KEY, enabled: true })).body.application).toBe('applied')
    expect(service.setBundleEnabled).toHaveBeenCalledWith('project-helper', true)
    expect((await call('/api/desktop-workbenches/market-enabled', { id: KEY, enabled: 'true' })).status).toBe(400)
  })

  it('rejects unknown catalog entries and invalid IDs before invoking the manager', async () => {
    const service = manager()
    const { call } = await host(service)
    expect((await call('/api/desktop-workbenches/market-install', { id: 'o/missing' })).status).toBe(404)
    expect((await call('/api/desktop-workbenches/market-install', { id: '../x' })).status).toBe(400)
    expect(service.installBundle).not.toHaveBeenCalled()
  })
})
