"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONSTANT_CATCH = exports.Class = exports.BIGINT_FORMAT_RANGES = exports.NUMBER_FORMAT_RANGES = exports.primitiveTypes = exports.propertyKeyTypes = exports.getParsedType = exports.allowsEval = exports.captureStackTrace = void 0;
exports.assertEqual = assertEqual;
exports.assertNotEqual = assertNotEqual;
exports.toZod = toZod;
exports.assertIs = assertIs;
exports.assertNever = assertNever;
exports.assert = assert;
exports.getEnumValues = getEnumValues;
exports.joinValues = joinValues;
exports.jsonStringifyReplacer = jsonStringifyReplacer;
exports.cached = cached;
exports.nullish = nullish;
exports.cleanRegex = cleanRegex;
exports.floatSafeRemainder = floatSafeRemainder;
exports.defineLazy = defineLazy;
exports.objectClone = objectClone;
exports.assignProp = assignProp;
exports.rawShape = rawShape;
exports.mergeDefs = mergeDefs;
exports.cloneDef = cloneDef;
exports.getElementAtPath = getElementAtPath;
exports.promiseAllObject = promiseAllObject;
exports.randomString = randomString;
exports.esc = esc;
exports.slugify = slugify;
exports.isObject = isObject;
exports.isPlainObject = isPlainObject;
exports.shallowClone = shallowClone;
exports.numKeys = numKeys;
exports.escapeRegex = escapeRegex;
exports.clone = clone;
exports.normalizeParams = normalizeParams;
exports.createTransparentProxy = createTransparentProxy;
exports.stringifyPrimitive = stringifyPrimitive;
exports.optionalKeys = optionalKeys;
exports.pick = pick;
exports.omit = omit;
exports.extend = extend;
exports.safeExtend = safeExtend;
exports.merge = merge;
exports.partial = partial;
exports.required = required;
exports.aborted = aborted;
exports.explicitlyAborted = explicitlyAborted;
exports.prefixIssues = prefixIssues;
exports.unwrapMessage = unwrapMessage;
exports.attachSchema = attachSchema;
exports.finalizeIssue = finalizeIssue;
exports.getSizableOrigin = getSizableOrigin;
exports.codePointLength = codePointLength;
exports.getLengthableOrigin = getLengthableOrigin;
exports.parsedType = parsedType;
exports.issue = issue;
exports.cleanEnum = cleanEnum;
exports.base64ToUint8Array = base64ToUint8Array;
exports.uint8ArrayToBase64 = uint8ArrayToBase64;
exports.base64urlToUint8Array = base64urlToUint8Array;
exports.uint8ArrayToBase64url = uint8ArrayToBase64url;
exports.hexToUint8Array = hexToUint8Array;
exports.uint8ArrayToHex = uint8ArrayToHex;
exports.members = members;
exports.own = own;
exports.hide = hide;
exports.derived = derived;
exports.defineLazyInternal = defineLazyInternal;
exports.installLazyProp = installLazyProp;
exports.constantCatch = constantCatch;
const core_js_1 = require("./core.cjs");
// functions
function assertEqual(val) {
    return val;
}
function assertNotEqual(val) {
    return val;
}
function toZod() {
    return (schema) => schema;
}
function assertIs(_arg) { }
function assertNever(_x) {
    throw new Error("Unexpected value in exhaustive check");
}
function assert(_) { }
function getEnumValues(entries) {
    const numericValues = Object.values(entries).filter((v) => typeof v === "number");
    const values = Object.entries(entries)
        .filter(([k, _]) => numericValues.indexOf(+k) === -1)
        .map(([_, v]) => v);
    return values;
}
function joinValues(array, separator = "|") {
    return array.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
    if (typeof value === "bigint")
        return value.toString();
    return value;
}
// the accessor lives on a shared prototype: an own accessor makes every box a dictionary-mode object (~360 B and a slow load per read against ~100 B and an inlined getter here)
class Cached {
    constructor(getter) {
        this._getter = getter;
        this._value = undefined;
    }
    get value() {
        const getter = this._getter;
        if (getter !== undefined) {
            this._value = getter();
            this._getter = undefined;
        }
        return this._value;
    }
}
function cached(getter) {
    return new Cached(getter);
}
function nullish(input) {
    return input === null || input === undefined;
}
function cleanRegex(source) {
    const start = source.startsWith("^") ? 1 : 0;
    const end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
    const ratio = val / step;
    const roundedRatio = Math.round(ratio);
    // `val` and `step` each round to a double before the division rounds again, so a true decimal multiple's quotient can sit up to 1.5 of these scaled epsilons from the integer. A 1x tolerance therefore rejected 2.03 as a multiple of 0.07; 4x covers the worst case with margin.
    const tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
    if (Math.abs(ratio - roundedRatio) < tolerance)
        return 0;
    return ratio - roundedRatio;
}
const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
function defineLazy(object, key, getter) {
    let value = undefined;
    Object.defineProperty(object, key, {
        get() {
            if (value === EVALUATING) {
                // Circular reference detected, return undefined to break the cycle
                return undefined;
            }
            if (value === undefined) {
                value = EVALUATING;
                value = getter();
            }
            return value;
        },
        set(v) {
            Object.defineProperty(object, key, {
                value: v,
                // configurable: true,
            });
            // object[key] = v;
        },
        configurable: true,
    });
}
function objectClone(obj) {
    return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
    });
}
/**
 * Whichever object a def's `shape` currently answers from: the one the caller passed until the first read, the frozen copy after it.
 *
 * Its keys and descriptors read without invoking anything, which is what lets a discriminated union check its discriminator, and the cycle walk read a shape, without resolving a getter that references the schema being constructed. A def that answers `shape` from an accessor of its own has none.
 */
