import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  installGeneration,
  verifyGenerationPeers
} from 'dsh-desktop-market-installer/generations/installer'
import { projectGenerations } from 'dsh-desktop-market-installer/generations/projection'
import { readDesired, writeDesired } from 'dsh-desktop-market-installer/generations/registry'

/**
 * One-time move of a profile that installed community plugins into the shared
 * hoisted tree over to the generation model.
 *
 * A user upgrading into the new build still has their community plugins in
 * `node_modules` and declared in `dependencies` — which is exactly the state
 * that makes the shared-tree repair hang on Windows. Nothing about the new
 * code fixes that on its own: the generation path only activates for plugins
 * installed *as* generations. This does the move.
 *
 * Runs once, while Harness is stopped, before the shared-tree repair. On any
 * failure it restores the pre-migration profile and records the exact failed
 * input, so later launches keep using the known-working profile until that
 * input changes.
 */

const MARKER = '.generations-migrated'
const DEFER_MARKER = '.generations-deferred.json'
const SNAPSHOT_SUFFIX = '.pre-generations'
const SNAPSHOT_STATE = '.generations-pre-migration.json'
const MIGRATION_PROTOCOL_VERSION = 4
const SNAPSHOT_PROTOCOL_VERSION = 1
const DEFER_RETRY_MS = 6 * 60 * 60 * 1000

const PROFILE_PATHS = [
  'node_modules',
  'package.json',
  'pnpm-lock.yaml',
  '.install-complete'
] as const

type ProfilePathName = (typeof PROFILE_PATHS)[number]
type SnapshotPhase =
  | 'snapshotting'
  | 'awaiting-boot'
  | 'rolling-back'
  | 'rollback-cleanup'
  | 'confirmed'

interface SnapshotPathState {
  name: ProfilePathName
  originallyPresent: boolean
  restored: boolean
  restoreStarted?: boolean
  quarantinePath?: string
}

interface SnapshotState {
  protocol: number
  phase: SnapshotPhase
  desired: string[]
  fingerprint: string
  paths: SnapshotPathState[]
}

/** Packages that stay in the shared tree — never migrated to a generation. */
const KEEP_IN_SHARED_TREE = new Set([
  'dshmarket',
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app'
])

type Note = (line: string) => void

interface MigrationDeps {
  dshHome: string
  nodeExecutablePath: string
  pnpmEntryPath: string
  dshEntryPath: string
  /** Rebuild the shared tree from the rewritten manifest (dshmarket only). */
  reinstallSharedTree: () => Promise<{ ok: boolean; detail?: string }>
  note: Note
}

function profileDir(dshHome: string): string {
  return join(dshHome, 'profiles', 'web')
}

export function isProfileMigrated(dshHome: string): boolean {
  return existsSync(join(profileDir(dshHome), MARKER))
}

/**
 * The community plugin names to migrate: everything declared as a dependency
 * or bundle that is not a package the shared tree keeps. Reading the manifest
 * rather than `node_modules` means a damaged tree does not hide a plugin.
 */
async function profileManifest(dshHome: string): Promise<{
  dependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}> {
  return JSON.parse(await readFile(join(profileDir(dshHome), 'package.json'), 'utf8'))
}

async function communityPlugins(dshHome: string): Promise<string[]> {
  const manifest = await profileManifest(dshHome)
  const names = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...(manifest.dsh?.profile?.bundles ?? [])
  ])
  return [...names].filter((name) => !KEEP_IN_SHARED_TREE.has(name))
}

interface PlannedPlugin {
  name: string
  pluginSpec: string
  sourceSpec: string
  sourceDirectory?: string
  installedManifest: Record<string, unknown>
}

function usesExternalSource(spec: string): boolean {
  return spec.includes(':') || spec.includes('/') || spec.startsWith('.')
}

/**
 * Hash the inputs that can change whether migration succeeds. Reads are
 * lossless strings and missing files become explicit sentinels, so even a
 * malformed or incomplete legacy profile can be deferred without retrying on
 * every launch. The same hash is used before and after plan construction.
 */
async function migrationInputFingerprint(
  dshHome: string,
  plugins: readonly string[] = []
): Promise<string> {
  const root = profileDir(dshHome)
  const readInput = async (path: string): Promise<string> =>
    readFile(path, 'utf8').catch((error: NodeJS.ErrnoException) =>
      `<unreadable:${error.code ?? error.message}>`
    )
  const inputs = await Promise.all([
    readInput(join(root, 'package.json')),
    ...plugins.map((name) => readInput(join(root, 'node_modules', name, 'package.json')))
  ])
  return createHash('sha256').update(JSON.stringify({
    protocol: MIGRATION_PROTOCOL_VERSION,
    plugins,
    inputs
  })).digest('hex')
}

