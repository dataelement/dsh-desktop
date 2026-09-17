/**
 * SHA3 (keccak) addons.
 *
 * * cSHAKE, KMAC, TupleHash, ParallelHash + XOF variants from
 *   {@link https://csrc.nist.gov/pubs/sp/800/185/final | NIST SP 800-185}
 * * KangarooTwelve 🦘 and TurboSHAKE - reduced-round keccak from
 *   {@link https://datatracker.ietf.org/doc/rfc9861/ | RFC 9861}
 * * KeccakPRG: Pseudo-random generator based on Keccak
 *   ({@link https://keccak.team/files/CSF-0.1.pdf | pdf})
 * @module
 */
import { Keccak, type ShakeOpts } from './sha3.ts';
import { type CHash, type CHashXOF, type Hash, type HashXOF, type KDFInput, type PRG, type TArg, type TRet } from './utils.ts';
/** Options for cSHAKE and related SP 800-185 functions. */
export type cShakeOpts = ShakeOpts & {
    /** Optional personalization string mixed into domain separation. */
    personalization?: Uint8Array;
    /**
     * Optional NIST function-name string used for domain separation.
     * SP 800-185 reserves this for standardized function names; applications
     * should generally stick to `personalization`.
     */
    NISTfn?: KDFInput;
};
/** TupleHash callable interface. */
export type ITupleHash = {
    /**
     * Hashes an ordered tuple of byte arrays.
     * @param messages - Ordered byte-array tuple to hash.
     * @param opts - TupleHash output and personalization options. See {@link cShakeOpts}.
     * @returns Digest bytes.
     */
    (messages: TArg<Uint8Array[]>, opts?: cShakeOpts): TRet<Uint8Array>;
    /**
     * Creates an incremental TupleHash state.
     * @param opts - TupleHash output and personalization options. See {@link cShakeOpts}.
     * @returns Stateful TupleHash instance.
     */
    create(opts?: cShakeOpts): _TupleHash;
    /** Default digest size in bytes. */
    outputLen: number;
    /** Input block size in bytes. */
    blockLen: number;
    /** Whether `.create()` returns an XOF-capable instance. */
    canXOF: boolean;
};
/**
 * 128-bit NIST cSHAKE XOF.
 * @param msg - message bytes to hash
 * @param opts - Optional output, personalization, and NIST function-name
 *   settings. When both `NISTfn` and `personalization` are empty,
 *   SP 800-185 defines this as plain SHAKE128. Defaults to 16 output bytes
 *   when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with cSHAKE128.
 * ```ts
 * cshake128(new Uint8Array([1, 2, 3]), { dkLen: 32 });
 * ```
 * @example
 * Hash a message with SP 800-185 domain separation.
 * ```ts
 * cshake128(new Uint8Array([1, 2, 3]), {
 *   dkLen: 32,
 *   NISTfn: 'Email Signature',
 *   personalization: new Uint8Array([1, 2, 3]),
 * });
 * ```
 */
export declare const cshake128: TRet<CHashXOF<Keccak, cShakeOpts>>;
/**
 * 256-bit NIST cSHAKE XOF.
 * @param msg - message bytes to hash
 * @param opts - Optional output, personalization, and NIST function-name
 *   settings. When both `NISTfn` and `personalization` are empty,
 *   SP 800-185 defines this as plain SHAKE256. Defaults to 32 output bytes
 *   when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with cSHAKE256.
 * ```ts
 * cshake256(new Uint8Array([1, 2, 3]), { dkLen: 64 });
 * ```
 */
export declare const cshake256: TRet<CHashXOF<Keccak, cShakeOpts>>;
/**
 * Internal KMAC class.
 * SP 800-185 §8.4.1 still recommends keys at least as long as the target
 * security strength.
 */
