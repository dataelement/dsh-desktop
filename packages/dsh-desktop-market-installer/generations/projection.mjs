import { existsSync } from 'node:fs'
import { lstat, mkdir, readFile, readdir, readlink, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { resolveEnabledGenerations } from './registry.mjs'

/**
 * Make the enabled generations visible to Harness without teaching Harness
 * about generations.
 *
 * `dsh-app-boot` resolves every `dsh.profile.bundles` entry by walking
 * `node_modules` from the profile directory, and it does this in `loadProfile`
 * — before any plugin code, before the loader's import fallback. So the
 * registry cannot be the only state yet: the profile's `package.json` and its
 * `node_modules/<plugin>` still have to look the way Harness expects.
 *
 * This projects the registry onto that shape:
 *
 *   - `node_modules/<pluginName>` becomes a link into the generation, so
 *     `resolveBundleDir` finds the package and reads its `dsh.bundle`, and the
 *     plugin's own code runs from a realpath whose parent walk reaches
 *     `$DSH_HOME/profiles/node_modules` for its peers.
 *
 *   - `dsh.profile.bundles` lists exactly the enabled plugins, so the
 *     consistency check, recovery, and inventory — all of which read this
 *     contract — agree with what is actually linked.
 *
 * Generation plugins go in `bundles` but never in `dependencies`. `bundles`
 * is what `resolveBundleDir` reads, and it resolves through the symlink this
 * projector writes. `dependencies` is what `pnpm install` acts on — listing a
 * generation there makes the shared-tree repair try to install it into
 * `node_modules` over the symlink, which is the exact Windows rename-over-
 * existing that the generation model exists to avoid.
 *
 * The projection is derived, never authored. Losing it costs a reprojection,
 * not a repair.
 */

/** Packages the desktop shell owns as profile bundles; never projected or pruned. */
const IN_BOX_BUNDLES = new Set(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'])

/** Substring that marks a symlink target as one this projector wrote. */
const GENERATION_LINK_MARKER = join('profiles', '.generations', 'live')

function profileDir(dshHome, profile = 'web') {
  return join(dshHome, 'profiles', profile)
}

/** Whether an installed package declares its own `dsh.bundle` patch layer. */
async function declaresBundle(packageDir) {
  try {
    const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
    return typeof manifest.dsh?.bundle?.patch === 'string'
  } catch {
    return false
  }
}

/**
 * A directory link that works on Windows without Developer Mode. `junction`
 * targets must be absolute; they behave as symlinks for module resolution.
 */
async function ensureDirLink(linkPath, target) {
  try {
    const stat = await lstat(linkPath)
    if (stat.isSymbolicLink()) {
      const resolved = await readlink(linkPath).catch(() => '')
      if (resolved === target) return
    }
    await rm(linkPath, { recursive: true, force: true })
  } catch {
    // linkPath does not exist yet
  }
  await mkdir(dirname(linkPath), { recursive: true })
  await symlink(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir')
}

/**
 * Point `profiles/<profile>/node_modules/<plugin>` at each enabled generation
 * and drop links for plugins no longer enabled. Real pnpm-managed entries and
 * in-box bundles are left untouched.
 */
export async function projectGenerations(dshHome, profile = 'web') {
  const enabled = await resolveEnabledGenerations(dshHome)
  const dir = profileDir(dshHome, profile)
  const modulesDir = join(dir, 'node_modules')
  await mkdir(modulesDir, { recursive: true })

  const linked = []
  const linkSpecs = new Map()
  for (const [pluginName, generation] of enabled) {
    const target = join(generation.directory, 'node_modules', pluginName)
    if (!existsSync(target)) continue
    await ensureDirLink(join(modulesDir, pluginName), target)
    linked.push(pluginName)
    // A `link:` spec is what makes the market's readInstalled() (which reads
    // `dependencies`) see the plugin, while telling `pnpm install` the target
    // is already a local directory to symlink — never something to fetch or
    // rename over.
    linkSpecs.set(pluginName, `link:${relative(dir, target).split('\\').join('/')}`)
  }

  const unlinked = await pruneStaleGenerationLinks(modulesDir, enabled)
  const bundles = await syncProfileManifest(dir, enabled, linkSpecs)

  return { linked, unlinked, bundles }
}

/**
 * Remove links this projector wrote for plugins that are no longer enabled. A
 * link is ours if it is a symlink whose target sits under the generations
 * tree; a real directory or a pnpm link elsewhere is never touched.
 */
async function pruneStaleGenerationLinks(modulesDir, enabled) {
  const removed = []

  const scan = async (base, prefix) => {
    let entries
    try {
      entries = await readdir(base, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      const full = join(base, entry.name)
      if (entry.name.startsWith('@') && !prefix) {
        await scan(full, entry.name)
        continue
      }
      if (!entry.isSymbolicLink()) continue
      const target = await readlink(full).catch(() => '')
      if (!target.includes(GENERATION_LINK_MARKER)) continue
      if (!enabled.has(name)) {
        await rm(full, { recursive: true, force: true }).catch(() => undefined)
        removed.push(name)
      }
    }
  }

  await scan(modulesDir, '')
  return removed
}

/**
 * Rewrite `dsh.profile.bundles` and `dependencies` so both the app-boot
 * contract and the market's `readInstalled()` agree with the projection.
 * In-box bundles keep their place at the front; the enabled generations
 * follow, and each is also a `link:` dependency pointing at its generation.
 */
async function syncProfileManifest(dir, enabled, linkSpecs = new Map()) {
  const manifestPath = join(dir, 'package.json')
  let manifest = {}
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    manifest = { name: 'dsh-profile-web', private: true }
  }

  // Real pnpm dependencies the profile already had (dshmarket, anything from
  // the old shared-tree path) carry through unchanged. Each enabled generation
  // becomes a `link:` dependency: the market sees it as installed, and
  // `pnpm install` treats a `link:` target as an existing local directory to
  // symlink rather than something to fetch or rename a directory over.
  const currentDeps = manifest.dependencies ?? {}
  const dependencies = {}
  for (const [name, spec] of Object.entries(currentDeps)) {
    // Drop a generation `link:` dep whose plugin is no longer enabled; the
    // enabled ones are re-added from linkSpecs below.
    if (typeof spec === 'string' && spec.includes('.generations/live/')) continue
    if (!enabled.has(name)) dependencies[name] = spec
  }
  for (const [name, spec] of linkSpecs) {
    dependencies[name] = spec
  }

  // Bundle entries that survive: in-box bundles, plus any kept dependency that
  // declares its own `dsh.bundle` (dshmarket). A bundle-declaring dependency
  // left out of `bundles` makes the consistency check report "installed and
  // declares a bundle, but is not composed", which the app surfaces as a
  // restart prompt on every launch.
  const declaredBundles = (manifest.dsh?.profile?.bundles ?? []).filter((name) =>
    IN_BOX_BUNDLES.has(name)
  )
  for (const name of Object.keys(dependencies)) {
    if (declaredBundles.includes(name) || linkSpecs.has(name)) continue
    if (await declaresBundle(join(dir, 'node_modules', name))) declaredBundles.push(name)
  }
  const pluginNames = [...enabled.keys()].sort()
  const bundles = [...declaredBundles, ...pluginNames]

  const next = {
    ...manifest,
    dependencies,
    dsh: {
      ...manifest.dsh,
      profile: {
        ...(manifest.dsh?.profile ?? {}),
        bundles
      }
    }
  }

  const body = `${JSON.stringify(next, undefined, 2)}\n`
  // Only touch the file when it actually changes. The projection runs every
  // launch; rewriting an identical manifest churns its mtime and breaks the
  // `.install-complete` fingerprint for no reason.
  let current
  try {
    current = await readFile(manifestPath, 'utf8')
  } catch {
    current = undefined
  }
  if (current !== body) {
    const temporary = `${manifestPath}.${process.pid}.${Date.now()}.tmp`
    await writeFile(temporary, body, 'utf8')
    await rename(temporary, manifestPath)
  }

  return bundles
}
