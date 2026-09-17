import type { Tool as OpenAITool, ResponseCreateParamsStreaming, ResponseInput, ResponseStreamEvent } from "openai/resources/responses/responses.js";
import type { Api, AssistantMessage, Context, Model, Tool, Usage } from "../types.ts";
import type { AssistantMessageEventStream } from "../utils/event-stream.ts";
export interface OpenAIResponsesStreamOptions {
    serviceTier?: ResponseCreateParamsStreaming["service_tier"];
    grammarToolInputProperties?: ReadonlyMap<string, string>;
    resolveServiceTier?: (responseServiceTier: ResponseCreateParamsStreaming["service_tier"] | undefined, requestServiceTier: ResponseCreateParamsStreaming["service_tier"] | undefined) => ResponseCreateParamsStreaming["service_tier"] | undefined;
    applyServiceTierPricing?: (usage: Usage, serviceTier: ResponseCreateParamsStreaming["service_tier"] | undefined) => void;
}
export interface ConvertResponsesMessagesOptions {
    includeSystemPrompt?: boolean;
    grammarToolInputProperties?: ReadonlyMap<string, string>;
    deferredTools?: ReadonlyMap<string, Tool>;
    deferredToolsMode?: "additional-tools" | "tool-search";
    toolOptions?: ConvertResponsesToolsOptions;
}
export interface ConvertResponsesToolsOptions {
    strict?: boolean | null;
    supportsStrictMode?: boolean;
    supportsOpenAIGrammarTools?: boolean;
    deferLoading?: boolean;
}
export declare function convertResponsesMessages<TApi extends Api>(model: Model<TApi>, context: Context, allowedToolCallProviders: ReadonlySet<string>, options?: ConvertResponsesMessagesOptions): ResponseInput;
export declare function convertResponsesTools(tools: readonly Tool[], options?: ConvertResponsesToolsOptions): OpenAITool[];
export declare function processResponsesStream<TApi extends Api>(openaiStream: AsyncIterable<ResponseStreamEvent>, output: AssistantMessage, stream: AssistantMessageEventStream, model: Model<TApi>, options?: OpenAIResponsesStreamOptions): Promise<void>;
//# sourceMappingURL=openai-responses-shared.d.ts.map