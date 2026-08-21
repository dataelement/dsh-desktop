import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { networkInterfaces, tmpdir } from 'node:os'
import type { AddressInfo } from 'node:net'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import QRCode from 'qrcode'
import {
  ensureCloudflaredBinary,
  startCloudflareQuickTunnel,
  type CloudflareTunnelInstance
} from './cloudflared-tunnel'
import {
  renderDesktopPairingPage,
  renderMobilePage,
  renderMobileReconnectPage,
  renderPairingWaitPage
} from './lan-mobile-pages'

const MAX_BODY_BYTES = 64 * 1024
const PAIRING_TTL_MS = 5 * 60 * 1000
const MUX_RECONNECT_MS = 500

const RPC_ALLOWLIST = new Set([
  'workspace.list',
  'agentPreset.list',
  'agentPreset.select',
  'session.list',
  'session.history',
  'session.models',
  'session.selectModel',
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
  cloudflaredCacheDir?: string
  cloudflaredPath?: string
  now?: () => number
  onReconnectRequested?: () => void
}

export interface LanMobileBridgeSnapshot {
  running: boolean
  connected: boolean
  port?: number
  pairingUrl?: string
  desktopUrl?: string
  expiresAt?: number
  tunnelActive?: boolean
  tunnelLoading?: boolean
  tunnelUrl?: string
  tunnelError?: string
}

interface MobileSession {
  token: string
  remoteAddress: string
}

interface PendingPairing {
  id: string
  remoteAddress: string
  mode: MobileConnectionMode
  expiresAt: number
  decision?: boolean
}

type MobileConnectionMode = 'lan' | 'tunnel'

interface MobileQuestionOption {
  label: string
  description?: string
}

interface MobileQuestion {
  id: string
  question: string
  detail?: string
  header?: string
  options?: MobileQuestionOption[]
  multiSelect?: boolean
  intent?: string
}

interface PendingMobileQuestion {
  rpcId: string
  sessionId: string
  questions: MobileQuestion[]
}

interface MobileQuestionAnswer {
  id: string
  selected: string[]
  custom?: string
}

export class LanMobileBridge {
  private server?: ReturnType<typeof createServer>
  private port?: number
  private pairingToken?: string
  private pairingExpiresAt?: number
  private tunnelInstance?: CloudflareTunnelInstance
  private tunnelActive = false
  private tunnelLoading = false
  private tunnelError?: string
  private readonly sessions = new Map<string, MobileSession>()
  private readonly suspendedSessions = new Map<string, MobileSession>()
  private readonly pendingPairings = new Map<string, PendingPairing>()
  private readonly pendingQuestions = new Map<string, PendingMobileQuestion>()
  private readonly now: () => number
  private muxAbort?: AbortController
  private muxTask?: Promise<void>

  constructor(private readonly options: LanMobileBridgeOptions) {
    this.now = options.now ?? Date.now
  }

  async start(): Promise<LanMobileBridgeSnapshot> {
    if (this.server) {
      if (!this.pairingToken || !this.pairingExpiresAt || this.pairingExpiresAt < this.now()) {
        this.rotatePairingToken()
      }
      this.startMuxMonitor()
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
    this.startMuxMonitor()
    return this.snapshot()
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = undefined
    this.port = undefined
    this.pairingToken = undefined
    this.pairingExpiresAt = undefined
    if (this.tunnelInstance) {
      await this.tunnelInstance.stop().catch(() => undefined)
      this.tunnelInstance = undefined
    }
    this.tunnelActive = false
    this.tunnelLoading = false
    this.tunnelError = undefined
    this.sessions.clear()
    this.suspendedSessions.clear()
    this.pendingPairings.clear()
    this.pendingQuestions.clear()
    this.muxAbort?.abort()
    const muxTask = this.muxTask
    this.muxAbort = undefined
    this.muxTask = undefined
    if (muxTask) await muxTask.catch(() => undefined)
    if (!server) return
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  async toggleTunnel(enable?: boolean): Promise<LanMobileBridgeSnapshot> {
    const targetState = enable !== undefined ? enable : !this.tunnelActive
    if (!targetState) {
      if (this.tunnelInstance) {
        await this.tunnelInstance.stop().catch(() => undefined)
        this.tunnelInstance = undefined
      }
      this.tunnelActive = false
      this.tunnelLoading = false
      this.tunnelError = undefined
      return this.snapshot()
    }

    if (this.tunnelActive && this.tunnelInstance?.url) {
      return this.snapshot()
    }

    this.tunnelLoading = true
    this.tunnelError = undefined
    try {
      const binaryPath = await ensureCloudflaredBinary({
        cacheDir: this.options.cloudflaredCacheDir ?? join(tmpdir(), 'dsh-cloudflared'),
        customPath: this.options.cloudflaredPath
      })
      this.tunnelInstance = await startCloudflareQuickTunnel({
        port: this.port!,
        binaryPath
      })
      this.tunnelActive = true
      this.tunnelLoading = false
    } catch (error) {
      this.tunnelActive = false
      this.tunnelLoading = false
      this.tunnelError = error instanceof Error ? error.message : String(error)
    }
    return this.snapshot()
  }

  snapshot(): LanMobileBridgeSnapshot {
    const address = preferredLanAddress()
    if (!this.server || !this.port || !this.pairingToken || !this.pairingExpiresAt) {
      return { running: Boolean(this.server), connected: this.sessions.size > 0 }
    }
    const pairingUrl =
      this.tunnelActive && this.tunnelInstance?.url
        ? `${this.tunnelInstance.url}/pair?token=${this.pairingToken}`
        : address
          ? `http://${address}:${this.port}/pair?token=${this.pairingToken}`
          : undefined
    return {
      running: true,
      connected: this.sessions.size > 0,
      port: this.port,
      pairingUrl,
      desktopUrl: `http://127.0.0.1:${this.port}/desktop`,
      expiresAt: this.pairingExpiresAt,
      tunnelActive: this.tunnelActive,
      tunnelLoading: this.tunnelLoading,
      tunnelUrl: this.tunnelInstance?.url,
      tunnelError: this.tunnelError
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

    const transportAddress = normalizeRemoteAddress(request.socket.remoteAddress ?? '')
    if (!isPrivateAddress(transportAddress)) return this.text(response, 403, 'Private network only.')
    const connectionMode = this.requestConnectionMode(request, transportAddress)
    const forwardedAddress = firstHeaderValue(request.headers['cf-connecting-ip'])
    const remoteAddress =
      connectionMode === 'tunnel' && forwardedAddress
        ? normalizeRemoteAddress(forwardedAddress)
        : transportAddress
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
          connected: this.sessions.size > 0,
          tunnelActive: snapshot.tunnelActive,
          tunnelLoading: snapshot.tunnelLoading,
          tunnelUrl: snapshot.tunnelUrl,
          tunnelError: snapshot.tunnelError
        })
      )
    }

    if (request.method === 'GET' && url.pathname === '/desktop/pending') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      const pending = [...this.pendingPairings.values()].find(
        (item) => item.decision === undefined && item.expiresAt >= this.now()
      )
      return this.json(
        response,
        200,
        pending ? { id: pending.id, remoteAddress: pending.remoteAddress, mode: pending.mode } : {}
      )
    }

    if (request.method === 'GET' && url.pathname === '/desktop/status') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      return this.json(response, 200, { connected: this.sessions.size > 0 })
    }

    if (request.method === 'GET' && url.pathname === '/desktop/tunnel/status') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      const snapshot = this.snapshot()
      const qrSvg = snapshot.pairingUrl
        ? await QRCode.toString(snapshot.pairingUrl, { type: 'svg', margin: 1, width: 260 })
        : undefined
      return this.json(response, 200, {
        active: snapshot.tunnelActive,
        loading: snapshot.tunnelLoading,
        url: snapshot.tunnelUrl,
        error: snapshot.tunnelError,
        pairingUrl: snapshot.pairingUrl,
        qrSvg,
        expiresAt: snapshot.expiresAt
      })
    }

    if (request.method === 'POST' && url.pathname === '/desktop/tunnel/toggle') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      if (this.sessions.size > 0) {
        return this.json(response, 409, {
          ok: false,
          error: 'Disconnect the phone before switching connection modes.'
        })
      }
      let enable: boolean | undefined
      try {
        const bodyText = await readBody(request)
        if (bodyText) {
          const parsed = JSON.parse(bodyText) as { enable?: unknown }
          if (typeof parsed.enable === 'boolean') enable = parsed.enable
        }
      } catch {}
      const snapshot = await this.toggleTunnel(enable)
      const qrSvg = snapshot.pairingUrl
        ? await QRCode.toString(snapshot.pairingUrl, { type: 'svg', margin: 1, width: 260 })
        : undefined
      return this.json(response, 200, {
        ok: !snapshot.tunnelError,
        active: snapshot.tunnelActive,
        loading: snapshot.tunnelLoading,
        url: snapshot.tunnelUrl,
        error: snapshot.tunnelError,
        pairingUrl: snapshot.pairingUrl,
        qrSvg,
        expiresAt: snapshot.expiresAt
      })
    }

    if (request.method === 'POST' && url.pathname === '/desktop/disconnect') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      for (const [token, session] of this.sessions) this.suspendedSessions.set(token, session)
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

    if (request.method === 'GET' && url.pathname === '/disconnected') {
      const migrationUrl = this.tunnelMigrationUrl(url, connectionMode)
      if (migrationUrl) return this.redirect(response, migrationUrl)
      return this.html(response, renderMobileReconnectPage(this.locale(), connectionMode))
    }

    if (request.method === 'GET' && url.pathname === '/reconnect') {
      const migrationUrl = this.tunnelMigrationUrl(url, connectionMode)
      if (migrationUrl) return this.redirect(response, migrationUrl)
      const pending = this.reconnectPairing(remoteAddress, connectionMode)
      this.options.onReconnectRequested?.()
      return this.html(response, renderPairingWaitPage(pending.id, this.locale()))
    }

    if (request.method === 'POST' && url.pathname === '/pair/retry') {
      this.verifySameOrigin(request)
      const migrationUrl = this.tunnelMigrationUrl(new URL('/reconnect', url), connectionMode)
      if (migrationUrl) return this.json(response, 200, { redirectUrl: migrationUrl })
      const pending = this.reconnectPairing(remoteAddress, connectionMode)
      this.options.onReconnectRequested?.()
      return this.json(response, 200, { id: pending.id, expiresAt: pending.expiresAt })
    }

    if (request.method === 'GET' && url.pathname === '/pair') {
      const migrationUrl = this.tunnelMigrationUrl(url, connectionMode)
      if (migrationUrl) return this.redirect(response, migrationUrl)
      if (this.authorized(request, remoteAddress)) {
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
        mode: connectionMode,
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
      for (const [savedToken, session] of this.suspendedSessions) {
        if (session.remoteAddress !== pending.remoteAddress) continue
        this.sessions.set(savedToken, session)
        this.suspendedSessions.delete(savedToken)
      }
      this.sessions.set(token, { token, remoteAddress: pending.remoteAddress })
      this.pendingPairings.delete(pending.id)
      this.pairingToken = undefined
      this.pairingExpiresAt = undefined
      response.setHeader('set-cookie', `dsh_mobile=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`)
      return this.json(response, 200, { approved: true })
    }

    if (!this.authorized(request, remoteAddress)) {
      this.rememberMobileContext(request, remoteAddress)
      if (!this.authorized(request, remoteAddress)) {
        if (request.method === 'GET' && url.pathname === '/') {
          const migrationUrl = this.tunnelMigrationUrl(url, connectionMode)
          if (migrationUrl) return this.redirect(response, migrationUrl)
          return this.html(response, renderMobileReconnectPage(this.locale(), connectionMode))
        }
        return this.text(response, 401, 'Pair your phone again.')
      }
    }
    if (request.method === 'GET' && url.pathname === '/api/status') {
      return this.json(response, 200, { connected: true })
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return this.html(response, renderMobilePage({ locale: this.locale() }))
    }
    if (request.method === 'POST' && url.pathname === '/api/rpc') {
      this.verifySameOrigin(request)
      const input = JSON.parse(await readBody(request)) as { method?: unknown; payload?: unknown }
      if (input.method === 'interaction.pending') {
        const sessionId = requiredStringField(input.payload, 'sessionId')
        const pending = [...this.pendingQuestions.values()].find(
          (item) => item.sessionId === sessionId
        )
        return this.json(response, 200, { ok: true, value: pending ?? null })
      }
      if (input.method === 'interaction.answer') {
        const answer = parseQuestionResponse(input.payload)
        const pending = this.assertPendingQuestion(answer.rpcId, answer.sessionId)
        validateQuestionAnswers(pending, answer.answers)
        const result = await this.respondToQuestion(answer.rpcId, {
          ok: true,
          value: { sessionId: answer.sessionId, answer: { answers: answer.answers } }
        })
        return this.json(response, result.ok ? 200 : 400, result)
      }
      if (input.method === 'interaction.cancel') {
        const rpcId = requiredStringField(input.payload, 'rpcId')
        const sessionId = requiredStringField(input.payload, 'sessionId')
        this.assertPendingQuestion(rpcId, sessionId)
        const result = await this.respondToQuestion(rpcId, {
          ok: false,
          error: {
            code: 'cancelled',
            message: 'the user closed this question request',
            details: {}
          }
        })
        return this.json(response, result.ok ? 200 : 400, result)
      }
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

  private reconnectPairing(
    remoteAddress: string,
    mode: MobileConnectionMode
  ): PendingPairing {
    const current = [...this.pendingPairings.values()].find(
      (item) =>
        item.remoteAddress === remoteAddress &&
        item.mode === mode &&
        item.decision === undefined &&
        item.expiresAt >= this.now()
    )
    if (current) return current
    const pending = {
      id: randomUUID(),
      remoteAddress,
      mode,
      expiresAt: this.now() + PAIRING_TTL_MS
    }
    this.pendingPairings.set(pending.id, pending)
    return pending
  }

  private authorized(request: IncomingMessage, remoteAddress: string): boolean {
    const token = this.mobileToken(request)
    if (token && this.sessions.has(token)) return true
    return [...this.sessions.values()].some((session) => session.remoteAddress === remoteAddress)
  }

  private mobileToken(request: IncomingMessage): string | undefined {
    const cookie = request.headers.cookie ?? ''
    return /(?:^|;\s*)dsh_mobile=([^;]+)/.exec(cookie)?.[1]
  }

  private rememberMobileContext(request: IncomingMessage, remoteAddress: string): void {
    const token = this.mobileToken(request)
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return
    const sameDeviceIsActive = [...this.sessions.values()].some(
      (session) => session.remoteAddress === remoteAddress
    )
    if (sameDeviceIsActive) {
      this.sessions.set(token, { token, remoteAddress })
      this.suspendedSessions.delete(token)
      return
    }
    if (!this.suspendedSessions.has(token) && this.suspendedSessions.size >= 16) {
      const oldest = this.suspendedSessions.keys().next().value
      if (oldest) this.suspendedSessions.delete(oldest)
    }
    this.suspendedSessions.set(token, { token, remoteAddress })
  }

  private verifySameOrigin(request: IncomingMessage): void {
    const origin = request.headers.origin
    const host = request.headers.host
    if (origin && host && new URL(origin).host !== host) throw new Error('Cross-origin request rejected.')
  }

  private requestConnectionMode(
    request: IncomingMessage,
    transportAddress: string
  ): MobileConnectionMode {
    if (!isLoopbackAddress(transportAddress)) return 'lan'
    const host = (request.headers.host ?? '').split(':', 1)[0]?.toLowerCase() ?? ''
    const forwardedAddress = firstHeaderValue(request.headers['cf-connecting-ip'])
    const ray = firstHeaderValue(request.headers['cf-ray'])
    return host.endsWith('.trycloudflare.com') || Boolean(forwardedAddress && ray)
      ? 'tunnel'
      : 'lan'
  }

  private tunnelMigrationUrl(url: URL, connectionMode: MobileConnectionMode): string | undefined {
    if (connectionMode === 'tunnel' || !this.tunnelActive || !this.tunnelInstance?.url) return undefined
    return new URL(`${url.pathname}${url.search}`, this.tunnelInstance.url).toString()
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

  private startMuxMonitor(): void {
    if (this.muxTask) return
    const abort = new AbortController()
    this.muxAbort = abort
    this.muxTask = this.monitorMux(abort.signal).finally(() => {
      if (this.muxAbort === abort) {
        this.muxAbort = undefined
        this.muxTask = undefined
      }
    })
  }

  private async monitorMux(signal: AbortSignal): Promise<void> {
    let lastBase: string | undefined
    while (!signal.aborted) {
      const base = this.options.harnessUrl()
      if (!base) {
        this.pendingQuestions.clear()
        await waitFor(MUX_RECONNECT_MS, signal)
        continue
      }
      if (base !== lastBase) {
        this.pendingQuestions.clear()
        lastBase = base
      }
      try {
        await this.consumeMux(base, signal)
      } catch {
        if (signal.aborted) return
        this.pendingQuestions.clear()
        await waitFor(MUX_RECONNECT_MS, signal)
      }
    }
  }

  private async consumeMux(base: string, signal: AbortSignal): Promise<void> {
    // The network Harness exposes mux events only as a downlink WebSocket;
    // ordinary GET requests intentionally return 426 with no SSE fallback.
    const url = new URL('/api/events.mux', base)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url)
      let settled = false
      const cleanup = (): void => {
        signal.removeEventListener('abort', handleAbort)
        socket.removeEventListener('open', handleOpen)
        socket.removeEventListener('message', handleMessage)
        socket.removeEventListener('close', handleClose)
        socket.removeEventListener('error', handleError)
      }
      const finish = (error?: Error): void => {
        if (settled) return
        settled = true
        cleanup()
        if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
          socket.close()
        }
        if (error) reject(error)
        else resolve()
      }
      const handleAbort = (): void => finish()
      const handleOpen = (): void => this.pendingQuestions.clear()
      const handleMessage = (event: MessageEvent): void => {
        if (typeof event.data === 'string') this.consumeMuxEnvelope(event.data)
      }
      const handleClose = (): void => {
        finish(signal.aborted ? undefined : new Error('Harness mux WebSocket closed.'))
      }
      const handleError = (): void => finish(new Error('Harness mux WebSocket failed.'))
      socket.addEventListener('open', handleOpen)
      socket.addEventListener('message', handleMessage)
      socket.addEventListener('close', handleClose, { once: true })
      socket.addEventListener('error', handleError, { once: true })
      signal.addEventListener('abort', handleAbort, { once: true })
      if (signal.aborted) handleAbort()
    })
  }

  private consumeMuxEnvelope(data: string): void {
    let envelope: unknown
    try {
      envelope = JSON.parse(data)
    } catch {
      return
    }
    if (!isRecord(envelope) || envelope.type !== 'server-request') return
    const rpcId = typeof envelope.rpcId === 'string' ? envelope.rpcId : undefined
    const payload = isRecord(envelope.payload) ? envelope.payload : undefined
    if (!rpcId || !payload || typeof payload.type !== 'string') return
    if (payload.type === 'question/requested') {
      const pending = parsePendingQuestion(rpcId, payload)
      if (pending) this.pendingQuestions.set(rpcId, pending)
      return
    }
    if (payload.type === 'question/resolved' && typeof payload.questionRpcId === 'string') {
      this.pendingQuestions.delete(payload.questionRpcId)
    }
  }

  private assertPendingQuestion(rpcId: string, sessionId: string): PendingMobileQuestion {
    const pending = this.pendingQuestions.get(rpcId)
    if (!pending || pending.sessionId !== sessionId) {
      throw new Error('This question request is no longer pending.')
    }
    return pending
  }

  private async respondToQuestion(
    rpcId: string,
    result: Record<string, unknown>
  ): Promise<{ ok: boolean; value?: unknown; error?: string }> {
    const base = this.options.harnessUrl()
    if (!base) return { ok: false, error: 'Harness is not ready.' }
    const response = await fetch(new URL('/api/respond', base), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-response', rpcId, result }),
      signal: AbortSignal.timeout(30_000)
    })
    if (!response.ok) return { ok: false, error: `Harness transport returned HTTP ${response.status}.` }
    const receipt = (await response.json()) as { accepted?: unknown; reason?: unknown }
    if (receipt.accepted !== true) {
      return {
        ok: false,
        error: typeof receipt.reason === 'string' ? receipt.reason : 'Harness rejected the response.'
      }
    }
    return { ok: true, value: receipt }
  }

  private html(response: ServerResponse, body: string): void {
    response.statusCode = 200
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.end(body)
  }

  private redirect(response: ServerResponse, location: string): void {
    response.statusCode = 302
    response.setHeader('location', location)
    response.end()
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

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value?.split(',', 1)[0]
  const normalized = first?.trim()
  return normalized || undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredStringField(value: unknown, field: string): string {
  if (!isRecord(value) || typeof value[field] !== 'string' || !value[field]) {
    throw new Error(`Invalid ${field}.`)
  }
  return value[field]
}

function parsePendingQuestion(
  rpcId: string,
  payload: Record<string, unknown>
): PendingMobileQuestion | undefined {
  if (typeof payload.sessionId !== 'string' || !Array.isArray(payload.questions)) return undefined
  const questions: MobileQuestion[] = []
  for (const item of payload.questions.slice(0, 20)) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.question !== 'string') continue
    const question: MobileQuestion = { id: item.id, question: item.question }
    if (typeof item.detail === 'string') question.detail = item.detail
    if (typeof item.header === 'string') question.header = item.header
    if (typeof item.multiSelect === 'boolean') question.multiSelect = item.multiSelect
    if (typeof item.intent === 'string') question.intent = item.intent
    if (Array.isArray(item.options)) {
      question.options = item.options.slice(0, 50).flatMap((option) => {
        if (!isRecord(option) || typeof option.label !== 'string') return []
        return [{
          label: option.label,
          ...(typeof option.description === 'string' ? { description: option.description } : {})
        }]
      })
    }
    questions.push(question)
  }
  if (!questions.length) return undefined
  return { rpcId, sessionId: payload.sessionId, questions }
}

