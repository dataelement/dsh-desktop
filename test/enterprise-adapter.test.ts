import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { apply as applyEnterprise } from '../packages/dsh-desktop-enterprise/index.js'
import { startEnterpriseCredentialBroker } from '../src/main/enterprise/credential-broker'
import { createEnterpriseFetch } from '../src/main/enterprise/platform-fetch'
import { EnterpriseService } from '../src/main/enterprise/enterprise-service'
import { createMockEnterpriseServer } from '../scripts/mock-bisheng-enterprise.mjs'
import {
  ENTERPRISE_VAULT_FILENAME,
  type SafeStorageCryptoAdapter,
  SecureEnterpriseCredentialVault
} from '../src/main/enterprise/secure-credential-vault'

type RegisteredRoute = {
  path: string
  methods: string[]
  requestBody?: string
  fetch: (request: Request) => Promise<Response>
}

function createPluginContext(llm?: { registerAdapter: (...args: never[]) => unknown }) {
  const routes: RegisteredRoute[] = []
  applyEnterprise({
    effect(callback: () => (() => unknown) | undefined) {
      const dispose = callback()
      if (dispose) adapterCleanups.push(async () => { await dispose() })
    },
    connection: {
      fetch: {
        register(route: RegisteredRoute) {
          routes.push(route)
          return () => undefined
        }
      }
    },
    ...(llm ? { llm } : {})
  } as never)
  return routes
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
  expect(await fetch(callback).then((response) => response.status)).toBe(200)
}

async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('Timed out waiting for enterprise adapter.')
}

