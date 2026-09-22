import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEnterpriseFetch, type EnterpriseFetch } from '../src/main/enterprise/platform-fetch'
import { EnterpriseService, type EnterpriseServiceOptions } from '../src/main/enterprise/enterprise-service'
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

async function createService(
  fetchImpl: EnterpriseFetch = createEnterpriseFetch(globalThis.fetch),
  options: Pick<EnterpriseServiceOptions, 'desktopVersion' | 'activateDesktop'> = {}
) {
  const directory = await mkdtemp(join(tmpdir(), 'enterprise-service-'))
  const vault = new SecureEnterpriseCredentialVault(join(directory, ENTERPRISE_VAULT_FILENAME), memorySafeStorage())
  const notes: string[] = []
  const service = new EnterpriseService({
    ...options,
    vault,
    fetchImpl,
    allowInsecureLoopback: true,
    note: (entry) => notes.push(entry.event)
  })
  await service.restore()
  cleanups.push(async () => service.stop())
  return { service, vault, notes }
}

async function completeBrowserLogin(origin: string, authorizationUrl: string) {
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
  expect(callback.searchParams.get('identity_ticket')).toMatch(/^ticket_/u)
  expect(await fetch(callback).then((response) => response.status)).toBe(200)
}

async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('Timed out waiting for enterprise service.')
}

