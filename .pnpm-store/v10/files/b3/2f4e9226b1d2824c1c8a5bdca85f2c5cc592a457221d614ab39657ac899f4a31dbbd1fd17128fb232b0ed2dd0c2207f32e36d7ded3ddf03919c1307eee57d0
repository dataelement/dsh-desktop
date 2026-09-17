/**
 * Persistent append-only lists with bounded copying and JSON checkpoint validation.
 * @module @deepseek-ai/dsh-chunked-list
 */
import { z } from 'zod';
/**
 * Newest chunk of an immutable list; `undefined` represents the empty list.
 * Values within each chunk follow insertion order. Callers treat nodes, arrays,
 * and stored values as immutable; operations share values and older chunks.
 */
export interface ChunkedList<T> {
    readonly values: readonly T[];
    readonly previous?: ChunkedList<T> | undefined;
}
/**
 * Append without modifying the input, copying at most one 64-value chunk.
 * @param head - current list, or `undefined` for an empty list.
 * @param value - value to retain by reference.
 * @returns new list sharing the unchanged older chunks.
 */
export declare function appendChunkedList<T>(head: ChunkedList<T> | undefined, value: T): ChunkedList<T>;
/**
 * Visit all values in insertion order, with O(N) time and O(N / 64) scratch space.
 * @param head - current list, or `undefined` for an empty list.
 * @returns iterator yielding the stored values by reference, without truncation.
 */
export declare function iterateChunkedList<T>(head: ChunkedList<T> | undefined): Generator<T>;
/**
 * Validate nonempty list checkpoints, including every stored value and chunk size.
 * @param valueSchema - caller-owned validation for each stored value.
 * @returns recursive Zod schema rejecting empty or oversized chunks and unknown fields.
 */
export declare function chunkedListSchema<T>(valueSchema: z.ZodType<T>): z.ZodType<ChunkedList<T>>;
//# sourceMappingURL=index.d.ts.map