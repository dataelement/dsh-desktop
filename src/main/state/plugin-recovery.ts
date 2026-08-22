import { existsSync } from 'node:fs'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { parse } from 'yaml'
import { removeTree } from './remove-tree'
import { bundleEntryIds, prunePatchLayer } from './patch-layer'

/**
 * Directories under the profile's node_modules that no longer belong to any
 * package: pnpm's `<pkg>_tmp_<pid>_<n>` staging left by an interrupted run,
 * and the `<pkg>.dsh-old-<ts>` copies the packaged pnpm runner moves aside
 * when Windows refuses to replace a directory still held open. Both are only
 * safely removable before Harness starts, which is when this sweep runs.
 */
export function isDisposableModuleDirectory(name: string): boolean {
  return name.includes('_tmp_') || name.includes('.dsh-old-')
}

export function profilePackageJsonPath(dshHome: string): string {
  return join(dshHome, 'profiles', 'web', 'package.json')
}

export function profileCordisPatchPath(dshHome: string): string {
  return join(dshHome, 'profiles', 'web', 'cordis.patch.yml')
}

interface ProfileManifest {
  name?: string
  private?: boolean
  dependencies?: Record<string, string>
  dsh?: {
    profile?: {
      bundles?: string[]
    }
  }
}

interface BundleManifest {
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  dsh?: {
    bundle?: {
      patch?: string
    }
  }
}

interface ProfileLockfile {
  importers?: Record<
    string,
    {
      dependencies?: Record<string, unknown>
      devDependencies?: Record<string, unknown>
      optionalDependencies?: Record<string, unknown>
    }
  >
}

export type ProfilePluginRemovalRunner = (pluginName: string) => Promise<boolean>

const CORE_BUNDLES = new Set(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dshmarket'])
const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i

function yamlPackageNamePattern(packageName: string): RegExp {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `^\\s*name:\\s*(?:["']${escaped}["']|${escaped})(?:\\s*(?:#.*)?)?$`,
    'm'
  )
}

export function isThirdPartyPackageName(packageName: string): boolean {
  return (
    PACKAGE_NAME_PATTERN.test(packageName) &&
    !packageName.startsWith('@deepseek-ai/') &&
    !CORE_BUNDLES.has(packageName)
  )
}

function configuredProfilePlugins(manifest: ProfileManifest): string[] {
  const dependencies = manifest.dependencies ?? {}
  const bundles = new Set(manifest.dsh?.profile?.bundles ?? [])
  const plugins: string[] = []

  for (const dep of Object.keys(dependencies)) {
    if (bundles.has(dep) && isThirdPartyPackageName(dep)) {
      plugins.push(dep)
    }
  }

  return plugins
}

async function bundleOwnsPackage(
  profileDirectory: string,
  bundle: string,
  packageName: string
): Promise<boolean> {
  const packageDirectory = join(profileDirectory, 'node_modules', bundle)

  try {
    const rawManifest = await readFile(join(packageDirectory, 'package.json'), 'utf8')
    const manifest = JSON.parse(rawManifest) as BundleManifest
    if (
      packageName in (manifest.dependencies ?? {}) ||
      packageName in (manifest.optionalDependencies ?? {})
    ) {
      return true
    }

    const patch = manifest.dsh?.bundle?.patch
    if (!patch) return false
    const rawPatch = await readFile(resolve(packageDirectory, patch), 'utf8')
    return yamlPackageNamePattern(packageName).test(rawPatch)
  } catch {
    return false
  }
}

function loaderEntryPattern(entryId: string): RegExp {
  const escaped = entryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `^\\s*-\\s+id:\\s*(?:["']${escaped}["']|${escaped})(?:\\s*(?:#.*)?)?$`,
    'm'
  )
}

