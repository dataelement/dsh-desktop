/**
 * Argon2 KDF from RFC 9106. Can be used to create a key from password and salt.
 * We suggest to use Scrypt. JS Argon is 2-10x slower than native code because of 64-bitness:
 * * argon uses uint64, but JS doesn't have fast uint64array
 * * uint64 multiplication is 1/3 of time
 * * `P` function would be very nice with u64, because most of value will be in registers,
 *   hovewer with u32 it will require 32 registers, which is too much.
 * * JS arrays do slow bound checks, so reading from `A2_BUF` slows it down
 * @module
 */
import { blake2b } from './blake2.ts';
import {
  anumber,
  checkOpts,
  clean,
  kdfInputToBytes,
  nextTick,
  swap32IfBE,
  swap8IfBE,
  u32,
  u8,
  type KDFInput,
  type TArg,
  type TRet,
} from './utils.ts';

// RFC 9106 §3.1 type `y`: 0 = Argon2d, 1 = Argon2i, 2 = Argon2id. The numeric values are the
// spec-bound part here; the object keys are internal labels.
const AT = { Argon2d: 0, Argon2i: 1, Argon2id: 2 } as const;
type Types = (typeof AT)[keyof typeof AT];

// RFC 9106 sync points constant `SL = 4`, fixed by the design rather than exposed as a tuning knob.
const ARGON2_SYNC_POINTS = 4;
// Preserve Argon2's `LE32(len(X)) || X` encoding for omitted
// optional fields by emitting empty bytes.
const abytesOrZero = (buf?: TArg<KDFInput>, errorTitle = ''): TRet<Uint8Array> => {
  if (buf === undefined) return Uint8Array.of();
  return kdfInputToBytes(buf, errorTitle);
};

// Temporary block buffer.
// 1024-byte block: 256 u32 = 128 interleaved low/high halves = RFC's
// 8x8 matrix of 16-byte registers.
const A2_BUF = new Uint32Array(256);

// Quarter-round over 64-bit word indices into `A2_BUF`; each index maps to adjacent low/high u32s.
// Each BlaMka step `X = X + Y + 2 * trunc(X) * trunc(Y)` (trunc = low 32 bits) starts
// with an exact low product from `Math.imul`. The rounded double product is within 1024 of the
// exact u64 product; subtracting that exact low half and rounding to the nearest multiple of
// 2^32 therefore recovers the exact high half. RFC 9106 Figure 19 GB then rotates by 32, 24,
// 16, and 63 bits after each XOR.
function G(a: number, b: number, c: number, d: number) {
  let Al = A2_BUF[2*a], Ah = A2_BUF[2*a + 1]; // prettier-ignore
  let Bl = A2_BUF[2*b], Bh = A2_BUF[2*b + 1]; // prettier-ignore
  let Cl = A2_BUF[2*c], Ch = A2_BUF[2*c + 1]; // prettier-ignore
  let Dl = A2_BUF[2*d], Dh = A2_BUF[2*d + 1]; // prettier-ignore
  let ml = 0, mh = 0, rl = 0, xh = 0, xl = 0; // prettier-ignore

  // A = blamka(A, B); D = rotr64(D ^ A, 32)
  ml = Math.imul(Al, Bl);
  mh = (((Al >>> 0) * (Bl >>> 0) - (ml >>> 0)) / 0x100000000 + 0.5) | 0; // prettier-ignore
  rl = (Al >>> 0) + (Bl >>> 0) + ((ml << 1) >>> 0);
  Ah = (Ah + Bh + ((mh << 1) | (ml >>> 31)) + ((rl / 0x100000000) | 0)) | 0;
  Al = rl | 0; // prettier-ignore
  xh = Dh ^ Ah;
  xl = Dl ^ Al; // prettier-ignore
  Dh = xl;
  Dl = xh; // prettier-ignore

  // C = blamka(C, D); B = rotr64(B ^ C, 24)
  ml = Math.imul(Cl, Dl);
  mh = (((Cl >>> 0) * (Dl >>> 0) - (ml >>> 0)) / 0x100000000 + 0.5) | 0; // prettier-ignore
  rl = (Cl >>> 0) + (Dl >>> 0) + ((ml << 1) >>> 0);
  Ch = (Ch + Dh + ((mh << 1) | (ml >>> 31)) + ((rl / 0x100000000) | 0)) | 0;
  Cl = rl | 0; // prettier-ignore
  xh = Bh ^ Ch;
  xl = Bl ^ Cl; // prettier-ignore
  Bh = (xh >>> 24) | (xl << 8);
  Bl = (xh << 8) | (xl >>> 24); // prettier-ignore

  // A = blamka(A, B); D = rotr64(D ^ A, 16)
  ml = Math.imul(Al, Bl);
  mh = (((Al >>> 0) * (Bl >>> 0) - (ml >>> 0)) / 0x100000000 + 0.5) | 0; // prettier-ignore
  rl = (Al >>> 0) + (Bl >>> 0) + ((ml << 1) >>> 0);
  Ah = (Ah + Bh + ((mh << 1) | (ml >>> 31)) + ((rl / 0x100000000) | 0)) | 0;
  Al = rl | 0; // prettier-ignore
  xh = Dh ^ Ah;
  xl = Dl ^ Al; // prettier-ignore
  Dh = (xh >>> 16) | (xl << 16);
  Dl = (xh << 16) | (xl >>> 16); // prettier-ignore

  // C = blamka(C, D); B = rotr64(B ^ C, 63)
  ml = Math.imul(Cl, Dl);
  mh = (((Cl >>> 0) * (Dl >>> 0) - (ml >>> 0)) / 0x100000000 + 0.5) | 0; // prettier-ignore
  rl = (Cl >>> 0) + (Dl >>> 0) + ((ml << 1) >>> 0);
  Ch = (Ch + Dh + ((mh << 1) | (ml >>> 31)) + ((rl / 0x100000000) | 0)) | 0;
  Cl = rl | 0; // prettier-ignore
  xh = Bh ^ Ch;
  xl = Bl ^ Cl; // prettier-ignore
  Bh = (xh << 1) | (xl >>> 31);
  Bl = (xh >>> 31) | (xl << 1); // prettier-ignore

  ((A2_BUF[2 * a] = Al), (A2_BUF[2 * a + 1] = Ah));
  ((A2_BUF[2 * b] = Bl), (A2_BUF[2 * b + 1] = Bh));
  ((A2_BUF[2 * c] = Cl), (A2_BUF[2 * c + 1] = Ch));
  ((A2_BUF[2 * d] = Dl), (A2_BUF[2 * d + 1] = Dh));
}

