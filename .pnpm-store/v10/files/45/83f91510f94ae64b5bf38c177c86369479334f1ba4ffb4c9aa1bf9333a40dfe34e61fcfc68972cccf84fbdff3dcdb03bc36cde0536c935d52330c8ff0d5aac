/**
 * blake2b (64-bit) & blake2s (8 to 32-bit) hash functions.
 * b could have been faster, but there is no fast u64 in js, so s is 1.5x faster.
 * @module
 */
import { BSIGMA, G1s, G2s } from './_blake.ts';
import { SHA256_IV } from './_md.ts';
import * as u64 from './_u64.ts';
// prettier-ignore
import {
  abytes, aexists, anumber, aoutput,
  checkOpts,
  clean, copyBytes, createHasher,
  swap32IfBE, swap8IfBE,
  u32,
  type CHash,
  type Hash,
  type TArg,
  type TRet
} from './utils.ts';

// Unrealized speed-up: G1b/G2b call the tiny u64.* helpers (rotations, split adds) across
// the module boundary, which V8 does not inline — u64.add's {h,l} return even allocates
// per call. File-local copies of the helpers measured ~15-20% faster blake2b on Node 24.
// Kept deduplicated in _u64 for auditability. Also doesn't matter for bundles
// which don't do `import`.

/**
 * Blake hash options.
 * `dkLen` is output length. `key` is used in MAC mode. `salt` is used in
 * KDF mode.
 */
export type Blake2Opts = {
  /** Desired digest length in bytes. RFC 7693 uses 1..64 for blake2b and 1..32 for blake2s. */
  dkLen?: number;
  /** Optional MAC key. */
  key?: Uint8Array;
  /** Optional salt mixed into initialization. */
  salt?: Uint8Array;
  /** Optional personalization bytes. */
  personalization?: Uint8Array;
};

// Same IV words as `SHA512_IV`, but endian-swapped into LE u32 low/high halves
// for the BLAKE2b u64 helpers below.
const B2B_IV = /* @__PURE__ */ Uint32Array.from([
  0xf3bcc908, 0x6a09e667, 0x84caa73b, 0xbb67ae85, 0xfe94f82b, 0x3c6ef372, 0x5f1d36f1, 0xa54ff53a,
  0xade682d1, 0x510e527f, 0x2b3e6c1f, 0x9b05688c, 0xfb41bd6b, 0x1f83d9ab, 0x137e2179, 0x5be0cd19,
]);
// Shared synchronous BLAKE2b work vector as LE u32 low/high halves.
const BBUF = /* @__PURE__ */ new Uint32Array(32);

// BLAKE2b G mix split into two half-rounds over LE u32 low/high limbs.
function G1b(a: number, b: number, c: number, d: number, msg: TArg<Uint32Array>, x: number) {
  // NOTE: V is LE here
  const Xl = msg[x], Xh = msg[x + 1]; // prettier-ignore
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1]; // prettier-ignore
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1]; // prettier-ignore
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1]; // prettier-ignore
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1]; // prettier-ignore
  // v[a] = (v[a] + v[b] + x) | 0;
  const ll = u64.add3L(Al, Bl, Xl);
  Ah = u64.add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  // v[d] = rotr(v[d] ^ v[a], 32)
  let xh = Dh ^ Ah, xl = Dl ^ Al; // prettier-ignore
  Dh = u64.rotr32H(xh, xl);
  Dl = u64.rotr32L(xh, xl);
  // v[c] = (v[c] + v[d]) | 0;
  ({ h: Ch, l: Cl } = u64.add(Ch, Cl, Dh, Dl));
  // v[b] = rotr(v[b] ^ v[c], 24)
  xh = Bh ^ Ch;
  xl = Bl ^ Cl;
  Bh = u64.rotrSH(xh, xl, 24);
  Bl = u64.rotrSL(xh, xl, 24);
  BBUF[2 * a] = Al;
  BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl;
  BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl;
  BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl;
  BBUF[2 * d + 1] = Dh;
}

