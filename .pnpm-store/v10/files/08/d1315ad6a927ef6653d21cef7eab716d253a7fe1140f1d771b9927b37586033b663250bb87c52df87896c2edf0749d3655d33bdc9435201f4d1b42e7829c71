import type { ResponseCreateParamsStreaming } from "openai/resources/responses/responses.js";
import type { SimpleStreamOptions, StreamFunction, StreamOptions } from "../types.ts";
export interface AzureOpenAIResponsesOptions extends StreamOptions {
    reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
    toolChoice?: ResponseCreateParamsStreaming["tool_choice"];
    reasoningSummary?: "auto" | "detailed" | "concise" | null;
    azureApiVersion?: string;
    azureResourceName?: string;
    azureBaseUrl?: string;
    azureDeploymentName?: string;
}
/**
 * Generate function for Azure OpenAI Responses API
 */
export declare const stream: StreamFunction<"azure-openai-responses", AzureOpenAIResponsesOptions>;
export declare const streamSimple: StreamFunction<"azure-openai-responses", SimpleStreamOptions>;
//# sourceMappingURL=azure-openai-responses.d.ts.map