function rawShape(def) {
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    return desc?.get ? desc.get.raw : desc?.value;
}
// where a builder reads its source's keys and descriptors, resolving only a shape a def answers for itself. A shape resolves by object spread, so only its enumerable keys are ever part of it.
function sourceShape(schema) {
    return rawShape(schema._zod.def) ?? schema._zod.def.shape;
}
// a key whose value is not settled yet, self-caching so every read after the first gets the same one
function deferProp(target, key, getter) {
    Object.defineProperty(target, key, {
        get() {
            const value = getter();
            assignProp(this, key, value);
            return value;
        },
        enumerable: true,
        configurable: true,
    });
}
// Writes a settled key. A plain assignment is much cheaper than `defineProperty` and produces the same descriptor, but it runs whatever setter already answers to the key — an accessor this shape deferred, or an inherited one, which `__proto__` has on every object and prototype pollution can add for any name.
function putProp(target, key, value) {
    if (key in target)
        assignProp(target, key, value);
    else
        target[key] = value;
}
/**
 * Copies `keys` of `source`'s shape onto `target`, each value passed through `wrap`.
 *
 * A key the source has resolved is copied through now, so the derived shape states it outright and nothing has to resolve it to learn what it holds. A key the source still defers stays deferred, and reads back through the source's own `shape`, so it resolves once and both shapes get that one schema.
 */