// Second half-round of the same LE-limb BLAKE2b G mix; `x` is the message word offset.
function G2b(a: number, b: number, c: number, d: number, msg: TArg<Uint32Array>, x: number) {
  // NOTE: V is LE here
  const Xl = msg[x], Xh = msg[x + 1]; // prettier-ignore
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1]; // prettier-ignore
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1]; // prettier-ignore
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1]; // prettier-ignore
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1]; // prettier-ignore
  // v[a] = (v[a] + v[b] + x) | 0;
  const ll = u64.add3L(Al, Bl, Xl);
  Ah = u64.add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  // v[d] = rotr(v[d] ^ v[a], 16)
  let xh = Dh ^ Ah, xl = Dl ^ Al; // prettier-ignore
  Dh = u64.rotrSH(xh, xl, 16);
  Dl = u64.rotrSL(xh, xl, 16);
  // v[c] = (v[c] + v[d]) | 0;
  ({ h: Ch, l: Cl } = u64.add(Ch, Cl, Dh, Dl));
  // v[b] = rotr(v[b] ^ v[c], 63)
  xh = Bh ^ Ch;
  xl = Bl ^ Cl;
  Bh = u64.rotrBH(xh, xl, 63);
  Bl = u64.rotrBL(xh, xl, 63);
  BBUF[2 * a] = Al;
  BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl;
  BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl;
  BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl;
  BBUF[2 * d + 1] = Dh;
}

function checkBlake2Opts(
  outputLen: number,
  opts: TArg<Blake2Opts | undefined> = {},
  keyLen: number,
  saltLen: number,
  persLen: number
) {
  anumber(keyLen);
  // RFC 7693 §2.1 requires digest length nn in 1..keyLen (keyLen doubles as
  // the per-variant max for both key and digest lengths: 64 for b, 32 for s).
  if (outputLen <= 0 || outputLen > keyLen)
    throw new Error('"dkLen" must be 1..' + keyLen + ', got ' + outputLen);
  const { key, salt, personalization } = opts;
  // This API uses `undefined` for the RFC 7693 `kk = 0` case, so a provided key must be non-empty.
  if (key !== undefined && (key.length < 1 || key.length > keyLen))
    throw new Error('"key" expected to be undefined or of length=1..' + keyLen);
  if (salt !== undefined) abytes(salt, saltLen, 'salt');
  if (personalization !== undefined) abytes(personalization, persLen, 'personalization');
}

/** Internal base class for BLAKE2. */
export abstract class _BLAKE2<T extends _BLAKE2<T>> implements Hash<T> {
  protected abstract compress(msg: Uint32Array, offset: number, isLast: boolean): void;
  protected abstract get(): number[];
  protected abstract set(...args: number[]): void;
  abstract destroy(): void;
  protected buffer: Uint8Array;
  protected buffer32: Uint32Array;
  protected finished = false;
  protected destroyed = false;
  protected length: number = 0;
  protected pos: number = 0;
  readonly blockLen: number;
  readonly outputLen: number;
  readonly canXOF: boolean = false;

