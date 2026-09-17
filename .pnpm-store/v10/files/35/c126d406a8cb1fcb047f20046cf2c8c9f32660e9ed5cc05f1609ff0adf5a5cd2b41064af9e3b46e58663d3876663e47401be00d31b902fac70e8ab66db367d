/**
 * Resolving a GitHub install through a region's proxy without proxying the
 * tarball pnpm records.
 *
 * pnpm does not fetch `github:owner/repo` with `git clone`; it resolves the
 * shortcut and downloads a tarball from codeload.github.com. That rules out
 * the usual `git config insteadOf` trick — there is no git command to
 * redirect.
 *
 * Prefix-proxying that tarball used to save substantial time, but pnpm 11's
 * fail-closed lockfile checks changed the safety boundary. A URL shaped like
 * `https://proxy/https://codeload.github.com/.../<commit>` no longer has the
 * codeload hostname, so pnpm treats it as an ordinary remote tarball and
 * requires an integrity hash that its GitHub resolver does not write. The
 * result is ERR_PNPM_MISSING_TARBALL_INTEGRITY on the install itself (#385).
 * Disabling that check or minting a checksum from whatever the proxy served
 * would weaken pnpm's supply-chain protection, so neither is acceptable.
 *
 * The safe middle ground is to resolve HEAD through the regional proxy, then
 * hand pnpm a commit-pinned `github:owner/repo#<sha>` target. The ref lookup
 * still avoids a slow or unreachable GitHub metadata request; pnpm itself
 * fetches the canonical codeload URL, records it as `gitHosted: true`, and
 * keeps its integrity policy intact.
 *
 * - **The commit has to be pinned.** The profile reads each plugin's
 *   installed commit back out of the lockfile by matching a codeload URL
 *   ending in a 40-character SHA (src/profile.ts). A `HEAD` tarball installs
 *   perfectly and then reports no version forever. So this resolves the SHA
 *   first, and a rewrite that cannot get one does not happen.
 * - **Build-script approval has to keep matching.** `gitAllowBuildsKey`
 *   (src/sources.ts) derives its stable key from the repo, and the pinned
 *   GitHub form preserves that identity.
 *
 * Catalog subpath entries are left alone: `#path:` identifies a different
 * package inside the repo, so the acceleration step never rewrites that
 * fragment. Collection roots discovered after install preserve the resolved
 * commit and add their subpath as pnpm's second `&path:` selector.
 *
 * Every SHA-lookup failure falls back to the original target. Acceleration
 * is an optimisation, and an optimisation that can fail an install is a bug.
 */

import { logEvent } from './log.ts'
import { marketFetch } from './net.ts'
import {
  githubRoutesFor, rememberGithubRoute, routesFor, throughProxy, type GithubRoute, type Region,
} from './regions.ts'

/** A bare repo shortcut whose HEAD can be replaced by one immutable ref. */
const BARE_GITHUB_RE = /^github:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/

/**
 * How long to wait for the SHA before giving up and installing directly.
 *
 * Short on purpose: this is spent BEFORE the download starts, and the whole
 * point is to avoid a slow or unreachable direct metadata lookup. A proxy
 * that cannot answer promptly should not delay pnpm's ordinary direct path.
 */
const RESOLVE_TIMEOUT_MS = 6000

/**
 * The commit `HEAD` points at, from git's own ref advertisement.
 *
 * This is the endpoint `git clone` reads before it fetches anything, and it
 * is the right one here for two measured reasons. It is not the REST API, so
 * it does not consume the 60-requests-per-hour unauthenticated quota that a
 * user installing a handful of plugins could plausibly exhaust. And it
 * survives the proxy: over five consecutive tries from an unproxied mainland
 * connection it answered 200 in ~1.2s every time, while the REST API through
 * the same proxy returned 200, 200, then 403 — a proxy that rate-limits the
 * API path would silently drop every install back to the slow route.
 *
 * The response is git's pkt-line format, whose first ref line carries
 * `<sha> HEAD\0<capabilities>`. Read with a pattern rather than a parser:
 * one 40-character hex string followed by `HEAD` is unambiguous in this
 * payload, and a length-prefix reader would be more code to get wrong.
 *
 * The same advertisement lists every branch and tag, which is what `ref`
 * uses. A plugin installed from `github:owner/repo#publish` is not asking
 * about the default branch at all, and answering with it made the market
 * report an update forever (#446) — the two SHAs simply never match. Both
 * namespaces are searched because pnpm accepts a tag there too, branches
 * first since that is what the reports are about.
 * @param ref - branch or tag to resolve, or undefined for the default branch.
 */
