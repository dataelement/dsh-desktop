/**
 * Registry access: the curated list from awesome-dsh-plugin.com, fetched
 * fresh on every request. See `loadRegistry` for why there is nothing
 * behind it any more.
 */
import { configuredProxy, marketFetch } from "./net.js";
import { catalogFromPackage } from "./catalog-npm.js";
import { activeRegion, routesFor } from "./regions.js";
/**
 * Category ids for one catalog entry, de-duplicated in declaration order.
 *
 * Catalog JSON is an external input, so malformed array members are omitted
 * here and an entry with no usable category is rejected by `asRegistry`.
 */
export function pluginCategories(plugin) {
    const values = Array.isArray(plugin.category) ? plugin.category : [plugin.category];
    const categories = [];
    const seen = new Set();
    for (const value of values) {
        if (typeof value !== 'string' || value === '' || seen.has(value))
            continue;
        seen.add(value);
        categories.push(value);
    }
    return categories;
}
/**
 * Where the curated list comes from now lives in the region routing table
 * (src/regions.ts), because it is one of several addresses that move
 * together when a user changes download region.
 *
 * `DSHM_REGISTRY_URL` keeps its meaning there, unchanged: overridable
 * through the process environment ONLY — the layer-3 e2e points it at a
 * local fixture catalog so the install route can be driven end to end
 * without publishing anything.
 *
 * This does not weaken the install route's registry check. That check exists
 * to stop a malicious PAGE from POSTing an arbitrary source at the local
 * server; a page cannot set environment variables, and anyone who can set
 * this process's environment already controls the process. What the override
 * changes is WHICH list is curated, never WHETHER the check runs.
 */
/**
 * How long to wait for the catalog.
 *
 * Generous on purpose. It used to be 4s with a bundled snapshot behind it,
 * so a slow link quietly became a 39%-smaller catalog. Now that a failure is
 * reported rather than papered over, cutting off a link that WOULD have
 * answered is the expensive mistake — 282KB over TLS from a far-away network
 * is not a 4-second job.
 */
const FETCH_TIMEOUT_MS = 15_000;
/**
 * The catalog we were last served, with the validator identifying it.
 *
 * This is NOT the cache that was removed, and the difference is the whole
 * point. That cache SKIPPED the request for an hour and answered from
 * memory — it asserted freshness without ever asking. This asks the origin
 * every single time; the validator only lets the origin answer "still the
 * same" (304) instead of resending a megabyte. Freshness is verified on
 * every call either way, so `data` below is only ever returned when the
 * server has just confirmed it is current.
 *
 * In memory rather than on disk: a restart is rare enough that paying one
 * full download for it costs nothing, and a file would be one more thing
 * that can be found on a machine and mistaken for the catalog itself.
 *
 * Measured against the live origin (GitHub Pages behind Fastly, which
 * serves both `etag` and `last-modified`): 295 KB and 1.3s unconditional,
 * 0 bytes and 0.5s for a 304. The reporter whose fetch took 9.9s was
 * downloading the full 1.07 MB every time they opened the market.
 */
let served = null;
/** Identity of a catalog source, for scoping the validator to its origin. */
function sourceKey(source) {
    return source.kind === 'npm' ? `npm:${source.registry}/${source.pkg}` : `url:${source.url}`;
}
/** A parsed catalog, or a thrown explanation of why it is not one. */
function asRegistry(value) {
    const data = value;
    if (!Array.isArray(data.plugins) || data.plugins.length === 0)
        throw new Error('the catalog came back empty');
    const plugins = data.plugins.map((plugin, index) => {
        const category = pluginCategories(plugin);
        if (category.length === 0)
            throw new Error(`catalog plugin ${String(index)} carries no usable category`);
        return { ...plugin, category };
    });
    return { ...data, plugins };
}
/**
 * Drop what we remember, so the next call is unconditional.
 *
 * Exists for tests: the memo is module state, and a spec that asserted a
 * 304 would otherwise leak a validator into the next one.
 */
