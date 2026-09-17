import childProcess from 'node:child_process';
import fs from 'graceful-fs';
import os from 'node:os';
import path from 'node:path';
import semver from 'semver';
import { ElectronDownloadCacheMode, } from './types.js';
async function useAndRemoveDirectory(directory, fn) {
    let result;
    try {
        result = await fn(directory);
    }
    finally {
        await fs.promises.rm(directory, { recursive: true, force: true });
    }
    return result;
}
export async function mkdtemp(parentDirectory = os.tmpdir()) {
    const tempDirectoryPrefix = 'electron-download-';
    return await fs.promises.mkdtemp(path.resolve(parentDirectory, tempDirectoryPrefix));
}
export var TempDirCleanUpMode;
(function (TempDirCleanUpMode) {
    TempDirCleanUpMode[TempDirCleanUpMode["CLEAN"] = 0] = "CLEAN";
    TempDirCleanUpMode[TempDirCleanUpMode["ORPHAN"] = 1] = "ORPHAN";
})(TempDirCleanUpMode || (TempDirCleanUpMode = {}));
export async function withTempDirectoryIn(parentDirectory = os.tmpdir(), fn, cleanUp) {
    const tempDirectory = await mkdtemp(parentDirectory);
    if (cleanUp === TempDirCleanUpMode.CLEAN) {
        return useAndRemoveDirectory(tempDirectory, fn);
    }
    else {
        return fn(tempDirectory);
    }
}
export async function withTempDirectory(fn, cleanUp) {
    return withTempDirectoryIn(undefined, fn, cleanUp);
}
export function normalizeVersion(version) {
    if (!version.startsWith('v')) {
        return `v${version}`;
    }
    return version;
}
/**
 * Runs the `uname` command and returns the trimmed output.
 */
export function uname() {
    return childProcess.execSync('uname -m').toString().trim();
}
/**
 * Generates an architecture name that would be used in an Electron or Node.js
 * download file name.
 */
export function getNodeArch(arch) {
    if (arch === 'arm') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        switch (process.config.variables.arm_version) {
            case '6':
                return uname();
            case '7':
            default:
                return 'armv7l';
        }
    }
    return arch;
}
/**
 * Generates an architecture name that would be used in an Electron or Node.js
 * download file name from the `process` module information.
 *
 * @category Utility
 */
export function getHostArch() {
    return getNodeArch(process.arch);
}
export function ensureIsTruthyString(obj, key) {
    if (!obj[key] || typeof obj[key] !== 'string') {
        throw new Error(`Expected property "${String(key)}" to be provided as a string but it was not`);
    }
}
export function isOfficialLinuxIA32Download(platform, arch, version, mirrorOptions) {
    return (platform === 'linux' &&
        arch === 'ia32' &&
        Number(version.slice(1).split('.')[0]) >= 4 &&
        typeof mirrorOptions === 'undefined');
}
// Electron 44 dropped support for 32-bit Windows (win32/ia32) and for
// armv7l Linux. The last official releases to ship these artifacts are
// v44.0.0-alpha.3 on the release channel and v45.0.0-nightly.20260713 on
// the nightly channel.
const FIRST_RELEASE_WITHOUT_32_BIT_SUPPORT = '44.0.0-alpha.4';
const FIRST_NIGHTLY_WITHOUT_32_BIT_SUPPORT = '45.0.0-nightly.20260714';
export function isOfficialDropped32BitDownload(platform, arch, version, mirrorOptions) {
    // Custom mirrors may legitimately host their own builds for these platforms
    if (typeof mirrorOptions !== 'undefined') {
        return false;
    }
    if (!((platform === 'win32' && arch === 'ia32') || (platform === 'linux' && arch === 'armv7l'))) {
        return false;
    }
    const parsedVersion = semver.parse(version);
    if (parsedVersion === null) {
        return false;
    }
    const firstVersionWithoutArtifacts = parsedVersion.prerelease.includes('nightly')
        ? FIRST_NIGHTLY_WITHOUT_32_BIT_SUPPORT
        : FIRST_RELEASE_WITHOUT_32_BIT_SUPPORT;
    return semver.gte(parsedVersion, firstVersionWithoutArtifacts);
}
/**
 * Find the value of a environment variable which may or may not have the
 * prefix, in a case-insensitive manner.
 */
export function getEnv(prefix = '') {
    const envsLowerCase = {};
    for (const envKey in process.env) {
        envsLowerCase[envKey.toLowerCase()] = process.env[envKey];
    }
    return (name) => {
        return (envsLowerCase[`${prefix}${name}`.toLowerCase()] ||
            envsLowerCase[name.toLowerCase()] ||
            undefined);
    };
}
export function setEnv(key, value) {
    // The `void` operator always returns `undefined`.
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void
    if (value !== void 0) {
        process.env[key] = value;
    }
}
export function effectiveCacheMode(artifactDetails) {
    return artifactDetails.cacheMode || ElectronDownloadCacheMode.ReadWrite;
}
export function shouldTryReadCache(cacheMode) {
    return (cacheMode === ElectronDownloadCacheMode.ReadOnly ||
        cacheMode === ElectronDownloadCacheMode.ReadWrite);
}
export function shouldWriteCache(cacheMode) {
    return (cacheMode === ElectronDownloadCacheMode.WriteOnly ||
        cacheMode === ElectronDownloadCacheMode.ReadWrite);
}
export function doesCallerOwnTemporaryOutput(cacheMode) {
    return (cacheMode === ElectronDownloadCacheMode.Bypass ||
        cacheMode === ElectronDownloadCacheMode.ReadOnly);
}
//# sourceMappingURL=utils.js.map