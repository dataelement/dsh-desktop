import { Downloader } from './Downloader';
import { GotDownloader, GotDownloaderOptions } from './GotDownloader';
export { Downloader, GotDownloader, GotDownloaderOptions };
/**
 * Custom downloaders can implement any set of options.
 * @category Downloader
 */
export type DownloadOptions = any;
/**
 * Options for specifying an alternative download mirror for Electron.
 *
 * @category Utility
 * @example
 *
 * To download the Electron v4.0.4 release for x64 Linux from
 * https://github.com/electron/electron/releases/download/v4.0.4/electron-v4.0.4-linux-x64.zip
 *
 * ```js
 * const opts = {
 *  mirror: 'https://github.com/electron/electron/releases/download',
 *  customDir: 'v4.0.4',
 *  customFilename: 'electron-v4.0.4-linux-x64.zip',
 * }
 * ```
 */
export interface MirrorOptions {
    /**
     * @deprecated
     * @see {@link MirrorOptions.nightlyMirror}
     */
    nightly_mirror?: string;
    /**
     * The mirror URL for [`electron-nightly`](https://npmjs.com/package/electron-nightly),
     * which lives in a separate npm package.
     */
    nightlyMirror?: string;
    /**
     * The base URL of the mirror to download from.
     * e.g https://github.com/electron/electron/releases/download
     */
    mirror?: string;
    /**
     * The name of the directory to download from,
     * often scoped by version number e.g 'v4.0.4'
     */
    customDir?: string;
    /**
     * The name of the asset to download,
     * e.g 'electron-v4.0.4-linux-x64.zip'
     */
    customFilename?: string;
    /**
     * The version of the asset to download,
     * e.g '4.0.4'
     */
    customVersion?: string;
    /**
     * A function allowing customization of the url returned
     * from getArtifactRemoteURL().
     */
    resolveAssetURL?: (opts: DownloadOptions) => Promise<string>;
}
/**
 * @category Download Artifact
 * @internal
 */
export interface ElectronDownloadRequest {
    /**
     * The version of Electron associated with the artifact.
     */
    version: string;
    /**
     * The type of artifact. For example:
     * * `electron`
     * * `ffmpeg`
     */
    artifactName: string;
}
export declare enum ElectronDownloadCacheMode {
    /**
     * Reads from the cache if present
     * Writes to the cache after fetch if not present
     */
    ReadWrite = 0,
    /**
     * Reads from the cache if present
     * Will **not** write back to the cache after fetching missing artifact
     */
    ReadOnly = 1,
    /**
     * Skips reading from the cache
     * Will write back into the cache, overwriting anything currently in the cache after fetch
     */
    WriteOnly = 2,
    /**
     * Bypasses the cache completely, neither reads from nor writes to the cache
     */
    Bypass = 3
}
/**
 * @category Download Electron
 */
