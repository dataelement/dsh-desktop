import { createServer } from 'node:http'
import { hostname } from 'node:os'
import { randomUUID } from 'node:crypto'
import {
  API_PATHS,
  CALLBACK_PATH,
  CLIENT_ID,
  EnterpriseApiError,
  accessNeedsRefresh,
  createPkceTransaction,
  parseAuthorization,
  parseConfig,
  parseModels,
  parseToken,
  parseUsage,
  requestJson
} from './contract.js'
import { normalizeEnterpriseServerUrl, parseEnterpriseLoginDeepLink } from './deep-link.js'
import { EnterpriseLlmAdapter } from './openai.js'

export const name = 'dsh-desktop-enterprise'
export const inject = ['connection', 'llm']
export const BISHENG_PROVIDER_ROUTE = 'bisheng-enterprise'

const LOCAL_PATHS = Object.freeze({
  state: '/api/enterprise.state',
  inspectBase: '/api/enterprise.base.inspect',
  start: '/api/enterprise.login.start',
  manual: '/api/enterprise.login.manual',
  inspectDeepLink: '/api/enterprise.deep-link.inspect',
  confirmDeepLink: '/api/enterprise.deep-link.confirm',
  refresh: '/api/enterprise.refresh',
  logout: '/api/enterprise.logout'
})
const MAX_JSON_BYTES = 64 * 1024
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000
const PLATFORM_TIMEOUT_MS = 15 * 1000
const LOGOUT_TIMEOUT_MS = 8 * 1000

function errorMessage(error) {
  return error instanceof Error ? error.message : 'Enterprise request failed.'
}

function requiredString(value, field, maximum = 4096) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > maximum) {
    throw new Error(`${field} is required.`)
  }
  return value.trim()
}

async function readJson(request) {
  const text = await request.text()
  if (Buffer.byteLength(text) > MAX_JSON_BYTES) throw new Error('Request body is too large.')
  const parsed = JSON.parse(text || '{}')
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request body must be an object.')
  }
  return parsed
}

function callbackPage(ok, detail) {
  const title = ok ? '登录完成' : '登录未完成'
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#f6f7f9;color:#17181a;font:16px system-ui}.card{max-width:440px;padding:32px;border:1px solid #dfe1e5;border-radius:18px;background:#fff;box-shadow:0 16px 50px #00000012}h1{margin:0 0 12px;font-size:24px}p{margin:0;color:#656970;line-height:1.6}</style><main class="card"><h1>${title}</h1><p>${detail}</p></main>`
}

function exactSearchParams(url, names) {
  const entries = [...url.searchParams.entries()]
  return entries.length === names.length && names.every((name) =>
    entries.filter(([key]) => key === name).length === 1
  ) && entries.every(([key]) => names.includes(key))
}

function brokerClient(environment = process.env) {
  const rawUrl = environment.DSH_DESKTOP_ENTERPRISE_BROKER_URL
  const token = environment.DSH_DESKTOP_ENTERPRISE_BROKER_TOKEN
  if (!rawUrl || !token) {
    return {
      available: false,
      read: async () => { throw new Error('DSH Desktop secure credential broker is unavailable.') },
      replace: async () => { throw new Error('DSH Desktop secure credential broker is unavailable.') },
      clear: async () => { throw new Error('DSH Desktop secure credential broker is unavailable.') },
      activateDesktop: async () => { throw new Error('DSH Desktop secure credential broker is unavailable.') }
    }
  }
  const origin = new URL(rawUrl)
  if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || origin.pathname !== '/') {
    throw new Error('DSH Desktop secure credential broker address is invalid.')
  }
  const call = async (path, method, body) => {
    const response = await fetch(new URL(path, origin), {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
      redirect: 'error'
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(
        typeof payload.message === 'string' ? payload.message : 'Secure credential operation failed.'
      )
      error.code = payload.error
      error.status = response.status
      throw error
    }
    return payload
  }
  return {
    available: true,
    read: () => call('/v1/session', 'GET'),
    replace: (expectedGeneration, session) => call('/v1/session', 'PUT', {
      expected_generation: expectedGeneration,
      session
    }),
    clear: () => call('/v1/session', 'DELETE'),
    activateDesktop: () => call('/v1/activate', 'POST')
  }
}

