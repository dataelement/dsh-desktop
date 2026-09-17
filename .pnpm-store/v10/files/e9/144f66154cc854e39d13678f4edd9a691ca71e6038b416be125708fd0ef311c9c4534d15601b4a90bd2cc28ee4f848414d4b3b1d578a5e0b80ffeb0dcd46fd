/**
 * SHA3 (keccak) hash function, based on a new "Sponge function" design.
 * Different from older hashes, the internal state is bigger than output size.
 *
 * Check out
 * {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf | FIPS-202},
 * {@link https://keccak.team/keccak.html | Website}, and
 * {@link https://crypto.stackexchange.com/q/15727 | the differences between
 * SHA-3 and Keccak}.
 *
 * Check out `sha3-addons` module for cSHAKE, k12, and others.
 * @module
 */
import { split } from './_u64.ts';
// prettier-ignore
import {
  abool, abytes, aexists, anumber, aoutput,
  checkOpts,
  clean, createHasher,
  oidNist,
  swap32IfBE,
  u32,
  type CHash, type CHashXOF,
  type Hash,
  type HashInfo,
  type HashXOF,
  type TArg,
  type TRet
} from './utils.ts';

// No __PURE__ annotations in sha3 header:
// EVERYTHING is in fact used on every export.
// Various per round constants calculations
const _0n = BigInt(0);
const _1n = BigInt(1);
const _2n = BigInt(2);
const _7n = BigInt(7);
const _256n = BigInt(256);
// FIPS 202 Algorithm 5 rc(): when the outgoing bit is 1, the 8-bit LFSR xors
// taps 0, 4, 5, and 6, which compresses to the feedback mask `0x71`.
const _0x71n = BigInt(0x71);
const SHA3_PI: number[] = [];
const SHA3_ROTL: number[] = [];
const _SHA3_IOTA: bigint[] = []; // no pure annotation: var is always used
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
  // Pi
  [x, y] = [y, (2 * x + 3 * y) % 5];
  SHA3_PI.push(2 * (5 * y + x));
  // Rotational
  SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
  // Iota
  let t = _0n;
  for (let j = 0; j < 7; j++) {
    R = ((R << _1n) ^ ((R >> _7n) * _0x71n)) % _256n;
    if (R & _2n) t ^= _1n << ((_1n << BigInt(j)) - _1n);
  }
  _SHA3_IOTA.push(t);
}
const IOTAS = split(_SHA3_IOTA, true);
// `split(..., true)` keeps the local little-endian lane-word layout used by
// `state32`, so these `H` / `L` tables follow the file's first-word /
// second-word lane slots rather than `_u64.ts`'s usual high/low naming.
const SHA3_IOTA_H = IOTAS[0];
const SHA3_IOTA_L = IOTAS[1];

// 64-bit left rotates as u32 pairs. Inlined here (not imported from _u64) so V8 can
// inline them into keccakP — the import path costs ~24% on sha3_256. SHA3 is the only
// consumer of left-rotates; other hashes use right-rotates from _u64.
// Valid for s in 1..31 (SH/SL) and 33..63 (BH/BL); keccak never rotates by 0/32/64.
const rotlSH = (h: number, l: number, s: number): number => (h << s) | (l >>> (32 - s));
const rotlSL = (h: number, l: number, s: number): number => (l << s) | (h >>> (32 - s));
const rotlBH = (h: number, l: number, s: number): number => (l << (s - 32)) | (h >>> (64 - s));
const rotlBL = (h: number, l: number, s: number): number => (h << (s - 32)) | (l >>> (64 - s));
const rotlH = (h: number, l: number, s: number) => (s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s));
const rotlL = (h: number, l: number, s: number) => (s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s));

// Reused Theta scratch buffer (column parities), same pattern as SHA256_W in sha2.
// keccakP never calls user code, so the shared buffer cannot be observed mid-permutation.
const B = new Uint32Array(5 * 2);

/**
 * `keccakf1600` internal permutation, additionally allows adjusting the round count.
 * @param s - 5x5 Keccak state encoded as 25 lanes split into 50 uint32 words
 *   in this file's local little-endian lane-word order
 * @param rounds - number of rounds to execute
 * @throws On wrong argument types. {@link TypeError}
 * @throws On wrong argument ranges or values. {@link RangeError}
 * @throws If `rounds` is outside the supported `1..24` range. {@link Error}
 * @example
 * Permute a Keccak state with the default 24 rounds.
 * ```ts
 * keccakP(new Uint32Array(50));
 * ```
 */
