import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'
import { mkdir, readdir, readFile, realpath, rename } from 'node:fs/promises'

const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i
const LAUNCH_AGENT_LABEL_PATTERN = /^[a-z0-9._-]+$/i
const COMPONENT_COMMAND_TIMEOUT_MS = 10_000
const COMPONENT_COMMAND_OUTPUT_LIMIT = 64 * 1024

interface PackageManifest {
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

interface InstalledPackage {
  directory: string
  canonicalDirectory: string
  manifest: PackageManifest
}

export interface LaunchAgentDescription {
  Label?: unknown
  Program?: unknown
  ProgramArguments?: unknown
}

interface CommandResult {
  code: number | null
  stdout: string
  stderr: string
}

export interface PluginComponentCleanupOptions {
  dshHome: string
  pluginName: string
  platform?: NodeJS.Platform
  homeDirectory?: string
  uid?: number | null
  now?: () => Date
  readLaunchAgent?: (plistPath: string) => Promise<LaunchAgentDescription>
  bootoutLaunchAgent?: (target: string) => Promise<CommandResult>
  log?: (message: string) => void
}

export interface PluginComponentCleanupResult {
  ok: boolean
  matched: number
  quarantined: string[]
  failures: string[]
}

function profileDirectory(dshHome: string): string {
  return join(dshHome, 'profiles', 'web')
}

async function installedPackage(
  profile: string,
  packageName: string,
  ownerDirectory?: string
): Promise<InstalledPackage | undefined> {
  if (!PACKAGE_NAME_PATTERN.test(packageName)) return undefined
  const candidates = ownerDirectory === undefined
    ? [join(profile, 'node_modules', packageName)]
    : [join(ownerDirectory, 'node_modules', packageName), join(profile, 'node_modules', packageName)]

  for (const directory of candidates) {
    try {
      const manifest = JSON.parse(
        await readFile(join(directory, 'package.json'), 'utf8')
      ) as PackageManifest
      return {
        directory: resolve(directory),
        canonicalDirectory: await realpath(directory),
        manifest
      }
    } catch { }
  }
  return undefined
}

async function packageClosure(
  profile: string,
  roots: readonly string[]
): Promise<Map<string, InstalledPackage>> {
  const closure = new Map<string, InstalledPackage>()
  const pending: Array<{ packageName: string; ownerDirectory?: string }> = roots.map(
    (packageName) => ({ packageName })
  )

  while (pending.length > 0) {
    const candidate = pending.pop()
    if (!candidate) break
    const found = await installedPackage(profile, candidate.packageName, candidate.ownerDirectory)
    if (!found || closure.has(found.canonicalDirectory)) continue
    closure.set(found.canonicalDirectory, found)
    for (const dependency of [
      ...Object.keys(found.manifest.dependencies ?? {}),
      ...Object.keys(found.manifest.optionalDependencies ?? {})
    ]) {
      pending.push({ packageName: dependency, ownerDirectory: found.directory })
    }
  }
  return closure
}

/**
 * Package directories that disappear only because one configured root plugin
 * is being removed. A dependency shared by any remaining profile root is not
 * owned by this uninstall and must not drive external cleanup.
 */
export async function orphanedPluginPackageDirectories(
  dshHome: string,
  pluginName: string
): Promise<string[]> {
  if (!PACKAGE_NAME_PATTERN.test(pluginName)) return []
  const profile = profileDirectory(dshHome)
  let manifest: PackageManifest
  try {
    manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')) as PackageManifest
  } catch {
    return []
  }
  if (!Object.hasOwn(manifest.dependencies ?? {}, pluginName)) return []

  const target = await packageClosure(profile, [pluginName])
  const remainingRoots = Object.keys(manifest.dependencies ?? {}).filter((name) => name !== pluginName)
  const remaining = await packageClosure(profile, remainingRoots)
  const directories = new Set<string>()
  for (const [canonicalDirectory, pkg] of target) {
    if (remaining.has(canonicalDirectory)) continue
    directories.add(pkg.directory)
    directories.add(canonicalDirectory)
  }
  return [...directories]
}

function pathInside(parent: string, child: string): boolean {
  const nested = relative(parent, child)
  return nested === '' || (!nested.startsWith('..') && !isAbsolute(nested))
}

async function launchAgentReferencesDirectories(
  launchAgent: LaunchAgentDescription,
  directories: readonly string[]
): Promise<boolean> {
  const values = [
    typeof launchAgent.Program === 'string' ? launchAgent.Program : undefined,
    ...Array.isArray(launchAgent.ProgramArguments)
      ? launchAgent.ProgramArguments.filter((value): value is string => typeof value === 'string')
      : []
  ].filter((value): value is string => value !== undefined && isAbsolute(value))

  for (const value of values) {
    const lexical = resolve(value)
    let canonical = lexical
    try {
      canonical = await realpath(value)
    } catch { }
    if (directories.some((directory) => pathInside(directory, lexical) || pathInside(directory, canonical))) {
      return true
    }
  }
  return false
}

function runCommand(command: string, args: readonly string[]): Promise<CommandResult> {
  return new Promise((resolveResult) => {
    const child = spawn(command, [...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: COMPONENT_COMMAND_TIMEOUT_MS,
      killSignal: 'SIGKILL'
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout = (stdout + chunk).slice(-COMPONENT_COMMAND_OUTPUT_LIMIT)
    })
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-COMPONENT_COMMAND_OUTPUT_LIMIT)
    })
    child.once('error', (error) => resolveResult({ code: null, stdout, stderr: error.message }))
    child.once('close', (code) => resolveResult({ code, stdout, stderr }))
  })
}