function abortableSignal(signal, controller) {
  return signal ? AbortSignal.any([signal, controller.signal]) : controller.signal
}

function trackResponse(response, controller, activeRequests, onDone) {
  if (!response.body) {
    activeRequests.delete(controller)
    return response
  }
  const reader = response.body.getReader()
  let completed = false
  const complete = () => {
    if (completed) return
    completed = true
    activeRequests.delete(controller)
    onDone?.()
  }
  const body = new ReadableStream({
    async pull(target) {
      try {
        const result = await reader.read()
        if (result.done) {
          complete()
          target.close()
        } else target.enqueue(result.value)
      } catch (error) {
        complete()
        target.error(error)
      }
    },
    async cancel(reason) {
      controller.abort(reason)
      complete()
      await reader.cancel(reason).catch(() => undefined)
    }
  })
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  })
}

export function createEnterpriseController(ctx, options = {}) {
  const allowInsecureLoopback = options.allowInsecureLoopback ??
    process.env.DSH_DESKTOP_ENTERPRISE_ALLOW_INSECURE_LOOPBACK === '1'
  const vault = options.vault ?? brokerClient()
  let generation = 0
  let session = null
  let models = []
  let modelsAvailable = false
  let usage = null
  let modelUsage = {}
  let phase = 'idle'
  let lastError
  let lastRequestId
  let loginFlow
  let refreshPromise
  let providerRegistration
  let epoch = 0
  const activeRequests = new Set()

  const adapter = new EnterpriseLlmAdapter({
    providerName: () => session?.tenant?.name ?? 'BiSheng Enterprise',
    models: () => modelsAvailable ? models : [],
    request: (body, signal, headers) => requestChat(body, signal, headers),
    onComplete: (model) => refreshUsage(model).catch(() => undefined)
  })

  const setFailure = (error) => {
    lastError = errorMessage(error)
    lastRequestId = error instanceof EnterpriseApiError ? error.requestId : undefined
    phase = 'error'
  }

  const normalizeBase = (value) => normalizeEnterpriseServerUrl(value, { allowInsecureLoopback })

  const pauseProvider = () => {
    providerRegistration?.replace([])
    modelsAvailable = false
  }

  const publishModels = (next) => {
    if (!providerRegistration) {
      providerRegistration = ctx.llm.registerAdapter([BISHENG_PROVIDER_ROUTE], adapter)
    } else {
      providerRegistration.replace([BISHENG_PROVIDER_ROUTE])
    }
    models = next
    modelsAvailable = true
  }

  const disposeProvider = () => {
    providerRegistration?.()
    providerRegistration = undefined
    modelsAvailable = false
  }

  const stopRequests = (reason) => {
    for (const controller of activeRequests) controller.abort(reason)
    activeRequests.clear()
  }

  const clearLocal = async () => {
    epoch += 1
    pauseProvider()
    stopRequests('Enterprise session ended.')
    session = null
    models = []
    usage = null
    modelUsage = {}
    const snapshot = await vault.clear()
    generation = snapshot.generation
  }

  const request = (base, path, requestOptions = {}) => requestJson(base, path, {
    ...requestOptions,
    allowInsecureLoopback,
    timeoutMs: requestOptions.timeoutMs ?? PLATFORM_TIMEOUT_MS
  })

  const refreshAccess = async () => {
    if (refreshPromise) return refreshPromise
    const active = session
    const startedEpoch = epoch
    const expectedGeneration = generation
    if (!active) throw new Error('Enterprise login is required.')
    refreshPromise = (async () => {
      phase = 'refreshing'
      try {
        const { body } = await request(active.base, API_PATHS.token, {
          method: 'POST',
          body: { grant_type: 'refresh_token', refresh_token: active.refresh_token },
          uncertainOnTransport: true
        })
        const next = parseToken(body, active.base)
        if (
          next.session_id !== active.session_id ||
          next.user.id !== active.user.id ||
          next.tenant.id !== active.tenant.id
        ) {
          throw new Error('BiSheng refresh response changed the bound session identity.')
        }
        if (epoch !== startedEpoch || session !== active) {
          throw Object.assign(new Error('Enterprise session changed during refresh.'), { code: 'STALE_SESSION' })
        }
        const snapshot = await vault.replace(expectedGeneration, next)
        if (epoch !== startedEpoch || session !== active) {
          await vault.clear().catch(() => undefined)
          throw Object.assign(new Error('Enterprise session changed during refresh.'), { code: 'STALE_SESSION' })
        }
        generation = snapshot.generation
        session = snapshot.session
        phase = 'connected'
        lastError = undefined
        return session
      } catch (error) {
        setFailure(error)
        await clearLocal().catch(() => undefined)
        throw error
      } finally {
        refreshPromise = undefined
      }
    })()
    return refreshPromise
  }

  const currentAccess = async () => {
    if (!session) throw new Error('Enterprise login is required.')
    if (accessNeedsRefresh(session)) await refreshAccess()
    if (!session) throw new Error('Enterprise login is required.')
    return session.access_token
  }

  const authorizedJson = async (path, parser, signal, retried = false) => {
    const active = session
    if (!active) throw new Error('Enterprise login is required.')
    const accessToken = await currentAccess()
    try {
      const { body, requestId } = await request(active.base, path, { accessToken, signal })
      lastRequestId = requestId
      return parser(body)
    } catch (error) {
      if (
        !retried &&
        error instanceof EnterpriseApiError &&
        error.status === 401 &&
        error.code === 'invalid_access_token'
      ) {
        await refreshAccess()
        return authorizedJson(path, parser, signal, true)
      }
      throw error
    }
  }

  const refreshModels = async (signal) => {
    try {
      const next = await authorizedJson(API_PATHS.models, parseModels, signal)
      publishModels(next)
      return next
    } catch (error) {
      pauseProvider()
      throw error
    }
  }

  const usagePath = (model) => {
    if (typeof model !== 'string' || model.length === 0) return API_PATHS.usage
    const params = new URLSearchParams({ model })
    return `${API_PATHS.usage}?${params.toString()}`
  }

  const unavailableUsage = () => ({
    source: 'unavailable',
    quota_state: 'unavailable',
    used: null,
    limit: null,
    remaining: null
  })

  const refreshUsage = async (model, signal) => {
    try {
      const next = await authorizedJson(usagePath(model), parseUsage, signal)
      if (typeof model === 'string' && model.length > 0) {
        modelUsage = { ...modelUsage, [model]: next }
      } else {
        usage = next
      }
      return next
    } catch (error) {
      if (typeof model === 'string' && model.length > 0) {
        modelUsage = { ...modelUsage, [model]: unavailableUsage() }
      } else {
        usage = unavailableUsage()
      }
      throw error
    }
  }

  const syncAccount = async (signal) => {
    const nextModels = await refreshModels(signal)
    modelUsage = {}
    await Promise.all([
      refreshUsage(undefined, signal).catch(() => undefined),
      ...nextModels.map((model) => refreshUsage(model.id, signal).catch(() => undefined))
    ])
    phase = 'connected'
    lastError = undefined
  }

  const inspectBase = async (value, signal) => {
    const base = normalizeBase(value)
    const { body, requestId } = await request(base, API_PATHS.config, { signal })
    lastRequestId = requestId
    return { base, config: parseConfig(body) }
  }

  const closeLoginFlow = async () => {
    const flow = loginFlow
    loginFlow = undefined
    if (!flow) return
    clearTimeout(flow.timer)
    await new Promise((resolve) => flow.server.close(() => resolve()))
  }

  const exchangeTicket = async (ticket) => {
    const flow = loginFlow
    if (!flow || flow.consumed || Date.now() >= flow.expiresAt) {
      throw new Error('Enterprise login transaction is missing or expired.')
    }
    flow.consumed = true
    phase = 'authorizing'
    const startedEpoch = epoch
    try {
      const { body, requestId } = await request(flow.base, API_PATHS.token, {
        method: 'POST',
        body: {
          grant_type: 'identity_ticket',
          identity_ticket: requiredString(ticket, 'Identity ticket', 32 * 1024),
          auth_id: flow.authId,
          code_verifier: flow.codeVerifier
        },
        uncertainOnTransport: true
      })
      lastRequestId = requestId
      const next = parseToken(body, flow.base)
      pauseProvider()
      stopRequests('Enterprise account changed.')
      const snapshot = await vault.read()
      if (epoch !== startedEpoch) throw new Error('Enterprise session changed during login.')
      const committed = await vault.replace(snapshot.generation, next)
      generation = committed.generation
      session = committed.session
      epoch += 1
      await syncAccount()
      return state()
    } catch (error) {
      setFailure(error)
      throw error
    }
  }

  const handleCallback = async (request, response, expectedFlow) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('cache-control', 'no-store')
    response.setHeader('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'")
    response.setHeader('referrer-policy', 'no-referrer')
    if (request.method !== 'GET' || url.pathname !== CALLBACK_PATH || loginFlow !== expectedFlow) {
      response.writeHead(404).end(callbackPage(false, '回调地址无效，请回到 DSH Desktop 重新登录。'))
      return
    }
    const hasError = url.searchParams.has('error')
    const expectedFields = hasError ? ['auth_id', 'state', 'error'] : ['auth_id', 'identity_ticket', 'state']
    if (
      !exactSearchParams(url, expectedFields) ||
      url.searchParams.get('auth_id') !== expectedFlow.authId ||
      url.searchParams.get('state') !== expectedFlow.state ||
      expectedFlow.consumed ||
      Date.now() >= expectedFlow.expiresAt
    ) {
      setFailure(new Error('Enterprise login callback did not match the current transaction.'))
      response.writeHead(400).end(callbackPage(false, '登录回调已失效或校验失败，请重新发起。'))
      await closeLoginFlow()
      return
    }
    if (hasError) {
      const code = url.searchParams.get('error')
      if (!['access_denied', 'authorization_expired', 'authorization_failed'].includes(code)) {
        setFailure(new Error('Enterprise login callback has an unsupported error code.'))
        response.writeHead(400).end(callbackPage(false, '登录回调错误码无效，请重新发起。'))
        await closeLoginFlow()
        return
      }
      const message = code === 'access_denied'
        ? '用户取消了企业登录。'
        : code === 'authorization_expired'
          ? '企业登录已过期。'
          : '企业登录失败。'
      setFailure(new Error(message))
      response.writeHead(400).end(callbackPage(false, message))
      await closeLoginFlow()
      return
    }
    try {
      await exchangeTicket(url.searchParams.get('identity_ticket'))
      response.writeHead(200).end(callbackPage(true, '正在返回 DSH Desktop；若未自动切换，可以关闭此页面。'))
      await vault.activateDesktop?.().catch((error) => {
        ctx.logger?.warn?.(`dsh-desktop-enterprise: could not activate Desktop after login: ${errorMessage(error)}`)
      })
    } catch (error) {
      response.writeHead(400).end(callbackPage(false, errorMessage(error)))
    }
    void closeLoginFlow()
  }

  const startLogin = async (baseValue, signal) => {
    if (!vault.available) throw new Error('Operating-system secure storage is unavailable.')
    const { base, config } = await inspectBase(baseValue, signal)
    if (!config.enabled) throw new Error('BiSheng has not enabled DSH Desktop access.')
    epoch += 1
    pauseProvider()
    stopRequests('Enterprise login restarted.')
    await closeLoginFlow()
    const pkce = createPkceTransaction()
    const server = createServer()
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') {
      await new Promise((resolve) => server.close(() => resolve()))
      throw new Error('Could not create the local enterprise login callback.')
    }
    const redirectUri = `http://127.0.0.1:${address.port}${CALLBACK_PATH}`
    try {
      const { body, requestId } = await request(base, API_PATHS.authorizations, {
        method: 'POST',
        signal,
        body: {
          client_id: CLIENT_ID,
          redirect_uri: redirectUri,
          code_challenge: pkce.codeChallenge,
          code_challenge_method: 'S256',
          state: pkce.state,
          device_name: hostname().slice(0, 100)
        }
      })
      lastRequestId = requestId
      const authorization = parseAuthorization(body, base)
      const expiresAt = Date.now() + Math.min(authorization.expires_in * 1000, LOGIN_TIMEOUT_MS)
      const flow = {
        server,
        base,
        authId: authorization.auth_id,
        state: pkce.state,
        codeVerifier: pkce.codeVerifier,
        redirectUri,
        expiresAt,
        consumed: false,
        timer: undefined
      }
      flow.timer = setTimeout(() => {
        if (loginFlow !== flow) return
        setFailure(new Error('Enterprise login expired. Start again.'))
        void closeLoginFlow()
      }, Math.max(1, expiresAt - Date.now()))
      flow.timer.unref?.()
      server.on('request', (request, response) => {
        void handleCallback(request, response, flow)
      })
      loginFlow = flow
      phase = 'authorizing'
      lastError = undefined
      return {
        authorizationUrl: authorization.authorize_url,
        expiresIn: authorization.expires_in,
        base
      }
    } catch (error) {
      await new Promise((resolve) => server.close(() => resolve()))
      setFailure(error)
      throw error
    }
  }

  const requestChat = async (body, signal, headers, retried = false) => {
    const active = session
    if (!active || !modelsAvailable) throw new Error('Enterprise models are unavailable.')
    const accessToken = await currentAccess()
    const controller = new AbortController()
    activeRequests.add(controller)
    let response
    try {
      response = await fetch(new URL(API_PATHS.chat, `${active.base}/`), {
        method: 'POST',
        redirect: 'error',
        signal: abortableSignal(signal, controller),
        headers: {
          accept: 'text/event-stream',
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
          'x-request-id': randomUUID(),
          ...headers
        },
        body: JSON.stringify(body)
      })
    } catch (error) {
      activeRequests.delete(controller)
      throw error
    }
    if (!response.ok) activeRequests.delete(controller)
    if (response.status === 401 && !retried) {
      const payload = await response.clone().json().catch(() => ({}))
      if (payload?.error?.code === 'invalid_access_token') {
        await refreshAccess()
        return requestChat(body, signal, headers, true)
      }
    }
    if (response.status === 403) {
      const payload = await response.clone().json().catch(() => ({}))
      if (payload?.error?.code === 'model_not_allowed') {
        await refreshModels().catch(() => undefined)
      }
    }
    if (response.status === 429) void refreshUsage(body?.model).catch(() => undefined)
    return response.ok
      ? trackResponse(response, controller, activeRequests, () => {
        void refreshUsage(body?.model).catch(() => undefined)
      })
      : response
  }

  const state = () => ({
    connected: session !== null,
    secureStorageAvailable: vault.available,
    phase,
    ...(session ? {
      base: session.base,
      user: session.user,
      tenant: session.tenant,
      sessionId: session.session_id,
      sessionExpiresAt: session.session_expires_at,
      accessExpiresAt: session.access_expires_at
    } : {}),
    models,
    modelsAvailable,
    usage,
    modelUsage,
    ...(loginFlow ? { loginExpiresAt: new Date(loginFlow.expiresAt).toISOString() } : {}),
    ...(lastError ? { error: lastError } : {}),
    ...(lastRequestId ? { requestId: lastRequestId } : {})
  })

  return {
    state,
    inspectBase: (input, signal) => inspectBase(requiredString(input?.base, 'Platform address'), signal),
    startLogin: (input, signal) => startLogin(requiredString(input?.base, 'Platform address'), signal),
    async submitManualTicket(input) {
      try {
        return await exchangeTicket(requiredString(input?.identityTicket, 'Identity ticket', 32 * 1024))
      } finally {
        await closeLoginFlow()
      }
    },
    inspectDeepLink(input) {
      const parsed = parseEnterpriseLoginDeepLink(requiredString(input?.url, 'Enterprise login link'))
      return { base: parsed.serverUrl }
    },
    confirmDeepLink: (input, signal) => startLogin(requiredString(input?.base, 'Platform address'), signal),
    async refresh(signal) {
      if (!session) return state()
      phase = 'refreshing'
      try {
        if (accessNeedsRefresh(session)) await refreshAccess()
        await syncAccount(signal)
      } catch (error) {
        setFailure(error)
        throw error
      }
      return state()
    },
    async logout(signal) {
      const active = session
      epoch += 1
      pauseProvider()
      stopRequests('Enterprise logout.')
      await closeLoginFlow()
      let revokeConfirmed = false
      let revokeError
      if (active) {
        try {
          const accessValid = Date.parse(active.access_expires_at) > Date.now()
          await request(active.base, API_PATHS.logout, {
            method: 'POST',
            signal,
            timeoutMs: LOGOUT_TIMEOUT_MS,
            ...(accessValid
              ? { accessToken: active.access_token, body: {} }
              : { body: { refresh_token: active.refresh_token } })
          })
          revokeConfirmed = true
        } catch (error) {
          revokeError = errorMessage(error)
        }
      }
      session = null
      models = []
      usage = null
      const snapshot = await vault.clear()
      generation = snapshot.generation
      phase = 'idle'
      lastError = revokeConfirmed || !active
        ? undefined
        : `本地已退出，服务端会话撤销未确认：${revokeError}`
      return { ...state(), revokeConfirmed }
    },
    async restore() {
      if (!vault.available) {
        phase = 'disabled'
        lastError = undefined
        lastRequestId = undefined
        return state()
      }
      try {
        const snapshot = await vault.read()
        generation = snapshot.generation
        session = snapshot.session
        if (!session) {
          phase = 'idle'
          return state()
        }
        if (Date.parse(session.session_expires_at) <= Date.now()) {
          await clearLocal()
          phase = 'idle'
          return state()
        }
        const { config } = await inspectBase(session.base)
        if (!config.enabled) {
          pauseProvider()
          phase = 'disabled'
          return state()
        }
        if (accessNeedsRefresh(session)) await refreshAccess()
        await syncAccount()
      } catch (error) {
        setFailure(error)
      }
      return state()
    },
    dispose: async () => {
      disposeProvider()
      stopRequests('Enterprise integration stopped.')
      await closeLoginFlow()
    }
  }
}

