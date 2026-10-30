import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { isVersion } from '../desktop-service/service'
import { compareVersions } from './version-catalog'

export interface RollbackRecord {
  schema: 1
  previousVersion: string
  upgradedVersion: string
  platform: string
  arch: string
  phase: 'upgrade-pending' | 'ready' | 'downloading' | 'installing' | 'failed' | 'complete'
  message?: string
}

export interface ApplicationRollbackStatus {
  available: boolean
  targetVersion?: string
  reason?: string
}

/** App installation history only. This never restores or rewrites Profile data. */
export class ApplicationRollback {
  private record?: RollbackRecord
  private loaded = false
  private initialization?: Promise<void>
  constructor(private readonly file: string, private readonly environment: {
    version: string
    platform: string
    arch: string
    packaged: boolean
  }) {}

  async initialize(): Promise<void> {
    if (this.initialization) return this.initialization
    if (this.loaded) return
    this.initialization = this.load()
    try { await this.initialization } finally { this.initialization = undefined }
  }

  private async load(): Promise<void> {
    try {
      const value: unknown = JSON.parse(await readFile(this.file, 'utf8'))
      if (!validRecord(value)) throw new Error('Invalid application rollback history')
      this.record = value
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    }
    this.loaded = true
    const record = this.record
    if (!record) return
    if (record.phase === 'upgrade-pending' && this.environment.version === record.upgradedVersion) {
      await this.save({ ...record, phase: 'ready' })
    } else if (record.phase === 'installing' && this.environment.version === record.previousVersion) {
      await this.save({ ...record, phase: 'complete' })
    } else if (record.phase === 'downloading' || record.phase === 'installing') {
      await this.save({ ...record, phase: 'failed', message: 'rollback-interrupted-or-installation-not-verified' })
    }
  }

  async recordUpgrade(targetVersion: string): Promise<void> {
    await this.initialize()
    if (!isVersion(targetVersion) || compareVersions(targetVersion, this.environment.version) <= 0) return
    await this.save({ schema: 1, previousVersion: this.environment.version,
      upgradedVersion: targetVersion, platform: this.environment.platform, arch: this.environment.arch,
      phase: 'upgrade-pending' })
  }

  async status(): Promise<ApplicationRollbackStatus> {
    await this.initialize()
    const record = this.record
    const supported = (this.environment.platform === 'darwin' && ['arm64', 'x64'].includes(this.environment.arch))
      || (this.environment.platform === 'win32' && this.environment.arch === 'x64')
    if (!this.environment.packaged || !supported) {
      return { available: false, reason: 'unsupported-installation' }
    }
    if (!record) return { available: false, reason: 'previous-installed-version-not-recorded' }
    const targetVersion = record.previousVersion
    if (record.platform !== this.environment.platform || record.arch !== this.environment.arch) {
      return { available: false, targetVersion, reason: 'installation-platform-changed' }
    }
    if (record.phase !== 'ready') return { available: false, targetVersion, reason: record.message ?? `rollback-${record.phase}` }
    if (record.upgradedVersion !== this.environment.version || compareVersions(targetVersion, this.environment.version) >= 0) {
      return { available: false, targetVersion, reason: 'installation-version-changed' }
    }
    return { available: true, targetVersion }
  }

  async begin(): Promise<string> {
    const status = await this.status()
    if (!status.available || !status.targetVersion || !this.record) throw new Error(status.reason ?? 'rollback-unavailable')
    await this.save({ ...this.record, phase: 'downloading' })
    return status.targetVersion
  }

  async markInstalling(): Promise<void> {
    if (!this.record || this.record.phase !== 'downloading') throw new Error('rollback-not-downloaded')
    await this.save({ ...this.record, phase: 'installing' })
  }

  async fail(message: string): Promise<void> {
    if (this.record) await this.save({ ...this.record, phase: 'failed', message: message.slice(0, 500) })
  }

  private async save(record: RollbackRecord): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true })
    const temporary = `${this.file}.tmp`
    await writeFile(temporary, `${JSON.stringify(record)}\n`, { mode: 0o600 })
    await rename(temporary, this.file)
    this.record = record
  }
}

function validRecord(value: unknown): value is RollbackRecord {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return row.schema === 1 && isVersion(row.previousVersion) && isVersion(row.upgradedVersion)
    && typeof row.platform === 'string' && typeof row.arch === 'string'
    && ['upgrade-pending', 'ready', 'downloading', 'installing', 'failed', 'complete'].includes(String(row.phase))
    && (row.message === undefined || typeof row.message === 'string')
}
