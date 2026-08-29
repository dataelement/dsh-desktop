import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  disableGeneration,
  isGenerationPlugin
} from 'dsh-desktop-market-installer/generations/registry'
import {
  isThirdPartyPackageName,
  pluginDeclaredEntryIds,
  profileCordisPatchPath,
  profilePackageJsonPath,
  prunePluginPatchLayer
} from './plugin-recovery'

const PROTOCOL = 1

type RemovalStatus = 'disabled' | 'cleanup-pending' | 'removed'

interface RemovalEntry {
  pluginName: string
  status: RemovalStatus
  disabledAt: string
  updatedAt: string
  backupDirectory: string
  failures: string[]
  bootVerifiedAt?: string
  backupDeletedAt?: string
}

interface RemovalLedger {
  protocol: number
  removals: Record<string, RemovalEntry>
}

interface ProfileManifest {
  dependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

export interface PluginRemovalResult {
  pluginName: string
  disabled: boolean
  removed: boolean
  pending: boolean
  backupDirectory?: string
  failures: string[]
}

export interface PluginRemovalOptions {
  dshHome: string
  pluginName: string
  cleanupOwnedComponents: () => Promise<{ ok: boolean; failures: string[] }>
  uninstallGeneration: () => Promise<boolean>
  now?: () => Date
  note?: (line: string) => void
}

function ledgerPath(dshHome: string): string {
  return join(dshHome, 'recovery', 'plugin-removals.json')
}

function removalRoot(dshHome: string): string {
  return join(dshHome, 'recovery', 'plugin-removals')
}

function safePluginName(pluginName: string): string {
  return pluginName.replace(/^@/u, '').replaceAll('/', '__')
}

function timestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

async function readLedger(dshHome: string): Promise<RemovalLedger> {
  try {
    const parsed = JSON.parse(await readFile(ledgerPath(dshHome), 'utf8')) as RemovalLedger
    if (parsed.protocol === PROTOCOL && typeof parsed.removals === 'object') return parsed
  } catch { }
  return { protocol: PROTOCOL, removals: {} }
}

async function writeLedger(dshHome: string, ledger: RemovalLedger): Promise<void> {
  const path = ledgerPath(dshHome)
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await mkdir(dirname(path), { recursive: true })
  await writeFile(temporary, `${JSON.stringify(ledger, undefined, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

async function updateEntry(
  dshHome: string,
  pluginName: string,
  update: (entry: RemovalEntry | undefined) => RemovalEntry
): Promise<RemovalEntry> {
  const ledger = await readLedger(dshHome)
  const next = update(ledger.removals[pluginName])
  ledger.removals[pluginName] = next
  await writeLedger(dshHome, ledger)
  return next
}

async function copyOptional(from: string, to: string): Promise<void> {
  // The first snapshot is the rollback point. A cleanup retry must not replace
  // it with the already-disabled or partially-detached profile.
  if (existsSync(to)) return
  try {
    await copyFile(from, to)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

async function ensureBackup(entry: RemovalEntry, dshHome: string): Promise<void> {
  await mkdir(entry.backupDirectory, { recursive: true })
  const profile = dirname(profilePackageJsonPath(dshHome))
  await Promise.all([
    copyOptional(profilePackageJsonPath(dshHome), join(entry.backupDirectory, 'package.json')),
    copyOptional(join(profile, 'pnpm-lock.yaml'), join(entry.backupDirectory, 'pnpm-lock.yaml')),
    copyOptional(profileCordisPatchPath(dshHome), join(entry.backupDirectory, 'cordis.patch.yml'))
  ])
}

async function disableInManifest(dshHome: string, pluginNames: ReadonlySet<string>): Promise<void> {
  const path = profilePackageJsonPath(dshHome)
  const manifest = JSON.parse(await readFile(path, 'utf8')) as ProfileManifest
  const bundles = manifest.dsh?.profile?.bundles
  if (!bundles) return
  const next = bundles.filter((name) => !pluginNames.has(name))
  if (next.length === bundles.length) return
  manifest.dsh ??= {}
  manifest.dsh.profile ??= {}
  manifest.dsh.profile.bundles = next
  await writeFile(path, `${JSON.stringify(manifest, undefined, 2)}\n`, 'utf8')
}

async function markPending(
  dshHome: string,
  entry: RemovalEntry,
  failures: readonly string[]
): Promise<RemovalEntry> {
  return updateEntry(dshHome, entry.pluginName, (current) => ({
    ...(current ?? entry),
    status: 'cleanup-pending',
    updatedAt: new Date().toISOString(),
    failures: [...new Set([...(current?.failures ?? entry.failures), ...failures])]
  }))
}

async function beginRemoval(
  dshHome: string,
  pluginName: string,
  now: () => Date
): Promise<RemovalEntry> {
  if (!isThirdPartyPackageName(pluginName)) throw new Error(`Refusing to remove core package ${pluginName}`)
  const started = now()
  return updateEntry(dshHome, pluginName, (current) => {
    if (current && current.status !== 'removed') {
      return { ...current, status: 'disabled', updatedAt: started.toISOString() }
    }
    return {
      pluginName,
      status: 'disabled',
      disabledAt: started.toISOString(),
      updatedAt: started.toISOString(),
      backupDirectory: join(removalRoot(dshHome), timestamp(started), safePluginName(pluginName)),
      failures: []
    }
  })
}

async function nextQuarantinePath(base: string): Promise<string> {
  if (!existsSync(base)) return base
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`
    if (!existsSync(candidate)) return candidate
  }
  throw new Error(`Too many quarantine copies at ${base}`)
}

async function quarantinePath(from: string, baseDestination: string): Promise<string | undefined> {
  if (!existsSync(from)) return undefined
  const destination = await nextQuarantinePath(baseDestination)
  await mkdir(dirname(destination), { recursive: true })
  await rename(from, destination)
  return destination
}

async function detachLegacyPlugin(entry: RemovalEntry, dshHome: string): Promise<void> {
  const manifestPath = profilePackageJsonPath(dshHome)
  const profile = dirname(manifestPath)
  const entryIds = await pluginDeclaredEntryIds(profile, entry.pluginName)
  await quarantinePath(
    join(profile, 'node_modules', entry.pluginName),
    join(entry.backupDirectory, 'profile-packages', 'node_modules', safePluginName(entry.pluginName))
  )
  await quarantinePath(
    join(profile, 'packages', entry.pluginName),
    join(entry.backupDirectory, 'profile-packages', 'workspaces', safePluginName(entry.pluginName))
  )

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ProfileManifest
  if (manifest.dependencies) delete manifest.dependencies[entry.pluginName]
  if (manifest.dsh?.profile?.bundles) {
    manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter(
      (name) => name !== entry.pluginName
    )
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`, 'utf8')
  await prunePluginPatchLayer(dshHome, entry.pluginName, entryIds)
  // The manifest is authoritative. The saved lockfile remains in recovery;
  // the next package operation must resolve a new lock without the plugin.
  await rm(join(profile, 'pnpm-lock.yaml'), { force: true })
}

async function verifyDetached(dshHome: string, pluginName: string): Promise<boolean> {
  try {
    const profile = dirname(profilePackageJsonPath(dshHome))
    const manifest = JSON.parse(await readFile(profilePackageJsonPath(dshHome), 'utf8')) as ProfileManifest
    return !Object.hasOwn(manifest.dependencies ?? {}, pluginName) &&
      !(manifest.dsh?.profile?.bundles ?? []).includes(pluginName) &&
      !existsSync(join(profile, 'node_modules', pluginName)) &&
      !existsSync(join(profile, 'packages', pluginName))
  } catch {
    return false
  }
}

/**
 * Re-apply durable removal tombstones before launch. This is deliberately a
 * quick manifest/pointer operation: it never invokes pnpm, deletes packages,
 * or waits for cleanup, so a failed uninstall cannot hold the splash screen.
 */
export async function enforcePendingPluginRemovals(
  dshHome: string,
  note: (line: string) => void = () => undefined
): Promise<void> {
  const ledger = await readLedger(dshHome)
  const blocked = Object.values(ledger.removals).filter((entry) => entry.status !== 'removed')
  if (blocked.length === 0) return

  const names = new Set(blocked.map((entry) => entry.pluginName))
  for (const entry of blocked) {
    try {
      if (await isGenerationPlugin(dshHome, entry.pluginName)) {
        await disableGeneration(dshHome, entry.pluginName)
      }
    } catch (error) {
      note(`[desktop] could not enforce generation removal for ${entry.pluginName}: ${error instanceof Error ? error.message : error}`)
    }
  }
  try {
    await disableInManifest(dshHome, names)
  } catch (error) {
    note(`[desktop] could not enforce disabled plugin manifest: ${error instanceof Error ? error.message : error}`)
  }
}

export async function listPendingPluginRemovals(dshHome: string): Promise<string[]> {
  const ledger = await readLedger(dshHome)
  return Object.values(ledger.removals)
    .filter((entry) => entry.status !== 'removed')
    .map((entry) => entry.pluginName)
    .sort()
}

/**
 * A pending cleanup must never invoke package maintenance during launch. A
 * completed removal also gets one clean boot before normal maintenance is
 * allowed again, so unrelated migration work cannot trap the recovery flow.
 */
export async function shouldDeferProfileMaintenance(dshHome: string): Promise<boolean> {
  const ledger = await readLedger(dshHome)
  return Object.values(ledger.removals).some(
    (entry) => entry.status !== 'removed' || entry.bootVerifiedAt === undefined
  )
}

export async function confirmPluginRemovalsBooted(
  dshHome: string,
  note: (line: string) => void = () => undefined
): Promise<void> {
  const ledger = await readLedger(dshHome)
  let changed = false
  const verifiedAt = new Date().toISOString()
  for (const entry of Object.values(ledger.removals)) {
    if (entry.status !== 'removed') continue
    if (entry.bootVerifiedAt === undefined) {
      entry.bootVerifiedAt = verifiedAt
      entry.updatedAt = verifiedAt
      changed = true
      continue
    }
    if (entry.backupDeletedAt !== undefined) continue
    try {
      await rm(entry.backupDirectory, { recursive: true, force: true })
      entry.backupDeletedAt = verifiedAt
      entry.updatedAt = verifiedAt
      changed = true
      note(`[plugin-removal] deleted verified recovery backup for ${entry.pluginName}`)
    } catch (error) {
      const detail = `verified backup cleanup failed: ${error instanceof Error ? error.message : error}`
      if (!entry.failures.includes(detail)) entry.failures.push(detail)
      entry.updatedAt = verifiedAt
      changed = true
      note(`[plugin-removal] kept recovery backup for ${entry.pluginName}: ${detail}`)
    }
  }
  if (changed) await writeLedger(dshHome, ledger)
}

/**
 * Disable first, preserve a recovery copy, then detach the plugin. Every
 * failure returns cleanup-pending; the durable tombstone keeps the plugin out
 * of future launches while the user can retry cleanup later.
 */
export async function removePluginSafely(options: PluginRemovalOptions): Promise<PluginRemovalResult> {
  const now = options.now ?? (() => new Date())
  let entry = await beginRemoval(options.dshHome, options.pluginName, now)

  try {
    await ensureBackup(entry, options.dshHome)
    await disableInManifest(options.dshHome, new Set([options.pluginName]))
  } catch (error) {
    const detail = `disable/backup failed: ${error instanceof Error ? error.message : error}`
    entry = await markPending(options.dshHome, entry, [detail]).catch(() => entry)
    return {
      pluginName: options.pluginName,
      disabled: true,
      removed: false,
      pending: true,
      backupDirectory: entry.backupDirectory,
      failures: [detail]
    }
  }

  const cleanup = await options.cleanupOwnedComponents().catch((error) => ({
    ok: false,
    failures: [error instanceof Error ? error.message : String(error)]
  }))
  if (!cleanup.ok) {
    entry = await markPending(options.dshHome, entry, cleanup.failures).catch(() => entry)
    return {
      pluginName: options.pluginName,
      disabled: true,
      removed: false,
      pending: true,
      backupDirectory: entry.backupDirectory,
      failures: cleanup.failures
    }
  }

  try {
    if (await isGenerationPlugin(options.dshHome, options.pluginName)) {
      if (!await options.uninstallGeneration()) throw new Error('generation pointer could not be disabled')
    } else {
      await detachLegacyPlugin(entry, options.dshHome)
      if (!await verifyDetached(options.dshHome, options.pluginName)) {
        throw new Error('plugin is still present in the active profile')
      }
    }
  } catch (error) {
    const detail = `detach failed: ${error instanceof Error ? error.message : error}`
    entry = await markPending(options.dshHome, entry, [detail]).catch(() => entry)
    return {
      pluginName: options.pluginName,
      disabled: true,
      removed: false,
      pending: true,
      backupDirectory: entry.backupDirectory,
      failures: [detail]
    }
  }

  try {
    entry = await updateEntry(options.dshHome, options.pluginName, (current) => ({
      ...(current ?? entry),
      status: 'removed',
      updatedAt: now().toISOString(),
      failures: []
    }))
  } catch (error) {
    const detail = `removal commit failed: ${error instanceof Error ? error.message : error}`
    return {
      pluginName: options.pluginName,
      disabled: true,
      removed: false,
      pending: true,
      backupDirectory: entry.backupDirectory,
      failures: [detail]
    }
  }
  options.note?.(`[plugin-removal] removed ${options.pluginName}; recovery backup kept at ${entry.backupDirectory}`)
  return {
    pluginName: options.pluginName,
    disabled: true,
    removed: true,
    pending: false,
    backupDirectory: entry.backupDirectory,
    failures: []
  }
}
