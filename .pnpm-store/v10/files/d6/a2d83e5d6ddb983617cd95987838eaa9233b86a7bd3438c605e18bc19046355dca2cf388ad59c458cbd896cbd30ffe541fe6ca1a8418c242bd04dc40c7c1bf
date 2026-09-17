/**
 * Experimental KDF for AES.
 * @module
 */
import { hkdf } from './hkdf.ts';
import { pbkdf2 as _pbkdf2 } from './pbkdf2.ts';
import { scrypt as _scrypt } from './scrypt.ts';
import { sha256 } from './sha2.ts';
import {
  abytes,
  bytesToHex,
  clean,
  createView,
  hexToBytes,
  kdfInputToBytes,
  type TArg,
  type TRet,
} from './utils.ts';

// A tiny KDF for various applications like AES key-gen.
// Uses HKDF in a non-standard way, so it's not "KDF-secure", only "PRF-secure".
// Which is good enough: assume sha2-256 retained preimage resistance.

// Fixed ESKDF scrypt work factor: interactive-latency target with about 512 MiB RAM per derivation.
const SCRYPT_FACTOR = /* @__PURE__ */ (() => 2 ** 19)();
// Fixed ESKDF PBKDF2 work factor: CPU-only companion branch in the same rough
// interactive-latency range.
const PBKDF2_FACTOR = /* @__PURE__ */ (() => 2 ** 17)();

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
export function scrypt(password: string, salt: string): TRet<Uint8Array> {
  return _scrypt(password, salt, { N: SCRYPT_FACTOR, r: 8, p: 1, dkLen: 32 });
}

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
export function pbkdf2(password: string, salt: string): TRet<Uint8Array> {
  return _pbkdf2(sha256, password, salt, { c: PBKDF2_FACTOR, dkLen: 32 });
}

// Combines two 32-byte byte arrays into a fresh 32-byte result without aliasing either input.
function xor32(a: TArg<Uint8Array>, b: TArg<Uint8Array>): TRet<Uint8Array> {
  abytes(a, 32);
  abytes(b, 32);
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    arr[i] = a[i] ^ b[i];
  }
  return arr as TRet<Uint8Array>;
}

// All local string length checks are in JS UTF-16 code units, not UTF-8 bytes.
function strHasLength(str: string, min: number, max: number): boolean {
  return typeof str === 'string' && str.length >= min && str.length <= max;
}

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
export function deriveMainSeed(username: string, password: string): TRet<Uint8Array> {
  if (typeof username !== 'string') kdfInputToBytes(username, 'username');
  if (typeof password !== 'string') kdfInputToBytes(password, 'password');
  if (!strHasLength(username, 8, 255)) throw new Error('invalid username');
  if (!strHasLength(password, 8, 255)) throw new Error('invalid password');
  // Keep the protocol separators as the literal bytes 0x01 / 0x02 even after minification.
  // Embedding them as non-printable characters directly can be awkward across
  // JS tooling and environments.
  const codes = { _1: 1, _2: 2 };
  const sep = { s: String.fromCharCode(codes._1), p: String.fromCharCode(codes._2) };
  const scr = scrypt(password + sep.s, username + sep.s);
  const pbk = pbkdf2(password + sep.p, username + sep.p);
  const res = xor32(scr, pbk);
  clean(scr, pbk);
  return res;
}

type AccountID = number | string;

/**
 * Converts protocol & accountId pair to HKDF params:
 * `info` is UTF-8 protocol bytes, numeric ids become 4-byte BE `salt`,
 * and string ids become UTF-8 `salt` bytes.
 * Numeric and string account ids share the existing salt byte namespace;
 * changing this would require a new ESKDF encoding, so callers should use one account
 * id kind per application.
 */
function getSaltInfo(protocol: string, accountId: AccountID = 0) {
  // Note that length here also repeats two lines below
  // We do an additional length check here to reduce the scope of DoS attacks
  if (!(strHasLength(protocol, 3, 15) && /^[a-z0-9]{3,15}$/.test(protocol))) {
    throw new Error('invalid protocol');
  }

  // Exact-match only: substring matches like `assh` / `mentor` must not widen the public whitelist.
  const allowsStr = /^(password\d{0,3}|ssh|tor|file)$/.test(protocol);
  let salt: Uint8Array; // Assigned below: either 4-byte BE account bytes or UTF-8 account bytes.
  if (typeof accountId === 'string') {
    if (!allowsStr) throw new Error('accountId must be a number');
    if (!strHasLength(accountId, 1, 255))
      throw new Error('accountId must be string of length 1..255');
    salt = kdfInputToBytes(accountId);
  } else if (Number.isSafeInteger(accountId)) {
    if (accountId < 0 || accountId > Math.pow(2, 32) - 1) throw new Error('invalid accountId');
    // Convert to Big Endian Uint32
    salt = new Uint8Array(4);
    createView(salt).setUint32(0, accountId, false);
  } else {
    throw new Error('accountId must be a number' + (allowsStr ? ' or string' : ''));
  }
  const info = kdfInputToBytes(protocol);
  return { salt, info };
}

