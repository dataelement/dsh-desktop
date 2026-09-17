/**
 * Update notes: what changed between an installed version and HEAD.
 *
 * Every byte of GitHub data comes from the catalog side's daily probe,
 * published as the `dsh-plugin-updates` package (origin fallback
 * `updates.json` beside `plugins.json`). The market asks GitHub for nothing:
 * anonymous REST quota is shared per egress IP and already unreliable behind
 * common proxies, and this data is wanted by thousands of markets but
 * produced perfectly well once a day by one probe.
 *
 * What the catalog cannot know is where each user's installed version sits,
 * so slicing the commit tail at that boundary happens here: the same sha the
 * update check resolved (`current`) marks where "new" begins. A tail that
 * does not contain it means the range is wider than the tail — those are
 * labelled recent commits rather than pretending to be an exact interval.
 * Plugins with neither notes nor commits fall back to npm publish times, and
 * a plugin nothing answers for gets a neutral "no notes" — absence of release
 * notes is the ordinary condition of small plugins, not a defect.
 */

import { fileFromTarball } from './catalog-npm.ts'
import { marketFetch } from './net.ts'
import { activeRegion, routesFor } from './regions.ts'
import { profileDir, readInstalled, readLockCommits } from './profile.ts'
import { lookupRepoFromUrl, repoOfTarget } from './sources.ts'
import { checkUpdates } from './updates.ts'
import { loadRegistry } from './registry.ts'

const UPDATES_PACKAGE = 'dsh-plugin-updates'
const UPDATES_FILE = 'package/updates.json'
/** The origin copy sits beside plugins.json on the catalog host. */
const ORIGIN_UPDATES = process.env.DSHM_UPDATES_ORIGIN ?? 'https://awesome-dsh-plugin.com/updates.json'
/** Notes are produced daily; re-checking hourly bounds staleness without churn. */
const NOTES_TTL_MS = 60 * 60 * 1000
const TIMEOUT_MS = 15_000

export interface ReleaseNotes {
  tag: string | null
  name: string | null
  publishedAt: string | null
  url: string | null
  body: string
}

export interface CommitNote {
  sha: string
  message: string
  date: string | null
}

interface UpdatesEntry {
  release?: ReleaseNotes | null
  commits?: CommitNote[]
}

interface UpdatesPayload {
  count?: number
  updates?: Record<string, UpdatesEntry>
}

let notesCache: { at: number; data: UpdatesPayload } | null = null

/**
 * The update-notes payload from whichever route the region serves.
 *
 * Same source order as the catalog itself — the npm package first where one
 * exists (its mirror reach is the reason the package exists), then the
 * origin. Version-keyed like the catalog too: an unchanged payload costs one
 * packument read per TTL, not a tarball.
 */
