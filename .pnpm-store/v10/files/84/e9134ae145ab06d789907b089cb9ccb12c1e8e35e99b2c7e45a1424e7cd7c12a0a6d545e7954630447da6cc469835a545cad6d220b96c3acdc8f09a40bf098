"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheState = void 0;
exports.readCacheStateFile = readCacheStateFile;
exports.writeCacheState = writeCacheState;
exports.computeCacheMetadata = computeCacheMetadata;
exports.validateCacheDirectory = validateCacheDirectory;
exports.cleanupCacheDirectory = cleanupCacheDirectory;
const builder_util_1 = require("builder-util");
const fs = require("fs/promises");
const path = require("path");
var CacheState;
(function (CacheState) {
    CacheState["pending"] = "pending";
    CacheState["downloaded"] = "downloaded";
    CacheState["extracting"] = "extracting";
    CacheState["extracted"] = "extracted";
    CacheState["complete"] = "complete";
    CacheState["corrupted"] = "corrupted";
})(CacheState || (exports.CacheState = CacheState = {}));
const STATE_FILE_VERSION = 1;
const STALE_EXTRACTING_TIMEOUT_MS = 120000; // 120 seconds
function getStateFilePath(extractDir) {
    return `${extractDir}.state`;
}
async function readCacheStateFile(extractDir) {
    const stateFile = getStateFilePath(extractDir);
    let content;
    try {
        content = await fs.readFile(stateFile, "utf-8");
    }
    catch (e) {
        if (e.code !== "ENOENT") {
            builder_util_1.log.warn({ stateFile, error: e.message }, "Failed to read cache state file");
        }
        return null;
    }
    try {
        const data = JSON.parse(content);
        if (data.version !== STATE_FILE_VERSION) {
            builder_util_1.log.warn({ stateFile, version: data.version, expected: STATE_FILE_VERSION }, "Cache state file version mismatch, ignoring");
            return null;
        }
        if (data.state === CacheState.extracting) {
            const age = Date.now() - data.timestamp;
            if (age > STALE_EXTRACTING_TIMEOUT_MS) {
                builder_util_1.log.warn({ stateFile, age }, "Detected stale extracting state, marking as corrupted");
                return { ...data, state: CacheState.corrupted };
            }
        }
        return data;
    }
    catch (e) {
        builder_util_1.log.warn({ stateFile, error: e.message }, "Failed to parse cache state file");
        return null;
    }
}
async function writeCacheState(extractDir, state, metadata, throwOnError = false) {
    var _a, _b;
    const stateFile = getStateFilePath(extractDir);
    const stateData = {
        version: STATE_FILE_VERSION,
        state,
        timestamp: Date.now(),
        fileCount: (_a = metadata === null || metadata === void 0 ? void 0 : metadata.fileCount) !== null && _a !== void 0 ? _a : 0,
        extractedSize: (_b = metadata === null || metadata === void 0 ? void 0 : metadata.extractedSize) !== null && _b !== void 0 ? _b : 0,
    };
    try {
        await fs.writeFile(stateFile, JSON.stringify(stateData, null, 2), "utf-8");
    }
    catch (e) {
        builder_util_1.log.warn({ stateFile, error: e.message }, "Failed to write cache state file");
        if (throwOnError) {
            throw e;
        }
    }
}
async function computeCacheMetadata(dir) {
    let fileCount = 0;
    let extractedSize = 0;
    const stack = [dir];
    while (stack.length > 0) {
        const current = stack.pop();
        let entries;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
            }
            else {
                fileCount++;
                if (entry.isFile()) {
                    try {
                        const stat = await fs.stat(fullPath);
                        extractedSize += stat.size;
                    }
                    catch {
                        // ignore stat errors for individual files
                    }
                }
            }
        }
    }
    return { fileCount, extractedSize };
}
async function validateCacheDirectory(extractDir, expectedFileCount) {
    try {
        const topLevel = await fs.readdir(extractDir);
        if (topLevel.length === 0) {
            return false;
        }
        if (expectedFileCount != null && expectedFileCount > 0) {
            const { fileCount: actual } = await computeCacheMetadata(extractDir);
            if (actual < expectedFileCount) {
                builder_util_1.log.warn({ extractDir, expected: expectedFileCount, actual }, "Cache file count mismatch (fewer files than expected), treating as invalid");
                return false;
            }
        }
        return true;
    }
    catch (e) {
        builder_util_1.log.warn({ extractDir, error: e.message }, "Failed to validate cache directory");
        return false;
    }
}
async function cleanupCacheDirectory(extractDir, { skipLockFiles = false } = {}) {
    const filesToClean = [extractDir, `${extractDir}.state`, `${extractDir}.tmp`, ...(!skipLockFiles ? [`${extractDir}.lock`, `${extractDir}.tmp.lock`] : [])];
    for (const file of filesToClean) {
        try {
            await fs.rm(file, { recursive: true, force: true });
        }
        catch (e) {
            builder_util_1.log.warn({ file, error: e.message }, "Failed to clean up cache file");
        }
    }
}
//# sourceMappingURL=cacheState.js.map