import { readFile, realpath } from 'node:fs/promises'
import { extname, isAbsolute, relative, resolve } from 'node:path'

import { isHarnessShellUrl, type HarnessBootPayload } from '../shared/harness-boot'
export { HARNESS_SHELL_URL, isHarnessShellUrl } from '../shared/harness-boot'
const SHELL_ORIGIN = 'dsh-desktop://harness'
const TIMEOUT_MS = 30_000
const RESPONSE_PRIVATE_HEADERS = ['set-cookie', 'content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive', 'te', 'trailer', 'upgrade', 'proxy-authenticate', 'proxy-authorization']
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon'
}

export type HarnessShellBoot = HarnessBootPayload

export interface HarnessShellOptions {
  frontendRoot: string
  fetch?: typeof fetch
}

// Installed before the module script; preload owns the narrow IPC invocation.
const BOOT_SCRIPT = '<script>globalThis.__DSH_BOOT_READY__ ??= Promise.withResolvers();globalThis.__DSH_BOOT_READY__.promise.catch(()=>{});</script>'

function confined(root: string, file: string): boolean {
  const path = relative(root, file)
  return path !== '..' && !path.startsWith('../') && !path.startsWith('..\\') && !isAbsolute(path)
}

function localPath(url: URL): string | undefined {
  if (/%(?:2f|5c|25)/i.test(url.pathname)) return undefined
  let path: string
  try { path = decodeURIComponent(url.pathname) } catch { return undefined }
  if (path.includes('\\') || path.includes('\0') || path.split('/').some(part => part === '.' || part === '..')) return undefined
  if (path === '/' || path === '/index.html') return 'index.html'
  if (path === '/favicon.svg' || path === '/manifest.webmanifest') return path.slice(1)
  if (path.startsWith('/assets/') && path.length > 8 && !path.includes('//') && !path.includes(':')) return path.slice(1)
  return undefined
}

export class HarnessShell {
  private readonly frontendRoot: string
  private readonly fetcher: typeof fetch
  private generation = 0
  private connection?: { key: string, promise: Promise<HarnessShellBoot> }
  private backend?: { origin: string, cookie: string }
  private readonly active = new Set<AbortController>()
  private readiness!: Promise<HarnessShellBoot>
  private resolveReady!: (boot: HarnessShellBoot) => void
  private rejectReady!: (error: Error) => void

  constructor(options: HarnessShellOptions) {
    this.frontendRoot = resolve(options.frontendRoot)
    this.fetcher = options.fetch ?? globalThis.fetch
    this.newReadiness()
  }

  private newReadiness(): void {
    this.readiness = new Promise((resolve, reject) => {
      this.resolveReady = resolve
      this.rejectReady = reject
    })
    // IPC may subscribe after startup fails. Keep the original rejected promise observable.
    void this.readiness.catch(() => {})
  }

  reset(reason = new Error('Harness shell reset')): void {
    this.generation++
    this.backend = undefined
    this.connection = undefined
    this.rejectReady(reason)
    for (const controller of this.active) controller.abort(reason)
    this.active.clear()
    this.newReadiness()
  }

  begin(): void { this.reset() }

  async waitUntilReady(): Promise<HarnessShellBoot> {
    const generation = this.generation
    const backend = this.backend
    if (!backend) {
      const boot = await this.readiness
      if (generation !== this.generation) throw new Error('Harness connection superseded')
      return boot
    }
    // Authentication survives page reloads, but graph revisions and injection
    // rows can change through HMR without restarting the backend.
    const operation = this.operation()
    try {
      const boot = await this.readBootPayload(backend, operation.signal)
      if (generation !== this.generation || operation.signal.aborted) throw new Error('Harness connection superseded')
      return boot
    } catch (cause) {
      throw new Error('Harness shell page boot payload request failed', { cause })
    } finally {
      operation.finish()
    }
  }

