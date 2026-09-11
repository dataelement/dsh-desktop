import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

const DECISION_FILE = '.web-import-decision.json'
const IMPORT_TMP_SUFFIX = '.import-tmp'

/** Packages that stay in the shared tree — never treated as community plugins. */
const KEEP_IN_SHARED_TREE = new Set([
  'dshmarket',
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app'
])

const HOME_FILES = ['settings.yaml', '.credentials.yaml'] as const
const HOME_DIRECTORIES = ['sessions', 'storages', '.agent-presets', 'skills'] as const
const PROFILE_FILES = ['package.json', 'cordis.patch.yml', '.npmrc'] as const
const WORKSPACE_REGISTRY = 'workspace.json'

export type WebImportDecisionKind = 'imported' | 'skipped'

export interface WebImportDecision {
  decision?: WebImportDecisionKind
  source?: string
  at?: string
}

export interface WebHomePreview {
  path?: string
  looksLikeHome?: boolean
  sessionCount?: number
  workspaceCount?: number
  presetCount?: number
  plugins?: string[]
  hasCredentials?: boolean
}

export interface ImportWebHomeOptions {
  source: string
  dest: string
  onProgress?: (line: string) => void
}

interface ProfileManifest {
  dependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

export function defaultWebHome(): string {
  return join(homedir(), '.dsh')
}

export function importDecisionPath(desktopHome: string): string {
  return join(desktopHome, DECISION_FILE)
}

export function importTmpPath(desktopHome: string): string {
  return `${resolve(desktopHome)}${IMPORT_TMP_SUFFIX}`
}

export async function inspectWebHome(path: string): Promise<boolean> {
  if (!path || !(await isDirectory(path))) return false
  return (
    (await isFile(join(path, 'settings.yaml'))) ||
    (await isDirectory(join(path, 'sessions'))) ||
    (await isFile(join(path, 'profiles', 'web', 'package.json')))
  )
}

export async function desktopHomeIsUnused(desktopHome: string): Promise<boolean> {
  if (await readImportDecision(desktopHome)) return false
  if (await isFile(join(desktopHome, 'settings.yaml'))) return false
  if (await directoryHasEntries(join(desktopHome, 'sessions'))) return false
  return true
}

export async function shouldOfferWebHomeImport(
  desktopHome: string,
  webHome = defaultWebHome()
): Promise<boolean> {
  if (!desktopHome || !webHome) return false
  if (resolve(desktopHome) === resolve(webHome)) return false
  if (!(await desktopHomeIsUnused(desktopHome))) return false
  return inspectWebHome(webHome)
}

export async function previewWebHome(path: string): Promise<WebHomePreview> {
  const looksLikeHome = await inspectWebHome(path)
  if (!looksLikeHome) {
    return {
      path,
      looksLikeHome: false,
      sessionCount: 0,
      workspaceCount: 0,
      presetCount: 0,
      plugins: [],
      hasCredentials: false
    }
  }

  const plugins = await communityPluginNames(path)
  return {
    path,
    looksLikeHome: true,
    sessionCount: await countChildDirectories(join(path, 'sessions')),
    workspaceCount: await countWorkspaceEntries(join(path, 'storages')),
    presetCount: await countPresets(join(path, '.agent-presets')),
    plugins,
    hasCredentials: await hasCredentials(join(path, '.credentials.yaml'))
  }
}

export async function readImportDecision(
  desktopHome: string
): Promise<WebImportDecision | undefined> {
  try {
    const value = JSON.parse(await readFile(importDecisionPath(desktopHome), 'utf8')) as WebImportDecision
    if (value.decision !== 'imported' && value.decision !== 'skipped') return undefined
    return value
  } catch {
    return undefined
  }
}

export async function writeSkipDecision(
  desktopHome: string,
  source = defaultWebHome()
): Promise<void> {
  await writeDecision(desktopHome, 'skipped', source)
}

export async function writeImportedDecision(
  desktopHome: string,
  source: string
): Promise<void> {
  await writeDecision(desktopHome, 'imported', source)
}

export async function importWebHome(options: ImportWebHomeOptions): Promise<void> {
  const source = resolve(options.source)
  const dest = resolve(options.dest)
  if (source === dest) {
    throw new Error('web home and desktop home must be different directories')
  }
  if (!(await inspectWebHome(source))) {
    throw new Error('source is not a Harness home')
  }
  if (!(await desktopHomeIsUnused(dest))) {
    throw new Error('desktop home already has user data')
  }

  const tmp = importTmpPath(dest)
  const note = options.onProgress ?? ((): void => undefined)
  await rm(tmp, { recursive: true, force: true })

  try {
    await mkdir(tmp, { recursive: true })
    await copyHomePayload(source, tmp, note)
    await replaceUnusedDest(dest, tmp)
    await writeImportedDecision(dest, source)
    note('imported')
  } catch (error) {
    await rm(tmp, { recursive: true, force: true })
    throw error
  }
}

async function writeDecision(
  desktopHome: string,
  decision: WebImportDecisionKind,
  source: string
): Promise<void> {
  await mkdir(desktopHome, { recursive: true })
  const payload: WebImportDecision = {
    decision,
    source,
    at: new Date().toISOString()
  }
  await writeFile(importDecisionPath(desktopHome), `${JSON.stringify(payload)}\n`, 'utf8')
}

async function copyHomePayload(
  source: string,
  dest: string,
  note: (line: string) => void
): Promise<void> {
  for (const name of HOME_FILES) {
    await copyIfPresent(join(source, name), join(dest, name), dest, note)
  }
  for (const name of HOME_DIRECTORIES) {
    await copyIfPresent(join(source, name), join(dest, name), dest, note)
  }

  const sourceProfile = join(source, 'profiles', 'web')
  const destProfile = join(dest, 'profiles', 'web')
  for (const name of PROFILE_FILES) {
    await copyIfPresent(join(sourceProfile, name), join(destProfile, name), dest, note)
  }

  const plugins = await plannedCommunityPlugins(source)
  for (const plugin of plugins) {
    const sourcePath = plugin.copyDirectory
      ? plugin.packageDir
      : join(plugin.packageDir, 'package.json')
    const destPath = plugin.copyDirectory
      ? join(destProfile, 'node_modules', plugin.name)
      : join(destProfile, 'node_modules', plugin.name, 'package.json')
    await copyIfPresent(sourcePath, destPath, dest, note)
  }
}

async function plannedCommunityPlugins(webHome: string): Promise<Array<{
  name: string
  packageDir: string
  copyDirectory: boolean
}>> {
  const names = await communityPluginNames(webHome)
  const manifest = await readProfileManifest(webHome)
  const planned: Array<{ name: string; packageDir: string; copyDirectory: boolean }> = []
  for (const name of names) {
    const packageDir = join(webHome, 'profiles', 'web', 'node_modules', name)
    const declared = manifest.dependencies?.[name]
    const sourceSpec = typeof declared === 'string' ? declared : `${name}@0.0.0`
    planned.push({
      name,
      packageDir,
      copyDirectory: usesExternalSource(sourceSpec)
    })
  }
  return planned
}

export async function communityPluginNames(webHome: string): Promise<string[]> {
  const manifest = await readProfileManifest(webHome)
  const names = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...(manifest.dsh?.profile?.bundles ?? [])
  ])
  return [...names].filter((name) => !KEEP_IN_SHARED_TREE.has(name)).sort()
}

