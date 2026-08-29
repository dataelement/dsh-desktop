import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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
const MIGRATION_PROTOCOL_VERSION = 2

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
    const version = installedManifest.version
    if (typeof version !== 'string') throw new Error(`${name} has no installed version`)
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
    return value.protocol === MIGRATION_PROTOCOL_VERSION && typeof value.fingerprint === 'string'
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
    failedAt: new Date().toISOString()
  }, undefined, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

async function snapshotProfile(
  dshHome: string,
  note: Note,
  desired: readonly string[],
  fingerprint: string
): Promise<() => Promise<void>> {
  const dir = profileDir(dshHome)
  await writeFile(join(dir, SNAPSHOT_STATE), `${JSON.stringify({ desired, fingerprint }, undefined, 2)}\n`)
  const moves: Array<[string, string]> = []
  for (const name of ['node_modules', 'package.json', 'pnpm-lock.yaml']) {
    const from = join(dir, name)
    if (!existsSync(from)) continue
    const to = `${from}${SNAPSHOT_SUFFIX}`
    await rm(to, { recursive: true, force: true }).catch(() => undefined)
    await rename(from, to)
    moves.push([to, from])
  }
  note(`[desktop] migration: snapshotted ${moves.length} profile path(s)`)
  return async () => {
    for (const [from, to] of moves) {
      await rm(to, { recursive: true, force: true }).catch(() => undefined)
      await rename(from, to).catch(() => undefined)
    }
    await writeDesired(dshHome, [...desired])
    await rm(join(dir, MARKER), { force: true }).catch(() => undefined)
    await rm(join(dir, SNAPSHOT_STATE), { force: true }).catch(() => undefined)
  }
}

async function discardSnapshot(dshHome: string): Promise<void> {
  const dir = profileDir(dshHome)
  for (const name of ['node_modules', 'package.json', 'pnpm-lock.yaml']) {
    await rm(`${join(dir, name)}${SNAPSHOT_SUFFIX}`, { recursive: true, force: true }).catch(
      () => undefined
    )
  }
  await rm(join(dir, SNAPSHOT_STATE), { force: true }).catch(() => undefined)
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
  if (keptDeps.dshmarket === undefined) keptDeps.dshmarket = '^1.35.0'

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
 * Migrate the profile if it has not been migrated yet. Returns whether a
 * migration ran (so the caller can skip the shared-tree repair it replaces).
 */
export async function migrateProfileToGenerations(deps: MigrationDeps): Promise<boolean> {
  const { dshHome, note } = deps
  await recoverInterruptedMigration(dshHome, note)
  if (isProfileMigrated(dshHome)) return false
  if (!existsSync(join(profileDir(dshHome), 'package.json'))) {
    // No profile yet — nothing to migrate; mark so a fresh install skips this.
    await writeFile(join(profileDir(dshHome), MARKER), `${new Date().toISOString()}\n`, 'utf8').catch(
      () => undefined
    )
    return false
  }

  let plugins: string[]
  try {
    plugins = await communityPlugins(dshHome)
  } catch (error) {
    const reason = `profile manifest is unreadable: ${error instanceof Error ? error.message : error}`
    const fingerprint = await migrationInputFingerprint(dshHome)
    if (await readDeferredFingerprint(dshHome) === fingerprint) {
      note('[desktop] migration deferred: this exact unreadable profile already failed preflight')
      return false
    }
    note(`[desktop] migration deferred before planning: ${reason}`)
    await writeDeferred(dshHome, fingerprint, reason).catch(() => undefined)
    return false
  }
  if (plugins.length === 0) {
    note('[desktop] migration: no community plugins to move')
    await writeFile(
      join(profileDir(dshHome), MARKER),
      `${new Date().toISOString()}\n`,
      'utf8'
    )
    return false
  }

  let plan: Awaited<ReturnType<typeof migrationPlan>>
  try {
    plan = await migrationPlan(dshHome, plugins)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    const fingerprint = await migrationInputFingerprint(dshHome, plugins)
    if (await readDeferredFingerprint(dshHome) === fingerprint) {
      note('[desktop] migration deferred: this exact profile already failed preflight')
      return false
    }
    note(`[desktop] migration deferred before staging: ${reason}`)
    await writeDeferred(dshHome, fingerprint, reason).catch(() => undefined)
    return false
  }
  if (await readDeferredFingerprint(dshHome) === plan.fingerprint) {
    note('[desktop] migration deferred: this exact profile already failed preflight')
    return false
  }

  note(`[desktop] migration: moving ${plugins.length} plugin(s) to generations: ${plugins.join(', ')}`)
  const previousDesired = await readDesired(dshHome)
  let restore: (() => Promise<void>) | undefined
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

    restore = await snapshotProfile(dshHome, note, previousDesired, plan.fingerprint)
    // Trim the manifest to the shared-tree packages and drop the lockfile, then
    // let projection add the generations back as `link:` deps + bundles and
    // write the symlinks — all before the rebuild, so `pnpm install` sees the
    // final manifest and its `.install-complete` fingerprint matches.
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
    // the launch path discards it after the window renders.
    return true
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    note(
      `[desktop] migration failed, restoring the pre-upgrade profile: ` +
        reason
    )
    if (restore) await restore()
    await writeDeferred(dshHome, plan.fingerprint, reason).catch(() => undefined)
    return false
  }
}

