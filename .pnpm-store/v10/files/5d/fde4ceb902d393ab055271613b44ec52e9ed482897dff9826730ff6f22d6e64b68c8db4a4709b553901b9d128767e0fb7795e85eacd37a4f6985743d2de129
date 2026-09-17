/** Durable attachment storage seam (`ctx.attachments`). @module @deepseek-ai/dsh-attachment */
import { Service } from '@deepseek-ai/cordis';
import { admitEncodedFile as admitFileInput, admitEncodedImages } from "./admission.js";
import { AttachmentError, isAttachmentError as matchesAttachmentError } from "./error.js";
export { AttachmentId, ImageVariantId } from "./brand.js";
export { AttachmentError, isAttachmentError, isImageAdmissionError } from "./error.js";
export { admitEncodedFile, admitEncodedImages } from "./admission.js";
export { requestImageDimensions } from "./request-projection.js";
/** Immutable binary attachment service. Implementations validate bytes before publishing a reference. */
export class AttachmentStore extends Service {
    constructor(ctx) {
        super(ctx, 'attachments');
    }
    /**
     * Validate one ordered image batch before committing any member.
     * Validation failures start no writes; storage failures return no partial
     * references, although already published content-addressed objects may stay
     * unreachable until a future retention policy collects them.
     * @param inputs - encoded images in their owning message order.
     * @returns durable references in the exact input order.
     */
    validateImageBatch(inputs) {
        const { maxImagesPerMessage, maxMessageImageBytes, mediaTypes } = this.imageLimits;
        if (inputs.length > maxImagesPerMessage) {
            throw new AttachmentError('Image batch exceeds the configured image-count limit.', 'TOO_MANY_IMAGES');
        }
        const totalBytes = inputs.reduce((sum, input) => sum + input.data.byteLength, 0);
        if (totalBytes > maxMessageImageBytes) {
            throw new AttachmentError('Image batch exceeds the configured aggregate image-byte limit.', 'IMAGES_TOO_LARGE');
        }
        for (const input of inputs) {
            if (!mediaTypes.includes(input.mediaType)) {
                throw new AttachmentError(`Image type ${input.mediaType} is not accepted by this deployment.`, 'UNSUPPORTED_IMAGE_TYPE');
            }
        }
    }
    /**
     * Validate and durably commit one ordered image batch.
     * @param inputs - encoded images in owning-message order.
     * @returns durable normalized attachment references in the same order after every member succeeds.
     */
    async saveImages(inputs) {
        this.validateImageBatch(inputs);
        for (const input of inputs)
            await this.validateImage(input);
        const refs = [];
        for (const input of inputs)
            refs.push(await this.saveImage(input));
        return refs;
    }
    /**
     * Admit one Host prompt and replace each uploaded image with its durable reference.
     * Text and durable file references pass through unchanged. A prompt without image parts performs no storage operation.
     * @param content - prompt parts in message order after file receipt resolution.
     * @returns admitted prompt parts in the same order as `content`.
     * @throws AttachmentError when the image batch is refused.
     */
    async admitPromptContent(content) {
        if (content.every(part => part.type !== 'image')) {
            return content.map(part => part.type === 'text'
                ? { type: 'text', text: part.text }
                : { type: 'file', attachment: part.attachment });
        }
        const refs = await admitEncodedImages(this, content.filter(part => part.type === 'image'));
        let next = 0;
        return content.map((part) => {
            if (part.type === 'text')
                return { type: 'text', text: part.text };
            if (part.type === 'file')
                return { type: 'file', attachment: part.attachment };
            return { type: 'image', attachment: refs[next++] };
        });
    }
    /**
     * Decode and durably commit one canonical base64 file upload.
     * @param input - canonical base64 bytes and optional display name.
     * @returns the durable content-addressed file reference.
     * @throws AttachmentError when the encoding or storage operation is refused.
     */
    admitEncodedFile(input) {
        return admitFileInput(this, input);
    }
    /**
     * Identify a failure emitted by this attachment capability by its stable code.
     * @param error - value caught from an attachment operation.
     * @returns whether the value is an attachment failure.
     */
    isAttachmentError(error) {
        return matchesAttachmentError(error);
    }
    /**
     * Locate the provider-owned normalized object in the harness host filesystem.
     * @param ref - durable normalized attachment reference.
     * @returns an absolute host path, or undefined when this backend is not host-file-backed.
     * @throws an AttachmentError when the durable reference is invalid.
     */
    imageHostPath(ref) {
        void ref;
        return undefined;
    }
    /**
     * Durably commit one file byte-for-byte before its owning session event is
     * appended. Files carry no admission limits: any byte content and length is
     * accepted, and the stored object is the exact submitted bytes. Backends
     * without verbatim file storage keep this default rejection.
     * @param input - exact bytes and optional display name.
     * @returns the durable content-addressed file reference.
     */
    saveFile(input) {
        void input;
        return Promise.reject(new AttachmentError('The mounted attachment provider cannot store verbatim files.', 'ATTACHMENT_FILES_UNSUPPORTED'));
    }
    /**
     * Durably commit one file byte-for-byte from bounded chunks. Providers must
     * apply backpressure and must not collect the complete file in memory.
     * Backends without streamed verbatim storage keep this default rejection.
     * @param input - ordered exact bytes, optional cancellation, and display name.
     * @returns the durable content-addressed file reference.
     */
    saveFileStream(input) {
        void input;
        return Promise.reject(new AttachmentError('The mounted attachment provider cannot stream verbatim files.', 'ATTACHMENT_FILES_UNSUPPORTED'));
    }
    /**
     * Read and verify one verbatim stored file as bounded chunks. Providers must
     * not collect the complete file in memory. Backends without verbatim file
     * reads keep this default rejection.
     * @param ref - durable reference from the session log.
     * @param signal - optional cancellation for backend reads and verification work.
     * @returns exact file bytes in order; integrity failures reject the iteration.
     */
    async *readFileStream(ref, signal) {
        signal?.throwIfAborted();
        void ref;
        await Promise.reject(new AttachmentError('The mounted attachment provider cannot read verbatim files.', 'ATTACHMENT_FILES_UNSUPPORTED'));
    }
    /**
     * Locate the verbatim stored file object in the harness host filesystem.
     * @param ref - durable file reference.
     * @returns an absolute host path, or undefined when this backend is not host-file-backed.
     * @throws an AttachmentError when the durable reference is invalid.
     */
    fileHostPath(ref) {
        void ref;
        return undefined;
    }
    /**
     * Generate or read one deterministic model-request version from the stored normalized image.
     * @param ref - durable provider-independent normalized attachment reference.
     * @param policy - exact route pixel budget and encoded-byte target; a target no ladder quality meets yields the smallest ladder output.
     * @param signal - optional cancellation.
     * @returns request bytes and the cache/upload identity covering every transform input.
     */
    readImageRequest(ref, policy, signal) {
        signal?.throwIfAborted();
        void ref;
        void policy;
        return Promise.reject(new AttachmentError('The mounted attachment provider cannot derive model-request images.', 'ATTACHMENT_PROJECTION_UNSUPPORTED'));
    }
}
export default AttachmentStore;
//# sourceMappingURL=index.js.map