/**
 * Utilities for hex, bytes, CSPRNG.
 * @module
 */
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
/**
 * Bytes API type helpers for old + new TypeScript.
 *
 * TS 5.6 has `Uint8Array`, while TS 5.9+ made it generic `Uint8Array<ArrayBuffer>`.
 * We can't use specific return type, because TS 5.6 will error.
 * We can't use generic return type, because most TS 5.9 software will expect specific type.
 *
 * Maps typed-array input leaves to broad forms.
 * These are compatibility adapters, not ownership guarantees.
 *
 * - `TArg` keeps byte inputs broad.
 * - `TRet` marks byte outputs for TS 5.6 and TS 5.9+ compatibility.
 */
export type TypedArg<T> = T extends BigInt64Array ? BigInt64Array : T extends BigUint64Array ? BigUint64Array : T extends Float32Array ? Float32Array : T extends Float64Array ? Float64Array : T extends Int16Array ? Int16Array : T extends Int32Array ? Int32Array : T extends Int8Array ? Int8Array : T extends Uint16Array ? Uint16Array : T extends Uint32Array ? Uint32Array : T extends Uint8ClampedArray ? Uint8ClampedArray : T extends Uint8Array ? Uint8Array : never;
/** Maps typed-array output leaves to narrow TS-compatible forms. */
export type TypedRet<T> = T extends BigInt64Array ? ReturnType<typeof BigInt64Array.of> : T extends BigUint64Array ? ReturnType<typeof BigUint64Array.of> : T extends Float32Array ? ReturnType<typeof Float32Array.of> : T extends Float64Array ? ReturnType<typeof Float64Array.of> : T extends Int16Array ? ReturnType<typeof Int16Array.of> : T extends Int32Array ? ReturnType<typeof Int32Array.of> : T extends Int8Array ? ReturnType<typeof Int8Array.of> : T extends Uint16Array ? ReturnType<typeof Uint16Array.of> : T extends Uint32Array ? ReturnType<typeof Uint32Array.of> : T extends Uint8ClampedArray ? ReturnType<typeof Uint8ClampedArray.of> : T extends Uint8Array ? ReturnType<typeof Uint8Array.of> : never;
/** Recursively adapts byte-carrying API input types. See {@link TypedArg}. */
export type TArg<T> = T | ([TypedArg<T>] extends [never] ? T extends (...args: infer A) => infer R ? ((...args: {
    [K in keyof A]: TRet<A[K]>;
}) => TArg<R>) & {
    [K in keyof T]: T[K] extends (...args: any) => any ? T[K] : TArg<T[K]>;
} : T extends [infer A, ...infer R] ? [TArg<A>, ...{
    [K in keyof R]: TArg<R[K]>;
}] : T extends readonly [infer A, ...infer R] ? readonly [TArg<A>, ...{
    [K in keyof R]: TArg<R[K]>;
}] : T extends (infer A)[] ? TArg<A>[] : T extends readonly (infer A)[] ? readonly TArg<A>[] : T extends Promise<infer A> ? Promise<TArg<A>> : T extends object ? {
    [K in keyof T]: TArg<T[K]>;
} : T : TypedArg<T>);
/** Recursively adapts byte-carrying API output types. See {@link TypedArg}. */
export type TRet<T> = T extends unknown ? T & ([TypedRet<T>] extends [never] ? T extends (...args: infer A) => infer R ? ((...args: {
    [K in keyof A]: TArg<A[K]>;
}) => TRet<R>) & {
    [K in keyof T]: T[K] extends (...args: any) => any ? T[K] : TRet<T[K]>;
} : T extends [infer A, ...infer R] ? [TRet<A>, ...{
    [K in keyof R]: TRet<R[K]>;
}] : T extends readonly [infer A, ...infer R] ? readonly [TRet<A>, ...{
    [K in keyof R]: TRet<R[K]>;
}] : T extends (infer A)[] ? TRet<A>[] : T extends readonly (infer A)[] ? readonly TRet<A>[] : T extends Promise<infer A> ? Promise<TRet<A>> : T extends object ? {
    [K in keyof T]: TRet<T[K]>;
} : T : TypedRet<T>) : never;
/**
 * Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
 * @param a - value to test
 * @returns `true` when the value is a Uint8Array-compatible view.
 * @example
 * Check whether a value is a Uint8Array-compatible view.
 * ```ts
 * isBytes(new Uint8Array([1, 2, 3]));
 * ```
 */
