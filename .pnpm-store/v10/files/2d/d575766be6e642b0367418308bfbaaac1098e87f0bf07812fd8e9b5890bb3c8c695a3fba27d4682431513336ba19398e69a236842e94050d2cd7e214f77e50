/**
 * Default one-shot summarization and durable checkpoint framing.
 *
 * @module @deepseek-ai/dsh-compaction-basic/summarizer
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ContentBlock, Message, TokenUsage, ToolSchema } from '@deepseek-ai/dsh-llm';
import type { Agent } from '@deepseek-ai/dsh-agent';
interface SummaryConfig {
    readonly summarizationProvider: string;
    readonly summarizationModel: string;
    readonly maxTokens: number;
}
/**
 * The replayed conversation surface the summarizer condenses. Reproducing the
 * last routed request's system prompt, tools, and leading messages verbatim
 * lets the auxiliary call reuse the provider's warm prefix cache; the trailing
 * compaction instruction is then the only novel input.
 */
export interface SummarizationInput {
    /** The conversation's tool schemas, reused for prefix-cache alignment; absent when the request carried none. */
    readonly tools?: readonly ToolSchema[];
    /** The derived system head, when present, followed by the shadowed region in surface order. */
    readonly messages: readonly Message[];
}
/** Safe summary content plus the exact auxiliary call envelope recorded with it. */
export type SummaryResult = {
    summary: ContentBlock[];
    provider: string;
    model: string;
    maxTokens?: number;
    /** Provider-reported usage for this summarization request. */
    usage?: TokenUsage;
} & ({
    /** Complete provider output before the text-only summary projection. */
    rawOutput: ContentBlock[];
    /** Identifies exactly one call through this context's `ctx.llm.stream()`. */
    llmStreamCall: true;
} | {
    /** Optional complete output from an unmarked template, remote, or other summarizer. */
    rawOutput?: ContentBlock[];
    /** An unmarked result does not identify a call through this context's LLM seam. */
    llmStreamCall?: never;
});
/**
 * Run the default cache-reusing `ctx.llm.stream()` summarization call: replay
 * the conversation prefix, then append the compaction instruction as the final
 * user message so the provider's warm prefix cache is reused.
 * @param ctx - context providing the LLM service.
 * @param config - resolved backend configuration.
 * @param input - replayed conversation prefix (system, tools, and leading messages) to condense.
 * @param agent - supplies routed-model history, fallback model, and session id.
 * @param signal - optional cancellation forwarded to the adapter.
 * @returns safe text-only summary blocks and the exact call envelope and output.
 */
export declare function summarizeWithLlm(ctx: Context, config: SummaryConfig, input: SummarizationInput, agent: Agent, signal?: AbortSignal): Promise<SummaryResult>;
/**
 * Wrap raw summary blocks in the durable checkpoint framing.
 * @param summary - safe text-only model output.
 * @returns content for the synthesized replacement user message.
 */
export declare function frameSummary(summary: readonly ContentBlock[]): ContentBlock[];
export {};
//# sourceMappingURL=summarizer.d.ts.map