export declare class _KMAC extends Keccak implements HashXOF<_KMAC> {
    constructor(blockLen: number, outputLen: number, enableXOF: boolean, key: TArg<Uint8Array>, opts?: cShakeOpts);
    protected finish(): void;
    _cloneInto(to?: _KMAC): _KMAC;
    clone(): _KMAC;
}
/** KMAC callable interface. */
export type IKMAC = {
    /**
     * Computes a keyed KMAC digest for one message.
     * @param key - Secret key bytes.
     * @param message - Message bytes to authenticate.
     * @param opts - KMAC output and personalization options. See {@link cShakeOpts}.
     * @returns Authentication tag bytes.
     */
    (key: TArg<Uint8Array>, message: TArg<Uint8Array>, opts?: cShakeOpts): TRet<Uint8Array>;
    /**
     * Creates an incremental KMAC state.
     * @param key - Secret key bytes.
     * @param opts - KMAC output and personalization options. See {@link cShakeOpts}.
     * @returns Stateful KMAC instance.
     */
    create(key: TArg<Uint8Array>, opts?: cShakeOpts): _KMAC;
    /** Default tag size in bytes. */
    outputLen: number;
    /** Input block size in bytes. */
    blockLen: number;
    /** Whether `.create()` returns an XOF-capable instance. */
    canXOF: boolean;
};
/**
 * 128-bit Keccak MAC.
 * @param key - MAC key bytes
 * @param message - message bytes to authenticate
 * @param opts - Optional output and personalization settings. Defaults to
 *   16 output bytes when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Authentication tag bytes.
 * @example
 * Authenticate a message with KMAC128.
 * ```ts
 * const key = new Uint8Array([1, 2, 3]);
 * const message = new Uint8Array([4, 5, 6]);
 * kmac128(key, message);
 * ```
 * @example
 * Authenticate a message with output options and an incremental state.
 * ```ts
 * const key = new Uint8Array([1, 2, 3]);
 * const message = new Uint8Array([4, 5, 6]);
 * const opts = { dkLen: 32, personalization: new Uint8Array([7, 8, 9]) };
 * const tag = kmac128(key, message, opts);
 * const out = new Uint8Array(32);
 * kmac128.create(key, { dkLen: 32 }).update(message).digestInto(out);
 * ```
 */
export declare const kmac128: TRet<IKMAC>;
/**
 * 256-bit Keccak MAC.
 * @param key - MAC key bytes
 * @param message - message bytes to authenticate
 * @param opts - Optional output and personalization settings. Defaults to
 *   32 output bytes when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Authentication tag bytes.
 * @example
 * Authenticate a message with KMAC256.
 * ```ts
 * kmac256(new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]));
 * ```
 */
export declare const kmac256: TRet<IKMAC>;
/**
 * 128-bit Keccak-MAC XOF.
 * @param key - MAC key bytes
 * @param message - message bytes to authenticate
 * @param opts - Optional output and personalization settings. Defaults to
 *   16 output bytes when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Authentication tag bytes.
 * @example
 * Authenticate a message with KMAC128 XOF output.
 * ```ts
 * kmac128xof(new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]), { dkLen: 32 });
 * ```
 */
export declare const kmac128xof: TRet<IKMAC>;
/**
 * 256-bit Keccak-MAC XOF.
 * @param key - MAC key bytes
 * @param message - message bytes to authenticate
 * @param opts - Optional output and personalization settings. Defaults to
 *   32 output bytes when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Authentication tag bytes.
 * @example
 * Authenticate a message with KMAC256 XOF output.
 * ```ts
 * kmac256xof(new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]), { dkLen: 64 });
 * ```
 */
export declare const kmac256xof: TRet<IKMAC>;
/**
 * Internal TupleHash class for byte-array tuple elements.
 * This implementation relies on SP 800-185's byte-oriented encoding form
 * rather than arbitrary bit strings.
 */
export declare class _TupleHash extends Keccak implements HashXOF<_TupleHash> {
    private tupleMode;
    constructor(blockLen: number, outputLen: number, enableXOF: boolean, opts?: cShakeOpts);
    update(data: TArg<Uint8Array>): this;
    protected finish(): void;
    _cloneInto(to?: _TupleHash): _TupleHash;
    clone(): _TupleHash;
}
/**
 * 128-bit TupleHASH. `tuple(['ab', 'cd']) != tuple(['a', 'bcd'])`.
 * @param messages - ordered byte-array tuple
 * @param opts - Optional output and personalization settings. Defaults to
 *   16 output bytes when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a tuple of byte arrays with TupleHash128.
 * ```ts
 * tuplehash128([new Uint8Array([1]), new Uint8Array([2])]);
 * ```
 */
