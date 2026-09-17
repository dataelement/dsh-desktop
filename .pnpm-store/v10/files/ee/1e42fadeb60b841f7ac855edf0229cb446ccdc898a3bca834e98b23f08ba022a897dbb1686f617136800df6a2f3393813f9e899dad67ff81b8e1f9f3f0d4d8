import type { SimpleStreamOptions, StreamFunction, StreamOptions } from "../types.ts";
/**
 * Provider-specific options for the Mistral API.
 */
type MistralReasoningEffort = "none" | "high";
export interface MistralOptions extends StreamOptions {
    toolChoice?: "auto" | "none" | "any" | "required" | {
        type: "function";
        function: {
            name: string;
        };
    };
    promptMode?: "reasoning";
    reasoningEffort?: MistralReasoningEffort;
}
/**
 * Stream responses from the native Mistral Chat Completions endpoint.
 */
export declare const stream: StreamFunction<"mistral-conversations", MistralOptions>;
/**
 * Maps provider-agnostic `SimpleStreamOptions` to Mistral options.
 */
export declare const streamSimple: StreamFunction<"mistral-conversations", SimpleStreamOptions>;
export {};
//# sourceMappingURL=mistral-conversations.d.ts.map