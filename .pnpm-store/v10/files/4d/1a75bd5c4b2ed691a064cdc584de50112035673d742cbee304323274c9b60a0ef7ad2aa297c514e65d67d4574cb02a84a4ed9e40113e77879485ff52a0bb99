/**
 * Catalog matching for locally linked / file: installs. Shared by the host
 * restore route and the Market client so both refuse the same wrong guesses.
 */

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

function validSubpath(subpath: string): boolean {
  if (!/^[A-Za-z0-9_./-]+$/.test(subpath)) return false
  return !subpath.split('/').some(seg => seg === '' || seg === '.' || seg === '..')
}

/**
 * Keys a catalog URL contributes to restore matching.
 * A `/tree/` entry is ONLY its exact `#path:` id — never the bare repo —
 * so a collection-root identity cannot select a sibling subpackage.
 */
function catalogMatchKeys(url: string): { path: string | null; repo: string | null } {
  const m = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(url)
  if (m === null || !REPO_RE.test(m[1]!)) return { path: null, repo: null }
  const subpath = m[2] ?? null
  if (subpath !== null && !validSubpath(subpath)) return { path: null, repo: null }
  const repo = m[1]!.toLowerCase()
  return subpath === null
    ? { path: null, repo }
    : { path: `${repo}#path:/${subpath.toLowerCase()}`, repo: null }
}

function catalogEntryMatchesHints(
  url: string,
  hintSet: ReadonlySet<string>,
): boolean {
  const keys = catalogMatchKeys(url)
  return (keys.path !== null && hintSet.has(keys.path))
    || (keys.repo !== null && hintSet.has(keys.repo))
}

/**
 * The catalog entry a locally linked / file: install should restore to.
 * Exact `#path:` identities win, then collection-root identities against
 * root-only catalog rows, then a unique name/npm match when nothing
 * contradicts it. A bare repo identity never selects a root row while
 * `/tree/` siblings exist for that repo — the checkout did not say which
 * package it is, and guessing wrong installs a different plugin.
 * Same-named forks without identities or a matching hint stay unmatched
 * rather than guessing; declared repo evidence that matches nothing in the
 * catalog must not fall back to a coincidental unique name.
 */
export function findCatalogEntryForLocal<T extends { name: string; npm?: string | null; url: string }>(
  plugins: readonly T[],
  name: string,
  identities: readonly string[] = [],
  hints: readonly string[] = [],
): T | null {
  const nameKey = name.toLowerCase()
  const byName = plugins.filter(plugin =>
    plugin.name.toLowerCase() === nameKey
    || (typeof plugin.npm === 'string' && plugin.npm.toLowerCase() === nameKey),
  )
  const identitySet = new Set(identities.map(value => value.toLowerCase()))
  const hintSet = new Set(hints.map(value => value.toLowerCase()))
  const treeRepos = new Set<string>()
  for (const plugin of plugins) {
    const keys = catalogMatchKeys(plugin.url)
    if (keys.path !== null) treeRepos.add(keys.path.slice(0, keys.path.indexOf('#path:/')))
  }
  if (identitySet.size > 0) {
    const pathHit = plugins.find(plugin => {
      const keys = catalogMatchKeys(plugin.url)
      return keys.path !== null && identitySet.has(keys.path)
    })
    if (pathHit !== undefined) return pathHit
    const rootHit = plugins.find(plugin => {
      const keys = catalogMatchKeys(plugin.url)
      if (keys.repo === null || !identitySet.has(keys.repo)) return false
      return !treeRepos.has(keys.repo) || byName.includes(plugin)
    })
    if (rootHit !== undefined) return rootHit
    return null
  }
  if (byName.length === 1) {
    const only = byName[0]!
    if (hintSet.size > 0 && !catalogEntryMatchesHints(only.url, hintSet)) return null
    return only
  }
  if (byName.length > 1 && hintSet.size > 0) {
    const hinted = byName.find(plugin => catalogEntryMatchesHints(plugin.url, hintSet))
    if (hinted !== undefined) return hinted
  }
  return null
}

function catalogEntriesByName<T extends { name: string; npm?: string | null }>(
  plugins: readonly T[],
  name: string,
): T[] {
  const nameKey = name.toLowerCase()
  return plugins.filter(plugin =>
    plugin.name.toLowerCase() === nameKey
    || (typeof plugin.npm === 'string' && plugin.npm.toLowerCase() === nameKey),
  )
}

export type CatalogRestoreReason = 'no-catalog' | 'repo-mismatch'

/**
 * Why a local restore was blocked, when findCatalogEntryForLocal returned
 * null — and, when it matched, whether anything but the NAME agreed.
 *
 * `verified` is the difference between "put this back where it came from"
 * and "install the catalog's plugin that happens to share this name". A
 * local checkout with no declared repo — no git remote, no `repository`
 * field — gives the market nothing to match on, so a unique same-named
 * catalog entry is a guess. Usually a good one (#429: the local copy IS a
 * tweaked copy of that entry). Not always: @liuwenji007 reported a fork of
 * their own `dsh-humanizer` restored to a different author's plugin of the
 * same name (#485), which is someone else's code arriving under a button
 * labelled "restore".
 *
 * The match is kept, because refusing it would break the ordinary case, and
 * the caller is told not to present it as a certainty.
 */
export function resolveCatalogRestore<T extends { name: string; npm?: string | null; url: string }>(
  plugins: readonly T[],
  name: string,
  identities: readonly string[] = [],
  hints: readonly string[] = [],
): { ok: true; entry: T; verified: boolean } | { ok: false; reason: CatalogRestoreReason } {
  const entry = findCatalogEntryForLocal(plugins, name, identities, hints)
  if (entry !== null) {
    // Evidence is what every other branch of the matcher requires; the
    // name-only branch is reachable only when there is none of it.
    const verified = identities.length > 0 || hints.length > 0
    return { ok: true, entry, verified }
  }
  const byName = catalogEntriesByName(plugins, name)
  if (byName.length === 0) return { ok: false, reason: 'no-catalog' }
  const identitySet = new Set(identities.map(value => value.toLowerCase()))
  const hintSet = new Set(hints.map(value => value.toLowerCase()))
  if (identitySet.size > 0 || hintSet.size > 0) return { ok: false, reason: 'repo-mismatch' }
  // Only ambiguous same-name rows reach here: a unique name with no evidence
  // would have matched inside findCatalogEntryForLocal.
  return { ok: false, reason: 'no-catalog' }
}