function parseQuestionResponse(value: unknown): {
  rpcId: string
  sessionId: string
  answers: MobileQuestionAnswer[]
} {
  const rpcId = requiredStringField(value, 'rpcId')
  const sessionId = requiredStringField(value, 'sessionId')
  if (!isRecord(value) || !Array.isArray(value.answers) || value.answers.length > 20) {
    throw new Error('Invalid question answers.')
  }
  const answers = value.answers.map((item): MobileQuestionAnswer => {
    if (!isRecord(item) || typeof item.id !== 'string' || !Array.isArray(item.selected)) {
      throw new Error('Invalid question answer.')
    }
    const selected = item.selected.map((label) => {
      if (typeof label !== 'string') throw new Error('Invalid selected option.')
      return label
    })
    if (selected.length > 50) throw new Error('Too many selected options.')
    return {
      id: item.id,
      selected,
      ...(typeof item.custom === 'string' && item.custom.trim() ? { custom: item.custom } : {})
    }
  })
  return { rpcId, sessionId, answers }
}

function validateQuestionAnswers(
  pending: PendingMobileQuestion,
  answers: MobileQuestionAnswer[]
): void {
  if (answers.length !== pending.questions.length) throw new Error('Every question needs an answer or skip.')
  const answerById = new Map(answers.map((answer) => [answer.id, answer]))
  if (answerById.size !== answers.length) throw new Error('Duplicate question answer.')
  for (const question of pending.questions) {
    const answer = answerById.get(question.id)
    if (!answer) throw new Error('Every question needs an answer or skip.')
    const allowed = new Set((question.options ?? []).map((option) => option.label))
    if (answer.selected.some((label) => !allowed.has(label))) {
      throw new Error('Answer contains an unknown option.')
    }
    if (!question.multiSelect && answer.selected.length > 1) {
      throw new Error('Only one option can be selected.')
    }
  }
}

function waitFor(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const timeout = setTimeout(done, milliseconds)
    function done(): void {
      clearTimeout(timeout)
      signal.removeEventListener('abort', done)
      resolve()
    }
    signal.addEventListener('abort', done, { once: true })
  })
}
