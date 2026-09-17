/**
 * Download regions: which route the market's own network requests take.
 *
 * Almost every external request the market makes lands on npm's registry or
 * on GitHub — the plugin catalog, update checks, package downloads, author
 * avatars, README screenshots. From mainland China several of those can be
 * slow, which is why this is ONE setting rather than a
 * row of them: "npm mirror", "GitHub proxy" and "image proxy" are three
 * spellings of a single question the user is actually being asked, which is
 * where they are.
 *
 * The routing table is the single source of truth. Every consumer asks it
 * rather than reaching for a hardcoded host, so adding a region is a table
 * entry instead of a search across six modules.
 *
 * Each route has an environment escape hatch, following `DSHM_REGISTRY_URL`
 * (src/registry.ts). The China route has service-specific public-proxy
 * fallbacks; those come and go, and a user whose routes have died needs a way
 * out that is not "wait for the next release".
 */

/** A region the market can download from. */
export type Region = 'global' | 'china'

/** Every region a user may pick. */
export const REGIONS: readonly Region[] = ['global', 'china']

/** Narrow an untrusted value to a Region, or null. */
export function asRegion(value: unknown): Region | null {
  return value === 'global' || value === 'china' ? value : null
}

/**
 * The npm registry the market and pnpm read, no trailing slash.
 *
 * Exported because callers need to tell "this region uses the default" from
 * "this region names a mirror" — the difference between leaving a spawned
 * pnpm's registry alone and setting it.
 */
export const DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org'
const NPM_CHINA = 'https://mirrors.cloud.tencent.com/npm'

/**
 * First public prefix used for unauthenticated GitHub reads, no trailing slash.
 * Authenticated API calls and canonical codeload tarballs never use it.
 *
 * What this proxy accepts is a list of GitHub SERVICES, not a hostname test.
 * The previous note here said it "refuses anything that is not a github.com
 * hostname", which #460 by @Homplex measured as wrong in both directions —
 * re-measured 2026-09-01:
 *
 *   https://raw.githubusercontent.com/…   200   ← not a github.com hostname
 *   https://github.com/owner/repo         403   ← is one
 *   https://example.com/                  403
 *
 * So a plain repository page is refused while raw content is served. Do not
 * reason about this proxy from the hostname; check the specific service, and
 * re-measure rather than infer, because the policy is the operator's and can
 * change under us. That fragility is the substance of #460's actual request
 * (a mirror list and a visible setting), which is tracked separately.
 */
const GITHUB_PROXY_CHINA = 'https://gh-proxy.com'
const GITHUB_PROXY_CHINA_FALLBACK = 'https://ghfast.top'

/** GitHub transports that fail independently on filtered networks. */
export type GithubService = 'git' | 'raw' | 'avatar'

/** A prefix proxy, or null for the canonical GitHub address. */
export type GithubRoute = string | null

/** Ordered candidates per GitHub service. */
export type GithubRoutes = Record<GithubService, GithubRoute[]>

/**
 * The catalog's stable public address.
 *
 * A custom domain rather than the repository path, deliberately: it survives
 * the repo being renamed or moved, and Pages puts a CDN in front of it.
 */
const CATALOG_OFFICIAL = 'https://awesome-dsh-plugin.com/plugins.json'

/**
 * One place the catalog can be read from.
 *
 * Two kinds because the two routes are genuinely different transports, not
 * two URLs. The npm route reads a published package — which is what lets the
 * catalog ride the same mirror as everything else, and gives it a version
 * number that can be rolled back when a bad build ships.
 */
export type CatalogSource =
  | { kind: 'url'; url: string }
  | { kind: 'npm'; registry: string; pkg: string }

/** Where one region sends each kind of request. `null` means "go direct". */
export interface RegionRoutes {
  /** npm registry base, no trailing slash. */
  npmRegistry: string
  /** Prefix proxy for github.com-family URLs, or null to go direct. */
  githubProxy: string | null
  /** Ordered routes per service; every list ends in a direct escape path. */
  githubRoutes: GithubRoutes
  /**
   * Where to look for the catalog, in order. Later entries are fallbacks.
   *
   * The catalog is the FIRST request the market makes, so a mirror that has
   * gone down must mean a slow market rather than an empty one — every
   * region ends its list at an address that has always worked.
   */
  catalog: CatalogSource[]
}

