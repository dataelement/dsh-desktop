import { createHash, randomUUID } from 'node:crypto'
import { createEnterpriseFetch, type EnterpriseFetch } from './platform-fetch'

export const ENTERPRISE_REQUEST_MAX_BYTES = 2 * 1024 * 1024

export class EnterprisePlatformError extends Error {
  status?: number
  code?: string
  type?: string
  requestId?: string
  uncertain: boolean

  constructor(
    message: string,
    options: {
      status?: number
      code?: string
      type?: string
      requestId?: string
      uncertain?: boolean
    } = {}
  ) {
    super(message)
    this.name = 'EnterprisePlatformError'
    this.status = options.status
    this.code = options.code
    this.type = options.type
    this.requestId = options.requestId
    this.uncertain = options.uncertain === true
  }
}

export interface EnterpriseStreamRequestOptions {
  body: unknown
  accessToken: string
  signal?: AbortSignal
  timeoutMs?: number
  allowInsecureLoopback?: boolean
  allowInsecurePrivateHttp?: boolean
  attribution?: Record<string, string>
}

export interface EnterpriseJsonRequestOptions {
  method?: string
  body?: unknown
  accessToken?: string
  timeoutMs?: number
  signal?: AbortSignal
  allowInsecureLoopback?: boolean
  allowInsecurePrivateHttp?: boolean
  uncertainOnTransport?: boolean
}

export interface EnterpriseJsonResult {
  body: unknown
  requestId?: string
  status: number
}

const contractImport = import('dsh-desktop-enterprise/contract')
const deepLinkImport = import('dsh-desktop-enterprise/deep-link')

export function hashEnterpriseOrigin(origin: string): string {
  return createHash('sha256').update(origin).digest('hex').slice(0, 16)
}

export function isEnterprisePlatformError(error: unknown): error is EnterprisePlatformError {
  return error instanceof EnterprisePlatformError
}

export function isInvalidRefreshError(error: unknown): boolean {
  if (!isEnterprisePlatformError(error)) return false
  return (
    error.code === 'invalid_refresh_token' ||
    error.code === 'refresh_token_reused' ||
    error.code === 'session_revoked'
  )
}

export function isTransientPlatformError(error: unknown): boolean {
  if (isInvalidRefreshError(error)) return false
  if (isEnterprisePlatformError(error)) {
    return error.code === 'network_error' || error.uncertain === true || (error.status ?? 0) >= 500
  }
  return error instanceof Error
}

export async function loadEnterpriseContract() {
  return contractImport
}

export async function resolveEnterpriseEndpoint(
  baseValue: string,
  path: string,
  allowInsecureLoopback = false,
  allowInsecurePrivateHttp = false
): Promise<{ base: string, endpoint: URL }> {
  const { normalizeEnterpriseServerUrl } = await deepLinkImport
  const base = normalizeEnterpriseServerUrl(baseValue, { allowInsecureLoopback, allowInsecurePrivateHttp })
  const endpoint = new URL(path, `${base}/`)
  if (endpoint.origin !== base) {
    throw new EnterprisePlatformError('Enterprise request left the confirmed platform origin.', {
      code: 'invalid_request'
    })
  }
  return { base, endpoint }
}

export async function requestEnterpriseStream(
  fetchImpl: EnterpriseFetch,
  baseValue: string,
  path: string,
  options: EnterpriseStreamRequestOptions
): Promise<Response> {
  const { endpoint } = await resolveEnterpriseEndpoint(
    baseValue,
    path,
    options.allowInsecureLoopback === true,
    options.allowInsecurePrivateHttp === true
  )
  const signal = options.timeoutMs
    ? AbortSignal.any([
      ...(options.signal ? [options.signal] : []),
      AbortSignal.timeout(options.timeoutMs)
    ])
    : options.signal
  const requestId = randomUUID()
  const fetchEnterprise = createEnterpriseFetch(fetchImpl)
  try {
    return await fetchEnterprise(endpoint.toString(), {
      method: 'POST',
      ...(signal ? { signal } : {}),
      headers: {
        accept: 'text/event-stream',
        'content-type': 'application/json',
        'x-request-id': requestId,
        authorization: `Bearer ${options.accessToken}`,
        ...(options.attribution?.['user-agent'] ? { 'user-agent': options.attribution['user-agent'] } : {})
      },
      body: JSON.stringify(options.body)
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new EnterprisePlatformError('Could not reach the BiSheng platform.', {
      code: 'network_error'
    })
  }
}

export async function requestEnterpriseJson(
  fetchImpl: EnterpriseFetch,
  baseValue: string,
  path: string,
  options: EnterpriseJsonRequestOptions = {}
): Promise<EnterpriseJsonResult> {
  const { endpoint } = await resolveEnterpriseEndpoint(
    baseValue,
    path,
    options.allowInsecureLoopback === true,
    options.allowInsecurePrivateHttp === true
  )
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 15_000)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  const requestId = randomUUID()
  const fetchEnterprise = createEnterpriseFetch(fetchImpl)
  let response: Response
  try {
    response = await fetchEnterprise(endpoint.toString(), {
      method: options.method ?? 'GET',
      signal,
      headers: {
        accept: 'application/json',
        'x-request-id': requestId,
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {})
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new EnterprisePlatformError('Could not reach the BiSheng platform.', {
      code: 'network_error',
      uncertain: options.uncertainOnTransport === true
    })
  }
  const upstreamRequestId = response.headers.get('x-request-id') ?? requestId
  const text = await response.text()
  if (Buffer.byteLength(text) > ENTERPRISE_REQUEST_MAX_BYTES) {
    throw new EnterprisePlatformError('BiSheng response is too large.', {
      status: response.status,
      code: 'invalid_response',
      requestId: upstreamRequestId
    })
  }
  let body: unknown
  try {
    body = text === '' ? {} : JSON.parse(text)
  } catch {
    throw new EnterprisePlatformError(`BiSheng returned a non-JSON response (${response.status}).`, {
      status: response.status,
      code: 'invalid_response',
      requestId: upstreamRequestId
    })
  }
  if (!response.ok) {
    const payload = isPlainObject(body) ? body : {}
    const error = isPlainObject(payload.error) ? payload.error : {}
    throw new EnterprisePlatformError(
      typeof error.message === 'string' && error.message.length <= 1000
        ? error.message
        : `BiSheng rejected the request (${response.status}).`,
      {
        status: response.status,
        code: typeof error.code === 'string' ? error.code : 'request_failed',
        type: typeof error.type === 'string' ? error.type : undefined,
        requestId: typeof payload.request_id === 'string' ? payload.request_id : upstreamRequestId,
        uncertain: options.uncertainOnTransport === true && response.status >= 500
      }
    )
  }
  return { body, requestId: upstreamRequestId, status: response.status }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
