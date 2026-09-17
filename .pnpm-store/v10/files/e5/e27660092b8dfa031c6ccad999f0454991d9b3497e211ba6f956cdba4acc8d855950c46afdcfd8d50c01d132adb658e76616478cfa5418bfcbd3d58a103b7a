/**
 * Public-API synchronous Zstandard frame decoder fallback.
 * @module dsh-session-persistence-jsonl/zstd-public-decoder
 */
import type { ZstdFrameDecoder, ZstdFrameRange } from './zstd.ts';
/** Multi-frame adapter built exclusively from Node's supported one-shot API. */
export declare class PublicZstdFrameDecoder implements ZstdFrameDecoder {
    private started;
    private closed;
    /** @inheritdoc */
    decode(source: Buffer, frames: readonly ZstdFrameRange[]): Generator<Buffer, void, void>;
    /** @inheritdoc */
    close(): void;
}
//# sourceMappingURL=zstd-public-decoder.d.ts.map