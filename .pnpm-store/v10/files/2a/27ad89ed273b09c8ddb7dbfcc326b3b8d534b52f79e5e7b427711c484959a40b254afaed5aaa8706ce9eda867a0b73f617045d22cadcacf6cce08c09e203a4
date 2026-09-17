"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCache = clearCache;
const electronGet_1 = require("app-builder-lib/out/util/electronGet");
const builder_util_1 = require("builder-util");
const promises_1 = require("fs/promises");
const promises_2 = require("readline/promises");
const path = require("path");
async function clearCache() {
    const cacheDir = (0, electronGet_1.getCacheDirectory)({ isAvoidSystemOnWindows: false, allowEnvVarOverride: false });
    if (cacheDir === path.parse(cacheDir).root) {
        builder_util_1.log.error({ cacheDir }, "cache directory resolves to a filesystem root — aborting");
        return;
    }
    try {
        await (0, promises_1.access)(cacheDir, promises_1.constants.F_OK | promises_1.constants.W_OK);
    }
    catch (err) {
        if (err.code === "ENOENT") {
            builder_util_1.log.info({ cacheDir }, "cache directory does not exist, nothing to clear");
        }
        else if (err.code === "EACCES" || err.code === "EPERM") {
            builder_util_1.log.error({ cacheDir }, "cache directory is not writable");
        }
        else {
            throw err;
        }
        return;
    }
    const rl = (0, promises_2.createInterface)({ input: process.stdin, output: process.stdout });
    let answer;
    try {
        answer = await rl.question(`Clear cache at ${cacheDir}? [y/N] `);
    }
    finally {
        rl.close();
    }
    if (answer.trim().toLowerCase() !== "y" && answer.trim().toLowerCase() !== "yes") {
        builder_util_1.log.info(null, "aborted");
        return;
    }
    builder_util_1.log.info({ cacheDir }, "clearing cache");
    await (0, promises_1.rm)(cacheDir, { recursive: true });
    builder_util_1.log.info({ cacheDir }, "cache cleared");
}
//# sourceMappingURL=clear-cache.js.map