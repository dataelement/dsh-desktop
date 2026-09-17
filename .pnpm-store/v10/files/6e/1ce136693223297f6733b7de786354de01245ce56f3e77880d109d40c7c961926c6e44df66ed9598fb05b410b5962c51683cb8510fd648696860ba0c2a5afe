/** Trajectory-owned conversion from durable Session events to ledger view data. */
import type { ContentBlock, StreamChunk } from '@deepseek-ai/dsh-llm/types';
import type { AssistantBlock, ContextProvenanceView, KnownContextForm } from '@deepseek-ai/dsh-client-ui-conversation/client';
/**
 * Read the target-supported presentation form from a durable message source.
 * @param source - Logged `user/message` source.
 * @returns Supported form, or null for the opaque presentation.
 */
export declare function contextForm(source: unknown): KnownContextForm | null;
/**
 * Project a durable message source to the Trajectory row's role and producer label.
 * @param source - Logged `user/message` source.
 * @returns Role and label rendered by Trajectory.
 */
export declare function contextProvenance(source: unknown): ContextProvenanceView;
/**
 * Classify finalized Assistant content for Trajectory rendering.
 * @param content - Core content blocks.
 * @returns Trajectory blocks in source order.
 */
export declare function toAssistantBlocks(content: readonly ContentBlock[]): AssistantBlock[];
/**
 * Classify one finalized Assistant block for Trajectory rendering.
 * @param block - Core content block.
 * @returns Trajectory block.
 */
export declare function toAssistantBlock(block: ContentBlock): AssistantBlock;
/**
 * Create the initial Trajectory block for one streamed Assistant block kind.
 * @param blockType - Wire block kind.
 * @returns Empty block ready to receive deltas.
 */
export declare function emptyAssistantBlock(blockType: string): AssistantBlock;
/** Display-safe failure fields retained by Trajectory projections. */
export interface DisplayFailure {
    readonly code?: string;
    readonly message: string;
}
/**
 * Convert a durable failure to locale-independent fields safe for Trajectory.
 * @param failure - Failure preserved by a Session event.
 * @returns Sanitized message and optional stable provider code.
 */
export declare function displayFailure(failure: unknown): DisplayFailure;
/**
 * Whether a stream chunk carries visible model output for Trajectory timing.
 * @param chunk - Stream chunk to inspect.
 * @returns true for a non-empty text, reasoning, or Tool-call delta.
 */
export declare function isTokenDelta(chunk: StreamChunk): boolean;
//# sourceMappingURL=trajectory-event-projection.d.ts.map