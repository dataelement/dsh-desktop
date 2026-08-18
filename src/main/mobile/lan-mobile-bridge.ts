import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { networkInterfaces } from 'node:os'
import type { AddressInfo } from 'node:net'
import { readFile } from 'node:fs/promises'
import QRCode from 'qrcode'
import { renderDesktopPairingPage, renderMobilePage, renderPairingWaitPage } from './lan-mobile-pages'

const MAX_BODY_BYTES = 64 * 1024
const PAIRING_TTL_MS = 5 * 60 * 1000

const RPC_ALLOWLIST = new Set([
  'workspace.list',
  'workspace.archiveSession',
  'session.list',
  'session.history',
  'session.create',
  'session.prompt',
  'session.cancel'
])

export interface LanMobileBridgeOptions {
  harnessUrl(): string | undefined
  locale?: 'en' | 'zh' | (() => 'en' | 'zh')
  brandLogoPaths?: { light: string; dark: string }
  appIconPath?: string
  port?: number
  now?: () => number
}

export interface LanMobileBridgeSnapshot {
  running: boolean
  connected: boolean
  port?: number
  pairingUrl?: string
  desktopUrl?: string
  expiresAt?: number
}

interface MobileSession {
  token: string
}

interface PendingPairing {
  id: string
  remoteAddress: string
  expiresAt: number
  decision?: boolean
}

export class LanMobileBridge {
  private server?: ReturnType<typeof createServer>
  private port?: number
  private pairingToken?: string
  private pairingExpiresAt?: number
  private readonly sessions = new Map<string, MobileSession>()
  private readonly pendingPairings = new Map<string, PendingPairing>()
  private readonly now: () => number

  constructor(private readonly options: LanMobileBridgeOptions) {
    this.now = options.now ?? Date.now
  }

