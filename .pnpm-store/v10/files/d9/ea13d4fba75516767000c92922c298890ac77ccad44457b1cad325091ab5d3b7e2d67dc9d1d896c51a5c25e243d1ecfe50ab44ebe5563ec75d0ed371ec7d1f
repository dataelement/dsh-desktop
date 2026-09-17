export declare enum CacheState {
    pending = "pending",
    downloaded = "downloaded",
    extracting = "extracting",
    extracted = "extracted",
    complete = "complete",
    corrupted = "corrupted"
}
export interface CacheStateFile {
    version: number;
    state: CacheState;
    timestamp: number;
    fileCount: number;
    extractedSize: number;
}
export declare function readCacheStateFile(extractDir: string): Promise<CacheStateFile | null>;
export declare function writeCacheState(extractDir: string, state: CacheState, metadata?: {
    fileCount?: number;
    extractedSize?: number;
}, throwOnError?: boolean): Promise<void>;
export declare function computeCacheMetadata(dir: string): Promise<{
    fileCount: number;
    extractedSize: number;
}>;
export declare function validateCacheDirectory(extractDir: string, expectedFileCount?: number): Promise<boolean>;
export declare function cleanupCacheDirectory(extractDir: string, { skipLockFiles }?: {
    skipLockFiles?: boolean | undefined;
}): Promise<void>;
