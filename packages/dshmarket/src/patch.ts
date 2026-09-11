/**
 * Patch-layer plugin toggles — hot disable/enable through the profile's
 * user patch layer (cordis.patch.yml), the mechanism ported from
 * Noob-stupid/dsh-plugin-hub's plugin console.
 *
 * DSH composes a web profile from the bundle layers + the user patch layer
 * (`$DSH_HOME/profiles/<name>/cordis.patch.yml`), with per-key override
 * semantics: a patch row `- id: X` + `disabled: true` stops that loader
 * entry, and `disabled: false` force-enables one a lower layer disabled.
 * The profile's config-file watcher (HMR) re-composes within ~1s of the
 * save — no restart — and the loader re-applies the same file on every
 * boot, so the choice survives restarts through the official mechanism.
 *
 * The market ALSO keeps its own in-memory/state.json bookkeeping (hot-mount
 * shims have no bundle row to patch, and the client's disable list drives
 * the switches); this module is the durable, HMR-driven layer on top.
 *
 * Safety (borrowed from the plugin-hub implementation):
 * - writes are serialized so concurrent toggles cannot interleave a
 *   read-modify-write;
 * - an append is REFUSED when the patch file is not a valid entry list —
 *   a malformed file (e.g. a stray `[]` followed by items) is never made
 *   worse, the market reports it instead;
 * - host infrastructure rows (transport / hot-reload / storage / settings
 *   chains) are protected and refuse to toggle.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logEvent } from './log.ts'
import { parsePatchFile, parsePatchText } from './check.ts'
import { bundlePatchInsertedIds, parsePatchRows } from './profile.ts'

/** The slice of the loader tree this module needs. */
export interface PatchHost {
  loader: {
    entries(): Iterable<{
      options?: { id?: string; name?: string; config?: { path?: string } }
    }>
  }
}

/**
 * Host infrastructure rows: disabling any of these breaks the very chain
 * the patch layer runs on (e.g. timer → HMR, webserver → the page itself),
 * so they refuse to toggle. Same list the plugin-hub console uses — the
 * target host is the same DSH.
 */
const PROTECTED_MODULE_PATTERNS = [
  /^cordis:/u,
  /^@deepseek-ai\/cordis-plugin-/u,
  /^@deepseek-ai\/dsh-host-/u,
  /^@deepseek-ai\/dsh-client-modules$/u,
  /^@deepseek-ai\/dsh-client-connection$/u,
  /^@deepseek-ai\/dsh-client-hmr$/u,
  /^@deepseek-ai\/dsh-client-runtime$/u,
  /^@deepseek-ai\/dsh-client-locale$/u,
  /^@deepseek-ai\/dsh-client-web/u,
  /^@deepseek-ai\/dsh-web-frontend$/u,
  /^@deepseek-ai\/dsh-web-app$/u,
  /^@deepseek-ai\/dsh-settings/u,
  /^@deepseek-ai\/dsh-credentials/u,
  /^@deepseek-ai\/dsh-session/u,
  /^@deepseek-ai\/dsh-storage/u,
  /^@deepseek-ai\/dsh-typert/u,
  /^@deepseek-ai\/dsh-api-remotes$/u,
  /^@deepseek-ai\/dsh-tools$/u,
  /^@deepseek-ai\/dsh-system-prompt$/u,
  /^@deepseek-ai\/dsh-agent/u,
  /^@deepseek-ai\/dsh-llm/u,
  /^@deepseek-ai\/dsh-persona$/u,
  /^@deepseek-ai\/dsh-scope$/u,
  /^@deepseek-ai\/dsh-launch-environment$/u,
  /^@deepseek-ai\/dsh-shell$/u,
  /^@deepseek-ai\/dsh-subprocess/u,
  /^@deepseek-ai\/dsh-fs/u,
  /^@deepseek-ai\/dsh-sandbox/u,
  /^@deepseek-ai\/dsh-jobs/u,
  /^@deepseek-ai\/dsh-skill/u,
  /^@deepseek-ai\/dsh-goal/u,
  /^@deepseek-ai\/dsh-workflow/u,
  /^@deepseek-ai\/dsh-subagent/u,
  /^@deepseek-ai\/dsh-web$/u,
  /^@deepseek-ai\/dsh-workspace/u,
  /^@deepseek-ai\/dsh-user-approval$/u,
  /^@deepseek-ai\/dsh-user-questions$/u,
  /^@deepseek-ai\/dsh-commands$/u,
  /^@deepseek-ai\/dsh-hook/u,
  /^@deepseek-ai\/dsh-spill/u,
  /^@deepseek-ai\/dsh-guard/u,
  /^@deepseek-ai\/dsh-tool-call-timeout-policy$/u,
  /^@deepseek-ai\/dsh-repeat-tool-reminder$/u,
]

