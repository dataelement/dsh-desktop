import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { networkInterfaces, tmpdir } from 'node:os'
import type { AddressInfo } from 'node:net'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import QRCode from 'qrcode'
import {
  ensureCloudflaredBinary,
  startCloudflareQuickTunnel
} from './cloudflared-tunnel'
import {
  startTunnelWithFallback,
  type InternetTunnelInstance,
  type InternetTunnelProvider
} from './internet-tunnel'
import { startPinggyTunnel } from './pinggy-tunnel'
import {
  renderDesktopPairingPage,
  renderMobilePage,
  renderMobileReconnectPage,
  renderPairingWaitPage
} from './lan-mobile-pages'

const MAX_BODY_BYTES = 64 * 1024
const PAIRING_TTL_MS = 5 * 60 * 1000
const MUX_RECONNECT_MS = 500
const MUX_RECONNECT_CAP_MS = 30_000
const MUX_STABLE_MS = 5_000

/**
 * Mobile method name to the Host endpoint that serves it.
 *
 * 0.1.2-alpha.1 deleted `dsh-host-apiproxy`, whose string-keyed `/api/<name>`
 * routes this bridge was written against, and moved the same operations onto
 * Typert Remote. The transport is unchanged — same `/api` prefix, same
 * client-request envelope — but an endpoint is now `<namespace>/<method>` and
 * its payload carries named args rather than a bare object. Several shapes
 * moved too, so each entry owns its own translation instead of a blanket
 * rename.
 *
 * The mobile page's vocabulary is deliberately left alone: it is served from
 * this file, but a phone may still be holding an older page.
 */
const HARNESS_ENDPOINTS: Record<
  string,
  { endpoint: string; args(payload: Record<string, unknown>): Record<string, unknown> }
> = {
  'agentPreset.list': { endpoint: 'agentPresets/list', args: () => ({}) },
  // The preset selector is keyed by agent id, which for a top-level session is
  // the session id the mobile page already sends.
  'agentPreset.select': {
    endpoint: 'agentPresets/select',
    args: (payload) => ({ agentId: payload.sessionId, agentPreset: payload.agentPreset })
  },
  'session.list': { endpoint: 'session/list', args: () => ({ _request: {} }) },
  // The catalog is no longer per-session: it describes what the Host can route
  // to, so it takes no arguments and the page's sessionId is dropped.
  'session.models': { endpoint: 'session/modelCatalog', args: () => ({}) },
  'session.selectModel': {
    endpoint: 'session/selectModel',
    args: (payload) => ({ request: payload })
  },
  'session.create': { endpoint: 'session/create', args: (payload) => ({ request: payload }) },
  'session.prompt': {
    endpoint: 'session/prompt',
    args: (payload) => ({ request: { requestId: randomUUID(), ...payload } })
  },
  'session.cancel': { endpoint: 'session/cancel', args: (payload) => ({ request: payload }) }
}

const RPC_ALLOWLIST = new Set([...Object.keys(HARNESS_ENDPOINTS), 'session.history'])

export interface LanMobileBridgeOptions {
  harnessUrl(): string | undefined
  /** Per-process Harness launch token, traded once for a session cookie. */
  harnessAuthToken?(): string | undefined
  locale?: 'en' | 'zh' | (() => 'en' | 'zh')
  brandLogoPaths?: { light: string; dark: string }
  appIconPath?: string
  port?: number
  cloudflaredCacheDir?: string
  cloudflaredPath?: string
  pinggySshPath?: string
  forceCloudflareFailure?: boolean
  tunnelLog?: (message: string) => void
  now?: () => number
  onReconnectRequested?: () => void
  onConnectedChange?: (connected: boolean) => void
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
  tunnelProvider?: InternetTunnelProvider
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
  private tunnelInstance?: InternetTunnelInstance
  private tunnelActive = false
  private tunnelLoading = false
  private tunnelError?: string
  private tunnelLaunch?: Promise<void>
  private readonly sessions = new Map<string, MobileSession>()
  private readonly suspendedSessions = new Map<string, MobileSession>()
  private readonly pendingPairings = new Map<string, PendingPairing>()
  private readonly pendingQuestions = new Map<string, PendingMobileQuestion>()
  private readonly now: () => number
  private muxAbort?: AbortController
  private muxTask?: Promise<void>
  private lastConnected = false

