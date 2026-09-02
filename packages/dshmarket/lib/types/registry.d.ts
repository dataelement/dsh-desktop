/**
 * Registry access: the curated list from awesome-dsh-plugin.com, fetched
 * fresh on every request. See `loadRegistry` for why there is nothing
 * behind it any more.
 */
import { type Region } from './regions.ts';
export interface RegistryPlugin {
    name: string;
    owner: string;
    url: string;
    /** One legacy category id or several category ids. */
    category: string | string[];
    description: Record<string, string>;
    npm?: string | null;
    tarball?: string | null;
    stars?: number | null;
    /**
     * npm downloads in the last 30 days, when the entry has a published
     * package. `null`/absent means "no npm package" — a coverage gap, not a
     * zero — so sorting must not read it as "less popular than 0".
     */
    downloads?: number | null;
    install: string;
    added: string;
    /**
     * Catalog-side deprecation flags (#60): supplied by awesome-dsh-plugin,
     * absent for every normal entry — the market only consumes them, so a
     * catalog without the fields behaves exactly as before.
     */
    deprecated?: boolean;
    /** Catalog name of the suggested replacement plugin, when deprecated. */
    replacement?: string;
}
/**
 * Category ids for one catalog entry, de-duplicated in declaration order.
 *
 * Catalog JSON is an external input, so malformed array members are omitted
 * here and an entry with no usable category is rejected by `asRegistry`.
 */
export declare function pluginCategories(plugin: Pick<RegistryPlugin, 'category'>): string[];
export interface Registry {
    updated: string;
    count: number;
    categories: Record<string, Record<string, string>>;
    plugins: RegistryPlugin[];
}
/**
 * Drop what we remember, so the next call is unconditional.
 *
 * Exists for tests: the memo is module state, and a spec that asserted a
 * 304 would otherwise leak a validator into the next one.
 */
export declare function forgetCatalog(): void;
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
export declare function loadRegistry(region?: Region): Promise<Registry>;
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
export declare function describeFetchFailure(error: unknown, elapsedMs: number, attempts?: number): string;