export function keccakP(s: TArg<Uint32Array>, rounds: number = 24): void {
  if (!(s instanceof Uint32Array))
    throw new TypeError('"s" expected Uint32Array(50), got type=' + typeof s);
  if (s.length !== 50) throw new RangeError('"s" expected Uint32Array(50), got length=' + s.length);
  anumber(rounds, 'rounds');
  // This implementation precomputes only the standard Keccak-f[1600] 24-round Iota table.
  if (rounds < 1 || rounds > 24) throw new Error('"rounds" expected integer 1..24');
  // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
  for (let round = 24 - rounds; round < 24; round++) {
    // Theta θ
    for (let x = 0; x < 10; x++) B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    // Rho (ρ) and Pi (π)
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    // Chi (χ)
    // Same as:
    // for (let x = 0; x < 10; x++) B[x] = s[y + x];
    // for (let x = 0; x < 10; x++) s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    for (let y = 0; y < 50; y += 10) {
      const b0 = s[y],
        b1 = s[y + 1],
        b2 = s[y + 2],
        b3 = s[y + 3];
      s[y] ^= ~s[y + 2] & s[y + 4];
      s[y + 1] ^= ~s[y + 3] & s[y + 5];
      s[y + 2] ^= ~s[y + 4] & s[y + 6];
      s[y + 3] ^= ~s[y + 5] & s[y + 7];
      s[y + 4] ^= ~s[y + 6] & s[y + 8];
      s[y + 5] ^= ~s[y + 7] & s[y + 9];
      s[y + 6] ^= ~s[y + 8] & b0;
      s[y + 7] ^= ~s[y + 9] & b1;
      s[y + 8] ^= ~b0 & b2;
      s[y + 9] ^= ~b1 & b3;
    }
    // Iota (ι)
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}

/**
 * Keccak sponge function.
 * @param blockLen - absorb/squeeze rate in bytes
 * @param suffix - domain separation suffix byte
 * @param outputLen - default digest length in bytes. This base sponge only
 *   requires a non-negative integer; wrappers that need positive output
 *   lengths must enforce that themselves.
 * @param enableXOF - whether XOF output is allowed
 * @param rounds - number of Keccak-f rounds
 * @example
 * Build a sponge state, absorb bytes, then finalize a digest.
 * ```ts
 * const hash = new Keccak(136, 0x06, 32);
 * hash.update(new Uint8Array([1, 2, 3]));
 * hash.digest();
 * ```
 */
export class Keccak implements Hash<Keccak>, HashXOF<Keccak> {
  protected state: Uint8Array;
  protected pos = 0;
  protected posOut = 0;
  protected finished = false;
  protected state32: Uint32Array;
  protected destroyed = false;

