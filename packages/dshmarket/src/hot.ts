/**
 * Restart-free installs: mount a freshly installed plugin into the running
 * composition through a market-owned Include subtree.
 *
 * Durable state stays with the profile's `dsh.profile.bundles` (reconciled by
 * the dsh CLI at install time), so the next boot loads the plugin through the
 * normal bundle layer. The subtree here exists only for the current process:
 * its input files live under `<profile>/.dsh-market/` and are wiped on every
 * boot, so a crash can never leave a file that collides with the bundle layer
 * (inserting an id the bundle layer also inserts is a hard boot failure).
 * `state.json` in the same directory is the market's own durable state
 * (disable list + custom groups) and deliberately survives the wipe.
 *
 * The Include subclass suppresses `write()` — the loader otherwise persists
 * tree changes back to the file it read (see dsh's agent-presets PresetTree
 * for the in-tree precedent).
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { asChannel, type Channel } from './channels.ts'
import { asRegion, type Region } from './regions.ts'
import { logEvent } from './log.ts'

interface HotRow {
  id: string
  name: string
}

interface PluginHandle {
  await(): Promise<unknown>
  dispose(): Promise<unknown> | void
}

interface HotContext {
  plugin(plugin: unknown, config: unknown): PluginHandle
  logger?: { info?(message: string): void; warn(message: string): void }
}

const HOT_DIR = '.dsh-market'

/**
 * Ceiling for one hot-mount activation, env-overridable like the install
 * timeout in dsh-cli.ts. An activation that exceeds it is treated as wedged
 * (typically a plugin pending on a service nothing provides) and falls back
 * to restart activation.
 */
const HOT_MOUNT_TIMEOUT_MS = Number(process.env.DSH_MARKET_HOT_MOUNT_TIMEOUT_MS) || 10000

let hotTreeClass: unknown | null | undefined

/**
 * The Include subclass, built once per process; null when the loader's include
 * plugin is not importable (older harness) — callers fall back to restart.
 */
/**
 * Packages whose host import is replaced by a no-op shim. Client-only plugins
 * (`dsh.client` without `dsh.bundle`) have no importable host half, but
 * client-modules only serves bundles for packages with a live loader entry —
 * the shim fiber exists purely to satisfy that registration.
 */
const shimNames = new Set<string>()

async function loadHotTreeClass(): Promise<unknown | null> {
  if (hotTreeClass !== undefined) return hotTreeClass
  try {
    // Computed specifier: the include plugin ships with the harness (vendored,
    // unpublished), so it resolves at runtime through the profile fallback but
    // is not typecheckable as a dependency.
    const specifier = '@deepseek-ai/cordis-plugin-include'
    const mod = (await import(specifier)) as {
      Include?: new (...args: never[]) => {
        write(): void
        import(name: string, getOuterStack?: () => string[]): unknown
      }
    }
    const Include = mod.Include
    if (Include === undefined) throw new Error('no Include export')
    class MarketHotTree extends Include {
      /** Runtime-only mount list; the bundle layer owns persistence. */
      override write(): void {}
      override import(name: string, getOuterStack?: () => string[]): unknown {
        if (shimNames.has(name)) return { name, apply: () => {} }
        return super.import(name, getOuterStack)
      }
    }
    hotTreeClass = MarketHotTree
  } catch {
    hotTreeClass = null
  }
  return hotTreeClass
}

/** The `dsh` declaration block of an installed package, or null when unreadable. */
function readPkgDsh(profileDir: string, packageName: string): { client?: unknown; bundle?: unknown } | null {
  try {
    const manifest = JSON.parse(
      readFileSync(join(profileDir, 'node_modules', packageName, 'package.json'), 'utf8'),
    ) as { dsh?: { client?: unknown; bundle?: unknown } }
    return manifest.dsh ?? {}
  } catch {
    return null
  }
}

/**
 * Insert rows of a plugin's bundle patch, or null when the patch contains
 * anything beyond plain `id`/`name` insert rows (config blocks, disables,
 * expressions) — those compositions fall back to restart activation.
 */
