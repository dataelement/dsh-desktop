import { parseMarketRequest } from './enterprise-market'
import { createEnterpriseFetch } from './platform-fetch'
import { resolveEnterpriseEndpoint } from './enterprise-request'
import type { ServerResponse } from 'node:http'
import {
  CHAT_HEADER_TIMEOUT_MS,
  CHAT_IDLE_TIMEOUT_MS,
  CHAT_MAX_CONCURRENT,
  CHAT_TOTAL_TIMEOUT_MS,
  isSseContentType,
  parseEnterpriseChatPayload
} from './enterprise-chat'
import {
  hashEnterpriseOrigin,
  isInvalidRefreshError,
  isTransientPlatformError,
  loadEnterpriseContract,
  requestEnterpriseJson,
  requestEnterpriseStream,
  EnterprisePlatformError
} from './enterprise-request'
import {
  ENTERPRISE_CALLBACK_FLOW_TIMEOUT_MS,
  startLoginCallbackServer,
  type EnterpriseLoginCallbackServer,
  type LoginCallbackAccepted
} from './login-callback-server'
import type { EnterpriseFetch } from './platform-fetch'
import {
  EnterpriseVaultError,
  type EnterpriseCredentialSession,
  type SecureEnterpriseCredentialVault
} from './secure-credential-vault'

export type EnterprisePhase =
  | 'disabled'
  | 'idle'
  | 'authorizing'
  | 'refreshing'
  | 'connected'
  | 'degraded'
  | 'reauthRequired'
  | 'error'

export interface EnterprisePublicIdentity {
  id?: string
  username?: string
  display_name?: string
  name?: string
}

export interface EnterprisePublicUsage {
  source?: 'live' | 'persisted' | 'unavailable'
  quota_state?: 'available' | 'exhausted' | 'unavailable'
  used?: number | null
  limit?: number | null
  remaining?: number | null
  as_of?: string | null
  month?: string
  billing_timezone?: string
  period_start?: string
  reset_at?: string
}

export interface EnterprisePublicModel {
  id: string
  display_name: string
  capabilities: {
    streaming: boolean
    tools: boolean
    reasoning_content: boolean
    vision?: boolean
  }
}

export interface EnterprisePublicState {
  connected: boolean
  secureStorageAvailable: boolean
  phase: EnterprisePhase
  revision: number
  models: EnterprisePublicModel[]
  modelsAvailable: boolean
  base?: string
  user?: EnterprisePublicIdentity
  tenant?: EnterprisePublicIdentity
  usage?: EnterprisePublicUsage
  modelUsage?: Record<string, EnterprisePublicUsage>
  error?: string
  errorCode?: string
  requestId?: string
  desktopVersion?: string
  connectionKey?: string
  sessionExpiresAt?: string
  loginExpiresAt?: string
}

export interface EnterpriseLoginStartResult {
  authorizationUrl: string
  expiresIn: number
  base: string
}

export interface EnterpriseServiceNote {
  event: string
  status?: number
  requestId?: string
  originHash?: string
}

export interface EnterpriseServiceOptions {
  desktopVersion?: string
  activateDesktop?: () => Promise<void> | void
  vault: SecureEnterpriseCredentialVault
  fetchImpl: EnterpriseFetch
  allowInsecureLoopback: boolean
  note?: (entry: EnterpriseServiceNote) => void
  now?: () => number
  startCallback?: typeof startLoginCallbackServer
}

interface PendingLogin {
  epoch: number
  base: string
  codeVerifier: string
  state: string
  authId?: string
  expiresAt: number
  callback: EnterpriseLoginCallbackServer
}

const MODELS_INTERVAL_MS = 5 * 60 * 1000
const MODELS_JITTER_MS = 15_000
const DEGRADED_BACKOFF_MS = 30_000
const MAX_DEGRADED_BACKOFF_MS = 5 * 60 * 1000

export class EnterpriseService {
  private mutation: Promise<unknown> = Promise.resolve()
  private refreshInFlight: Promise<EnterprisePublicState> | undefined
  private epoch = 0
  private revision = 0
  private phase: EnterprisePhase
  private session: EnterpriseCredentialSession | null = null
  private vaultGeneration = 0
  private models: EnterprisePublicModel[] = []
  private modelsAvailable = false
  private usage: EnterprisePublicUsage | undefined
  private modelUsage: Record<string, EnterprisePublicUsage> = {}
  private error: string | undefined
  private errorCode: string | undefined
  private requestId: string | undefined
  private pendingLogin: PendingLogin | undefined
  private modelsTimer: NodeJS.Timeout | undefined
  private modelsAttempt = 0
  private lastPublicSignature = ''
  private chatInFlight = 0
  private readonly chatControllers = new Set<AbortController>()
  private allowPrivateHttpForSession = false

