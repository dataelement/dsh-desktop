/** Attachment failure class. @module @deepseek-ai/dsh-attachment/error */
declare const IMAGE_ADMISSION_ERROR_CODES: readonly ["TOO_MANY_IMAGES", "IMAGES_TOO_LARGE", "UNSUPPORTED_IMAGE_TYPE", "INVALID_IMAGE_BASE64", "INVALID_IMAGE", "IMAGE_TYPE_MISMATCH", "IMAGE_TOO_LARGE", "IMAGE_TOO_MANY_PIXELS", "IMAGE_DIMENSION_TOO_LARGE"];
/** Caller-correctable attachment failure codes raised while admitting image input. */
export type ImageAdmissionErrorCode = typeof IMAGE_ADMISSION_ERROR_CODES[number];
declare const ATTACHMENT_ERROR_CODES: readonly ["TOO_MANY_IMAGES", "IMAGES_TOO_LARGE", "UNSUPPORTED_IMAGE_TYPE", "INVALID_IMAGE_BASE64", "INVALID_IMAGE", "IMAGE_TYPE_MISMATCH", "IMAGE_TOO_LARGE", "IMAGE_TOO_MANY_PIXELS", "IMAGE_DIMENSION_TOO_LARGE", "INVALID_FILE_BASE64", "INVALID_ATTACHMENT_REF", "ATTACHMENT_CORRUPT", "ATTACHMENT_WRITE_FAILED", "ATTACHMENT_NOT_FOUND", "ATTACHMENT_READ_FAILED", "ATTACHMENT_PROJECTION_UNSUPPORTED", "ATTACHMENT_FILES_UNSUPPORTED"];
/** Stable attachment failure codes used for protocol error routing. */
export type AttachmentErrorCode = typeof ATTACHMENT_ERROR_CODES[number];
/**
 * Stable failures suitable for host RPC error mapping.
 *
 * Deliberately re-implements the `HarnessError` shape instead of extending it:
 * the base lives in `@deepseek-ai/dsh-llm`, which itself depends on this
 * package (`ImageBlock` references `ImageAttachmentRef`), so sharing the base
 * would create a dependency cycle. Consumers route on `code`, never on the
 * prototype chain, so the shapes stay interchangeable at the wire boundary.
 */
export declare class AttachmentError extends Error {
    /** Stable machine-routing failure code. */
    readonly code: AttachmentErrorCode;
    /**
     * @param message - human-readable failure description without raw bytes or host paths.
     * @param code - stable machine-routing code.
     * @param options - optional chained cause.
     */
    constructor(message: string, code: AttachmentErrorCode, options?: ErrorOptions);
}
/**
 * Identify attachment failures by their stable code across duplicate package installations.
 * @param error - failure raised while validating, persisting, or reading an attachment.
 * @returns whether the failure carries a recognized attachment error code.
 */
export declare function isAttachmentError(error: unknown): error is AttachmentError;
/**
 * Distinguish caller-correctable image admission failures from storage faults.
 * @param error - failure raised while validating or persisting an image batch.
 * @returns whether the caller can correct the proposed image content or batch.
 */
export declare function isImageAdmissionError(error: unknown): error is AttachmentError & {
    readonly code: ImageAdmissionErrorCode;
};
export {};
//# sourceMappingURL=error.d.ts.map