async function migrationPlan(dshHome: string, plugins: readonly string[]): Promise<{
  fingerprint: string
  plugins: PlannedPlugin[]
}> {
  const root = profileDir(dshHome)
  const manifest = await profileManifest(dshHome)
  const planned: PlannedPlugin[] = []
  for (const name of plugins) {
    const packageDir = join(root, 'node_modules', name)
    let installedManifest: Record<string, unknown>
    try {
      installedManifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
    } catch {
      throw new Error(`${name} has no readable installed package manifest`)
    }
    const rawVersion = installedManifest.version
    const version =
      typeof rawVersion === 'string' && rawVersion.trim() !== ''
        ? rawVersion.trim()
        : '0.0.0'
    const declared = manifest.dependencies?.[name]
    const sourceSpec = typeof declared === 'string' ? declared : `${name}@${version}`
    planned.push({
      name,
      pluginSpec: usesExternalSource(sourceSpec) ? sourceSpec : `${name}@${version}`,
      sourceSpec,
      ...(usesExternalSource(sourceSpec) ? { sourceDirectory: packageDir } : {}),
      installedManifest
    })
  }
  const fingerprint = await migrationInputFingerprint(dshHome, plugins)
  return { fingerprint, plugins: planned }
}

async function readDeferredFingerprint(dshHome: string): Promise<string | undefined> {
  try {
    const value = JSON.parse(await readFile(join(profileDir(dshHome), DEFER_MARKER), 'utf8'))
    const retryAfter = typeof value.retryAfter === 'string'
      ? Date.parse(value.retryAfter)
      : Number.NaN
    return value.protocol === MIGRATION_PROTOCOL_VERSION &&
      typeof value.fingerprint === 'string' &&
      Number.isFinite(retryAfter) &&
      retryAfter > Date.now()
      ? value.fingerprint
      : undefined
  } catch {
    return undefined
  }
}

