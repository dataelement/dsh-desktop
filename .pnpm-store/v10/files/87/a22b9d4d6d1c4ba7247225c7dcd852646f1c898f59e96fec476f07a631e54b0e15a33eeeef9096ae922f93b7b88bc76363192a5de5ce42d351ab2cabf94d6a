/**
 * Basic replay-aware compaction backend.
 *
 * @module @deepseek-ai/dsh-compaction-basic
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { CompactionEngine } from '@deepseek-ai/dsh-compaction';
import type { CompactionResult, CompactionTrigger } from '@deepseek-ai/dsh-compaction';
import type { SessionSeq } from '@deepseek-ai/dsh-session';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { CommandId } from '@deepseek-ai/dsh-commands/brand';
import type { SummarizationInput, SummaryResult } from './summarizer.ts';
import type { BasicCompactionConfig, ResolvedConfig } from './types.ts';
export type { BasicCompactionConfig, CompactionPolicyConfig, ModelCompactPolicyConfig, ResolvedCompactSpec, ResolvedConfig, ResolvedRetention, ResolvedTargetPolicy, } from './types.ts';
/**
 * Dependency-light compaction backend using `ctx.tokenMeter` for pressure,
 * retention, cited source events, and summary-convergence pricing.
 *
 * `summarize()` is the sole subclass customization hook; the replay and durable
 * mutation strategy stays fixed so every pricing decision uses the singleton
 * token meter.
 */
export declare class BasicCompactionEngine extends CompactionEngine {
    static inject: string[];
    static Config: z<BasicCompactionConfig>;
    /** Resolved and validated compaction configuration. */
    readonly config: ResolvedConfig;
    private readonly warnedPressureConfigTargets;
    private readonly overflowRetries;
    private readonly overflowAgents;
    constructor(ctx: Context, config?: BasicCompactionConfig);
    /**
     * Register automatic between-step pressure and model-request overflow
     * recovery. `compactIfNeeded` stays dynamically dispatched so subclass
     * overrides are honored at event time.
     */
    private _registerAutomaticCompaction;
    /**
     * Summarize the replayed conversation region through a direct one-shot
     * `ctx.llm.stream()` call whose prefix reuses the conversation's own system
     * prompt, tools, and messages so the provider's KV cache is not invalidated.
     * Override this sole hook for a template or remote summarizer.
     * @param input - replayed conversation prefix (system, tools, and leading messages) to condense.
     * @param agent - supplies routed-model history, fallback model, and session id.
     * @param signal - optional cancellation forwarded to the adapter.
     * @returns safe text summary blocks and the exact auxiliary call envelope and output.
     */
    protected summarize(input: SummarizationInput, agent: Agent, signal?: AbortSignal): Promise<SummaryResult>;
    /**
     * Compact for replayed step-boundary pressure or one provider-confirmed context
     * overflow. Both triggers price the latest durable routed request envelope;
     * overflow bypasses the normal threshold and retained-tail policy so it can
     * force one useful balanced reduction.
     * @param agent - agent whose latest durable routed request is measured.
     * @param trigger - normal step-boundary pressure or context-overflow recovery.
     * @param signal - live turn cancellation signal forwarded to summarization.
     * @returns the latest summary compaction result, or `null` when no summary ran.
     */
    compactIfNeeded(agent: Agent, trigger: CompactionTrigger, signal: AbortSignal): Promise<CompactionResult | null>;
    /**
     * Compact one inclusive positional range from the agent-owned surface using
     * the effective token meter for all retention and shrink pricing.
     * @param start - inclusive first surface-node seq.
     * @param end - inclusive last surface-node seq.
     * @param agent - owner of the target session, used by the summarizer.
     * @param signal - optional summarization cancellation signal.
     * @returns the successful durable compaction result.
     */
    compactRegion(start: SessionSeq, end: SessionSeq, agent: Agent, signal?: AbortSignal): Promise<CompactionResult>;
    /**
     * Force one useful idle-session compaction below the pressure threshold, and
     * resolve only after its standalone marker pair is durably checkpointed.
     * @param agent - idle agent whose next-turn admission this call reserves.
     * @param signal - cancellation scoped to this compaction request.
     * @param sourceCommandId - initiating command identity for presentation correlation.
     * @returns the committed result, or `null` when no safe useful range exists.
     */
    compactNow(agent: Agent, signal: AbortSignal, sourceCommandId?: CommandId): Promise<CompactionResult | null>;
    /** Bind the effective token meter and dynamically dispatched summarizer hook. */
    private regionDependencies;
}
export default BasicCompactionEngine;
//# sourceMappingURL=index.d.ts.map