export function forgetCatalog() {
    served = null;
}
/**
 * The catalog, revalidated every time it is asked for.
 *
 * There used to be three answers here — live, a one-hour in-memory cache,
 * and a snapshot bundled into the npm package — and only the first was
 * correct. The other two were indistinguishable from it on screen, so a
 * machine that could not reach the registry browsed the publish-time file
 * (839 entries against 1367 live, and frozen forever for anyone on an older
 * release), while a machine that COULD reach it still saw an hour-old
 * listing of a catalog that grows by ~250 entries a day.
 *
 * For a catalog, stale is not a degraded answer, it is a wrong one: a plugin
 * published this morning reads as "does not exist". So there is one source
 * now, and a failure is a failure — the caller reports it and offers a
 * retry, which is a state the user can act on. In particular a network
 * failure is NEVER answered from `served`: an origin that cannot be reached
 * has not confirmed anything, and quietly handing back the last catalog
 * would rebuild exactly the fallback this replaced.
 * @throws when the catalog cannot be fetched or does not look like one.
 */
export async function loadRegistry(region = activeRegion()) {
    const started = Date.now();
    let last;
    let attempts = 0;
    // Sources in order, each a fallback for the one before it. The catalog is
    // the FIRST request the market makes, so a mirror that has gone down must
    // mean a slow market rather than an empty one — the list ends at the
    // address that has always worked.
    for (const source of routesFor(region).catalog) {
        const key = sourceKey(source);
        // Two attempts each. A catalog fetch crossing a long, lossy path fails
        // transiently often enough that one retry is worth more than the second
        // or two it costs — and with nothing behind this call any more, a
        // transient failure is a market with no plugins in it.
        for (let attempt = 0; attempt < 2; attempt++) {
            attempts += 1;
            try {
                // A validator only ever goes back to the source that issued it.
                // Carried across a region switch it could earn a "not modified" from
                // an origin whose body we have never seen.
                const reusable = served?.key === key ? served : null;
                if (source.kind === 'npm') {
                    const { version, data } = await catalogFromPackage(source.registry, source.pkg, reusable?.version ?? undefined);
                    // `data === null` means the published version is the one in hand.
                    if (data === null && reusable !== null)
                        return reusable.data;
                    if (data === null)
                        throw new Error('the catalog package reported no change with nothing to reuse');
                    const parsed = asRegistry(data);
                    served = { key, etag: null, modified: null, version, data: parsed };
                    return parsed;
                }
                // ETag first: it is exact, while a date has one-second resolution and
                // a catalog republished twice within the same second would validate
                // as unchanged. Only one is sent — an origin given both must satisfy
                // both, which turns a weak ETag match into an unnecessary 200.
                const headers = {};
                if (reusable?.etag != null)
                    headers['if-none-match'] = reusable.etag;
                else if (reusable?.modified != null)
                    headers['if-modified-since'] = reusable.modified;
                const res = await marketFetch(source.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers });
                if (res.status === 304) {
                    // Only reachable when we sent a validator, so `reusable` is present.
                    // Guarded anyway: answering a 304 with nothing to reuse would
                    // otherwise surface as a confusing parse error on an empty body.
                    if (reusable === null)
                        throw new Error('the catalog answered "not modified" with nothing to revalidate');
                    return reusable.data;
                }
                if (!res.ok)
                    throw new Error(`HTTP ${String(res.status)}`);
                const data = asRegistry(await res.json());
                served = {
                    key, etag: res.headers.get('etag'), modified: res.headers.get('last-modified'), version: null, data,
                };
                return data;
            }
            catch (error) {
                last = error;
            }
        }
    }
    throw new Error(describeFetchFailure(last, Date.now() - started, attempts));
}
/**
 * A catalog failure with the facts needed to classify it, in the message
 * itself.
 *
 * The market shows this string and the log export carries it, so it is the
 * whole of what a bug report will contain. "The operation was aborted due to
 * timeout" alone cannot distinguish a slow link from a blocked one from a
 * proxy this process cannot use — and Node's `fetch` ignores HTTP_PROXY
 * entirely (measured on Node 25), so a machine whose only route out is a
 * proxy fails here every time while every other tool on it works.
 */
export function describeFetchFailure(error, elapsedMs, attempts = 2) {
    const reason = error instanceof Error ? error.message : String(error);
    const proxy = configuredProxy();
    const parts = [`${reason} (${String(Math.round(elapsedMs / 1000))}s, ${String(attempts)} attempts)`];
    if (proxy !== null) {
        parts.push(`tried through the configured proxy ${proxy.replace(/\/\/[^@]*@/u, '//***@')}`);
    }
    return parts.join(' · ');
}
