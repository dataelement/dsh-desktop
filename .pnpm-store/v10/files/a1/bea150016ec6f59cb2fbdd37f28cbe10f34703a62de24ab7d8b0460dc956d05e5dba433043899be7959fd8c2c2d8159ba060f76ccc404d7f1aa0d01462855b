/** Lossless range encoding for JSONL `sourceEventSeqs` arrays. */
import type { SessionSeq as SessionSeqType } from './types.ts';
/** A stored source sequence or inclusive consecutive range. */
export type EncodedSeq = number | [number, number];
/**
 * Replace profitable consecutive runs with inclusive pairs.
 * @param values - validated in-memory source sequences.
 * @returns a lossless JSON storage form.
 */
export declare function encodeSeqRanges(values: readonly SessionSeqType[]): EncodedSeq[];
/**
 * Expand a JSON storage-form source sequence array.
 * @param value - parsed storage value.
 * @param maxEntries - largest list permitted by the owning event.
 * @returns the in-memory source sequences.
 */
export declare function decodeSeqRanges(value: unknown, maxEntries?: number): SessionSeqType[];
//# sourceMappingURL=seq-ranges.d.ts.map