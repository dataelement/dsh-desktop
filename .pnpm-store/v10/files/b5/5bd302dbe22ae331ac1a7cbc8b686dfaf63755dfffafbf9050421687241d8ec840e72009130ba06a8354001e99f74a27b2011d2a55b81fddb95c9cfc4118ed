/**
 * Temporary compatibility entrypoint preserving the old global pi-ai API
 * surface: api-dispatch `stream()`/`complete()` with env API key injection,
 * the api-registry, generated catalog reads (`getModel`/`getModels`/
 * `getProviders`), per-API lazy stream wrappers, and image generation.
 *
 * Existing apps switch imports from "@earendil-works/pi-ai" to
 * "@earendil-works/pi-ai/compat" unchanged; new code uses `createModels()`
 * and the provider factories. This module is deleted with the coding-agent
 * ModelManager migration.
 */
export * from "./api/anthropic-messages.lazy.ts";
export * from "./api/azure-openai-responses.lazy.ts";
export * from "./api/bedrock-converse-stream.lazy.ts";
export * from "./api/google-generative-ai.lazy.ts";
export * from "./api/google-vertex.lazy.ts";
export * from "./api/mistral-conversations.lazy.ts";
export * from "./api/openai-codex-responses.lazy.ts";
export * from "./api/openai-completions.lazy.ts";
export * from "./api/openai-responses.lazy.ts";
export * from "./api/pi-messages.lazy.ts";
export * from "./env-api-keys.ts";
export * from "./image-models.ts";
export * from "./images.ts";
export * from "./images-api-registry.ts";
export * from "./index.ts";
export * from "./legacy-api-aliases.ts";
export * from "./providers/images/register-builtins.ts";
import { getBuiltinModel, getBuiltinModels, getBuiltinProviders } from "./providers/all.ts";
export type { BuiltinProvider } from "./providers/all.ts";
import { type FauxProviderRegistration, type RegisterFauxProviderOptions } from "./providers/faux.ts";
import type { Api, AssistantMessage, AssistantMessageEventStream, Context, Model, ProviderStreamOptions, SimpleStreamOptions, StreamFunction, StreamOptions } from "./types.ts";
/** @deprecated Static catalog read. Use `getBuiltinModel` from "@earendil-works/pi-ai/providers/all" or `Models.getModel()`. */
export declare const getModel: typeof getBuiltinModel;
/** @deprecated Static catalog read. Use `getBuiltinModels` from "@earendil-works/pi-ai/providers/all" or `Models.getModels()`. */
export declare const getModels: typeof getBuiltinModels;
/** @deprecated Static catalog read. Use `getBuiltinProviders` from "@earendil-works/pi-ai/providers/all" or `Models.getProviders()`. */
export declare const getProviders: typeof getBuiltinProviders;
export type ApiStreamFunction = (model: Model<Api>, context: Context, options?: StreamOptions) => AssistantMessageEventStream;
export type ApiStreamSimpleFunction = (model: Model<Api>, context: Context, options?: SimpleStreamOptions) => AssistantMessageEventStream;
export interface ApiProvider<TApi extends Api = Api, TOptions extends StreamOptions = StreamOptions> {
    api: TApi;
    stream: StreamFunction<TApi, TOptions>;
    streamSimple: StreamFunction<TApi, SimpleStreamOptions>;
}
interface ApiProviderInternal {
    api: Api;
    stream: ApiStreamFunction;
    streamSimple: ApiStreamSimpleFunction;
}
export declare function registerApiProvider<TApi extends Api, TOptions extends StreamOptions>(provider: ApiProvider<TApi, TOptions>, sourceId?: string): void;
export declare function getApiProvider(api: Api): ApiProviderInternal | undefined;
export declare function getApiProviders(): ApiProviderInternal[];
export declare function unregisterApiProviders(sourceId: string): void;
export declare function registerFauxProvider(options?: RegisterFauxProviderOptions): FauxProviderRegistration;
/**
 * Registers the builtin API implementations into the api-registry without
 * clobbering existing entries: compat may load after a test or extension has
 * already registered an override for a builtin api id.
 */
export declare function registerBuiltInApiProviders(): void;
export declare function resetApiProviders(): void;
export declare function stream<TApi extends Api>(model: Model<TApi>, context: Context, options?: ProviderStreamOptions): AssistantMessageEventStream;
export declare function complete<TApi extends Api>(model: Model<TApi>, context: Context, options?: ProviderStreamOptions): Promise<AssistantMessage>;
export declare function streamSimple<TApi extends Api>(model: Model<TApi>, context: Context, options?: SimpleStreamOptions): AssistantMessageEventStream;
export declare function completeSimple<TApi extends Api>(model: Model<TApi>, context: Context, options?: SimpleStreamOptions): Promise<AssistantMessage>;
//# sourceMappingURL=compat.d.ts.map