/** True when the module name sits on the host infrastructure chain. */
export function isProtectedModule(moduleName: string | undefined): boolean {
  return typeof moduleName === 'string' && PROTECTED_MODULE_PATTERNS.some(pattern => pattern.test(moduleName))
}

/**
 * Resolve the profile's user patch layer. Prefers the path the loader's
 * cordis:include entry actually read (authoritative under hosts that own
 * the profile directory, like DSH Desktop); falls back to the conventional
 * `<profile>/cordis.patch.yml`.
 */
export function findUserPatchPath(host: PatchHost, profileDir: string): string {
  for (const entry of host.loader.entries()) {
    const cfg = entry.options?.config
    if (entry.options?.name !== 'cordis:include' || cfg == null || typeof cfg.path !== 'string') continue
    if (!cfg.path.includes('cordis.yml')) continue
    let includePath = cfg.path
    if (includePath.startsWith('file://')) {
      try {
        includePath = fileURLToPath(includePath)
      } catch {
        // fileURLToPath rejects POSIX-style URLs on Windows; the scheme is
        // all we need to strip for the path to be usable.
        includePath = includePath.replace(/^file:\/\//u, '')
      }
    }
    return includePath.replace(/cordis\.yml$/u, 'cordis.patch.yml')
  }
  return join(profileDir, 'cordis.patch.yml')
}

/** What the user patch layer currently says about rows. */
export interface PatchState {
  /** Row ids the user patch disables (`disabled: true`). */
  disables: string[]
  /** Row ids the user patch force-enables (`disabled: false`). */
  forced: string[]
  /** Row ids the user patch inserts. */
  inserts: string[]
}

/** Row ids the market is allowed to write: plain unquoted YAML scalars. */
const ROW_ID_RE = /^[A-Za-z0-9_.-]+$/u

/**
 * Line-wise scan of one patch file — the plugin-hub shapes. Deliberately
 * not a YAML parse: the file may hold structures the market's dialect
 * rejects, but a plain `- id: X` + `disabled: true|false` pair is enough
 * to know what the user patch layer says.
 */
export function readUserPatchState(patchPath: string): PatchState {
  const disables: string[] = []
  const forced: string[] = []
  const inserts: string[] = []
  let text = ''
  try {
    text = readFileSync(patchPath, 'utf8')
  } catch { /* no patch file — empty state */ }
  const lines = text.split(/\r?\n/u)
  let inInsert = false
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (/^- insert:\s*$/u.test(line)) {
      inInsert = true
      continue
    }
    if (/^- /u.test(line)) inInsert = false
    if (inInsert) {
      const insertRow = /^ {4}- id: ([A-Za-z0-9_.-]+)/u.exec(line)
      if (insertRow !== null) inserts.push(insertRow[1])
      continue
    }
    const disableRow = /^- id: ([A-Za-z0-9_.-]+)\s*$/u.exec(line)
    if (disableRow === null) continue
    const next = lines[index + 1] ?? ''
    if (/^ {2}disabled: true\s*$/u.test(next)) disables.push(disableRow[1])
    else if (/^ {2}disabled: false\s*$/u.test(next)) forced.push(disableRow[1])
  }
  return { disables, forced, inserts }
}

/**
 * User-authored insert rows that still load `packageName` (or one of its
 * exported subpaths). This evidence deliberately stays separate from the
 * package's own bundle declaration: uninstall may clean market-owned rows,
 * but it must never rewrite an insert the user owns.
 *
 * A missing patch is the ordinary empty-profile shape. `null` means the
 * existing file could not be read as DSH's patch dialect; callers must treat
 * that as indeterminate and refuse the destructive step.
 */