// Argon2 permutation over 16 register indices into `A2_BUF`, not the register values themselves.
// RFC 9106 Figure 17: these arguments are the 16 `v0..v15` 64-bit word
// indices inside eight 16-byte inputs, not copied word values.
// prettier-ignore
function P(
  v00: number, v01: number, v02: number, v03: number, v04: number, v05: number, v06: number, v07: number,
  v08: number, v09: number, v10: number, v11: number, v12: number, v13: number, v14: number, v15: number,
) {
  // RFC 9106 Figure 18: first apply GB across rows, then across columns of the 8x8 register matrix.
  G(v00, v04, v08, v12);
  G(v01, v05, v09, v13);
  G(v02, v06, v10, v14);
  G(v03, v07, v11, v15);
  G(v00, v05, v10, v15);
  G(v01, v06, v11, v12);
  G(v02, v07, v08, v13);
  G(v03, v04, v09, v14);
}

function block(x: TArg<Uint32Array>, xPos: number, yPos: number, outPos: number, needXor: boolean) {
  // Stage R = X xor Y in the destination before permuting it. This avoids rereading both source
  // blocks when folding R into the permuted scratch block below.
  if (needXor) {
    for (let i = 0; i < 256; i++) {
      const r = x[xPos + i] ^ x[yPos + i];
      A2_BUF[i] = r;
      x[outPos + i] ^= r;
    }
  } else {
    for (let i = 0; i < 256; i++) {
      const r = x[xPos + i] ^ x[yPos + i];
      A2_BUF[i] = r;
      x[outPos + i] = r;
    }
  }
  // rows (8 consecutive 16-register groups)
  for (let i = 0; i < 128; i += 16) {
    // prettier-ignore
    P(
      i, i + 1, i + 2, i + 3, i + 4, i + 5, i + 6, i + 7,
      i + 8, i + 9, i + 10, i + 11, i + 12, i + 13, i + 14, i + 15
    );
  }
  // columns (8 strided 16-register groups)
  for (let i = 0; i < 16; i += 2) {
    // prettier-ignore
    P(
      i, i + 1, i + 16, i + 17, i + 32, i + 33, i + 48, i + 49,
      i + 64, i + 65, i + 80, i + 81, i + 96, i + 97, i + 112, i + 113
    );
  }

  // RFC 9106 step 6: passes after the first XOR the old destination block into the new G(X, Y).
  for (let i = 0; i < 256; i++) x[outPos + i] ^= A2_BUF[i];
  clean(A2_BUF);
}

