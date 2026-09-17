import type { Context, ImageContent, Message, TextContent, Usage } from "../types.ts";
export interface ContextUsageEstimate {
    /** Estimated total context tokens. */
    tokens: number;
    /** Tokens reported by the most recent applicable assistant usage block. */
    usageTokens: number;
    /** Estimated tokens after the most recent applicable assistant usage block. */
    trailingTokens: number;
    /** Index of the applicable message that provided usage, or null when none exists. */
    lastUsageIndex: number | null;
}
export declare function calculateContextTokens(usage: Usage): number;
export declare function estimateTextTokens(text: string): number;
export declare function estimateTextAndImageContentTokens(content: string | Array<TextContent | ImageContent>): number;
export declare function estimateMessageTokens(message: Message): number;
export declare function estimateContextTokens(context: Context | readonly Message[]): ContextUsageEstimate;
//# sourceMappingURL=estimate.d.ts.map