async function bundleDeclaresLoaderEntry(
  profileDirectory: string,
  bundle: string,
  entryId: string
): Promise<boolean> {
  const packageDirectory = join(profileDirectory, 'node_modules', bundle)
  const packageJsonPath = join(packageDirectory, 'package.json')

  try {
    const rawManifest = await readFile(packageJsonPath, 'utf8')
    const bundleManifest = JSON.parse(rawManifest) as BundleManifest
    const patch = bundleManifest.dsh?.bundle?.patch
    if (!patch) return false

    const patchPath = resolve(packageDirectory, patch)
    const rawPatch = await readFile(patchPath, 'utf8')
    return loaderEntryPattern(entryId).test(rawPatch)
  } catch {
    return false
  }
}

async function pluginMatchesSlot(
  profileDirectory: string,
  plugin: string,
  slotName: string
): Promise<boolean> {
  const packageDir = join(profileDirectory, 'node_modules', plugin)
  const filesToCheck = [
    'cordis.patch.yml',
    'client.js',
    'lib/client.js',
    'dist/client.js',
    'package.json',
    'index.js',
    'lib/index.js',
    'dist/index.js'
  ]
  for (const file of filesToCheck) {
    try {
      const content = await readFile(join(packageDir, file), 'utf8')
      if (content.includes(slotName)) return true
    } catch { }
  }
  return false
}

async function packagesProvidingSlot(
  nodeModulesPath: string,
  slotName: string
): Promise<string[]> {
  const scopeDirectory = join(nodeModulesPath, '@deepseek-ai')
  const providers: string[] = []

  try {
    const entries = await readdir(scopeDirectory, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.name.startsWith('dsh-client-ui-')) continue
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue

      const packageName = `@deepseek-ai/${entry.name}`
      for (const file of ['client.js', 'lib/client.js', 'dist/client.js']) {
        try {
          const content = await readFile(join(scopeDirectory, entry.name, file), 'utf8')
          if (content.includes(slotName)) {
            providers.push(packageName)
            break
          }
        } catch { }
      }
    }
  } catch { }

  return providers
}

async function pluginReferencesPackage(
  profileDirectory: string,
  plugin: string,
  packageNames: ReadonlySet<string>
): Promise<boolean> {
  const packageDirectory = join(profileDirectory, 'node_modules', plugin)

  try {
    const rawManifest = await readFile(join(packageDirectory, 'package.json'), 'utf8')
    const manifest = JSON.parse(rawManifest) as BundleManifest
    const declaredPackages = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {})
    ])
    if ([...packageNames].some((packageName) => declaredPackages.has(packageName))) return true
  } catch { }

  for (const file of ['cordis.patch.yml', 'index.js', 'lib/index.js', 'dist/index.js']) {
    try {
      const content = await readFile(join(packageDirectory, file), 'utf8')
      if ([...packageNames].some((packageName) => content.includes(packageName))) return true
    } catch { }
  }
  return false
}

