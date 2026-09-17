export declare function getTempName(prefix?: string | null | undefined): string;
export interface GetTempFileOptions {
    prefix?: string | null;
    suffix?: string | null;
    disposer?: ((file: string) => Promise<void>) | null;
}
export declare class TmpDir {
    private readonly debugName;
    private tempFiles;
    private registered;
    constructor(debugName?: string);
    get rootTempDir(): Promise<string>;
    getTempDir(options?: GetTempFileOptions): Promise<string>;
    createTempDir(options?: GetTempFileOptions): Promise<string>;
    getTempFile(options?: GetTempFileOptions, isDir?: boolean): Promise<string>;
    cleanupSync(): void;
    cleanup(): Promise<any>;
    toString(): string;
}
