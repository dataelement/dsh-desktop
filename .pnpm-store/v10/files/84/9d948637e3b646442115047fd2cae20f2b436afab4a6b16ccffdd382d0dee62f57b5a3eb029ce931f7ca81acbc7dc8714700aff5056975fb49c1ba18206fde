import { _BLAKE2 } from './blake2.ts';
import { type CHashXOF, type HashXOF, type TArg, type TRet } from './utils.ts';
/**
 * Ensure to use EITHER `key` OR `context`, not both.
 *
 * * `key`: 32-byte MAC key.
 * * `context`: caller-encoded KDF context bytes. If your protocol defines a
 *   string context, encode it before passing it here.
 *   A good default format for the original context string is
 *   "[application] [commit timestamp] [purpose]".
 */
export type Blake3Opts = {
    /** Desired digest length in bytes. The BLAKE3 spec allows 0..2^64-1 bytes of output. */
    dkLen?: number;
    /** Optional 32-byte MAC key. */
    key?: Uint8Array;
    /** Optional KDF context bytes. */
    context?: Uint8Array;
};
/** Blake3 hash. Can be used as MAC and KDF with caller-encoded context bytes. */
export declare class _BLAKE3 extends _BLAKE2<_BLAKE3> implements HashXOF<_BLAKE3> {
    readonly canXOF = true;
    private chunkPos;
    private chunksDone;
    private flags;
    private IV;
    private state;
    private stack;
    private posOut;
    private bufferOut32;
    private bufferOut;
    private chunkOut;
    private enableXOF;
    constructor(opts?: Blake3Opts, flags?: number);
    protected get(): [];
    protected set(): void;
    private b2Compress;
    protected compress(buf: Uint32Array, bufPos?: number, isLast?: boolean): void;
    _cloneInto(to?: _BLAKE3): _BLAKE3;
    destroy(): void;
    private b2CompressOut;
    protected finish(): void;
    private writeInto;
    xofInto(out: TArg<Uint8Array>): TRet<Uint8Array>;
    xof(bytes: number): TRet<Uint8Array>;
    digestInto(out: TArg<Uint8Array>): void;
    digest(): TRet<Uint8Array>;
}
/**
 * BLAKE3 hash function. Can be used as MAC and KDF.
 * @param msg - message that would be hashed
 * @param opts - Optional output, MAC, or KDF configuration. `key` must be
 *   exactly 32 bytes, `context` is caller-encoded bytes, and `dkLen` can be
 *   0..2^64-1 via the XOF-backed output path. See {@link Blake3Opts}.
 * @returns Digest bytes.
 * @example
 * Hash, MAC, or derive key material with BLAKE3.
 * ```ts
 * import { blake3 } from '@noble/hashes/blake3.js';
 * import { utf8ToBytes } from '@noble/hashes/utils.js';
 * const data = new Uint8Array(32);
 * const hash = blake3(data);
 * const mac = blake3(data, { key: new Uint8Array(32) });
 * const kdf = blake3(data, { context: utf8ToBytes('application name') });
 * const xof = blake3(data, { dkLen: 64 });
 * ```
 */
export declare const blake3: TRet<CHashXOF<_BLAKE3, Blake3Opts>>;
