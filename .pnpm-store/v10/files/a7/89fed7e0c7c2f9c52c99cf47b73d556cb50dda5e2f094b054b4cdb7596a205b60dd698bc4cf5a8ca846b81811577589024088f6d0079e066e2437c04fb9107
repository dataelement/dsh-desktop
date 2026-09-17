/** Durable attachment storage seam (`ctx.attachments`). @module @deepseek-ai/dsh-attachment */
import { Context, Service } from '@deepseek-ai/cordis';
import { AttachmentError } from './error.ts';
import type { AdmittedPromptContentPart, AttachmentAdmissionPart, EncodedFileAttachment, FileAttachmentRef, ImageAttachmentLimits, ImageAttachmentRef, ImageRequestPolicy, RequestImageAttachment, SaveFileAttachment, SaveFileStreamAttachment, SaveImageAttachment, StoredImageAttachment } from './types.ts';
export { AttachmentId, ImageVariantId } from './brand.ts';
export { AttachmentError, isAttachmentError, isImageAdmissionError } from './error.ts';
export type { AttachmentErrorCode, ImageAdmissionErrorCode } from './error.ts';
export { admitEncodedFile, admitEncodedImages } from './admission.ts';
export { requestImageDimensions } from './request-projection.ts';
export type { AttachmentId as AttachmentIdType, AdmittedPromptContentPart, AttachmentAdmissionPart, EncodedFileAttachment, EncodedImageAttachment, FileAttachmentRef, ImageAttachmentLimits, ImageAttachmentRef, ImageRequestPolicy, ImageMediaType, PromptContentPart, RequestImageAttachment, SaveFileAttachment, SaveFileStreamAttachment, SaveImageAttachment, StoredImageAttachment, } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        attachments: AttachmentStore;
    }
}
/** Immutable binary attachment service. Implementations validate bytes before publishing a reference. */
export declare abstract class AttachmentStore extends Service {
    constructor(ctx: Context);
    /** Deployment-resolved image policy used by authoritative and fast-path validation. */
    abstract readonly imageLimits: ImageAttachmentLimits;
    /**
     * Validate one image without persisting it.
     * Batch callers validate every member before saving any member.
     * @param input - encoded bytes, declared media type, and optional display name.
     * @returns completion after the encoded raster has been fully decoded.
     */
    abstract validateImage(input: SaveImageAttachment): Promise<void>;
    /**
     * Validate one ordered image batch before committing any member.
     * Validation failures start no writes; storage failures return no partial
     * references, although already published content-addressed objects may stay
     * unreachable until a future retention policy collects them.
     * @param inputs - encoded images in their owning message order.
     * @returns durable references in the exact input order.
     */
    protected validateImageBatch(inputs: readonly SaveImageAttachment[]): void;
    /**
     * Validate and durably commit one ordered image batch.
     * @param inputs - encoded images in owning-message order.
     * @returns durable normalized attachment references in the same order after every member succeeds.
     */
    saveImages(inputs: readonly SaveImageAttachment[]): Promise<readonly ImageAttachmentRef[]>;
    /**
     * Admit one Host prompt and replace each uploaded image with its durable reference.
     * Text and durable file references pass through unchanged. A prompt without image parts performs no storage operation.
     * @param content - prompt parts in message order after file receipt resolution.
     * @returns admitted prompt parts in the same order as `content`.
     * @throws AttachmentError when the image batch is refused.
     */
    admitPromptContent(content: readonly AttachmentAdmissionPart[]): Promise<AdmittedPromptContentPart[]>;
    /**
     * Decode and durably commit one canonical base64 file upload.
     * @param input - canonical base64 bytes and optional display name.
     * @returns the durable content-addressed file reference.
     * @throws AttachmentError when the encoding or storage operation is refused.
     */
    admitEncodedFile(input: EncodedFileAttachment): Promise<FileAttachmentRef>;
    /**
     * Identify a failure emitted by this attachment capability by its stable code.
     * @param error - value caught from an attachment operation.
     * @returns whether the value is an attachment failure.
     */
    isAttachmentError(error: unknown): error is AttachmentError;
    /**
     * Validate and durably commit one image before its owning session event is appended.
     * The returned reference describes the persisted normalized image. When
     * normalization reduces the raster, its `originalDimensions` records the
     * orientation-applied input dimensions.
     * @param input - encoded bytes, declared media type, and optional display name.
     * @returns the durable content-addressed normalized image reference.
     */
    abstract saveImage(input: SaveImageAttachment): Promise<ImageAttachmentRef>;
    /**
     * Read one image and verify that bytes still match the recorded reference.
     * @param ref - durable reference from the session log.
     * @param signal - optional cancellation for backend read and verification work.
     * @returns the verified bytes and normalized attachment reference.
     * @throws the signal reason when aborted, or a storage error when verification fails.
     */
    abstract readImage(ref: ImageAttachmentRef, signal?: AbortSignal): Promise<StoredImageAttachment>;
    /**
     * Locate the provider-owned normalized object in the harness host filesystem.
     * @param ref - durable normalized attachment reference.
     * @returns an absolute host path, or undefined when this backend is not host-file-backed.
     * @throws an AttachmentError when the durable reference is invalid.
     */
    imageHostPath(ref: ImageAttachmentRef): string | undefined;
    /**
     * Durably commit one file byte-for-byte before its owning session event is
     * appended. Files carry no admission limits: any byte content and length is
     * accepted, and the stored object is the exact submitted bytes. Backends
     * without verbatim file storage keep this default rejection.
     * @param input - exact bytes and optional display name.
     * @returns the durable content-addressed file reference.
     */
    saveFile(input: SaveFileAttachment): Promise<FileAttachmentRef>;
    /**
     * Durably commit one file byte-for-byte from bounded chunks. Providers must
     * apply backpressure and must not collect the complete file in memory.
     * Backends without streamed verbatim storage keep this default rejection.
     * @param input - ordered exact bytes, optional cancellation, and display name.
     * @returns the durable content-addressed file reference.
     */
    saveFileStream(input: SaveFileStreamAttachment): Promise<FileAttachmentRef>;
    /**
     * Read and verify one verbatim stored file as bounded chunks. Providers must
     * not collect the complete file in memory. Backends without verbatim file
     * reads keep this default rejection.
     * @param ref - durable reference from the session log.
     * @param signal - optional cancellation for backend reads and verification work.
     * @returns exact file bytes in order; integrity failures reject the iteration.
     */
    readFileStream(ref: FileAttachmentRef, signal?: AbortSignal): AsyncIterable<Uint8Array>;
    /**
     * Locate the verbatim stored file object in the harness host filesystem.
     * @param ref - durable file reference.
     * @returns an absolute host path, or undefined when this backend is not host-file-backed.
     * @throws an AttachmentError when the durable reference is invalid.
     */
    fileHostPath(ref: FileAttachmentRef): string | undefined;
    /**
     * Generate or read one deterministic model-request version from the stored normalized image.
     * @param ref - durable provider-independent normalized attachment reference.
     * @param policy - exact route pixel budget and encoded-byte target; a target no ladder quality meets yields the smallest ladder output.
     * @param signal - optional cancellation.
     * @returns request bytes and the cache/upload identity covering every transform input.
     */
    readImageRequest(ref: ImageAttachmentRef, policy: ImageRequestPolicy, signal?: AbortSignal): Promise<RequestImageAttachment>;
}
export default AttachmentStore;
//# sourceMappingURL=index.d.ts.map