export async function headCommit(
  repo: string,
  proxy: string | null,
  signal?: AbortSignal,
  ref?: string,
): Promise<string | null> {
  const result = await tryHeadCommit(repo, proxy, signal, ref)
  return result.kind === 'valid' ? result.sha : null
}

type HeadAttempt =
  | { kind: 'valid'; sha: string | null }
  | { kind: 'failed' }

/** One route attempt, preserving valid "ref is absent" from invalid payloads. */
async function tryHeadCommit(
  repo: string,
  proxy: GithubRoute,
  signal?: AbortSignal,
  ref?: string,
): Promise<HeadAttempt> {
  const base = `https://github.com/${repo}/info/refs?service=git-upload-pack`
  try {
    const res = await marketFetch(throughProxy(proxy, base), {
      signal,
      headers: { 'user-agent': 'git/2.40.0' },
    })
    if (!res.ok) return { kind: 'failed' }
    const body = await res.text()
    const contentType = (res as Response & { headers?: { get?(name: string): string | null } })
      .headers?.get?.('content-type')?.toLowerCase() ?? ''
    // Public mirrors often answer a failed upstream request with their own
    // branded HTML and status 200. A git advertisement has both its service
    // prelude and at least one advertised ref; accepting anything else would
    // cache a route that never returned Git data in the first place.
    if (contentType.includes('text/html')
      || !body.includes('# service=git-upload-pack')
      || !/[0-9a-f]{40} (?:HEAD|refs\/(?:heads|tags)\/)/u.test(body)) {
      return { kind: 'failed' }
    }
    if (ref === undefined) {
      const found = /([0-9a-f]{40}) HEAD/.exec(body)
      return { kind: 'valid', sha: found === null ? null : found[1]! }
    }
    // Anchored to the ref's full name so `publish` cannot match a branch
    // called `publish-old`, and escaped because a ref may contain regex
    // metacharacters (`.` is legal in a branch name).
    const quoted = ref.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)
    for (const namespace of ['heads', 'tags']) {
      const found = new RegExp(String.raw`([0-9a-f]{40}) refs/${namespace}/${quoted}(?![^\s])`, 'u').exec(body)
      if (found !== null) return { kind: 'valid', sha: found[1]! }
    }
    // The advertisement is authoritative for this repository. Asking another
    // mirror cannot make a branch that is absent here appear.
    return { kind: 'valid', sha: null }
  } catch {
    return { kind: 'failed' }
  }
}

/** Run one candidate under its own budget, optionally linked to a caller signal. */
async function timedHeadCommit(
  repo: string,
  route: GithubRoute,
  ref?: string,
  signal?: AbortSignal,
): Promise<HeadAttempt> {
  const controller = new AbortController()
  const abort = (): void => { controller.abort() }
  if (signal?.aborted === true) controller.abort()
  else signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, RESOLVE_TIMEOUT_MS)
  try {
    return await tryHeadCommit(repo, route, controller.signal, ref)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

/**
 * The current `HEAD` commit for a repo, on whichever route the region uses.
 *
 * Wraps the timeout so callers outside the install path — the build-script
 * approval below, which needs a commit-pinned key — do not each reinvent it.
 */
export async function resolveHeadCommit(
  repo: string,
  region: Region,
  env: NodeJS.ProcessEnv = process.env,
  ref?: string,
): Promise<string | null> {
  for (const route of githubRoutesFor('git', region, env)) {
    const result = await timedHeadCommit(repo, route, ref)
    if (result.kind === 'failed') continue
    rememberGithubRoute('git', route)
    return result.sha
  }
  return null
}

/**
 * The install target to actually hand pnpm, given the region in force.
 *
 * @param target - what `installTargetFor` produced.
 * @param region - the download region.
 * @param env - environment, for the proxy override.
 * @returns a commit-pinned GitHub shortcut when one route resolves HEAD,
 *   otherwise `target` unchanged.
 */
export async function acceleratedTarget(
  target: string,
  region: Region,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  // A plain global install lets pnpm do its ordinary GitHub resolution. A
  // custom prefix makes even that region an accelerated one.
  if (routesFor(region, env).githubProxy === null) return target
  const bare = BARE_GITHUB_RE.exec(target)
  if (bare === null) return target
  const repo = bare[1]!
  const sha = await resolveHeadCommit(repo, region, env)
  if (sha === null) {
    logEvent('info', 'region', `${repo}: could not resolve a commit through the available routes; installing directly`)
    return target
  }
  return `github:${repo}#${sha}`
}