/**
 * The npm package carrying `plugins.json`.
 *
 * A package rather than a file URL, because the catalog's own host is the
 * problem being solved: it is served from GitHub Pages, and the public
 * GitHub proxies refuse hostnames that are not github.com's own. Published
 * to npm, it reaches mainland China through the same mirror as every plugin
 * — no extra service to depend on, and nothing new that can go down.
 *
 * Its own package rather than a file added to `awesome-dsh-plugin`: npm
 * force-includes README files whatever the `files` field says, and that
 * package's two generated READMEs come to ~1MB. Attaching the catalog to it
 * would have spent on the wire exactly what this exists to save (measured:
 * 772KB attached, 413KB standing alone — the latter matching the gzipped
 * origin almost exactly).
 */
const CATALOG_PACKAGE = 'dsh-plugin-catalog'

const ROUTES: Record<Region, RegionRoutes> = {
  global: {
    npmRegistry: DEFAULT_NPM_REGISTRY,
    githubProxy: null,
    githubRoutes: { git: [null], raw: [null], avatar: [null] },
    catalog: [{ kind: 'url', url: CATALOG_OFFICIAL }],
  },
  china: {
    npmRegistry: NPM_CHINA,
    githubProxy: GITHUB_PROXY_CHINA,
    // Filtering is service-shaped, not GitHub-shaped. Raw content commonly
    // needs help while git advertisements and avatars remain reachable, so
    // putting one global order on all three only trades one outage for
    // needless proxy traffic on the paths that still work.
    githubRoutes: {
      raw: [GITHUB_PROXY_CHINA, GITHUB_PROXY_CHINA_FALLBACK, null],
      git: [null, GITHUB_PROXY_CHINA, GITHUB_PROXY_CHINA_FALLBACK],
      avatar: [null, GITHUB_PROXY_CHINA, GITHUB_PROXY_CHINA_FALLBACK],
    },
    // The package, then the origin. There is deliberately no
    // raw.githubusercontent step between them: `plugins.json` is a build
    // artifact that the site publishes to Pages and never commits, so that
    // path is a guaranteed 404 and would only spend two attempts proving it.
    catalog: [
      { kind: 'npm', registry: NPM_CHINA, pkg: CATALOG_PACKAGE },
      { kind: 'url', url: CATALOG_OFFICIAL },
    ],
  },
}

/** Read an environment override, treating blank as unset. */
function override(env: NodeJS.ProcessEnv, name: string): string | null {
  const raw = env[name]
  return raw !== undefined && raw.trim() !== '' ? raw.trim().replace(/\/+$/, '') : null
}

/**
 * Normalize a user-maintained prefix, or reject it.
 *
 * Public mirrors receive the complete destination URL in their path. Only
 * HTTPS prefixes without embedded credentials or query fragments are safe to
 * persist and show again in the settings UI.
 */
export function normalizeGithubProxy(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (raw === '' || raw.includes('\\')) return null
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '') return null
    if (parsed.search !== '' || parsed.hash !== '') return null
    const path = parsed.pathname.replace(/\/+$/u, '')
    return `${parsed.origin}${path}`
  } catch {
    return null
  }
}

let customGithubProxy: string | null = null
const preferredGithubRoutes = new Map<GithubService, GithubRoute>()

/** Apply (or clear) the persisted UI escape route. */
export function setCustomGithubProxy(proxy: string | null): void {
  const next = proxy === null ? null : normalizeGithubProxy(proxy)
  if (next === customGithubProxy) return
  customGithubProxy = next
  resetGithubRoutePreferences()
}

/** Whether the operator-owned environment variable disables UI changes. */
export function githubProxyManaged(env: NodeJS.ProcessEnv = process.env): boolean {
  return override(env, 'DSHM_GITHUB_PROXY') !== null
}

