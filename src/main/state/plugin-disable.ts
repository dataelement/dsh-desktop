import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { isSeq, parse, parseDocument } from 'yaml'
import { bundleEntryIds } from './patch-layer'
import { isThirdPartyPackageName, profileCordisPatchPath, profilePackageJsonPath } from './plugin-recovery'

/**
 * Disable a profile plugin the way dsh-market's own toggle does, so recovery
 * and Safe Mode never delete a plugin to get the app starting again.
 *
 * The market persists a switched-off plugin in two places, and both are
 * written here in its exact shapes:
 *
 *   - the user patch layer (`cordis.patch.yml`) gets `- id: <row>` +
 *     `disabled: true` for every loader row the package inserts. The loader
 *     re-applies that layer on every boot, so the plugin is never composed —
 *     this is the part that actually gets a broken profile past startup.
 *   - `.dsh-market/state.json` lists the package under `disabled`. That is
 *     what the market page shows, and the only switch for client-only
 *     packages, whose client bundles are served solely by the market's shims.
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
  | { ok: false; reason: 'broken-package' | 'patch-layer' | 'market-state'; detail: string }

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

/**
 * Drop the `disabled: true` blocks for these rows. Removing the last entry
 * would leave a comment-only file, which dsh refuses to boot; the `[]`
 * placeholder comes back instead, as in dsh-market's enableRow.
 */
export function enablePatchRows(text: string, rowIds: readonly string[]): { text: string; changed: boolean } {
  let next = text
  for (const rowId of rowIds) next = next.replace(rowBlockPattern(rowId, true), '')
  if (next === text) return { text, changed: false }
  if (withoutComments(next) === '') {
    const revived = next.replace(/^[ \t]*#[ \t]*\[[ \t]*\][ \t]*(?:\r?\n|$)/m, '[]\n')
    next = revived !== next ? revived : next === '' || next.endsWith('\n') ? `${next}[]\n` : `${next}\n[]\n`
  }
  return { text: next, changed: true }
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
 * The bundles the loader composes on the next launch. A package listed here
 * is one the loader will prepare — it reads the package manifest and the
 * patch it declares before any user layer applies — so a listed bundle that
 * yields no loader row is broken on disk, not a plugin without rows.
 */
async function profileBundleNames(dshHome: string): Promise<Set<string>> {
  try {
    const manifest = JSON.parse(await readFile(profilePackageJsonPath(dshHome), 'utf8')) as {
      dsh?: { profile?: { bundles?: unknown } }
    }
    const bundles = manifest.dsh?.profile?.bundles
    return new Set(
      Array.isArray(bundles) ? bundles.filter((name): name is string => typeof name === 'string') : []
    )
  } catch {
    // Without a readable manifest nothing can be claimed about the bundles;
    // the caller's existing paths still apply.
    return new Set()
  }
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

  // A client-only plugin has no loader rows and is switched off in the market
  // state alone. A package the profile lists as a BUNDLE is different: the
  // loader prepares it on every launch, so no readable row means its manifest
  // or its declared patch is unreadable. Writing only the market state there
  // reports success while the next launch composes — and fails on — the same
  // broken bundle, so say so and let the caller remove it with a backup.
  if (
    inserted.length === 0 &&
    isThirdPartyPackageName(pluginName) &&
    (await profileBundleNames(dshHome)).has(pluginName)
  ) {
    return {
      ok: false,
      reason: 'broken-package',
      detail: `${pluginName} is listed in dsh.profile.bundles but no loader row could be read from its package; the patch layer has nothing to switch off`
    }
  }

  if (inserted.length > 0) {
    const patchPath = profileCordisPatchPath(dshHome)
    try {
      const layer = await readTextIfPresent(patchPath) ?? ''
      const result = disablePatchRows(layer, inserted)
      if ('error' in result) return { ok: false, reason: 'patch-layer', detail: result.error }
      if (result.changed) await writeAtomically(patchPath, result.text)
    } catch (error) {
      return { ok: false, reason: 'patch-layer', detail: message(error) }
    }
  }

  try {
    await setMarketDisabled(profileDirectory, pluginName, true)
  } catch (error) {
    // The patch rows already keep a bundle plugin out of the next boot. A
    // client-only plugin has nothing else to switch it off.
    if (inserted.length === 0) return { ok: false, reason: 'market-state', detail: message(error) }
  }
  return { ok: true, rows: inserted }
}

/** Undo disableProfilePlugin: drop the patch rows and the market's disable entry. */
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
 * The given plugins that are switched off, by either the patch layer or the
 * market's list — the same two sources the market's own installed list reads.
 */
export async function listDisabledProfilePlugins(
  dshHome: string,
  plugins: readonly string[]
): Promise<string[]> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  let disabledRows: Set<string>
  let marketDisabled: Set<string>
  try {
    disabledRows = new Set(patchLayerDisabledRows(await readTextIfPresent(profileCordisPatchPath(dshHome)) ?? ''))
  } catch {
    disabledRows = new Set()
  }
  try {
    marketDisabled = new Set((await readMarketState(profileDirectory)).disabled)
  } catch {
    marketDisabled = new Set()
  }
  const disabled: string[] = []
  for (const plugin of plugins) {
    if (marketDisabled.has(plugin)) {
      disabled.push(plugin)
      continue
    }
    const { inserted } = await pluginPatchRows(profileDirectory, plugin)
    if (inserted.some((row) => disabledRows.has(row))) disabled.push(plugin)
  }
  return disabled
}
