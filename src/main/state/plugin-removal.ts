import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  writeFile
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { isSeq, parse, parseDocument } from 'yaml'
import {
  disableGeneration,
  ensureRegistryDirectories,
  generationId,
  isGenerationPlugin,
  listGenerations,
  readDesired,
  resolveEnabledGenerations,
  withRegistryLock,
  writeDesired,
  writeGenerationMeta
} from 'dsh-desktop-market-installer/generations/registry'
import { projectGenerations } from 'dsh-desktop-market-installer/generations/projection'
import { verifyGenerationPeers } from 'dsh-desktop-market-installer/generations/installer'
import {
  isThirdPartyPackageName,
  pluginDeclaredEntryIds,
  profileCordisPatchPath,
  profilePackageJsonPath,
  prunePluginPatchLayer
} from './plugin-recovery'
import { clearProfileInstallMarker } from './profile-install-marker'
import { bundleEntryIds } from './patch-layer'
import {
  adoptLegacyPluginOwnedComponents,
  discoverLegacyPluginOwnedComponents,
  isLegacyPluginComponentCandidate,
  isPluginOwnedComponentBackup,
  readPluginOwnedComponentBackups,
  removalBackupPackageNames,
  restorePluginOwnedComponents,
  validateLegacyPluginComponentCandidateLocation,
  verifyLegacyPluginComponentClaimMaterial,
  type PluginComponentRestoreOptions,
  type LegacyPluginComponentCandidate,
  type PluginOwnedComponentBackup
} from './plugin-component-cleanup'

const PROTOCOL = 2
const BACKUP_INTEGRITY_FILE = '.removal-backup.json'
const BACKUP_INTEGRITY_PROTOCOL = 1

type RemovalStatus = 'backup-pending' | 'disabled' | 'cleanup-pending' | 'removed'

interface GenerationBackupEntry {
  id: string
  version: string
  sourceSpec?: string
  wasDesired: boolean
}

interface RemovalEntry {
  removalId: string
  pluginName: string
  status: RemovalStatus
  disabledAt: string
  updatedAt: string
  backupDirectory: string
  failures: string[]
  generationBackups: GenerationBackupEntry[]
  componentBackups: PluginOwnedComponentBackup[]
  legacyComponentClaim?: {
    startedAt: string
    candidates: LegacyPluginComponentCandidate[]
  }
  bootVerifiedAt?: string
  backupDeletedAt?: string
  backupCleanupRequestedAt?: string
  backupTrashDirectory?: string
  restoreStartedAt?: string
  restoreFailure?: string
  restoredAt?: string
  legacy?: true
}

interface RemovalLedger {
  protocol: number
  removals: Record<string, RemovalEntry>
}

interface LegacyRemovalEntry extends Omit<RemovalEntry, 'removalId' | 'generationBackups' | 'componentBackups'> {
  generationBackups?: GenerationBackupEntry[]
  componentBackups?: PluginOwnedComponentBackup[]
}

interface ProfileManifest {
  dependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

export interface PluginRemovalResult {
  removalId?: string
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
  cleanupOwnedComponents: (context: {
    removalId: string
    backupDirectory: string
  }) => Promise<{
    ok: boolean
    failures: string[]
    componentBackups?: PluginOwnedComponentBackup[]
  }>
  uninstallGeneration: () => Promise<boolean>
  /**
   * Reconcile the shared profile after detaching a legacy root. Directly
   * moving only the root package leaves its hoisted/transitive dependencies
   * behind, which can keep shadowing the bundled Harness packages and render
   * the normal profile blank. The tombstone is already durable when this runs,
   * so a failed rebuild is retryable without resurrecting the plugin.
   */
  reconcileLegacyProfile?: () => Promise<{ ok: boolean; detail?: string }>
  now?: () => Date
  note?: (line: string) => void
}

export interface PluginRemovalBackup {
  removalId: string
  pluginName: string
  backupDirectory: string
  status: RemovalStatus
  disabledAt: string
  bootVerifiedAt?: string
  backupDeletedAt?: string
  restoreStartedAt?: string
  restoreFailure?: string
  restoredAt?: string
  generationIds: string[]
  failures: string[]
  integrity: 'verified' | 'legacy-unverified' | 'incomplete'
  integrityDetail?: string
  canRestore: boolean
}

export interface PluginRemovalLedgerSnapshot {
  backups: PluginRemovalBackup[]
  pendingDeletion: PluginRemovalBackup[]
}

export interface PluginRemovalRestoreOptions {
  restoreOwnedComponents?: (options: PluginComponentRestoreOptions) => Promise<void>
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

async function hashFile(
  hash: ReturnType<typeof createHash>,
  path: string
): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const stream = createReadStream(path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.once('error', rejectPromise)
    stream.once('end', resolvePromise)
  })
}

async function contentDigest(
  root: string,
  excludedRootEntry?: string | readonly string[]
): Promise<string> {
  const hash = createHash('sha256')
  const excluded = new Set(
    typeof excludedRootEntry === 'string' ? [excludedRootEntry] : excludedRootEntry ?? []
  )
  const visit = async (directory: string, prefix: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      if (prefix === '' && excluded.has(entry.name)) continue
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
      const path = join(directory, entry.name)
      const metadata = await lstat(path)
      if (metadata.isSymbolicLink()) {
        hash.update(`L\0${relativePath}\0${await readlink(path)}\0`)
      } else if (metadata.isDirectory()) {
        hash.update(`D\0${relativePath}\0`)
        await visit(path, relativePath)
      } else if (metadata.isFile()) {
        hash.update(`F\0${relativePath}\0${metadata.size}\0`)
        await hashFile(hash, path)
        hash.update('\0')
      }
    }
  }
  await visit(root, '')
  return hash.digest('hex')
}

async function backupContentDigest(root: string): Promise<string> {
  return contentDigest(root, BACKUP_INTEGRITY_FILE)
}

async function preComponentClaimDigest(root: string): Promise<string> {
  return contentDigest(root, [
    BACKUP_INTEGRITY_FILE,
    'owned-components.json',
    'owned-components'
  ])
}

function sameComponentBackups(
  left: readonly PluginOwnedComponentBackup[],
  right: readonly PluginOwnedComponentBackup[]
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function verifyOwnedComponentBackups(
  entry: RemovalEntry,
  backupDirectory: string = entry.backupDirectory
): Promise<void> {
  const recorded = await readPluginOwnedComponentBackups(
    backupDirectory,
    entry.removalId,
    entry.pluginName
  )
  if (!sameComponentBackups(recorded, entry.componentBackups)) {
    throw new Error('owned component recovery records do not match the removal ledger')
  }
  for (const component of recorded) {
    const path = join(backupDirectory, ...component.backupRelativePath.split('/'))
    const metadata = await lstat(path)
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error(`owned component recovery material is invalid: ${path}`)
    }
  }
}

async function writeBackupIntegrityManifest(entry: RemovalEntry): Promise<void> {
  const profileManifestPath = join(entry.backupDirectory, 'package.json')
  await rejectLinkedPathSegments(resolve(entry.backupDirectory), profileManifestPath)
  for (const reserved of ['profile-packages', 'generations', 'profile-detached', 'owned-components']) {
    await rejectLinkedPathSegments(
      resolve(entry.backupDirectory),
      join(entry.backupDirectory, reserved)
    )
  }
  const manifest = JSON.parse(await readFile(profileManifestPath, 'utf8'))
  if (typeof manifest !== 'object' || manifest === null) {
    throw new Error('profile manifest backup is invalid')
  }
  await verifyOwnedComponentBackups(entry)
  await writeJsonAtomically(join(entry.backupDirectory, BACKUP_INTEGRITY_FILE), {
    protocol: BACKUP_INTEGRITY_PROTOCOL,
    removalId: entry.removalId,
    pluginName: entry.pluginName,
    digest: await backupContentDigest(entry.backupDirectory)
  })
}

function legacyRemovalId(pluginName: string, entry: LegacyRemovalEntry): string {
  const suffix = Buffer.from(`${pluginName}\0${entry.disabledAt}\0${entry.backupDirectory}`)
    .toString('base64url')
    .slice(0, 40)
  return `legacy-${suffix}`
}

const CURRENT_REMOVAL_ID = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const LEGACY_REMOVAL_ID = /^legacy-[A-Za-z0-9_-]{1,40}$/u

function isValidRemovalId(removalId: string, legacy: boolean): boolean {
  return legacy ? LEGACY_REMOVAL_ID.test(removalId) : CURRENT_REMOVAL_ID.test(removalId)
}

