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
import {
  abytes,
  aexists,
  anumber,
  type CHash,
  type CHashXOF,
  checkOpts,
  clean,
  copyBytes,
  createHasher,
  randomBytes,
  type Hash,
  type HashXOF,
  type KDFInput,
  kdfInputToBytes,
  type PRG,
  type TArg,
  type TRet,
  u32,
} from './utils.ts';

// cSHAKE && KMAC (NIST SP800-185)
const _8n = /* @__PURE__ */ BigInt(8);
const _ffn = /* @__PURE__ */ BigInt(0xff);

// It is safe to use bigints here, since they used only for length encoding (not actual data).
// We use bigints in sha256 for lengths too.
// Callers are still expected to supply SP 800-185-valid lengths
// (`0 <= x < 2^2040`); this helper does not enforce that bound.
// Minimal big-endian bytes of `n`, at least one byte long (SP 800-185 §2.3.1).
function encodeBytes(n: number | bigint): number[] {
  n = BigInt(n);
  const res = [Number(n & _ffn)];
  n >>= _8n;
  for (; n > 0; n >>= _8n) res.unshift(Number(n & _ffn));
  return res;
}

// left_encode(n): byte count is prepended.
function leftEncode(n: number | bigint): TRet<Uint8Array> {
  const res = encodeBytes(n);
  res.unshift(res.length);
  return new Uint8Array(res);
}

// right_encode(n): byte count is appended.
function rightEncode(n: number | bigint): TRet<Uint8Array> {
  const res = encodeBytes(n);
  res.push(res.length);
  return new Uint8Array(res);
}

// `dkLen` range validation is deferred to the downstream Keccak constructor.
function chooseLen(opts: ShakeOpts, outputLen: number): number {
  opts = checkOpts({}, opts);
  return opts.dkLen === undefined ? outputLen : opts.dkLen;
}

const abytesOrZero = (buf?: TArg<Uint8Array>, title = '') => {
  if (buf === undefined) return EMPTY_BUFFER;
  abytes(buf, undefined, title);
  return buf;
};
// NOTE: second modulo is necessary since we don't need to add padding if the
// current element takes a whole block.
// Callers only pass the fixed positive Keccak rates here (`168` or `136`);
// `block <= 0` is not validated locally.
const getPadding = (len: number, block: number) => new Uint8Array((block - (len % block)) % block);
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

// bytepad(X1 || X2 || ..., rate): absorbs left_encode(rate), then each chunk, then zero-pads
// to a rate boundary. Encode and pad inplace to avoid unneccesary memory copies/slices so we
// don't need to zero them later. `rate` is the current cSHAKE/KMAC/TupleHash/ParallelHash
// block length.
function bytepadUpdate(h: TArg<Keccak>, ...chunks: TArg<Uint8Array[]>): TRet<Keccak> {
  const hash = h as Keccak;
  const blockLenBytes = leftEncode(hash.blockLen);
  hash.update(blockLenBytes);
  let totalLen = blockLenBytes.length;
  for (const chunk of chunks) {
    hash.update(chunk);
    totalLen += chunk.length;
  }
  hash.update(getPadding(totalLen, hash.blockLen));
  return hash as TRet<Keccak>;
}

// Personalization
function cshakePers(h: TArg<Keccak>, opts: TArg<cShakeOpts> = {}): TRet<Keccak> {
  const hash = h as TRet<Keccak>;
  opts = checkOpts({}, opts);
  if (opts.personalization === undefined && opts.NISTfn === undefined) return hash;
  // bytepad(encode_string(N) || encode_string(S), rate)
  const fn = opts.NISTfn === undefined ? EMPTY_BUFFER : kdfInputToBytes(opts.NISTfn);
  const fnLen = leftEncode(_8n * BigInt(fn.length)); // length in bits
  const pers = abytesOrZero(opts.personalization, 'personalization');
  const persLen = leftEncode(_8n * BigInt(pers.length)); // length in bits
  if (!fn.length && !pers.length) return hash;
  // SP 800-185 cSHAKE appends `00` instead of SHAKE's `1111`; in this Keccak implementation
  // that changes the delimited suffix byte from `0x1f` to `0x04` once N or S is non-empty.
  hash.suffix = 0x04;
  return bytepadUpdate(hash, fnLen, fn, persLen, pers);
}

