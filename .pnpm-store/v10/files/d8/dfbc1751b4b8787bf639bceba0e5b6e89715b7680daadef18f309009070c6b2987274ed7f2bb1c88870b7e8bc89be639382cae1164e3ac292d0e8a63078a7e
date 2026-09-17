import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots';
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client';
import type { ChatViewSlotProps } from '../contract/slots.ts';
import type { ChatSnapshot } from '../contract/snapshot.ts';
interface WindowStats {
    turns: number;
    steps: number;
    /** Summed request wall time (step/start → assistant/message); 0 when no node carries timing. */
    llmMs: number;
    /** Summed tool wall time (tool/call → tool/result); 0 when no pair is in-window. */
    toolMs: number;
    /** Summed first-token latency over `ttftSteps`; 0 when no step records it. */
    ttftMs: number;
    /** Steps carrying a recorded TTFT. */
    ttftSteps: number;
    /** Summed decode wall time over steps that also report output tokens. */
    decodeMs: number;
    /** Summed output tokens over the same decode-timed steps. */
    decodeTokens: number;
}
/**
 * Fold assistant and tool-result nodes into window-scoped display totals —
 * the FALLBACK for assemblies without the `sessionStats` projection.
 *
 * Every displayed figure rides that durable whole-log projection (and token
 * accounting rides `tokenUsage`) because the window is paged and compaction
 * rewrites it; this fold answers "what is on screen" only when no projection
 * value is served. Its field names deliberately mirror the projection's so
 * the two swap wholesale.
 * @param nodes - snapshot nodes.
 * @returns fallback counts and summed wall times.
 */
export declare function deriveStats(nodes: ChatSnapshot['legacy']['nodes']): WindowStats;
/**
 * Compact duration: 45.2s under a minute, 2m42s from there on.
 * @param ms - duration in milliseconds.
 * @returns display string.
 */
export declare function formatDuration(ms: number, t: ChatViewSlotProps['t']): string;
/**
 * Display-ready cache-hit share of prompt-side input over the whole durable log.
 * @param usage - the session's token-usage projection value.
 * @returns integer text when integer rounding stays below 100, otherwise the
 * minimum decimal precision that still rounds below 100; a full hit returns
 * 100, and no billed input returns null.
 */
export declare function cacheHitPercent(usage: TokenUsageProjection): string | null;
/**
 * Sum the three disjoint prompt-side billing buckets.
 * @param usage - the session's token-usage projection value.
 * @returns billed input tokens.
 */
export declare function billedInputTokens(usage: TokenUsageProjection): number;
/** Props: the conversation-snapshot selector plus the projection read seat. */
export interface StatsPillsProps {
    useChat: SnapshotSelectorHook<ChatSnapshot>;
    useProjection: UseProjection;
    /** The owning dock's locale seat. */
    t: ChatViewSlotProps['t'];
}
export declare const StatsPills: import("react").MemoExoticComponent<({ useChat, useProjection, t }: StatsPillsProps) => import("react").JSX.Element | null>;
export {};
//# sourceMappingURL=StatsPills.d.ts.map