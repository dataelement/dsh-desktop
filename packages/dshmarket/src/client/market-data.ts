/**
 * Response shapes of the /dsh-market/* host routes plus the pure helpers the
 * Market UI shares between its section and toast components.
 */

import type { DiagnosticReportV1 } from '../diagnostics.ts'
export type { SharedHostPackageDependencyFinding } from '../diagnostics.ts'

/** Localized text keyed by language ('zh' / 'en'). */
export type LocalizedText = Record<string, string | undefined>

/** One registry entry from /dsh-market/registry. */
/**
 * Resolve a market API path against the page the UI is served from.
 *
 * Every call used to be root-absolute (`/dsh-market/…`), which the browser
 * resolves against the ORIGIN — so behind a reverse proxy that mounts dsh
 * under a prefix (`https://host/app/my-dsh/`), the panel rendered and then
 * every request in it went to `https://host/dsh-market/…`, missed the prefix
 * rule entirely, and 404'd (#345).
 *
 * Anchored on `document.baseURI`, which is the directory the host serves its
 * UI from. Safe for root deployments because that directory is `/` there, and
 * safe generally because the dsh web UI does not use path routing — measured
 * against a real dsh: `location.pathname` is `/` on the market page, not
 * `/settings/...`, so the directory really is the mount point rather than
 * wherever the user happens to have navigated.
 */
export function api(path: string): string {
  const relative = path.replace(/^\/+/, '')
  if (typeof document === 'undefined') return `/${relative}`
  return new URL(relative, document.baseURI).pathname
}

export interface RegistryPlugin {
  name: string
  owner: string
  url: string
  npm?: string
  tarball?: string | null
  /** One legacy category id or several category ids. */
  category: string | string[]
  description?: LocalizedText
  stars?: number
  /**
   * npm downloads in the last 30 days, when the entry has a published
   * package. Absent means "no npm package" — a coverage gap, not a zero.
   */
  downloads?: number | null
  added?: string
  install?: string
  /**
   * Catalog-side deprecation flags (#60): absent for every normal entry, so
   * catalogs without the fields render exactly as before.
   */
  deprecated?: boolean
  /** Catalog name of the suggested replacement plugin, when deprecated. */
  replacement?: string
  /** Author-curated screenshot URLs from the registry (#61); optional. */
  screenshots?: string[]
}

/** Category ids for one entry, de-duplicated in declaration order. */
export function pluginCategories(plugin: Pick<RegistryPlugin, 'category'>): string[] {
  const values: unknown[] = Array.isArray(plugin.category) ? plugin.category : [plugin.category]
  const categories: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (typeof value !== 'string' || value === '' || seen.has(value)) continue
    seen.add(value)
    categories.push(value)
  }
  return categories
}

/** The catalog payload under `registry` in /dsh-market/registry. */
export interface Registry {
  count: number
  categories: Record<string, LocalizedText>
  plugins: RegistryPlugin[]
}

/** Profile dependency map: package name → install spec. */
export type InstalledMap = Record<string, string>

/**
 * Add active profile Bundles as presence-only catalog entries.
 *
 * The returned map is for catalog matching only. Update and uninstall flows
 * must keep using the dependency-only map because a Bundle supplied by the
 * dsh installation is not owned by the profile package manager.
 */
export function installedForCatalog(installed: InstalledMap, bundles: readonly string[]): InstalledMap {
  return Object.fromEntries([
    ...bundles.map(name => [name, '*'] as const),
    ...Object.entries(installed),
  ])
}

/** Strong repo identities discovered for local link:/file: dependencies (#141). */
export type InstalledRepoIdentities = Record<string, string[]>

/** Weak Git-origin hints used only to disambiguate multiple same-named entries. */
export type InstalledRepoHints = Record<string, string[]>

/** Response of the /dsh-market/gist export action. */
export interface GistExportResult {
  ok: boolean
  gistId: string
  gistUrl: string
}

/** Per-package update status from /dsh-market/updates. */
export interface UpdateStatus {
  updateAvailable?: boolean
  version?: string
  kind?: string
  /** What is installed and what the source of truth offers — versions for npm
      packages, commit shas for github installs; the notes dialog (#294) shows
      the range between them in whichever form reads best. */
  current?: string | null
  latest?: string | null
  /** Updating this local package switches it to its matched online release. */
  restoreRequired?: boolean
}

/** Poll payload from /dsh-market/status. */
export interface MarketStatus {
  /** The market's own version — rendered in the heading so screenshots carry it. */
  version?: string
  /** Whether the profile package manager owns the market dependency. */
  selfManaged?: boolean
  /**
   * Prefix to put in front of github.com URLs the BROWSER loads, or null to
   * address them directly. Resolved by the server from the download region.
   */
  githubProxy?: string | null
  active?: boolean
  lastLine?: string
  seconds?: number
  installed?: InstalledMap
  pnpm?: boolean
  boot?: string
  /** pnpm ndjson stage, when the structured reporter produced events. */
  phase?: 'resolving' | 'downloading' | 'linking' | 'building' | null
  done?: number
  total?: number | null
  currentPackage?: string | null
  downloaded?: number | null
  size?: number | null
  /** True once the user asked to cancel and the host is killing the run. */
  cancelling?: boolean
  /**
   * The route-level operation lock (#91): stays true through install
   * post-processing after pnpm already exited (progress.active false).
   * Restart must not be offered while it is held.
   */
  busy?: boolean
  /**
   * The process supervisor the host detected around itself (systemd, pm2),
   * or null/absent when none. Present so the UI can explain WHY the restart
   * button is missing instead of just omitting it (#229).
   */
  supervisor?: string | null
  /**
   * Debugger latch (#447): `'inspector'` when the host is under a debugger,
   * or null/absent otherwise. Kept separate from `supervisor` and from
   * `restart` so `allowRestart` settings are not conflated with debug state.
   */
  debugger?: string | null
}

