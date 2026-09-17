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
export type TypedArg<T> = T extends BigInt64Array
  ? BigInt64Array
  : T extends BigUint64Array
    ? BigUint64Array
    : T extends Float32Array
      ? Float32Array
      : T extends Float64Array
        ? Float64Array
        : T extends Int16Array
          ? Int16Array
          : T extends Int32Array
            ? Int32Array
            : T extends Int8Array
              ? Int8Array
              : T extends Uint16Array
                ? Uint16Array
                : T extends Uint32Array
                  ? Uint32Array
                  : T extends Uint8ClampedArray
                    ? Uint8ClampedArray
                    : T extends Uint8Array
                      ? Uint8Array
                      : never;
/** Maps typed-array output leaves to narrow TS-compatible forms. */
export type TypedRet<T> = T extends BigInt64Array
  ? ReturnType<typeof BigInt64Array.of>
  : T extends BigUint64Array
    ? ReturnType<typeof BigUint64Array.of>
    : T extends Float32Array
      ? ReturnType<typeof Float32Array.of>
      : T extends Float64Array
        ? ReturnType<typeof Float64Array.of>
        : T extends Int16Array
          ? ReturnType<typeof Int16Array.of>
          : T extends Int32Array
            ? ReturnType<typeof Int32Array.of>
            : T extends Int8Array
              ? ReturnType<typeof Int8Array.of>
              : T extends Uint16Array
                ? ReturnType<typeof Uint16Array.of>
                : T extends Uint32Array
                  ? ReturnType<typeof Uint32Array.of>
                  : T extends Uint8ClampedArray
                    ? ReturnType<typeof Uint8ClampedArray.of>
                    : T extends Uint8Array
                      ? ReturnType<typeof Uint8Array.of>
                      : never;
/** Recursively adapts byte-carrying API input types. See {@link TypedArg}. */
export type TArg<T> =
  | T
  | ([TypedArg<T>] extends [never]
      ? T extends (...args: infer A) => infer R
        ? ((...args: { [K in keyof A]: TRet<A[K]> }) => TArg<R>) & {
            [K in keyof T]: T[K] extends (...args: any) => any ? T[K] : TArg<T[K]>;
          }
        : T extends [infer A, ...infer R]
          ? [TArg<A>, ...{ [K in keyof R]: TArg<R[K]> }]
          : T extends readonly [infer A, ...infer R]
            ? readonly [TArg<A>, ...{ [K in keyof R]: TArg<R[K]> }]
            : T extends (infer A)[]
              ? TArg<A>[]
              : T extends readonly (infer A)[]
                ? readonly TArg<A>[]
                : T extends Promise<infer A>
                  ? Promise<TArg<A>>
                  : T extends object
                    ? { [K in keyof T]: TArg<T[K]> }
                    : T
      : TypedArg<T>);
/** Recursively adapts byte-carrying API output types. See {@link TypedArg}. */
export type TRet<T> = T extends unknown
  ? T &
      ([TypedRet<T>] extends [never]
        ? T extends (...args: infer A) => infer R
          ? ((...args: { [K in keyof A]: TArg<A[K]> }) => TRet<R>) & {
              [K in keyof T]: T[K] extends (...args: any) => any ? T[K] : TRet<T[K]>;
            }
          : T extends [infer A, ...infer R]
            ? [TRet<A>, ...{ [K in keyof R]: TRet<R[K]> }]
            : T extends readonly [infer A, ...infer R]
              ? readonly [TRet<A>, ...{ [K in keyof R]: TRet<R[K]> }]
              : T extends (infer A)[]
                ? TRet<A>[]
                : T extends readonly (infer A)[]
                  ? readonly TRet<A>[]
                  : T extends Promise<infer A>
                    ? Promise<TRet<A>>
                    : T extends object
                      ? { [K in keyof T]: TRet<T[K]> }
                      : T
        : TypedRet<T>)
  : never;
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
export function isBytes(a: unknown): a is Uint8Array {
  // Plain `instanceof Uint8Array` is too strict for some Buffer / proxy / cross-realm cases.
  // The fallback still requires a real ArrayBuffer view, so plain
  // JSON-deserialized `{ constructor: ... }` spoofing is rejected, and
  // `BYTES_PER_ELEMENT === 1` keeps the fallback on byte-oriented views.
  return (
    a instanceof Uint8Array ||
    (ArrayBuffer.isView(a) &&
      a.constructor.name === 'Uint8Array' &&
      'BYTES_PER_ELEMENT' in a &&
      a.BYTES_PER_ELEMENT === 1)
  );
}

