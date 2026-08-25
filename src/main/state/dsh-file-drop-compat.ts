import { chmod, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PLUGIN_NAME = 'dsh-file-drop'
const SUPPORTED_VERSION = '1.0.0'
const ORIGINAL_FILE_GUARD = '          if (!hasFiles(e)) return'
const RESEARCH_FILE_GUARD =
  '          if (!hasFiles(e) || releaseResearchCanvasEvent(e)) return'
const ORIGINAL_LEAVE_START = `        const onDragLeave = (e) => {
          e.stopPropagation()`
const RESEARCH_LEAVE_START = `        const onDragLeave = (e) => {
          if (releaseResearchCanvasEvent(e)) return
          e.stopPropagation()`

export const DSH_FILE_DROP_RESEARCH_CANVAS_MARKER =
  'Sherlock dsh-file-drop compatibility: Research owns its canvas path.'

export type DshFileDropCompatibilityResult =
  | { status: 'not-installed'; clientPath: string }
  | { status: 'already-compatible'; clientPath: string }
  | { status: 'patched'; clientPath: string }
  | { status: 'unsupported'; clientPath: string; reason: string }

function occurrenceCount(source: string, needle: string): number {
  return source.split(needle).length - 1
}

function hasCompleteCompatibility(source: string): boolean {
  return (
    source.includes(DSH_FILE_DROP_RESEARCH_CANVAS_MARKER) &&
    occurrenceCount(source, RESEARCH_FILE_GUARD) === 3 &&
    occurrenceCount(source, RESEARCH_LEAVE_START) === 1
  )
}

export function patchDshFileDropClientSource(source: string): string | undefined {
  if (source.includes(DSH_FILE_DROP_RESEARCH_CANVAS_MARKER)) {
    return hasCompleteCompatibility(source) ? source : undefined
  }
  if (
    occurrenceCount(source, ORIGINAL_FILE_GUARD) !== 3 ||
    occurrenceCount(source, ORIGINAL_LEAVE_START) !== 1
  ) {
    return undefined
  }

  const hasFiles =
    "        const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')"
  if (occurrenceCount(source, hasFiles) !== 1) return undefined
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

  const patched = source
    .replace(hasFiles, researchOwnership)
    .replaceAll(ORIGINAL_FILE_GUARD, RESEARCH_FILE_GUARD)
    .replace(ORIGINAL_LEAVE_START, RESEARCH_LEAVE_START)
  return hasCompleteCompatibility(patched) ? patched : undefined
}

function pluginPaths(dshHome: string): {
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
    manifestPath: join(pluginDirectory, 'package.json'),
    clientPath: join(pluginDirectory, 'client.js')
  }
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
  const { manifestPath, clientPath } = pluginPaths(dshHome)
  let manifestRaw: string
  let source: string
  let sourceMode: number
  try {
    const [rawManifest, rawSource, sourceStat] = await Promise.all([
      readFile(manifestPath, 'utf8'),
      readFile(clientPath, 'utf8'),
      stat(clientPath)
    ])
    manifestRaw = rawManifest
    source = rawSource
    sourceMode = sourceStat.mode
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
  if (hasCompleteCompatibility(source)) {
    return { status: 'already-compatible', clientPath }
  }

  const patched = patchDshFileDropClientSource(source)
  if (patched === undefined) {
    return {
      status: 'unsupported',
      clientPath,
      reason: 'The dsh-file-drop 1.0.0 client capture handlers did not match.'
    }
  }

  const temporaryPath = `${clientPath}.sherlock-${process.pid}.tmp`
  try {
    await writeFile(temporaryPath, patched, { encoding: 'utf8', mode: sourceMode })
    await chmod(temporaryPath, sourceMode)
    await rename(temporaryPath, clientPath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
  return { status: 'patched', clientPath }
}