export async function loadUpdateNotes(force = false): Promise<UpdatesPayload> {
  if (!force && notesCache !== null && Date.now() - notesCache.at < NOTES_TTL_MS) {
    return notesCache.data
  }
  const routes = routesFor(activeRegion())
  const attempt = async (): Promise<UpdatesPayload> => {
    // The npm package, on the region's registry — mirrors rewrite dist.tarball
    // to themselves, so following that field keeps the download local.
    const metaRes = await marketFetch(`${routes.npmRegistry}/${encodeURIComponent(UPDATES_PACKAGE)}/latest`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json', 'user-agent': 'dsh-market' },
    })
    if (!metaRes.ok) throw new Error(`HTTP ${String(metaRes.status)} reading ${UPDATES_PACKAGE} metadata`)
    const meta = await metaRes.json() as { dist?: { tarball?: unknown } }
    const tarball = typeof meta.dist?.tarball === 'string' ? meta.dist.tarball : null
    if (tarball === null) throw new Error(`${UPDATES_PACKAGE} names no tarball`)
    const tarRes = await marketFetch(tarball, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!tarRes.ok) throw new Error(`HTTP ${String(tarRes.status)} reading ${UPDATES_PACKAGE} tarball`)
    const bytes = fileFromTarball(Buffer.from(await tarRes.arrayBuffer()), UPDATES_FILE)
    if (bytes === null) throw new Error(`${UPDATES_PACKAGE} carries no ${UPDATES_FILE}`)
    return JSON.parse(bytes.toString('utf8')) as UpdatesPayload
  }
  const attemptOrigin = async (): Promise<UpdatesPayload> => {
    const res = await marketFetch(ORIGIN_UPDATES, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json', 'user-agent': 'dsh-market' },
    })
    if (!res.ok) throw new Error(`HTTP ${String(res.status)} reading ${ORIGIN_UPDATES}`)
    return await res.json() as UpdatesPayload
  }
  // Two independent sources, each tried twice — the same retry economics as
  // the catalog loader, for the same transient-loss reasons.
  let lastError: unknown = null
  for (const attemptFn of [attempt, attemptOrigin]) {
    for (let i = 0; i < 2; i++) {
      try {
        const data = await attemptFn()
        notesCache = { at: Date.now(), data }
        return data
      } catch (error) {
        lastError = error
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('update notes unavailable')
}

/** Drop the cached payload (nothing currently invalidates it mid-process). */
export function invalidateUpdateNotes(): void {
  notesCache = null
}

/**
 * Slice the commit tail at the installed sha.
 *
 * @returns the commits newer than `installed`, and whether the boundary was
 *   actually found — `found === false` means the range is wider than the tail
 *   (or history diverged), so callers must label the result "recent" rather
 *   than exact.
 */
export function sliceCommitsAt(items: CommitNote[], installed: string | null): { items: CommitNote[]; found: boolean } {
  if (installed === null) return { items, found: false }
  const out: CommitNote[] = []
  for (const commit of items) {
    if (commit.sha === installed) return { items: out, found: true }
    out.push(commit)
  }
  return { items: out, found: false }
}

/** The repo url key an entry's update notes live under, or null. */
export function repoKeyOf(spec: string): string | null {
  const repo = repoOfTarget(spec)?.split('#')[0] ?? null
  return repo === null ? null : `https://github.com/${repo}`
}

/**
 * Look an entry up by its catalog url.
 *
 * The catalog keys entries by the url as listed (author's casing preserved);
 * the market resolves repos to lowercase (as every other consumer of
 * `repoOfTarget` sees them). Match case-insensitively so the two sides never
 * disagree over a capital letter.
 */
export function entryForRepo(payload: UpdatesPayload, key: string): UpdatesEntry | undefined {
  const direct = payload.updates?.[key]
  if (direct !== undefined) return direct
  const lower = key.toLowerCase()
  for (const [k, v] of Object.entries(payload.updates ?? {})) {
    if (k.toLowerCase() === lower) return v
  }
  return undefined
}

/**
 * Publish times for an npm package's recent versions, newest first.
 *
 * The last resort before "no notes": authors who ship neither releases nor
 * informative commits still usually tag versions, and "0.4.0 landed three
 * days ago" beats nothing. Reads the full packument once and caches it —
 * the doc is heavy, and a user may open the dialog twice.
 */
const timesCache = new Map<string, { at: number; data: { version: string; date: string }[] }>()
const TIMES_TTL_MS = 30 * 60 * 1000

export async function npmPublishTimes(name: string): Promise<{ version: string; date: string }[]> {
  const hit = timesCache.get(name)
  if (hit !== undefined && Date.now() - hit.at < TIMES_TTL_MS) return hit.data
  const registry = routesFor(activeRegion()).npmRegistry
  const res = await marketFetch(`${registry}/${encodeURIComponent(name)}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json', 'user-agent': 'dsh-market' },
  })
  if (!res.ok) throw new Error(`HTTP ${String(res.status)} reading ${name}`)
  const doc = await res.json() as { time?: Record<string, string> }
  const time = doc.time ?? {}
  const data = Object.entries(time)
    .filter(([version]) => version !== 'created' && version !== 'modified')
    .sort(([, a], [, b]) => Date.parse(b) - Date.parse(a))
    .slice(0, 5)
    .map(([version, date]) => ({ version, date }))
  timesCache.set(name, { at: Date.now(), data })
  return data
}

/** Everything the dialog renders for one plugin, already resolved. */
export interface UpdateNotes {
  kind: 'release' | 'commits' | 'npm' | 'none'
  /** Present for `release`: the author's own notes for the latest release. */
  release?: ReleaseNotes
  /** Present for `commits`: the tail, sliced when the boundary was found. */
  commits?: { items: CommitNote[]; found: boolean }
  /** Present for `npm`: recent versions with their publish dates. */
  npmTimes?: { version: string; date: string }[]
}

/**
 * Resolve the notes for one installed plugin, or `{ kind: 'none' }`.
 *
 * Never throws: every failure along the way degrades to the next tier, the
 * same contract the issue promised — a dialog that cannot load its data shows
 * a neutral statement, not an error.
 */
export async function updateNotesFor(
  profile: string,
  explicitDir: string | undefined,
  name: string,
): Promise<UpdateNotes> {
  const activeProfileDir = profileDir(profile, explicitDir)
  const spec = readInstalled(profile, activeProfileDir)[name]
  if (spec === undefined || spec.startsWith('link:') || spec.startsWith('file:')) {
    return { kind: 'none' }
  }
  try {
    const payload = await loadUpdateNotes()
    let key = repoKeyOf(spec)
    // If the spec is a Release asset URL (catalog format), try to extract
    // the repo from the URL directly. This handles npm-installed plugins
    // whose profile spec is the npm name but the catalog entry uses a
    // Release asset tarball URL.
    if (key === null) {
      key = lookupRepoFromUrl(spec)
    }
    // If the spec is an npm package name (not a GitHub URL), look up the
    // catalog to find the corresponding GitHub repo URL.
    if (key === null) {
      try {
        const registry = await loadRegistry()
        const plugin = registry.plugins.find(p => p.name === name)
        if (plugin !== undefined) {
          key = plugin.url
        }
      } catch {
        // Catalog unavailable; fall through to npm times.
      }
    }
    const entry = key === null ? undefined : entryForRepo(payload, key)
    // Both tiers below need the installed sha for github-kind installs.
    // For Release asset URLs and catalog lookups, checkUpdates doesn't
    // recognize the spec, so we read the lockfile directly using the repo key.
    let current: string | null = null
    if (key !== null && key.startsWith('https://github.com/')) {
      const repo = key.slice('https://github.com/'.length).split('#')[0]!.toLowerCase()
      current = readLockCommits(profile, activeProfileDir).get(repo) ?? null
    } else {
      const statuses = await checkUpdates(profile, false, explicitDir).catch(() => null)
      current = statuses?.[name]?.current ?? null
    }

    if (entry?.release !== undefined && entry.release !== null && (entry.release.body !== '' || entry.release.tag !== null)) {
      return { kind: 'release', release: entry.release }
    }
    if (entry?.commits !== undefined && entry.commits.length > 0) {
      return { kind: 'commits', commits: sliceCommitsAt(entry.commits, current) }
    }
    if (key === null) {
      // Not a github-sourced plugin at all: npm times are the only tier left.
      return { kind: 'npm', npmTimes: await npmPublishTimes(name) }
    }
    // A github plugin whose repo answered nothing — releases 404 AND the log
    // came back empty. Rare enough to just say so rather than ask npm about a
    // name that may not even exist there.
    return { kind: 'none' }
  } catch {
    return { kind: 'none' }
  }
}
