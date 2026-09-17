import { z } from "zod";
//#region lib/types/index.js
/**
* Persistent append-only lists with bounded copying and JSON checkpoint validation.
* @module @deepseek-ai/dsh-chunked-list
*/
const CHUNK_CAPACITY = 64;
/**
* Append without modifying the input, copying at most one 64-value chunk.
* @param head - current list, or `undefined` for an empty list.
* @param value - value to retain by reference.
* @returns new list sharing the unchanged older chunks.
*/
function appendChunkedList(head, value) {
	if (head === void 0 || head.values.length === CHUNK_CAPACITY) return {
		values: [value],
		...head === void 0 ? {} : { previous: head }
	};
	return {
		values: [...head.values, value],
		...head.previous === void 0 ? {} : { previous: head.previous }
	};
}
/**
* Visit all values in insertion order, with O(N) time and O(N / 64) scratch space.
* @param head - current list, or `undefined` for an empty list.
* @returns iterator yielding the stored values by reference, without truncation.
*/
function* iterateChunkedList(head) {
	const chunks = [];
	for (let chunk = head; chunk !== void 0; chunk = chunk.previous) chunks.push(chunk);
	for (const chunk of chunks.reverse()) yield* chunk.values;
}
/**
* Validate nonempty list checkpoints, including every stored value and chunk size.
* @param valueSchema - caller-owned validation for each stored value.
* @returns recursive Zod schema rejecting empty or oversized chunks and unknown fields.
*/
function chunkedListSchema(valueSchema) {
	const schema = z.lazy(() => z.object({
		values: z.array(valueSchema).min(1).max(CHUNK_CAPACITY),
		previous: schema.optional()
	}).strict());
	return schema;
}
//#endregion
export { appendChunkedList, chunkedListSchema, iterateChunkedList };
