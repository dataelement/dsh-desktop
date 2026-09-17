/** Shared quality ladder and lazy candidate execution for normalization and request-image encoders. */
import type { Sharp } from 'sharp';
/** Shared ladder for both encoders: spaced so each step buys a real size reduction. */
export declare const IMAGE_ENCODING_QUALITIES: readonly [85, 75, 60];
/** Fixed lossy-WebP effort; deeper search costs 3-4x encode time for about 5% size. */
export declare const WEBP_ENCODING_EFFORT = 0;
/** One ladder output carrying its complete bytes and exact facts. */
export interface EncodedImage {
    data: Uint8Array;
    mediaType: 'image/jpeg' | 'image/webp';
    width: number;
    height: number;
}
/**
 * Build the lazy quality ladder for one prepared pipeline: WebP keeps a source
 * alpha channel, everything else is JPEG.
 * @param prepared - sized sRGB pipeline; cloned per candidate.
 * @param hasAlpha - decoded source alpha fact selecting the codec.
 * @returns encoders ordered from highest to lowest ladder quality.
 */
export declare function encodingLadder(prepared: Sharp, hasAlpha: boolean): Array<() => Promise<EncodedImage>>;
/** One encoded candidate carrying its complete bytes. */
export interface EncodedCandidate {
    data: Uint8Array;
}
/** Result of exhausting candidates at one raster size without a fitting output. */
export interface ExhaustedEncoding<T extends EncodedCandidate> {
    smallest: T;
}
/**
 * Execute encoding candidates in preference order and stop after the first fitting output.
 * @param attempts - lazy encoders ordered from preferred to fallback representation.
 * @param maxBytes - positive encoded-byte target.
 * @returns the first fitting candidate, otherwise the smallest completed fallback.
 */
export declare function encodeFirstWithinLimit<T extends EncodedCandidate>(attempts: readonly (() => Promise<T>)[], maxBytes: number): Promise<T | ExhaustedEncoding<T>>;
/**
 * Whether a lazy encoding result exhausted every candidate at one size.
 * @param result - first fitting candidate or exhausted result.
 * @returns whether every candidate exceeded the byte target.
 */
export declare function isExhaustedEncoding<T extends EncodedCandidate>(result: T | ExhaustedEncoding<T>): result is ExhaustedEncoding<T>;
//# sourceMappingURL=encoding.d.ts.map