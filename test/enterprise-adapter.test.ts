import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { apply as applyEnterprise } from '../packages/dsh-desktop-enterprise/index.js'
import { startEnterpriseCredentialBroker } from '../src/main/enterprise/credential-broker'
import { createEnterpriseFetch } from '../src/main/enterprise/platform-fetch'
import { EnterpriseService } from '../src/main/enterprise/enterprise-service'
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

function createPluginContext() {
  const routes: RegisteredRoute[] = []
  applyEnterprise({
    connection: {
      fetch: {
        register(route: RegisteredRoute) {
          routes.push(route)
          return () => undefined
        }
      }
    }
  } as never)
  return routes
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
})
