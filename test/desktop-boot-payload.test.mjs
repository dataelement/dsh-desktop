import { describe, expect, it, vi } from 'vitest'
import { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { DESKTOP_BOOT_PATH, registerDesktopBootRoute } from '../packages/dsh-desktop-client-ui/boot.js'
import { apply, inject } from '../packages/dsh-desktop-client-ui/index.js'

function harness() {
  const cleanups = []
  let rows = []
  const emit = vi.fn((event, table) => {
    expect(event).toBe('webserver/index-inject')
    table.push(...rows)
  })
  // Exercise the installed public API, including exact matching and its disposer.
  const webServer = {
    exact: new Map(),
    prefixes: new Map(),
    ctx: { emit },
    register: WebServer.prototype.register,
    match: WebServer.prototype.match,
    collectIndexInjections: WebServer.prototype.collectIndexInjections
  }
  const authorizeIndex = vi.fn((req, res) => {
    if (req.headers.cookie === 'authenticated') return true
    res.writeHead(401)
    res.end('unauthorized')
    return false
  })
  const webCtx = {
    webServer,
    connection: { authorizeIndex },
    effect(setup) { cleanups.push(setup()) }
  }
  const ctx = {
    inject: vi.fn((services, callback) => {
      expect(services).toEqual(['webServer', 'connection'])
      callback(webCtx)
    })
  }
  function request(method = 'GET', authenticated = true) {
    const req = { method, url: DESKTOP_BOOT_PATH, headers: { cookie: authenticated ? 'authenticated' : '' } }
    const headers = {}
    const res = {
      statusCode: 200,
      setHeader(name, value) { headers[name] = value },
      writeHead(status, extra = {}) { this.statusCode = status; Object.assign(headers, extra) },
      end: vi.fn()
    }
    const route = webServer.match(DESKTOP_BOOT_PATH)
    route.handler(req, res)
    return { req, res, headers }
  }
  return { ctx, webServer, authorizeIndex, emit, request, cleanups, setRows(value) { rows = value } }
}

describe('desktop boot payload route', () => {
  it('returns all live structured injection rows as no-store JSON', () => {
    const h = harness()
    const rows = [
      { kind: 'global', name: '__DSH_BOOT__', value: { revision: 'first', entries: [] } },
      { kind: 'script', src: '/modules/bootstrap.js', placement: 'head' },
      { kind: 'global', name: '__DSH_CONNECTION_RECOVERY__', value: { enabled: true } }
    ]
    h.setRows(rows)
    registerDesktopBootRoute(h.ctx)
    expect(h.emit).not.toHaveBeenCalled()
    const first = h.request()
    expect(first.res.statusCode).toBe(200)
    expect(first.headers).toEqual({ 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' })
    expect(JSON.parse(first.res.end.mock.calls[0][0])).toEqual({ injections: rows })
    h.setRows([{ kind: 'global', name: '__DSH_BOOT__', value: { revision: 'second', entries: ['updated'] } }])
    expect(JSON.parse(h.request().res.end.mock.calls[0][0]).injections[0].value.revision).toBe('second')
    expect(h.emit).toHaveBeenCalledTimes(2)
  })

  it('requires the same browser authentication as the index before collecting rows', () => {
    const h = harness()
    registerDesktopBootRoute(h.ctx)
    const { req, res, headers } = h.request('GET', false)
    expect(h.authorizeIndex).toHaveBeenCalledWith(req, res)
    expect(res.statusCode).toBe(401)
    expect(headers['cache-control']).toBe('no-store')
    expect(res.end).toHaveBeenCalledExactlyOnceWith('unauthorized')
    expect(h.emit).not.toHaveBeenCalled()
  })

  it.each(['POST', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'])('rejects %s with 405 without collecting injections', method => {
    const h = harness()
    registerDesktopBootRoute(h.ctx)
    const { res, headers } = h.request(method)
    expect(res.statusCode).toBe(405)
    expect(headers).toEqual({ 'cache-control': 'no-store', allow: 'GET' })
    expect(res.end).toHaveBeenCalledExactlyOnceWith()
    expect(h.emit).not.toHaveBeenCalled()
    expect(h.authorizeIndex).not.toHaveBeenCalled()
  })

  it('owns an exact route through the injected effect and removes it on unload', () => {
    const h = harness()
    registerDesktopBootRoute(h.ctx)
    expect(h.ctx.inject).toHaveBeenCalledOnce()
    expect(h.webServer.match(DESKTOP_BOOT_PATH).kind).toBe('exact')
    expect(h.webServer.match(DESKTOP_BOOT_PATH + '/nested')).toBeUndefined()
    expect(h.cleanups).toHaveLength(1)
    h.cleanups[0]()
    expect(h.webServer.match(DESKTOP_BOOT_PATH)).toBeUndefined()
    registerDesktopBootRoute(h.ctx)
    expect(h.webServer.match(DESKTOP_BOOT_PATH)).toBeDefined()
  })

  it('registers the route before waiting for repair mode without altering failure propagation', async () => {
    const h = harness()
    let rejectPreset
    const pending = new Promise((_resolve, reject) => { rejectPreset = reject })
    h.ctx.agentPresets = { register: vi.fn(() => pending) }
    expect(inject).toEqual(['agentPresets'])
    const applying = apply(h.ctx)
    expect(h.webServer.match(DESKTOP_BOOT_PATH)).toBeDefined()
    expect(h.ctx.agentPresets.register).toHaveBeenCalledOnce()
    const failure = new Error('repair registration failed')
    rejectPreset(failure)
    await expect(applying).rejects.toBe(failure)
  })

  it('preserves collection failures for the host error handler', () => {
    const h = harness()
    registerDesktopBootRoute(h.ctx)
    const failure = new Error('injection listener failed')
    h.emit.mockImplementation(() => { throw failure })
    expect(() => h.request()).toThrow(failure)
  })
})
