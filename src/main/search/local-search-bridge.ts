import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { BrowserSearchResult } from './browser-search-controller'

const MAX_BODY_BYTES = 16 * 1024
const MAX_QUERY_LENGTH = 512
const MAX_RESULTS = 8

export interface LocalSearchBridgeOptions {
  search(
    query: string,
    maxResults: number,
    signal: AbortSignal
  ): Promise<BrowserSearchResult>
}

export interface LocalSearchEndpoint {
  url: string
  token: string
}

export class LocalSearchBridge {
  private server?: Server
  private endpoint?: LocalSearchEndpoint
  private readonly active = new Set<AbortController>()

  constructor(private readonly options: LocalSearchBridgeOptions) {}

  async start(): Promise<LocalSearchEndpoint> {
    if (this.endpoint) return this.endpoint
    const token = randomBytes(32).toString('hex')
    const server = createServer((request, response) => {
      void this.handle(request, response, token)
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        server.removeListener('error', reject)
        resolve()
      })
    })
    const address = server.address() as AddressInfo
    this.server = server
    this.endpoint = { url: `http://127.0.0.1:${address.port}`, token }
    return this.endpoint
  }

  async stop(): Promise<void> {
    for (const controller of this.active) controller.abort(new Error('Local search stopped.'))
    this.active.clear()
    const server = this.server
    this.server = undefined
    this.endpoint = undefined
    if (!server) return
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
      server.closeAllConnections?.()
    })
  }

  private async handle(
    request: IncomingMessage,
    response: ServerResponse,
    token: string
  ): Promise<void> {
    if (!authorized(request.headers.authorization, token)) {
      sendJson(response, 401, { error: 'Unauthorized.' })
      return
    }
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
    if (requestUrl.pathname !== '/search') {
      sendJson(response, 404, { error: 'Not found.' })
      return
    }
    if (request.method !== 'POST') {
      response.setHeader('allow', 'POST')
      sendJson(response, 405, { error: 'Method not allowed.' })
      return
    }
    if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
      sendJson(response, 415, { error: 'JSON content type required.' })
      return
    }

    const body = await readBody(request)
    if (body.kind === 'too-large') {
      sendJson(response, 413, { error: 'Request body too large.' })
      return
    }
    if (body.kind === 'invalid') {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }
    const parsed = body.value
    if (!isRecord(parsed)) {
      sendJson(response, 400, { error: 'Invalid search request.' })
      return
    }
    const query = typeof parsed.query === 'string' ? parsed.query.trim() : ''
    if (query.length === 0 || query.length > MAX_QUERY_LENGTH) {
      sendJson(response, 400, { error: 'Query must contain 1 to 512 characters.' })
      return
    }
    const requestedMax = parsed.maxResults === undefined ? 5 : parsed.maxResults
    if (!Number.isInteger(requestedMax) || Number(requestedMax) < 1) {
      sendJson(response, 400, { error: 'maxResults must be a positive integer.' })
      return
    }
    const maxResults = Math.min(Number(requestedMax), MAX_RESULTS)
    const controller = new AbortController()
    this.active.add(controller)
    const abort = (): void => {
      if (!response.writableEnded) controller.abort(new Error('Search client disconnected.'))
    }
    request.once('aborted', abort)
    response.once('close', abort)
    try {
      const result = await this.options.search(query, maxResults, controller.signal)
      if (!response.destroyed) sendJson(response, 200, result)
    } catch (error) {
      if (!controller.signal.aborted && !response.destroyed) {
        sendJson(response, 502, {
          error: error instanceof Error ? error.message : 'Local browser search failed.'
        })
      }
    } finally {
      request.removeListener('aborted', abort)
      response.removeListener('close', abort)
      this.active.delete(controller)
    }
  }
}

function authorized(header: string | undefined, token: string): boolean {
  const presented = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  const expectedHash = createHash('sha256').update(token).digest()
  const presentedHash = createHash('sha256').update(presented).digest()
  return timingSafeEqual(expectedHash, presentedHash) && presented.length === token.length
}

async function readBody(
  request: IncomingMessage
): Promise<
  | { kind: 'ok'; value: unknown }
  | { kind: 'invalid' }
  | { kind: 'too-large' }
> {
  const chunks: Buffer[] = []
  let size = 0
  let tooLarge = false
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) {
      tooLarge = true
      continue
    }
    chunks.push(buffer)
  }
  if (tooLarge) return { kind: 'too-large' }
  try {
    return { kind: 'ok', value: JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  } catch {
    return { kind: 'invalid' }
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  if (response.headersSent || response.destroyed) return
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store'
  })
  response.end(payload)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
