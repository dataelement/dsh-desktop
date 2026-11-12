import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, type Dirent } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path'
import {
  constants as fsConstants,
  copyFile,
  link,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile
} from 'node:fs/promises'
import {
  launchServiceIsStoppedAfterBootout,
  type LaunchctlCommandResult
} from '../desktop-service/launchctl-service-state'

const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i
const LAUNCH_AGENT_LABEL_PATTERN = /^[a-z0-9._-]+$/i
const COMPONENT_COMMAND_TIMEOUT_MS = 10_000
const COMPONENT_COMMAND_OUTPUT_LIMIT = 64 * 1024
const OWNED_COMPONENTS_PROTOCOL = 1
const OWNED_COMPONENTS_MANIFEST = 'owned-components.json'
const LAUNCH_AGENT_BACKUP_PREFIX = 'owned-components/launch-agents/'

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

export interface PluginComponentCleanupOptions {
  dshHome: string
  pluginName: string
  removalId?: string
  backupDirectory?: string
  platform?: NodeJS.Platform
  homeDirectory?: string
  uid?: number | null
  now?: () => Date
  readLaunchAgent?: (plistPath: string) => Promise<LaunchAgentDescription>
  bootoutLaunchAgent?: (target: string) => Promise<LaunchctlCommandResult>
  inspectLaunchAgent?: (target: string) => Promise<LaunchctlCommandResult>
  moveComponent?: (from: string, to: string) => Promise<void>
  log?: (message: string) => void
}

export interface PluginOwnedComponentBackup {
  kind: 'launch-agent'
  label: string
  originalPath: string
  backupRelativePath: string
}

export interface PluginComponentCleanupResult {
  ok: boolean
  matched: number
  quarantined: string[]
  failures: string[]
  componentBackups?: PluginOwnedComponentBackup[]
}

interface OwnedComponentsManifest {
  protocol: number
  removalId: string
  pluginName: string
  components: PluginOwnedComponentBackup[]
}

export interface PluginComponentRestoreOptions {
  dshHome: string
  pluginName: string
  removalId: string
  backupDirectory: string
  expectedComponents: readonly PluginOwnedComponentBackup[]
  platform?: NodeJS.Platform
  homeDirectory?: string
  uid?: number | null
  readLaunchAgent?: (plistPath: string) => Promise<LaunchAgentDescription>
  bootstrapLaunchAgent?: (domain: string, plistPath: string) => Promise<LaunchctlCommandResult>
  inspectLaunchAgent?: (target: string) => Promise<LaunchctlCommandResult>
  log?: (message: string) => void
}

export interface LegacyPluginComponentCandidate {
  sourcePath: string
  sourceDigest: string
  quarantinedAt: string
  packageOwners: string[]
  component: PluginOwnedComponentBackup
}

export interface LegacyPluginComponentDiscovery {
  candidates: LegacyPluginComponentCandidate[]
  unverified: string[]
}

