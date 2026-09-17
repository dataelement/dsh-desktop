type CacheOptions = {
    ABI: string;
    arch: string;
    platform: string;
    debug: boolean;
    electronVersion: string;
    headerURL: string;
    modulePath: string;
};
export declare const cacheModuleState: (dir: string, cachePath: string, key: string) => Promise<void>;
type ApplyDiffFunction = (dir: string) => Promise<void>;
export declare const lookupModuleState: (cachePath: string, key: string) => Promise<ApplyDiffFunction | boolean>;
export declare function generateCacheKey(opts: CacheOptions): Promise<string>;
export {};