  constructor(private readonly options: EnterpriseServiceOptions) {
    this.phase = options.vault.available ? 'idle' : 'disabled'
    if (!options.vault.available) {
      this.error = options.vault.unavailableReason ?? 'Operating-system secure storage is unavailable.'
    }
  }

  snapshot(): EnterprisePublicState {
    const connected = this.phase === 'connected' || this.phase === 'degraded' || this.phase === 'refreshing'
    return {
      connected,
      secureStorageAvailable: this.options.vault.available,
      phase: this.phase,
      revision: this.revision,
      desktopVersion: this.options.desktopVersion,
      ...(this.session?.access_token ? { connectionKey: this.connectionKey() } : {}),
      ...(this.session?.session_expires_at ? { sessionExpiresAt: this.session.session_expires_at } : {}),
      models: this.models.map((model) => ({
        id: model.id,
        display_name: model.display_name,
        capabilities: { ...model.capabilities }
      })),
      modelsAvailable: this.modelsAvailable && (this.phase === 'connected' || this.phase === 'refreshing'),
      ...(this.session?.base ? { base: this.session.base } : {}),
      ...(publicIdentity(this.session?.user) ? { user: publicIdentity(this.session?.user) } : {}),
      ...(publicIdentity(this.session?.tenant) ? { tenant: publicIdentity(this.session?.tenant) } : {}),
      ...(this.usage ? { usage: { ...this.usage } } : {}),
      ...(Object.keys(this.modelUsage).length > 0 ? { modelUsage: { ...this.modelUsage } } : {}),
      ...(this.error ? { error: this.error } : {}),
      ...(this.error && this.errorCode ? { errorCode: this.errorCode } : {}),
      ...(this.requestId ? { requestId: this.requestId } : {}),
      ...(this.pendingLogin?.expiresAt
        ? { loginExpiresAt: new Date(this.pendingLogin.expiresAt).toISOString() }
        : {})
    }
  }

  async restore(): Promise<void> {
    if (!this.options.vault.available) return
    try {
      const stored = await this.options.vault.read()
      this.vaultGeneration = stored.generation
      if (!stored.session) return
      this.session = stored.session
      const { isInsecurePrivateHttpOrigin } = await import('dsh-desktop-enterprise/deep-link')
      this.allowPrivateHttpForSession = isInsecurePrivateHttpOrigin(stored.session.base ?? '')
      this.phase = 'connected'
      this.clearError()
      this.publish()
      this.scheduleModels(0)
    } catch (error) {
      this.session = null
      this.allowPrivateHttpForSession = false
      this.phase = 'error'
      this.error = error instanceof EnterpriseVaultError
        ? error.message
        : 'Enterprise credential vault could not be opened.'
      this.errorCode = undefined
      this.publish()
    }
  }

  async inspectBase(baseValue: string): Promise<{ base: string, insecurePrivateHttp?: boolean }> {
    const { isInsecurePrivateHttpOrigin, normalizeEnterpriseServerUrl } = await import(
      'dsh-desktop-enterprise/deep-link'
    )
    const base = normalizeEnterpriseServerUrl(baseValue, {
      ...this.platformRequestOptions(),
      allowInsecurePrivateHttp: true
    })
    return {
      base,
      ...(isInsecurePrivateHttpOrigin(base) ? { insecurePrivateHttp: true } : {})
    }
  }

