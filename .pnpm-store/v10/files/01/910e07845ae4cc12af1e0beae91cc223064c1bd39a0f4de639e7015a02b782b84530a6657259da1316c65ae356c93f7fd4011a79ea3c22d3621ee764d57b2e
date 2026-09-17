/**
 * Decode hook process outcomes for both dialects. Exit 0 may carry structured
 * JSON or plain stdout; exit 2 blocks with stderr as the reason; every other
 * exit is a non-blocking error. Bridges decide which recognized fields apply.
 * @module @deepseek-ai/dsh-hook-protocol/codec
 */
import type { HookOutput } from './types.ts';
/**
 * Decode process output into a dialect-neutral hook outcome. This function is
 * total: malformed JSON remains plain stdout. When `expectedEventName` is set,
 * a missing or different `hookSpecificOutput.hookEventName` discards only its
 * event-scoped fields; top-level fields and the claimed discriminator remain.
 * Omitting the guard applies the block as-is.
 * @param exitCode - process exit, or `undefined` when spawn failed.
 * @param stdout - output parsed as structured JSON only on exit 0.
 * @param stderr - the captured stderr stream; becomes the blocking `reason` on exit 2.
 * @param expectedEventName - firing event used to guard hook-specific fields; omit to disable the guard.
 * @returns the dialect-neutral decoded outcome.
 */
export declare function parseHookOutput(exitCode: number | undefined, stdout: string, stderr: string, expectedEventName?: string): HookOutput;
//# sourceMappingURL=codec.d.ts.map