export declare function isBytes(a: unknown): a is Uint8Array;
/**
 * Asserts something is a non-negative integer.
 * @param n - number to validate
 * @param title - label included in thrown errors
 * @returns The validated number.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Validate a non-negative integer option.
 * ```ts
 * anumber(32, 'length');
 * ```
 */
export declare function anumber(n: number, title?: string): number;
/**
 * Asserts something is a boolean.
 * @param value - value to validate
 * @param title - label included in thrown errors
 * @returns The validated boolean.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Validate a boolean option.
 * ```ts
 * abool(true, 'enableXOF');
 * ```
 */
export declare function abool(value: boolean, title?: string): boolean;
/**
 * Asserts something is Uint8Array.
 * @param value - value to validate
 * @param length - optional exact length constraint
 * @param title - label included in thrown errors
 * @returns The validated byte array.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Validate that a value is a byte array.
 * ```ts
 * abytes(new Uint8Array([1, 2, 3]));
 * ```
 */
export declare function abytes(value: TArg<Uint8Array>, length?: number, title?: string): TRet<Uint8Array>;
/**
 * Copies bytes into a fresh Uint8Array.
 * Buffer-style slices can alias the same backing store, so callers that need ownership should copy.
 * @param bytes - source bytes to clone
 * @returns Freshly allocated copy of `bytes`.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Clone a byte array before mutating it.
 * ```ts
 * const copy = copyBytes(new Uint8Array([1, 2, 3]));
 * ```
 */
export declare function copyBytes(bytes: TArg<Uint8Array>): TRet<Uint8Array>;
/**
 * Asserts something is a wrapped hash constructor.
 * @param h - hash constructor to validate
 * @throws On wrong argument types or invalid hash wrapper shape. {@link TypeError}
 * @throws On invalid hash metadata ranges or values. {@link RangeError}
 * @throws If the hash metadata allows empty outputs or block sizes. {@link Error}
 * @example
 * Validate a callable hash wrapper.
 * ```ts
 * import { ahash } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * ahash(sha256);
 * ```
 */
export declare function ahash(h: TArg<CHash>): void;
/**
 * Asserts a hash instance has not been destroyed or finished.
 * @param instance - hash instance to validate
 * @param checkFinished - whether to reject finalized instances
 * @throws If the hash instance has already been destroyed or finalized. {@link Error}
 * @example
 * Validate that a hash instance is still usable.
 * ```ts
 * import { aexists } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const hash = sha256.create();
 * aexists(hash);
 * ```
 */
export declare function aexists(instance: any, checkFinished?: boolean): void;
/**
 * Asserts output is a sufficiently-sized byte array.
 * @param out - destination buffer
 * @param instance - hash instance providing output length
 * Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Validate a caller-provided digest buffer.
 * ```ts
 * import { aoutput } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const hash = sha256.create();
 * aoutput(new Uint8Array(hash.outputLen), hash);
 * ```
 */
export declare function aoutput(out: any, instance: any): void;
/** Generic type encompassing 8/16/32-bit typed arrays, but not 64-bit. */
export type TypedArray = Int8Array | Uint8ClampedArray | Uint8Array | Uint16Array | Int16Array | Uint32Array | Int32Array;
/**
 * Casts a typed array view to Uint8Array.
 * @param arr - source typed array
 * @returns Uint8Array view over the same buffer.
 * @example
 * Reinterpret a typed array as bytes.
 * ```ts
 * u8(new Uint32Array([1, 2]));
 * ```
 */
export declare function u8(arr: TArg<TypedArray>): TRet<Uint8Array>;
/**
 * Casts a typed array view to Uint32Array.
 * `arr.byteOffset` must already be 4-byte aligned or the platform
 * Uint32Array constructor will throw.
 * @param arr - source typed array
 * @returns Uint32Array view over the same buffer.
 * @example
 * Reinterpret a byte array as 32-bit words.
 * ```ts
 * u32(new Uint8Array(8));
 * ```
 */
export declare function u32(arr: TArg<TypedArray>): TRet<Uint32Array>;
/**
 * Zeroizes typed arrays in place. Warning: JS provides no guarantees.
 * @param arrays - arrays to overwrite with zeros
 * @example
 * Zeroize sensitive buffers in place.
 * ```ts
 * clean(new Uint8Array([1, 2, 3]));
 * ```
 */
export declare function clean(...arrays: TArg<TypedArray[]>): void;
/**
 * Creates a DataView for byte-level manipulation.
 * @param arr - source typed array
 * @returns DataView over the same buffer region.
 * @example
 * Create a DataView over an existing buffer.
 * ```ts
 * createView(new Uint8Array(4));
 * ```
 */