describe('enterprise service login loop', () => {
  it.each([false, true])('reports the app version and commits login even when activation fails: %s', async (failActivation) => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const requests: Record<string, unknown>[] = []
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (String(input).endsWith('/api/dsh/authorizations')) requests.push(JSON.parse(String(init?.body)))
      return globalThis.fetch(input, init)
    }
    const activateDesktop = vi.fn(() => {
      expect(service.snapshot().phase).toBe('connected')
    expect(service.snapshot().desktopVersion).toBe('0.1.1-beta.2+build.7')
      if (failActivation) throw new Error('window unavailable')
    })
    const { service, notes } = await createService(createEnterpriseFetch(fetchImpl), {
      desktopVersion: '0.1.1-beta.2+build.7', activateDesktop
    })
    const started = await service.startLogin(origin)
    expect(requests[0]).toMatchObject({ client_version: '0.1.1-beta.2+build.7', device_name: 'DSH Desktop' })
    expect(activateDesktop).not.toHaveBeenCalled()
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => activateDesktop.mock.calls.length === 1)
    expect(service.snapshot().phase).toBe('connected')
    expect(notes).toContain('login_committed')
    expect(notes.includes('desktop_activation_failed')).toBe(failActivation)
    expect(notes).not.toContain('login_failed')
    const sessions = platform.state.sessions as Map<string, { clientVersion: string }>
    expect([...sessions.values()][0]?.clientVersion).toBe('0.1.1-beta.2+build.7')
    await service.refresh()
    expect(activateDesktop).toHaveBeenCalledTimes(1)
  })

  it('omits an unavailable version and does not activate Desktop when token exchange fails', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const requests: Record<string, unknown>[] = []
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (String(input).endsWith('/api/dsh/authorizations')) requests.push(JSON.parse(String(init?.body)))
      if (String(input).endsWith('/api/dsh/token')) {
        return Response.json({ error: { message: 'Invalid ticket', code: 'invalid_ticket' } }, { status: 401 })
      }
      return globalThis.fetch(input, init)
    }
    const activateDesktop = vi.fn()
    const { service, notes } = await createService(createEnterpriseFetch(fetchImpl), { activateDesktop })
    const started = await service.startLogin(origin)
    expect(requests[0]).not.toHaveProperty('client_version')
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => notes.includes('login_failed'))
    expect(service.snapshot().connected).toBe(false)
    expect(activateDesktop).not.toHaveBeenCalled()
  })

  it('completes PKCE login, refreshes once, and logs out without exposing tokens', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const { service, notes } = await createService()

    const started = await service.startLogin(origin)
    expect(started.authorizationUrl).toContain(origin)
    expect(service.snapshot().phase).toBe('authorizing')
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected'
        && snapshot.modelsAvailable === true
        && typeof snapshot.modelUsage?.['bisheng:42']?.used === 'number'
    })
    const connected = service.snapshot()
    expect(connected.connected).toBe(true)
    expect(connected.user?.username).toBe('alice')
    expect(connected.modelsAvailable).toBe(true)
    expect(connected.modelUsage?.['bisheng:42']?.used).toEqual(expect.any(Number))
    expect(connected.modelUsage?.['bisheng:42']?.limit).toBeGreaterThan(0)
    expect(JSON.stringify(connected)).not.toMatch(/access_token|refresh_token|identity_ticket/u)
    expect(notes).toContain('login_committed')

    const first = service.refresh()
    const second = service.refresh()
    const [a, b] = await Promise.all([first, second])
    expect(a.revision).toBe(b.revision)
    expect(a.connected).toBe(true)
    expect(notes).toContain('refresh_committed')

    const loggedOut = await service.logout()
    expect(loggedOut.connected).toBe(false)
    expect(loggedOut.phase).toBe('idle')
    expect(notes).toContain('logout_committed')
    expect(notes.join(' ')).not.toMatch(/access_token|refresh_token|identity_ticket|code_verifier|ticket_/u)
  })

  it('keeps the session when refresh hits a transient network error', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    let failRefresh = false
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (failRefresh && String(input).includes('/api/dsh/token') && String(init?.body).includes('refresh_token')) {
        throw new TypeError('fetch failed')
      }
      return globalThis.fetch(input, init)
    }
    const { service } = await createService(createEnterpriseFetch(fetchImpl))
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })
    failRefresh = true
    const degraded = await service.refresh()
    expect(degraded.phase).toBe('degraded')
    expect(degraded.connected).toBe(true)
    expect(degraded.base).toBe(origin)
  })

  it('clears the session for an invalid refresh token', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    let rejectRefresh = false
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (rejectRefresh && String(input).includes('/api/dsh/token') && String(init?.body).includes('refresh_token')) {
        return new Response(JSON.stringify({
          error: { message: 'Refresh token is invalid.', type: 'authentication_error', code: 'invalid_refresh_token' }
        }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        })
      }
      return globalThis.fetch(input, init)
    }
    const { service } = await createService(createEnterpriseFetch(fetchImpl))
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })
    rejectRefresh = true
    const cleared = await service.refresh()
    expect(cleared.connected).toBe(false)
    expect(cleared.phase).toBe('idle')
    expect(cleared.models).toEqual([])
  })

  it('publishes platform error codes on login failure', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (String(input).includes('/api/dsh/token') && String(init?.body).includes('identity_ticket')) {
        return new Response(JSON.stringify({
          error: { message: 'seat revoked', code: 'seat_revoked' },
          request_id: 'req-seat-1'
        }), {
          status: 403,
          headers: { 'content-type': 'application/json', 'x-request-id': 'req-seat-1' }
        })
      }
      return globalThis.fetch(input, init)
    }
    const { service } = await createService(createEnterpriseFetch(fetchImpl))
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'idle' && snapshot.error === 'seat revoked'
    })
    expect(service.snapshot()).toMatchObject({
      error: 'seat revoked',
      errorCode: 'seat_revoked',
      requestId: 'req-seat-1'
    })
  })

  it('still logs out locally when remote revoke fails', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      if (String(input).includes('/api/dsh/logout')) {
        return new Response(JSON.stringify({
          error: { message: 'upstream unavailable', code: 'server_error' }
        }), { status: 503, headers: { 'content-type': 'application/json' } })
      }
      return globalThis.fetch(input, init)
    }
    const { service, notes } = await createService(createEnterpriseFetch(fetchImpl))
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected' && snapshot.modelsAvailable === true
    })
    const loggedOut = await service.logout()
    expect(loggedOut.phase).toBe('idle')
    expect(loggedOut.connected).toBe(false)
    expect(notes).toContain('logout_remote_failed')
    expect(notes).toContain('logout_committed')
  })

  it('inspects intranet HTTP but refuses to start login without confirmation', async () => {
    const { service } = await createService()
    await expect(service.inspectBase('http://192.168.106.119:30006')).resolves.toEqual({
      base: 'http://192.168.106.119:30006',
      insecurePrivateHttp: true
    })
    await expect(service.startLogin('http://192.168.106.119:30006')).rejects.toMatchObject({
      message: 'HTTP intranet addresses require explicit confirmation.',
      status: 400
    })
  })

  it('keeps refreshing until per-model usage finishes after login', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())

    let releaseModels: (() => void) | undefined
    let releaseUsage: (() => void) | undefined
    const modelsGate = new Promise<void>((resolve) => {
      releaseModels = resolve
    })
    const usageGate = new Promise<void>((resolve) => {
      releaseUsage = resolve
    })
    const fetchImpl: EnterpriseFetch = async (input, init) => {
      const url = String(input)
      if (url.includes('/api/v1/dsh/models')) await modelsGate
      if (url.includes('/api/v1/dsh/usage')) await usageGate
      return globalThis.fetch(input, init)
    }
    const { service } = await createService(createEnterpriseFetch(fetchImpl))

    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)

    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'refreshing' && snapshot.modelsAvailable !== true
    })
    const revisionBeforeModels = service.snapshot().revision

    releaseModels!()
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.modelsAvailable === true && snapshot.models.length > 0
    })
    const midCatalog = service.snapshot()
    expect(midCatalog.phase).toBe('refreshing')
    expect(midCatalog.connected).toBe(true)
    expect(midCatalog.modelUsage).toBeUndefined()
    expect(midCatalog.revision).toBeGreaterThan(revisionBeforeModels)

    releaseUsage!()
    await waitFor(() => {
      const snapshot = service.snapshot()
      return snapshot.phase === 'connected'
        && typeof snapshot.modelUsage?.['bisheng:42']?.used === 'number'
    })
    const connected = service.snapshot()
    expect(connected.phase).toBe('connected')
    expect(connected.modelUsage?.['bisheng:42']?.used).toEqual(expect.any(Number))
    expect(connected.modelUsage?.['bisheng:42']?.limit).toBeGreaterThan(0)
  })

  it('completes login from a pasted one-time code without the loopback callback', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const { service } = await createService()

    const started = await service.startLogin(origin)
    expect(service.snapshot().loginExpiresAt).toBeTruthy()
    await expect(service.submitManualTicket('')).rejects.toMatchObject({ status: 400 })

    const authId = new URL(started.authorizationUrl).searchParams.get('auth_id')
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
    const ticket = new URL(JSON.parse(callbackLiteral!)).searchParams.get('identity_ticket')
    expect(ticket).toMatch(/^ticket_/u)

    const connected = await service.submitManualTicket(ticket!)
    expect(connected.connected).toBe(true)
    expect(connected.phase).toBe('connected')
    expect(connected.user?.username).toBe('alice')
    expect(connected.modelsAvailable).toBe(true)
    expect(connected.modelUsage?.['bisheng:42']?.used).toEqual(expect.any(Number))
    expect(connected.modelUsage?.['bisheng:42']?.limit).toBeGreaterThan(0)
    expect(connected.loginExpiresAt).toBeUndefined()
    expect(JSON.stringify(connected)).not.toMatch(/access_token|refresh_token|identity_ticket|ticket_/u)
  })
})

