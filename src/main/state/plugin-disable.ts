import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { isSeq, parse, parseDocument } from 'yaml'
import { bundleEntryIds } from './patch-layer'
import { profileCordisPatchPath, profilePackageJsonPath } from './plugin-recovery'

/**
 * Disable a profile plugin the way dsh-market's own toggle does, so recovery
 * and Safe Mode never delete a plugin to get the app starting again.
 *
 * The package switch is stored in `.dsh-market/state.json`. Harness skips
 * disabled bundles before resolving their manifests, and Desktop applies the
 * switch to host-inserted rows. Row IDs are not package identities: another
 * bundle can insert the same ID (notably `authorization`).
 *
 * The market's toggle also drops a "disable-carrier" (a bundle whose patch
 * disables a plugin it does not own) from `dsh.profile.bundles`. Desktop
 * cannot: the generation projection rewrites that list from the registry on
 * every launch. Disabling only a carrier's own rows would leave its foreign
 * disable applying with nothing to replace it, so carriers are refused and
 * the caller decides what to do instead.
 */

const MARKET_STATE = join('.dsh-market', 'state.json')

/** Row ids the market will write; anything else is refused like the market does. */
const ROW_ID = /^[A-Za-z0-9_.-]+$/

export type PluginDisableResult =
  | { ok: true; rows: string[] }
  | { ok: false; reason: 'carrier'; foreignDisables: string[]; detail: string }
  | { ok: false; reason: 'patch-layer' | 'market-state'; detail: string }

