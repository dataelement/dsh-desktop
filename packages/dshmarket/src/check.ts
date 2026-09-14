/**
 * Profile composition diagnostics — issue #98 (phase 1): the check-only
 * "plugin loading layer and conflict view".
 *
 * Pure filesystem analysis of one dsh profile directory; no processes, no
 * network, no writes. It answers, for the profile the market is serving:
 *
 *  1. What is the actual bundle stack (dsh.profile.bundles order) and where
 *     does each layer come from (official in-box bundle vs community, the
 *     dependency spec, the resolved directory)?
 *  2. Which loader entry ids does the composed tree contain, and are any
 *     duplicated across layers (the "duplicate loader entry id" boot failure
 *     from #98)? Which rows does a later layer override?
 *  3. Does any installed plugin pull a DSH host core package
 *     (@deepseek-ai/dsh, @deepseek-ai/dsh-tools, @deepseek-ai/cordis, …) in
 *     as an ordinary dependency — the dsh-excel-chat failure mode where the
 *     plugin's copy gets hoisted to the profile root and shadows the host's
 *     version (tool calls die, minimal preset fails to mount)?
 *  4. Are there multiple versions of one core package in the lockfile, and
 *     do plugin peerDependencies ranges match the resolved core version?
 *  5. Do effective user/home patch entries reference npm package roots that
 *     are installed in the profile-visible node_modules ancestry?
 *
 * The composition step mirrors @deepseek-ai/dsh-app-boot's applyEntryPatches
 * (same js-yaml dialect incl. `!!js` scalars), so the rows reported here are
 * what actually mounts at boot.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire, isBuiltin } from 'node:module'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { JSON_SCHEMA, Type, load } from 'js-yaml'
import { findDshInstallDir } from './dsh-install.ts'
import { resolveDshHome } from './home-paths.ts'
import { INBOX_BUNDLES, readBundleRules, suggestOrder, validateOrder } from './order.ts'

export { findDshInstallDir } from './dsh-install.ts'

/** js-yaml dialect for `!!js` scalars — identical to dsh-app-boot's entryListSchema. */
const jsExpr = new Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  resolve: (data: unknown): boolean => typeof data === 'string',
  construct: (data: unknown): unknown => ({ __jsExpr: String(data) }),
})
const entrySchema = JSON_SCHEMA.extend(jsExpr)

/** Boot-breaking or confirmed problems vs informational warnings. */
export interface CheckSummary {
  ok: boolean
  errors: string[]
  warnings: string[]
}

/** One layer of the bundle stack, in `dsh.profile.bundles` order. */
export interface BundleLayer {
  name: string
  /** Dependency spec from the profile package.json (npm range, git, link:…). */
  source: string
  /** 'official' = in-box dsh bundle; 'community' = everything else. */
  kind: 'official' | 'community'
  /** Resolved package directory; null when the package is not installed. */
  directory: string | null
  /** Absolute path of the layer's patch file; null when undeclared/missing. */
  patchPath: string | null
  /**
   * An in-box bundle whose directory could not be located — a gap in what
   * this process can see, not a defect in the profile (#369). Distinct from
   * `error`, which asserts the profile will not boot.
   */
  unresolvedInbox?: boolean
  /** Why this layer cannot load at boot (missing dir / no dsh.bundle / …). */
  error: string | null
  /** Loader entry ids this bundle's patch inserts. */
  entries: string[]
  /** The patch file exists but could not be parsed as the entry-list dialect. */
  parseError: string | null
  /** Author-declared ordering constraints (issue #98 phase 2), when present. */
  order?: {
    before?: string[]
    after?: string[]
    /** Violated rules for THIS bundle in the current stack order. */
    conflicts?: Array<{ name: string; reason: string }>
  }
}

/** One loader row of the composed tree, with the layer that introduced it. */
export interface LoaderRow {
  id: string
  /** Bundle package name, 'user-patch' (profile cordis.patch.yml) or 'home-patch'. */
  layer: string
  kind: 'insert' | 'patch'
  name?: string
}

/** An id present in more than one composed row — the #98 duplicate-id boot failure. */
export interface DuplicateId {
  id: string
  /** Every layer that inserts/defines this id. */
  layers: string[]
  count: number
}

/** A non-insert patch row that merged into an existing entry (later layer wins). */
export interface OverrideRow {
  id: string
  layer: string
  /** Layers that introduced the targeted entry earlier in the stack. */
  overriddenLayers: string[]
}

/** A patch row that matched nothing at boot (dsh warns and skips it). */
export interface OrphanRow {
  id: string
  layer: string
  reason: string
}

/** Directional verdict for one confirmed peer mismatch (issue #201 diagnostics). */
export interface PeerRisk {
  plugin: string
  peer: string
  range: string
  resolved: string
  direction: 'belowMin' | 'aboveMax'
}

export interface PeerWarning {
  plugin: string
  peer: string
  range: string
  resolved: string
  reason: 'aboveMax' | 'optional'
}

/** classifyPeer result: risk / warning / none — none means informational. */
export type PeerVerdict =
  | { kind: 'risk'; risk: PeerRisk }
  | { kind: 'warning'; warning: PeerWarning }
  | { kind: 'none' }

/** A plugin peerDependencies range vs the resolved version. */
export interface PeerMismatch {
  plugin: string
  name: string
  range: string
  resolved: string | null
  /** False = confirmed incompatible; null = could not be evaluated. */
  satisfied: boolean | null
  /**
   * The declaring plugin marked this peer `optional` in
   * `peerDependenciesMeta`. Carried so the summary can hold the same line
   * `classifyPeer` already does: an optional peer that does not match is
   * the plugin saying "I work without this", not a broken install (#275).
   */
  optional?: boolean
  /**
   * The directional verdict, attached by `/dsh-market/check` for rows that
   * did not match. It is computed on the server because the client cannot
   * read `peerDependenciesMeta` off disk, and the tiering would otherwise
   * have to be guessed from the range string (#201).
   */
  verdict?: PeerVerdict
}

/**
 * Loader entries sharing one NAME across DIFFERENT layers — the Loader
 * registers plugins by name, so a later layer's row with the same name
 * shadows the earlier one at runtime. Same-layer rows sharing a name are
 * routine (a bundle defining several entries under one name) and are never
 * reported here. Unlike duplicate ids (report.duplicates), which fail the
 * boot outright, shadowing names only decide which entry wins at runtime.
 */
