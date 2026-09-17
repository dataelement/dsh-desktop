/**
 * Internal helpers for blake hash.
 * @module
 */
import { rotr, type TRet } from './utils.ts';

// Unrealized speed-up: a file-local copy of rotr measured ~1-2% faster blake2s/blake256/blake3
// on Node 24 (V8 does not inline it into G1s/G2s across the module boundary). Reused from
// utils for deduplication.

/**
 * Internal blake permutation table.
 * Rows `0..9` serve BLAKE2s, rows `0..11` serve BLAKE2b with `10..11 = 0..1`, and Blake1 also
 * reuses the later rows shown below. Blake1 expands rounds `10..15` as `SIGMA[i % 10]`, so rows
 * `10..15` intentionally repeat rows `0..5` for the 14-round (256) and 16-round (512) variants.
 */
// prettier-ignore
export const BSIGMA: TRet<Uint8Array> = /* @__PURE__ */ Uint8Array.from([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
  11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
  7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
  9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
  2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
  12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
  13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
  6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
  10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
  // Blake1, unused in others
  11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
  7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
  9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
  2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
]);

// prettier-ignore
export type Num4 = { a: number; b: number; c: number; d: number; };

// Unrealized speed-up: G1s/G2s return a fresh {a,b,c,d} per call (160×/blake2s block), which
// V8's escape analysis does not eliminate when G stays a real call. Writing into one reused
// module-level slot instead measured +4-6% blake2s/blake256 1MB throughput on Node 24 — but
// ~2% slower blake3 (whose profile inlines G and scalar-replaces the fresh object) and no
// difference on 32-byte inputs. Kept simple.

// 32-bit / BLAKE2s first half of G, with the fixed `(16, 12)` rotation pair.
// Parameter `x` is the RFC 7693 first-half message word, or Blake1's pre-mixed
// `m[sigma[r][2i]] ^ u[sigma[r][2i+1]]` addend in the 32-bit path.
export function G1s(a: number, b: number, c: number, d: number, x: number): Num4 {
  a = (a + b + x) | 0;
  d = rotr(d ^ a, 16);
  c = (c + d) | 0;
  b = rotr(b ^ c, 12);
  return { a, b, c, d };
}

// 32-bit / BLAKE2s second half of G.
// Parameter `x` is the RFC 7693 second-half (`y`) message word, or Blake1's pre-mixed
// `m[sigma[r][2i + 1]] ^ u[sigma[r][2i]]` addend in the 32-bit path.
export function G2s(a: number, b: number, c: number, d: number, x: number): Num4 {
  a = (a + b + x) | 0;
  d = rotr(d ^ a, 8);
  c = (c + d) | 0;
  b = rotr(b ^ c, 7);
  return { a, b, c, d };
}