  async startLogin(
    baseValue: string,
    options: { confirmInsecurePrivateHttp?: boolean } = {}
  ): Promise<EnterpriseLoginStartResult> {
    return this.enqueueMutation(async () => {
      if (!this.options.vault.available) {
        throw Object.assign(new Error(this.options.vault.unavailableReason ?? 'Secure storage is unavailable.'), {
          status: 503
        })
      }
      const { isInsecurePrivateHttpOrigin, normalizeEnterpriseServerUrl } = await import(
        'dsh-desktop-enterprise/deep-link'
      )
      const preview = normalizeEnterpriseServerUrl(baseValue, {
        ...this.platformRequestOptions(),
        allowInsecurePrivateHttp: true
      })
      if (isInsecurePrivateHttpOrigin(preview) && options.confirmInsecurePrivateHttp !== true) {
        throw Object.assign(new Error('HTTP intranet addresses require explicit confirmation.'), {
          status: 400
        })
      }
      const base = normalizeEnterpriseServerUrl(baseValue, {
        ...this.platformRequestOptions(),
        allowInsecurePrivateHttp: options.confirmInsecurePrivateHttp === true
      })
      this.allowPrivateHttpForSession = isInsecurePrivateHttpOrigin(base)
      const contract = await loadEnterpriseContract()
      await this.cancelPendingLogin()
      this.epoch += 1
      const loginEpoch = this.epoch
      this.pauseSessionForRelogin()
      const pkce = contract.createPkceTransaction()
      let expectedAuthId: string | undefined
      const callback = await (this.options.startCallback ?? startLoginCallbackServer)({
        expectedState: pkce.state,
        expectedAuthId: () => expectedAuthId,
        timeoutMs: ENTERPRISE_CALLBACK_FLOW_TIMEOUT_MS,
        onAccepted: (result) => {
          void this.completeLogin(loginEpoch, result)
        }
      })
      try {
        const authorization = contract.parseAuthorization(
          (
            await requestEnterpriseJson(this.options.fetchImpl, base, contract.API_PATHS.authorizations, {
              method: 'POST',
              ...this.platformRequestOptions(),
              body: {
                client_id: contract.CLIENT_ID,
                redirect_uri: callback.redirectUri,
                code_challenge: pkce.codeChallenge,
                code_challenge_method: 'S256',
                state: pkce.state,
                device_name: 'DSH Desktop',
                ...(this.options.desktopVersion ? { client_version: this.options.desktopVersion } : {})
              }
            })
          ).body,
          base
        )
        expectedAuthId = authorization.auth_id
        this.pendingLogin = {
          epoch: loginEpoch,
          base,
          codeVerifier: pkce.codeVerifier,
          state: pkce.state,
          authId: authorization.auth_id,
          expiresAt: this.now() + ENTERPRISE_CALLBACK_FLOW_TIMEOUT_MS,
          callback
        }
        this.phase = 'authorizing'
        this.session = this.session ? { ...this.session, base } : { base }
        this.clearError()
        this.publish()
        this.note('login_started', { originHash: hashEnterpriseOrigin(base) })
        return {
          authorizationUrl: authorization.authorize_url,
          expiresIn: authorization.expires_in,
          base
        }
      } catch (error) {
        await callback.close()
        if (this.epoch === loginEpoch) this.pendingLogin = undefined
        this.rememberRequest(error)
        if (!this.session?.access_token) this.phase = this.options.vault.available ? 'idle' : 'disabled'
        this.publish()
        throw error
      }
    })
  }

  async submitManualTicket(identityTicket: string): Promise<EnterprisePublicState> {
    return this.enqueueMutation(async () => {
      const pending = this.pendingLogin
      if (!pending?.authId || this.phase !== 'authorizing') {
        throw Object.assign(new Error('No enterprise login is waiting for a code.'), { status: 409 })
      }
      const ticket = identityTicket.trim()
      if (!ticket || Buffer.byteLength(ticket) > 32 * 1024) {
        throw Object.assign(new Error('The one-time login code is invalid.'), { status: 400 })
      }
      await this.completeLoginLocked(pending.epoch, {
        authId: pending.authId,
        state: pending.state,
        identityTicket: ticket
      })
      return this.snapshot()
    })
  }

  async refresh(): Promise<EnterprisePublicState> {
    if (this.refreshInFlight) return this.refreshInFlight
    this.refreshInFlight = this.enqueueMutation(async () => this.refreshLocked()).finally(() => {
      this.refreshInFlight = undefined
    })
    return this.refreshInFlight
  }

  async logout(): Promise<EnterprisePublicState> {
    return this.enqueueMutation(async () => {
      const current = this.session
      await this.cancelPendingLogin()
      if (current?.base && (current.access_token || current.refresh_token)) {
        try {
          const contract = await loadEnterpriseContract()
          await requestEnterpriseJson(this.options.fetchImpl, current.base, contract.API_PATHS.logout, {
            method: 'POST',
            ...this.platformRequestOptions(),
            uncertainOnTransport: true,
            ...(current.access_token
              ? { accessToken: current.access_token }
              : { body: { refresh_token: current.refresh_token } })
          })
        } catch {
          this.note('logout_remote_failed')
        }
      }
      await this.clearLocalSession('idle')
      this.note('logout_committed')
      return this.snapshot()
    })
  }

  async proxyChat(payload: unknown, response: ServerResponse, signal: AbortSignal): Promise<void> {
    const parsed = parseEnterpriseChatPayload(payload)
    if (!this.session?.base || !this.session.access_token || !this.modelsAvailable) {
      throw Object.assign(new Error('Enterprise models are unavailable.'), { status: 409 })
    }
    if (!this.models.some((model) => model.id === parsed.model)) {
      throw Object.assign(new Error('Model is not assigned to this account.'), { status: 403 })
    }
    if (this.chatInFlight >= CHAT_MAX_CONCURRENT) {
      throw Object.assign(new Error('Too many enterprise chats.'), { status: 429 })
    }
    const epoch = this.epoch
    const controller = new AbortController()
    const combined = AbortSignal.any([signal, controller.signal])
    this.chatControllers.add(controller)
    this.chatInFlight += 1
    try {
      await this.runChat(parsed, response, combined, epoch, false)
    } finally {
      this.chatControllers.delete(controller)
      this.chatInFlight -= 1
    }
  }

