import { type Pbkdf2Opt } from './pbkdf2.ts';
import {
  abytes,
  ahash,
  anumber,
  checkOpts,
  clean,
  copyBytes,
  kdfInputToBytes,
  type CHash,
  type KDFInput,
  type TArg,
  type TRet,
} from './utils.ts';

function _subtle(): typeof crypto.subtle {
  const cr = typeof globalThis === 'object' ? (globalThis as any).crypto : null;
  const sb = cr?.subtle;
  if (typeof sb === 'object' && sb != null) return sb;
  throw new Error('crypto.subtle must be defined');
}

/** Callable WebCrypto hash function descriptor. */
export type WebHash = {
  /**
   * Hashes one message with the selected WebCrypto digest.
   * @param msg - message bytes to hash
   * @returns Promise resolving to digest bytes.
   */
  (msg: TArg<Uint8Array>): Promise<TRet<Uint8Array>>;
  /** WebCrypto algorithm name passed to `crypto.subtle`. */
  webCryptoName: string;
  /** Digest size in bytes. */
  outputLen: number;
  /** Input block size in bytes. */
  blockLen: number;
};

function createWebHash(name: string, blockLen: number, outputLen: number): TRet<WebHash> {
  const hashC: any = async (msg: TArg<Uint8Array>): Promise<TRet<Uint8Array>> => {
    abytes(msg);
    const crypto = _subtle();
    return new Uint8Array(await crypto.digest(name, msg as BufferSource)) as TRet<Uint8Array>;
  };
  hashC.webCryptoName = name; // make sure it won't interfere with function name
  hashC.outputLen = outputLen;
  hashC.blockLen = blockLen;
  hashC.create = () => {
    // Present only so this async wrapper satisfies the shared
    // hash-wrapper shape checked by `ahashWeb()`.
    throw new Error('not implemented');
  };
  // Later WebCrypto HMAC/HKDF/PBKDF2 calls read descriptor metadata directly, so freezing prevents
  // callers from retargeting a `sha256` wrapper into a different backend digest by mutation.
  return Object.freeze(hashC) as TRet<WebHash>;
}

function ahashWeb(hash: TArg<WebHash>): string {
  ahash(hash as unknown as TArg<CHash>);
  const name = hash.webCryptoName;
  if (typeof name !== 'string') throw new Error('non-web hash');
  return name;
}

/** WebCrypto SHA1 (RFC 3174) legacy hash function. It was cryptographically broken. */
// export const sha1: WebHash = createHash('SHA-1', 64, 20);

/**
 * WebCrypto SHA2-256 hash function from RFC 6234.
 * @param msg - message bytes to hash
 * @returns Promise resolving to digest bytes.
 * @example
 * Hash a message with WebCrypto SHA2-256.
 * ```ts
 * await sha256(new Uint8Array([97, 98, 99]));
 * ```
 */
export const sha256: TRet<WebHash> = /* @__PURE__ */ createWebHash('SHA-256', 64, 32);
/**
 * WebCrypto SHA2-384 hash function from RFC 6234.
 * @param msg - message bytes to hash
 * @returns Promise resolving to digest bytes.
 * @example
 * Hash a message with WebCrypto SHA2-384.
 * ```ts
 * await sha384(new Uint8Array([97, 98, 99]));
 * ```
 */
export const sha384: TRet<WebHash> = /* @__PURE__ */ createWebHash('SHA-384', 128, 48);
/**
 * WebCrypto SHA2-512 hash function from RFC 6234.
 * @param msg - message bytes to hash
 * @returns Promise resolving to digest bytes.
 * @example
 * Hash a message with WebCrypto SHA2-512.
 * ```ts
 * await sha512(new Uint8Array([97, 98, 99]));
 * ```
 */
export const sha512: TRet<WebHash> = /* @__PURE__ */ createWebHash('SHA-512', 128, 64);

