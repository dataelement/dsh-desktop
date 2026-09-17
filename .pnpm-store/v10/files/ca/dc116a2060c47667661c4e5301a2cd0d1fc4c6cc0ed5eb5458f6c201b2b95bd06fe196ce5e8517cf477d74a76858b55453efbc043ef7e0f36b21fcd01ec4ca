import { type Pbkdf2Opt } from './pbkdf2.ts';
import { type KDFInput, type TArg, type TRet } from './utils.ts';
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
/** WebCrypto SHA1 (RFC 3174) legacy hash function. It was cryptographically broken. */
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
export declare const sha256: TRet<WebHash>;
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
export declare const sha384: TRet<WebHash>;
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
export declare const sha512: TRet<WebHash>;
/** WebCrypto HMAC function type. See {@link hmac} for usage. */
type WebHmacFn = {
    (hash: TArg<WebHash>, key: TArg<Uint8Array>, message: TArg<Uint8Array>): Promise<TRet<Uint8Array>>;
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
export declare const hmac: TRet<WebHmacFn>;
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
export declare function hkdf(hash: TArg<WebHash>, ikm: TArg<Uint8Array>, salt: TArg<Uint8Array | undefined>, info: TArg<Uint8Array | undefined>, length: number): Promise<TRet<Uint8Array>>;
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
export declare function pbkdf2(hash: TArg<WebHash>, password: TArg<KDFInput>, salt: TArg<KDFInput>, opts: Pbkdf2Opt): Promise<TRet<Uint8Array>>;
export {};