type OptsLength = { keyLength: number };
type OptsMod = { modulus: bigint };
type KeyOpts = undefined | OptsLength | OptsMod;

// Local modulus-size helper, not a general bigint-byte-length primitive:
// `<= 128n` is rejected by ESKDF policy.
function countBytes(num: bigint): number {
  if (typeof num !== 'bigint' || num <= BigInt(128)) throw new Error('invalid number');
  return Math.ceil(num.toString(2).length / 8);
}

/**
 * Parses keyLength and modulus options to extract length of result key.
 * If modulus is used, adds 64 bits to it per the FIPS 186-5 Appendix A.3.1 /
 * A.4.1 extra-bits guidance.
 */
function getKeyLength(options: KeyOpts): number {
  if (!options || typeof options !== 'object') return 32;
  const hasLen = 'keyLength' in options;
  const hasMod = 'modulus' in options;
  if (hasLen && hasMod) throw new Error('cannot combine keyLength and modulus options');
  if (!hasLen && !hasMod) throw new Error('must have either keyLength or modulus option');
  // FIPS 186-5 Appendix A.3.1 / A.4.1 calls for at least 64 extra bits.
  const l = hasMod ? countBytes(options.modulus) + 8 : options.keyLength;
  // HKDF-SHA256 ultimately caps output at 8160 bytes; values above that still fail in hkdf().
  if (!(typeof l === 'number' && l >= 16 && l <= 8192)) throw new Error('invalid keyLength');
  return l;
}

/**
 * Converts key to bigint and divides it by modulus. Big Endian.
 * Adapts FIPS 186-5 Appendix A.4.1: `getKeyLength()` already requested the
 * extra 64-bit margin, and this step maps the result into `1..modulus-1`.
 */
function modReduceKey(key: TArg<Uint8Array>, modulus: bigint): TRet<Uint8Array> {
  const _1 = BigInt(1);
  const num = BigInt('0x' + bytesToHex(key)); // check for ui8a, then bytesToNumber()
  const res = (num % (modulus - _1)) + _1; // Remove 0 from output
  if (res < _1) throw new Error('expected positive number'); // Guard against bad values
  // Strip the extra 64-bit margin that `getKeyLength()` requested
  // for bias reduction.
  const len = key.length - 8;
  const hex = res.toString(16).padStart(len * 2, '0'); // numberToHex()
  const bytes = hexToBytes(hex);
  if (bytes.length !== len) throw new Error('invalid length of result key');
  return bytes;
}

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
export async function eskdf(username: string, password: string): Promise<TRet<ESKDF>> {
  // We are using closure + object instead of class because
  // we want to make `seed` non-accessible for any external function.
  let seed: Uint8Array | undefined = deriveMainSeed(username, password);

  function deriveCK(
    protocol: string,
    accountId: AccountID = 0,
    options?: KeyOpts
  ): TRet<Uint8Array> {
    // Reject expired instances before deriving any HKDF inputs from the closure-held seed.
    abytes(seed!, 32);
    const { salt, info } = getSaltInfo(protocol, accountId); // validate protocol & accountId
    // Validate option shape and coarse length bounds;
    // `hkdf()` still rejects non-integer lengths.
    const keyLength = getKeyLength(options);
    const key = hkdf(sha256, seed!, salt, info, keyLength);
    // Modulus has already been validated
    return options && 'modulus' in options ? modReduceKey(key, options.modulus) : key;
  }
  function expire() {
    // Overwrite the closure-held seed before dropping the reference.
    if (seed) seed.fill(1);
    seed = undefined;
  }
  // prettier-ignore
  const fingerprint = Array.from(deriveCK('fingerprint', 0))
    .slice(0, 6)
    .map((char) => char.toString(16).padStart(2, '0').toUpperCase())
    .join(':');
  return Object.freeze({ deriveChildKey: deriveCK, expire, fingerprint });
}