export function userPatchPackageReferences(patchPath: string, packageName: string): string[] | null {
  let source: string
  try {
    source = readFileSync(patchPath, 'utf8')
  } catch (error) {
    const code = error !== null && typeof error === 'object' && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined
    if (code === 'ENOENT') return []
    return null
  }

  // Use the same schema as profile composition, including !!js scalars. A
  // line scanner cannot distinguish flow-style entries or nested loader
  // groups from arbitrary config keys in a hand-written user patch.
  const rows = parsePatchText(source)
  if (rows === null) return null
  const insertedNames = new Set<string>()
  const visiting = new Set<unknown[]>()
  const visited = new Set<unknown[]>()
  const collect = (entries: unknown[]): boolean => {
    if (visited.has(entries)) return true
    if (visiting.has(entries)) return false
    visiting.add(entries)
    for (const entry of entries) {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        visiting.delete(entries)
        return false
      }
      const row = entry as Record<string, unknown>
      if ('name' in row && typeof row.name !== 'string') {
        visiting.delete(entries)
        return false
      }
      if (typeof row.name === 'string') insertedNames.add(row.name)
      // Only group rows treat an array-valued config as child loader rows.
      // Other plugins may use arrays of `{ name: ... }` as ordinary options,
      // and those must not become false package references.
      if (row.group === true && Array.isArray(row.config)) {
        if (!collect(row.config)) {
          visiting.delete(entries)
          return false
        }
      }
    }
    visiting.delete(entries)
    visited.add(entries)
    return true
  }
  for (const patch of rows) {
    if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return null
    const patchRow = patch as Record<string, unknown>
    if (!('insert' in patchRow)) continue
    if (!Array.isArray(patchRow.insert) || !collect(patchRow.insert)) return null
  }
  return [...insertedNames].filter(
    reference => reference === packageName || reference.startsWith(`${packageName}/`),
  )
}

/** The include entry's id prefix (loader entry ids look like `include:X`). */
function includePrefix(host: PatchHost): string {
  for (const entry of host.loader.entries()) {
    if (entry.options?.name === 'cordis:include' && typeof entry.options.id === 'string') {
      return `${entry.options.id}:`
    }
  }
  return ''
}

/**
 * The user-patch row ids one installed package owns: its bundle patch's
 * insert rows, plus the loader entries currently carrying its name.
 * Empty for client-only packages (no bundle rows) — the market's own
 * state.json mechanism covers those, and there is nothing to patch.
 * Market-owned namespaces (hot-mount `mkt-*`, shim `client-*`) are
 * excluded: their rows live in the market's own include subtree, and a
 * permanent patch row targeting them would be a boot-time orphan.
 */
export function rowIdsForPackage(host: PatchHost, profileDirectory: string, packageName: string): string[] {
  const ids = new Set<string>()
  const packageDir = join(profileDirectory, 'node_modules', packageName)
  // ONLY the rows this package inserts (#147). A bundle patch also carries
  // rows that merely reconfigure OTHER plugins — dsh-vision-router tunes the
  // official `attachment-local` row — and writing `disabled: true` onto
  // those took down attachments and the DeepSeek model along with it.
  try {
    for (const id of bundlePatchInsertedIds(packageDir)) ids.add(id)
  } catch { /* package not installed — loader side may still know it */ }
  // The conventional location too: a package may ship cordis.patch.yml at
  // its root without declaring dsh.bundle.patch (the loader probes it too).
  // Same parser, deliberately: this used to be a second hand-rolled scan
  // that closed the insert block only on `id:` lines, so `- disable:` with
  // nested ids under it claimed the neighbour's rows — #147 all over again
  // on the path #147 did not touch.
  try {
    for (const id of parsePatchRows(readFileSync(join(packageDir, 'cordis.patch.yml'), 'utf8')).insertedIds) {
      ids.add(id)
    }
  } catch { /* no conventional patch — nothing more to add */ }
  const prefix = includePrefix(host)
  for (const entry of host.loader.entries()) {
    if (entry.options?.name !== packageName) continue
    let id = entry.options.id ?? ''
    if (id === '') continue
    if (prefix !== '' && id.startsWith(prefix)) id = id.slice(prefix.length)
    if (/^(?:mkt-|client-)/u.test(id)) continue
    ids.add(id)
  }
  return [...ids]
}

/**
 * Top-level patch rows that DISABLE another plugin: a row carrying both an
 * `id` and `disabled: true`. Rows nested under an `insert:` block are separate
 * array elements shaped `{ insert: [...] }`, so anything here is by definition
 * a sibling row targeting a plugin this package does not own.
 */
function foreignDisableIds(rows: unknown[]): string[] {
  const ids: string[] = []
  for (const row of rows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) continue
    const record = row as Record<string, unknown>
    const id = record.id
    if (typeof id === 'string' && record.disabled === true && !ids.includes(id)) ids.push(id)
  }
  return ids
}

