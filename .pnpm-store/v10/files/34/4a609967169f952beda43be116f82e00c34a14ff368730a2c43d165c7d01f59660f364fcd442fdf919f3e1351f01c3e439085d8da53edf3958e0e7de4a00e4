import { defaultProviderAuthContext as defaultAuthContext } from "./auth/context.js";
import { InMemoryCredentialStore } from "./auth/credential-store.js";
import { ModelsError, resolveProviderAuth } from "./auth/resolve.js";
class ImagesModelsImpl {
    providers = new Map();
    credentials;
    authContext;
    constructor(options) {
        this.credentials = options?.credentials ?? new InMemoryCredentialStore();
        this.authContext = options?.authContext ?? defaultAuthContext();
    }
    setProvider(provider) {
        this.providers.set(provider.id, provider);
    }
    deleteProvider(id) {
        this.providers.delete(id);
    }
    clearProviders() {
        this.providers.clear();
    }
    getProviders() {
        return Array.from(this.providers.values());
    }
    getProvider(id) {
        return this.providers.get(id);
    }
    getModels(provider) {
        if (provider !== undefined) {
            const entry = this.providers.get(provider);
            if (!entry)
                return [];
            try {
                return entry.getModels();
            }
            catch {
                return [];
            }
        }
        const models = [];
        for (const entry of this.providers.values()) {
            try {
                models.push(...entry.getModels());
            }
            catch {
                // Best-effort: ill-behaved providers yield no models.
            }
        }
        return models;
    }
    getModel(provider, id) {
        return this.getModels(provider).find((model) => model.id === id);
    }
    async refresh(provider) {
        if (provider !== undefined) {
            const entry = this.providers.get(provider);
            if (!entry?.refreshModels)
                return;
            try {
                await entry.refreshModels();
            }
            catch (error) {
                if (error instanceof ModelsError)
                    throw error;
                throw new ModelsError("model_source", `Model refresh failed for ${provider}`, { cause: error });
            }
            return;
        }
        // Cannot reject: the async mapper turns even sync throws from ill-behaved
        // providers into rejections, and allSettled captures all of them.
        await Promise.allSettled(Array.from(this.providers.values(), async (entry) => entry.refreshModels?.()));
    }
    async getAuth(providerOrModel, overrides) {
        const providerId = typeof providerOrModel === "string" ? providerOrModel : providerOrModel.provider;
        const provider = this.providers.get(providerId);
        if (!provider)
            return undefined;
        return resolveProviderAuth(provider, this.credentials, this.authContext, overrides);
    }
    async generateImages(model, context, options) {
        try {
            const provider = this.providers.get(model.provider);
            if (!provider) {
                throw new ModelsError("provider", `Unknown provider: ${model.provider}`);
            }
            const resolution = await this.getAuth(model, {
                apiKey: options?.apiKey,
                env: options?.env,
                signal: options?.signal,
            });
            const auth = resolution?.auth;
            if (!auth) {
                return provider.generateImages(model, context, options);
            }
            const requestModel = auth.baseUrl ? { ...model, baseUrl: auth.baseUrl } : model;
            // Explicit request options win per-field; headers/env merge per key.
            const apiKey = options?.apiKey ?? auth.apiKey;
            const headers = auth.headers || options?.headers ? { ...auth.headers, ...options?.headers } : undefined;
            const env = resolution.env || options?.env ? { ...(resolution.env ?? {}), ...(options?.env ?? {}) } : undefined;
            return await provider.generateImages(requestModel, context, { ...options, apiKey, headers, env });
        }
        catch (error) {
            return {
                api: model.api,
                provider: model.provider,
                model: model.id,
                output: [],
                stopReason: "error",
                errorMessage: error instanceof Error ? error.message : String(error),
                timestamp: Date.now(),
            };
        }
    }
}
export function createImagesModels(options) {
    return new ImagesModelsImpl(options);
}
/** Builds an image-generation provider from parts. */
export function createImagesProvider(input) {
    let models = input.models;
    let inflightRefresh;
    const refreshModels = input.refreshModels;
    return {
        id: input.id,
        name: input.name ?? input.id,
        auth: input.auth,
        getModels: () => models,
        refreshModels: refreshModels
            ? () => {
                inflightRefresh ??= (async () => {
                    try {
                        models = await refreshModels();
                    }
                    finally {
                        inflightRefresh = undefined;
                    }
                })();
                return inflightRefresh;
            }
            : undefined,
        generateImages: (model, context, options) => input.api.generateImages(model, context, options),
    };
}
//# sourceMappingURL=images-models.js.map