/** Post-install activation state (P0-2), per installed package. */
export type ActivationState = 'live' | 'restart' | 'inert' | 'broken' | 'missing' | 'disabled'

export interface ActivationInfo {
  state: ActivationState
  reasons: string[]
  bundle: boolean
  hot: boolean
}

/** The /dsh-market/installed payload (fields the market UI consumes). */
export interface InstalledPayload {
  profile?: string
  installed: InstalledMap
  /** Strong source identities for local link:/file: dependencies (#141). */
  repoIdentities?: InstalledRepoIdentities
  /** Weak local Git-origin hints; never used to reject a unique match. */
  repoHints?: InstalledRepoHints
  activation?: Record<string, ActivationInfo>
  diagnostics?: DiagnosticReportV1
  live?: string[]
  /** Plugins the user switched off; persisted across restarts (#60). */
  disabled?: string[]
  /**
   * Packages whose bundle rows the user patch layer (cordis.patch.yml)
   * disables / force-enables (port of dsh-plugin-hub). Covers toggles made
   * OUTSIDE the market — hand-edited patch files, the dsh CLI — which the
   * market's own disable list never sees.
   */
  patchDisabled?: string[]
  patchForced?: string[]
  /** Custom plugin groups: group name → member package names. */
  groups?: Record<string, string[]>
  /** Display order of group names. */
  groupOrder?: string[]
}

/**
 * A group's derived switch state: all members enabled / all disabled /
 * mixed / no members. Pure — the UI renders exactly this and the group
 * switch itself is never persisted (#60).
 */
export type GroupSwitchState = 'on' | 'off' | 'mixed' | 'empty'

export function groupSwitchState(members: string[] | undefined, disabled: ReadonlySet<string>): GroupSwitchState {
  const list = members ?? []
  if (list.length === 0) return 'empty'
  let anyOn = false
  let anyOff = false
  for (const member of list) {
    if (disabled.has(member)) anyOff = true
    else anyOn = true
  }
  return anyOn && anyOff ? 'mixed' : anyOff ? 'off' : 'on'
}

/** Registered theme definition surfaced by the theme service snapshot. */
export interface ThemeDef {
  id: string
  colorScheme?: string
  tokens?: Record<string, string | undefined>
}

/** Theme service snapshot; null when the composition has no theme service. */
export interface ThemeSnapshot {
  preference: string
  themes: ThemeDef[]
}

/** Bound locale translator for the dsh-market namespace. */
export type Translate = (key: string) => string

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return 'hsl(' + (((hash % 360) + 360) % 360) + ' 55% 52%)'
}

export function readSession(key: string): any {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null') } catch { return null }
}

/** Heuristic: plugins that target a terminal surface rather than the web UI. */
export function looksTerminal(plugin: RegistryPlugin, lang: string): boolean {
  const desc = (plugin.description && (plugin.description[lang] || plugin.description.en)) || ''
  // A description can mention a CLI only to say it is NOT required. Treating
  // that as positive evidence labels web plugins as terminal-only. Strip
  // bounded negated clauses before applying the deliberately broad heuristic;
  // the package name remains untouched and therefore stays strong evidence.
  const positiveDesc = desc
    .replace(/\b(?:no|without)\b[^.!?;:，。！？；\n]{0,80}\b(?:tui|cli|tty|terminal)\b/gi, '')
    .replace(/(?:无需|无须|不需要|不用)[^。！？；\n]{0,48}(?:tui|cli|tty|terminal|终端|命令行)/gi, '')
  return /\b(tui|cli|tty|terminal)\b|终端|命令行/i.test(plugin.name + ' ' + positiveDesc)
}

/** Sortable field for the Discover list. */
export type SortField = 'downloads' | 'stars' | 'added'
/** Sort direction: desc = newest/most first, asc = oldest/least first. */
export type SortDir = 'desc' | 'asc'
/** Combined sort key sent to visiblePlugins. */
export type SortKey = `${SortField}-${SortDir}`

/** Recency windows for the "published within" filter. */
export type TimeRange = 'all' | 'day' | 'week' | 'month' | 'quarter' | 'year'

/** Days per TimeRange (`all` has no cutoff and is handled by the caller). */
export const TIME_RANGE_DAYS: Record<Exclude<TimeRange, 'all'>, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
}

/** True when `added` is a date within the last `days` days (inclusive). */
export function withinDays(added: string | undefined, days: number): boolean {
  if (added === undefined || added === '') return false
  const time = Date.parse(added)
  if (Number.isNaN(time)) return false
  const age = Date.now() - time
  return age >= 0 && age <= days * 86_400_000
}

/** Filters and sort order driving the discover list. */
export interface ListQuery {
  /** Active category id, or 'all'. */
  category: string
  /** Raw search input (trimmed and lowercased internally). */
  query: string
  /** UI language for description matching ('zh' / 'en'). */
  lang: string
  /** Category labels indexed by id; omitted by callers that do not need label search. */
  categories?: Record<string, LocalizedText>
  /** 'stars-desc' | 'stars-asc' | 'added-desc' | 'added-asc'; anything else keeps registry order. */
  sort: string
  /** Keep only plugins published within the last N days; undefined = any time. */
  sinceDays?: number
}

/**
 * Whether a catalog entry IS the market itself. The catalog still carries
 * it — nothing about the data changes, and the Installed tab still shows it
 * — this is purely "a store has no reason to sell itself to someone already
 * standing in it."
 */
export function isMarketItself(plugin: Pick<RegistryPlugin, 'name' | 'npm'>): boolean {
  return plugin.name === 'dsh-market' || plugin.npm === 'dshmarket'
}

/** Normalize punctuation-separated package names and human text alike. */
function searchText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

