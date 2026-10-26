import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCatalogReader } from '../packages/dsh-desktop-workbenches/catalog.mjs'

const catalog = { schemaVersion: 2, kind: 'catalog', categories: [], workbenches: [] }
const roots = []
async function cacheFile() {
  const root = await mkdtemp(join(tmpdir(), 'workbench-catalog-'))
  roots.push(root)
  return join(root, 'catalog.json')
}
const offline = () => Promise.reject(new Error('offline'))
const online = () => Promise.resolve(Response.json(catalog))
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

describe('persistent workbench catalog fallback', () => {
  it('serves a disk snapshot after restart without joining a pending network refresh', async () => {
    const cachePath = await cacheFile()
    await createCatalogReader({ cachePath, fetch: online })()
    let resolve
    const fetch = vi.fn(() => new Promise(done => { resolve = done }))
    const read = createCatalogReader({ cachePath, fetch })
    const refresh = read({ force: true })
    try {
      await expect(read({ cachedOnly: true })).resolves.toEqual({ catalog, stale: true })
      expect(fetch).toHaveBeenCalledTimes(1)
    } finally { resolve(Response.json({ ...catalog, generatedAt: 'new' })) }
    await expect(refresh).resolves.toEqual({ catalog: { ...catalog, generatedAt: 'new' }, stale: false })
    await expect(read()).resolves.toEqual({ catalog: { ...catalog, generatedAt: 'new' }, stale: false })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null without a snapshot and never starts network work', async () => {
    const fetch = vi.fn(online)
    const read = createCatalogReader({ cachePath: await cacheFile(), fetch })
    await expect(read({ cachedOnly: true })).resolves.toEqual({ catalog: null, stale: false })
    expect(fetch).not.toHaveBeenCalled()
    await expect(read({ force: true })).resolves.toEqual({ catalog, stale: false })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not promote a disk snapshot to fresh memory or lose it on failed refresh', async () => {
    const cachePath = await cacheFile()
    await createCatalogReader({ cachePath, fetch: online })()
    const fetch = vi.fn(offline)
    const read = createCatalogReader({ cachePath, fetch })
    const snapshot = await readFile(cachePath, 'utf8')
    await expect(read({ cachedOnly: true })).resolves.toEqual({ catalog, stale: true })
    expect(fetch).not.toHaveBeenCalled()
    await expect(read()).resolves.toEqual({ catalog, stale: true })
    expect(fetch).toHaveBeenCalledTimes(1)
    await expect(read({ cachedOnly: true })).resolves.toEqual({ catalog, stale: true })
    expect(await readFile(cachePath, 'utf8')).toBe(snapshot)
  })

  it('treats a corrupt cached-only snapshot as missing and permits online recovery', async () => {
    const cachePath = await cacheFile()
    await writeFile(cachePath, '{broken')
    const fetch = vi.fn(online)
    const read = createCatalogReader({ cachePath, fetch })
    await expect(read({ cachedOnly: true })).resolves.toEqual({ catalog: null, stale: false })
    expect(fetch).not.toHaveBeenCalled()
    await expect(read({ force: true })).resolves.toEqual({ catalog, stale: false })
    await expect(read({ cachedOnly: true })).resolves.toEqual({ catalog, stale: true })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('persists success and revalidates it after restart, keeping offline responses stale', async () => {
    const cachePath = await cacheFile()
    await expect(createCatalogReader({ cachePath, fetch: online, now: () => 123 })()).resolves.toEqual({ catalog, stale: false })
    const fetch = vi.fn(offline)
    const read = createCatalogReader({ cachePath, fetch, now: () => 124 })
    await expect(read()).resolves.toEqual({ catalog, stale: true })
    await expect(read()).resolves.toEqual({ catalog, stale: true })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(await readFile(cachePath, 'utf8')).fetchedAt).toBe(123)
  })

  it('preserves last good snapshot after forced refresh failure', async () => {
    const cachePath = await cacheFile()
    const fetch = vi.fn().mockImplementationOnce(online).mockImplementation(offline)
    const read = createCatalogReader({ cachePath, fetch })
    await read()
    const snapshot = await readFile(cachePath, 'utf8')
    await expect(read({ force: true })).resolves.toEqual({ catalog, stale: true })
    expect(await readFile(cachePath, 'utf8')).toBe(snapshot)
  })

  it.each(['invalid JSON', JSON.stringify({ schemaVersion: 1, url: 'https://market.dshdesktop.com/index.json', fetchedAt: 1, catalog: { schemaVersion: 1 } }), ' '.repeat(2 * 1024 * 1024 + 4097)])('rejects corrupt or oversized snapshots while allowing network recovery (%#)', async bad => {
    const cachePath = await cacheFile()
    await writeFile(cachePath, bad)
    const onWarning = vi.fn()
    await expect(createCatalogReader({ cachePath, fetch: offline, onWarning })()).rejects.toThrow('offline')
    expect(onWarning).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('cache read failed') }))
    await expect(createCatalogReader({ cachePath, fetch: online })()).resolves.toEqual({ catalog, stale: false })
    await expect(createCatalogReader({ cachePath, fetch: offline })()).resolves.toEqual({ catalog, stale: true })
  })

  it('does not use a different market snapshot', async () => {
    const cachePath = await cacheFile()
    await createCatalogReader({ cachePath, fetch: online })()
    await expect(createCatalogReader({ cachePath, fetch: offline, url: 'https://other.example/index.json' })()).rejects.toThrow('offline')
  })

  it('retains the network error when no snapshot exists', async () => {
    await expect(createCatalogReader({ cachePath: await cacheFile(), fetch: offline })()).rejects.toThrow('offline')
  })

  it('reports write errors without blocking network success', async () => {
    const parent = await cacheFile()
    await writeFile(parent, 'not a directory')
    const onWarning = vi.fn()
    await expect(createCatalogReader({ cachePath: join(parent, 'catalog.json'), fetch: online, onWarning })()).resolves.toEqual({ catalog, stale: false })
    expect(onWarning).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('cache write failed') }))
  })

  it('merges concurrent reads and forced requests, then serves the fresh memory snapshot', async () => {
    const cachePath = await cacheFile()
    let resolve
    const fetch = vi.fn(() => new Promise(done => { resolve = done }))
    const read = createCatalogReader({ cachePath, fetch })
    const first = read()
    const second = read({ force: true })
    resolve(Response.json(catalog))
    await expect(Promise.all([first, second])).resolves.toEqual([{ catalog, stale: false }, { catalog, stale: false }])
    await expect(read()).resolves.toEqual({ catalog, stale: false })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
