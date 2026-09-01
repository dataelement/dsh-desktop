import { lstat, mkdir, readFile, readdir, readlink, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
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
 * Generation plugins appear in `dependencies` at their installed version so
 * dsh-market can present them as ordinary installed releases. A root override
 * records the immutable local source, but Desktop's pnpm runner temporarily
 * removes both generated fields before every Profile package operation. pnpm
 * therefore never owns the projected node_modules path.
 *
 * The projection is derived, never authored. Losing it costs a reprojection,
 * not a repair.
 */

/** Packages the desktop shell owns as profile bundles; never projected or pruned. */
const IN_BOX_BUNDLES = new Set(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'])

/** Substring that marks a symlink target as one this projector wrote. */
const GENERATION_LINK_MARKER = join('profiles', '.generations', 'live')

/** Versioned marker for the manifest fields owned by this derived projection. */
const PROJECTION_VERSION = 1

function profileDir(dshHome, profile = 'web') {
  return join(dshHome, 'profiles', profile)
}

function isInsideDirectory(parent, candidate) {
  const nested = relative(parent, candidate)
  return nested === '' || (!nested.startsWith('..') && !isAbsolute(nested))
}

async function validateEnabledGenerationTarget(pluginName, generation) {
  const generationDirectory = resolve(generation.directory)
  const target = resolve(generation.directory, 'node_modules', pluginName)
  if (!isInsideDirectory(generationDirectory, target)) {
    throw new Error(`Enabled generation package path escapes its generation: ${pluginName}`)
  }

  let targetInfo
  try {
    targetInfo = await lstat(target)
  } catch (error) {
    throw new Error(
      `Enabled generation package root is missing or unreadable for ${pluginName}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    )
  }
  if (targetInfo.isSymbolicLink() || !targetInfo.isDirectory()) {
    throw new Error(`Enabled generation package root is not a real directory for ${pluginName}`)
  }
  const canonicalTarget = await realpath(target)
  const canonicalGeneration = await realpath(generationDirectory)
  if (!isInsideDirectory(canonicalGeneration, canonicalTarget)) {
    throw new Error(`Enabled generation package root resolves outside its generation: ${pluginName}`)
  }

  const manifestPath = join(target, 'package.json')
  let manifestInfo
  try {
    manifestInfo = await lstat(manifestPath)
  } catch (error) {
    throw new Error(
      `Enabled generation package manifest is missing or unreadable for ${pluginName}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    )
  }
  if (manifestInfo.isSymbolicLink() || !manifestInfo.isFile()) {
    throw new Error(`Enabled generation package manifest is not a real file for ${pluginName}`)
  }
  const canonicalManifest = await realpath(manifestPath)
  if (!isInsideDirectory(canonicalTarget, canonicalManifest)) {
    throw new Error(`Enabled generation package manifest resolves outside its package: ${pluginName}`)
  }
  return target
}

/** Whether an installed package declares its own `dsh.bundle` patch layer. */
async function declaresBundle(packageDir) {
  const path = join(packageDir, 'package.json')
  let text
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw new Error(
      `Profile dependency manifest could not be read at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    )
  }
  try {
    const manifest = JSON.parse(text)
    return typeof manifest.dsh?.bundle?.patch === 'string'
  } catch (error) {
    throw new Error(
      `Profile dependency manifest is invalid JSON at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    )
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertProfileManifest(manifest, path) {
  if (!isRecord(manifest)) throw new Error(`Profile manifest root is invalid at ${path}.`)
  if (
    manifest.dependencies !== undefined &&
    (
      !isRecord(manifest.dependencies) ||
      !Object.values(manifest.dependencies).every((spec) => typeof spec === 'string')
    )
  ) {
    throw new Error(`Profile manifest dependencies are invalid at ${path}.`)
  }
  if (manifest.dsh !== undefined && !isRecord(manifest.dsh)) {
    throw new Error(`Profile manifest dsh configuration is invalid at ${path}.`)
  }
  if (manifest.dsh?.profile !== undefined && !isRecord(manifest.dsh.profile)) {
    throw new Error(`Profile manifest dsh.profile configuration is invalid at ${path}.`)
  }
  if (
    manifest.dsh?.profile?.bundles !== undefined &&
    (
      !Array.isArray(manifest.dsh.profile.bundles) ||
      !manifest.dsh.profile.bundles.every((name) => typeof name === 'string')
    )
  ) {
    throw new Error(`Profile manifest bundle list is invalid at ${path}.`)
  }
  return manifest
}

async function readProfileManifest(dir) {
  const path = join(dir, 'package.json')
  let current
  try {
    current = await readFile(path, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        current: undefined,
        manifest: { name: 'dsh-profile-web', private: true }
      }
    }
    throw new Error(
      `Profile manifest could not be read at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    )
  }

  let parsed
  try {
    parsed = JSON.parse(current)
  } catch (error) {
    throw new Error(
      `Profile manifest is invalid JSON at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    )
  }
  return { current, manifest: assertProfileManifest(parsed, path) }
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
  const { dir, manifestState, enabled, targets, linkSpecs } =
    await prepareGenerationProjection(dshHome, profile)
  const modulesDir = join(dir, 'node_modules')
  await mkdir(modulesDir, { recursive: true })

  const linked = []
  const projected = new Map()
  for (const [pluginName, generation] of enabled) {
    const target = targets.get(pluginName)
    if (target === undefined) throw new Error(`Enabled generation target was not prevalidated: ${pluginName}`)
    await ensureDirLink(join(modulesDir, pluginName), target)
    linked.push(pluginName)
    projected.set(pluginName, generation)
  }

  const unlinked = await pruneStaleGenerationLinks(modulesDir, projected)
  const bundles = await syncProfileManifest(dir, projected, linkSpecs, manifestState)

  return { linked, unlinked, bundles }
}

/**
 * Publish the desired generation set for inventory and the next launch without
 * touching the active Profile's node_modules. Market operations run inside the
 * live Harness, so replacing even a junction there recreates the Windows
 * rename conflict generations are meant to avoid. The cold-start projector
 * materializes these links after Harness has stopped.
 */
export async function publishGenerationManifest(dshHome, profile = 'web') {
  const { dir, manifestState, enabled, linkSpecs } =
    await prepareGenerationProjection(dshHome, profile)
  const bundles = await syncProfileManifest(dir, enabled, linkSpecs, manifestState, {
    syncBundles: false
  })
  return { plugins: [...enabled.keys()], bundles }
}

/**
 * Expose only generation links whose Profile path does not exist yet.
 *
 * dsh-market validates a successful add against node_modules before it
 * returns control to the user. A brand-new path has no Windows replacement
 * conflict, so it is safe to create for that validation. An existing path is
 * never touched here: updates keep running from the old generation until the
 * next cold start replaces the link.
 */
export async function exposeMissingGenerationLinks(dshHome, profile = 'web') {
  const { dir, manifestState, enabled, targets } = await prepareGenerationProjection(dshHome, profile)
  const modulesDir = join(dir, 'node_modules')
  const linked = []
  for (const [pluginName] of enabled) {
    const linkPath = join(modulesDir, pluginName)
    const target = targets.get(pluginName)
    if (target === undefined) throw new Error(`Enabled generation target was not prevalidated: ${pluginName}`)
    try {
      const info = await lstat(linkPath)
      if (!info.isSymbolicLink()) continue
      const current = await readlink(linkPath).catch(() => '')
      const currentTarget = current === '' ? '' : resolve(dirname(linkPath), current)
      if (currentTarget === target) continue
      const activeBundles = manifestState.manifest.dsh?.profile?.bundles ?? []
      // A generation link left by a rejected/uninstalled pre-restart add is
      // safe to replace on retry: it is neither composed nor desired. Never
      // use this path for an active bundle or for a link another owner wrote.
      if (activeBundles.includes(pluginName) || !currentTarget.includes(GENERATION_LINK_MARKER)) {
        continue
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    await ensureDirLink(linkPath, target)
    linked.push(pluginName)
  }
  return linked
}

async function prepareGenerationProjection(dshHome, profile) {
  const dir = profileDir(dshHome, profile)
  // Validate the authoritative Profile manifest before touching links. A
  // malformed or temporarily unreadable existing file must never be mistaken
  // for an empty Profile and overwritten with a reduced generated manifest.
  const manifestState = await readProfileManifest(dir)
  const enabled = await resolveEnabledGenerations(dshHome)
  const targets = new Map()
  for (const [pluginName, generation] of enabled) {
    targets.set(pluginName, await validateEnabledGenerationTarget(pluginName, generation))
  }
  const linkSpecs = new Map()
  for (const [pluginName, generation] of enabled) {
    const target = targets.get(pluginName)
    if (target === undefined) throw new Error(`Enabled generation target was not prevalidated: ${pluginName}`)
    // This path belongs only to pnpm's root override. The market reads the
    // ordinary dependency version written below and never sees it.
    linkSpecs.set(pluginName, `link:${relative(dir, target).split('\\').join('/')}`)
  }
  return { dir, manifestState, enabled, targets, linkSpecs }
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
 * Rewrite the app-boot bundle list, the market-facing dependency versions,
 * and pnpm's private generation overrides. A small marker records the fields
 * Desktop owns so a disabled generation can be removed after a crash without
 * guessing whether an ordinary version dependency belongs to the user.
 */
async function syncProfileManifest(
  dir,
  enabled,
  linkSpecs,
  manifestState,
  { syncBundles = true } = {}
) {
  const manifestPath = join(dir, 'package.json')
  const { current, manifest } = manifestState

  const previousProjection = manifest.dsh?.desktop?.generationProjection
  const previousPlugins = previousProjection?.version === PROJECTION_VERSION &&
      typeof previousProjection.plugins === 'object' && previousProjection.plugins !== null
    ? previousProjection.plugins
    : {}

  // Real profile dependencies carry through unchanged. Previous generation
  // entries are removed using the explicit ownership marker, then enabled
  // generations are written back at their actual installed versions.
  const currentDeps = manifest.dependencies ?? {}
  const dependencies = { ...currentDeps }
  for (const name of Object.keys(previousPlugins)) {
    delete dependencies[name]
  }
  // Migrate the pre-version-projection shape even when it predates the marker.
  for (const [name, spec] of Object.entries(dependencies)) {
    if (typeof spec === 'string' && spec.includes('.generations/live/')) delete dependencies[name]
  }

  const currentOverrides = manifest.pnpm?.overrides ?? {}
  const overrides = { ...currentOverrides }
  for (const [name, state] of Object.entries(previousPlugins)) {
    if (state?.previousOverride?.present && typeof state.previousOverride.value === 'string') {
      overrides[name] = state.previousOverride.value
    } else {
      delete overrides[name]
    }
  }
  // Clean up an old managed override even if the marker was lost.
  for (const [name, spec] of Object.entries(overrides)) {
    if (typeof spec === 'string' && spec.includes('.generations/live/')) delete overrides[name]
  }

  const projectedPlugins = {}
  for (const [name, generation] of enabled) {
    const previous = previousPlugins[name]
    const currentOverride = currentOverrides[name]
    const previousOverride = previous?.previousOverride ?? (
      typeof currentOverride === 'string' && !currentOverride.includes('.generations/live/')
        ? { present: true, value: currentOverride }
        : { present: false }
    )
    dependencies[name] = generation.version
    overrides[name] = linkSpecs.get(name)
    projectedPlugins[name] = {
      generationId: generation.id,
      visibleVersion: generation.version,
      previousOverride
    }
  }

  // Bundle entries that survive: in-box bundles, plus any kept dependency that
  // declares its own `dsh.bundle` (dshmarket). A bundle-declaring dependency
  // left out of `bundles` makes the consistency check report "installed and
  // declares a bundle, but is not composed", which the app surfaces as a
  // restart prompt on every launch.
  let bundles = [...(manifest.dsh?.profile?.bundles ?? [])]
  if (syncBundles) {
    const declaredBundles = bundles.filter((name) => IN_BOX_BUNDLES.has(name))
    for (const name of Object.keys(dependencies)) {
      if (declaredBundles.includes(name) || enabled.has(name)) continue
      if (await declaresBundle(join(dir, 'node_modules', name))) declaredBundles.push(name)
    }
    const pluginNames = [...enabled.keys()].sort()
    bundles = [...declaredBundles, ...pluginNames]
  }

  const desktop = {
    ...(manifest.dsh?.desktop ?? {})
  }
  if (Object.keys(projectedPlugins).length > 0) {
    desktop.generationProjection = {
      version: PROJECTION_VERSION,
      plugins: projectedPlugins
    }
  } else {
    delete desktop.generationProjection
  }
  const pnpm = {
    ...(manifest.pnpm ?? {})
  }
  if (Object.keys(overrides).length > 0) pnpm.overrides = overrides
  else delete pnpm.overrides
  const dsh = {
    ...manifest.dsh,
    profile: {
      ...(manifest.dsh?.profile ?? {}),
      bundles
    }
  }
  if (Object.keys(desktop).length > 0) dsh.desktop = desktop
  else delete dsh.desktop
  const next = {
    ...manifest,
    dependencies,
    dsh
  }
  if (Object.keys(pnpm).length > 0) next.pnpm = pnpm
  else delete next.pnpm

  const body = `${JSON.stringify(next, undefined, 2)}\n`
  // Only touch the file when it actually changes. The projection runs every
  // launch; rewriting an identical manifest churns its mtime and breaks the
  // `.install-complete` fingerprint for no reason.
  if (current !== body) {
    const temporary = `${manifestPath}.${process.pid}.${Date.now()}.tmp`
    await writeFile(temporary, body, 'utf8')
    await rename(temporary, manifestPath)
  }

  return bundles
}