export async function resolveProfileRecoveryPlugins(
  dshHome: string,
  detectedPlugins: readonly string[],
  duplicateLoaderEntryId?: string,
  slotConflictName?: string,
  excludedPlugins: readonly string[] = [],
  slotProviderNodeModulesPaths: readonly string[] = []
): Promise<string[]> {
  const manifestPath = profilePackageJsonPath(dshHome)

  try {
    const raw = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw) as ProfileManifest
    const excludedSet = new Set(excludedPlugins)
    const configuredPlugins = configuredProfilePlugins(manifest).filter(
      (plugin) => !excludedSet.has(plugin)
    )
    const configuredSet = new Set(configuredPlugins)
    const profileDirectory = dirname(manifestPath)

    // 1. Match an installed third-party root package directly, or prove that
    // a reported sub-package is owned by one configured third-party bundle.
    const matchedPlugins = new Set<string>()
    for (const detected of detectedPlugins) {
      if (!PACKAGE_NAME_PATTERN.test(detected)) continue
      if (configuredSet.has(detected)) {
        matchedPlugins.add(detected)
        continue
      }
      for (const configured of configuredPlugins) {
        if (await bundleOwnsPackage(profileDirectory, configured, detected)) {
          matchedPlugins.add(configured)
        }
      }
    }
    if (matchedPlugins.size === 1) return [...matchedPlugins]

    // A frontend loader error often names an official leaf package that a
    // third-party bundle creates dynamically. Attribute that exact package
    // reference back to the configured root without depending on the app's
    // node_modules tree being available yet. This is especially important
    // immediately after an install followed by a page refresh.
    const dynamicallyReferencedOwners = new Set<string>()
    for (const detected of detectedPlugins) {
      if (!PACKAGE_NAME_PATTERN.test(detected) || configuredSet.has(detected)) continue
      const packageNames = new Set([detected])
      for (const configured of configuredPlugins) {
        if (await pluginReferencesPackage(profileDirectory, configured, packageNames)) {
          dynamicallyReferencedOwners.add(configured)
        }
      }
    }
    if (dynamicallyReferencedOwners.size === 1) return [...dynamicallyReferencedOwners]

    // 2. Duplicate loader entry matching
    if (duplicateLoaderEntryId) {
      let offendingPlugin: string | undefined
      for (const plugin of configuredPlugins) {
        if (await bundleDeclaresLoaderEntry(profileDirectory, plugin, duplicateLoaderEntryId)) {
          offendingPlugin = plugin
        }
      }
      if (offendingPlugin) return [offendingPlugin]
    }

    // 3. Slot conflict matching
    if (slotConflictName) {
      const slotMatched = new Set<string>()
      for (const plugin of configuredPlugins) {
        if (await pluginMatchesSlot(profileDirectory, plugin, slotConflictName)) {
          slotMatched.add(plugin)
        }
      }
      if (slotMatched.size === 1) return [...slotMatched]

      // Some plugins create official UI packages dynamically instead of
      // containing the slot literal themselves. Attribute those packages back
      // to the configured root bundle using its runtime code/dependencies.
      const providerPackages = new Set<string>()
      const searchPaths = [
        join(profileDirectory, 'node_modules'),
        ...slotProviderNodeModulesPaths
      ]
      for (const nodeModulesPath of searchPaths) {
        for (const packageName of await packagesProvidingSlot(nodeModulesPath, slotConflictName)) {
          providerPackages.add(packageName)
        }
      }
      if (providerPackages.size > 0) {
        const providerOwners = new Set<string>()
        for (const plugin of configuredPlugins) {
          if (await pluginReferencesPackage(profileDirectory, plugin, providerPackages)) {
            providerOwners.add(plugin)
          }
        }
        if (providerOwners.size === 1) return [...providerOwners]
      }
    }

    // Never guess. A recovery action is only safe when one or more packages
    // have direct evidence tying them to the reported failure.
    return []
  } catch {
    return []
  }
}

/**
 * Loader entry ids the installed plugin declares. Read before removal — the
 * bundle patch that names them goes away with the package.
 */
export async function pluginDeclaredEntryIds(
  profileDirectory: string,
  pluginName: string
): Promise<string[]> {
  const packageDirectory = join(profileDirectory, 'node_modules', pluginName)
  try {
    const manifest = JSON.parse(
      await readFile(join(packageDirectory, 'package.json'), 'utf8')
    ) as BundleManifest
    const patch = manifest.dsh?.bundle?.patch
    if (!patch) return []
    return bundleEntryIds(await readFile(resolve(packageDirectory, patch), 'utf8'))
  } catch {
    return []
  }
}

/**
 * Drop the user patch-layer rows aimed at a plugin that is being removed.
 * @returns a description of each row dropped, empty when the layer said
 * nothing about this plugin.
 */
export async function prunePluginPatchLayer(
  dshHome: string,
  pluginName: string,
  entryIds: readonly string[]
): Promise<string[]> {
  const patchPath = profileCordisPatchPath(dshHome)
  try {
    const text = await readFile(patchPath, 'utf8')
    const pruned = prunePatchLayer(text, pluginName, entryIds)
    if (pruned.removed.length === 0) return []
    await writeFile(patchPath, pruned.text, 'utf8')
    return pruned.removed
  } catch {
    return []
  }
}

