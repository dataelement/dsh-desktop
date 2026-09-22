import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../packages/dsh-desktop-workbenches/index.js'
import {
  createMarketInstallStore, MAX_PACKAGE_BYTES, MarketInstallError, readPackedManifest, resolveInstallTarget
} from '../packages/dsh-desktop-workbenches/market-install.mjs'

const roots = []
afterEach(async () => {
  vi.unstubAllGlobals()
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
})

describe('workbench market install routes', () => {
  const sha = 'a'.repeat(64)
  const index = {
    schemaVersion: 2, kind: 'catalog', categories: [{ id: 'other', name: { zh: '其他' } }],
    workbenches: [{
      id: 'o/project-helper', workbenchId: 'helper-runtime', owner: 'o', repository: 'project-helper', url: 'https://github.com/o/project-helper', name: '项目助手', category: 'other',
      description: { zh: '整理资料。', en: 'Notes.' }, version: '1.2.0', sourceCommit: commit, license: 'MIT',
      distribution: { type: 'npm', name: 'project-helper', version: '1.2.0', url: 'https://registry.npmjs.org/project-helper/-/project-helper-1.2.0.tgz', integrity: 'sha512-abc', sha256: sha, bytes: 10 },
      screenshots: [{ url: 'https://raw.githubusercontent.com/o/project-helper/main/a.png', alt: 'a', width: 1, height: 1, bytes: 1, sha256: sha }], probe: { status: 'ok' }
    }]
  }
  const handle = (exitCode = 0, message = '') => {
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const done = (async () => { if (message) stderr.write(message); stdout.end(); stderr.end(); return { exitCode, signal: null } })()
    return { stdout, stderr, done, cancel() {} }
  }
  const KEY = 'o/project-helper'
  async function host(desktopPnpm) {
    const home = await tempRoot()
    const root = join(home, 'desktop-workbenches')
    const routes = []
    const connection = { fetch: { register(route) { routes.push(route) } } }
    // The catalog reader captures fetch when the plugin applies.
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(index)))
    apply({ effect: fn => fn(), reflect: { provide() {} }, connection, inject(deps, callback) { if (desktopPnpm) callback({ connection, desktopPnpm }) } }, { root })
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
    expect((await call('/api/desktop-workbenches/market-installs')).body).toEqual({ installs: {} })
  })

  it('installs the index entry, records it, and asks for a restart', async () => {
    const installWorkbenchGeneration = vi.fn(() => handle())
    const { call, root } = await host({ installWorkbenchGeneration, runPlugin: vi.fn() })
    const result = await call('/api/desktop-workbenches/market-install', { id: KEY })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ restartRequired: true, install: { catalogId: 'o/project-helper', workbenchId: 'helper-runtime', pluginName: 'project-helper', version: '1.2.0', source: 'npm' } })
    expect(installWorkbenchGeneration).toHaveBeenCalledWith({ pluginSpec: 'project-helper@1.2.0', expectedPluginName: 'project-helper', expectedVersion: '1.2.0', npmIntegrity: 'sha512-abc' }, root)
    expect(Object.keys((await call('/api/desktop-workbenches/market-installs')).body.installs)).toEqual([KEY])
  })

  it('reports install failures without recording anything', async () => {
    const { call } = await host({ installWorkbenchGeneration: () => handle(1, 'ERR_PNPM_FETCH_404 not found'), runPlugin: vi.fn() })
    const result = await call('/api/desktop-workbenches/market-install', { id: KEY })
    expect(result).toEqual({ status: 502, body: { error: 'ERR_PNPM_FETCH_404 not found' } })
    expect((await call('/api/desktop-workbenches/market-installs')).body.installs).toEqual({})
  })

  it('rejects unknown entries, invalid IDs and a busy package service', async () => {
    const { call } = await host({ installWorkbenchGeneration: () => { throw new Error('Another desktop pnpm operation is already running.') }, runPlugin: vi.fn() })
    expect((await call('/api/desktop-workbenches/market-install', { id: 'o/missing' })).status).toBe(404)
    expect((await call('/api/desktop-workbenches/market-install', { id: '../x' })).status).toBe(400)
    expect(await call('/api/desktop-workbenches/market-install', { id: KEY })).toEqual({ status: 409, body: { error: 'Another desktop pnpm operation is already running.' } })
  })

  it('uninstalls only workbenches this market installed, then forgets them', async () => {
    const runPlugin = vi.fn(() => handle())
    const { call, root } = await host({ installWorkbenchGeneration: () => handle(), runPlugin })
    expect((await call('/api/desktop-workbenches/market-uninstall', { id: KEY })).status).toBe(404)
    await call('/api/desktop-workbenches/market-install', { id: KEY })
    const result = await call('/api/desktop-workbenches/market-uninstall', { id: KEY })
    expect(result).toEqual({ status: 200, body: { restartRequired: true } })
    expect(runPlugin).toHaveBeenCalledWith(['remove', 'project-helper'], root)
    expect((await call('/api/desktop-workbenches/market-installs')).body.installs).toEqual({})
  })

  it('records the catalog workbench ID without reading package-local metadata', async () => {
    const runPlugin = vi.fn(() => handle())
    const { call } = await host({ installWorkbenchGeneration: () => handle(), runPlugin })
    const result = await call('/api/desktop-workbenches/market-install', { id: KEY })
    expect(result.status).toBe(200)
    expect(result.body.install).toMatchObject({ catalogId: 'o/project-helper', workbenchId: 'helper-runtime', pluginName: 'project-helper' })
    expect(runPlugin).not.toHaveBeenCalled()
  })
})