// Shared error-message prefix builder. Only called on throw paths, so assert
// success paths never pay for the string concatenation.
const atitle = (title: string): string => (title ? `"${title}" ` : '');

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
export function anumber(n: number, title: string = ''): number {
  if (typeof n !== 'number')
    throw new TypeError(atitle(title) + 'expected number, got ' + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle(title) + 'expected integer >= 0, got ' + n);
  return n;
}

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
export function abool(value: boolean, title: string = ''): boolean {
  if (typeof value !== 'boolean')
    throw new TypeError(atitle(title) + 'expected boolean, got type=' + typeof value);
  return value;
}

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
export function abytes(
  value: TArg<Uint8Array>,
  length?: number,
  title: string = ''
): TRet<Uint8Array> {
  // Success path first: this runs at the start of every update() / digestInto(), and the
  // common `abytes(data)` form must not pay for length handling it does not use.
  if (isBytes(value) && (length === undefined || value.length === length))
    return value as TRet<Uint8Array>;
  // Error path: recompute freely to build the exact message.
  if (length !== undefined) anumber(length, 'length');
  const bytes = isBytes(value);
  const ofLen = length !== undefined ? ` of length ${length}` : '';
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle(title) + 'expected Uint8Array' + ofLen + ', got ' + got;
  if (!bytes) throw new TypeError(message);
  throw new RangeError(message);
}

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
export function copyBytes(bytes: TArg<Uint8Array>): TRet<Uint8Array> {
  // `Uint8Array.from(...)` would also accept arrays / other typed arrays. Keep this helper strict
  // because callers use it at byte-validation boundaries before mutating the detached copy.
  return Uint8Array.from(abytes(bytes)) as TRet<Uint8Array>;
}

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
export function ahash(h: TArg<CHash>): void {
  if (typeof h !== 'function' || typeof h.create !== 'function')
    throw new TypeError('expected hash wrapped by utils.createHasher');
  anumber(h.outputLen);
  anumber(h.blockLen);
  // HMAC and KDF callers treat these as real byte lengths; allowing zero lets fake wrappers pass
  // validation and can produce empty outputs instead of failing fast.
  if (h.outputLen < 1 || h.blockLen < 1) throw new Error('hash blockLen / outputLen must be >= 1');
}

const aobject = (value: Record<string, any>, label: string) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(
      (label === 'object' ? '' : `"${label}" `) + 'expected object, got type=' + typeof value
    );
};

const aopts = (value: Record<string, any>, label: string) => {
  aobject(value, label);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null)
    throw new TypeError(`"${label}" expected plain object`);
  // Object.assign() treats an own "__proto__" source key as a write to the target's legacy
  // prototype setter. Reject it before merging so inherited option values cannot be injected.
  if (Object.hasOwn(value, '__proto__')) throw new TypeError(`"${label}.__proto__" is not allowed`);
};

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
export function aexists(instance: any, checkFinished = true): void {
  // Runs on every update()/digestInto(); the flags are library-owned booleans, so only their
  // truthiness is checked - re-validating their type per call was pure hot-path overhead.
  if (instance.destroyed) throw new Error('hash was destroyed');
  if (checkFinished && instance.finished) throw new Error('digest() was already called');
}

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
export function aoutput(out: any, instance: any): void {
  abytes(out, undefined, 'output');
  // `outputLen` is a library-owned readonly number; the negated comparison keeps failing fast
  // when it is missing/NaN (comparisons with undefined/NaN are false) without an anumber() call.
  const min = instance.outputLen;
  if (!(out.length >= min)) {
    throw new RangeError('"output" expected length >= ' + min);
  }
}

/** Generic type encompassing 8/16/32-bit typed arrays, but not 64-bit. */
// prettier-ignore
export type TypedArray = Int8Array | Uint8ClampedArray | Uint8Array |
  Uint16Array | Int16Array | Uint32Array | Int32Array;

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
export function u8(arr: TArg<TypedArray>): TRet<Uint8Array> {
  return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength) as TRet<Uint8Array>;
}

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
export function u32(arr: TArg<TypedArray>): TRet<Uint32Array> {
  return new Uint32Array(
    arr.buffer,
    arr.byteOffset,
    Math.floor(arr.byteLength / 4)
  ) as TRet<Uint32Array>;
}

/**
 * Zeroizes typed arrays in place. Warning: JS provides no guarantees.
 * @param arrays - arrays to overwrite with zeros
 * @example
 * Zeroize sensitive buffers in place.
 * ```ts
 * clean(new Uint8Array([1, 2, 3]));
 * ```
 */