export async function uninstallPluginFromProfile(
  dshHome: string,
  pluginName: string,
  removePlugin?: ProfilePluginRemovalRunner
): Promise<boolean> {
  if (!isThirdPartyPackageName(pluginName) || !removePlugin) return false

  const manifestPath = profilePackageJsonPath(dshHome)
  const lockfilePath = join(dirname(manifestPath), 'pnpm-lock.yaml')
  const pluginDirectory = join(dirname(manifestPath), 'node_modules', pluginName)

  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ProfileManifest
    const configured =
      Object.hasOwn(manifest.dependencies ?? {}, pluginName) &&
      (manifest.dsh?.profile?.bundles ?? []).includes(pluginName)
    if (!configured) return false

    const lockfileExisted = existsSync(lockfilePath)
    const entryIds = await pluginDeclaredEntryIds(dirname(manifestPath), pluginName)
    if (!(await removePlugin(pluginName))) return false

    const updatedManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ProfileManifest
    if (
      Object.hasOwn(updatedManifest.dependencies ?? {}, pluginName) ||
      (updatedManifest.dsh?.profile?.bundles ?? []).includes(pluginName) ||
      existsSync(pluginDirectory)
    ) {
      return false
    }

    if (lockfileExisted) {
      const lockfile = parse(await readFile(lockfilePath, 'utf8')) as ProfileLockfile
      const importer = lockfile.importers?.['.']
      if (
        Object.hasOwn(importer?.dependencies ?? {}, pluginName) ||
        Object.hasOwn(importer?.devDependencies ?? {}, pluginName) ||
        Object.hasOwn(importer?.optionalDependencies ?? {}, pluginName)
      ) {
        return false
      }
    }

    await prunePluginPatchLayer(dshHome, pluginName, entryIds)

    return true
  } catch {
    return false
  }
}

export async function resetPluginProfile(
  dshHome: string,
  failingPlugin?: string
): Promise<boolean> {
  const manifestPath = profilePackageJsonPath(dshHome)
  if (!existsSync(manifestPath)) return false
  if (failingPlugin && !isThirdPartyPackageName(failingPlugin)) return false

  try {
    const raw = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw) as ProfileManifest
    let modified = false

    if (failingPlugin) {
      const scope = failingPlugin.startsWith('@') ? failingPlugin.split('/')[0] : undefined
      if (manifest.dependencies) {
        if (failingPlugin in manifest.dependencies) {
          delete manifest.dependencies[failingPlugin]
          modified = true
        }
        for (const dep of Object.keys(manifest.dependencies)) {
          if (
            failingPlugin.includes(dep) ||
            dep.includes(failingPlugin) ||
            (scope && dep.startsWith(scope))
          ) {
            delete manifest.dependencies[dep]
            modified = true
          }
        }
      }
      if (manifest.dsh?.profile?.bundles) {
        const origLen = manifest.dsh.profile.bundles.length
        manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter(
          (b) =>
            b !== failingPlugin &&
            !failingPlugin.includes(b) &&
            !b.includes(failingPlugin) &&
            (!scope || !b.startsWith(scope))
        )
        if (manifest.dsh.profile.bundles.length !== origLen) {
          modified = true
        }
      }
    } else {
      // If no specific plugin given, reset to safe core bundles and clean all third-party dependencies
      const safeBundles = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
      if (manifest.dependencies?.dshmarket) safeBundles.push('dshmarket')
      manifest.dsh ??= {}
      manifest.dsh.profile ??= {}
      manifest.dsh.profile.bundles = safeBundles
      modified = true
      if (manifest.dependencies) {
        for (const dep of Object.keys(manifest.dependencies)) {
          if (!CORE_BUNDLES.has(dep)) {
            delete manifest.dependencies[dep]
            modified = true
          }
        }
      }
    }

    if (modified) {
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
    }

    // The user patch layer is the user's own work. Removing one plugin takes
    // the rows aimed at that plugin and nothing else; only a reset with no
    // plugin named — the deliberate "start over" — clears the whole layer.
    const patchPath = profileCordisPatchPath(dshHome)
    if (existsSync(patchPath)) {
      if (failingPlugin) {
        const entryIds = await pluginDeclaredEntryIds(dirname(manifestPath), failingPlugin)
        const removed = await prunePluginPatchLayer(dshHome, failingPlugin, entryIds)
        if (removed.length > 0) modified = true
      } else {
        const patchContent = await readFile(patchPath, 'utf8')
        if (patchContent.trim() !== '[]') {
          await writeFile(patchPath, '[]\n', 'utf8')
          modified = true
        }
      }
    }

    // Physically clean plugin files from node_modules to guarantee thorough uninstallation
    const nodeModulesPath = join(dshHome, 'profiles', 'web', 'node_modules')
    if (existsSync(nodeModulesPath)) {
      if (failingPlugin) {
        const pluginDir = join(nodeModulesPath, failingPlugin)
        await removeTree(pluginDir).catch(() => undefined)
        if (failingPlugin.startsWith('@')) {
          const scope = failingPlugin.split('/')[0]
          if (scope) {
            const scopeDir = join(nodeModulesPath, scope)
            try {
              const files = await readdir(scopeDir)
              if (files.length === 0) {
                await removeTree(scopeDir).catch(() => undefined)
              }
            } catch { }
          }
        }
      }
    }

    const packagesDir = join(dshHome, 'profiles', 'web', 'packages')
    if (failingPlugin && existsSync(packagesDir)) {
      const packageSourceDir = join(packagesDir, failingPlugin)
      if (existsSync(packageSourceDir)) {
        await removeTree(packageSourceDir).catch(() => undefined)
      }
    }

    // Remove stale pnpm-lock.yaml so pnpm regenerates a clean hoisted dependency graph
    const lockfilePath = join(dshHome, 'profiles', 'web', 'pnpm-lock.yaml')
    if (existsSync(lockfilePath)) {
      await rm(lockfilePath, { force: true }).catch(() => undefined)
    }

    return modified
  } catch {
    return false
  }
}

