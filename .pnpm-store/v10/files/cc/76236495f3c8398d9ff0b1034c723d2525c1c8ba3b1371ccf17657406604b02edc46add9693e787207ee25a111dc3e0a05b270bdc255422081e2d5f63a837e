import type { ResponseCreateParamsStreaming } from "openai/resources/responses/responses.js";
import type { SimpleStreamOptions, StreamFunction, StreamOptions } from "../types.ts";
export interface OpenAIResponsesOptions extends StreamOptions {
    reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
    reasoningSummary?: "auto" | "detailed" | "concise" | null;
    serviceTier?: ResponseCreateParamsStreaming["service_tier"];
    toolChoice?: ResponseCreateParamsStreaming["tool_choice"];
}
/**
 * Generate function for OpenAI Responses API
 */
export declare const stream: StreamFunction<"openai-responses", OpenAIResponsesOptions>;
export declare const streamSimple: StreamFunction<"openai-responses", SimpleStreamOptions>;
//# sourceMappingURL=openai-responses.d.ts.map