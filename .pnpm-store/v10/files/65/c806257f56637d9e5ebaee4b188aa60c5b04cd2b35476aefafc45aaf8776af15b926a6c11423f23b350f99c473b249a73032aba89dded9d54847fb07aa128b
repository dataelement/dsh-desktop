/**
 * Internal helpers for u64.
 * BigUint64Array is too slow as per 2026, so we implement it using
 * Uint32Array.
 * @privateRemarks TODO: re-check {@link https://issues.chromium.org/issues/42212588}
 * @module
 */
import type { TRet } from './utils.ts';
declare function fromBig(n: bigint, le?: boolean): {
    h: number;
    l: number;
};
declare function split(lst: bigint[], le?: boolean): TRet<Uint32Array[]>;
declare const toBig: (h: number, l: number) => bigint;
declare const fromNumH: (n: number) => number;
declare const fromNumL: (n: number) => number;
declare function setU64FromNum(view: DataView, byteOffset: number, n: number, isLE: boolean): void;
declare const shrSH: (h: number, _l: number, s: number) => number;
declare const shrSL: (h: number, l: number, s: number) => number;
declare const rotrSH: (h: number, l: number, s: number) => number;
declare const rotrSL: (h: number, l: number, s: number) => number;
declare const rotrBH: (h: number, l: number, s: number) => number;
declare const rotrBL: (h: number, l: number, s: number) => number;
declare const rotr32H: (_h: number, l: number) => number;
declare const rotr32L: (h: number, _l: number) => number;
declare function add(Ah: number, Al: number, Bh: number, Bl: number): {
    h: number;
    l: number;
};
declare const add3L: (Al: number, Bl: number, Cl: number) => number;
declare const add3H: (low: number, Ah: number, Bh: number, Ch: number) => number;
declare const add4L: (Al: number, Bl: number, Cl: number, Dl: number) => number;
declare const add4H: (low: number, Ah: number, Bh: number, Ch: number, Dh: number) => number;
declare const add5L: (Al: number, Bl: number, Cl: number, Dl: number, El: number) => number;
declare const add5H: (low: number, Ah: number, Bh: number, Ch: number, Dh: number, Eh: number) => number;
export { add, add3H, add3L, add4H, add4L, add5H, add5L, fromBig, fromNumH, fromNumL, rotr32H, rotr32L, rotrBH, rotrBL, rotrSH, rotrSL, setU64FromNum, shrSH, shrSL, split, toBig };
