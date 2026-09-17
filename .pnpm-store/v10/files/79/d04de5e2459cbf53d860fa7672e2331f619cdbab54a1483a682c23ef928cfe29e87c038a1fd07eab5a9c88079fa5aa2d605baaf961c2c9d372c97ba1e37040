/**
 * Replay-safe, model-free tool-result pruning service.
 *
 * @module @deepseek-ai/dsh-compaction-tool-result-pruner
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
import type { Session } from '@deepseek-ai/dsh-session';
import type { PruneResult, ResolvedConfig, ToolResultPruneConfig } from './types.ts';
export { codePointLength, DEFAULTS, PRUNE_MARKER, resolveConfig } from './config.ts';
export type { PrunedEntry, PruneResult, ResolvedConfig, ToolResultPruneConfig, } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        toolResultPruner: ToolResultPruner;
    }
}
/** Deterministic head/middle/tail pruning for current tool-result surface nodes. */
export declare class ToolResultPruner extends Service {
    static inject: string[];
    static Config: z<ToolResultPruneConfig>;
    /** Resolved and immutable character budgets. */
    readonly config: ResolvedConfig;
    constructor(ctx: Context, config?: ToolResultPruneConfig);
    /**
     * Measure text content in Unicode code points; non-text blocks cost zero.
     * @param blocks - tool-result content to measure.
     * @returns total Unicode code points across text blocks.
     */
    measureContent(blocks: readonly ContentBlock[]): number;
    /**
     * Replace an over-budget text middle while retaining rich-block order.
     * Text slicing is by Unicode code point, not UTF-16 code unit, so a retained
     * boundary cannot split a surrogate pair. Grapheme clusters may still split.
     * @param blocks - original tool-result content.
     * @returns pruned content, or `null` when the text is within budget.
     */
    pruneContent(blocks: readonly ContentBlock[]): ContentBlock[] | null;
    /**
     * Prune every over-budget tool result from one stable current-surface snapshot.
     * Each replacement preserves the complete event data except for `content`,
     * cites the shadowed node so replay can recover the replacement input, and is
     * immediately preceded by a `compaction/prune` shadow-price event pricing the
     * shadowed node through the injected token meter, so pure consumers can
     * subtract it without per-node state.
     * @param session - session whose current surface is rewritten.
     * @returns landed replacements and aggregate Unicode-code-point savings.
     * @throws when the session rejects a replacement; replacements committed
     * earlier in the pass remain durable.
     */
    pruneSession(session: Session): PruneResult;
}
export default ToolResultPruner;
//# sourceMappingURL=index.d.ts.map