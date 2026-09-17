/**
 * Error vocabulary for the storage hub and its backends.
 * @module @deepseek-ai/dsh-storage/src/error
 */
/** Discriminant codes carried by every {@link StorageError}. */
export type StorageErrorCode = 'backend-not-found' | 'form-not-mounted' | 'duplicate-backend' | 'duplicate-mount' | 'version-mismatch' | 'malformed-medium' | 'closed';
/**
 * Error thrown by the hub and by backend implementations. The `code` is the
 * stable contract consumers may switch on; `message` is diagnostic prose.
 */
export declare class StorageError extends Error {
    readonly code: StorageErrorCode;
    readonly name = "StorageError";
    /**
     * @param code - Stable discriminant for the failure class.
     * @param message - Human-readable diagnostic detail.
     * @param options - Standard error options (`cause`).
     */
    constructor(code: StorageErrorCode, message: string, options?: ErrorOptions);
}
//# sourceMappingURL=error.d.ts.map