/**
 * Automatically inspects the web profile manifest before launch.
 * If any third-party bundle listed in `dsh.profile.bundles` is missing from `node_modules`,
 * prunes it from `bundles` and `dependencies` to prevent Harness from failing with
 * "cannot resolve profile bundle".
 */
export async function pruneMissingProfileBundles(dshHome: string): Promise<boolean> {
  const manifestPath = profilePackageJsonPath(dshHome)
  if (!existsSync(manifestPath)) return false

  const profileDirectory = dirname(manifestPath)
  const nodeModulesPath = join(profileDirectory, 'node_modules')

  if (existsSync(nodeModulesPath)) {
    try {
      const entries = await readdir(nodeModulesPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && isDisposableModuleDirectory(entry.name)) {
          await removeTree(join(nodeModulesPath, entry.name)).catch(() => undefined)
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    const raw = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw) as ProfileManifest
    let modified = false

    if (manifest.dsh?.profile?.bundles) {
      const origBundles = manifest.dsh.profile.bundles
      const prunedBundles = origBundles.filter((bundle) => {
        if (!isThirdPartyPackageName(bundle)) return true
        const bundleDir = join(nodeModulesPath, bundle)
        const exists = existsSync(bundleDir)
        if (!exists) {
          modified = true
        }
        return exists
      })

      if (modified) {
        manifest.dsh.profile.bundles = prunedBundles
      }
    }

    if (manifest.dependencies) {
      for (const dep of Object.keys(manifest.dependencies)) {
        if (!isThirdPartyPackageName(dep)) continue
        const depDir = join(nodeModulesPath, dep)
        if (!existsSync(depDir)) {
          delete manifest.dependencies[dep]
          modified = true
        }
      }
    }

    if (modified) {
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
      const lockfilePath = join(profileDirectory, 'pnpm-lock.yaml')
      if (existsSync(lockfilePath)) {
        await rm(lockfilePath, { force: true }).catch(() => undefined)
      }
    }

    return modified
  } catch {
    return false
  }
}

