import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { normalizeEnterpriseServerUrl } from './deep-link.js'

export const CONTRACT_VERSION = '0.5.0'
export const CLIENT_ID = 'dsh-desktop'
export const CALLBACK_PATH = '/dsh/callback'
export const ACCESS_REFRESH_SKEW_MS = 60_000
export const COMPATIBLE_CONTRACT_VERSIONS = Object.freeze(['0.4.0', CONTRACT_VERSION])
export const API_PATHS = Object.freeze({
  config: '/api/v1/dsh/config',
  authorizations: '/api/dsh/authorizations',
  token: '/api/dsh/token',
  logout: '/api/dsh/logout',
  models: '/api/v1/dsh/models',
  chat: '/api/v1/dsh/chat/completions',
  usage: '/api/v1/dsh/usage'
})

const PKCE_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/u
const TOKEN_MAX_LENGTH = 32 * 1024
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024

export class EnterpriseApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'EnterpriseApiError'
    this.status = options.status
    this.code = options.code
    this.type = options.type
    this.requestId = options.requestId
    this.uncertain = options.uncertain === true
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value, field, maximum = 4096) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new Error(`BiSheng response has an invalid ${field}.`)
  }
  return value
}

function requiredInteger(value, field, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`BiSheng response has an invalid ${field}.`)
  }
  return value
}

function requiredTimestamp(value, field) {
  const text = requiredString(value, field, 128)
  if (!Number.isFinite(Date.parse(text))) throw new Error(`BiSheng response has an invalid ${field}.`)
  return text
}

function identity(value, kind) {
  if (!isObject(value)) throw new Error(`BiSheng response is missing ${kind}.`)
  if (kind === 'user') {
    return {
      id: requiredString(value.id, 'user id', 256),
      username: requiredString(value.username, 'username', 256),
      display_name: requiredString(value.display_name, 'display name', 256)
    }
  }
  return {
    id: requiredString(value.id, 'tenant id', 256),
    name: requiredString(value.name, 'tenant name', 256)
  }
}

export function createPkceTransaction() {
  const codeVerifier = randomBytes(32).toString('base64url')
  const state = randomBytes(32).toString('base64url')
  if (!PKCE_PATTERN.test(codeVerifier)) throw new Error('Generated PKCE verifier is invalid.')
  return {
    codeVerifier,
    codeChallenge: createHash('sha256').update(codeVerifier, 'ascii').digest('base64url'),
    state
  }
}

export function pkceChallenge(codeVerifier) {
  if (!PKCE_PATTERN.test(codeVerifier)) throw new Error('PKCE verifier is invalid.')
  return createHash('sha256').update(codeVerifier, 'ascii').digest('base64url')
}

export function parseConfig(value) {
  if (!isObject(value) || typeof value.enabled !== 'boolean') {
    throw new Error('BiSheng config response is invalid.')
  }
  if (!value.enabled) return { enabled: false }
  const contractVersion = requiredString(value.contract_version, 'contract version', 64)
  if (value.client_id !== CLIENT_ID || !COMPATIBLE_CONTRACT_VERSIONS.includes(contractVersion)) {
    throw new Error('BiSheng DSH contract version is incompatible with this Desktop build.')
  }
  return { enabled: true, client_id: CLIENT_ID, contract_version: contractVersion }
}

export function parseAuthorization(value, base) {
  if (!isObject(value)) throw new Error('BiSheng authorization response is invalid.')
  const authId = requiredString(value.auth_id, 'authorization id', 256)
  const authorizeUrl = new URL(requiredString(value.authorize_url, 'authorization URL', 4096))
  if (authorizeUrl.origin !== base || authorizeUrl.pathname !== '/desktop-login') {
    throw new Error('BiSheng authorization URL left the confirmed platform origin.')
  }
  if (authorizeUrl.searchParams.get('auth_id') !== authId) {
    throw new Error('BiSheng authorization URL does not match its authorization id.')
  }
  const expiresIn = requiredInteger(value.expires_in, 'authorization expiry', 1)
  return { auth_id: authId, authorize_url: authorizeUrl.toString(), expires_in: expiresIn }
}

export function parseToken(value, base, receivedAt = Date.now()) {
  if (!isObject(value)) throw new Error('BiSheng token response is invalid.')
  if (value.token_type !== 'Bearer') throw new Error('BiSheng token type is not Bearer.')
  const expiresIn = requiredInteger(value.expires_in, 'access expiry', 1)
  const refreshExpiresIn = requiredInteger(value.refresh_expires_in, 'refresh expiry', 1)
  return {
    base,
    token_type: 'Bearer',
    access_token: requiredString(value.access_token, 'access token', TOKEN_MAX_LENGTH),
    access_expires_at: new Date(receivedAt + expiresIn * 1000).toISOString(),
    refresh_token: requiredString(value.refresh_token, 'refresh token', TOKEN_MAX_LENGTH),
    refresh_expires_at: new Date(receivedAt + refreshExpiresIn * 1000).toISOString(),
    session_id: requiredString(value.session_id, 'session id', 256),
    session_expires_at: requiredTimestamp(value.session_expires_at, 'session expiry'),
    user: identity(value.user, 'user'),
    tenant: identity(value.tenant, 'tenant')
  }
}

