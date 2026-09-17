/**
 * Service Definition for the web access capability seam (`ctx.web`): registries and provider-selecting execution for search and
 * fetch. Duplicate ids are rejected. At execution time, a configured provider must exist and
 * be usable; without one, exactly one usable provider is required, so selection never depends
 * on registration order.
 * @module @deepseek-ai/dsh-web
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { WebFetchProvider, WebFetchRequest, WebFetchResult, WebSearchProvider, WebSearchRequest, WebSearchResult } from './types.ts';
export { WebError, } from './types.ts';
export type { WebFetchBody, WebFetchProvider, WebFetchRequest, WebFetchResult, WebSearchProvider, WebSearchRequest, WebSearchResult, WebSearchSource, } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        web: WebRuntime;
    }
}
/**
 * Config for the web seam. `searchProvider` / `fetchProvider` pin which provider
 * wins for each capability; both are optional (a single registered usable
 * provider auto-selects). Operational overrides such as environment variables
 * must feed these same fields rather than introduce a hidden priority chain.
 */
export interface WebRuntimeConfig {
    /** Explicit search provider id. Omitted = auto-select when exactly one usable. */
    readonly searchProvider?: string;
    /** Explicit fetch provider id. Omitted = auto-select when exactly one usable. */
    readonly fetchProvider?: string;
}
/**
 * The web access service. Registered as `ctx.web` (one instance per context).
 *
 * Selection semantics (resolved at execution time, never order-dependent):
 * - A configured id that is registered and `available()` → that provider.
 * - A configured id not registered → `WEB_PROVIDER_CONFIGURED_MISSING`.
 * - A configured id registered but unavailable →
 *   `WEB_PROVIDER_CONFIGURED_UNAVAILABLE`.
 * - No id configured, exactly one registered usable provider → that provider.
 * - No id configured, multiple usable providers → `WEB_PROVIDER_AMBIGUOUS`.
 * - No id configured, no usable provider → `WEB_PROVIDER_UNAVAILABLE`.
 */
export declare class WebRuntime extends Service {
    /**
     * Provider selection config. Operational env overrides feed the SAME fields:
     * `$DSH_WEB_SEARCH_PROVIDER` / `$DSH_WEB_FETCH_PROVIDER` are equivalent to
     * `searchProvider` / `fetchProvider` and are NOT a hidden priority chain.
     */
    static Config: z<WebRuntimeConfig>;
    private searchProviders;
    private fetchProviders;
    private readonly searchProviderId;
    private readonly fetchProviderId;
    constructor(ctx: Context, config?: WebRuntimeConfig);
    /**
     * Register a search provider. Throws {@link WebError} `WEB_DUPLICATE_PROVIDER`
     * if its id is already registered for search. Returns a disposer; disposed
     * with the calling fiber.
     * @param provider - the provider; its `id` is the registry key.
     * @returns the disposer that unregisters the provider.
     */
    registerSearchProvider(provider: WebSearchProvider): () => void;
    /**
     * Register a fetch provider. Throws {@link WebError} `WEB_DUPLICATE_PROVIDER`
     * if its id is already registered for fetch. Returns a disposer; disposed
     * with the calling fiber.
     * @param provider - the provider; its `id` is the registry key.
     * @returns the disposer that unregisters the provider.
     */
    registerFetchProvider(provider: WebFetchProvider): () => void;
    private registerProvider;
    /**
     * Run one search through the selected provider. Resolves the provider at call
     * time with the selection rules above; throws {@link WebError} when the
     * capability cannot run. The seam enforces `request.maxResults` on the result:
     * if the provider over-returns, `sources[]` is truncated and `truncated` set.
     * @param request - the query and optional result limit.
     * @param signal - optional cancellation signal forwarded to the provider.
     * @returns the provider's results, capped to `request.maxResults`.
     */
    search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult>;
    /**
     * Retrieve one URL through the selected provider. Resolves the provider at
     * call time with the selection rules above; throws {@link WebError} when the
     * capability cannot run. A non-2xx response is a result, not a throw.
     * @param request - the URL plus retrieval options.
     * @param signal - optional cancellation signal forwarded to the provider.
     * @returns the retrieval outcome; non-2xx responses resolve descriptively.
     */
    fetch(request: WebFetchRequest, signal?: AbortSignal): Promise<WebFetchResult>;
}
export default WebRuntime;
//# sourceMappingURL=index.d.ts.map