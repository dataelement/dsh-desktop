import type { SessionEvent } from '@deepseek-ai/dsh-session/types';
/** One provider/model route that contributed a billed request attempt. */
export interface TurnTokenUsageRoute {
    readonly provider: string;
    readonly model: string;
}
/** Exact provider-reported token accounting for every attempt in one completed Turn. */
export interface TurnTokenUsage {
    /** Sum of uncached prompt input across all attempts. */
    readonly uncachedInputTokens: number;
    readonly outputTokens: number;
    /** Exact aggregate prompt plus output total across all attempts. */
    readonly totalTokens: number;
    /** Present only when every attempt reported the bucket. */
    readonly cacheReadTokens?: number;
    /** Present only when every attempt reported the bucket. */
    readonly cacheWriteTokens?: number;
    /** Output subset, present only when every attempt reported it. */
    readonly reasoningTokens?: number;
    /** Present only when every billed attempt has provider/model attribution. */
    readonly routes?: readonly TurnTokenUsageRoute[];
}
/**
 * Fold one complete Turn's durable attempt lifecycle into exact token accounting.
 *
 * No attempt is inferred from a usage sample. Any missing lifecycle boundary,
 * incomplete attempt usage, unsafe count, or contradictory exact total makes
 * the whole disclosure unavailable.
 * @param events - Turn-local durable events from `turn/start` through `turn/end`.
 * @returns exact aggregate usage, or undefined when it cannot be proven.
 */
export declare function deriveTurnTokenUsage(events: readonly SessionEvent[]): TurnTokenUsage | undefined;
//# sourceMappingURL=turn-usage.d.ts.map