/** WebCrypto HMAC function type. See {@link hmac} for usage. */
type WebHmacFn = {
  (
    hash: TArg<WebHash>,
    key: TArg<Uint8Array>,
    message: TArg<Uint8Array>
  ): Promise<TRet<Uint8Array>>;
  create(hash: TArg<WebHash>, key: TArg<Uint8Array>): any;
};
/**
 * WebCrypto HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256. Webcrypto version.
 * @param key - authentication key bytes
 * @param message - message bytes to authenticate
 * @returns Promise resolving to authentication tag bytes.
 * `.create()` exists only to mirror the synchronous API surface
 * and always throws `not implemented`.
 * @example
 * Compute an RFC 2104 HMAC with WebCrypto.
 * ```ts
 * import { hmac, sha256 } from '@noble/hashes/webcrypto.js';
 * const key = new Uint8Array([1, 2, 3]);
 * const message = new Uint8Array([4, 5, 6]);
 * const mac = await hmac(sha256, key, message);
 * ```
 */
export const hmac: TRet<WebHmacFn> = /* @__PURE__ */ (() => {
  const hmac_ = async (
    hash: TArg<WebHash>,
    key: TArg<Uint8Array>,
    message: TArg<Uint8Array>
  ): Promise<TRet<Uint8Array>> => {
    const crypto = _subtle();
    abytes(key, undefined, 'key');
    abytes(message, undefined, 'message');
    const hashName = ahashWeb(hash);
    // importKey() snapshots key synchronously, but message is not passed to sign() until after
    // importKey() resolves. Keep the wrapper's inputs stable across that await.
    const _message = copyBytes(message);
    try {
      // WebCrypto keys can't be zeroized
      // prettier-ignore
      const wkey = await crypto.importKey(
        'raw',
        key as BufferSource,
        { name: 'HMAC', hash: hashName },
        false,
        ['sign']
      );
      return new Uint8Array(
        await crypto.sign('HMAC', wkey, _message as BufferSource)
      ) as TRet<Uint8Array>;
    } finally {
      clean(_message);
    }
  };
  hmac_.create = (_hash: TArg<WebHash>, _key: TArg<Uint8Array>) => {
    throw new Error('not implemented');
  };
  return hmac_ as TRet<WebHmacFn>;
})();

/**
 * WebCrypto HKDF (RFC 5869): derive keys from an initial input.
 * Combines hkdf_extract + hkdf_expand in one step
 * @param hash - hash function that would be used (e.g. sha256). Webcrypto version.
 * @param ikm - input keying material, the initial key
 * @param salt - optional salt value (a non-secret random value)
 * @param info - optional context and application specific information bytes
 * @param length - length of output keying material in bytes.
 *   RFC 5869 §2.3 allows `0..255*HashLen`, so `0` requests an empty OKM.
 * @returns Promise resolving to derived key bytes.
 * The RFC `L <= 255 * HashLen` bound is enforced before calling WebCrypto.
 * @throws If the current runtime does not provide `crypto.subtle`. {@link Error}
 * @example
 * WebCrypto HKDF (RFC 5869): derive keys from an initial input.
 * ```ts
 * import { hkdf, sha256 } from '@noble/hashes/webcrypto.js';
 * import { randomBytes, utf8ToBytes } from '@noble/hashes/utils.js';
 * const inputKey = randomBytes(32);
 * const salt = randomBytes(32);
 * const info = utf8ToBytes('application-key');
 * const okm = await hkdf(sha256, inputKey, salt, info, 32);
 * ```
 */
export async function hkdf(
  hash: TArg<WebHash>,
  ikm: TArg<Uint8Array>,
  salt: TArg<Uint8Array | undefined>,
  info: TArg<Uint8Array | undefined>,
  length: number
): Promise<TRet<Uint8Array>> {
  const crypto = _subtle();
  const hashName = ahashWeb(hash);
  const hashOutputLen = hash.outputLen;
  abytes(ikm, undefined, 'ikm');
  anumber(length, 'length');
  if (length > 255 * hashOutputLen) throw new Error('Length must be <= 255*HashLen');
  if (salt !== undefined) abytes(salt, undefined, 'salt');
  if (info !== undefined) abytes(info, undefined, 'info');
  // salt and info reach deriveBits() only after importKey() resolves, so snapshot them now.
  const _salt = salt === undefined ? new Uint8Array(0) : copyBytes(salt);
  const _info = info === undefined ? new Uint8Array(0) : copyBytes(info);
  try {
    const wkey = await crypto.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']);
    const opts = { name: 'HKDF', hash: hashName, salt: _salt, info: _info };
    const out = new Uint8Array(await crypto.deriveBits(opts, wkey, 8 * length));
    if (out.length !== length) {
      clean(out);
      throw new Error('WebCrypto returned an invalid derived key length');
    }
    return out as TRet<Uint8Array>;
  } finally {
    clean(_salt, _info);
  }
}