  constructor(private readonly options: LanMobileBridgeOptions) {
    this.now = options.now ?? Date.now
  }

  async start(): Promise<LanMobileBridgeSnapshot> {
    if (this.server) {
      if (!this.pairingTokenValid()) {
        this.rotatePairingToken()
      }
      this.syncConnected()
      return this.snapshot()
    }
    this.rotatePairingToken()
    this.server = createServer((request, response) => {
      void this.handle(request, response)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          this.json(response, 500, { ok: false, error: message })
        })
        // Every session change is the result of a request: pairing approval,
        // reconnect, or disconnect. Reconciling here keeps the mux monitor and
        // the renderers in step without polling either of them.
        .finally(() => this.syncConnected())
    })
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject)
      this.server?.listen(this.options.port ?? 0, '0.0.0.0', resolve)
    })
    this.port = (this.server.address() as AddressInfo).port
    this.syncConnected()
    return this.snapshot()
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = undefined
    this.port = undefined
    this.pairingToken = undefined
    this.pairingExpiresAt = undefined
    // Wait for an in-flight launch so the tunnel it spawns is stopped below
    // instead of outliving the bridge (and the app).
    if (this.tunnelLaunch) {
      await this.tunnelLaunch.catch(() => undefined)
      this.tunnelLaunch = undefined
    }
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
    this.syncConnected()
    this.muxAbort?.abort()
    const muxTask = this.muxTask
    this.muxAbort = undefined
    this.muxTask = undefined
    if (muxTask) await muxTask.catch(() => undefined)
    if (!server) return
    // An in-flight mobile RPC can hold its socket for up to the 30s abort
    // timeout; close() alone waits for active connections to drain, which
    // would stall app shutdown. Drop every live socket explicitly.
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  async toggleTunnel(enable?: boolean): Promise<LanMobileBridgeSnapshot> {
    const targetState = enable !== undefined ? enable : !this.tunnelActive
    if (!targetState) {
      // Wait for an in-flight launch, then stop the tunnel it spawned:
      // otherwise the just-launched process is orphaned (or silently revives
      // the tunnel the user asked to disable).
      if (this.tunnelLaunch) {
        await this.tunnelLaunch.catch(() => undefined)
        this.tunnelLaunch = undefined
      }
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

    // A launch is already in flight (the cloudflared download alone can take
    // seconds): report the loading state instead of racing a second tunnel,
    // which would orphan the first cloudflared process.
    if (this.tunnelLaunch) {
      return this.snapshot()
    }

    this.tunnelLoading = true
    this.tunnelError = undefined
    const launch = this.launchTunnel()
    this.tunnelLaunch = launch
    try {
      await launch
      this.tunnelActive = true
    } catch (error) {
      this.tunnelActive = false
      this.tunnelError = error instanceof Error ? error.message : String(error)
    } finally {
      this.tunnelLoading = false
      if (this.tunnelLaunch === launch) this.tunnelLaunch = undefined
    }
    return this.snapshot()
  }

  private async launchTunnel(): Promise<void> {
    const port = this.port
    if (!port) throw new Error('Bridge is not running.')
    const cacheDir = this.options.cloudflaredCacheDir ?? join(tmpdir(), 'dsh-cloudflared')
    this.tunnelInstance = await startTunnelWithFallback({
      forceCloudflareFailure: this.options.forceCloudflareFailure,
      startCloudflare: async () => {
        const binaryPath = await ensureCloudflaredBinary({
          cacheDir,
          customPath: this.options.cloudflaredPath
        })
        return startCloudflareQuickTunnel({
          port,
          binaryPath,
          log: this.options.tunnelLog
        })
      },
      startPinggy: () =>
        startPinggyTunnel({
          port,
          sshPath: this.options.pinggySshPath,
          knownHostsPath: join(cacheDir, 'pinggy-known-hosts'),
          log: this.options.tunnelLog
        }),
      log: this.options.tunnelLog
    })
  }

  snapshot(): LanMobileBridgeSnapshot {
    if (!this.server || !this.port) {
      return { running: false, connected: this.sessions.size > 0 }
    }
    // The pairing token is single-use (consumed on approval) and short-lived.
    // Tunnel and listener state must stay visible regardless, otherwise the
    // desktop window loses the connection-mode UI right after a phone pairs.
    const tokenValid = this.pairingTokenValid()
    const address = preferredLanAddress()
    const pairingUrl =
      !tokenValid
        ? undefined
        : this.tunnelActive && this.tunnelInstance?.url
          ? `${this.tunnelInstance.url}/pair?token=${this.pairingToken}`
          : address
            ? `http://${address}:${this.port}/pair?token=${this.pairingToken}`
            : undefined
    return {
      running: true,
      connected: this.sessions.size > 0,
      port: this.port,
      ...(tokenValid && pairingUrl ? { pairingUrl, expiresAt: this.pairingExpiresAt } : {}),
      desktopUrl: `http://127.0.0.1:${this.port}/desktop`,
      tunnelActive: this.tunnelActive,
      tunnelLoading: this.tunnelLoading,
      tunnelUrl: this.tunnelInstance?.url,
      tunnelProvider: this.tunnelInstance?.provider,
      tunnelError: this.tunnelError
    }
  }

  private rotatePairingToken(): void {
    this.pairingToken = randomBytes(32).toString('base64url')
    this.pairingExpiresAt = this.now() + PAIRING_TTL_MS
  }

  private pairingTokenValid(): boolean {
    return Boolean(this.pairingToken && this.pairingExpiresAt && this.pairingExpiresAt >= this.now())
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
    const forwardedAddress =
      firstHeaderValue(request.headers['cf-connecting-ip']) ??
      firstHeaderValue(request.headers['x-forwarded-for'])
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
      this.verifyTrustedOrigin(request)
      if (!this.server || !this.port) return this.text(response, 503, 'Bridge unavailable.')
      // The token is consumed once a phone pairs, and expires after five
      // minutes. The desktop window stays open across both: rotate so it
      // keeps showing a scannable code instead of a dead one (or a 503).
      if (!this.pairingTokenValid()) {
        this.rotatePairingToken()
      }
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
        provider: snapshot.tunnelProvider,
        error: snapshot.tunnelError,
        pairingUrl: snapshot.pairingUrl,
        qrSvg,
        expiresAt: snapshot.expiresAt
      })
    }

    if (request.method === 'POST' && url.pathname === '/desktop/tunnel/toggle') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      this.verifySameOrigin(request)
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
      // Report an in-progress switch honestly instead of answering with the
      // current (stale) snapshot the desktop UI cannot render.
      if (enable === true && this.tunnelLoading && !this.tunnelActive) {
        return this.json(response, 409, {
          ok: false,
          error: 'A tunnel switch is already in progress.'
        })
      }
      const snapshot = await this.toggleTunnel(enable)
      const qrSvg = snapshot.pairingUrl
        ? await QRCode.toString(snapshot.pairingUrl, { type: 'svg', margin: 1, width: 260 })
        : undefined
      return this.json(response, 200, {
        ok: !snapshot.tunnelError,
        active: snapshot.tunnelActive,
        loading: snapshot.tunnelLoading,
        url: snapshot.tunnelUrl,
        provider: snapshot.tunnelProvider,
        error: snapshot.tunnelError,
        pairingUrl: snapshot.pairingUrl,
        qrSvg,
        expiresAt: snapshot.expiresAt
      })
    }

    if (request.method === 'POST' && url.pathname === '/desktop/disconnect') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      this.verifySameOrigin(request)
      for (const [token, session] of this.sessions) this.suspendedSessions.set(token, session)
      this.sessions.clear()
      this.pendingPairings.clear()
      this.rotatePairingToken()
      return this.json(response, 200, { ok: true })
    }

    if (request.method === 'POST' && url.pathname === '/desktop/decide') {
      if (!isLoopbackAddress(remoteAddress)) return this.text(response, 403, 'Desktop only.')
      this.verifySameOrigin(request)
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
    this.verifyTrustedOrigin(request)
  }

  /**
   * Rejects browser-driven cross-site requests (CSRF / drive-by) against the
   * loopback-only desktop surface. The pairing window's own navigations and
   * same-origin fetches pass; requests without Fetch Metadata and Origin
   * headers (local tooling, tests) pass as well.
   */
  private verifyTrustedOrigin(request: IncomingMessage): void {
    const site = firstHeaderValue(request.headers['sec-fetch-site'])
    if (site && site !== 'same-origin' && site !== 'none') {
      throw new Error('Cross-site request rejected.')
    }
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
    return isInternetTunnelHost(host) || Boolean(forwardedAddress && ray)
      ? 'tunnel'
      : 'lan'
  }

  private tunnelMigrationUrl(url: URL, connectionMode: MobileConnectionMode): string | undefined {
    if (connectionMode === 'tunnel' || !this.tunnelActive || !this.tunnelInstance?.url) return undefined
    return new URL(`${url.pathname}${url.search}`, this.tunnelInstance.url).toString()
  }

  /**
   * The Host session cookie for one Harness base, obtained once and reused.
   *
   * Since 0.1.2-alpha.1 every Host API call is authenticated before dispatch:
   * an unauthenticated caller gets 401, and the launch token is accepted only
   * as `GET /?token=...` on the root — never on an API path and never in an
   * Authorization header. The bridge is a server-side client, not a browser,
   * so it performs that exchange itself.
   *
   * The cookie is signed against the request authority, so every later call
   * has to reach the Host under the same `Host` value the exchange used. That
   * is why the bridge talks to the loopback base rather than forwarding the
   * phone's own authority.
   */
  private harnessCookie?: { base: string; cookie: string }

  private async harnessSession(base: string): Promise<string | undefined> {
    if (this.harnessCookie?.base === base) return this.harnessCookie.cookie
    const token = this.options.harnessAuthToken?.()
    if (token === undefined) return undefined
    const url = new URL('/', base)
    url.searchParams.set('token', token)
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000)
    })
    // The exchange answers 303 to a clean `/`; anything else means the token
    // was stale or already spent, and the caller surfaces the resulting 401.
    const cookie = cookiePair(response.headers.getSetCookie())
    if (cookie === undefined) return undefined
    this.harnessCookie = { base, cookie }
    return cookie
  }

  /**
   * Call the Host with the session cookie, exchanging the launch token first
   * and once more if the stored cookie has stopped being accepted.
   */
  private async harnessFetch(url: URL, init: RequestInit, base: string): Promise<Response> {
    const send = async (cookie: string | undefined): Promise<Response> => fetch(url, {
      ...init,
      headers: { ...init.headers, ...(cookie === undefined ? {} : { cookie }) }
    })
    let response = await send(await this.harnessSession(base))
    if (response.status === 401) {
      this.harnessCookie = undefined
      const retry = await this.harnessSession(base)
      if (retry !== undefined) response = await send(retry)
    }
    return response
  }

  /**
   * Translate one mobile method onto its Host endpoint and drive it.
   *
   * `session.history` is the one call the page cannot express directly: the
   * Host replaced open-ended history reads with a cursor-bounded page, and
   * refuses a `throughSeq` past the session's own cursor. The cursor lives on
   * the session list row, so the read is two calls here rather than a
   * protocol the page has to learn.
   */
  private async forwardRpc(method: string, payload: unknown): Promise<{ ok: boolean; value?: unknown; error?: string }> {
    const fields = typeof payload === 'object' && payload !== null
      ? payload as Record<string, unknown>
      : {}

    if (method === 'session.history') {
      const sessionId = fields.sessionId
      const listed = await this.invokeHarness('session/list', { _request: {} })
      if (!listed.ok) return listed
      const items = (listed.value as { items?: { sessionId?: unknown; projections?: { asOfSeq?: unknown } }[] }).items ?? []
      const row = items.find((item) => item.sessionId === sessionId)
      const throughSeq = row?.projections?.asOfSeq
      if (typeof throughSeq !== 'number') return { ok: false, error: 'Harness has no cursor for this session.' }
      return this.invokeHarness('session/page', {
        request: {
          address: { kind: 'session', sessionId },
          throughSeq,
          ...(typeof fields.maxMessages === 'number' ? { maxMessages: fields.maxMessages } : {})
        }
      })
    }

    const route = HARNESS_ENDPOINTS[method]
    if (route === undefined) return { ok: false, error: 'RPC method is not available on mobile.' }
    return this.invokeHarness(route.endpoint, route.args(fields))
  }

  private async invokeHarness(
    endpoint: string,
    args: Record<string, unknown>
  ): Promise<{ ok: boolean; value?: unknown; error?: string }> {
    const base = this.options.harnessUrl()
    if (!base) return { ok: false, error: 'Harness is not ready.' }
    const rpcId = randomUUID()
    const response = await this.harnessFetch(new URL(`/api/${endpoint}`, base), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload: { args } }),
      signal: AbortSignal.timeout(30_000)
    }, base)
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

  /**
   * Reconciles everything that depends on a phone being attached. The mux
   * downlink exists purely to track questions raised for a mobile client, so
   * running it with no client meant reconnecting twice a second, forever, on
   * every desktop that never used the feature.
   */
  private syncConnected(): void {
    const connected = this.sessions.size > 0
    if (connected) this.startMuxMonitor()
    else this.muxAbort?.abort()
    if (connected === this.lastConnected) return
    this.lastConnected = connected
    // Reconciliation runs off the request path, so a throwing observer must not
    // turn into an unhandled rejection that fails the request behind it.
    try {
      this.options.onConnectedChange?.(connected)
    } catch {
      // A renderer that went away mid-broadcast is not the bridge's problem.
    }
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
    // A Harness that never accepts the downlink used to be retried at a flat
    // 500ms for as long as the app ran. Backing off turns a permanent failure
    // into two attempts a minute instead of a hundred.
    let backoffMs = MUX_RECONNECT_MS
    const backOff = async (): Promise<void> => {
      await waitFor(backoffMs, signal)
      backoffMs = Math.min(backoffMs * 2, MUX_RECONNECT_CAP_MS)
    }

    while (!signal.aborted) {
      const base = this.options.harnessUrl()
      if (!base) {
        this.pendingQuestions.clear()
        await backOff()
        continue
      }
      if (base !== lastBase) {
        this.pendingQuestions.clear()
        lastBase = base
        backoffMs = MUX_RECONNECT_MS
      }
      let openedAt: number | undefined
      try {
        await this.consumeMux(base, signal, () => {
          openedAt = this.now()
        })
        backoffMs = MUX_RECONNECT_MS
      } catch {
        if (signal.aborted) return
        this.pendingQuestions.clear()
        // A connection that held for a while and then dropped is a transient
        // fault, not a Harness that refuses the downlink: retry promptly.
        if (openedAt !== undefined && this.now() - openedAt >= MUX_STABLE_MS) {
          backoffMs = MUX_RECONNECT_MS
        }
        await backOff()
      }
    }
  }

  private async consumeMux(
    base: string,
    signal: AbortSignal,
    onOpen?: () => void
  ): Promise<void> {
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
      const handleOpen = (): void => {
        onOpen?.()
        this.pendingQuestions.clear()
      }
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
    if (response.destroyed) return
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
    if (response.destroyed) return
    response.statusCode = status
    response.setHeader('content-type', 'text/plain; charset=utf-8')
    response.end(body)
  }

  private json(response: ServerResponse, status: number, body: unknown): void {
    if (response.destroyed) return
    if (response.headersSent) {
      response.end()
      return
    }
    response.statusCode = status
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(body))
  }
}

/**
 * The `name=value` pair of the first Set-Cookie header, ready for a Cookie
 * request header. The Host sets exactly one session cookie, host-only and
 * `SameSite=Strict`; its attributes are for browsers and are dropped here.
 * @param headers - raw Set-Cookie values from the exchange response.
 * @returns the cookie pair, or undefined when no cookie was set.
 */
export function cookiePair(headers: readonly string[]): string | undefined {
  for (const header of headers) {
    const pair = header.split(';', 1)[0]?.trim()
    if (pair !== undefined && pair.includes('=')) return pair
  }
  return undefined
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

export function isInternetTunnelHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/\.$/, '')
  return (
    (normalized.endsWith('.trycloudflare.com') && normalized !== 'api.trycloudflare.com') ||
    normalized.endsWith('.pinggy.link') ||
    normalized.endsWith('.pinggy-free.link') ||
    normalized.endsWith('.pinggy.online')
  )
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
