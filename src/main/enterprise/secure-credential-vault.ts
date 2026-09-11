import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface SafeStorageAdapter {
  isEncryptionAvailable(): boolean
  encryptString(value: string): Buffer
  decryptString(value: Buffer): string
}

export interface EnterpriseIdentity {
  id: string
  username: string
  display_name: string
}

export interface EnterpriseTenant {
  id: string
  name: string
}

export interface EnterpriseCredentialSession {
  base: string
  token_type: 'Bearer'
  access_token: string
  access_expires_at: string
  refresh_token: string
  refresh_expires_at: string
  session_id: string
  session_expires_at: string
  user: EnterpriseIdentity
  tenant: EnterpriseTenant
}

interface VaultDocument {
  version: 1
  generation: number
  activeKey?: string
  records: Record<string, EnterpriseCredentialSession>
}

export interface EnterpriseVaultSnapshot {
  generation: number
  session: EnterpriseCredentialSession | null
}

function emptyDocument(): VaultDocument {
  return { version: 1, generation: 0, records: {} }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Enterprise credential vault has an invalid ${field}.`)
  }
  return value
}

function parseSession(value: unknown): EnterpriseCredentialSession {
  if (!isPlainObject(value)) throw new Error('Enterprise credential vault has an invalid session.')
  const user = value.user
  const tenant = value.tenant
  if (!isPlainObject(user) || !isPlainObject(tenant)) {
    throw new Error('Enterprise credential vault has invalid identity metadata.')
  }
  const tokenType = requiredString(value.token_type, 'token type')
  if (tokenType !== 'Bearer') throw new Error('Enterprise credential vault has an unsupported token type.')
  return {
    base: requiredString(value.base, 'platform origin'),
    token_type: 'Bearer',
    access_token: requiredString(value.access_token, 'access token'),
    access_expires_at: requiredString(value.access_expires_at, 'access expiry'),
    refresh_token: requiredString(value.refresh_token, 'refresh token'),
    refresh_expires_at: requiredString(value.refresh_expires_at, 'refresh expiry'),
    session_id: requiredString(value.session_id, 'session id'),
    session_expires_at: requiredString(value.session_expires_at, 'session expiry'),
    user: {
      id: requiredString(user.id, 'user id'),
      username: requiredString(user.username, 'username'),
      display_name: requiredString(user.display_name, 'display name')
    },
    tenant: {
      id: requiredString(tenant.id, 'tenant id'),
      name: requiredString(tenant.name, 'tenant name')
    }
  }
}

function sessionKey(session: EnterpriseCredentialSession): string {
  return [session.base, session.tenant.id, session.user.id, session.session_id]
    .map((part) => encodeURIComponent(part))
    .join('|')
}

function parseDocument(value: unknown): VaultDocument {
  if (!isPlainObject(value) || value.version !== 1) {
    throw new Error('Enterprise credential vault has an unsupported format.')
  }
  if (!Number.isSafeInteger(value.generation) || Number(value.generation) < 0) {
    throw new Error('Enterprise credential vault has an invalid generation.')
  }
  if (!isPlainObject(value.records)) {
    throw new Error('Enterprise credential vault has invalid records.')
  }
  const records = Object.fromEntries(
    Object.entries(value.records).map(([key, session]) => [key, parseSession(session)])
  )
  const activeKey = value.activeKey
  if (activeKey !== undefined && (typeof activeKey !== 'string' || records[activeKey] === undefined)) {
    throw new Error('Enterprise credential vault has an invalid active session.')
  }
  return {
    version: 1,
    generation: Number(value.generation),
    records,
    ...(activeKey === undefined ? {} : { activeKey })
  }
}

export class SecureEnterpriseCredentialVault {
  private operations: Promise<void> = Promise.resolve()

  constructor(
    private readonly filename: string,
    private readonly safeStorage: SafeStorageAdapter
  ) {}

  available(): boolean {
    return this.safeStorage.isEncryptionAvailable()
  }

  async read(): Promise<EnterpriseVaultSnapshot> {
    return this.enqueue(async () => this.snapshot(await this.readDocument()))
  }

  async replace(
    expectedGeneration: number,
    session: EnterpriseCredentialSession
  ): Promise<EnterpriseVaultSnapshot> {
    return this.enqueue(async () => {
      const current = await this.readDocument()
      if (current.generation !== expectedGeneration) {
        throw Object.assign(new Error('Enterprise credential session changed during the operation.'), {
          code: 'VAULT_CONFLICT'
        })
      }
      const checked = parseSession(session)
      const key = sessionKey(checked)
      const next: VaultDocument = {
        version: 1,
        generation: current.generation + 1,
        activeKey: key,
        records: { [key]: structuredClone(checked) }
      }
      await this.writeDocument(next)
      return this.snapshot(next)
    })
  }

  async clear(): Promise<EnterpriseVaultSnapshot> {
    return this.enqueue(async () => {
      const current = await this.readDocument()
      const next: VaultDocument = {
        version: 1,
        generation: current.generation + 1,
        records: {}
      }
      await this.writeDocument(next)
      return this.snapshot(next)
    })
  }

  private snapshot(document: VaultDocument): EnterpriseVaultSnapshot {
    return {
      generation: document.generation,
      session: document.activeKey ? structuredClone(document.records[document.activeKey] ?? null) : null
    }
  }

  private ensureAvailable(): void {
    if (!this.available()) {
      throw Object.assign(new Error('Operating-system secure storage is unavailable.'), {
        code: 'SECURE_STORAGE_UNAVAILABLE'
      })
    }
  }

  private async readDocument(): Promise<VaultDocument> {
    this.ensureAvailable()
    let encrypted: Buffer
    try {
      encrypted = await readFile(this.filename)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyDocument()
      throw error
    }
    const plaintext = this.safeStorage.decryptString(encrypted)
    return parseDocument(JSON.parse(plaintext))
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

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.operations.then(operation)
    this.operations = task.then(() => undefined, () => undefined)
    return task
  }
}
