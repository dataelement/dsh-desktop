// Traversal pattern adapted from Jaen's v3 `mapOnSchema` (Apache-2.0): https://gist.github.com/jaens/7e15ae1984bb338c86eb5e452dee3010
import * as schemas from "./schemas.js";
import { clone } from "./util.js";
const RESOLVING = Symbol("z.visit/resolving");
export function visit(schema, fnOrHandlers) {
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
                return changed ? clone(s, { ...def, shape: newShape, catchall: newCatchall }) : s;
            }
            case "array": {
                const mapped = run(def.element);
                return mapped === def.element ? s : clone(s, { ...def, element: mapped });
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
                return changed ? clone(s, { ...def, items: newItems, rest: newRest }) : s;
            }
            case "record":
            case "map": {
                const newKey = run(def.keyType);
                const newVal = run(def.valueType);
                return newKey === def.keyType && newVal === def.valueType
                    ? s
                    : clone(s, { ...def, keyType: newKey, valueType: newVal });
            }
            case "set": {
                const newVal = run(def.valueType);
                return newVal === def.valueType ? s : clone(s, { ...def, valueType: newVal });
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
                return changed ? clone(s, { ...def, options: newOptions }) : s;
            }
            case "intersection": {
                const newLeft = run(def.left);
                const newRight = run(def.right);
                return newLeft === def.left && newRight === def.right
                    ? s
                    : clone(s, { ...def, left: newLeft, right: newRight });
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
                return newInner === def.innerType ? s : clone(s, { ...def, innerType: newInner });
            }
            case "pipe": {
                const newIn = run(def.in);
                const newOut = run(def.out);
                return newIn === def.in && newOut === def.out ? s : clone(s, { ...def, in: newIn, out: newOut });
            }
            case "function": {
                const newInput = run(def.input);
                const newOutput = run(def.output);
                return newInput === def.input && newOutput === def.output
                    ? s
                    : clone(s, { ...def, input: newInput, output: newOutput });
            }
            case "lazy": {
                // Invoking the getter here would trip the cycle check, so lazy nodes always re-clone.
                const original = def.getter;
                // Drop the memo, or it shadows the new getter forever.
                const { _cachedInner, ...rest } = def;
                return clone(s, { ...rest, getter: () => run(original()) });
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
