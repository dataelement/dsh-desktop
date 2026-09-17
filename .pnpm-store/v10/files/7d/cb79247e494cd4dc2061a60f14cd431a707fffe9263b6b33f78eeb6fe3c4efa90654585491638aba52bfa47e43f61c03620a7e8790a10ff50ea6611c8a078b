/**
 * Lossless compact representation of one model-stream attempt, plus record-level
 * readers that answer common consumer questions without materializing members.
 * Readers trust the static record type; expandAssistantStream is the validating
 * path for records read at a durable boundary.
 */
import { BlockAssembler } from './assembler.ts';
import type { ToolCallId } from './brand.ts';
import type { StreamChunk } from './types.ts';
/** One model chunk paired with its original Session timestamp. */
export interface TimedStreamChunk {
    readonly time: number;
    readonly chunk: StreamChunk;
}
/** Lossless compact records embedded in durable Assistant attempt events. */
export type AssistantStreamRecord = {
    readonly type: 'text-chunks';
    readonly time0: number;
    readonly index: number;
    readonly dt: readonly number[];
    readonly texts: readonly string[];
} | {
    readonly type: 'reasoning-chunks';
    readonly time0: number;
    readonly index: number;
    readonly dt: readonly number[];
    readonly texts: readonly string[];
} | {
    readonly type: 'tool-call-chunks';
    readonly time0: number;
    readonly index: number;
    readonly dt: readonly number[];
    readonly id: ToolCallId;
    readonly name?: string;
    readonly args: readonly string[];
} | {
    readonly type: 'chunk';
    readonly time: number;
    readonly chunk: StreamChunk;
};
/** One packed delta run: every compact record except a raw `chunk`. */
export type AssistantStreamRun = Exclude<AssistantStreamRecord, {
    type: 'chunk';
}>;
/**
 * Chunk types the accumulator never packs into runs, so every occurrence is a raw
 * `chunk` record. Delta types are excluded because their packed members are not raw chunks.
 */
export type RawStreamChunkType = Exclude<StreamChunk['type'], 'text-delta' | 'reasoning-delta' | 'tool-call-delta'>;
/** Incrementally compacts one attempt without retaining a second raw-chunk list. */
export declare class AssistantStreamAccumulator {
    private readonly records;
    /**
     * Add one timed chunk to the compact attempt stream.
     * @param value - model chunk and its original Session timestamp.
     * @returns a detached immutable copy for assembly and live publication.
     */
    push(value: TimedStreamChunk): TimedStreamChunk;
    /**
     * Return the current compact attempt stream.
     * @returns a detached immutable record list suitable for a durable event.
     */
    snapshot(): readonly AssistantStreamRecord[];
}
/**
 * Expand compact records into the exact timed chunk sequence.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns detached timed chunks with every original delta boundary preserved.
 * @throws {TypeError} when a record or reconstructed timestamp is invalid.
 */
export declare function expandAssistantStream(stream: readonly AssistantStreamRecord[]): readonly TimedStreamChunk[];
/**
 * Whether one chunk carries the model's first output token for latency measurement.
 * @param chunk - any stream chunk.
 * @returns true for a non-empty text, reasoning, or Tool-call arguments fragment and for
 *   every name-bearing Tool-call delta; false for block, usage, and finish chunks.
 */
export declare function isTokenDelta(chunk: StreamChunk): boolean;
/**
 * Whether one chunk by itself contributes reader-visible transcript content.
 * Text and reasoning count only with non-whitespace content, streamed as a delta or
 * completed as a block; a block of any other kind counts at its start and its end,
 * except a Tool call, which is protocol rather than content. Usage and finish never count.
 * @param chunk - any stream chunk.
 * @returns whether a transcript reader would see this chunk.
 */
export declare function isVisibleChunk(chunk: StreamChunk): boolean;
/**
 * Whether one chunk carries non-whitespace text, as a text delta or a completed text block.
 * Reasoning, Tool calls, and other block kinds never count.
 * @param chunk - any stream chunk.
 * @returns whether the chunk contributes visible text.
 */
export declare function chunkHasVisibleText(chunk: StreamChunk): boolean;
/**
 * Time of the first member of one packed run that {@link isTokenDelta} accepts: a
 * name-bearing Tool-call run starts at its first member, otherwise the first non-empty fragment.
 * Stops scanning at that member.
 * @param run - one packed delta run.
 * @returns the member's reconstructed time, or undefined when no member qualifies.
 */
export declare function runFirstTokenTime(run: AssistantStreamRun): number | undefined;
/**
 * Time of the first member of one packed run that {@link isVisibleChunk} accepts: the first
 * non-whitespace text or reasoning fragment. A Tool-call run has none. Stops scanning at that member.
 * @param run - one packed delta run.
 * @returns the member's reconstructed time, or undefined when no member qualifies.
 */
export declare function runFirstVisibleTime(run: AssistantStreamRun): number | undefined;
/**
 * Time of the first token in one compact stream per {@link isTokenDelta}, read from the
 * records themselves and stopping at the first qualifying member.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns the first token's time, or undefined when the stream carries no token.
 */
export declare function assistantStreamFirstTokenTime(stream: readonly AssistantStreamRecord[]): number | undefined;
/**
 * Whether one compact stream carries any reader-visible content per {@link isVisibleChunk},
 * stopping at the first qualifying member.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns whether a transcript reader would see anything from this stream.
 */
export declare function assistantStreamHasVisibleContent(stream: readonly AssistantStreamRecord[]): boolean;
/**
 * Whether one compact stream carries non-whitespace text per {@link chunkHasVisibleText},
 * stopping at the first qualifying member.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns whether the stream contributes visible text.
 */
export declare function assistantStreamHasVisibleText(stream: readonly AssistantStreamRecord[]): boolean;
/**
 * The last raw chunk of one never-packed type, scanning backwards and stopping at the first hit.
 * @param stream - compact records from one durable Assistant settlement.
 * @param type - chunk type that only appears as a raw record.
 * @returns the stream's final chunk of that type, or undefined when it has none.
 */
export declare function lastAssistantStreamChunk<T extends RawStreamChunkType>(stream: readonly AssistantStreamRecord[], type: T): Extract<StreamChunk, {
    type: T;
}> | undefined;
/**
 * Every raw chunk of one never-packed type, in stream order.
 * @param stream - compact records from one durable Assistant settlement.
 * @param type - chunk type that only appears as a raw record.
 * @returns the matching chunks; empty when the stream has none.
 */
export declare function assistantStreamChunks<T extends RawStreamChunkType>(stream: readonly AssistantStreamRecord[], type: T): readonly Extract<StreamChunk, {
    type: T;
}>[];
/**
 * Every streamed text-delta fragment joined in stream order; reasoning and Tool-call fragments are excluded.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns the joined text, empty when the stream carries no text delta.
 */
export declare function joinAssistantStreamText(stream: readonly AssistantStreamRecord[]): string;
/**
 * Feed one compact stream into a {@link BlockAssembler} without materializing members.
 * Each run contributes one delta carrying its joined fragments, which assembles the same
 * blocks as the original per-member deltas because assembly only concatenates them;
 * raw chunks are pushed as recorded. The records are trusted, not validated: validate a
 * stream read at a durable boundary with {@link expandAssistantStream} first.
 * @param stream - compact records from one durable Assistant settlement.
 * @param assembler - assembler to feed; a fresh one by default.
 * @returns the same assembler after every record was pushed.
 */
export declare function assembleAssistantStream(stream: readonly AssistantStreamRecord[], assembler?: BlockAssembler): BlockAssembler;
//# sourceMappingURL=assistant-stream.d.ts.map