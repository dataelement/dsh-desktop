import { type AuthResolutionOverrides } from "./auth/resolve.ts";
import type { AuthCheck, AuthContext, AuthInteraction, AuthOperationOptions, AuthResult, AuthType, Credential, CredentialStore, ProviderAuth } from "./auth/types.ts";
import { type ModelsStore, type ModelsStoreEntry } from "./models-store.ts";
import type { Api, ApiStreamOptions, AssistantMessage, AssistantMessageEventStream, Context, DeferredCancelOptions, DeferredFetchOptions, DeferredHandle, Model, ModelThinkingLevel, ProviderHeaders, ProviderStreams, SimpleStreamOptions, Usage } from "./types.ts";
export { ModelsError, type ModelsErrorCode } from "./auth/resolve.ts";
export interface ModelsPublication {
    /** Provider-selected persisted catalog. Omit to leave storage unchanged; null deletes it. */
    persist?: ModelsStoreEntry | null;
    /** Optional synchronous update of provider-private in-memory catalog state. */
    update?: () => void;
}
export interface RefreshModelsContext {
    /** Effective configured credential. OAuth credentials are refreshed before network access. */
    credential?: Credential;
    /** Immutable provider-scoped catalog snapshot captured before this refresh phase. */
    stored?: Readonly<ModelsStoreEntry>;
    /**
     * Generation-checked publication. Persistence policy remains provider-owned;
     * the update runs synchronously only after the selected persistence mutation.
     */
    publish(publication: ModelsPublication): Promise<boolean>;
    /** False during offline/cache-only initialization. */
    allowNetwork: boolean;
    /** Bypass provider freshness checks and fetch immediately when network access is allowed. */
    force?: boolean;
    /** Always present, including when the public refresh caller omits its optional signal. */
    signal: AbortSignal;
}
export interface ModelsRefreshOptions {
    allowNetwork?: boolean;
    /** Restrict refresh to these provider IDs. Unknown and static providers are ignored. */
    providers?: readonly string[];
    /** Bypass provider freshness checks and fetch immediately when network access is allowed. */
    force?: boolean;
    signal?: AbortSignal;
}
export interface ModelsRefreshResult {
    aborted: boolean;
    errors: ReadonlyMap<string, Error>;
}
export interface ModelsRequestTransforms {
    /** Transform fully assembled model/auth/request headers before provider dispatch. */
    transformHeaders?: (headers: ProviderHeaders) => ProviderHeaders | Promise<ProviderHeaders>;
}
export type ModelsApiStreamOptions<TApi extends Api> = ApiStreamOptions<TApi> & ModelsRequestTransforms;
export type ModelsSimpleStreamOptions = SimpleStreamOptions & ModelsRequestTransforms;
export type ModelsDeferredFetchOptions = DeferredFetchOptions & ModelsRequestTransforms;
export type ModelsDeferredCancelOptions = DeferredCancelOptions & ModelsRequestTransforms;
/**
 * A provider is the concrete runtime unit. It owns id/name/base metadata,
 * auth methods, model listing, and stream behavior.
 *
 * `TApi` lets concrete provider factories declare which APIs their models
 * use (e.g. `openaiProvider(): Provider<"openai-responses" | "openai-completions">`),
 * giving typed model lists to direct factory users. Inside a `Models`
 * collection providers are held as `Provider<Api>`.
 */
export interface Provider<TApi extends Api = Api> {
    readonly id: string;
    readonly name: string;
    readonly baseUrl?: string;
    readonly headers?: ProviderHeaders;
    /**
     * Required: at least one of `apiKey`/`oauth`. Every provider has auth
     * semantics — even providers with only ambient credentials (env vars, AWS
     * profiles, ADC files) and keyless local servers provide `apiKey` auth
     * whose `resolve()` reports whether the provider is configured.
     * `Models.getAuth()` returns undefined when the provider is unconfigured.
     */
    readonly auth: ProviderAuth;
    /**
     * Current known models, sync. Static providers return their catalog;
     * dynamic providers return the list as of the last `refreshModels()`
     * (empty before the first). Must not throw; `Models` treats a throwing
     * implementation as having no models.
     */
    getModels(): readonly Model<TApi>[];
    /**
     * Dynamic providers only: restore `context.stored` and optionally fetch a newer list using
     * the effective credential. Implementations retain their previous list on failure, publish
     * persistence and synchronous state changes through `context.publish()`, and honor the
     * shared abort signal for blocking work.
     */
    refreshModels?(context: RefreshModelsContext): Promise<void>;
    /**
     * Optional provider policy for credential-specific model availability.
     * `getModels()` remains the complete synchronous catalog; `Models.getAvailable()`
     * applies this filter after confirming that provider auth is configured.
     */
    filterModels?(models: readonly Model<TApi>[], credential: Credential | undefined): readonly Model<TApi>[];
    stream<T extends TApi>(model: Model<T>, context: Context, options?: ApiStreamOptions<T>): AssistantMessageEventStream;
    streamSimple(model: Model<TApi>, context: Context, options?: SimpleStreamOptions): AssistantMessageEventStream;
    fetchDeferred?(model: Model<TApi>, handle: DeferredHandle, options?: DeferredFetchOptions): AssistantMessageEventStream;
    cancelDeferred?(model: Model<TApi>, handle: DeferredHandle, options?: DeferredCancelOptions): Promise<void>;
}
/**
 * Runtime collection of providers plus auth application and stream
 * convenience. Providers own stream behavior; `Models` resolves auth and
 * delegates each request to the provider that owns the model.
 */