/**
 * The ids of OTHER plugins a package's bundle patch DISABLES — top-level
 * `- id: X` + `disabled: true` rows targeting plugins it does not own. This is
 * the precise marker of a bundle whose toggle-off can brick the boot (#224):
 * dsh-postgres-backends disables session-persistence-jsonl, so once the market
 * also disables the postgres backends nothing provides sessionPersistence.
 *
 * A bundle that merely RECONFIGURES a neighbour is deliberately NOT counted:
 * the e2e fixture-cross tweaks dshm-fixture-b's config, and #147 requires
 * disabling it to leave that neighbour live — dropping such a bundle from the
 * stack broke its re-enable. Config-only side effects stay on the normal #147
 * path; only a foreign `disabled: true` triggers the bundle removal. Removing
 * the bundle still neutralizes any config side effects it carries, since its
 * whole patch stops applying.
 *
 * Reads both patch sources like rowIdsForPackage — the declared dsh.bundle.patch
 * and the conventional root cordis.patch.yml — so either form is detected.
 */
export function carrierDisableIds(profileDirectory: string, packageName: string): string[] {
  const packageDir = join(profileDirectory, 'node_modules', packageName)
  const disabled = new Set<string>()
  const collectFromFile = (patchPath: string): void => {
    const rows = parsePatchFile(patchPath)
    if (rows === null) return
    for (const id of foreignDisableIds(rows)) disabled.add(id)
  }
  try {
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
      dsh?: { bundle?: { patch?: unknown } }
    }
    const declared = manifest.dsh?.bundle?.patch
    if (typeof declared === 'string' && declared !== '') collectFromFile(join(packageDir, declared))
  } catch { /* package not installed — nothing to attribute */ }
  collectFromFile(join(packageDir, 'cordis.patch.yml'))
  return [...disabled]
}

/**
 * Per-package patch-layer flags for the installed list: names whose rows the
 * user patch layer disables / force-enables. These cover toggles made
 * OUTSIDE the market (hand-edited cordis.patch.yml, dsh-web-plugin-manager,
 * the dsh CLI), which the market's own state.json never sees.
 */
export function packagePatchFlags(
  host: PatchHost,
  profileDirectory: string,
  names: readonly string[],
  state: PatchState,
): { disabled: string[]; forced: string[] } {
  const disabled: string[] = []
  const forced: string[] = []
  for (const name of names) {
    const rows = rowIdsForPackage(host, profileDirectory, name)
    if (rows.some(id => state.disables.includes(id))) disabled.push(name)
    if (rows.some(id => state.forced.includes(id))) forced.push(name)
  }
  return { disabled, forced }
}

/** Serialize patch-file writes: concurrent toggles must not interleave. */
let writeQueue: Promise<unknown> = Promise.resolve()
function queuedWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn)
  writeQueue = run.then(() => undefined, () => undefined)
  return run
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function rowBlock(rowId: string, disabled: boolean): string {
  return `- id: ${rowId}\n  disabled: ${disabled ? 'true' : 'false'}\n`
}

/**
 * Append one top-level patch entry, refusing when the file is not a valid
 * entry list. The refusal is the point: a malformed patch layer (the
 * `[]` + items mistake, or any broken YAML) must never be made worse —
 * the market reports it and keeps its own live/state.json toggle instead.
 */