export function parseSimplePatch(patchText: string): HotRow[] | null {
  const rows: HotRow[] = []
  let pending: string | null = null
  // Split on CRLF too. `#.*$` cannot strip a comment that ends in \r —
  // JS treats \r as a line terminator, so `.` will not cross it and `$`
  // only anchors at the very end — leaving the comment text in place,
  // matching none of the row shapes, and failing the whole patch. Any
  // plugin whose patch was authored on Windows then reads as
  // "contains config/expression rows" and can never hot-mount.
  for (const raw of patchText.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trimEnd()
    if (line.trim() === '') continue
    if (/^-\s+insert:\s*$/.test(line)) continue
    const id = /^\s+-\s+id:\s*(\S+)\s*$/.exec(line)
    if (id !== null) {
      if (pending !== null) return null
      pending = id[1]
      continue
    }
    const name = /^\s+name:\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line)
    if (name !== null && pending !== null) {
      rows.push({ id: pending, name: name[1] })
      pending = null
      continue
    }
    return null
  }
  if (pending !== null || rows.length === 0) return null
  return rows
}

/**
 * Wipe leftover hot-mount inputs; call once when the market host starts.
 * `state.json` (disable choices + groups) deliberately survives.
 */
export function cleanHotDir(profileDir: string): void {
  const dir = join(profileDir, HOT_DIR)
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    if (/^hot-\d+\.yml$/.test(name)) rmSync(join(dir, name), { force: true })
  }
}

function stateFile(profileDir: string): string {
  return join(profileDir, HOT_DIR, 'state.json')
}

/** Persisted market state: the generic disable list plus custom groups. */
export interface MarketState {
  /** Plugins the user switched off; replayed at every boot. */
  disabled: Set<string>
  /** User-defined plugin groups: group name → member package names. */
  groups: Record<string, string[]>
  /** Display order of group names; "ungrouped" is implicit and never listed. */
  groupOrder: string[]
  /**
   * The user's own one-line note per installed plugin (#347).
   *
   * A catalog description answers "what is this", written by its author for
   * strangers and often in a language the reader did not pick. It cannot
   * answer "why did I install this" — which is the question someone with
   * forty plugins is actually asking. So a note REPLACES the description on
   * that row, and the original stays one click away.
   *
   * Local state like the disable list and the groups beside it: never sent
   * anywhere, and carried by a backup because it is part of how this profile
   * is set up.
   *
   * Optional on the way IN: several callers build a state object from the
   * few fields they own and hand it to writeMarketState. Requiring this one
   * would make every such call a silent way to erase every note — the exact
   * shape of #339, where a partial snapshot dropped a field nobody was
   * thinking about. Omitting it means "leave them alone" instead.
   */
  notes?: Record<string, string>
  /**
   * The release channel the user PICKED, absent until they pick one.
   *
   * Absent is not the same as 'stable': with no choice on record the channel
   * is derived from the running build, so installing a prerelease by hand
   * puts you on the beta channel without a second step. Once chosen, the
   * choice is the answer — including "stable" while a beta is running, which
   * is how someone gets back off the channel.
   */
  channel?: Channel
  /**
   * The download region in force, absent until something has decided one.
   *
   * Absent means "nobody has decided yet", which is what triggers the
   * one-time network probe. Once a value is here — whether the probe wrote
   * it or the user picked it — no further probing happens, so the market
   * does not silently change routes between runs.
   */
  region?: Region
  /**
   * Whether `region` was chosen by the probe rather than by the user.
   *
   * Only drives a one-time notice explaining why the market picked what it
   * picked. A user who never learns a route was chosen for them has no way
   * to know the setting exists, and no reason to look for it when something
   * downloads oddly.
   */
  regionAuto?: boolean
}

/** Unique non-empty strings in `value`, order preserved. */
function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item === '' || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

/**
 * Read the whole market state. Legacy `disabledSkins` (the pre-#60
 * theme-only key) still loads; every new write uses the generic `disabled`
 * key (#60).
 */
/** A note is a label, not a document: one line, bounded so state.json cannot
 * grow without limit from a paste. */
export const MAX_NOTE = 200

