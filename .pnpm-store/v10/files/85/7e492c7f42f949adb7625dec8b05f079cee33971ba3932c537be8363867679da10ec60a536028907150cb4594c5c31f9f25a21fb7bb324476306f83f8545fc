/** Isolated verification for a staged or competing current JSONL generation. */
import type { JsonlCompression } from './format.ts';
import type { JsonlExpectedPrefix, JsonlVerifiedGeneration } from './generation.ts';
/**
 * Verify one current generation in a fresh Worker Thread.
 * @param path - staged or competing current-generation path.
 * @param compression - configured physical encoding.
 * @param expectedId - Session id expected in the decoded header.
 * @param expectedEventCount - exact logical event count expected after decoding.
 * @param expectedPrefix - verified physical prefix; an append tail may be present and is not validated.
 * @param signal - optional cancellation for scheduler wait and Worker execution.
 * @returns stable physical identity and digest observed by the worker.
 */
export declare function verifyCurrentGenerationInWorker(path: string, compression: JsonlCompression, expectedId: string, expectedEventCount: number, expectedPrefix?: JsonlExpectedPrefix, signal?: AbortSignal): Promise<JsonlVerifiedGeneration>;
//# sourceMappingURL=migration-verifier.d.ts.map