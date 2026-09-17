"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEnv = computeEnv;
exports.computeToolEnv = computeToolEnv;
const builder_util_1 = require("builder-util");
function computeEnv(oldValue, newValues) {
    const parsedOldValue = oldValue ? oldValue.split(":") : [];
    return newValues
        .concat(parsedOldValue)
        .filter(it => it.length > 0)
        .join(":");
}
function computeToolEnv(libPath) {
    // noinspection SpellCheckingInspection
    return {
        ...(0, builder_util_1.stripSensitiveEnvVars)(process.env),
        DYLD_LIBRARY_PATH: computeEnv(process.env.DYLD_LIBRARY_PATH, libPath),
    };
}
//# sourceMappingURL=bundledTool.js.map