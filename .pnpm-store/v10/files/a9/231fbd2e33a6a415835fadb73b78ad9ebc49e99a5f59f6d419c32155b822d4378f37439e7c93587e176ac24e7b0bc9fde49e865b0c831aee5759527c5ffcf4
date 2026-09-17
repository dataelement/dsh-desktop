/** Deterministic provider-independent image normalization. */
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { DetectedImage } from './image.ts';
/** Deployment-resolved policy for the persisted normalized attachment. */
export interface NormalizationPolicy {
    /** Total-pixel budget; larger sources are downscaled proportionally. */
    maxPixels: number;
    /** Long-edge cap in pixels applied after the total-pixel budget, bounding extreme aspect ratios. */
    maxDimension: number;
    /** Encoded-byte target for the quality ladder; the smallest ladder output is kept when no quality fits. */
    maxBytes: number;
}
/** Normalized bytes beside the facts recorded by a durable reference. */
export interface NormalizedImage {
    data: Uint8Array;
    mediaType: ImageMediaType;
    width: number;
    height: number;
}
/**
 * Whether bytes already satisfy the normalization requirements.
 * @param detected - fully decoded source facts.
 * @param bytes - encoded source length.
 * @param policy - resolved normalization limits.
 * @returns whether the source can pass through byte-identically.
 */
export declare function canPassThroughNormalization(detected: DetectedImage, bytes: number, policy: NormalizationPolicy): boolean;
/**
 * Produce the persisted provider-independent normalized version of one fully decoded source.
 * The source is passed through only when it is already clean, single-frame, 8-bit sRGB/sRGBA,
 * and inside every normalization limit. Re-encoding never removes transparency. When every
 * ladder quality exceeds the byte target, the smallest ladder output is kept; provider byte
 * caps stay enforced at the route that transmits the bytes.
 * @param data - complete admitted source bytes.
 * @param detected - fully decoded source facts.
 * @param policy - resolved independent normalization limits.
 * @returns verified provider-independent normalized bytes and metadata.
 */
export declare function normalizeImage(data: Uint8Array, detected: DetectedImage, policy: NormalizationPolicy): Promise<NormalizedImage>;
//# sourceMappingURL=normalization.d.ts.map