async function defaultReadLaunchAgent(plistPath: string): Promise<LaunchAgentDescription> {
  const result = await runCommand('/usr/bin/plutil', ['-convert', 'json', '-o', '-', plistPath])
  if (result.code !== 0) throw new Error(result.stderr.trim() || `plutil exited ${String(result.code)}`)
  return JSON.parse(result.stdout) as LaunchAgentDescription
}

function defaultBootoutLaunchAgent(target: string): Promise<CommandResult> {
  return runCommand('/bin/launchctl', ['bootout', target])
}

function bootoutSucceeded(result: CommandResult): boolean {
  return result.code === 0 || /could not find specified service/i.test(result.stderr)
}

function quarantineTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

/**
 * Stop and quarantine user LaunchAgents whose executable arguments point into
 * packages owned exclusively by the selected root plugin. No package names,
 * service labels, or plugin data directories are special-cased.
 */
export async function cleanupPluginOwnedComponents(
  options: PluginComponentCleanupOptions
): Promise<PluginComponentCleanupResult> {
  const platform = options.platform ?? process.platform
  if (platform !== 'darwin') return { ok: true, matched: 0, quarantined: [], failures: [] }

  const directories = await orphanedPluginPackageDirectories(options.dshHome, options.pluginName)
  if (directories.length === 0) return { ok: true, matched: 0, quarantined: [], failures: [] }

  const homeDirectory = options.homeDirectory ?? homedir()
  const launchAgentsDirectory = join(homeDirectory, 'Library', 'LaunchAgents')
  const readLaunchAgent = options.readLaunchAgent ?? defaultReadLaunchAgent
  const bootoutLaunchAgent = options.bootoutLaunchAgent ?? defaultBootoutLaunchAgent
  const uid = options.uid === undefined ? process.getuid?.() ?? null : options.uid
  const quarantined: string[] = []
  const failures: string[] = []
  let matched = 0
  let entries
  try {
    entries = await readdir(launchAgentsDirectory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ok: true, matched: 0, quarantined, failures }
    }
    const detail = error instanceof Error ? error.message : String(error)
    const message = `cannot inspect ${launchAgentsDirectory}: ${detail}`
    return { ok: false, matched: 0, quarantined, failures: [message] }
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.plist')) continue
    const plistPath = join(launchAgentsDirectory, entry.name)
    let launchAgent: LaunchAgentDescription
    try {
      launchAgent = await readLaunchAgent(plistPath)
    } catch {
      // An unrelated unreadable plist proves no ownership and is left alone.
      continue
    }
    if (!await launchAgentReferencesDirectories(launchAgent, directories)) continue
    matched += 1

    const label = typeof launchAgent.Label === 'string' && LAUNCH_AGENT_LABEL_PATTERN.test(launchAgent.Label)
      ? launchAgent.Label
      : undefined
    if (label === undefined || typeof uid !== 'number') {
      failures.push(`${plistPath}: missing a safe LaunchAgent label or user id`)
      continue
    }

    const target = `gui/${uid}/${label}`
    let bootout: CommandResult
    try {
      bootout = await bootoutLaunchAgent(target)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      failures.push(`${plistPath}: launchctl bootout failed (${detail})`)
      continue
    }
    if (!bootoutSucceeded(bootout)) {
      const detail = bootout.stderr.trim() || String(bootout.code)
      failures.push(`${plistPath}: launchctl bootout failed (${detail})`)
      continue
    }

    const quarantineDirectory = join(
      options.dshHome,
      'recovery',
      'uninstalled-components',
      quarantineTimestamp((options.now ?? (() => new Date()))())
    )
    const quarantinePath = join(quarantineDirectory, basename(plistPath))
    try {
      await mkdir(quarantineDirectory, { recursive: true })
      await rename(plistPath, quarantinePath)
      quarantined.push(quarantinePath)
      options.log?.(`[plugin-components] quarantined ${plistPath} for ${options.pluginName}`)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      failures.push(`${plistPath}: quarantine failed (${detail})`)
    }
  }

  return { ok: failures.length === 0, matched, quarantined, failures }
}
