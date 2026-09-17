import { type TRet } from './utils.ts';
/**
 * Scrypt KDF with the fixed ESKDF policy tuple `{ N: 2^19, r: 8, p: 1, dkLen: 32 }`.
 * @param password - user password string, UTF-8 encoded before entering RFC 7914
 * @param salt - unique salt string, UTF-8 encoded before entering RFC 7914
 * @returns Derived 32-byte key.
 * @example
 * Derive the 32-byte scrypt key used by ESKDF.
 * ```ts
 * scrypt('password123', 'user@example.com');
 * ```
 */
export declare function scrypt(password: string, salt: string): TRet<Uint8Array>;
/**
 * PBKDF2-HMAC-SHA256 with the fixed ESKDF policy tuple `{ sha256, c: 2^17, dkLen: 32 }`.
 * @param password - user password string, UTF-8 encoded before entering PBKDF2-HMAC-SHA-256
 * @param salt - unique salt string, UTF-8 encoded before entering PBKDF2-HMAC-SHA-256
 * @returns Derived 32-byte key.
 * @example
 * Derive the 32-byte PBKDF2 key used by ESKDF.
 * ```ts
 * pbkdf2('password123', 'user@example.com');
 * ```
 */
export declare function pbkdf2(password: string, salt: string): TRet<Uint8Array>;
/**
 * Derives main seed. Takes a lot of time; prefer the higher-level `eskdf(...)`
 * flow unless you specifically need the raw main seed.
 * Derives the main seed by xor'ing two branches:
 * the scrypt branch uses a `0x01` separator byte on username/password,
 * and the PBKDF2 branch uses `0x02`.
 * Username and password strings are encoded by the underlying KDFs after the
 * local separator bytes are appended.
 * @param username - account identifier used as public salt
 * @param password - user password string
 * @returns Main 32-byte seed for the account.
 * @throws If the username or password length is invalid. {@link Error}
 * @example
 * Derive the main ESKDF seed from username and password.
 * ```ts
 * deriveMainSeed('example-user', 'example-password');
 * ```
 */
export declare function deriveMainSeed(username: string, password: string): TRet<Uint8Array>;
type AccountID = number | string;
type OptsLength = {
    keyLength: number;
};
type OptsMod = {
    modulus: bigint;
};
type KeyOpts = undefined | OptsLength | OptsMod;
/** Not using classes because constructor cannot be async. */
export interface ESKDF {
    /**
     * Derives a child key. Child key will not be associated with any
     * other child key because of properties of underlying KDF.
     *
     * @param protocol - 3-15 character protocol name
     * @param accountId - numeric account identifier, or a string id for
     *   `password\d{0,3}`, `ssh`, `tor`, or `file`
     * @param options - Optional child-key shaping parameters. See {@link KeyOpts}.
     * @returns Derived child key bytes.
     */
    deriveChildKey: (protocol: string, accountId: AccountID, options?: KeyOpts) => TRet<Uint8Array>;
    /** Deletes the main seed from the ESKDF instance. */
    expire: () => void;
    /**
     * Human-readable fingerprint: first 6 bytes of
     * `deriveChildKey('fingerprint', 0)`, formatted as uppercase
     * colon-separated hex.
     */
    fingerprint: string;
}
/**
 * ESKDF
 * @param username - username, email, or identifier, min: 8 characters, should have enough entropy
 * @param password - password, min: 8 characters, should have enough entropy
 * @returns Frozen API that derives child keys and exposes the account fingerprint.
 * @throws If the username or password length is invalid. {@link Error}
 * @example
 * Derive account-specific child keys from the main ESKDF seed.
 * ```ts
 * const kdf = await eskdf('example-university', 'beginning-new-example');
 * const key = kdf.deriveChildKey('aes', 0);
 * const fingerprint = kdf.fingerprint;
 * kdf.expire();
 * ```
 */
export declare function eskdf(username: string, password: string): Promise<TRet<ESKDF>>;
export {};
