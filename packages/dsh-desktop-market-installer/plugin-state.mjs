import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * The single package-level enable switch shared by every plugin surface.
 *
 * A profile plugin is effectively enabled when it is composable (listed in
 * `dsh.profile.bundles`, or re-listed there by projection/healing) AND its
 * package is not in `.dsh-market/state.json#disabled`. Harness boot skips a
 * disabled package before resolving it, and dsh-market reads the same list, so
 * this file is the switch every entry point must write: the market's own
 * toggle, Desktop Recovery/Safe Mode, the official Plugin Manager and the
 * workbench page.
 *
 * `dsh.profile.bundles` stays derived. Launch projection and bundle healing
 * may re-add an installed bundle there; that never re-enables a package the
 * switch keeps off.
 *
 * The user patch layer can additionally hold row overrides. A package switch
 * only drops the overrides that would contradict it for rows the package
 * inserts: `disabled: false` blocks on disable, `disabled: true` blocks on
 * enable. Row IDs are not package identities, so it never adds rows.
 */

export const MARKET_STATE_FILE = join('.dsh-market', 'state.json')
export const USER_PATCH_FILE = 'cordis.patch.yml'

/** Row ids the market will write; anything else is left alone. */
const ROW_ID = /^[A-Za-z0-9_.-]+$/u

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function rowBlockPattern(rowId, disabled) {
  return new RegExp(
    `^- id: ['"]?${escapeRegExp(rowId)}['"]?\\r?\\n  disabled: ${disabled ? 'true' : 'false'}[ \\t]*(?:\\r?\\n|$)`,
    'm'
  )
}

function withoutComments(text) {
  return text.replace(/^[ \t]*#.*$/gmu, '').trim()
}

/**
 * Remove exact `- id: <row>\n  disabled: <flag>` override blocks, restoring
 * the template's `[]` when only comments remain.
 */
export function removePatchRowOverrides(text, rowIds, disabled) {
  let next = text
  for (const rowId of rowIds) {
    if (!ROW_ID.test(rowId)) continue
    const block = rowBlockPattern(rowId, disabled)
    while (block.test(next)) next = next.replace(block, '')
  }
  if (next === text) return { text, changed: false }
  if (withoutComments(next) === '') {
    const revived = next.replace(/^[ \t]*#[ \t]*\[[ \t]*\][ \t]*(?:\r?\n|$)/mu, '[]\n')
    next = revived !== next ? revived : next === '' || next.endsWith('\n') ? `${next}[]\n` : `${next}\n[]\n`
  }
  return { text: next, changed: true }
}

async function readTextIfPresent(path) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

async function writeAtomically(path, text) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, text, 'utf8')
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined)
  }
}

/**
 * The market's state.json with only its disable list interpreted. Every other
 * field belongs to the market and is carried through untouched. An
 * unparseable file is an error, never an empty state to overwrite.
 */
export async function readMarketState(profileDir) {
  const text = await readTextIfPresent(join(profileDir, MARKET_STATE_FILE))
  if (text === undefined) return { state: {}, disabled: [] }
  const state = JSON.parse(text)
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('market state is not a JSON object')
  }
  // Legacy `disabledSkins` is what the market still reads when `disabled` is absent.
  const list = state.disabled !== undefined ? state.disabled : state.disabledSkins
  const disabled = Array.isArray(list) ? list.filter((name) => typeof name === 'string') : []
  return { state, disabled }
}

export async function readDisabledPlugins(profileDir) {
  return (await readMarketState(profileDir)).disabled
}

/** Add or drop one package in the disable list; returns whether the file changed. */
export async function setPluginDisabled(profileDir, pluginName, disabled) {
  const { state, disabled: current } = await readMarketState(profileDir)
  const next = disabled
    ? current.includes(pluginName) ? current : [...current, pluginName]
    : current.filter((name) => name !== pluginName)
  if (next.length === current.length) return false
  await writeAtomically(join(profileDir, MARKET_STATE_FILE), JSON.stringify({ ...state, disabled: next }))
  return true
}

/**
 * Record one package switch from any surface. Contradicting row overrides for
 * the package's own rows are removed first; if the switch cannot be written,
 * the patch layer is put back so the two never disagree.
 * @param options.rowIds - loader rows the package inserts, when known.
 */
export async function recordPluginSwitch(profileDir, pluginName, enabled, { rowIds = [] } = {}) {
  const patchPath = join(profileDir, USER_PATCH_FILE)
  const original = rowIds.length === 0 ? undefined : await readTextIfPresent(patchPath)
  let rewritten = false
  if (original !== undefined) {
    const result = removePatchRowOverrides(original, rowIds, enabled)
    if (result.changed) {
      await writeAtomically(patchPath, result.text)
      rewritten = true
    }
  }
  try {
    await setPluginDisabled(profileDir, pluginName, !enabled)
  } catch (error) {
    if (rewritten && original !== undefined) await writeAtomically(patchPath, original)
    throw error
  }
}

/**
 * Forget a package that is gone: an uninstall must not leave a switch behind,
 * or reinstalling it later brings it back disabled.
 */
export async function forgetPlugin(profileDir, pluginName) {
  return setPluginDisabled(profileDir, pluginName, false)
}
