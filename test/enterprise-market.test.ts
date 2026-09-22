import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isolatePackage } from './helpers/isolated-package-tree.mjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { Loader } from '@deepseek-ai/cordis-plugin-loader'
import { createMarketRuntime } from '../packages/dsh-desktop-enterprise/market-runtime.js'
import { createMarketController, isMarketVersionCompatible } from '../packages/dsh-desktop-enterprise/market.js'
import { installOfflineBundle, readBundleZip, sha256, validateOfflineBundle, verifyInstalledBundle } from '../packages/dsh-desktop-enterprise/offline-bundle.js'
import { verifyMarketLease } from '../packages/dsh-desktop-enterprise/market-policy.js'
import { sweepRegistry } from 'dsh-desktop-market-installer/generations/registry'
import { zipEntries } from '../scripts/pack-enterprise-plugin.mjs'

const paths: string[] = [], controllers: Array<{ stop: () => Promise<void> }> = []
afterEach(async () => { for (const controller of controllers.splice(0)) await controller.stop(); for (const path of paths.splice(0)) await rm(path, { recursive: true, force: true }); vi.useRealTimers() })
const pluginId = 'a'.repeat(32), versionId = 'b'.repeat(32), target = `${process.platform}-${process.arch}`
const account = { connected: true, desktopVersion: '0.9.2', base: 'https://enterprise.example/bisheng', user: { id: '20' }, tenant: { id: '2', name: 'Company' }, sessionExpiresAt: new Date(Date.now() + 86400000).toISOString() }
const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
function receipt(payload: object) { const bytes = Buffer.from(JSON.stringify(payload)); return { payload: bytes.toString('base64url'), signature: sign(null, bytes, privateKey).toString('base64url') } }
function bundle(version = '1.0.0', source = 'export function apply(ctx) { ctx.effect(() => () => {}, "test plugin") }') {
  const files = { 'node_modules/company-demo/package.json': Buffer.from(JSON.stringify({ name: 'company-demo', version, type: 'module', main: 'index.js' })), 'node_modules/company-demo/index.js': Buffer.from(source) }
  const manifest = { schema_version: 1, plugin: { name: 'company-demo', version, display_name: 'Company Demo', description: 'Internal reporting', publisher: 'Company', license: 'MIT', desktop_min: '0.9.1', permissions: [], services: [] }, targets: { [target]: Object.fromEntries(Object.entries(files).map(([path, value]) => [path, sha256(value)])) } }
  const bytes = zipEntries({ 'manifest.json': Buffer.from(JSON.stringify(manifest)), ...Object.fromEntries(Object.entries(files).map(([path, value]) => [`bundles/${target}/${path}`, value])) })
  return { bytes, manifest, expected: { name: 'company-demo', version, digest: sha256(bytes) } }
}
async function home() { const directory = await mkdtemp(join(tmpdir(), 'enterprise-market-')); paths.push(directory); await mkdir(join(directory, 'profiles/node_modules'), { recursive: true }); return directory }