/**
 * Normalized catalog fields are immutable for the lifetime of one registry
 * entry. Keep them with that entry so typing does not repeat unicode
 * normalization across the whole catalog, while replaced catalogs remain
 * collectible. The raw query is intentionally not cached: it is normalized
 * once per call and would otherwise grow the cache on every keystroke.
 */
const pluginSearchTextCache = new WeakMap<RegistryPlugin, Map<string, string>>()

function cachedPluginSearchText(plugin: RegistryPlugin, value: string): string {
  let fields = pluginSearchTextCache.get(plugin)
  if (fields === undefined) {
    fields = new Map()
    pluginSearchTextCache.set(plugin, fields)
  }
  const hit = fields.get(value)
  if (hit !== undefined) return hit
  const normalized = searchText(value)
  fields.set(value, normalized)
  return normalized
}

/**
 * Relevance within one field. Exact and prefix matches beat phrase matches;
 * for a multi-word query every word must occur in the same field.
 */
function fieldRelevance(
  plugin: RegistryPlugin,
  value: string | undefined,
  query: string,
  tokens: string[],
  weight: number,
): number {
  if (!value) return 0
  const text = cachedPluginSearchText(plugin, value)
  if (text === '' || !tokens.every(token => text.includes(token))) return 0
  if (text === query) return weight + 300
  if (text.startsWith(query)) return weight + 250
  if (text.includes(query)) return weight + 200
  return weight + 150
}

/**
 * Search ranking is field-aware rather than a popularity-only filter:
 * package identities outrank owners, descriptions, and categories. The
 * selected popularity/date sort remains the tie-breaker between equally
 * relevant entries.
 */
function pluginRelevance(
  plugin: RegistryPlugin,
  query: string,
  tokens: string[],
  lang: string,
  categories: Record<string, LocalizedText> | undefined,
): number {
  const descriptions = plugin.description ?? {}
  const preferredLocale = descriptions[lang] ? lang : descriptions.en ? 'en' : null
  const preferredDescription = descriptions[lang] || descriptions.en
  const otherDescriptions = Object.entries(descriptions)
    .filter(([locale, value]) => locale !== preferredLocale && typeof value === 'string')
    .map(([, value]) => value)
  const categoryIds = pluginCategories(plugin)
  const categoryLabels = categoryIds.flatMap(category => Object.values(categories?.[category] ?? {}))

  return Math.max(
    fieldRelevance(plugin, plugin.name, query, tokens, 700),
    fieldRelevance(plugin, plugin.npm, query, tokens, 700),
    fieldRelevance(plugin, plugin.owner, query, tokens, 400),
    fieldRelevance(plugin, preferredDescription, query, tokens, 280),
    ...otherDescriptions.map(value => fieldRelevance(plugin, value, query, tokens, 240)),
    ...categoryIds.map(value => fieldRelevance(plugin, value, query, tokens, 180)),
    ...categoryLabels.map(value => fieldRelevance(plugin, value, query, tokens, 180)),
  )
}

/** Compare two already-filtered entries using the user's selected sort. */
function comparePlugins(a: RegistryPlugin, b: RegistryPlugin, sort: string): number {
  // A github:-only entry has no npm package and therefore no download count
  // at all — that is a coverage gap, not a "0 downloads" verdict, and must
  // not be read as less popular than a package that genuinely has zero.
  // Such entries always sort after every entry WITH a real count, in either
  // direction, and are ordered against each other by star count — the only
  // signal available for them — rather than left in an arbitrary tie.
  const hasDownloads = (p: RegistryPlugin): p is RegistryPlugin & { downloads: number } => typeof p.downloads === 'number'
  if (sort === 'downloads-desc') {
    if (hasDownloads(a) && hasDownloads(b)) return b.downloads - a.downloads
    if (hasDownloads(a)) return -1
    if (hasDownloads(b)) return 1
    return (b.stars ?? -1) - (a.stars ?? -1)
  }
  if (sort === 'downloads-asc') {
    if (hasDownloads(a) && hasDownloads(b)) return a.downloads - b.downloads
    if (hasDownloads(a)) return -1
    if (hasDownloads(b)) return 1
    return (a.stars ?? -1) - (b.stars ?? -1)
  }
  if (sort === 'stars-desc') return (b.stars ?? -1) - (a.stars ?? -1)
  if (sort === 'stars-asc') return (a.stars ?? -1) - (b.stars ?? -1)
  if (sort === 'added-desc') return String(b.added).localeCompare(String(a.added))
  if (sort === 'added-asc') return String(a.added).localeCompare(String(b.added))
  return 0
}

/**
 * The discover list: category filter, then the published-within window, then
 * relevance-ranked search across package identity / owner / every localized
 * description / category ids and labels. With no search, only the selected
 * sort applies, preserving the existing discover-list behaviour.
 * Pure — the section renders exactly this.
 */
export function visiblePlugins(plugins: RegistryPlugin[], options: ListQuery): RegistryPlugin[] {
  const query = searchText(options.query)
  const tokens = query.split(' ').filter(Boolean)
  const scored = plugins.flatMap((plugin, index) => {
    if (isMarketItself(plugin)) return []
    const categories = pluginCategories(plugin)
    if (options.category !== 'all' && !categories.includes(options.category)) return []
    if (options.sinceDays !== undefined && !withinDays(plugin.added, options.sinceDays)) return []
    const relevance = query === '' ? 0 : pluginRelevance(plugin, query, tokens, options.lang, options.categories)
    return relevance === 0 && query !== '' ? [] : [{ plugin, relevance, index }]
  })

  return scored.sort((a, b) =>
    b.relevance - a.relevance
    || comparePlugins(a.plugin, b.plugin, options.sort)
    || a.index - b.index,
  ).map(row => row.plugin)
}