async function invoke(routes: RegisteredRoute[], path: string, method = 'GET', body?: unknown) {
  const route = routes.find((entry) => entry.path === path)
  expect(route).toBeDefined()
  const request = new Request(`http://127.0.0.1${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  return route!.fetch(request)
}

const adapterCleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  delete process.env.DSH_DESKTOP_ENTERPRISE_BROKER_URL
  delete process.env.DSH_DESKTOP_ENTERPRISE_BROKER_CAPABILITY
  delete process.env.DSH_DESKTOP_ENTERPRISE_ALLOW_INSECURE_LOOPBACK
  while (adapterCleanups.length > 0) await adapterCleanups.pop()?.()
})

function memorySafeStorage(): SafeStorageCryptoAdapter {
  return {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => 'keychain',
    encryptString: (plainText) => Buffer.from(plainText, 'utf8'),
    decryptString: (encrypted) => Buffer.from(encrypted as Buffer).toString('utf8')
  }
}

describe('enterprise adapter without a Broker', () => {
  it('loads and reports a local disabled state', async () => {
    const routes = createPluginContext()
    const response = await invoke(routes, '/api/enterprise.state')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      connected: false,
      secureStorageAvailable: false,
      phase: 'disabled',
      revision: 0,
      models: [],
      modelsAvailable: false
    })
  })

  it('inspects a deep link locally and rejects login until the Broker exists', async () => {
    const routes = createPluginContext()
    const inspected = await invoke(routes, '/api/enterprise.deep-link.inspect', 'POST', {
      url: 'dsh-desktop://login?server=https%3A%2F%2Fbisheng.example.com'
    })
    expect(inspected.status).toBe(200)
    await expect(inspected.json()).resolves.toEqual({ base: 'https://bisheng.example.com' })

    const inspectedBase = await invoke(routes, '/api/enterprise.base.inspect', 'POST', {
      base: 'https://bisheng.example.com'
    })
    expect(inspectedBase.status).toBe(200)
    await expect(inspectedBase.json()).resolves.toEqual({ base: 'https://bisheng.example.com' })

    const inspectedPrivate = await invoke(routes, '/api/enterprise.base.inspect', 'POST', {
      base: 'http://192.168.106.119:30006'
    })
    expect(inspectedPrivate.status).toBe(200)
    await expect(inspectedPrivate.json()).resolves.toEqual({
      base: 'http://192.168.106.119:30006',
      insecurePrivateHttp: true
    })

    const started = await invoke(routes, '/api/enterprise.login.start', 'POST', {
      base: 'https://bisheng.example.com'
    })
    expect(started.status).toBe(503)
    await expect(started.json()).resolves.toMatchObject({
      ok: false,
      error: 'Enterprise login is not available yet.'
    })
  })
})

describe('enterprise adapter with a Broker', () => {
  it('reads the restricted Broker state instead of a local fallback', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-adapter-'))
    const vault = new SecureEnterpriseCredentialVault(join(directory, ENTERPRISE_VAULT_FILENAME), memorySafeStorage())
    const service = new EnterpriseService({
      vault,
      fetchImpl: createEnterpriseFetch(globalThis.fetch),
      allowInsecureLoopback: true
    })
    const broker = await startEnterpriseCredentialBroker(service, { allowInsecureLoopback: true })
    adapterCleanups.push(async () => {
      await broker.stop()
      await service.stop()
    })
    process.env.DSH_DESKTOP_ENTERPRISE_BROKER_URL = broker.url
    process.env.DSH_DESKTOP_ENTERPRISE_BROKER_CAPABILITY = broker.capability
    process.env.DSH_DESKTOP_ENTERPRISE_ALLOW_INSECURE_LOOPBACK = '1'

    const routes = createPluginContext()
    const response = await invoke(routes, '/api/enterprise.state')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      connected: false,
      secureStorageAvailable: true,
      phase: 'idle',
      models: [],
      modelsAvailable: false
    })
  })

  it('registers enterprise models when settings reads a published catalog', async () => {
    const platform = createMockEnterpriseServer({ port: 0 })
    const origin = await platform.listen()
    adapterCleanups.push(async () => platform.close())

    const directory = await mkdtemp(join(tmpdir(), 'enterprise-adapter-'))
    const vault = new SecureEnterpriseCredentialVault(join(directory, ENTERPRISE_VAULT_FILENAME), memorySafeStorage())
    const service = new EnterpriseService({
      vault,
      fetchImpl: createEnterpriseFetch(globalThis.fetch),
      allowInsecureLoopback: true
    })
    await service.restore()
    const broker = await startEnterpriseCredentialBroker(service, { allowInsecureLoopback: true })
    adapterCleanups.push(async () => {
      await broker.stop()
      await service.stop()
    })
    process.env.DSH_DESKTOP_ENTERPRISE_BROKER_URL = broker.url
    process.env.DSH_DESKTOP_ENTERPRISE_BROKER_CAPABILITY = broker.capability
    process.env.DSH_DESKTOP_ENTERPRISE_ALLOW_INSECURE_LOOPBACK = '1'

    const registered: string[][] = []
    const routes = createPluginContext({
      registerAdapter(providers: string[]) {
        registered.push(providers)
        return Object.assign(() => undefined, { replace: () => undefined })
      }
    } as never)

    const started = await service.startLogin(origin)
    await completeBrowserLogin(origin, started.authorizationUrl)
    await waitFor(() => service.snapshot().modelsAvailable === true && service.snapshot().models.length > 0)

    const response = await invoke(routes, '/api/enterprise.state')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      modelsAvailable: true,
      phase: expect.stringMatching(/refreshing|connected/)
    })
    expect(registered).toContainEqual(['bisheng-enterprise'])
  })
})

describe('enterprise chat failure copy', () => {
  async function loadFormatEnterpriseChatFailure() {
    const source = await readFile(join(import.meta.dirname, '../packages/dsh-desktop-enterprise/openai.js'), 'utf8')
    const start = source.indexOf('const LOCAL_CHAT_FAILURES')
    const end = source.indexOf('\nfunction requestFailure')
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    return new Function(`${source.slice(start, end)}; return formatEnterpriseChatFailure`)() as (
      status: number,
      payload: unknown,
      language: string
    ) => string
  }

  it('localizes the generic status fallback and known local 409 reasons', async () => {
    const formatEnterpriseChatFailure = await loadFormatEnterpriseChatFailure()
    expect(formatEnterpriseChatFailure(409, {}, 'zh-CN')).toBe('毕昇模型请求失败（409）。')
    expect(formatEnterpriseChatFailure(409, {}, 'en-US')).toBe('BiSheng model request failed (409).')
    expect(formatEnterpriseChatFailure(409, { error: 'Enterprise models are unavailable.' }, 'zh-CN'))
      .toBe('企业模型暂不可用。')
    expect(formatEnterpriseChatFailure(409, { error: 'Enterprise session changed.' }, 'en-US'))
      .toBe('Enterprise session changed.')
  })

  it('keeps an upstream Chinese message instead of replacing it', async () => {
    const formatEnterpriseChatFailure = await loadFormatEnterpriseChatFailure()
    expect(formatEnterpriseChatFailure(429, {
      error: { message: '账户额度不足，请联系服务商咨询用量限制。', code: 'monthly_token_limit_exceeded' }
    }, 'en-US')).toBe('账户额度不足，请联系服务商咨询用量限制。')
  })
})
