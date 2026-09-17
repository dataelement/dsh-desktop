import { ElectronDownloadRequestOptions, ElectronGenericArtifactDetails, ElectronPlatformArtifactDetailsWithDefaults } from './types';
export { getHostArch } from './utils';
export { initializeProxy } from './proxy';
export * from './types';
/**
 * Downloads an artifact from an Electron release and returns an absolute path
 * to the downloaded file.
 *
 * Each release of Electron comes with artifacts, many of which are
 * platform/arch-specific (e.g. `ffmpeg-v31.0.0-darwin-arm64.zip`) and others that
 * are generic (e.g. `SHASUMS256.txt`).
 *
 *
 * @param artifactDetails - The information required to download the artifact
 * @category Download Artifact
 */
export declare function downloadArtifact(artifactDetails: ElectronPlatformArtifactDetailsWithDefaults | ElectronGenericArtifactDetails): Promise<string>;
/**
 * Downloads the Electron binary for a specific version and returns an absolute path to a
 * ZIP file.
 *
 * @param version - The version of Electron you want to download (e.g. `31.0.0`)
 * @param options - Options to customize the download behavior
 * @returns An absolute path to the downloaded ZIP file
 * @category Download Electron
 */
export declare function download(version: string, options?: ElectronDownloadRequestOptions): Promise<string>;