/** The themes tab listing: theme category only, most-starred first. */
export function themePlugins(plugins: RegistryPlugin[]): RegistryPlugin[] {
  return plugins.filter(p => pluginCategories(p).includes('theme')).sort((a, b) => (b.stars || 0) - (a.stars || 0))
}

/**
 * Category chip order: collapsed with an active non-'all' chip that would
 * otherwise be clipped out of the two-row preview, the active one moves to
 * the front so it stays visible.
 *
 * Reported as "点了某个分类，标签就跑到前面来了，好奇怪": the earlier version
 * moved the active chip to the front unconditionally, so clicking a category
 * that was ALREADY visible inside the two rows still reshuffled it — and
 * every chip after it — for no reason, since nothing was at risk of being
 * hidden. `visibleCount` is how many chips (the 'all' chip included) the
 * two-row clip fits; a category already within that budget in its natural
 * position is left exactly where it was.
 *
 * `visibleCount === null` (not yet measured, e.g. the very first collapsed
 * render) keeps the old unconditional behaviour: with no measurement to
 * check against, guaranteeing visibility is the safe default.
 */
export function orderedCategories(
  categories: string[],
  active: string,
  open: boolean,
  visibleCount: number | null = null,
): string[] {
  if (open || active === 'all') return categories
  if (visibleCount !== null) {
    // One slot of the budget is always the 'all' chip itself.
    const budget = Math.max(0, visibleCount - 1)
    const naturalIndex = categories.indexOf(active)
    if (naturalIndex !== -1 && naturalIndex < budget) return categories
  }
  return [active, ...categories.filter(id => id !== active)]
}

/**
 * Page-number list for the discover pager. With few pages it is simply
 * 1..total; with many it windows around the current page and inserts '…'
 * so a 400-plugin catalog stays a compact `1 … 4 5 6 … 17` instead of a
 * long row of numbered buttons. Always begins with 1 and ends with total.
 */
export function pageItems(current: number, total: number): Array<number | '…'> {
  if (total <= 7) {
    const all: number[] = []
    for (let i = 1; i <= total; i++) all.push(i)
    return all
  }
  const items: Array<number | '…'> = [1]
  let start = Math.max(2, current - 1)
  let end = Math.min(total - 1, current + 1)
  if (current <= 4) end = 5
  if (current >= total - 3) start = total - 4
  if (start > 2) items.push('…')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < total - 1) items.push('…')
  items.push(total)
  return items
}

/**
 * Unified installed-state matching (#15): both sides collapse to lowercase
 * identity sets — the registry entry contributes its bare name, npm name and
 * owner/repo; the dependency contributes its key and the repo inside its
 * spec — and any exact intersection counts. Exact equality, not substrings,
 * so prefix-related repo names cannot cross-match.
 */
/**
 * Memo for entryIdentities, keyed on the catalog entry object itself.
 *
 * Catalog entries are parsed once and never mutated, so the identity set is
 * a pure function of an object that outlives every call — a WeakMap holds
 * it for exactly as long as the catalog is alive and not one render longer.
 * Worth caching because this is the innermost step of the installed-state
 * matching that runs for every card on screen (#262).
 */
const entryIdCache = new WeakMap<RegistryPlugin, Set<string>>()

function entryIdentities(plugin: RegistryPlugin): Set<string> {
  const cached = entryIdCache.get(plugin)
  if (cached !== undefined) return cached
  const ids = new Set<string>([plugin.name.toLowerCase()])
  if (plugin.npm) ids.add(plugin.npm.toLowerCase())
  // Subpath-aware: a /tree/ entry identifies as repo#path:/sub, never the
  // bare repo — two subpackages of one monorepo must not cross-match.
  const m = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(plugin.url)
  if (m !== null) {
    ids.add(m[2] !== undefined ? `${m[1]!.toLowerCase()}#path:/${m[2].toLowerCase()}` : m[1]!.toLowerCase())
  }
  entryIdCache.set(plugin, ids)
  return ids
}

const REPO_ID_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:#path:\/[A-Za-z0-9_./-]+)?$/

function addRepoIdentities(ids: Set<string>, values: readonly string[]): void {
  for (const value of values) {
    if (!REPO_ID_RE.test(value)) continue
    const subpath = value.split('#path:/')[1]
    if (subpath !== undefined && subpath.split('/').some(seg => seg === '' || seg === '.' || seg === '..')) continue
    ids.add(value.toLowerCase())
  }
}

