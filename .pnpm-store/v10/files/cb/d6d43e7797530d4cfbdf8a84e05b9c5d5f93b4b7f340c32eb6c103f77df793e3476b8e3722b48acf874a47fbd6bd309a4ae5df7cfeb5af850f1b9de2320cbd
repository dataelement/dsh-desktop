/** Content-block structure helpers. @module @deepseek-ai/dsh-llm/content */
import type { ContentBlock } from './types.ts';
import type { Message } from './message.ts';
import type { AttachmentStore, FileAttachmentRef, ImageAttachmentRef, RequestImageAttachment } from '@deepseek-ai/dsh-attachment';
/** Execution-world path that model tools can use to read one normalized attachment. */
export interface ImageAttachmentAccess {
    /** Absolute path to immutable normalized bytes; callers must treat it as read-only. */
    readonlyPath: string;
}
/**
 * Resolve current execution-world access for one durable image reference.
 * @param ref - durable normalized attachment reference.
 * @returns a read-only execution-world path, or undefined when unavailable.
 */
export type ImageAttachmentAccessResolver = (ref: ImageAttachmentRef) => ImageAttachmentAccess | undefined;
/**
 * Bridge one attachment provider's host object location into the mounted
 * tool execution world. The consumer supplies the current filesystem
 * provider's mapping without making attachment or LLM definitions depend on it.
 * @param attachments - provider that owns the normalized attachment object.
 * @param mapHostPath - map one absolute host path into the current tool execution world.
 * @param ref - durable normalized attachment reference.
 * @returns a read-only execution-world path, or undefined when either provider exposes no mapping.
 * @throws an attachment error when the durable reference is invalid.
 */
export declare function resolveImageAttachmentAccess(attachments: AttachmentStore, mapHostPath: (hostPath: string) => string | undefined, ref: ImageAttachmentRef): ImageAttachmentAccess | undefined;
/**
 * Stable text shown to a model that cannot accept one durable image reference.
 * @param ref - durable normalized attachment omitted from the request.
 * @returns deterministic text-only placeholder.
 */
export declare function textOnlyImageText(ref: ImageAttachmentRef): string;
/**
 * Stable model-facing handle for one exact request image. Identity comes from
 * the occurrence's own durable reference: request versions are prepared per
 * attachment id, so one shared version may serve occurrences whose display
 * names differ.
 * @param ref - the occurrence's durable normalized attachment.
 * @param version - exact request-image dimensions shown beside the text.
 * @param access - optional path resolved for the current tool execution world.
 * @returns attachment handle and request-image dimensions.
 */
export declare function requestImageHandleText(ref: ImageAttachmentRef, version: Pick<RequestImageAttachment, 'width' | 'height'>, access?: ImageAttachmentAccess): string;
/**
 * Stable per-image placeholder for a request-limit omission.
 * @param ref - durable normalized attachment omitted from this request.
 * @param access - optional provider-resolved path for model tools.
 * @returns identity, normalized metadata, and the available recovery path.
 */
export declare function offloadedImageText(ref: ImageAttachmentRef, access?: ImageAttachmentAccess): string;
/**
 * True when typed model content contains an image block, walking nested
 * tool-result content. This is the one recursive image walk shared by every
 * image policy (capability gating, text-only serialization, compaction
 * survey), so a consumer cannot silently diverge on nesting depth.
 * @param content - typed model content blocks.
 * @returns whether any nested block is an image.
 */
export declare function contentHasImage(content: readonly ContentBlock[]): boolean;
/**
 * True when typed model content contains a file block, walking nested
 * tool-result content on the same recursion every file policy shares.
 * Reads current content on every call without retaining scan results.
 * @param content - typed model content blocks.
 * @returns whether any nested block is a file.
 */
export declare function contentHasFile(content: readonly ContentBlock[]): boolean;
/**
 * Stable model-facing handle for one durable file reference: the address of
 * the verbatim stored copy and the instruction to read it on demand. This is
 * the only representation a provider ever receives for a file.
 * @param ref - durable verbatim file reference.
 * @param readonlyPath - execution-world path of the stored copy, when resolvable.
 * @returns deterministic handle text naming the file, its size, and its address.
 */
export declare function fileHandleText(ref: FileAttachmentRef, readonlyPath: string | undefined): string;
/**
 * Project durable file history into deterministic handle text for every model
 * route. Unlike images, no provider receives file blocks natively, so this
 * projection is unconditional in request assembly.
 * @param messages - complete request history.
 * @param resolvePath - resolve one reference's current execution-world read path.
 * @returns the original list without files, otherwise shallow message copies with handle text.
 */
export declare function projectFilesToText(messages: readonly Message[], resolvePath: (ref: FileAttachmentRef) => string | undefined): readonly Message[];
/** Byte accounting and quantized removal policy for one request representation. */
export interface RequestImageOffloadPolicy {
    /** Image count accepted by the route; omission leaves count unbounded. */
    maxImages?: number;
    /** Accumulated image bytes accepted by the route; omission leaves bytes unbounded. */
    maxBytes?: number;
    /** Number of excess images removed as one deterministic step. */
    countQuantum?: number;
    /** Number of excess bytes removed as one deterministic step. */
    byteQuantum?: number;
    /** Whether byte accounting uses raw file bytes or inline base64 length. */
    representation: 'raw' | 'base64';
    /** Resolve the encoded request-version length; omission uses normalized attachment bytes. */
    byteLength?: (ref: ImageAttachmentRef) => number;
    /** Build the model-visible replacement for each omitted attachment. */
    placeholder: (ref: ImageAttachmentRef) => string;
}
/**
 * Project durable image history into deterministic text for an exact text-only model.
 * @param messages - complete request history.
 * @returns the original list without images, otherwise shallow message copies with stable placeholders.
 */
export declare function projectImagesForTextModel(messages: readonly Message[]): readonly Message[];
/**
 * Number of oldest image occurrences one request projection removes, in whole
 * count and byte quanta, once a route budget is exceeded. The result depends
 * only on the represented lengths, so provider request pricing reproduces the
 * exact serialization decision without building the projected messages.
 * @param lengths - represented byte length of every occurrence, in request order.
 * @param policy - count/byte budgets and removal quanta; unbounded when absent.
 * @returns how many leading occurrences the projection replaces with placeholders.
 */
export declare function offloadedImagePrefixCount(lengths: readonly number[], policy: Pick<RequestImageOffloadPolicy, 'maxImages' | 'maxBytes' | 'countQuantum' | 'byteQuantum'>): number;
/**
 * Return a deterministic transient projection whose oldest images are replaced
 * in whole count and byte quanta after a route budget is exceeded. The target
 * depends only on complete durable history: at 129 one-megabyte images under
 * a 128 MiB bound with a 64 MiB quantum, the oldest 65 images are removed so
 * 64 MiB remain; that removed prefix stays fixed until total history exceeds
 * 192 MiB.
 * @param messages - complete request history, oldest first.
 * @param policy - route representation, budgets, and removal quanta.
 * @returns original messages below both bounds, otherwise shallow copies with deterministic placeholders.
 */
export declare function offloadRequestImagesWithPolicy(messages: readonly Message[], policy: RequestImageOffloadPolicy): readonly Message[];
//# sourceMappingURL=content.d.ts.map