export declare function createView(arr: TArg<TypedArray>): DataView;
/**
 * Rotate-right operation for uint32 values.
 * @param word - source word
 * @param shift - shift amount in bits
 * @returns Rotated word.
 * @example
 * Rotate a 32-bit word to the right.
 * ```ts
 * rotr(0x12345678, 8);
 * ```
 */
export declare function rotr(word: number, shift: number): number;
/**
 * Rotate-left operation for uint32 values.
 * @param word - source word
 * @param shift - shift amount in bits
 * @returns Rotated word.
 * @example
 * Rotate a 32-bit word to the left.
 * ```ts
 * rotl(0x12345678, 8);
 * ```
 */
export declare function rotl(word: number, shift: number): number;
/** Whether the current platform is little-endian. */
export declare const isLE: boolean;
/**
 * Byte-swap operation for uint32 values.
 * @param word - source word
 * @returns Word with reversed byte order.
 * @example
 * Reverse the byte order of a 32-bit word.
 * ```ts
 * byteSwap(0x11223344);
 * ```
 */
export declare function byteSwap(word: number): number;
/**
 * Conditionally byte-swaps one 32-bit word on big-endian platforms.
 * @param n - source word
 * @returns Original or byte-swapped word depending on platform endianness.
 * @example
 * Normalize a 32-bit word for host endianness.
 * ```ts
 * swap8IfBE(0x11223344);
 * ```
 */
export declare const swap8IfBE: (n: number) => number;
/**
 * Byte-swaps every word of a Uint32Array in place.
 * @param arr - array to mutate
 * @returns The same array after mutation; callers pass live state arrays here.
 * @example
 * Reverse the byte order of every word in place.
 * ```ts
 * byteSwap32(new Uint32Array([0x11223344]));
 * ```
 */
export declare function byteSwap32(arr: TArg<Uint32Array>): TRet<Uint32Array>;
/**
 * Conditionally byte-swaps a Uint32Array on big-endian platforms.
 * @param u - array to normalize for host endianness
 * @returns Original or byte-swapped array depending on platform endianness.
 *   On big-endian runtimes this mutates `u` in place via `byteSwap32(...)`.
 * @example
 * Normalize a word array for host endianness.
 * ```ts
 * swap32IfBE(new Uint32Array([0x11223344]));
 * ```
 */
export declare const swap32IfBE: (u: TArg<Uint32Array>) => TRet<Uint32Array>;
/**
 * Convert byte array to hex string.
 * Uses the built-in function when available and assumes it matches the tested
 * fallback semantics.
 * @param bytes - bytes to encode
 * @returns Lowercase hexadecimal string.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Convert bytes to lowercase hexadecimal.
 * ```ts
 * bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])); // 'cafe0123'
 * ```
 */
export declare function bytesToHex(bytes: TArg<Uint8Array>): string;
/**
 * Convert hex string to byte array. Uses built-in function, when available.
 * @param hex - hexadecimal string to decode
 * @returns Decoded bytes.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Decode lowercase hexadecimal into bytes.
 * ```ts
 * hexToBytes('cafe0123'); // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 * ```
 */
export declare function hexToBytes(hex: string): TRet<Uint8Array>;
/**
 * Yields to the host task scheduler so timers, I/O, and rendering can make progress.
 * Uses the Web Scheduling API when available or `setTimeout` as a cross-platform fallback.
 * Host-task yields are much slower than microtasks (roughly 1ms with the timer fallback), so
 * async loops should use `asyncTick >= 10` to amortize scheduling overhead to about 10% while
 * still allowing other event-loop work to proceed.
 * @param onReject - optional cleanup invoked only if the host yield fails
 * @example
 * Yield to the next scheduler tick.
 * ```ts
 * await nextTick();
 * ```
 */
export declare function nextTick(onReject?: () => void): Promise<void>;
/**
 * Returns control to the host event loop every `tick` milliseconds to avoid blocking long loops.
 * @param iters - number of loop iterations to run
 * @param tick - maximum time slice in milliseconds
 * @param cb - callback executed on each iteration
 * @param onReject - optional cleanup invoked only if a host yield fails
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @example
 * Run a loop that periodically yields back to the event loop.
 * ```ts
 * await asyncLoop(2, 0, () => {});
 * ```
 */