/** Repo identities carried by a github shortcut, including `#sha&path:`. */
function githubSpecRepoIds(spec: string): Set<string> {
  const ids = new Set<string>()
  const match = /^github:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?(?:#(.*))?$/i.exec(spec)
  if (match === null) return ids
  const repo = match[1]!.toLowerCase()
  let subpath: string | null = null
  for (const selector of (match[2] ?? '').split('&')) {
    if (!selector.startsWith('path:/')) continue
    const candidate = selector.slice('path:/'.length)
    if (!REPO_ID_RE.test(`${repo}#path:/${candidate}`)
      || candidate.split('/').some(seg => seg === '' || seg === '.' || seg === '..')
      || subpath !== null) return new Set()
    subpath = candidate.toLowerCase()
  }
  ids.add(repo)
  if (subpath !== null) ids.add(`${repo}#path:/${subpath}`)
  return ids
}

function depIdentities(name: string, spec: string, repoIdentities: readonly string[] = []): Set<string> {
  const ids = new Set<string>([name.toLowerCase()])
  // A scoped npm key usually mirrors owner/repo — expose that identity so an
  // npm-installed plugin still matches an entry whose npm field is unset.
  const scoped = /^@([^/]+)\/(.+)$/.exec(name)
  if (scoped !== null) ids.add(`${scoped[1]!.toLowerCase()}/${scoped[2]!.toLowerCase()}`)
  for (const id of githubSpecRepoIds(spec)) ids.add(id)
  addRepoIdentities(ids, repoIdentities)
  return ids
}

/**
 * Repo identities stated by the dependency SPEC itself (github: installs) —
 * hard evidence of where the package came from, unlike the name-derived
 * mirror in depIdentities, which is only a matching aid.
 */
function depRepoIds(spec: string, repoIdentities: readonly string[] = []): Set<string> {
  const ids = githubSpecRepoIds(spec)
  addRepoIdentities(ids, repoIdentities)
  return ids
}

/** Repo identity of a registry entry's source url (repo or repo#path form). */
function entryRepoIds(plugin: RegistryPlugin): Set<string> {
  const ids = new Set<string>()
  const m = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(plugin.url)
  if (m !== null) {
    ids.add(m[2] !== undefined ? `${m[1]!.toLowerCase()}#path:/${m[2].toLowerCase()}` : m[1]!.toLowerCase())
  }
  return ids
}

/**
 * The curated registry lists distinct plugins sharing one name — twelve
 * name-groups at the time of #66 (both dsh-usage-stats, four dsh-memory…).
 * A name coincidence must not survive contradicting repo evidence: when the
 * dependency's spec pins a github repo AND the entry states one, the repos
 * decide — the loose name/npm identities only apply when at least one side
 * carries no repo evidence (npm installs, non-github entries).
 */
function sameSourceConflict(plugin: RegistryPlugin, spec: string, repoIdentities: readonly string[] = []): boolean {
  const entry = entryRepoIds(plugin)
  const dep = depRepoIds(spec, repoIdentities)
  if (entry.size === 0 || dep.size === 0) return false
  for (const id of dep) if (entry.has(id)) return false
  return true
}

function repoHintMatches(plugin: RegistryPlugin, hints: readonly string[]): boolean {
  const entry = entryRepoIds(plugin)
  const values = new Set<string>()
  addRepoIdentities(values, hints)
  for (const id of values) if (entry.has(id)) return true
  return false
}

/**
 * Memo for looseMatchCount, keyed on the catalog array then the dep name.
 *
 * This is THE hot path behind "the plugin list is very laggy" (#262). The
 * count answers "how many catalog entries could this installed dependency
 * be?", which depends only on the catalog and the name — not on the card
 * being drawn. But it was called from matchInstalledName, which runs once
 * per installed dependency, which runs once per rendered card: a full scan
 * of ~1800 entries, repeated cards × installed times, on every single
 * render. A profile from the reporter put it at 2.9 seconds, 28% of the
 * whole trace, and a local benchmark measured 48ms per render at 24 cards
 * and 224ms at 96 against a smaller 839-entry catalog.
 *
 * Keyed on the array identity so a refetched catalog gets a fresh map for
 * free — a new parse is a new array, and the old one is collectable.
 */
const looseMatchCountCache = new WeakMap<RegistryPlugin[], Map<string, number>>()

function looseMatchCount(plugins: RegistryPlugin[], name: string): number {
  let byName = looseMatchCountCache.get(plugins)
  if (byName === undefined) {
    byName = new Map<string, number>()
    looseMatchCountCache.set(plugins, byName)
  }
  const hit = byName.get(name)
  if (hit !== undefined) return hit
  // Built once for the whole scan. looseMatches() rebuilt this identity set
  // for every entry it tested, so the allocation alone ran ~1800 times per
  // call before this.
  const dep = depIdentities(name, '')
  let count = 0
  for (const plugin of plugins) {
    for (const id of entryIdentities(plugin)) {
      if (dep.has(id)) { count += 1; break }
    }
  }
  byName.set(name, count)
  return count
}

function looseMatches(plugin: RegistryPlugin, name: string): boolean {
  const dep = depIdentities(name, '')
  for (const id of entryIdentities(plugin)) if (dep.has(id)) return true
  return false
}

/** The installed dependency name a registry entry corresponds to, or null. */
export function matchInstalledName(
  plugin: RegistryPlugin,
  installed: InstalledMap,
  repoIdentities: InstalledRepoIdentities = {},
  plugins?: RegistryPlugin[],
  repoHints: InstalledRepoHints = {},
): string | null {
  const ids = entryIdentities(plugin)
  for (const [name, spec] of Object.entries(installed)) {
    const repos = repoIdentities[name] ?? []
    if (depRepoIds(String(spec), repos).size === 0 && plugins !== undefined && looseMatchCount(plugins, name) > 1
      && !repoHintMatches(plugin, repoHints[name] ?? [])) continue
    if (sameSourceConflict(plugin, String(spec), repos)) continue
    for (const id of depIdentities(name, String(spec), repos)) {
      if (ids.has(id)) return name
    }
  }
  return null
}

/** The registry entry an installed dependency corresponds to, or undefined. */
export function entryForDep(
  plugins: RegistryPlugin[],
  name: string,
  spec: string,
  repoIdentities: readonly string[] = [],
  repoHints: readonly string[] = [],
): RegistryPlugin | undefined {
  if (depRepoIds(String(spec), repoIdentities).size === 0 && looseMatchCount(plugins, name) > 1) {
    const hinted = plugins.find(plugin => repoHintMatches(plugin, repoHints) && looseMatches(plugin, name))
    if (hinted === undefined) return undefined
  }
  const ids = depIdentities(name, String(spec), repoIdentities)
  return plugins.find((plugin) => {
    if (sameSourceConflict(plugin, String(spec), repoIdentities)) return false
    for (const id of entryIdentities(plugin)) if (ids.has(id)) return true
    return false
  })
}

export function isInstalled(
  plugin: RegistryPlugin,
  installed: InstalledMap,
  repoIdentities: InstalledRepoIdentities = {},
  plugins?: RegistryPlugin[],
  repoHints: InstalledRepoHints = {},
): boolean {
  return matchInstalledName(plugin, installed, repoIdentities, plugins, repoHints) !== null
}

/**
 * The header brand mark now lives in MarketSection.tsx as an inline SVG
 * (official-style monochrome glyph, fill="currentColor") so it follows the
 * active theme; the colored assets/logo.svg tile is no longer inlined here.
 */

/** Four representative colors for a theme card's preview strip. */
export function themeSwatch(def: ThemeDef): string[] {
  const tk = def.tokens || {}
  const pick = (names: string[]) => { for (const n of names) { if (tk[n]) return tk[n]! } return null }
  const dark = def.colorScheme === 'dark'
  return [
    pick(['--dsw-alias-bg-base', '--dsw-alias-bg-layer-1']) || (dark ? '#0f1115' : '#ffffff'),
    pick(['--dsw-alias-bg-layer-2', '--dsw-alias-bg-overlay']) || (dark ? '#1a1d23' : '#f3f4f6'),
    pick(['--dsw-alias-brand-primary']) || '#4f6ef7',
    pick(['--dsw-alias-label-primary']) || (dark ? '#e5e7eb' : '#1f2328'),
  ]
}

// ------------------------------------------------------------- screenshots

/**
 * Prefix for github.com URLs this page loads, or null to address them
 * directly. Set from the status poll, which gets it from the download region.
 *
 * Module state rather than a prop: the URLs it applies to are built in four
 * places across two files (avatars, README fetches, screenshot thumbnails),
 * and threading one string through every card would put it in signatures
 * that have no other reason to know about networking.
 *
 * Applied at the LAST moment, never stored. Extracted image URLs stay
 * canonical, so changing region re-renders against the new route instead of
 * leaving a page full of links to a proxy the user just switched away from.
 */
let githubProxy: string | null = null

/** Point browser-side github.com requests at a proxy, or null for direct. */
export function setGithubProxy(proxy: string | null): void {
  githubProxy = proxy
}

/** The proxy in force, for callers that must decide between two URL shapes. */
export function githubProxyInUse(): string | null {
  return githubProxy
}

/** `url` through the proxy in force, or unchanged when there is none. */
export function githubUrl(url: string): string {
  return githubProxy === null ? url : `${githubProxy}/${url}`
}

/**
 * Image hosts screenshots may load from (#61) — GitHub's own hosting only.
 * Any other host is dropped BEFORE an <img> is created: a screenshot URL is
 * a request carrying the user's IP, so registry data and README content are
 * both treated as untrusted here, matching the upstream build gate.
 */
const SCREENSHOT_HOSTS = new Set([
  'raw.githubusercontent.com',
  'user-images.githubusercontent.com',
  'camo.githubusercontent.com',
  'github.com',
])

const MAX_SCREENSHOTS = 6

/** A README image together with the evidence used to rank it as a preview. */
export interface ScreenshotCandidate {
  src: string
  semanticScore: number
  order: number
  curated: boolean
}

/** Dimensions observed from a low-resolution, no-upscale image probe. */
export interface ScreenshotMeasurement {
  src: string
  width: number
  height: number
}

/** Return one safe screenshot URL without applying the public list limit. */
function safeScreenshot(value: unknown): string | null {
  if (typeof value !== 'string') return null
  let parsed: URL
  try { parsed = new URL(value) } catch { return null }
  if (parsed.protocol !== 'https:' || !SCREENSHOT_HOSTS.has(parsed.hostname)) return null
  if (/\.svg$/iu.test(parsed.pathname)) return null
  return value
}

/** Keep only https URLs on allowlisted image hosts; SVG dropped (logos/badges). */
export function safeScreenshots(urls: unknown): string[] {
  if (!Array.isArray(urls)) return []
  const safe: string[] = []
  for (const value of urls) {
    const src = safeScreenshot(value)
    if (src === null) continue
    if (!safe.includes(src)) safe.push(src)
    if (safe.length >= MAX_SCREENSHOTS) break
  }
  return safe
}

const PREVIEW_WORDS = /(?:preview|screen[ -]?shots?|shots?|demo|showcase|gallery|theme|skin|appearance|效果|预览|截图|演示|展示|界面|主题|皮肤)/iu
const FULL_PREVIEW_WORDS = /(?:full|overview|home|main|conversation|chat|workspace|dashboard|完整|主页|首页|全景|主界面)/iu
const PARTIAL_PREVIEW_WORDS = /(?:settings?|panel|dialog|modal|picker|menu|controls?|fragment|crop|detail|配置|设置|面板|弹窗|局部|细节)/iu
const NON_PREVIEW_WORDS = /(?:badge|shield|logo|icon|avatar|sponsor|donat|fund|qr(?:code)?|wechat|qq(?:group)?|npm|build|coverage|license|status|button|favicon|徽章|图标|头像|赞助|捐赠|二维码|微信|交流群)/iu

interface ReadmeImageParts {
  src: string
  alt: string
  title: string
  width: number | null
  height: number | null
}

/** A quoted or unquoted HTML attribute; README HTML is data, never rendered. */
function htmlAttribute(html: string, name: string): string {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'iu').exec(html)
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
}