export function readMarketState(profileDir: string): MarketState {
  try {
    const state = JSON.parse(readFileSync(stateFile(profileDir), 'utf8')) as {
      disabled?: unknown
      disabledSkins?: unknown
      groups?: unknown
      groupOrder?: unknown
      channel?: unknown
      region?: unknown
      regionAuto?: unknown
      notes?: unknown
    }
    const disabled = uniqueStrings(state.disabled !== undefined ? state.disabled : state.disabledSkins)
    const groups: Record<string, string[]> = {}
    if (state.groups !== null && typeof state.groups === 'object' && !Array.isArray(state.groups)) {
      for (const [name, members] of Object.entries(state.groups)) {
        groups[name] = uniqueStrings(members)
      }
    }
    const notes: Record<string, string> = {}
    if (state.notes !== null && typeof state.notes === 'object' && !Array.isArray(state.notes)) {
      for (const [name, text] of Object.entries(state.notes)) {
        // Empty is the same as absent: clearing a note must not leave a row
        // claiming to carry one.
        if (typeof text === 'string' && text.trim() !== '') notes[name] = text.slice(0, MAX_NOTE)
      }
    }
    return {
      disabled: new Set(disabled),
      groups,
      notes,
      groupOrder: uniqueStrings(state.groupOrder),
      channel: asChannel(state.channel) ?? undefined,
      region: asRegion(state.region) ?? undefined,
      // Only meaningful beside a region, and only when true: a stray flag
      // with no region would promise a notice about a choice nobody made.
      regionAuto: state.regionAuto === true && asRegion(state.region) !== null ? true : undefined,
    }
  } catch {
    return { disabled: new Set(), groups: {}, groupOrder: [], notes: {} }
  }
}

/**
 * Persist the whole market state.
 *
 * Every field a caller does not carry forward is taken from disk rather than
 * dropped. Several callers legitimately know about only one part of the
 * state — `writeMarketState(dir, { disabled, groups, groupOrder })` appears
 * at five call sites in routes.ts — and before #435 that shape silently
 * erased whatever else the user had chosen:
 *
 * - `channel` and `region` had no fallback at all, so toggling any plugin
 *   threw away the user's update channel and download region. Both are
 *   deliberate choices made through the settings card, and neither has a
 *   "clear it" path: once picked they only ever move to another value. So
 *   an absent one always means "the caller has nothing to say", never
 *   "the user unchose it".
 * `notes` keeps its original rule — an explicit object wins, including an
 * empty one, because deleting the last note has to be expressible. What made
 * #435 lose notes was not this function but a caller: the note route wrote
 * through a fresh read while the long-lived `marketState` in routes.ts still
 * carried `notes: {}` from boot, and the next write from that object put the
 * empty one back. The fix for that belongs at the call site, where the two
 * copies are, not here — see the note route.
 *
 * Reading before writing costs one small JSON parse on an operation that is
 * already doing filesystem work, and it is what makes "this function writes
 * the whole document" safe for callers that only hold part of it.
 */
export function writeMarketState(profileDir: string, state: MarketState): void {
  mkdirSync(join(profileDir, HOT_DIR), { recursive: true, mode: 0o700 })
  const onDisk = readMarketState(profileDir)
  // `?? {}` only for the type: MarketState declares notes optional, while
  // readMarketState always returns an object.
  const notes = state.notes ?? onDisk.notes ?? {}
  const channel = state.channel ?? onDisk.channel
  const region = state.region ?? onDisk.region
  // Unlike channel and region, regionAuto has an explicit clear path: a
  // manual region choice owns this field and sets it to undefined. Preserve
  // the disk value only when the caller omitted the property entirely.
  const regionAuto = Object.prototype.hasOwnProperty.call(state, 'regionAuto')
    ? state.regionAuto
    : onDisk.regionAuto
  writeFileSync(stateFile(profileDir), JSON.stringify({
    disabled: [...state.disabled],
    groups: state.groups,
    groupOrder: state.groupOrder,
    ...(Object.keys(notes).length > 0 ? { notes } : {}),
    // Omitted while unchosen, so "never picked" survives a round trip and
    // keeps deriving from the running build — but only when disk has not
    // recorded a choice either.
    ...(channel === undefined ? {} : { channel }),
    // Same reasoning, different consequence: an absent region is what makes
    // the probe run, so writing a default here would mean it never does.
    ...(region === undefined ? {} : { region }),
    ...(regionAuto === true ? { regionAuto: true } : {}),
  }))
}

/** Plugins the user switched off; skipped by the boot re-mount. */
export function readDisabled(profileDir: string): Set<string> {
  return readMarketState(profileDir).disabled
}

/** Persist just the disable list, preserving groups and order. */
export function writeDisabled(profileDir: string, disabled: Set<string>): void {
  const state = readMarketState(profileDir)
  state.disabled = new Set(disabled)
  writeMarketState(profileDir, state)
}

/** @deprecated theme-specific alias — kept for pre-#60 callers. */
export function readDisabledThemes(profileDir: string): Set<string> {
  return readDisabled(profileDir)
}

/** @deprecated theme-specific alias — kept for pre-#60 callers. */
export function writeDisabledThemes(profileDir: string, disabled: Set<string>): void {
  writeDisabled(profileDir, disabled)
}

