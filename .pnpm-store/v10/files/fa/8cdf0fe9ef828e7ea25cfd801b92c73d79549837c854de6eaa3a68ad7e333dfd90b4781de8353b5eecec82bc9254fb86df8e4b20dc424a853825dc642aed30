/**
 * Internal helpers for u64.
 * BigUint64Array is too slow as per 2026, so we implement it using
 * Uint32Array.
 * @privateRemarks TODO: re-check {@link https://issues.chromium.org/issues/42212588}
 * @module
 */
import type { TRet } from './utils.ts';

const U32_MASK64 = /* @__PURE__ */ (() => BigInt(2 ** 32 - 1))();
const _32n = /* @__PURE__ */ BigInt(32);

// Split bigint into two 32-bit halves. With `le=true`, returned fields become `{ h: low, l: high
// }` to match little-endian word order rather than the property names.
function fromBig(
  n: bigint,
  le = false
): {
  h: number;
  l: number;
} {
  if (le) return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
  return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}

// Split bigint list into `[highWords, lowWords]` when `le=false`; with `le=true`, the first array
// holds the low halves because `fromBig(...)` swaps the semantic meaning of `h` and `l`.
function split(lst: bigint[], le = false): TRet<Uint32Array[]> {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al] as TRet<Uint32Array[]>;
}

// Combine explicit `(high, low)` 32-bit halves into a bigint; `>>> 0` normalizes signed JS
// bitwise results back to uint32 first, and little-endian callers must swap.
const toBig = (h: number, l: number): bigint => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
// Split a JS number into u32 halves without a BigInt allocation. Exact only for integers
// `0 <= n < 2**53`; callers use it on byte / bit counters, which JS length math caps far below
// that (an ArrayBuffer cannot exceed 2**53 - 1 bytes).
const fromNumH = (n: number): number => (n / 2 ** 32) | 0;
const fromNumL = (n: number): number => n >>> 0;
// Drop-in replacement for `view.setBigUint64(byteOffset, BigInt(n), isLE)` without the per-call
// BigInt allocation. Same `n < 2**53` precondition as `fromNumH`/`fromNumL`.
function setU64FromNum(view: DataView, byteOffset: number, n: number, isLE: boolean): void {
  const h = fromNumH(n);
  const l = fromNumL(n);
  view.setUint32(byteOffset, isLE ? l : h, isLE);
  view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
// High 32-bit half of a 64-bit logical right shift for `s` in `0..31`.
const shrSH = (h: number, _l: number, s: number): number => h >>> s;
// Low 32-bit half of a 64-bit logical right shift, valid for `s` in `1..31`.
const shrSL = (h: number, l: number, s: number): number => (h << (32 - s)) | (l >>> s);
// High 32-bit half of a 64-bit right rotate, valid for `s` in `1..31`.
const rotrSH = (h: number, l: number, s: number): number => (h >>> s) | (l << (32 - s));
// Low 32-bit half of a 64-bit right rotate, valid for `s` in `1..31`.
const rotrSL = (h: number, l: number, s: number): number => (h << (32 - s)) | (l >>> s);
// High 32-bit half of a 64-bit right rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
const rotrBH = (h: number, l: number, s: number): number => (h << (64 - s)) | (l >>> (s - 32));
// Low 32-bit half of a 64-bit right rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
const rotrBL = (h: number, l: number, s: number): number => (h >>> (s - 32)) | (l << (64 - s));
// High 32-bit half of a 64-bit right rotate for `s === 32`; this is just the swapped low half.
const rotr32H = (_h: number, l: number): number => l;
// Low 32-bit half of a 64-bit right rotate for `s === 32`; this is just the swapped high half.
const rotr32L = (h: number, _l: number): number => h;
// 64-bit left rotates (rotl*) are not defined here: sha3.ts, their only consumer, keeps
// local copies so V8 inlines them into keccakP.

// Add two split 64-bit words and return the split `{ h, l }` sum.
// JS uses 32-bit signed integers for bitwise operations, so we cannot simply shift the carry out
// of the low sum and instead use division.
function add(
  Ah: number,
  Al: number,
  Bh: number,
  Bl: number
): {
  h: number;
  l: number;
} {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
}
// Addition with more than 2 elements
// Unmasked low-word accumulator for 3-way addition; pass the raw result into `add3H(...)`.
const add3L = (Al: number, Bl: number, Cl: number): number => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
// High-word finalize step for 3-way addition; `low` must be the untruncated output of `add3L(...)`.
const add3H = (low: number, Ah: number, Bh: number, Ch: number): number =>
  (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
// Unmasked low-word accumulator for 4-way addition; pass the raw result into `add4H(...)`.
const add4L = (Al: number, Bl: number, Cl: number, Dl: number): number =>
  (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
// High-word finalize step for 4-way addition; `low` must be the untruncated output of `add4L(...)`.
const add4H = (low: number, Ah: number, Bh: number, Ch: number, Dh: number): number =>
  (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
// Unmasked low-word accumulator for 5-way addition; pass the raw result into `add5H(...)`.
const add5L = (Al: number, Bl: number, Cl: number, Dl: number, El: number): number =>
  (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
// High-word finalize step for 5-way addition; `low` must be the untruncated output of `add5L(...)`.
const add5H = (low: number, Ah: number, Bh: number, Ch: number, Dh: number, Eh: number): number =>
  (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;

// prettier-ignore
export {
  add, add3H, add3L, add4H, add4L, add5H, add5L, fromBig, fromNumH, fromNumL, rotr32H, rotr32L, rotrBH, rotrBL, rotrSH, rotrSL, setU64FromNum, shrSH, shrSL, split, toBig
};
