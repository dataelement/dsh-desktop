/** DeepSeek Files API upload reuse, invalidation, and quota recovery. @module dsh-llm-deepseek/file-store */
import type { RequestImageAttachment } from '@deepseek-ai/dsh-attachment';
import type { DeepSeekFileId } from './file-id.ts';
import { DeepSeekUploadIndex } from './upload-index.ts';
import type { DeepSeekUploadRecord } from './upload-index.ts';
/** DeepSeek chat accepts at most 32 MiB per image even when it is referenced by file id. */
export declare const MAX_CHAT_IMAGE_BYTES: number;
/** Resolved file-store policy from the plugin configuration. */
export interface DeepSeekFilePolicy {
    expiresAfterSeconds: number;
    refreshMarginSeconds: number;
    quotaCleanupBatch: number;
}
/** Connection facts needed by file operations. */
export interface DeepSeekFileConnection {
    baseURL: string;
    apiKey: string;
}
/** Result of one file-id resolution. */
export interface DeepSeekFileReference {
    record: DeepSeekUploadRecord;
    uploaded: boolean;
}
interface FileStoreOptions {
    index?: DeepSeekUploadIndex;
    now?: () => number;
    fetch?: typeof fetch;
}
/** User-scoped durable file-id reuse for the DeepSeek route. */
export declare class DeepSeekFileStore {
    private readonly index;
    private readonly now;
    private readonly fetchImpl;
    private readonly inflight;
    /**
     * @param options - testable index, clock, and transport boundaries.
     */
    constructor(options?: FileStoreOptions);
    private client;
    /**
     * Resolve or upload one deterministic request image. Concurrent calls share one upload while retaining independent waits.
     * @param version - deterministic model-request bytes and complete transformation identity.
     * @param connection - endpoint and API-key snapshot.
     * @param policy - expiry and quota-recovery policy.
     * @param signal - cancellation of this wait; shared transport stops when no waiter remains.
     * @returns a reusable file id and whether this call published a new upload.
     */
    ensureUploaded(version: RequestImageAttachment, connection: DeepSeekFileConnection, policy: DeepSeekFilePolicy, signal?: AbortSignal): Promise<DeepSeekFileReference>;
    private ensureUploadedOnce;
    /**
     * Invalidate one exact local mapping after the chat endpoint rejects its remote id.
     * @param version - request-image version whose remote generation failed.
     * @param fileId - exact rejected file id.
     * @param connection - endpoint and API-key snapshot.
     */
    invalidate(version: RequestImageAttachment, fileId: DeepSeekFileId, connection: DeepSeekFileConnection): Promise<void>;
    /**
     * Delete the indexed remote file for one attachment and remove its local mapping.
     * @param version - exact request-image version to release.
     * @param connection - endpoint and API-key snapshot.
     * @param policy - expiry policy used to locate a reusable mapping.
     * @param signal - request cancellation.
     * @returns whether an indexed file existed and was deleted.
     */
    release(version: RequestImageAttachment, connection: DeepSeekFileConnection, policy: DeepSeekFilePolicy, signal?: AbortSignal): Promise<boolean>;
    /**
     * Delete the oldest provider files whose names identify harness ownership.
     * @param connection - endpoint and API-key snapshot.
     * @param count - positive maximum number of files to delete.
     * @param signal - request cancellation.
     * @returns number of successfully deleted files.
     */
    reclaimOldestOwned(connection: DeepSeekFileConnection, count: number, signal?: AbortSignal): Promise<number>;
    /**
     * Delete every remote harness-owned file in the active API-key namespace and clear its index.
     * @param connection - endpoint and API-key snapshot.
     * @param signal - request cancellation.
     * @returns number of deleted files.
     */
    releaseAll(connection: DeepSeekFileConnection, signal?: AbortSignal): Promise<number>;
}
export {};
//# sourceMappingURL=file-store.d.ts.map