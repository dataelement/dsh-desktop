import { createHash } from 'node:crypto'

export interface DesktopDeepLinkRoute {
  scheme: string
  hostname: string
  pathname: string
  target: string
}

type Receiver = (url: string) => void | Promise<void>
export type DeepLinkResult = 'queued' | 'rejected' | 'duplicate' | 'full' | 'closed'

// These bounds apply even when a configured target never becomes ready.
const MAX_URL_LENGTH = 8192
const MAX_PENDING = 32
const MAX_RECENT = 128
const MAX_AGE_MS = 60_000
const RESERVED_SCHEMES = new Set(['http', 'https', 'file', 'javascript', 'data', 'dsh', 'dsh-desktop'])

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Package metadata is trusted build input, but malformed declarations fail closed. */
export function desktopDeepLinkRoutes(metadata: unknown): DesktopDeepLinkRoute[] {
  if (!record(metadata) || metadata.dshDesktopDeepLinks === undefined) return []
  const routes = metadata.dshDesktopDeepLinks
  if (!Array.isArray(routes) || routes.length > 32) throw new Error('Invalid dshDesktopDeepLinks declaration')
  const seen = new Set<string>()
  return routes.map((value: unknown) => {
    if (!record(value)) throw new Error('Invalid dshDesktopDeepLinks route')
    const { scheme, hostname, pathname, target } = value
    if (typeof scheme !== 'string' || !/^[a-z][a-z0-9+-]{1,63}$/.test(scheme) || RESERVED_SCHEMES.has(scheme)
      || typeof hostname !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(hostname)
      || typeof pathname !== 'string' || !/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(pathname)
      || typeof target !== 'string' || !/^[a-zA-Z0-9@][a-zA-Z0-9@/._-]{0,127}$/.test(target)) {
      throw new Error('Invalid dshDesktopDeepLinks route')
    }
    const key = scheme + '://' + hostname + pathname
    if (seen.has(key)) throw new Error('Ambiguous dshDesktopDeepLinks route')
    seen.add(key)
    return { scheme, hostname, pathname, target }
  })
}

/** Main-process only. Registering a receiver is a trusted native composition operation,
 * never an authorization granted by a renderer-supplied target string. */
export class DesktopDeepLinks {
  private readonly routes: DesktopDeepLinkRoute[]
  private readonly receivers = new Map<string, Receiver>()
  private readonly recent = new Map<string, number>()
  private pending: { url: string, target: string, received: number }[] = []
  private closed = false
  private draining = false

  constructor(metadata: unknown, private readonly onFailure: (target: string) => void = target => { console.warn('Desktop deep link delivery failed for target', target) }, private readonly now: () => number = Date.now) {
    this.routes = desktopDeepLinkRoutes(metadata)
  }

  accept(value: unknown): DeepLinkResult {
    if (this.closed) return 'closed'
    if (typeof value !== 'string' || value.length > MAX_URL_LENGTH || /[\\\s\u0000-\u001f\u007f]/.test(value)) return 'rejected'
    let url: URL
    try { url = new URL(value) } catch { return 'rejected' }
    if (url.username || url.password || url.port || !value.startsWith(url.protocol + '//')) return 'rejected'
    const route = this.routes.find(item => url.protocol === item.scheme + ':' && url.hostname === item.hostname && url.pathname === item.pathname)
    if (route === undefined || value.split(/[?#]/, 1)[0] !== route.scheme + '://' + route.hostname + route.pathname) return 'rejected'
    const now = this.now()
    this.prune(now)
    // Retain only hashes after delivery: callback URLs can contain credentials.
    const key = createHash('sha256').update(url.href).digest('hex')
    if (this.recent.has(key)) return 'duplicate'
    if (this.pending.length >= MAX_PENDING) return 'full'
    if (this.recent.size >= MAX_RECENT) this.recent.delete(this.recent.keys().next().value ?? '')
    this.recent.set(key, now)
    this.pending.push({ url: value, target: route.target, received: now })
    void this.drain()
    return 'queued'
  }

  acceptArgv(argv: readonly string[]): void {
    // Bound work even for unexpectedly large second-instance argument arrays.
    for (const arg of argv.slice(0, 256)) this.accept(arg)
  }

  /** Call only when this one target is ready; dispose before its restart/unload. */
  registerTarget(target: string, receiver: Receiver): () => void {
    if (this.closed || !this.routes.some(route => route.target === target) || this.receivers.has(target)) {
      throw new Error('Unavailable Desktop deep link target')
    }
    this.receivers.set(target, receiver)
    void this.drain()
    return () => {
      if (this.receivers.get(target) === receiver) this.receivers.delete(target)
    }
  }

  close(): void {
    this.closed = true
    this.pending = []
    this.recent.clear()
    this.receivers.clear()
  }

  private prune(now: number): void {
    this.pending = this.pending.filter(item => now - item.received < MAX_AGE_MS)
    for (const [key, received] of this.recent) {
      if (now - received >= MAX_AGE_MS) this.recent.delete(key)
    }
  }

  private async drain(): Promise<void> {
    if (this.draining || this.closed) return
    this.draining = true
    try {
      while (!this.closed) {
        this.prune(this.now())
        const index = this.pending.findIndex(item => this.receivers.has(item.target))
        if (index < 0) break
        const item = this.pending.splice(index, 1)[0]
        if (item === undefined) break
        const receiver = this.receivers.get(item.target)
        // At most once: a receiver can perform side effects before rejecting.
        try { await receiver?.(item.url) } catch {
          try { this.onFailure(item.target) } catch {
            // Reporter errors must not expose the callback URL or stop other targets.
            console.warn('Desktop deep link failure reporter failed')
          }
        }
      }
    } finally {
      this.draining = false
    }
  }
}