export interface DuplicateName {
  name: string
  /** Every layer that inserts/defines a row with this name. */
  layers: string[]
  count: number
}

/** Distinct resolved versions of one core package found in the lockfile. */
export interface MultiVersion {
  name: string
  versions: string[]
  /** Version hoisted at the profile root, when present. */
  hoisted: string | null
}

/** The full check report for one profile. */
export interface CheckReport {
  profile: string
  scannedAt: number
  bundles: BundleLayer[]
  rows: LoaderRow[]
  duplicates: DuplicateId[]
  duplicateNames: DuplicateName[]
  overrides: OverrideRow[]
  orphans: OrphanRow[]
  peerMismatches: PeerMismatch[]
  multiVersion: MultiVersion[]
  /** Before/after rule conflicts in the CURRENT bundle order (issue #98 phase 2). */
  orderConflicts: Array<{ name: string; reason: string }>
  /** LOOT-style auto-fix: a community order satisfying every declared rule. */
  suggestedOrder: { ok: true; order: string[] } | { ok: false; cycle: string[] } | null
  summary: CheckSummary
}

export interface CheckOptions {
  /** DSH host install dir; auto-detected from the CLI entry or Desktop resources when omitted. */
  dshInstallDir?: string
  /** Harness home for the home-level patch layer; defaults to $DSH_HOME or ~/.dsh. */
  homeDir?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Parse entry-list source with the DSH dialect; null when it is not a list. */
export function parsePatchText(text: string): unknown[] | null {
  try {
    const value = load(text, { schema: entrySchema })
    return Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

/** Parse one entry-list patch file with the DSH dialect; null when unreadable. */
export function parsePatchFile(path: string): unknown[] | null {
  try {
    return parsePatchText(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

/** Whether `name` goes through the Loader's bare-module resolver. */
function isBareLoaderSpecifier(name: string): boolean {
  return !name.startsWith('.')
    && !name.startsWith('#')
    && !isAbsolute(name)
    && !/^[a-z][a-z\d+.-]*:/i.test(name)
}

/** Npm package root owning one bare Loader specifier. */
function packageRoot(specifier: string): string | null {
  const parts = specifier.split('/')
  const segments = specifier.startsWith('@') ? parts.slice(0, 2) : parts.slice(0, 1)
  if (segments.length !== (specifier.startsWith('@') ? 2 : 1)) return null
  if (segments.some(segment => segment === '' || segment === '.' || segment === '..'
    || segment.includes('%') || segment.includes('\\'))) return null
  if (specifier.startsWith('@') && (segments[0]?.length ?? 0) <= 1) return null
  return segments.join('/')
}

/**
 * Package-root presence from the Loader-visible profile ancestry only.
 * An explicit walk avoids CommonJS global lookup directories that
 * `createRequire(...).resolve.paths()` appends but Node ESM does not search.
 */
function profilePackageInstalled(profileDirectory: string, name: string): boolean {
  try {
    const profile = JSON.parse(readFileSync(join(profileDirectory, 'package.json'), 'utf8')) as unknown
    if (isRecord(profile) && profile.name === name
      && profile.exports !== undefined && profile.exports !== null) return true
  } catch { /* not a self-referencing profile package */ }
  let directory = resolve(profileDirectory)
  while (true) {
    const packageDirectory = join(directory, 'node_modules', name)
    // Node stops at the nearest matching package directory. A partial install
    // there shadows any healthy parent copy and must not be accepted.
    try {
      if (statSync(packageDirectory).isDirectory()) {
        return existsSync(join(packageDirectory, 'package.json'))
      }
    } catch { /* keep walking */ }
    const parent = dirname(directory)
    if (parent === directory) return false
    directory = parent
  }
}

/** Every id in one patch row's insert list, recursively (group configs included). */
function collectInsertIds(rows: unknown[]): string[] {
  const ids: string[] = []
  const walk = (value: unknown): void => {
    if (!Array.isArray(value)) return
    for (const entry of value) {
      if (!isRecord(entry) || typeof entry.id !== 'string') continue
      ids.push(entry.id)
      if (Array.isArray(entry.config)) walk(entry.config)
    }
  }
  for (const patch of rows) {
    if (!isRecord(patch) || !Array.isArray(patch.insert)) continue
    walk(patch.insert)
  }
  return ids
}

/** DSH host core packages: what the dsh installation ships under @deepseek-ai. */
export function corePackageNames(dshInstallDir: string | null): Set<string> {
  const names = new Set<string>([
    // Curated fallback seed (used when the install dir cannot be located).
    '@deepseek-ai/dsh',
    '@deepseek-ai/dsh-base',
    '@deepseek-ai/dsh-web-app',
    '@deepseek-ai/dsh-headless',
    '@deepseek-ai/dsh-app-boot',
    '@deepseek-ai/dsh-home-paths',
    '@deepseek-ai/dsh-launch-environment',
    '@deepseek-ai/dsh-cmdline',
    '@deepseek-ai/dsh-tools',
    '@deepseek-ai/dsh-llm',
    '@deepseek-ai/dsh-system-prompt',
    '@deepseek-ai/dsh-attachment',
    '@deepseek-ai/dsh-agent',
    '@deepseek-ai/dsh-agent-loop',
    '@deepseek-ai/dsh-session',
    '@deepseek-ai/dsh-subagent',
    '@deepseek-ai/cordis',
    '@deepseek-ai/cordis-plugin-loader',
    '@deepseek-ai/cordis-plugin-include',
    '@deepseek-ai/cordis-plugin-hmr',
    '@deepseek-ai/cordis-plugin-timer',
    '@deepseek-ai/cordis-plugin-group',
  ])
  if (dshInstallDir === null) return names
  try {
    // The install's own node_modules is the authoritative host-core inventory:
    // everything under @deepseek-ai whose bare name starts with dsh or cordis,
    // plus the app package itself.
    for (const entry of readdirSync(join(dshInstallDir, 'node_modules', '@deepseek-ai'), { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
      if (/^(?:dsh|cordis)/.test(entry.name)) names.add(`@deepseek-ai/${entry.name}`)
    }
  } catch { /* install node_modules unreadable — the curated seed stands */ }
  try {
    const manifest = JSON.parse(readFileSync(join(dshInstallDir, 'package.json'), 'utf8')) as { name?: unknown }
    if (typeof manifest.name === 'string') names.add(manifest.name)
  } catch { /* not a package dir */ }
  return names
}

/** Version of `name` as physically resolved at `base`/node_modules, or null. */
function readNodeModulesVersion(base: string, name: string): string | null {
  try {
    const manifest = JSON.parse(
      readFileSync(join(base, 'node_modules', name, 'package.json'), 'utf8'),
    ) as { version?: unknown }
    return typeof manifest.version === 'string' ? manifest.version : null
  } catch {
    return null
  }
}

/**
 * Resolve one package's directory the way the dsh boot does
 * (dsh-app-boot's resolveBundleDir): probe Node's own node_modules search
 * paths from the installation anchor first, then the profile directory.
 * Node resolution walks upward, so this also finds pnpm's workspace-root
 * hoisting (`<profiles>/node_modules/…` when the profile lives under
 * `<profiles>/<name>`) and mirrors the Loader's package search roots.
 */
function resolvePackageDir(
  anchorPackageJson: string,
  name: string,
  ignoredPackageDirectory?: string,
): string | null {
  let paths: string[] = []
  try {
    paths = createRequire(anchorPackageJson).resolve.paths(name) ?? []
  } catch {
    return null
  }
  const ignored = ignoredPackageDirectory === undefined
    ? null
    : resolve(ignoredPackageDirectory)
  for (const searchPath of paths) {
    const candidate = join(searchPath, name)
    if (ignored !== null) {
      const resolvedCandidate = resolve(candidate)
      const matchesIgnored = process.platform === 'win32'
        ? resolvedCandidate.toLowerCase() === ignored.toLowerCase()
        : resolvedCandidate === ignored
      if (matchesIgnored) continue
    }
    if (existsSync(join(candidate, 'package.json'))) return candidate
  }
  return null
}

/**
 * Version of `name` visible to the profile's dependency tree: the profile's
 * own node_modules first, then the workspace root (pnpm hoists shared deps
 * there when the profile is a workspace member — the dsh layout keeps
 * `<profiles>/node_modules` as the shared store for all profiles).
 */
function readProfileVisibleVersion(profileDirectory: string, name: string): string | null {
  const direct = readNodeModulesVersion(profileDirectory, name)
  if (direct !== null) return direct
  const workspaceRoot = dirname(profileDirectory)
  if (workspaceRoot === profileDirectory) return null
  return readNodeModulesVersion(workspaceRoot, name)
}

/** Top-level installed package names (incl. scoped), excluding pnpm internals. */
function installedPackageNames(profileDir: string): string[] {
  const names: string[] = []
  // Windows `link:` installs are junctions; Dirent.isDirectory() is false for
  // them on some Node versions, so treat symlinks as packages too (B2).
  const isPkgDir = (entry: { isDirectory(): boolean; isSymbolicLink(): boolean }): boolean =>
    entry.isDirectory() || entry.isSymbolicLink()
  let root: string[]
  try {
    root = readdirSync(join(profileDir, 'node_modules'), { withFileTypes: true })
      .filter(entry => isPkgDir(entry) && entry.name !== '.bin' && entry.name !== '.pnpm' && entry.name !== '.dsh-plugin-backups')
      .map(entry => entry.name)
  } catch {
    return names
  }
  for (const name of root) {
    if (!name.startsWith('@')) {
      names.push(name)
      continue
    }
    try {
      for (const scoped of readdirSync(join(profileDir, 'node_modules', name), { withFileTypes: true })) {
        if (isPkgDir(scoped)) names.push(`${name}/${scoped.name}`)
      }
    } catch { /* empty scope dir */ }
  }
  return names
}

// --- semver helpers (small subset sufficient for peer range checks) ---

interface Semver {
  major: number
  minor: number
  patch: number
  pre: string[]
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

function parseSemver(value: string): Semver | null {
  const m = SEMVER_RE.exec(value.trim())
  if (m === null) return null
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] === undefined ? [] : m[4].split('.'),
  }
}

function comparePre(a: string[], b: string[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    const x = a[i]
    const y = b[i]
    if (x === undefined) return y === undefined ? 0 : -1 // a has fewer parts → a < b
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) return Number(x) - Number(y) || 0
    if (xn) return -1 // numeric identifiers sort before alphanumeric
    if (yn) return 1
    return x < y ? -1 : 1
  }
  return 0
}

/** Compare two semver strings: negative | zero | positive (prerelease < release of same base). */
export function compareSemver(a: string, b: string): number {
  const av = parseSemver(a)
  const bv = parseSemver(b)
  if (av === null || bv === null) return a < b ? -1 : a > b ? 1 : 0
  if (av.major !== bv.major) return av.major - bv.major || 0
  if (av.minor !== bv.minor) return av.minor - bv.minor || 0
  if (av.patch !== bv.patch) return av.patch - bv.patch || 0
  if (av.pre.length === 0 && bv.pre.length === 0) return 0
  if (av.pre.length === 0) return 1 // release > prerelease
  if (bv.pre.length === 0) return -1
  return comparePre(av.pre, bv.pre)
}

function gte(a: Semver, b: Semver): boolean {
  const cmp = compareSemver(`${a.major}.${a.minor}.${a.patch}${a.pre.length > 0 ? `-${a.pre.join('.')}` : ''}`, `${b.major}.${b.minor}.${b.patch}${b.pre.length > 0 ? `-${b.pre.join('.')}` : ''}`)
  return cmp >= 0
}

/** String form of a parsed Semver (the boundary objects carry no prerelease). */
function semverStr(v: Semver): string {
  return `${v.major}.${v.minor}.${v.patch}${v.pre.length > 0 ? `-${v.pre.join('.')}` : ''}`
}

/**
 * Minimal range matcher for the peer-range check: `*`, exact, ^, ~, >=, >,
 * <=, <, whitespace-separated pairs, and `||` alternatives. Anything else
 * returns null (unknown — reported, not asserted).
 *
 * Prerelease handling follows npm's semver rule, evaluated at the comparator
 * SET level (one `||` alternative is one set): a version carrying a
 * prerelease tag only satisfies a set when at least one comparator in that
 * set shares the version's [major, minor, patch] tuple AND carries a
 * prerelease of its own; then every comparator is checked normally. So
 * `^0.1.0` never matches `0.2.0-rc.1` (nor `0.1.0-rc.5`), while
 * `>=1.2.3-rc.1 <2.0.0` does match `1.2.3-rc.2` (issue #98 analysis).
 */
export function satisfiesRange(version: string, range: string): boolean | null {
  const v = parseSemver(version)
  if (v === null) return null
  const versionHasPre = v.pre.length > 0

  // Mirror pnpm's peer-dependency publish transform. Unlike ordinary
  // dependency specs, a workspace token may sit inside a larger peer range.
  // Operator-only (or bare) tokens receive the linked sibling's version;
  // explicit versions only lose the protocol prefix. Unsupported alias/path
  // forms become an unknown range below rather than a definite mismatch.
  const workspaceSemver = /workspace:([\^~*]|>=|>|<=|<)?((\d+|[xX*])(\.(\d+|[xX*])){0,2})?/
  let normalizedRange = range
  if (range.includes('workspace:')) {
    const match = workspaceSemver.exec(range)
    if (match === null) {
      normalizedRange = range.replace('workspace:', '')
    } else if (match[2] !== undefined) {
      normalizedRange = range.replace('workspace:', '')
    } else {
      const operator = match[1] === '*' ? '' : (match[1] ?? '')
      normalizedRange = range.replace(workspaceSemver, `${operator}${semverStr(v)}`)
    }
  }

  const single = (part: string): boolean | null => {
    const p = part.trim()
    if (p === '' || p === '*' || p === 'x' || p === 'X') return true
    const m = /^(\^|~|>=|<=|>|<)?(.*)$/.exec(p)
    const op = m?.[1] ?? ''
    const target = (m?.[2] ?? '').trim()
    const tv = parseSemver(target)
    if (tv === null) return null
    const major = tv.major
    const minor = tv.minor
    const patch = tv.patch
    switch (op) {
      case '':
        return compareSemver(version, target) === 0
      case '>=':
        return gte(v, tv)
      case '<=':
        return gte(tv, v)
      case '>':
        return compareSemver(version, target) > 0
      case '<':
        return compareSemver(version, target) < 0
      case '^': {
        // npm caret semantics: >= given, strictly < the next breaking bump.
        const upper: Semver = major > 0
          ? { major: major + 1, minor: 0, patch: 0, pre: [] }
          : minor > 0
            ? { major: 0, minor: minor + 1, patch: 0, pre: [] }
            : { major: 0, minor: 0, patch: patch + 1, pre: [] }
        return gte(v, tv) && compareSemver(semverStr(upper), version) > 0
      }
      case '~': {
        // npm tilde semantics: >= given, strictly < the next minor.
        const upper: Semver = { major, minor: minor + 1, patch: 0, pre: [] }
        return gte(v, tv) && compareSemver(semverStr(upper), version) > 0
      }
      default:
        return null
    }
  }

  /** Parse one comparator part into op + target; null when unknown. */
  const comparator = (part: string): { op: string; target: string } | null => {
    const p = part.trim()
    if (p === '' || p === '*' || p === 'x' || p === 'X') return { op: '', target: '' }
    const m = /^(\^|~|>=|<=|>|<)?(.*)$/.exec(p)
    if (m === null) return null
    const target = (m[2] ?? '').trim()
    // Enforce this function's documented unknown-range contract before the
    // prerelease admission gate. Otherwise an unknown protocol such as
    // `workspace:^` or `catalog:default` is misreported as a definite false
    // whenever the resolved version happens to carry a prerelease tag.
    if (parseSemver(target) === null) return null
    return { op: m[1] ?? '', target }
  }

  /** Evaluate ONE comparator set (a `||` alternative) as a conjunction. */
  const evaluateSet = (set: string): boolean | null => {
    const parts = set.trim().split(/\s+/).filter(part => part !== '')
    if (parts.length === 0) return true
    const parsed = parts.map(part => comparator(part))
    if (parsed.some(part => part === null)) return null
    if (versionHasPre) {
      // npm gate (set-level): the set admits prerelease versions only when a
      // comparator pins the SAME base tuple with a prerelease of its own.
      const admitted = parsed.some((part) => {
        if (part?.target === '') return false
        const tv = parseSemver(part?.target ?? '')
        return tv !== null && tv.pre.length > 0
          && v.major === tv.major && v.minor === tv.minor && v.patch === tv.patch
      })
      if (!admitted) return false
    }
    const results = parsed.map(part => single(part?.op !== undefined ? `${part.op}${part.target}` : ''))
    if (results.some(r => r === null)) return null
    return results.every(r => r === true)
  }

  if (normalizedRange.includes('||')) {
    const outcomes = normalizedRange.split('||').map(part => evaluateSet(part))
    if (outcomes.some(out => out === true)) return true
    if (outcomes.some(out => out === null)) return null
    return false
  }
  return evaluateSet(normalizedRange)
}

// --- composition (mirrors dsh-app-boot applyEntryPatches) ---

interface EntryNode {
  id: string
  name?: string
  layer?: string
  group?: boolean
  config?: unknown
  disabled?: unknown
}

/** Flatten a tree of entries (group configs included) into row records. */
function flattenEntries(nodes: EntryNode[]): LoaderRow[] {
  const rows: LoaderRow[] = []
  const walk = (list: EntryNode[], inheritedLayer?: string): void => {
    for (const node of list) {
      // Nested group configs come straight from the parsed patch and do not
      // carry the synthetic layer metadata attached to their parent insert.
      const layer = typeof node.layer === 'string' ? node.layer : inheritedLayer
      if (layer === undefined) continue
      rows.push({ id: node.id, layer, kind: 'insert', name: node.name })
      if (node.group === true && Array.isArray(node.config)) {
        walk(node.config as EntryNode[], layer)
      }
    }
  }
  walk(nodes)
  return rows
}

type DisabledState = 'active' | 'disabled' | 'conditional'

interface ResolvableLoaderRow extends LoaderRow {
  activation: 'required' | 'conditional'
}

/** Literal values use Loader Boolean semantics; `!!js` stays indeterminate. */
function disabledState(value: unknown): DisabledState {
  if (isRecord(value) && typeof value.__jsExpr === 'string') return 'conditional'
  return Boolean(value) ? 'disabled' : 'active'
}

function combineDisabled(parent: DisabledState, own: DisabledState): DisabledState {
  if (parent === 'disabled' || own === 'disabled') return 'disabled'
  if (parent === 'conditional' || own === 'conditional') return 'conditional'
  return 'active'
}

/**
 * Rows whose specifiers the Loader can attempt to import. Group rows are
 * always imported even when disabled (their disabled state gates children),
 * while expression-gated non-group rows are retained as conditional.
 */
function resolvableEntries(nodes: EntryNode[]): ResolvableLoaderRow[] {
  const rows: ResolvableLoaderRow[] = []
  const walk = (
    list: EntryNode[],
    inheritedLayer?: string,
    parentDisabled: DisabledState = 'active',
  ): void => {
    for (const node of list) {
      const layer = typeof node.layer === 'string' ? node.layer : inheritedLayer
      if (layer === undefined) continue
      const descendantsDisabled = combineDisabled(parentDisabled, disabledState(node.disabled))
      const activation = node.group === true ? 'required' : descendantsDisabled
      if (activation !== 'disabled') {
        rows.push({
          id: node.id,
          layer,
          kind: 'insert',
          name: node.name,
          activation: activation === 'conditional' ? 'conditional' : 'required',
        })
      }
      if (node.group === true && Array.isArray(node.config)) {
        walk(node.config as EntryNode[], layer, descendantsDisabled)
      }
    }
  }
  walk(nodes)
  return rows
}

export interface LayerInput {
  label: string
  kind: 'bundle' | 'user' | 'home'
  patches: unknown[]
  parseError: string | null
}

interface Composed {
  rows: LoaderRow[]
  resolvableRows: ResolvableLoaderRow[]
  duplicates: DuplicateId[]
  overrides: OverrideRow[]
  orphans: OrphanRow[]
}

/**
 * Apply the layer stack over an empty root exactly like the dsh boot include.
 * Exported so the trial-start validation (src/trial.ts) can replay the
 * composition with a candidate bundle order BEFORE anything is written.
 */
export function composeLayers(layers: LayerInput[]): Composed {
  const tree: EntryNode[] = []
  const orphans: OrphanRow[] = []
  const overrides: OverrideRow[] = []
  /**
   * The boot's entryMap, mirrored incrementally: the LAST row registered for
   * an id (top-level or nested group member) is the patch target, and later
   * inserts overwrite the map entry — exactly dsh-app-boot's applyEntryPatches
   * buildMap. Keeping the map instead of re-walking the tree pins the
   * duplicate-id resolution to the boot's behavior (issue #98 analysis:
   * explicit composition boundaries).
   */
  const entryMap = new Map<string, EntryNode>()
  const buildMap = (nodes: EntryNode[]): void => {
    for (const node of nodes) {
      if (node.id !== '') entryMap.set(node.id, node)
      if (node.group === true && Array.isArray(node.config)) buildMap(node.config as EntryNode[])
    }
  }
  for (const layer of layers) {
    for (const patch of layer.patches) {
      if (!isRecord(patch)) continue
      const { id, insert, name, ...overridesOf } = patch
      // Boot boundary: `insert` and `id` are truthiness-checked, so a falsy
      // `insert` (null/''/0) falls through to the patch path and an empty id
      // makes an insert a plain top-level append (applyEntryPatches).
      const hasId = typeof id === 'string' ? id !== '' : Boolean(id)
      const lookupKey = hasId ? String(id) : ''
      if (insert) {
        if (!Array.isArray(insert)) {
          orphans.push({ id: lookupKey === '' ? '(anonymous)' : lookupKey, layer: layer.label, reason: 'insert is not an array' })
          continue
        }
        const nodes = (insert as unknown[]).filter(isRecord).map((entry): EntryNode | null => {
          if (typeof entry.id !== 'string') return null
          return {
            id: entry.id,
            name: typeof entry.name === 'string' ? entry.name : undefined,
            layer: layer.label,
            group: entry.group === true,
            config: Array.isArray(entry.config) ? entry.config : undefined,
            disabled: entry.disabled,
          }
        }).filter((n): n is EntryNode => n !== null)
        if (hasId) {
          const target = entryMap.get(lookupKey)
          if (target === undefined) {
            orphans.push({ id: lookupKey, layer: layer.label, reason: 'insert target not found' })
            continue
          }
          if (target.group !== true) {
            orphans.push({ id: lookupKey, layer: layer.label, reason: 'insert target is not a group' })
            continue
          }
          // Boot boundary: a group with a non-array config is fixed up to an
          // empty array before the append (applyEntryPatches does the same).
          if (!Array.isArray(target.config)) target.config = []
          target.config = [...(target.config as unknown[]), ...nodes]
        } else {
          tree.push(...nodes)
        }
        buildMap(nodes)
        continue
      }
      if (!hasId) {
        orphans.push({ id: '(anonymous)', layer: layer.label, reason: 'id required for non-insert patch' })
        continue
      }
      const target = entryMap.get(lookupKey)
      if (target === undefined) {
        orphans.push({ id: lookupKey, layer: layer.label, reason: 'patch target not found' })
        continue
      }
      // Boot boundary: the name guard is truthiness-based — an empty-string
      // name on the patch row does not trigger the mismatch skip.
      if (name && name !== target.name) {
        orphans.push({ id: lookupKey, layer: layer.label, reason: `name mismatch (expected ${String(target.name)}, got ${String(name)})` })
        continue
      }
      const priorLayers: string[] = []
      for (const node of flattenEntries(tree)) {
        if (node.id === lookupKey && !priorLayers.includes(node.layer)) priorLayers.push(node.layer)
      }
      if (priorLayers.some(prior => prior !== layer.label)) {
        overrides.push({ id: lookupKey, layer: layer.label, overriddenLayers: priorLayers.filter(prior => prior !== layer.label) })
      }
      for (const [key, value] of Object.entries(overridesOf)) {
        if (key === 'id') continue
        ;(target as unknown as Record<string, unknown>)[key] = value
      }
    }
  }
  const rows = flattenEntries(tree)
  const resolvableRows = resolvableEntries(tree)
  const byId = new Map<string, string[]>()
  for (const row of rows) {
    const layers = byId.get(row.id) ?? []
    if (!layers.includes(row.layer)) layers.push(row.layer)
    byId.set(row.id, layers)
  }
  const duplicates: DuplicateId[] = []
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.id, (counts.get(row.id) ?? 0) + 1)
  for (const [id, count] of counts) {
    if (count < 2) continue
    duplicates.push({ id, layers: byId.get(id) ?? [], count })
  }
  duplicates.sort((a, b) => a.id.localeCompare(b.id))
  return { rows, resolvableRows, duplicates, overrides, orphans }
}

/** Distinct versions of `@deepseek-ai/{dsh,cordis}*` packages in the lockfile. */
function lockfileCoreVersions(profileDir: string): Map<string, string[]> {
  const found = new Map<string, Set<string>>()
  let text: string
  try {
    text = readFileSync(join(profileDir, 'pnpm-lock.yaml'), 'utf8')
  } catch {
    return new Map()
  }
  for (const m of text.matchAll(/(@deepseek-ai\/(?:dsh|cordis)[^@\s'"]*?)@([0-9][^\s:'"()]*)/g)) {
    const name = m[1] ?? ''
    // pnpm v9 peer-resolution keys carry a suffix: `name@1.0.0(peer@x)`. The
    // version capture stops at the `(` — and at `)` too, so the peer
    // reference INSIDE the suffix (`name@1.0.0(@deepseek-ai/dsh-base@4.0.1)`)
    // never yields a fake `4.0.1)` version that would invent a phantom
    // multi-version report on a healthy profile (issue #98 analysis).
    const version = m[2] ?? ''
    // Registry resolutions only: skip link:/git forms and anything that is
    // not a well-formed semver (parseSemver double-checks the capture).
    if (parseSemver(version) === null) continue
    const versions = found.get(name) ?? new Set<string>()
    versions.add(version)
    found.set(name, versions)
  }
  const out = new Map<string, string[]>()
  for (const [name, versions] of found) out.set(name, [...versions].sort(compareSemver))
  return out
}

/**
 * Build the bundle layer stack for a profile under a GIVEN bundle order —
 * the manifest order for analyzeProfile, or a candidate order for trial
 * validation (src/trial.ts). Bundle resolution mirrors the boot exactly:
 * the dsh installation anchor first (in-box bundles always come from the
 * running dsh, never a profile-local copy), then Node's module search from
 * the profile directory (covers community bundles and pnpm workspace-root
 * hoisting). A single code path keeps the check report and the trial
 * validation from ever disagreeing about what a bundle is or where it lives.
 */
export function buildBundleLayers(
  profileDirectory: string,
  bundleNames: string[],
  specs: Record<string, string>,
  dshInstallDir: string | null,
): { bundles: BundleLayer[]; layers: LayerInput[] } {
  const bundles: BundleLayer[] = bundleNames.map((name) => {
    // The real loader gives the DSH installation first refusal for in-box
    // bundles. Desktop keeps that installation private from plugins, so a
    // DIRECT profile-local copy with the same official name is only a stale
    // shadow, never evidence for the layer the running host loaded (#371).
    // Keep walking the profile anchor's parent search paths: Desktop heals an
    // authoritative host fallback at <profiles>/node_modules.
    const ignoredProfilePackage = dshInstallDir === null && INBOX_BUNDLES.has(name)
      ? join(profileDirectory, 'node_modules', name)
      : undefined
    const anchors: Array<{ anchor: string | null; ignoredPackageDirectory?: string }> = [
      { anchor: dshInstallDir !== null ? join(dshInstallDir, 'package.json') : null },
      {
        anchor: join(profileDirectory, 'package.json'),
        ignoredPackageDirectory: ignoredProfilePackage,
      },
    ]
    let directory: string | null = null
    for (const { anchor, ignoredPackageDirectory } of anchors) {
      if (anchor === null) continue
      directory = resolvePackageDir(anchor, name, ignoredPackageDirectory)
      if (directory !== null) break
    }
    const layer: BundleLayer = {
      name,
      source: specs[name] ?? '(not a direct dependency)',
      kind: INBOX_BUNDLES.has(name) ? 'official' : 'community',
      directory,
      patchPath: null,
      error: null,
      entries: [],
      parseError: null,
    }
    if (directory === null) {
      // An in-box bundle is supplied by the dsh INSTALLATION, not by the
      // profile — that is what makes it in-box. So failing to find one says
      // we could not locate the installation, not that the profile is
      // broken: unusual or older hosts can still hide the in-box installation
      // from both the CLI-entry and packaged-Desktop discovery anchors.
      //
      // Calling that "will fail to boot" turned a working composition into a
      // fatal verdict and rolled back a good update (#369) — while `dsh
      // --dump-config` on the same profile exited 0. Unknown has to read as
      // unknown; the profile's own bundles are still judged normally.
      if (INBOX_BUNDLES.has(name)) {
        layer.error = null
        layer.unresolvedInbox = true
        return layer
      }
      layer.error = 'bundle package is not installed — the profile will fail to boot'
      return layer
    }
    let bundleManifest: { dsh?: { bundle?: { patch?: unknown; order?: unknown } } }
    try {
      bundleManifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as typeof bundleManifest
    } catch {
      layer.error = 'bundle package.json is unreadable'
      return layer
    }
    const declared = bundleManifest.dsh?.bundle?.patch
    if (typeof declared !== 'string') {
      layer.error = 'bundle declares no dsh.bundle.patch — the profile will fail to boot'
      return layer
    }
    const patchPath = join(directory, declared)
    if (!existsSync(patchPath)) {
      layer.error = `declared patch ${declared} is missing — the profile will fail to boot`
      return layer
    }
    layer.patchPath = patchPath
    const patches = parsePatchFile(patchPath)
    if (patches === null) {
      layer.parseError = 'patch file is not a valid entry list'
      return layer
    }
    layer.entries = collectInsertIds(patches)
    const order = bundleManifest.dsh?.bundle?.order
    if (order !== null && typeof order === 'object' && !Array.isArray(order)) {
      const listOf = (value: unknown): string[] | undefined => Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : undefined
      const after = listOf((order as Record<string, unknown>).after)
      const before = listOf((order as Record<string, unknown>).before)
      if (after !== undefined || before !== undefined) {
        layer.order = { ...(before !== undefined ? { before } : {}), ...(after !== undefined ? { after } : {}) }
      }
    }
    return layer
  })
  const layers: LayerInput[] = bundles.map((bundle) => ({
    label: bundle.name,
    kind: 'bundle' as const,
    patches: bundle.patchPath !== null && bundle.parseError === null ? parsePatchFile(bundle.patchPath) ?? [] : [],
    parseError: bundle.parseError,
  }))
  return { bundles, layers }
}

/**
 * Analyze one profile directory (issue #98, phase 1). Pure function of the
 * directory contents — safe to call on every market open.
 */
export function analyzeProfile(profileDirectory: string, options: CheckOptions = {}): CheckReport {
  const dshInstall = options.dshInstallDir ?? findDshInstallDir()
  const home = resolveDshHome(options.homeDir)
  const core = corePackageNames(dshInstall)

  // --- 1. bundle stack ---
  const manifest = (() => {
    try {
      return JSON.parse(readFileSync(join(profileDirectory, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>
        dsh?: { profile?: { bundles?: unknown } }
      }
    } catch {
      return null
    }
  })()
  const bundleNames = Array.isArray(manifest?.dsh?.profile?.bundles)
    ? manifest.dsh.profile.bundles.filter((name): name is string => typeof name === 'string')
    : []
  const specs = manifest?.dependencies ?? {}
  const built = buildBundleLayers(profileDirectory, bundleNames, specs, dshInstall)
  const bundles = built.bundles
  const bundleLayers = built.layers

  // --- 2. composed loader rows / duplicates / overrides / orphans ---
  const layers: LayerInput[] = [...bundleLayers]
  const userPatchPath = join(profileDirectory, 'cordis.patch.yml')
  if (existsSync(userPatchPath)) {
    const patches = parsePatchFile(userPatchPath)
    layers.push({ label: 'user-patch', kind: 'user', patches: patches ?? [], parseError: patches === null ? 'patch file is not a valid entry list' : null })
  }
  const homePatchPath = join(home, 'cordis.patch.yml')
  if (existsSync(homePatchPath)) {
    const patches = parsePatchFile(homePatchPath)
    layers.push({ label: 'home-patch', kind: 'home', patches: patches ?? [], parseError: patches === null ? 'patch file is not a valid entry list' : null })
  }
  const composed = composeLayers(layers)

  // --- 3. peer dependency mismatches (every declared peer, core or not) ---
  // NOTE (issue #98 division of labor): the core-package-as-ordinary-
  // dependency check (coreDeps / shadowing) belongs to @yzke's manifest PR;
  // PR-A keeps only the peer-resolution check here.
  const peerMismatches: PeerMismatch[] = []
  const seenDeps = new Set<string>()
  for (const plugin of installedPackageNames(profileDirectory)) {
    let pkg: {
      peerDependencies?: Record<string, string>
      peerDependenciesMeta?: Record<string, { optional?: unknown }>
    }
    try {
      pkg = JSON.parse(readFileSync(join(profileDirectory, 'node_modules', plugin, 'package.json'), 'utf8')) as typeof pkg
    } catch {
      continue
    }
    const pluginDir = join(profileDirectory, 'node_modules', plugin)
    const map = pkg.peerDependencies
    if (map === null || typeof map !== 'object') continue
    for (const [name, spec] of Object.entries(map)) {
      if (typeof spec !== 'string') continue
      const key = `${plugin}\u0000${name}\u0000peer`
      if (seenDeps.has(key)) continue
      seenDeps.add(key)
      const hoisted = readProfileVisibleVersion(profileDirectory, name)
      const nested = readNodeModulesVersion(pluginDir, name)
      const host = dshInstall !== null ? readNodeModulesVersion(dshInstall, name) : null
      // Node resolves a plugin's peer from its OWN node_modules first
      // (nested), then the profile tree (hoisted), then the host install.
      const resolved = nested ?? hoisted ?? host
      // Peer checks cover EVERY declared peer, not just host core packages:
      // plugin-to-plugin peer mismatches break runtime registration just as
      // hard (issue #98 optimization round).
      const satisfied = resolved !== null ? satisfiesRange(resolved, spec) : null
      const optional = pkg.peerDependenciesMeta?.[name]?.optional === true
      peerMismatches.push({
        plugin, name, range: spec, resolved,
        satisfied: satisfied === null ? null : satisfied,
        ...(optional ? { optional: true } : {}),
      })
    }
  }

  // --- 4. multi-version core packages from the lockfile ---
  const multiVersion: MultiVersion[] = []
  for (const [name, versions] of lockfileCoreVersions(profileDirectory)) {
    if (versions.length < 2) continue
    multiVersion.push({ name, versions, hoisted: readProfileVisibleVersion(profileDirectory, name) })
  }
  multiVersion.sort((a, b) => a.name.localeCompare(b.name))

  // --- summary ---
  const errors: string[] = []
  const warnings: string[] = []
  for (const bundle of bundles) {
    if (bundle.error !== null) errors.push(`bundle ${bundle.name}: ${bundle.error}`)
    if (bundle.parseError !== null) errors.push(`bundle ${bundle.name}: ${bundle.parseError}`)
  }
  for (const layer of layers) {
    if (layer.parseError !== null && layer.kind !== 'bundle') errors.push(`${layer.label}: ${layer.parseError}`)
  }
  // User and home patches can insert packages independently of a bundle.
  // Only check rows that survived composition: an insert targeting a missing
  // group is skipped by the boot and therefore cannot cause module loading to
  // fail. Normalize package subpaths to their npm root and check the profile's
  // node_modules ancestry; exact exports/subpath validation and relative,
  // absolute, URL, builtin, package-import (#), or cordis: specifiers are
  // outside this check.
  const userLayerLabels = new Set(
    layers
      .filter(layer => layer.kind === 'user' || layer.kind === 'home')
      .map(layer => layer.label),
  )
  const candidates = new Map<string, { row: ResolvableLoaderRow, packageName: string }>()
  for (const row of composed.resolvableRows) {
    if (row.kind !== 'insert' || !userLayerLabels.has(row.layer)) continue
    if (row.name === undefined || row.name === '') {
      const message = `${row.layer}: loader entry ${JSON.stringify(row.id)} has no module name`
      if (row.activation === 'required') errors.push(`${message} — the profile will fail to boot`)
      else warnings.push(`${message} — boot will fail if its disabled expression enables the entry`)
      continue
    }
    if (!isBareLoaderSpecifier(row.name)) continue
    if (isBuiltin(row.name)) continue
    const packageName = packageRoot(row.name)
    if (packageName === null) {
      const message = `${row.layer}: loader specifier ${JSON.stringify(row.name)} is not a valid bare package name`
      if (row.activation === 'required') errors.push(`${message} — the profile will fail to boot`)
      else warnings.push(`${message} — boot will fail if its disabled expression enables the entry`)
      continue
    }
    const key = `${row.layer}\u0000${packageName}`
    const previous = candidates.get(key)
    if (previous === undefined || previous.row.activation === 'conditional' && row.activation === 'required') {
      candidates.set(key, { row, packageName })
    }
  }
  for (const { row, packageName } of candidates.values()) {
    if (profilePackageInstalled(profileDirectory, packageName)) continue
    const message = `${row.layer}: loader package ${packageName} is not installed in the profile`
    if (row.activation === 'required') errors.push(`${message} — the profile will fail to boot`)
    else warnings.push(`${message} — boot will fail if its disabled expression enables the entry`)
  }
  for (const dup of composed.duplicates) {
    errors.push(`duplicate loader entry id ${JSON.stringify(dup.id)} (${dup.count} rows: ${dup.layers.join(', ')})`)
  }
  for (const orphan of composed.orphans) {
    warnings.push(`${orphan.layer}: ${orphan.id} — ${orphan.reason}`)
  }
  for (const mismatch of peerMismatches) {
    // Only CONFIRMED incompatibilities warn. Un-evaluable peers (sat=null —
    // the peer is supplied by the host, an optional accelerator, or simply
    // absent) stay in the peerMismatches list for the UI but are not noise
    // in the summary (issue #98 optimization round).
    // ...and an OPTIONAL peer is not a confirmed incompatibility either.
    // classifyPeer already downgrades those to non-risk (compatibility.ts),
    // and the summary disagreeing with it meant a plugin that declares "I
    // work without this" still produced a scary warning line — including
    // for the market's own optional peer, on every profile that installs us
    // (#275 by @tjxjxjx).
    if (mismatch.satisfied === false && mismatch.optional !== true) {
      warnings.push(`${mismatch.plugin} peer range ${mismatch.name}@${mismatch.range} does not match resolved ${String(mismatch.resolved)}`)
    }
  }
  for (const mv of multiVersion) {
    const line = `${mv.name}: ${mv.versions.join(' / ')}${mv.hoisted !== null ? ` (hoisted ${mv.hoisted})` : ''}`
    if (core.has(mv.name)) errors.push(`multiple versions of core package — ${line}`)
    else warnings.push(`multiple versions of ${line}`)
  }
  // Current-order before/after rule conflicts (issue #98 phase 2): these are
  // informative for the ordering UI; the author-declared rule breaking the
  // CURRENT stack is worth a warning but not a boot failure. Conflicts are
  // exposed both at the report top level and per bundle (order.conflicts) so
  // the ordering panel can render them next to the bundle rows.
  const orderConflicts = validateOrder(bundleNames, readBundleRules(profileDirectory))
  for (const conflict of orderConflicts) {
    warnings.push(`${conflict.name}: ${conflict.reason}`)
  }
  for (const bundle of bundles) {
    const own = orderConflicts.filter(conflict => conflict.name === bundle.name)
    if (own.length > 0) bundle.order = { ...bundle.order, conflicts: own }
  }
  // LOOT-style auto-fix: suggest a minimal-change order satisfying every
  // declared before/after rule. No rules → no suggestion (nothing to fix);
  // with rules the suggestion keeps unconstrained bundles in their current
  // relative order (issue #125 review — never silently rewrites a hand-picked
  // order into an arbitrary canonical one).
  const suggestedOrder = suggestOrder(bundleNames, readBundleRules(profileDirectory))
  if (suggestedOrder === null) {
    // No declared rules — nothing to suggest and nothing to warn about.
  } else if (!suggestedOrder.ok) {
    warnings.push(`ordering constraints contain a cycle: ${suggestedOrder.cycle.join(' -> ')} — no compliant order exists / 排序约束存在循环依赖，无法得出合规顺序`)
  } else {
    // Only warn when the CURRENT order actually breaks a declared rule. A
    // hand-picked order that satisfies every rule but merely differs from the
    // suggestion is valid — flagging it would be a false alert on a healthy
    // profile (issue #98 analysis).
    if (orderConflicts.length > 0) {
      warnings.push('current bundle order violates declared rules — a better order is suggested / 当前 bundle 顺序违反声明规则，已给出更优顺序')
    }
  }

  // Duplicate loader NAMES: the Loader registers plugins by name, so two rows
  // with the same name in DIFFERENT layers shadow each other at runtime (the
  // later layer wins). Rows sharing a name within ONE layer are routine — a
  // single bundle may define several entries under the same name — and are
  // skipped entirely: a same-layer "duplicate name" is a false positive, not
  // a conflict. The hard conflict is duplicate loader entry ids
  // (report.duplicates), which fail the boot outright and are unchanged.
  const nameCounts = new Map<string, string[]>()
  for (const row of composed.rows) {
    if (row.name === undefined) continue
    const layers = nameCounts.get(row.name) ?? []
    if (!layers.includes(row.layer)) layers.push(row.layer)
    nameCounts.set(row.name, layers)
  }
  const duplicateNames: DuplicateName[] = []
  for (const [name, layers] of nameCounts) {
    // Only cross-layer collisions are real shadowing candidates: all rows
    // with this name living in one layer is a normal multi-entry bundle.
    if (layers.length < 2) continue
    const count = composed.rows.filter(row => row.name === name).length
    duplicateNames.push({ name, layers, count })
    // Deliberately NOT pushed into summary.warnings: the report carries the
    // shadowing rows structurally (duplicateNames, rendered by the
    // diagnostics panel), and the cost of a false positive — a healthy
    // profile flagged with a warning — outweighs a false negative here.
  }
  duplicateNames.sort((a, b) => a.name.localeCompare(b.name))

  return {
    profile: profileDirectory,
    scannedAt: Date.now(),
    bundles,
    rows: composed.rows,
    duplicates: composed.duplicates,
    duplicateNames,
    overrides: composed.overrides,
    orphans: composed.orphans,
    peerMismatches,
    multiVersion,
    orderConflicts,
    suggestedOrder,
    summary: {
      ok: errors.length === 0,
      errors,
      warnings,
    },
  }
}
