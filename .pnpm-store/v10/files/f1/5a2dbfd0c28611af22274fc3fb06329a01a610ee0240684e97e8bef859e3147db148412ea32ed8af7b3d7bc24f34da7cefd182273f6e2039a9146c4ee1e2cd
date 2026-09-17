/**
 * HKDF (RFC 5869): extract + expand in one step.
 * See {@link https://soatok.blog/2021/11/17/understanding-hkdf/}.
 * @module
 */
import { hmac, type _HMAC } from './hmac.ts';
import { abytes, ahash, anumber, type CHash, clean, type TArg, type TRet } from './utils.ts';

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
export function extract(
  hash: TArg<CHash>,
  ikm: TArg<Uint8Array>,
  salt?: TArg<Uint8Array>
): TRet<Uint8Array> {
  ahash(hash);
  // NOTE: some libraries treat zero-length array as 'not provided';
  // we don't, since we have undefined as 'not provided'
  // https://github.com/RustCrypto/KDFs/issues/15
  if (salt === undefined) salt = new Uint8Array(hash.outputLen);
  return hmac(hash, salt, ikm);
}

// Shared mutable scratch byte for the RFC 5869 block counter `N`.
// Safe to reuse because `expand()` is synchronous and resets it with `clean(...)` before returning.
const HKDF_COUNTER = /* @__PURE__ */ Uint8Array.of(0);
// Shared RFC 5869 empty string for both `info === undefined` and the first-block `T(0)` input.
const EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();

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
export function expand(
  hash: TArg<CHash>,
  prk: TArg<Uint8Array>,
  info?: TArg<Uint8Array>,
  length: number = 32,
  _recycled?: _HMAC<any>
): TRet<Uint8Array> {
  ahash(hash);
  anumber(length, 'length');
  abytes(prk, undefined, 'prk');
  const olen = hash.outputLen;
  // RFC 5869 §2.3: PRK is "a pseudorandom key of at least HashLen octets".
  if (prk.length < olen) throw new Error('"prk" must be at least HashLen octets');
  // RFC 5869 §2.3 only bounds `L` by `<= 255*HashLen`; `L=0` is valid and yields empty OKM.
  if (length > 255 * olen) throw new Error('Length must be <= 255*HashLen');
  const blocks = Math.ceil(length / olen);
  if (info === undefined) info = EMPTY_BUFFER;
  else abytes(info, undefined, 'info');
  if (!blocks) {
    if (_recycled) clean(prk); // Full hkdf() owns this intermediate PRK.
    return new Uint8Array() as TRet<Uint8Array>;
  }
  // first L(ength) octets of T
  // The private PRK can become both T and a one-block result after HMAC consumes the key.
  const okm = _recycled && blocks === 1 ? prk : new Uint8Array(blocks * olen);
  const { iHash, oHash } = hmac.create(hash, prk);
  // Driving them directly also skips `_HMAC.digestInto`'s per-digest destroy.
  const T = _recycled ? prk : new Uint8Array(olen);
  // Full hkdf() donates one destroyed extract hash; standalone creates one alternating worker.
  const worker = blocks > 1 ? _recycled?.iHash || hash.create() : undefined;
  for (let counter = 0; counter < blocks - 1; counter++) {
    HKDF_COUNTER[0] = counter + 1;
    const iWork = iHash._cloneInto(worker);
    // T(0) = empty string (zero length)
    // T(N) = HMAC-Hash(PRK, T(N-1) | info | N)
    if (counter) iWork.update(T);
    iWork.update(info).update(HKDF_COUNTER).digestInto(T);
    oHash._cloneInto(worker).update(T).digestInto(T);
    okm.set(T, olen * counter);
  }
  // Midstates are key-equivalent: they allow computing HMAC(prk, ...) for any message.
  HKDF_COUNTER[0] = blocks; // Final block consumes them; retain worker for cleanup.
  if (blocks > 1) iHash.update(T);
  iHash.update(info).update(HKDF_COUNTER).digestInto(T);
  oHash.update(T).digestInto(T);
  okm.set(T, olen * (blocks - 1));
  iHash.destroy(); // Raw digests may leave key-derived base/worker state; wipe all explicitly.
  oHash.destroy();
  worker?.destroy();
  if (T !== okm) clean(T); // Wipe private T/PRK; standalone preserves caller-owned PRK.
  clean(HKDF_COUNTER);
  // Exact fit: return without the extra copy.
  if (length === okm.length) return okm as TRet<Uint8Array>;
  // Copy the requested prefix, then wipe the full buffer: its tail holds
  // up to HashLen-1 bytes of derived key material past `length`.
  const res = okm.slice(0, length);
  clean(okm);
  return res as TRet<Uint8Array>;
}

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
export const hkdf = (
  hash: TArg<CHash>,
  ikm: TArg<Uint8Array>,
  salt: TArg<Uint8Array | undefined>,
  info: TArg<Uint8Array | undefined>,
  length: number
): TRet<Uint8Array> => {
  ahash(hash);
  if (salt === undefined) salt = new Uint8Array(hash.outputLen);
  const HMAC = hmac.create(hash, salt).update(ikm);
  // The intermediate PRK is secret key material; wipe it instead of
  // leaving it for GC.
  return expand(hash, HMAC.digest(), info, length, HMAC); // expand() owns and consumes it.
};