// Variable-Length Hash Function H'
// Returns bytes, not words; 1024-byte block callers explicitly reinterpret with `u32(...)`.
function Hp(A: TArg<Uint32Array>, dkLen: number): TRet<Uint8Array> {
  const A8 = u8(A);
  const T = new Uint32Array(1);
  const T8 = u8(T);
  // Argon2 H' prefixes dkLen as LE32; native Uint32Array writes would serialize as BE on s390x.
  T[0] = swap8IfBE(dkLen);
  // Fast path
  if (dkLen <= 64) return blake2b.create({ dkLen }).update(T8).update(A8).digest();
  const out = new Uint8Array(dkLen);
  let V = blake2b.create({}).update(T8).update(A8).digest();
  let pos = 0;
  // RFC 9106 Figure 8: each intermediate `V_i` contributes only `W_i`, its first 32 bytes; only
  // `V_{r+1}` is emitted in full at the remaining length.
  out.set(V.subarray(0, 32));
  pos += 32;
  // Rest blocks
  for (; dkLen - pos > 64; pos += 32) {
    const Vh = blake2b.create({}).update(V);
    Vh.digestInto(V);
    Vh.destroy();
    out.set(V.subarray(0, 32), pos);
  }
  // Last block
  out.set(blake2b(V, { dkLen: dkLen - pos }), pos);
  clean(V, T);
  // H' is byte-oriented; returning `u32(out)` would silently drop dkLen % 4 tail bytes.
  return out as TRet<Uint8Array>;
}

// Used only inside argon2Blocks!
function indexAlpha(
  r: number,
  s: number,
  laneLen: number,
  segmentLen: number,
  index: number,
  randL: number,
  sameLane: boolean = false
) {
  // RFC 9106 §3.4.2 Figures 12-13: map `J1` / `J2` into the current lane's reference area `W`.
  let area: number;
  if (r === 0) {
    if (s === 0) area = index - 1;
    else if (sameLane) area = s * segmentLen + index - 1;
    else area = s * segmentLen + (index == 0 ? -1 : 0);
  } else if (sameLane) area = laneLen - segmentLen + index - 1;
  else area = laneLen - segmentLen + (index == 0 ? -1 : 0);
  const startPos = r !== 0 && s !== ARGON2_SYNC_POINTS - 1 ? (s + 1) * segmentLen : 0;
  // Use the same exact-high recovery as G. `areaHigh` is floor(|W| * J1^2/2^32 / 2^32).
  const randLow = Math.imul(randL, randL);
  const randHigh = (((randL >>> 0) * (randL >>> 0) - (randLow >>> 0)) / 0x100000000 + 0.5) | 0;
  const areaLow = Math.imul(area, randHigh);
  const areaHigh = (((area >>> 0) * (randHigh >>> 0) - (areaLow >>> 0)) / 0x100000000 + 0.5) | 0;
  const rel = area - 1 - areaHigh;
  return (startPos + rel) % laneLen;
}

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

// Exclusive `2^32` sentinel used by `isU32(...)`, not the inclusive maximum u32 value.
const maxUint32 = Math.pow(2, 32);
const ARGON2_DEFAULT_MEMORY = 1024 ** 2; // KiB: 1 GiB
const ARGON2_DEFAULT_MAXMEM = ARGON2_DEFAULT_MEMORY * 1024;
// Validate safe JS integers in `[0, 2^32 - 1]`.
function isU32(num: number) {
  return Number.isSafeInteger(num) && num >= 0 && num < maxUint32;
}