export declare const tuplehash128: TRet<ITupleHash>;
/**
 * 256-bit TupleHASH. `tuple(['ab', 'cd']) != tuple(['a', 'bcd'])`.
 * @param messages - ordered byte-array tuple
 * @param opts - Optional output and personalization settings. Defaults to
 *   32 output bytes when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a tuple of byte arrays with TupleHash256.
 * ```ts
 * tuplehash256([new Uint8Array([1]), new Uint8Array([2])]);
 * ```
 */
export declare const tuplehash256: TRet<ITupleHash>;
/**
 * 128-bit TupleHASH XOF.
 * @param messages - ordered byte-array tuple
 * @param opts - Optional output and personalization settings. Defaults to
 *   16 output bytes when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a tuple of byte arrays with TupleHash128 XOF output.
 * ```ts
 * tuplehash128xof([new Uint8Array([1]), new Uint8Array([2])], { dkLen: 32 });
 * ```
 */
export declare const tuplehash128xof: TRet<ITupleHash>;
/**
 * 256-bit TupleHASH XOF.
 * @param messages - ordered byte-array tuple
 * @param opts - Optional output and personalization settings. Defaults to
 *   32 output bytes when `dkLen` is omitted. See {@link cShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a tuple of byte arrays with TupleHash256 XOF output.
 * ```ts
 * tuplehash256xof([new Uint8Array([1]), new Uint8Array([2])], { dkLen: 64 });
 * ```
 */
export declare const tuplehash256xof: TRet<ITupleHash>;
type ParallelOpts = KangarooOpts & {
    blockLen?: number;
};
/** Internal Parallel Keccak Hash class. */
export declare class _ParallelHash extends Keccak implements HashXOF<_ParallelHash> {
    private leafHash?;
    protected leafCons: () => Hash<Keccak>;
    private leafTemplate?;
    private leafCV?;
    private chunkPos;
    private chunksDone;
    private chunkLen;
    private leafMode;
    constructor(blockLen: number, outputLen: number, leafCons: () => Hash<Keccak>, enableXOF: boolean, opts?: ParallelOpts);
    private flushLeaf;
    update(data: TArg<Uint8Array>): this;
    protected finish(): void;
    _cloneInto(to?: _ParallelHash): _ParallelHash;
    destroy(): void;
    clone(): _ParallelHash;
}
/**
 * 128-bit ParallelHash. In JS, it is not parallel.
 * @param msg - message bytes to hash
 * @param opts - Optional output, personalization, and chunking settings.
 *   Defaults to 16 output bytes when `dkLen` is omitted.
 *   See {@link ParallelOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with ParallelHash128.
 * ```ts
 * parallelhash128(new Uint8Array([1, 2, 3]));
 * ```
 * @example
 * Hash a message with chunking and personalization settings.
 * ```ts
 * parallelhash128(new Uint8Array([1, 2, 3]), {
 *   blockLen: 8,
 *   dkLen: 32,
 *   personalization: new Uint8Array([4, 5, 6]),
 * });
 * ```
 */
export declare const parallelhash128: TRet<CHash<Keccak, ParallelOpts>>;
/**
 * 256-bit ParallelHash. In JS, it is not parallel.
 * @param msg - message bytes to hash
 * @param opts - Optional output, personalization, and chunking settings.
 *   Defaults to 32 output bytes when `dkLen` is omitted.
 *   See {@link ParallelOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with ParallelHash256.
 * ```ts
 * parallelhash256(new Uint8Array([1, 2, 3]));
 * ```
 */
export declare const parallelhash256: TRet<CHash<Keccak, ParallelOpts>>;
/**
 * 128-bit ParallelHash XOF. In JS, it is not parallel.
 * @param msg - message bytes to hash
 * @param opts - Optional output, personalization, and chunking settings.
 *   Defaults to 16 output bytes when `dkLen` is omitted.
 *   See {@link ParallelOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with ParallelHash128 XOF output.
 * ```ts
 * parallelhash128xof(new Uint8Array([1, 2, 3]), { dkLen: 32 });
 * ```
 */