/** Package names currently live through a market hot mount (patch or shim). */
export function listHotMounts(): string[] {
  return [...hotHandles.keys()]
}

let hotSequence = 0

const hotHandles = new Map<string, PluginHandle>()

/** Activation did not settle within HOT_MOUNT_TIMEOUT_MS. */
class ActivationTimeout extends Error {}

/**
 * Race an activation awaitable against the hot-mount ceiling. The handlers
 * stay attached to the original promise, so a late rejection after a timeout
 * can never surface as an unhandled rejection.
 */
function raceActivationTimeout<T>(awaitable: T | Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ActivationTimeout(`activation did not settle within ${HOT_MOUNT_TIMEOUT_MS / 1000}s — the plugin may be waiting on a service that never arrives`))
    }, HOT_MOUNT_TIMEOUT_MS)
    Promise.resolve(awaitable).then(
      value => { clearTimeout(timer); resolve(value) },
      error => { clearTimeout(timer); reject(error) },
    )
  })
}

/** Outcome of one hot-mount attempt; `reason` explains non-`ok` results. */
export interface HotMountResult {
  ok: boolean
  /** Bilingual reason shown to the user instead of a bare restart banner. */
  reason: string | null
}

/**
 * Dispose a plugin hot-mounted earlier in this session, removing it from the
 * running composition immediately.
 * @param packageName - package to unmount.
 * @returns true when a live hot mount was found and disposed.
 */