  async stop(): Promise<void> {
    await this.cancelPendingLogin()
    this.clearModelsTimer()
    this.epoch += 1
    for (const controller of this.chatControllers) controller.abort()
    this.chatControllers.clear()
  }

  private async completeLogin(expectedEpoch: number, result: LoginCallbackAccepted): Promise<void> {
    await this.enqueueMutation(async () => {
      await this.completeLoginLocked(expectedEpoch, result)
    })
  }

  private async completeLoginLocked(expectedEpoch: number, result: LoginCallbackAccepted): Promise<void> {
    const pending = this.pendingLogin
    if (!pending || pending.epoch !== expectedEpoch || this.epoch !== expectedEpoch) return
    this.pendingLogin = undefined
    await pending.callback.close().catch(() => undefined)
    if (result.error || !result.identityTicket) {
      this.phase = this.session?.access_token ? 'connected' : 'idle'
      this.error = 'Enterprise login was cancelled.'
      this.errorCode = undefined
      this.publish()
      this.note('login_cancelled')
      return
    }
    this.phase = 'refreshing'
    this.publish()
    try {
      const contract = await loadEnterpriseContract()
      const token = contract.parseToken(
        (
          await requestEnterpriseJson(this.options.fetchImpl, pending.base, contract.API_PATHS.token, {
            method: 'POST',
            ...this.platformRequestOptions(),
            body: {
              grant_type: 'identity_ticket',
              identity_ticket: result.identityTicket,
              auth_id: result.authId,
              code_verifier: pending.codeVerifier
            }
          })
        ).body,
        pending.base,
        this.now()
      )
      if (this.epoch !== expectedEpoch) return
      await this.commitSession(token as EnterpriseCredentialSession, expectedEpoch)
      await this.syncCatalog(expectedEpoch, { includeUsage: true })
      this.note('login_committed', { originHash: hashEnterpriseOrigin(pending.base) })
      try {
        await this.options.activateDesktop?.()
      } catch {
        // A window activation failure must not invalidate a committed login.
        this.note('desktop_activation_failed')
      }
    } catch (error) {
      if (this.epoch !== expectedEpoch) return
      this.rememberRequest(error)
      this.phase = 'idle'
      this.publish()
      this.note('login_failed', noteFromError(error))
    }
  }

  private async refreshLocked(): Promise<EnterprisePublicState> {
    if (!this.session?.base || !this.session.refresh_token) {
      throw Object.assign(new Error('No enterprise session is available to refresh.'), { status: 409 })
    }
    if (this.phase === 'disabled' || this.phase === 'reauthRequired') {
      throw Object.assign(new Error(this.error ?? 'Enterprise login is disabled.'), { status: 503 })
    }
    const epoch = this.epoch
    const generation = this.vaultGeneration
    this.phase = 'refreshing'
    this.clearError()
    this.publish()
    try {
      const contract = await loadEnterpriseContract()
      const token = contract.parseToken(
        (
          await requestEnterpriseJson(this.options.fetchImpl, this.session.base, contract.API_PATHS.token, {
            method: 'POST',
            ...this.platformRequestOptions(),
            body: {
              grant_type: 'refresh_token',
              refresh_token: this.session.refresh_token
            }
          })
        ).body,
        this.session.base,
        this.now()
      )
      if (this.epoch !== epoch) return this.snapshot()
      await this.commitSession(token as EnterpriseCredentialSession, epoch, generation)
      await this.syncCatalog(epoch, { includeUsage: true })
      this.note('refresh_committed')
      return this.snapshot()
    } catch (error) {
      if (this.epoch !== epoch) return this.snapshot()
      this.rememberRequest(error)
      if (isInvalidRefreshError(error)) {
        await this.clearLocalSession('idle')
        this.note('refresh_invalid', noteFromError(error))
        return this.snapshot()
      }
      if (isTransientPlatformError(error)) {
        this.phase = this.session ? 'degraded' : 'idle'
        this.modelsAvailable = false
        this.publish()
        this.scheduleModels(this.degradedDelay())
        this.note('refresh_degraded', noteFromError(error))
        return this.snapshot()
      }
      this.phase = this.session ? 'degraded' : 'error'
      this.publish()
      this.note('refresh_failed', noteFromError(error))
      throw error
    }
  }

  private async commitSession(
    session: EnterpriseCredentialSession,
    expectedEpoch: number,
    expectedGeneration = this.vaultGeneration
  ): Promise<void> {
    if (this.epoch !== expectedEpoch) return
    try {
      const stored = await this.options.vault.replace(expectedGeneration, session)
      if (this.epoch !== expectedEpoch) return
      this.vaultGeneration = stored.generation
      this.session = stored.session
      this.clearError()
      this.modelsAttempt = 0
      // Leave phase as refreshing; syncCatalog flips to connected after usage.
    } catch {
      this.session = null
      this.allowPrivateHttpForSession = false
      this.models = []
      this.modelsAvailable = false
      this.usage = undefined
      this.modelUsage = {}
      this.phase = 'reauthRequired'
      this.error = 'Enterprise credentials could not be saved. Sign in again.'
      this.errorCode = undefined
      this.clearModelsTimer()
      this.publish()
      try {
        await this.options.vault.clear()
      } catch {
        // Isolation of the previous vault is best-effort.
      }
      this.note('vault_write_failed')
    }
  }

