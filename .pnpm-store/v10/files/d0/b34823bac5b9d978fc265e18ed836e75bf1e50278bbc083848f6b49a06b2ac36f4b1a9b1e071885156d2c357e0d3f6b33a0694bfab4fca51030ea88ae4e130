/**
 * Node-private synchronous Zstandard frame decoder optimization.
 * @module dsh-session-persistence-jsonl/zstd-private-decoder
 */
import type { ZstdFrameDecoder, ZstdFrameRange } from './zstd.ts';
/**
 * Synchronous multi-frame decoder backed by one Node Zstd stream handle. Node
 * exposes synchronous decoding only as a one-shot API, so this adapter uses
 * the stream's private handle contract to reuse its native context and output
 * chunks across frames.
 */
export declare class NodePrivateZstdFrameDecoder implements ZstdFrameDecoder {
    private readonly stream;
    private readonly errorKey;
    private readonly output;
    private decoderError?;
    private started;
    private closed;
    private constructor();
    /**
     * Create the optimized decoder when this Node release exposes the expected
     * private stream shape.
     * @returns a shared decoder, or `undefined` when callers must use the public fallback.
     */
    static create(): NodePrivateZstdFrameDecoder | undefined;
    /** @inheritdoc */
    decode(source: Buffer, frames: readonly ZstdFrameRange[]): Generator<Buffer, void, void>;
    /** Decode one frame; its returned scratch view remains valid until the next call. */
    private decodeFrame;
    /** @inheritdoc */
    close(): void;
}
//# sourceMappingURL=zstd-private-decoder.d.ts.map