export declare function asyncLoop(iters: number, tick: number, cb: (i: number) => void, onReject?: () => void): Promise<void>;
/**
 * Converts string to bytes using UTF8 encoding.
 * Built-in doesn't validate input to be string: we do the check.
 * Non-ASCII details are delegated to the platform `TextEncoder`.
 * @param str - string to encode
 * @returns UTF-8 encoded bytes.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Encode a string as UTF-8 bytes.
 * ```ts
 * utf8ToBytes('abc'); // Uint8Array.from([97, 98, 99])
 * ```
 */
export declare function utf8ToBytes(str: string): TRet<Uint8Array>;
/** KDFs can accept string or Uint8Array for user convenience. */
export type KDFInput = string | Uint8Array;
/**
 * Helper for KDFs: consumes Uint8Array or string.
 * String inputs are UTF-8 encoded; byte-array inputs stay aliased to the caller buffer.
 * @param data - user-provided KDF input
 * @param errorTitle - label included in thrown errors
 * @returns Byte representation of the input.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Normalize KDF input to bytes.
 * ```ts
 * kdfInputToBytes('password');
 * ```
 */
export declare function kdfInputToBytes(data: TArg<KDFInput>, errorTitle?: string): TRet<Uint8Array>;
/**
 * Copies several Uint8Arrays into one.
 * @param arrays - arrays to concatenate
 * @returns Concatenated byte array.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Concatenate multiple byte arrays.
 * ```ts
 * concatBytes(new Uint8Array([1]), new Uint8Array([2]));
 * ```
 */
export declare function concatBytes(...arrays: TArg<Uint8Array[]>): TRet<Uint8Array>;
type EmptyObj = {};
/**
 * Validates declared required and optional field types on a plain object.
 * This walks field schemas and formats detailed errors, so avoid it on hot paths; use direct
 * one-line guards such as `abytes()`, `abool()`, or `anumber()` instead.
 * @param object - object to validate
 * @param fields - map of required field names to expected types
 * @param optFields - map of optional field names to expected types
 * @param title - label included in thrown errors
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Validate required and optional option fields.
 * ```ts
 * validateObject({ N: 1024, dkLen: 32 }, { N: 'number' }, { dkLen: 'number' });
 * ```
 */
export declare const validateObject: (object: Record<string, any>, fields?: Record<string, string>, optFields?: Record<string, string>, title?: string) => void;
/**
 * Merges default options and passed options.
 * @param defaults - base option object
 * @param opts - user overrides
 * @param title - label included in thrown override errors
 * @returns Fresh merged option object with a null prototype.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Merge user overrides onto default options.
 * ```ts
 * checkOpts({ dkLen: 32 }, { asyncTick: 10 });
 * ```
 */
export declare function checkOpts<T1 extends EmptyObj, T2 extends EmptyObj>(defaults: T1, opts?: T2, title?: string): T1 & T2;
/** Common interface for all hash instances. */
export interface Hash<T> {
    /** Bytes processed per compression block. */
    blockLen: number;
    /** Bytes produced by `digest()`. */
    outputLen: number;
    /** Whether the instance supports XOF-style variable-length output via `xof()` / `xofInto()`. */
    canXOF: boolean;
    /**
     * Absorbs more message bytes into the running hash state.
     * @param buf - message chunk to absorb
     * @returns The same hash instance for chaining.
     */
    update(buf: TArg<Uint8Array>): this;
    /**
     * Finalizes the hash into a caller-provided buffer.
     * @param buf - destination buffer
     * @returns Nothing. Implementations write into `buf` in place.
     */
    digestInto(buf: TArg<Uint8Array>): void;
    /**
     * Finalizes the hash and returns a freshly allocated digest.
     * @returns Digest bytes.
     */
    digest(): TRet<Uint8Array>;
    /** Wipes internal state and makes the instance unusable. */
    destroy(): void;
    /**
     * Copies the current hash state into an existing or new instance.
     * @param to - Optional destination instance to reuse.
     * @returns Cloned hash state.
     */
    _cloneInto(to?: T): T;
    /**
     * Creates an independent copy of the current hash state.
     * @returns Cloned hash instance.
     */
    clone(): T;
}
/**
 * The pseudorandom number generator doesn't wipe current state:
 * instead, it generates new one based on previous state + entropy.
 * Not reseed/rekey, since AES CTR DRBG does rekey on each randomBytes,
 * which is in fact `reseed`, since it changes counter too.
 */
