import { type KDFInput, type TArg, type TRet } from './utils.ts';
/** Argon2 cost, output, and optional secret/personalization inputs. */
export type ArgonOpts = {
    /** Time cost measured in iterations. Defaults to `3`. */
    t?: number;
    /** Memory cost in kibibytes. Defaults to `1024 ** 2` (1 GiB). */
    m?: number;
    /** Parallelization parameter. Defaults to `1`. */
    p?: number;
    /** Argon2 version number. Defaults to `0x13`. */
    version?: number;
    /** Optional secret key mixed into initialization. */
    key?: KDFInput;
    /** Optional personalization string or bytes. */
    personalization?: KDFInput;
    /** Desired output length in bytes. RFC 9106 §3.1 requires `T` in the 4..(2^32 - 1) range. */
    dkLen?: number;
    /** Max scheduler block time in milliseconds for the async variants. */
    asyncTick?: number;
    /** Maximum temporary memory budget in bytes. Defaults to 1 GiB. */
    maxmem?: number;
    /**
     * Optional progress callback invoked during long-running derivations.
     * @param progress - completion fraction in the `0..1` range
     */
    onProgress?: (progress: number) => void;
};
/**
 * Argon2d GPU-resistant version.
 * @param password - password or input key material
 * @param salt - unique salt value
 * @param opts - Argon2 cost and optional tuning parameters. See {@link ArgonOpts}.
 * @returns Derived key bytes.
 * @throws If the Argon2 input or cost parameters are invalid. {@link Error}
 * @example
 * Derive a key with Argon2d.
 * ```ts
 * argon2d('password', 'salt1234', { t: 1, m: 8, p: 1, dkLen: 32 });
 * ```
 * @example
 * Derive a key with optional secret and scheduler controls.
 * ```ts
 * const progressLog: number[] = [];
 * argon2d('password', 'salt1234', {
 *   t: 1,
 *   m: 8,
 *   p: 1,
 *   dkLen: 32,
 *   version: 0x13,
 *   key: 'secret',
 *   personalization: 'application',
 *   maxmem: 1024 * 1024,
 *   asyncTick: 1,
 *   onProgress(progress) {
 *     progressLog.push(progress);
 *   },
 * });
 * ```
 */
export declare const argon2d: (password: TArg<KDFInput>, salt: TArg<KDFInput>, opts?: TArg<ArgonOpts>) => TRet<Uint8Array>;
/**
 * Argon2i side-channel-resistant version.
 * @param password - password or input key material
 * @param salt - unique salt value
 * @param opts - Argon2 cost and optional tuning parameters. See {@link ArgonOpts}.
 * @returns Derived key bytes.
 * @throws If the Argon2 input or cost parameters are invalid. {@link Error}
 * @example
 * Derive a key with Argon2i.
 * ```ts
 * argon2i('password', 'salt1234', { t: 1, m: 8, p: 1, dkLen: 32 });
 * ```
 */
export declare const argon2i: (password: TArg<KDFInput>, salt: TArg<KDFInput>, opts?: TArg<ArgonOpts>) => TRet<Uint8Array>;
/**
 * Argon2id, combining i+d, the most popular version from RFC 9106.
 * @param password - password or input key material
 * @param salt - unique salt value
 * @param opts - Argon2 cost and optional tuning parameters. See {@link ArgonOpts}.
 * @returns Derived key bytes.
 * @throws If the Argon2 input or cost parameters are invalid. {@link Error}
 * @example
 * Derive a key with Argon2id.
 * ```ts
 * argon2id('password', 'salt1234', { t: 1, m: 8, p: 1, dkLen: 32 });
 * ```
 */
export declare const argon2id: (password: TArg<KDFInput>, salt: TArg<KDFInput>, opts?: TArg<ArgonOpts>) => TRet<Uint8Array>;
/**
 * Argon2d async GPU-resistant version.
 * @param password - password or input key material
 * @param salt - unique salt value
 * @param opts - Argon2 cost and optional tuning parameters. See {@link ArgonOpts}.
 * @returns Promise resolving to derived key bytes.
 * @throws If the Argon2 input or cost parameters are invalid. {@link Error}
 * @example
 * Derive a key with Argon2d asynchronously.
 * ```ts
 * await argon2dAsync('password', 'salt1234', { t: 1, m: 8, p: 1, dkLen: 32 });
 * ```
 * @example
 * Derive a key asynchronously with optional secret and scheduler controls.
 * ```ts
 * await argon2dAsync('password', 'salt1234', {
 *   t: 1,
 *   m: 8,
 *   p: 1,
 *   dkLen: 32,
 *   version: 0x13,
 *   key: 'secret',
 *   personalization: 'application',
 *   maxmem: 1024 * 1024,
 *   asyncTick: 1,
 *   onProgress(progress) {
 *     if (progress > 1) throw new Error('invalid progress');
 *   },
 * });
 * ```
 */
export declare const argon2dAsync: (password: TArg<KDFInput>, salt: TArg<KDFInput>, opts?: TArg<ArgonOpts>) => Promise<TRet<Uint8Array>>;
/**
 * Argon2i async side-channel-resistant version.
 * @param password - password or input key material
 * @param salt - unique salt value
 * @param opts - Argon2 cost and optional tuning parameters. See {@link ArgonOpts}.
 * @returns Promise resolving to derived key bytes.
 * @throws If the Argon2 input or cost parameters are invalid. {@link Error}
 * @example
 * Derive a key with Argon2i asynchronously.
 * ```ts
 * await argon2iAsync('password', 'salt1234', { t: 1, m: 8, p: 1, dkLen: 32 });
 * ```
 */
export declare const argon2iAsync: (password: TArg<KDFInput>, salt: TArg<KDFInput>, opts?: TArg<ArgonOpts>) => Promise<TRet<Uint8Array>>;
/**
 * Argon2id async, combining i+d, the most popular version from RFC 9106.
 * @param password - password or input key material
 * @param salt - unique salt value
 * @param opts - Argon2 cost and optional tuning parameters. See {@link ArgonOpts}.
 * @returns Promise resolving to derived key bytes.
 * @throws If the Argon2 input or cost parameters are invalid. {@link Error}
 * @example
 * Derive a key with Argon2id asynchronously.
 * ```ts
 * await argon2idAsync('password', 'salt1234', { t: 1, m: 8, p: 1, dkLen: 32 });
 * ```
 */
export declare const argon2idAsync: (password: TArg<KDFInput>, salt: TArg<KDFInput>, opts?: TArg<ArgonOpts>) => Promise<TRet<Uint8Array>>;