interface PluginPatchRows {
  /** Loader rows the package inserts — the ones a disable targets. */
  inserted: string[]
  /** Rows of OTHER plugins the package's patch disables. */
  foreignDisables: string[]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rowBlockPattern(rowId: string, disabled: boolean): RegExp {
  return new RegExp(
    `^- id: ['"]?${escapeRegExp(rowId)}['"]?\\r?\\n  disabled: ${disabled ? 'true' : 'false'}[ \\t]*(?:\\r?\\n|$)`,
    'm'
  )
}

function rowBlock(rowId: string, disabled: boolean): string {
  return `- id: ${rowId}\n  disabled: ${disabled ? 'true' : 'false'}\n`
}

function withoutComments(text: string): string {
  return text.replace(/^[ \t]*#.*$/gm, '').trim()
}

/**
 * Append one top-level entry to a patch layer, as dsh-market's appendPatchEntry
 * does: an empty or comment-only file takes the entry as is, the template's
 * `[]` placeholder is commented out first, and anything that is not a block
 * entry list is refused rather than made worse.
 */
function appendPatchEntry(text: string, block: string): { text: string } | { error: string } {
  if (text.trim() === '') return { text: block }
  const content = withoutComments(text)
  const terminated = (value: string): string => (value.endsWith('\n') ? value : `${value}\n`)
  if (content === '') return { text: `${terminated(text)}${block}` }
  if (content === '[]' || content === '[ ]') {
    return { text: `${terminated(text.replace(/^[ \t]*\[[ \t]*\][ \t]*(?:#.*)?(?:\r?\n|$)/m, '# []\n'))}${block}` }
  }
  const lastLine = text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .pop() ?? ''
  if (/^[[{]/.test(lastLine)) {
    return { error: 'the patch layer ends in a top-level flow structure; tidy it into an entry list first' }
  }
  const document = parseDocument(text)
  if (document.errors.length > 0 || !isSeq(document.contents)) {
    return { error: 'the patch layer is not a valid entry list; fix the YAML first' }
  }
  return { text: `${terminated(text)}${block}` }
}

/**
 * Switch loader rows off in a patch layer. A row the user force-enabled
 * (`disabled: false`) is flipped in place; a row already off is left alone,
 * so repeating a disable never rewrites the file.
 */
export function disablePatchRows(
  text: string,
  rowIds: readonly string[]
): { text: string; changed: boolean } | { error: string } {
  let next = text
  for (const rowId of rowIds) {
    if (!ROW_ID.test(rowId)) return { error: `row id ${rowId} cannot be written to the patch layer` }
    if (rowBlockPattern(rowId, true).test(next)) continue
    const forced = rowBlockPattern(rowId, false)
    if (forced.test(next)) {
      next = next.replace(forced, rowBlock(rowId, true))
      continue
    }
    const appended = appendPatchEntry(next, rowBlock(rowId, true))
    if ('error' in appended) return appended
    next = appended.text
  }
  return { text: next, changed: next !== text }
}

/** Remove exact row override blocks, restoring `[]` when only comments remain. */
function removePatchRows(text: string, rowIds: readonly string[], disabled: boolean): { text: string; changed: boolean } {
  let next = text
  for (const rowId of rowIds) {
    const block = rowBlockPattern(rowId, disabled)
    while (block.test(next)) next = next.replace(block, '')
  }
  if (next === text) return { text, changed: false }
  if (withoutComments(next) === '') {
    const revived = next.replace(/^[ \t]*#[ \t]*\[[ \t]*\][ \t]*(?:\r?\n|$)/m, '[]\n')
    next = revived !== next ? revived : next === '' || next.endsWith('\n') ? `${next}[]\n` : `${next}\n[]\n`
  }
  return { text: next, changed: true }
}

/** Drop `disabled: true` rows when a plugin is re-enabled. */
export function enablePatchRows(text: string, rowIds: readonly string[]): { text: string; changed: boolean } {
  return removePatchRows(text, rowIds, true)
}

/** Row ids the user patch layer switches off, scanned like dsh-market's readUserPatchState. */
export function patchLayerDisabledRows(text: string): string[] {
  const disabled: string[] = []
  const lines = text.split(/\r?\n/)
  for (const [index, line] of lines.entries()) {
    const row = /^- id: ['"]?([A-Za-z0-9_.-]+)['"]?\s*$/.exec(line)
    if (row && /^ {2}disabled: true\s*$/.test(lines[index + 1] ?? '')) disabled.push(row[1]!)
  }
  return disabled
}

function foreignDisableIds(patchText: string, owned: ReadonlySet<string>): string[] {
  let rows: unknown
  try {
    rows = parse(patchText)
  } catch {
    return []
  }
  if (!Array.isArray(rows)) return []
  const ids: string[] = []
  for (const row of rows) {
    const { id, disabled } = (row ?? {}) as { id?: unknown; disabled?: unknown }
    if (typeof id === 'string' && disabled === true && !owned.has(id) && !ids.includes(id)) ids.push(id)
  }
  return ids
}

/**
 * The rows an installed plugin's bundle patch inserts and the foreign rows it
 * disables. Like dsh-market, both the declared `dsh.bundle.patch` and a root
 * `cordis.patch.yml` count, since the loader probes both.
 */
async function pluginPatchRows(profileDirectory: string, pluginName: string): Promise<PluginPatchRows> {
  const packageDirectory = join(profileDirectory, 'node_modules', pluginName)
  const patchFiles = new Set([resolve(packageDirectory, 'cordis.patch.yml')])
  try {
    const manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8')) as {
      dsh?: { bundle?: { patch?: unknown } }
    }
    const declared = manifest.dsh?.bundle?.patch
    if (typeof declared === 'string' && declared !== '') patchFiles.add(resolve(packageDirectory, declared))
  } catch {
    // Not installed: nothing of it can compose, and there are no rows to aim at.
  }
  const texts: string[] = []
  for (const file of patchFiles) {
    try {
      texts.push(await readFile(file, 'utf8'))
    } catch {
      // A package without this patch file.
    }
  }
  const inserted = [...new Set(texts.flatMap(bundleEntryIds))]
  const owned = new Set(inserted)
  const foreignDisables = [...new Set(texts.flatMap((text) => foreignDisableIds(text, owned)))]
  return { inserted, foreignDisables }
}

async function readTextIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

async function writeAtomically(path: string, text: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, text, 'utf8')
  await rename(temporary, path)
}

/**
 * The market's state.json, with only its disable list interpreted. Every
 * other field is the market's and is carried through untouched. An
 * unparseable file is an error, never an empty state to overwrite.
 */
async function readMarketState(profileDirectory: string): Promise<{ state: Record<string, unknown>; disabled: string[] }> {
  const text = await readTextIfPresent(join(profileDirectory, MARKET_STATE))
  if (text === undefined) return { state: {}, disabled: [] }
  const state = JSON.parse(text) as unknown
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('market state is not a JSON object')
  }
  const record = state as Record<string, unknown>
  // Legacy `disabledSkins` is what the market still reads when `disabled` is absent.
  const list = record.disabled !== undefined ? record.disabled : record.disabledSkins
  const disabled = Array.isArray(list) ? list.filter((name): name is string => typeof name === 'string') : []
  return { state: record, disabled }
}

export async function readMarketDisabledPackages(dshHome: string): Promise<string[]> {
  return (await readMarketState(dirname(profilePackageJsonPath(dshHome)))).disabled
}

/** The market also persists bundle switches in the shared patch layer. Its
 * in-memory disable list can lag that layer when another settings surface
 * changes the same rows, so inspect the package's own inserted rows.
 */
export async function isProfilePluginDisabledByPatch(dshHome: string, pluginName: string): Promise<boolean> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  const { inserted } = await pluginPatchRows(profileDirectory, pluginName)
  if (inserted.length === 0) return false
  const text = await readTextIfPresent(profileCordisPatchPath(dshHome))
  if (text === undefined) return false
  let patches: unknown
  try {
    patches = parse(text)
  } catch {
    return false
  }
  if (!Array.isArray(patches)) return false
  const disabled = new Set(patches.flatMap((row: unknown) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) return []
    const { id, disabled } = row as { id?: unknown; disabled?: unknown }
    return typeof id === 'string' && disabled === true ? [id] : []
  }))
  return inserted.every((id) => disabled.has(id))
}

