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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodRealError = exports.ZodError = void 0;
const core = __importStar(require("../core/index.cjs"));
const index_js_1 = require("../core/index.cjs");
const util = __importStar(require("../core/util.cjs"));
/* Prototypes that already carry the lazy helper methods. Seeded with the
 * intrinsics so that `init` on a foreign object — it accepts any object —
 * can never install an accessor onto a prototype we do not own. */
const _installedErrorProtos = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
/* Helper methods live as non-enumerable lazy getters on the shared
 * prototype instead of own properties on every instance. On first
 * access the getter allocates the per-instance closure and caches it
 * as a non-enumerable own property, so detached usage still works and
 * the allocation only happens for methods actually touched. */
function _lazyMethod(proto, key, make) {
    Object.defineProperty(proto, key, {
        configurable: true,
        enumerable: false,
        get() {
            const value = make(this);
            Object.defineProperty(this, key, { value, configurable: true, writable: true });
            return value;
        },
        set(value) {
            Object.defineProperty(this, key, { value, configurable: true, writable: true });
        },
    });
}
const initializer = (inst, issues) => {
    index_js_1.$ZodError.init(inst, issues);
    inst.name = "ZodError";
    const proto = Object.getPrototypeOf(inst);
    if (_installedErrorProtos.has(proto))
        return;
    _installedErrorProtos.add(proto);
    _lazyMethod(proto, "format", (self) => (mapper) => core.formatError(self, mapper));
    _lazyMethod(proto, "flatten", (self) => (mapper) => core.flattenError(self, mapper));
    _lazyMethod(proto, "addIssue", (self) => (issue) => {
        self.issues.push(issue);
        self.message = JSON.stringify(self.issues, util.jsonStringifyReplacer, 2);
    });
    _lazyMethod(proto, "addIssues", (self) => (issues) => {
        self.issues.push(...issues);
        self.message = JSON.stringify(self.issues, util.jsonStringifyReplacer, 2);
    });
    Object.defineProperty(proto, "isEmpty", {
        configurable: true,
        enumerable: false,
        get() {
            return this.issues.length === 0;
        },
    });
};
exports.ZodError = core.$constructor("ZodError", initializer);
exports.ZodRealError = core.$constructor("ZodError", initializer, undefined, {
    Parent: Error,
});
// /** @deprecated Use `z.core.$ZodErrorMapCtx` instead. */
// export type ErrorMapCtx = core.$ZodErrorMapCtx;

// seal-cjs-exports
(function () {
  var keys = Object.getOwnPropertyNames(exports);
  for (var i = 0; i < keys.length; i++) {
    var desc = Object.getOwnPropertyDescriptor(exports, keys[i]);
    if (!desc || !desc.get || !desc.configurable) continue;
    var value;
    try {
      value = desc.get();
    } catch (e) {
      continue;
    }
    // a circular require may not have settled this one yet, so leave it live
    if (value === undefined) continue;
    Object.defineProperty(exports, keys[i], { value: value, writable: false, enumerable: desc.enumerable, configurable: false });
  }
  Object.freeze(exports);
})();
