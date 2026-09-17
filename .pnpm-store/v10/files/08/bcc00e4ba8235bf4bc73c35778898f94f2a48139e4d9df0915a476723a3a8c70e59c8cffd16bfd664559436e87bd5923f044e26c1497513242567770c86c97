/** Deterministic cached image versions for model requests. */
import { ImageVariantId } from '@deepseek-ai/dsh-attachment';
import type { ImageAttachmentRef, ImageRequestPolicy, RequestImageAttachment, StoredImageAttachment } from '@deepseek-ai/dsh-attachment';
/** Transform version included in every cache and upload-index identity. */
export declare const REQUEST_IMAGE_TRANSFORM_VERSION = "request-image-v5";
/**
 * Complete deterministic identity for one attachment and route-owned request policy.
 * @param attachment - provider-independent durable normalized attachment reference.
 * @param policy - route-owned pixel and byte policy.
 * @returns branded digest over every request transform input.
 */
export declare function requestImageVariantId(attachment: ImageAttachmentRef, policy: ImageRequestPolicy): ReturnType<typeof ImageVariantId>;
/**
 * Generate or reuse one request image below the local attachment root.
 * @param root - absolute versioned attachment storage root.
 * @param attachment - verified normalized attachment bytes and reference.
 * @param policy - exact route request-image policy.
 * @param signal - optional cancellation for cache I/O and image transformation.
 * @returns verified request bytes and deterministic variant identity.
 */
export declare function readRequestImageFile(root: string, attachment: StoredImageAttachment, policy: ImageRequestPolicy, signal?: AbortSignal): Promise<RequestImageAttachment>;
//# sourceMappingURL=request-image.d.ts.map