export function clean(...arrays: TArg<TypedArray[]>): void {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}

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
export function createView(arr: TArg<TypedArray>): DataView {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}

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
export function rotr(word: number, shift: number): number {
  return (word << (32 - shift)) | (word >>> shift);
}

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
export function rotl(word: number, shift: number): number {
  return (word << shift) | ((word >>> (32 - shift)) >>> 0);
}

/** Whether the current platform is little-endian. */
export const isLE: boolean = /* @__PURE__ */ (() =>
  new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44)();

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
export function byteSwap(word: number): number {
  return (
    ((word << 24) & 0xff000000) |
    ((word << 8) & 0xff0000) |
    ((word >>> 8) & 0xff00) |
    ((word >>> 24) & 0xff)
  );
}
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
export const swap8IfBE: (n: number) => number = isLE
  ? (n: number) => n
  : (n: number) => byteSwap(n) >>> 0;

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
export function byteSwap32(arr: TArg<Uint32Array>): TRet<Uint32Array> {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr as TRet<Uint32Array>;
}

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
export const swap32IfBE: (u: TArg<Uint32Array>) => TRet<Uint32Array> = isLE
  ? (u: TArg<Uint32Array>) => u as TRet<Uint32Array>
  : byteSwap32;

// Built-in hex conversion https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex
const hasHexBuiltin: boolean = /* @__PURE__ */ (() =>
  // @ts-ignore
  typeof Uint8Array.from([]).toHex === 'function' && typeof Uint8Array.fromHex === 'function')();

// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, '0')
);

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
export function bytesToHex(bytes: TArg<Uint8Array>): string {
  abytes(bytes);
  // @ts-ignore
  if (hasHexBuiltin) return bytes.toHex();
  // pre-caching improves the speed 6x
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}

// Strict ASCII nibble parser: non-ASCII hex lookalikes are rejected as undefined.
// ASCII codes: '0'..'9' = 48..57, 'A'..'F' = 65..70, 'a'..'f' = 97..102.
// prettier-ignore
function asciiToBase16(ch: number): number | undefined {
  return ch >= 48 && ch <= 57 ? ch - 48 // '2' => 50-48
  : ch >= 65 && ch <= 70 ? ch - (65 - 10) // 'B' => 66-(65-10)
  : ch >= 97 && ch <= 102 ? ch - (97 - 10) // 'b' => 98-(97-10)
  : undefined;
}

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
export function hexToBytes(hex: string): TRet<Uint8Array> {
  if (typeof hex !== 'string') throw new TypeError('hex string expected, got ' + typeof hex);
  if (hasHexBuiltin) {
    try {
      return (Uint8Array as any).fromHex(hex);
    } catch (error) {
      if (error instanceof SyntaxError) throw new RangeError(error.message);
      throw error;
    }
  }
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2) throw new RangeError('hex string expected, got unpadded hex of length ' + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi)); // parse first char, multiply it by 16
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1)); // parse second char
    if (n1 === undefined || n2 === undefined) {
      const char = hex[hi] + hex[hi + 1];
      throw new RangeError(
        'hex string expected, got non-hex character "' + char + '" at index ' + hi
      );
    }
    array[ai] = n1 * 16 + n2; // example: 'A9' => 10*16 + 9
  }
  return array;
}

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
export function nextTick(onReject?: () => void): Promise<void> {
  const host = globalThis as any;
  if (typeof host.scheduler?.yield === 'function') {
    const promise: Promise<void> = host.scheduler.yield();
    // Keep the original scheduler rejection; this handler exists only for cleanup.
    if (onReject) promise.catch(onReject);
    return promise;
  }
  return new Promise((resolve) => host.setTimeout(resolve, 0));
}

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
export async function asyncLoop(
  iters: number,
  tick: number,
  cb: (i: number) => void,
  onReject?: () => void
): Promise<void> {
  anumber(iters, 'iters');
  anumber(tick, 'tick');
  if (typeof cb !== 'function') throw new TypeError('callback must be a function');
  // Callback is synchronous by contract; asyncLoop only yields between sync work windows.
  let ts = Date.now();
  for (let i = 0; i < iters; i++) {
    cb(i);
    // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
    const diff = Date.now() - ts;
    if (diff >= 0 && diff < tick) continue;
    await nextTick(onReject);
    // Track only synchronous work time; scheduler delay after yielding is outside our budget.
    ts = Date.now();
  }
}

