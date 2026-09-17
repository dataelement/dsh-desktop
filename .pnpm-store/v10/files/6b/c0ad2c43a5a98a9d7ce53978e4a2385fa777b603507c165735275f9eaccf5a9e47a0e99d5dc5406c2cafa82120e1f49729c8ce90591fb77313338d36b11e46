import { type CHash, type Hash, type TArg, type TRet } from './utils.ts';
/** Blake1 options. Basically just `salt`. */
export type BlakeOpts = {
    /** Optional salt mixed into initialization. */
    salt?: Uint8Array;
};
declare abstract class BLAKE1<T extends BLAKE1<T>> implements Hash<T> {
    readonly canXOF = false;
    protected finished: boolean;
    protected length: number;
    protected pos: number;
    protected destroyed: boolean;
    protected buffer: Uint8Array;
    protected view: DataView;
    protected salt: Uint32Array;
    abstract compress(view: DataView, offset: number, withLength?: boolean): void;
    protected abstract get(): number[];
    abstract _cloneInto(to?: T): T;
    readonly blockLen: number;
    readonly outputLen: number;
    private lengthFlag;
    private counterLen;
    protected constants: Uint32Array;
    constructor(blockLen: number, outputLen: number, lengthFlag: number, counterLen: number, saltLen: number, constants: Uint32Array, opts?: BlakeOpts);
    update(data: TArg<Uint8Array>): this;
    destroy(): void;
    protected _cloneIntoMeta(to: T): T;
    clone(): T;
    digestInto(out: TArg<Uint8Array>): void;
    digest(): TRet<Uint8Array>;
}
declare class BLAKE1_32B extends BLAKE1<BLAKE1_32B> {
    private v0;
    private v1;
    private v2;
    private v3;
    private v4;
    private v5;
    private v6;
    private v7;
    constructor(outputLen: number, IV: Uint32Array, lengthFlag: number, opts?: BlakeOpts);
    protected get(): [number, number, number, number, number, number, number, number];
    protected set(v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number): void;
    _cloneInto(to?: BLAKE1_32B): BLAKE1_32B;
    destroy(): void;
    compress(view: DataView, offset: number, withLength?: boolean): void;
}
declare class BLAKE1_64B extends BLAKE1<BLAKE1_64B> {
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
    constructor(outputLen: number, IV: Uint32Array, lengthFlag: number, opts?: BlakeOpts);
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
    _cloneInto(to?: BLAKE1_64B): BLAKE1_64B;
    destroy(): void;
    compress(view: DataView, offset: number, withLength?: boolean): void;
}
/** Internal blake1-224 hash class. */
export declare class _BLAKE224 extends BLAKE1_32B {
    constructor(opts?: BlakeOpts);
}
/** Internal blake1-256 hash class. */
export declare class _BLAKE256 extends BLAKE1_32B {
    constructor(opts?: BlakeOpts);
}
/** Internal blake1-384 hash class. */
export declare class _BLAKE384 extends BLAKE1_64B {
    constructor(opts?: BlakeOpts);
}
/** Internal blake1-512 hash class. */
export declare class _BLAKE512 extends BLAKE1_64B {
    constructor(opts?: BlakeOpts);
}
/**
 * Blake1-224 hash function.
 * @param msg - message bytes to hash
 * @param opts - Optional Blake1 settings. See {@link BlakeOpts}. If set,
 *   `opts.salt` must be exactly 16 bytes.
 * @returns Digest bytes.
 * @example
 * Hash a message with Blake1-224.
 * ```ts
 * blake224(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const blake224: TRet<CHash<_BLAKE224, BlakeOpts>>;
/**
 * Blake1-256 hash function.
 * @param msg - message bytes to hash
 * @param opts - Optional Blake1 settings. See {@link BlakeOpts}. If set,
 *   `opts.salt` must be exactly 16 bytes.
 * @returns Digest bytes.
 * @example
 * Hash a message with Blake1-256.
 * ```ts
 * blake256(new Uint8Array([97, 98, 99]));
 * ```
 * @example
 * Hash a message with Blake1-256 and a 16-byte salt.
 * ```ts
 * blake256(new Uint8Array([97, 98, 99]), { salt: new Uint8Array(16) });
 * ```
 */
export declare const blake256: TRet<CHash<_BLAKE256, BlakeOpts>>;
/**
 * Blake1-384 hash function.
 * @param msg - message bytes to hash
 * @param opts - Optional Blake1 settings. See {@link BlakeOpts}. If set,
 *   `opts.salt` must be exactly 32 bytes.
 * @returns Digest bytes.
 * @example
 * Hash a message with Blake1-384.
 * ```ts
 * blake384(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const blake384: TRet<CHash<_BLAKE384, BlakeOpts>>;
/**
 * Blake1-512 hash function.
 * @param msg - message bytes to hash
 * @param opts - Optional Blake1 settings. See {@link BlakeOpts}. If set,
 *   `opts.salt` must be exactly 32 bytes.
 * @returns Digest bytes.
 * @example
 * Hash a message with Blake1-512.
 * ```ts
 * blake512(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const blake512: TRet<CHash<_BLAKE512, BlakeOpts>>;
export {};
