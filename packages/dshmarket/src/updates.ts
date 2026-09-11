/**
 * Update detection: per-plugin comparison of what the profile has against
 * the source of truth — git HEAD for github installs, the npm latest
 * dist-tag for registry installs — with a TTL cache.
 */

import { DIST_TAG, type Channel } from './channels.ts'
import { headCommit } from './accelerate.ts'
import { marketFetch } from './net.ts'
import { activeRegion, routesFor } from './regions.ts'
import { profileDir, readInstalled, readInstalledVersion, readLockCommits } from './profile.ts'
import { githubCommitOfTarget, githubRefOfTarget, repoOfTarget } from './sources.ts'

export interface UpdateStatus {
  kind: 'github' | 'npm' | 'linked'
  version: string | null
  current: string | null
  latest: string | null
  /**
   * A NEWER version exists. Forwards only, always — every caller reads it
   * as "there is an upgrade" and labels a button accordingly.
   */
  updateAvailable: boolean
  /** Taking this update replaces a local package source with its matched online release. */
  restoreRequired?: boolean
  /**
   * The version this package's channel points at, when it differs from what
   * is installed and is NOT newer.
   *
   * A separate field rather than a second meaning for `updateAvailable`,
   * which was tried and leaked immediately: the market page has three
   * consumers of that flag (the header banner, "update all", the row
   * button) and all three announced a DOWNGRADE as "a new version is
   * available". One field, one meaning; a caller that has not been taught
   * about channel switches simply does not offer one.
   *
   * Only a channel-following package can be in this state, and it is the
   * state that used to be unreachable: picking "stable" while a prerelease
   * was installed compared 1.13.1 against 1.14.0-beta.1, found nothing
   * newer, and answered "up to date" — so there was no way back off a
   * channel the user had just left.
   */
  channelSwitch?: string
}

const UPDATES_TTL_MS = 30 * 60 * 1000
let updatesCache: { key: string; at: number; data: Record<string, UpdateStatus> } | null = null

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

function parseSemver(v: string): { core: number[]; pre: string[] } | null {
  const m = SEMVER.exec(v.trim())
  if (m === null) return null
  return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] === undefined ? [] : m[4].split('.') }
}

/**
 * Semver precedence: negative / 0 / positive like a comparator, or null when
 * either side isn't a plain semver version. Build metadata is ignored, a
 * release outranks any prerelease of the same core, and prerelease
 * identifiers compare numerically when both are numeric (so `rc.10` > `rc.9`).
 */
export function compareVersions(a: string, b: string): number | null {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  if (pa === null || pb === null) return null
  for (let i = 0; i < 3; i++) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] - pb.core[i]
  }
  if (pa.pre.length === 0 || pb.pre.length === 0) return pb.pre.length - pa.pre.length
  for (let i = 0; i < Math.max(pa.pre.length, pb.pre.length); i++) {
    const x = pa.pre[i]
    const y = pb.pre[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const nx = /^\d+$/.test(x)
    const ny = /^\d+$/.test(y)
    if (nx && ny) return Number(x) - Number(y)
    if (nx !== ny) return nx ? -1 : 1
    return x < y ? -1 : 1
  }
  return 0
}

/**
 * True only when the registry's `latest` is semantically HIGHER than what the
 * profile has (#64 by @ZeroOrigin64). A plain `!==` also fires when a
 * package's `latest` dist-tag is left pointing at an OLDER release than the
 * pinned install — clicking "update" then rewrote the exact pin to `@latest`
 * and downgraded the profile until it no longer booted.
 *
 * Undecidable inputs (missing or non-semver versions) report no update:
 * without a direction we cannot promise the "update" isn't a downgrade.
 */
export function isUpgrade(installed: string | null, latest: string | null): boolean {
  if (installed === null || latest === null) return false
  const cmp = compareVersions(latest, installed)
  return cmp !== null && cmp > 0
}

/** Drop the cached listing (after a successful install/update/uninstall). */
export function invalidateUpdates(): void {
  updatesCache = null
}

/**
 * The npm registry update checks read, no trailing slash.
 *
 * Module state driven from the routes, like `updatesCache` beside it, rather
 * than a parameter on all five call sites: the registry is a property of the
 * running market, not of any one question asked of it, and threading it
 * through would put the same value in five signatures and every test that
 * calls them.
 */
let registryBase = 'https://registry.npmjs.org'

/**
 * Point update checks at a registry. Called when the download region
 * resolves and whenever it changes.
 *
 * Dropping the cache is the load-bearing half. A mirror can lag the official
 * registry by minutes, so answers gathered from one are not answers from the
 * other — keeping them across a switch would report a version this registry
 * cannot yet serve.
 */
