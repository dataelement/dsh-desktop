/**

SHA1 (RFC 3174), MD5 (RFC 1321), and RIPEMD160 legacy, weak hash functions.
RFC 2286 only covers HMAC-RIPEMD160 wrapper material and test vectors,
not the base RIPEMD-160 compression spec.
Don't use them in a new protocol. What "weak" means:

- Collisions can be made with 2^18 effort in MD5, 2^60 in SHA1, 2^80 in RIPEMD160.
- No practical pre-image attacks (only theoretical, 2^123.4)
- HMAC seems kinda ok: https://www.rfc-editor.org/rfc/rfc6151
 * @module
 */
import { HashMD } from './_md.ts';
import { type CHash, type TRet } from './utils.ts';
/** Internal SHA1 legacy hash class. */
export declare class _SHA1 extends HashMD<_SHA1> {
    private A;
    private B;
    private C;
    private D;
    private E;
    constructor();
    protected get(): [number, number, number, number, number];
    protected set(A: number, B: number, C: number, D: number, E: number): void;
    _cloneInto(to?: _SHA1): _SHA1;
    protected process(view: DataView, offset: number): void;
    protected roundClean(): void;
    destroy(): void;
}
/**
 * SHA1 (RFC 3174) legacy hash function. It was cryptographically broken.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA1.
 * ```ts
 * sha1(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha1: TRet<CHash>;
/** Internal MD5 legacy hash class. */
export declare class _MD5 extends HashMD<_MD5> {
    private A;
    private B;
    private C;
    private D;
    constructor();
    protected get(): [number, number, number, number];
    protected set(A: number, B: number, C: number, D: number): void;
    _cloneInto(to?: _MD5): _MD5;
    protected process(view: DataView, offset: number): void;
    protected roundClean(): void;
    destroy(): void;
}
/**
 * MD5 (RFC 1321) legacy hash function. It was cryptographically broken.
 * MD5 architecture is similar to SHA1, with some differences:
 * - Reduced output length: 16 bytes (128 bit) instead of 20
 * - 64 rounds, instead of 80
 * - Little-endian: could be faster, but will require more code
 * - Non-linear index selection: huge speed-up for unroll
 * - Per round constants: more memory accesses, additional speed-up for unroll
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with MD5.
 * ```ts
 * md5(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const md5: TRet<CHash>;
/**
 * Internal RIPEMD-160 legacy hash class.
 * RFC 2286 only adds HMAC-RIPEMD160 material, not the core hash specification.
 */
export declare class _RIPEMD160 extends HashMD<_RIPEMD160> {
    private h0;
    private h1;
    private h2;
    private h3;
    private h4;
    constructor();
    protected get(): [number, number, number, number, number];
    protected set(h0: number, h1: number, h2: number, h3: number, h4: number): void;
    _cloneInto(to?: _RIPEMD160): _RIPEMD160;
    protected process(view: DataView, offset: number): void;
    protected roundClean(): void;
    destroy(): void;
}
/**
 * RIPEMD-160 - a legacy hash function from 1990s.
 * RFC 2286 only covers HMAC-RIPEMD160 test material; the links below point
 * at the base RIPEMD-160 references.
 * * {@link https://homes.esat.kuleuven.be/~bosselae/ripemd160.html}
 * * {@link https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf}
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with RIPEMD-160.
 * ```ts
 * ripemd160(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const ripemd160: TRet<CHash>;
