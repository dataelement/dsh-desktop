import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { HarnessShell, HARNESS_SHELL_URL, isHarnessShellUrl } from '../src/main/harness-shell'

let root: string
let shell: HarnessShell
const servers: Server[] = []
const request = (path = '/', init?: RequestInit): Request => new Request(HARNESS_SHELL_URL + path.replace(/^\//, ''), init)
const authResponse = (): Response => new Response(null, { status: 303, headers: { location: '/', 'set-cookie': 'session=owned; HttpOnly; Path=/' } })

async function server(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<string> {
  const instance = createServer(handler)
  servers.push(instance)
  await new Promise<void>(resolve => instance.listen(0, '127.0.0.1', resolve))
  const address = instance.address()
  if (!address || typeof address === 'string') throw new Error('Missing test server address')
  return 'http://127.0.0.1:' + address.port
}

async function backend(): Promise<{ origin: string, seen: IncomingMessage[] }> {
  const seen: IncomingMessage[] = []
  const origin = await server((req, res) => {
    seen.push(req)
    if (req.url === '/?token=secret') {
      res.writeHead(303, { location: '/', 'set-cookie': 'session=owned; HttpOnly; Path=/' }).end()
    } else if (req.headers.cookie !== 'session=owned') {
      res.writeHead(401).end()
    } else if (req.url === '/api/desktop/boot') {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ injections: [{ kind: 'global', name: '__DSH_BOOT__', value: { test: true } }] }))
    } else if (req.url === '/external') {
      res.writeHead(302, { location: 'https://example.com/private', 'set-cookie': 'bad=secret' }).end()
    } else if (req.url === '/redirect') {
      res.writeHead(307, { location: '/api/next?q=yes' }).end()
    } else {
      res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'must=not-leak', 'cache-control': 'public, max-age=86400' })
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => res.end(JSON.stringify({ path: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() })))
    }
  })
  return { origin, seen }
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'harness-shell-'))
  await mkdir(join(root, 'assets'))
  await writeFile(join(root, 'index.html'), '<!doctype html><html><head><script type="module" src="/assets/app.js"></script></head><body></body></html>')
  for (const [name, content] of [['assets/app.js', 'export const ready = true'], ['assets/app.css', 'body{}'], ['assets/font.woff2', 'font'], ['favicon.svg', '<svg/>'], ['manifest.webmanifest', '{}']]) {
    if (name && content) await writeFile(join(root, name), content)
  }
  shell = new HarnessShell({ frontendRoot: root })
})

afterEach(async () => {
  shell.reset()
  vi.useRealTimers()
  for (const instance of servers.splice(0)) {
    instance.closeAllConnections()
    await new Promise<void>((resolve, reject) => instance.close(error => error ? reject(error) : resolve()))
  }
  await rm(root, { recursive: true, force: true })
})