describe('offline bundles', () => {
  it('resolves a real host peer from an enterprise generation retained by community cleanup', async () => {
    const root = await home()
    await mkdir(join(root, 'profiles/node_modules/@deepseek-ai'), { recursive: true })
    await symlink(join(process.cwd(), 'node_modules/@deepseek-ai/dsh-tools'), join(root, 'profiles/node_modules/@deepseek-ai/dsh-tools'))
    const files = {
      'node_modules/company-peer/package.json': Buffer.from(JSON.stringify({ name: 'company-peer', version: '1.0.0', type: 'module', main: 'index.js', peerDependencies: { '@deepseek-ai/dsh-tools': '*' } })),
      'node_modules/company-peer/index.js': Buffer.from('import * as tools from "@deepseek-ai/dsh-tools"; export function apply() { return tools }')
    }
    const manifest = { ...bundle().manifest, plugin: { ...bundle().manifest.plugin, name: 'company-peer' }, targets: { [target]: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, sha256(bytes)])) } }
    const bytes = zipEntries({ 'manifest.json': Buffer.from(JSON.stringify(manifest)), ...Object.fromEntries(Object.entries(files).map(([name, bytes]) => [`bundles/${target}/${name}`, bytes])) })
    const expected = { name: 'company-peer', version: '1.0.0', digest: sha256(bytes) }
    const generation = await installOfflineBundle(root, bytes, expected, target)
    await sweepRegistry(root)
    await expect(verifyInstalledBundle({ ...generation, ...expected }, target)).resolves.toHaveProperty('manifest')
    const plugin = await import(pathToFileURL(join(generation.directory, 'node_modules', expected.name, 'index.js')).href)
    expect(plugin.apply).toBeTypeOf('function')
  })

  it('registers the real host Loader entry and removes it when the enterprise plugin stops', async () => {
    const root = await home(), data = bundle()
    const generation = await installOfflineBundle(root, data.bytes, data.expected, target)
    const context = new Context()
    const loaderFiber = context.plugin(Loader, { baseUrl: pathToFileURL(`${root}/`).href })
    await loaderFiber
    let runtime: ReturnType<typeof createMarketRuntime> | undefined
    context.loader.builtins.enterpriseTest = { apply(child: Context) { runtime = createMarketRuntime(child) } }
    const ownerId = await context.loader.create({ name: 'cordis:enterpriseTest' })
    await context.loader.await()
    try {
      const mounted = await runtime!({ ...generation, ...data.expected })
      expect([...context.loader.entries()].some(entry => entry.options.name.includes('company-demo/index.js'))).toBe(true)
      expect(mounted.state).toBe(2)
      await mounted.dispose()
      expect([...context.loader.entries()].some(entry => entry.options.name.includes('company-demo/index.js'))).toBe(false)
    } finally { await context.loader.remove(ownerId); await loaderFiber.dispose() }
  })
  it('installs a verified generation without package manager or network access', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network forbidden'))
    try {
      const data = bundle(), root = await home()
      const result = await installOfflineBundle(root, data.bytes, data.expected, target)
      expect(await readFile(join(result.directory, 'node_modules/company-demo/index.js'), 'utf8')).toContain('apply')
      await expect(verifyInstalledBundle({ ...result, ...data.expected }, target)).resolves.toHaveProperty('manifest')
      expect(fetch).not.toHaveBeenCalled()
    } finally { fetch.mockRestore() }
  })
  it('rejects corrupt artifacts, unlisted files and path traversal', () => {
    const data = bundle()
    expect(() => validateOfflineBundle(Buffer.from('corrupt'), data.expected, target)).toThrow(/checksum/)
    expect(() => readBundleZip(zipEntries({ '../escape': Buffer.from('bad') }))).toThrow(/Unsafe/)
    expect(() => readBundleZip(zipEntries({ 'NUL.txt': Buffer.from('bad') }))).toThrow(/Unsafe/)
    expect(() => readBundleZip(zipEntries({ 'case/file': Buffer.from('1'), 'CASE/FILE': Buffer.from('2') }))).toThrow(/Unsafe/)
  })
  it('detects installed code tampering before activation', async () => {
    const data = bundle(), root = await home()
    const result = await installOfflineBundle(root, data.bytes, data.expected, target)
    await writeFile(join(result.directory, 'node_modules/company-demo/index.js'), 'tampered')
    await expect(verifyInstalledBundle({ ...result, ...data.expected }, target)).rejects.toThrow(/changed/)
  })
})

describe('enterprise policy', () => {
  it('binds signed leases to tenant, user, device and expiration', () => {
    const policy = { tenant_id: '2', user_id: '20', device_id: 'device', issued_at: Math.floor(Date.now() / 1000), expires_at: Math.floor(Date.now() / 1000) + 60, policies: [] }
    const signed = receipt(policy)
    expect(verifyMarketLease(signed, account, 'device', pem)).toMatchObject({ tenant_id: '2' })
    expect(() => verifyMarketLease(signed, { ...account, tenant: { id: '3' } }, 'device', pem)).toThrow()
    expect(() => verifyMarketLease(signed, account, 'other', pem)).toThrow()
    expect(() => verifyMarketLease(signed, account, 'device', pem, Date.now() + 61000)).toThrow()
    expect(() => verifyMarketLease({ ...signed, payload: receipt({ ...policy, tenant_id: '3' }).payload }, account, 'device', pem)).toThrow(/signature/)
  })

})

