import { createHash, randomUUID } from 'node:crypto'
import {
  chmod,
  lstat,
  open,
  readFile,
  realpath,
  rename,
  rm
} from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'

const PLUGIN_NAME = 'dsh-file-drop'
const SUPPORTED_VERSION = '1.0.0'
const PRISTINE_CLIENT_SHA256 =
  '51260b81dcee8c091ab708698d9c247b190d3e3b9884e930ad9e3742cb7c6377'
const LEGACY_PATCHED_CLIENT_SHA256 =
  'ef70d5f01c43a4a2451e46f6ef01eea8614a838a043a9eabe8a5e5597bf4ca77'
const PATCHED_CLIENT_SHA256 =
  'c8e269525a469cb1733a8318ab429be3152835997c828eabc5568c07c2044cdf'
const ORIGINAL_FILE_GUARD = '          if (!hasFiles(e)) return'
const RESEARCH_FILE_GUARD =
  '          if (!hasFiles(e) || releaseResearchCanvasEvent(e)) return'
const ORIGINAL_LEAVE_START = `        const onDragLeave = (e) => {
          e.stopPropagation()`
const RESEARCH_LEAVE_START = `        const onDragLeave = (e) => {
          if (releaseResearchCanvasEvent(e)) return
          e.stopPropagation()`
const ORIGINAL_APPEND_HELPER = `    function appendToDraft(inputActions, draft, paths) {
      if (!inputActions) return
      const lines = paths.map((p) => '📎 文件：\`' + p + '\`')`
const INLINE_REFERENCE_MARKER =
  'Sherlock dsh-file-drop compatibility: insert native inline file references.'
const INLINE_REFERENCE_APPEND_HELPER = `    function appendToDraft(inputActions, draft, paths) {
      if (!inputActions || !Array.isArray(paths) || paths.length === 0) return
      // ${INLINE_REFERENCE_MARKER}
      if (typeof inputActions.insertFilePaths === 'function') {
        inputActions.insertFilePaths(paths)
        return
      }
      const lines = paths.map((p) => '📎 文件：\`' + p + '\`')`

export const DSH_FILE_DROP_RESEARCH_CANVAS_MARKER =
  'Sherlock dsh-file-drop compatibility: Research owns its canvas path.'
export const DSH_FILE_DROP_INLINE_REFERENCE_MARKER = INLINE_REFERENCE_MARKER

export type DshFileDropCompatibilityResult =
  | { status: 'not-installed'; clientPath: string }
  | { status: 'already-compatible'; clientPath: string }
  | { status: 'patched'; clientPath: string }
  | { status: 'unsupported'; clientPath: string; reason: string }

function occurrenceCount(source: string, needle: string): number {
  return source.split(needle).length - 1
}

function sourceIdentity(source: string): string {
  return createHash('sha256').update(source).digest('hex')
}

export function patchDshFileDropClientSource(source: string): string | undefined {
  const identity = sourceIdentity(source)
  if (identity === PATCHED_CLIENT_SHA256) return source
  const pristine = identity === PRISTINE_CLIENT_SHA256
  const legacyPatched = identity === LEGACY_PATCHED_CLIENT_SHA256
  if (!pristine && !legacyPatched) return undefined
  if (occurrenceCount(source, ORIGINAL_APPEND_HELPER) !== 1) return undefined

  const hasFiles =
    "        const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')"
  if (
    pristine && (
      occurrenceCount(source, ORIGINAL_FILE_GUARD) !== 3 ||
      occurrenceCount(source, ORIGINAL_LEAVE_START) !== 1 ||
      occurrenceCount(source, hasFiles) !== 1
    )
  ) return undefined
  const researchOwnership = `${hasFiles}
        // ${DSH_FILE_DROP_RESEARCH_CANVAS_MARKER}
        const isResearchCanvasEvent = (e) => {
          const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target]
          return path.some((node) => node && typeof node.hasAttribute === 'function' && node.hasAttribute('data-research-canvas'))
        }
        const releaseResearchCanvasEvent = (e) => {
          if (!isResearchCanvasEvent(e)) return false
          depthRef.current = 0
          setDrag(false)
          return true
        }`

  const researchCompatible = pristine
    ? source
        .replace(hasFiles, researchOwnership)
        .replaceAll(ORIGINAL_FILE_GUARD, RESEARCH_FILE_GUARD)
        .replace(ORIGINAL_LEAVE_START, RESEARCH_LEAVE_START)
    : source
  const patched = researchCompatible.replace(
    ORIGINAL_APPEND_HELPER,
    INLINE_REFERENCE_APPEND_HELPER
  )
  return sourceIdentity(patched) === PATCHED_CLIENT_SHA256 ? patched : undefined
}