function argon2Opts(opts: TArg<ArgonOpts> = {}) {
  opts = checkOpts({}, opts);
  const merged: any = {
    t: 3,
    m: ARGON2_DEFAULT_MEMORY,
    p: 1,
    version: 0x13,
    dkLen: 32,
    maxmem: ARGON2_DEFAULT_MAXMEM,
    asyncTick: 10,
  };
  // Unknown keys are copied through unchanged here and later ignored unless
  // destructuring consumes them.
  for (let [k, v] of Object.entries(opts)) if (v !== undefined) merged[k] = v;

  const { dkLen, p, m, t, version, onProgress, asyncTick } = merged;
  // RFC 9106 §3.1: tag length `T` MUST be an integer number of bytes from 4 to 2^32-1.
  if (!isU32(dkLen) || dkLen < 4) throw new Error('"dkLen" must be 4..');
  if (!isU32(p) || p < 1 || p >= Math.pow(2, 24)) throw new Error('"p" must be 1..2^24');
  if (!isU32(m)) throw new Error('"m" must be 0..2^32');
  if (!isU32(t) || t < 1) throw new Error('"t" (iterations) must be 1..2^32');
  if (onProgress !== undefined && typeof onProgress !== 'function')
    throw new Error('"onProgress" must be a function');
  anumber(asyncTick, 'asyncTick');
  /*
  Memory size m MUST be an integer number of kibibytes from 8*p
  to 2^(32)-1. The actual number of blocks is m', which is m
  rounded down to the nearest multiple of 4*p.
  */
  if (!isU32(m) || m < 8 * p) throw new Error('"m" (memory) must be at least 8*p bytes');
  // Accept legacy `0x10` for compatibility even though RFC 9106 profiles standardize `0x13`.
  if (version !== 0x10 && version !== 0x13)
    throw new Error('"version" must be 0x10 or 0x13, got ' + version);
  return merged;
}

function argon2InitialHash(
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  type: Types,
  opts: TArg<ArgonOpts>
) {
  const ownedInputs: Uint8Array[] = [];
  const BUF = new Uint32Array(1);
  const BUF8 = u8(BUF);
  let h: ReturnType<typeof blake2b.create> | undefined;
  let H0: Uint32Array | undefined;
  let succeeded = false;
  const rememberOwned = (input: unknown, bytes: TArg<TRet<Uint8Array>>): TRet<Uint8Array> => {
    if (typeof input === 'string') ownedInputs.push(bytes);
    return bytes as TRet<Uint8Array>;
  };
  try {
    const passwordBytes = rememberOwned(password, kdfInputToBytes(password, 'password'));
    const saltBytes = rememberOwned(salt, kdfInputToBytes(salt, 'salt'));
    if (!isU32(passwordBytes.length)) throw new Error('"password" must be less of length 1..4Gb');
    // RFC 9106 §3.1 only requires S <= 2^32-1 bytes and says 16 bytes is RECOMMENDED for password
    // hashing; this library intentionally takes the stricter common >=8-byte salt path.
    if (!isU32(saltBytes.length) || saltBytes.length < 8)
      throw new Error('"salt" must be of length 8..4Gb');
    if (!Object.values(AT).includes(type)) throw new Error('"type" was invalid');
    let { p, dkLen, m, t, version, key, personalization, maxmem, onProgress, asyncTick } =
      argon2Opts(opts);
    // Validation
    const keyInput = key;
    key = rememberOwned(keyInput, abytesOrZero(keyInput, 'key'));
    const personalizationInput = personalization;
    personalization = rememberOwned(
      personalizationInput,
      abytesOrZero(personalizationInput, 'personalization')
    );
    // H_0 = H^(64)(LE32(p) || LE32(T) || LE32(m) || LE32(t) ||
    //       LE32(v) || LE32(y) || LE32(length(P)) || P ||
    //       LE32(length(S)) || S ||  LE32(length(K)) || K ||
    //       LE32(length(X)) || X)
    h = blake2b.create();
    for (let item of [p, dkLen, m, t, version, type]) {
      // RFC 9106 H0 encodes these scalars as LE32, so normalize the host word before
      // exposing bytes.
      BUF[0] = swap8IfBE(item);
      h.update(BUF8);
    }
    for (let i of [passwordBytes, saltBytes, key, personalization]) {
      BUF[0] = swap8IfBE(i.length); // BUF is u32 array, this is valid once normalized to LE bytes
      h.update(BUF8).update(i);
    }
    // Reserve two extra LE32 words after the 64-byte `H_0` so Figures 3-4 can append
    // `LE32(0 or 1) || LE32(i)` in place for the lane-starting blocks.
    H0 = new Uint32Array(18);
    h.digestInto(u8(H0));
    succeeded = true;
    return { H0, p, dkLen, m, t, version, maxmem, onProgress, asyncTick };
  } finally {
    // digestInto() does not destroy BLAKE2 state. It and all string-derived inputs contain secrets.
    if (h) h.destroy();
    clean(BUF, ...ownedInputs);
    if (!succeeded && H0) clean(H0);
  }
}

