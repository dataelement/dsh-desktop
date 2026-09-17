/**
 * Shared utilities for Google Generative AI and Google Vertex providers.
 */
import { type Content, FinishReason, FunctionCallingConfigMode, type Part } from "@google/genai";
import type { Context, Model, ModelThinkingLevel, StopReason, StreamOptions, ThinkingLevel, Tool } from "../types.ts";
type GoogleApiType = "google-generative-ai" | "google-vertex";
/**
 * Thinking level for Gemini 3 models.
 * Mirrors Google's ThinkingLevel enum values.
 */
export type GoogleApiThinkingLevel = "THINKING_LEVEL_UNSPECIFIED" | "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";
export type ResolvedGoogleThinkingLevel = Exclude<ThinkingLevel, "xhigh" | "max">;
/** Resolve a supported pi level or model-specific Google mapping to a standard Google level. */
export declare function resolveGoogleThinkingLevel<T extends GoogleApiType>(model: Model<T>, level: ModelThinkingLevel): ResolvedGoogleThinkingLevel;
/**
 * Determines whether a streamed Gemini `Part` should be treated as "thinking".
 *
 * Protocol note (Gemini / Vertex AI thought signatures):
 * - `thought: true` is the definitive marker for thinking content (thought summaries).
 * - `thoughtSignature` is an encrypted representation of the model's internal thought process
 *   used to preserve reasoning context across multi-turn interactions.
 * - `thoughtSignature` can appear on ANY part type (text, functionCall, etc.) - it does NOT
 *   indicate the part itself is thinking content.
 * - For non-functionCall responses, the signature appears on the last part for context replay.
 * - When persisting/replaying model outputs, signature-bearing parts must be preserved as-is;
 *   do not merge/move signatures across parts.
 *
 * See: https://ai.google.dev/gemini-api/docs/thought-signatures
 */
export declare function isThinkingPart(part: Pick<Part, "thought" | "thoughtSignature">): boolean;
/**
 * Retain thought signatures during streaming.
 *
 * Some backends only send `thoughtSignature` on the first delta for a given part/block; later deltas may omit it.
 * This helper preserves the last non-empty signature for the current block.
 *
 * Note: this does NOT merge or move signatures across distinct response parts. It only prevents
 * a signature from being overwritten with `undefined` within the same streamed block.
 */
export declare function retainThoughtSignature(existing: string | undefined, incoming: string | undefined): string | undefined;
/**
 * Models via Google APIs that require explicit tool call IDs in function calls/responses.
 */
export declare function requiresToolCallId(modelId: string): boolean;
/**
 * Convert internal messages to Gemini Content[] format.
 */
export declare function convertMessages<T extends GoogleApiType>(model: Model<T>, context: Context): Content[];
/**
 * Convert tools to Gemini function declarations format.
 *
 * By default uses `parametersJsonSchema` which supports full JSON Schema (including
 * anyOf, oneOf, const, etc.). Set `useParameters` to true to use the legacy `parameters`
 * field instead (OpenAPI 3.03 Schema). This is needed for Cloud Code Assist with Claude
 * models, where the API translates `parameters` into Anthropic's `input_schema`.
 */
export declare function convertTools(tools: Tool[], useParameters?: boolean, supportsStrictMode?: boolean): {
    functionDeclarations: Record<string, unknown>[];
}[] | undefined;
/** Gemini 3+ enforces required function parameters in validated tool-calling modes. */
export declare function supportsGoogleStrictToolSampling(modelId: string): boolean;
/** Map tool choice string to Gemini FunctionCallingConfigMode. */
export declare function mapToolChoice(choice: string): FunctionCallingConfigMode;
export declare function resolveGoogleFunctionCallingMode(tools: Tool[], toolChoice: string | undefined, supportsStrictMode: boolean): FunctionCallingConfigMode | undefined;
/**
 * Map Gemini FinishReason to our StopReason.
 */
export declare function mapStopReason(reason: FinishReason): StopReason;
/**
 * Map string finish reason to our StopReason (for raw API responses).
 */
export declare function mapStopReasonString(reason: string): StopReason;
/**
 * Run a Google GenAI SDK request with the shared provider retry policy
 * (408/409/429/5xx with backoff, honoring retry-after), mirroring how the
 * Anthropic and OpenAI adapters wrap their initial request in
 * retryProviderRequest. The SDK's ApiError has a `status` property but no
 * `headers` property, and retryProviderRequest only retries errors that carry
 * both, so normalize the error by adding the missing `headers` before
 * rethrowing.
 */
export declare function retryGoogleRequest<T>(request: () => Promise<T>, options?: Pick<StreamOptions, "maxRetries" | "maxRetryDelayMs" | "signal">): Promise<T>;
export {};
//# sourceMappingURL=google-shared.d.ts.map