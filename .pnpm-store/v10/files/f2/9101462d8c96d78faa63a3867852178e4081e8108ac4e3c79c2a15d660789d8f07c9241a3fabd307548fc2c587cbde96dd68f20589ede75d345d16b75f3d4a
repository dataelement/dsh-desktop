import type { Api, Model } from "./types.ts";
export interface ModelsStoreEntry {
    models: readonly Model<Api>[];
    /** Unix timestamp from the remote catalog's Last-Modified header. */
    lastModified?: number;
    /** Unix timestamp of the last completed remote check. */
    checkedAt?: number;
    /**
     * Opaque validator from the remote catalog's ETag header, stored verbatim
     * (quotes included) and echoed back as If-None-Match.
     */
    etag?: string;
}
export interface ModelsStoreOperationOptions {
    signal?: AbortSignal;
}
/** Persistent model catalogs keyed by provider ID. */
export interface ModelsStore {
    read(providerId: string, options?: ModelsStoreOperationOptions): Promise<ModelsStoreEntry | undefined>;
    write(providerId: string, entry: ModelsStoreEntry, options?: ModelsStoreOperationOptions): Promise<void>;
    delete(providerId: string, options?: ModelsStoreOperationOptions): Promise<void>;
}
export declare class InMemoryModelsStore implements ModelsStore {
    private readonly entries;
    read(providerId: string, options?: ModelsStoreOperationOptions): Promise<ModelsStoreEntry | undefined>;
    write(providerId: string, entry: ModelsStoreEntry, options?: ModelsStoreOperationOptions): Promise<void>;
    delete(providerId: string, options?: ModelsStoreOperationOptions): Promise<void>;
}
//# sourceMappingURL=models-store.d.ts.map