function pluginPaths(dshHome: string): {
  pluginDirectory: string
  manifestPath: string
  clientPath: string
} {
  const pluginDirectory = join(
    dshHome,
    'profiles',
    'web',
    'node_modules',
    PLUGIN_NAME
  )
  return {
    pluginDirectory,
    manifestPath: join(pluginDirectory, 'package.json'),
    clientPath: join(pluginDirectory, 'client.js')
  }
}

function isContainedPath(boundary: string, candidate: string): boolean {
  const path = relative(boundary, candidate)
  return (
    path.length > 0 &&
    !isAbsolute(path) &&
    path !== '..' &&
    !path.startsWith(`..${sep}`)
  )
}

async function validatePluginPaths(paths: {
  pluginDirectory: string
  manifestPath: string
  clientPath: string
}): Promise<{ sourceMode: number } | { reason: string }> {
  const [pluginInfo, manifestInfo, clientInfo] = await Promise.all([
    lstat(paths.pluginDirectory),
    lstat(paths.manifestPath),
    lstat(paths.clientPath)
  ])
  if (pluginInfo.isSymbolicLink() || !pluginInfo.isDirectory()) {
    return { reason: 'The dsh-file-drop package directory must be a real directory.' }
  }
  if (manifestInfo.isSymbolicLink() || !manifestInfo.isFile()) {
    return { reason: 'The dsh-file-drop package manifest must be a real file.' }
  }
  if (clientInfo.isSymbolicLink() || !clientInfo.isFile()) {
    return { reason: 'The dsh-file-drop client must be a real file.' }
  }

  const [realPluginDirectory, realManifestPath, realClientPath] = await Promise.all([
    realpath(paths.pluginDirectory),
    realpath(paths.manifestPath),
    realpath(paths.clientPath)
  ])
  if (
    !isContainedPath(realPluginDirectory, realManifestPath) ||
    !isContainedPath(realPluginDirectory, realClientPath)
  ) {
    return {
      reason: 'The dsh-file-drop package files must remain inside the resolved package directory.'
    }
  }
  return { sourceMode: clientInfo.mode }
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}

export async function ensureDshFileDropResearchCanvasCompatibility(
  dshHome: string
): Promise<DshFileDropCompatibilityResult> {
  const paths = pluginPaths(dshHome)
  const { manifestPath, clientPath } = paths
  let manifestRaw: string
  let source: string
  let sourceMode: number
  try {
    const pathValidation = await validatePluginPaths(paths)
    if ('reason' in pathValidation) {
      return { status: 'unsupported', clientPath, reason: pathValidation.reason }
    }
    const [rawManifest, rawSource] = await Promise.all([
      readFile(manifestPath, 'utf8'),
      readFile(clientPath, 'utf8')
    ])
    manifestRaw = rawManifest
    source = rawSource
    sourceMode = pathValidation.sourceMode
  } catch (error) {
    if (isMissing(error)) return { status: 'not-installed', clientPath }
    throw error
  }

  let manifest: { name?: unknown; version?: unknown }
  try {
    manifest = JSON.parse(manifestRaw) as { name?: unknown; version?: unknown }
  } catch {
    return {
      status: 'unsupported',
      clientPath,
      reason: 'The dsh-file-drop package manifest is not valid JSON.'
    }
  }
  if (manifest.name !== PLUGIN_NAME || manifest.version !== SUPPORTED_VERSION) {
    return {
      status: 'unsupported',
      clientPath,
      reason: `Expected ${PLUGIN_NAME} ${SUPPORTED_VERSION}.`
    }
  }
  const identity = sourceIdentity(source)
  if (identity === PATCHED_CLIENT_SHA256) {
    return { status: 'already-compatible', clientPath }
  }
  if (
    identity !== PRISTINE_CLIENT_SHA256 &&
    identity !== LEGACY_PATCHED_CLIENT_SHA256
  ) {
    return {
      status: 'unsupported',
      clientPath,
      reason: 'The dsh-file-drop 1.0.0 client source identity did not match.'
    }
  }

  const patched = patchDshFileDropClientSource(source)
  if (patched === undefined) {
    return {
      status: 'unsupported',
      clientPath,
      reason: 'The dsh-file-drop 1.0.0 client compatibility transform did not match.'
    }
  }

  const temporaryPath = `${clientPath}.sherlock-${process.pid}-${randomUUID()}.tmp`
  const sourcePermissions = sourceMode & 0o7777
  let temporaryFile: Awaited<ReturnType<typeof open>> | undefined
  try {
    temporaryFile = await open(temporaryPath, 'wx', sourcePermissions)
    await temporaryFile.writeFile(patched, 'utf8')
    await temporaryFile.sync()
    await temporaryFile.close()
    temporaryFile = undefined
    await chmod(temporaryPath, sourcePermissions)
    await rename(temporaryPath, clientPath)
  } finally {
    await temporaryFile?.close()
    await rm(temporaryPath, { force: true })
  }
  return { status: 'patched', clientPath }
}
