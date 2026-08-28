import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative } from 'node:path'
import { isThirdPartyPackageName, profilePackageJsonPath } from './plugin-recovery'

export type ProfileCompatibilityIssueKind =
  | 'core-version-mismatch'
  | 'missing-client-module'
  | 'workspace-version-mismatch'

export type ProfileCompatibilityResolution =
  | 'disable-plugin'
  | 'quarantine-workspace'
  | 'rebuild-profile'

export interface ProfileCompatibilityIssue {
  id: string
  kind: ProfileCompatibilityIssueKind
  severity: 'blocking' | 'warning'
  packageName: string
  installedVersion?: string
  expectedVersion?: string
  source: string
  detail: string
  resolution: ProfileCompatibilityResolution
  target: string
  groupId?: string
  groupName?: string
  groupKind?: 'plugin' | 'workspace' | 'profile'
}

interface PackageManifest {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

interface ProfileCompatibilitySnapshot {
  issues: ProfileCompatibilityIssue[]
  activePlugins: string[]
}

function issueId(kind: ProfileCompatibilityIssueKind, target: string): string {
  return `${kind}:${target}`
}

async function readManifest(path: string): Promise<PackageManifest | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as PackageManifest
  } catch {
    return undefined
  }
}

function packageNameFromRequest(request: string): string | undefined {
  if (!request || request.startsWith('.') || request.startsWith('/')) return undefined
  const parts = request.split('/')
  if (request.startsWith('@')) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : undefined
  return parts[0]
}