function normalizeLegacyLedger(parsed: {
  protocol?: number
  removals?: Record<string, LegacyRemovalEntry>
}): RemovalLedger | undefined {
  if (parsed.protocol !== 1 || typeof parsed.removals !== 'object' || parsed.removals === null) {
    return undefined
  }
  const removals: Record<string, RemovalEntry> = {}
  for (const [pluginName, legacy] of Object.entries(parsed.removals)) {
    if (
      !legacy ||
      typeof legacy !== 'object' ||
      typeof legacy.backupDirectory !== 'string' ||
      typeof legacy.disabledAt !== 'string' ||
      typeof legacy.updatedAt !== 'string' ||
      !isRemovalStatus(legacy.status) ||
      !Array.isArray(legacy.failures) ||
      !legacy.failures.every((failure) => typeof failure === 'string') ||
      (
        legacy.generationBackups !== undefined &&
        (
          !Array.isArray(legacy.generationBackups) ||
          !legacy.generationBackups.every(isGenerationBackup)
        )
      ) ||
      (
        legacy.componentBackups !== undefined &&
        (
          !Array.isArray(legacy.componentBackups) ||
          !legacy.componentBackups.every(isPluginOwnedComponentBackup)
        )
      ) ||
      (
        legacy.legacyComponentClaim !== undefined &&
        (
          typeof legacy.legacyComponentClaim !== 'object' ||
          typeof legacy.legacyComponentClaim.startedAt !== 'string' ||
          !Array.isArray(legacy.legacyComponentClaim.candidates) ||
          legacy.legacyComponentClaim.candidates.length === 0 ||
          !legacy.legacyComponentClaim.candidates.every(isLegacyPluginComponentCandidate)
        )
      )
    ) {
      throw new Error(`legacy plugin removal entry ${pluginName} is invalid`)
    }
    const removalId = legacyRemovalId(pluginName, legacy)
    removals[removalId] = {
      ...legacy,
      removalId,
      pluginName: typeof legacy.pluginName === 'string' ? legacy.pluginName : pluginName,
      generationBackups: Array.isArray(legacy.generationBackups) ? legacy.generationBackups : [],
      componentBackups: Array.isArray(legacy.componentBackups) ? legacy.componentBackups : [],
      legacy: true
    }
  }
  return { protocol: PROTOCOL, removals }
}

function isRemovalStatus(value: unknown): value is RemovalStatus {
  return value === 'backup-pending' ||
    value === 'disabled' ||
    value === 'cleanup-pending' ||
    value === 'removed'
}

function isGenerationBackup(value: unknown): value is GenerationBackupEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<GenerationBackupEntry>
  return typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    entry.id !== '.' &&
    entry.id !== '..' &&
    !entry.id.includes('/') &&
    !entry.id.includes('\\') &&
    typeof entry.version === 'string' &&
    typeof entry.wasDesired === 'boolean' &&
    (entry.sourceSpec === undefined || typeof entry.sourceSpec === 'string')
}

function assertCurrentLedger(value: unknown): RemovalLedger {
  if (typeof value !== 'object' || value === null) throw new Error('ledger root is not an object')
  const parsed = value as Partial<RemovalLedger>
  if (parsed.protocol !== PROTOCOL) throw new Error(`unsupported ledger protocol ${String(parsed.protocol)}`)
  if (typeof parsed.removals !== 'object' || parsed.removals === null) {
    throw new Error('ledger removals map is invalid')
  }
  for (const [removalId, value] of Object.entries(parsed.removals)) {
    if (typeof value !== 'object' || value === null) throw new Error(`entry ${removalId} is invalid`)
    const entry = value as Partial<RemovalEntry>
    if (
      entry.removalId !== removalId ||
      typeof entry.pluginName !== 'string' ||
      !isThirdPartyPackageName(entry.pluginName) ||
      !isRemovalStatus(entry.status) ||
      typeof entry.disabledAt !== 'string' ||
      typeof entry.updatedAt !== 'string' ||
      typeof entry.backupDirectory !== 'string' ||
      !Array.isArray(entry.failures) ||
      !entry.failures.every((failure) => typeof failure === 'string') ||
      !Array.isArray(entry.generationBackups) ||
      !entry.generationBackups.every(isGenerationBackup) ||
      (
        entry.componentBackups !== undefined &&
        (
          !Array.isArray(entry.componentBackups) ||
          !entry.componentBackups.every(isPluginOwnedComponentBackup)
        )
      ) ||
      (
        entry.legacyComponentClaim !== undefined &&
        (
          typeof entry.legacyComponentClaim !== 'object' ||
          typeof entry.legacyComponentClaim.startedAt !== 'string' ||
          !Array.isArray(entry.legacyComponentClaim.candidates) ||
          entry.legacyComponentClaim.candidates.length === 0 ||
          !entry.legacyComponentClaim.candidates.every(isLegacyPluginComponentCandidate)
        )
      ) ||
      (entry.bootVerifiedAt !== undefined && typeof entry.bootVerifiedAt !== 'string') ||
      (entry.backupDeletedAt !== undefined && typeof entry.backupDeletedAt !== 'string') ||
      (entry.backupCleanupRequestedAt !== undefined && typeof entry.backupCleanupRequestedAt !== 'string') ||
      (entry.backupTrashDirectory !== undefined && typeof entry.backupTrashDirectory !== 'string') ||
      (entry.restoreStartedAt !== undefined && typeof entry.restoreStartedAt !== 'string') ||
      (entry.restoreFailure !== undefined && typeof entry.restoreFailure !== 'string') ||
      (entry.restoredAt !== undefined && typeof entry.restoredAt !== 'string') ||
      (entry.legacy !== undefined && entry.legacy !== true) ||
      !isValidRemovalId(removalId, entry.legacy === true)
    ) {
      throw new Error(`entry ${removalId} is malformed`)
    }
    entry.componentBackups ??= []
  }
  return parsed as RemovalLedger
}

async function readLedger(dshHome: string): Promise<RemovalLedger> {
  await validatePluginRecoveryBoundary(dshHome)
  let text: string
  try {
    text = await readFile(ledgerPath(dshHome), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { protocol: PROTOCOL, removals: {} }
    }
    throw new Error(`plugin removal ledger could not be read: ${
      error instanceof Error ? error.message : String(error)
    }`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(`plugin removal ledger is invalid JSON: ${
      error instanceof Error ? error.message : String(error)
    }`)
  }
  const normalized = (parsed as { protocol?: unknown }).protocol === PROTOCOL
    ? undefined
    : normalizeLegacyLedger(parsed as Parameters<typeof normalizeLegacyLedger>[0])
  const ledger = (parsed as { protocol?: unknown }).protocol === PROTOCOL
    ? assertCurrentLedger(parsed)
    : normalized === undefined
      ? undefined
      : assertCurrentLedger(normalized)
  if (!ledger) {
    throw new Error(`unsupported plugin removal ledger protocol ${
      String((parsed as { protocol?: unknown }).protocol)
    }`)
  }
  const backupDirectories = new Set<string>()
  for (const entry of Object.values(ledger.removals)) {
    const backupDirectory = await validatedBackupDirectory(dshHome, entry)
    if (backupDirectories.has(backupDirectory)) {
      throw new Error('multiple plugin removal records resolve to the same backup directory')
    }
    backupDirectories.add(backupDirectory)
    for (const candidate of entry.legacyComponentClaim?.candidates ?? []) {
      await validateLegacyPluginComponentCandidateLocation({
        dshHome,
        candidate,
        allowMissingSource: true
      })
    }
  }
  return ledger
}

async function writeLedger(dshHome: string, ledger: RemovalLedger): Promise<void> {
  await validatePluginRecoveryBoundary(dshHome)
  const path = ledgerPath(dshHome)
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await mkdir(dirname(path), { recursive: true })
  await writeFile(temporary, `${JSON.stringify(ledger, undefined, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

async function updateEntry(
  dshHome: string,
  removalId: string,
  update: (entry: RemovalEntry | undefined) => RemovalEntry
): Promise<RemovalEntry> {
  const ledger = await readLedger(dshHome)
  const next = update(ledger.removals[removalId])
  ledger.removals[removalId] = next
  await writeLedger(dshHome, ledger)
  return next
}

async function copyOptional(from: string, to: string): Promise<void> {
  if (existsSync(to)) {
    const existing = await readFile(to, 'utf8')
    if (to.endsWith('package.json')) {
      const parsed = JSON.parse(existing)
      if (typeof parsed !== 'object' || parsed === null) throw new Error(`backup file is invalid: ${to}`)
    }
    return
  }
  const temporary = `${to}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`
  try {
    await mkdir(dirname(to), { recursive: true })
    await copyFile(from, temporary)
    await rename(temporary, to)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined)
  }
}

async function copyGenerationDirectory(from: string, to: string, pluginName: string): Promise<void> {
  if (existsSync(to)) {
    if (
      existsSync(join(to, 'generation.json')) &&
      existsSync(join(to, 'node_modules', pluginName, 'package.json')) &&
      await contentDigest(from) === await contentDigest(to)
    ) {
      return
    }
    throw new Error(`generation material already exists but does not match the backup source: ${to}`)
  }

  const temporary = `${to}.${process.pid}.${Date.now()}.tmp`
  await mkdir(dirname(to), { recursive: true })
  try {
    await cp(from, temporary, {
      recursive: true,
      errorOnExist: true,
      force: false,
      verbatimSymlinks: true
    })
    if (
      !existsSync(join(temporary, 'generation.json')) ||
      !existsSync(join(temporary, 'node_modules', pluginName, 'package.json'))
    ) {
      throw new Error(`copied generation ${from} is incomplete`)
    }
    await rename(temporary, to)
  } catch (error) {
    await rm(temporary, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
}

async function copyPackageSnapshot(from: string, to: string): Promise<void> {
  if (!existsSync(from)) return
  if (existsSync(to)) {
    const manifest = JSON.parse(await readFile(join(to, 'package.json'), 'utf8'))
    if (typeof manifest?.name !== 'string') throw new Error(`package snapshot is invalid: ${to}`)
    return
  }
  const temporary = `${to}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`
  await mkdir(dirname(to), { recursive: true })
  try {
    await cp(from, temporary, {
      recursive: true,
      dereference: true,
      errorOnExist: true,
      force: false
    })
    const manifest = JSON.parse(await readFile(join(temporary, 'package.json'), 'utf8'))
    if (typeof manifest?.name !== 'string') throw new Error(`package snapshot is invalid: ${from}`)
    await rename(temporary, to)
  } catch (error) {
    await rm(temporary, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
}

async function assertPackageSnapshotName(
  directory: string,
  pluginName: string,
  context: string
): Promise<void> {
  const manifestPath = join(directory, 'package.json')
  const metadata = await lstat(manifestPath)
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${context} package manifest is not a regular file`)
  }
  const [realDirectory, realManifest] = await Promise.all([
    realpath(directory),
    realpath(manifestPath)
  ])
  if (!isInside(realDirectory, realManifest)) {
    throw new Error(`${context} package manifest resolves outside its snapshot`)
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    name?: unknown
  }
  if (manifest.name !== pluginName) {
    throw new Error(`${context} package name does not match ${pluginName}`)
  }
}