function numericDimension(raw: string): number | null {
  if (!/^\d+(?:\.\d+)?$/u.test(raw.trim())) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Resolve one README image path to the canonical GitHub-hosted URL. */
function resolveReadmeImage(raw: string, owner: string, repo: string, base: string): string | null {
  const src = raw.trim().replace(/^<|>$/g, '')
  if (src === '' || src.startsWith('data:')) return null
  let absolute: string
  if (/^https?:\/\//iu.test(src)) {
    absolute = src
  } else if (src.startsWith('/')) {
    absolute = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD${src}`
  } else {
    try { absolute = new URL(src, base).href } catch { return null }
  }
  return safeScreenshot(absolute)
}

/** Score evidence available without downloading the image itself. */
function readmeSemanticScore(
  image: ReadmeImageParts,
  heading: string,
  nearby: string,
  order: number,
  offset: number,
): number {
  const label = `${image.alt} ${image.title}`
  const path = (() => {
    try {
      const parsed = new URL(image.src)
      // Do not count owner/repository names as image evidence: practically
      // every entry here contains "theme" or "skin" in its repo name.
      if (parsed.hostname === 'raw.githubusercontent.com') {
        return '/' + parsed.pathname.split('/').slice(4).join('/')
      }
      return parsed.pathname
    } catch { return image.src }
  })()
  let score = 20 + Math.max(0, 8 - order)
  if (PREVIEW_WORDS.test(label)) score += 55
  if (PREVIEW_WORDS.test(path)) score += 40
  if (PREVIEW_WORDS.test(heading)) score += 32
  if (PREVIEW_WORDS.test(nearby)) score += 12
  if (FULL_PREVIEW_WORDS.test(`${label} ${path}`)) score += 35
  if (PARTIAL_PREVIEW_WORDS.test(`${label} ${path}`)) score -= 30
  if (NON_PREVIEW_WORDS.test(label)) score -= 140
  if (NON_PREVIEW_WORDS.test(path)) score -= 120
  if (NON_PREVIEW_WORDS.test(heading)) score -= 55
  if (NON_PREVIEW_WORDS.test(nearby)) score -= 18
  // A title-block image with no screenshot evidence is usually branding.
  if (offset < 500 && !PREVIEW_WORDS.test(`${label} ${path} ${heading}`)) score -= 20
  if (image.width !== null && image.height !== null) {
    score += previewDimensionScore(image.width, image.height) ?? -500
  } else if ((image.width ?? image.height ?? Number.POSITIVE_INFINITY) < 240) {
    score -= 100
  }
  return score
}

/**
 * Ranked README image candidates for use when the catalog has no curated
 * screenshots. Ranking uses the image label/path, nearest heading, nearby
 * prose, declared dimensions and document position. This prevents a title
 * logo or a row of tiny badges from consuming the six-candidate limit before
 * a later Screenshots section is reached.
 */
export function extractReadmeImageCandidates(
  markdown: string,
  owner: string,
  repo: string,
  subpath: string | null,
): ScreenshotCandidate[] {
  const base = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${subpath === null ? '' : subpath + '/'}`
  const headings = [...markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gmu)]
    .map(match => ({ offset: match.index, text: match[1] ?? '' }))
  const found = new Map<string, ScreenshotCandidate>()
  let headingIndex = -1
  let order = 0
  // Markdown and HTML image forms stay in one pass, preserving position.
  const imagePattern = /!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*\)|<img\b([^>]*?)\/?\s*>/gimu
  for (const match of markdown.matchAll(imagePattern)) {
    while (headingIndex + 1 < headings.length && headings[headingIndex + 1]!.offset < match.index) headingIndex += 1
    const html = match[7] ?? ''
    const rawSrc = match[2] ?? match[3] ?? htmlAttribute(html, 'src')
    const src = resolveReadmeImage(rawSrc, owner, repo, base)
    if (src === null) continue
    const image: ReadmeImageParts = {
      src,
      alt: match[1] ?? htmlAttribute(html, 'alt'),
      title: match[4] ?? match[5] ?? match[6] ?? htmlAttribute(html, 'title'),
      width: numericDimension(htmlAttribute(html, 'width')),
      height: numericDimension(htmlAttribute(html, 'height')),
    }
    const heading = headings[headingIndex]?.text ?? ''
    const nearby = markdown.slice(Math.max(0, match.index - 100), Math.min(markdown.length, match.index + match[0].length + 100))
    const candidate: ScreenshotCandidate = {
      src,
      semanticScore: readmeSemanticScore(image, heading, nearby, order, match.index),
      order,
      curated: false,
    }
    const previous = found.get(src)
    if (previous === undefined || candidate.semanticScore > previous.semanticScore) found.set(src, candidate)
    order += 1
  }
  return [...found.values()]
    .filter(candidate => candidate.semanticScore >= 20)
    .sort((a, b) => b.semanticScore - a.semanticScore || a.order - b.order)
    .slice(0, MAX_SCREENSHOTS)
}