function mirrorShape(target, source, keys, wrap) {
    const raw = sourceShape(source);
    for (const key of keys) {
        const desc = Object.getOwnPropertyDescriptor(raw, key);
        if (!desc.enumerable)
            continue;
        if (desc.get) {
            deferProp(target, key, () => {
                const value = source._zod.def.shape[key];
                return wrap ? wrap(value, key) : value;
            });
        }
        else
            putProp(target, key, wrap ? wrap(desc.value, key) : desc.value);
    }
}
// same, for a plain shape a caller passed rather than a schema's
function mirrorProps(target, source) {
    for (const key of Reflect.ownKeys(source)) {
        const desc = Object.getOwnPropertyDescriptor(source, key);
        if (!desc.enumerable)
            continue;
        if (desc.get)
            deferProp(target, key, () => source[key]);
        else
            putProp(target, key, desc.value);
    }
}
function mergeDefs(...defs) {
    const mergedDescriptors = {};
    for (const def of defs) {
        const descriptors = Object.getOwnPropertyDescriptors(def);
        Object.assign(mergedDescriptors, descriptors);
    }
    return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
    return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path) {
    if (!path)
        return obj;
    return path.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
    const keys = Object.keys(promisesObj);
    const promises = keys.map((key) => promisesObj[key]);
    return Promise.all(promises).then((results) => {
        const resolvedObj = {};
        for (let i = 0; i < keys.length; i++) {
            resolvedObj[keys[i]] = results[i];
        }
        return resolvedObj;
    });
}
function randomString(length = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let str = "";
    for (let i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}
function esc(str) {
    return JSON.stringify(str);
}
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
exports.captureStackTrace = ("captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => { });
function isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
}
exports.allowsEval = cached(() => {
    // Skip the probe under `jitless`: strict CSPs report the caught `new Function` as a `securitypolicyviolation` even though the throw is swallowed.
    if (core_js_1.globalConfig.jitless) {
        return false;
    }
    // @ts-ignore
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
        return false;
    }
    try {
        const F = Function;
        new F("");
        return true;
    }
    catch (_) {
        return false;
    }
});
function isPlainObject(o) {
    if (isObject(o) === false)
        return false;
    // modified constructor
    const ctor = o.constructor;
    if (ctor === undefined)
        return true;
    if (typeof ctor !== "function")
        return true;
    // modified prototype
    const prot = ctor.prototype;
    if (isObject(prot) === false)
        return false;
    // ctor doesn't have static `isPrototypeOf`
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
        return false;
    }
    return true;
}
function shallowClone(o) {
    if (isPlainObject(o))
        return { ...o };
    if (Array.isArray(o))
        return [...o];
    if (o instanceof Map)
        return new Map(o);
    if (o instanceof Set)
        return new Set(o);
    return o;
}
function numKeys(data) {
    let keyCount = 0;
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            keyCount++;
        }
    }
    return keyCount;
}
const getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
        case "undefined":
            return "undefined";
        case "string":
            return "string";
        case "number":
            return Number.isNaN(data) ? "nan" : "number";
        case "boolean":
            return "boolean";
        case "function":
            return "function";
        case "bigint":
            return "bigint";
        case "symbol":
            return "symbol";
        case "object":
            if (Array.isArray(data)) {
                return "array";
            }
            if (data === null) {
                return "null";
            }
            if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
                return "promise";
            }
            if (typeof Map !== "undefined" && data instanceof Map) {
                return "map";
            }
            if (typeof Set !== "undefined" && data instanceof Set) {
                return "set";
            }
            if (typeof Date !== "undefined" && data instanceof Date) {
                return "date";
            }
            // @ts-ignore
            if (typeof File !== "undefined" && data instanceof File) {
                return "file";
            }
            return "object";
        default:
            throw new Error(`Unknown data type: ${t}`);
    }
};
exports.getParsedType = getParsedType;
exports.propertyKeyTypes = new Set(["string", "number", "symbol"]);
exports.primitiveTypes = new Set([
    "string",
    "number",
    "bigint",
    "boolean",
    "symbol",
    "undefined",
]);
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// zod-specific utils
function clone(inst, def, params) {
    const cl = new inst._zod.constr(def ?? inst._zod.def);
    if (!def || params?.parent)
        cl._zod.parent = inst;
    return cl;
}
function normalizeParams(_params) {
    const params = _params;
    if (!params)
        return {};
    if (typeof params === "string")
        return { error: () => params };
    if (params?.message !== undefined) {
        if (params?.error !== undefined)
            throw new Error("Cannot specify both `message` and `error` params");
        params.error = params.message;
    }
    delete params.message;
    if (typeof params.error === "string")
        return { ...params, error: () => params.error };
    return params;
}
function createTransparentProxy(getter) {
    let target;
    return new Proxy({}, {
        get(_, prop, receiver) {
            target ?? (target = getter());
            return Reflect.get(target, prop, receiver);
        },
        set(_, prop, value, receiver) {
            target ?? (target = getter());
            return Reflect.set(target, prop, value, receiver);
        },
        has(_, prop) {
            target ?? (target = getter());
            return Reflect.has(target, prop);
        },
        deleteProperty(_, prop) {
            target ?? (target = getter());
            return Reflect.deleteProperty(target, prop);
        },
        ownKeys(_) {
            target ?? (target = getter());
            return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(_, prop) {
            target ?? (target = getter());
            return Reflect.getOwnPropertyDescriptor(target, prop);
        },
        defineProperty(_, prop, descriptor) {
            target ?? (target = getter());
            return Reflect.defineProperty(target, prop, descriptor);
        },
    });
}
function stringifyPrimitive(value) {
    if (typeof value === "bigint")
        return value.toString() + "n";
    if (typeof value === "string")
        return `"${value}"`;
    return `${value}`;
}
function optionalKeys(shape) {
    return Object.keys(shape).filter((k) => {
        return shape[k]._zod.optin !== undefined && shape[k]._zod.optout === "optional";
    });
}
// Wrapped in a `@__PURE__` IIFE: esbuild never tree-shakes a top-level initializer that contains a member access on `Number`, so the bare object literal survived into every bundle.
exports.NUMBER_FORMAT_RANGES = (() => ({
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-3.4028234663852886e38, 3.4028234663852886e38],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
}))();
exports.BIGINT_FORMAT_RANGES = {
    int64: [/* @__PURE__*/ BigInt("-9223372036854775808"), /* @__PURE__*/ BigInt("9223372036854775807")],
    uint64: [/* @__PURE__*/ BigInt(0), /* @__PURE__*/ BigInt("18446744073709551615")],
};
function pick(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        throw new Error(".pick() cannot be used on object schemas containing refinements");
    }
    const newShape = {};
    mirrorShape(newShape, schema, maskedKeys(schema, mask));
    return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
}
// the mask keys that select something, checked against the source's shape without resolving it
function maskedKeys(schema, mask) {
    const raw = sourceShape(schema);
    const keys = [];
    // `for...in` skips symbols, so a symbol in the mask would select nothing
    for (const key of Reflect.ownKeys(mask)) {
        if (!Object.getOwnPropertyDescriptor(raw, key)?.enumerable) {
            throw new Error(`Unrecognized key: "${String(key)}"`);
        }
        if (mask[key])
            keys.push(key);
    }
    return keys;
}
function omit(schema, mask) {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        throw new Error(".omit() cannot be used on object schemas containing refinements");
    }
    const omitted = new Set(maskedKeys(schema, mask));
    const newShape = {};
    mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)).filter((key) => !omitted.has(key)));
    return clone(schema, mergeDefs(currDef, { shape: newShape, checks: [] }));
}
function extend(schema, shape) {
    if (!isPlainObject(shape)) {
        throw new Error("Invalid input to extend: expected a plain object");
    }
    const checks = schema._zod.def.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        // Only throw if new shape overlaps with existing shape. Use getOwnPropertyDescriptor to check key existence without accessing values
        const existingShape = sourceShape(schema);
        for (const key of Reflect.ownKeys(shape)) {
            if (Object.getOwnPropertyDescriptor(existingShape, key) !== undefined) {
                throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
            }
        }
    }
    return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