  public blockLen: number;
  public suffix: number;
  public outputLen: number;
  public canXOF: boolean;
  protected enableXOF = false;
  protected rounds: number;

  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(
    blockLen: number,
    suffix: number,
    outputLen: number,
    enableXOF = false,
    rounds: number = 24
  ) {
    anumber(blockLen, 'blockLen');
    anumber(suffix, 'suffix');
    anumber(rounds, 'rounds');
    abool(enableXOF, 'enableXOF');
    this.blockLen = blockLen;
    this.suffix = suffix;
    this.outputLen = outputLen;
    this.enableXOF = enableXOF;
    this.canXOF = enableXOF;
    this.rounds = rounds;
    // Can be passed from user as dkLen
    anumber(outputLen, 'outputLen');
    // Only keccak-f1600 is supported: 1600 bits (5x5 matrix of 64bit) === 200 bytes of state.
    if (!(0 < blockLen && blockLen < 200)) throw new Error('"blockLen" must be 1..199');
    this.state = new Uint8Array(200);
    this.state32 = u32(this.state);
  }
  clone(): Keccak {
    return this._cloneInto();
  }
  protected keccak(): void {
    swap32IfBE(this.state32);
    keccakP(this.state32, this.rounds);
    swap32IfBE(this.state32);
    this.posOut = 0;
    this.pos = 0;
  }
  update(data: TArg<Uint8Array>): this {
    aexists(this);
    abytes(data);
    const { blockLen, state, state32 } = this;
    const len = data.length;
    // Absorb full blocks with u32 XORs when both sides are 4-byte aligned.
    // XOR of same-position words equals XOR of same-position bytes, so this is endianness-safe.
    const canUseU32 = blockLen % 4 === 0 && data.byteOffset % 4 === 0;
    const blockLen32 = blockLen / 4;
    const data32 = canUseU32 && len >= blockLen ? u32(data) : undefined;
    for (let pos = 0; pos < len;) {
      if (data32 !== undefined && this.pos === 0 && pos % 4 === 0 && len - pos >= blockLen) {
        for (let i = 0, o = pos / 4; i < blockLen32; i++) state32[i] ^= data32[o + i];
        pos += blockLen;
        // Subclasses (_KeccakPRG) read `this.pos` inside their `keccak()` override,
        // so it must reflect the fully-absorbed block before the permutation fires.
        this.pos = blockLen;
        this.keccak();
        continue;
      }
      const take = Math.min(blockLen - this.pos, len - pos);
      for (let i = 0; i < take; i++) state[this.pos++] ^= data[pos++];
      if (this.pos === blockLen) this.keccak();
    }
    return this;
  }
  protected finish(): void {
    if (this.finished) return;
    this.finished = true;
    const { state, suffix, pos, blockLen } = this;
    // FIPS 202 appends the SHA3/SHAKE domain-separation suffix before pad10*1.
    // These byte values already include the first padding bit, while the
    // final `0x80` below supplies the closing `1` bit in the last rate byte.
    state[pos] ^= suffix;
    // If that combined suffix lands in the last rate byte and already sets
    // bit 7, absorb it first so the final pad10*1 bit can be xored into a
    // fresh block.
    if ((suffix & 0x80) !== 0 && pos === blockLen - 1) this.keccak();
    state[blockLen - 1] ^= 0x80;
    this.keccak();
  }
  protected writeInto(out: TArg<Uint8Array>): TRet<Uint8Array> {
    aexists(this, false);
    abytes(out);
    this.finish();
    const bufferOut = this.state;
    const { blockLen } = this;
    for (let pos = 0, len = out.length; pos < len;) {
      if (this.posOut >= blockLen) this.keccak();
      const take = Math.min(blockLen - this.posOut, len - pos);
      out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
      this.posOut += take;
      pos += take;
    }
    return out as TRet<Uint8Array>;
  }
  xofInto(out: TArg<Uint8Array>): TRet<Uint8Array> {
    // Plain SHA3/Keccak usage with XOF is probably a mistake, but this base
    // class is also reused by SHAKE/cSHAKE/KMAC/TupleHash/ParallelHash/
    // TurboSHAKE/KangarooTwelve wrappers that intentionally enable XOF.
    if (!this.enableXOF) throw new Error('XOF is not enabled');
    return this.writeInto(out);
  }
  xof(bytes: number): TRet<Uint8Array> {
    anumber(bytes);
    return this.xofInto(new Uint8Array(bytes));
  }
  digestInto(out: TArg<Uint8Array>): void {
    aoutput(out, this);
    if (this.finished) throw new Error('digest() was already called');
    // `aoutput(...)` allows oversized buffers; digestInto() must fill only the advertised digest.
    this.writeInto(out.length === this.outputLen ? out : out.subarray(0, this.outputLen));
    this.destroy();
  }
  digest(): TRet<Uint8Array> {
    const out = new Uint8Array(this.outputLen);
    this.digestInto(out);
    return out as TRet<Uint8Array>;
  }
  destroy(): void {
    this.destroyed = true;
    clean(this.state);
  }
  _cloneInto(to?: Keccak): Keccak {
    const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
    to ||= new Keccak(blockLen, suffix, outputLen, enableXOF, rounds);
    // Reused destinations can come from a different rate/capacity variant, so clone must rewrite
    // the sponge geometry as well as the state words.
    to.blockLen = blockLen;
    to.state32.set(this.state32);
    // Sponge padding and XOF output are positional, so both offsets are part of the clone state.
    to.pos = this.pos;
    to.posOut = this.posOut;
    to.finished = this.finished;
    to.rounds = rounds;
    // Suffix can change in cSHAKE
    to.suffix = suffix;
    to.outputLen = outputLen;
    to.enableXOF = enableXOF;
    // Clones must preserve the public capability bit too; `_KMAC` reuses this path and deep clone
    // tests compare instance fields directly, so leaving `canXOF` behind makes the clone lie.
    to.canXOF = this.canXOF;
    to.destroyed = this.destroyed;
    return to;
  }
}

const genKeccak = (
  suffix: number,
  blockLen: number,
  outputLen: number,
  info: TArg<HashInfo> = {}
) => createHasher(() => new Keccak(blockLen, suffix, outputLen), info);

/**
 * SHA3-224 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA3-224.
 * ```ts
 * sha3_224(new Uint8Array([97, 98, 99]));
 * ```
 */
export const sha3_224: TRet<CHash> = /* @__PURE__ */ genKeccak(
  0x06,
  144,
  28,
  /* @__PURE__ */ oidNist(0x07)
);
/**
 * SHA3-256 hash function. Different from keccak-256.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA3-256.
 * ```ts
 * sha3_256(new Uint8Array([97, 98, 99]));
 * ```
 */
