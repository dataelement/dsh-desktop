import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { selectMarketFetch } from '../packages/dsh-desktop-workbenches/market-fetch.mjs'
import { MAX_PACKAGE_BYTES, resolveInstallTarget } from '../packages/dsh-desktop-workbenches/market-install.mjs'

const release = { distribution: { type: 'github-release', version: '1.0.0', url: 'https://github.com/o/r/releases/download/v1/w.tgz', sha256: 'a'.repeat(64) } }
afterEach(() => vi.unstubAllGlobals())

describe('workbench download transport', () => {
  it('uses the utility Chromium transport with its receiver, URL and abort signal', async () => {
    const net = { fetch: vi.fn(function (url, options) {
      expect(this).toBe(net)
      expect(url).toBe(release.distribution.url)
      expect(options.redirect).toBe('follow')
      expect(options.signal).toBeInstanceOf(AbortSignal)
      return new Response('missing', { status: 404 })
    }) }
    const fallback = vi.fn()
    vi.stubGlobal('fetch', fallback)
    const fetchImpl = selectMarketFetch({ runtime: { versions: { electron: '43.0.0' }, type: 'utility' }, loadElectron: () => ({ net }) })
    await expect(resolveInstallTarget(release, { fetchImpl })).rejects.toThrow('HTTP 404')
    expect(net.fetch).toHaveBeenCalledOnce()
    expect(fallback).not.toHaveBeenCalled()
  })

  it('keeps Node fetch and never loads the electron npm launcher outside a utility process', () => {
    const loadElectron = vi.fn()
    expect(selectMarketFetch({ runtime: { versions: {} }, loadElectron })).toBe(globalThis.fetch)
    expect(selectMarketFetch({ runtime: { versions: { electron: '43.0.0' } }, loadElectron })).toBe(globalThis.fetch)
    expect(loadElectron).not.toHaveBeenCalled()
  })

  it('does not silently fall back when the utility transport cannot load', () => {
    const runtime = { versions: { electron: '43.0.0' }, type: 'utility' }
    expect(() => selectMarketFetch({ runtime, loadElectron: () => { throw new Error('load failure') } })).toThrow('load failure')
    expect(() => selectMarketFetch({ runtime, loadElectron: () => ({}) })).toThrow('transport is unavailable')
  })

  it.each([
    [new TypeError('fetch failed https://secret/?token=private', { cause: Object.assign(new Error('private'), { code: 'ECONNRESET' }) }), 'ECONNRESET'],
    [new Error('net::ERR_PROXY_CONNECTION_FAILED at https://user:private@host'), 'ERR_PROXY_CONNECTION_FAILED'],
    [new DOMException('private', 'TimeoutError'), 'TIMEOUT'],
    [new AggregateError([Object.assign(new Error('private'), { code: 'ENOTFOUND' })], 'private'), 'ENOTFOUND'],
    [new Error('https://host/?token=private'), 'NETWORK_ERROR']
  ])('reports only safe network diagnostics', async (error, code) => {
    await expect(resolveInstallTarget(release, { fetchImpl: async () => { throw error } })).rejects.toMatchObject({
      status: 502, code: 'download_failed', params: { diagnostic: code }, message: `Could not download the Release package: ${code}.`
    })
  })

  it.each([
    ['not a URL', 'invalid_download_url'],
    ['http://example.com/package.tgz', 'unsafe_download_url'],
    ['https://user:private@example.com/package.tgz', 'unsafe_download_url'],
    ['https://example.com:444/package.tgz', 'unsafe_download_url']
  ])('rejects unsafe download addresses with stable locale codes', async (url, code) => {
    const fetchImpl = vi.fn()
    await expect(resolveInstallTarget({ distribution: { ...release.distribution, url } }, { fetchImpl })).rejects.toMatchObject({ status: 502, code, params: undefined })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('normalizes an interrupted response and creates no partial package', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-market-download-test-'))
    try {
      let reads = 0
      const body = new ReadableStream({ pull(controller) {
        if (reads++ === 0) controller.enqueue(new Uint8Array([1, 2]))
        else controller.error(new TypeError('terminated private', { cause: Object.assign(new Error('private'), { code: 'UND_ERR_SOCKET' }) }))
      } })
      await expect(resolveInstallTarget(release, { temporaryRoot: root, fetchImpl: async () => new Response(body) })).rejects.toMatchObject({
        status: 502, code: 'download_interrupted', params: { diagnostic: 'UND_ERR_SOCKET' }, message: 'Could not finish downloading the Release package: UND_ERR_SOCKET.'
      })
      expect(body.locked).toBe(false)
      expect(await readdir(root)).toEqual([])
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('still cancels oversized streams before accepting a package', async () => {
    const cancel = vi.fn()
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_PACKAGE_BYTES + 1)) }, cancel })
    await expect(resolveInstallTarget(release, { fetchImpl: async () => new Response(body) })).rejects.toThrow('larger than')
    expect(cancel).toHaveBeenCalledOnce()
    expect(body.locked).toBe(false)
  })

  it.each(['file:///private/package.tgz', 'http://github.com/a.tgz', 'https://user:secret@github.com/a.tgz', 'https://github.com:8443/a.tgz'])('rejects unsafe package addresses before transport', async (url) => {
    const fetchImpl = vi.fn()
    await expect(resolveInstallTarget({ distribution: { ...release.distribution, url } }, { fetchImpl })).rejects.toThrow('must use HTTPS')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