const gencShake = (
  suffix: number,
  blockLen: number,
  outputLen: number
): TRet<CHashXOF<Keccak, cShakeOpts>> =>
  createHasher<Keccak, cShakeOpts>((opts: TArg<cShakeOpts> = {}) =>
    cshakePers(new Keccak(blockLen, suffix, chooseLen(opts, outputLen), true), opts)
  );

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
export const cshake128: TRet<CHashXOF<Keccak, cShakeOpts>> = /* @__PURE__ */ gencShake(
  0x1f,
  168,
  16
);
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
export const cshake256: TRet<CHashXOF<Keccak, cShakeOpts>> = /* @__PURE__ */ gencShake(
  0x1f,
  136,
  32
);

/**
 * Internal KMAC class.
 * SP 800-185 §8.4.1 still recommends keys at least as long as the target
 * security strength.
 */
export class _KMAC extends Keccak implements HashXOF<_KMAC> {
  constructor(
    blockLen: number,
    outputLen: number,
    enableXOF: boolean,
    key: TArg<Uint8Array>,
    opts: cShakeOpts = {}
  ) {
    super(blockLen, 0x1f, outputLen, enableXOF);
    // Preload T = bytepad(encode_string("KMAC") || encode_string(S), rate); later updates append
    // newX = bytepad(encode_string(K), rate) || X and `finish()` appends right_encode(L or 0).
    cshakePers(this, { NISTfn: 'KMAC', personalization: opts.personalization });
    abytes(key, undefined, 'key');
    // 1. newX = bytepad(encode_string(K), rate) || X || right_encode(L),
    // with `rate = this.blockLen`.
    bytepadUpdate(this, leftEncode(_8n * BigInt(key.length)), key);
  }
  protected finish(): void {
    // SP 800-185 uses right_encode(L) for fixed-length KMAC and right_encode(0) for KMACXOF.
    // outputLen in bits
    if (!this.finished) this.update(rightEncode(this.enableXOF ? 0 : _8n * BigInt(this.outputLen)));
    super.finish();
  }
  _cloneInto(to?: _KMAC): _KMAC {
    // Create new instance without calling constructor since the key
    // is already in state and we don't know it.
    // Force "to" to be instance of KMAC instead of Sha3.
    if (!to) {
      to = Object.create(Object.getPrototypeOf(this), {}) as _KMAC;
      to.state = this.state.slice();
      to.blockLen = this.blockLen;
      to.state32 = u32(to.state);
    }
    return super._cloneInto(to) as _KMAC;
  }
  clone(): _KMAC {
    return this._cloneInto();
  }
}

