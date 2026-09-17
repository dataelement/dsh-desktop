/**
 * Unit conversion utilities for OOXML / PPTX.
 *
 * PPTX uses several unit systems:
 *   - EMU (English Metric Units): 1 inch = 914400 EMU
 *   - Points: 1 inch = 72 pt
 *   - Hundredths of a point: used for font sizes
 *   - 60000ths of a degree: used for angles
 *   - 100000ths (percentage): used for scale factors
 */
/** EMU to pixels (at 96 DPI). */
export declare function emuToPx(emu: number): number;
/** EMU to points. */
export declare function emuToPt(emu: number): number;
/** OOXML angle (60000ths of a degree) to degrees. */
export declare function angleToDeg(angle: number): number;
/** OOXML percentage (100000ths) to a decimal fraction (0..1 range for 0%..100%). */
export declare function pctToDecimal(pct: number): number;
/** Hundredths of a point to points (used for font sizes in OOXML). */
export declare function hundredthPtToPt(val: number): number;
/** Points to pixels (at 96 DPI). */
export declare function ptToPx(pt: number): number;
/**
 * Heuristic: detect whether a value is in EMU or points.
 * Values with abs > 20000 are almost certainly EMU (a single point = 12700 EMU).
 */
export declare function detectUnit(value: number): 'emu' | 'point';
/**
 * Smart conversion to pixels: auto-detects whether the value is EMU or points
 * and converts accordingly.
 */
export declare function smartToPx(value: number): number;
