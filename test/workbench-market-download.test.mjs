import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { selectMarketFetch } from '../packages/dsh-desktop-workbenches/market-fetch.mjs'
import { MAX_PACKAGE_BYTES, resolveInstallTarget } from '../packages/dsh-desktop-workbenches/market-install.mjs'

const release = { distribution: { type: 'github-release', version: '1.0.0', url: 'https://github.com/o/r/releases/download/v1/w.tgz', sha256: 'a'.repeat(64) } }
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const source = { distribution: { type: 'github-source', version: '1.0.0', url: 'https://github.com/o/r', commit: 'a'.repeat(40) } }
const manifestResponse = () => new Response(JSON.stringify({ name: 'test-workbench', version: '1.0.0' }))
const transientError = () => new TypeError('fetch failed', { cause: Object.assign(new Error('private'), { code: 'UND_ERR_CONNECT_TIMEOUT' }) })

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
    vi.useFakeTimers()
    const assertion = expect(resolveInstallTarget(release, { fetchImpl: async () => { throw error } })).rejects.toMatchObject({
      status: 502, code: 'download_failed', params: { diagnostic: code }, message: `Could not download the Release package: ${code}.`
    })
    await vi.runAllTimersAsync()
    await assertion
    expect(vi.getTimerCount()).toBe(0)
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
    vi.useFakeTimers()
    const root = await mkdtemp(join(tmpdir(), 'dsh-market-download-test-'))
    try {
      const bodies = []
      const fetchImpl = vi.fn(async () => {
        let reads = 0
        const body = new ReadableStream({ pull(controller) {
          if (reads++ === 0) controller.enqueue(new Uint8Array([1, 2]))
          else controller.error(new TypeError('terminated private', { cause: Object.assign(new Error('private'), { code: 'UND_ERR_SOCKET' }) }))
        } })
        bodies.push(body)
        return new Response(body)
      })
      const assertion = expect(resolveInstallTarget(release, { temporaryRoot: root, fetchImpl })).rejects.toMatchObject({
        status: 502, code: 'download_interrupted', params: { diagnostic: 'UND_ERR_SOCKET' }, message: 'Could not finish downloading the Release package: UND_ERR_SOCKET.'
      })
      await vi.runAllTimersAsync()
      await assertion
      expect(fetchImpl).toHaveBeenCalledTimes(3)
      expect(bodies.every(body => !body.locked)).toBe(true)
      expect(await readdir(root)).toEqual([])
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('retries temporary connections exactly twice with backoff, then stops', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn(async () => { throw transientError() })
    const assertion = expect(resolveInstallTarget(source, { fetchImpl })).rejects.toMatchObject({ code: 'download_failed', params: { diagnostic: 'UND_ERR_CONNECT_TIMEOUT' } })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(3000)
    await assertion
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('recovers on the third attempt without changing transport or leaving timers', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn().mockRejectedValueOnce(transientError()).mockRejectedValueOnce(transientError()).mockImplementation(manifestResponse)
    const task = resolveInstallTarget(source, { fetchImpl })
    await vi.advanceTimersByTimeAsync(4000)
    await expect(task).resolves.toMatchObject({ expectedPluginName: 'test-workbench' })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(new Set(fetchImpl.mock.calls.map(([, options]) => options.signal)).size).toBe(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shares the 120 second budget across fetch attempts and backoff', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn().mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(transientError()), 119_500)))
    const assertion = expect(resolveInstallTarget(source, { fetchImpl })).rejects.toMatchObject({ code: 'download_failed', params: { diagnostic: 'TIMEOUT' } })
    await vi.advanceTimersByTimeAsync(119_999)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await assertion
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][1].signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not reset the budget for a retried request or its body', async () => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    const body = new ReadableStream({ cancel })
    const fetchImpl = vi.fn()
      .mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(transientError()), 60_000)))
      .mockResolvedValueOnce(new Response(body))
    const assertion = expect(resolveInstallTarget(source, { fetchImpl })).rejects.toMatchObject({ code: 'download_interrupted', params: { diagnostic: 'TIMEOUT' } })
    await vi.advanceTimersByTimeAsync(61_000)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(59_000)
    await assertion
    expect(cancel).toHaveBeenCalledOnce()
    expect(body.locked).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('bounds stalled response body reads, cancels and releases the stream', async () => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    const body = new ReadableStream({ cancel })
    const fetchImpl = vi.fn(async () => new Response(body))
    let settled = false
    const assertion = expect(resolveInstallTarget(source, { fetchImpl }).finally(() => { settled = true })).rejects.toMatchObject({ code: 'download_interrupted', params: { diagnostic: 'TIMEOUT' } })
    await vi.advanceTimersByTimeAsync(119_999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await assertion
    expect(cancel).toHaveBeenCalledOnce()
    expect(body.locked).toBe(false)
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels a response arriving after the budget even if fetch ignores abort', async () => {
    vi.useFakeTimers()
    let respond
    const cancel = vi.fn()
    const body = new ReadableStream({ cancel })
    const fetchImpl = vi.fn(() => new Promise(resolve => { respond = resolve }))
    const assertion = expect(resolveInstallTarget(source, { fetchImpl })).rejects.toMatchObject({ params: { diagnostic: 'TIMEOUT' } })
    await vi.advanceTimersByTimeAsync(120_000)
    await assertion
    respond(new Response(body))
    await vi.advanceTimersByTimeAsync(0)
    expect(cancel).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([403, 404, 429])('does not retry HTTP %s and cancels its body', async (status) => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    const body = new ReadableStream({ cancel })
    const fetchImpl = vi.fn(async () => new Response(body, { status }))
    await expect(resolveInstallTarget(source, { fetchImpl })).rejects.toThrow(`HTTP ${status}`)
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(cancel).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('recovers from an interrupted body with a fresh response', async () => {
    vi.useFakeTimers()
    const broken = new ReadableStream({ start(controller) { controller.error(transientError()) } })
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(broken)).mockImplementation(manifestResponse)
    const task = resolveInstallTarget(source, { fetchImpl })
    await vi.advanceTimersByTimeAsync(1000)
    await expect(task).resolves.toMatchObject({ expectedPluginName: 'test-workbench' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(broken.locked).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects an oversized declared length without reading or retrying', async () => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    const body = new ReadableStream({ cancel })
    const fetchImpl = vi.fn(async () => new Response(body, { headers: { 'content-length': String(MAX_PACKAGE_BYTES + 1) } }))
    await expect(resolveInstallTarget(release, { fetchImpl })).rejects.toThrow('larger than')
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(cancel).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not retry certificate errors or unclassified failures', async () => {
    vi.useFakeTimers()
    for (const error of [Object.assign(new Error('private'), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' }), new Error('private')]) {
      const fetchImpl = vi.fn(async () => { throw error })
      await expect(resolveInstallTarget(release, { fetchImpl })).rejects.toMatchObject({ code: 'download_failed' })
      expect(fetchImpl).toHaveBeenCalledOnce()
    }
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not retry checksum mismatches', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn(async () => new Response('invalid checksum'))
    await expect(resolveInstallTarget(release, { fetchImpl })).rejects.toThrow('SHA-256')
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
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
