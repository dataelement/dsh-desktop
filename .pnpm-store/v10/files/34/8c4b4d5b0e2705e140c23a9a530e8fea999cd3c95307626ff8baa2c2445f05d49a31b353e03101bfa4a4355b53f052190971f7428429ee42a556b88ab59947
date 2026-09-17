import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SessionProjectionMap } from '@deepseek-ai/dsh-session-projection/types';
import type { SessionSummary } from '../../types.ts';
/** Host list summary enriched with the latest Session Controller title projection. */
export interface TitledSessionSummary extends SessionSummary {
    title?: string;
    /** Current host-computed projection values for list consumers. */
    projectionValues?: Readonly<Partial<SessionProjectionMap>>;
}
/** One flattened session-list row with lineage depth. */
export interface SessionListEntry {
    sessionId: SessionId;
    title?: string;
    updatedAt: number;
    running: boolean;
    /** Empty-log bit mirrored from the summary; lists hide blank sessions (filtering stays with the consumer). */
    blank: boolean;
    parentSessionId?: SessionId;
    /** Coarse durable origin for navigation filtering; not a continuation capability. */
    origin?: 'subagent';
    cwd?: string;
    /** Current host-computed projection values for list consumers. */
    projectionValues?: Readonly<Partial<SessionProjectionMap>>;
    /** Finished running while not selected and not yet opened — the sidebar's green "done" reminder (clears on select or the next run). */
    completed: boolean;
    /** Lineage indent depth: root = 0; the UI just multiplies by the indent width. */
    depth: number;
}
/**
 * Summaries -> flat list with lineage indentation. Root and sibling order
 * follows the established input order; this projection never re-sorts a
 * hydrated list from mutable timestamps.
 * @param summaries - the host's session.list items.
 * @param completed - sessions with a pending completion reminder (manager-owned live fact; absent = false).
 * @returns display rows in render order.
 */
export declare function flattenLineage(summaries: readonly TitledSessionSummary[], completed?: ReadonlySet<SessionId>): SessionListEntry[];
//# sourceMappingURL=lineage.d.ts.map