async function setMarketDisabled(profileDirectory: string, pluginName: string, disabled: boolean): Promise<void> {
  const { state, disabled: current } = await readMarketState(profileDirectory)
  const next = disabled
    ? current.includes(pluginName) ? current : [...current, pluginName]
    : current.filter((name) => name !== pluginName)
  if (next.length === current.length) return
  await writeAtomically(join(profileDirectory, MARKET_STATE), JSON.stringify({ ...state, disabled: next }))
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Switch a plugin off in the normal web profile without deleting anything.
 * Its package, generation, configuration and data all stay; switching it
 * back on in the market (or Safe Mode) restores it.
 */
export async function disableProfilePlugin(dshHome: string, pluginName: string): Promise<PluginDisableResult> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  const { inserted, foreignDisables } = await pluginPatchRows(profileDirectory, pluginName)
  if (foreignDisables.length > 0) {
    return {
      ok: false,
      reason: 'carrier',
      foreignDisables,
      detail: `${pluginName} disables ${foreignDisables.join(', ')}; switching it off alone would leave those disabled with nothing replacing them`
    }
  }

  // The market treats a user-layer `disabled: false` for one of this package's
  // rows as a newer enable decision and clears its persisted disabled flag on
  // boot. Remove only those force-enable blocks; adding `disabled: true` here
  // would also switch off a Desktop or other bundle sharing the row ID.
  const patchPath = profileCordisPatchPath(dshHome)
  let originalPatch: string | undefined
  let clearedPatch: string | undefined
  try {
    originalPatch = await readTextIfPresent(patchPath)
    if (originalPatch !== undefined && inserted.length > 0) {
      const result = removePatchRows(originalPatch, inserted, false)
      if (result.changed) {
        await writeAtomically(patchPath, result.text)
        clearedPatch = result.text
      }
    }
  } catch (error) {
    return { ok: false, reason: 'patch-layer', detail: message(error) }
  }

  try {
    await setMarketDisabled(profileDirectory, pluginName, true)
  } catch (error) {
    if (clearedPatch !== undefined && originalPatch !== undefined) {
      try {
        await writeAtomically(patchPath, originalPatch)
      } catch (rollbackError) {
        return { ok: false, reason: 'market-state', detail: `${message(error)}; patch rollback failed: ${message(rollbackError)}` }
      }
    }
    return { ok: false, reason: 'market-state', detail: message(error) }
  }
  return { ok: true, rows: inserted }
}

/** Undo disableProfilePlugin and legacy row blocks written by older Desktop versions. */
export async function enableProfilePlugin(
  dshHome: string,
  pluginName: string
): Promise<{ ok: boolean; detail?: string }> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  const { inserted } = await pluginPatchRows(profileDirectory, pluginName)
  try {
    const patchPath = profileCordisPatchPath(dshHome)
    const layer = await readTextIfPresent(patchPath)
    if (layer !== undefined && inserted.length > 0) {
      const result = enablePatchRows(layer, inserted)
      if (result.changed) await writeAtomically(patchPath, result.text)
    }
    await setMarketDisabled(profileDirectory, pluginName, false)
    return { ok: true }
  } catch (error) {
    return { ok: false, detail: message(error) }
  }
}

/**
 * Drop a removed plugin from the market's disable list, as the market's own
 * uninstall does; otherwise reinstalling it later brings it back switched off.
 * Its patch rows are the removal's to prune.
 */
export async function forgetMarketDisable(dshHome: string, pluginName: string): Promise<void> {
  await setMarketDisabled(dirname(profilePackageJsonPath(dshHome)), pluginName, false)
}

/**
 * Package switches are authoritative. A row-only override has no package
 * provenance and may belong to another active plugin.
 */
export async function listDisabledProfilePlugins(
  dshHome: string,
  plugins: readonly string[]
): Promise<string[]> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  let marketDisabled: Set<string>
  try {
    marketDisabled = new Set((await readMarketState(profileDirectory)).disabled)
  } catch {
    marketDisabled = new Set()
  }
  return plugins.filter((plugin) => marketDisabled.has(plugin))
}
