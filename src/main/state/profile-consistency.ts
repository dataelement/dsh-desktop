import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { isMap, isSeq, parseDocument } from 'yaml'
import { profileCordisPatchPath, profilePackageJsonPath } from './plugin-recovery'

/**
 * What the profile says about itself, checked against what is on disk.
 *
 * The failures this catches do not announce themselves. A bundle declared but
 * not installed, a package installed but never composed, a patch layer
 * inserting something that was uninstalled — none of these throw. They leave a
 * service waiting on a provider that never arrives, so the profile reads as a
 * slow start, and the real fault surfaces only after someone spends an
 * afternoon in the logs. Naming them at launch is the whole point: this
 * changes nothing about the boot, it only makes the state legible.
 */

interface ProfileManifest {
  dependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

async function readManifest(path: string): Promise<ProfileManifest | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as ProfileManifest
  } catch {
    return undefined
  }
}

/** Whether a package is materialized in the profile, and whether it is a bundle. */
async function inspectPackage(
  nodeModulesPath: string,
  packageName: string
): Promise<{ installed: boolean; bundle: boolean }> {
  try {
    const manifest = JSON.parse(
      await readFile(join(nodeModulesPath, packageName, 'package.json'), 'utf8')
    ) as { dsh?: { bundle?: { patch?: string } } }
    return { installed: true, bundle: manifest.dsh?.bundle?.patch !== undefined }
  } catch {
    return { installed: false, bundle: false }
  }
}

/** Package names a user patch layer inserts. */
export function patchLayerInsertedPackages(text: string): string[] {
  let document
  try {
    document = parseDocument(text)
  } catch {
    return []
  }
  if (!isSeq(document.contents)) return []

  const names: string[] = []
  for (const row of document.contents.items) {
    if (!isMap(row)) continue
    const insert = row.get('insert')
    if (!isSeq(insert)) continue
    for (const entry of insert.items) {
      const name = isMap(entry) ? entry.get('name') : undefined
      if (typeof name === 'string') names.push(name)
    }
  }
  return names
}

/**
 * Installed bundle packages the manifest never mentions.
 *
 * A rolled-back install leaves exactly this: the files stay, the dependency
 * and the bundle row do not, and the package can never compose again — while
 * anything that only checks node_modules reports it as installed. Packages
 * that arrived as a dependency of a declared one are someone else's business
 * and stay unreported.
 */
async function undeclaredBundles(
  nodeModulesPath: string,
  dependencies: readonly string[],
  bundles: readonly string[]
): Promise<string[]> {
  let entries
  try {
    entries = await readdir(nodeModulesPath, { withFileTypes: true })
  } catch {
    return []
  }

  const declared = new Set([...dependencies, ...bundles])
  const transitive = new Set<string>()
  for (const dependency of dependencies) {
    try {
      const manifest = JSON.parse(
        await readFile(join(nodeModulesPath, dependency, 'package.json'), 'utf8')
      ) as { dependencies?: Record<string, string> }
      for (const name of Object.keys(manifest.dependencies ?? {})) transitive.add(name)
    } catch {
      // Unreadable dependency: it vouches for nothing.
    }
  }

  const orphans: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('@')) continue
    if (!entry.isDirectory() || declared.has(entry.name) || transitive.has(entry.name)) continue
    const { bundle } = await inspectPackage(nodeModulesPath, entry.name)
    if (bundle) orphans.push(entry.name)
  }
  return orphans
}

/**
 * Inconsistencies between the profile's declarations and its packages.
 * @returns one sentence per finding, empty when the profile is coherent.
 */
export async function inspectProfileConsistency(dshHome: string): Promise<string[]> {
  const manifestPath = profilePackageJsonPath(dshHome)
  const manifest = await readManifest(manifestPath)
  if (manifest === undefined) return []

  const nodeModulesPath = join(dirname(manifestPath), 'node_modules')
  const bundles = manifest.dsh?.profile?.bundles ?? []
  const dependencies = Object.keys(manifest.dependencies ?? {})
  const findings: string[] = []

  for (const bundle of bundles) {
    // In-box bundles live in the app, not the profile, so only a declared
    // dependency is expected to be materialized here.
    if (!dependencies.includes(bundle)) continue
    const { installed } = await inspectPackage(nodeModulesPath, bundle)
    if (!installed) findings.push(`bundle ${bundle} is declared but not installed`)
  }

  for (const dependency of dependencies) {
    if (bundles.includes(dependency)) continue
    const { installed, bundle } = await inspectPackage(nodeModulesPath, dependency)
    if (installed && bundle) {
      findings.push(`${dependency} is installed and declares a bundle, but is not composed`)
    }
  }

  for (const orphan of await undeclaredBundles(nodeModulesPath, dependencies, bundles)) {
    findings.push(`${orphan} is installed but declared nowhere in the profile manifest`)
  }

  try {
    const layer = await readFile(profileCordisPatchPath(dshHome), 'utf8')
    for (const packageName of patchLayerInsertedPackages(layer)) {
      const { installed } = await inspectPackage(nodeModulesPath, packageName)
      if (!installed) findings.push(`the patch layer inserts ${packageName}, which is not installed`)
    }
  } catch {
    // No layer, nothing it can contradict.
  }

  return findings
}