// Global symbols, but ts doesn't see them: https://github.com/microsoft/TypeScript/issues/31535
declare const TextEncoder: any;

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
export function utf8ToBytes(str: string): TRet<Uint8Array> {
  if (typeof str !== 'string') throw new TypeError('string expected');
  const encoded = new TextEncoder().encode(str);
  try {
    // Copy into the current realm for Firefox extension contexts. Callers that own the returned
    // buffer can then wipe it independently of TextEncoder's temporary result.
    return new Uint8Array(encoded) as TRet<Uint8Array>; // https://bugzil.la/1681809
  } finally {
    clean(encoded);
  }
}

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
export function kdfInputToBytes(data: TArg<KDFInput>, errorTitle = ''): TRet<Uint8Array> {
  if (typeof data === 'string') return utf8ToBytes(data);
  return abytes(data, undefined, errorTitle);
}

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
export function concatBytes(...arrays: TArg<Uint8Array[]>): TRet<Uint8Array> {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}

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
export const validateObject = (
  object: Record<string, any>,
  fields: Record<string, string> = {},
  optFields: Record<string, string> = {},
  title = 'object'
): void => {
  aobject(object, title);
  aobject(fields, 'fields');
  aobject(optFields, 'optFields');
  type Item = keyof typeof object;
  function checkField(fieldName: Item, expectedType: string, isOpt: boolean) {
    const label =
      title === 'object' ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
    // Config fields must be explicit own properties. Optional inherited values are rejected too
    // because callers keep reading the same options object after validation.
    const val = object[fieldName];
    // Runtime objects such as Field instances intentionally satisfy required method slots
    // via their shared prototype.
    if (
      !Object.hasOwn(object, fieldName) &&
      (isOpt ? val !== undefined : expectedType !== 'function')
    ) {
      throw new TypeError(`${label} is invalid: expected own property`);
    }
    if (isOpt && val === undefined) return;
    const current = typeof val;
    if (current !== expectedType || val === null)
      throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
  }
  const iter = (f: typeof fields, isOpt: boolean) =>
    Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
  iter(fields, false);
  iter(optFields, true);
};
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
export function checkOpts<T1 extends EmptyObj, T2 extends EmptyObj>(
  defaults: T1,
  opts?: T2,
  title = 'opts'
): T1 & T2 {
  aopts(defaults as Record<string, any>, 'defaults');
  if (opts !== undefined) aopts(opts as Record<string, any>, title);
  // Callers read optional fields directly, so omitted values must not fall through to ambient
  // Object.prototype pollution (for example a forged `dkLen` changing SHAKE's default output).
  const merged = Object.assign(Object.create(null), defaults, opts);
  return merged as T1 & T2;
}

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
} & HashInfo &
  (Opts extends undefined
    ? {
        (msg: TArg<Uint8Array>): TRet<Uint8Array>;
        create(): T;
      }
    : {
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
export function createHasher<T extends Hash<T>, Opts = undefined>(
  hashCons: HasherCons<T, Opts>,
  info: TArg<HashInfo> = {}
): TRet<CHash<T, Opts>> {
  if (typeof hashCons !== 'function')
    throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
  info = checkOpts({}, info, 'info') as HashInfo;
  const hashC: any = (msg: TArg<Uint8Array>, opts?: TArg<Opts>) =>
    hashCons(opts as Opts)
      .update(msg)
      .digest();
  const tmp = hashCons(undefined);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts?: Opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC) as TRet<CHash<T, Opts>>;
}

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
export function randomBytes(bytesLength = 32): TRet<Uint8Array> {
  // Match the repo's other length-taking helpers instead of relying on Uint8Array coercion.
  anumber(bytesLength, 'bytesLength');
  const cr = typeof globalThis === 'object' ? (globalThis as any).crypto : null;
  if (typeof cr?.getRandomValues !== 'function')
    throw new Error('crypto.getRandomValues must be defined');
  // Web Cryptography API Level 2 §10.1.1:
  // if `byteLength > 65536`, throw `QuotaExceededError`.
  // Keep the guard explicit so callers can see the quota in code
  // instead of discovering it by reading the spec or host errors.
  // This wrapper surfaces the same quota as a stable library RangeError.
  if (bytesLength > 65536)
    throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
  return cr.getRandomValues(new Uint8Array(bytesLength));
}

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
export const oidNist = (suffix: number): TRet<Required<HashInfo>> => ({
  // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
  // Larger suffix values would need base-128 OID encoding and a different length byte.
  oid: Uint8Array.from([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, suffix]),
});