export function setUpdateRegistry(base: string): void {
  const next = base.replace(/\/+$/, '')
  if (next === registryBase) return
  registryBase = next
  updatesCache = null
}

/** A registry URL for `path`, on whichever registry is currently in force. */
function npmUrl(path: string): string {
  return `${registryBase}/${path}`
}

async function fetchJson(url: string): Promise<unknown> {
  // Through the proxy when one is configured: Node's global fetch ignores
  // HTTP_PROXY, so on a machine whose route out is a local proxy every
  // update check silently took the slow path — or none at all.
  const res = await marketFetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'dsh-market' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as unknown
}

/**
 * Evidence check behind the "wait a day" stale diagnosis (#45): whether the
 * package's CURRENT latest release was published recently enough to sit
 * inside pnpm's default fresh-release window. pnpm's silent hold leaves no
 * trace in its output, so the publish time is the only verifiable signal.
 * @returns true/false when the npm time metadata answers, null when it
 *   can't be determined (offline, unpublished, non-npm) — callers must NOT
 *   claim the safety wait on null.
 */
export async function latestPublishedRecently(name: string, windowMs = 26 * 60 * 60 * 1000): Promise<boolean | null> {
  try {
    const doc = (await fetchJson(npmUrl(`${encodeURIComponent(name)}`))) as {
      'dist-tags'?: Record<string, string>
      time?: Record<string, string>
    }
    const latest = doc['dist-tags']?.latest
    const published = latest !== undefined ? doc.time?.[latest] : undefined
    if (published === undefined) return null
    const age = Date.now() - Date.parse(published)
    return Number.isFinite(age) ? age < windowMs : null
  } catch {
    return null
  }
}

/** The registry's current `latest` version for a package, or null when it can't be read. */
/**
 * The version a channel subscriber should be offered: the newest build in
 * the set that channel is willing to receive.
 *
 * A channel is a SET, not a tag. Someone on beta has not stopped accepting
 * releases — they accept releases and prereleases — so beta means
 * {latest, beta} and dev means {latest, beta, dev}. Reading it as one tag
 * gets a real case wrong: once 1.14.0 ships, `beta` still points at
 * 1.14.0-beta.1 until the next prerelease is cut, and following that tag
 * literally would walk a subscriber BACKWARDS onto a build their channel
 * has already moved past.
 *
 * The nesting is also what makes a channel leavable. Going backwards is
 * only ever offered when the user narrows the set — picking stable while a
 * prerelease is installed drops `beta` out of it, so the answer becomes
 * `latest` and the market can finally offer the way back. That case used to
 * be unreachable: comparing 1.13.1 against an installed 1.14.0-beta.1 found
 * nothing newer and answered "up to date", so the control the user had just
 * used appeared to do nothing.
 *
 * @param stable - the `latest` version, already fetched by the caller.
 */
export async function versionOnChannel(
  name: string,
  channel: Channel,
  stable: string | null,
): Promise<string | null> {
  let best = stable
  for (const tag of EXTRA_TAGS[channel]) {
    const candidate = await tagVersion(name, tag)
    if (candidate !== null && (best === null || isUpgrade(best, candidate))) best = candidate
  }
  return best
}

/** Tags a channel adds on top of `latest`, widest channel last. */
const EXTRA_TAGS: Record<Channel, string[]> = {
  stable: [],
  beta: [DIST_TAG.beta],
  dev: [DIST_TAG.beta, DIST_TAG.dev],
}

/** One dist-tag's version, or null when it isn't published or can't be read. */
async function tagVersion(name: string, tag: string): Promise<string | null> {
  try {
    const meta = (await fetchJson(npmUrl(`${encodeURIComponent(name)}/${tag}`))) as { version?: string }
    return typeof meta.version === 'string' ? meta.version : null
  } catch {
    // An unpublished tag is the ordinary case for a channel nobody has cut
    // a build on yet, and a registry hiccup must not take the whole update
    // check down with it.
    return null
  }
}

export async function fetchNpmLatest(name: string): Promise<string | null> {
  try {
    const meta = (await fetchJson(npmUrl(`${encodeURIComponent(name)}/latest`))) as { version?: string }
    return typeof meta.version === 'string' ? meta.version : null
  } catch {
    return null
  }
}