/** Ranked README image URLs; retained as the simple public extraction API. */
export function extractReadmeImages(markdown: string, owner: string, repo: string, subpath: string | null): string[] {
  return extractReadmeImageCandidates(markdown, owner, repo, subpath).map(candidate => candidate.src)
}

/**
 * Score dimensions from a 240px-high, no-upscale probe.
 *
 * A theme preview should resemble a complete desktop surface: landscape,
 * neither a narrow crop nor a panoramic strip, and large enough to inspect.
 * Small square logos and portrait fragments intentionally return null.
 */
export function previewDimensionScore(width: number, height: number): number | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  const ratio = width / height
  const area = width * height
  if (width < 280 || height < 150 || area < 48_000 || ratio < 1.05 || ratio > 3.2) return null
  let score = Math.min(28, Math.round(area / 4_000))
  if (ratio >= 1.35 && ratio <= 2.05) score += 48
  else if (ratio >= 1.18 && ratio <= 2.4) score += 28
  else score += 8
  if (width >= 320 && height >= 180) score += 14
  return score
}

/** Combine README semantics with measured geometry and return the best set. */
export function rankThemeScreenshots(
  candidates: ScreenshotCandidate[],
  measurements: ScreenshotMeasurement[],
): string[] {
  const bySrc = new Map(measurements.map(item => [item.src, item]))
  return candidates.flatMap(candidate => {
    const measured = bySrc.get(candidate.src)
    if (measured === undefined) return []
    const dimensionScore = previewDimensionScore(measured.width, measured.height)
    return dimensionScore === null ? [] : [{ candidate, score: candidate.semanticScore + dimensionScore }]
  }).sort((a, b) => b.score - a.score || a.candidate.order - b.candidate.order)
    .slice(0, MAX_SCREENSHOTS)
    .map(item => item.candidate.src)
}

