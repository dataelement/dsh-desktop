"use strict";
// Traversal pattern adapted from Jaen's v3 `mapOnSchema` (Apache-2.0): https://gist.github.com/jaens/7e15ae1984bb338c86eb5e452dee3010
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
exports.visit = visit;
const schemas = __importStar(require("./schemas.cjs"));
const util_js_1 = require("./util.cjs");
const RESOLVING = Symbol("z.visit/resolving");
function visit(schema, fnOrHandlers) {
    const fn = typeof fnOrHandlers === "function"
        ? fnOrHandlers
        : (node, rewritten) => {
            // A union of handlers isn't callable with one argument; handler `K` only ever sees kind `K`.
            const h = fnOrHandlers[node._zod.def.type];
            return h ? h(node, rewritten) : node;
        };
    const cache = new Map();
    function run(s) {
        const cached = cache.get(s);
        if (cached === RESOLVING) {
            // Non-lazy cycle. Defer to parse time, when the cache holds the finished node.
            return new schemas.$ZodLazy({
                type: "lazy",
                getter: () => cache.get(s),
            });
        }
        if (cached !== undefined)
            return cached;
        cache.set(s, RESOLVING);
        const inner = mapInner(s);
        const mapped = fn(inner, inner !== s);
        cache.set(s, mapped);
        return mapped;
    }
    function mapInner(s) {
        const def = s._zod.def;
        const kind = def.type;
        switch (kind) {
            case "object": {
                const oldShape = def.shape;
                const keys = Object.keys(oldShape);
                let changed = false;
                const newShape = {};
                for (const k of keys) {
                    const mapped = run(oldShape[k]);
                    if (mapped !== oldShape[k])
                        changed = true;
                    newShape[k] = mapped;
                }
                let newCatchall = def.catchall;
                if (def.catchall) {
                    newCatchall = run(def.catchall);
                    if (newCatchall !== def.catchall)
                        changed = true;
                }
                return changed ? (0, util_js_1.clone)(s, { ...def, shape: newShape, catchall: newCatchall }) : s;
            }
            case "array": {
                const mapped = run(def.element);
                return mapped === def.element ? s : (0, util_js_1.clone)(s, { ...def, element: mapped });
            }
            case "tuple": {
                const oldItems = def.items;
                let changed = false;
                const newItems = [];
                for (const item of oldItems) {
                    const mapped = run(item);
                    if (mapped !== item)
                        changed = true;
                    newItems.push(mapped);
                }
                let newRest = def.rest;
                if (def.rest) {
                    newRest = run(def.rest);
                    if (newRest !== def.rest)
                        changed = true;
                }
                return changed ? (0, util_js_1.clone)(s, { ...def, items: newItems, rest: newRest }) : s;
            }
            case "record":
            case "map": {
                const newKey = run(def.keyType);
                const newVal = run(def.valueType);
                return newKey === def.keyType && newVal === def.valueType
                    ? s
                    : (0, util_js_1.clone)(s, { ...def, keyType: newKey, valueType: newVal });
            }
            case "set": {
                const newVal = run(def.valueType);
                return newVal === def.valueType ? s : (0, util_js_1.clone)(s, { ...def, valueType: newVal });
            }
            case "union": {
                const oldOptions = def.options;
                let changed = false;
                const newOptions = [];
                for (const opt of oldOptions) {
                    const mapped = run(opt);
                    if (mapped !== opt)
                        changed = true;
                    newOptions.push(mapped);
                }
                return changed ? (0, util_js_1.clone)(s, { ...def, options: newOptions }) : s;
            }
            case "intersection": {
                const newLeft = run(def.left);
                const newRight = run(def.right);
                return newLeft === def.left && newRight === def.right
                    ? s
                    : (0, util_js_1.clone)(s, { ...def, left: newLeft, right: newRight });
            }
            case "optional":
            case "nullable":
            case "default":
            case "prefault":
            case "catch":
            case "readonly":
            case "nonoptional":
            case "promise":
            case "success": {
                const newInner = run(def.innerType);
                return newInner === def.innerType ? s : (0, util_js_1.clone)(s, { ...def, innerType: newInner });
            }
            case "pipe": {
                const newIn = run(def.in);
                const newOut = run(def.out);
                return newIn === def.in && newOut === def.out ? s : (0, util_js_1.clone)(s, { ...def, in: newIn, out: newOut });
            }
            case "function": {
                const newInput = run(def.input);
                const newOutput = run(def.output);
                return newInput === def.input && newOutput === def.output
                    ? s
                    : (0, util_js_1.clone)(s, { ...def, input: newInput, output: newOutput });
            }
            case "lazy": {
                // Invoking the getter here would trip the cycle check, so lazy nodes always re-clone.
                const original = def.getter;
                // Drop the memo, or it shadows the new getter forever.
                const { _cachedInner, ...rest } = def;
                return (0, util_js_1.clone)(s, { ...rest, getter: () => run(original()) });
            }
            // A leaf by choice: `parts` are regex fragments, not data positions.
            case "template_literal":
            // Leaves.
            case "string":
            case "number":
            case "int":
            case "boolean":
            case "bigint":
            case "symbol":
            case "undefined":
            case "null":
            case "void":
            case "never":
            case "any":
            case "unknown":
            case "date":
            case "nan":
            case "enum":
            case "literal":
            case "file":
            case "transform":
            case "custom":
                return s;
            default: {
                // A new built-in kind becomes a compile error here; unknown user kinds fall through.
                kind;
                return s;
            }
        }
    }
    return run(schema);
}

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
