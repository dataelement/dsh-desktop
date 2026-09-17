export interface AppAdapter {
    readonly version: string;
    readonly name: string;
    readonly isPackaged: boolean;
    /**
     * Path to update metadata file.
     */
    readonly appUpdateConfigPath: string;
    /**
     * Path to user data directory.
     */
    readonly userDataPath: string;
    /**
     * Path to cache directory.
     */
    readonly baseCachePath: string;
    whenReady(): Promise<void>;
    relaunch(): void;
    quit(): void;
    onQuit(handler: (exitCode: number) => void): void;
}
export declare function getAppCacheDir(): string;