// the source's keys, then the caller's overlaid on top
function extended(schema, shape) {
    const newShape = {};
    mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)));
    mirrorProps(newShape, shape);
    return newShape;
}
function safeExtend(schema, shape) {
    if (!isPlainObject(shape)) {
        throw new Error("Invalid input to safeExtend: expected a plain object");
    }
    return clone(schema, mergeDefs(schema._zod.def, { shape: extended(schema, shape) }));
}
function merge(a, b) {
    if (!b?._zod?.def) {
        throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
    }
    if (a._zod.def.checks?.length) {
        throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
    }
    const newShape = {};
    mirrorShape(newShape, a, Reflect.ownKeys(sourceShape(a)));
    mirrorShape(newShape, b, Reflect.ownKeys(sourceShape(b)));
    const def = mergeDefs(a._zod.def, {
        shape: newShape,
        get catchall() {
            return b._zod.def.catchall;
        },
        checks: b._zod.def.checks ?? [],
    });
    return clone(a, def);
}
function partial(Class, schema, mask, name = "partial") {
    const currDef = schema._zod.def;
    const checks = currDef.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
        throw new Error(`.${name}() cannot be used on object schemas containing refinements`);
    }
    const selected = mask ? new Set(maskedKeys(schema, mask)) : undefined;
    const newShape = {};
    mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), Class &&
        ((value, key) => (selected && !selected.has(key) ? value : new Class({ type: "optional", innerType: value }))));
    return clone(schema, mergeDefs(schema._zod.def, { shape: newShape, checks: [] }));
}
function required(Class, schema, mask) {
    const selected = mask ? new Set(maskedKeys(schema, mask)) : undefined;
    const newShape = {};
    mirrorShape(newShape, schema, Reflect.ownKeys(sourceShape(schema)), (value, key) => 
    // overwrite with non-optional
    selected && !selected.has(key) ? value : new Class({ type: "nonoptional", innerType: value }));
    return clone(schema, mergeDefs(schema._zod.def, { shape: newShape }));
}
// invalid_type | too_big | too_small | invalid_format | not_multiple_of | unrecognized_keys | invalid_union | invalid_key | invalid_element | invalid_value | custom
function aborted(x, startIndex = 0) {
    if (x.aborted === true)
        return true;
    for (let i = startIndex; i < x.issues.length; i++) {
        if (x.issues[i]?.continue !== true) {
            return true;
        }
    }
    return false;
}
// Checks for explicit abort (continue === false), as opposed to implicit abort (continue === undefined). Used to respect `abort: true` in .refine() even for checks that have a `when` function.
function explicitlyAborted(x, startIndex = 0) {
    if (x.aborted === true)
        return true;
    for (let i = startIndex; i < x.issues.length; i++) {
        if (x.issues[i]?.continue === false) {
            return true;
        }
    }
    return false;
}
function prefixIssues(path, issues) {
    return issues.map((iss) => {
        var _a;
        (_a = iss).path ?? (_a.path = []);
        iss.path.unshift(path);
        return iss;
    });
}
function unwrapMessage(message) {
    return typeof message === "string" ? message : message?.message;
}
/* A check holds no link back to the schema it is attached to — the same check instance is shared by every clone of that schema — so the owner is stamped onto the issues a check just raised, at the only point where both are in scope. Runs on the failure path only; `start` is the issue count from before the check ran. */
function attachSchema(issues, start, inst) {
    var _a;
    for (let i = start; i < issues.length; i++) {
        (_a = issues[i]).schema ?? (_a.schema = inst);
    }
}
function finalizeIssue(iss, ctx, config) {
    var _a;
    // A schema that raised an issue itself owns it outright, and outranks any stamp an enclosing check left in `attachSchema`. String formats and z.custom() are schema and check at once, so when they act as a check they defer to that stamp instead.
    const traits = iss.inst?._zod?.traits;
    if (traits?.has("$ZodType")) {
        if (traits.has("$ZodCheck"))
            (_a = iss).schema ?? (_a.schema = iss.inst);
        else
            iss.schema = iss.inst;
    }
    // Decreasing specificity, first map to return a message wins. `inst` is whatever raised the issue, so a check's own map outranks the owning schema's.
    const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : undefined;
    const message = iss.message
        ? iss.message
        : (unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ??
            unwrapMessage(schemaError?.(iss)) ??
            unwrapMessage(ctx?.error?.(iss)) ??
            unwrapMessage(config.customError?.(iss)) ??
            unwrapMessage(config.localeError?.(iss)) ??
            "Invalid input");
    // an explicit own-key copy beats object rest with excluded keys, which v8 routes through a generic runtime call; Object.keys rather than for-in so an issue pushed with a prototype does not leak inherited keys, and an own __proto__ key is dropped rather than assigned through the setter
    const full = {};
    for (const k of Object.keys(iss)) {
        if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__")
            continue;
        full[k] = iss[k];
    }
    full.path ?? (full.path = []);
    full.message = message;
    if (ctx?.reportInput) {
        full.input = iss.input;
    }
    return full;
}
function getSizableOrigin(input) {
    if (input instanceof Set)
        return "set";
    if (input instanceof Map)
        return "map";
    // @ts-ignore
    if (input instanceof File)
        return "file";
    return "unknown";
}
const highSurrogate = /[\uD800-\uDBFF]/;
// Code points in `str`: a surrogate pair counts once, a lone surrogate as itself. Hand-rolled because the string iterator allocates and runs ~250x slower on this path; the regex probe exits ~50x quicker for a string with no astral characters.
function codePointLength(str) {
    const units = str.length;
    if (!highSurrogate.test(str))
        return units;
    let count = units;
    for (let i = 0; i < units - 1; i++) {
        if ((str.charCodeAt(i) & 0xfc00) === 0xd800 && (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
            count--;
            i++;
        }
    }
    return count;
}
function getLengthableOrigin(input) {
    if (Array.isArray(input))
        return "array";
    if (typeof input === "string")
        return "string";
    return "unknown";
}
function parsedType(data) {
    const t = typeof data;
    switch (t) {
        case "number": {
            return Number.isNaN(data) ? "nan" : "number";
        }
        case "object": {
            if (data === null) {
                return "null";
            }
            if (Array.isArray(data)) {
                return "array";
            }
            const obj = data;
            if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) {
                return obj.constructor.name;
            }
        }
    }
    return t;
}
function issue(...args) {
    const [iss, input, inst] = args;
    if (typeof iss === "string") {
        return {
            message: iss,
            code: "custom",
            input,
            inst,
        };
    }
    return { ...iss };
}
function cleanEnum(obj) {
    return Object.entries(obj)
        .filter(([k, _]) => {
        // return true if NaN, meaning it's not a number, thus a string key
        return Number.isNaN(Number.parseInt(k, 10));
    })
        .map((el) => el[1]);
}
// Codec utility functions
function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
function uint8ArrayToBase64(bytes) {
    let binaryString = "";
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
}
function base64urlToUint8Array(base64url) {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    return base64ToUint8Array(base64 + padding);
}
function uint8ArrayToBase64url(bytes) {
    return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex) {
    const cleanHex = hex.replace(/^0x/, "");
    if (cleanHex.length % 2 !== 0) {
        throw new Error("Invalid hex string length");
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
    }
    return bytes;
}
function uint8ArrayToHex(bytes) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
// instanceof
class Class {
    constructor(..._args) { }
}
exports.Class = Class;
//////////    PROTOTYPE INSTALLERS     //////////
//
// Members live on the prototype and materialize per instance on first read, which keeps own-property count under the step where V8 stops using inline slots. Changing anything here means re-measuring runtime, memory and bundle size together — see "The three axes" in AGENTS.md.
/**
 * Installs a trait's members on its prototype. Each value builds that member for the instance on first read; the built value shadows the accessor as an own property, so a detached `const { parse } = schema` keeps working.
 *
 * Call this from a `proto` initializer, which runs once per prototype — never per instance.
 */