/** Remember one verified route without changing other GitHub services. */
export function rememberGithubRoute(service: GithubService, route: GithubRoute): void {
  preferredGithubRoutes.set(service, route)
}

/** Forget learned winners after the configured candidates change. */
export function resetGithubRoutePreferences(): void {
  preferredGithubRoutes.clear()
}

/**
 * The routes for a region, with environment overrides applied.
 *
 * Overrides win over the table because they are the user's statement about
 * their own network, and they are the way out when a public proxy dies.
 *
 * `DSHM_REGISTRY_URL` keeps its existing meaning — the catalog URL — and
 * when set it REPLACES the source list rather than heading it: someone
 * pointing the market at their own catalog does not want it quietly
 * reverting to ours.
 */
export function routesFor(region: Region, env: NodeJS.ProcessEnv = process.env): RegionRoutes {
  const base = ROUTES[region]
  const npmMirror = override(env, 'DSHM_NPM_MIRROR')
  const githubProxy = override(env, 'DSHM_GITHUB_PROXY') ?? customGithubProxy
  const catalog = override(env, 'DSHM_REGISTRY_URL')
  const registry = npmMirror ?? base.npmRegistry
  const githubRoutes: GithubRoutes = githubProxy === null
    ? {
        git: [...base.githubRoutes.git],
        raw: [...base.githubRoutes.raw],
        avatar: [...base.githubRoutes.avatar],
      }
    : { git: [githubProxy, null], raw: [githubProxy, null], avatar: [githubProxy, null] }
  return {
    npmRegistry: registry,
    githubProxy: githubProxy ?? base.githubProxy,
    githubRoutes,
    // A named catalog REPLACES the list rather than joining it. Someone
    // pointing the market at their own catalog does not want it quietly
    // reverting to ours when theirs is briefly unreachable — that is how a
    // fixture-backed test ends up asserting against the live registry.
    catalog: catalog !== null
      ? [{ kind: 'url', url: catalog }]
      // Rebuilt against the resolved registry, so an npm override moves the
      // catalog to the same mirror it moved everything else to.
      : base.catalog.map(source => (source.kind === 'npm' ? { ...source, registry } : source)),
  }
}

/** Ordered candidates with this process's last verified winner first. */
export function githubRoutesFor(
  service: GithubService,
  region: Region = activeRegion(),
  env: NodeJS.ProcessEnv = process.env,
): GithubRoute[] {
  const routes = routesFor(region, env).githubRoutes[service]
  if (!preferredGithubRoutes.has(service)) return routes
  const preferred = preferredGithubRoutes.get(service)!
  const index = routes.findIndex(route => route === preferred)
  if (index <= 0) return routes
  return [routes[index]!, ...routes.slice(0, index), ...routes.slice(index + 1)]
}

/**
 * The region this process is running under.
 *
 * One piece of module state rather than a parameter threaded through the
 * catalog, the theme manager, update checks and every pnpm spawn: the region
 * is a property of the running market, not of any single question asked of
 * it, and the call graphs that need it are several frames deep.
 *
 * Consumers that must react to a CHANGE (dropping a cache gathered from the
 * other registry) keep their own setter beside this one; this holds the
 * answer for everyone who only needs to read it.
 */
let active: Region = 'global'

/** The region in force. */
export function activeRegion(): Region {
  return active
}

/** Set the region in force. Callers are responsible for their own caches. */
export function setActiveRegion(region: Region): void {
  active = region
}

/**
 * Wrap a github.com-family URL in a prefix proxy.
 *
 * The proxy takes the full absolute URL as its path (`{proxy}/{url}`) rather
 * than a rewritten hostname, so the same joining rule works for every
 * GitHub service a caller has explicitly allowed through public routes.
 *
 * @param proxy - the prefix, or null to go direct.
 * @param url - an absolute https URL on a github.com-family host.
 * @returns the proxied URL, or `url` unchanged when there is no proxy.
 */
export function throughProxy(proxy: string | null, url: string): string {
  return proxy === null ? url : `${proxy}/${url}`
}