export interface Models {
    getProviders(): readonly Provider[];
    getProvider(id: string): Provider | undefined;
    /**
     * Sync read of last-known models from one provider or all providers.
     * Best-effort: a provider whose `getModels()` throws yields no models.
     */
    getModels(provider?: string): readonly Model<Api>[];
    /**
     * Sync runtime model lookup against last-known lists. Dynamic model lists
     * are typed as `Model<Api>`; narrow with the `hasApi()` type guard.
     */
    getModel(provider: string, id: string): Model<Api> | undefined;
    /**
     * Refresh selected configured dynamic providers concurrently (all when `providers` is omitted).
     * Provider errors and cancellation are returned without rejecting; static, unknown, and
     * unconfigured providers are skipped.
     */
    refresh(options?: ModelsRefreshOptions): Promise<ModelsRefreshResult>;
    /** Check whether a provider has complete auth configuration without refreshing OAuth. */
    checkAuth(providerId: string, options?: AuthOperationOptions): Promise<AuthCheck | undefined>;
    /** Return models whose providers have complete auth configuration. */
    getAvailable(providerId?: string, options?: AuthOperationOptions): Promise<readonly Model<Api>[]>;
    /**
     * Resolve provider-scoped auth by provider id, or provider auth plus static
     * model headers when passed a model. Includes a source label for status UI.
     * Resolves `undefined` when the provider is unknown or unconfigured.
     * Rejects with `ModelsError`: code "oauth" when a token refresh fails (the
     * stored credential is preserved for retry; re-login fixes it), code "auth"
     * when api-key resolution or the credential store fails. Request paths
     * surface rejections as stream errors.
     */
    getAuth(providerId: string, overrides?: AuthResolutionOverrides): Promise<AuthResult | undefined>;
    getAuth(model: Model<Api>, overrides?: AuthResolutionOverrides): Promise<AuthResult | undefined>;
    /** Run a provider-owned login flow and persist its returned credential. */
    login(providerId: string, type: AuthType, interaction: AuthInteraction): Promise<Credential>;
    /** Remove the stored credential for a provider. */
    logout(providerId: string, options?: AuthOperationOptions): Promise<void>;
    stream<TApi extends Api>(model: Model<TApi>, context: Context, options?: ModelsApiStreamOptions<TApi>): AssistantMessageEventStream;
    complete<TApi extends Api>(model: Model<TApi>, context: Context, options?: ModelsApiStreamOptions<TApi>): Promise<AssistantMessage>;
    streamSimple(model: Model<Api>, context: Context, options?: ModelsSimpleStreamOptions): AssistantMessageEventStream;
    completeSimple(model: Model<Api>, context: Context, options?: ModelsSimpleStreamOptions): Promise<AssistantMessage>;
    streamDeferred(model: Model<Api>, handle: DeferredHandle, options?: ModelsDeferredFetchOptions): AssistantMessageEventStream;
    fetchDeferred(model: Model<Api>, handle: DeferredHandle, options?: ModelsDeferredFetchOptions): Promise<AssistantMessage>;
    cancelDeferred(model: Model<Api>, handle: DeferredHandle, options?: ModelsDeferredCancelOptions): Promise<void>;
}
export interface MutableModels extends Models {
    /** Upsert/replace by provider.id. Provider ids are unique. */
    setProvider(provider: Provider): void;
    deleteProvider(id: string): void;
    clearProviders(): void;
}
export interface CreateModelsOptions {
    credentials?: CredentialStore;
    modelsStore?: ModelsStore;
    authContext?: AuthContext;
}
export declare function createModels(options?: CreateModelsOptions): MutableModels;
export interface CreateProviderOptions<TApi extends Api = Api> {
    id: string;
    /** Display name. Default: `id`. */
    name?: string;
    baseUrl?: string;
    headers?: ProviderHeaders;
    /** Required — every provider has auth semantics, even ambient/keyless ones. */
    auth: ProviderAuth;
    /** Static baseline model list (empty for purely dynamic providers). */
    models: readonly Model<TApi>[];
    /** Fetch a dynamic model overlay. createProvider restores and publishes it transactionally. */
    fetchModels?: (context: RefreshModelsContext) => Promise<readonly Model<TApi>[]>;
    filterModels?: (models: readonly Model<TApi>[], credential: Credential | undefined) => readonly Model<TApi>[];
    /** Single implementation, or map keyed by `model.api` for mixed-API providers. */
    api: ProviderStreams | Partial<Record<TApi, ProviderStreams>>;
}
/**
 * Builds a provider from parts. Built-in provider factories and models.json
 * custom providers both go through this. A single `api` streams all models;
 * an `api` map dispatches on `model.api`, and a model whose api has no entry
 * produces a stream error.
 */
export declare function createProvider<TApi extends Api = Api>(input: CreateProviderOptions<TApi>): Provider<TApi>;
/**
 * Runtime-checked narrowing for dynamically looked-up models:
 *
 * ```ts
 * const model = models.getModel("anthropic", "claude-opus-4-7");
 * if (model && hasApi(model, "anthropic-messages")) {
 *   // model: Model<"anthropic-messages">, stream options fully typed
 * }
 * ```
 */
export declare function hasApi<TApi extends Api>(model: Model<Api>, api: TApi): model is Model<TApi>;
export declare function calculateCost<TApi extends Api>(model: Model<TApi>, usage: Usage): Usage["cost"];
export declare function getSupportedThinkingLevels<TApi extends Api>(model: Model<TApi>): ModelThinkingLevel[];
export declare function clampThinkingLevel<TApi extends Api>(model: Model<TApi>, level: ModelThinkingLevel): ModelThinkingLevel;
/**
 * Check if two models are equal by comparing both their id and provider.
 * Returns false if either model is null or undefined.
 */
export declare function modelsAreEqual<TApi extends Api>(a: Model<TApi> | null | undefined, b: Model<TApi> | null | undefined): boolean;
//# sourceMappingURL=models.d.ts.map