import type { SimpleStreamOptions, StreamFunction, StreamOptions, ThinkingBudgets, ThinkingLevel } from "../types.ts";
export type BedrockThinkingDisplay = "summarized" | "omitted";
export interface BedrockOptions extends StreamOptions {
    region?: string;
    profile?: string;
    toolChoice?: "auto" | "any" | "none" | {
        type: "tool";
        name: string;
    };
    reasoning?: ThinkingLevel;
    thinkingBudgets?: ThinkingBudgets;
    interleavedThinking?: boolean;
    /**
     * Controls how Claude's thinking content is returned in responses.
     * - "summarized": Thinking blocks contain summarized thinking text (default here).
     * - "omitted": Thinking content is redacted but the signature still travels back
     *   for multi-turn continuity, reducing time-to-first-text-token.
     *
     * Note: Anthropic's API default for Claude Opus 4.8 and Mythos Preview is
     * "omitted". We default to "summarized" here to keep behavior consistent with
     * older Claude 4 models. Only applies to Claude models on Bedrock.
     */
    thinkingDisplay?: BedrockThinkingDisplay;
    /** Key-value pairs attached to the inference request for cost allocation tagging.
     * Keys: max 64 chars, no `aws:` prefix. Values: max 256 chars. Max 50 pairs.
     * Tags appear in AWS Cost Explorer split cost allocation data.
     * @see https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html */
    requestMetadata?: Record<string, string>;
    /** Bearer token for Bedrock API key authentication.
     * When set, bypasses SigV4 signing and sends Authorization: Bearer <token> instead.
     * Requires `bedrock:CallWithBearerToken` IAM permission on the token's identity.
     * Set via AWS_BEARER_TOKEN_BEDROCK env var or pass directly.
     * @see https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonbedrock.html */
    bearerToken?: string;
}
export declare const stream: StreamFunction<"bedrock-converse-stream", BedrockOptions>;
export declare const streamSimple: StreamFunction<"bedrock-converse-stream", SimpleStreamOptions>;
//# sourceMappingURL=bedrock-converse-stream.d.ts.map