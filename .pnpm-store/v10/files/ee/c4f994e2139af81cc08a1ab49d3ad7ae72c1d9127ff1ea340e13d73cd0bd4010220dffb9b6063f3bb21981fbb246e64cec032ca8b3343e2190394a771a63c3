/**
 * Merge matched hooks into one most-restrictive outcome. Permission precedence
 * is `deny > ask > allow`; the first `continue:false` stop is sticky; reasons
 * for the winning rank are joined; and context and system messages accumulate
 * in hook order.
 * @module @deepseek-ai/dsh-hook-protocol/merge
 */
import type { HookOutput } from './types.ts';
/** The single decision a hook point resolves to after merging all matched hooks. */
export type MergedDecision = 'allow' | 'ask' | 'deny' | 'none';
/** The folded outcome of every hook that matched one point. */
export interface MergedHookOutcome {
    /**
     * The most-restrictive permission decision across all hooks (`deny` > `ask` >
     * `allow`), or `none` when no hook expressed one. `block`/`deny` both fold to
     * `deny`; `approve`/`allow` both fold to `allow`.
     */
    decision: MergedDecision;
    /** Joined (`\n\n`) reasons from every blocking/denying hook, or `undefined`. */
    reason?: string;
    /** `true` when any hook asked to halt (`continue:false`). */
    stop: boolean;
    /** The first halting hook's `stopReason`, when one halted. */
    stopReason?: string;
    /** Every hook's `additionalContext`, in hook order (no joining — the bridge decides). */
    additionalContext: string[];
    /** Every hook's `systemMessage`, in hook order. */
    systemMessages: string[];
}
/**
 * Fold `outputs` (the results of every hook that matched a point, in hook order)
 * into one {@link MergedHookOutcome} by the precedence rules above. An empty list
 * yields a neutral outcome (`decision: 'none'`, no stop, empty context) — the
 * caller treats that as "no hook had anything to say".
 * @param outputs - every matched hook's decoded output, in hook order.
 * @returns the single folded outcome the bridge maps onto its extension point.
 */
export declare function mergeHookOutputs(outputs: HookOutput[]): MergedHookOutcome;
//# sourceMappingURL=merge.d.ts.map