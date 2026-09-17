/** Local durable attachment backend rooted below `DSH_HOME`. @module @deepseek-ai/dsh-attachment-local */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { AttachmentStore } from '@deepseek-ai/dsh-attachment';
import type { FileAttachmentRef, ImageAttachmentLimits, ImageAttachmentRef, ImageRequestPolicy, RequestImageAttachment, SaveFileAttachment, SaveFileStreamAttachment, SaveImageAttachment, StoredImageAttachment } from '@deepseek-ai/dsh-attachment';
import type { NormalizationPolicy } from './normalization.ts';
export { canPassThroughNormalization, normalizeImage } from './normalization.ts';
export type { NormalizedImage, NormalizationPolicy } from './normalization.ts';
export { commitPreparedImageFile, prepareImageFile, readImageFile, saveImageFile, validateImageFile } from './store.ts';
export type { PreparedImageFile } from './store.ts';
export { readRequestImageFile, requestImageVariantId } from './request-image.ts';
/** Default maximum encoded bytes for one submitted image; oversized sources are refused, not shrunk. */
export declare const DEFAULT_MAX_IMAGE_BYTES: number;
/** Default maximum images in one prompt. */
export declare const DEFAULT_MAX_IMAGES_PER_MESSAGE = 20;
/** Default maximum aggregate image bytes in one prompt. */
export declare const DEFAULT_MAX_MESSAGE_IMAGE_BYTES: number;
/** Default maximum intrinsic pixels for one submitted image. */
export declare const DEFAULT_MAX_IMAGE_PIXELS = 64000000;
/** Default per-side pixel cap for one submitted image. */
export declare const DEFAULT_MAX_IMAGE_DIMENSION = 8192;
/**
 * Default total-pixel budget of the stored normalized image. A larger source
 * is admitted and downscaled proportionally, so admission bounds what rides
 * every later model request without refusing ordinary large sources; extreme
 * aspect ratios keep their short-edge resolution instead of collapsing under
 * a long-edge rule.
 */
export declare const DEFAULT_NORMALIZED_IMAGE_MAX_PIXELS: number;
/** Default long-edge cap of the stored normalized image, applied after the total-pixel budget. */
export declare const DEFAULT_NORMALIZED_IMAGE_MAX_DIMENSION = 8192;
/** Default encoded-byte target for one stored normalized image. */
export declare const DEFAULT_NORMALIZED_IMAGE_MAX_BYTES: number;
/** Conservative default number of simultaneous native image transformations per store. */
export declare const DEFAULT_IMAGE_COMPRESSION_CONCURRENCY = 2;
/** Maximum configurable native image transformations per store. */
export declare const MAX_IMAGE_COMPRESSION_CONCURRENCY = 8;
/** Local attachment backend configuration. */
export interface Config {
    /** Explicit harness home; omitted follows `DSH_HOME`, then `~/.dsh`. */
    dshHome?: string;
    /** Maximum encoded bytes accepted for one submitted image. Default: 20 MiB. */
    maxImageBytes?: number;
    /** Maximum image count accepted in one submitted message. Default: 20. */
    maxImagesPerMessage?: number;
    /** Maximum aggregate encoded image bytes accepted in one submitted message. Default: 200 MiB. */
    maxMessageImageBytes?: number;
    /** Maximum intrinsic width multiplied by height accepted for one submitted image. Default: 64,000,000. */
    maxImagePixels?: number;
    /** Maximum intrinsic width and maximum intrinsic height accepted for one submitted image. Default: 8192px. */
    maxImageDimension?: number;
    /** Total-pixel budget of the stored provider-independent normalized image. */
    normalizedImageMaxPixels?: number;
    /** Long-edge pixel cap of the stored provider-independent normalized image, applied after the total-pixel budget. */
    normalizedImageMaxDimension?: number;
    /**
     * Encoded-byte target of the stored provider-independent normalized image;
     * the smallest quality-ladder output is kept when no quality fits.
     */
    normalizedImageMaxBytes?: number;
    /** Maximum simultaneous normalization or request-image transformations in this service instance. */
    imageCompressionConcurrency?: number;
}
/** Persistent content-addressed local attachment store. */
export declare class LocalAttachmentStore extends AttachmentStore {
    static Config: z<Config>;
    /** Absolute versioned storage root. */
    readonly root: string;
    readonly imageLimits: ImageAttachmentLimits;
    /** Resolved provider-independent normalization policy. */
    readonly normalizationPolicy: Readonly<NormalizationPolicy>;
    /** Resolved instance-level compression limit. */
    readonly imageCompressionConcurrency: number;
    private readonly compression;
    private readonly requestInflight;
    constructor(ctx: Context, config: Config);
    validateImage(input: SaveImageAttachment): Promise<void>;
    saveImages(inputs: readonly SaveImageAttachment[]): Promise<readonly ImageAttachmentRef[]>;
    saveImage(input: SaveImageAttachment): Promise<ImageAttachmentRef>;
    readImage(ref: ImageAttachmentRef, signal?: AbortSignal): Promise<StoredImageAttachment>;
    imageHostPath(ref: ImageAttachmentRef): string;
    saveFile(input: SaveFileAttachment): Promise<FileAttachmentRef>;
    saveFileStream(input: SaveFileStreamAttachment): Promise<FileAttachmentRef>;
    readFileStream(ref: FileAttachmentRef, signal?: AbortSignal): AsyncIterable<Uint8Array>;
    fileHostPath(ref: FileAttachmentRef): string;
    readImageRequest(ref: ImageAttachmentRef, policy: ImageRequestPolicy, signal?: AbortSignal): Promise<RequestImageAttachment>;
    private requestVersion;
}
export default LocalAttachmentStore;
//# sourceMappingURL=index.d.ts.map