/** Client range access and type narrowing for aligned Session history records. */
import type { SessionHistoryRecord } from '../../types.ts';
import type { SessionEventLikeEntry } from '../contract/events.ts';
/**
 * Narrow aligned wire records to their Client event types without allocation.
 * @param records - validated history transport records.
 * @returns the same record array with typed inner events.
 */
export declare function historyEntries(records: readonly SessionHistoryRecord[]): readonly SessionEventLikeEntry[];
/**
 * Read the first logical sequence represented by one wire record.
 * @param record - validated Session event.
 * @returns inclusive first Session sequence.
 */
export declare function historyRecordFirstSeq(record: SessionHistoryRecord): number;
/**
 * Read the final logical sequence represented by one wire record.
 * @param record - validated Session event.
 * @returns inclusive final Session sequence.
 */
export declare function historyRecordLastSeq(record: SessionHistoryRecord): number;
//# sourceMappingURL=history-records.d.ts.map