function jsonFailure(error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : 400
  return Response.json({
    ok: false,
    error: errorMessage(error),
    ...(error?.code ? { code: error.code } : {}),
    ...(error?.requestId ? { requestId: error.requestId } : {})
  }, { status, headers: { 'cache-control': 'no-store' } })
}

function registerJsonRoute(connection, path, methods, handler) {
  connection.fetch.register({
    path,
    methods,
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        return Response.json(await handler(request), { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        return jsonFailure(error)
      }
    }
  })
}

export function apply(ctx) {
  const controller = createEnterpriseController(ctx)
  const connection = Reflect.get(ctx, 'connection')
  registerJsonRoute(connection, LOCAL_PATHS.state, ['GET'], () => controller.state())
  registerJsonRoute(connection, LOCAL_PATHS.inspectBase, ['POST'], async (request) =>
    controller.inspectBase(await readJson(request), request.signal))
  registerJsonRoute(connection, LOCAL_PATHS.start, ['POST'], async (request) =>
    controller.startLogin(await readJson(request), request.signal))
  registerJsonRoute(connection, LOCAL_PATHS.manual, ['POST'], async (request) =>
    controller.submitManualTicket(await readJson(request)))
  registerJsonRoute(connection, LOCAL_PATHS.inspectDeepLink, ['POST'], async (request) =>
    controller.inspectDeepLink(await readJson(request)))
  registerJsonRoute(connection, LOCAL_PATHS.confirmDeepLink, ['POST'], async (request) =>
    controller.confirmDeepLink(await readJson(request), request.signal))
  registerJsonRoute(connection, LOCAL_PATHS.refresh, ['POST'], (request) =>
    controller.refresh(request.signal))
  registerJsonRoute(connection, LOCAL_PATHS.logout, ['POST'], (request) =>
    controller.logout(request.signal))
  ctx.effect(() => () => controller.dispose(), 'dsh-desktop-enterprise: lifecycle')
  queueMicrotask(() => { void controller.restore() })
}
