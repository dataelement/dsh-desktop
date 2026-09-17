/**
 * Internal helpers for blake hash.
 * @module
 */
import { type TRet } from './utils.ts';
/**
 * Internal blake permutation table.
 * Rows `0..9` serve BLAKE2s, rows `0..11` serve BLAKE2b with `10..11 = 0..1`, and Blake1 also
 * reuses the later rows shown below. Blake1 expands rounds `10..15` as `SIGMA[i % 10]`, so rows
 * `10..15` intentionally repeat rows `0..5` for the 14-round (256) and 16-round (512) variants.
 */
export declare const BSIGMA: TRet<Uint8Array>;
export type Num4 = {
    a: number;
    b: number;
    c: number;
    d: number;
};
export declare function G1s(a: number, b: number, c: number, d: number, x: number): Num4;
export declare function G2s(a: number, b: number, c: number, d: number, x: number): Num4;