describe('packaged Harness shell', () => {
  it('authenticates native sockets only for the owned backend and shell origin, then revokes them on reset', async () => {
    const host = await backend()
    const url = host.origin.replace('http:', 'ws:') + '/api/gateway'
    expect(shell.authorizeWebSocket(url, { Origin: 'dsh-desktop://harness' })).toBeUndefined()
    await shell.connect(host.origin, 'secret')
    expect(shell.authorizeWebSocket(url, { Origin: 'dsh-desktop://harness', Cookie: 'untrusted=bad' })).toEqual({
      requestHeaders: { origin: host.origin, cookie: 'session=owned', 'sec-fetch-site': 'same-origin' }
    })
    expect(shell.authorizeWebSocket(url, { Origin: 'https://evil.invalid' })).toEqual({ cancel: true })
    expect(shell.authorizeWebSocket(url, {})).toEqual({ cancel: true })
    expect(shell.authorizeWebSocket('ws://127.0.0.1:1/api/gateway', { Origin: 'dsh-desktop://harness' })).toBeUndefined()
    expect(shell.authorizeWebSocket('wss://' + new URL(host.origin).host, { Origin: 'dsh-desktop://harness' })).toBeUndefined()
    shell.reset()
    expect(shell.authorizeWebSocket(url, { Origin: 'dsh-desktop://harness' })).toBeUndefined()
  })
  it('recognizes its own origin without trusting desktop pages, credentials or ports', () => {
    expect(isHarnessShellUrl(HARNESS_SHELL_URL)).toBe(true)
    for (const url of ['dsh-desktop://desktop/', 'dsh-desktop://harness:80/', 'dsh-desktop://user@harness/', 'https://harness/', 'garbage']) expect(isHarnessShellUrl(url)).toBe(false)
  })

  it('serves shell before backend readiness with deferred ahead of module and correct MIME/HEAD', async () => {
    const response = await shell.handle(request())
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html.indexOf('__DSH_BOOT_READY__')).toBeLessThan(html.indexOf('type="module"'))
    expect(html).toContain('Promise.withResolvers()')
    expect(html).not.toContain('dshDesktopBoot.ready(')
    for (const [path, mime] of [['assets/app.js', 'text/javascript'], ['assets/app.css', 'text/css'], ['assets/font.woff2', 'font/woff2'], ['favicon.svg', 'image/svg+xml'], ['manifest.webmanifest', 'application/manifest+json']]) {
      const response = await shell.handle(request(path))
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain(mime)
      const head = await shell.handle(request(path, { method: 'HEAD' }))
      expect(await head.text()).toBe('')
    }
    expect((await shell.handle(request('api/test'))).status).toBe(503)
    expect((await shell.handle(request('index.html', { method: 'POST' }))).status).toBe(405)
  })

  it('confines assets including symlink, encoded slash, backslash and double encoding', async () => {
    await writeFile(join(root, 'private.txt'), 'private')
    await symlink(join(root, 'private.txt'), join(root, 'assets', 'in-root.txt'))
    await symlink(join(root, '..'), join(root, 'assets', 'outside'))
    await symlink(process.execPath, join(root, 'assets', 'escape.js'))
    expect((await shell.handle(request('assets/escape.js'))).status).toBe(404)
    for (const path of ['private.txt', 'assets/%2e%2e%2fprivate.txt', 'assets/%252e%252e/private.txt', 'assets/a%5cb', 'assets/%00', 'assets/%ZZ', 'assets/outside/file', 'assets/missing.js']) {
      const response = await shell.handle(request(path))
      expect([404, 503]).toContain(response.status)
      expect(await response.text()).not.toContain('private')
    }
    expect(await (await shell.handle(request('assets/in-root.txt'))).text()).toBe('private')
    expect((await shell.handle(new Request('dsh-desktop://desktop/index.html'))).status).toBe(404)
  })

  it('authenticates once, resolves early waiters, proxies body and confines credentials', async () => {
    const { origin, seen } = await backend()
    const waiting = shell.waitUntilReady()
    const connecting = shell.connect(origin, 'secret')
    expect(shell.connect(origin, 'secret')).toBe(connecting)
    const boot = await connecting
    expect(await waiting).toEqual(boot)
    expect(boot.streamBaseUrl).toBe(origin)
    expect(boot.injections).toHaveLength(1)
    await shell.connect(origin, 'secret')
    expect(seen.filter(req => req.url === '/?token=secret')).toHaveLength(1)
    const response = await shell.handle(request('api/echo?q=1', { method: 'POST', body: 'payload', headers: {
      origin: 'dsh-desktop://harness', cookie: 'attacker=yes', host: 'evil.example', 'sec-fetch-site': 'cross-site', 'x-custom': 'kept'
    } }))
    const payload = await response.json()
    expect(payload.path).toBe('/api/echo?q=1')
    expect(payload.body).toBe('payload')
    expect(payload.headers.cookie).toBe('session=owned')
    expect(payload.headers.host).toBe(new URL(origin).host)
    expect(payload.headers.origin).toBeUndefined()
    expect(payload.headers['sec-fetch-site']).toBeUndefined()
    expect(payload.headers['x-custom']).toBe('kept')
    for (const header of ['set-cookie', 'content-length', 'transfer-encoding', 'connection', 'keep-alive']) expect(response.headers.has(header)).toBe(false)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect((await shell.handle(request('api/echo', { headers: { origin: 'null' } }))).status).toBe(403)
    const redirect = await shell.handle(request('redirect'))
    expect(redirect.headers.get('location')).toBe('dsh-desktop://harness/api/next?q=yes')
    expect((await shell.handle(request('external'))).status).toBe(502)
    // A network-path reference must never change the backend receiving the cookie.
    const unusual = await shell.handle(new Request('dsh-desktop://harness//example.com/api'))
    expect((await unusual.json()).path).toBe('//example.com/api')
    shell.reset()
    expect((await shell.handle(request('api/echo'))).status).toBe(503)
  })

  it('reloads the current boot graph after multiple HMR revisions without authenticating again', async () => {
    let revision = 1
    let authentications = 0
    const origin = await server((req, res) => {
      if (req.url === '/?token=secret') {
        authentications++
        res.writeHead(303, { location: '/', 'set-cookie': 'session=owned; Path=/' }).end()
      } else if (req.headers.cookie !== 'session=owned') {
        res.writeHead(401).end()
      } else if (req.url === '/api/desktop/boot') {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ injections: [{ kind: 'script-src', src: `/plugins/app.js?rev=${revision}` }] }))
      } else if (req.url === `/plugins/app.js?rev=${revision}`) {
        res.end('current bundle')
      } else {
        res.writeHead(404).end()
      }
    })
    const initialPage = shell.waitUntilReady()
    await shell.connect(origin, 'secret')
    expect((await initialPage).injections).toEqual([{ kind: 'script-src', src: '/plugins/app.js?rev=1' }])
    for (const next of [2, 3]) {
      revision = next
      await shell.connect(origin, 'secret')
      const boot = await shell.waitUntilReady()
      expect(boot.injections).toEqual([{ kind: 'script-src', src: `/plugins/app.js?rev=${next}` }])
      expect((await shell.handle(request(`plugins/app.js?rev=${next}`))).status).toBe(200)
    }
    expect((await shell.handle(request('plugins/app.js?rev=1'))).status).toBe(404)
    expect(authentications).toBe(1)
  })

  it('rejects a failed page refresh without serving stale injections, and allows retry', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(authResponse()).mockResolvedValueOnce(Response.json({ injections: ['initial'] }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ injections: ['current'] }))
    shell = new HarnessShell({ frontendRoot: root, fetch: fetcher })
    await shell.connect('http://127.0.0.1:9999')
    await expect(shell.waitUntilReady()).rejects.toMatchObject({ cause: { message: 'Harness boot request failed (HTTP 503)' } })
    expect((await shell.waitUntilReady()).injections).toEqual(['current'])
  })

  it('cancels pending page refreshes on reset and rejects late results from the old backend', async () => {
    let completeOld!: (response: Response) => void
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(authResponse()).mockResolvedValueOnce(Response.json({ injections: ['initial'] }))
      .mockImplementationOnce(() => new Promise(resolve => { completeOld = resolve }))
      .mockResolvedValueOnce(authResponse()).mockResolvedValueOnce(Response.json({ injections: ['new'] }))
      .mockImplementation(() => Promise.resolve(Response.json({ injections: ['new'] })))
    shell = new HarnessShell({ frontendRoot: root, fetch: fetcher })
    await shell.connect('http://127.0.0.1:9999')
    const refresh = shell.waitUntilReady()
    const assertion = expect(refresh).rejects.toMatchObject({ cause: { message: 'Harness connection superseded' } })
    const signal = fetcher.mock.calls[2]?.[1]?.signal
    shell.reset()
    expect(signal?.aborted).toBe(true)
    const pendingPage = shell.waitUntilReady()
    await shell.connect('http://127.0.0.1:9998')
    completeOld(Response.json({ injections: ['stale'] }))
    await assertion
    expect((await pendingPage).injections).toEqual(['new'])
  })

  it.each([new Response('no', { status: 401 }), new Response(null, { status: 303, headers: { location: 'https://example.com/', 'set-cookie': 'session=secret' } })])('rejects failed auth without forwarding credentials or exposing secrets', async response => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response)
    shell = new HarnessShell({ frontendRoot: root, fetch: fetcher })
    const waiting = shell.waitUntilReady()
    await expect(shell.connect('http://127.0.0.1:9999', 'secret')).rejects.toThrow('Harness shell connection failed')
    await expect(waiting).rejects.toThrow('Harness shell connection failed')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect((await shell.handle(request('api/test'))).status).toBe(503)
  })

  it.each([{ injections: null }, {}, [], null])('rejects malformed boot payload and keeps proxy unavailable', async payload => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(authResponse()).mockResolvedValueOnce(Response.json(payload))
    shell = new HarnessShell({ frontendRoot: root, fetch: fetcher })
    await expect(shell.connect('http://127.0.0.1:9999')).rejects.toThrow()
    await expect(shell.waitUntilReady()).rejects.toThrow()
    expect((await shell.handle(request('plugins/test.js'))).status).toBe(503)
  })

  it('rejects old waiters and prevents an old boot result overwriting a new generation', async () => {
    let completeOld!: (response: Response) => void
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(authResponse())
      .mockImplementationOnce(() => new Promise(resolve => { completeOld = resolve }))
      .mockResolvedValueOnce(authResponse()).mockResolvedValueOnce(Response.json({ injections: ['new'] }))
      .mockImplementation(() => Promise.resolve(Response.json({ injections: ['new'] })))
    shell = new HarnessShell({ frontendRoot: root, fetch: fetcher })
    const oldWaiter = shell.waitUntilReady()
    const old = shell.connect('http://127.0.0.1:9999')
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
    const oldSignal = fetcher.mock.calls[1]?.[1]?.signal
    shell.reset()
    expect(oldSignal?.aborted).toBe(true)
    await expect(oldWaiter).rejects.toThrow('reset')
    const current = await shell.connect('http://127.0.0.1:9998')
    completeOld(Response.json({ injections: ['old'] }))
    await expect(old).rejects.toThrow()
    expect(await shell.waitUntilReady()).toEqual(current)
  })

  it.each(['https://127.0.0.1:9999', 'http://example.com', 'http://user:secret@127.0.0.1', 'http://127.0.0.2:9999'])('rejects non-owned backend URL %s before sending anything', async url => {
    const fetcher = vi.fn<typeof fetch>()
    shell = new HarnessShell({ frontendRoot: root, fetch: fetcher })
    await expect(shell.connect(url)).rejects.toThrow('Harness shell connection failed')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reset cancels a live stream and clears credentials before a fresh connection', async () => {
    const cancelled = vi.fn()
    const upstream = new ReadableStream<Uint8Array>({ cancel: cancelled })
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(authResponse()).mockResolvedValueOnce(Response.json({ injections: [] })).mockResolvedValueOnce(new Response(upstream))
    shell = new HarnessShell({ frontendRoot: root, fetch: fetcher })
    await shell.connect('http://127.0.0.1:9999')
    const response = await shell.handle(request('plugins/live.js'))
    const read = response.body?.getReader().read()
    shell.reset()
    await expect(read).rejects.toThrow('cancelled')
    expect(cancelled).toHaveBeenCalledOnce()
    expect((await shell.handle(request('plugins/live.js'))).status).toBe(503)
  })

  it('bounds authentication time and rejects pending readiness', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    }))
    shell = new HarnessShell({ frontendRoot: root, fetch: fetcher })
    const connecting = shell.connect('http://127.0.0.1:9999')
    const assertion = expect(connecting).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(30_000)
    await assertion
    await expect(shell.waitUntilReady()).rejects.toThrow()
  })

  it('streams immediately and forwards renderer cancellation/reset to the upstream stream', async () => {
    const cancelled = vi.fn()
    const upstream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('first')) }, cancel: cancelled })
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(authResponse()).mockResolvedValueOnce(Response.json({ injections: [] })).mockResolvedValueOnce(new Response(upstream, { headers: { 'content-encoding': 'gzip', 'content-length': '100' } }))
    shell = new HarnessShell({ frontendRoot: root, fetch: fetcher })
    await shell.connect('http://127.0.0.1:9999')
    const controller = new AbortController()
    const response = await shell.handle(request('api/stream', { signal: controller.signal }))
    expect(response.headers.has('content-encoding')).toBe(false)
    const reader = response.body?.getReader()
    expect(new TextDecoder().decode((await reader?.read())?.value)).toBe('first')
    const pending = reader?.read()
    controller.abort()
    await expect(pending).rejects.toThrow('cancelled')
    expect(cancelled).toHaveBeenCalledOnce()
    expect(fetcher.mock.calls[2]?.[1]?.signal?.aborted).toBe(true)
  })
})
