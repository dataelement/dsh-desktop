import { applyEnterpriseMarket } from './market.js'
import {
  isInsecurePrivateHttpOrigin,
  normalizeEnterpriseServerUrl,
  parseEnterpriseLoginDeepLink
} from './deep-link.js'
import { EnterpriseLlmAdapter, pickAttributionHeaders } from './openai.js'

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

function disabledState(error) {
  return {
    connected: false,
    secureStorageAvailable: false,
    phase: 'disabled',
    revision: 0,
    models: [],
    modelsAvailable: false,
    ...(error ? { error } : {})
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function allowInsecureLoopback() {
  return process.env.DSH_DESKTOP_ENTERPRISE_ALLOW_INSECURE_LOOPBACK === '1'
}

function inspectUrlOptions() {
  return {
    allowInsecureLoopback: allowInsecureLoopback(),
    allowInsecurePrivateHttp: true
  }
}

function inspectedBase(base) {
  return {
    base,
    ...(isInsecurePrivateHttpOrigin(base) ? { insecurePrivateHttp: true } : {})
  }
}

function brokerConfig() {
  const urlValue = process.env.DSH_DESKTOP_ENTERPRISE_BROKER_URL
  const capability = process.env.DSH_DESKTOP_ENTERPRISE_BROKER_CAPABILITY
  if (!urlValue || !capability) return undefined
  let url
  try {
    url = new URL(urlValue)
  } catch {
    return undefined
  }
  if (
    url.protocol !== 'http:'
    || (url.hostname !== '127.0.0.1' && url.hostname !== '[::1]')
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    return undefined
  }
  return { origin: url.origin, capability }
}

async function readJson(request) {
  const text = await request.text()
  if (Buffer.byteLength(text) > MAX_JSON_BYTES) throw new Error('Request body is too large.')
  if (!text) return {}
  const body = JSON.parse(text)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('Request body must be a JSON object.')
  }
  return body
}

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' }
  })
}

function registerJsonRoute(connection, path, methods, handler) {
  connection.fetch.register({
    path,
    methods,
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        return jsonResponse(await handler(request))
      } catch (error) {
        const status = Number(error?.status) || 400
        return jsonResponse({ ok: false, error: errorMessage(error) }, status)
      }
    }
  })
}

function unavailable() {
  throw Object.assign(new Error('Enterprise login is not available yet.'), { status: 503 })
}