/** Per-plugin update checks; a failed check reports no update rather than failing the listing. */
export async function checkUpdates(
  profile: string,
  force = false,
  explicitDir?: string,
  /**
   * Packages that follow a release channel instead of plain `latest`. Only
   * ever the market itself: opting into early builds is volunteering to try
   * THIS plugin early, not a licence to pull every other author's
   * unreleased work.
   */
  channelFor: ReadonlyMap<string, Channel> = new Map(),
  /**
   * Curated npm sources for `file:` installs that were matched to the market
   * catalog. `link:` workspaces remain development sources and are never
   * opted into online updates.
   */
  onlineSourceFor: ReadonlyMap<string, string> = new Map(),
): Promise<Record<string, UpdateStatus>> {
  const activeProfileDir = profileDir(profile, explicitDir)
  // The channel is part of the key: switching to betas has to change the
  // answer immediately, and a cache keyed on the profile alone would serve
  // the stable verdict for the rest of the TTL — reading as "the setting did
  // nothing".
  const cacheKey = `${activeProfileDir}\u0000${[...channelFor].map(([n, c]) => `${n}:${c}`).sort().join(',')}\u0000${[...onlineSourceFor].map(([n, s]) => `${n}:${s}`).sort().join(',')}`
  if (!force && updatesCache?.key === cacheKey && Date.now() - updatesCache.at < UPDATES_TTL_MS) {
    return updatesCache.data
  }
  const installed = readInstalled(profile, activeProfileDir)
  const lockCommits = readLockCommits(profile, activeProfileDir)
  const result: Record<string, UpdateStatus> = {}
  await Promise.all(Object.entries(installed).map(async ([name, spec]) => {
    const version = readInstalledVersion(profile, name, activeProfileDir)
    const normalizedSpec = spec.toLowerCase()
    if (normalizedSpec.startsWith('file:')) {
      const onlineSource = onlineSourceFor.get(name)
      if (onlineSource !== undefined) {
        const latest = await fetchNpmLatest(onlineSource)
        const updateAvailable = isUpgrade(version, latest)
        result[name] = {
          kind: 'linked', version, current: version, latest, updateAvailable,
          ...(updateAvailable ? { restoreRequired: true } : {}),
        }
        return
      }
      result[name] = { kind: 'linked', version, current: null, latest: null, updateAvailable: false }
      return
    }
    if (normalizedSpec.startsWith('link:')) {
      result[name] = { kind: 'linked', version, current: null, latest: null, updateAvailable: false }
      return
    }
    // The repo behind the spec, in every supported spelling. Older regional
    // installs can carry a proxied codeload URL rather than a `github:`
    // shortcut, and asking only about the shortcut sent those through the npm
    // branch below — where a GitHub-only plugin
    // either 404s or, far worse, matches an unrelated package that happens
    // to share its name.
    const repo = repoOfTarget(spec)?.split('#')[0] ?? null
    try {
      if (repo !== null) {
        // A proxied legacy URL or exact `github:#sha` carries its pin in the
        // spec; a mutable `github:` shortcut keeps it in the lockfile. Prefer
        // the spec because it is authoritative even if the lockfile is stale.
        const current = githubCommitOfTarget(spec) ?? lockCommits.get(repo) ?? null
        // git's own ref advertisement, NOT api.github.com/repos/…/commits.
        // The REST API allows 60 requests an hour per IP unauthenticated,
        // shared across every plugin AND every check — a handful of
        // github-installed plugins exhausts it and the whole list silently
        // stops reporting updates (#349). The ref endpoint git itself uses
        // has no such quota; this is the same call `acceleratedTarget`
        // already makes to resolve a commit for the China region.
        // Ask about the ref the install actually names. Answering with the
        // default branch for a `#branch` install compares two lines that
        // never converge, so the row reported an update forever (#446).
        const latest = await headCommit(
          repo, routesFor(activeRegion()).githubProxy, undefined, githubRefOfTarget(spec) ?? undefined,
        )
        result[name] = {
          kind: 'github', version, current, latest,
          updateAvailable: current !== null && latest !== null && current !== latest,
        }
      } else {
        const meta = (await fetchJson(npmUrl(`${encodeURIComponent(name)}/latest`))) as { version?: string }
        const stable = typeof meta.version === 'string' ? meta.version : null
        const channel = channelFor.get(name)
        const latest = channel === undefined ? stable : await versionOnChannel(name, channel, stable)
        // Forwards is an update; a difference in the other direction is a
        // channel switch and is reported as one, under its own field.
        const upgrade = isUpgrade(version, latest)
        const sideways = channel !== undefined && !upgrade
          && version !== null && latest !== null && version !== latest
        result[name] = {
          kind: 'npm', version, current: version, latest,
          updateAvailable: upgrade,
          ...(sideways ? { channelSwitch: latest } : {}),
        }
      }
    } catch {
      result[name] = { kind: spec.startsWith('github:') ? 'github' : 'npm', version, current: null, latest: null, updateAvailable: false }
    }
  }))
  updatesCache = { key: cacheKey, at: Date.now(), data: result }
  return result
}
