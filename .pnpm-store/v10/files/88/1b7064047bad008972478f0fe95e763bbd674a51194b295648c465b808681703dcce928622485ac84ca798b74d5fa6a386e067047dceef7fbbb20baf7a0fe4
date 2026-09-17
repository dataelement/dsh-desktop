import { lazyStream } from "./api/lazy.js";
import { defaultProviderAuthContext as defaultAuthContext } from "./auth/context.js";
import { InMemoryCredentialStore } from "./auth/credential-store.js";
import { ModelsError, resolveProviderAuth } from "./auth/resolve.js";
import { InMemoryModelsStore } from "./models-store.js";
import { operationSignal, raceWithAbortSignal } from "./utils/abort.js";
export { ModelsError } from "./auth/resolve.js";
function mergeHeaders(base, override) {
    if (!base && !override)
        return undefined;
    const merged = { ...base };
    for (const [name, value] of Object.entries(override ?? {})) {
        const lowerName = name.toLowerCase();
        for (const existingName of Object.keys(merged)) {
            if (existingName.toLowerCase() === lowerName)
                delete merged[existingName];
        }
        merged[name] = value;
    }
    return merged;
}
class ModelsImpl {
    providers = new Map();
    credentials;
    modelsStore;
    authContext;
    refreshGenerations = new Map();
    refreshControllers = new Map();
    publicationChains = new Map();
    constructor(options) {
        this.credentials = options?.credentials ?? new InMemoryCredentialStore();
        this.modelsStore = options?.modelsStore ?? new InMemoryModelsStore();
        this.authContext = options?.authContext ?? defaultAuthContext();
    }
    setProvider(provider) {
        this.supersedeProviderRefresh(provider.id);
        this.providers.set(provider.id, provider);
    }
    deleteProvider(id) {
        this.supersedeProviderRefresh(id);
        this.providers.delete(id);
    }
    clearProviders() {
        for (const id of new Set([...this.providers.keys(), ...this.refreshControllers.keys()])) {
            this.supersedeProviderRefresh(id);
        }
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
    supersedeProviderRefresh(providerId) {
        const generation = (this.refreshGenerations.get(providerId) ?? 0) + 1;
        this.refreshGenerations.set(providerId, generation);
        const previous = this.refreshControllers.get(providerId);
        if (previous) {
            this.refreshControllers.delete(providerId);
            previous.abort();
        }
        return generation;
    }
    beginProviderRefresh(providerId) {
        const generation = this.supersedeProviderRefresh(providerId);
        const controller = new AbortController();
        this.refreshControllers.set(providerId, controller);
        return { generation, controller };
    }
    publishProviderModels(providerId, generation, signal, publication) {
        const previous = this.publicationChains.get(providerId) ?? Promise.resolve();
        const queued = (async () => {
            await previous.catch(() => { });
            if (signal.aborted || this.refreshGenerations.get(providerId) !== generation)
                return false;
            if (publication.persist === null) {
                await this.modelsStore.delete(providerId, { signal });
            }
            else if (publication.persist !== undefined) {
                await this.modelsStore.write(providerId, structuredClone(publication.persist), { signal });
            }
            if (signal.aborted || this.refreshGenerations.get(providerId) !== generation)
                return false;
            publication.update?.();
            return true;
        })();
        const tail = queued.catch(() => { });
        this.publicationChains.set(providerId, tail);
        void tail.then(() => {
            if (this.publicationChains.get(providerId) === tail)
                this.publicationChains.delete(providerId);
        });
        return raceWithAbortSignal(queued, signal);
    }
    async runProviderRefreshPhase(provider, credential, allowNetwork, force, generation, signal) {
        const stored = await this.modelsStore.read(provider.id, { signal });
        await provider.refreshModels({
            credential,
            stored: stored ? structuredClone(stored) : undefined,
            publish: (publication) => this.publishProviderModels(provider.id, generation, signal, publication),
            allowNetwork,
            force: allowNetwork ? force : undefined,
            signal,
        });
    }
    async refresh(options = {}) {
        const allowNetwork = options.allowNetwork ?? true;
        const callerSignal = operationSignal(options.signal);
        const errors = new Map();
        if (callerSignal.aborted)
            return { aborted: true, errors };
        const selected = options.providers ? new Set(options.providers) : undefined;
        const refreshable = Array.from(this.providers.values()).filter((provider) => provider.refreshModels !== undefined && (!selected || selected.has(provider.id)));
        const refresh = Promise.all(refreshable.map(async (provider) => {
            const { generation, controller } = this.beginProviderRefresh(provider.id);
            const signal = AbortSignal.any([callerSignal, controller.signal]);
            const operation = (async () => {
                let storedCredential;
                let credentialError;
                try {
                    storedCredential = await this.readCredential(provider.id, signal);
                }
                catch (error) {
                    credentialError = error;
                }
                // Restore cached provider state before auth resolution or network access.
                await this.runProviderRefreshPhase(provider, storedCredential, false, undefined, generation, signal);
                if (credentialError !== undefined)
                    throw credentialError;
                if (!allowNetwork || signal.aborted)
                    return;
                const credential = await this.resolveRefreshCredential(provider, storedCredential, signal);
                if (!credential)
                    return;
                await this.runProviderRefreshPhase(provider, credential, true, options.force, generation, signal);
            })();
            try {
                await raceWithAbortSignal(operation, signal);
            }
            catch (error) {
                if (!signal.aborted) {
                    errors.set(provider.id, error instanceof Error
                        ? error
                        : new ModelsError("model_source", `Model refresh failed for ${provider.id}`, { cause: error }));
                }
            }
            finally {
                if (this.refreshControllers.get(provider.id) === controller) {
                    this.refreshControllers.delete(provider.id);
                }
            }
        }));
        try {
            await raceWithAbortSignal(refresh, callerSignal);
        }
        catch (error) {
            if (!callerSignal.aborted)
                throw error;
        }
        return { aborted: callerSignal.aborted, errors: new Map(errors) };
    }
    async resolveRefreshCredential(provider, stored, signal) {
        if (stored?.type === "oauth") {
            const oauth = provider.auth.oauth;
            if (!oauth)
                return undefined;
            if (Date.now() < stored.expires)
                return stored;
            if (signal.aborted)
                return undefined;
            const post = await this.credentials.modify(provider.id, async (current) => {
                if (current?.type !== "oauth" || Date.now() < current.expires)
                    return undefined;
                return oauth.refresh(current, signal);
            }, { signal });
            return post?.type === "oauth" ? post : undefined;
        }
        const apiKey = provider.auth.apiKey;
        if (!apiKey)
            return undefined;
        const credential = stored?.type === "api_key" ? stored : undefined;
        const result = await apiKey.resolve({ ctx: this.authContext, credential, signal });
        if (!result)
            return undefined;
        return { type: "api_key", key: result.auth.apiKey, env: result.env };
    }
    async readCredential(providerId, signal) {
        try {
            return await this.credentials.read(providerId, { signal });
        }
        catch (error) {
            throw new ModelsError("auth", `Credential store read failed for ${providerId}`, { cause: error });
        }
    }
    async checkProviderAuth(provider, credential, signal) {
        if (credential?.type === "oauth") {
            return provider.auth.oauth ? { source: "OAuth", type: "oauth" } : undefined;
        }
        const apiKey = provider.auth.apiKey;
        if (!apiKey)
            return undefined;
        if (apiKey.check) {
            try {
                return await apiKey.check({
                    ctx: this.authContext,
                    credential: credential?.type === "api_key" ? credential : undefined,
                    signal,
                });
            }
            catch (error) {
                throw new ModelsError("auth", `API key auth check failed for provider ${provider.id}`, { cause: error });
            }
        }
        const resolution = await resolveProviderAuth(provider, this.credentials, this.authContext, { signal });
        return resolution ? { source: resolution.source, type: "api_key" } : undefined;
    }
    checkAuth(providerId, options) {
        const signal = operationSignal(options?.signal);
        const check = (async () => {
            signal.throwIfAborted();
            const provider = this.providers.get(providerId);
            if (!provider)
                return undefined;
            return this.checkProviderAuth(provider, await this.readCredential(providerId, signal), signal);
        })();
        return raceWithAbortSignal(check, signal);
    }
    getAvailable(providerId, options) {
        const signal = operationSignal(options?.signal);
        const available = (async () => {
            signal.throwIfAborted();
            const providers = providerId
                ? [this.providers.get(providerId)].filter((entry) => entry !== undefined)
                : this.getProviders();
            const checks = await Promise.all(providers.map(async (provider) => {
                const credential = await this.readCredential(provider.id, signal);
                return { provider, credential, auth: await this.checkProviderAuth(provider, credential, signal) };
            }));
            return checks.flatMap(({ provider, credential, auth }) => {
                if (!auth)
                    return [];
                const models = provider.getModels();
                return provider.filterModels?.(models, credential) ?? models;
            });
        })();
        return raceWithAbortSignal(available, signal);
    }
    async getAuth(providerOrModel, overrides) {
        const signal = operationSignal(overrides?.signal);
        const providerId = typeof providerOrModel === "string" ? providerOrModel : providerOrModel.provider;
        const provider = this.providers.get(providerId);
        if (!provider)
            return undefined;
        const result = await resolveProviderAuth(provider, this.credentials, this.authContext, { ...overrides, signal });
        if (!result || typeof providerOrModel === "string" || !providerOrModel.headers)
            return result;
        return {
            ...result,
            auth: {
                ...result.auth,
                headers: mergeHeaders(result.auth.headers, providerOrModel.headers),
            },
        };
    }
    async login(providerId, type, interaction) {
        const signal = operationSignal(interaction.signal);
        signal.throwIfAborted();
        const provider = this.providers.get(providerId);
        if (!provider)
            throw new ModelsError("provider", `Unknown provider: ${providerId}`);
        const method = type === "oauth" ? provider.auth.oauth : provider.auth.apiKey;
        if (!method?.login) {
            throw new ModelsError("auth", `${provider.name} does not support ${type} login`);
        }
        const loginOperation = method.login({ ...interaction, signal });
        const credential = await raceWithAbortSignal(loginOperation, signal);
        let mutationStarted = false;
        let markMutationStarted;
        const started = new Promise((resolve) => {
            markMutationStarted = resolve;
        });
        const mutation = this.credentials.modify(providerId, async () => {
            mutationStarted = true;
            markMutationStarted?.();
            return credential;
        }, { signal });
        void mutation.catch(() => { });
        try {
            await new Promise((resolve, reject) => {
                const onAbort = () => {
                    if (!mutationStarted)
                        reject(signal.reason);
                };
                signal.addEventListener("abort", onAbort, { once: true });
                void Promise.race([started, mutation]).then(() => {
                    signal.removeEventListener("abort", onAbort);
                    resolve();
                }, (error) => {
                    signal.removeEventListener("abort", onAbort);
                    reject(error);
                });
                if (signal.aborted)
                    onAbort();
            });
            await mutation;
        }
        catch (error) {
            signal.throwIfAborted();
            throw new ModelsError("auth", `Credential store modify failed for ${providerId}`, { cause: error });
        }
        return credential;
    }
    async logout(providerId, options) {
        const signal = operationSignal(options?.signal);
        signal.throwIfAborted();
        try {
            await this.credentials.delete(providerId, { signal });
        }
        catch (error) {
            signal.throwIfAborted();
            throw new ModelsError("auth", `Credential store delete failed for ${providerId}`, { cause: error });
        }
    }
    requireProvider(model) {
        const provider = this.providers.get(model.provider);
        if (!provider) {
            throw new ModelsError("provider", `Unknown provider: ${model.provider}`);
        }
        return provider;
    }
    async applyAuth(model, options) {
        this.requireProvider(model);
        const resolution = await this.getAuth(model, {
            apiKey: options?.apiKey,
            env: options?.env,
            signal: options?.signal,
        });
        if (!resolution) {
            throw new ModelsError("auth", `Provider is not configured: ${model.provider}`);
        }
        const auth = resolution.auth;
        // Explicit request options win per-field; the Models-only transform runs last.
        const apiKey = options?.apiKey ?? auth.apiKey;
        let headers = mergeHeaders(auth.headers, options?.headers);
        if (options?.transformHeaders)
            headers = await options.transformHeaders(headers ?? {});
        const env = resolution.env || options?.env ? { ...(resolution.env ?? {}), ...(options?.env ?? {}) } : undefined;
        const requestModel = auth.baseUrl ? { ...model, baseUrl: auth.baseUrl } : model;
        const { transformHeaders: _transformHeaders, ...providerOptions } = options ?? {};
        const requestOptions = { ...providerOptions, apiKey, headers, env };
        return { requestModel, requestOptions };
    }
    stream(model, context, options) {
        return lazyStream(model, async () => {
            const provider = this.requireProvider(model);
            const { requestModel, requestOptions } = await this.applyAuth(model, options);
            return provider.stream(requestModel, context, requestOptions);
        });
    }
    async complete(model, context, options) {
        return this.stream(model, context, options).result();
    }
    streamSimple(model, context, options) {
        return lazyStream(model, async () => {
            const provider = this.requireProvider(model);
            const { requestModel, requestOptions } = await this.applyAuth(model, options);
            return provider.streamSimple(requestModel, context, requestOptions);
        });
    }
    async completeSimple(model, context, options) {
        return this.streamSimple(model, context, options).result();
    }
    streamDeferred(model, handle, options) {
        return lazyStream(model, async () => {
            const provider = this.requireProvider(model);
            if (!provider.fetchDeferred) {
                throw new ModelsError("provider", `Provider ${model.provider} does not support deferred responses`);
            }
            const { requestModel, requestOptions } = await this.applyAuth(model, options);
            return provider.fetchDeferred(requestModel, handle, requestOptions);
        });
    }
    async fetchDeferred(model, handle, options) {
        return this.streamDeferred(model, handle, options).result();
    }
    async cancelDeferred(model, handle, options) {
        const provider = this.requireProvider(model);
        if (!provider.cancelDeferred) {
            throw new ModelsError("provider", `Provider ${model.provider} does not support deferred responses`);
        }
        const { requestModel, requestOptions } = await this.applyAuth(model, options);
        await provider.cancelDeferred(requestModel, handle, requestOptions);
    }
}
export function createModels(options) {
    return new ModelsImpl(options);
}
/**
 * Builds a provider from parts. Built-in provider factories and models.json
 * custom providers both go through this. A single `api` streams all models;
 * an `api` map dispatches on `model.api`, and a model whose api has no entry
 * produces a stream error.
 */
export function createProvider(input) {
    const baselineModels = input.models;
    let dynamicModels = [];
    const fetchModels = input.fetchModels;
    const currentModels = () => {
        const merged = [...baselineModels];
        for (const model of dynamicModels) {
            const index = merged.findIndex((entry) => entry.id === model.id);
            if (index >= 0)
                merged[index] = model;
            else
                merged.push(model);
        }
        return merged;
    };
    const single = typeof input.api.stream === "function" ? input.api : undefined;
    const byApi = single ? undefined : input.api;
    const apiFor = (model) => single ?? byApi?.[model.api];
    const dispatch = (model, run) => {
        const streams = apiFor(model);
        if (!streams) {
            return lazyStream(model, async () => {
                throw new ModelsError("stream", `Provider ${input.id} has no API implementation for "${model.api}"`);
            });
        }
        return run(streams);
    };
    const provider = {
        id: input.id,
        name: input.name ?? input.id,
        baseUrl: input.baseUrl,
        headers: input.headers,
        auth: input.auth,
        getModels: currentModels,
        refreshModels: fetchModels
            ? async (context) => {
                if (context.stored) {
                    const restored = context.stored.models
                        .filter((model) => model.provider === input.id)
                        .map((model) => model);
                    if (!(await context.publish({
                        update: () => {
                            dynamicModels = restored;
                        },
                    }))) {
                        return;
                    }
                }
                if (!context.allowNetwork || context.signal.aborted)
                    return;
                const refreshed = await fetchModels(context);
                if (context.signal.aborted)
                    return;
                await context.publish({
                    persist: { models: refreshed, checkedAt: Date.now() },
                    update: () => {
                        dynamicModels = refreshed;
                    },
                });
            }
            : undefined,
        filterModels: input.filterModels,
        stream: (model, context, options) => dispatch(model, (streams) => streams.stream(model, context, options)),
        streamSimple: (model, context, options) => dispatch(model, (streams) => streams.streamSimple(model, context, options)),
    };
    const streams = single ? [single] : Object.values(byApi ?? {}).filter((entry) => entry !== undefined);
    if (streams.some((entry) => entry.fetchDeferred !== undefined)) {
        provider.fetchDeferred = (model, handle, options) => lazyStream(model, async () => {
            const implementation = apiFor(model);
            if (!implementation?.fetchDeferred) {
                throw new ModelsError("provider", `Provider ${input.id} does not support deferred responses for "${model.api}"`);
            }
            return implementation.fetchDeferred(model, handle, options);
        });
    }
    if (streams.some((entry) => entry.cancelDeferred !== undefined)) {
        provider.cancelDeferred = async (model, handle, options) => {
            const implementation = apiFor(model);
            if (!implementation?.cancelDeferred) {
                throw new ModelsError("provider", `Provider ${input.id} cannot cancel deferred responses for "${model.api}"`);
            }
            await implementation.cancelDeferred(model, handle, options);
        };
    }
    return provider;
}
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
export function hasApi(model, api) {
    return model.api === api;
}
export function calculateCost(model, usage) {
    const inputTokens = usage.input + usage.cacheRead + usage.cacheWrite;
    let rates = model.cost;
    let matchedThreshold = -1;
    for (const tier of model.cost.tiers ?? []) {
        if (inputTokens > tier.inputTokensAbove && tier.inputTokensAbove > matchedThreshold) {
            rates = tier;
            matchedThreshold = tier.inputTokensAbove;
        }
    }
    // Anthropic charges 2x base input for 1h cache writes.
    const longWrite = usage.cacheWrite1h ?? 0;
    const shortWrite = usage.cacheWrite - longWrite;
    usage.cost.input = (rates.input / 1000000) * usage.input;
    usage.cost.output = (rates.output / 1000000) * usage.output;
    usage.cost.cacheRead = (rates.cacheRead / 1000000) * usage.cacheRead;
    usage.cost.cacheWrite = (rates.cacheWrite * shortWrite + rates.input * 2 * longWrite) / 1000000;
    usage.cost.total = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
    return usage.cost;
}
const EXTENDED_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
export function getSupportedThinkingLevels(model) {
    if (!model.reasoning)
        return ["off"];
    return EXTENDED_THINKING_LEVELS.filter((level) => {
        const mapped = model.thinkingLevelMap?.[level];
        if (mapped === null)
            return false;
        if (level === "xhigh" || level === "max")
            return mapped !== undefined;
        return true;
    });
}
export function clampThinkingLevel(model, level) {
    const availableLevels = getSupportedThinkingLevels(model);
    if (availableLevels.includes(level))
        return level;
    const requestedIndex = EXTENDED_THINKING_LEVELS.indexOf(level);
    if (requestedIndex === -1)
        return availableLevels[0] ?? "off";
    for (let i = requestedIndex; i < EXTENDED_THINKING_LEVELS.length; i++) {
        const candidate = EXTENDED_THINKING_LEVELS[i];
        if (availableLevels.includes(candidate))
            return candidate;
    }
    for (let i = requestedIndex - 1; i >= 0; i--) {
        const candidate = EXTENDED_THINKING_LEVELS[i];
        if (availableLevels.includes(candidate))
            return candidate;
    }
    return availableLevels[0] ?? "off";
}
/**
 * Check if two models are equal by comparing both their id and provider.
 * Returns false if either model is null or undefined.
 */
export function modelsAreEqual(a, b) {
    if (!a || !b)
        return false;
    return a.id === b.id && a.provider === b.provider;
}
//# sourceMappingURL=models.js.map