  private async syncCatalog(expectedEpoch: number, options: { includeUsage: boolean }): Promise<void> {
    if (this.epoch !== expectedEpoch || !this.session?.base || !this.session.access_token) return
    const contract = await loadEnterpriseContract()
    try {
      const modelsResult = await requestEnterpriseJson(
        this.options.fetchImpl,
        this.session.base,
        contract.API_PATHS.models,
        {
          accessToken: this.session.access_token,
          ...this.platformRequestOptions()
        }
      )
      if (this.epoch !== expectedEpoch) return
      const parsedModels = contract.parseModelsLenient(modelsResult.body)
      this.models = parsedModels.map((model) => ({
        id: model.id,
        display_name: model.display_name,
        capabilities: model.capabilities
      }))
      this.modelsAvailable = this.models.length > 0
      const seededUsage: Record<string, EnterprisePublicUsage> = {}
      for (const model of parsedModels) {
        if (model.usage) seededUsage[model.id] = model.usage
      }
      if (Object.keys(seededUsage).length > 0) {
        this.modelUsage = { ...this.modelUsage, ...seededUsage }
      }
      this.publish()
      this.rememberRequest(undefined, modelsResult.requestId)
    } catch (error) {
      if (this.epoch !== expectedEpoch) return
      this.modelsAvailable = false
      this.rememberRequest(error)
      if (isTransientPlatformError(error)) this.phase = 'degraded'
    }
    if (options.includeUsage) await this.refreshUsageCatalog(expectedEpoch)
    if (this.epoch !== expectedEpoch) return
    if (this.phase === 'refreshing') this.phase = 'connected'
    if (this.phase === 'connected' || this.phase === 'degraded') this.scheduleModels(this.modelsDelay())
    this.publish()
  }

  private async tickModels(): Promise<void> {
    if (!this.session?.base || !this.session.access_token) return
    const epoch = this.epoch
    try {
      const contract = await loadEnterpriseContract()
      let accessToken = this.session.access_token
      if (contract.accessNeedsRefresh(this.session as { access_expires_at: string }, this.now())) {
        await this.refresh()
        if (this.epoch !== epoch || !this.session?.access_token) return
        accessToken = this.session.access_token
      }
      const modelsResult = await requestEnterpriseJson(
        this.options.fetchImpl,
        this.session.base,
        contract.API_PATHS.models,
        {
          accessToken,
          ...this.platformRequestOptions()
        }
      )
      if (this.epoch !== epoch) return
      this.models = contract.parseModelsLenient(modelsResult.body).map((model) => ({
        id: model.id,
        display_name: model.display_name,
        capabilities: model.capabilities
      }))
      this.modelsAvailable = this.models.length > 0
      if (this.phase === 'degraded') this.phase = 'connected'
      this.modelsAttempt = 0
      this.clearError()
      this.publish()
      this.scheduleModels(this.modelsDelay())
    } catch (error) {
      if (this.epoch !== epoch) return
      if (isInvalidRefreshError(error)) {
        await this.enqueueMutation(async () => this.clearLocalSession('idle'))
        return
      }
      this.modelsAvailable = false
      this.phase = this.session ? 'degraded' : this.phase
      this.rememberRequest(error)
      this.publish()
      this.modelsAttempt += 1
      this.scheduleModels(this.degradedDelay())
    }
  }

  private async runChat(
    parsed: ReturnType<typeof parseEnterpriseChatPayload>,
    response: ServerResponse,
    signal: AbortSignal,
    epoch: number,
    retried: boolean
  ): Promise<void> {
    if (this.epoch !== epoch) {
      throw Object.assign(new Error('Enterprise session changed.'), { status: 409 })
    }
    const accessToken = await this.ensureAccess(epoch)
    const contract = await loadEnterpriseContract()
    const totalTimeout = AbortSignal.timeout(CHAT_TOTAL_TIMEOUT_MS)
    const headerController = new AbortController()
    const headerTimer = setTimeout(() => headerController.abort(), CHAT_HEADER_TIMEOUT_MS)
    let upstream: Response
    try {
      upstream = await requestEnterpriseStream(
        this.options.fetchImpl,
        this.session!.base!,
        contract.API_PATHS.chat,
        {
          body: parsed.request,
          accessToken,
          signal: AbortSignal.any([signal, totalTimeout, headerController.signal]),
          ...this.platformRequestOptions(),
          attribution: parsed.attribution
        }
      )
    } catch (error) {
      if (signal.aborted) throw error
      throw error
    } finally {
      clearTimeout(headerTimer)
    }
    if (upstream.status === 401 && !retried && !response.headersSent) {
      await upstream.body?.cancel().catch(() => undefined)
      await this.refresh()
      if (this.epoch !== epoch) {
        throw Object.assign(new Error('Enterprise session changed.'), { status: 409 })
      }
      await this.runChat(parsed, response, signal, epoch, true)
      return
    }
    const contentType = upstream.headers.get('content-type')
    if (!upstream.ok || !isSseContentType(contentType)) {
      const text = await upstream.text()
      this.handleChatStatus(upstream.status, text, parsed.model, epoch)
      this.writeForwarded(response, upstream, text)
      return
    }
    await this.pipeSse(upstream, response, signal)
    if (this.epoch === epoch) void this.syncUsage(epoch, parsed.model)
  }

