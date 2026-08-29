import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { installGeneration } from 'dsh-desktop-market-installer/generations/installer'
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
 * failure it restores the pre-migration profile and returns without marking
 * complete, so the next launch is no worse off than before the upgrade.
 */

const MARKER = '.generations-migrated'
const SNAPSHOT_SUFFIX = '.pre-generations'

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
async function communityPlugins(dshHome: string): Promise<string[]> {
  const dir = profileDir(dshHome)
  let manifest: {
    dependencies?: Record<string, string>
    dsh?: { profile?: { bundles?: string[] } }
  }
  try {
    manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  } catch {
    return []
  }
  const names = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...(manifest.dsh?.profile?.bundles ?? [])
  ])
  return [...names].filter((name) => !KEEP_IN_SHARED_TREE.has(name))
}

/** The version a plugin is pinned to on disk, falling back to `latest`. */
async function installedSpec(dshHome: string, pluginName: string): Promise<string> {
  try {
    const manifest = JSON.parse(
      await readFile(join(profileDir(dshHome), 'node_modules', pluginName, 'package.json'), 'utf8')
    )
    if (typeof manifest.version === 'string') return `${pluginName}@${manifest.version}`
  } catch {
    // A damaged or missing directory — take the registry's latest.
  }
  return `${pluginName}@latest`
}

async function snapshotProfile(dshHome: string, note: Note): Promise<() => Promise<void>> {
  const dir = profileDir(dshHome)
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
  }
}

async function discardSnapshot(dshHome: string): Promise<void> {
  const dir = profileDir(dshHome)
  for (const name of ['node_modules', 'package.json', 'pnpm-lock.yaml']) {
    await rm(`${join(dir, name)}${SNAPSHOT_SUFFIX}`, { recursive: true, force: true }).catch(
      () => undefined
    )
  }
}

/**
 * Rewrite the manifest to the post-migration shape: dependencies keep only the
 * shared-tree packages, bundles are the in-box set plus the migrated plugin
 * names. The lockfile is dropped so the rebuild resolves the smaller tree
 * cleanly.
 */
async function rewriteManifest(dshHome: string, pluginNames: string[]): Promise<void> {
  const dir = profileDir(dshHome)
  const snapshot = JSON.parse(await readFile(join(dir, `package.json${SNAPSHOT_SUFFIX}`), 'utf8'))
  const keptDeps: Record<string, string> = {}
  for (const [name, spec] of Object.entries(snapshot.dependencies ?? {})) {
    if (KEEP_IN_SHARED_TREE.has(name)) keptDeps[name] = spec as string
  }
  if (keptDeps.dshmarket === undefined) keptDeps.dshmarket = '^1.35.0'

  const inBoxBundles = (snapshot.dsh?.profile?.bundles ?? []).filter((name: string) =>
    KEEP_IN_SHARED_TREE.has(name)
  )
  const next = {
    ...snapshot,
    dependencies: keptDeps,
    dsh: {
      ...snapshot.dsh,
      profile: {
        ...(snapshot.dsh?.profile ?? {}),
        bundles: [...inBoxBundles, ...pluginNames.sort()]
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
  if (isProfileMigrated(dshHome)) return false
  if (!existsSync(join(profileDir(dshHome), 'package.json'))) {
    // No profile yet — nothing to migrate; mark so a fresh install skips this.
    await writeFile(join(profileDir(dshHome), MARKER), `${new Date().toISOString()}\n`, 'utf8').catch(
      () => undefined
    )
    return false
  }

  const plugins = await communityPlugins(dshHome)
  if (plugins.length === 0) {
    note('[desktop] migration: no community plugins to move')
    await writeFile(
      join(profileDir(dshHome), MARKER),
      `${new Date().toISOString()}\n`,
      'utf8'
    )
    return false
  }

  note(`[desktop] migration: moving ${plugins.length} plugin(s) to generations: ${plugins.join(', ')}`)
  const specs = await Promise.all(plugins.map((name) => installedSpec(dshHome, name)))
  const restore = await snapshotProfile(dshHome, note)

  try {
    const generationIds: string[] = []
    for (const spec of specs) {
      const result = await installGeneration({
        dshHome,
        pluginSpec: spec,
        nodeExecutablePath: deps.nodeExecutablePath,
        pnpmEntryPath: deps.pnpmEntryPath,
        onTrace: (line) => note(`[desktop] ${line}`)
      })
      if (!result.ok || result.generation === undefined) {
        throw new Error(`could not install ${spec} as a generation: ${result.detail ?? 'unknown'}`)
      }
      generationIds.push(result.generation.id)
      note(`[desktop] migration: ${spec} -> ${result.generation.id}`)
    }

    await rewriteManifest(dshHome, plugins)
    const rebuild = await deps.reinstallSharedTree()
    if (!rebuild.ok) throw new Error(`shared-tree rebuild failed: ${rebuild.detail ?? 'unknown'}`)

    const existingDesired = await readDesired(dshHome)
    await writeDesired(dshHome, [...new Set([...existingDesired, ...generationIds])])
    await projectGenerations(dshHome)

    await writeFile(
      join(profileDir(dshHome), MARKER),
      `${new Date().toISOString()}\n`,
      'utf8'
    )
    note(`[desktop] migration: complete, ${generationIds.length} generation(s) enabled`)
    // The snapshot stays until the first successful launch confirms the move;
    // the launch path discards it after the window renders.
    return true
  } catch (error) {
    note(
      `[desktop] migration failed, restoring the pre-upgrade profile: ` +
        `${error instanceof Error ? error.message : error}`
    )
    await restore()
    return false
  }
}

/** Called after a migrated profile has rendered a window once. */
export async function confirmMigration(dshHome: string, note: Note): Promise<void> {
  const dir = profileDir(dshHome)
  if (!existsSync(join(dir, `package.json${SNAPSHOT_SUFFIX}`)) && !existsSync(join(dir, `node_modules${SNAPSHOT_SUFFIX}`))) {
    return
  }
  await discardSnapshot(dshHome)
  note('[desktop] migration: pre-upgrade snapshot discarded after a clean launch')
}

/** Roll a failed post-migration launch back to the pre-upgrade profile. */
export async function rollBackMigration(dshHome: string, note: Note): Promise<boolean> {
  const dir = profileDir(dshHome)
  const snapshotExists = ['node_modules', 'package.json', 'pnpm-lock.yaml'].some((name) =>
    existsSync(join(dir, `${name}${SNAPSHOT_SUFFIX}`))
  )
  if (!snapshotExists) return false

  for (const name of ['node_modules', 'package.json', 'pnpm-lock.yaml']) {
    const snap = join(dir, `${name}${SNAPSHOT_SUFFIX}`)
    const live = join(dir, name)
    if (!existsSync(snap)) continue
    await rm(live, { recursive: true, force: true }).catch(() => undefined)
    await rename(snap, live).catch(() => undefined)
  }
  await rm(join(dir, MARKER), { force: true }).catch(() => undefined)
  note('[desktop] migration rolled back to the pre-upgrade profile after a failed launch')
  return true
}
