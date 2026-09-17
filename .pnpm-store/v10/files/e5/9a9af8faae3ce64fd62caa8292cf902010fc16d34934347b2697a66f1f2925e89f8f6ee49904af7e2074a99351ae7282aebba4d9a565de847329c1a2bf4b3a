"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicImport = dynamicImport;
// TypeScript's "module": "CommonJS" compiles `await import(x)` to
// `await Promise.resolve().then(() => require(x))`, which fails for ESM-only
// packages. helpers/dynamic-import.js is plain JS so TypeScript never
// transforms its native import() call — route through it instead.
const _helper = require("../../helpers/dynamic-import");
function dynamicImport(modulePath) {
    return _helper.dynamicImport(modulePath);
}
//# sourceMappingURL=dynamicImport.js.map