export declare const parallelhash128xof: TRet<CHashXOF<Keccak, ParallelOpts>>;
/**
 * 256-bit ParallelHash XOF. In JS, it is not parallel.
 * @param msg - message bytes to hash
 * @param opts - Optional output, personalization, and chunking settings.
 *   Defaults to 32 output bytes when `dkLen` is omitted.
 *   See {@link ParallelOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with ParallelHash256 XOF output.
 * ```ts
 * parallelhash256xof(new Uint8Array([1, 2, 3]), { dkLen: 64 });
 * ```
 */
export declare const parallelhash256xof: TRet<CHashXOF<Keccak, ParallelOpts>>;
/**
 * TurboSHAKE options.
 * `D` is the domain separation byte; RFC 9861 defines output length `L`
 * as a positive integer.
 */
export type TurboshakeOpts = ShakeOpts & {
    /** Optional domain separation byte in the `0x01..0x7f` range. */
    D?: number;
};
/**
 * TurboSHAKE 128-bit: reduced 12-round keccak.
 * Should've been a simple "shake with 12 rounds", but we got a whole new
 * spec about Turbo SHAKE Pro MAX.
 * @param msg - message bytes to hash
 * @param opts - Optional output-length and domain-separation settings.
 *   RFC 9861 §2.1 defaults `D` to `0x1f`. Defaults to 32 output bytes when
 *   `dkLen` is omitted. See {@link TurboshakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with TurboSHAKE128.
 * ```ts
 * turboshake128(new Uint8Array([1, 2, 3]), { dkLen: 32 });
 * ```
 * @example
 * Hash a message with an explicit domain-separation byte.
 * ```ts
 * turboshake128(new Uint8Array([1, 2, 3]), { dkLen: 32, D: 0x1f });
 * ```
 */
export declare const turboshake128: TRet<CHashXOF<Keccak, TurboshakeOpts>>;
/**
 * TurboSHAKE 256-bit: reduced 12-round keccak.
 * @param msg - message bytes to hash
 * @param opts - Optional output-length and domain-separation settings.
 *   RFC 9861 §2.1 defaults `D` to `0x1f`. Defaults to 64 output bytes when
 *   `dkLen` is omitted. See {@link TurboshakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with TurboSHAKE256.
 * ```ts
 * turboshake256(new Uint8Array([1, 2, 3]), { dkLen: 64 });
 * ```
 */
export declare const turboshake256: TRet<CHashXOF<Keccak, TurboshakeOpts>>;
/** K12 options. */
export type KangarooOpts = {
    /**
     * Desired digest length in bytes.
     * RFC 9861 §3 defines output length `L` as a positive integer.
     */
    dkLen?: number;
    /**
     * Optional personalization string mixed into the sponge state.
     * Stateful K12 instances keep an internal copy so caller buffers can be
     * wiped independently.
     */
    personalization?: Uint8Array;
};
/** Internal K12 hash class. */
export declare class _KangarooTwelve extends Keccak implements HashXOF<_KangarooTwelve> {
    readonly chunkLen = 8192;
    private leafHash?;
    private leafTemplate?;
    private leafCV?;
    protected leafLen: number;
    private personalization;
    private chunkPos;
    private chunksDone;
    constructor(blockLen: number, leafLen: number, outputLen: number, rounds: number, opts: KangarooOpts);
    update(data: TArg<Uint8Array>): this;
    private flushLeaf;
    protected finish(): void;
    destroy(): void;
    _cloneInto(to?: _KangarooTwelve): _KangarooTwelve;
    clone(): _KangarooTwelve;
}
/**
 * 128-bit KangarooTwelve (k12): reduced 12-round keccak.
 * @param msg - message bytes to hash
 * @param opts - Optional output and personalization settings. Defaults to
 *   32 output bytes when `dkLen` is omitted. See {@link KangarooOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with KangarooTwelve-128.
 * ```ts
 * kt128(new Uint8Array([1, 2, 3]));
 * ```
 * @example
 * Hash a message with KangarooTwelve-128 personalization.
 * ```ts
 * kt128(new Uint8Array([1, 2, 3]), {
 *   dkLen: 64,
 *   personalization: new Uint8Array([4, 5, 6]),
 * });
 * ```
 */
