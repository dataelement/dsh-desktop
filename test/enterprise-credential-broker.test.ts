import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnterpriseCredentialBroker } from '../src/main/enterprise/credential-broker'
import {
  SecureEnterpriseCredentialVault,
  type EnterpriseCredentialSession,
  type SafeStorageAdapter
} from '../src/main/enterprise/secure-credential-vault'

const directories: string[] = []

afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

const safeStorage: SafeStorageAdapter = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(value, 'utf8').reverse(),
  decryptString: (value) => Buffer.from(value).reverse().toString('utf8')
}

const session: EnterpriseCredentialSession = {
  base: 'https://bisheng.example.com', token_type: 'Bearer',
  access_token: 'secret-access-token', access_expires_at: '2026-09-09T10:05:00.000Z',
  refresh_token: 'secret-refresh-token', refresh_expires_at: '2026-10-09T10:00:00.000Z',
  session_id: 'session-1', session_expires_at: '2026-10-09T10:00:00.000Z',
  user: { id: 'user-1', username: 'alice', display_name: 'Alice' },
  tenant: { id: 'tenant-1', name: 'Demo' }
}

describe('enterprise secure credential broker', () => {
  it('encrypts the vault, enforces bearer access, CAS replacement, and local clear', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-enterprise-vault-'))
    directories.push(directory)
    const filename = join(directory, 'credentials.v1')
    const vault = new SecureEnterpriseCredentialVault(filename, safeStorage)
    const activateDesktop = vi.fn()
    const broker = new EnterpriseCredentialBroker(vault, { activateDesktop })
    const environment = await broker.start()
    const endpoint = `${environment.DSH_DESKTOP_ENTERPRISE_BROKER_URL}/v1/session`
    const headers = {
      authorization: `Bearer ${environment.DSH_DESKTOP_ENTERPRISE_BROKER_TOKEN}`,
      'content-type': 'application/json'
    }
    try {
      expect((await fetch(endpoint)).status).toBe(401)
      const write = await fetch(endpoint, {
        method: 'PUT', headers,
        body: JSON.stringify({ expected_generation: 0, session })
      })
      expect(await write.json()).toMatchObject({ generation: 1, session: { session_id: 'session-1' } })
      const bytes = await readFile(filename)
      expect(bytes.toString('utf8')).not.toContain('secret-access-token')

      const read = await fetch(endpoint, { headers })
      expect(await read.json()).toMatchObject({ generation: 1, session: { refresh_token: 'secret-refresh-token' } })
      const activationEndpoint = `${environment.DSH_DESKTOP_ENTERPRISE_BROKER_URL}/v1/activate`
      expect((await fetch(activationEndpoint, { method: 'POST' })).status).toBe(401)
      expect((await fetch(activationEndpoint, { headers })).status).toBe(405)
      expect(await (await fetch(activationEndpoint, { method: 'POST', headers })).json()).toEqual({ ok: true })
      expect(activateDesktop).toHaveBeenCalledTimes(1)
      expect((await fetch(endpoint, {
        method: 'PUT', headers,
        body: JSON.stringify({ expected_generation: 0, session })
      })).status).toBe(409)
      expect(await (await fetch(endpoint, { method: 'DELETE', headers })).json()).toEqual({ generation: 2, session: null })
    } finally {
      await broker.stop()
    }
  })

  it('fails closed when operating-system encryption is unavailable', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-enterprise-vault-'))
    directories.push(directory)
    const vault = new SecureEnterpriseCredentialVault(join(directory, 'credentials.v1'), {
      ...safeStorage,
      isEncryptionAvailable: () => false
    })
    await expect(vault.read()).rejects.toMatchObject({ code: 'SECURE_STORAGE_UNAVAILABLE' })
  })
})
