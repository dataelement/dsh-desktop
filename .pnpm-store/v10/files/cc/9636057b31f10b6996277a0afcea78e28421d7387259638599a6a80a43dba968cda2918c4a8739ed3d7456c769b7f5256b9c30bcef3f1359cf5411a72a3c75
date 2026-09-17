import { ElectronPlatformArtifactDetails, MirrorOptions } from "@electron/get";
import { ElectronPlatformName } from "../electron/ElectronFramework";
export type ElectronGetOptions = Omit<ElectronPlatformArtifactDetails, "platform" | "arch" | "version" | "artifactName" | "artifactSuffix" | "customFilename" | "tempDirectory" | "downloader" | "cacheMode" | "cacheRoot" | "downloadOptions" | "isGeneric" | "mirrorOptions"> & {
    mirrorOptions?: Omit<MirrorOptions, "customDir" | "customFilename" | "customVersion">;
};
export type ArtifactDownloadOptions = {
    electronDownload?: ElectronGetOptions | ElectronDownloadOptions | null;
    artifactName: string;
    platformName: string;
    arch: string;
    version: string;
    cacheDir?: string;
};
export interface ElectronDownloadOptions {
    version?: string;
    /**
     * The [cache location](https://github.com/electron-userland/electron-download#cache-location).
     */
    cache?: string | null;
    /**
     * The mirror.
     */
    mirror?: string | null;
    /** @private */
    customDir?: string | null;
    /** @private */
    customFilename?: string | null;
    /** @private */
    strictSSL?: boolean;
    /** @private */
    isVerifyChecksum?: boolean;
    platform?: ElectronPlatformName;
    arch?: string;
}
export declare function getCacheDirectory(options: {
    isAvoidSystemOnWindows?: boolean;
    allowEnvVarOverride: boolean;
}): string;
export declare function extractArchive(file: string, dir: string): Promise<void>;
/**
 * Downloads a generic artifact (.tar.gz or .zip) from a GitHub release.
 * Used for electron-builder-binaries tools (appimage, etc.).
 */
export declare function downloadBuilderToolset(options: {
    releaseName: string;
    filenameWithExt: string;
    checksums?: Record<string, string>;
    githubOrgRepo?: string;
    overrideUrl?: string;
}): Promise<string>;
/**
 * Downloads the electron artifact zip via @electron/get (with caching) and returns the zip file path.
 * Use when you need to extract the zip yourself (e.g. directly to appOutDir to preserve empty dirs and symlinks).
 */
export declare function downloadElectronArtifactZip(options: ArtifactDownloadOptions): Promise<string>;
export declare function downloadElectronArtifact(options: ArtifactDownloadOptions): Promise<string>;
/**
 * Get the binaries mirror URL from environment variables.
 * Supports various npm config formats and falls back to GitHub.
 */
export declare function getBinariesMirrorUrl(githubOrgRepo: string): string;
