/**
 * HKDF (RFC 5869): extract + expand in one step.
 * See {@link https://soatok.blog/2021/11/17/understanding-hkdf/}.
 * @module
 */
import { type _HMAC } from './hmac.ts';
import { type CHash, type TArg, type TRet } from './utils.ts';
/**
 * HKDF-extract from spec. Less important part. `HKDF-Extract(IKM, salt) -> PRK`
 * Arguments position differs from spec (IKM is first one, since it is not optional)
 * Local validation only checks `hash`; `ikm` / `salt` byte validation is delegated to `hmac()`.
 * @param hash - hash function that would be used (e.g. sha256)
 * @param ikm - input keying material, the initial key
 * @param salt - optional salt value (a non-secret random value)
 * @returns Pseudorandom key derived from input keying material.
 * @example
 * Run the HKDF extract step.
 * ```ts
 * import { extract } from '@noble/hashes/hkdf.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * extract(sha256, new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]));
 * ```
 */
export declare function extract(hash: TArg<CHash>, ikm: TArg<Uint8Array>, salt?: TArg<Uint8Array>): TRet<Uint8Array>;
/**
 * HKDF-expand from the spec. The most important part. `HKDF-Expand(PRK, info, L) -> OKM`
 * @param hash - hash function that would be used (e.g. sha256)
 * @param prk - a pseudorandom key of at least HashLen octets
 *   (usually, the output from the extract step)
 * @param info - optional context and application specific information (can be a zero-length string)
 * @param length - length of output keying material in bytes.
 *   RFC 5869 §2.3 allows `0..255*HashLen`, so `0` returns an empty OKM.
 * @param _recycled - Internal destroyed extract hashes owned by the combined `hkdf()` call.
 * @returns Output keying material with the requested length.
 * @throws If the requested output length exceeds the HKDF limit
 *   for the selected hash. {@link Error}
 * @example
 * Run the HKDF expand step.
 * ```ts
 * import { expand } from '@noble/hashes/hkdf.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * expand(sha256, new Uint8Array(32), new Uint8Array([1, 2, 3]), 16);
 * ```
 */
export declare function expand(hash: TArg<CHash>, prk: TArg<Uint8Array>, info?: TArg<Uint8Array>, length?: number, _recycled?: _HMAC<any>): TRet<Uint8Array>;
/**
 * HKDF (RFC 5869): derive keys from an initial input.
 * Combines hkdf_extract + hkdf_expand in one step
 * @param hash - hash function that would be used (e.g. sha256)
 * @param ikm - input keying material, the initial key
 * @param salt - optional salt value (a non-secret random value)
 * @param info - optional context and application specific information bytes
 * @param length - length of output keying material in bytes.
 *   RFC 5869 §2.3 allows `0..255*HashLen`, so `0` returns an empty OKM.
 * @returns Output keying material derived from the input key.
 * @throws If the requested output length exceeds the HKDF limit
 *   for the selected hash. {@link Error}
 * @example
 * HKDF (RFC 5869): derive keys from an initial input.
 * ```ts
 * import { hkdf } from '@noble/hashes/hkdf.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * import { randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';
 * const inputKey = randomBytes(32);
 * const salt = randomBytes(32);
 * const info = utf8ToBytes('application-key');
 * const okm = hkdf(sha256, inputKey, salt, info, 32);
 * ```
 */
export declare const hkdf: (hash: TArg<CHash>, ikm: TArg<Uint8Array>, salt: TArg<Uint8Array | undefined>, info: TArg<Uint8Array | undefined>, length: number) => TRet<Uint8Array>;
