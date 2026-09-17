import { type Provider } from "../models.ts";
import type { AssistantMessage, AssistantMessageEventStream, Context, DeferredCancelOptions, DeferredFetchOptions, DeferredHandle, Model, SimpleStreamOptions, StreamFunction, TextContent, ThinkingContent, ToolCall } from "../types.ts";
export interface FauxModelDefinition {
    id: string;
    name?: string;
    reasoning?: boolean;
    input?: ("text" | "image")[];
    cost?: {
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
    };
    contextWindow?: number;
    maxTokens?: number;
}
export type FauxContentBlock = TextContent | ThinkingContent | ToolCall;
export declare function fauxText(text: string): TextContent;
export declare function fauxThinking(thinking: string): ThinkingContent;
export declare function fauxToolCall(name: string, arguments_: ToolCall["arguments"], options?: {
    id?: string;
}): ToolCall;
export declare function fauxAssistantMessage(content: string | FauxContentBlock | FauxContentBlock[], options?: {
    stopReason?: AssistantMessage["stopReason"];
    deferred?: DeferredHandle;
    errorMessage?: string;
    responseId?: string;
    timestamp?: number;
}): AssistantMessage;
export interface FauxProviderState {
    callCount: number;
    deferredFetchCount: number;
    cancelledDeferred: DeferredHandle[];
}
export type FauxResponseFactory = (context: Context, options: SimpleStreamOptions | undefined, state: FauxProviderState, model: Model<string>) => AssistantMessage | Promise<AssistantMessage>;
export type FauxResponseStep = AssistantMessage | FauxResponseFactory;
export interface RegisterFauxProviderOptions {
    api?: string;
    provider?: string;
    models?: FauxModelDefinition[];
    deferred?: {
        /** Number of fetches that return the original handle before the scripted response becomes ready. */
        pendingFetches?: number;
        pollAfterMs?: number;
    };
    tokensPerSecond?: number;
    tokenSize?: {
        min?: number;
        max?: number;
    };
}
export interface FauxProviderRegistration {
    api: string;
    models: [Model<string>, ...Model<string>[]];
    getModel(): Model<string>;
    getModel(modelId: string): Model<string> | undefined;
    state: FauxProviderState;
    setResponses: (responses: FauxResponseStep[]) => void;
    appendResponses: (responses: FauxResponseStep[]) => void;
    getPendingResponseCount: () => number;
    unregister: () => void;
}
export interface FauxProviderHandle {
    provider: Provider;
    api: string;
    models: [Model<string>, ...Model<string>[]];
    getModel(): Model<string>;
    getModel(modelId: string): Model<string> | undefined;
    state: FauxProviderState;
    setResponses: (responses: FauxResponseStep[]) => void;
    appendResponses: (responses: FauxResponseStep[]) => void;
    getPendingResponseCount: () => number;
}
export declare function createFauxCore(options: RegisterFauxProviderOptions): {
    api: string;
    provider: string;
    models: [Model<string>, ...Model<string>[]];
    stream: StreamFunction<string, SimpleStreamOptions>;
    streamSimple: StreamFunction<string, SimpleStreamOptions>;
    fetchDeferred: (requestModel: Model<string>, handle: DeferredHandle, fetchOptions?: DeferredFetchOptions | undefined) => AssistantMessageEventStream;
    cancelDeferred: (requestModel: Model<string>, handle: DeferredHandle, cancelOptions?: DeferredCancelOptions | undefined) => Promise<void>;
    getModel: {
        (): Model<string>;
        (requestedModelId: string): Model<string> | undefined;
    };
    state: FauxProviderState;
    setResponses(responses: FauxResponseStep[]): void;
    appendResponses(responses: FauxResponseStep[]): void;
    getPendingResponseCount(): number;
};
/**
 * Faux provider for tests built on explicit `Models` collections:
 *
 * ```ts
 * const faux = fauxProvider();
 * const models = createModels();
 * models.setProvider(faux.provider);
 * faux.setResponses([fauxAssistantMessage("hi")]);
 * ```
 */
export declare function fauxProvider(options?: RegisterFauxProviderOptions): FauxProviderHandle;
//# sourceMappingURL=faux.d.ts.map