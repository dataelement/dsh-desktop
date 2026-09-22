import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { inspectSecureStorage, type SafeStorageAdapter } from './secure-storage'

export const ENTERPRISE_VAULT_VERSION = 2
export const ENTERPRISE_VAULT_FILENAME = 'enterprise-credentials.v2'

export interface EnterpriseIdentity {
  id?: string
  username?: string
  display_name?: string
  name?: string
}

export interface EnterpriseCredentialSession {
  base?: string
  token_type?: string
  access_token?: string
  access_expires_at?: string
  refresh_token?: string
  refresh_expires_at?: string
  session_id?: string
  session_expires_at?: string
  user?: EnterpriseIdentity
  tenant?: EnterpriseIdentity
}

interface VaultDocument {
  version: typeof ENTERPRISE_VAULT_VERSION
  generation: number
  session?: EnterpriseCredentialSession
}

export interface EnterpriseVaultSnapshot {
  generation: number
  session: EnterpriseCredentialSession | null
}

export class EnterpriseVaultError extends Error {
  constructor(
    message: string,
    readonly code: 'unavailable' | 'corrupt' | 'stale'
  ) {
    super(message)
    this.name = 'EnterpriseVaultError'
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function parseIdentity(value: unknown): EnterpriseIdentity | undefined {
  if (!isPlainObject(value)) return undefined
  return {
    ...(optionalString(value.id) ? { id: value.id as string } : {}),
    ...(optionalString(value.username) ? { username: value.username as string } : {}),
    ...(optionalString(value.display_name) ? { display_name: value.display_name as string } : {}),
    ...(optionalString(value.name) ? { name: value.name as string } : {})
  }
}

function hasSecureSessionFields(session: EnterpriseCredentialSession): boolean {
  return Boolean(
    session.base &&
    session.access_token &&
    session.refresh_token &&
    session.access_expires_at &&
    session.refresh_expires_at &&
    Number.isFinite(Date.parse(session.access_expires_at)) &&
    Number.isFinite(Date.parse(session.refresh_expires_at))
  )
}

function parseSession(value: unknown): EnterpriseCredentialSession | undefined {
  if (!isPlainObject(value)) return undefined
  const session: EnterpriseCredentialSession = {
    base: optionalString(value.base),
    token_type: optionalString(value.token_type),
    access_token: optionalString(value.access_token),
    access_expires_at: optionalString(value.access_expires_at),
    refresh_token: optionalString(value.refresh_token),
    refresh_expires_at: optionalString(value.refresh_expires_at),
    session_id: optionalString(value.session_id),
    session_expires_at: optionalString(value.session_expires_at),
    user: parseIdentity(value.user),
    tenant: parseIdentity(value.tenant)
  }
  if (!hasSecureSessionFields(session)) return undefined
  return session
}

function parseDocument(value: unknown): VaultDocument {
  if (!isPlainObject(value)) {
    throw new EnterpriseVaultError('Enterprise credential vault is not valid JSON.', 'corrupt')
  }
  if (value.version !== ENTERPRISE_VAULT_VERSION) {
    throw new EnterpriseVaultError('Enterprise credential vault has an unknown version.', 'corrupt')
  }
  if (!Number.isSafeInteger(value.generation) || Number(value.generation) < 0) {
    throw new EnterpriseVaultError('Enterprise credential vault has an invalid generation.', 'corrupt')
  }
  return {
    version: ENTERPRISE_VAULT_VERSION,
    generation: Number(value.generation),
    ...(value.session === undefined ? {} : { session: parseSession(value.session) })
  }
}

export interface SafeStorageCryptoAdapter extends SafeStorageAdapter {
  encryptString(plainText: string): Buffer
  decryptString(encrypted: NodeJS.ArrayBufferView): string
}

export class SecureEnterpriseCredentialVault {
  private queue: Promise<unknown> = Promise.resolve()
  readonly available: boolean
  readonly unavailableReason?: string

  constructor(
    private readonly filename: string,
    private readonly safeStorage: SafeStorageCryptoAdapter
  ) {
    const inspection = inspectSecureStorage(safeStorage)
    this.available = inspection.available
    this.unavailableReason = inspection.reason
  }

  async read(): Promise<EnterpriseVaultSnapshot> {
    return this.enqueue(async () => this.snapshot(await this.readDocument()))
  }

  async replace(
    expectedGeneration: number,
    session: EnterpriseCredentialSession
  ): Promise<EnterpriseVaultSnapshot> {
    return this.enqueue(async () => {
      this.ensureAvailable()
      const current = await this.readDocument()
      if (current.generation !== expectedGeneration) {
        throw new EnterpriseVaultError('Enterprise credential vault generation is stale.', 'stale')
      }
      const checked = parseSession(session)
      if (!checked) {
        throw new EnterpriseVaultError('Enterprise session is missing required security fields.', 'corrupt')
      }
      const next: VaultDocument = {
        version: ENTERPRISE_VAULT_VERSION,
        generation: current.generation + 1,
        session: structuredClone(checked)
      }
      await this.writeDocument(next)
      return this.snapshot(next)
    })
  }

  async clear(): Promise<EnterpriseVaultSnapshot> {
    return this.enqueue(async () => {
      this.ensureAvailable()
      const current = await this.readDocument()
      const next: VaultDocument = {
        version: ENTERPRISE_VAULT_VERSION,
        generation: current.generation + 1
      }
      await this.writeDocument(next)
      return this.snapshot(next)
    })
  }

  private snapshot(document: VaultDocument): EnterpriseVaultSnapshot {
    return {
      generation: document.generation,
      session: document.session ? structuredClone(document.session) : null
    }
  }

  private ensureAvailable(): void {
    if (!this.available) {
      throw new EnterpriseVaultError(
        this.unavailableReason ?? 'Operating-system secure storage is unavailable.',
        'unavailable'
      )
    }
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work, work)
    this.queue = next.then(() => undefined, () => undefined)
    return next
  }

  private async readDocument(): Promise<VaultDocument> {
    this.ensureAvailable()
    let encrypted: Buffer
    try {
      encrypted = await readFile(this.filename)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: ENTERPRISE_VAULT_VERSION, generation: 0 }
      }
      throw error
    }
    let text: string
    try {
      text = this.safeStorage.decryptString(encrypted)
    } catch {
      await this.quarantine('decrypt')
      throw new EnterpriseVaultError('Enterprise credential vault could not be decrypted.', 'corrupt')
    }
    try {
      return parseDocument(JSON.parse(text) as unknown)
    } catch (error) {
      if (error instanceof EnterpriseVaultError) {
        await this.quarantine(error.code)
        throw error
      }
      await this.quarantine('json')
      throw new EnterpriseVaultError('Enterprise credential vault is not valid JSON.', 'corrupt')
    }
  }

  private async writeDocument(document: VaultDocument): Promise<void> {
    this.ensureAvailable()
    const encrypted = this.safeStorage.encryptString(JSON.stringify(document))
    await mkdir(dirname(this.filename), { recursive: true, mode: 0o700 })
    const temporary = `${this.filename}.${process.pid}.${Date.now()}.tmp`
    try {
      await writeFile(temporary, encrypted, { mode: 0o600 })
      await rename(temporary, this.filename)
    } catch (error) {
      await unlink(temporary).catch(() => undefined)
      throw error
    }
  }

  private async quarantine(reason: string): Promise<void> {
    const isolated = `${this.filename}.corrupt.${Date.now()}.${reason}`
    try {
      await rename(this.filename, isolated)
    } catch {
      // Leave the original file in place if isolation fails; callers still enter error.
    }
  }
}
