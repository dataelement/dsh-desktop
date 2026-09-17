/** Verbatim content-addressed local file storage. @module @deepseek-ai/dsh-attachment-local/file-store */
import type { FileAttachmentRef, SaveFileAttachment, SaveFileStreamAttachment } from '@deepseek-ai/dsh-attachment';
/**
 * Sanitize one caller display name into a safe stored leaf name. Both
 * separator styles are stripped by hand: a POSIX host treats `\` as an
 * ordinary character, so path.basename would keep a Windows client's full
 * local path and leak it into the reference and the session log. Characters
 * Windows refuses in file names become `_` so one reference stays valid on
 * every supported host.
 * @param value - caller-declared display name, possibly a full client path.
 * @returns a non-empty leaf name safe to store on every supported filesystem.
 */
export declare function fileLeafName(value: string | undefined): string;
/**
 * Derive the absolute immutable-object path for one stored file. The digest
 * names a directory so the sanitized display name stays the stored leaf name,
 * giving models and users a path that ends in the real filename.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param ref - durable file reference from the session log or an upload receipt.
 * @returns provider-local path without reading the object.
 * @throws an AttachmentError when the reference digest or name is invalid.
 */
export declare function storedFilePath(root: string, ref: FileAttachmentRef): string;
/**
 * Commit one file byte-for-byte below a versioned attachment root.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param input - exact bytes and optional display name.
 * @returns the durable content-addressed file reference.
 */
export declare function saveFileVerbatim(root: string, input: SaveFileAttachment): Promise<FileAttachmentRef>;
/**
 * Commit one file byte-for-byte from bounded chunks below a versioned attachment root.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param input - ordered exact bytes, optional cancellation, and display name.
 * @returns the durable content-addressed file reference.
 */
export declare function saveFileStreamVerbatim(root: string, input: SaveFileStreamAttachment): Promise<FileAttachmentRef>;
/**
 * Read one stored file in bounded chunks and verify its byte count and digest.
 * @param root - absolute `DSH_HOME/attachments/v1` root.
 * @param ref - durable file reference from the session log.
 * @param signal - optional cancellation for filesystem reads.
 * @returns exact stored bytes in order; integrity failures reject after the final chunk.
 */
export declare function readFileStreamVerbatim(root: string, ref: FileAttachmentRef, signal?: AbortSignal): AsyncIterable<Uint8Array>;
//# sourceMappingURL=file-store.d.ts.map