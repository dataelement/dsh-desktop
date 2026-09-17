import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import { HarnessError } from "@deepseek-ai/dsh-llm";
//#region lib/types/types.js
/**
* Vocabulary for the web capability seam (`ctx.web`). Search and fetch deliberately share one
* seam so provider selection, cancellation, errors, and product configuration have one owner,
* while retaining separate request and result types.
* @module @deepseek-ai/dsh-web/types
*/
/**
* Typed web error with a machine-routable, open-string `code` and chained `cause`.
* Consumers must tolerate provider-specific codes. Shared codes cover unavailable,
* missing, unusable, ambiguous, or duplicate providers, cancellation, and provider failure;
* the local fetch provider additionally distinguishes invalid or blocked URLs, redirects,
* size and timeout limits, and unsupported content types. Tool execution exposes the code in
* structured error metadata.
*/
var WebError = class extends HarnessError {};
//#endregion
//#region lib/types/index.js
/**
* Service Definition for the web access capability seam (`ctx.web`): registries and provider-selecting execution for search and
* fetch. Duplicate ids are rejected. At execution time, a configured provider must exist and
* be usable; without one, exactly one usable provider is required, so selection never depends
* on registration order.
* @module @deepseek-ai/dsh-web
*/
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
var WebRuntime = class extends Service {
	/**
	* Provider selection config. Operational env overrides feed the SAME fields:
	* `$DSH_WEB_SEARCH_PROVIDER` / `$DSH_WEB_FETCH_PROVIDER` are equivalent to
	* `searchProvider` / `fetchProvider` and are NOT a hidden priority chain.
	*/
	static Config = z.object({
		searchProvider: z.string(),
		fetchProvider: z.string()
	});
	searchProviders = /* @__PURE__ */ new Map();
	fetchProviders = /* @__PURE__ */ new Map();
	searchProviderId;
	fetchProviderId;
	constructor(ctx, config = {}) {
		super(ctx, "web");
		this.searchProviderId = config.searchProvider ?? process.env.DSH_WEB_SEARCH_PROVIDER;
		this.fetchProviderId = config.fetchProvider ?? process.env.DSH_WEB_FETCH_PROVIDER;
	}
	/**
	* Register a search provider. Throws {@link WebError} `WEB_DUPLICATE_PROVIDER`
	* if its id is already registered for search. Returns a disposer; disposed
	* with the calling fiber.
	* @param provider - the provider; its `id` is the registry key.
	* @returns the disposer that unregisters the provider.
	*/
	registerSearchProvider(provider) {
		return this.registerProvider(this.searchProviders, provider);
	}
	/**
	* Register a fetch provider. Throws {@link WebError} `WEB_DUPLICATE_PROVIDER`
	* if its id is already registered for fetch. Returns a disposer; disposed
	* with the calling fiber.
	* @param provider - the provider; its `id` is the registry key.
	* @returns the disposer that unregisters the provider.
	*/
	registerFetchProvider(provider) {
		return this.registerProvider(this.fetchProviders, provider);
	}
	registerProvider(store, provider) {
		if (store.has(provider.id)) throw new WebError(`a web provider with id "${provider.id}" is already registered`, "WEB_DUPLICATE_PROVIDER");
		const dispose = this.ctx.effect(function* () {
			store.set(provider.id, provider);
			yield () => store.delete(provider.id);
		}, "web.registerProvider()");
		return () => void dispose();
	}
	/**
	* Run one search through the selected provider. Resolves the provider at call
	* time with the selection rules above; throws {@link WebError} when the
	* capability cannot run. The seam enforces `request.maxResults` on the result:
	* if the provider over-returns, `sources[]` is truncated and `truncated` set.
	* @param request - the query and optional result limit.
	* @param signal - optional cancellation signal forwarded to the provider.
	* @returns the provider's results, capped to `request.maxResults`.
	*/
	async search(request, signal) {
		return capSources(await resolveProvider({
			providers: this.searchProviders,
			...this.searchProviderId !== void 0 ? { configuredId: this.searchProviderId } : {}
		}).search(request, signal), request.maxResults);
	}
	/**
	* Retrieve one URL through the selected provider. Resolves the provider at
	* call time with the selection rules above; throws {@link WebError} when the
	* capability cannot run. A non-2xx response is a result, not a throw.
	* @param request - the URL plus retrieval options.
	* @param signal - optional cancellation signal forwarded to the provider.
	* @returns the retrieval outcome; non-2xx responses resolve descriptively.
	*/
	async fetch(request, signal) {
		return resolveProvider({
			providers: this.fetchProviders,
			...this.fetchProviderId !== void 0 ? { configuredId: this.fetchProviderId } : {}
		}).fetch(request, signal);
	}
};
/** Resolve the selected provider or throw the matching {@link WebError}. */
function resolveProvider(selection) {
	const { configuredId, providers } = selection;
	if (configuredId !== void 0) {
		const provider = providers.get(configuredId);
		if (!provider) throw new WebError(`configured web provider "${configuredId}" is not registered`, "WEB_PROVIDER_CONFIGURED_MISSING");
		if (!provider.available()) throw new WebError(`configured web provider "${configuredId}" is registered but unavailable`, "WEB_PROVIDER_CONFIGURED_UNAVAILABLE");
		return provider;
	}
	const usable = [...providers.values()].filter((provider) => provider.available());
	const [single] = usable;
	if (single === void 0) throw new WebError("no usable web provider is registered", "WEB_PROVIDER_UNAVAILABLE");
	if (usable.length > 1) throw new WebError(`multiple usable web providers are registered (${usable.map((provider) => provider.id).join(", ")}); configure one explicitly`, "WEB_PROVIDER_AMBIGUOUS");
	return single;
}
/** Enforce `maxResults` on a search result: truncate `sources[]` and flag it. */
function capSources(result, maxResults) {
	if (maxResults === void 0 || result.sources.length <= maxResults) return result;
	return {
		...result,
		sources: result.sources.slice(0, maxResults),
		truncated: true
	};
}
//#endregion
export { WebError, WebRuntime, WebRuntime as default };