export interface ElectronDownloadRequestOptions {
    /**
     * Whether to download an artifact regardless of whether it's in the cache directory.
     *
     * @defaultValue `false`
     * @deprecated This option is deprecated and directly maps to {@link cacheMode | `cacheMode: ElectronDownloadCacheMode.WriteOnly`}
     */
    force?: boolean;
    /**
     * When set to `true`, disables checking that the artifact download completed successfully
     * with the correct payload.
     *
     * @defaultValue `false`
     */
    unsafelyDisableChecksums?: boolean;
    /**
     * Provides checksums for the artifact as strings.
     * Can be used if you already know the checksums of the Electron artifact
     * you are downloading and want to skip the checksum file download
     * without skipping the checksum validation.
     *
     * This should be an object whose keys are the file names of the artifacts and
     * the values are their respective SHA256 checksums.
     *
     * @example
     * ```json
     * {
     *   "electron-v4.0.4-linux-x64.zip": "877617029f4c0f2b24f3805a1c3554ba166fda65c4e88df9480ae7b6ffa26a22"
     * }
     * ```
     */
    checksums?: Record<string, string>;
    /**
     * The directory that caches Electron artifact downloads.
     *
     * @defaultValue The default value is dependent upon the host platform:
     *
     * * Linux: `$XDG_CACHE_HOME` or `~/.cache/electron/`
     * * MacOS: `~/Library/Caches/electron/`
     * * Windows: `%LOCALAPPDATA%/electron/Cache` or `~/AppData/Local/electron/Cache/`
     */
    cacheRoot?: string;
    /**
     * Options passed to the downloader module.
     *
     * @see {@link GotDownloaderOptions} for options for the default {@link GotDownloader}.
     */
    downloadOptions?: DownloadOptions;
    /**
     * Options related to specifying an artifact mirror.
     */
    mirrorOptions?: MirrorOptions;
    /**
     * A custom {@link Downloader} class used to download artifacts. Defaults to the
     * built-in {@link GotDownloader}.
     */
    downloader?: Downloader<DownloadOptions>;
    /**
     * A temporary directory for downloads.
     * It is used before artifacts are put into cache.
     *
     * @defaultValue the OS default temporary directory via [`os.tmpdir()`](https://nodejs.org/api/os.html#ostmpdir)
     */
    tempDirectory?: string;
    /**
     * Controls the cache read and write behavior.
     *
     * When set to either {@link ElectronDownloadCacheMode.ReadOnly | ReadOnly} or
     * {@link ElectronDownloadCacheMode.Bypass | Bypass}, the caller is responsible
     * for cleaning up the returned file path once they are done using it
     * (e.g. via `fs.remove(path.dirname(pathFromElectronGet))`).
     *
     * When set to either {@link ElectronDownloadCacheMode.WriteOnly | WriteOnly} or
     * {@link ElectronDownloadCacheMode.ReadWrite | ReadWrite} (the default), the caller
     * should not move or delete the file path that is returned as the path
     * points directly to the disk cache.
     *
     * This option cannot be used in conjunction with {@link ElectronDownloadRequestOptions.force}.
     *
     * @defaultValue {@link ElectronDownloadCacheMode.ReadWrite}
     */
    cacheMode?: ElectronDownloadCacheMode;
}
/**
 * @category Download Artifact
 * @internal
 */
export type ElectronPlatformArtifactDetails = {
    /**
     * The target artifact platform. These are Node-style platform names, for example:
     * * `win32`
     * * `darwin`
     * * `linux`
     *
     * @see Node.js {@link https://nodejs.org/api/process.html#processplatform | process.platform} docs
     */
    platform: string;
    /**
     * The target artifact architecture. These are Node-style architecture names, for example:
     * * `ia32`
     * * `x64`
     * * `armv7l`
     *
     * @see Node.js {@link https://nodejs.org/api/process.html#processarch | process.arch} docs
     */
    arch: string;
    artifactSuffix?: string;
    isGeneric?: false;
} & ElectronDownloadRequest & ElectronDownloadRequestOptions;
/**
 * Options to download a generic (i.e. platform and architecture-agnostic)
 * Electron artifact. Contains all options from {@link ElectronDownloadRequestOptions},
 * but specifies a `version` and `artifactName` for the artifact to download.
 *
 * @category Download Artifact
 * @interface
 */
export type ElectronGenericArtifactDetails = {
    isGeneric: true;
} & ElectronDownloadRequest & ElectronDownloadRequestOptions;
/**
 * @category Download Artifact
 * @internal
 */
export type ElectronArtifactDetails = ElectronPlatformArtifactDetails | ElectronGenericArtifactDetails;
/**
 * Options to download a platform and architecture-specific Electron artifact.
 * Contains all options from {@link ElectronDownloadRequestOptions}, but
 * specifies a `version` and `artifactName` for the artifact to download.
 *
 * If `platform` and `arch` are omitted, they will be inferred using the host
 * system platform and architecture.
 *
 * @category Download Artifact
 * @interface
 */
export type ElectronPlatformArtifactDetailsWithDefaults = Omit<ElectronPlatformArtifactDetails, 'platform' | 'arch'> & {
    /**
     * The target artifact platform. These are Node-style platform names, for example:
     * * `win32`
     * * `darwin`
     * * `linux`
     *
     * @see Node.js {@link https://nodejs.org/api/process.html#processplatform | process.platform} docs
     */
    platform?: string;
    /**
     * The target artifact architecture. These are Node-style architecture names, for example:
     * * `ia32`
     * * `x64`
     * * `armv7l`
     *
     * @see Node.js {@link https://nodejs.org/api/process.html#processarch | process.arch} docs
     */
    arch?: string;
};