async function brokerChat(body, signal, attribution) {
  const broker = brokerConfig()
  if (!broker) unavailable()
  let response
  try {
    response = await fetch(new URL('/v1/chat', `${broker.origin}/`), {
      method: 'POST',
      redirect: 'error',
      signal,
      headers: {
        authorization: `Bearer ${broker.capability}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ request: body, attribution })
    })
  } catch (error) {
    if (signal?.aborted) throw error
    unavailable()
  }
  return response
}

async function brokerJson(path, body) {
  const broker = brokerConfig()
  if (!broker) unavailable()
  let response
  try {
    response = await fetch(new URL(path, `${broker.origin}/`), {
      method: body === undefined ? 'GET' : 'POST',
      redirect: 'error',
      headers: {
        authorization: `Bearer ${broker.capability}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    })
  } catch {
    unavailable()
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw Object.assign(new Error(typeof payload.error === 'string' ? payload.error : `Enterprise request failed (${response.status}).`), {
      status: response.status
    })
  }
  return payload
}

export function apply(ctx) {
  const connection = Reflect.get(ctx, 'connection')
  let market
  let account = disabledState()
  let ingestEnterpriseState = () => undefined
  const readBrokerState = async () => {
    const state = brokerConfig() ? await brokerJson('/v1/state') : disabledState()
    if (account.connectionKey !== state.connectionKey) await market?.stop()
    account = state
    ingestEnterpriseState(state)
    return state
  }
  market = applyEnterpriseMarket(ctx, {
    state: () => account,
    refreshState: readBrokerState,
    refreshProfile: readBrokerState,
    async marketRequest(path, body, binary = false) {
      const broker = brokerConfig()
      if (!broker) unavailable()
      const response = await fetch(new URL('/v1/market', broker.origin), {
        method: 'POST', redirect: 'error',
        headers: { authorization: `Bearer ${broker.capability}`, 'content-type': 'application/json' },
        body: JSON.stringify({ path, connectionKey: account.connectionKey, ...(body === undefined ? {} : { body }) })
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || `Enterprise market request failed (${response.status}).`)
      }
      return binary ? Buffer.from(await response.arrayBuffer()) : response.json()
    }
  })
  registerJsonRoute(connection, LOCAL_PATHS.state, ['GET'], async () => readBrokerState())
  registerJsonRoute(connection, LOCAL_PATHS.inspectBase, ['POST'], async (request) => {
    const body = await readJson(request)
    return inspectedBase(normalizeEnterpriseServerUrl(String(body?.base ?? ''), inspectUrlOptions()))
  })
  registerJsonRoute(connection, LOCAL_PATHS.start, ['POST'], async (request) => {
    const body = await readJson(request)
    return brokerJson('/v1/login/start', {
      base: String(body?.base ?? ''),
      ...(body?.confirmInsecurePrivateHttp === true ? { confirmInsecurePrivateHttp: true } : {})
    })
  })
  registerJsonRoute(connection, LOCAL_PATHS.manual, ['POST'], async (request) => {
    const body = await readJson(request)
    const state = await brokerJson('/v1/login/manual', { identityTicket: String(body?.identityTicket ?? '') })
    ingestEnterpriseState(state)
    return state
  })
  registerJsonRoute(connection, LOCAL_PATHS.inspectDeepLink, ['POST'], async (request) => {
    const body = await readJson(request)
    const parsed = parseEnterpriseLoginDeepLink(String(body?.url ?? ''), inspectUrlOptions())
    return inspectedBase(parsed.serverUrl)
  })
  registerJsonRoute(connection, LOCAL_PATHS.confirmDeepLink, ['POST'], async (request) => {
    const body = await readJson(request)
    return brokerJson('/v1/login/start', {
      base: String(body?.base ?? ''),
      ...(body?.confirmInsecurePrivateHttp === true ? { confirmInsecurePrivateHttp: true } : {})
    })
  })
  registerJsonRoute(connection, LOCAL_PATHS.refresh, ['POST'], async (request) => {
    await readJson(request)
    if (!brokerConfig()) return disabledState()
    const state = await brokerJson('/v1/refresh', {})
    ingestEnterpriseState(state)
    return state
  })
  registerJsonRoute(connection, LOCAL_PATHS.logout, ['POST'], async (request) => {
    await readJson(request)
    if (!brokerConfig()) return disabledState()
    const state = await brokerJson('/v1/logout', {})
    await market.stop()
    account = state
    ingestEnterpriseState(state)
    return state
  })
  const llm = ctx.llm
  if (llm && brokerConfig()) {
    const handle = startEnterpriseLlm(ctx, llm)
    ingestEnterpriseState = handle.ingest
    if (typeof ctx.effect === 'function') {
      ctx.effect(() => handle.dispose, 'dsh-desktop-enterprise: poll broker state')
    }
  }
}

function startEnterpriseLlm(ctx, llm) {
  let latest = disabledState()
  let models = []
  let modelsAvailable = false
  let revision = -1
  let registration
  let timer
  let stopped = false
  const adapter = new EnterpriseLlmAdapter({
    providerName: () => latest.tenant?.name || latest.user?.display_name || 'BiSheng Enterprise',
    models: () => modelsAvailable ? models : [],
    request: (body, signal, headers) => brokerChat(body, signal, pickAttributionHeaders(headers)),
    readImage: (ref, signal) => ctx.get?.('attachments')?.readImageRequest?.(ref, {
      maxPixels: 4_194_304,
      maxBytes: 5 * 1024 * 1024
    }, signal)
  })

  const ingest = (state) => {
    latest = state
    if (state.revision === revision) return
    const nextRevision = Number.isSafeInteger(state.revision) ? state.revision : revision
    models = Array.isArray(state.models) ? state.models : []
    modelsAvailable = state.modelsAvailable === true && models.length > 0
    if (modelsAvailable) {
      if (!registration) registration = llm.registerAdapter([BISHENG_PROVIDER_ROUTE], adapter)
      else registration.replace([BISHENG_PROVIDER_ROUTE])
    } else if (registration) {
      registration.replace([])
    }
    revision = nextRevision
  }

  const poll = async () => {
    if (stopped) return
    try {
      ingest(brokerConfig() ? await brokerJson('/v1/state') : disabledState())
    } catch {
      // Keep the last published catalog until the next local snapshot.
    }
    const delay = ['authorizing', 'refreshing'].includes(latest.phase)
      ? 1_000
      : latest.connected
        ? 30_000
        : 60_000
    timer = setTimeout(() => { void poll() }, delay)
    timer.unref?.()
  }
  void poll()
  return {
    ingest(state) {
      if (stopped) return
      try {
        ingest(state)
      } catch {
        // Settings reads must not fail if adapter registration throws.
      }
    },
    dispose() {
      stopped = true
      if (timer) clearTimeout(timer)
      registration?.()
    }
  }
}
