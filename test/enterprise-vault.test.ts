import { mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ENTERPRISE_VAULT_FILENAME,
  EnterpriseVaultError,
  SecureEnterpriseCredentialVault,
  type SafeStorageCryptoAdapter
} from '../src/main/enterprise/secure-credential-vault'

function memorySafeStorage(): SafeStorageCryptoAdapter {
  return {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => 'keychain',
    encryptString: (plainText) => Buffer.from(plainText, 'utf8'),
    decryptString: (encrypted) => Buffer.from(encrypted as Buffer).toString('utf8')
  }
}

const validSession = {
  base: 'https://bisheng.example.com',
  token_type: 'Bearer',
  access_token: 'access-1',
  access_expires_at: new Date(Date.now() + 60_000).toISOString(),
  refresh_token: 'refresh-1',
  refresh_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  session_id: 'session-1',
  user: { display_name: 'Alice' }
}

describe('enterprise v2 vault', () => {
  it('writes a single session and clears it on logout', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-vault-'))
    const filename = join(directory, ENTERPRISE_VAULT_FILENAME)
    const vault = new SecureEnterpriseCredentialVault(filename, memorySafeStorage())
    const written = await vault.replace(0, validSession)
    expect(written.generation).toBe(1)
    expect(written.session?.access_token).toBe('access-1')
    const cleared = await vault.clear()
    expect(cleared.session).toBeNull()
    expect(cleared.generation).toBe(2)
    if (process.platform !== 'win32') {
      expect((await stat(filename)).mode & 0o777).toBe(0o600)
    }
  })

  it('voids sessions that are missing security fields without networking', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-vault-'))
    const filename = join(directory, ENTERPRISE_VAULT_FILENAME)
    const storage = memorySafeStorage()
    await writeFile(filename, storage.encryptString(JSON.stringify({
      version: 2,
      generation: 4,
      session: { display_name: 'broken' }
    })), { mode: 0o600 })
    const vault = new SecureEnterpriseCredentialVault(filename, storage)
    await expect(vault.read()).resolves.toEqual({ generation: 4, session: null })
  })

  it('quarantines a corrupt file instead of overwriting it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-vault-'))
    const filename = join(directory, ENTERPRISE_VAULT_FILENAME)
    const storage = memorySafeStorage()
    await writeFile(filename, storage.encryptString('{not-json'), { mode: 0o600 })
    const vault = new SecureEnterpriseCredentialVault(filename, storage)
    await expect(vault.read()).rejects.toBeInstanceOf(EnterpriseVaultError)
    const names = await readdir(directory)
    expect(names.some((name) => name.includes('.corrupt.'))).toBe(true)
    await expect(readFile(filename)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not read unpublished v1 vault files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-vault-'))
    const storage = memorySafeStorage()
    await writeFile(join(directory, 'enterprise-credentials.v1'), storage.encryptString(JSON.stringify({
      version: 1,
      generation: 1,
      activeKey: 'x',
      records: { x: validSession }
    })), { mode: 0o600 })
    const vault = new SecureEnterpriseCredentialVault(
      join(directory, ENTERPRISE_VAULT_FILENAME),
      storage
    )
    await expect(vault.read()).resolves.toEqual({ generation: 0, session: null })
  })
})