  constructor(blockLen: number, outputLen: number) {
    anumber(blockLen);
    anumber(outputLen);
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.buffer = new Uint8Array(blockLen);
    this.buffer32 = u32(this.buffer);
  }
  update(data: TArg<Uint8Array>): this {
    aexists(this);
    abytes(data);
    // Main difference with other hashes: there is flag for last block,
    // so we cannot process current block before we know that there
    // is the next one. This significantly complicates logic and reduces ability
    // to do zero-copy processing
    const { blockLen, buffer, buffer32 } = this;
    const len = data.length;
    const offset = data.byteOffset;
    const buf = data.buffer;
    for (let pos = 0; pos < len;) {
      // If buffer is full and we still have input (don't process last block, same as blake2s)
      if (this.pos === blockLen) {
        swap32IfBE(buffer32);
        this.compress(buffer32, 0, false);
        swap32IfBE(buffer32);
        this.pos = 0;
      }
      const take = Math.min(blockLen - this.pos, len - pos);
      const dataOffset = offset + pos;
      // Zero-copy only for full, 4-byte-aligned, non-final blocks.
      if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
        const data32 = new Uint32Array(buf, dataOffset, Math.floor((len - pos) / 4));
        swap32IfBE(data32);
        for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
          this.length += blockLen;
          this.compress(data32, pos32, false);
        }
        swap32IfBE(data32);
        continue;
      }
      // When the whole input is buffered in one go (common for short messages), passing `data`
      // directly avoids allocating a subarray view.
      buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      this.length += take;
      pos += take;
    }
    return this;
  }
  digestInto(out: TArg<Uint8Array>): void {
    aexists(this);
    aoutput(out, this);
    // Reject unaligned views explicitly instead of hiding them behind a full scratch copy.
    if (out.byteOffset & 3)
      throw new RangeError('"output" expected 4-byte aligned byteOffset, got ' + out.byteOffset);
    const { pos, buffer32 } = this;
    this.finished = true;
    // Padding
    this.buffer.fill(0, pos);
    swap32IfBE(buffer32);
    this.compress(buffer32, 0, true);
    swap32IfBE(buffer32);
    const state = this.get();
    // digest() passes our own `buffer` as `out`; reuse its cached u32 view instead of allocating.
    const out32 = out === this.buffer ? buffer32 : u32(out);
    const full = Math.floor(this.outputLen / 4);
    for (let i = 0; i < full; i++) out32[i] = swap8IfBE(state[i]);
    const tail = this.outputLen % 4;
    if (!tail) return;
    const off = full * 4;
    const word = state[full];
    for (let i = 0; i < tail; i++) out[off + i] = word >>> (8 * i);
  }
  digest(): TRet<Uint8Array> {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    // Return a copy so callers do not alias the instance scratch buffer used during finalization.
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res as TRet<Uint8Array>;
  }
  _cloneInto(to?: T): T {
    const { buffer, length, finished, destroyed, outputLen, pos } = this;
    // Recreate only `dkLen`; key/salt/personalization are already absorbed into the copied state.
    to ||= new (this.constructor as any)({ dkLen: outputLen }) as T;
    to.set(...this.get());
    // Last-block-aware lazy compression keeps the pending block live even when full.
    to.buffer.set(buffer);
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    // @ts-ignore
    to.outputLen = outputLen;
    return to;
  }
  clone(): T {
    return this._cloneInto();
  }
}

/** Internal blake2b hash class with state stored as LE u32 low/high halves. */
export class _BLAKE2b extends _BLAKE2<_BLAKE2b> {
  // Same IV words as SHA-512 / BLAKE2b, encoded as LE u32 low/high halves.
  private v0l = B2B_IV[0] | 0;
  private v0h = B2B_IV[1] | 0;
  private v1l = B2B_IV[2] | 0;
  private v1h = B2B_IV[3] | 0;
  private v2l = B2B_IV[4] | 0;
  private v2h = B2B_IV[5] | 0;
  private v3l = B2B_IV[6] | 0;
  private v3h = B2B_IV[7] | 0;
  private v4l = B2B_IV[8] | 0;
  private v4h = B2B_IV[9] | 0;
  private v5l = B2B_IV[10] | 0;
  private v5h = B2B_IV[11] | 0;
  private v6l = B2B_IV[12] | 0;
  private v6h = B2B_IV[13] | 0;
  private v7l = B2B_IV[14] | 0;
  private v7h = B2B_IV[15] | 0;

