/** Durable DeepSeek attachment-to-file-id index. @module dsh-llm-deepseek/upload-index */
import type { AttachmentId, ImageVariantId as ImageVariantIdType } from '@deepseek-ai/dsh-attachment';
import type { DeepSeekFileId as DeepSeekFileIdType, DeepSeekFileScope as DeepSeekFileScopeType } from './file-id.ts';
/** One durable remote upload mapping. Unix times are milliseconds. */
export interface DeepSeekUploadRecord {
    scope: DeepSeekFileScopeType;
    /** Provider-independent normalized attachment from which the uploaded request version was derived. */
    attachmentId: AttachmentId;
    /** Complete request transformation identity, including route budgets and encoder parameters. */
    variantId: ImageVariantIdType;
    fileId: DeepSeekFileIdType;
    bytes: number;
    createdAt: number;
    expiresAt: number;
}
/** Candidate commit outcome when another process already published a reusable upload. */
export interface UploadIndexCommit {
    record: DeepSeekUploadRecord;
    accepted: boolean;
}
/**
 * Derive a non-secret stable index namespace without persisting or logging the API key.
 * @param baseURL - normalized provider endpoint namespace.
 * @param apiKey - resolved credential used only as hash input.
 * @returns branded SHA-256 namespace digest.
 */
export declare function deepSeekFileScope(baseURL: string, apiKey: string): DeepSeekFileScopeType;
/** Atomic local index shared by every DeepSeek session in this DSH home. */
export declare class DeepSeekUploadIndex {
    /** Absolute owner-private JSON index path. */
    readonly path: string;
    /**
     * @param path - explicit test path; omission uses `DSH_HOME/llm-deepseek/files-v3.json`.
     */
    constructor(path?: string);
    private load;
    private save;
    /**
     * Read one reusable mapping.
     * @param scope - endpoint/API-key namespace.
     * @param variantId - complete request-image transformation identity.
     * @param now - current Unix time in milliseconds.
     * @param refreshMarginMs - remaining lifetime below which a mapping is not reused.
     * @returns the mapping when it has enough lifetime remaining.
     */
    get(scope: DeepSeekFileScopeType, variantId: ImageVariantIdType, now: number, refreshMarginMs: number): Promise<DeepSeekUploadRecord | undefined>;
    /**
     * Publish a completed upload unless another process already published a reusable mapping.
     * @param candidate - completed remote upload.
     * @param now - current Unix time in milliseconds.
     * @param refreshMarginMs - minimum reusable remaining lifetime.
     * @returns the winning record and whether the candidate entered the index.
     */
    commit(candidate: DeepSeekUploadRecord, now: number, refreshMarginMs: number): Promise<UploadIndexCommit>;
    /**
     * Remove one exact mapping without deleting a concurrently installed successor.
     * @param scope - endpoint/API-key namespace.
     * @param variantId - complete request-image transformation identity.
     * @param fileId - exact remote generation being invalidated.
     */
    remove(scope: DeepSeekFileScopeType, variantId: ImageVariantIdType, fileId: DeepSeekFileIdType): Promise<void>;
    /**
     * Remove every local mapping for one remote namespace.
     * @param scope - endpoint/API-key namespace.
     */
    clear(scope: DeepSeekFileScopeType): Promise<void>;
}
//# sourceMappingURL=upload-index.d.ts.map