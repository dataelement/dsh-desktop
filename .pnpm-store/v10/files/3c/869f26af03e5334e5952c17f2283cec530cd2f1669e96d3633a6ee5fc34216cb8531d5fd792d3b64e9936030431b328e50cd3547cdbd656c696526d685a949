/**
 * Incremental chunk-to-message assembler. This is the single canonical assembly
 * algorithm used by the agent loop to build an assistant message from a chunk
 * stream while logging the raw chunks for replay fidelity.
 *
 * @module @deepseek-ai/dsh-llm/assembler
 */
import type { Message, MessageSource } from './message.ts';
import type { ContentBlock, FinishReason, ReplayEnvelope, StreamChunk, TokenUsage } from './types.ts';
/**
 * Incrementally assembles raw {@link StreamChunk}s into complete
 * {@link ContentBlock}s and a final assistant {@link Message}.
 *
 * The agent loop feeds it while logging raw chunks for replay fidelity, then
 * reads `blocks()` / `message()` / `usage` / `finish` once the stream ends,
 * or `interruptedBlocks()` when cancellation cut the stream short.
 *
 * Tolerant of delta-only protocols (no block-start/end); deltas arriving for
 * an index already closed by `block-end` are ignored (malformed stream) so a
 * misbehaving adapter cannot grow memory or corrupt a completed block.
 */
export declare class BlockAssembler {
    private partials;
    private order;
    private _usage;
    private _finish;
    private _replayState;
    /**
     * Feed one chunk into the assembly state.
     * @param chunk - the next raw chunk, in stream order.
     */
    push(chunk: StreamChunk): void;
    private ensure;
    private assemble;
    /** Invariant accessor: every index in `order` has a partial. */
    private mustGet;
    /**
     * The one shared keep/drop decision over all seen blocks: max-token
     * truncation drops tool calls that cannot be executed safely. Emitted blocks
     * and replay metadata both derive from this result, so they cannot disagree.
     */
    private assembled;
    /**
     * Assemble all blocks seen so far, in stream order.
     * @returns one block per seen index, except that max-token truncation drops
     *   tool calls that cannot be executed safely; an open block assembles from
     *   its accumulated deltas (an unknown block type never closed by `block-end` throws).
     */
    blocks(): ContentBlock[];
    /**
     * Assemble the prefix an interrupted stream can safely finalize: closed and
     * open text/reasoning blocks with non-whitespace content, in stream order.
     * Tool calls are omitted because interruption precedes dispatch; retaining
     * one would require a fabricated result. Open unknown blocks are also omitted.
     * @returns the kept blocks; empty when nothing streamed before the interruption.
     */
    interruptedBlocks(): ContentBlock[];
    /** Usage from the `usage` chunk; undefined until one arrives. */
    get usage(): TokenUsage | undefined;
    /** Finish reason from the `finish` chunk; `{kind: 'stop'}` when the stream ended without one. */
    get finish(): FinishReason;
    /**
     * Replay metadata from the terminal finish chunk, if any, with per-block
     * entries pruned in step with {@link blocks}. Undefined when the envelope's
     * entries do not align with the emitted blocks.
     */
    get replayState(): ReplayEnvelope | undefined;
    /**
     * The assembled assistant message.
     * @param source - producer attribution for the assembled message.
     * @returns a frozen assistant-role message over `blocks()` (same open-block assembly rules).
     */
    message(source?: MessageSource): Message;
}
//# sourceMappingURL=assembler.d.ts.map