export async function hotUnmount(packageName: string): Promise<boolean> {
  const handle = hotHandles.get(packageName)
  if (handle === undefined) return false
  hotHandles.delete(packageName)
  shimNames.delete(packageName)
  try {
    await handle.dispose()
    logEvent('info', 'hot-unmount', `${packageName}: removed live`)
    return true
  } catch (error) {
    logEvent('warn', 'hot-unmount', `${packageName}: dispose failed — ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Mount `packageName` (just installed into the profile) into the running
 * composition.
 * @param ctx - market host context; the subtree unwinds with the market's fiber.
 * @param profileDir - profile the package was installed into.
 * @param packageName - installed package to activate.
 * @returns whether the plugin is live without a restart, plus the reason
 * when it is not (P0-2: the UI must distinguish "restart will fix it" from
 * "this package can never hot-mount").
 */
export async function hotMount(ctx: HotContext, profileDir: string, packageName: string): Promise<HotMountResult> {
  try {
    const HotTree = await loadHotTreeClass()
    if (HotTree === null) {
      return {
        ok: false,
        reason: '宿主不支持热挂载(include 插件不可导入),需重启 / the host cannot hot-mount (include plugin unavailable); restart required',
      }
    }
    let patchText: string | null
    try {
      patchText = readFileSync(
        join(profileDir, 'node_modules', packageName, 'cordis.patch.yml'),
        'utf8',
      )
    } catch {
      patchText = null
    }
    let rows: HotRow[] | null
    if (patchText !== null) {
      rows = parseSimplePatch(patchText)
      if (rows === null) {
        return {
          ok: false,
          reason: 'bundle patch 含配置行/表达式,热挂载仅支持纯 insert,重启后生效 / the bundle patch contains config/expression rows; hot-mount only supports plain inserts — it activates on restart',
        }
      }
    } else {
      // No host patch. Client-only packages (dsh.client, no dsh.bundle) never
      // get a loader entry — not even after a restart — so client-modules
      // would never serve their bundle. A shim entry under the package's name
      // is the whole activation.
      const dsh = readPkgDsh(profileDir, packageName)
      if (dsh === null || dsh.client === undefined || dsh.bundle !== undefined) {
        return {
          ok: false,
          reason: '该包无 bundle patch 且未声明 dsh.client,没有可热挂载的内容 / no bundle patch and no dsh.client surface — nothing to hot-mount',
        }
      }
      shimNames.add(packageName)
      rows = [{ id: `client-${packageName.replace(/[^A-Za-z0-9_.-]/g, '-')}`, name: packageName }]
    }
    const dir = join(profileDir, HOT_DIR)
    mkdirSync(dir, { recursive: true, mode: 0o700 })
    hotSequence += 1
    const file = join(dir, `hot-${String(hotSequence)}.yml`)
    const yml = rows
      .map(row => `- id: 'mkt-${row.id}'\n  name: '${row.name}'\n`)
      .join('')
    writeFileSync(file, yml)
    const handle = ctx.plugin(HotTree, { path: pathToFileURL(file).href })
    try {
      await raceActivationTimeout(handle.await())
    } catch (error) {
      if (error instanceof ActivationTimeout) {
        // A wedged activation would otherwise hold this request open forever:
        // the route's `finally { installing = false }` never runs, so every
        // later install/update/uninstall gets 409'd until a host restart.
        // Unwind the half-mounted subtree best-effort; disposal never blocks
        // the reply, and the caller falls back to restart activation.
        try { Promise.resolve(handle.dispose()).catch(() => {}) } catch { /* best effort */ }
      }
      throw error
    }
    hotHandles.set(packageName, handle)
    ctx.logger?.info?.(`[dsh-market] hot-mounted ${packageName}`)
    logEvent('info', 'hot-mount', `${packageName}: live${shimNames.has(packageName) ? ' (client-only shim)' : ''}`)
    return { ok: true, reason: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger?.warn(`[dsh-market] hot mount of ${packageName} failed, restart required: ${message}`)
    logEvent('warn', 'hot-mount', `${packageName}: fell back to restart — ${message}`)
    return { ok: false, reason: `热挂载失败,重启后生效 — ${message} / hot-mount failed — restart required: ${message}` }
  }
}

/**
 * Mount every installed client-only package (`dsh.client` without
 * `dsh.bundle`) at market startup. The bundle reconcile skips these packages
 * entirely, so without the market's shim their client bundles are unreachable
 * in every boot — this is what makes them behave like normal plugins.
 * @returns names that were mounted.
 */
export async function mountClientOnlyDeps(ctx: HotContext, profileDir: string): Promise<string[]> {
  let deps: string[]
  try {
    const manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      dsh?: { profile?: { bundles?: string[] } }
    }
    const bundles = new Set(manifest.dsh?.profile?.bundles ?? [])
    deps = Object.keys(manifest.dependencies ?? {}).filter(name => !bundles.has(name))
  } catch {
    return []
  }
  const disabled = readDisabled(profileDir)
  const userManaged = readUserPatchControls(profileDir)
  const mounted: string[] = []
  for (const name of deps) {
    if (hotHandles.has(name) || disabled.has(name)) continue
    // Packages the USER's patch layer already manages (insert or disable
    // rows in cordis.patch.yml, e.g. via dsh-web-plugin-manager) are theirs
    // to control — a shim here would override a user's "disabled" choice on
    // every restart (#58 by @vikna919).
    if (patchLayerManages(userManaged, name)) continue
    const dsh = readPkgDsh(profileDir, name)
    if (dsh === null || dsh.client === undefined || dsh.bundle !== undefined) continue
    if ((await hotMount(ctx, profileDir, name)).ok) mounted.push(name)
  }
  return mounted
}

/**
 * Row ids and package names the user's own patch layer (cordis.patch.yml)
 * already contains. Line-wise scan on purpose: the file may hold structures
 * the market's strict patch parser rejects, but any mention of a row id or
 * package name is enough to know the user manages it (#58).
 */
export function readUserPatchControls(profileDir: string): { ids: Set<string>; names: Set<string> } {
  const ids = new Set<string>()
  const names = new Set<string>()
  try {
    const text = readFileSync(join(profileDir, 'cordis.patch.yml'), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const id = /^\s*-?\s*id:\s*['"]?([A-Za-z0-9._/@-]+)/.exec(line)
      if (id !== null) ids.add(id[1])
      const name = /^\s*name:\s*['"]?([^'"\s]+)/.exec(line)
      if (name !== null) names.add(name[1])
    }
  } catch { /* no user patch file — nothing is user-managed */ }
  return { ids, names }
}

/**
 * Whether the user patch layer manages `name` — matched by exact package
 * name or by the plugin-manager row-id convention (strip the leading @,
 * non-alphanumerics to '-', lowercase).
 */
export function patchLayerManages(controls: { ids: Set<string>; names: Set<string> }, name: string): boolean {
  const rowId = name.replace(/^@/, '').replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  return controls.ids.has(rowId) || controls.names.has(name)
}


/**
 * Delete the market's own state directory.
 *
 * `cleanHotDir` wipes the ephemeral hot-mount inputs on every boot but
 * deliberately preserves `state.json` — the disable list and custom groups
 * are the user's durable choices. Uninstalling the market is the one moment
 * where removing them is the right thing, and only when the user asked.
 * @returns true when a directory was there to remove.
 */
export function purgeMarketState(profileDir: string): boolean {
  const dir = join(profileDir, HOT_DIR)
  try {
    rmSync(dir, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}
