import { ElectronDownloadCacheMode, ElectronGenericArtifactDetails, ElectronPlatformArtifactDetailsWithDefaults } from './types';
export declare function mkdtemp(parentDirectory?: string): Promise<string>;
export declare enum TempDirCleanUpMode {
    CLEAN = 0,
    ORPHAN = 1
}
export declare function withTempDirectoryIn<T>(parentDirectory: string | undefined, fn: (directory: string) => Promise<T>, cleanUp: TempDirCleanUpMode): Promise<T>;
export declare function withTempDirectory<T>(fn: (directory: string) => Promise<T>, cleanUp: TempDirCleanUpMode): Promise<T>;
export declare function normalizeVersion(version: string): string;
/**
 * Runs the `uname` command and returns the trimmed output.
 */
export declare function uname(): string;
/**
 * Generates an architecture name that would be used in an Electron or Node.js
 * download file name.
 */
export declare function getNodeArch(arch: string): string;
/**
 * Generates an architecture name that would be used in an Electron or Node.js
 * download file name from the `process` module information.
 *
 * @category Utility
 */
export declare function getHostArch(): string;
export declare function ensureIsTruthyString<T, K extends keyof T>(obj: T, key: K): void;
export declare function isOfficialLinuxIA32Download(platform: string, arch: string, version: string, mirrorOptions?: object): boolean;
/**
 * Find the value of a environment variable which may or may not have the
 * prefix, in a case-insensitive manner.
 */
export declare function getEnv(prefix?: string): (name: string) => string | undefined;
export declare function setEnv(key: string, value: string | undefined): void;
export declare function effectiveCacheMode(artifactDetails: ElectronPlatformArtifactDetailsWithDefaults | ElectronGenericArtifactDetails): ElectronDownloadCacheMode;
export declare function shouldTryReadCache(cacheMode: ElectronDownloadCacheMode): boolean;
export declare function shouldWriteCache(cacheMode: ElectronDownloadCacheMode): boolean;
export declare function doesCallerOwnTemporaryOutput(cacheMode: ElectronDownloadCacheMode): boolean;