function argon2Init(
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  type: Types,
  opts: TArg<ArgonOpts>
) {
  const { H0, p, dkLen, m, t, version, maxmem, onProgress, asyncTick } = argon2InitialHash(
    password,
    salt,
    type,
    opts
  );
  // 256 u32 = 1024 (BLOCK_SIZE), fills A2_BUF on processing
  try {
    // Params
    const lanes = p;
    // m' = 4 * p * floor (m / 4p)
    const mP = 4 * p * Math.floor(m / (ARGON2_SYNC_POINTS * p));
    //q = m' / p columns
    const laneLen = Math.floor(mP / p);
    const segmentLen = Math.floor(laneLen / ARGON2_SYNC_POINTS);
    // `maxmem` is documented in bytes; compare against the actual 1024-byte block allocation.
    const memUsed = mP * 1024;
    if (!isU32(maxmem)) throw new Error('"maxmem" expected <2**32, got ' + maxmem);
    if (memUsed > maxmem)
      throw new Error('"maxmem" limit was hit: memUsed(mP*1024)=' + memUsed + ', maxmem=' + maxmem);
    const B = new Uint32Array(memUsed / 4);
    // Fill first blocks
    for (let l = 0; l < p; l++) {
      const i = 256 * laneLen * l;
      // B[i][0] = H'^(1024)(H_0 || LE32(0) || LE32(i))
      H0[17] = swap8IfBE(l);
      H0[16] = swap8IfBE(0);
      B.set(swap32IfBE(u32(Hp(H0, 1024))), i);
      // B[i][1] = H'^(1024)(H_0 || LE32(1) || LE32(i))
      H0[16] = swap8IfBE(1);
      B.set(swap32IfBE(u32(Hp(H0, 1024))), i + 256);
    }
    let perBlock = () => {};
    if (onProgress) {
      // The first segment of the first pass skips two preinitialized blocks per lane.
      const totalBlock = t * ARGON2_SYNC_POINTS * p * segmentLen - 2 * p;
      // Invoke callback if progress changes from 10.01 to 10.02
      // Allows to draw smooth progress bar on up to 8K screen
      const callbackPer = Math.max(Math.floor(totalBlock / 10000), 1);
      let blockCnt = 0;
      perBlock = () => {
        blockCnt++;
        if (onProgress && (!(blockCnt % callbackPer) || blockCnt === totalBlock))
          onProgress(blockCnt / totalBlock);
      };
    }
    return { type, mP, p, t, version, B, laneLen, lanes, segmentLen, dkLen, perBlock, asyncTick };
  } finally {
    clean(H0);
  }
}

function argon2Output(
  B: TArg<Uint32Array>,
  p: number,
  laneLen: number,
  dkLen: number
): TRet<Uint8Array> {
  const B_final = new Uint32Array(256);
  for (let l = 0; l < p; l++)
    for (let j = 0; j < 256; j++) B_final[j] ^= B[256 * (laneLen * l + laneLen - 1) + j];
  // RFC 9106 steps 7-8 feed the byte string `C` into `H'^T(C)`, so normalize the xor'ed words
  // back to spec byte order before `Hp(...)` reinterprets them as bytes.
  const res = Hp(swap32IfBE(B_final), dkLen);
  // Wipe both the xor scratch and the full working matrix once final digest bytes exist.
  // JS cleanup is still only best-effort, but this local buffer is no longer needed here.
  clean(B, B_final);
  return res;
}

/**
 * Fills every Argon2 block for all passes / slices / lanes, yielding once per
 * processed block so callers control pacing: the sync driver just drains the
 * generator, while the async driver awaits `nextTick()` between time slices.
 */
