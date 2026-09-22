import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { SlidingWindowLimiter } from './enterprise-rate-limit'
import type { EnterpriseService } from './enterprise-service'

export const ENTERPRISE_BROKER_HOST = '127.0.0.1'
export const ENTERPRISE_BROKER_JSON_LIMIT = 256 * 1024
export const ENTERPRISE_BROKER_CHAT_LIMIT = 32 * 1024 * 1024
export const ENTERPRISE_BROKER_URL_ENV = 'DSH_DESKTOP_ENTERPRISE_BROKER_URL'
export const ENTERPRISE_BROKER_CAPABILITY_ENV = 'DSH_DESKTOP_ENTERPRISE_BROKER_CAPABILITY'
export const ENTERPRISE_ALLOW_INSECURE_LOOPBACK_ENV = 'DSH_DESKTOP_ENTERPRISE_ALLOW_INSECURE_LOOPBACK'

const JSON_ROUTES = new Map<string, 'GET' | 'POST'>([
  ['/v1/state', 'GET'],
  ['/v1/login/start', 'POST'],
  ['/v1/login/manual', 'POST'],
  ['/v1/refresh', 'POST'],
  ['/v1/logout', 'POST'],
  ['/v1/chat', 'POST'],
  ['/v1/market', 'POST']
])

export interface EnterpriseCredentialBroker {
  readonly url: string
  readonly capability: string
  environment(): NodeJS.ProcessEnv
  rotateCapability(): void
  stop(): Promise<void>
}

export async function startEnterpriseCredentialBroker(
  service: EnterpriseService,
  options: { allowInsecureLoopback: boolean } = { allowInsecureLoopback: false }
): Promise<EnterpriseCredentialBroker> {
  let capability = createCapability()
  const loginLimit = new SlidingWindowLimiter(10, 60_000)
  const refreshLimit = new SlidingWindowLimiter(30, 60_000)
  const logoutLimit = new SlidingWindowLimiter(20, 60_000)
  const server = createServer((request, response) => {
    void handleBrokerRequest(request, response)
  })
  server.maxConnections = 16
  server.headersTimeout = 5_000
  server.requestTimeout = 31 * 60 * 1000
  server.keepAliveTimeout = 5_000

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, ENTERPRISE_BROKER_HOST, () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Enterprise credential broker did not receive a TCP port.')
  }
  const port = address.port
  const url = `http://${ENTERPRISE_BROKER_HOST}:${port}`
  const expectedHost = `${ENTERPRISE_BROKER_HOST}:${port}`

  async function handleBrokerRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (hasBrowserHeaders(request) || request.headers.host !== expectedHost || !isLoopbackAddress(request.socket.remoteAddress)) {
      sendJson(response, 403, { error: 'Forbidden.' })
      return
    }
    let path: string
    try {
      path = new URL(request.url ?? '/', url).pathname
    } catch {
      sendJson(response, 400, { error: 'Invalid request.' })
      return
    }
    const allowedMethod = JSON_ROUTES.get(path)
    if (!allowedMethod) {
      sendJson(response, 404, { error: 'Not found.' })
      return
    }
    if (request.method !== allowedMethod) {
      sendJson(response, 405, { error: 'Method not allowed.' })
      return
    }
    if (!authorize(request, capability)) {
      sendJson(response, 401, { error: 'Unauthorized.' })
      return
    }
    if (request.method === 'POST' && !isJsonContentType(request.headers['content-type'])) {
      sendJson(response, 415, { error: 'JSON body required.' })
      return
    }
    try {
      if (path === '/v1/state') {
        sendJson(response, 200, service.snapshot())
        return
      }
      if (path === '/v1/chat') {
        const body = await readJsonBody(request, ENTERPRISE_BROKER_CHAT_LIMIT)
        const controller = new AbortController()
        const abortIfClientGone = () => {
          if (!response.writableFinished) controller.abort()
        }
        request.on('aborted', abortIfClientGone)
        response.on('close', abortIfClientGone)
        try {
          await service.proxyChat(body, response, controller.signal)
        } finally {
          request.off('aborted', abortIfClientGone)
          response.off('close', abortIfClientGone)
        }
        return
      }
      const body = await readJsonBody(request, ENTERPRISE_BROKER_JSON_LIMIT)
      if (path === '/v1/market') {
        const result = await service.marketRequest(body)
        response.writeHead(200, { 'content-type': result.binary ? 'application/octet-stream' : 'application/json', 'cache-control': 'no-store' })
        response.end(result.bytes)
        return
      }
      if (path === '/v1/login/start') {
        if (!loginLimit.allow()) {
          sendJson(response, 429, { error: 'Too many login attempts.' })
          return
        }
        if (!isLoginStartBody(body)) {
          sendJson(response, 400, { error: 'A platform address is required.' })
          return
        }
        const started = await service.startLogin(body.base, {
          confirmInsecurePrivateHttp: body.confirmInsecurePrivateHttp === true
        })
        sendJson(response, 200, started)
        return
      }
      if (path === '/v1/login/manual') {
        if (!loginLimit.allow()) {
          sendJson(response, 429, { error: 'Too many login attempts.' })
          return
        }
        if (
          !isExactObject(body, ['identityTicket'])
          || typeof body.identityTicket !== 'string'
        ) {
          sendJson(response, 400, { error: 'A one-time login code is required.' })
          return
        }
        sendJson(response, 200, await service.submitManualTicket(body.identityTicket))
        return
      }
      if (path === '/v1/refresh') {
        if (!refreshLimit.allow()) {
          sendJson(response, 429, { error: 'Too many refresh attempts.' })
          return
        }
        if (!isExactObject(body, [])) {
          sendJson(response, 400, { error: 'Refresh does not accept a body.' })
          return
        }
        sendJson(response, 200, await service.refresh())
        return
      }
      if (path === '/v1/logout') {
        if (!logoutLimit.allow()) {
          sendJson(response, 429, { error: 'Too many logout attempts.' })
          return
        }
        if (!isExactObject(body, [])) {
          sendJson(response, 400, { error: 'Logout does not accept a body.' })
          return
        }
        sendJson(response, 200, await service.logout())
        return
      }
    } catch (error) {
      const status = Number((error as { status?: number }).status)
      sendJson(response, Number.isInteger(status) && status >= 400 && status < 600 ? status : 400, {
        error: error instanceof Error ? error.message : 'Enterprise request failed.'
      })
    }
  }

  return {
    url,
    get capability() {
      return capability
    },
    environment() {
      return {
        [ENTERPRISE_BROKER_URL_ENV]: url,
        [ENTERPRISE_BROKER_CAPABILITY_ENV]: capability,
        ...(options.allowInsecureLoopback ? { [ENTERPRISE_ALLOW_INSECURE_LOOPBACK_ENV]: '1' } : {})
      }
    },
    rotateCapability() {
      capability = createCapability()
    },
    async stop() {
      capability = createCapability()
      if (!server.listening) return
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }
}