export function isLegacyPluginComponentCandidate(
  value: unknown
): value is LegacyPluginComponentCandidate {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<LegacyPluginComponentCandidate>
  return typeof candidate.sourcePath === 'string' &&
    isAbsolute(candidate.sourcePath) &&
    typeof candidate.sourceDigest === 'string' &&
    /^[0-9a-f]{64}$/u.test(candidate.sourceDigest) &&
    typeof candidate.quarantinedAt === 'string' &&
    Number.isFinite(Date.parse(candidate.quarantinedAt)) &&
    Array.isArray(candidate.packageOwners) &&
    candidate.packageOwners.length > 0 &&
    candidate.packageOwners.every(
      (owner) => typeof owner === 'string' && PACKAGE_NAME_PATTERN.test(owner)
    ) &&
    isPluginOwnedComponentBackup(candidate.component)
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

async function pluginPackageDirectories(
  dshHome: string,
  pluginName: string
): Promise<string[]> {
  if (!PACKAGE_NAME_PATTERN.test(pluginName)) return []
  const profile = profileDirectory(dshHome)
  const target = await packageClosure(profile, [pluginName])
  const directories = new Set<string>()
  for (const pkg of target.values()) {
    directories.add(pkg.directory)
    directories.add(pkg.canonicalDirectory)
  }
  return [...directories]
}

function packageOwnersFromLaunchAgent(launchAgent: LaunchAgentDescription): string[] {
  const values = [
    typeof launchAgent.Program === 'string' ? launchAgent.Program : undefined,
    ...Array.isArray(launchAgent.ProgramArguments)
      ? launchAgent.ProgramArguments.filter((value): value is string => typeof value === 'string')
      : []
  ].filter((value): value is string => value !== undefined)
  const owners = new Set<string>()
  for (const value of values) {
    // LaunchAgent plists are a macOS contract even when this parser is being
    // exercised by the Windows CI runner. Parse their executable arguments as
    // POSIX paths instead of using the host runner's path semantics.
    if (!posix.isAbsolute(value) || posix.normalize(value) !== value) continue
    const segments = value.split('/')
    const marker = segments.lastIndexOf('node_modules')
    const first = segments[marker + 1]
    if (marker < 0 || !first) continue
    if (!first.startsWith('@')) {
      owners.add(first)
      continue
    }
    const second = segments[marker + 2]
    if (second) owners.add(`${first}/${second}`)
  }
  return [...owners].sort()
}

export async function removalBackupPackageNames(
  backupDirectory: string,
  pluginName: string
): Promise<Set<string>> {
  const names = new Set<string>([pluginName])
  let visited = 0
  const visit = async (directory: string, depth: number): Promise<void> => {
    if (depth > 16 || visited > 20_000) throw new Error('removal backup package closure is too large')
    let entries: Dirent<string>[]
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) {
      visited += 1
      const path = join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`removal backup package closure contains a link: ${path}`)
      if (entry.isDirectory()) {
        await visit(path, depth + 1)
      } else if (entry.isFile() && entry.name === 'package.json') {
        const manifest = JSON.parse(await readFile(path, 'utf8')) as PackageManifest & { name?: unknown }
        if (typeof manifest.name === 'string' && PACKAGE_NAME_PATTERN.test(manifest.name)) {
          names.add(manifest.name)
        }
      }
    }
  }
  await visit(join(backupDirectory, 'profile-packages'), 0)
  await visit(join(backupDirectory, 'generations'), 0)
  return names
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

function containedPathParts(boundary: string, target: string): string[] {
  const root = resolve(boundary)
  const destination = resolve(target)
  const nested = relative(root, destination)
  if (nested.startsWith('..') || isAbsolute(nested)) {
    throw new Error(`component recovery path is outside its boundary: ${destination}`)
  }
  return nested.split(sep).filter(Boolean)
}

async function assertNoLinkedPathSegments(
  boundary: string,
  target: string,
  allowMissingTail: boolean
): Promise<void> {
  const root = resolve(boundary)
  const parts = containedPathParts(root, target)
  const rootMetadata = await lstat(root)
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) {
    throw new Error(`component recovery boundary is a symbolic link, junction, or non-directory: ${root}`)
  }
  let cursor = root
  let targetExists = true
  for (let index = 0; index < parts.length; index += 1) {
    cursor = join(cursor, parts[index] as string)
    let metadata
    try {
      metadata = await lstat(cursor)
    } catch (error) {
      if (allowMissingTail && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        targetExists = false
        break
      }
      throw error
    }
    if (metadata.isSymbolicLink()) {
      throw new Error(`component recovery path contains a symbolic link or junction: ${cursor}`)
    }
    if (index < parts.length - 1 && !metadata.isDirectory()) {
      throw new Error(`component recovery path contains a non-directory parent: ${cursor}`)
    }
  }
  if (!targetExists) return
  const [realBoundary, realTarget] = await Promise.all([realpath(root), realpath(resolve(target))])
  if (!pathInside(realBoundary, realTarget)) {
    throw new Error(`component recovery path resolves outside its boundary: ${target}`)
  }
}

