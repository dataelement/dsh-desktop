import { type CHash, type CHashXOF, type Hash, type HashXOF, type TArg, type TRet } from './utils.ts';
/**
 * `keccakf1600` internal permutation, additionally allows adjusting the round count.
 * @param s - 5x5 Keccak state encoded as 25 lanes split into 50 uint32 words
 *   in this file's local little-endian lane-word order
 * @param rounds - number of rounds to execute
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @throws If `rounds` is outside the supported `1..24` range. {@link Error}
 * @example
 * Permute a Keccak state with the default 24 rounds.
 * ```ts
 * keccakP(new Uint32Array(50));
 * ```
 */
export declare function keccakP(s: TArg<Uint32Array>, rounds?: number): void;
/**
 * Keccak sponge function.
 * @param blockLen - absorb/squeeze rate in bytes
 * @param suffix - domain separation suffix byte
 * @param outputLen - default digest length in bytes. This base sponge only
 *   requires a non-negative integer; wrappers that need positive output
 *   lengths must enforce that themselves.
 * @param enableXOF - whether XOF output is allowed
 * @param rounds - number of Keccak-f rounds
 * @example
 * Build a sponge state, absorb bytes, then finalize a digest.
 * ```ts
 * const hash = new Keccak(136, 0x06, 32);
 * hash.update(new Uint8Array([1, 2, 3]));
 * hash.digest();
 * ```
 */
export declare class Keccak implements Hash<Keccak>, HashXOF<Keccak> {
    protected state: Uint8Array;
    protected pos: number;
    protected posOut: number;
    protected finished: boolean;
    protected state32: Uint32Array;
    protected destroyed: boolean;
    blockLen: number;
    suffix: number;
    outputLen: number;
    canXOF: boolean;
    protected enableXOF: boolean;
    protected rounds: number;
    constructor(blockLen: number, suffix: number, outputLen: number, enableXOF?: boolean, rounds?: number);
    clone(): Keccak;
    protected keccak(): void;
    update(data: TArg<Uint8Array>): this;
    protected finish(): void;
    protected writeInto(out: TArg<Uint8Array>): TRet<Uint8Array>;
    xofInto(out: TArg<Uint8Array>): TRet<Uint8Array>;
    xof(bytes: number): TRet<Uint8Array>;
    digestInto(out: TArg<Uint8Array>): void;
    digest(): TRet<Uint8Array>;
    destroy(): void;
    _cloneInto(to?: Keccak): Keccak;
}
/**
 * SHA3-224 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA3-224.
 * ```ts
 * sha3_224(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha3_224: TRet<CHash>;
/**
 * SHA3-256 hash function. Different from keccak-256.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA3-256.
 * ```ts
 * sha3_256(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha3_256: TRet<CHash>;
/**
 * SHA3-384 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA3-384.
 * ```ts
 * sha3_384(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha3_384: TRet<CHash>;
/**
 * SHA3-512 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA3-512.
 * ```ts
 * sha3_512(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha3_512: TRet<CHash>;
/**
 * Keccak-224 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with Keccak-224.
 * ```ts
 * keccak_224(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const keccak_224: TRet<CHash>;
/**
 * Keccak-256 hash function. Different from SHA3-256.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with Keccak-256.
 * ```ts
 * keccak_256(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const keccak_256: TRet<CHash>;
/**
 * Keccak-384 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with Keccak-384.
 * ```ts
 * keccak_384(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const keccak_384: TRet<CHash>;
/**
 * Keccak-512 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with Keccak-512.
 * ```ts
 * keccak_512(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const keccak_512: TRet<CHash>;
/** Options for SHAKE XOF. */
export type ShakeOpts = {
    /** Desired number of output bytes. */
    dkLen?: number;
};
/**
 * SHAKE128 XOF with 128-bit security and a 16-byte default output.
 * @param msg - message bytes to hash
 * @param opts - Optional output-length override. See {@link ShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHAKE128.
 * ```ts
 * shake128(new Uint8Array([97, 98, 99]), { dkLen: 32 });
 * ```
 */
export declare const shake128: TRet<CHashXOF<Keccak, ShakeOpts>>;
/**
 * SHAKE256 XOF with 256-bit security and a 32-byte default output.
 * @param msg - message bytes to hash
 * @param opts - Optional output-length override. See {@link ShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHAKE256.
 * ```ts
 * shake256(new Uint8Array([97, 98, 99]), { dkLen: 64 });
 * ```
 */
export declare const shake256: TRet<CHashXOF<Keccak, ShakeOpts>>;
/**
 * SHAKE128 XOF with 256-bit output (NIST version).
 * @param msg - message bytes to hash
 * @param opts - Optional output-length override. See {@link ShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHAKE128 using a 32-byte default output.
 * ```ts
 * shake128_32(new Uint8Array([97, 98, 99]), { dkLen: 32 });
 * ```
 */
export declare const shake128_32: TRet<CHashXOF<Keccak, ShakeOpts>>;
/**
 * SHAKE256 XOF with 512-bit output (NIST version).
 * @param msg - message bytes to hash
 * @param opts - Optional output-length override. See {@link ShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHAKE256 using a 64-byte default output.
 * ```ts
 * shake256_64(new Uint8Array([97, 98, 99]), { dkLen: 64 });
 * ```
 */
export declare const shake256_64: TRet<CHashXOF<Keccak, ShakeOpts>>;