/** Restore a crash-interrupted migration before projection or repair touches the profile. */
export async function recoverInterruptedMigration(dshHome: string, note: Note): Promise<boolean> {
  const dir = profileDir(dshHome)
  const interrupted = ['node_modules', 'package.json', 'pnpm-lock.yaml'].some((name) =>
    existsSync(join(dir, `${name}${SNAPSHOT_SUFFIX}`))
  )
  return interrupted ? rollBackMigration(dshHome, note) : false
}

/** Called after a migrated profile has rendered a window once. */
export async function confirmMigration(dshHome: string, note: Note): Promise<void> {
  const dir = profileDir(dshHome)
  if (!existsSync(join(dir, `package.json${SNAPSHOT_SUFFIX}`)) && !existsSync(join(dir, `node_modules${SNAPSHOT_SUFFIX}`))) {
    return
  }
  await discardSnapshot(dshHome)
  await rm(join(dir, DEFER_MARKER), { force: true }).catch(() => undefined)
  note('[desktop] migration: pre-upgrade snapshot discarded after a clean launch')
}

/** Roll a failed post-migration launch back to the pre-upgrade profile. */
export async function rollBackMigration(dshHome: string, note: Note): Promise<boolean> {
  const dir = profileDir(dshHome)
  const snapshotExists = ['node_modules', 'package.json', 'pnpm-lock.yaml'].some((name) =>
    existsSync(join(dir, `${name}${SNAPSHOT_SUFFIX}`))
  )
  if (!snapshotExists) return false

  let previousDesired: string[] | undefined
  let fingerprint: string | undefined
  try {
    const state = JSON.parse(await readFile(join(dir, SNAPSHOT_STATE), 'utf8'))
    if (Array.isArray(state.desired)) previousDesired = state.desired.filter((id: unknown) => typeof id === 'string')
    if (typeof state.fingerprint === 'string') fingerprint = state.fingerprint
  } catch {}

  for (const name of ['node_modules', 'package.json', 'pnpm-lock.yaml']) {
    const snap = join(dir, `${name}${SNAPSHOT_SUFFIX}`)
    const live = join(dir, name)
    if (!existsSync(snap)) continue
    await rm(live, { recursive: true, force: true }).catch(() => undefined)
    await rename(snap, live).catch(() => undefined)
  }
  if (previousDesired !== undefined) await writeDesired(dshHome, previousDesired)
  await rm(join(dir, MARKER), { force: true }).catch(() => undefined)
  await rm(join(dir, SNAPSHOT_STATE), { force: true }).catch(() => undefined)
  if (fingerprint) {
    await writeDeferred(dshHome, fingerprint, 'the migrated profile did not reach a rendered window').catch(
      () => undefined
    )
  }
  note('[desktop] migration rolled back to the pre-upgrade profile after a failed launch')
  return true
}
