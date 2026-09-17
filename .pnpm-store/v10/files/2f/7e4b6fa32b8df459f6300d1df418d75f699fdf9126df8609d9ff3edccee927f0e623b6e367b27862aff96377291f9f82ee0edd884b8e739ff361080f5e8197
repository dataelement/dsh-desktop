import { type AuthResolutionOverrides } from "./auth/resolve.ts";
import type { AuthResult, ProviderAuth } from "./auth/types.ts";
import type { CreateModelsOptions } from "./models.ts";
import type { AssistantImages, ImagesApi, ImagesContext, ImagesModel, ImagesOptions, ProviderImages } from "./types.ts";
/**
 * An image-generation provider: the image-side counterpart of `Provider`.
 * Owns id/name metadata, auth, model listing, and generation behavior.
 */
export interface ImagesProvider {
    readonly id: string;
    readonly name: string;
    /**
     * Required: at least one of `apiKey`/`oauth`. Same semantics as chat
     * providers; `ImagesModels.getAuth()` returns undefined when the provider
     * is unconfigured.
     */
    readonly auth: ProviderAuth;
    /**
     * Current known models, sync. Static providers return their catalog;
     * dynamic providers return the list as of the last `refreshModels()`
     * (empty before the first). Must not throw; `ImagesModels` treats a
     * throwing implementation as having no models.
     */
    getModels(): readonly ImagesModel<ImagesApi>[];
    /**
     * Dynamic providers only: fetch and update the model list. May reject
     * (network); on rejection the model list stays at its last-known state
     * and a later call retries.
     */
    refreshModels?(): Promise<void>;
    generateImages(model: ImagesModel<ImagesApi>, context: ImagesContext, options?: ImagesOptions): Promise<AssistantImages>;
}
/**
 * Runtime collection of image-generation providers plus auth application and
 * generation convenience: the image-side counterpart of `Models`.
 */
export interface ImagesModels {
    getProviders(): readonly ImagesProvider[];
    getProvider(id: string): ImagesProvider | undefined;
    /**
     * Sync read of last-known models from one provider or all providers.
     * Best-effort: a provider whose `getModels()` throws yields no models.
     */
    getModels(provider?: string): readonly ImagesModel<ImagesApi>[];
    /** Sync runtime model lookup against last-known lists. */
    getModel(provider: string, id: string): ImagesModel<ImagesApi> | undefined;
    /**
     * Ask dynamic providers to re-fetch their model lists. With a provider id,
     * rejects with `ModelsError` ("model_source") on that provider's fetch
     * failure; without one, refreshes all providers concurrently best-effort.
     * Static providers (no `refreshModels`) are no-ops.
     */
    refresh(provider?: string): Promise<void>;
    /**
     * Resolve request auth by provider id or image model. Same contract as
     * `Models.getAuth()`: undefined when unknown/unconfigured, rejects with
     * `ModelsError` ("oauth"/"auth") on real failures.
     */
    getAuth(providerId: string, overrides?: AuthResolutionOverrides): Promise<AuthResult | undefined>;
    getAuth(model: ImagesModel<ImagesApi>, overrides?: AuthResolutionOverrides): Promise<AuthResult | undefined>;
    /**
     * Generate images through the owning provider with auth resolved and
     * merged (explicit options win per field). Never rejects; failures are
     * returned as an `AssistantImages` with `stopReason: "error"`.
     */
    generateImages(model: ImagesModel<ImagesApi>, context: ImagesContext, options?: ImagesOptions): Promise<AssistantImages>;
}
export interface MutableImagesModels extends ImagesModels {
    /** Upsert/replace by provider.id. Provider ids are unique. */
    setProvider(provider: ImagesProvider): void;
    deleteProvider(id: string): void;
    clearProviders(): void;
}
export declare function createImagesModels(options?: CreateModelsOptions): MutableImagesModels;
export interface CreateImagesProviderOptions {
    id: string;
    /** Display name. Default: `id`. */
    name?: string;
    /** Required — every provider has auth semantics, even ambient/keyless ones. */
    auth: ProviderAuth;
    /** Initial model list (empty for purely dynamic providers). */
    models: readonly ImagesModel<ImagesApi>[];
    /**
     * Dynamic providers: fetch the current list. Stored on success; concurrent
     * calls share one in-flight fetch. May reject: the stored list then stays
     * at its last-known state, the rejection propagates to the caller of
     * `refreshModels()` (wrapped as ModelsError "model_source" by
     * `ImagesModels.refresh(provider)`), and a later call retries.
     */
    refreshModels?: () => Promise<readonly ImagesModel<ImagesApi>[]>;
    api: ProviderImages;
}
/** Builds an image-generation provider from parts. */
export declare function createImagesProvider(input: CreateImagesProviderOptions): ImagesProvider;
//# sourceMappingURL=images-models.d.ts.map