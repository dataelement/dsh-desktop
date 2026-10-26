import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { isMap, isScalar, isSeq, parseDocument } from 'yaml'

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

// Treat Harness expressions as inert scalars; never evaluate a user's !!js value.
const YAML_OPTIONS = {
  keepSourceTokens: true,
  merge: true,
  customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: value => value }]
}

function readPatchDocument(text) {
  const document = parseDocument(text, YAML_OPTIONS)
  if (document.errors.length > 0) throw new Error('cannot safely edit invalid Profile patch', { cause: document.errors[0] })
  if (document.contents === null) return { document, rows: [] }
  if (!isSeq(document.contents)) throw new Error('Profile patch must be a sequence of entries')
  // Resolve only YAML aliases/merges, both to validate references and identify inherited ids.
  const rows = document.toJS({ maxAliasCount: 100 })
  return { document, rows }
}

function hasComments(node) {
  return node?.comment || node?.commentBefore
}

/**
 * Remove only contradictory literal boolean properties on owned top-level rows.
 * Source-token ranges preserve all other bytes. Only unanchored, comment-free
 * id+disabled mappings can be deleted; ambiguous matching aliases/merges fail closed.
 * Malformed documents are rejected even if no editable row ids are available.
 */
export function removePatchRowOverrides(text, rowIds, disabled) {
  const { document, rows } = readPatchDocument(text)
  const sequence = document.contents
  if (!isSeq(sequence)) return { text, changed: false }
  const owned = new Set(rowIds.filter(rowId => ROW_ID.test(rowId)))
  const edits = []
  let removed = 0
  for (let index = 0; index < sequence.items.length; index++) {
    const row = sequence.items[index]
    if (!owned.has(rows[index]?.id)) continue
    if (!isMap(row)) throw new Error('cannot safely edit an aliased Profile patch row')
    if (row.items.some(pair => typeof pair.key?.value === 'symbol')) throw new Error('cannot safely edit a merged Profile patch row')
    if (row.items.some(pair => isScalar(pair.key) && ['id', 'disabled'].includes(pair.key.value) && pair.key.tag)) {
      throw new Error('cannot safely edit a tagged Profile patch identity or switch key')
    }
    const id = row.get('id', true)
    if (!isScalar(id) || id.tag) throw new Error('cannot safely edit a non-literal Profile patch id')
    const pair = row.items.find(item => isScalar(item.key) && item.key.value === 'disabled')
    if (!pair) continue
    if (!isScalar(pair.value)) throw new Error('cannot safely edit a non-literal disabled property')
    if (pair.value.value !== disabled) continue
    if (pair.key.anchor || pair.value.anchor || pair.value.tag) throw new Error('cannot safely remove an anchored or tagged disabled property')
    const sequenceStart = sequence.srcToken.items[index].start
    const marker = sequenceStart.find(token => token.type === 'seq-item-ind')
    // Header comments before the dash survive deletion; mapping-owned comments do not.
    const ownsComment = row.comment || sequenceStart.some(token => token.type === 'comment' && token.offset > marker?.offset)
    const pure = row.items.length === 2 && !row.anchor && !row.tag && !ownsComment && !row.flow && !sequence.flow &&
      row.items.every(item => isScalar(item.key) && !item.key.tag && ['id', 'disabled'].includes(item.key.value) &&
        !item.key.anchor && !item.value?.anchor && !hasComments(item.key) && !hasComments(item.value))
    if (pure) {
      if (!marker) throw new Error('Profile patch row has no safe sequence boundary')
      edits.push({ start: marker.offset, end: row.range[1], replacement: '' })
      removed++
      continue
    }
    const start = pair.key.range[0]
    const end = pair.value.range[1]
    if (row.flow) {
      const ownComma = pair.srcToken.start.find(token => token.type === 'comma')
      const next = row.items[row.items.indexOf(pair) + 1]
      const nextComma = next?.srcToken.start.find(token => token.type === 'comma')
      const comma = ownComma ?? nextComma
      if (!comma) throw new Error('Profile patch property has no safe flow boundary')
      edits.push({ start: comma.offset, end: comma.offset + comma.source.length, replacement: '' })
    }
    edits.push({ start, end, replacement: '' })
  }
  if (edits.length === 0) return { text, changed: false }
  if (removed === sequence.items.length) {
    const placeholder = /^[ \t]*#[ \t]*\[[ \t]*\][ \t]*(?=\r?$)/mu.exec(text.slice(0, sequence.range[0]))
    if (placeholder) {
      edits.push({ start: placeholder.index, end: placeholder.index + placeholder[0].length, replacement: '[]' })
    } else {
      edits[0].replacement = text.includes('\r\n') ? '[]\r\n' : '[]\n'
    }
  }
  let next = text
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    next = next.slice(0, edit.start) + edit.replacement + next.slice(edit.end)
  }
  readPatchDocument(next)
  return { text: next, changed: true }
}

/** Side-effect-free preflight; persistence must revalidate the then-current patch. */
export async function validatePluginSwitch(profileDir, pluginName, enabled, { rowIds = [] } = {}) {
  const text = await readTextIfPresent(join(profileDir, USER_PATCH_FILE))
  if (text !== undefined) removePatchRowOverrides(text, rowIds, enabled)
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
 * the patch layer is restored only if it still contains our write. Callers must
 * exclude concurrent writers; these two file replacements are not a transaction.
 * Invalid or ambiguous patch input throws before writing either file.
 * @param options.rowIds - loader rows the package inserts, when known.
 */
export async function recordPluginSwitch(profileDir, pluginName, enabled, { rowIds = [] } = {}) {
  const patchPath = join(profileDir, USER_PATCH_FILE)
  const original = await readTextIfPresent(patchPath)
  let rewritten
  if (original !== undefined) {
    const result = removePatchRowOverrides(original, rowIds, enabled)
    if (result.changed) {
      await writeAtomically(patchPath, result.text)
      rewritten = result.text
    }
  }
  try {
    await setPluginDisabled(profileDir, pluginName, !enabled)
  } catch (error) {
    // Do not knowingly replace an intervening editor's changes while rolling back.
    if (rewritten !== undefined && original !== undefined && await readTextIfPresent(patchPath) === rewritten) {
      await writeAtomically(patchPath, original)
    }
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