export interface PRG {
    /**
     * Mixes fresh entropy into the current generator state.
     * @param seed - Non-empty entropy bytes to absorb. When omitted, the implementation uses its
     * system RNG.
     */
    addEntropy(seed?: TArg<Uint8Array>): void;
    /**
     * Produces a requested number of pseudorandom bytes.
     * @param bytesLength - Number of bytes to generate.
     * @returns Random byte array.
     */
    randomBytes(bytesLength: number): TRet<Uint8Array>;
    /** Destroys the generator state. */
    clean(): void;
}
/**
 * XOF: streaming API to read digest in chunks.
 * Same as 'squeeze' in keccak/k12 and 'seek' in blake3, but more generic name.
 * When hash used in XOF mode it is up to user to call '.destroy' afterwards, since we cannot
 * destroy state, next call can require more bytes.
 */
export type HashXOF<T extends Hash<T>> = Hash<T> & {
    /**
     * Reads more bytes from the XOF stream.
     * @param bytes - number of bytes to read
     * @returns Requested digest bytes.
     */
    xof(bytes: number): TRet<Uint8Array>;
    /**
     * Reads more bytes from the XOF stream into a caller-provided buffer.
     * @param buf - destination buffer
     * @returns Filled output buffer.
     */
    xofInto(buf: TArg<Uint8Array>): TRet<Uint8Array>;
};
/** Hash constructor or factory type. */
export type HasherCons<T, Opts = undefined> = Opts extends undefined ? () => T : (opts?: Opts) => T;
/** Optional hash metadata. */
export type HashInfo = {
    /** DER-encoded object identifier bytes for the hash algorithm. */
    oid?: TRet<Uint8Array>;
};
/** Callable hash function type. */
export type CHash<T extends Hash<T> = Hash<any>, Opts = undefined> = {
    /** Digest size in bytes. */
    outputLen: number;
    /** Input block size in bytes. */
    blockLen: number;
    /** Whether `.create()` returns a hash instance that can be used as an XOF stream. */
    canXOF: boolean;
} & HashInfo & (Opts extends undefined ? {
    (msg: TArg<Uint8Array>): TRet<Uint8Array>;
    create(): T;
} : {
    (msg: TArg<Uint8Array>, opts?: TArg<Opts>): TRet<Uint8Array>;
    create(opts?: Opts): T;
});
/** Callable extendable-output hash function type. */
export type CHashXOF<T extends HashXOF<T> = HashXOF<any>, Opts = undefined> = CHash<T, Opts>;
/**
 * Creates a callable hash function from a stateful class constructor.
 * @param hashCons - hash constructor or factory
 * @param info - optional metadata such as DER OID
 * @returns Frozen callable hash wrapper with `.create()`.
 *   Wrapper construction eagerly calls `hashCons(undefined)` once to read
 *   `outputLen` / `blockLen`, so constructor side effects happen at module
 *   init time.
 * @throws On wrong argument types. {@link TypeError}
 * @example
 * Wrap a stateful hash constructor into a callable helper.
 * ```ts
 * import { createHasher } from '@noble/hashes/utils.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const wrapped = createHasher(sha256.create, { oid: sha256.oid });
 * wrapped(new Uint8Array([1]));
 * ```
 */
export declare function createHasher<T extends Hash<T>, Opts = undefined>(hashCons: HasherCons<T, Opts>, info?: TArg<HashInfo>): TRet<CHash<T, Opts>>;
/**
 * Cryptographically secure PRNG backed by `crypto.getRandomValues`.
 * @param bytesLength - number of random bytes to generate
 * @returns Random bytes.
 * The platform `getRandomValues()` implementation still defines any
 * single-call length cap, and this helper rejects oversize requests
 * with a stable library `RangeError` instead of host-specific errors.
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @throws If the current runtime does not provide `crypto.getRandomValues`. {@link Error}
 * @example
 * Generate a fresh random key or nonce.
 * ```ts
 * const key = randomBytes(16);
 * ```
 */
export declare function randomBytes(bytesLength?: number): TRet<Uint8Array>;
/**
 * Creates OID metadata for NIST hashes with prefix `06 09 60 86 48 01 65 03 04 02`.
 * @param suffix - final OID byte for the selected hash.
 *   The helper accepts any byte even though only the documented NIST hash
 *   suffixes are meaningful downstream.
 * @returns Object containing the DER-encoded OID.
 * @example
 * Build OID metadata for a NIST hash.
 * ```ts
 * oidNist(0x01);
 * ```
 */
export declare const oidNist: (suffix: number) => TRet<Required<HashInfo>>;
export {};