  constructor(opts: Blake2Opts = {}) {
    opts = checkOpts({}, opts);
    const olen = opts.dkLen === undefined ? 64 : opts.dkLen;
    super(128, olen);
    checkBlake2Opts(olen, opts, 64, 16, 16);
    let { key, personalization, salt } = opts;
    let keyLength = 0;
    if (key !== undefined) {
      abytes(key, undefined, 'key');
      keyLength = key.length;
    }
    // RFC 7693 §2.5: xor `p[0] = 0x0101kknn` into the low 32 bits of `h[0]`;
    // the high 32 bits stay at `IV[0]`.
    this.v0l ^= this.outputLen | (keyLength << 8) | (0x01 << 16) | (0x01 << 24);
    if (salt !== undefined) {
      abytes(salt, undefined, 'salt');
      // Copy: u32() would throw on views with byteOffset not divisible by 4.
      const slt = u32(copyBytes(salt));
      this.v4l ^= swap8IfBE(slt[0]);
      this.v4h ^= swap8IfBE(slt[1]);
      this.v5l ^= swap8IfBE(slt[2]);
      this.v5h ^= swap8IfBE(slt[3]);
    }
    if (personalization !== undefined) {
      abytes(personalization, undefined, 'personalization');
      // Copy: u32() would throw on views with byteOffset not divisible by 4.
      const pers = u32(copyBytes(personalization));
      this.v6l ^= swap8IfBE(pers[0]);
      this.v6h ^= swap8IfBE(pers[1]);
      this.v7l ^= swap8IfBE(pers[2]);
      this.v7h ^= swap8IfBE(pers[3]);
    }
    if (key !== undefined) {
      // Pad to blockLen and update
      const tmp = new Uint8Array(this.blockLen);
      tmp.set(key);
      this.update(tmp);
      // The padded copy holds key material; buffer/state keep what they need.
      clean(tmp);
    }
  }
  // prettier-ignore
  protected get(): [
    number, number, number, number, number, number, number, number,
    number, number, number, number, number, number, number, number
  ] {
    let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
    return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
  }
  // prettier-ignore
  protected set(
    v0l: number, v0h: number, v1l: number, v1h: number,
    v2l: number, v2h: number, v3l: number, v3h: number,
    v4l: number, v4h: number, v5l: number, v5h: number,
    v6l: number, v6h: number, v7l: number, v7h: number
  ): void {
    this.v0l = v0l | 0;
    this.v0h = v0h | 0;
    this.v1l = v1l | 0;
    this.v1h = v1h | 0;
    this.v2l = v2l | 0;
    this.v2h = v2h | 0;
    this.v3l = v3l | 0;
    this.v3h = v3h | 0;
    this.v4l = v4l | 0;
    this.v4h = v4h | 0;
    this.v5l = v5l | 0;
    this.v5h = v5h | 0;
    this.v6l = v6l | 0;
    this.v6h = v6h | 0;
    this.v7l = v7l | 0;
    this.v7h = v7h | 0;
  }
  protected compress(msg: Uint32Array, offset: number, isLast: boolean): void {
    // First half from state. Direct writes: get() would allocate an array +
    // closure per block.
    // prettier-ignore
    const { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
    // prettier-ignore
    { BBUF[0] = v0l; BBUF[1] = v0h; BBUF[2] = v1l; BBUF[3] = v1h;
      BBUF[4] = v2l; BBUF[5] = v2h; BBUF[6] = v3l; BBUF[7] = v3h;
      BBUF[8] = v4l; BBUF[9] = v4h; BBUF[10] = v5l; BBUF[11] = v5h;
      BBUF[12] = v6l; BBUF[13] = v6h; BBUF[14] = v7l; BBUF[15] = v7h; }
    BBUF.set(B2B_IV, 16); // Second half from IV.
    const l = u64.fromNumL(this.length);
    const h = u64.fromNumH(this.length);
    BBUF[24] = B2B_IV[8] ^ l; // Low word of the offset.
    BBUF[25] = B2B_IV[9] ^ h; // High word.
    // Invert all bits for last block
    if (isLast) {
      BBUF[28] = ~BBUF[28];
      BBUF[29] = ~BBUF[29];
    }
    let j = 0;
    const s = BSIGMA;
    // SIGMA selects 64-bit message words; multiply by 2 because `msg` stores
    // each word as [low32, high32].
    for (let i = 0; i < 12; i++) {
      G1b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G2b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G1b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G2b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G1b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G2b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G1b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
      G2b(3, 7, 11, 15, msg, offset + 2 * s[j++]);

      G1b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G2b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G1b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G2b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G1b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G2b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G1b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
      G2b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
    }
    this.v0l ^= BBUF[0] ^ BBUF[16];
    this.v0h ^= BBUF[1] ^ BBUF[17];
    this.v1l ^= BBUF[2] ^ BBUF[18];
    this.v1h ^= BBUF[3] ^ BBUF[19];
    this.v2l ^= BBUF[4] ^ BBUF[20];
    this.v2h ^= BBUF[5] ^ BBUF[21];
    this.v3l ^= BBUF[6] ^ BBUF[22];
    this.v3h ^= BBUF[7] ^ BBUF[23];
    this.v4l ^= BBUF[8] ^ BBUF[24];
    this.v4h ^= BBUF[9] ^ BBUF[25];
    this.v5l ^= BBUF[10] ^ BBUF[26];
    this.v5h ^= BBUF[11] ^ BBUF[27];
    this.v6l ^= BBUF[12] ^ BBUF[28];
    this.v6h ^= BBUF[13] ^ BBUF[29];
    this.v7l ^= BBUF[14] ^ BBUF[30];
    this.v7h ^= BBUF[15] ^ BBUF[31];
    clean(BBUF);
  }
  destroy(): void {
    this.destroyed = true;
    clean(this.buffer32);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}

/**
 * Blake2b hash function. 64-bit. 1.5x slower than blake2s in JS.
 * @param msg - message that would be hashed
 * @param opts - Optional output, MAC, salt, and personalization settings.
 *   `dkLen` must be 1..64 bytes; `salt` and `personalization`, if present,
 *   must be 16 bytes each. See {@link Blake2Opts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with Blake2b.
 * ```ts
 * blake2b(new Uint8Array([97, 98, 99]));
 * ```
 * @example
 * Hash a message with Blake2b while selecting output, MAC, salt, and personalization settings.
 * ```ts
 * blake2b(new Uint8Array([97, 98, 99]), {
 *   dkLen: 32,
 *   key: new Uint8Array(32),
 *   salt: new Uint8Array(16),
 *   personalization: new Uint8Array(16),
 * });
 * ```
 */
export const blake2b: TRet<CHash<_BLAKE2b, Blake2Opts>> = /* @__PURE__ */ createHasher(
  (opts) => new _BLAKE2b(opts)
);

// =================
// Blake2S
// =================

/** Internal type, 16 numbers. */
// prettier-ignore
export type _Num16 = {
  v0: number; v1: number; v2: number; v3: number;
  v4: number; v5: number; v6: number; v7: number;
  v8: number; v9: number; v10: number; v11: number;
  v12: number; v13: number; v14: number; v15: number;
};

/**
 * BLAKE2-compress core method.
 * Runs only the round function over a caller-supplied local vector; callers initialize `v0..v15`
 * and apply the final `h[i] ^= v[i] ^ v[i + 8]` fold themselves.
 * @param s - flattened sigma schedule bytes
 * @param offset - starting word offset inside `msg`, not a byte offset
 * @param msg - message words
 * @param rounds - round count to execute
 * @param v0 - state word 0
 * @param v1 - state word 1
 * @param v2 - state word 2
 * @param v3 - state word 3
 * @param v4 - state word 4
 * @param v5 - state word 5
 * @param v6 - state word 6
 * @param v7 - state word 7
 * @param v8 - state word 8
 * @param v9 - state word 9
 * @param v10 - state word 10
 * @param v11 - state word 11
 * @param v12 - state word 12
 * @param v13 - state word 13
 * @param v14 - state word 14
 * @param v15 - state word 15
 * @returns Updated compression state words.
 * @example
 * Run the BLAKE2 compression core on zeroed state and message words.
 * ```ts
 * import { _compress } from '@noble/hashes/blake2.js';
 * const state = _compress(
 *   new Uint8Array(16),
 *   0,
 *   new Uint32Array(16),
 *   1,
 *   0, 0, 0, 0, 0, 0, 0, 0,
 *   0, 0, 0, 0, 0, 0, 0, 0
 * );
 * state.v0;
 * ```
 */
// prettier-ignore
export function _compress(
  s: TArg<Uint8Array>, offset: number, msg: TArg<Uint32Array>, rounds: number,
  v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number,
  v8: number, v9: number, v10: number, v11: number, v12: number, v13: number, v14: number, v15: number,
): _Num16 {
  let j = 0;
  for (let i = 0; i < rounds; i++) {
    ({ a: v0, b: v4, c: v8, d: v12 } = G1s(v0, v4, v8, v12, msg[offset + s[j++]]));
    ({ a: v0, b: v4, c: v8, d: v12 } = G2s(v0, v4, v8, v12, msg[offset + s[j++]]));
    ({ a: v1, b: v5, c: v9, d: v13 } = G1s(v1, v5, v9, v13, msg[offset + s[j++]]));
    ({ a: v1, b: v5, c: v9, d: v13 } = G2s(v1, v5, v9, v13, msg[offset + s[j++]]));
    ({ a: v2, b: v6, c: v10, d: v14 } = G1s(v2, v6, v10, v14, msg[offset + s[j++]]));
    ({ a: v2, b: v6, c: v10, d: v14 } = G2s(v2, v6, v10, v14, msg[offset + s[j++]]));
    ({ a: v3, b: v7, c: v11, d: v15 } = G1s(v3, v7, v11, v15, msg[offset + s[j++]]));
    ({ a: v3, b: v7, c: v11, d: v15 } = G2s(v3, v7, v11, v15, msg[offset + s[j++]]));

    ({ a: v0, b: v5, c: v10, d: v15 } = G1s(v0, v5, v10, v15, msg[offset + s[j++]]));
    ({ a: v0, b: v5, c: v10, d: v15 } = G2s(v0, v5, v10, v15, msg[offset + s[j++]]));
    ({ a: v1, b: v6, c: v11, d: v12 } = G1s(v1, v6, v11, v12, msg[offset + s[j++]]));
    ({ a: v1, b: v6, c: v11, d: v12 } = G2s(v1, v6, v11, v12, msg[offset + s[j++]]));
    ({ a: v2, b: v7, c: v8, d: v13 } = G1s(v2, v7, v8, v13, msg[offset + s[j++]]));
    ({ a: v2, b: v7, c: v8, d: v13 } = G2s(v2, v7, v8, v13, msg[offset + s[j++]]));
    ({ a: v3, b: v4, c: v9, d: v14 } = G1s(v3, v4, v9, v14, msg[offset + s[j++]]));
    ({ a: v3, b: v4, c: v9, d: v14 } = G2s(v3, v4, v9, v14, msg[offset + s[j++]]));
  }
  return { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 };
}

// Blake2s reuses the SHA-256 IV words as-is.
const B2S_IV = /* @__PURE__ */ SHA256_IV.slice();

/** Internal blake2s hash class. */
export class _BLAKE2s extends _BLAKE2<_BLAKE2s> {
  // Internal state, same as SHA-256
  private v0 = B2S_IV[0] | 0;
  private v1 = B2S_IV[1] | 0;
  private v2 = B2S_IV[2] | 0;
  private v3 = B2S_IV[3] | 0;
  private v4 = B2S_IV[4] | 0;
  private v5 = B2S_IV[5] | 0;
  private v6 = B2S_IV[6] | 0;
  private v7 = B2S_IV[7] | 0;

  constructor(opts: Blake2Opts = {}) {
    opts = checkOpts({}, opts);
    const olen = opts.dkLen === undefined ? 32 : opts.dkLen;
    super(64, olen);
    checkBlake2Opts(olen, opts, 32, 8, 8);
    let { key, personalization, salt } = opts;
    let keyLength = 0;
    if (key !== undefined) {
      abytes(key, undefined, 'key');
      keyLength = key.length;
    }
    // RFC 7693 §2.5: xor `p[0] = 0x0101kknn` directly into `h[0]`, since
    // BLAKE2s stores each state word as one `u32`.
    this.v0 ^= this.outputLen | (keyLength << 8) | (0x01 << 16) | (0x01 << 24);
    if (salt !== undefined) {
      abytes(salt, undefined, 'salt');
      // Copy: u32() would throw on views with byteOffset not divisible by 4.
      const slt = u32(copyBytes(salt as Uint8Array));
      this.v4 ^= swap8IfBE(slt[0]);
      this.v5 ^= swap8IfBE(slt[1]);
    }
    if (personalization !== undefined) {
      abytes(personalization, undefined, 'personalization');
      // Copy: u32() would throw on views with byteOffset not divisible by 4.
      const pers = u32(copyBytes(personalization as Uint8Array));
      this.v6 ^= swap8IfBE(pers[0]);
      this.v7 ^= swap8IfBE(pers[1]);
    }
    if (key !== undefined) {
      // Pad to blockLen and update
      const tmp = new Uint8Array(this.blockLen);
      tmp.set(key);
      this.update(tmp);
      // The padded copy holds key material; buffer/state keep what they need.
      clean(tmp);
    }
  }
  protected get(): [number, number, number, number, number, number, number, number] {
    const { v0, v1, v2, v3, v4, v5, v6, v7 } = this;
    return [v0, v1, v2, v3, v4, v5, v6, v7];
  }
  // prettier-ignore
  protected set(
    v0: number, v1: number, v2: number, v3: number, v4: number, v5: number, v6: number, v7: number
  ): void {
    this.v0 = v0 | 0;
    this.v1 = v1 | 0;
    this.v2 = v2 | 0;
    this.v3 = v3 | 0;
    this.v4 = v4 | 0;
    this.v5 = v5 | 0;
    this.v6 = v6 | 0;
    this.v7 = v7 | 0;
  }
  protected compress(msg: Uint32Array, offset: number, isLast: boolean): void {
    const l = u64.fromNumL(this.length);
    const h = u64.fromNumH(this.length);
    // Seed v8..v15 from the IV, xor the low/high 32-bit byte counter into
    // v12/v13, and invert v14 on the final block.
    // prettier-ignore
    const { v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15 } =
      _compress(
        BSIGMA, offset, msg, 10,
        this.v0, this.v1, this.v2, this.v3, this.v4, this.v5, this.v6, this.v7,
        B2S_IV[0], B2S_IV[1], B2S_IV[2], B2S_IV[3], l ^ B2S_IV[4], h ^ B2S_IV[5], isLast ? ~B2S_IV[6] : B2S_IV[6], B2S_IV[7]
      );
    this.v0 ^= v0 ^ v8;
    this.v1 ^= v1 ^ v9;
    this.v2 ^= v2 ^ v10;
    this.v3 ^= v3 ^ v11;
    this.v4 ^= v4 ^ v12;
    this.v5 ^= v5 ^ v13;
    this.v6 ^= v6 ^ v14;
    this.v7 ^= v7 ^ v15;
  }
  destroy(): void {
    this.destroyed = true;
    clean(this.buffer32);
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
  }
}

/**
 * Blake2s hash function. Focuses on 8-bit to 32-bit platforms. 1.5x faster than blake2b in JS.
 * @param msg - message that would be hashed
 * @param opts - Optional output, MAC, salt, and personalization settings.
 *   `dkLen` must be 1..32 bytes; `salt` and `personalization`, if present,
 *   must be 8 bytes each. See {@link Blake2Opts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with Blake2s.
 * ```ts
 * blake2s(new Uint8Array([97, 98, 99]));
 * ```
 * @example
 * Hash a message with Blake2s while selecting output, MAC, salt, and personalization settings.
 * ```ts
 * blake2s(new Uint8Array([97, 98, 99]), {
 *   dkLen: 16,
 *   key: new Uint8Array(32),
 *   salt: new Uint8Array(8),
 *   personalization: new Uint8Array(8),
 * });
 * ```
 */
export const blake2s: TRet<CHash<_BLAKE2s, Blake2Opts>> = /* @__PURE__ */ createHasher(
  (opts) => new _BLAKE2s(opts)
);
