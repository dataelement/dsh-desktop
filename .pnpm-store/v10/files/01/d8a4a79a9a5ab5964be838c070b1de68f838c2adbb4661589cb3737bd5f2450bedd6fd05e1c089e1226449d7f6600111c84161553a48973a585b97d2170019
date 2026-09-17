"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveEnvShellValue = resolveEnvShellValue;
exports.resolveEnvToolsetPath = resolveEnvToolsetPath;
exports.parseValidEnvVarUrl = parseValidEnvVarUrl;
const path = require("path");
const stringUtil_1 = require("./stringUtil");
const log_1 = require("./log");
const fs_1 = require("./fs");
const promises_1 = require("fs/promises");
function resolveEnvShellValue(envVarName) {
    const rawValue = process.env[envVarName];
    if ((0, stringUtil_1.isEmptyOrSpaces)(rawValue)) {
        return null;
    }
    const trimmed = rawValue.trim();
    // On Windows, backslash is the native path separator and must not be rejected
    const shellUnsafeChars = process.platform === "win32" ? /[;&|`$<>"']/ : /[;&|`$<>"'\\]/;
    if (shellUnsafeChars.test(trimmed)) {
        throw new Error(`${envVarName} contains shell-unsafe characters: ${trimmed}`);
    }
    return trimmed;
}
async function resolveEnvToolsetPath(envVarKey, expectedType) {
    const value = resolveEnvShellValue(envVarKey);
    if (value == null) {
        return null;
    }
    if (!path.isAbsolute(value)) {
        throw new Error(`${envVarKey} must be an absolute path: ${value}`);
    }
    const p = path.resolve(value);
    if (!(await (0, fs_1.exists)(p))) {
        throw new Error(`${envVarKey} path does not exist: ${p}`);
    }
    const targetStat = await (0, promises_1.stat)(p);
    const targetType = targetStat.isDirectory() ? "directory" : targetStat.isFile() ? "file" : "unknown";
    if (targetType !== expectedType) {
        throw new Error(`${envVarKey} path must be a ${expectedType}, but got ${targetType}: ${p}`);
    }
    log_1.log.info({ [envVarKey]: p }, `resolved ${envVarKey} from environment variable`);
    return p;
}
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
function parseValidEnvVarUrl(envVarName, allowHttp = false) {
    var _a;
    const url = (_a = process.env[envVarName]) === null || _a === void 0 ? void 0 : _a.trim();
    if (url == null || url === "") {
        return null;
    }
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        throw new Error(`${envVarName} is not a valid URL: ${url}`);
    }
    if (parsed.protocol !== "https:") {
        // Always permit plain HTTP to loopback addresses (local dev / air-gapped CI mirrors
        // running on the build machine itself).  For any other host, require opt-in.
        const isLocalhost = parsed.protocol === "http:" && LOCALHOST_HOSTNAMES.has(parsed.hostname);
        if (!isLocalhost && !allowHttp) {
            throw new Error(`${envVarName} must use https:// (got ${parsed.protocol}). For non-localhost HTTP mirrors set ELECTRON_BUILDER_BINARIES_ALLOW_HTTP=true`);
        }
    }
    return url;
}
//# sourceMappingURL=envUtil.js.map