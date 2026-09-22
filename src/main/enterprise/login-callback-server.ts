import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

export const ENTERPRISE_CALLBACK_PATH = '/dsh/callback'
export const ENTERPRISE_CALLBACK_HOST = '127.0.0.1'
export const ENTERPRISE_CALLBACK_FLOW_TIMEOUT_MS = 5 * 60 * 1000
export const ENTERPRISE_CALLBACK_HEADERS_TIMEOUT_MS = 5_000
export const ENTERPRISE_CALLBACK_REQUEST_TIMEOUT_MS = 10_000
export const ENTERPRISE_CALLBACK_IDLE_TIMEOUT_MS = 5_000
export const ENTERPRISE_CALLBACK_MAX_CONNECTIONS = 16

export interface LoginCallbackAccepted {
  authId: string
  state: string
  identityTicket?: string
  error?: string
}

export interface EnterpriseLoginCallbackServer {
  readonly redirectUri: string
  readonly port: number
  close(): Promise<void>
}

const CALLBACK_SECURITY_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"
}

export function escapeCallbackHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

function callbackPage(title: string, message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeCallbackHtml(title)}</title></head><body><p>${escapeCallbackHtml(message)}</p></body></html>`
}

function isLoopbackAddress(address?: string): boolean {
  return address === '127.0.0.1' || address === '::1' || address === ':ffff:127.0.0.1'
}

function sendHtml(response: ServerResponse, status: number, title: string, message: string): void {
  const html = callbackPage(title, message)
  response.writeHead(status, {
    ...CALLBACK_SECURITY_HEADERS,
    'content-length': Buffer.byteLength(html)
  })
  response.end(html)
}

export async function startLoginCallbackServer(options: {
  expectedState: string
  expectedAuthId: () => string | undefined
  timeoutMs?: number
  onAccepted: (result: LoginCallbackAccepted) => void
}): Promise<EnterpriseLoginCallbackServer> {
  const timeoutMs = Math.min(
    Math.max(options.timeoutMs ?? ENTERPRISE_CALLBACK_FLOW_TIMEOUT_MS, 1_000),
    ENTERPRISE_CALLBACK_FLOW_TIMEOUT_MS
  )
  let consumed = false
  let closed = false
  let settleClose: (() => void) | undefined
  const closedPromise = new Promise<void>((resolve) => {
    settleClose = resolve
  })

  const server: Server = createServer((request, response) => {
    void handleCallbackRequest(request, response)
  })
  server.maxConnections = ENTERPRISE_CALLBACK_MAX_CONNECTIONS
  server.headersTimeout = ENTERPRISE_CALLBACK_HEADERS_TIMEOUT_MS
  server.requestTimeout = ENTERPRISE_CALLBACK_REQUEST_TIMEOUT_MS
  server.keepAliveTimeout = ENTERPRISE_CALLBACK_IDLE_TIMEOUT_MS
  server.timeout = ENTERPRISE_CALLBACK_REQUEST_TIMEOUT_MS

  function finish(): void {
    if (closed) return
    closed = true
    clearTimeout(flowTimer)
    server.close(() => settleClose?.())
  }

  async function handleCallbackRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const port = addressPort()
    if (
      request.method !== 'GET' ||
      request.headers.host !== `${ENTERPRISE_CALLBACK_HOST}:${port}` ||
      !isLoopbackAddress(request.socket.remoteAddress)
    ) {
      sendHtml(response, 400, 'Invalid request', 'This login request is not valid.')
      return
    }
    let url: URL
    try {
      url = new URL(request.url ?? '/', `http://${ENTERPRISE_CALLBACK_HOST}:${port}`)
    } catch {
      sendHtml(response, 400, 'Invalid request', 'This login request is not valid.')
      return
    }
    if (url.pathname !== ENTERPRISE_CALLBACK_PATH) {
      sendHtml(response, 404, 'Not found', 'This login request is not valid.')
      return
    }
    const authId = url.searchParams.get('auth_id') ?? undefined
    const state = url.searchParams.get('state') ?? undefined
    const identityTicket = url.searchParams.get('identity_ticket') ?? undefined
    const error = url.searchParams.get('error') ?? undefined
    const expectedAuthId = options.expectedAuthId()
    if (
      consumed ||
      !authId ||
      !state ||
      state !== options.expectedState ||
      !expectedAuthId ||
      authId !== expectedAuthId ||
      (!identityTicket && !error)
    ) {
      sendHtml(response, 400, 'Invalid request', 'This login request is not valid.')
      return
    }
    consumed = true
    sendHtml(
      response,
      200,
      'Return to DSH Desktop',
      'You can close this window and return to DSH Desktop.'
    )
    finish()
    options.onAccepted({
      authId,
      state,
      ...(identityTicket ? { identityTicket } : {}),
      ...(error ? { error } : {})
    })
  }

  function addressPort(): number {
    const address = server.address()
    if (!address || typeof address === 'string') return 0
    return address.port
  }

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, ENTERPRISE_CALLBACK_HOST, () => resolve())
  })

  const port = addressPort()
  if (!port) {
    server.close()
    throw new Error('Enterprise login callback did not receive a TCP port.')
  }

  const flowTimer = setTimeout(() => finish(), timeoutMs)
  flowTimer.unref?.()

  return {
    redirectUri: `http://${ENTERPRISE_CALLBACK_HOST}:${port}${ENTERPRISE_CALLBACK_PATH}`,
    port,
    async close() {
      finish()
      await closedPromise
    }
  }
}
