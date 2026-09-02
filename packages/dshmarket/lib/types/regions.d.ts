/**
 * Download regions: which route the market's own network requests take.
 *
 * Almost every external request the market makes lands on npm's registry or
 * on GitHub — the plugin catalog, update checks, package downloads, plugin
 * tarballs, author avatars, README screenshots. From mainland China all of
 * those are slow at once, which is why this is ONE setting rather than a
 * row of them: "npm mirror", "GitHub proxy" and "image proxy" are three
 * spellings of a single question the user is actually being asked, which is
 * where they are.
 *
 * The routing table is the single source of truth. Every consumer asks it
 * rather than reaching for a hardcoded host, so adding a region is a table
 * entry instead of a search across six modules.
 *
 * Each route has an environment escape hatch, following `DSHM_REGISTRY_URL`
 * (src/registry.ts). The China route leans on a free public proxy for the
 * GitHub half; those come and go, and a user whose proxy has died needs a
 * way out that is not "wait for the next release".
 */
/** A region the market can download from. */
export type Region = 'global' | 'china';
/** Every region a user may pick. */
export declare const REGIONS: readonly Region[];
/** Narrow an untrusted value to a Region, or null. */
export declare function asRegion(value: unknown): Region | null;
/**
 * The npm registry the market and pnpm read, no trailing slash.
 *
 * Exported because callers need to tell "this region uses the default" from
 * "this region names a mirror" — the difference between leaving a spawned
 * pnpm's registry alone and setting it.
 */
export declare const DEFAULT_NPM_REGISTRY = "https://registry.npmjs.org";
/**
 * One place the catalog can be read from.
 *
 * Two kinds because the two routes are genuinely different transports, not
 * two URLs. The npm route reads a published package — which is what lets the
 * catalog ride the same mirror as everything else, and gives it a version
 * number that can be rolled back when a bad build ships.
 */
export type CatalogSource = {
    kind: 'url';
    url: string;
} | {
    kind: 'npm';
    registry: string;
    pkg: string;
};
/** Where one region sends each kind of request. `null` means "go direct". */
export interface RegionRoutes {
    /** npm registry base, no trailing slash. */
    npmRegistry: string;
    /** Prefix proxy for github.com-family URLs, or null to go direct. */
    githubProxy: string | null;
    /**
     * Where to look for the catalog, in order. Later entries are fallbacks.
     *
     * The catalog is the FIRST request the market makes, so a mirror that has
     * gone down must mean a slow market rather than an empty one — every
     * region ends its list at an address that has always worked.
     */
    catalog: CatalogSource[];
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
export declare function routesFor(region: Region, env?: NodeJS.ProcessEnv): RegionRoutes;
/** The region in force. */
export declare function activeRegion(): Region;
/** Set the region in force. Callers are responsible for their own caches. */
export declare function setActiveRegion(region: Region): void;
/**
 * Wrap a github.com-family URL in a prefix proxy.
 *
 * The proxy takes the full absolute URL as its path (`{proxy}/{url}`) rather
 * than a rewritten hostname, which is what lets one prefix serve api,
 * codeload, raw and the web host without a mapping table per service.
 *
 * @param proxy - the prefix, or null to go direct.
 * @param url - an absolute https URL on a github.com-family host.
 * @returns the proxied URL, or `url` unchanged when there is no proxy.
 */
export declare function throughProxy(proxy: string | null, url: string): string;