describe('enterprise market credential boundary', () => {
  it('serves catalog and artifact through the broker with refreshed host credentials and rejects stale account requests', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    cleanups.push(async () => platform.close())
    const requests: Array<{ path: string, authorization: string | null, body?: unknown }> = []
    let rejectFirst = true
    const { service } = await createService(async (url, init) => {
      const path = new URL(url).pathname
      if (path.startsWith('/api/v1/dsh/market/')) {
        requests.push({ path, authorization: new Headers(init?.headers).get('authorization'), body: init?.body && JSON.parse(String(init.body)) })
        if (rejectFirst) { rejectFirst = false; return new Response('', { status: 401 }) }
        return path.endsWith('/artifact') ? new Response(new Uint8Array([80, 75, 3, 4]))
          : Response.json({ status_code: 200, data: { total: 1 } })
      }
      return fetch(url, init)
    })
    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => service.snapshot().modelsAvailable)
    const { startEnterpriseCredentialBroker } = await import('../src/main/enterprise/credential-broker')
    const broker = await startEnterpriseCredentialBroker(service, { allowInsecureLoopback: true })
    cleanups.push(async () => broker.stop())
    const connectionKey = service.snapshot().connectionKey
    const call = (body: unknown) => fetch(`${broker.url}/v1/market`, { method: 'POST',
      headers: { authorization: `Bearer ${broker.capability}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const catalog = await call({ path: '/api/v1/dsh/market/catalog?page=1&size=100', connectionKey })
    expect(catalog.status).toBe(200)
    expect(await catalog.json()).toEqual({ status_code: 200, data: { total: 1 } })
    expect(requests).toHaveLength(2)
    expect(requests[0]!.authorization).toMatch(/^Bearer /)
    expect(requests[1]!.authorization).not.toBe(requests[0]!.authorization)
    const artifact = await call({ path: `/api/v1/dsh/market/plugins/${'a'.repeat(32)}/versions/${'b'.repeat(32)}/artifact`, connectionKey })
    expect(artifact.status).toBe(200)
    expect([...new Uint8Array(await artifact.arrayBuffer())]).toEqual([80, 75, 3, 4])
    const syncBody = { device_id: 'test-device', plugins: [] }
    expect((await call({ path: '/api/v1/dsh/market/sync', connectionKey, body: syncBody })).status).toBe(200)
    expect(requests.at(-1)?.body).toEqual(syncBody)
    const before = requests.length
    for (const path of ['https://other.example/api/v1/dsh/market/catalog', '/api/v1/dsh/market/admin/plugins', '/api/v1/dsh/market/catalog?token=secret', '/api/v1/dsh/market/sync']) {
      expect((await call({ path, connectionKey })).status).toBe(400)
    }
    expect(requests).toHaveLength(before)
    await service.logout()
    expect((await call({ path: '/api/v1/dsh/market/catalog', connectionKey })).status).toBe(409)
    expect(requests).toHaveLength(before)
  })
})