async function writeDeferred(dshHome: string, fingerprint: string, reason: string): Promise<void> {
  const path = join(profileDir(dshHome), DEFER_MARKER)
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await mkdir(profileDir(dshHome), { recursive: true })
  await writeFile(temporary, `${JSON.stringify({
    protocol: MIGRATION_PROTOCOL_VERSION,
    fingerprint,
    reason,
    failedAt: new Date().toISOString(),
    retryAfter: new Date(Date.now() + DEFER_RETRY_MS).toISOString()
  }, undefined, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

function snapshotStatePath(dshHome: string): string {
  return join(profileDir(dshHome), SNAPSHOT_STATE)
}

function snapshotPath(dshHome: string, name: ProfilePathName): string {
  return `${join(profileDir(dshHome), name)}${SNAPSHOT_SUFFIX}`
}

async function writeSnapshotState(dshHome: string, state: SnapshotState): Promise<void> {
  const path = snapshotStatePath(dshHome)
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, `${JSON.stringify(state, undefined, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

/**
 * Write the small migration journal only while a caller-owned synchronous
 * condition still holds. The final check deliberately runs after the
 * temporary file is durable and immediately before the atomic rename, so an
 * asynchronous health check cannot commit a launch that became unhealthy
 * while the journal was being prepared.
 */
async function writeSnapshotStateGuarded(
  dshHome: string,
  state: SnapshotState,
  guard: () => boolean
): Promise<boolean> {
  const path = snapshotStatePath(dshHome)
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  let committed = false
  try {
    await writeFile(temporary, `${JSON.stringify(state, undefined, 2)}\n`, 'utf8')
    if (!guard()) return false
    await rename(temporary, path)
    committed = true
    return true
  } finally {
    if (!committed) await rm(temporary, { force: true }).catch(() => undefined)
  }
}

function isProfilePathName(value: unknown): value is ProfilePathName {
  return typeof value === 'string' && PROFILE_PATHS.includes(value as ProfilePathName)
}

function isExpectedQuarantinePath(
  dshHome: string,
  name: ProfilePathName,
  value: string
): boolean {
  const base = resolve(`${join(profileDir(dshHome), name)}.failed-generations`)
  const candidate = resolve(value)
  return candidate === base || (
    candidate.startsWith(`${base}.`) && /^\d+$/u.test(candidate.slice(base.length + 1))
  )
}

async function readSnapshotState(dshHome: string): Promise<SnapshotState | undefined> {
  try {
    const parsed = JSON.parse(await readFile(snapshotStatePath(dshHome), 'utf8')) as Partial<SnapshotState>
    if (
      parsed.protocol !== SNAPSHOT_PROTOCOL_VERSION ||
      !Array.isArray(parsed.desired) ||
      !parsed.desired.every((entry) => typeof entry === 'string') ||
      typeof parsed.fingerprint !== 'string' ||
      !['snapshotting', 'awaiting-boot', 'rolling-back', 'rollback-cleanup', 'confirmed'].includes(
        parsed.phase ?? ''
      ) ||
      !Array.isArray(parsed.paths)
    ) {
      return undefined
    }
    const paths = parsed.paths.filter((entry): entry is SnapshotPathState =>
      typeof entry === 'object' &&
      entry !== null &&
      isProfilePathName((entry as SnapshotPathState).name) &&
      typeof (entry as SnapshotPathState).originallyPresent === 'boolean' &&
      typeof (entry as SnapshotPathState).restored === 'boolean' &&
      (
        (entry as SnapshotPathState).restoreStarted === undefined ||
        typeof (entry as SnapshotPathState).restoreStarted === 'boolean'
      ) &&
      (
        (entry as SnapshotPathState).quarantinePath === undefined ||
        (
          typeof (entry as SnapshotPathState).quarantinePath === 'string' &&
          isExpectedQuarantinePath(
            dshHome,
            (entry as SnapshotPathState).name,
            (entry as SnapshotPathState).quarantinePath as string
          )
        )
      )
    )
    const pathNames = new Set(paths.map((entry) => entry.name))
    if (
      paths.length !== PROFILE_PATHS.length ||
      pathNames.size !== PROFILE_PATHS.length ||
      !PROFILE_PATHS.every((name) => pathNames.has(name))
    ) {
      return undefined
    }
    return {
      protocol: SNAPSHOT_PROTOCOL_VERSION,
      phase: parsed.phase as SnapshotPhase,
      desired: parsed.desired,
      fingerprint: parsed.fingerprint,
      paths
    }
  } catch {
    return undefined
  }
}

/**
 * Derive the Safe Mode recovery lock from disk without repairing, normalising,
 * or deleting any recovery material. A confirmed journal is a committed
 * migration whose cleanup may safely be retried, so leftover snapshots in
 * that phase do not lock user-managed recovery actions.
 */
export async function inspectMigrationRecoveryLock(dshHome: string): Promise<boolean> {
  const hasJournal = existsSync(snapshotStatePath(dshHome))
  const hasSnapshot = PROFILE_PATHS.some((name) => existsSync(snapshotPath(dshHome, name)))
  if (!hasJournal) return hasSnapshot

  const state = await readSnapshotState(dshHome)
  return state?.phase !== 'confirmed'
}

function legacySnapshotState(
  dshHome: string,
  desired: string[],
  fingerprint: string
): SnapshotState {
  for (const name of ['node_modules', 'package.json'] as const) {
    if (!existsSync(snapshotPath(dshHome, name))) {
      throw new Error(`legacy migration journal cannot prove the original ${name} snapshot`)
    }
  }
  return {
    protocol: SNAPSHOT_PROTOCOL_VERSION,
    phase: 'rolling-back',
    desired,
    fingerprint,
    paths: PROFILE_PATHS.map((name) => {
      const snapshot = snapshotPath(dshHome, name)
      if (name === '.install-complete') {
        // Builds before protocol 3 never snapshotted this marker. Keeping the
        // migrated marker beside a restored legacy manifest would falsely
        // claim that the old package tree was installed to completion.
        return { name, originallyPresent: false, restored: false }
      }
      return {
        name,
        // Old journals did not record absent paths. The two mandatory profile
        // roots above must have snapshots; an absent optional lockfile is safer
        // to regenerate than to mistake a migration-created lock for old data.
        originallyPresent: existsSync(snapshot),
        restored: false
      }
    })
  }
}

async function readSnapshotStateForRecovery(dshHome: string): Promise<SnapshotState | undefined> {
  const current = await readSnapshotState(dshHome)
  if (current !== undefined) return current

  const hasLegacySnapshot = PROFILE_PATHS.some((name) => existsSync(snapshotPath(dshHome, name)))
  const hasLegacyState = existsSync(snapshotStatePath(dshHome))
  if (!hasLegacySnapshot && !hasLegacyState) return undefined
  if (!hasLegacyState) {
    throw new Error('migration snapshots exist without the journal that identifies their original state')
  }

  let desired: string[] = []
  let fingerprint = ''
  let parsed: { protocol?: unknown; desired?: unknown; fingerprint?: unknown } | undefined
  try {
    parsed = JSON.parse(await readFile(snapshotStatePath(dshHome), 'utf8'))
  } catch (error) {
    throw new Error(
      `snapshot journal is unreadable: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  if (parsed?.protocol !== undefined) {
    throw new Error(`unsupported or corrupt snapshot journal protocol ${String(parsed.protocol)}`)
  }
  if (
    !Array.isArray(parsed?.desired) ||
    !parsed.desired.every((entry: unknown) => typeof entry === 'string') ||
    typeof parsed?.fingerprint !== 'string'
  ) {
    throw new Error('legacy snapshot journal is missing desired or fingerprint evidence')
  }
  desired = parsed.desired
  fingerprint = parsed.fingerprint
  const state = legacySnapshotState(dshHome, desired, fingerprint)
  await writeSnapshotState(dshHome, state)
  return state
}

async function snapshotProfile(
  dshHome: string,
  note: Note,
  desired: readonly string[],
  fingerprint: string
): Promise<void> {
  const dir = profileDir(dshHome)
  if (
    existsSync(snapshotStatePath(dshHome)) ||
    PROFILE_PATHS.some((name) => existsSync(snapshotPath(dshHome, name)))
  ) {
    throw new Error('a previous migration snapshot still requires recovery')
  }

  const state: SnapshotState = {
    protocol: SNAPSHOT_PROTOCOL_VERSION,
    phase: 'snapshotting',
    desired: [...desired],
    fingerprint,
    paths: PROFILE_PATHS.map((name) => ({
      name,
      originallyPresent: existsSync(join(dir, name)),
      restored: false
    }))
  }
  await writeSnapshotState(dshHome, state)

  let moved = 0
  for (const entry of state.paths) {
    if (!entry.originallyPresent) continue
    const live = join(dir, entry.name)
    const snapshot = snapshotPath(dshHome, entry.name)
    await rename(live, snapshot)
    moved += 1
  }
  state.phase = 'awaiting-boot'
  await writeSnapshotState(dshHome, state)
  note(`[desktop] migration: snapshotted ${moved} profile path(s)`)
}

async function discardConfirmedSnapshot(dshHome: string, note: Note): Promise<boolean> {
  const state = await readSnapshotState(dshHome)
  if (state?.phase !== 'confirmed') return false

  const failures: string[] = []
  for (const entry of state.paths) {
    for (const path of [snapshotPath(dshHome, entry.name), entry.quarantinePath]) {
      if (!path || !existsSync(path)) continue
      try {
        await rm(path, { recursive: true, force: true })
      } catch (error) {
        failures.push(
          `discard ${entry.name}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }
  if (failures.length > 0) {
    note(`[desktop] migration: confirmed snapshot cleanup deferred: ${failures.join('; ')}`)
    return false
  }
  await rm(snapshotStatePath(dshHome), { force: true })
  await rm(join(profileDir(dshHome), DEFER_MARKER), { force: true })
  note('[desktop] migration: pre-upgrade snapshot discarded after a verified launch')
  return true
}

async function validateGeneration(plugin: PlannedPlugin, generation: { directory: string }): Promise<void> {
  const packageDir = join(generation.directory, 'node_modules', plugin.name)
  const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
  if (manifest.name !== plugin.installedManifest.name || manifest.version !== plugin.installedManifest.version) {
    throw new Error(`${plugin.name} generation does not match the installed package`)
  }
  const patch = manifest.dsh?.bundle?.patch
  if (typeof patch !== 'string' || !existsSync(join(packageDir, patch))) {
    throw new Error(`${plugin.name} generation has no readable bundle patch`)
  }
}

/**
 * Rewrite the manifest to the post-migration shape: dependencies keep only the
 * shared-tree packages, bundles are the in-box set plus the migrated plugin
 * names. The lockfile is dropped so the rebuild resolves the smaller tree
 * cleanly.
 */
async function rewriteManifest(dshHome: string): Promise<void> {
  const dir = profileDir(dshHome)
  const snapshot = JSON.parse(await readFile(join(dir, `package.json${SNAPSHOT_SUFFIX}`), 'utf8'))
  const keptDeps: Record<string, string> = {}
  for (const [name, spec] of Object.entries(snapshot.dependencies ?? {})) {
    if (KEEP_IN_SHARED_TREE.has(name)) keptDeps[name] = spec as string
  }
  if (keptDeps.dshmarket === undefined) keptDeps.dshmarket = '^1.40.0'

  // Bundles are left to projection, which runs next and knows the generations.
  // Here we only trim to the shared-tree packages and keep in-box bundles.
  const keptBundles = (snapshot.dsh?.profile?.bundles ?? []).filter((name: string) =>
    KEEP_IN_SHARED_TREE.has(name)
  )
  const next = {
    ...snapshot,
    dependencies: keptDeps,
    dsh: {
      ...snapshot.dsh,
      profile: {
        ...(snapshot.dsh?.profile ?? {}),
        bundles: keptBundles
      }
    }
  }
  await writeFile(join(dir, 'package.json'), `${JSON.stringify(next, undefined, 2)}\n`, 'utf8')
  await mkdir(join(dir, 'node_modules'), { recursive: true })
}

/**
 * Tri-state outcome of `migrateProfileToGenerations`.
 *
 * The migration has three meaningfully different results, and conflating them
 * is what allowed a deferred-failure to silently fall through to the
 * shared-tree repair and rerun pnpm on a half-migrated profile. The caller
 * must treat each outcome separately:
 *
 * - `migrated`: a full move ran. The pre-upgrade snapshot is still on disk
 *   until the next clean launch discards it. The shared-tree repair is
 *   already done; running it again would rebuild on top of the new tree.
 * - `no-op`: nothing to migrate (already migrated, no community plugins, no
 *   profile yet). The shared-tree repair is the right next step.
 * - `deferred-failure`: a preflight or install errored. The pre-upgrade
 *   profile is intact and the deferred marker is written so this exact
 *   fingerprint retries cleanly. The shared-tree repair must NOT run —
 *   it would re-install on the legacy manifest and clobber the snapshot
 *   state the next launch still needs to recover from.
 */
export type MigrationOutcome =
  | { outcome: 'migrated' }
  | { outcome: 'no-op' }
  | {
      outcome: 'deferred-failure'
      reason: string
      profileState: 'legacy-intact' | 'recovery-required'
    }

export type MigrationRecoveryOutcome =
  | { outcome: 'no-snapshot' }
  | { outcome: 'restored' }
  | { outcome: 'recovery-required'; reason: string }

function noop(): MigrationOutcome {
  return { outcome: 'no-op' }
}

function deferred(
  reason: string,
  profileState: 'legacy-intact' | 'recovery-required' = 'legacy-intact'
): MigrationOutcome {
  return { outcome: 'deferred-failure', reason, profileState }
}

function migrated(): MigrationOutcome {
  return { outcome: 'migrated' }
}

/**
 * Migrate the profile if it has not been migrated yet. Returns a tri-state
 * outcome the caller must interpret before running the shared-tree repair.
 */
export async function migrateProfileToGenerations(deps: MigrationDeps): Promise<MigrationOutcome> {
  const { dshHome, note } = deps
  const recovery = await recoverInterruptedMigration(dshHome, note)
  if (recovery.outcome === 'recovery-required') {
    return deferred(recovery.reason, 'recovery-required')
  }
  if (isProfileMigrated(dshHome)) return noop()
  if (!existsSync(join(profileDir(dshHome), 'package.json'))) {
    // No profile yet — nothing to migrate; mark so a fresh install skips this.
    await writeFile(join(profileDir(dshHome), MARKER), `${new Date().toISOString()}\n`, 'utf8').catch(
      () => undefined
    )
    return noop()
  }

  let plugins: string[]
  try {
    plugins = await communityPlugins(dshHome)
  } catch (error) {
    const reason = `profile manifest is unreadable: ${error instanceof Error ? error.message : error}`
    const fingerprint = await migrationInputFingerprint(dshHome)
    if (await readDeferredFingerprint(dshHome) === fingerprint) {
      note('[desktop] migration deferred: this exact unreadable profile already failed preflight')
      return deferred(reason)
    }
    note(`[desktop] migration deferred before planning: ${reason}`)
    await writeDeferred(dshHome, fingerprint, reason).catch(() => undefined)
    return deferred(reason)
  }
  if (plugins.length === 0) {
    note('[desktop] migration: no community plugins to move')
    await writeFile(
      join(profileDir(dshHome), MARKER),
      `${new Date().toISOString()}\n`,
      'utf8'
    )
    return noop()
  }

  let plan: Awaited<ReturnType<typeof migrationPlan>>
  try {
    plan = await migrationPlan(dshHome, plugins)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    const fingerprint = await migrationInputFingerprint(dshHome, plugins)
    if (await readDeferredFingerprint(dshHome) === fingerprint) {
      note('[desktop] migration deferred: this exact profile already failed preflight')
      return deferred(reason)
    }
    note(`[desktop] migration deferred before staging: ${reason}`)
    await writeDeferred(dshHome, fingerprint, reason).catch(() => undefined)
    return deferred(reason)
  }
  if (await readDeferredFingerprint(dshHome) === plan.fingerprint) {
    note('[desktop] migration deferred: this exact profile already failed preflight')
    return deferred('previously failed preflight for this exact fingerprint')
  }

  note(`[desktop] migration: moving ${plugins.length} plugin(s) to generations: ${plugins.join(', ')}`)
  let previousDesired: string[]
  try {
    previousDesired = await readDesired(dshHome)
  } catch (error) {
    const reason = `generation pointer is unreadable before migration: ${
      error instanceof Error ? error.message : String(error)
    }`
    note(`[desktop] migration deferred before staging: ${reason}`)
    await writeDeferred(dshHome, plan.fingerprint, reason).catch(() => undefined)
    return deferred(reason)
  }
  try {
    const generationIds: string[] = []
    // Preflight every plugin while the working legacy profile is still intact.
    // Promoted generations are inert until desired.json moves, so a failure here
    // leaves startup on the exact tree that was already working.
    for (const plugin of plan.plugins) {
      const result = await installGeneration({
        dshHome,
        pluginSpec: plugin.pluginSpec,
        expectedPluginName: plugin.name,
        sourceSpec: plugin.sourceSpec,
        sourceDirectory: plugin.sourceDirectory,
        nodeExecutablePath: deps.nodeExecutablePath,
        pnpmEntryPath: deps.pnpmEntryPath,
        onTrace: (line) => note(`[desktop] ${line}`)
      })
      if (!result.ok || result.generation === undefined) {
        throw new Error(`could not stage ${plugin.name}: ${result.detail ?? 'unknown'}`)
      }
      await validateGeneration(plugin, result.generation)
      const peers = await verifyGenerationPeers(dshHome, result.generation)
      if (!peers.ok) throw new Error(`${plugin.name} failed peer validation: ${peers.problems.join('; ')}`)
      generationIds.push(result.generation.id)
      note(`[desktop] migration: ${plugin.name} -> ${result.generation.id}`)
    }

    await snapshotProfile(dshHome, note, previousDesired, plan.fingerprint)
    // Trim the manifest to the shared-tree packages and drop the lockfile, then
    // let projection add the generations back as visible version deps, private
    // pnpm overrides, bundles, and symlinks. The Desktop pnpm runner hides the
    // generation-owned fields during the shared-tree rebuild, then restores
    // them so `.install-complete` sees the final market-facing manifest.
    await rewriteManifest(dshHome)
    const existingDesired = await readDesired(dshHome)
    await writeDesired(dshHome, [...new Set([...existingDesired, ...generationIds])])
    await projectGenerations(dshHome)

    const rebuild = await deps.reinstallSharedTree()
    if (!rebuild.ok) throw new Error(`shared-tree rebuild failed: ${rebuild.detail ?? 'unknown'}`)

    await writeFile(
      join(profileDir(dshHome), MARKER),
      `${new Date().toISOString()}\n`,
      'utf8'
    )
    await rm(join(profileDir(dshHome), DEFER_MARKER), { force: true }).catch(() => undefined)
    note(`[desktop] migration: complete, ${generationIds.length} generation(s) enabled`)
    // The snapshot stays until the first successful launch confirms the move;
    // the launch path discards it only after the renderer health handshake and
    // stability window both complete.
    return migrated()
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    note(
      `[desktop] migration failed, restoring the pre-upgrade profile: ` +
        reason
    )
    let snapshot: SnapshotState | undefined
    try {
      snapshot = await readSnapshotStateForRecovery(dshHome)
    } catch (snapshotError) {
      const combined = `${reason}; migration recovery journal could not be loaded: ${
        snapshotError instanceof Error ? snapshotError.message : String(snapshotError)
      }`
      note(`[desktop] migration recovery required: ${combined}`)
      return deferred(combined, 'recovery-required')
    }
    if (snapshot !== undefined) {
      const rollback = await rollBackMigration(dshHome, note, reason)
      if (rollback.outcome === 'recovery-required') {
        const combined = `${reason}; ${rollback.reason}`
        await writeDeferred(dshHome, plan.fingerprint, combined).catch(() => undefined)
        return deferred(combined, 'recovery-required')
      }
    }
    await writeDeferred(dshHome, plan.fingerprint, reason).catch(() => undefined)
    return deferred(reason)
  }
}

/** Restore a crash-interrupted migration before projection or repair touches the profile. */
export async function recoverInterruptedMigration(
  dshHome: string,
  note: Note
): Promise<MigrationRecoveryOutcome> {
  let state: SnapshotState | undefined
  try {
    state = await readSnapshotStateForRecovery(dshHome)
  } catch (error) {
    const reason = `migration recovery journal is unreadable: ${
      error instanceof Error ? error.message : String(error)
    }`
    note(`[desktop] ${reason}`)
    return { outcome: 'recovery-required', reason }
  }
  if (state === undefined) return { outcome: 'no-snapshot' }
  if (state.phase === 'confirmed') {
    await discardConfirmedSnapshot(dshHome, note).catch((error) => {
      note(
        `[desktop] migration: confirmed snapshot cleanup deferred: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    })
    return { outcome: 'no-snapshot' }
  }
  return rollBackMigration(
    dshHome,
    note,
    'an interrupted migration was found before normal profile maintenance'
  )
}

/** Called only after the normal renderer reports a healthy application shell. */
export async function confirmMigration(
  dshHome: string,
  note: Note,
  healthy: () => boolean = () => true
): Promise<boolean> {
  if (!healthy()) return false
  const state = await readSnapshotState(dshHome)
  if (state?.phase !== 'awaiting-boot' || !isProfileMigrated(dshHome)) return false

  // Persist the commit decision before deleting anything. If cleanup is only
  // partly successful, the next launch sees `confirmed` and retries deletion;
  // it never interprets a leftover suffix as a rollback request.
  state.phase = 'confirmed'
  if (!(await writeSnapshotStateGuarded(dshHome, state, healthy))) {
    note('[desktop] migration confirmation cancelled: normal Profile is no longer healthy')
    return false
  }
  return discardConfirmedSnapshot(dshHome, note)
}

async function nextQuarantinePath(live: string): Promise<string> {
  const base = `${live}.failed-generations`
  if (!existsSync(base)) return base
  for (let suffix = 1; suffix < 10_000; suffix += 1) {
    const candidate = `${base}.${suffix}`
    if (!existsSync(candidate)) return candidate
  }
  throw new Error(`could not allocate rollback quarantine for ${live}`)
}

function recoveryRequired(reason: string): MigrationRecoveryOutcome {
  return { outcome: 'recovery-required', reason }
}

/**
 * Roll a failed post-migration launch back to the pre-upgrade profile.
 *
 * Every path is journaled and restored independently. The migrated live path
 * is renamed aside before the snapshot is activated, so an EPERM/EBUSY never
 * destroys either copy. A later launch resumes completed steps from the
 * journal. Only after the profile paths, desired pointer, migration marker,
 * install-complete marker, and deferred marker are all verified do we clear
 * the journal.
 */
export async function rollBackMigration(
  dshHome: string,
  note: Note,
  failureReason = 'the migrated profile did not reach a healthy rendered window'
): Promise<MigrationRecoveryOutcome> {
  const dir = profileDir(dshHome)
  let state: SnapshotState | undefined
  try {
    state = await readSnapshotStateForRecovery(dshHome)
  } catch (error) {
    const reason = `migration recovery journal could not be loaded: ${
      error instanceof Error ? error.message : String(error)
    }`
    note(`[desktop] migration rollback incomplete: ${reason}`)
    return recoveryRequired(reason)
  }
  if (state === undefined) return { outcome: 'no-snapshot' }
  if (state.phase === 'confirmed') return { outcome: 'no-snapshot' }

  if (state.phase === 'snapshotting') {
    // A crash can interrupt snapshotProfile between any two atomic renames.
    // A path whose snapshot does not exist but whose original live path still
    // does was never moved; journal it as already restored before changing the
    // phase. Persisting this inference makes another crash during rollback
    // resumable instead of losing the only indication that the live path is
    // the pre-migration copy.
    for (const entry of state.paths) {
      const live = join(dir, entry.name)
      const snapshot = snapshotPath(dshHome, entry.name)
      if (entry.originallyPresent && !existsSync(snapshot) && existsSync(live)) {
        entry.restored = true
      } else if (!entry.originallyPresent && !existsSync(live) && !existsSync(snapshot)) {
        entry.restored = true
      }
    }
  }

  state.phase = state.phase === 'rollback-cleanup' ? 'rollback-cleanup' : 'rolling-back'
  try {
    await writeSnapshotState(dshHome, state)
  } catch (error) {
    const reason = `rollback journal could not be updated: ${
      error instanceof Error ? error.message : String(error)
    }`
    note(`[desktop] migration rollback incomplete, snapshot preserved: ${reason}`)
    return recoveryRequired(reason)
  }

  const failures: string[] = []
  if (state.phase !== 'rollback-cleanup') for (const entry of state.paths) {
    const live = join(dir, entry.name)
    const snapshot = snapshotPath(dshHome, entry.name)

    if (entry.restored) {
      if (entry.originallyPresent && !existsSync(live)) {
        failures.push(`verify ${entry.name}: restored live path is missing`)
      }
      if (!entry.originallyPresent && existsSync(live)) {
        failures.push(`verify ${entry.name}: path should be absent after rollback`)
      }
      continue
    }

    if (entry.originallyPresent && !existsSync(snapshot)) {
      // `restoreStarted` is persisted before snapshot -> live. It proves that
      // an existing live path is the restored original even when this path had
      // no migrated live value to quarantine (for example .install-complete).
      // A quarantine remains independent corroborating evidence for paths that
      // did have a migrated value.
      if (
        existsSync(live) &&
        entry.restoreStarted === true &&
        (
          entry.quarantinePath === undefined ||
          existsSync(entry.quarantinePath)
        )
      ) {
        entry.restored = true
        try {
          await writeSnapshotState(dshHome, state)
        } catch (error) {
          failures.push(
            `journal ${entry.name}: ${error instanceof Error ? error.message : String(error)}`
          )
        }
        continue
      }
      failures.push(`restore ${entry.name}: expected snapshot is missing`)
      continue
    }

    if (existsSync(live)) {
      try {
        if (!entry.quarantinePath) {
          entry.quarantinePath = await nextQuarantinePath(live)
          await writeSnapshotState(dshHome, state)
        }
        if (!existsSync(entry.quarantinePath)) await rename(live, entry.quarantinePath)
      } catch (error) {
        failures.push(
          `quarantine ${entry.name}: ${error instanceof Error ? error.message : String(error)}`
        )
        continue
      }
    }

    if (entry.originallyPresent) {
      try {
        if (entry.restoreStarted !== true) {
          entry.restoreStarted = true
          await writeSnapshotState(dshHome, state)
        }
        await rename(snapshot, live)
      } catch (error) {
        failures.push(
          `restore ${entry.name}: ${error instanceof Error ? error.message : String(error)}`
        )
        // The active migrated path is safely quarantined and the snapshot is
        // still present. Do not put the unverified migrated tree back.
        continue
      }
      if (existsSync(snapshot) || !existsSync(live)) {
        failures.push(`verify ${entry.name}: snapshot/live state does not match a completed restore`)
        continue
      }
    } else if (existsSync(live)) {
      failures.push(`verify ${entry.name}: migration-created path is still active`)
      continue
    }

    entry.restored = true
    try {
      await writeSnapshotState(dshHome, state)
    } catch (error) {
      failures.push(
        `journal ${entry.name}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  if (failures.length === 0 && state.paths.some((entry) => !entry.restored)) {
    failures.push('rollback journal still contains incomplete paths')
  }

  if (failures.length === 0) {
    try {
      await writeDesired(dshHome, state.desired)
      if ((await readDesired(dshHome)).join('\0') !== [...state.desired].sort().join('\0')) {
        throw new Error('desired generation pointer did not match the pre-migration value')
      }
      await rm(join(dir, MARKER), { force: true })
      if (existsSync(join(dir, MARKER))) throw new Error('migration marker is still present')
      if (!state.fingerprint) {
        const plugins = await communityPlugins(dshHome)
        state.fingerprint = await migrationInputFingerprint(dshHome, plugins)
      }
      await writeDeferred(dshHome, state.fingerprint, failureReason)
      state.phase = 'rollback-cleanup'
      await writeSnapshotState(dshHome, state)
    } catch (error) {
      failures.push(`commit rollback: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (failures.length > 0) {
    const reason = `rollback could not be verified: ${failures.join('; ')}`
    if (state.fingerprint) {
      await writeDeferred(dshHome, state.fingerprint, reason).catch((error) => {
        failures.push(
          `record deferred recovery: ${error instanceof Error ? error.message : String(error)}`
        )
      })
    }
    note(`[desktop] migration rollback incomplete, recovery material preserved: ${failures.join('; ')}`)
    return recoveryRequired(reason)
  }

  for (const entry of state.paths) {
    if (!entry.quarantinePath || !existsSync(entry.quarantinePath)) continue
    try {
      await rm(entry.quarantinePath, { recursive: true, force: true })
      if (existsSync(entry.quarantinePath)) {
        throw new Error('quarantined path still exists after cleanup')
      }
    } catch (error) {
      failures.push(
        `cleanup quarantined ${entry.name}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  if (failures.length > 0) {
    const reason = `rollback cleanup could not be verified: ${failures.join('; ')}`
    note(`[desktop] migration rollback cleanup deferred, journal preserved: ${failures.join('; ')}`)
    return recoveryRequired(reason)
  }
  try {
    await rm(snapshotStatePath(dshHome), { force: true })
    if (existsSync(snapshotStatePath(dshHome))) throw new Error('rollback journal is still present')
  } catch (error) {
    const reason = `rollback journal cleanup failed: ${
      error instanceof Error ? error.message : String(error)
    }`
    note(`[desktop] migration rollback cleanup deferred: ${reason}`)
    return recoveryRequired(reason)
  }
  note('[desktop] migration rolled back to the verified pre-upgrade profile')
  return { outcome: 'restored' }
}