  async start(): Promise<LanMobileBridgeSnapshot> {
    if (this.server) {
      this.rotatePairingToken()
      this.pendingPairings.clear()
      return this.snapshot()
    }
    this.rotatePairingToken()
    this.server = createServer((request, response) => {
      void this.handle(request, response).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        this.json(response, 500, { ok: false, error: message })
      })
    })
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject)
      this.server?.listen(this.options.port ?? 0, '0.0.0.0', resolve)
    })
    this.port = (this.server.address() as AddressInfo).port
    return this.snapshot()
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = undefined
    this.port = undefined
    this.pairingToken = undefined
    this.pairingExpiresAt = undefined
    this.sessions.clear()
    this.pendingPairings.clear()
    if (!server) return
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  snapshot(): LanMobileBridgeSnapshot {
    const address = preferredLanAddress()
    if (!this.server || !this.port || !this.pairingToken || !this.pairingExpiresAt || !address) {
      return { running: Boolean(this.server), connected: this.sessions.size > 0 }
    }
    const pairingUrl = `http://${address}:${this.port}/pair?token=${this.pairingToken}`
    return {
      running: true,
      connected: this.sessions.size > 0,
      port: this.port,
      pairingUrl,
      desktopUrl: `http://127.0.0.1:${this.port}/desktop`,
      expiresAt: this.pairingExpiresAt
    }
  }

  private rotatePairingToken(): void {
    this.pairingToken = randomBytes(32).toString('base64url')
    this.pairingExpiresAt = this.now() + PAIRING_TTL_MS
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    response.setHeader('cache-control', 'no-store')
    response.setHeader('x-content-type-options', 'nosniff')
    response.setHeader('x-frame-options', 'DENY')
    response.setHeader('referrer-policy', 'no-referrer')
    response.setHeader(
      'content-security-policy',
      "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
    )

    const remoteAddress = normalizeRemoteAddress(request.socket.remoteAddress ?? '')
    if (!isPrivateAddress(remoteAddress)) return this.text(response, 403, 'Private network only.')
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

    if (request.method === 'GET' && url.pathname.startsWith('/brand-logo/')) {
      const variant = url.pathname === '/brand-logo/dark' ? 'dark' : 'light'
      const path = this.options.brandLogoPaths?.[variant]
      if (!path) return this.text(response, 404, 'Brand asset not found.')
      try {
        const body = await readFile(path)
        response.statusCode = 200
        response.setHeader('content-type', 'image/png')
        response.setHeader('cache-control', 'public, max-age=3600')
        response.end(body)
      } catch {
        this.text(response, 404, 'Brand asset not found.')
      }
      return
    }

    if (request.method === 'GET' && url.pathname === '/app-icon') {
      const path = this.options.appIconPath
      if (!path) return this.text(response, 404, 'App icon not found.')
      try {
        const body = await readFile(path)
        response.statusCode = 200
        response.setHeader('content-type', 'image/png')
        response.setHeader('cache-control', 'public, max-age=86400')
        response.end(body)
      } catch {
        this.text(response, 404, 'App icon not found.')
      }
      return
    }

    if (request.method === 'GET' && url.pathname === '/desktop') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      const snapshot = this.snapshot()
      if (!snapshot.pairingUrl || !snapshot.expiresAt) return this.text(response, 503, 'Bridge unavailable.')
      const qrSvg = await QRCode.toString(snapshot.pairingUrl, { type: 'svg', margin: 1, width: 260 })
      return this.html(
        response,
        renderDesktopPairingPage({
          qrSvg,
          pairingUrl: snapshot.pairingUrl,
          expiresAt: snapshot.expiresAt,
          locale: this.locale(),
          connected: this.sessions.size > 0
        })
      )
    }

    if (request.method === 'GET' && url.pathname === '/desktop/pending') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      const pending = [...this.pendingPairings.values()].find(
        (item) => item.decision === undefined && item.expiresAt >= this.now()
      )
      return this.json(response, 200, pending ? { id: pending.id, remoteAddress: pending.remoteAddress } : {})
    }

    if (request.method === 'GET' && url.pathname === '/desktop/status') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      return this.json(response, 200, { connected: this.sessions.size > 0 })
    }

    if (request.method === 'POST' && url.pathname === '/desktop/disconnect') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      this.sessions.clear()
      this.pendingPairings.clear()
      this.rotatePairingToken()
      return this.json(response, 200, { ok: true })
    }

    if (request.method === 'POST' && url.pathname === '/desktop/decide') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      const input = JSON.parse(await readBody(request)) as { id?: unknown; approved?: unknown }
      const pending = typeof input.id === 'string' ? this.pendingPairings.get(input.id) : undefined
      if (!pending || typeof input.approved !== 'boolean') return this.text(response, 404, 'Pairing request not found.')
      pending.decision = input.approved
      return this.json(response, 200, { ok: true })
    }

    if (request.method === 'GET' && url.pathname === '/pair') {
      if (this.authorized(request)) {
        response.statusCode = 302
        response.setHeader('location', '/')
        response.end()
        return
      }
      if (!this.validPairingToken(url.searchParams.get('token'))) {
        return this.text(response, 401, 'This pairing link is invalid or expired.')
      }
      const id = randomUUID()
      this.pendingPairings.set(id, {
        id,
        remoteAddress,
        expiresAt: this.pairingExpiresAt!
      })
      return this.html(response, renderPairingWaitPage(id, this.locale()))
    }

    if (request.method === 'GET' && url.pathname === '/pair/status') {
      const id = url.searchParams.get('id')
      const pending = id ? this.pendingPairings.get(id) : undefined
      if (!pending) return this.json(response, 200, { expired: true })
      if (pending.expiresAt < this.now()) {
        this.pendingPairings.delete(pending.id)
        return this.json(response, 200, { expired: true })
      }
      if (pending.decision === false) {
        this.pendingPairings.delete(pending.id)
        return this.json(response, 200, { denied: true })
      }
      if (pending.decision !== true) return this.json(response, 200, { pending: true })
      const token = randomBytes(32).toString('base64url')
      this.sessions.clear()
      this.sessions.set(token, { token })
      this.pendingPairings.delete(pending.id)
      this.pairingToken = undefined
      this.pairingExpiresAt = undefined
      response.setHeader('set-cookie', `dsh_mobile=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`)
      return this.json(response, 200, { approved: true })
    }

    if (!this.authorized(request)) return this.text(response, 401, 'Pair your phone again.')
    if (request.method === 'GET' && url.pathname === '/api/status') {
      return this.json(response, 200, { connected: true })
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return this.html(response, renderMobilePage({ locale: this.locale() }))
    }
    if (request.method === 'POST' && url.pathname === '/api/rpc') {
      this.verifySameOrigin(request)
      const input = JSON.parse(await readBody(request)) as { method?: unknown; payload?: unknown }
      if (typeof input.method !== 'string' || !RPC_ALLOWLIST.has(input.method)) {
        return this.json(response, 403, { ok: false, error: 'RPC method is not available on mobile.' })
      }
      const result = await this.forwardRpc(input.method, input.payload ?? {})
      return this.json(response, result.ok ? 200 : 400, result)
    }
    this.text(response, 404, 'Not found.')
  }

  private locale(): 'en' | 'zh' {
    const value = this.options.locale
    return typeof value === 'function' ? value() : value ?? 'en'
  }

  private validPairingToken(candidate: string | null): boolean {
    if (!candidate || !this.pairingToken || !this.pairingExpiresAt) return false
    if (this.now() > this.pairingExpiresAt) return false
    const left = Buffer.from(candidate)
    const right = Buffer.from(this.pairingToken)
    return left.length === right.length && timingSafeEqual(left, right)
  }

  private authorized(request: IncomingMessage): boolean {
    const cookie = request.headers.cookie ?? ''
    const match = /(?:^|;\s*)dsh_mobile=([^;]+)/.exec(cookie)
    if (!match) return false
    return this.sessions.has(match[1]!)
  }

  private verifySameOrigin(request: IncomingMessage): void {
    const origin = request.headers.origin
    const host = request.headers.host
    if (origin && host && new URL(origin).host !== host) throw new Error('Cross-origin request rejected.')
  }

  private async forwardRpc(method: string, payload: unknown): Promise<{ ok: boolean; value?: unknown; error?: string }> {
    const base = this.options.harnessUrl()
    if (!base) return { ok: false, error: 'Harness is not ready.' }
    const rpcId = randomUUID()
    const response = await fetch(new URL(`/api/${method}`, base), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
      signal: AbortSignal.timeout(30_000)
    })
    if (!response.ok) return { ok: false, error: `Harness transport returned HTTP ${response.status}.` }
    const envelope = (await response.json()) as {
      rpcId?: unknown
      result?: { ok?: unknown; value?: unknown; error?: { message?: unknown } }
    }
    if (envelope.rpcId !== rpcId) return { ok: false, error: 'Harness RPC response did not match the request.' }
    if (envelope.result?.ok !== true) {
      const message = envelope.result?.error?.message
      return { ok: false, error: typeof message === 'string' ? message : 'Harness rejected the request.' }
    }
    return { ok: true, value: envelope.result.value }
  }

  private html(response: ServerResponse, body: string): void {
    response.statusCode = 200
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.end(body)
  }

  private text(response: ServerResponse, status: number, body: string): void {
    response.statusCode = status
    response.setHeader('content-type', 'text/plain; charset=utf-8')
    response.end(body)
  }

  private json(response: ServerResponse, status: number, body: unknown): void {
    if (response.headersSent) {
      response.end()
      return
    }
    response.statusCode = status
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(body))
  }
}

export function preferredLanAddress(): string | undefined {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && isPrivateAddress(entry.address)) return entry.address
    }
  }
  return undefined
}

export function normalizeRemoteAddress(address: string): string {
  return address.startsWith('::ffff:') ? address.slice(7) : address
}

export function isLoopbackAddress(address: string): boolean {
  return address === '::1' || address === '127.0.0.1'
}

export function isPrivateAddress(address: string): boolean {
  if (isLoopbackAddress(address)) return true
  if (/^10\./.test(address) || /^192\.168\./.test(address)) return true
  const match = /^172\.(\d+)\./.exec(address)
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true
  return /^f[cd][0-9a-f]{2}:/i.test(address) || /^fe8[0-9a-f]:/i.test(address)
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > MAX_BODY_BYTES) throw new Error('Request body is too large.')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}