const readmeShotsCache = new Map<string, Promise<ScreenshotCandidate[]>>()

/** Test hook: the cache is module-level and outlives component unmounts. */
export function resetScreenshotsCache(): void {
  readmeShotsCache.clear()
}

/**
 * Screenshot candidates for a plugin: the registry's curated list when
 * present, otherwise lazily extracted and semantically ranked from README.
 */
export function pluginScreenshotCandidates(plugin: RegistryPlugin): Promise<ScreenshotCandidate[]> {
  const curated = safeScreenshots(plugin.screenshots)
  if (curated.length > 0) {
    return Promise.resolve(curated.map((src, order) => ({ src, order, semanticScore: 1_000 - order, curated: true })))
  }
  const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(plugin.url)
  if (m === null) return Promise.resolve([])
  const [, owner, repo, subpath = null] = m
  const cacheKey = plugin.url
  const cached = readmeShotsCache.get(cacheKey)
  if (cached !== undefined) return cached
  const fetchReadme = async (path: string | null): Promise<string | null> => {
    try {
      const res = await fetch(githubUrl(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path === null ? '' : path + '/'}README.md`))
      return res.ok ? await res.text() : null
    } catch {
      return null
    }
  }
  const task = (async () => {
    // Monorepo subpath entries prefer their own README, falling back to the
    // repo root; shots in the subpath README resolve against its directory.
    const sub = subpath === null ? null : await fetchReadme(subpath)
    if (sub !== null) return extractReadmeImageCandidates(sub, owner!, repo!, subpath)
    const root = await fetchReadme(null)
    return root === null ? [] : extractReadmeImageCandidates(root, owner!, repo!, null)
  })().catch(() => [] as ScreenshotCandidate[])
  readmeShotsCache.set(cacheKey, task)
  return task
}

/** Screenshot URLs for dialogs; theme covers use the richer candidate API. */
export async function pluginScreenshots(plugin: RegistryPlugin): Promise<string[]> {
  return (await pluginScreenshotCandidates(plugin)).map(candidate => candidate.src)
}

/**
 * The human-readable part of a failed command's output.
 *
 * pnpm's ndjson reporter writes one JSON object per progress tick, and a
 * large `github:` download emits thousands of them. When a failure matches
 * none of the known signatures there is no diagnosis to show, so the UI
 * falls back to the tail of stdout/stderr — which for exactly that case is
 * 600 characters of `{"name":"pnpm:fetching-progress","downloaded":…}`.
 * The user is handed machine noise at the one moment they need a sentence
 * (#148, and the same shape behind #161).
 *
 * Progress objects are dropped; anything else — including JSON carrying a
 * real message — is kept, because an unrecognized failure is precisely when
 * throwing information away is most expensive.
 */
export function humanOutput(raw: string): string {
  const lines = raw.split(/\r?\n/)
  const kept: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    if (!trimmed.startsWith('{')) { kept.push(line); continue }
    try {
      const parsed = JSON.parse(trimmed) as { name?: unknown; err?: unknown; message?: unknown }
      const name = typeof parsed.name === 'string' ? parsed.name : ''
      // Keep anything that carries a diagnosis, drop pure progress chatter.
      if (parsed.err !== undefined || typeof parsed.message === 'string') { kept.push(line); continue }
      if (name.startsWith('pnpm:')) continue
      kept.push(line)
    } catch {
      kept.push(line)
    }
  }
  return kept.join('\n').trim()
}

/**
 * The plugin's own name, for display.
 *
 * The catalog's `name` is an IDENTITY, and for the 104 entries that live in
 * a repository holding several plugins it is a compound one:
 * `dsh-web#packages/dsh-web-all`. Shown verbatim it puts a repository
 * path in front of a user who did not ask about repositories — and worse, it
 * disagrees with the market's own installed list, which reads names out of
 * the profile manifest and calls the same plugin `dsh-web-all`. The same
 * thing had two names either side of the Install button.
 *
 * A card answers two questions: who made it, and what is it called. The
 * author is drawn beside their avatar as one unit, so the title is free to
 * be just the plugin. Duplicate titles across authors are fine — the byline
 * is what separates them — which is why this does not try to keep the
 * repository as a qualifier.
 *
 * The repository name IS the plugin name in the ordinary case, because a
 * repository holding one plugin is named after it. Only the compound form
 * needs unpicking, and its last segment is the plugin's own directory.
 *
 * Not a substitute for the identity: every key, lookup and install still
 * uses `name` unchanged.
 */
export function pluginName(name: string): string {
  const hash = name.indexOf('#')
  if (hash === -1) return name
  const sub = name.slice(hash + 1)
  const leaf = sub.slice(sub.lastIndexOf('/') + 1)
  // A sub-path that is empty or trailing-slashed tells us nothing; the
  // repository half is a better answer than an empty title.
  return leaf === '' ? name.slice(0, hash) : leaf
}

/**
 * Compact display for a count that can run into the tens of thousands
 * (npm downloads, star counts): "11.9k" instead of "11862". Reported —
 * the raw number made the card byline visibly cramped once downloads was
 * added alongside stars.
 *
 * Below 1000 the exact number is shown; a small count is exactly the case
 * where the precision matters and abbreviating it buys nothing.
 */
export function formatCount(n: number): string {
  if (!Number.isFinite(n) || n < 1000) return String(n)
  const k = Math.round(n / 100) / 10
  return `${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}k`
}
