import { request as httpRequest } from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertPublicBrokerPayload,
  ENTERPRISE_BROKER_CAPABILITY_ENV,
  ENTERPRISE_BROKER_URL_ENV,
  startEnterpriseCredentialBroker
} from '../src/main/enterprise/credential-broker'
import { createEnterpriseFetch } from '../src/main/enterprise/platform-fetch'
import { EnterpriseService } from '../src/main/enterprise/enterprise-service'
import {
  ENTERPRISE_VAULT_FILENAME,
  type SafeStorageCryptoAdapter,
  SecureEnterpriseCredentialVault
} from '../src/main/enterprise/secure-credential-vault'
import { createMockEnterpriseServer } from '../scripts/mock-bisheng-enterprise.mjs'

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()?.()
})

function memorySafeStorage(): SafeStorageCryptoAdapter {
  return {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => 'keychain',
    encryptString: (plainText) => Buffer.from(plainText, 'utf8'),
    decryptString: (encrypted) => Buffer.from(encrypted as Buffer).toString('utf8')
  }
}

async function createRuntime() {
  const directory = await mkdtemp(join(tmpdir(), 'enterprise-broker-'))
  const vault = new SecureEnterpriseCredentialVault(join(directory, ENTERPRISE_VAULT_FILENAME), memorySafeStorage())
  const notes: string[] = []
  const service = new EnterpriseService({
    vault,
    fetchImpl: createEnterpriseFetch(globalThis.fetch),
    allowInsecureLoopback: true,
    note: (entry) => notes.push(entry.event)
  })
  const broker = await startEnterpriseCredentialBroker(service, { allowInsecureLoopback: true })
  cleanups.push(async () => {
    await broker.stop()
    await service.stop()
  })
  return { service, broker, notes }
}