function* argon2Blocks(
  ctx: ReturnType<typeof argon2Init>,
  address: TArg<Uint32Array>
): Generator<void, void> {
  const { type, mP, p, t, version, B, laneLen, lanes, segmentLen, perBlock } = ctx;
  // [address, input, zero_block] format so we can pass single U32 to block function
  address[256 + 6] = mP;
  address[256 + 8] = t;
  address[256 + 10] = type;
  for (let r = 0; r < t; r++) {
    // RFC 9106 step 6 applies the XOR-on-later-passes rule only for version `0x13`; legacy
    // `0x10` keeps the older overwrite behavior used by the v16 test vectors.
    const needXor = r !== 0 && version === 0x13;
    address[256 + 0] = r;
    for (let s = 0; s < ARGON2_SYNC_POINTS; s++) {
      address[256 + 4] = s;
      // RFC 9106 §3.4.1.3: Argon2id uses Argon2i's data-independent `J1` / `J2` generation only
      // in pass 0, slices 0 and 1; Argon2i uses it in every segment.
      const dataIndependent = type == AT.Argon2i || (type == AT.Argon2id && r === 0 && s < 2);
      for (let l = 0; l < p; l++) {
        address[256 + 2] = l;
        address[256 + 12] = 0;
        let startPos = 0;
        if (r === 0 && s === 0) {
          startPos = 2;
          if (dataIndependent) {
            address[256 + 12]++;
            block(address, 256, 2 * 256, 0, false);
            block(address, 0, 2 * 256, 0, false);
          }
        }
        // current block position
        let offset = l * laneLen + s * segmentLen + startPos;
        for (let index = startPos; index < segmentLen; index++, offset++) {
          perBlock();
          // Previous block position: wraps to the lane's last block only at lane start,
          // which can happen here only for the first block of slice 0 on passes > 0.
          const prev = offset % laneLen ? offset - 1 : offset + laneLen - 1;
          let randL, randH;
          if (dataIndependent) {
            let i128 = index % 128;
            // RFC 9106 §3.4.1.2: each 1024-byte address block yields 128 `(J1, J2)` pairs, so
            // regenerate it whenever the segment index crosses a multiple of 128.
            if (i128 === 0) {
              address[256 + 12]++;
              block(address, 256, 2 * 256, 0, false);
              block(address, 0, 2 * 256, 0, false);
            }
            randL = address[2 * i128];
            randH = address[2 * i128 + 1];
          } else {
            const T = 256 * prev;
            randL = B[T];
            randH = B[T + 1];
          }
          // Address-block path selects `J1` / `J2`, then maps them to the reference
          // lane/block per RFC 9106 §3.4.
          const refLane = r === 0 && s === 0 ? l : randH % lanes;
          const refPos = indexAlpha(r, s, laneLen, segmentLen, index, randL, refLane == l);
          const refBlock = laneLen * refLane + refPos;
          // B[i][j] = G(B[i][j-1], B[l][z])
          block(B, 256 * prev, 256 * refBlock, offset * 256, needXor);
          yield;
        }
      }
    }
  }
  clean(address);
}

function argon2(
  type: Types,
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: TArg<ArgonOpts>
): TRet<Uint8Array> {
  const ctx = argon2Init(password, salt, type, opts);
  const blocks = argon2Blocks(ctx, new Uint32Array(3 * 256));
  while (!blocks.next().done) {}
  return argon2Output(ctx.B, ctx.p, ctx.laneLen, ctx.dkLen);
}

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
export const argon2d = (
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: TArg<ArgonOpts> = {}
): TRet<Uint8Array> => argon2(AT.Argon2d, password, salt, opts);
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
export const argon2i = (
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: TArg<ArgonOpts> = {}
): TRet<Uint8Array> => argon2(AT.Argon2i, password, salt, opts);
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
export const argon2id = (
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: TArg<ArgonOpts> = {}
): TRet<Uint8Array> => argon2(AT.Argon2id, password, salt, opts);

async function argon2Async(
  type: Types,
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: TArg<ArgonOpts>
): Promise<TRet<Uint8Array>> {
  const ctx = argon2Init(password, salt, type, opts);
  // Keep the generator-local address block reachable so an aborted scheduler yield can wipe it.
  const address = new Uint32Array(3 * 256);
  const blocks = argon2Blocks(ctx, address);
  const abort = () => clean(address, ctx.B);
  let ts = Date.now();
  while (!blocks.next().done) {
    // Date.now() is not monotonic. If the clock goes backwards,
    // still yield control.
    const diff = Date.now() - ts;
    if (diff >= 0 && diff < ctx.asyncTick) continue;
    await nextTick(abort);
    // Scheduler delay is outside the synchronous work budget.
    ts = Date.now();
  }
  return argon2Output(ctx.B, ctx.p, ctx.laneLen, ctx.dkLen);
}

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
export const argon2dAsync = (
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: TArg<ArgonOpts> = {}
): Promise<TRet<Uint8Array>> => argon2Async(AT.Argon2d, password, salt, opts);
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
export const argon2iAsync = (
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: TArg<ArgonOpts> = {}
): Promise<TRet<Uint8Array>> => argon2Async(AT.Argon2i, password, salt, opts);
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
export const argon2idAsync = (
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: TArg<ArgonOpts> = {}
): Promise<TRet<Uint8Array>> => argon2Async(AT.Argon2id, password, salt, opts);
