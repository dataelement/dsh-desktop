export declare class Cache {
    private cacheRoot;
    constructor(cacheRoot?: string);
    static getCacheDirectory(downloadUrl: string): string;
    getCachePath(downloadUrl: string, fileName: string): string;
    getPathForFileInCache(url: string, fileName: string): Promise<string | null>;
    putFileInCache(url: string, currentPath: string, fileName: string): Promise<string>;
}