export function parseModels(value) {
  if (!isObject(value) || value.object !== 'list' || !Array.isArray(value.data)) {
    throw new Error('BiSheng models response is invalid.')
  }
  const seen = new Set()
  return value.data.map((entry) => {
    if (!isObject(entry) || !isObject(entry.capabilities)) {
      throw new Error('BiSheng models response contains an invalid model.')
    }
    const id = requiredString(entry.id, 'model id', 512)
    if (seen.has(id)) throw new Error(`BiSheng models response repeats model "${id}".`)
    seen.add(id)
    if (
      typeof entry.capabilities.streaming !== 'boolean' ||
      typeof entry.capabilities.tools !== 'boolean' ||
      typeof entry.capabilities.reasoning_content !== 'boolean'
    ) {
      throw new Error(`BiSheng model "${id}" has invalid capabilities.`)
    }
    return {
      id,
      object: requiredString(entry.object, 'model object', 64),
      created: requiredInteger(entry.created, 'model creation time'),
      owned_by: requiredString(entry.owned_by, 'model owner', 256),
      display_name: requiredString(entry.display_name, 'model display name', 512),
      capabilities: {
        streaming: entry.capabilities.streaming,
        tools: entry.capabilities.tools,
        reasoning_content: entry.capabilities.reasoning_content
      }
    }
  })
}

export function parseUsage(value) {
  if (!isObject(value)) throw new Error('BiSheng usage response is invalid.')
  const source = requiredString(value.source, 'usage source', 32)
  const quotaState = requiredString(value.quota_state, 'quota state', 32)
  if (!['live', 'persisted', 'unavailable'].includes(source)) {
    throw new Error('BiSheng usage response has an unsupported source.')
  }
  if (!['available', 'exhausted', 'unavailable'].includes(quotaState)) {
    throw new Error('BiSheng usage response has an unsupported quota state.')
  }
  const nullableInteger = (field) => value[field] === null ? null : requiredInteger(value[field], field)
  const nullableTimestamp = (field) => value[field] === null ? null : requiredTimestamp(value[field], field)
  return {
    month: requiredString(value.month, 'usage month', 16),
    billing_timezone: requiredString(value.billing_timezone, 'billing timezone', 128),
    period_start: requiredTimestamp(value.period_start, 'period start'),
    reset_at: requiredTimestamp(value.reset_at, 'usage reset'),
    used: nullableInteger('used'),
    limit: nullableInteger('limit'),
    remaining: nullableInteger('remaining'),
    source,
    as_of: nullableTimestamp('as_of'),
    quota_state: quotaState
  }
}

export function accessNeedsRefresh(session, now = Date.now()) {
  return Date.parse(session.access_expires_at) - now < ACCESS_REFRESH_SKEW_MS
}

export async function requestJson(baseValue, path, options = {}) {
  const base = normalizeEnterpriseServerUrl(baseValue, {
    allowInsecureLoopback: options.allowInsecureLoopback === true
  })
  const endpoint = new URL(path, `${base}/`)
  if (endpoint.origin !== base) throw new Error('Enterprise request left the confirmed platform origin.')
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 15_000)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  let response
  try {
    response = await fetch(endpoint, {
      method: options.method ?? 'GET',
      redirect: 'error',
      signal,
      headers: {
        accept: 'application/json',
        'x-request-id': randomUUID(),
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {})
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new EnterpriseApiError('Could not reach the BiSheng platform.', {
      code: 'network_error',
      uncertain: options.uncertainOnTransport === true
    })
  }
  const requestId = response.headers.get('x-request-id') ?? undefined
  const text = await response.text()
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) {
    throw new EnterpriseApiError('BiSheng response is too large.', {
      status: response.status,
      code: 'invalid_response',
      requestId
    })
  }
  let body
  try {
    body = text === '' ? {} : JSON.parse(text)
  } catch {
    throw new EnterpriseApiError(`BiSheng returned a non-JSON response (${response.status}).`, {
      status: response.status,
      code: 'invalid_response',
      requestId
    })
  }
  if (!response.ok) {
    const error = isObject(body.error) ? body.error : {}
    throw new EnterpriseApiError(
      typeof error.message === 'string' && error.message.length <= 1000
        ? error.message
        : `BiSheng rejected the request (${response.status}).`,
      {
        status: response.status,
        code: typeof error.code === 'string' ? error.code : 'request_failed',
        type: typeof error.type === 'string' ? error.type : undefined,
        requestId: typeof body.request_id === 'string' ? body.request_id : requestId,
        uncertain: options.uncertainOnTransport === true && response.status >= 500
      }
    )
  }
  return { body, requestId }
}