/**
 * WebCrypto PBKDF2-HMAC: RFC 8018 key derivation function.
 * @param hash - hash function that would be used e.g. sha256. Webcrypto version.
 * @param password - password from which a derived key is generated; string
 *   inputs are normalized through `kdfInputToBytes()`, i.e. UTF-8
 * @param salt - cryptographic salt; string inputs are normalized through
 *   `kdfInputToBytes()`, i.e. UTF-8
 * @param opts - PBKDF2 work factor and output settings. `dkLen`, if provided,
 *   must be `>= 1` per RFC 8018 §5.2. See {@link Pbkdf2Opt}.
 * @returns Promise resolving to derived key bytes.
 * Positive-iteration enforcement is currently delegated to backend
 * `deriveBits()` rejection (for example `c = 0`), not a dedicated
 * library-side guard. Values above the signed 32-bit backend range are rejected locally.
 * @throws If the current runtime does not provide `crypto.subtle`. {@link Error}
 * @example
 * WebCrypto PBKDF2-HMAC: RFC 2898 key derivation function.
 * ```ts
 * import { pbkdf2, sha256 } from '@noble/hashes/webcrypto.js';
 * const key = await pbkdf2(sha256, 'password', 'salt', { dkLen: 32, c: Math.pow(2, 18) });
 * ```
 */
export async function pbkdf2(
  hash: TArg<WebHash>,
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: Pbkdf2Opt
): Promise<TRet<Uint8Array>> {
  const crypto = _subtle();
  const hashName = ahashWeb(hash);
  const _opts = checkOpts({ dkLen: 32 }, opts);
  const { c, dkLen } = _opts;
  anumber(c, 'c');
  anumber(dkLen, 'dkLen');
  // Node's native WebCrypto PBKDF2 binding accepts only a signed 32-bit iteration count and aborts
  // the process on larger values instead of returning a rejected promise.
  if (c > 0x7fffffff) throw new Error('"c" exceeds WebCrypto backend limit');
  // RFC 8018 §5.2 defines dkLen as a positive integer.
  if (dkLen < 1) throw new Error('"dkLen" must be >= 1');
  // SubtleCrypto.deriveBits() accepts an unsigned-long bit count. Byte lengths at or above
  // 2^29 would wrap after multiplication by eight instead of requesting the intended length.
  if (dkLen >= 2 ** 29) throw new Error('derived key too long');
  const _password = kdfInputToBytes(password, 'password');
  try {
    const saltBytes = kdfInputToBytes(salt, 'salt');
    // String conversion already returns an owned array. Caller-owned byte salts need a snapshot
    // because deriveBits() does not receive them until after importKey() resolves.
    const _salt = typeof salt === 'string' ? saltBytes : copyBytes(saltBytes);
    try {
      const key = await crypto.importKey('raw', _password as BufferSource, 'PBKDF2', false, [
        'deriveBits',
      ]);
      const deriveOpts = { name: 'PBKDF2', salt: _salt, iterations: c, hash: hashName };
      const out = new Uint8Array(await crypto.deriveBits(deriveOpts, key, 8 * dkLen));
      if (out.length !== dkLen) {
        clean(out);
        throw new Error('WebCrypto returned an invalid derived key length');
      }
      return out as TRet<Uint8Array>;
    } finally {
      clean(_salt);
    }
  } finally {
    if (typeof password === 'string') clean(_password);
  }
}
