/** Pure projection from trajectory records to measurable virtual ledger rows. */
import type { TrajectoryCellProps } from './trajectory-record.ts';
/** Minimal record shape required by the trajectory virtual-row projection. */
export interface VirtualizableTrajectoryRecord {
    cell: TrajectoryCellProps;
    collapsedSummaryKind?: 'turn' | 'assistant';
}
/** One logical record retained inside a measurable virtual row. */
export interface TrajectoryVirtualRowEntry<T extends VirtualizableTrajectoryRecord> {
    logicalIndex: number;
    record: T;
}
/** One virtualizer item, which may carry zero-height request boundaries. */
export interface TrajectoryVirtualRow<T extends VirtualizableTrajectoryRecord> {
    entries: readonly TrajectoryVirtualRowEntry<T>[];
    height: number;
    key: string;
}
/**
 * Derive the DOM-safe row identity shared by React, the virtualizer, and
 * browser scroll contracts.
 * @param record - Display record whose identity is required.
 * @returns Stable record identity with a suffix for synthetic fold summaries.
 */
export declare function trajectoryVirtualRecordKey(record: VirtualizableTrajectoryRecord): string;
/**
 * Attach separator-only records to the next content row so the virtualizer
 * never owns a zero-height item. A terminal separator retains its CSS-owned
 * lower-marker clearance as a standalone item.
 * @param records - Final search/fold projection in ledger order.
 * @returns Measurable virtual rows with original logical positions retained.
 */
export declare function groupTrajectoryVirtualRows<T extends VirtualizableTrajectoryRecord>(records: readonly T[]): readonly TrajectoryVirtualRow<T>[];
//# sourceMappingURL=trajectory-virtual-rows.d.ts.map