  private async readBootPayload(backend: { origin: string, cookie: string }, signal: AbortSignal): Promise<HarnessShellBoot> {
    const response = await this.fetcher(new URL('/api/desktop/boot', backend.origin), {
      headers: { cookie: backend.cookie }, redirect: 'manual', signal
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`Harness boot request failed (HTTP ${response.status})`)
    }
    const payload: unknown = await response.json()
    if (!payload || typeof payload !== 'object' || !('injections' in payload) || !Array.isArray(payload.injections)) {
      throw new Error('Invalid Harness boot payload')
    }
    return { injections: payload.injections, streamBaseUrl: backend.origin }
  }

  private operation(signal?: AbortSignal): { signal: AbortSignal, finish: () => void, headersReceived: () => void } {
    const controller = new AbortController()
    this.active.add(controller)
    const abort = (): void => controller.abort(signal?.reason)
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => controller.abort(new Error('Harness request timed out')), TIMEOUT_MS)
    timer.unref()
    const finish = (): void => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      this.active.delete(controller)
    }
    return { signal: controller.signal, finish, headersReceived: () => clearTimeout(timer) }
  }

  connect(value: string, token?: string): Promise<HarnessShellBoot> {
    const key = JSON.stringify([value, token])
    if (this.connection?.key === key) return this.connection.promise
    if (this.connection) this.reset()
    const promise = this.performConnect(value, token)
    void promise.catch(() => {})
    this.connection = { key, promise }
    return promise
  }

  private async performConnect(value: string, token?: string): Promise<HarnessShellBoot> {
    const generation = this.generation
    const operation = this.operation()
    let stage = 'backend validation'
    try {
      const url = new URL(value)
      if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname) || url.username || url.password) {
        throw new Error('Harness backend must be an owned loopback HTTP URL')
      }
      if (token !== undefined) url.searchParams.set('token', token)
      stage = 'authentication request'
      const auth = await this.fetcher(url.href, { redirect: 'manual', signal: operation.signal })
      stage = `authentication (HTTP ${auth.status})`
      const cookies = auth.headers.getSetCookie()
      const cookie = cookies.map(value => value.split(';', 1)[0]).filter(Boolean).join('; ')
      const location = auth.headers.get('location')
      await auth.body?.cancel()
      if (operation.signal.aborted) throw new Error('Harness authentication cancelled')
      if (auth.status !== 303 || !cookie || !location || new URL(location, url).origin !== url.origin) {
        throw new Error('Harness authentication failed')
      }
      stage = 'boot payload request'
      const boot = await this.readBootPayload({ origin: url.origin, cookie }, operation.signal)
      if (generation !== this.generation || operation.signal.aborted) throw new Error('Harness connection superseded')
      this.backend = { origin: url.origin, cookie }
      this.resolveReady(boot)
      return boot
    } catch (cause) {
      const error = new Error(`Harness shell connection failed during ${stage}`, { cause })
      if (generation === this.generation) this.rejectReady(error)
      throw error
    } finally {
      operation.finish()
    }
  }

  /** Native WebSockets bypass protocol.handle; credentials stay in main. */
  authorizeWebSocket(url: string, input: Record<string, string>): { requestHeaders: Record<string, string> } | { cancel: true } | undefined {
    if (!this.backend) return undefined
    const target = new URL(this.backend.origin)
    let requested: URL
    try { requested = new URL(url) } catch { return undefined }
    if (requested.host !== target.host || requested.protocol !== 'ws:') return undefined
    const headers = Object.fromEntries(Object.entries(input).map(([name, value]) => [name.toLowerCase(), value]))
    if (headers.origin !== SHELL_ORIGIN) return { cancel: true }
    return { requestHeaders: { ...headers, origin: target.origin, cookie: this.backend.cookie, 'sec-fetch-site': 'same-origin' } }
  }

  async handle(request: Request): Promise<Response> {
    if (!isHarnessShellUrl(request.url)) return new Response('Not found', { status: 404 })
    const origin = request.headers.get('origin')
    if (origin !== null && origin !== SHELL_ORIGIN) return new Response('Forbidden', { status: 403 })
    const url = new URL(request.url)
    const path = localPath(url)
    if (path !== undefined) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })
      try {
        const root = await realpath(this.frontendRoot)
        const file = await realpath(resolve(root, path))
        if (!confined(root, file)) return new Response('Not found', { status: 404 })
        const bytes = await readFile(file, { signal: request.signal })
        let body: ArrayBuffer | string = new Uint8Array(bytes).buffer
        if (path === 'index.html') {
          const html = bytes.toString('utf8')
          if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error('Missing frontend head')
          body = html.replace(/<head(?:\s[^>]*)?>/i, head => head + BOOT_SCRIPT)
        }
        return new Response(request.method === 'HEAD' ? null : body, {
          headers: { 'content-type': MIME[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' }
        })
      } catch {
        return new Response('Not found', { status: 404 })
      }
    }
    // Invalid asset paths never fall through to the backend.
    if (url.pathname.startsWith('/assets') || /%(?:2f|5c|25)/i.test(url.pathname) || url.pathname.includes('\\')) return new Response('Not found', { status: 404 })
    const backend = this.backend
    if (!backend) return new Response('Harness unavailable', { status: 503, headers: { 'cache-control': 'no-store' } })
    const operation = this.operation(request.signal)
    try {
      const headers = new Headers(request.headers)
      for (const name of ['host', 'origin', 'cookie', 'sec-fetch-site']) headers.delete(name)
      headers.set('cookie', backend.cookie)
      const init: RequestInit & { duplex?: 'half' } = {
        method: request.method, headers, redirect: 'manual', signal: operation.signal
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = request.body
        init.duplex = 'half'
      }
      const targetUrl = new URL(backend.origin)
      targetUrl.pathname = url.pathname
      targetUrl.search = url.search
      const response = await this.fetcher(targetUrl, init)
      if (operation.signal.aborted) throw new Error('Harness request cancelled')
      operation.headersReceived()
      const responseHeaders = new Headers(response.headers)
      for (const name of RESPONSE_PRIVATE_HEADERS) responseHeaders.delete(name)
      responseHeaders.set('cache-control', 'no-store')
      const location = responseHeaders.get('location')
      if (location) {
        const target = new URL(location, backend.origin)
        if (target.origin !== backend.origin) {
          await response.body?.cancel()
          operation.finish()
          return new Response('External redirect refused', { status: 502 })
        }
        responseHeaders.set('location', SHELL_ORIGIN + target.pathname + target.search + target.hash)
      }
      if (!response.body || request.method === 'HEAD') {
        await response.body?.cancel()
        operation.finish()
        return new Response(null, { status: response.status, statusText: response.statusText, headers: responseHeaders })
      }
      const reader = response.body.getReader()
      let abort: () => void
      const finish = (): void => { operation.signal.removeEventListener('abort', abort); operation.finish() }
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          abort = () => {
            controller.error(new Error('Harness request cancelled'))
            // Cancellation can race a disconnected backend; the renderer already has the failure.
            void reader.cancel().catch(() => {})
            finish()
          }
          operation.signal.addEventListener('abort', abort, { once: true })
        },
        async pull(controller) {
          try {
            const chunk = await reader.read()
            if (operation.signal.aborted) throw new Error('Harness request cancelled')
            if (chunk.done) { controller.close(); finish() } else controller.enqueue(chunk.value)
          } catch (error) { controller.error(error); finish() }
        },
        async cancel(reason) { try { await reader.cancel(reason) } finally { finish() } }
      })
      return new Response(body, { status: response.status, statusText: response.statusText, headers: responseHeaders })
    } catch {
      operation.finish()
      return new Response('Harness proxy failed', { status: 502 })
    }
  }
}