function members(proto, table) {
    for (const key in table) {
        const desc = Object.getOwnPropertyDescriptor(table, key);
        // a getter installs as written, so it stays live: `description` reads through to the registry on every access. not enumerable: an object literal's is, and a prototype member never was
        if (desc.get)
            Object.defineProperty(proto, key, { ...desc, enumerable: false });
        // a method materializes bound on first read, which is what keeps a detached member working: `const opt = schema.optional; opt()`
        else
            defineBound(proto, key, desc.value);
    }
}
/** Shadows a prototype member with an own value, so a getter that builds from the instance runs once. */
function own(inst, key, value, enumerable = true) {
    Object.defineProperty(inst, key, { configurable: true, writable: true, enumerable, value });
    return value;
}
/** Like {@link own}, for a member that was never an own data property and has to stay out of `Object.keys`. */
function hide(inst, key, value) {
    return own(inst, key, value, false);
}
/** Adds members a table derives from the instance: each builds on first read and shadows as own data, and assignment shadows the same way, as when these were own properties. */
function derived(computes, table) {
    for (const key in computes) {
        const compute = computes[key];
        // an object literal's accessor is configurable and enumerable, and `members` copies the descriptor as written
        Object.defineProperty(table, key, {
            configurable: true,
            enumerable: true,
            get() {
                return own(this, key, compute(this));
            },
            set(value) {
                own(this, key, value);
            },
        });
    }
    return table;
}
function defineBound(proto, key, fn) {
    Object.defineProperty(proto, key, {
        configurable: true,
        get() {
            // vitest's spyOn calls a prototype getter bare to find the function it wraps, so a nullish receiver answers the raw method
            return this == null ? fn : own(this, key, fn.bind(this));
        },
        set(value) {
            own(this, key, value);
        },
    });
}
/** Returns the prototype to install on, or `undefined` if this group is already installed on it. */
function claim(inst, sentinel) {
    const proto = Object.getPrototypeOf(inst);
    // Runs on every construction, so `in` rather than the costlier `hasOwnProperty.call`. Sentinels are keys the group itself defines.
    return sentinel in proto ? undefined : proto;
}
// The internals whose init chain is installing. A second call for the same one is a derived constructor overriding its base, so it must not construct another schema in between or the override is dropped.
let installing;
// Set while a getter is running, so a value that resolved through a recursion break is not memoized. One shared descriptor shadows the key for the duration, which costs no per-key allocation.
let broke = false;
const breaker = {
    configurable: true,
    get() {
        broke = true;
        return undefined;
    },
};
/**
 * Installs a lazily-derived internal on the `_zod` prototype of `inst`'s
 * constructor, computed from the internals object itself and cached there on
 * first read. One accessor per constructor rather than one per instance.
 */