  private connectionKey(): string {
    return hashEnterpriseOrigin(JSON.stringify([this.session?.base, this.session?.tenant?.id, this.session?.user?.id]))
  }

  async marketRequest(input: unknown): Promise<{ bytes: Buffer, binary: boolean }> {
    const request = parseMarketRequest(input)
    const epoch = this.epoch
    const assertConnection = () => {
      if (!this.session?.base || !this.snapshot().connected || (this.session.session_expires_at !== undefined && !(Date.parse(this.session.session_expires_at) > this.now())) ||
          this.epoch !== epoch || this.connectionKey() !== request.connectionKey) {
        throw Object.assign(new Error('Enterprise account changed. Refresh the plugin list.'), { status: 409 })
      }
    }
    assertConnection()
    for (let attempt = 0; attempt < 2; attempt++) {
      const accessToken = await this.ensureAccess(epoch)
      assertConnection()
      const base = this.session?.base
      if (!base) throw Object.assign(new Error('Enterprise account changed.'), { status: 409 })
      const { endpoint } = await resolveEnterpriseEndpoint(base, request.path,
        this.options.allowInsecureLoopback, this.platformRequestOptions().allowInsecurePrivateHttp)
      const response = await createEnterpriseFetch(this.options.fetchImpl)(endpoint.toString(), {
        method: request.body === undefined ? 'GET' : 'POST',
        signal: AbortSignal.timeout(request.binary ? 120_000 : 15_000),
        headers: { authorization: `Bearer ${accessToken}`, ...(request.body === undefined ? {} : { 'content-type': 'application/json' }) },
        ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) })
      })
      assertConnection()
      if (response.status === 401 && attempt === 0) {
        await response.body?.cancel()
        await this.refresh()
        continue
      }
      if (!response.ok) {
        await response.body?.cancel()
        throw Object.assign(new Error(`Enterprise market request failed (${response.status}).`), { status: response.status })
      }
      const limit = request.binary ? 256 * 1024 * 1024 : 16 * 1024 * 1024
      const chunks: Uint8Array[] = []
      let length = 0
      if (response.body) for await (const chunk of response.body) {
        assertConnection()
        length += chunk.length
        if (length > limit) throw Object.assign(new Error('Market response exceeds the allowed size.'), { status: 413 })
        chunks.push(chunk)
      }
      assertConnection()
      return { bytes: Buffer.concat(chunks), binary: request.binary }
    }
    throw Object.assign(new Error('Enterprise login required.'), { status: 401 })
  }

  private async ensureAccess(epoch: number): Promise<string> {
    if (!this.session?.base || !this.session.access_token) {
      throw Object.assign(new Error('Enterprise models are unavailable.'), { status: 409 })
    }
    const contract = await loadEnterpriseContract()
    if (
      this.session.access_expires_at &&
      contract.accessNeedsRefresh(this.session as { access_expires_at: string }, this.now())
    ) {
      await this.refresh()
    }
    if (this.epoch !== epoch || !this.session?.access_token) {
      throw Object.assign(new Error('Enterprise models are unavailable.'), { status: 409 })
    }
    return this.session.access_token
  }

  private handleChatStatus(status: number, text: string, model: string, epoch: number): void {
    let code: string | undefined
    try {
      const payload = JSON.parse(text) as { error?: { code?: string } }
      code = payload.error?.code
    } catch {
      code = undefined
    }
    if (status === 403 && code === 'model_not_allowed') {
      void this.syncCatalog(epoch, { includeUsage: false })
    }
    if (status === 429) {
      void this.syncUsage(epoch, model)
    }
    this.note('chat_upstream', { status })
  }

  private async readUsage(path: string) {
    const contract = await loadEnterpriseContract()
    const usageResult = await requestEnterpriseJson(
      this.options.fetchImpl,
      this.session!.base!,
      path,
      {
        accessToken: this.session!.access_token,
        ...this.platformRequestOptions()
      }
    )
    return contract.parseUsageLenient(usageResult.body)
  }

  private async refreshUsageCatalog(expectedEpoch: number): Promise<void> {
    if (this.epoch !== expectedEpoch || !this.session?.base || !this.session.access_token) return
    const contract = await loadEnterpriseContract()
    try {
      this.usage = await this.readUsage(contract.API_PATHS.usage)
    } catch {
      this.usage = contract.unavailableUsage()
    }
    if (this.epoch !== expectedEpoch) return
    const nextModelUsage = { ...this.modelUsage }
    await Promise.all(this.models.map(async (model) => {
      try {
        const next = await this.readUsage(
          `${contract.API_PATHS.usage}?model=${encodeURIComponent(model.id)}`
        )
        if (next.used !== null || next.limit !== null || !nextModelUsage[model.id]) {
          nextModelUsage[model.id] = next
        }
      } catch {
        if (!nextModelUsage[model.id]) nextModelUsage[model.id] = contract.unavailableUsage()
      }
    }))
    if (this.epoch !== expectedEpoch) return
    this.modelUsage = nextModelUsage
  }

  private async syncUsage(expectedEpoch: number, modelId?: string): Promise<void> {
    if (this.epoch !== expectedEpoch || !this.session?.base || !this.session.access_token) return
    const contract = await loadEnterpriseContract()
    try {
      this.usage = await this.readUsage(contract.API_PATHS.usage)
    } catch {
      this.usage = contract.unavailableUsage()
    }
    if (this.epoch !== expectedEpoch) return
    if (modelId) {
      try {
        this.modelUsage = {
          ...this.modelUsage,
          [modelId]: await this.readUsage(
            `${contract.API_PATHS.usage}?model=${encodeURIComponent(modelId)}`
          )
        }
      } catch {
        // Keep the last known per-model usage.
      }
    }
    if (this.epoch === expectedEpoch) this.publish()
  }

  private writeForwarded(response: ServerResponse, upstream: Response, text: string): void {
    if (response.headersSent) return
    const requestId = sanitizeRequestId(upstream.headers.get('x-request-id') ?? undefined)
    const contentType = upstream.headers.get('content-type') ?? 'application/json; charset=utf-8'
    response.writeHead(upstream.status, {
      'content-type': contentType,
      'cache-control': 'no-store',
      ...(requestId ? { 'x-request-id': requestId } : {})
    })
    response.end(text)
  }

  private async pipeSse(upstream: Response, response: ServerResponse, signal: AbortSignal): Promise<void> {
    if (response.headersSent) return
    const requestId = sanitizeRequestId(upstream.headers.get('x-request-id') ?? undefined)
    const contentType = upstream.headers.get('content-type') ?? 'text/event-stream'
    response.writeHead(upstream.status, {
      'content-type': contentType,
      'cache-control': 'no-store',
      ...(requestId ? { 'x-request-id': requestId } : {})
    })
    if (!upstream.body) {
      response.end()
      return
    }
    const reader = upstream.body.getReader()
    let idle = setTimeout(() => response.destroy(), CHAT_IDLE_TIMEOUT_MS)
    const resetIdle = () => {
      clearTimeout(idle)
      idle = setTimeout(() => response.destroy(), CHAT_IDLE_TIMEOUT_MS)
    }
    const onAbort = () => {
      void reader.cancel().catch(() => undefined)
      if (!response.writableEnded) response.destroy()
    }
    signal.addEventListener('abort', onAbort, { once: true })
    try {
      while (true) {
        if (signal.aborted) break
        const { value, done } = await reader.read()
        if (done) break
        resetIdle()
        const chunk = Buffer.from(value)
        if (!response.write(chunk)) {
          await waitForDrain(response, signal)
        }
      }
      if (!response.writableEnded) response.end()
    } finally {
      clearTimeout(idle)
      signal.removeEventListener('abort', onAbort)
      reader.releaseLock()
    }
  }

  private async clearLocalSession(phase: EnterprisePhase): Promise<void> {
    this.epoch += 1
    this.clearModelsTimer()
    for (const controller of this.chatControllers) controller.abort()
    await this.cancelPendingLogin()
    this.session = null
    this.allowPrivateHttpForSession = false
    this.models = []
    this.modelsAvailable = false
    this.usage = undefined
    this.modelUsage = {}
    this.phase = this.options.vault.available ? phase : 'disabled'
    this.clearError()
    try {
      if (this.options.vault.available) {
        const cleared = await this.options.vault.clear()
        this.vaultGeneration = cleared.generation
      }
    } catch {
      this.phase = 'error'
      this.error = 'Enterprise credentials could not be cleared.'
      this.errorCode = undefined
    }
    this.publish()
  }

  private platformRequestOptions() {
    return {
      allowInsecureLoopback: this.options.allowInsecureLoopback,
      allowInsecurePrivateHttp: this.allowPrivateHttpForSession
    }
  }

  private pauseSessionForRelogin(): void {
    this.modelsAvailable = false
    this.publish()
  }

  private async cancelPendingLogin(): Promise<void> {
    const pending = this.pendingLogin
    this.pendingLogin = undefined
    if (pending) await pending.callback.close()
  }

  private scheduleModels(delayMs: number): void {
    this.clearModelsTimer()
    if (!this.session?.access_token) return
    this.modelsTimer = setTimeout(() => {
      void this.tickModels()
    }, delayMs)
    this.modelsTimer.unref?.()
  }

  private clearModelsTimer(): void {
    if (this.modelsTimer) clearTimeout(this.modelsTimer)
    this.modelsTimer = undefined
  }

  private modelsDelay(): number {
    return MODELS_INTERVAL_MS + Math.floor(Math.random() * MODELS_JITTER_MS)
  }

  private degradedDelay(): number {
    return Math.min(MAX_DEGRADED_BACKOFF_MS, DEGRADED_BACKOFF_MS * 2 ** Math.min(this.modelsAttempt, 4))
  }

  private enqueueMutation<T>(work: () => Promise<T>): Promise<T> {
    const run = this.mutation.then(work, work)
    this.mutation = run.then(() => undefined, () => undefined)
    return run
  }

  private publish(): void {
    const snapshot = this.snapshot()
    const signature = publicStateSignature(snapshot)
    if (signature === this.lastPublicSignature) return
    this.revision += 1
    this.lastPublicSignature = publicStateSignature({ ...snapshot, revision: this.revision })
  }

  private clearError(): void {
    this.error = undefined
    this.errorCode = undefined
    this.requestId = undefined
  }

  private rememberRequest(error?: unknown, requestId?: string): void {
    if (error instanceof EnterprisePlatformError) {
      this.error = error.message
      this.errorCode = typeof error.code === 'string' && error.code.length > 0 ? error.code : undefined
      this.requestId = sanitizeRequestId(error.requestId)
      return
    }
    if (error instanceof Error) {
      this.error = error.message
      this.errorCode = undefined
    }
    if (requestId) this.requestId = sanitizeRequestId(requestId)
  }

  private note(event: string, details: Omit<EnterpriseServiceNote, 'event'> = {}): void {
    this.options.note?.({
      event,
      ...(details.status ? { status: details.status } : {}),
      ...(sanitizeRequestId(details.requestId) ? { requestId: sanitizeRequestId(details.requestId) } : {}),
      ...(details.originHash ? { originHash: details.originHash } : {})
    })
  }

  private now(): number {
    return this.options.now?.() ?? Date.now()
  }
}