async function brokerFetch(
  broker: { url: string, capability: string },
  path: string,
  init: RequestInit = {}
) {
  return fetch(new URL(path, `${broker.url}/`), {
    ...init,
    headers: {
      authorization: `Bearer ${broker.capability}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers
    }
  })
}

describe('restricted enterprise credential broker', () => {
  it('rejects browser, host, and non-JSON requests and never returns CORS or tokens', async () => {
    const { broker } = await createRuntime()
    const withOrigin = await brokerFetch(broker, '/v1/state', {
      headers: { origin: 'https://evil.example' }
    })
    expect(withOrigin.status).toBe(403)
    expect(withOrigin.headers.get('access-control-allow-origin')).toBeNull()

    const withSecFetch = await brokerFetch(broker, '/v1/state', {
      headers: { 'sec-fetch-site': 'cross-site' }
    })
    expect(withSecFetch.status).toBe(403)

    const wrongHost = await new Promise<{ status: number }>((resolve, reject) => {
      const request = httpRequest({
        host: '127.0.0.1',
        port: new URL(broker.url).port,
        path: '/v1/state',
        setHost: false,
        headers: {
          host: `example.com:${new URL(broker.url).port}`,
          authorization: `Bearer ${broker.capability}`
        }
      }, (response) => {
        response.resume()
        resolve({ status: response.statusCode ?? 0 })
      })
      request.on('error', reject)
      request.end()
    })
    expect(wrongHost.status).toBe(403)

    const form = await fetch(new URL('/v1/refresh', `${broker.url}/`), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${broker.capability}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: 'base=https://evil.example'
    })
    expect(form.status).toBe(415)

    const unauthorized = await fetch(new URL('/v1/state', `${broker.url}/`))
    expect(unauthorized.status).toBe(401)

    const state = await brokerFetch(broker, '/v1/state')
    expect(state.status).toBe(200)
    const payload = await state.json()
    assertPublicBrokerPayload(payload)
    expect(payload).toMatchObject({
      connected: false,
      phase: 'idle',
      models: [],
      modelsAvailable: false
    })
    expect(JSON.stringify(payload)).not.toMatch(/access_token|refresh_token|session_id/u)
    expect(state.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('logs in through the fixed routes without exporting credentials', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const { broker, service } = await createRuntime()

    const started = await brokerFetch(broker, '/v1/login/start', {
      method: 'POST',
      body: JSON.stringify({ base: origin })
    })
    expect(started.status).toBe(200)
    const login = await started.json()
    assertPublicBrokerPayload(login)
    expect(typeof login.authorizationUrl).toBe('string')
    const authorizationUrl = String(login.authorizationUrl)
    expect(authorizationUrl).toContain('/desktop-login')
    expect(login.base).toBe(origin)

    const injected = await brokerFetch(broker, '/v1/login/start', {
      method: 'POST',
      body: JSON.stringify({
        base: origin,
        authorization: 'Bearer stolen',
        redirect_uri: 'http://127.0.0.1:1/dsh/callback'
      })
    })
    expect(injected.status).toBe(400)

    const authId = new URL(authorizationUrl).searchParams.get('auth_id')
    const browserResponse = await fetch(`${origin}/__mock/authorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        auth_id: authId ?? '',
        email: 'alice@demo.bisheng.local',
        password: 'WorkBuddy123!',
        decision: 'allow'
      })
    })
    const html = await browserResponse.text()
    const callbackLiteral = /location\.replace\((".*?")\)/u.exec(html)?.[1]
    expect(callbackLiteral).toBeTruthy()
    const callback = new URL(JSON.parse(callbackLiteral!))
    expect(await fetch(callback).then((response) => response.status)).toBe(200)

    await viWaitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })
    const state = await (await brokerFetch(broker, '/v1/state')).json()
    assertPublicBrokerPayload(state)
    expect(state).toMatchObject({
      connected: true,
      phase: 'connected',
      modelsAvailable: true
    })
    const models = Array.isArray(state.models) ? state.models : []
    expect(models.some((model) => (
      typeof model === 'object' && model !== null && 'id' in model && model.id === 'bisheng:42'
    ))).toBe(true)
    expect(JSON.stringify(state)).not.toMatch(/access_token|refresh_token|identity_ticket|code_verifier/u)
    expect(state.sessionId).toBeUndefined()
    expect(state.session_id).toBeUndefined()

    const stolen = await brokerFetch(broker, '/v1/chat', {
      method: 'POST',
      body: JSON.stringify({
        request: {
          model: 'bisheng:42',
          messages: [{ role: 'user', content: 'hello' }],
          stream: true,
          stream_options: { include_usage: true },
          n: 1
        },
        attribution: { authorization: 'Bearer stolen' }
      })
    })
    expect(stolen.status).toBe(400)
    assertPublicBrokerPayload(await stolen.json())

    const chat = await brokerFetch(broker, '/v1/chat', {
      method: 'POST',
      body: JSON.stringify({
        request: {
          model: 'bisheng:42',
          messages: [{ role: 'user', content: 'hello' }],
          stream: true,
          stream_options: { include_usage: true },
          n: 1
        }
      })
    })
    expect(chat.status).toBe(200)
    expect(chat.headers.get('content-type')).toContain('text/event-stream')
    const stream = await chat.text()
    expect(stream).toContain('Mock 联调成功')
    expect(stream).not.toMatch(/access_token|refresh_token/u)
    expect([...chat.headers.keys()].join(',')).not.toMatch(/authorization/iu)

    const loggedOut = await (await brokerFetch(broker, '/v1/logout', {
      method: 'POST',
      body: '{}'
    })).json()
    assertPublicBrokerPayload(loggedOut)
    expect(loggedOut.connected).toBe(false)
    expect(loggedOut.phase).toBe('idle')
  })

  it('completes login through the manual code route without exporting the ticket', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const { broker, service } = await createRuntime()

    const started = await brokerFetch(broker, '/v1/login/start', {
      method: 'POST',
      body: JSON.stringify({ base: origin })
    })
    expect(started.status).toBe(200)
    const authorizationUrl = String((await started.json()).authorizationUrl)
    const authId = new URL(authorizationUrl).searchParams.get('auth_id')
    const browserResponse = await fetch(`${origin}/__mock/authorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        auth_id: authId ?? '',
        email: 'alice@demo.bisheng.local',
        password: 'WorkBuddy123!',
        decision: 'allow'
      })
    })
    const html = await browserResponse.text()
    const callbackLiteral = /location\.replace\((".*?")\)/u.exec(html)?.[1]
    const ticket = new URL(JSON.parse(callbackLiteral!)).searchParams.get('identity_ticket')

    const extra = await brokerFetch(broker, '/v1/login/manual', {
      method: 'POST',
      body: JSON.stringify({ identityTicket: ticket, redirect_uri: 'http://127.0.0.1/steal' })
    })
    expect(extra.status).toBe(400)

    const finished = await brokerFetch(broker, '/v1/login/manual', {
      method: 'POST',
      body: JSON.stringify({ identityTicket: ticket })
    })
    expect(finished.status).toBe(200)
    const state = await finished.json()
    assertPublicBrokerPayload(state)
    expect(state.connected).toBe(true)
    expect(service.snapshot().phase).toBe('connected')
    expect(JSON.stringify(state)).not.toMatch(/access_token|refresh_token|identity_ticket|ticket_/u)
  })

  it('rate-limits login attempts', async () => {
    const { broker } = await createRuntime()
    let lastStatus = 0
    for (let index = 0; index < 11; index += 1) {
      lastStatus = (await brokerFetch(broker, '/v1/login/start', {
        method: 'POST',
        body: '{}'
      })).status
    }
    expect(lastStatus).toBe(429)
  })

  it('invalidates the previous capability after rotation and stop', async () => {
    const { broker } = await createRuntime()
    const previous = broker.capability
    broker.rotateCapability()
    expect(broker.capability).not.toBe(previous)
    const replay = await brokerFetch({ url: broker.url, capability: previous }, '/v1/state')
    expect(replay.status).toBe(401)
    const current = await brokerFetch(broker, '/v1/state')
    expect(current.status).toBe(200)
  })

  it('invalidates the previous capability after stop', async () => {
    const { broker } = await createRuntime()
    const environment = broker.environment()
    expect(environment[ENTERPRISE_BROKER_URL_ENV]).toBe(broker.url)
    expect(environment[ENTERPRISE_BROKER_CAPABILITY_ENV]).toBe(broker.capability)
    const previous = broker.capability
    await broker.stop()
    const replay = await fetch(new URL('/v1/state', `${broker.url}/`), {
      headers: { authorization: `Bearer ${previous}` }
    }).catch((error: unknown) => error)
    expect(replay instanceof Error || (replay instanceof Response && replay.status !== 200)).toBe(true)
  })
})

async function viWaitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('Timed out waiting for enterprise state.')
}
