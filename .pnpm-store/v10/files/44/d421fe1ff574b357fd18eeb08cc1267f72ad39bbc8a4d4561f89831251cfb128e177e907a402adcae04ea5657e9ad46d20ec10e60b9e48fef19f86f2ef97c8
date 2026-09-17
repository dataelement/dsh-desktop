"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvValue = validateEnvValue;
exports.resolveEnvToolsetPath = resolveEnvToolsetPath;
const builder_util_1 = require("builder-util");
const path = require("path");
function validateEnvValue(envVarName) {
    const rawValue = process.env[envVarName];
    if ((0, builder_util_1.isEmptyOrSpaces)(rawValue)) {
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
function resolveEnvToolsetPath(envVarKey) {
    const value = validateEnvValue(envVarKey);
    if (value == null) {
        return null;
    }
    builder_util_1.log.info({ envVarKey, value }, `resolved value from environment variable`);
    return path.resolve(value);
}
//# sourceMappingURL=envPath.js.map