async function fixture(pinned = true) {
  const root = await home(), ctx = new Context()
  let current = bundle(), currentId = versionId, disabled = false, online = true, revision = 2, connected = true
  let identity = account
  const approved = new Map([[versionId, current.expected.digest]])
  const request = vi.fn(async (path: string, body?: { device_id: string }) => {
    if (!online) throw new Error('Network unavailable')
    if (path.endsWith('/artifact')) return current.bytes
    let data: unknown
    if (path.endsWith('/capabilities')) data = { enabled: true, contract_version: 1, tenant_id: '2', public_key: pem }
    else if (path.endsWith('/sync')) data = receipt({ tenant_id: '2', user_id: '20', device_id: body!.device_id, issued_at: Math.floor(Date.now() / 1000), expires_at: Math.floor(Date.now() / 1000) + 3600,
      policies: [{ plugin_id: pluginId, name: 'company-demo', disabled, revision, current_version_id: disabled ? null : currentId, versions: [...approved].map(([id, digest]) => ({ id, digest })) }] })
    else data = { total: disabled ? 0 : 1, data: disabled ? [] : [{ id: pluginId, name: 'company-demo', display_name: 'Company Demo', current_version_id: currentId, revision,
      versions: [{ id: currentId, version: current.expected.version, digest: current.expected.digest, manifest: current.manifest }] }] }
    return { status_code: 200, data }
  })
  const active = new Set<string>()
  const market = createMarketController(ctx, { state: () => ({ ...identity, connected }), marketRequest: request }, { home: root, ...(pinned ? { publicKey: pem } : {}), target,
    load: async (record: { directory: string; version: string; config?: Record<string, unknown> }) => {
      const module = await import(pathToFileURL(join(record.directory, 'node_modules/company-demo/index.js')).href)
      const fiber = ctx.plugin(module, record.config)
      await fiber
      active.add(record.version)
      return { dispose: async () => { active.delete(record.version); await fiber.dispose() } }
    } })
  controllers.push(market)
  return { root, market, request, active, setDesktopVersion: (value: string) => { identity = { ...identity, desktopVersion: value } }, swap: () => { identity = { ...account, user: { id: '21' } } }, disconnect: () => { connected = false }, offline: () => { online = false }, disable: () => { disabled = true; revision++ }, update: (source?: string) => {
    current = bundle('1.1.0', source); currentId = 'c'.repeat(32); approved.set(currentId, current.expected.digest); revision++
  } }
}