function defineLazyInternal(inst, key, compute) {
    const proto = Object.getPrototypeOf(inst._zod);
    if (key in proto && installing !== inst._zod) {
        // A repeat construction: everything is installed already. Cleared here so the reference is not held past the first construction of every type.
        installing = undefined;
        return;
    }
    installing = inst._zod;
    Object.defineProperty(proto, key, {
        configurable: true,
        get() {
            // Shadowed before computing so a re-entrant read from a recursive schema resolves to undefined instead of running the getter again.
            Object.defineProperty(this, key, breaker);
            const outer = broke;
            broke = false;
            try {
                const value = compute(this);
                // A result that resolved through a recursion break is recomputed once the graph is complete; everything else memoizes, undefined included.
                if (broke)
                    delete this[key];
                else
                    Object.defineProperty(this, key, { configurable: true, writable: true, value });
                broke = broke || outer;
                return value;
            }
            catch (err) {
                // A compute that threw memoizes nothing, so a later read runs it again and fails the same way. The shadow goes with it, since leaving it installed would answer undefined for every later read.
                delete this[key];
                broke = broke || outer;
                throw err;
            }
        },
        set(value) {
            Object.defineProperty(this, key, { configurable: true, writable: true, value });
        },
    });
}
/**
 * Installs `key` on `inst`'s prototype, computed by `make` on first read and cached there as an own
 * data property. One accessor per constructor rather than one per instance, because an own accessor
 * puts every instance after the first into v8 dictionary mode. The key doubles as the sentinel.
 */
