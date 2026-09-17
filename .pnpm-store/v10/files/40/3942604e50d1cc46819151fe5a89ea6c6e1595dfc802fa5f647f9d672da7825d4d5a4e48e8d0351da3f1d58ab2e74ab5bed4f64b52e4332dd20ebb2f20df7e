/** Content-addressed, owner-private local attachment storage. */
import type { ImageAttachmentLimits, ImageAttachmentRef, SaveImageAttachment, StoredImageAttachment } from '@deepseek-ai/dsh-attachment';
import type { NormalizationPolicy } from './normalization.ts';
/**
 * Derive the absolute immutable-object path for one normalized attachment.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param ref - durable normalized attachment reference.
 * @returns provider-local path without reading the object.
 */
export declare function normalizedImagePath(root: string, ref: ImageAttachmentRef): string;
/**
 * Run the full admission policy for one image without touching storage,
 * including normalization: a batch whose members all validate cannot later
 * be refused by the normalized image byte cap during publication.
 * @param input - encoded bytes and declared metadata.
 * @param limits - resolved source admission policy.
 * @param policy - resolved normalization policy.
 * @returns completion after the raster has been decoded and its normalized version proven to fit.
 */
export declare function validateImageFile(input: SaveImageAttachment, limits: ImageAttachmentLimits, policy: NormalizationPolicy): Promise<void>;
/** Fully prepared normalized object, verified before any batch member is persisted. */
export interface PreparedImageFile {
    /** Deterministic normalized bytes whose digest is {@link ref.attachmentId}. */
    data: Uint8Array;
    /** Durable reference describing {@link data}. */
    ref: ImageAttachmentRef;
}
/**
 * Decode, normalize, and verify one submitted image without touching storage.
 * @param input - submitted encoded bytes and declared media type.
 * @param limits - source admission policy.
 * @param policy - independent normalization policy.
 * @returns immutable reference facts beside bytes ready for atomic publication.
 */
export declare function prepareImageFile(input: SaveImageAttachment, limits: ImageAttachmentLimits, policy: NormalizationPolicy): Promise<PreparedImageFile>;
/**
 * Publish one already verified normalized image below a versioned attachment root.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param prepared - deterministic normalized bytes and reference.
 * @returns durable content-addressed normalized image reference.
 */
export declare function commitPreparedImageFile(root: string, prepared: PreparedImageFile): Promise<ImageAttachmentRef>;
/**
 * Publish one immutable content-addressed object below a versioned attachment
 * root: staged write, fsync, hard-link into place, digest-verified EEXIST
 * deduplication, read-only mode, and durable directory entries from the
 * target's parent up to (excluding) `root`.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param target - absolute final object path below `root`.
 * @param data - exact object bytes whose digest is `sha256`.
 * @param sha256 - hex digest the stored bytes must match on deduplication.
 */
export declare function publishImmutableObject(root: string, target: string, data: Uint8Array, sha256: string): Promise<void>;
/** Digest and byte count produced while streaming one immutable object to disk. */
export interface StreamedImmutableObject {
    readonly sha256: string;
    readonly bytes: number;
}
/**
 * Stream one immutable object from bounded chunks into a staging file, then
 * publish it at a digest-derived target without collecting the complete object in memory.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param data - exact object bytes in order.
 * @param targetFor - derive the final absolute target from the completed digest and byte count.
 * @param signal - optional cancellation for source reads and storage writes.
 * @returns digest and exact byte count of the published object.
 */
export declare function publishImmutableObjectStream(root: string, data: AsyncIterable<Uint8Array>, targetFor: (sha256: string, bytes: number) => string, signal?: AbortSignal): Promise<StreamedImmutableObject>;
/**
 * Publish another durable hard-link name for an existing immutable object.
 * @param root - absolute versioned attachment root.
 * @param source - existing content-addressed object below `root`.
 * @param target - new alias below `root`.
 * @param sha256 - expected object digest for an existing-target race.
 */
export declare function publishImmutableAlias(root: string, source: string, target: string, sha256: string): Promise<void>;
/**
 * Decode and normalize one image once, then publish the prepared object.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param input - submitted encoded bytes and declared media type.
 * @param limits - resolved source admission policy.
 * @param policy - resolved normalization policy.
 * @returns durable content-addressed normalized image reference.
 */
export declare function saveImageFile(root: string, input: SaveImageAttachment, limits: ImageAttachmentLimits, policy: NormalizationPolicy): Promise<ImageAttachmentRef>;
/**
 * Read and verify one content-addressed image.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param ref - reference recorded in the session log.
 * @param signal - optional cancellation for filesystem and verification work.
 * @returns verified bytes and reference.
 * @throws the signal reason when aborted, or an AttachmentError when verification fails.
 */
export declare function readImageFile(root: string, ref: ImageAttachmentRef, signal?: AbortSignal): Promise<StoredImageAttachment>;
//# sourceMappingURL=store.d.ts.map