async function rejectLinkedTree(directory: string): Promise<void> {
  const metadata = await lstat(directory)
  if (metadata.isSymbolicLink()) {
    throw new Error(`backup material contains a symbolic link or junction: ${directory}`)
  }
  if (!metadata.isDirectory()) return
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      throw new Error(`backup material contains a symbolic link or junction: ${path}`)
    }
    if (entry.isDirectory()) await rejectLinkedTree(path)
  }
}

async function ensureBackup(
  entry: RemovalEntry,
  dshHome: string
): Promise<GenerationBackupEntry[]> {
  await ensureDirectoryNoLinks(resolve(dshHome), resolve(entry.backupDirectory))
  const profile = dirname(profilePackageJsonPath(dshHome))
  const optionalCopies = [
    [profilePackageJsonPath(dshHome), join(entry.backupDirectory, 'package.json')],
    [join(profile, 'pnpm-lock.yaml'), join(entry.backupDirectory, 'pnpm-lock.yaml')],
    [profileCordisPatchPath(dshHome), join(entry.backupDirectory, 'cordis.patch.yml')]
  ] as const
  for (const [, destination] of optionalCopies) {
    await prepareBackupDestination(entry, destination)
  }
  await Promise.all(optionalCopies.map(([source, destination]) => copyOptional(source, destination)))

  const [generations, desired] = await Promise.all([
    listGenerations(dshHome),
    readDesired(dshHome)
  ])
  const desiredIds = new Set(desired)
  const matching = generations.filter((generation) => generation.pluginName === entry.pluginName)
  const hasDesiredGeneration = matching.some((generation) => desiredIds.has(generation.id))
  // A failed migration can leave fully promoted but inert generations on
  // disk after desired.json is rolled back. Those directories are recovery
  // candidates, not proof that the active legacy package moved. Always retain
  // and later detach the live legacy package when no matching generation is
  // actually desired.
  if (!hasDesiredGeneration) {
    const packageSnapshot = join(
      entry.backupDirectory,
      'profile-packages',
      'node_modules',
      safePluginName(entry.pluginName)
    )
    const workspaceSnapshot = join(
      entry.backupDirectory,
      'profile-packages',
      'workspaces',
      safePluginName(entry.pluginName)
    )
    await prepareBackupDestination(entry, packageSnapshot)
    await prepareBackupDestination(entry, workspaceSnapshot)
    await copyPackageSnapshot(
      join(profile, 'node_modules', entry.pluginName),
      packageSnapshot
    )
    await copyPackageSnapshot(
      join(profile, 'packages', entry.pluginName),
      workspaceSnapshot
    )
  }
  const backedUp: GenerationBackupEntry[] = [...entry.generationBackups]
  for (const generation of matching) {
    const existing = backedUp.find((candidate) => candidate.id === generation.id)
    const generationBackup = join(entry.backupDirectory, 'generations', generation.id)
    await prepareBackupDestination(entry, generationBackup)
    await copyGenerationDirectory(
      generation.directory,
      generationBackup,
      entry.pluginName
    )
    if (!existing) {
      backedUp.push({
        id: generation.id,
        version: generation.version,
        ...(generation.sourceSpec === undefined ? {} : { sourceSpec: generation.sourceSpec }),
        wasDesired: desiredIds.has(generation.id)
      })
    } else if (desiredIds.has(generation.id)) {
      existing.wasDesired = true
    }
  }
  for (const generation of backedUp) {
    const backup = join(entry.backupDirectory, 'generations', generation.id)
    if (
      !existsSync(join(backup, 'generation.json')) ||
      !existsSync(join(backup, 'node_modules', entry.pluginName, 'package.json'))
    ) {
      throw new Error(`generation backup ${generation.id} is incomplete`)
    }
  }
  const generationsManifest = join(entry.backupDirectory, 'generations.json')
  await prepareBackupDestination(entry, generationsManifest)
  await writeJsonAtomically(generationsManifest, backedUp)
  return backedUp
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

async function markFailure(
  dshHome: string,
  entry: RemovalEntry,
  status: Extract<RemovalStatus, 'backup-pending' | 'cleanup-pending'>,
  failures: readonly string[]
): Promise<RemovalEntry> {
  return updateEntry(dshHome, entry.removalId, (current) => ({
    ...(current ?? entry),
    status,
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
  const ledger = await readLedger(dshHome)
  const current = Object.values(ledger.removals)
    .filter((entry) => entry.pluginName === pluginName && entry.status !== 'removed')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
  const started = now()
  if (current) {
    current.updatedAt = started.toISOString()
    await writeLedger(dshHome, ledger)
    return current
  }

  const removalId = `${timestamp(started)}-${randomUUID()}`
  const entry: RemovalEntry = {
    removalId,
    pluginName,
    status: 'backup-pending',
    disabledAt: started.toISOString(),
    updatedAt: started.toISOString(),
    backupDirectory: join(removalRoot(dshHome), removalId, safePluginName(pluginName)),
    failures: [],
    generationBackups: [],
    componentBackups: []
  }
  ledger.removals[removalId] = entry
  await writeLedger(dshHome, ledger)
  return entry
}

async function nextQuarantinePath(base: string): Promise<string> {
  if (!existsSync(base)) return base
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`
    if (!existsSync(candidate)) return candidate
  }
  throw new Error(`Too many quarantine copies at ${base}`)
}

async function quarantinePath(
  from: string,
  baseDestination: string,
  backupEntry?: RemovalEntry
): Promise<string | undefined> {
  if (!existsSync(from)) return undefined
  if (backupEntry) await prepareBackupDestination(backupEntry, baseDestination)
  const destination = await nextQuarantinePath(baseDestination)
  if (backupEntry) {
    await prepareBackupDestination(backupEntry, destination)
  } else {
    await mkdir(dirname(destination), { recursive: true })
  }
  await rename(from, destination)
  return destination
}

async function detachLegacyPlugin(entry: RemovalEntry, dshHome: string): Promise<void> {
  const manifestPath = profilePackageJsonPath(dshHome)
  const profile = dirname(manifestPath)
  const entryIds = await pluginDeclaredEntryIds(profile, entry.pluginName)
  await quarantinePath(
    join(profile, 'node_modules', entry.pluginName),
    join(entry.backupDirectory, 'profile-detached', 'node_modules', safePluginName(entry.pluginName)),
    entry
  )
  await quarantinePath(
    join(profile, 'packages', entry.pluginName),
    join(entry.backupDirectory, 'profile-detached', 'workspaces', safePluginName(entry.pluginName)),
    entry
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

function blocksPlugin(entry: RemovalEntry): boolean {
  return entry.status === 'disabled' || entry.status === 'cleanup-pending'
}

export async function enforcePendingPluginRemovals(
  dshHome: string,
  note: (line: string) => void = () => undefined
): Promise<void> {
  const ledger = await readLedger(dshHome)
  const blocked = Object.values(ledger.removals).filter(blocksPlugin)
  if (blocked.length === 0) return

  const names = new Set(blocked.map((entry) => entry.pluginName))
  for (const pluginName of names) {
    if (await isGenerationPlugin(dshHome, pluginName)) {
      await disableGeneration(dshHome, pluginName)
      if ((await resolveEnabledGenerations(dshHome)).has(pluginName)) {
        throw new Error(`generation removal tombstone could not disable ${pluginName}`)
      }
    }
  }
  await disableInManifest(dshHome, names)
  const manifest = JSON.parse(await readFile(profilePackageJsonPath(dshHome), 'utf8')) as ProfileManifest
  const remaining = (manifest.dsh?.profile?.bundles ?? []).filter((name) => names.has(name))
  if (remaining.length > 0) throw new Error(`removal tombstone is still composed: ${remaining.join(', ')}`)
  note(`[desktop] enforced ${blocked.length} pending plugin removal tombstone(s)`)
}

export async function listPendingPluginRemovals(dshHome: string): Promise<string[]> {
  const ledger = await readLedger(dshHome)
  return [...new Set(
    Object.values(ledger.removals)
      .filter((entry) => entry.status !== 'removed')
      .map((entry) => entry.pluginName)
  )].sort()
}

export async function incompletePluginRestoreId(dshHome: string): Promise<string | undefined> {
  const ledger = await readLedger(dshHome)
  const incomplete = Object.values(ledger.removals).filter(
    (entry) => entry.restoreStartedAt !== undefined || entry.legacyComponentClaim !== undefined
  )
  if (incomplete.length > 1) {
    throw new Error('multiple incomplete plugin restore transactions require manual recovery')
  }
  return incomplete[0]?.removalId
}

export async function shouldDeferProfileMaintenance(dshHome: string): Promise<boolean> {
  const ledger = await readLedger(dshHome)
  const incompleteRestore = Object.values(ledger.removals).find(
    (entry) => entry.restoreStartedAt !== undefined || entry.legacyComponentClaim !== undefined
  )
  if (incompleteRestore) {
    throw new Error(
      `plugin restore ${incompleteRestore.removalId} for ${incompleteRestore.pluginName} is incomplete`
    )
  }
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
    if (
      entry.status !== 'removed' ||
      entry.restoreStartedAt !== undefined ||
      entry.legacyComponentClaim !== undefined
    ) continue

    if (entry.bootVerifiedAt === undefined) {
      entry.bootVerifiedAt = verifiedAt
      entry.updatedAt = verifiedAt
      changed = true
      note(entry.restoredAt === undefined
        ? `[plugin-removal] boot-verified removal ${entry.removalId} of ${entry.pluginName}; ` +
            `recovery backup will be auto-cleaned on next launch`
        : `[plugin-removal] boot-verified restored plugin ${entry.pluginName}; ` +
            `recovery backup ${entry.removalId} remains user-managed`)
      continue
    }

    if (entry.restoredAt !== undefined || entry.backupDeletedAt !== undefined) continue

    try {
      await rm(entry.backupDirectory, { recursive: true, force: true })
      entry.backupDeletedAt = verifiedAt
      entry.updatedAt = verifiedAt
      changed = true
      note(`[plugin-removal] auto-cleaned verified recovery backup for ${entry.pluginName} (${entry.removalId})`)
    } catch (error) {
      const detail = `verified backup cleanup failed: ${error instanceof Error ? error.message : error}`
      if (!entry.failures.includes(detail)) entry.failures.push(detail)
      entry.updatedAt = verifiedAt
      changed = true
      note(`[plugin-removal] failed to auto-clean recovery backup for ${entry.pluginName}: ${detail}`)
    }
  }
  if (changed) await writeLedger(dshHome, ledger)
}

function isInside(root: string, candidate: string): boolean {
  const path = relative(root, candidate)
  return path !== '' && !path.startsWith('..') && !isAbsolute(path)
}

async function rejectLinkedPathSegments(boundary: string, directory: string): Promise<void> {
  try {
    const boundaryMetadata = await lstat(boundary)
    if (boundaryMetadata.isSymbolicLink() || !boundaryMetadata.isDirectory()) {
      throw new Error(`backup boundary is a symbolic link, junction, or non-directory: ${boundary}`)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  const path = relative(boundary, directory)
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error('backup path is outside the recovery boundary')
  }
  let cursor = boundary
  for (const part of path.split(sep).filter(Boolean)) {
    cursor = join(cursor, part)
    try {
      if ((await lstat(cursor)).isSymbolicLink()) {
        throw new Error(`backup path contains a symbolic link or junction: ${cursor}`)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
  }
  if (!existsSync(boundary) || !existsSync(directory)) return
  const [realBoundary, realDirectory] = await Promise.all([
    realpath(boundary),
    realpath(directory)
  ])
  const resolvedPath = relative(realBoundary, realDirectory)
  if (resolvedPath.startsWith('..') || isAbsolute(resolvedPath)) {
    throw new Error('backup path resolves outside the recovery root')
  }
}

async function ensureDirectoryNoLinks(boundary: string, directory: string): Promise<void> {
  const root = resolve(boundary)
  const destination = resolve(directory)
  const path = relative(root, destination)
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error('backup path is outside the recovery boundary')
  }
  const rootMetadata = await lstat(root)
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) {
    throw new Error(`backup boundary is a symbolic link, junction, or non-directory: ${root}`)
  }
  let cursor = root
  for (const part of path.split(sep).filter(Boolean)) {
    cursor = join(cursor, part)
    let metadata
    try {
      metadata = await lstat(cursor)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      try {
        await mkdir(cursor)
      } catch (mkdirError) {
        if ((mkdirError as NodeJS.ErrnoException).code !== 'EEXIST') throw mkdirError
      }
      metadata = await lstat(cursor)
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error(`backup path contains a symbolic link, junction, or file: ${cursor}`)
    }
  }
  await rejectLinkedPathSegments(root, destination)
}

async function prepareBackupDestination(entry: RemovalEntry, target: string): Promise<void> {
  const boundary = resolve(entry.backupDirectory)
  const destination = resolve(target)
  const path = relative(boundary, destination)
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error('backup destination is outside its removal directory')
  }
  await ensureDirectoryNoLinks(boundary, dirname(destination))
  await rejectLinkedPathSegments(boundary, destination)
}

async function validatePluginRecoveryBoundary(dshHome: string): Promise<void> {
  const boundary = resolve(dshHome)
  await rejectLinkedPathSegments(boundary, resolve(dshHome, 'recovery'))
  await rejectLinkedPathSegments(boundary, resolve(ledgerPath(dshHome)))
  await rejectLinkedPathSegments(boundary, resolve(removalRoot(dshHome)))
}

async function validatedBackupDirectory(
  dshHome: string,
  entry: RemovalEntry
): Promise<string> {
  const root = resolve(removalRoot(dshHome))
  const directory = resolve(entry.backupDirectory)
  if (!isInside(root, directory)) throw new Error('backup path is outside the recovery root')
  if (entry.legacy) {
    const parts = relative(root, directory).split(sep).filter(Boolean)
    const disabledAt = new Date(entry.disabledAt)
    if (
      !Number.isFinite(disabledAt.getTime()) ||
      parts.length !== 2 ||
      parts[0] !== timestamp(disabledAt) ||
      parts[1] !== safePluginName(entry.pluginName)
    ) {
      throw new Error('legacy backup path does not match its plugin record')
    }
  } else {
    const expected = resolve(root, entry.removalId, safePluginName(entry.pluginName))
    if (directory !== expected) throw new Error('backup path does not match its removal id')
  }
  await rejectLinkedPathSegments(resolve(dshHome), directory)
  return directory
}

async function validatedTrashDirectory(dshHome: string, entry: RemovalEntry): Promise<string> {
  const root = resolve(removalRoot(dshHome))
  const expected = resolve(root, '.trash', entry.removalId)
  if (entry.backupTrashDirectory !== undefined && resolve(entry.backupTrashDirectory) !== expected) {
    throw new Error('backup trash path does not match its removal id')
  }
  await rejectLinkedPathSegments(resolve(dshHome), expected)
  return expected
}

async function effectiveBackupDirectory(dshHome: string, entry: RemovalEntry): Promise<string> {
  const directory = await validatedBackupDirectory(dshHome, entry)
  if (existsSync(directory)) return directory
  if (entry.backupCleanupRequestedAt !== undefined) {
    const trash = await validatedTrashDirectory(dshHome, entry)
    if (existsSync(trash)) return trash
  }
  return directory
}

interface LegacyComponentClaimAssessment {
  candidates?: LegacyPluginComponentCandidate[]
  blockedReason?: string
}

async function assessLegacyComponentClaim(
  dshHome: string,
  ledger: RemovalLedger,
  entry: RemovalEntry,
  backupDirectory: string
): Promise<LegacyComponentClaimAssessment> {
  if (!entry.legacy || entry.componentBackups.length > 0) return {}
  const discovery = await discoverLegacyPluginOwnedComponents({ dshHome })
  if (discovery.candidates.length === 0 && discovery.unverified.length === 0) return {}
  if (discovery.unverified.length > 0) {
    return {
      blockedReason: `legacy component recovery material cannot be attributed safely: ${discovery.unverified[0]}`
    }
  }

  const entries = Object.values(ledger.removals)
  const packageNames = new Map<string, Set<string>>()
  for (const candidate of entries) {
    if (candidate.backupDeletedAt !== undefined) {
      packageNames.set(candidate.removalId, new Set([candidate.pluginName]))
      continue
    }
    const directory = candidate.removalId === entry.removalId
      ? backupDirectory
      : await effectiveBackupDirectory(dshHome, candidate)
    packageNames.set(
      candidate.removalId,
      await removalBackupPackageNames(directory, candidate.pluginName)
    )
  }
  const currentNames = packageNames.get(entry.removalId) ?? new Set([entry.pluginName])
  const matches = discovery.candidates.filter((candidate) =>
    candidate.packageOwners.some((owner) => currentNames.has(owner))
  )
  if (matches.length === 0) return {}
  const disabledAt = Date.parse(entry.disabledAt)
  const updatedAt = Date.parse(entry.updatedAt)
  if (!Number.isFinite(disabledAt) || !Number.isFinite(updatedAt) || updatedAt < disabledAt) {
    return { blockedReason: 'plugin removal transaction has an invalid legacy component time window' }
  }
  const outsideWindow = matches.find((candidate) => {
    const quarantinedAt = Date.parse(candidate.quarantinedAt)
    return quarantinedAt < disabledAt || quarantinedAt > updatedAt
  })
  if (outsideWindow) {
    return {
      blockedReason: `legacy component backup is outside this removal transaction window: ${outsideWindow.sourcePath}`
    }
  }
  if (entries.filter((candidate) => candidate.pluginName === entry.pluginName).length !== 1) {
    return { blockedReason: 'multiple removals of this plugin make legacy component ownership ambiguous' }
  }
  for (const selected of matches) {
    const owners = entries.filter((candidate) =>
      selected.packageOwners.some((owner) => packageNames.get(candidate.removalId)?.has(owner))
    )
    if (owners.length !== 1 || owners[0]?.removalId !== entry.removalId) {
      return { blockedReason: 'legacy component backup matches more than one removal transaction' }
    }
  }
  const originalPaths = new Set(matches.map((candidate) => candidate.component.originalPath))
  if (originalPaths.size !== matches.length) {
    return { blockedReason: 'legacy component recovery contains duplicate destination paths' }
  }
  return { candidates: matches }
}

async function resumeLegacyComponentClaim(
  dshHome: string,
  ledger: RemovalLedger,
  entry: RemovalEntry,
  backupDirectory: string
): Promise<void> {
  const intent = entry.legacyComponentClaim
  if (!intent) return
  const reassessed = await assessLegacyComponentClaim(
    dshHome,
    ledger,
    { ...entry, componentBackups: [] },
    backupDirectory
  )
  if (
    reassessed.blockedReason ||
    !reassessed.candidates ||
    JSON.stringify(reassessed.candidates) !== JSON.stringify(intent.candidates)
  ) {
    throw new Error(
      reassessed.blockedReason ?? 'legacy component claim no longer has a unique verified owner'
    )
  }
  const componentBackups = await adoptLegacyPluginOwnedComponents({
    dshHome,
    backupDirectory,
    removalId: entry.removalId,
    pluginName: entry.pluginName,
    candidates: intent.candidates
  })
  entry.componentBackups = componentBackups
  await writeLedger(dshHome, ledger)
  await writeBackupIntegrityManifest(entry)
  delete entry.legacyComponentClaim
  entry.updatedAt = new Date().toISOString()
  await writeLedger(dshHome, ledger)
}

async function inspectBackup(
  dshHome: string,
  entry: RemovalEntry,
  ledger?: RemovalLedger
): Promise<PluginRemovalBackup> {
  let directory: string
  let integrity: PluginRemovalBackup['integrity'] = 'verified'
  let integrityDetail: string | undefined
  let legacyCanRestore = false
  try {
    directory = await effectiveBackupDirectory(dshHome, entry)
    if (!existsSync(directory)) throw new Error('backup directory is missing')
    for (const reserved of [
      'package.json',
      BACKUP_INTEGRITY_FILE,
      'profile-packages',
      'generations',
      'profile-detached',
      'owned-components',
      'owned-components.json'
    ]) {
      await rejectLinkedPathSegments(directory, join(directory, reserved))
    }
    if (!existsSync(join(directory, 'package.json'))) {
      throw new Error('profile manifest backup is missing')
    }
    for (const generation of entry.generationBackups) {
      const generationDirectory = join(directory, 'generations', generation.id)
      await rejectLinkedPathSegments(directory, generationDirectory)
      if (
        !existsSync(join(generationDirectory, 'generation.json')) ||
        !existsSync(join(generationDirectory, 'node_modules', entry.pluginName, 'package.json'))
      ) {
        throw new Error(`generation backup ${generation.id} is incomplete`)
      }
      await assertPackageSnapshotName(
        join(generationDirectory, 'node_modules', entry.pluginName),
        entry.pluginName,
        `generation backup ${generation.id}`
      )
    }
    const legacyPackage = join(
      directory,
      'profile-packages',
      'node_modules',
      safePluginName(entry.pluginName)
    )
    await rejectLinkedPathSegments(directory, legacyPackage)
    if (existsSync(join(legacyPackage, 'package.json'))) {
      await rejectLinkedTree(legacyPackage)
      await assertPackageSnapshotName(legacyPackage, entry.pluginName, 'legacy backup')
      legacyCanRestore = true
    }
    const legacyWorkspace = join(
      directory,
      'profile-packages',
      'workspaces',
      safePluginName(entry.pluginName)
    )
    await rejectLinkedPathSegments(directory, legacyWorkspace)
    if (existsSync(join(legacyWorkspace, 'package.json'))) {
      await rejectLinkedTree(legacyWorkspace)
      await assertPackageSnapshotName(legacyWorkspace, entry.pluginName, 'legacy workspace backup')
    }
    const integrityPath = join(directory, BACKUP_INTEGRITY_FILE)
    if (entry.legacyComponentClaim) {
      await verifyLegacyPluginComponentClaimMaterial({
        dshHome,
        backupDirectory: directory,
        removalId: entry.removalId,
        pluginName: entry.pluginName,
        candidates: entry.legacyComponentClaim.candidates
      })
      if (!existsSync(integrityPath) && entry.legacy) {
        integrity = 'legacy-unverified'
      } else {
        const recorded = JSON.parse(await readFile(integrityPath, 'utf8')) as {
          protocol?: unknown
          removalId?: unknown
          pluginName?: unknown
          digest?: unknown
        }
        const [baseDigest, currentDigest] = await Promise.all([
          preComponentClaimDigest(directory),
          backupContentDigest(directory)
        ])
        if (
          recorded.protocol !== BACKUP_INTEGRITY_PROTOCOL ||
          recorded.removalId !== entry.removalId ||
          recorded.pluginName !== entry.pluginName ||
          typeof recorded.digest !== 'string' ||
          (recorded.digest !== baseDigest && recorded.digest !== currentDigest)
        ) throw new Error('legacy component claim base checksum does not match')
      }
    } else if (!existsSync(integrityPath) && entry.legacy) {
      integrity = 'legacy-unverified'
    } else {
      const recorded = JSON.parse(await readFile(integrityPath, 'utf8')) as {
        protocol?: unknown
        removalId?: unknown
        pluginName?: unknown
        digest?: unknown
      }
      if (
        recorded.protocol !== BACKUP_INTEGRITY_PROTOCOL ||
        recorded.removalId !== entry.removalId ||
        recorded.pluginName !== entry.pluginName ||
        typeof recorded.digest !== 'string'
      ) {
        throw new Error('backup integrity manifest does not match its removal record')
      }
      if (await backupContentDigest(directory) !== recorded.digest) {
        throw new Error('backup content checksum does not match')
      }
    }
    if (!entry.legacyComponentClaim) await verifyOwnedComponentBackups(entry, directory)
    if (ledger && !entry.legacyComponentClaim) {
      const legacyClaim = await assessLegacyComponentClaim(dshHome, ledger, entry, directory)
      if (legacyClaim.blockedReason) throw new Error(legacyClaim.blockedReason)
    }
  } catch (error) {
    directory = resolve(entry.backupDirectory)
    integrity = 'incomplete'
    integrityDetail = error instanceof Error ? error.message : String(error)
  }
  return {
    removalId: entry.removalId,
    pluginName: entry.pluginName,
    backupDirectory: directory,
    status: entry.status,
    disabledAt: entry.disabledAt,
    ...(entry.bootVerifiedAt === undefined ? {} : { bootVerifiedAt: entry.bootVerifiedAt }),
    ...(entry.backupDeletedAt === undefined ? {} : { backupDeletedAt: entry.backupDeletedAt }),
    ...(entry.restoreStartedAt === undefined && entry.legacyComponentClaim === undefined
      ? {}
      : { restoreStartedAt: entry.restoreStartedAt ?? entry.legacyComponentClaim!.startedAt }),
    ...(entry.restoreFailure === undefined && entry.legacyComponentClaim === undefined
      ? {}
      : {
          restoreFailure: entry.restoreFailure ??
            'legacy component recovery claim was interrupted before Profile restore'
        }),
    ...(entry.restoredAt === undefined ? {} : { restoredAt: entry.restoredAt }),
    generationIds: entry.generationBackups.map((generation) => generation.id),
    failures: [...entry.failures],
    integrity,
    ...(integrityDetail === undefined ? {} : { integrityDetail }),
    canRestore: entry.status === 'removed' &&
      entry.backupCleanupRequestedAt === undefined &&
      integrity !== 'incomplete' &&
      (
        entry.generationBackups.some((generation) => generation.wasDesired) ||
        legacyCanRestore
      )
  }
}

export async function listVerifiedRemovalBackups(
  dshHome: string
): Promise<PluginRemovalBackup[]> {
  const ledger = await readLedger(dshHome)
  const entries = Object.values(ledger.removals)
    .filter(
      (entry) =>
        entry.status === 'removed' &&
        entry.backupDeletedAt === undefined &&
        entry.bootVerifiedAt !== undefined
    )
  const backups = await Promise.all(entries.map((entry) => inspectBackup(dshHome, entry, ledger)))
  return backups.sort((left, right) => right.disabledAt.localeCompare(left.disabledAt))
}

export async function snapshotPluginRemovalLedger(
  dshHome: string
): Promise<PluginRemovalLedgerSnapshot> {
  const ledger = await readLedger(dshHome)
  const entries = Object.values(ledger.removals)
    .filter((entry) => entry.backupDeletedAt === undefined)
  const backups = (await Promise.all(entries.map((entry) => inspectBackup(dshHome, entry, ledger))))
    .sort((left, right) => right.disabledAt.localeCompare(left.disabledAt))
  return {
    backups,
    pendingDeletion: backups.filter(
      (entry) => entry.status === 'removed' && entry.bootVerifiedAt !== undefined
    )
  }
}

export async function resolvePluginRemovalBackup(
  dshHome: string,
  removalId: string
): Promise<PluginRemovalBackup | undefined> {
  const ledger = await readLedger(dshHome)
  const entry = ledger.removals[removalId]
  if (!entry || entry.backupDeletedAt !== undefined) return undefined
  try {
    await effectiveBackupDirectory(dshHome, entry)
  } catch {
    return undefined
  }
  return inspectBackup(dshHome, entry, ledger)
}

async function copyRestoredDirectory(from: string, to: string): Promise<void> {
  const temporary = `${to}.${process.pid}.${Date.now()}.restore`
  await mkdir(dirname(to), { recursive: true })
  try {
    await cp(from, temporary, {
      recursive: true,
      dereference: true,
      errorOnExist: true,
      force: false,
    })
    if (existsSync(to)) {
      if (await contentDigest(temporary) === await contentDigest(to)) {
        await rm(temporary, { recursive: true, force: true })
        return
      }
      throw new Error(`restore destination already contains different package material: ${to}`)
    }
    await rename(temporary, to)
  } catch (error) {
    await rm(temporary, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
}

async function restoreDirectoryWithConflictQuarantine(
  dshHome: string,
  entry: RemovalEntry,
  from: string,
  to: string,
  kind: 'node_modules' | 'workspaces'
): Promise<void> {
  try {
    await copyRestoredDirectory(from, to)
  } catch (error) {
    if (!existsSync(to)) throw error
    const conflictBase = join(
      dshHome,
      'recovery',
      'plugin-restore-conflicts',
      entry.removalId,
      kind,
      safePluginName(entry.pluginName)
    )
    await ensureDirectoryNoLinks(resolve(dshHome), dirname(conflictBase))
    await rejectLinkedPathSegments(resolve(dshHome), conflictBase)
    const conflict = await nextQuarantinePath(conflictBase)
    await rejectLinkedPathSegments(resolve(dshHome), conflict)
    await rename(to, conflict)
    await copyRestoredDirectory(from, to)
  }
}

async function restoreGenerationDirectory(
  dshHome: string,
  source: string,
  preferredId: string,
  pluginName: string
): Promise<{ id: string; directory: string }> {
  const layout = await ensureRegistryDirectories(dshHome)
  const sourceDigest = await contentDigest(source)
  let id = preferredId
  let directory = join(layout.generations, id)
  if (existsSync(directory) && await contentDigest(directory) !== sourceDigest) {
    id = `${preferredId}.recovered-${sourceDigest.slice(0, 12)}`
    directory = join(layout.generations, id)
  }
  await copyGenerationDirectory(source, directory, pluginName)
  if (await contentDigest(directory) !== sourceDigest) {
    throw new Error(`restored generation ${id} does not match its recovery backup`)
  }
  return { id, directory }
}

async function patchRestorePlan(
  dshHome: string,
  backupDirectory: string,
  pluginName: string,
  packageDirectory: string
): Promise<{ path: string; text?: string }> {
  const backupPatch = join(backupDirectory, 'cordis.patch.yml')
  const activePatch = profileCordisPatchPath(dshHome)
  if (!existsSync(backupPatch)) return { path: activePatch }
  const manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'))
  const bundlePatch = manifest.dsh?.bundle?.patch
  const entryIds = typeof bundlePatch === 'string'
    ? bundleEntryIds(await readFile(resolve(packageDirectory, bundlePatch), 'utf8'))
    : []
  const before = await readFile(backupPatch, 'utf8')
  const current = await readFile(activePatch, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return '[]\n'
    throw error
  })
  if (current === before) return { path: activePatch }
  // Three-way merge only the rows the removal pruned. Unrelated rows may have
  // changed since the backup was made and must survive byte-for-byte in the
  // current document. A current row that already reuses one of the plugin's
  // ids/names with different content is a real conflict and is left for manual
  // recovery instead of being overwritten.
  const beforeRows = parse(before)
  const currentRows = parse(current)
  if (!Array.isArray(beforeRows) || !Array.isArray(currentRows)) {
    throw new Error('profile patch layer is not a YAML sequence')
  }
  const targetRows: unknown[] = []
  for (const row of beforeRows) {
    if (typeof row !== 'object' || row === null) continue
    const record = row as { id?: unknown; insert?: unknown }
    if (typeof record.id === 'string' && entryIds.includes(record.id)) {
      targetRows.push(row)
      continue
    }
    if (!Array.isArray(record.insert)) continue
    const targetInsert = record.insert.filter((item) => {
      const name = (item as { name?: unknown } | null)?.name
      return typeof name === 'string' && (name === pluginName || name.startsWith(`${pluginName}/`))
    })
    if (targetInsert.length > 0) targetRows.push({ ...record, insert: targetInsert })
  }
  if (targetRows.length === 0) return { path: activePatch }

  const same = (left: unknown, right: unknown): boolean =>
    JSON.stringify(left) === JSON.stringify(right)
  for (const target of targetRows) {
    const record = target as { id?: unknown; insert?: unknown }
    if (typeof record.id === 'string') {
      const existing = currentRows.find(
        (row) => (row as { id?: unknown } | null)?.id === record.id
      )
      if (existing !== undefined) {
        if (!same(existing, target)) throw new Error(`profile patch id ${record.id} now has conflicting content`)
        continue
      }
    } else if (Array.isArray(record.insert)) {
      const missing: unknown[] = []
      for (const item of record.insert) {
        const name = (item as { name?: unknown } | null)?.name
        const existing = currentRows.flatMap(
          (row) => Array.isArray((row as { insert?: unknown } | null)?.insert)
            ? (row as { insert: unknown[] }).insert
            : []
        ).find((candidate) => (candidate as { name?: unknown } | null)?.name === name)
        if (existing !== undefined && !same(existing, item)) {
          throw new Error(`profile patch insert ${String(name)} now has conflicting content`)
        }
        if (existing === undefined) missing.push(item)
      }
      if (missing.length === 0) {
        targetRows[targetRows.indexOf(target)] = { ...record, insert: [] }
        continue
      }
      targetRows[targetRows.indexOf(target)] = { ...record, insert: missing }
    }
  }

  const document = parseDocument(current)
  if (!isSeq(document.contents)) throw new Error('profile patch layer is not a YAML sequence')
  for (const target of targetRows) {
    const record = target as { id?: unknown; insert?: unknown }
    if (
      (typeof record.id === 'string' && currentRows.some(
        (row) => same(row, target)
      )) ||
      (Array.isArray(record.insert) && record.insert.length === 0)
    ) continue
    document.contents.items.push(document.createNode(target) as never)
  }
  return { path: activePatch, text: String(document) }
}

async function applyPatchRestorePlan(plan: { path: string; text?: string }): Promise<void> {
  if (plan.text === undefined) return
  const temporary = `${plan.path}.${process.pid}.${Date.now()}.restore`
  await writeFile(temporary, plan.text, 'utf8')
  await rename(temporary, plan.path)
}

async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, undefined, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

async function restoreGenerationBackup(
  dshHome: string,
  entry: RemovalEntry,
  backupDirectory: string
): Promise<void> {
  const selected = entry.generationBackups.filter((generation) => generation.wasDesired)
  if (selected.length === 0) throw new Error('backup does not record an enabled generation')
  const primaryPackage = join(
    backupDirectory,
    'generations',
    selected[0]!.id,
    'node_modules',
    entry.pluginName
  )
  await rejectLinkedPathSegments(resolve(backupDirectory), resolve(primaryPackage))
  const patchPlan = await patchRestorePlan(dshHome, backupDirectory, entry.pluginName, primaryPackage)
  const restored: Array<{ id: string; directory: string; version: string }> = []
  for (const generation of selected) {
    const generationSource = join(backupDirectory, 'generations', generation.id)
    await rejectLinkedPathSegments(resolve(backupDirectory), resolve(generationSource))
    const material = await restoreGenerationDirectory(
      dshHome,
      generationSource,
      generation.id,
      entry.pluginName
    )
    const candidate = {
      ...material,
      pluginName: entry.pluginName,
      version: generation.version
    }
    const peers = await verifyGenerationPeers(dshHome, candidate)
    if (!peers.ok) {
      throw new Error(`restored generation failed peer validation: ${peers.problems.join('; ')}`)
    }
    restored.push(candidate)
  }

  const [desired, generations] = await Promise.all([readDesired(dshHome), listGenerations(dshHome)])
  const byId = new Map(generations.map((generation) => [generation.id, generation]))
  const withoutPlugin = desired.filter((id) => byId.get(id)?.pluginName !== entry.pluginName)
  await writeDesired(dshHome, [...withoutPlugin, ...restored.map((generation) => generation.id)])
  await projectGenerations(dshHome)
  await applyPatchRestorePlan(patchPlan)
  const enabled = (await resolveEnabledGenerations(dshHome)).get(entry.pluginName)
  if (!enabled || !restored.some((generation) => generation.id === enabled.id)) {
    throw new Error('restored generation did not become the enabled plugin')
  }
}

async function restoreLegacyBackupAsGeneration(
  dshHome: string,
  entry: RemovalEntry,
  backupDirectory: string,
  sourcePackage: string
): Promise<void> {
  const manifest = JSON.parse(await readFile(join(sourcePackage, 'package.json'), 'utf8'))
  if (manifest.name !== entry.pluginName || typeof manifest.version !== 'string') {
    throw new Error('legacy package backup identity is invalid')
  }
  const patch = manifest.dsh?.bundle?.patch
  if (typeof patch !== 'string' || !existsSync(resolve(sourcePackage, patch))) {
    throw new Error('legacy package backup has no readable bundle patch')
  }
  const patchPlan = await patchRestorePlan(dshHome, backupDirectory, entry.pluginName, sourcePackage)
  const layout = await ensureRegistryDirectories(dshHome)
  const digest = await contentDigest(sourcePackage)
  const id = generationId(entry.pluginName, manifest.version, `legacy-recovery:${digest}`)
  const staging = join(layout.staging, `${id}.${randomUUID()}`)
  await mkdir(join(staging, 'node_modules', dirname(entry.pluginName)), { recursive: true })
  try {
    await cp(sourcePackage, join(staging, 'node_modules', entry.pluginName), {
      recursive: true,
      dereference: true,
      errorOnExist: true,
      force: false
    })
    await writeGenerationMeta(staging, {
      pluginName: entry.pluginName,
      version: manifest.version,
      sourceSpec: `recovery:${entry.removalId}`
    })
    const restored = await restoreGenerationDirectory(dshHome, staging, id, entry.pluginName)
    const candidate = { ...restored, pluginName: entry.pluginName, version: manifest.version }
    const peers = await verifyGenerationPeers(dshHome, candidate)
    if (!peers.ok) throw new Error(`restored generation failed peer validation: ${peers.problems.join('; ')}`)
    const [desired, generations] = await Promise.all([readDesired(dshHome), listGenerations(dshHome)])
    const byId = new Map(generations.map((generation) => [generation.id, generation]))
    await writeDesired(dshHome, [
      ...desired.filter((generation) => byId.get(generation)?.pluginName !== entry.pluginName),
      restored.id
    ])
    await projectGenerations(dshHome)
    await applyPatchRestorePlan(patchPlan)
    if (!(await resolveEnabledGenerations(dshHome)).has(entry.pluginName)) {
      throw new Error('restored legacy backup did not become an enabled generation')
    }
  } finally {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function restoreLegacyBackup(
  dshHome: string,
  entry: RemovalEntry,
  backupDirectory: string
): Promise<void> {
  const profile = dirname(profilePackageJsonPath(dshHome))
  const sourcePackage = join(
    backupDirectory,
    'profile-packages',
    'node_modules',
    safePluginName(entry.pluginName)
  )
  await rejectLinkedPathSegments(resolve(backupDirectory), resolve(sourcePackage))
  if (!existsSync(join(sourcePackage, 'package.json'))) {
    throw new Error('legacy package backup is incomplete')
  }
  await rejectLinkedTree(sourcePackage)
  await assertPackageSnapshotName(sourcePackage, entry.pluginName, 'legacy backup')
  if (existsSync(join(profile, '.generations-migrated'))) {
    await restoreLegacyBackupAsGeneration(dshHome, entry, backupDirectory, sourcePackage)
    return
  }

  const [backupManifest, currentManifest] = await Promise.all([
    readFile(join(backupDirectory, 'package.json'), 'utf8').then(JSON.parse) as Promise<ProfileManifest>,
    readFile(profilePackageJsonPath(dshHome), 'utf8').then(JSON.parse) as Promise<ProfileManifest>
  ])
  const spec = backupManifest.dependencies?.[entry.pluginName]
  if (typeof spec !== 'string') throw new Error('legacy backup has no dependency declaration')
  const currentBundles = currentManifest.dsh?.profile?.bundles ?? []
  const targetPackage = join(profile, 'node_modules', entry.pluginName)
  const patchPlan = await patchRestorePlan(dshHome, backupDirectory, entry.pluginName, sourcePackage)
  const declaredSpec = currentManifest.dependencies?.[entry.pluginName]
  if (
    (declaredSpec !== undefined && declaredSpec !== spec) ||
    (currentBundles.includes(entry.pluginName) && declaredSpec !== spec)
  ) {
    throw new Error('active Profile already declares conflicting plugin material')
  }
  await restoreDirectoryWithConflictQuarantine(
    dshHome,
    entry,
    sourcePackage,
    targetPackage,
    'node_modules'
  )
  const alreadyRestored = currentManifest.dependencies?.[entry.pluginName] === spec &&
    currentBundles.includes(entry.pluginName) &&
    existsSync(join(targetPackage, 'package.json'))
  const sourceWorkspace = join(
    backupDirectory,
    'profile-packages',
    'workspaces',
    safePluginName(entry.pluginName)
  )
  await rejectLinkedPathSegments(resolve(backupDirectory), resolve(sourceWorkspace))
  if (existsSync(sourceWorkspace)) {
    await rejectLinkedTree(sourceWorkspace)
    await assertPackageSnapshotName(sourceWorkspace, entry.pluginName, 'legacy workspace backup')
    await restoreDirectoryWithConflictQuarantine(
      dshHome,
      entry,
      sourceWorkspace,
      join(profile, 'packages', entry.pluginName),
      'workspaces'
    )
  }
  if (!alreadyRestored) {
    currentManifest.dependencies ??= {}
    currentManifest.dependencies[entry.pluginName] = spec
    currentManifest.dsh ??= {}
    currentManifest.dsh.profile ??= {}
    currentManifest.dsh.profile.bundles = [...new Set([...currentBundles, entry.pluginName])]
    await writeJsonAtomically(profilePackageJsonPath(dshHome), currentManifest)
  }
  await applyPatchRestorePlan(patchPlan)
  await clearProfileInstallMarker(dshHome)
}

export async function restorePluginRemovalBackup(
  dshHome: string,
  removalId: string,
  note: (line: string) => void = () => undefined,
  options: PluginRemovalRestoreOptions = {}
): Promise<{ ok: boolean; reason?: string }> {
  let ledger: RemovalLedger | undefined
  try {
    ledger = await readLedger(dshHome)
    const entry = ledger.removals[removalId]
    if (!entry) return { ok: false, reason: 'no removal recorded for this id' }
    const incompleteRestores = Object.values(ledger.removals).filter(
      (candidate) => candidate.restoreStartedAt !== undefined ||
        candidate.legacyComponentClaim !== undefined
    )
    if (
      incompleteRestores.length > 0 &&
      (incompleteRestores.length !== 1 || incompleteRestores[0]?.removalId !== removalId)
    ) {
      return { ok: false, reason: 'another plugin restore transaction must be resolved first' }
    }
    if (entry.status !== 'removed') return { ok: false, reason: 'plugin removal is not complete' }
    if (entry.backupDeletedAt !== undefined) return { ok: false, reason: 'backup has been deleted' }
    if (entry.backupCleanupRequestedAt !== undefined) {
      return { ok: false, reason: 'backup deletion is pending explicit retry' }
    }
    const conflictingRemoval = Object.values(ledger.removals).find(
      (candidate) => candidate.removalId !== entry.removalId &&
        candidate.pluginName === entry.pluginName &&
        candidate.status !== 'removed'
    )
    if (conflictingRemoval) {
      return {
        ok: false,
        reason: `another removal transaction is still pending (${conflictingRemoval.removalId})`
      }
    }
    const backupDirectory = await effectiveBackupDirectory(dshHome, entry)
    if (entry.legacyComponentClaim) {
      await resumeLegacyComponentClaim(dshHome, ledger, entry, backupDirectory)
    }
    let inspected = await inspectBackup(dshHome, entry, ledger)
    if (!inspected.canRestore) {
      return { ok: false, reason: inspected.integrityDetail ?? 'backup cannot be restored automatically' }
    }
    const legacyClaim = await assessLegacyComponentClaim(
      dshHome,
      ledger,
      entry,
      inspected.backupDirectory
    )
    if (legacyClaim.blockedReason) return { ok: false, reason: legacyClaim.blockedReason }
    if (legacyClaim.candidates) {
      entry.legacyComponentClaim = {
        startedAt: new Date().toISOString(),
        candidates: legacyClaim.candidates
      }
      await writeLedger(dshHome, ledger)
      await resumeLegacyComponentClaim(dshHome, ledger, entry, inspected.backupDirectory)
      inspected = await inspectBackup(dshHome, entry, ledger)
      if (!inspected.canRestore) {
        return { ok: false, reason: inspected.integrityDetail ?? 'claimed component backup is incomplete' }
      }
    }
    const restoreStartedAt = new Date().toISOString()
    entry.restoreStartedAt = restoreStartedAt
    entry.updatedAt = restoreStartedAt
    delete entry.bootVerifiedAt
    delete entry.restoreFailure
    await writeLedger(dshHome, ledger)
    if (
      entry.generationBackups.some((generation) => generation.wasDesired) ||
      existsSync(join(dirname(profilePackageJsonPath(dshHome)), '.generations-migrated'))
    ) {
      await withRegistryLock(dshHome, async () => {
        if (entry.generationBackups.some((generation) => generation.wasDesired)) {
          await restoreGenerationBackup(dshHome, entry, inspected.backupDirectory)
        } else {
          await restoreLegacyBackup(dshHome, entry, inspected.backupDirectory)
        }
      })
    } else {
      await restoreLegacyBackup(dshHome, entry, inspected.backupDirectory)
    }
    await (options.restoreOwnedComponents ?? restorePluginOwnedComponents)({
      dshHome,
      pluginName: entry.pluginName,
      removalId: entry.removalId,
      backupDirectory: inspected.backupDirectory,
      expectedComponents: entry.componentBackups,
      log: note
    })
    const restoredAt = new Date().toISOString()
    const completed = { ...entry, restoredAt, updatedAt: restoredAt }
    delete completed.restoreStartedAt
    delete completed.restoreFailure
    ledger.removals[removalId] = completed
    try {
      await writeLedger(dshHome, ledger)
    } catch (error) {
      ledger.removals[removalId] = entry
      throw error
    }
    note(`[plugin-removal] restored ${entry.pluginName} from recovery backup ${removalId}`)
    return { ok: true }
  } catch (error) {
    const reason = `backup restore failed: ${error instanceof Error ? error.message : String(error)}`
    if (ledger) {
      const entry = ledger.removals[removalId]
      if (entry?.restoreStartedAt !== undefined) {
        entry.restoreFailure = reason
        entry.updatedAt = new Date().toISOString()
        delete entry.bootVerifiedAt
        await writeLedger(dshHome, ledger).catch(() => undefined)
      }
    }
    note(`[plugin-removal] ${reason}`)
    return { ok: false, reason }
  }
}

export async function cleanupVerifiedRemovalBackup(
  dshHome: string,
  removalId: string,
  note: (line: string) => void = () => undefined
): Promise<{ ok: boolean; reason?: string }> {
  let ledger: RemovalLedger
  try {
    ledger = await readLedger(dshHome)
  } catch (error) {
    const reason = `recovery ledger validation failed: ${
      error instanceof Error ? error.message : String(error)
    }`
    note(`[plugin-removal] cleanup blocked: ${reason}`)
    return { ok: false, reason }
  }
  const entry = ledger.removals[removalId]
  if (!entry) return { ok: false, reason: 'no removal recorded for this id' }
  if (entry.status !== 'removed') return { ok: false, reason: 'plugin is not in the removed state' }
  if (entry.backupDeletedAt !== undefined) return { ok: true }
  if (entry.bootVerifiedAt === undefined) {
    return { ok: false, reason: 'plugin has not been boot-verified yet' }
  }
  if (entry.restoreStartedAt !== undefined || entry.legacyComponentClaim !== undefined) {
    return { ok: false, reason: 'plugin restore is incomplete; recovery backup must be kept' }
  }

  let directory: string
  let trash: string
  try {
    directory = await validatedBackupDirectory(dshHome, entry)
    trash = await validatedTrashDirectory(dshHome, entry)
    if (entry.backupCleanupRequestedAt === undefined) {
      if (!existsSync(directory)) throw new Error('backup directory is missing before cleanup starts')
      if (existsSync(trash)) throw new Error('record-specific cleanup trash already exists')
      entry.backupCleanupRequestedAt = new Date().toISOString()
      entry.backupTrashDirectory = trash
      entry.updatedAt = entry.backupCleanupRequestedAt
      await writeLedger(dshHome, ledger)
    }
    if (existsSync(directory)) {
      if (existsSync(trash)) throw new Error('record-specific cleanup trash already exists')
      await mkdir(dirname(trash), { recursive: true })
      await rename(directory, trash)
    }
    if (existsSync(trash)) await rm(trash, { recursive: true, force: true })
    if (existsSync(directory) || existsSync(trash)) {
      throw new Error('backup material still exists after cleanup')
    }
  } catch (error) {
    const detail = `verified backup cleanup failed: ${error instanceof Error ? error.message : error}`
    if (!entry.failures.includes(detail)) entry.failures.push(detail)
    entry.updatedAt = new Date().toISOString()
    await writeLedger(dshHome, ledger).catch(() => undefined)
    note(`[plugin-removal] kept recovery backup ${removalId} for ${entry.pluginName}: ${detail}`)
    return { ok: false, reason: detail }
  }
  entry.backupDeletedAt = new Date().toISOString()
  entry.updatedAt = entry.backupDeletedAt
  delete entry.backupCleanupRequestedAt
  delete entry.backupTrashDirectory
  await writeLedger(dshHome, ledger)
  note(`[plugin-removal] deleted recovery backup ${removalId} for ${entry.pluginName} (user-confirmed)`)
  return { ok: true }
}

export async function removePluginSafely(options: PluginRemovalOptions): Promise<PluginRemovalResult> {
  const now = options.now ?? (() => new Date())
  let entry: RemovalEntry
  try {
    entry = await beginRemoval(options.dshHome, options.pluginName, now)
  } catch (error) {
    const detail = `removal journal could not be started: ${
      error instanceof Error ? error.message : String(error)
    }`
    options.note?.(`[plugin-removal] ${detail}`)
    return {
      pluginName: options.pluginName,
      disabled: false,
      removed: false,
      pending: true,
      failures: [detail]
    }
  }

  try {
    const generationBackups = await ensureBackup(entry, options.dshHome)
    entry = await updateEntry(options.dshHome, entry.removalId, (current) => ({
      ...(current ?? entry),
      generationBackups
    }))
    await disableInManifest(options.dshHome, new Set([options.pluginName]))
    entry = await updateEntry(options.dshHome, entry.removalId, (current) => ({
      ...(current ?? entry),
      status: 'disabled',
      updatedAt: now().toISOString()
    }))
  } catch (error) {
    const detail = `backup/disable failed: ${error instanceof Error ? error.message : error}`
    entry = await markFailure(options.dshHome, entry, 'backup-pending', [detail]).catch(() => entry)
    return {
      removalId: entry.removalId,
      pluginName: options.pluginName,
      disabled: false,
      removed: false,
      pending: true,
      backupDirectory: entry.backupDirectory,
      failures: [detail]
    }
  }

  let cleanup: {
    ok: boolean
    failures: string[]
    componentBackups?: PluginOwnedComponentBackup[]
  } = await options.cleanupOwnedComponents({
    removalId: entry.removalId,
    backupDirectory: entry.backupDirectory
  }).catch((error) => ({
    ok: false,
    failures: [error instanceof Error ? error.message : String(error)]
  }))
  try {
    const componentBackups = await readPluginOwnedComponentBackups(
      entry.backupDirectory,
      entry.removalId,
      entry.pluginName
    )
    if (
      cleanup.componentBackups !== undefined &&
      !sameComponentBackups(cleanup.componentBackups, componentBackups)
    ) {
      throw new Error('component cleanup result does not match its durable recovery manifest')
    }
    entry = await updateEntry(options.dshHome, entry.removalId, (current) => ({
      ...(current ?? entry),
      componentBackups
    }))
  } catch (error) {
    const detail = `component recovery journal failed: ${error instanceof Error ? error.message : String(error)}`
    cleanup = { ok: false, failures: [...cleanup.failures, detail] }
  }
  if (!cleanup.ok) {
    entry = await markFailure(options.dshHome, entry, 'cleanup-pending', cleanup.failures).catch(() => entry)
    return {
      removalId: entry.removalId,
      pluginName: options.pluginName,
      disabled: true,
      removed: false,
      pending: true,
      backupDirectory: entry.backupDirectory,
      failures: cleanup.failures
    }
  }

  let detachedLegacyPlugin = false
  try {
    if (entry.generationBackups.some((generation) => generation.wasDesired)) {
      if (!await options.uninstallGeneration()) {
        const [desired, generations] = await Promise.all([
          readDesired(options.dshHome),
          listGenerations(options.dshHome)
        ])
        const byId = new Map(generations.map((generation) => [generation.id, generation]))
        if (desired.some((id) => byId.get(id)?.pluginName === options.pluginName)) {
          throw new Error('generation pointer could not be disabled')
        }
      }
    } else {
      await detachLegacyPlugin(entry, options.dshHome)
      if (!await verifyDetached(options.dshHome, options.pluginName)) {
        throw new Error('plugin is still present in the active profile')
      }
      detachedLegacyPlugin = true
    }
    await writeBackupIntegrityManifest(entry)
  } catch (error) {
    const detail = `detach failed: ${error instanceof Error ? error.message : error}`
    entry = await markFailure(options.dshHome, entry, 'cleanup-pending', [detail]).catch(() => entry)
    return {
      removalId: entry.removalId,
      pluginName: options.pluginName,
      disabled: true,
      removed: false,
      pending: true,
      backupDirectory: entry.backupDirectory,
      failures: [detail]
    }
  }

  if (detachedLegacyPlugin && options.reconcileLegacyProfile) {
    const reconciliation = await options.reconcileLegacyProfile().catch((error) => ({
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    }))
    if (!reconciliation.ok) {
      const detail = `profile rebuild failed: ${reconciliation.detail ?? 'unknown error'}`
      entry = await markFailure(options.dshHome, entry, 'cleanup-pending', [detail]).catch(() => entry)
      return {
        pluginName: options.pluginName,
        disabled: true,
        removed: false,
        pending: true,
        backupDirectory: entry.backupDirectory,
        failures: [detail]
      }
    }
  }

  try {
    entry = await updateEntry(options.dshHome, entry.removalId, (current) => ({
      ...(current ?? entry),
      status: 'removed',
      updatedAt: now().toISOString(),
      failures: []
    }))
  } catch (error) {
    const detail = `removal commit failed: ${error instanceof Error ? error.message : error}`
    return {
      removalId: entry.removalId,
      pluginName: options.pluginName,
      disabled: true,
      removed: false,
      pending: true,
      backupDirectory: entry.backupDirectory,
      failures: [detail]
    }
  }
  options.note?.(
    `[plugin-removal] removed ${options.pluginName}; recovery backup ${entry.removalId} kept at ${entry.backupDirectory}`
  )
  return {
    removalId: entry.removalId,
    pluginName: options.pluginName,
    disabled: true,
    removed: true,
    pending: false,
    backupDirectory: entry.backupDirectory,
    failures: []
  }
}
