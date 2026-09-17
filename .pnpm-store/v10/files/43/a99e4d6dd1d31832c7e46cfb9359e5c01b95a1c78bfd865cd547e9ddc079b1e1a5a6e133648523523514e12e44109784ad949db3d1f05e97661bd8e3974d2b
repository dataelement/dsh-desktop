/** Operation-sequence and recorded-time projections for the trajectory overview. */
import type { TrajectoryTurnModel } from './layout.ts';
import type { TrajectoryTranslate } from './locales.ts';
import type { TrajectoryCellKind } from './trajectory-record.ts';
/** Horizontal projection used by the trajectory timeline. */
export type TrajectoryTimelineMode = 'sequence' | 'duration' | 'time' | 'actual';
/** Inclusive selection in the active timeline projection's domain. */
export interface TrajectoryTimeRange {
    start: number;
    end: number;
}
/** One ledger record projected into the active timeline domain. */
export interface TrajectoryTimelineSpan extends TrajectoryTimeRange {
    index: number;
    isError: boolean;
    kind: TrajectoryCellKind;
    label: string;
    lane: number;
}
/** One turn boundary in the active timeline domain. */
export interface TrajectoryTimelineTurnBoundary {
    turn: number;
    time: number;
}
/** Full-domain model used by the overview. */
export interface TrajectoryTimelineModel extends TrajectoryTimeRange {
    spans: readonly TrajectoryTimelineSpan[];
    turnBoundaries: readonly TrajectoryTimelineTurnBoundary[];
}
/**
 * Format a timeline duration as an integer-millisecond label.
 * @param milliseconds - Non-negative duration in milliseconds.
 * @param t - Trajectory locale translator.
 * @returns Millisecond label with thousands separators.
 */
export declare function formatTimelineOffset(milliseconds: number, t: TrajectoryTranslate): string;
/**
 * Project every visible record into a stable three-lane timeline.
 * @param turns - Unfiltered trajectory layout.
 * @param mode - Independent equal/recorded duration and compressed/complete time projection.
 * @returns Timeline model, or `null` when no record is visible.
 */
export declare function deriveTrajectoryTimeline(turns: readonly TrajectoryTurnModel[], mode?: TrajectoryTimelineMode): TrajectoryTimelineModel | null;
/**
 * Identify records active at any point inside an inclusive selected interval.
 * @param turns - Unfiltered trajectory layout.
 * @param range - Selected interval in the active projection.
 * @param mode - Independent equal/recorded duration and compressed/complete time projection.
 * @returns Record indexes inside the focus interval.
 */
export declare function trajectoryTimelineFocusIndexes(turns: readonly TrajectoryTurnModel[], range: TrajectoryTimeRange, mode?: TrajectoryTimelineMode): ReadonlySet<number>;
//# sourceMappingURL=timeline.d.ts.map