async function ensureDirectoryWithoutLinks(boundary: string, directory: string): Promise<void> {
  const root = resolve(boundary)
  const parts = containedPathParts(root, directory)
  const rootMetadata = await lstat(root)
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) {
    throw new Error(`component recovery boundary is a symbolic link, junction, or non-directory: ${root}`)
  }
  let cursor = root
  for (const part of parts) {
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
      throw new Error(`component recovery directory contains a symbolic link, junction, or file: ${cursor}`)
    }
  }
  await assertNoLinkedPathSegments(root, resolve(directory), false)
}

export async function validatePluginOwnedComponentBackupPath(
  backupDirectory: string,
  target: string,
  allowMissingTail = false
): Promise<void> {
  await assertNoLinkedPathSegments(resolve(backupDirectory), resolve(target), allowMissingTail)
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

function runCommand(command: string, args: readonly string[]): Promise<LaunchctlCommandResult> {
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

function defaultBootoutLaunchAgent(target: string): Promise<LaunchctlCommandResult> {
  return runCommand('/bin/launchctl', ['bootout', target])
}

function defaultInspectLaunchAgent(target: string): Promise<LaunchctlCommandResult> {
  return runCommand('/bin/launchctl', ['print', target])
}

function defaultBootstrapLaunchAgent(domain: string, plistPath: string): Promise<LaunchctlCommandResult> {
  return runCommand('/bin/launchctl', ['bootstrap', domain, plistPath])
}

function quarantineTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

function componentManifestPath(backupDirectory: string): string {
  return join(backupDirectory, OWNED_COMPONENTS_MANIFEST)
}

function launchAgentBackupRelativePath(fileName: string): string {
  return `${LAUNCH_AGENT_BACKUP_PREFIX}${fileName}`
}

export function isPluginOwnedComponentBackup(value: unknown): value is PluginOwnedComponentBackup {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<PluginOwnedComponentBackup>
  if (
    entry.kind !== 'launch-agent' ||
    typeof entry.label !== 'string' ||
    !LAUNCH_AGENT_LABEL_PATTERN.test(entry.label) ||
    typeof entry.originalPath !== 'string' ||
    !isAbsolute(entry.originalPath) ||
    typeof entry.backupRelativePath !== 'string'
  ) return false
  const fileName = basename(entry.originalPath)
  return fileName.endsWith('.plist') &&
    entry.originalPath === join(dirname(entry.originalPath), fileName) &&
    entry.backupRelativePath === launchAgentBackupRelativePath(fileName)
}

function sameComponentBackups(
  left: readonly PluginOwnedComponentBackup[],
  right: readonly PluginOwnedComponentBackup[]
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function writeOwnedComponentsManifest(
  backupDirectory: string,
  manifest: OwnedComponentsManifest
): Promise<void> {
  const path = componentManifestPath(backupDirectory)
  const temporary = `${path}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`
  await validatePluginOwnedComponentBackupPath(backupDirectory, path, true)
  try {
    await writeFile(temporary, `${JSON.stringify(manifest, undefined, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx'
    })
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined)
  }
}

export async function readPluginOwnedComponentBackups(
  backupDirectory: string,
  removalId: string,
  pluginName: string
): Promise<PluginOwnedComponentBackup[]> {
  try {
    await validatePluginOwnedComponentBackupPath(
      backupDirectory,
      componentManifestPath(backupDirectory),
      true
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(componentManifestPath(backupDirectory), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw new Error(`owned component manifest could not be read: ${
      error instanceof Error ? error.message : String(error)
    }`)
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('owned component manifest is invalid')
  }
  const manifest = parsed as Partial<OwnedComponentsManifest>
  if (
    manifest.protocol !== OWNED_COMPONENTS_PROTOCOL ||
    manifest.removalId !== removalId ||
    manifest.pluginName !== pluginName ||
    !Array.isArray(manifest.components) ||
    !manifest.components.every(isPluginOwnedComponentBackup)
  ) {
    throw new Error('owned component manifest does not match its removal record')
  }
  const originalPaths = new Set<string>()
  const backupPaths = new Set<string>()
  for (const component of manifest.components) {
    if (
      originalPaths.has(component.originalPath) ||
      backupPaths.has(component.backupRelativePath)
    ) throw new Error('owned component manifest contains duplicate paths')
    originalPaths.add(component.originalPath)
    backupPaths.add(component.backupRelativePath)
    await validatePluginOwnedComponentBackupPath(
      backupDirectory,
      join(backupDirectory, ...component.backupRelativePath.split('/')),
      true
    )
  }
  return manifest.components
}

export async function discoverLegacyPluginOwnedComponents(options: {
  dshHome: string
  homeDirectory?: string
  readLaunchAgent?: (plistPath: string) => Promise<LaunchAgentDescription>
}): Promise<LegacyPluginComponentDiscovery> {
  const root = join(options.dshHome, 'recovery', 'uninstalled-components')
  const candidates: LegacyPluginComponentCandidate[] = []
  const unverified: string[] = []
  const readLaunchAgent = options.readLaunchAgent ?? defaultReadLaunchAgent
  let stamps: Dirent<string>[]
  try {
    await assertNoLinkedPathSegments(resolve(options.dshHome), resolve(root), true)
    stamps = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { candidates, unverified }
    return { candidates, unverified: [`cannot inspect legacy component recovery root: ${String(error)}`] }
  }
  const launchAgentsDirectory = join(options.homeDirectory ?? homedir(), 'Library', 'LaunchAgents')
  for (const stamp of stamps) {
    const stampPath = join(root, stamp.name)
    const quarantinedAt = legacyQuarantineTimestamp(stamp.name)
    if (!stamp.isDirectory()) {
      unverified.push(`${stampPath}: unexpected legacy recovery entry`)
      continue
    }
    if (!quarantinedAt) {
      unverified.push(`${stampPath}: legacy recovery timestamp is invalid`)
      continue
    }
    let entries: Dirent<string>[]
    try {
      await assertNoLinkedPathSegments(resolve(options.dshHome), resolve(stampPath), false)
      entries = await readdir(stampPath, { withFileTypes: true })
    } catch (error) {
      unverified.push(`${stampPath}: cannot inspect legacy recovery entry (${String(error)})`)
      continue
    }
    for (const entry of entries) {
      const sourcePath = join(stampPath, entry.name)
      if (!entry.isFile() || !entry.name.endsWith('.plist')) {
        unverified.push(`${sourcePath}: unexpected legacy recovery material`)
        continue
      }
      try {
        const launchAgent = await readLaunchAgent(sourcePath)
        const label = typeof launchAgent.Label === 'string' &&
          LAUNCH_AGENT_LABEL_PATTERN.test(launchAgent.Label)
          ? launchAgent.Label
          : undefined
        const packageOwners = packageOwnersFromLaunchAgent(launchAgent)
        if (!label || packageOwners.length === 0) throw new Error('cannot prove LaunchAgent package ownership')
        const originalPath = join(launchAgentsDirectory, entry.name)
        const candidate: LegacyPluginComponentCandidate = {
          sourcePath,
          sourceDigest: await fileDigest(sourcePath),
          quarantinedAt,
          packageOwners,
          component: {
            kind: 'launch-agent',
            label,
            originalPath,
            backupRelativePath: launchAgentBackupRelativePath(entry.name)
          }
        }
        await validateLegacyPluginComponentCandidateLocation({
          dshHome: options.dshHome,
          homeDirectory: options.homeDirectory,
          candidate,
          allowMissingSource: false
        })
        candidates.push(candidate)
      } catch (error) {
        unverified.push(`${sourcePath}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  candidates.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath))
  unverified.sort()
  return { candidates, unverified }
}

function legacyQuarantineTimestamp(directoryName: string): string | undefined {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3}Z)$/u.exec(directoryName)
  if (!match) return undefined
  const iso = `${match[1]}:${match[2]}:${match[3]}.${match[4]}`
  const parsed = new Date(iso)
  return Number.isFinite(parsed.getTime()) && quarantineTimestamp(parsed) === directoryName
    ? parsed.toISOString()
    : undefined
}

export async function validateLegacyPluginComponentCandidateLocation(options: {
  dshHome: string
  candidate: LegacyPluginComponentCandidate
  homeDirectory?: string
  allowMissingSource?: boolean
}): Promise<void> {
  if (!isLegacyPluginComponentCandidate(options.candidate)) {
    throw new Error('legacy component claim candidate is malformed')
  }
  const root = resolve(options.dshHome, 'recovery', 'uninstalled-components')
  const source = resolve(options.candidate.sourcePath)
  const parts = containedPathParts(root, source)
  const expectedStamp = quarantineTimestamp(new Date(options.candidate.quarantinedAt))
  const fileName = basename(source)
  if (
    options.candidate.sourcePath !== source ||
    parts.length !== 2 ||
    parts[0] !== expectedStamp ||
    parts[1] !== fileName ||
    !fileName.endsWith('.plist')
  ) {
    throw new Error('legacy component source path does not match its quarantine timestamp')
  }
  const launchAgents = join(options.homeDirectory ?? homedir(), 'Library', 'LaunchAgents')
  if (options.candidate.component.originalPath !== join(launchAgents, fileName)) {
    throw new Error('legacy component destination is outside the current user LaunchAgents directory')
  }
  await assertNoLinkedPathSegments(
    resolve(options.homeDirectory ?? homedir()),
    resolve(launchAgents),
    true
  )
  await assertNoLinkedPathSegments(
    resolve(options.dshHome),
    source,
    options.allowMissingSource ?? true
  )
}

export async function adoptLegacyPluginOwnedComponents(options: {
  dshHome: string
  backupDirectory: string
  removalId: string
  pluginName: string
  candidates: readonly LegacyPluginComponentCandidate[]
}): Promise<PluginOwnedComponentBackup[]> {
  const components = options.candidates.map((candidate) => candidate.component)
  for (const candidate of options.candidates) {
    await validateLegacyPluginComponentCandidateLocation({
      dshHome: options.dshHome,
      candidate,
      allowMissingSource: false
    })
    if (await fileDigest(candidate.sourcePath) !== candidate.sourceDigest) {
      throw new Error(`legacy component source checksum changed: ${candidate.sourcePath}`)
    }
    const destination = join(
      options.backupDirectory,
      ...candidate.component.backupRelativePath.split('/')
    )
    await ensureDirectoryWithoutLinks(options.backupDirectory, dirname(destination))
    await validatePluginOwnedComponentBackupPath(options.backupDirectory, destination, true)
    await copyComponentWithoutOverwrite(candidate.sourcePath, destination)
    if (
      await fileDigest(candidate.sourcePath) !== candidate.sourceDigest ||
      await fileDigest(destination) !== candidate.sourceDigest
    ) {
      throw new Error(`legacy component claim copy checksum changed: ${destination}`)
    }
  }
  const existing = await readPluginOwnedComponentBackups(
    options.backupDirectory,
    options.removalId,
    options.pluginName
  )
  if (existing.length > 0 && !sameComponentBackups(existing, components)) {
    throw new Error('legacy component claim conflicts with existing recovery records')
  }
  await writeOwnedComponentsManifest(options.backupDirectory, {
    protocol: OWNED_COMPONENTS_PROTOCOL,
    removalId: options.removalId,
    pluginName: options.pluginName,
    components
  })
  return components
}

export async function verifyLegacyPluginComponentClaimMaterial(options: {
  dshHome: string
  backupDirectory: string
  removalId: string
  pluginName: string
  candidates: readonly LegacyPluginComponentCandidate[]
}): Promise<void> {
  for (const candidate of options.candidates) {
    await validateLegacyPluginComponentCandidateLocation({
      dshHome: options.dshHome,
      candidate,
      allowMissingSource: false
    })
    if (await fileDigest(candidate.sourcePath) !== candidate.sourceDigest) {
      throw new Error(`legacy component claim source checksum changed: ${candidate.sourcePath}`)
    }
    const destination = join(
      options.backupDirectory,
      ...candidate.component.backupRelativePath.split('/')
    )
    await validatePluginOwnedComponentBackupPath(options.backupDirectory, destination, true)
    try {
      await lstat(destination)
      if (!await filesMatch(candidate.sourcePath, destination)) {
        throw new Error(`legacy component claim material does not match its source: ${destination}`)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
  const recorded = await readPluginOwnedComponentBackups(
    options.backupDirectory,
    options.removalId,
    options.pluginName
  )
  const expected = options.candidates.map((candidate) => candidate.component)
  if (recorded.length > 0 && !sameComponentBackups(recorded, expected)) {
    throw new Error('legacy component claim manifest does not match its durable intent')
  }
}

async function fileDigest(path: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const stream = createReadStream(path)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.once('error', rejectPromise)
    stream.once('end', resolvePromise)
  })
  return hash.digest('hex')
}

async function filesMatch(left: string, right: string): Promise<boolean> {
  try {
    const [leftStat, rightStat] = await Promise.all([lstat(left), lstat(right)])
    return leftStat.isFile() &&
      rightStat.isFile() &&
      leftStat.size === rightStat.size &&
      await fileDigest(left) === await fileDigest(right)
  } catch {
    return false
  }
}

async function copyComponentWithoutOverwrite(source: string, destination: string): Promise<void> {
  const sourceStat = await lstat(source)
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
    throw new Error(`component backup is not a regular file: ${source}`)
  }
  if (await filesMatch(source, destination)) return
  try {
    await lstat(destination)
    throw new Error(`component restore destination contains different material: ${destination}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  const temporary = `${destination}.${process.pid}.${Date.now()}.${randomUUID()}.restore`
  await mkdir(dirname(destination), { recursive: true })
  try {
    await copyFile(source, temporary, fsConstants.COPYFILE_EXCL)
    if (!await filesMatch(source, temporary)) {
      throw new Error(`component restore copy could not be verified: ${destination}`)
    }
    try {
      await link(temporary, destination)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || !await filesMatch(source, destination)) {
        throw error
      }
    }
    if (!await filesMatch(source, destination)) {
      throw new Error(`restored component does not match its recovery backup: ${destination}`)
    }
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined)
  }
}

/**
 * Restore and reload quarantined LaunchAgents without consuming the recovery
 * copy. Every destination is conflict-checked, and every plist must still
 * reference the currently enabled plugin closure before launchd sees it.
 */
export async function restorePluginOwnedComponents(
  options: PluginComponentRestoreOptions
): Promise<void> {
  if (options.expectedComponents.length === 0) return
  const platform = options.platform ?? process.platform
  if (platform !== 'darwin') throw new Error('LaunchAgent recovery is only supported on macOS')
  const recorded = await readPluginOwnedComponentBackups(
    options.backupDirectory,
    options.removalId,
    options.pluginName
  )
  if (!sameComponentBackups(recorded, options.expectedComponents)) {
    throw new Error('owned component recovery records do not match the removal ledger')
  }

  const homeDirectory = options.homeDirectory ?? homedir()
  const launchAgentsDirectory = join(homeDirectory, 'Library', 'LaunchAgents')
  await ensureDirectoryWithoutLinks(resolve(homeDirectory), resolve(launchAgentsDirectory))
  const activePackageDirectories = await pluginPackageDirectories(options.dshHome, options.pluginName)
  if (activePackageDirectories.length === 0) {
    throw new Error('restored plugin package closure is not active')
  }
  const readLaunchAgent = options.readLaunchAgent ?? defaultReadLaunchAgent
  const bootstrapLaunchAgent = options.bootstrapLaunchAgent ?? defaultBootstrapLaunchAgent
  const inspectLaunchAgent = options.inspectLaunchAgent ?? defaultInspectLaunchAgent
  const uid = options.uid === undefined ? process.getuid?.() ?? null : options.uid
  if (typeof uid !== 'number') throw new Error('cannot restore a LaunchAgent without a user id')
  const domain = `gui/${uid}`

  for (const component of recorded) {
    const fileName = basename(component.originalPath)
    const destination = join(launchAgentsDirectory, fileName)
    if (component.originalPath !== destination) {
      throw new Error(`LaunchAgent recovery destination is outside the current user home: ${component.originalPath}`)
    }
    const source = join(options.backupDirectory, ...component.backupRelativePath.split('/'))
    await validatePluginOwnedComponentBackupPath(options.backupDirectory, source, false)
    const launchAgent = await readLaunchAgent(source)
    if (launchAgent.Label !== component.label) {
      throw new Error(`LaunchAgent backup label does not match its recovery record: ${source}`)
    }
    if (!await launchAgentReferencesDirectories(launchAgent, activePackageDirectories)) {
      throw new Error(`LaunchAgent backup does not reference the restored plugin closure: ${source}`)
    }

    await copyComponentWithoutOverwrite(source, destination)
    const target = `${domain}/${component.label}`
    const bootstrap = await bootstrapLaunchAgent(domain, destination)
    let inspected = await inspectLaunchAgent(target)
    if (bootstrap.code !== 0 && inspected.code !== 0) {
      throw new Error(
        `${destination}: launchctl bootstrap failed (${bootstrap.stderr.trim() || String(bootstrap.code)})`
      )
    }
    if (inspected.code !== 0) inspected = await inspectLaunchAgent(target)
    if (inspected.code !== 0) {
      throw new Error(`${destination}: restored LaunchAgent is not loaded`)
    }
    options.log?.(`[plugin-components] restored and loaded ${destination} for ${options.pluginName}`)
  }
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

  const tracked = options.backupDirectory !== undefined && options.removalId !== undefined
  if (tracked) {
    await ensureDirectoryWithoutLinks(resolve(options.dshHome), resolve(options.backupDirectory!))
  }
  let componentBackups = tracked
    ? await readPluginOwnedComponentBackups(
        options.backupDirectory!,
        options.removalId!,
        options.pluginName
      )
    : []
  const directories = await orphanedPluginPackageDirectories(options.dshHome, options.pluginName)
  if (directories.length === 0 && componentBackups.length === 0) {
    return {
      ok: true,
      matched: 0,
      quarantined: [],
      failures: [],
      ...(tracked ? { componentBackups } : {})
    }
  }

  const homeDirectory = options.homeDirectory ?? homedir()
  const launchAgentsDirectory = join(homeDirectory, 'Library', 'LaunchAgents')
  await assertNoLinkedPathSegments(resolve(homeDirectory), resolve(launchAgentsDirectory), true)
  const readLaunchAgent = options.readLaunchAgent ?? defaultReadLaunchAgent
  const bootoutLaunchAgent = options.bootoutLaunchAgent ?? defaultBootoutLaunchAgent
  const inspectLaunchAgent = options.inspectLaunchAgent ?? defaultInspectLaunchAgent
  const moveComponent = options.moveComponent ?? rename
  const uid = options.uid === undefined ? process.getuid?.() ?? null : options.uid
  const quarantined: string[] = []
  const failures: string[] = []
  let matched = 0
  let entries: Dirent<string>[] = []
  try {
    entries = await readdir(launchAgentsDirectory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      const detail = error instanceof Error ? error.message : String(error)
      failures.push(`cannot inspect ${launchAgentsDirectory}: ${detail}`)
    }
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
    const recorded = componentBackups.find((component) => component.originalPath === plistPath)
    const matchesRecorded = recorded !== undefined && launchAgent.Label === recorded.label
    const matchesClosure = directories.length > 0 &&
      await launchAgentReferencesDirectories(launchAgent, directories)
    if (!matchesRecorded && !matchesClosure) continue
    if (recorded !== undefined && !matchesRecorded) {
      failures.push(`${plistPath}: active LaunchAgent conflicts with its component recovery record`)
      continue
    }
    matched += 1

    const label = typeof launchAgent.Label === 'string' && LAUNCH_AGENT_LABEL_PATTERN.test(launchAgent.Label)
      ? launchAgent.Label
      : undefined
    if (label === undefined || typeof uid !== 'number') {
      failures.push(`${plistPath}: missing a safe LaunchAgent label or user id`)
      continue
    }

    let quarantinePath: string
    if (tracked) {
      const fileName = basename(plistPath)
      const backupRelativePath = launchAgentBackupRelativePath(fileName)
      if (recorded && (recorded.label !== label || recorded.backupRelativePath !== backupRelativePath)) {
        failures.push(`${plistPath}: existing component recovery record does not match`)
        continue
      }
      if (!recorded) {
        componentBackups = [
          ...componentBackups,
          { kind: 'launch-agent', label, originalPath: plistPath, backupRelativePath }
        ]
        await writeOwnedComponentsManifest(options.backupDirectory!, {
          protocol: OWNED_COMPONENTS_PROTOCOL,
          removalId: options.removalId!,
          pluginName: options.pluginName,
          components: componentBackups
        })
      }
      quarantinePath = join(options.backupDirectory!, ...backupRelativePath.split('/'))
      await ensureDirectoryWithoutLinks(options.backupDirectory!, dirname(quarantinePath))
      await validatePluginOwnedComponentBackupPath(
        options.backupDirectory!,
        quarantinePath,
        true
      )
    } else {
      const quarantineDirectory = join(
        options.dshHome,
        'recovery',
        'uninstalled-components',
        quarantineTimestamp((options.now ?? (() => new Date()))())
      )
      quarantinePath = join(quarantineDirectory, basename(plistPath))
      await ensureDirectoryWithoutLinks(resolve(options.dshHome), dirname(quarantinePath))
      await assertNoLinkedPathSegments(resolve(options.dshHome), quarantinePath, true)
    }

    const quarantineExists = await lstat(quarantinePath).then(() => true).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
      throw error
    })
    const recreated = quarantineExists
      ? join(
          dirname(dirname(quarantinePath)),
          'recreated-launch-agents',
          `${Date.now()}-${randomUUID()}-${basename(plistPath)}`
        )
      : undefined
    if (recreated) {
      if (tracked) {
        await ensureDirectoryWithoutLinks(options.backupDirectory!, dirname(recreated))
        await validatePluginOwnedComponentBackupPath(options.backupDirectory!, recreated, true)
      } else {
        await ensureDirectoryWithoutLinks(resolve(options.dshHome), dirname(recreated))
        await assertNoLinkedPathSegments(resolve(options.dshHome), recreated, true)
      }
    }

    const domain = `gui/${uid}`
    const target = `${domain}/${label}`
    let bootout: LaunchctlCommandResult
    try {
      bootout = await bootoutLaunchAgent(target)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      failures.push(`${plistPath}: launchctl bootout failed (${detail})`)
      continue
    }
    if (!await launchServiceIsStoppedAfterBootout(
      bootout,
      target,
      domain,
      inspectLaunchAgent
    )) {
      const detail = bootout.stderr.trim() || String(bootout.code)
      failures.push(`${plistPath}: launchctl bootout failed (${detail})`)
      continue
    }

    try {
      if (recreated) {
        await moveComponent(plistPath, recreated)
        quarantined.push(recreated)
      } else {
        await moveComponent(plistPath, quarantinePath)
        quarantined.push(quarantinePath)
      }
      options.log?.(`[plugin-components] quarantined ${plistPath} for ${options.pluginName}`)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      failures.push(`${plistPath}: quarantine failed (${detail})`)
    }
  }

  if (tracked) {
    for (const component of componentBackups) {
      const sourceExists = await lstat(component.originalPath).then(() => true).catch(() => false)
      const backupPath = join(options.backupDirectory!, ...component.backupRelativePath.split('/'))
      await validatePluginOwnedComponentBackupPath(options.backupDirectory!, backupPath, true)
      const backupExists = await lstat(backupPath).then((entry) => entry.isFile()).catch(() => false)
      if (!sourceExists && !backupExists) {
        failures.push(`${component.originalPath}: recorded component recovery material is missing`)
      }
    }
  }

  return {
    ok: failures.length === 0,
    matched,
    quarantined,
    failures,
    ...(tracked ? { componentBackups } : {})
  }
}