export declare const kt128: TRet<CHash<_KangarooTwelve, KangarooOpts>>;
/**
 * 256-bit KangarooTwelve (k12): reduced 12-round keccak.
 * @param msg - message bytes to hash
 * @param opts - Optional output and personalization settings. Defaults to
 *   64 output bytes when `dkLen` is omitted. See {@link KangarooOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with KangarooTwelve-256.
 * ```ts
 * kt256(new Uint8Array([1, 2, 3]));
 * ```
 */
export declare const kt256: TRet<CHash<_KangarooTwelve, KangarooOpts>>;
/** KangarooTwelve-based MAC function type. */
export type HopMAC = (key: TArg<Uint8Array>, message: TArg<Uint8Array>, personalization: TArg<Uint8Array>, dkLen?: number) => TRet<Uint8Array>;
/**
 * 128-bit KangarooTwelve-based MAC.
 *
 * These untested (there is no test vectors or implementation available). Use at your own risk.
 * HopMAC128(Key, M, C, L) = KT128(Key, KT128(M, C, 32), L)
 * HopMAC256(Key, M, C, L) = KT256(Key, KT256(M, C, 64), L)
 * The inner KangarooTwelve call always uses a fixed 32-byte digest here,
 * regardless of the outer `dkLen`.
 * @param key - MAC key bytes
 * @param message - message bytes to authenticate
 * @param personalization - personalization bytes mixed into the inner hash
 * @param dkLen - optional output length in bytes
 * @returns Authentication tag bytes.
 * @example
 * Authenticate a message with HopMAC128.
 * ```ts
 * HopMAC128(new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3]), 32);
 * ```
 */
export declare const HopMAC128: TRet<HopMAC>;
/**
 * 256-bit KangarooTwelve-based MAC.
 * Like `HopMAC128`, there are no test vectors or known independent
 * implementations available for cross-checking.
 * @param key - MAC key bytes
 * @param message - message bytes to authenticate
 * @param personalization - personalization bytes mixed into the inner hash
 * @param dkLen - optional output length in bytes. The inner KangarooTwelve
 *   call still uses a fixed 64-byte digest here, regardless of the outer
 *   `dkLen`.
 * @returns Authentication tag bytes.
 * @example
 * Authenticate a message with HopMAC256.
 * ```ts
 * HopMAC256(new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3]), 64);
 * ```
 */
export declare const HopMAC256: TRet<HopMAC>;
/**
 * More at
 * {@link https://github.com/XKCP/XKCP/tree/master/lib/high/Keccak/PRG}.
 * Accepted capacities must keep `rho = 1598 - capacity` byte-aligned, and
 * `.clean()` later also requires `rate > 801`.
 */
export declare class _KeccakPRG extends Keccak implements PRG {
    protected rate: number;
    private entropyAdded;
    constructor(capacity: number);
    protected keccak(): void;
    update(data: TArg<Uint8Array>): this;
    protected finish(): void;
    digestInto(_out: TArg<Uint8Array>): void;
    addEntropy(seed?: TArg<Uint8Array>): void;
    xofInto(out: TArg<Uint8Array>): TRet<Uint8Array>;
    randomBytes(length: number): TRet<Uint8Array>;
    clean(): void;
    _cloneInto(to?: _KeccakPRG): _KeccakPRG;
    clone(): _KeccakPRG;
}
/**
 * KeccakPRG: pseudo-random generator based on Keccak.
 * See {@link https://keccak.team/files/CSF-0.1.pdf}.
 * Fresh instances reject output until `.addEntropy()` has been called. With no
 * argument, `addEntropy()` obtains 32 bytes from the platform CSPRNG; callers
 * may instead supply their own non-empty entropy bytes.
 * @param capacity - sponge capacity in bits. Accepted values are those that
 *   keep `rho = 1598 - capacity` byte-aligned; the default `254` is chosen
 *   because it satisfies that duplex layout while leaving a wide byte-aligned
 *   rate.
 * @returns PRG instance backed by a Keccak sponge.
 * @example
 * Create a Keccak-based pseudorandom generator and read bytes from it.
 * ```ts
 * import { keccakprg } from '@noble/hashes/sha3-addons.js';
 *
 * const prg = keccakprg(254);
 * prg.addEntropy();
 * prg.randomBytes(8);
 * ```
 */
export declare const keccakprg: (capacity?: number) => TRet<_KeccakPRG>;
export {};
