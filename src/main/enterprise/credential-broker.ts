import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type {
  EnterpriseCredentialSession,
  EnterpriseVaultSnapshot,
  SecureEnterpriseCredentialVault
} from './secure-credential-vault'

const MAX_BODY_BYTES = 256 * 1024

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload)
  })
  response.end(payload)
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    length += bytes.length
    if (length > MAX_BODY_BYTES) throw Object.assign(new Error('Request body is too large.'), { status: 413 })
    chunks.push(bytes)
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Request body must be an object.')
  }
  return parsed as Record<string, unknown>
}

function authorized(request: IncomingMessage, token: string): boolean {
  const supplied = request.headers.authorization
  if (typeof supplied !== 'string' || !supplied.startsWith('Bearer ')) return false
  const value = Buffer.from(supplied.slice(7))
  const expected = Buffer.from(token)
  return value.length === expected.length && timingSafeEqual(value, expected)
}

export interface EnterpriseCredentialBrokerEnvironment extends NodeJS.ProcessEnv {
  DSH_DESKTOP_ENTERPRISE_BROKER_URL: string
  DSH_DESKTOP_ENTERPRISE_BROKER_TOKEN: string
}

export interface EnterpriseCredentialBrokerOptions {
  activateDesktop?: () => Promise<void> | void
}

export class EnterpriseCredentialBroker {
  private server?: Server
  private token = ''
  private origin = ''

  constructor(
    private readonly vault: SecureEnterpriseCredentialVault,
    private readonly options: EnterpriseCredentialBrokerOptions = {}
  ) {}

  async start(): Promise<EnterpriseCredentialBrokerEnvironment> {
    if (this.server) return this.environment()
    this.token = randomBytes(32).toString('base64url')
    const server = createServer((request, response) => {
      void this.handle(request, response)
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      throw new Error('Enterprise credential broker did not receive a loopback port.')
    }
    this.server = server
    this.origin = `http://127.0.0.1:${address.port}`
    return this.environment()
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = undefined
    this.origin = ''
    this.token = ''
    if (!server) return
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  private environment(): EnterpriseCredentialBrokerEnvironment {
    if (!this.server || !this.origin || !this.token) throw new Error('Enterprise credential broker is not running.')
    return {
      DSH_DESKTOP_ENTERPRISE_BROKER_URL: this.origin,
      DSH_DESKTOP_ENTERPRISE_BROKER_TOKEN: this.token
    }
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      if (!authorized(request, this.token)) {
        sendJson(response, 401, { error: 'unauthorized' })
        return
      }
      const url = new URL(request.url ?? '/', this.origin)
      if (url.search !== '') {
        sendJson(response, 404, { error: 'not_found' })
        return
      }
      if (url.pathname === '/v1/activate') {
        if (request.method !== 'POST') {
          response.setHeader('allow', 'POST')
          sendJson(response, 405, { error: 'method_not_allowed' })
          return
        }
        await this.options.activateDesktop?.()
        sendJson(response, 200, { ok: true })
        return
      }
      if (url.pathname !== '/v1/session') {
        sendJson(response, 404, { error: 'not_found' })
        return
      }
      let result: EnterpriseVaultSnapshot
      if (request.method === 'GET') {
        result = await this.vault.read()
      } else if (request.method === 'PUT') {
        const body = await readJson(request)
        if (!Number.isSafeInteger(body.expected_generation)) {
          throw new Error('expected_generation must be an integer.')
        }
        result = await this.vault.replace(
          Number(body.expected_generation),
          body.session as EnterpriseCredentialSession
        )
      } else if (request.method === 'DELETE') {
        result = await this.vault.clear()
      } else {
        response.setHeader('allow', 'GET, PUT, DELETE')
        sendJson(response, 405, { error: 'method_not_allowed' })
        return
      }
      sendJson(response, 200, result)
    } catch (error) {
      const candidate = error as { code?: unknown; status?: unknown; message?: unknown }
      const status = candidate.code === 'VAULT_CONFLICT'
        ? 409
        : candidate.code === 'SECURE_STORAGE_UNAVAILABLE'
          ? 503
          : Number.isInteger(candidate.status)
            ? Number(candidate.status)
            : 400
      sendJson(response, status, {
        error: typeof candidate.code === 'string' ? candidate.code : 'invalid_request',
        message: typeof candidate.message === 'string' ? candidate.message : 'Credential broker request failed.'
      })
    }
  }
}
