/**
 * Fixed-density heuristic token pricing shared by the meter service and the
 * pure context-breakdown projection, so both surfaces price identical content
 * to identical numbers.
 *
 * @module @deepseek-ai/dsh-token-meter/estimate
 */
import type { ContentBlock, Message } from '@deepseek-ai/dsh-llm';
import type { EpochHeader } from '@deepseek-ai/dsh-session';
/** Role-field framing overhead added to every priced message. */
export declare const ROLE_OVERHEAD = 4;
/**
 * Structural JSON price of one block outside the typed pricing arms: the
 * fixed heuristic for merge-extended blocks and for image references, whose
 * request price is route-owned rather than fixed.
 * @param block - block to price without mutation.
 * @returns heuristic tokens for the block's JSON structure.
 */
export declare function estimateStructuralBlock(block: ContentBlock): number;
/**
 * Price content blocks recursively under the fixed density heuristic.
 * @param blocks - content blocks to price without mutation.
 * @returns heuristic tokens including per-block structural overhead.
 */
export declare function estimateContent(blocks: readonly ContentBlock[]): number;
/**
 * Price the rendered system prompt: the `system/message` surface node's text.
 * Adapters serialize the prompt as a plain string — a system-role message or
 * the request's system field — not as a typed content block, so the price is
 * text density plus role framing with no per-block overhead.
 * @param message - system-role message to price without mutation.
 * @returns heuristic system-prompt tokens; 0 for empty content ("no system prompt").
 */
export declare function estimateSystemMessage(message: Message): number;
/**
 * Heuristically price one model-visible message.
 * @param message - message to price without mutation.
 * @returns content and role-framing tokens under the fixed heuristic; a
 *   system-role message prices as {@link estimateSystemMessage}.
 */
export declare function estimateMessage(message: Message): number;
/**
 * Price the tool-schema part of a canonical request envelope — the envelope's
 * only priced field, since the system prompt is a surface node.
 * @param header - canonical envelope, or undefined before any request.
 * @returns heuristic tool-schema tokens; 0 when absent or empty.
 */
export declare function estimateToolsTokens(header: EpochHeader | undefined): number;
//# sourceMappingURL=estimate.d.ts.map