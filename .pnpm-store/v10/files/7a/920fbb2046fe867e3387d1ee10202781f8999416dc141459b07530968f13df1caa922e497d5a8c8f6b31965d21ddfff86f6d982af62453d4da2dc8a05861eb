"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveModule = resolveModule;
exports.resolveFunction = resolveFunction;
const builder_util_1 = require("builder-util");
const log_1 = require("builder-util/out/log");
const debug_1 = require("debug");
const promises_1 = require("fs/promises");
const path = require("path");
const requireMaybe = require("../../helpers/dynamic-import");
async function resolveModule(type, name) {
    var _a;
    try {
        return requireMaybe.dynamicImportMaybe(name);
    }
    catch (error) {
        log_1.log.error({ moduleName: name, message: (_a = error.message) !== null && _a !== void 0 ? _a : error.stack }, "Unable to dynamically `import` or `require`");
        throw error;
    }
}
async function resolveFunction(type, executor, name, rootSearchDir) {
    if (executor == null || typeof executor !== "string") {
        // is already function or explicitly ignored by user
        return executor;
    }
    let p = executor;
    if (p.startsWith(".")) {
        p = path.resolve(p);
        let realP = p;
        let realRoot = rootSearchDir;
        try {
            realP = await (0, promises_1.realpath)(p);
            realRoot = await (0, promises_1.realpath)(rootSearchDir);
        }
        catch {
            // path may not exist yet; fall back to lexical check
        }
        const relative = path.relative(realRoot, realP);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new builder_util_1.InvalidConfigurationError(`Hook module path "${executor}" resolves outside the workspace root ("${rootSearchDir}")`);
        }
    }
    try {
        p = require.resolve(p);
    }
    catch (e) {
        (0, debug_1.default)(e);
        p = path.resolve(p);
    }
    const m = await resolveModule(type, p);
    const namedExport = m[name];
    if (namedExport == null) {
        return m.default || m;
    }
    else {
        return namedExport;
    }
}
//# sourceMappingURL=resolve.js.map