function createCapability(): string {
  return randomBytes(32).toString('base64url')
}

function authorize(request: IncomingMessage, capability: string): boolean {
  const header = request.headers.authorization
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false
  const provided = Buffer.from(header.slice(7))
  const expected = Buffer.from(capability)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

function hasBrowserHeaders(request: IncomingMessage): boolean {
  if (request.headers.origin !== undefined) return true
  // Node fetch sends Sec-Fetch-Mode; browsers also send Site/Dest.
  return request.headers['sec-fetch-site'] !== undefined || request.headers['sec-fetch-dest'] !== undefined
}

function isJsonContentType(value?: string | string[]): boolean {
  const header = Array.isArray(value) ? value[0] : value
  return typeof header === 'string' && header.split(';')[0]?.trim().toLowerCase() === 'application/json'
}

function isLoopbackAddress(address?: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address === ':ffff:127.0.0.1'
}

function isExactObject(value: unknown, keys: string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).every((key) => keys.includes(key))
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key) || keys.length === 0)
}

function isLoginStartBody(
  value: unknown
): value is { base: string, confirmInsecurePrivateHttp?: boolean } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const body = value as Record<string, unknown>
  if (typeof body.base !== 'string') return false
  if (
    body.confirmInsecurePrivateHttp !== undefined
    && body.confirmInsecurePrivateHttp !== true
    && body.confirmInsecurePrivateHttp !== false
  ) {
    return false
  }
  return Object.keys(body).every((key) => key === 'base' || key === 'confirmInsecurePrivateHttp')
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload)
  })
  response.end(payload)
}

async function readJsonBody(request: IncomingMessage, limit: number): Promise<unknown> {
  const text = (await readLimitedBody(request, limit)).toString('utf8')
  if (!text) return {}
  const parsed = JSON.parse(text) as unknown
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw Object.assign(new Error('Request body must be a JSON object.'), { status: 400 })
  }
  return parsed
}

async function readLimitedBody(request: IncomingMessage, limit: number): Promise<Buffer> {
  const declared = Number(request.headers['content-length'])
  if (Number.isFinite(declared) && declared > limit) {
    throw Object.assign(new Error('Request body is too large.'), { status: 413 })
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > limit) throw Object.assign(new Error('Request body is too large.'), { status: 413 })
    chunks.push(bytes)
  }
  return Buffer.concat(chunks)
}

export function assertPublicBrokerPayload(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Enterprise broker payload is not an object.')
  }
  const text = JSON.stringify(value)
  if (/access_token|refresh_token|identity_ticket|code_verifier|codeVerifier/iu.test(text)) {
    throw new Error('Enterprise broker payload leaked a credential field.')
  }
}