export const sha3_256: TRet<CHash> = /* @__PURE__ */ genKeccak(
  0x06,
  136,
  32,
  /* @__PURE__ */ oidNist(0x08)
);
/**
 * SHA3-384 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA3-384.
 * ```ts
 * sha3_384(new Uint8Array([97, 98, 99]));
 * ```
 */
export const sha3_384: TRet<CHash> = /* @__PURE__ */ genKeccak(
  0x06,
  104,
  48,
  /* @__PURE__ */ oidNist(0x09)
);
/**
 * SHA3-512 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA3-512.
 * ```ts
 * sha3_512(new Uint8Array([97, 98, 99]));
 * ```
 */
export const sha3_512: TRet<CHash> = /* @__PURE__ */ genKeccak(
  0x06,
  72,
  64,
  /* @__PURE__ */ oidNist(0x0a)
);

/**
 * Keccak-224 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with Keccak-224.
 * ```ts
 * keccak_224(new Uint8Array([97, 98, 99]));
 * ```
 */
export const keccak_224: TRet<CHash> = /* @__PURE__ */ genKeccak(0x01, 144, 28);
/**
 * Keccak-256 hash function. Different from SHA3-256.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with Keccak-256.
 * ```ts
 * keccak_256(new Uint8Array([97, 98, 99]));
 * ```
 */
export const keccak_256: TRet<CHash> = /* @__PURE__ */ genKeccak(0x01, 136, 32);
/**
 * Keccak-384 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with Keccak-384.
 * ```ts
 * keccak_384(new Uint8Array([97, 98, 99]));
 * ```
 */
export const keccak_384: TRet<CHash> = /* @__PURE__ */ genKeccak(0x01, 104, 48);
/**
 * Keccak-512 hash function.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with Keccak-512.
 * ```ts
 * keccak_512(new Uint8Array([97, 98, 99]));
 * ```
 */
export const keccak_512: TRet<CHash> = /* @__PURE__ */ genKeccak(0x01, 72, 64);

/** Options for SHAKE XOF. */
export type ShakeOpts = {
  /** Desired number of output bytes. */
  dkLen?: number;
};

const genShake = (suffix: number, blockLen: number, outputLen: number, info: TArg<HashInfo> = {}) =>
  createHasher<Keccak, ShakeOpts>((opts: ShakeOpts = {}) => {
    opts = checkOpts({}, opts);
    return new Keccak(blockLen, suffix, opts.dkLen === undefined ? outputLen : opts.dkLen, true);
  }, info);

/**
 * SHAKE128 XOF with 128-bit security and a 16-byte default output.
 * @param msg - message bytes to hash
 * @param opts - Optional output-length override. See {@link ShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHAKE128.
 * ```ts
 * shake128(new Uint8Array([97, 98, 99]), { dkLen: 32 });
 * ```
 */
export const shake128: TRet<CHashXOF<Keccak, ShakeOpts>> =
  /* @__PURE__ */
  genShake(0x1f, 168, 16, /* @__PURE__ */ oidNist(0x0b));
/**
 * SHAKE256 XOF with 256-bit security and a 32-byte default output.
 * @param msg - message bytes to hash
 * @param opts - Optional output-length override. See {@link ShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHAKE256.
 * ```ts
 * shake256(new Uint8Array([97, 98, 99]), { dkLen: 64 });
 * ```
 */
export const shake256: TRet<CHashXOF<Keccak, ShakeOpts>> =
  /* @__PURE__ */
  genShake(0x1f, 136, 32, /* @__PURE__ */ oidNist(0x0c));

/**
 * SHAKE128 XOF with 256-bit output (NIST version).
 * @param msg - message bytes to hash
 * @param opts - Optional output-length override. See {@link ShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHAKE128 using a 32-byte default output.
 * ```ts
 * shake128_32(new Uint8Array([97, 98, 99]), { dkLen: 32 });
 * ```
 */
export const shake128_32: TRet<CHashXOF<Keccak, ShakeOpts>> =
  /* @__PURE__ */
  genShake(0x1f, 168, 32, /* @__PURE__ */ oidNist(0x0b));
/**
 * SHAKE256 XOF with 512-bit output (NIST version).
 * @param msg - message bytes to hash
 * @param opts - Optional output-length override. See {@link ShakeOpts}.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHAKE256 using a 64-byte default output.
 * ```ts
 * shake256_64(new Uint8Array([97, 98, 99]), { dkLen: 64 });
 * ```
 */
export const shake256_64: TRet<CHashXOF<Keccak, ShakeOpts>> =
  /* @__PURE__ */
  genShake(0x1f, 136, 64, /* @__PURE__ */ oidNist(0x0c));
