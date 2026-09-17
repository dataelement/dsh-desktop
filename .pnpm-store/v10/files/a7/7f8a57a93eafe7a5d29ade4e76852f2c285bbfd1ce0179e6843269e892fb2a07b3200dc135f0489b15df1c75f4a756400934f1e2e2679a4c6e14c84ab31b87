/** Turn-aware trajectory event ledger with a local record inspector. */
import type { AssistantRequestConfig, RenderMessageImages } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { TrajectoryCellProps } from './trajectory-record.ts';
import type { TrajectoryTurnModel } from './layout.ts';
import type { TrajectoryTranslate } from './locales.ts';
/** Props for the trajectory ledger. */
export interface TrajectoryTableProps {
    /** Trajectory locale seat. */
    t: TrajectoryTranslate;
    /** Slot-backed durable image renderer shared with the Chat gallery. */
    renderImages: RenderMessageImages;
    /** Session-global request numbers for the request groups visible in this context. */
    requestNumbers?: readonly TrajectoryRequestNumber[];
    /** Grouped records in display order. */
    turns: readonly TrajectoryTurnModel[];
    /** In-flight cells whose content replaces the matching structural record index. */
    streamingCells?: readonly TrajectoryCellProps[];
    /** Record indexes emphasized by the active timeline focus. */
    timelineFocusIndexes?: ReadonlySet<number> | null;
    /** Record indexes retained by the active live search, or null without a query. */
    searchMatchIndexes?: ReadonlySet<number> | null;
    /** Report the record currently selected in the local inspector. */
    onSelectedIndexChange?: (index: number | null) => void;
    /** Report a direct user selection from a ledger row. */
    onRecordSelect?: (index: number) => void;
    /** One externally requested record selection; a new object repeats the request. */
    recordSelection?: {
        readonly index: number;
    } | null;
    /** One externally requested record focus without changing inspector selection. */
    recordFocus?: {
        readonly index: number;
    } | null;
    /** Whether the initial history tail is still loading. */
    historyLoading?: boolean;
    /** Whether one older history page request is pending anywhere. */
    olderHistoryLoading?: boolean;
    /** First loaded raw event, used to preserve scroll position after prepending a page. */
    historyStartSeq?: number | undefined;
    /** Whether one older history page can be requested. */
    hasOlderRecords?: boolean;
    /** Load one older history page. */
    onLoadOlder?: () => Promise<boolean>;
    /** Clear selection state owned by the ledger host. */
    onClearSelection?: () => void;
    /** Turn ids whose rows after the first are folded into a summary. */
    collapsedTurns: ReadonlySet<number>;
    /** Toggle one turn between folded and expanded. */
    onToggleTurn: (turn: number) => void;
    /** Stable Assistant record ids whose tool calls are folded. */
    collapsedAssistants: ReadonlySet<string>;
    /** Toggle tool calls under one assistant record. */
    onToggleAssistant: (id: string) => void;
    /** One-shot cross-view inspect: open and scroll to this call's record. */
    inspectCallId?: string | null;
    /** Acknowledge a consumed (or unresolvable) inspect request. */
    onInspectApplied?: (() => void) | undefined;
}
/** Request-inspector fields shared by ordinary generation and compaction. */
interface TrajectoryRequestNumberBase {
    group: string;
    number: number;
    status?: 'complete' | 'running' | 'error';
    startedAt?: number;
    completedAt?: number | null;
    error?: string;
    errorCode?: string;
    retry?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    resultSeq?: number;
    provider?: string;
    model?: string;
    requestConfig?: AssistantRequestConfig;
    usage?: TrajectoryUsage;
    cumulativeUsage?: TrajectoryUsage;
}
/** One purpose-discriminated request identity paired with its session-global number. */
export type TrajectoryRequestNumber = TrajectoryRequestNumberBase & ({
    purpose?: 'assistant';
    /** Request anchor event sequence; absent for the currently streaming request. */
    seq?: number;
    turn: number;
    step: number;
} | {
    purpose: 'compaction';
    /** Request anchor event sequence and stable compaction identity. */
    seq: number;
    turn: number | null;
    step: 0;
});
/** Disjoint provider token buckets for one request or a session prefix. */
export interface TrajectoryUsage {
    input?: number;
    cacheRead?: number;
    cacheWrite?: number;
    output?: number;
    reasoning?: number;
}
/**
 * Render trajectory events as a dense ledger with turn and step separators.
 * Clicking ledger whitespace clears the active record or request selection.
 * @param props - Grouped trajectory data and whole-ledger fold state.
 * @returns The ledger and an optional local record inspector.
 */
export declare function TrajectoryTable({ t, renderImages, requestNumbers: sessionRequestNumbers, turns, streamingCells, timelineFocusIndexes, searchMatchIndexes, onSelectedIndexChange, onRecordSelect, recordSelection, recordFocus, historyLoading, olderHistoryLoading, historyStartSeq, hasOlderRecords, onLoadOlder, onClearSelection, collapsedTurns, onToggleTurn, collapsedAssistants, onToggleAssistant, inspectCallId, onInspectApplied, }: TrajectoryTableProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=TrajectoryTable.d.ts.map