function literalClientRequires(source: string): string[] {
  const requests = new Set<string>()
  const expression = /\brequire\((['"])([^'"]+)\1\)/g
  for (const match of source.matchAll(expression)) {
    const request = match[2]
    if (request) requests.add(request)
  }
  return [...requests]
}

async function installedPackageNames(nodeModulesPath: string): Promise<string[]> {
  const names: string[] = []
  let entries
  try {
    entries = await readdir(nodeModulesPath, { withFileTypes: true })
  } catch {
    return names
  }

  for (const entry of entries) {
    if ((!entry.isDirectory() && !entry.isSymbolicLink()) || entry.name.startsWith('.')) continue
    if (!entry.name.startsWith('@')) {
      names.push(entry.name)
      continue
    }
    try {
      const scoped = await readdir(join(nodeModulesPath, entry.name), { withFileTypes: true })
      for (const child of scoped) {
        if (child.isDirectory() || child.isSymbolicLink()) names.push(`${entry.name}/${child.name}`)
      }
    } catch {
      // An unreadable scope proves nothing about its packages.
    }
  }
  return names
}

async function workspaceManifests(profileDirectory: string): Promise<Array<{
  directory: string
  manifest: PackageManifest
}>> {
  const packagesDirectory = join(profileDirectory, 'packages')
  const result: Array<{ directory: string; manifest: PackageManifest }> = []
  let entries
  try {
    entries = await readdir(packagesDirectory, { withFileTypes: true })
  } catch {
    return result
  }

  for (const entry of entries) {
    if ((!entry.isDirectory() && !entry.isSymbolicLink()) || entry.name.startsWith('.')) continue
    const directory = join(packagesDirectory, entry.name)
    const direct = await readManifest(join(directory, 'package.json'))
    if (direct?.name) {
      result.push({ directory, manifest: direct })
      continue
    }
    if (!entry.name.startsWith('@')) continue
    try {
      const scoped = await readdir(directory, { withFileTypes: true })
      for (const child of scoped) {
        if (!child.isDirectory() && !child.isSymbolicLink()) continue
        const childDirectory = join(directory, child.name)
        const manifest = await readManifest(join(childDirectory, 'package.json'))
        if (manifest?.name) result.push({ directory: childDirectory, manifest })
      }
    } catch {
      // Ignore unreadable workspace scopes.
    }
  }
  return result
}

async function packageVersion(nodeModulesPath: string, packageName: string): Promise<string | undefined> {
  return (await readManifest(join(nodeModulesPath, packageName, 'package.json')))?.version
}

/**
 * Inspect the normal web profile without importing any of its code. Safe Mode
 * must remain useful precisely when those client bundles cannot be evaluated.
 */
export async function inspectProfileCompatibility(
  dshHome: string,
  bundledNodeModulesPath: string
): Promise<ProfileCompatibilitySnapshot> {
  const manifestPath = profilePackageJsonPath(dshHome)
  const profileDirectory = dirname(manifestPath)
  const profileManifest = await readManifest(manifestPath)
  if (profileManifest === undefined) return { issues: [], activePlugins: [] }

  const dependencies = profileManifest.dependencies ?? {}
  const bundles = new Set(profileManifest.dsh?.profile?.bundles ?? [])
  const activePlugins = Object.keys(dependencies).filter(
    (name) => bundles.has(name) && isThirdPartyPackageName(name)
  )
  const profileNodeModules = join(profileDirectory, 'node_modules')
  const profilePackages = await installedPackageNames(profileNodeModules)
  const bundledPackages = new Set(await installedPackageNames(bundledNodeModulesPath))
  const issues: ProfileCompatibilityIssue[] = []
  const incompatibleWorkspaces: Array<{
    directory: string
    packageName: string
    manifest: PackageManifest
    mismatches: string[]
    mismatchPackages: string[]
  }> = []

  for (const workspace of await workspaceManifests(profileDirectory)) {
    const declared = {
      ...(workspace.manifest.peerDependencies ?? {}),
      ...(workspace.manifest.devDependencies ?? {})
    }
    const mismatches: string[] = []
    const mismatchPackages: string[] = []
    for (const [dependency, range] of Object.entries(declared)) {
      if (!dependency.startsWith('@deepseek-ai/')) continue
      const expectedVersion = await packageVersion(bundledNodeModulesPath, dependency)
      const compatible = expectedVersion !== undefined && (
        range === expectedVersion || range === `^${expectedVersion}` || range === `~${expectedVersion}`
      )
      if (!compatible) {
        mismatchPackages.push(dependency)
        mismatches.push(`${dependency}@${range}${expectedVersion ? ` (bundled ${expectedVersion})` : ' (removed)'}`)
      }
    }
    if (mismatches.length === 0) continue
    incompatibleWorkspaces.push({
      directory: workspace.directory,
      packageName: workspace.manifest.name ?? basename(workspace.directory),
      manifest: workspace.manifest,
      mismatches,
      mismatchPackages
    })
  }

  for (const packageName of profilePackages) {
    if (!packageName.startsWith('@deepseek-ai/')) continue
    const installedVersion = await packageVersion(profileNodeModules, packageName)
    const expectedVersion = await packageVersion(bundledNodeModulesPath, packageName)
    if (!installedVersion || !expectedVersion || installedVersion === expectedVersion) continue
    const workspaceOwners = incompatibleWorkspaces.filter(
      (workspace) => workspace.mismatchPackages.includes(packageName)
    )
    const soleWorkspaceOwner = workspaceOwners.length === 1 ? workspaceOwners[0] : undefined
    issues.push({
      id: issueId('core-version-mismatch', packageName),
      kind: 'core-version-mismatch',
      severity: 'blocking',
      packageName,
      installedVersion,
      expectedVersion,
      source: 'Profile node_modules',
      detail: `${packageName} ${installedVersion} shadows the bundled ${expectedVersion} package.`,
      resolution: 'rebuild-profile',
      target: packageName,
      groupId: soleWorkspaceOwner
        ? `workspace:${soleWorkspaceOwner.directory}`
        : 'profile:core-dependencies',
      groupName: soleWorkspaceOwner?.packageName ?? 'Profile core dependencies',
      groupKind: soleWorkspaceOwner ? 'workspace' : 'profile'
    })
  }

  for (const pluginName of activePlugins) {
    try {
      const client = await readFile(join(profileNodeModules, pluginName, 'lib', 'client.js'), 'utf8')
      for (const request of literalClientRequires(client)) {
        const requiredPackage = packageNameFromRequest(request)
        if (!requiredPackage?.startsWith('@deepseek-ai/') || bundledPackages.has(requiredPackage)) continue
        issues.push({
          id: issueId('missing-client-module', `${pluginName}:${request}`),
          kind: 'missing-client-module',
          severity: 'blocking',
          packageName: pluginName,
          installedVersion: await packageVersion(profileNodeModules, pluginName),
          source: `${pluginName}/lib/client.js`,
          detail: `The client bundle requires ${request}, which this Harness no longer provides.`,
          resolution: 'disable-plugin',
          target: pluginName,
          groupId: `plugin:${pluginName}`,
          groupName: pluginName,
          groupKind: 'plugin'
        })
      }
    } catch {
      // Host-only plugins and packages without a client entry have nothing to scan.
    }
  }

  for (const workspace of incompatibleWorkspaces) {
    issues.push({
      id: issueId('workspace-version-mismatch', workspace.packageName),
      kind: 'workspace-version-mismatch',
      severity: 'blocking',
      packageName: workspace.packageName,
      installedVersion: workspace.manifest.version,
      source: workspace.directory,
      detail: `Workspace dependencies target another Harness generation: ${workspace.mismatches.join(', ')}.`,
      resolution: 'quarantine-workspace',
      target: workspace.directory,
      groupId: `workspace:${workspace.directory}`,
      groupName: workspace.packageName,
      groupKind: 'workspace'
    })
  }

  const unique = new Map(issues.map((issue) => [issue.id, issue]))
  return {
    issues: [...unique.values()].sort((left, right) =>
      (left.groupName ?? left.packageName).localeCompare(right.groupName ?? right.packageName) ||
      left.packageName.localeCompare(right.packageName)
    ),
    activePlugins
  }
}

function recoveryStamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

async function backupManifest(profileDirectory: string, recoveryDirectory: string): Promise<void> {
  await mkdir(recoveryDirectory, { recursive: true })
  for (const name of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'cordis.patch.yml']) {
    try {
      await copyFile(join(profileDirectory, name), join(recoveryDirectory, name))
    } catch {
      // Optional files are backed up when present.
    }
  }
}

/** Disable bundles without deleting their package, configuration, or data. */
export async function disableProfilePlugins(
  dshHome: string,
  pluginNames: readonly string[],
  now = new Date()
): Promise<string[]> {
  const manifestPath = profilePackageJsonPath(dshHome)
  const profileDirectory = dirname(manifestPath)
  const manifest = await readManifest(manifestPath)
  if (manifest === undefined) return []
  const selected = new Set(pluginNames)
  const bundles = manifest.dsh?.profile?.bundles ?? []
  const disabled = bundles.filter((name) => selected.has(name))
  if (disabled.length === 0) return []

  const recoveryDirectory = join(
    dshHome,
    'recovery',
    'compatibility',
    recoveryStamp(now)
  )
  await backupManifest(profileDirectory, recoveryDirectory)
  manifest.dsh ??= {}
  manifest.dsh.profile ??= {}
  manifest.dsh.profile.bundles = bundles.filter((name) => !selected.has(name))
  await writeFile(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`, 'utf8')
  return disabled
}

/** Move incompatible local workspaces aside; never delete their source or data. */
export async function quarantineProfileWorkspaces(
  dshHome: string,
  workspaceDirectories: readonly string[],
  now = new Date()
): Promise<string[]> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  const packagesDirectory = join(profileDirectory, 'packages')
  const recoveryDirectory = join(
    dshHome,
    'recovery',
    'compatibility',
    recoveryStamp(now)
  )
  const quarantined: string[] = []
  await backupManifest(profileDirectory, recoveryDirectory)

  for (const directory of workspaceDirectories) {
    const manifest = await readManifest(join(directory, 'package.json'))
    if (!manifest?.name) continue
    const nested = relative(packagesDirectory, directory)
    if (!nested || nested.startsWith('..') || isAbsolute(nested)) continue
    const destination = join(
      recoveryDirectory,
      'workspaces',
      manifest.name.replaceAll('/', '__')
    )
    await mkdir(dirname(destination), { recursive: true })
    try {
      await rename(directory, destination)
      quarantined.push(manifest.name)
    } catch {
      // A failed move leaves the workspace exactly where it was.
    }
  }

  if (quarantined.length > 0) {
    await rm(join(profileDirectory, 'pnpm-lock.yaml'), { force: true })
  }
  return quarantined
}

/** Move conflicting hoisted core packages aside before reinstalling the profile. */
export async function quarantineProfileCorePackages(
  dshHome: string,
  packageNames: readonly string[],
  now = new Date()
): Promise<string[]> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  const nodeModulesPath = join(profileDirectory, 'node_modules')
  const recoveryDirectory = join(
    dshHome,
    'recovery',
    'compatibility',
    recoveryStamp(now),
    'core-packages'
  )
  const quarantined: string[] = []
  await mkdir(recoveryDirectory, { recursive: true })
  for (const packageName of packageNames) {
    if (!packageName.startsWith('@deepseek-ai/')) continue
    const source = join(nodeModulesPath, packageName)
    const destination = join(recoveryDirectory, packageName.replaceAll('/', '__'))
    try {
      await rename(source, destination)
      quarantined.push(packageName)
    } catch {
      // Missing packages and failed moves remain untouched.
    }
  }
  if (quarantined.length > 0) await rm(join(profileDirectory, 'pnpm-lock.yaml'), { force: true })
  return quarantined
}