function usesExternalSource(spec: string): boolean {
  return spec.includes(':') || spec.includes('/') || spec.startsWith('.')
}

function assertInsideDest(destRoot: string, target: string): void {
  const path = relative(resolve(destRoot), resolve(target))
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error('copy destination escaped the desktop home')
  }
}

async function readProfileManifest(webHome: string): Promise<ProfileManifest> {
  try {
    const value = JSON.parse(
      await readFile(join(webHome, 'profiles', 'web', 'package.json'), 'utf8')
    ) as ProfileManifest
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

async function copyIfPresent(
  sourcePath: string,
  destPath: string,
  destRoot: string,
  note: (line: string) => void
): Promise<void> {
  if (!(await exists(sourcePath))) return
  assertInsideDest(destRoot, destPath)
  await mkdir(dirname(destPath), { recursive: true })
  note(relative(destRoot, destPath) || destPath)
  await cp(sourcePath, destPath, {
    recursive: true,
    dereference: true,
    force: true,
    errorOnExist: false
  })
}

async function replaceUnusedDest(dest: string, tmp: string): Promise<void> {
  if (!(await desktopHomeIsUnused(dest))) {
    throw new Error('desktop home became used while copying')
  }
  if (existsSync(dest)) {
    await rm(dest, { recursive: true, force: true })
  }
  await rename(tmp, dest)
}

async function countWorkspaceEntries(storagesDir: string): Promise<number> {
  const registryPath = join(storagesDir, WORKSPACE_REGISTRY)
  try {
    const value: unknown = JSON.parse(await readFile(registryPath, 'utf8'))
    return countWorkspaceValue(value)
  } catch {
    return 0
  }
}

function countWorkspaceValue(value: unknown): number {
  if (Array.isArray(value)) return value.length
  if (!value || typeof value !== 'object') return 0
  const record = value as Record<string, unknown>
  for (const key of ['items', 'workspaces', 'entries']) {
    if (Array.isArray(record[key])) return record[key].length
  }
  const values = Object.values(record).filter((entry) => entry && typeof entry === 'object')
  if (values.some((entry) => {
    const item = entry as Record<string, unknown>
    return typeof item.path === 'string' || typeof item.workspaceId === 'string'
  })) {
    return values.length
  }
  return Object.keys(record).filter((key) => !key.startsWith('_') && key !== 'version').length
}

async function countPresets(presetDir: string): Promise<number> {
  if (!(await isDirectory(presetDir))) return 0
  const entries = await readdir(presetDir, { withFileTypes: true }).catch(() => [])
  return entries.filter((entry) => !entry.name.startsWith('.')).length
}

async function countChildDirectories(directory: string): Promise<number> {
  if (!(await isDirectory(directory))) return 0
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).length
}

async function directoryHasEntries(directory: string): Promise<boolean> {
  if (!(await isDirectory(directory))) return false
  const entries = await readdir(directory).catch(() => [])
  return entries.some((name) => !name.startsWith('.'))
}

async function hasCredentials(path: string): Promise<boolean> {
  try {
    const text = await readFile(path, 'utf8')
    return text.trim().length > 0
  } catch {
    return false
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}
