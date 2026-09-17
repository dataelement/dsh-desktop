import { type CHash, type Hash, type TArg, type TRet } from './utils.ts';
/**
 * Blake hash options.
 * `dkLen` is output length. `key` is used in MAC mode. `salt` is used in
 * KDF mode.
 */
export type Blake2Opts = {
    /** Desired digest length in bytes. RFC 7693 uses 1..64 for blake2b and 1..32 for blake2s. */
    dkLen?: number;
    /** Optional MAC key. */
    key?: Uint8Array;
    /** Optional salt mixed into initialization. */
    salt?: Uint8Array;
    /** Optional personalization bytes. */
    personalization?: Uint8Array;
};
/** Internal base class for BLAKE2. */
export declare abstract class _BLAKE2<T extends _BLAKE2<T>> implements Hash<T> {
    protected abstract compress(msg: Uint32Array, offset: number, isLast: boolean): void;
    protected abstract get(): number[];
    protected abstract set(...args: number[]): void;
    abstract destroy(): void;
    protected buffer: Uint8Array;
    protected buffer32: Uint32Array;
    protected finished: boolean;
    protected destroyed: boolean;
    protected length: number;
    protected pos: number;
    readonly blockLen: number;
    readonly outputLen: number;
    readonly canXOF: boolean;
    constructor(blockLen: number, outputLen: number);
    update(data: TArg<Uint8Array>): this;
    digestInto(out: TArg<Uint8Array>): void;
    digest(): TRet<Uint8Array>;
    _cloneInto(to?: T): T;
    clone(): T;
}
/** Internal blake2b hash class with state stored as LE u32 low/high halves. */
export declare class _BLAKE2b extends _BLAKE2<_BLAKE2b> {
    private v0l;
    private v0h;
    private v1l;
    private v1h;
    private v2l;
    private v2h;
    private v3l;
    private v3h;
    private v4l;
    private v4h;
    private v5l;
    private v5h;
    private v6l;
    private v6h;
    private v7l;
    private v7h;
    constructor(opts?: Blake2Opts);
    protected get(): [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number
    ];
    protected set(v0l: number, v0h: number, v1l: number, v1h: number, v2l: number, v2h: number, v3l: number, v3h: number, v4l: number, v4h: number, v5l: number, v5h: number, v6l: number, v6h: number, v7l: number, v7h: number): void;
    protected compress(msg: Uint32Array, offset: number, isLast: boolean): void;
    destroy(): void;
}
/**
 * Blake2b hash function. 64-bit. 1.5x slower than blake2s in JS.
 * @param msg - message that would be hashed
 * @param opts - Optional output, MAC, salt, and personalization settings.
 *   `dkLen` must be 1..64 bytes; `salt` and `personalization`, if present,
 *   must be 16 bytes each. See {@link Blake2Opts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with Blake2b.
 * ```ts
 * blake2b(new Uint8Array([97, 98, 99]));
 * ```
 * @example
 * Hash a message with Blake2b while selecting output, MAC, salt, and personalization settings.
 * ```ts
 * blake2b(new Uint8Array([97, 98, 99]), {
 *   dkLen: 32,
 *   key: new Uint8Array(32),
 *   salt: new Uint8Array(16),
 *   personalization: new Uint8Array(16),
 * });
 * ```
 */
export declare const blake2b: TRet<CHash<_BLAKE2b, Blake2Opts>>;
/** Internal type, 16 numbers. */
export type _Num16 = {
    v0: number;
    v1: number;
    v2: number;
    v3: number;
    v4: number;
    v5: number;
    v6: number;
    v7: number;
    v8: number;
    v9: number;
    v10: number;
    v11: number;
    v12: number;
    v13: number;
    v14: number;
    v15: number;
};
/**
 * BLAKE2-compress core method.
 * Runs only the round function over a caller-supplied local vector; callers initialize `v0..v15`
 * and apply the final `h[i] ^= v[i] ^ v[i + 8]` fold themselves.
 * @param s - flattened sigma schedule bytes
 * @param offset - starting word offset inside `msg`, not a byte offset
 * @param msg - message words
 * @param rounds - round count to execute
 * @param v0 - state word 0
 * @param v1 - state word 1
 * @param v2 - state word 2
 * @param v3 - state word 3
 * @param v4 - state word 4
 * @param v5 - state word 5
 * @param v6 - state word 6
 * @param v7 - state word 7
 * @param v8 - state word 8
 * @param v9 - state word 9
 * @param v10 - state word 10
 * @param v11 - state word 11
 * @param v12 - state word 12
 * @param v13 - state word 13
 * @param v14 - state word 14
 * @param v15 - state word 15
 * @returns Updated compression state words.
 * @example
 * Run the BLAKE2 compression core on zeroed state and message words.
 * ```ts
 * import { _compress } from '@noble/hashes/blake2.js';
 * const state = _compress(
 *   new Uint8Array(16),
 *   0,
 *   new Uint32Array(16),
 *   1,
 *   0, 0, 0, 0, 0, 0, 0, 0,
 *   0, 0, 0, 0, 0, 0, 0, 0
 * );
 * state.v0;
 * ```
 */
export declare function _compress(s: TArg<Uint8Array>, offset: number, msg: TArg<Uint32Array>, rounds: number, v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number, v8: number, v9: number, v10: number, v11: number, v12: number, v13: number, v14: number, v15: number): _Num16;
/** Internal blake2s hash class. */
export declare class _BLAKE2s extends _BLAKE2<_BLAKE2s> {
    private v0;
    private v1;
    private v2;
    private v3;
    private v4;
    private v5;
    private v6;
    private v7;
    constructor(opts?: Blake2Opts);
    protected get(): [number, number, number, number, number, number, number, number];
    protected set(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number): void;
    protected compress(msg: Uint32Array, offset: number, isLast: boolean): void;
    destroy(): void;
}
/**
 * Blake2s hash function. Focuses on 8-bit to 32-bit platforms. 1.5x faster than blake2b in JS.
 * @param msg - message that would be hashed
 * @param opts - Optional output, MAC, salt, and personalization settings.
 *   `dkLen` must be 1..32 bytes; `salt` and `personalization`, if present,
 *   must be 8 bytes each. See {@link Blake2Opts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with Blake2s.
 * ```ts
 * blake2s(new Uint8Array([97, 98, 99]));
 * ```
 * @example
 * Hash a message with Blake2s while selecting output, MAC, salt, and personalization settings.
 * ```ts
 * blake2s(new Uint8Array([97, 98, 99]), {
 *   dkLen: 16,
 *   key: new Uint8Array(32),
 *   salt: new Uint8Array(8),
 *   personalization: new Uint8Array(8),
 * });
 * ```
 */
export declare const blake2s: TRet<CHash<_BLAKE2s, Blake2Opts>>;
