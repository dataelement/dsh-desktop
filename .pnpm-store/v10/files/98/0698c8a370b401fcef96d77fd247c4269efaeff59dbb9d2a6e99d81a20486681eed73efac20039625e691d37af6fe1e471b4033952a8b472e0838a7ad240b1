/**
 * The model-facing `read_image` tool commits a PNG/JPEG/WebP/GIF file. A path
 * without a file extension is identified from its file signature, while the
 * attachment service's full decode stays authoritative. The mounted `ctx.fs`
 * backend owns path resolution and read access; names only declare media type.
 *
 * The route gate is deliberately stricter than the host upload preflight. An
 * image-reading tool is useful only when the exact calling route can inspect
 * its result, so unknown capability refuses instead of relying on an adapter
 * failure after filesystem and attachment work.
 * @module @deepseek-ai/dsh-tool-fs/src/read-image
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
/**
 * Identify the media type declared by a supported image file signature.
 * @param data - file bytes read through the current filesystem backend.
 * @returns the detected supported media type, or undefined for other bytes.
 */
export declare function sniffImageMediaType(data: Uint8Array): ImageMediaType | undefined;
/** The structured outcome declared by the `read_image` output schema. */
export interface ImageReadValue {
    path: string;
    image: {
        attachmentId: string;
        mediaType: ImageMediaType;
        bytes: number;
        width: number;
        height: number;
        name?: string;
        /** Orientation-applied file dimensions before normalization; present only when storage reduced it. */
        originalDimensions?: {
            width: number;
            height: number;
        };
    };
}
/**
 * Map a model-supplied path to its declared image media type by extension.
 * @param filePath - the raw `file_path` argument (not yet resolved).
 * @returns the declared media type, or undefined when the path does not claim an image.
 */
export declare function imageMediaTypeForPath(filePath: string): ImageMediaType | undefined;
/**
 * Enforce the strict image-capability gate for the calling route. Resolves the
 * session's latest routed provider/model (request header config, then agent
 * options) and requires the exact resolved route to declare `image` input explicitly.
 * @param ctx - the plugin context used to resolve the optional `llm` service.
 * @param exec - the tool-execution context supplying the calling agent.
 * @param requestedPath - the raw, not-yet-resolved path rendered in refusal messages.
 */
export declare function assertImageCapableRoute(ctx: Context, exec: ToolExecution, requestedPath: string): Promise<void>;
/**
 * Re-brand a structured image outcome into the durable attachment reference an
 * `ImageBlock` carries.
 * @param image - the image metadata from the output schema.
 * @returns the branded attachment reference.
 */
export declare function imageRefFromValue(image: ImageReadValue['image']): ImageAttachmentRef;
/**
 * Format an image read as the model-facing envelope beside its image block.
 * A downscaled read names the on-disk dimensions and the multiplier that maps
 * coordinates measured on the attached image back onto the original file.
 * @param displayPath - the backend-resolved path rendered in the envelope's `<path>` element.
 * @param image - the image metadata to summarize.
 * @returns the model-facing envelope; the image itself rides the adjacent image block.
 */
export declare function formatImageReadOutput(displayPath: string, image: ImageReadValue['image']): string;
/**
 * Register the `read_image` tool into the given context. The composing plugin
 * owns the attachments gate: `src/index.ts` calls this inside
 * `ctx.inject(['attachments'], …)` so the tool exists only while a durable
 * store is mounted. Execution still re-checks `ctx.get('attachments')` for
 * direct callers and gates on the calling route's declared image input.
 * @param ctx - the registration scope; execution uses its `fs` service plus
 *   the optional `attachments`/`llm` services.
 */
export declare function applyReadImageTool(ctx: Context): void;
//# sourceMappingURL=read-image.d.ts.map