describe('account-bound lifecycle', () => {
  it('discovers the signing key from the logged-in server and installs without enterprise deployment flags', async () => {
    const { market, active } = await fixture(false)
    expect(await market.catalog()).toMatchObject({ connected: true, installReady: true, total: 1, user: { id: '20' } })
    await market.act({ action: 'install', plugin_id: pluginId })
    expect(active.size).toBe(1)
  })
  it('returns an empty catalog after logout and rejects a previous account response', async () => {
    const { market, request, swap, disconnect } = await fixture(false)
    let release!: () => void
    const waiting = new Promise<void>(resolve => { release = resolve })
    request.mockImplementationOnce(async () => { await waiting; return { status_code: 200, data: { enabled: true, contract_version: 1, tenant_id: '2', public_key: pem } } })
    const result = market.catalog()
    await vi.waitFor(() => expect(request).toHaveBeenCalled())
    swap(); release()
    await expect(result).rejects.toThrow(/account changed/)
    disconnect()
    expect(await market.catalog()).toMatchObject({ connected: false, total: 0, data: [] })
  })
  it('blocks cross-tenant capability responses before fetching a catalog', async () => {
    const { market, request } = await fixture(false)
    request.mockImplementationOnce(async () => ({ status_code: 200, data: { enabled: true, contract_version: 1, tenant_id: 'other', public_key: pem } }))
    await expect(market.catalog()).rejects.toThrow(/tenant mismatch/)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('installs, disables, enables, and uninstalls a real Cordis plugin', async () => {
    const { market, active, request } = await fixture()
    const state = await market.act({ action: 'install', plugin_id: pluginId })
    expect(state.installed[0]?.status).toBe('enabled'); expect(active.has('1.0.0')).toBe(true)
    await market.act({ action: 'disable', plugin_id: pluginId }); expect(active.size).toBe(0)
    await market.act({ action: 'enable', plugin_id: pluginId }); expect(active.size).toBe(1)
    await market.act({ action: 'uninstall', plugin_id: pluginId }); expect(active.size).toBe(0)
    expect(market.state().installed).toHaveLength(0)
    expect(request.mock.calls.every(([path]) => path.startsWith('/api/v1/dsh/market/'))).toBe(true)
  })
  it('retains the prior generation when an updated plugin throws during loading', async () => {
    const { market, update, active } = await fixture()
    await market.act({ action: 'install', plugin_id: pluginId })
    update('export function apply() { throw new Error("bad update") }')
    await expect(market.act({ action: 'install', plugin_id: pluginId })).rejects.toThrow(/bad update/)
    expect(market.state().installed[0]?.version).toBe('1.0.0'); expect(active.has('1.0.0')).toBe(true)
  })
  it('unloads all versions on policy disable and clears authorization on logout', async () => {
    const { market, disable, active } = await fixture()
    await market.act({ action: 'install', plugin_id: pluginId }); disable(); await market.synchronize()
    expect(active.size).toBe(0); expect(market.state().installed[0]?.status).toBe('disabled')
    await expect(market.act({ action: 'enable', plugin_id: pluginId })).rejects.toThrow(/authorization/)
    await market.stop(); expect(active.size).toBe(0)
  })
  it('restores account-scoped configuration after an offline restart', async () => {
    const { market, update, offline, active } = await fixture()
    update('export function apply(ctx, config) { if (config.service !== "intranet") throw new Error("service required") }')
    await expect(market.act({ action: 'install', plugin_id: pluginId })).rejects.toThrow(/service required/)
    await market.act({ action: 'install', plugin_id: pluginId, config: { service: 'intranet' } })
    await expect(market.act({ action: 'configure', plugin_id: pluginId, config: { service: 'wrong' } })).rejects.toThrow(/service required/)
    expect(active.has('1.1.0')).toBe(true)
    await market.stop(false); expect(active.size).toBe(0)
    offline(); await market.synchronize()
    expect(active.has('1.1.0')).toBe(true)
    expect(market.state().installed[0]?.status).toBe('enabled')
  })
  it('clears visible installations immediately on account change and unloads on disconnect', async () => {
    const { market, swap, disconnect, active } = await fixture()
    await market.act({ action: 'install', plugin_id: pluginId })
    swap(); expect(market.state().installed).toEqual([])
    disconnect(); await market.tick()
    expect(active.size).toBe(0)
  })
  it('expires an offline runtime at the signed policy deadline', async () => {
    const { market, offline, active } = await fixture()
    await market.act({ action: 'install', plugin_id: pluginId })
    vi.useFakeTimers(); offline(); await market.synchronize()
    await vi.advanceTimersByTimeAsync(3600001)
    expect(active.size).toBe(0)
    expect(market.state().installed[0]?.status).toBe('disabled')
  })
  it('keeps authorized running plugins offline and blocks new activation', async () => {
    const { market, offline, active } = await fixture()
    await market.act({ action: 'install', plugin_id: pluginId }); offline(); await market.synchronize()
    expect(active.size).toBe(1)
    await market.act({ action: 'disable', plugin_id: pluginId })
    await expect(market.act({ action: 'enable', plugin_id: pluginId })).rejects.toThrow(/Network unavailable/)
    expect(active.size).toBe(0)
  })
})

describe('review regressions', () => {
  it('uses actual release and prerelease versions, and rejects missing version metadata', () => {
    expect(isMarketVersionCompatible('0.9.2', '0.9.2')).toBe(true)
    expect(isMarketVersionCompatible('0.9.2-test.1', '0.9.1')).toBe(true)
    expect(isMarketVersionCompatible('0.9.2-test.1', '0.9.2')).toBe(false)
    expect(isMarketVersionCompatible('0.9.2-beta.1', '0.9.2')).toBe(false)
    expect(isMarketVersionCompatible('0.9.2', '0.9.2-beta.1')).toBe(true)
    expect(isMarketVersionCompatible('', '0.9.2')).toBe(false)
    expect(isMarketVersionCompatible('0.9.2', 'invalid')).toBe(false)
  })

  it('pins first-use keys across synchronization and restart', async () => {
    const { market, request, root } = await fixture(false)
    await market.synchronize()
    const other = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString()
    await market.stop(false)
    request.mockImplementationOnce(async () => ({ status_code: 200, data: { enabled: true, contract_version: 1, tenant_id: '2', public_key: other } }))
    await market.synchronize()
    expect(market.state()).toMatchObject({ online: false, error: expect.stringContaining('signing key changed') })
    const saved = JSON.parse(await readFile(join(root, 'enterprise-market', `${sha256(`${account.base}|2|20`)}.json`), 'utf8'))
    expect(saved.public_key).toBe(pem)
  })

  it('cancels an in-flight install before serialized logout clears the account', async () => {
    const { market, request, active } = await fixture()
    const original = request.getMockImplementation()!
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    let downloading = false
    request.mockImplementation(async (path, body) => {
      if (path.endsWith('/artifact')) { downloading = true; await gate }
      return original(path, body)
    })
    const installing = market.act({ action: 'install', plugin_id: pluginId })
    const rejected = expect(installing).rejects.toThrow(/account changed/)
    await vi.waitFor(() => expect(downloading).toBe(true))
    const queued = market.act({ action: 'enable', plugin_id: pluginId })
    const queuedRejected = expect(queued).rejects.toThrow(/account changed/)
    const stopped = market.stop()
    release()
    await Promise.all([rejected, queuedRejected, stopped])
    expect(active.size).toBe(0)
    expect(market.state().installed).toEqual([])
  })

  it('rejects malformed catalog pagination and releases the queue for the next request', async () => {
    const { market, request } = await fixture()
    const original = request.getMockImplementation()!
    request.mockImplementation(async (path, body) => path.includes('/catalog')
      ? { status_code: 200, data: { data: [] } } : original(path, body))
    await expect(market.act({ action: 'install', plugin_id: pluginId })).rejects.toThrow(/pagination/)
    request.mockImplementation(original)
    const catalog = await market.catalog()
    expect(catalog).toMatchObject({ desktopVersion: '0.9.2', installReady: true })
    expect(catalog.data[0]).toMatchObject({ versions: [{ compatible: true }] })
  })
})

 it('loads its declared closure from a physical isolated Profile and exercises the real Loader lifecycle', async () => {
   const root = await home()
   const isolated = await isolatePackage(join(process.cwd(), 'packages/dsh-desktop-enterprise'), join(root, 'installation'))
   const good = bundle(), bad = bundle('1.1.0', 'export function apply() { throw new Error("smoke bad update") }')
   const fixtureFile = join(root, 'fixtures.json')
   const shape = (value: ReturnType<typeof bundle>, id: string) => ({ ...value.expected, id, bytes: value.bytes.toString('base64'), manifest: value.manifest })
   await writeFile(fixtureFile, JSON.stringify({ pluginId, good: shape(good, versionId), bad: shape(bad, 'c'.repeat(32)) }))
   const { stdout } = await promisify(execFile)(process.execPath, [join(process.cwd(), 'test/helpers/enterprise-profile-smoke.mjs'), isolated.entry, root, fixtureFile], {
     cwd: root, env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' }, timeout: 30000
   })
   expect(JSON.parse(stdout)).toMatchObject({ isolatedImport: 'PASS', install: 'PASS', disableEnable: 'PASS', failedUpdateRollback: 'PASS', stop: 'PASS' })
 })

 it('blocks installs below the actual Desktop minimum and exposes the same verdict to the list', async () => {
   const { market, setDesktopVersion } = await fixture()
   setDesktopVersion('0.9.0')
   expect((await market.catalog()).data[0]).toMatchObject({ versions: [{ compatible: false }] })
   await expect(market.act({ action: 'install', plugin_id: pluginId })).rejects.toThrow(/incompatible/)
   setDesktopVersion('0.9.2-test.1')
   expect((await market.catalog()).data[0]).toMatchObject({ versions: [{ compatible: true }] })
   await expect(market.act({ action: 'install', plugin_id: pluginId })).resolves.toMatchObject({ installed: [{ status: 'enabled' }] })
   await Promise.all([market.stop(), market.stop()])
 })

 it('rejects Windows device names, drive paths, alternate streams and trailing-dot aliases', () => {
   for (const name of ['C:/escape', 'node_modules/demo/CON.txt', 'node_modules/demo/COM1', 'node_modules/demo/file:stream', 'node_modules/demo/alias.', 'node_modules/demo/alias ']) {
     expect(() => readBundleZip(zipEntries({ [name]: Buffer.from('unsafe') })), name).toThrow(/Unsafe/)
   }
 })
