import Anthropic from "@anthropic-ai/sdk";
import type { SimpleStreamOptions, StreamFunction, StreamOptions } from "../types.ts";
export type AnthropicEffort = "low" | "medium" | "high" | "xhigh" | "max";
export type AnthropicThinkingDisplay = "summarized" | "omitted";
export interface AnthropicOptions extends StreamOptions {
    /**
     * Enable extended thinking.
     * For adaptive thinking models: the model decides when/how much to think.
     * For older models: uses budget-based thinking with thinkingBudgetTokens.
     * Default: undefined (thinking is omitted unless `streamSimple()` maps
     * a simple reasoning level to this option, or callers set it explicitly).
     */
    thinkingEnabled?: boolean;
    /**
     * Token budget for extended thinking (older models only).
     * Ignored for adaptive thinking models.
     * Default: 1024 when `thinkingEnabled` is true and no budget is provided.
     */
    thinkingBudgetTokens?: number;
    /**
     * Effort level for adaptive thinking models.
     * Controls how much thinking Claude allocates:
     * - "max": Always thinks with no constraints (Opus 4.6 only)
     * - "xhigh": Highest reasoning level (Opus 4.7+, Fable 5)
     * - "high": Always thinks, deep reasoning
     * - "medium": Moderate thinking, may skip for simple queries
     * - "low": Minimal thinking, skips for simple tasks
     * Ignored for older models.
     * Default: omitted unless `streamSimple()` maps a simple reasoning
     * level to this option.
     */
    effort?: AnthropicEffort;
    /**
     * Controls how thinking content is returned in API responses.
     * - "summarized": Thinking blocks contain summarized thinking text.
     * - "omitted": Thinking blocks return an empty thinking field; the encrypted
     *   signature still travels back for multi-turn continuity. Use for faster
     *   time-to-first-text-token when your UI does not surface thinking.
     *
     * Note: Anthropic's API default for Claude Opus 4.7 and Claude Mythos Preview
     * is "omitted". We default to "summarized" here to keep behavior consistent
     * with older Claude 4 models. Set this explicitly to "omitted" to opt in.
     * Default: "summarized" when thinking is enabled.
     */
    thinkingDisplay?: AnthropicThinkingDisplay;
    /**
     * Whether to request the interleaved thinking beta header for non-adaptive
     * thinking models. Adaptive thinking models have interleaved thinking built in,
     * so the header is skipped for them regardless of this setting.
     * Default: true.
     */
    interleavedThinking?: boolean;
    /**
     * Anthropic tool choice behavior. String values map to Anthropic's built-in
     * choices; `{ type: "tool", name }` forces a specific tool.
     * Default: omitted (Anthropic default behavior, currently equivalent to auto).
     */
    toolChoice?: "auto" | "any" | "none" | {
        type: "tool";
        name: string;
    };
    /**
     * Pre-built Anthropic client instance. When provided, skips internal client
     * construction entirely. Use this to inject alternative SDK clients such as
     * `AnthropicVertex` that shares the same messaging API.
     */
    client?: Anthropic;
}
export declare const stream: StreamFunction<"anthropic-messages", AnthropicOptions>;
export declare const streamSimple: StreamFunction<"anthropic-messages", SimpleStreamOptions>;
//# sourceMappingURL=anthropic-messages.d.ts.map