import { cp, lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const SOURCE_NAME = 'web'
const TARGET_NAME = 'desktop'
const MARKER_NAME = '.dsh-profile-rename.json'
const PARTIAL_NAME = '.desktop-rename-partial'

export type ProfileRenameStatus = 'source-absent' | 'already-migrated' | 'copied' | 'kept-existing-desktop'

export interface ProfileRenameResult {
  status?: ProfileRenameStatus
}

interface RenameMarker {
  version?: number
  state?: string
  source?: string
  target?: string
}

type ProfileCopy = (source: string, destination: string) => Promise<void>

export interface MigrateWebProfileOptions {
  copy?: ProfileCopy
}

/**
 * Copy `profiles/web` to `profiles/desktop` and leave the old directory in place.
 * A finished copy is not repeated. An interrupted copy is discarded and started again.
 * An existing desktop directory that this migration did not finish is left alone.
 */
export async function migrateWebProfile(dshHome: string, options: MigrateWebProfileOptions = {}): Promise<ProfileRenameResult> {
  const profiles = join(dshHome, 'profiles')
  const source = join(profiles, SOURCE_NAME)
  const target = join(profiles, TARGET_NAME)
  const partial = join(profiles, PARTIAL_NAME)
  const markerPath = join(profiles, MARKER_NAME)
  const marker = await readMarker(markerPath)
  const sourceExists = await pathExists(source)
  const targetExists = await pathExists(target)
  if (sourceExists && await isSymlink(source)) {
    throw new Error('dsh desktop: profiles/web is a symlink and was not copied')
  }
  if (isComplete(marker) && targetExists) return { status: 'already-migrated' }
  if (!sourceExists) {
    await rm(partial, { recursive: true, force: true })
    return { status: 'source-absent' }
  }
  if (targetExists) {
    if (marker?.state === 'copying') {
      await writeMarker(markerPath, completeMarker())
      return { status: 'already-migrated' }
    }
    return { status: 'kept-existing-desktop' }
  }
  const copy = options.copy ?? ((from, to) => copyProfile(from, to))
  await mkdir(profiles, { recursive: true })
  await writeMarker(markerPath, { version: 1, state: 'copying', source: SOURCE_NAME, target: TARGET_NAME })
  try {
    await rm(partial, { recursive: true, force: true })
    await copy(source, partial)
    await rename(partial, target)
    await writeMarker(markerPath, completeMarker())
    return { status: 'copied' }
  } catch (error) {
    await rm(partial, { recursive: true, force: true })
    await rm(markerPath, { force: true })
    throw error
  }
}

async function copyProfile(source: string, destination: string): Promise<void> {
  await cp(source, destination, {
    recursive: true,
    verbatimSymlinks: true,
    filter: path => path !== join(source, 'lock')
  })
}

function completeMarker(): RenameMarker {
  return { version: 1, state: 'complete', source: SOURCE_NAME, target: TARGET_NAME }
}

function isComplete(marker: RenameMarker | undefined): boolean {
  return marker?.version === 1 && marker.state === 'complete' && marker.source === SOURCE_NAME && marker.target === TARGET_NAME
}

async function readMarker(path: string): Promise<RenameMarker | undefined> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if (isMissing(error)) return undefined
    throw error
  }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return undefined
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  return {
    ...(typeof record.version === 'number' ? { version: record.version } : {}),
    ...(typeof record.state === 'string' ? { state: record.state } : {}),
    ...(typeof record.source === 'string' ? { source: record.source } : {}),
    ...(typeof record.target === 'string' ? { target: record.target } : {})
  }
}

async function writeMarker(path: string, marker: RenameMarker): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  try {
    await writeFile(temporary, JSON.stringify(marker))
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true })
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (isMissing(error)) return false
    throw error
  }
}

async function isSymlink(path: string): Promise<boolean> {
  return (await lstat(path)).isSymbolicLink()
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
