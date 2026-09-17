"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.download = exports.downloadArtifact = exports.initializeProxy = exports.getHostArch = void 0;
const debug_1 = require("debug");
const fs = require("fs-extra");
const path = require("path");
const semver = require("semver");
const sumchecker = require("sumchecker");
const artifact_utils_1 = require("./artifact-utils");
const types_1 = require("./types");
const Cache_1 = require("./Cache");
const downloader_resolver_1 = require("./downloader-resolver");
const proxy_1 = require("./proxy");
const utils_1 = require("./utils");
var utils_2 = require("./utils");
Object.defineProperty(exports, "getHostArch", { enumerable: true, get: function () { return utils_2.getHostArch; } });
var proxy_2 = require("./proxy");
Object.defineProperty(exports, "initializeProxy", { enumerable: true, get: function () { return proxy_2.initializeProxy; } });
__exportStar(require("./types"), exports);
const d = (0, debug_1.default)('@electron/get:index');
if (process.env.ELECTRON_GET_USE_PROXY) {
    (0, proxy_1.initializeProxy)();
}
async function validateArtifact(artifactDetails, downloadedAssetPath, _downloadArtifact) {
    return await (0, utils_1.withTempDirectoryIn)(artifactDetails.tempDirectory, async (tempFolder) => {
        // Don't try to verify the hash of the hash file itself
        // and for older versions that don't have a SHASUMS256.txt
        if (!artifactDetails.artifactName.startsWith('SHASUMS256') &&
            !artifactDetails.unsafelyDisableChecksums &&
            semver.gte(artifactDetails.version, '1.3.2')) {
            let shasumPath;
            const checksums = artifactDetails.checksums;
            if (checksums) {
                shasumPath = path.resolve(tempFolder, 'SHASUMS256.txt');
                const fileNames = Object.keys(checksums);
                if (fileNames.length === 0) {
                    throw new Error('Provided "checksums" object is empty, cannot generate a valid SHASUMS256.txt');
                }
                const generatedChecksums = fileNames
                    .map(fileName => `${checksums[fileName]} *${fileName}`)
                    .join('\n');
                await fs.writeFile(shasumPath, generatedChecksums);
            }
            else {
                shasumPath = await _downloadArtifact({
                    isGeneric: true,
                    version: artifactDetails.version,
                    artifactName: 'SHASUMS256.txt',
                    force: false,
                    downloadOptions: artifactDetails.downloadOptions,
                    cacheRoot: artifactDetails.cacheRoot,
                    downloader: artifactDetails.downloader,
                    mirrorOptions: artifactDetails.mirrorOptions,
                    // Never use the cache for loading checksums, load
                    // them fresh every time
                    cacheMode: types_1.ElectronDownloadCacheMode.Bypass,
                });
            }
            try {
                // For versions 1.3.2 - 1.3.4, need to overwrite the `defaultTextEncoding` option:
                // https://github.com/electron/electron/pull/6676#discussion_r75332120
                if (semver.satisfies(artifactDetails.version, '1.3.2 - 1.3.4')) {
                    const validatorOptions = {};
                    validatorOptions.defaultTextEncoding = 'binary';
                    const checker = new sumchecker.ChecksumValidator('sha256', shasumPath, validatorOptions);
                    await checker.validate(path.dirname(downloadedAssetPath), path.basename(downloadedAssetPath));
                }
                else {
                    await sumchecker('sha256', shasumPath, path.dirname(downloadedAssetPath), [
                        path.basename(downloadedAssetPath),
                    ]);
                }
            }
            finally {
                // Once we're done make sure we clean up the shasum temp dir
                await fs.remove(path.dirname(shasumPath));
            }
        }
    }, (0, utils_1.doesCallerOwnTemporaryOutput)((0, utils_1.effectiveCacheMode)(artifactDetails))
        ? utils_1.TempDirCleanUpMode.ORPHAN
        : utils_1.TempDirCleanUpMode.CLEAN);
}
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
async function downloadArtifact(artifactDetails) {
    const details = Object.assign({}, artifactDetails);
    if (!artifactDetails.isGeneric) {
        const platformArtifactDetails = details;
        if (!platformArtifactDetails.platform) {
            d('No platform found, defaulting to the host platform');
            platformArtifactDetails.platform = process.platform;
        }
        if (platformArtifactDetails.arch) {
            platformArtifactDetails.arch = (0, utils_1.getNodeArch)(platformArtifactDetails.arch);
        }
        else {
            d('No arch found, defaulting to the host arch');
            platformArtifactDetails.arch = (0, utils_1.getHostArch)();
        }
    }
    (0, utils_1.ensureIsTruthyString)(details, 'version');
    details.version = (0, artifact_utils_1.getArtifactVersion)(details);
    const fileName = (0, artifact_utils_1.getArtifactFileName)(details);
    const url = await (0, artifact_utils_1.getArtifactRemoteURL)(details);
    const cache = new Cache_1.Cache(details.cacheRoot);
    const cacheMode = (0, utils_1.effectiveCacheMode)(details);
    // Do not check if the file exists in the cache when force === true
    if ((0, utils_1.shouldTryReadCache)(cacheMode)) {
        d(`Checking the cache (${details.cacheRoot}) for ${fileName} (${url})`);
        const cachedPath = await cache.getPathForFileInCache(url, fileName);
        if (cachedPath === null) {
            d('Cache miss');
        }
        else {
            d('Cache hit');
            let artifactPath = cachedPath;
            if ((0, utils_1.doesCallerOwnTemporaryOutput)(cacheMode)) {
                // Copy out of cache into temporary directory if readOnly cache so
                // that the caller can take ownership of the returned file
                const tempDir = await (0, utils_1.mkdtemp)(artifactDetails.tempDirectory);
                artifactPath = path.resolve(tempDir, fileName);
                await fs.copyFile(cachedPath, artifactPath);
            }
            try {
                await validateArtifact(details, artifactPath, downloadArtifact);
                return artifactPath;
            }
            catch (err) {
                if ((0, utils_1.doesCallerOwnTemporaryOutput)(cacheMode)) {
                    await fs.remove(path.dirname(artifactPath));
                }
                d("Artifact in cache didn't match checksums", err);
                d('falling back to re-download');
            }
        }
    }
    if (!details.isGeneric &&
        (0, utils_1.isOfficialLinuxIA32Download)(details.platform, details.arch, details.version, details.mirrorOptions)) {
        console.warn('Official Linux/ia32 support is deprecated.');
        console.warn('For more info: https://electronjs.org/blog/linux-32bit-support');
    }
    return await (0, utils_1.withTempDirectoryIn)(details.tempDirectory, async (tempFolder) => {
        const tempDownloadPath = path.resolve(tempFolder, (0, artifact_utils_1.getArtifactFileName)(details));
        const downloader = details.downloader || (await (0, downloader_resolver_1.getDownloaderForSystem)());
        d(`Downloading ${url} to ${tempDownloadPath} with options: ${JSON.stringify(details.downloadOptions)}`);
        await downloader.download(url, tempDownloadPath, details.downloadOptions);
        await validateArtifact(details, tempDownloadPath, downloadArtifact);
        if ((0, utils_1.doesCallerOwnTemporaryOutput)(cacheMode)) {
            return tempDownloadPath;
        }
        else {
            return await cache.putFileInCache(url, tempDownloadPath, fileName);
        }
    }, (0, utils_1.doesCallerOwnTemporaryOutput)(cacheMode) ? utils_1.TempDirCleanUpMode.ORPHAN : utils_1.TempDirCleanUpMode.CLEAN);
}
exports.downloadArtifact = downloadArtifact;
/**
 * Downloads the Electron binary for a specific version and returns an absolute path to a
 * ZIP file.
 *
 * @param version - The version of Electron you want to download (e.g. `31.0.0`)
 * @param options - Options to customize the download behavior
 * @returns An absolute path to the downloaded ZIP file
 * @category Download Electron
 */
function download(version, options) {
    return downloadArtifact(Object.assign(Object.assign({}, options), { version, platform: process.platform, arch: process.arch, artifactName: 'electron' }));
}
exports.download = download;
//# sourceMappingURL=index.js.map