/** Raster inspection: full decode at admission, header-only probe on verified reads. */
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
/** Decoded metadata from a supported image. */
export interface DetectedImage {
    mediaType: ImageMediaType;
    /** Intrinsic width with EXIF orientation applied — the width a viewer perceives. */
    width: number;
    /** Intrinsic height with EXIF orientation applied — the height a viewer perceives. */
    height: number;
    /** Whether the container carries more than one frame. */
    animated: boolean;
    /** Whether the bytes carry descriptive metadata, a color profile, or orientation. */
    carriesMetadata: boolean;
    /** Sharp sample depth reported for the decoded channels. */
    depth: string;
    /** Sharp colour space reported for the decoded pixels. */
    space: string;
    /** Whether decoded pixels carry an alpha channel. */
    hasAlpha: boolean;
}
/**
 * Check alpha metadata for bytes produced by this package's encoders.
 * Sharp/libvips may omit an all-opaque alpha plane from WebP output; every
 * other addition or removal indicates that the encoded result is incompatible
 * with its source facts.
 * @param sourceHasAlpha - whether the source bytes declare an alpha plane, or undefined when the source frame is unspecified.
 * @param output - decoded media type and alpha metadata from the encoded result.
 * @returns whether the output alpha metadata is compatible with the source.
 */
export declare function encodedAlphaIsCompatible(sourceHasAlpha: boolean | undefined, output: Pick<DetectedImage, 'mediaType' | 'hasAlpha'>): boolean;
/**
 * Parse a supported raster's header and return its intrinsic metadata without
 * decoding pixels. Digest-verified reads use this: admission already proved
 * that these exact bytes decode completely, so the read path only re-derives
 * the reference fields instead of paying the full-raster decode again.
 * @param data - complete encoded image bytes.
 * @returns verified format and dimensions.
 */
export declare function probeImage(data: Uint8Array): Promise<DetectedImage>;
/** Admission limits applied to a decoded raster's intrinsic dimensions. */
export interface DecodedImageLimits {
    /** Decoded-pixel (width times height) admission limit. */
    maxPixels?: number;
    /** Per-side admission limit applied to width and height independently. */
    maxDimension?: number;
}
/**
 * Fully decode a supported raster and return its intrinsic metadata.
 * @param data - complete encoded image bytes.
 * @param limits - intrinsic-dimension admission limits.
 * @returns verified format and dimensions.
 */
export declare function detectImage(data: Uint8Array, limits?: DecodedImageLimits): Promise<DetectedImage>;
//# sourceMappingURL=image.d.ts.map