function publicIdentity(value?: EnterprisePublicIdentity): EnterprisePublicIdentity | undefined {
  if (!value) return undefined
  const identity: EnterprisePublicIdentity = {
    ...(value.id ? { id: value.id } : {}),
    ...(value.username ? { username: value.username } : {}),
    ...(value.display_name ? { display_name: value.display_name } : {}),
    ...(value.name ? { name: value.name } : {})
  }
  return Object.keys(identity).length > 0 ? identity : undefined
}

function publicStateSignature(state: EnterprisePublicState): string {
  return JSON.stringify({
    connected: state.connected,
    secureStorageAvailable: state.secureStorageAvailable,
    phase: state.phase,
    models: state.models,
    modelsAvailable: state.modelsAvailable,
    base: state.base,
    user: state.user,
    tenant: state.tenant,
    usage: state.usage,
    modelUsage: state.modelUsage,
    desktopVersion: state.desktopVersion,
    connectionKey: state.connectionKey,
    sessionExpiresAt: state.sessionExpiresAt,
    error: state.error,
    errorCode: state.errorCode,
    requestId: state.requestId
  })
}

function sanitizeRequestId(value?: string): string | undefined {
  if (!value || !/^[A-Za-z0-9._:-]{1,64}$/u.test(value)) return undefined
  return value
}

function waitForDrain(response: ServerResponse, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error('aborted'))
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      response.off('drain', onDrain)
      response.off('error', onError)
      signal.removeEventListener('abort', onAbort)
    }
    const onDrain = () => {
      cleanup()
      resolve()
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }
    const onAbort = () => {
      cleanup()
      reject(signal.reason ?? new Error('aborted'))
    }
    response.once('drain', onDrain)
    response.once('error', onError)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function noteFromError(error: unknown): Omit<EnterpriseServiceNote, 'event'> {
  if (error instanceof EnterprisePlatformError) {
    return {
      ...(error.status ? { status: error.status } : {}),
      ...(sanitizeRequestId(error.requestId) ? { requestId: sanitizeRequestId(error.requestId) } : {})
    }
  }
  return {}
}
