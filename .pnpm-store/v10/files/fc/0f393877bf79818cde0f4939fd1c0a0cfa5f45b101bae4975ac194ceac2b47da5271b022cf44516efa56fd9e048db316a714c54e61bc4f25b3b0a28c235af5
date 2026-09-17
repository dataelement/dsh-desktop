"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doesCallerOwnTemporaryOutput = exports.shouldWriteCache = exports.shouldTryReadCache = exports.effectiveCacheMode = exports.setEnv = exports.getEnv = exports.isOfficialLinuxIA32Download = exports.ensureIsTruthyString = exports.getHostArch = exports.getNodeArch = exports.uname = exports.normalizeVersion = exports.withTempDirectory = exports.withTempDirectoryIn = exports.TempDirCleanUpMode = exports.mkdtemp = void 0;
const childProcess = require("child_process");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const types_1 = require("./types");
async function useAndRemoveDirectory(directory, fn) {
    let result;
    try {
        result = await fn(directory);
    }
    finally {
        await fs.remove(directory);
    }
    return result;
}
async function mkdtemp(parentDirectory = os.tmpdir()) {
    const tempDirectoryPrefix = 'electron-download-';
    return await fs.mkdtemp(path.resolve(parentDirectory, tempDirectoryPrefix));
}
exports.mkdtemp = mkdtemp;
var TempDirCleanUpMode;
(function (TempDirCleanUpMode) {
    TempDirCleanUpMode[TempDirCleanUpMode["CLEAN"] = 0] = "CLEAN";
    TempDirCleanUpMode[TempDirCleanUpMode["ORPHAN"] = 1] = "ORPHAN";
})(TempDirCleanUpMode = exports.TempDirCleanUpMode || (exports.TempDirCleanUpMode = {}));
async function withTempDirectoryIn(parentDirectory = os.tmpdir(), fn, cleanUp) {
    const tempDirectory = await mkdtemp(parentDirectory);
    if (cleanUp === TempDirCleanUpMode.CLEAN) {
        return useAndRemoveDirectory(tempDirectory, fn);
    }
    else {
        return fn(tempDirectory);
    }
}
exports.withTempDirectoryIn = withTempDirectoryIn;
async function withTempDirectory(fn, cleanUp) {
    return withTempDirectoryIn(undefined, fn, cleanUp);
}
exports.withTempDirectory = withTempDirectory;
function normalizeVersion(version) {
    if (!version.startsWith('v')) {
        return `v${version}`;
    }
    return version;
}
exports.normalizeVersion = normalizeVersion;
/**
 * Runs the `uname` command and returns the trimmed output.
 */
function uname() {
    return childProcess
        .execSync('uname -m')
        .toString()
        .trim();
}
exports.uname = uname;
/**
 * Generates an architecture name that would be used in an Electron or Node.js
 * download file name.
 */
function getNodeArch(arch) {
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
exports.getNodeArch = getNodeArch;
/**
 * Generates an architecture name that would be used in an Electron or Node.js
 * download file name from the `process` module information.
 *
 * @category Utility
 */
function getHostArch() {
    return getNodeArch(process.arch);
}
exports.getHostArch = getHostArch;
function ensureIsTruthyString(obj, key) {
    if (!obj[key] || typeof obj[key] !== 'string') {
        throw new Error(`Expected property "${String(key)}" to be provided as a string but it was not`);
    }
}
exports.ensureIsTruthyString = ensureIsTruthyString;
function isOfficialLinuxIA32Download(platform, arch, version, mirrorOptions) {
    return (platform === 'linux' &&
        arch === 'ia32' &&
        Number(version.slice(1).split('.')[0]) >= 4 &&
        typeof mirrorOptions === 'undefined');
}
exports.isOfficialLinuxIA32Download = isOfficialLinuxIA32Download;
/**
 * Find the value of a environment variable which may or may not have the
 * prefix, in a case-insensitive manner.
 */
function getEnv(prefix = '') {
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
exports.getEnv = getEnv;
function setEnv(key, value) {
    // The `void` operator always returns `undefined`.
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void
    if (value !== void 0) {
        process.env[key] = value;
    }
}
exports.setEnv = setEnv;
function effectiveCacheMode(artifactDetails) {
    if (artifactDetails.force) {
        if (artifactDetails.cacheMode) {
            throw new Error('Setting both "force" and "cacheMode" is not supported, please exclusively use "cacheMode"');
        }
        return types_1.ElectronDownloadCacheMode.WriteOnly;
    }
    return artifactDetails.cacheMode || types_1.ElectronDownloadCacheMode.ReadWrite;
}
exports.effectiveCacheMode = effectiveCacheMode;
function shouldTryReadCache(cacheMode) {
    return (cacheMode === types_1.ElectronDownloadCacheMode.ReadOnly ||
        cacheMode === types_1.ElectronDownloadCacheMode.ReadWrite);
}
exports.shouldTryReadCache = shouldTryReadCache;
function shouldWriteCache(cacheMode) {
    return (cacheMode === types_1.ElectronDownloadCacheMode.WriteOnly ||
        cacheMode === types_1.ElectronDownloadCacheMode.ReadWrite);
}
exports.shouldWriteCache = shouldWriteCache;
function doesCallerOwnTemporaryOutput(cacheMode) {
    return (cacheMode === types_1.ElectronDownloadCacheMode.Bypass ||
        cacheMode === types_1.ElectronDownloadCacheMode.ReadOnly);
}
exports.doesCallerOwnTemporaryOutput = doesCallerOwnTemporaryOutput;
//# sourceMappingURL=utils.js.map