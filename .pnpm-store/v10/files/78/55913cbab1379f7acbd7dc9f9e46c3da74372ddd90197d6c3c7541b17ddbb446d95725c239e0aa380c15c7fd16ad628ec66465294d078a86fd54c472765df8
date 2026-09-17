/**
 * SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
 * SHA256 is the fastest hash implementable in JS, even faster than Blake3.
 * Check out {@link https://www.rfc-editor.org/rfc/rfc4634 | RFC 4634} and
 * {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf | FIPS 180-4}.
 * @module
 */
import { HashMD } from './_md.ts';
import { type CHash, type TRet } from './utils.ts';
/** Internal SHA-224 / SHA-256 compression engine from RFC 6234 §6.2. */
declare abstract class SHA2_32B<T extends SHA2_32B<T>> extends HashMD<T> {
    protected A: number;
    protected B: number;
    protected C: number;
    protected D: number;
    protected E: number;
    protected F: number;
    protected G: number;
    protected H: number;
    constructor(outputLen: number, IV: Uint32Array);
    protected get(): [number, number, number, number, number, number, number, number];
    protected set(A: number, B: number, C: number, D: number, E: number, F: number, G: number, H: number): void;
    _cloneInto(to?: T): T;
    protected process(view: DataView, offset: number): void;
    protected roundClean(): void;
    destroy(): void;
}
/** Internal SHA-256 hash class grounded in RFC 6234 §6.2. */
export declare class _SHA256 extends SHA2_32B<_SHA256> {
    constructor();
}
/** Internal SHA-224 hash class grounded in RFC 6234 §6.2 and §8.5. */
export declare class _SHA224 extends SHA2_32B<_SHA224> {
    constructor();
}
/** Internal SHA-384 / SHA-512 compression engine from RFC 6234 §6.4. */
declare abstract class SHA2_64B<T extends SHA2_64B<T>> extends HashMD<T> {
    protected Ah: number;
    protected Al: number;
    protected Bh: number;
    protected Bl: number;
    protected Ch: number;
    protected Cl: number;
    protected Dh: number;
    protected Dl: number;
    protected Eh: number;
    protected El: number;
    protected Fh: number;
    protected Fl: number;
    protected Gh: number;
    protected Gl: number;
    protected Hh: number;
    protected Hl: number;
    constructor(outputLen: number, IV: Uint32Array);
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
    protected set(Ah: number, Al: number, Bh: number, Bl: number, Ch: number, Cl: number, Dh: number, Dl: number, Eh: number, El: number, Fh: number, Fl: number, Gh: number, Gl: number, Hh: number, Hl: number): void;
    _cloneInto(to?: T): T;
    protected process(view: DataView, offset: number): void;
    protected roundClean(): void;
    destroy(): void;
}
/** Internal SHA-512 hash class grounded in RFC 6234 §6.3 and §6.4. */
export declare class _SHA512 extends SHA2_64B<_SHA512> {
    constructor();
}
/** Internal SHA-384 hash class grounded in RFC 6234 §6.3 and §6.4. */
export declare class _SHA384 extends SHA2_64B<_SHA384> {
    constructor();
}
/** Internal SHA-512/224 hash class using the derived `T224_IV` and the shared
 * RFC 6234 §6.4 compression engine. */
export declare class _SHA512_224 extends SHA2_64B<_SHA512_224> {
    constructor();
}
/** Internal SHA-512/256 hash class using the derived `T256_IV` and the shared
 * RFC 6234 §6.4 compression engine. */
export declare class _SHA512_256 extends SHA2_64B<_SHA512_256> {
    constructor();
}
/**
 * SHA2-256 hash function from RFC 4634. In JS it's the fastest: even faster than Blake3. Some info:
 *
 * - Trying 2^128 hashes would get 50% chance of collision, using birthday attack.
 * - BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
 * - Each sha256 hash is executing 2^18 bit operations.
 * - Good 2024 ASICs can do 200Th/sec with 3500 watts of power, corresponding to 2^36 hashes/joule.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA2-256.
 * ```ts
 * sha256(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha256: TRet<CHash<_SHA256>>;
/**
 * SHA2-224 hash function from RFC 4634.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA2-224.
 * ```ts
 * sha224(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha224: TRet<CHash<_SHA224>>;
/**
 * SHA2-512 hash function from RFC 4634.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA2-512.
 * ```ts
 * sha512(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha512: TRet<CHash<_SHA512>>;
/**
 * SHA2-384 hash function from RFC 4634.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA2-384.
 * ```ts
 * sha384(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha384: TRet<CHash<_SHA384>>;
/**
 * SHA2-512/256 "truncated" hash function, with improved resistance to length extension attacks.
 * See the paper on {@link https://eprint.iacr.org/2010/548.pdf | truncated SHA512}.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA2-512/256.
 * ```ts
 * sha512_256(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha512_256: TRet<CHash<_SHA512_256>>;
/**
 * SHA2-512/224 "truncated" hash function, with improved resistance to length extension attacks.
 * See the paper on {@link https://eprint.iacr.org/2010/548.pdf | truncated SHA512}.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA2-512/224.
 * ```ts
 * sha512_224(new Uint8Array([97, 98, 99]));
 * ```
 */
export declare const sha512_224: TRet<CHash<_SHA512_224>>;
export {};