function genKmac(blockLen: number, outputLen: number, xof = false): TRet<IKMAC> {
  // One-shot XOF wrappers still finalize via `.digest()` because `_KMAC`
  // already bakes the requested output length into the state.
  const kmac = (
    key: TArg<Uint8Array>,
    message: TArg<Uint8Array>,
    opts?: TArg<cShakeOpts>
  ): TRet<Uint8Array> => kmac.create(key, opts).update(message).digest();
  kmac.create = (key: TArg<Uint8Array>, opts: TArg<cShakeOpts> = {}) =>
    new _KMAC(blockLen, chooseLen(opts, outputLen), xof, key, opts);
  // Same metadata + freeze as `createHasher()` wrappers, so duck-typed
  // consumers (e.g. `ahash()`) treat all wrappers alike.
  kmac.outputLen = outputLen;
  kmac.blockLen = blockLen;
  kmac.canXOF = xof;
  return Object.freeze(kmac) as TRet<IKMAC>;
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
export const kmac128: TRet<IKMAC> = /* @__PURE__ */ genKmac(168, 16);
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
export const kmac256: TRet<IKMAC> = /* @__PURE__ */ genKmac(136, 32);
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
export const kmac128xof: TRet<IKMAC> = /* @__PURE__ */ genKmac(168, 16, true);
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
export const kmac256xof: TRet<IKMAC> = /* @__PURE__ */ genKmac(136, 32, true);

/**
 * Internal TupleHash class for byte-array tuple elements.
 * This implementation relies on SP 800-185's byte-oriented encoding form
 * rather than arbitrary bit strings.
 */
export class _TupleHash extends Keccak implements HashXOF<_TupleHash> {
  // Cheaper than a per-instance `this.update = ...` closure: switches the class-method
  // update from plain absorption (during the cSHAKE preload) to tuple-element encoding.
  private tupleMode = false;
  constructor(blockLen: number, outputLen: number, enableXOF: boolean, opts: cShakeOpts = {}) {
    super(blockLen, 0x1f, outputLen, enableXOF);
    cshakePers(this, { NISTfn: 'TupleHash', personalization: opts.personalization });
    this.tupleMode = true;
  }
  update(data: TArg<Uint8Array>): this {
    if (!this.tupleMode) return super.update(data) as this;
    abytes(data);
    // SP 800-185 encodes each tuple element as
    // encode_string(X[i]) = left_encode(len(X[i])) || X[i].
    super.update(leftEncode(_8n * BigInt(data.length)));
    super.update(data);
    return this;
  }
  protected finish(): void {
    // SP 800-185 uses right_encode(L) for fixed-length TupleHash
    // and right_encode(0) for TupleHashXOF.
    if (!this.finished)
      // outputLen in bits
      super.update(rightEncode(this.enableXOF ? 0 : _8n * BigInt(this.outputLen)));
    super.finish();
  }
  _cloneInto(to?: _TupleHash): _TupleHash {
    to ||= new _TupleHash(this.blockLen, this.outputLen, this.enableXOF);
    to.tupleMode = this.tupleMode;
    return super._cloneInto(to) as _TupleHash;
  }
  clone(): _TupleHash {
    return this._cloneInto();
  }
}

function genTuple(blockLen: number, outputLen: number, xof = false): TRet<ITupleHash> {
  // One-shot XOF wrappers still use `.digest()` because `_TupleHash` stores
  // the requested output length in the state itself.
  const tuple = (messages: TArg<Uint8Array[]>, opts?: TArg<cShakeOpts>): TRet<Uint8Array> => {
    const h = tuple.create(opts);
    if (!Array.isArray(messages)) throw new Error('expected array of messages');
    for (const msg of messages) h.update(msg);
    return h.digest();
  };
  tuple.create = (opts: TArg<cShakeOpts> = {}) =>
    new _TupleHash(blockLen, chooseLen(opts, outputLen), xof, opts);
  // Same metadata + freeze as `createHasher()` wrappers, so duck-typed
  // consumers (e.g. `ahash()`) treat all wrappers alike.
  tuple.outputLen = outputLen;
  tuple.blockLen = blockLen;
  tuple.canXOF = xof;
  return Object.freeze(tuple) as TRet<ITupleHash>;
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
export const tuplehash128: TRet<ITupleHash> = /* @__PURE__ */ genTuple(168, 16);
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
export const tuplehash256: TRet<ITupleHash> = /* @__PURE__ */ genTuple(136, 32);
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
export const tuplehash128xof: TRet<ITupleHash> = /* @__PURE__ */ genTuple(168, 16, true);
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
export const tuplehash256xof: TRet<ITupleHash> = /* @__PURE__ */ genTuple(136, 32, true);

// Same as K12/M14, but without speedup for inputs less 8kb,
// reduced number of rounds and simpler.
type ParallelOpts = KangarooOpts & { blockLen?: number };

/** Internal Parallel Keccak Hash class. */
export class _ParallelHash extends Keccak implements HashXOF<_ParallelHash> {
  private leafHash?: Hash<Keccak>;
  protected leafCons: () => Hash<Keccak>;
  // Pristine leaf instance cloned into `leafHash` per chunk: with the default
  // 8-byte chunks, constructing a fresh leaf per chunk costs ~15% (measured).
  private leafTemplate?: Hash<Keccak>;
  // Reused chaining-value buffer for leaf digests.
  private leafCV?: Uint8Array;
  private chunkPos = 0; // Position of current block in chunk
  private chunksDone = 0; // How many chunks we already have
  private chunkLen: number;
  // Cheaper than a per-instance `this.update = ...` closure: switches the class-method
  // update from plain absorption (during the cSHAKE preload) to leaf chunking.
  private leafMode = false;
  constructor(
    blockLen: number,
    outputLen: number,
    leafCons: () => Hash<Keccak>,
    enableXOF: boolean,
    opts: ParallelOpts = {}
  ) {
    super(blockLen, 0x1f, outputLen, enableXOF);
    cshakePers(this, { NISTfn: 'ParallelHash', personalization: opts.personalization });
    this.leafCons = leafCons;
    let { blockLen: B = 8 } = opts;
    anumber(B);
    // blockLen=0 makes take=0 in update(), so pos never advances and the hash hangs.
    if (B < 1) throw new Error('"blockLen" must be >= 1, got ' + B);
    this.chunkLen = B;
    // SP 800-185 initializes z = left_encode(B); each completed chunk appends
    // one fixed-size cSHAKE leaf digest before finish() adds right_encode(n)
    // and right_encode(L or 0).
    super.update(leftEncode(B));
    this.leafMode = true;
  }
  private flushLeaf(): void {
    const cv = (this.leafCV ||= new Uint8Array((this.leafHash as Keccak).outputLen));
    (this.leafHash as Keccak).digestInto(cv);
    super.update(cv);
    this.chunksDone++;
  }
  update(data: TArg<Uint8Array>): this {
    if (!this.leafMode) return super.update(data) as this;
    aexists(this);
    abytes(data);
    const { chunkLen, leafCons } = this;
    for (let pos = 0, len = data.length; pos < len;) {
      if (this.chunkPos == chunkLen || !this.leafHash) {
        if (this.leafHash) this.flushLeaf();
        // Clone a pristine template instead of re-running the constructor;
        // resurrects the just-digested leaf allocation in place.
        this.leafTemplate ||= leafCons();
        this.leafHash = (this.leafTemplate as Keccak)._cloneInto(
          this.leafHash as Keccak | undefined
        );
        this.chunkPos = 0;
      }
      const take = Math.min(chunkLen - this.chunkPos, len - pos);
      this.leafHash.update(data.subarray(pos, pos + take));
      this.chunkPos += take;
      pos += take;
    }
    return this;
  }
  protected finish(): void {
    if (this.finished) return;
    if (this.leafHash) this.flushLeaf();
    // SP 800-185 finishes ParallelHash as
    // z || right_encode(n) || right_encode(L); XOF mode replaces
    // right_encode(L) with right_encode(0).
    super.update(rightEncode(this.chunksDone));
    // outputLen in bits
    super.update(rightEncode(this.enableXOF ? 0 : _8n * BigInt(this.outputLen)));
    super.finish();
  }
  // Overriding hides Keccak's flat implementation, which would otherwise be inherited
  // and silently miss the tree state (leaf hash, chunk counters).
  _cloneInto(to?: _ParallelHash): _ParallelHash {
    to ||= new _ParallelHash(this.blockLen, this.outputLen, this.leafCons, this.enableXOF);
    to.leafCons = this.leafCons;
    // Clone the cached template/CV as regular state: this also overwrites
    // stale wrong-variant values on reused destinations.
    if (this.leafTemplate)
      to.leafTemplate = (this.leafTemplate as Keccak)._cloneInto(
        to.leafTemplate as Keccak | undefined
      );
    else if (to.leafTemplate) {
      to.leafTemplate.destroy();
      to.leafTemplate = undefined;
    }
    if (this.leafCV) {
      if (to.leafCV && to.leafCV.length === this.leafCV.length) to.leafCV.set(this.leafCV);
      else to.leafCV = this.leafCV.slice();
    } else to.leafCV = undefined;
    // Reused destinations can carry a stale partial leaf
    // when the source is still on the root sponge.
    if (this.leafHash) to.leafHash = this.leafHash._cloneInto(to.leafHash as Keccak);
    else if (to.leafHash) {
      to.leafHash.destroy();
      to.leafHash = undefined;
    }
    to.chunkPos = this.chunkPos;
    to.chunkLen = this.chunkLen;
    to.chunksDone = this.chunksDone;
    to.leafMode = this.leafMode;
    return super._cloneInto(to) as _ParallelHash;
  }
  destroy(): void {
    super.destroy.call(this);
    if (this.leafHash) this.leafHash.destroy();
    if (this.leafTemplate) this.leafTemplate.destroy();
    if (this.leafCV) clean(this.leafCV);
  }
  clone(): _ParallelHash {
    return this._cloneInto();
  }
}

function genPrl(
  blockLen: number,
  outputLen: number,
  leaf: ReturnType<typeof gencShake>,
  xof = false
): TRet<CHashXOF<Keccak, ParallelOpts>> {
  const parallel = (message: TArg<Uint8Array>, opts?: TArg<ParallelOpts>): TRet<Uint8Array> =>
    parallel.create(opts).update(message).digest();
  parallel.create = (opts: TArg<ParallelOpts> = {}) =>
    new _ParallelHash(
      blockLen,
      chooseLen(opts, outputLen),
      // SP 800-185 fixes leaf digests at 256 bits for ParallelHash128 and
      // 512 bits for ParallelHash256; only the final cSHAKE output uses the
      // caller-selected dkLen.
      () => leaf.create({ dkLen: 2 * outputLen }),
      xof,
      opts
    );
  // Same metadata + freeze as `createHasher()` wrappers.
  parallel.outputLen = outputLen;
  parallel.blockLen = blockLen;
  parallel.canXOF = xof;
  return Object.freeze(parallel) as TRet<CHashXOF<Keccak, ParallelOpts>>;
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
export const parallelhash128: TRet<CHash<Keccak, ParallelOpts>> = /* @__PURE__ */ genPrl(
  168,
  16,
  cshake128
);
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
export const parallelhash256: TRet<CHash<Keccak, ParallelOpts>> = /* @__PURE__ */ genPrl(
  136,
  32,
  cshake256
);
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
export const parallelhash128xof: TRet<CHashXOF<Keccak, ParallelOpts>> = /* @__PURE__ */ genPrl(
  168,
  16,
  cshake128,
  true
);
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
export const parallelhash256xof: TRet<CHashXOF<Keccak, ParallelOpts>> = /* @__PURE__ */ genPrl(
  136,
  32,
  cshake256,
  true
);

/**
 * TurboSHAKE options.
 * `D` is the domain separation byte; RFC 9861 defines output length `L`
 * as a positive integer.
 */
export type TurboshakeOpts = ShakeOpts & {
  /** Optional domain separation byte in the `0x01..0x7f` range. */
  D?: number;
};

const genTurbo = (blockLen: number, outputLen: number) =>
  createHasher<Keccak, TurboshakeOpts>((opts: TurboshakeOpts = {}) => {
    opts = checkOpts({}, opts);
    const D = opts.D === undefined ? 0x1f : opts.D;
    // RFC 9861 §2.1 fixes the default `D = 0x1f`; §2.2 defines the 12-round
    // TurboSHAKE family selected here.
    if (!Number.isSafeInteger(D) || D < 0x01 || D > 0x7f)
      throw new Error('"D" (domain separation byte) must be 0x01..0x7f, got: ' + D);
    const dkLen = chooseLen(opts, outputLen);
    // RFC 9861 §§2.1-2.2 define output length L as a positive integer.
    if (dkLen < 1) throw new Error('"dkLen" must be >= 1');
    return new Keccak(blockLen, D, dkLen, true, 12);
  });

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
export const turboshake128: TRet<CHashXOF<Keccak, TurboshakeOpts>> = /* @__PURE__ */ genTurbo(
  168,
  32
);
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
export const turboshake256: TRet<CHashXOF<Keccak, TurboshakeOpts>> = /* @__PURE__ */ genTurbo(
  136,
  64
);

// Same as NIST rightEncode, but returns `[0]` for the zero string.
// Callers still need to keep `x < 256^255` per RFC 9861 §3.3.
function rightEncodeK12(n: number | bigint): TRet<Uint8Array> {
  n = BigInt(n);
  const res: number[] = [];
  for (; n > 0; n >>= _8n) res.unshift(Number(n & _ffn));
  res.push(res.length);
  return Uint8Array.from(res);
}

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
const EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();
// RFC 9861 §3.2 FinalNode prefix for S_0 and the CV-list terminator.
const K12_TREE = /* @__PURE__ */ Uint8Array.from([3, 0, 0, 0, 0, 0, 0, 0]);
const K12_FINAL = /* @__PURE__ */ Uint8Array.from([0xff, 0xff]);

/** Internal K12 hash class. */
export class _KangarooTwelve extends Keccak implements HashXOF<_KangarooTwelve> {
  readonly chunkLen = 8192;
  private leafHash?: Keccak;
  // Pristine leaf instance cloned into `leafHash` per chunk, same pattern as _ParallelHash:
  // streaming reuses two leaf allocations total instead of one per 8KB chunk.
  private leafTemplate?: Keccak;
  // Reused chaining-value buffer for leaf digests.
  private leafCV?: Uint8Array;
  protected leafLen: number;
  private personalization: Uint8Array;
  private chunkPos = 0; // Position of current block in chunk
  private chunksDone = 0; // How many chunks we already have
  constructor(
    blockLen: number,
    leafLen: number,
    outputLen: number,
    rounds: number,
    opts: KangarooOpts
  ) {
    super(blockLen, 0x07, outputLen, true, rounds);
    opts = checkOpts({}, opts);
    // RFC 9861 §3 defines output length L as a positive integer.
    if (outputLen < 1) throw new Error('"dkLen" must be >= 1');
    this.leafLen = leafLen;
    this.personalization =
      opts.personalization === undefined
        ? EMPTY_BUFFER
        : copyBytes(abytes(opts.personalization, undefined, 'personalization'));
  }
  update(data: TArg<Uint8Array>): this {
    aexists(this);
    abytes(data);
    const { chunkLen, blockLen, leafLen, rounds } = this;
    for (let pos = 0, len = data.length; pos < len;) {
      if (this.chunkPos == chunkLen) {
        if (this.leafHash) this.flushLeaf();
        else {
          // RFC 9861 §3.2 switches from SingleNode (`07`) to FinalNode (`06`)
          // once S exceeds 8192 bytes and prefixes S_0 with
          // `03 00 00 00 00 00 00 00`.
          this.suffix = 0x06; // Its safe to change suffix here since its used only in digest()
          super.update(K12_TREE);
        }
        // Secondary chunks S_1..S_(n-1) become fixed-length
        // CV_i = TurboSHAKE*(S_i, `0B`, 32|64) chaining values.
        // Clone a pristine template instead of re-running the constructor;
        // resurrects the just-digested leaf allocation in place.
        this.leafTemplate ??= new Keccak(blockLen, 0x0b, leafLen, false, rounds);
        this.leafHash = this.leafTemplate._cloneInto(this.leafHash);
        this.chunksDone++;
        this.chunkPos = 0;
      }
      const take = Math.min(chunkLen - this.chunkPos, len - pos);
      const chunk = data.subarray(pos, pos + take);
      if (this.leafHash) this.leafHash.update(chunk);
      else super.update(chunk);
      this.chunkPos += take;
      pos += take;
    }
    return this;
  }
  private flushLeaf(): void {
    const leafHash = this.leafHash as Keccak;
    const cv = (this.leafCV ||= new Uint8Array(leafHash.outputLen));
    leafHash.digestInto(cv);
    super.update(cv);
  }
  protected finish(): void {
    if (this.finished) return;
    const { personalization } = this;
    // RFC 9861 §3.2 forms S = M || C || length_encode(|C|) before any tree hashing logic.
    this.update(personalization).update(rightEncodeK12(personalization.length));
    // Leaf hash
    if (this.leafHash) {
      // Multi-chunk K12 appends
      // CV_1..CV_(n-1) || length_encode(n-1) || `FF FF`
      // before the final TurboSHAKE call.
      this.flushLeaf();
      super.update(rightEncodeK12(this.chunksDone));
      super.update(K12_FINAL);
    }
    super.finish.call(this);
  }
  destroy(): void {
    super.destroy.call(this);
    if (this.leafHash) this.leafHash.destroy();
    if (this.leafTemplate) this.leafTemplate.destroy();
    if (this.leafCV) clean(this.leafCV);
    // Personalization is copied on create/clone, so destroy can wipe it
    // without touching caller input.
    if (this.personalization !== EMPTY_BUFFER) clean(this.personalization);
    this.personalization = EMPTY_BUFFER;
  }
  // Overriding hides Keccak's flat implementation, which would otherwise be inherited
  // and silently miss the tree state (leaf hash, chunk counters).
  _cloneInto(to?: _KangarooTwelve): _KangarooTwelve {
    const { blockLen, leafLen, leafHash, outputLen, personalization, rounds } = this;
    const fresh = to === undefined;
    // Personalization is absorbed only during finish(), so clones need the same pending value.
    to ||= new _KangarooTwelve(blockLen, leafLen, outputLen, rounds, {
      personalization: personalization === EMPTY_BUFFER ? undefined : personalization,
    });
    super._cloneInto(to);
    // Reused destinations can carry a stale leaf from an older multi-chunk state.
    if (leafHash) to.leafHash = leafHash._cloneInto(to.leafHash);
    else if (to.leafHash) {
      to.leafHash.destroy();
      to.leafHash = undefined;
    }
    // Cached leaf state is part of a reusable clone: stale destroyed or wrong-variant values
    // otherwise fail or change the digest only after the replacement crosses a tree boundary.
    if (this.leafTemplate) to.leafTemplate = this.leafTemplate._cloneInto(to.leafTemplate);
    else if (to.leafTemplate) {
      to.leafTemplate.destroy();
      to.leafTemplate = undefined;
    }
    if (this.leafCV) {
      if (to.leafCV && to.leafCV.length === this.leafCV.length) to.leafCV.set(this.leafCV);
      else to.leafCV = this.leafCV.slice();
    } else to.leafCV = undefined;
    // Snapshot the pending personalization without aliasing source or caller-owned input.
    if (!fresh) {
      const old = to.personalization;
      if (personalization === EMPTY_BUFFER) {
        if (old !== EMPTY_BUFFER) clean(old);
        to.personalization = EMPTY_BUFFER;
      } else if (old === EMPTY_BUFFER || old.length !== personalization.length) {
        const copy = copyBytes(personalization);
        if (old !== EMPTY_BUFFER) clean(old);
        to.personalization = copy;
      } else {
        // Reuse compatible private storage so live-destination clones neither allocate
        // nor abandon user data.
        old.set(personalization);
      }
    }
    to.leafLen = this.leafLen;
    to.chunkPos = this.chunkPos;
    to.chunksDone = this.chunksDone;
    return to;
  }
  clone(): _KangarooTwelve {
    return this._cloneInto();
  }
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
export const kt128: TRet<CHash<_KangarooTwelve, KangarooOpts>> = /* @__PURE__ */ createHasher(
  (opts: TArg<KangarooOpts> = {}) => new _KangarooTwelve(168, 32, chooseLen(opts, 32), 12, opts)
);
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
export const kt256: TRet<CHash<_KangarooTwelve, KangarooOpts>> = /* @__PURE__ */ createHasher(
  (opts: TArg<KangarooOpts> = {}) => new _KangarooTwelve(136, 64, chooseLen(opts, 64), 12, opts)
);

// MarsupilamiFourteen (14-rounds) can be defined as:
// `new KangarooTwelve(136, 64, chooseLen(opts, 64), 14, opts)`

/** KangarooTwelve-based MAC function type. */
export type HopMAC = (
  key: TArg<Uint8Array>,
  message: TArg<Uint8Array>,
  personalization: TArg<Uint8Array>,
  dkLen?: number
) => TRet<Uint8Array>;
const genHopMAC = (hash: TArg<CHash<_KangarooTwelve, KangarooOpts>>): TRet<HopMAC> => {
  const kt = hash as CHash<_KangarooTwelve, KangarooOpts>;
  return ((
    key: TArg<Uint8Array>,
    message: TArg<Uint8Array>,
    personalization: TArg<Uint8Array>,
    dkLen?: number
  ) => kt(key, { personalization: kt(message, { personalization }), dkLen })) as TRet<HopMAC>;
};

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
export const HopMAC128: TRet<HopMAC> = /* @__PURE__ */ genHopMAC(kt128);
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
export const HopMAC256: TRet<HopMAC> = /* @__PURE__ */ genHopMAC(kt256);

/**
 * More at
 * {@link https://github.com/XKCP/XKCP/tree/master/lib/high/Keccak/PRG}.
 * Accepted capacities must keep `rho = 1598 - capacity` byte-aligned, and
 * `.clean()` later also requires `rate > 801`.
 */
export class _KeccakPRG extends Keccak implements PRG {
  protected rate: number;
  private entropyAdded = false;
  constructor(capacity: number) {
    anumber(capacity);
    const rate = 1600 - capacity;
    const rho = rate - 2;
    // Rho must be full bytes
    if (capacity < 0 || capacity > 1600 - 10 || rho % 8) throw new Error('invalid capacity');
    // blockLen = rho in bytes
    super(rho / 8, 0, 0, true);
    this.rate = rate;
    this.posOut = Math.floor((rate + 7) / 8);
  }
  protected keccak(): void {
    // Duplex padding
    this.state[this.pos] ^= 0x01;
    this.state[this.blockLen] ^= 0x02; // Rho is full bytes
    super.keccak();
    this.pos = 0;
    this.posOut = 0;
  }
  update(data: TArg<Uint8Array>): this {
    super.update(data);
    this.posOut = this.blockLen;
    return this;
  }
  protected finish(): void {}
  digestInto(_out: TArg<Uint8Array>): void {
    throw new Error('digest is not allowed, use .randomBytes() instead');
  }
  addEntropy(seed?: TArg<Uint8Array>): void {
    // Check lifecycle before asking the system RNG for entropy that cannot be used.
    aexists(this);
    if (seed !== undefined) {
      abytes(seed, undefined, 'seed');
      if (seed.length === 0) throw new Error('"seed" must not be empty');
    }
    const generated = seed === undefined;
    const entropy = generated ? randomBytes() : seed;
    try {
      this.update(entropy);
      this.entropyAdded = true;
    } finally {
      // This temporary is library-owned; caller-provided entropy remains caller-owned.
      if (generated) clean(entropy);
    }
  }
  xofInto(out: TArg<Uint8Array>): TRet<Uint8Array> {
    aexists(this, false);
    if (!this.entropyAdded) throw new Error('addEntropy() must be called before randomBytes()');
    return super.xofInto(out);
  }
  randomBytes(length: number): TRet<Uint8Array> {
    return this.xof(length);
  }
  clean(): void {
    // clean() mutates live sponge state just like randomBytes(),
    // so destroyed instances must reject it.
    aexists(this, false);
    if (this.rate < 1600 / 2 + 1) throw new Error('rate is too low to use .forget()');
    this.keccak();
    for (let i = 0; i < this.blockLen; i++) this.state[i] = 0;
    this.pos = this.blockLen;
    this.keccak();
    this.posOut = this.blockLen;
  }
  // Keccak cloning includes `posOut`, which preserves the PRG's current output phase.
  _cloneInto(to?: _KeccakPRG): _KeccakPRG {
    const { rate } = this;
    to ||= new _KeccakPRG(1600 - rate);
    super._cloneInto(to);
    to.rate = rate;
    to.entropyAdded = this.entropyAdded;
    return to;
  }
  clone(): _KeccakPRG {
    return this._cloneInto();
  }
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
export const keccakprg = (capacity = 254): TRet<_KeccakPRG> =>
  new _KeccakPRG(capacity) as TRet<_KeccakPRG>;