function appendPatchEntry(patchPath: string, block: string): { ok: boolean; reason: string | null } {
  let text = ''
  try {
    text = readFileSync(patchPath, 'utf8')
  } catch { /* created below */ }
  const core = text.trim()
  if (core === '') {
    writeFileSync(patchPath, block)
    return { ok: true, reason: null }
  }
  // The dsh profile template ships an empty `[]` placeholder (a valid
  // empty list). Appending after it would create TWO top-level elements in
  // one document — the exact YAML error a hand-edit runs into. Comment the
  // placeholder out (keeping the template header) and append the entry.
  const withoutComments = text.replace(/^[ \t]*#.*$/gmu, '').trim()
  // Comments only (the user dropped the placeholder): append after them.
  if (withoutComments === '') {
    const next = text.endsWith('\n') ? text : `${text}\n`
    writeFileSync(patchPath, `${next}${block}`)
    return { ok: true, reason: null }
  }
  if (withoutComments === '[]' || withoutComments === '[ ]') {
    const commented = text.replace(/^[ \t]*\[[ \t]*\][ \t]*(?:#.*)?(?:\r?\n|$)/mu, '# []\n')
    const next = commented.endsWith('\n') ? commented : `${commented}\n`
    writeFileSync(patchPath, `${next}${block}`)
    return { ok: true, reason: null }
  }
  // A top-level flow LIST (other than the placeholder above) cannot be
  // appended to: `- id: X` after `[1, 2]` would create two top-level
  // elements in one document. Block items whose VALUE is flow style (e.g.
  // `- config: [1, 2]`) are fine — their last line starts with `- `.
  const lastContentLine = text.split(/\r?\n/u)
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'))
    .pop() ?? ''
  if (/^[[{]/u.test(lastContentLine)) {
    return {
      ok: false,
      reason: '补丁层以顶层流式结构结尾,不支持自动追加;请先整理为条目列表 / the patch layer ends in a top-level flow structure; refusing to append — tidy the file into an entry list first',
    }
  }
  // The dsh entry-list dialect decides: anything that does not parse as a
  // top-level array is left untouched (appending would deepen the break).
  if (parsePatchFile(patchPath) === null) {
    return {
      ok: false,
      reason: '补丁层不是合法的条目数组,已拒绝追加以免破坏;请先修正 YAML / the patch layer is not a valid entry list; refused to append — fix the YAML first',
    }
  }
  const next = text.endsWith('\n') ? text : `${text}\n`
  writeFileSync(patchPath, `${next}${block}`)
  return { ok: true, reason: null }
}

/** Disable one row: append `- id: X` + `disabled: true` (idempotent). */
export function disableRow(patchPath: string, rowId: string): Promise<{ ok: boolean; reason: string | null }> {
  return queuedWrite(async () => {
    if (!ROW_ID_RE.test(rowId)) {
      return { ok: false, reason: `行 id 含特殊字符,不支持写入补丁层 / row id ${rowId} cannot be written to the patch layer` }
    }
    const state = readUserPatchState(patchPath)
    if (state.disables.includes(rowId)) return { ok: true, reason: null }
    const result = appendPatchEntry(patchPath, rowBlock(rowId, true))
    if (result.ok) logEvent('info', 'patch', `disabled row ${rowId} in ${patchPath}`)
    return result
  })
}

/** Enable one row: remove the `disabled: true` block; force-enable with
 * `disabled: false` when a lower layer (bundle/home patch) holds it down. */
export function enableRow(patchPath: string, rowId: string): Promise<{ ok: boolean; reason: string | null }> {
  return queuedWrite(async () => {
    if (!ROW_ID_RE.test(rowId)) {
      return { ok: false, reason: `行 id 含特殊字符,不支持写入补丁层 / row id ${rowId} cannot be written to the patch layer` }
    }
    const state = readUserPatchState(patchPath)
    const blockRe = new RegExp(`^- id: ['\"]?${escapeRegExp(rowId)}['\"]?\\r?\\n  disabled: true\\r?\\n`, 'mu')
    const text = (() => {
      try { return readFileSync(patchPath, 'utf8') } catch { return '' }
    })()
    if (blockRe.test(text)) {
      writeFileSync(patchPath, withPlaceholderRestored(text.replace(blockRe, '')))
      logEvent('info', 'patch', `enabled row ${rowId} in ${patchPath}`)
      return { ok: true, reason: null }
    }
    if (state.forced.includes(rowId)) return { ok: true, reason: null }
    const result = appendPatchEntry(patchPath, rowBlock(rowId, false))
    if (result.ok) logEvent('info', 'patch', `force-enabled row ${rowId} in ${patchPath}`)
    return result
  })
}

/**
 * Put the empty-list placeholder back when nothing else is left.
 *
 * Appending the first row comments the template's `[]` out (see
 * appendPatchEntry), so removing the LAST row leaves a file of pure
 * comments. That is not a top-level array, and dsh refuses to boot the
 * profile at all — "must be a top-level YAML array of loader patch
 * entries". Disable a plugin, enable it again, and the profile is bricked.
 */
function withPlaceholderRestored(text: string): string {
  if (text.replace(/^[ \t]*#.*$/gmu, '').trim() !== '') return text
  const uncommented = text.replace(/^[ \t]*#[ \t]*\[[ \t]*\][ \t]*(?:\r?\n|$)/mu, '[]\n')
  if (uncommented !== text) return uncommented
  // No commented placeholder to revive (hand-written file): add one.
  return text === '' || text.endsWith('\n') ? `${text}[]\n` : `${text}\n[]\n`
}

/** Remove every disable/force block the market (or the user) wrote for a
 * row — the uninstall cleanup, so a removed plugin leaves no orphan rows. */
export function removeRowBlocks(patchPath: string, rowIds: readonly string[]): void {
  let text = ''
  try {
    text = readFileSync(patchPath, 'utf8')
  } catch { return }
  let next = text
  for (const rowId of rowIds) {
    const blockRe = new RegExp(`^- id: ['\"]?${escapeRegExp(rowId)}['\"]?\\r?\\n  disabled: (?:true|false)\\r?\\n`, 'mu')
    next = next.replace(blockRe, '')
  }
  if (next !== text) {
    writeFileSync(patchPath, withPlaceholderRestored(next))
    logEvent('info', 'patch', `removed patch rows for ${rowIds.join(', ')}`)
  }
}
