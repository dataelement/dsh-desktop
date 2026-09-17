/** Configuration resolution for deterministic tool-result pruning. */
import type { ResolvedConfig, ToolResultPruneConfig } from './types.ts';
/** Fixed marker substituted for every removed middle span. */
export declare const PRUNE_MARKER = "\n\n[... tool result middle pruned ...]\n\n";
/** Low-friction defaults for coding-agent tool output. */
export declare const DEFAULTS: ResolvedConfig;
/**
 * Count Unicode code points without splitting surrogate pairs.
 * @param text - text to measure.
 * @returns the Unicode code-point count.
 */
export declare function codePointLength(text: string): number;
/**
 * Resolve and validate pruning budgets.
 * @param config - raw plugin configuration.
 * @returns a detached deeply immutable configuration.
 */
export declare function resolveConfig(config?: ToolResultPruneConfig): ResolvedConfig;
//# sourceMappingURL=config.d.ts.map