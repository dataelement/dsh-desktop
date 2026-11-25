import { cp, copyFile, lstat, mkdir, readdir, readFile, readlink, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import path, { dirname, join, type PlatformPath } from 'node:path'

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

/** Roots the Windows copy must not infer from the staging directory name. */
export interface ProfileCopyRoots {
  sourceRoot: string
  stagingRoot: string
  finalRoot: string
}

/** `stat` follows a link. `lstat` reports the link itself. */
export interface ProfileLinkStat {
  isSymbolicLink: () => boolean
  isDirectory: () => boolean
  isFile: () => boolean
}

/** Filesystem view used by the Windows copy. Tests supply a fake one. */
export interface WindowsProfileCopyIo {
  paths: PlatformPath
  lstat: (path: string) => Promise<ProfileLinkStat>
  stat: (path: string) => Promise<ProfileLinkStat>
  readlink: (path: string) => Promise<string>
  symlink: (target: string, path: string, type?: string) => Promise<void>
  readdir: (path: string) => Promise<readonly string[]>
  mkdir: (path: string, options: { recursive: true }) => Promise<unknown>
  copyFile: (source: string, destination: string) => Promise<void>
}

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
  const copy = options.copy ?? ((from, to) => copyProfile({
    sourceRoot: from,
    stagingRoot: to,
    finalRoot: target
  }))
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

const nodeProfileCopyIo: WindowsProfileCopyIo = {
  paths: path,
  lstat,
  stat,
  readlink,
  symlink,
  readdir,
  mkdir: (directory, options) => mkdir(directory, options),
  copyFile
}

async function copyProfile(roots: ProfileCopyRoots): Promise<void> {
  // fs.cp recreates a directory link with symlink() and omits 'junction'.
  // On Windows that asks for a privileged directory symlink. Confirmed
  // directory links are junctions instead, aimed at the final profile root:
  // an absolute junction is not updated when the staging directory is renamed.
  if (process.platform === 'win32') {
    await copyWindowsProfile(roots, nodeProfileCopyIo)
    return
  }
  await cp(roots.sourceRoot, roots.stagingRoot, {
    recursive: true,
    verbatimSymlinks: true,
    filter: candidate => candidate !== join(roots.sourceRoot, 'lock')
  })
}

type LinkKind = 'directory' | 'file' | 'other' | 'missing'

/**
 * Copy a profile on Windows without following links.
 * Directory links become junctions. File links keep their original target
 * string. A link whose followed type cannot be confirmed fails as itself.
 */
export async function copyWindowsProfile(roots: ProfileCopyRoots, io: WindowsProfileCopyIo = nodeProfileCopyIo): Promise<void> {
  await copyEntry(roots.sourceRoot, roots, io)
}

async function copyEntry(sourcePath: string, roots: ProfileCopyRoots, io: WindowsProfileCopyIo): Promise<void> {
  if (sourcePath === io.paths.join(roots.sourceRoot, 'lock')) return
  const destination = stagingPath(sourcePath, roots, io.paths)
  const info = await io.lstat(sourcePath)
  if (info.isSymbolicLink()) {
    await copyLink(sourcePath, destination, roots, io)
    return
  }
  if (info.isDirectory()) {
    await io.mkdir(destination, { recursive: true })
    for (const name of await io.readdir(sourcePath)) {
      await copyEntry(io.paths.join(sourcePath, name), roots, io)
    }
    return
  }
  await io.copyFile(sourcePath, destination)
}

async function copyLink(sourcePath: string, destination: string, roots: ProfileCopyRoots, io: WindowsProfileCopyIo): Promise<void> {
  const rawTarget = await io.readlink(sourcePath)
  const kind = await classifyLinkTarget(sourcePath, io)
  if (kind === 'directory') {
    await io.symlink(directoryJunctionTarget(sourcePath, rawTarget, roots, io.paths), destination, 'junction')
    return
  }
  if (kind === 'file' || kind === 'missing') {
    await io.symlink(rawTarget, destination)
    return
  }
  throw new Error(`dsh desktop: profile link is neither a file nor a directory: ${sourcePath}`)
}

async function classifyLinkTarget(sourcePath: string, io: WindowsProfileCopyIo): Promise<LinkKind> {
  try {
    const info = await io.stat(sourcePath)
    if (info.isDirectory()) return 'directory'
    if (info.isFile()) return 'file'
    return 'other'
  } catch (error) {
    if (isMissing(error)) return 'missing'
    throw error
  }
}

function directoryJunctionTarget(sourcePath: string, rawTarget: string, roots: ProfileCopyRoots, paths: PlatformPath): string {
  if (paths.isAbsolute(rawTarget)) return rawTarget
  const absoluteTarget = paths.resolve(paths.dirname(sourcePath), rawTarget)
  const relativeTarget = paths.relative(roots.sourceRoot, absoluteTarget)
  if (!isLexicalDescendant(relativeTarget, paths)) return absoluteTarget
  if (relativeTarget === '') return roots.finalRoot
  return paths.join(roots.finalRoot, relativeTarget)
}

/** Empty means the source root itself. `..cache` is a directory name, not a parent segment. */
function isLexicalDescendant(relativeTarget: string, paths: PlatformPath): boolean {
  return !paths.isAbsolute(relativeTarget)
    && relativeTarget !== '..'
    && !relativeTarget.startsWith(`..${paths.sep}`)
}

function stagingPath(sourcePath: string, roots: ProfileCopyRoots, paths: PlatformPath): string {
  const relativePath = paths.relative(roots.sourceRoot, sourcePath)
  if (relativePath === '') return roots.stagingRoot
  return paths.join(roots.stagingRoot, relativePath)
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
