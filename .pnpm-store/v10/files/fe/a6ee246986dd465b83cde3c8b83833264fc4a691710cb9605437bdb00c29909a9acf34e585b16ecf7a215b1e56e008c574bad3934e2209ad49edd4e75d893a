/**
 * Zstandard frame primitives for the JSONL persistence backend. The backend
 * owns a concatenated-frame container so it can append and recover batches
 * without exposing compression mechanics through the persistence seam.
 * @module dsh-session-persistence-jsonl/zstd
 */
/** Byte range occupied by one structurally complete Zstandard frame. */
export interface ZstdFrameRange {
    /** Inclusive frame start. */
    start: number;
    /** Exclusive frame end. */
    end: number;
}
/** Structural scan result for a concatenated Zstandard stream. */
export interface ZstdFrameScan {
    /** Complete frames in file order. */
    frames: ZstdFrameRange[];
    /** Start of an incomplete final frame, when EOF interrupts one. */
    tornStart?: number;
}
/**
 * Locate complete frames without decompressing their blocks. Invalid complete
 * structure rejects; EOF inside the final frame returns its start for repair.
 * @param buffer - complete bytes currently present in the session artifact.
 * @param maxFrames - optional complete-frame limit for metadata-only readers.
 * @returns complete frame ranges and an optional incomplete-final-frame start.
 */
export declare function scanZstdFrames(buffer: Buffer, maxFrames?: number): ZstdFrameScan;
/**
 * Compress one independently decodable, checksummed Zstandard frame.
 * @param input - JSONL bytes for a header or durable event batch.
 * @returns the complete encoded frame.
 */
export declare function compressZstdFrame(input: Buffer | string): Promise<Buffer>;
/**
 * Decompress one complete frame and validate its checksum.
 * @param input - one structurally complete Zstandard frame.
 * @returns the frame plaintext.
 */
export declare function decompressZstdFrame(input: Buffer): Promise<Buffer>;
/** Common lifecycle for interchangeable synchronous multi-frame decoders. */
export interface ZstdFrameDecoder {
    /**
     * Decode and checksum complete frames in source order. Each yielded buffer
     * remains valid only until the iterator advances to the next frame.
     * @param source - concatenated Zstandard frame bytes.
     * @param frames - structurally complete ranges within `source`.
     * @returns one plaintext buffer per frame.
     */
    decode(source: Buffer, frames: readonly ZstdFrameRange[]): Generator<Buffer, void, void>;
    /** Release decoder-owned resources; repeated calls are harmless. */
    close(): void;
}
/**
 * Select the shared private decoder when the running Node 22/24/26 shape is
 * compatible, otherwise preserve correctness with the public one-shot API.
 * @returns a synchronous decoder with an implementation-independent lifecycle.
 */
export declare function createZstdFrameDecoder(): ZstdFrameDecoder;
/**
 * Recover available plaintext from a structurally incomplete final frame.
 * `ZSTD_e_flush` deliberately suppresses final-frame and checksum completion;
 * callers must establish the torn frame boundary before using this helper.
 * @param input - available bytes from a known incomplete Zstandard frame.
 * @returns plaintext produced from the available input.
 */
export declare function decompressZstdPrefix(input: Buffer): Promise<Buffer>;
//# sourceMappingURL=zstd.d.ts.map