function installLazyProp(inst, key, make, enumerable) {
    const proto = claim(inst, key);
    if (!proto)
        return;
    Object.defineProperty(proto, key, {
        configurable: true,
        get() {
            // Shadowed before computing, so a re-entrant read from a self-referential shape resolves to undefined instead of running the getter again. A data property rather than an accessor: an own accessor is the dictionary-mode transition this exists to avoid.
            const desc = { configurable: true, writable: true, enumerable, value: undefined };
            Object.defineProperty(this, key, desc);
            // a compute that throws leaves the shadow behind, so later reads answer undefined instead of re-throwing; `defineLazy` did the same, and `defineLazyInternal`'s delete-on-catch would cost bytes in every bundle for a case only a throwing user getter reaches
            desc.value = make(this);
            Object.defineProperty(this, key, desc);
            return desc.value;
        },
        set(value) {
            Object.defineProperty(this, key, { configurable: true, writable: true, enumerable, value });
        },
    });
}
/** Marks the thunk `_catch` synthesises for a constant catch value. `Function.length` cannot tell that thunk from a user callback — rest and defaulted parameters both report arity 0 — and a user callback reads `ctx.error`, whose issues only finalize correctly against the caller's per-parse error map. Provenance can say what arity cannot. A plain string key rather than `Symbol.for`, whose call at module scope no bundler can prove pure — the same shape that anchored `urlCanParse` into every build. */
exports.CONSTANT_CATCH = "~constantCatch";
/** Wraps a constant catch value in a thunk tagged with {@link CONSTANT_CATCH}. */
function constantCatch(value) {
    const fn = () => value;
    fn[exports.CONSTANT_CATCH] = true;
    return fn;
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
