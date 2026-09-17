/** Chrome-Network-style overview timeline for focusing the trajectory ledger. */
import type { TrajectoryTurnModel } from './layout.ts';
import type { TrajectoryTranslate } from './locales.ts';
import { type TrajectoryTimelineMode, type TrajectoryTimeRange } from './timeline.ts';
/** Props for the fixed full-domain overview above the trajectory ledger. */
export interface TrajectoryTimelineProps {
    t: TrajectoryTranslate;
    turns: readonly TrajectoryTurnModel[];
    mode: TrajectoryTimelineMode;
    range: TrajectoryTimeRange | null;
    /** Whether the loaded timeline omits an earlier history prefix. */
    hasEarlierRecords?: boolean;
    /** Load one earlier history page from the truncation control. */
    onLoadEarlier?: () => Promise<boolean>;
    selectedIndex?: number | null;
    /** Record indexes matching the active ledger search, or null without a query. */
    searchMatchIndexes?: ReadonlySet<number> | null;
    onRangeChange: (range: TrajectoryTimeRange | null) => void;
    /** Select a directly clicked timeline block. */
    onRecordSelect?: (index: number) => void;
    /** Bring the nearest record into view after clicking timeline whitespace. */
    onRecordFocus?: (index: number) => void;
}
/** Overview renderer with drag ranges, click-sized focus, and Escape reset. */
export declare const TrajectoryTimeline: import("react").MemoExoticComponent<({ t, turns, mode, range, hasEarlierRecords, onLoadEarlier, selectedIndex, searchMatchIndexes, onRangeChange, onRecordSelect, onRecordFocus, }: TrajectoryTimelineProps) => import("react").JSX.Element>;
//# sourceMappingURL=TrajectoryTimeline.d.ts.map