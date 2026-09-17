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
exports.ZodCompileUnsupportedError = exports.ZodCompileAsyncError = exports.INVALID = void 0;
exports.compile = compile;
exports.withParser = withParser;
exports.compileFn = compileFn;
const core_js_1 = require("./core.cjs");
const doc_js_1 = require("./doc.cjs");
const memoizer_js_1 = require("./memoizer.cjs");
const regexes = __importStar(require("./regexes.cjs"));
const schemas_js_1 = require("./schemas.cjs");
const util = __importStar(require("./util.cjs"));
/** @internal Sentinel the compiled fast path returns when validation fails. */
exports.INVALID = Symbol.for("zod.compile.invalid");
// Set on the parse ctx when a compiled wrapper falls back to the runtime, so nested compiled wrappers skip their fast paths for the rest of that parse.
const FALLBACK_FLAG = Symbol.for("zod.compile.fallback");
/** Raised when the schema contains async refinements or transforms. Surfaces only under `compile(schema, { strict: true })`. */
class ZodCompileAsyncError extends Error {
    constructor(message = "z.compile does not support async refinements, transforms, or checks") {
        super(message);
        this.name = "ZodCompileAsyncError";
    }
}
exports.ZodCompileAsyncError = ZodCompileAsyncError;
/**
 * Raised when the schema contains a feature whose semantics the fast path
 * can't fully model. Both the shim in `zod/compile` and the default
 * `compile()` fall back to the runtime parser for that schema; only
 * `compile(schema, { strict: true })` lets it surface.
 */
class ZodCompileUnsupportedError extends Error {
    constructor(feature, islandable = true) {
        super(`z.compile does not support ${feature}; this schema must use the runtime parser`);
        this.name = "ZodCompileUnsupportedError";
        this.islandable = islandable;
    }
}
exports.ZodCompileUnsupportedError = ZodCompileUnsupportedError;
/**
 * Build the validator `validate` calls: the same codegen as the parser with the output construction
 * dropped. A schema the flag cannot express reuses the parser, which still answers correctly — it
 * just builds a value nothing reads.
 */
function compileValidator(schema, parser) {
    try {
        return compileFn(schema, { assertOnly: true });
    }
    catch {
        return parser;
    }
}
/**
 * AOT-compile a Zod schema. Returns a clone whose `_zod.run` calls a generated
 * fast path first and falls back to the original runtime parser on failure.
 *
 * - Forward direction only. Backward (encode), async, and `skipChecks` paths
 *   bypass the fast path and use the runtime directly.
 * - Never throws. A schema the fast path can't model is returned unchanged and
 *   keeps using the runtime parser. Pass `{ strict: true }` to get the refusal
 *   as a thrown `ZodCompileUnsupportedError` / `ZodCompileAsyncError` instead.
 * - The original schema is unchanged. The clone shares children by reference.
 */
function compile(schema, options) {
    try {
        const parser = compileFn(schema);
        const clone = withParser(schema, parser);
        // withParser leaves the parser as its own validator; the generated assert-only variant is better when we have one
        clone._zod.bag.validator = compileValidator(schema, parser);
        return clone;
    }
    catch (err) {
        if (options?.strict)
            throw err;
        // a schema we can't compile still has to work, so hand it back untouched on the runtime parser — the same silent fallback global mode already does
        return schema;
    }
}
/**
 * Install an already-generated parser as a schema's fast path. Returns a clone; the original is
 * unchanged.
 *
 * The parser takes the input and returns the parsed value, or `INVALID` to hand the parse to the
 * runtime. It must be synchronous and forward-direction, and it must build fresh output rather than
 * return its input — Zod cannot check either, and a wrong *success* is returned to the caller as-is.
 *
 * `compile()` is the ordinary entry point. This is for a build-time or native compiler that produces
 * a parser where `new Function` is unavailable.
 */
function withParser(schema, parser) {
    // generated code never receives the parse context, so only the runtime can close a reference cycle; compileFn refuses these too
    if ((0, memoizer_js_1.isRecursiveSchema)(schema)) {
        throw new ZodCompileUnsupportedError("a schema whose subtree contains a reference cycle");
    }
    const clone = util.clone(schema);
    // Capture the source-of-truth runtime eagerly. If schema._zod.run is itself a shim installed by global-mode (`__originalRun` set), unwrap past it. Otherwise capturing the live property lazily would let a later self- replacement of schema._zod.run feed our wrapper back into itself.
    const liveRun = schema._zod.run;
    const originalRun = liveRun.__originalRun ?? liveRun;
    // Delegate to the *original* schema's run on bypass/fallback, not the clone's. The original closed over its own `inst` at construction time, and issue payloads use that reference to derive things like the class name for `z.instanceof(Test)`; calling the clone's freshly-initialized run would push issues with `inst === clone` and diverge from the original schema's error messages.
    const wrapped = (payload, ctx) => {
        if (ctx?.async ||
            ctx?.direction === "backward" ||
            ctx?.skipChecks ||
            ctx?.[FALLBACK_FLAG]) {
            return originalRun(payload, ctx);
        }
        // A memoized back-edge: only the runtime can close a reference cycle, and a transform on one must raise $ZodCyclicError from its own parse.
        if (ctx && (0, memoizer_js_1.isBackEdge)(ctx, payload.value)) {
            return originalRun(payload, ctx);
        }
        const out = parser(payload.value);
        if (out !== exports.INVALID) {
            payload.value = out;
            return payload;
        }
        // Mark this parse as runtime-driven: under global mode every nested schema carries its own compiled wrapper, and without the flag the parent's runtime fallback re-enters each child's fast path, running user callbacks a third time on invalid input.
        if (ctx)
            ctx[FALLBACK_FLAG] = true;
        return originalRun(payload, ctx);
    };
    // Let later compiles of (or through) this run unwrap to the true runtime — both the global shim and repeated z.compile calls rely on this. The bag also carries the parser and the validator, so the standalone validate can skip the payload and wrapper on the happy path.
    wrapped.__originalRun = originalRun;
    clone._zod.bag.fallbackRun = originalRun;
    // a supplied parser answers `validate` too: one implementation means parse and validate cannot disagree, and its undefined `definite` keeps the runtime re-parse on every rejection
    clone._zod.bag.validator = parser;
    clone._zod.run = wrapped;
    // The fast parse/safeParse closures fall back through the source schema's methods. If the source is shim- or wrapper-managed, those methods route into a compiled run and would execute user callbacks a third time on invalid input — the plain method → wrapper path is exactly 2x, so skip.
    if (!liveRun.__originalRun)
        installCompiledUserMethods(clone, schema, parser);
    return clone;
}
function installCompiledUserMethods(target, source, parser) {
    const targetAny = target;
    const sourceAny = source;
    if (typeof sourceAny.safeParse === "function") {
        const originalSafeParse = sourceAny.safeParse;
        targetAny.safeParse = (data, params) => {
            const out = parser(data);
            if (out !== exports.INVALID) {
                return { success: true, data: out };
            }
            return originalSafeParse(data, params);
        };
    }
    if (typeof sourceAny.parse === "function") {
        const originalParse = sourceAny.parse;
        targetAny.parse = (data, params) => {
            const out = parser(data);
            if (out !== exports.INVALID) {
                return out;
            }
            return originalParse(data, params);
        };
    }
}
/**
 * @internal Generate the standalone compiled function: a parser by default, a validator under
 * `assertOnly`. Returns the parsed value, `true` where nothing reads the output, or `INVALID`. Consumers use `compile()`.
 */
function compileFn(schema, options) {
    // Cycle-breaking is keyed on the parse context, which generated code never receives. `shape` can be a getter that throws (z.pick() with an unrecognized mask key), so treat "can't tell" as recursive.
    let recursive = true;
    try {
        recursive = (0, memoizer_js_1.isRecursiveSchema)(schema);
    }
    catch { }
    if (recursive) {
        throw new ZodCompileUnsupportedError("a schema whose subtree contains a reference cycle");
    }
    const ctx = {
        constants: new Map(),
        constantCounter: 0,
        varCounter: 0,
        definite: true,
    };
    const doc = new doc_js_1.Doc(["input"]);
    const outputAccessor = generateCheck(doc, ctx, schema, "input", !options?.assertOnly);
    // In assert mode a root that built nothing has already returned INVALID on every failure, so reaching the end means valid.
    doc.write(outputAccessor === null ? `return true;` : `return ${outputAccessor};`);
    // Build the function with hoisted constants Always include INVALID as the first constant
    const constantNames = ["INVALID", ...ctx.constants.keys()];
    const constantValues = [exports.INVALID, ...ctx.constants.values()];
    const code = doc.content.join("\n");
    const fullCode = options?.debug
        ? constantNames.length > 0
            ? `// Constants: ${constantNames.join(", ")}\n${code}`
            : code
        : "";
    const F = Function;
    const factoryCode = `return (input) => {\n${code}\n}`;
    let fn;
    try {
        const factory = new F(...constantNames, factoryCode);
        fn = factory(...constantValues);
    }
    catch (err) {
        // Malformed generated code (or a CSP environment rejecting `new Function`) surfaces as a typed error so the global shim falls back to the runtime instead of crashing with a raw SyntaxError/EvalError.
        throw new ZodCompileUnsupportedError(`this schema (generated code failed to evaluate: ${err.message})`);
    }
    if (options?.debug) {
        fn.code = fullCode;
    }
    fn.definite = ctx.definite;
    return fn;
}
function addConstant(ctx, value) {
    // Check if we already have this constant
    for (const [name, v] of ctx.constants) {
        if (v === value)
            return name;
    }
    const name = `c${ctx.constantCounter++}`;
    ctx.constants.set(name, value);
    return name;
}
/** Hoists a user-supplied callback. Anything the schema's author wrote can throw, and generated code can reject an earlier sibling before ever reaching it, so this clears `definite` — a rejection is then no longer proof that the interpreter would have rejected rather than thrown. */
function addUserConstant(ctx, fn) {
    ctx.definite = false;
    return addConstant(ctx, fn);
}
function newVar(ctx) {
    return `v${ctx.varCounter++}`;
}
// Runs a child schema as a black box: its value, or INVALID for a failure or an async run.
function runtimeRun(schema, value) {
    const result = schema._zod.run({ value, issues: [] }, {});
    if (result && typeof result.then === "function")
        return exports.INVALID;
    const r = result;
    return r.issues.length === 0 ? r.value : exports.INVALID;
}
// `null` means the node built no value because nothing reads it. The overloads keep that case out of the 20-odd callers that always want one, so only a caller passing needsValue has to handle it.
function compileChild(doc, ctx, schema, accessor, needsValue = true) {
    const contentLen = doc.content.length;
    const constantCount = ctx.constants.size;
    const constantCounter = ctx.constantCounter;
    const varCounter = ctx.varCounter;
    try {
        return generateCheck(doc, ctx, schema, accessor, needsValue);
    }
    catch (err) {
        if (!(err instanceof ZodCompileUnsupportedError) || !err.islandable)
            throw err;
        doc.content.length = contentLen;
        if (ctx.constants.size > constantCount) {
            const trailing = Array.from(ctx.constants.keys()).slice(constantCount);
            for (const k of trailing)
                ctx.constants.delete(k);
        }
        ctx.constantCounter = constantCounter;
        ctx.varCounter = varCounter;
        return emitRuntimeIsland(doc, ctx, schema, accessor);
    }
}
function emitRuntimeIsland(doc, ctx, schema, accessor) {
    // an islanded child answers INVALID for an async run too, which the interpreter throws for
    ctx.definite = false;
    const schemaConst = addConstant(ctx, schema);
    const runConst = addConstant(ctx, runtimeRun);
    const outVar = newVar(ctx);
    doc.write(`const ${outVar} = ${runConst}(${schemaConst}, ${accessor});`);
    doc.write(`if (${outVar} === INVALID) return INVALID;`);
    return outVar;
}
// Check classes whose `when` is auto-defaulted at init (checks.ts `when ??=`).
const WHEN_DEFAULTED_CHECKS = new Set([
    "max_size",
    "min_size",
    "size_equals",
    "max_length",
    "min_length",
    "length_equals",
]);
function generateChecks(doc, ctx, schema, accessor) {
    const schemaChecks = schema._zod.def.checks;
    if (!schemaChecks || schemaChecks.length === 0)
        return accessor;
    // Track current accessor - may change if overwrite checks are encountered
    let currentAccessor = accessor;
    for (const check of schemaChecks) {
        const def = check._zod.def;
        // A custom `when` skips a check the fast path always runs; the one auto-defaulted on size/length classes matches its bail-on-first-failure.
        if (def.when && !WHEN_DEFAULTED_CHECKS.has(def.check)) {
            throw new ZodCompileUnsupportedError(`check with a custom "when" condition`);
        }
        switch (def.check) {
            case "greater_than":
                generateGreaterThanCheck(doc, ctx, def, currentAccessor);
                break;
            case "less_than":
                generateLessThanCheck(doc, ctx, def, currentAccessor);
                break;
            case "multiple_of":
                generateMultipleOfCheck(doc, ctx, def, currentAccessor);
                break;
            case "number_format":
                generateNumberFormatCheck(doc, def, currentAccessor);
                break;
            case "min_length": {
                const min = numericOperand(def.minimum, "min_length");
                const len = codePointLengthVar(doc, ctx, currentAccessor, `${currentAccessor}.length >= ${min} && ${currentAccessor}.length < ${def.minimum * 2}`);
                doc.write(`if (${len} < ${min}) return INVALID;`);
                break;
            }
            case "max_length": {
                const max = numericOperand(def.maximum, "max_length");
                const len = codePointLengthVar(doc, ctx, currentAccessor, `${currentAccessor}.length > ${max}`);
                doc.write(`if (${len} > ${max}) return INVALID;`);
                break;
            }
            case "length_equals": {
                const exact = numericOperand(def.length, "length_equals");
                const len = codePointLengthVar(doc, ctx, currentAccessor, `${currentAccessor}.length >= ${exact} && ${currentAccessor}.length <= ${def.length * 2}`);
                doc.write(`if (${len} !== ${exact}) return INVALID;`);
                break;
            }
            case "min_size":
                doc.write(`if (${currentAccessor}.size < ${numericOperand(def.minimum, "min_size")}) return INVALID;`);
                break;
            case "max_size":
                doc.write(`if (${currentAccessor}.size > ${numericOperand(def.maximum, "max_size")}) return INVALID;`);
                break;
            case "size_equals":
                doc.write(`if (${currentAccessor}.size !== ${numericOperand(def.size, "size_equals")}) return INVALID;`);
                break;
            case "string_format":
                currentAccessor = generateStringFormatCheck(doc, ctx, def, currentAccessor);
                break;
            case "custom":
                currentAccessor = generateCustomRefineCheck(doc, ctx, check, currentAccessor);
                break;
            case "bigint_format":
                generateBigIntFormatCheck(doc, def, currentAccessor);
                break;
            case "mime_type":
                generateMimeTypeCheck(doc, ctx, def, currentAccessor);
                break;
            case "property":
                generatePropertyCheck(doc, ctx, def, currentAccessor);
                break;
            case "properties":
                generatePropertiesChecks(doc, ctx, def, currentAccessor);
                break;
            case "overwrite": {
                // Overwrite transforms the value - create new variable for transformed result
                const newAccessor = newVar(ctx);
                generateOverwriteCheck(doc, ctx, check, currentAccessor, newAccessor);
                currentAccessor = newAccessor;
                break;
            }
            default: {
                void def;
                throw new ZodCompileUnsupportedError(`check type ${def.check}`);
            }
        }
    }
    return currentAccessor;
}
// Emit the length operand for a length check, mirroring `$ZodCheckMinLength` and friends: strings measure in code points, everything else in `.length`. `inDoubt` is the caller's cheap UTF-16 bound test — outside it the unit count already settles the comparison, so the scan is skipped.
function codePointLengthVar(doc, ctx, accessor, inDoubt) {
    const cpLen = addConstant(ctx, util.codePointLength);
    const v = newVar(ctx);
    doc.write(`const ${v} = typeof ${accessor} === "string" && ${inDoubt} ? ${cpLen}(${accessor}) : ${accessor}.length;`);
    return v;
}
// Emit a source operand for a gt/lt bound. Numbers inline; Dates hoist as a constant (relational operators compare via valueOf). NaN and Invalid Date bounds can't compile to a comparison that matches runtime semantics.
/**
 * A count bound reaches generated source verbatim, so a non-number would be
 * emitted as code rather than as a value — `min('0) {} evil(); if (0')` writes an
 * arbitrary statement into the function body. TypeScript types these as `number`
 * and fromJSONSchema guards them, so this is a backstop rather than a live hole,
 * but generated source is the one place a wrong type stops being a type error.
 */
function numericOperand(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new ZodCompileUnsupportedError(`${label} bound of type ${typeof value}`);
    }
    return `${value}`;
}
function comparisonOperand(ctx, value) {
    if (typeof value === "bigint")
        return `${value}n`;
    if (typeof value === "number") {
        if (Number.isNaN(value))
            throw new ZodCompileUnsupportedError("comparison check with NaN bound");
        return `${value}`;
    }
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            throw new ZodCompileUnsupportedError("comparison check with Invalid Date bound");
        }
        return addConstant(ctx, value);
    }
    throw new ZodCompileUnsupportedError(`comparison check bound of type ${typeof value}`);
}
function generateGreaterThanCheck(doc, ctx, def, accessor) {
    const op = def.inclusive ? "<" : "<=";
    doc.write(`if (${accessor} ${op} ${comparisonOperand(ctx, def.value)}) return INVALID;`);
}
function generateLessThanCheck(doc, ctx, def, accessor) {
    const op = def.inclusive ? ">" : ">=";
    doc.write(`if (${accessor} ${op} ${comparisonOperand(ctx, def.value)}) return INVALID;`);
}
function generateMultipleOfCheck(doc, ctx, def, accessor) {
    if (typeof def.value === "bigint") {
        // a zero divisor has no compiled form: `x % 0n` throws
        if (def.value === BigInt(0))
            throw new ZodCompileUnsupportedError("multiple_of check with a zero divisor");
        doc.write(`if (${accessor} % ${def.value}n !== 0n) return INVALID;`);
    }
    else {
        // Float `%` has well-known precision issues for sub-integer steps
        // (`1.5 % 0.1`, `2.5e-7 % 1e-7`). Defer to util.floatSafeRemainder so the
        // exact tolerance logic stays in one place — single function call is fine
        // since `multipleOf` runs at most once per number.
        const remainder = addConstant(ctx, util.floatSafeRemainder);
        doc.write(`if (${remainder}(${accessor}, ${numericOperand(def.value, "multiple_of")}) !== 0) return INVALID;`);
    }
}
function generateNumberFormatCheck(doc, def, accessor) {
    const format = def.format;
    switch (format) {
        case "safeint":
            doc.write(`if (!Number.isSafeInteger(${accessor})) return INVALID;`);
            break;
        case "int32":
            doc.write(`if (!Number.isInteger(${accessor}) || ${accessor} < -2147483648 || ${accessor} > 2147483647) return INVALID;`);
            break;
        case "uint32":
            doc.write(`if (!Number.isInteger(${accessor}) || ${accessor} < 0 || ${accessor} > 4294967295) return INVALID;`);
            break;
        case "float32":
            // Float32 range per util.NUMBER_FORMAT_RANGES
            doc.write(`if (!Number.isFinite(${accessor}) || ${accessor} < -3.4028234663852886e38 || ${accessor} > 3.4028234663852886e38) return INVALID;`);
            break;
        case "float64":
            doc.write(`if (!Number.isFinite(${accessor})) return INVALID;`);
            break;
        default: {
            void format;
            throw new ZodCompileUnsupportedError(`number format ${format}`);
        }
    }
}
function generateBigIntFormatCheck(doc, def, accessor) {
    const format = def.format;
    if (!format)
        return; // undefined format means no range check
    switch (format) {
        case "int64":
            doc.write(`if (${accessor} < -9223372036854775808n || ${accessor} > 9223372036854775807n) return INVALID;`);
            break;
        case "uint64":
            doc.write(`if (${accessor} < 0n || ${accessor} > 18446744073709551615n) return INVALID;`);
            break;
        default: {
            void format;
            throw new ZodCompileUnsupportedError(`bigint format ${format}`);
        }
    }
}
function generateMimeTypeCheck(doc, ctx, def, accessor) {
    const mimeTypes = def.mime;
    if (mimeTypes && mimeTypes.length > 0) {
        const mimeSet = addConstant(ctx, new Set(mimeTypes));
        doc.write(`if (!${mimeSet}.has(${accessor}.type)) return INVALID;`);
    }
}
// asserts each named property in place; children compile assert-only because z.properties never rebuilds its input
function generatePropertiesChecks(doc, ctx, def, accessor) {
    // a custom `when` gates the assertion at runtime; inside a union a wrongly-run branch is absorbed as a branch failure rather than falling back, so refuse at codegen
    if (def.when) {
        throw new ZodCompileUnsupportedError(`check with a custom "when" condition`);
    }
    // matches the runtime gate: the base schema already typed the value, so only a nullish one is rejected
    doc.write(`if (${accessor} == null) return INVALID;`);
    const shape = def.shape;
    for (const key of Reflect.ownKeys(shape)) {
        // a symbol has no source literal, so it is hoisted as a constant
        const keyExpr = typeof key === "symbol" ? addConstant(ctx, key) : util.esc(key);
        // cache the property read so a getter runs exactly once, matching the runtime
        const inputVar = newVar(ctx);
        doc.write(`const ${inputVar} = ${accessor}[${keyExpr}];`);
        compileChild(doc, ctx, shape[key], inputVar, false);
    }
}
function generatePropertyCheck(doc, ctx, def, accessor) {
    const propAccessor = `${accessor}[${JSON.stringify(def.property)}]`;
    generateCheck(doc, ctx, def.schema, propAccessor);
}
function generateOverwriteCheck(doc, ctx, check, currentAccessor, newAccessor) {
    const tx = check._zod.def.tx;
    if (!tx) {
        throw new ZodCompileUnsupportedError("overwrite check without a transform function");
    }
    // Check for async transform
    if (isAsyncFunction(tx)) {
        throw new ZodCompileAsyncError("z.compile: async overwrite transforms are not supported");
    }
    // Hoist the transform function as a constant and apply it
    const txConst = addConstant(ctx, tx);
    doc.write(`const ${newAccessor} = ${txConst}(${currentAccessor});`);
}
/** A predicate that hands back a thenable is an async check reached synchronously, and the interpreter throws `$ZodAsyncError` for it. Returning INVALID instead would be a bail-out, and a union reads a bail-out as a rejected branch and answers with a later one — so the throw has to survive into generated code. */
function throwAsync() {
    throw new core_js_1.$ZodAsyncError();
}
/** Shared `addIssue` for the spoofed payloads a refine, check or transform receives. Allocating one per call — a fresh closure plus a `this`-bound method on a fresh literal — pinned every payload-allocating schema at ~2.7M ops/sec against 135M for a plain object literal. It captures nothing per call; it only reaches `this.issues`. */
function pushIssue(issue) {
    this.issues.push(issue);
}
function generateCustomRefineCheck(doc, ctx, check, accessor) {
    const def = check._zod.def;
    if (def.fn) {
        // Simple predicate function (from .refine())
        if (isAsyncFunction(def.fn)) {
            throw new ZodCompileAsyncError("z.compile: async .refine() predicates are not supported");
        }
        const fnConst = addUserConstant(ctx, def.fn);
        const throwAsyncConst = addConstant(ctx, throwAsync);
        const resVar = newVar(ctx);
        doc.write(`const ${resVar} = ${fnConst}(${accessor});`);
        // A thenable is truthy, so it would otherwise read as a pass. It is not a rejection either: the interpreter throws, and INVALID inside a union would just hand the parse to the next branch.
        doc.write(`if (${resVar} instanceof Promise) ${throwAsyncConst}();`);
        doc.write(`if (!${resVar}) return INVALID;`);
        // A `.refine()` predicate only answers yes or no; it cannot rewrite the value.
        return accessor;
    }
    if (check._zod.check) {
        if (isAsyncFunction(check._zod.check)) {
            throw new ZodCompileAsyncError("z.compile: async .superRefine() / check functions are not supported");
        }
        // SuperRefine or other check function - need to spoof context Create a helper that runs the check and returns true if no issues
        const checkFn = check._zod.check;
        // `$RefinementCtx` extends the parse payload, so a check may rewrite
        // `ctx.value` as well as push issues — `.superRefine((v, ctx) => { ctx.value =
        // v.trim() })` is a value transform. Returning only a boolean discarded that
        // write and emitted the untrimmed input. Hand the value back and thread it on.
        const helperFn = (value) => {
            const fakePayload = { value, issues: [], addIssue: pushIssue };
            const result = checkFn(fakePayload);
            // Throw rather than return INVALID: the interpreter throws here, and a union would read INVALID as a rejected branch.
            if (result instanceof Promise)
                throwAsync();
            return fakePayload.issues.length === 0 ? fakePayload.value : exports.INVALID;
        };
        const helperConst = addUserConstant(ctx, helperFn);
        const outVar = newVar(ctx);
        doc.write(`const ${outVar} = ${helperConst}(${accessor});`);
        doc.write(`if (${outVar} === INVALID) return INVALID;`);
        return outVar;
    }
    throw new ZodCompileUnsupportedError("custom check without a predicate or check function");
}
/**
 * Built-in formats that validate with nothing but `def.pattern`, so compiling
 * the regex reproduces the runtime exactly. Deliberately an allowlist: a format
 * missing from it loses its fast path, while a format wrongly added to it
 * silently accepts input the runtime rejects. Formats that layer extra
 * validation over a shape-only pattern (`credit_card`, `base64`, `ipv6`, …) are
 * handled above by hoisting the runtime validator itself.
 */
const PATTERN_IS_COMPLETE = new Set([
    "cidrv4",
    "cuid",
    "cuid2",
    "date",
    "datetime",
    "duration",
    "e164",
    "email",
    "emoji",
    "ends_with",
    "guid",
    "includes",
    "ipv4",
    "ksuid",
    "lowercase",
    "mac",
    "nanoid",
    "regex",
    "starts_with",
    "time",
    "ulid",
    "uppercase",
    "uuid",
    "xid",
]);
function generateStringFormatCheck(doc, ctx, def, accessor, needsValue = true) {
    // Some string formats do runtime validation beyond their advertised pattern. For cheap pure utility checks, hoist the runtime function and call it so the fast path stays correct without cloning the utility logic into codegen.
    const fmt = def.format;
    if (fmt === "base64") {
        const validator = addConstant(ctx, schemas_js_1.isValidBase64);
        doc.write(`if (!${validator}(${accessor})) return INVALID;`);
        return accessor;
    }
    if (fmt === "base64url") {
        const validator = addConstant(ctx, schemas_js_1.isValidBase64URL);
        doc.write(`if (!${validator}(${accessor})) return INVALID;`);
        return accessor;
    }
    if (fmt === "jwt") {
        const validator = addConstant(ctx, schemas_js_1.isValidJWT);
        const alg = addConstant(ctx, def.alg ?? null);
        doc.write(`if (!${validator}(${accessor}, ${alg})) return INVALID;`);
        return accessor;
    }
    if (fmt === "ipv6") {
        const validator = addConstant(ctx, schemas_js_1.isValidIPv6);
        doc.write(`if (!${validator}(${accessor})) return INVALID;`);
        return accessor;
    }
    if (fmt === "cidrv6") {
        const validator = addConstant(ctx, schemas_js_1.isValidCIDRv6);
        doc.write(`if (!${validator}(${accessor})) return INVALID;`);
        return accessor;
    }
    if (fmt === "credit_card") {
        const validator = addConstant(ctx, schemas_js_1.isValidCreditCard);
        doc.write(`if (!${validator}(${accessor})) return INVALID;`);
        return accessor;
    }
    if (fmt === "iban") {
        const validator = addConstant(ctx, schemas_js_1.isValidIBAN);
        doc.write(`if (!${validator}(${accessor})) return INVALID;`);
        return accessor;
    }
    const formatDef = def;
    if (fmt === "url" ||
        fmt === "httpurl" ||
        formatDef.normalize ||
        formatDef.hostname !== undefined ||
        formatDef.protocol !== undefined) {
        // Same three predicates the runtime calls, in the same order, so there is no second URL implementation to drift. Which options exist is known now, so the calls the runtime makes conditionally are emitted conditionally instead.
        const parseConst = addConstant(ctx, schemas_js_1.validateURL);
        const defConst = addConstant(ctx, def);
        const trimVar = newVar(ctx);
        const urlVar = newVar(ctx);
        doc.write(`const ${trimVar} = ${accessor}.trim();`);
        doc.write(`const ${urlVar} = ${parseConst}(${trimVar}, ${defConst});`);
        doc.write(`if (typeof ${urlVar} === "number") return INVALID;`);
        if (formatDef.hostname !== undefined) {
            const hostnameConst = addConstant(ctx, schemas_js_1.urlHostnameOk);
            doc.write(`if (!${hostnameConst}(${urlVar}, ${defConst}.hostname)) return INVALID;`);
        }
        if (formatDef.protocol !== undefined) {
            const protocolConst = addConstant(ctx, schemas_js_1.urlProtocolOk);
            doc.write(`if (!${protocolConst}(${urlVar}, ${defConst}.protocol)) return INVALID;`);
        }
        if (!needsValue)
            return null;
        const outputVar = newVar(ctx);
        const outputExpr = formatDef.normalize ? `${urlVar}.href` : `${addConstant(ctx, schemas_js_1.stripTabAndNewline)}(${trimVar})`;
        doc.write(`const ${outputVar} = ${outputExpr};`);
        return outputVar;
    }
    // A custom string format carries the predicate the runtime actually calls. Hoist and call it instead of testing `def.pattern`: the two only coincide when the format was built from a RegExp, and relying on that coupling is how supplemental validation gets dropped.
    const customFn = def.fn;
    if (customFn) {
        if (isAsyncFunction(customFn))
            throw new ZodCompileUnsupportedError(`async string format ${fmt}`);
        const fnConst = addConstant(ctx, customFn);
        doc.write(`if (!${fnConst}(${accessor})) return INVALID;`);
        return accessor;
    }
    // Formats whose `pattern` IS the whole check. An allowlist rather than `if (def.pattern)`, because credit_card, base64 and ipv6 carry a shape-only pattern and validate the rest separately.
    if (PATTERN_IS_COMPLETE.has(fmt) && def.pattern) {
        const patternConst = addConstant(ctx, def.pattern);
        doc.write(`${patternConst}.lastIndex = 0;`);
        doc.write(`if (!${patternConst}.test(${accessor})) return INVALID;`);
        return accessor;
    }
    const format = def.format;
    switch (format) {
        case "regex":
            // A regex check with a pattern returned above. Reaching here means there is no pattern to test, and accepting unconditionally would pass every input, so hand the schema back to the runtime.
            throw new ZodCompileUnsupportedError("regex format without a pattern");
        case "lowercase":
            doc.write(`if (${accessor} !== ${accessor}.toLowerCase()) return INVALID;`);
            break;
        case "uppercase":
            doc.write(`if (${accessor} !== ${accessor}.toUpperCase()) return INVALID;`);
            break;
        case "includes":
            doc.write(`if (!${accessor}.includes(${util.esc(def.includes)})) return INVALID;`);
            break;
        case "starts_with": {
            const prefix = def.prefix;
            doc.write(`if (${accessor}.slice(0, ${prefix.length}) !== ${util.esc(prefix)}) return INVALID;`);
            break;
        }
        case "ends_with": {
            const suffix = def.suffix;
            doc.write(`if (${accessor}.slice(-${suffix.length}) !== ${util.esc(suffix)}) return INVALID;`);
            break;
        }
        default: {
            void format;
            throw new ZodCompileUnsupportedError(`string format ${format}`);
        }
    }
    return accessor;
}
function generateCheck(doc, ctx, schema, accessor, needsValue = true) {
    const def = schema._zod.def;
    const type = def.type;
    // A coercing schema would compile to the bare type test and reject what it should convert; inside a union that reads as a rejected branch, so refuse at codegen.
    if (def.coerce) {
        throw new ZodCompileUnsupportedError(`coercion (z.coerce.${type}())`);
    }
    // A node builds its output when its caller reads one, or when it carries checks of its own, since a check reads what was built. One polarity for the whole walk: this is what the node does, and it is what its children are told they need.
    const buildsValue = needsValue || !!def.checks?.length;
    let typeAccessor;
    switch (type) {
        case "string":
            typeAccessor = generateStringCheck(doc, ctx, schema, accessor, buildsValue);
            break;
        case "number":
            typeAccessor = generateNumberCheck(doc, schema, accessor);
            break;
        case "boolean":
            typeAccessor = generateBooleanCheck(doc, accessor);
            break;
        case "bigint":
            typeAccessor = generateBigIntCheck(doc, schema, accessor);
            break;
        case "symbol":
            typeAccessor = generateSymbolCheck(doc, accessor);
            break;
        case "undefined":
            typeAccessor = generateUndefinedCheck(doc, accessor);
            break;
        case "null":
            typeAccessor = generateNullCheck(doc, accessor);
            break;
        case "any":
        case "unknown":
            // No check needed - pass through
            typeAccessor = accessor;
            break;
        case "never":
            doc.write("return INVALID;");
            typeAccessor = accessor;
            break;
        case "void":
            typeAccessor = generateVoidCheck(doc, accessor);
            break;
        case "nan":
            typeAccessor = generateNaNCheck(doc, accessor);
            break;
        case "date":
            typeAccessor = generateDateCheck(doc, accessor);
            break;
        case "object":
            typeAccessor = generateObjectCheck(doc, ctx, schema, accessor, buildsValue);
            break;
        case "optional":
            typeAccessor = generateOptionalCheck(doc, ctx, schema, accessor, buildsValue);
            break;
        case "nullable":
            typeAccessor = generateNullableCheck(doc, ctx, schema, accessor, buildsValue);
            break;
        case "array":
            typeAccessor = generateArrayCheck(doc, ctx, schema, accessor, buildsValue);
            break;
        case "literal":
            typeAccessor = generateLiteralCheck(doc, ctx, schema, accessor);
            break;
        case "enum":
            typeAccessor = generateEnumCheck(doc, ctx, schema, accessor);
            break;
        case "readonly": {
            const innerOut = generateWrapperCheck(doc, ctx, schema, accessor);
            // Runtime freezes the parsed value (schemas.ts handleReadonlyResult).
            const frozenVar = newVar(ctx);
            doc.write(`const ${frozenVar} = Object.freeze(${innerOut});`);
            typeAccessor = frozenVar;
            break;
        }
        case "success":
            // Runtime output is `issues.length === 0`. The fast path only reaches
            // here when the inner check passed (failure returns INVALID and the
            // runtime fallback reproduces the inner issues), so the output is
            // always `true`.
            generateWrapperCheck(doc, ctx, schema, accessor);
            typeAccessor = "true";
            break;
        case "default":
        case "prefault":
            typeAccessor = generateDefaultCheck(doc, ctx, schema, accessor);
            break;
        case "nonoptional":
            typeAccessor = generateNonOptionalCheck(doc, ctx, schema, accessor);
            break;
        case "tuple":
            typeAccessor = generateTupleCheck(doc, ctx, schema, accessor);
            break;
        case "union":
            typeAccessor = generateUnionCheck(doc, ctx, schema, accessor);
            break;
        case "intersection":
            typeAccessor = generateIntersectionCheck(doc, ctx, schema, accessor);
            break;
        case "record":
            typeAccessor = generateRecordCheck(doc, ctx, schema, accessor);
            break;
        case "map":
            typeAccessor = generateMapCheck(doc, ctx, schema, accessor);
            break;
        case "set":
            typeAccessor = generateSetCheck(doc, ctx, schema, accessor);
            break;
        case "file":
            typeAccessor = generateFileCheck(doc, accessor);
            break;
        case "template_literal":
            typeAccessor = generateTemplateLiteralCheck(doc, ctx, schema, accessor);
            break;
        case "lazy":
            typeAccessor = generateLazyCheck(doc, ctx, schema, accessor);
            break;
        case "pipe":
            typeAccessor = generatePipeCheck(doc, ctx, schema, accessor);
            break;
        case "custom":
            typeAccessor = generateCustomCheck(doc, ctx, schema, accessor);
            break;
        case "transform":
            typeAccessor = generateTransformCheck(doc, ctx, schema, accessor);
            break;
        case "catch":
            typeAccessor = generateCatchCheck(doc, ctx, schema, accessor);
            break;
        default: {
            void type;
            throw new ZodCompileUnsupportedError(`schema type ${type}`);
        }
    }
    // a node that built nothing has no checks to run: not building requires an empty check list
    if (typeAccessor === null)
        return null;
    // Generate checks after the type-specific validation (may transform value)
    return generateChecks(doc, ctx, schema, typeAccessor);
}
function generateStringCheck(doc, ctx, schema, accessor, needsValue = true) {
    doc.write(`if (typeof ${accessor} !== "string") return INVALID;`);
    // z.email() carries its format on the def, z.string().email() in def.checks; both route here so the format table has no second copy to drift from.
    const def = schema._zod.def;
    if (def.format === undefined)
        return accessor;
    return generateStringFormatCheck(doc, ctx, def, accessor, needsValue);
}
function generateNumberCheck(doc, schema, accessor) {
    // Runtime z.number() rejects NaN and ±Infinity. Number.isFinite covers both.
    doc.write(`if (typeof ${accessor} !== "number" || !Number.isFinite(${accessor})) return INVALID;`);
    // Mini factories like z.int(), z.int32(), z.uint32(), z.float32() bake a number_format check into the schema def itself (not into def.checks). Apply the same constraint here.
    const def = schema._zod.def;
    if (def.check === "number_format" && def.format) {
        generateNumberFormatCheck(doc, { format: def.format }, accessor);
    }
    return accessor;
}
function generateBooleanCheck(doc, accessor) {
    doc.write(`if (typeof ${accessor} !== "boolean") return INVALID;`);
    return accessor;
}
function generateBigIntCheck(doc, schema, accessor) {
    doc.write(`if (typeof ${accessor} !== "bigint") return INVALID;`);
    // Handle bigint format (int64, uint64) directly on the schema def
    const def = schema._zod.def;
    if (def.format) {
        switch (def.format) {
            case "int64":
                doc.write(`if (${accessor} < -9223372036854775808n || ${accessor} > 9223372036854775807n) return INVALID;`);
                break;
            case "uint64":
                doc.write(`if (${accessor} < 0n || ${accessor} > 18446744073709551615n) return INVALID;`);
                break;
        }
    }
    return accessor;
}
function generateSymbolCheck(doc, accessor) {
    doc.write(`if (typeof ${accessor} !== "symbol") return INVALID;`);
    return accessor;
}
function generateUndefinedCheck(doc, accessor) {
    doc.write(`if (${accessor} !== undefined) return INVALID;`);
    return accessor;
}
function generateNullCheck(doc, accessor) {
    doc.write(`if (${accessor} !== null) return INVALID;`);
    return accessor;
}
function generateVoidCheck(doc, accessor) {
    doc.write(`if (${accessor} !== undefined) return INVALID;`);
    return accessor;
}
function generateNaNCheck(doc, accessor) {
    doc.write(`if (typeof ${accessor} !== "number" || !Number.isNaN(${accessor})) return INVALID;`);
    return accessor;
}
function generateDateCheck(doc, accessor) {
    doc.write(`if (!(${accessor} instanceof Date) || Number.isNaN(${accessor}.getTime())) return INVALID;`);
    return accessor;
}
function generateObjectCheck(doc, ctx, schema, accessor, buildsValue = true) {
    const def = schema._zod.def;
    // Check that input is a non-null, non-array object
    doc.write(`if (typeof ${accessor} !== "object" || ${accessor} === null || Array.isArray(${accessor})) return INVALID;`);
    const shape = def.shape;
    const keys = Object.keys(shape);
    const symbolKeys = Object.getOwnPropertySymbols(shape);
    // a symbol has no source literal, so it is hoisted as a constant; `keys` stays string-only where the emitted code uses `for...in`
    const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
    const keyExpr = (k) => (typeof k === "symbol" ? addConstant(ctx, k) : util.esc(k));
    const propKey = (k) => (typeof k === "symbol" ? `[${keyExpr(k)}]` : util.esc(k));
    const propShape = shape;
    // `__proto__` as an own shape key can't be expressed in an output object literal (the literal form sets the prototype instead of an own property).
    if (keys.includes("__proto__")) {
        throw new ZodCompileUnsupportedError('object shape key "__proto__"');
    }
    // Map from key to output accessor for that property
    const propOutputs = new Map();
    // Validate each property and collect output accessors
    for (const key of allKeys) {
        const propSchema = propShape[key];
        const kx = keyExpr(key);
        // Always cache the property read: the runtime reads input[key] exactly once, so a getter must not be re-read by checks or output assembly.
        const inputVar = newVar(ctx);
        doc.write(`const ${inputVar} = ${accessor}[${kx}];`);
        if (propSchema._zod.optin !== undefined) {
            // Any optin rung means the key may be omitted. The runtime runs the property anyway and ignores issues only when the key is genuinely absent, which is what makes exactOptional compositional.
            const outputVar = newVar(ctx);
            doc.write(`let ${outputVar} = (() => {`);
            doc.indented((d) => {
                const outputAccessor = compileChild(d, ctx, propSchema, inputVar);
                d.write(`return ${outputAccessor};`);
            });
            doc.write(`})();`);
            if (propSchema._zod.optout === "optional") {
                doc.write(`if (${outputVar} === INVALID) {`);
                doc.indented((d) => {
                    d.write(`if (${kx} in ${accessor}) return INVALID;`);
                    d.write(`${outputVar} = undefined;`);
                });
                doc.write(`}`);
            }
            else {
                doc.write(`if (${outputVar} === INVALID) return INVALID;`);
            }
            propOutputs.set(key, outputVar);
        }
        else {
            if (requiresPresenceCheck(propSchema)) {
                doc.write(`if (!(${kx} in ${accessor})) return INVALID;`);
            }
            // Generate check and get output accessor
            const outputAccessor = compileChild(doc, ctx, propSchema, inputVar, buildsValue);
            if (outputAccessor !== null)
                propOutputs.set(key, outputAccessor);
        }
    }
    // Handle catchall
    const catchall = def.catchall;
    let unknownKeysMode = "none";
    if (catchall) {
        const catchallType = catchall._zod.def.type;
        if (catchallType === "never") {
            // Strict: one `for...in`, as the runtime does, so inherited enumerable keys count. An undeclared `__proto__` is reported here and excluded only from the output (#6221); an own-key count would wrongly reject a class instance.
            const condition = keys.map((k) => `k !== ${util.esc(k)}`).join(" && ") || "true";
            doc.write(`for (const k in ${accessor}) {`);
            doc.indented((d) => {
                d.write(`if (${condition}) return INVALID;`);
            });
            doc.write(`}`);
        }
        else if ((catchallType === "unknown" || catchallType === "any") && !catchall._zod.def.checks?.length) {
            unknownKeysMode = "passthrough";
        }
        else {
            unknownKeysMode = "schema";
        }
    }
    // else: strip mode (no catchall) - unknown keys ignored, only include known keys
    // defaulted required outputs keep their keys even when undefined
    const outputVar = newVar(ctx);
    const hasConditionalKeys = allKeys.some((k) => mayOmitUndefined(propShape[k]) || dropsWhenAbsent(propShape[k]));
    // Assert mode: every declared key is validated above, so the output literal and the unknown-key copy are pure waste. A `never` catchall already emitted its rejection loop; a schema catchall still has to validate the values it would otherwise have stored.
    if (!buildsValue) {
        if (unknownKeysMode === "schema") {
            const knownSet = keys.length > 0 ? addConstant(ctx, new Set(keys)) : null;
            doc.write(`for (const k in ${accessor}) {`);
            doc.indented((d) => {
                d.write(`if (k === "__proto__") continue;`);
                if (knownSet)
                    d.write(`if (${knownSet}.has(k)) continue;`);
                const valVar = newVar(ctx);
                d.write(`const ${valVar} = ${accessor}[k];`);
                compileChild(d, ctx, catchall, valVar, false);
            });
            doc.write(`}`);
        }
        return null;
    }
    if (!hasConditionalKeys) {
        const propLiterals = allKeys.map((k) => `${propKey(k)}: ${propOutputs.get(k)}`).join(", ");
        doc.write(`const ${outputVar} = { ${propLiterals} };`);
    }
    else {
        doc.write(`const ${outputVar} = {};`);
        for (const k of allKeys) {
            const kx = keyExpr(k);
            const out = propOutputs.get(k);
            if (dropsWhenAbsent(propShape[k])) {
                doc.write(`if (${kx} in ${accessor}) ${outputVar}[${kx}] = ${out};`);
            }
            else if (mayOmitUndefined(propShape[k])) {
                doc.write(`if (${out} !== undefined || ${kx} in ${accessor}) ${outputVar}[${kx}] = ${out};`);
            }
            else {
                doc.write(`${outputVar}[${kx}] = ${out};`);
            }
        }
    }
    if (unknownKeysMode !== "none") {
        // Unknown keys are written directly into the output after shape keys — for...in (like the runtime) so inherited enumerables participate.
        const knownSet = keys.length > 0 ? addConstant(ctx, new Set(keys)) : null;
        doc.write(`for (const k in ${accessor}) {`);
        doc.indented((d) => {
            // Skip __proto__: assigning obj["__proto__"] on a plain {} replaces the prototype via the setter rather than adding an own property. Mirrors the runtime catchall fix (#5898).
            d.write(`if (k === "__proto__") continue;`);
            if (knownSet)
                d.write(`if (${knownSet}.has(k)) continue;`);
            if (unknownKeysMode === "passthrough") {
                d.write(`${outputVar}[k] = ${accessor}[k];`);
            }
            else {
                const valVar = newVar(ctx);
                d.write(`const ${valVar} = ${accessor}[k];`);
                const catchallOut = compileChild(d, ctx, catchall, valVar);
                d.write(`${outputVar}[k] = ${catchallOut};`);
            }
        });
        doc.write(`}`);
    }
    return outputVar;
}
function generateOptionalCheck(doc, ctx, schema, accessor, buildsValue = true) {
    const def = schema._zod.def;
    if (isExactOptional(schema)) {
        return generateCheck(doc, ctx, def.innerType, accessor, buildsValue);
    }
    // Same question $ZodOptional asks: only the top rung of the optin ladder substitutes a value for an absent input, so only it is worth running on `undefined`. Every other rung leaves the value intact, which is the skip branch below.
    if (def.innerType._zod.optin === "defaulted") {
        const outputVar = newVar(ctx);
        const branchVar = newVar(ctx);
        doc.write(`let ${outputVar};`);
        doc.write(`if (${accessor} === undefined) {`);
        doc.indented((d) => {
            d.write(`const ${branchVar} = (() => {`);
            d.indented((d2) => {
                const innerOutput = generateCheck(d2, ctx, def.innerType, accessor);
                d2.write(`return ${innerOutput};`);
            });
            d.write(`})();`);
            d.write(`if (${branchVar} !== INVALID) ${outputVar} = ${branchVar};`);
        });
        doc.write(`} else {`);
        doc.indented((d) => {
            const innerOutput = generateCheck(d, ctx, def.innerType, accessor);
            d.write(`${outputVar} = ${innerOutput};`);
        });
        doc.write(`}`);
        return outputVar;
    }
    const outputVar = buildsValue ? newVar(ctx) : null;
    if (outputVar)
        doc.write(`let ${outputVar};`);
    doc.write(`if (${accessor} !== undefined) {`);
    doc.indented((d) => {
        const innerOutput = generateCheck(d, ctx, def.innerType, accessor, buildsValue);
        if (outputVar && innerOutput !== null)
            d.write(`${outputVar} = ${innerOutput};`);
    });
    doc.write(`}`);
    return outputVar;
}
function isExactOptional(schema) {
    return schema._zod.traits?.has("$ZodExactOptional") === true;
}
// A value-level fast path reads an absent key as `undefined`, so z.undefined(), z.any() and unions containing undefined would accept a missing property the runtime rejects.
function requiresPresenceCheck(schema) {
    return schema._zod.optin === undefined && fastPathAcceptsAbsence(schema);
}
function fastPathAcceptsAbsence(schema) {
    // An island is handed `input[key]` and cannot tell absent from explicitly undefined, so report absence-accepting and let the object emit the presence guard (#6405).
    if (schema._zod.def.coerce)
        return true;
    const def = schema._zod.def;
    switch (def.type) {
        case "any":
        case "unknown":
        case "undefined":
        case "void":
        case "default":
        case "prefault":
        case "transform":
        case "custom":
        case "lazy":
            return true;
        case "string":
        case "number":
        case "boolean":
        case "bigint":
        case "symbol":
        case "null":
        case "never":
        case "nan":
        case "date":
        case "object":
        case "array":
        case "tuple":
        case "record":
        case "map":
        case "set":
        case "file":
        case "template_literal":
            return false;
        case "nonoptional":
            // Normally rejects an absent key, but not when something inside supplies a value for it: `.default(v).optional().nonoptional()` accepts absence and yields v. Defer to the inner — over-reporting here only costs a presence check, and a fast path that wrongly rejects still falls back to the runtime.
            return def.innerType ? fastPathAcceptsAbsence(def.innerType) : false;
        case "literal":
            return !!def.values?.includes(undefined);
        case "enum":
            return !!schema._zod.values?.has(undefined);
        case "optional":
        case "nullable":
        case "readonly":
        case "success":
            return def.innerType ? fastPathAcceptsAbsence(def.innerType) : true;
        case "catch":
            // catch always produces a value (inner may fail → catchValue substitutes), so it accepts an absent key regardless of inner.
            return true;
        case "union":
            return def.options ? def.options.some(fastPathAcceptsAbsence) : true;
        case "intersection":
            if (!def.left || !def.right)
                return true;
            return fastPathAcceptsAbsence(def.left) && fastPathAcceptsAbsence(def.right);
        case "pipe":
            return def.in ? fastPathAcceptsAbsence(def.in) : true;
        default:
            return true;
    }
}
/** The middle rung permits absence without supplying anything in its place, so an absent key contributes nothing — mirrors the leading gate in `handlePropertyResult`. */
function dropsWhenAbsent(schema) {
    return schema._zod.optin === "optional" && schema._zod.optout === "optional";
}
function mayOmitUndefined(schema) {
    return (schema._zod.optin !== "defaulted" || schema._zod.optout === "optional") && mayOutputUndefined(schema);
}
// whether a schema's success-path output can be undefined
function mayOutputUndefined(schema) {
    const def = schema._zod.def;
    switch (def.type) {
        case "string":
        case "number":
        case "boolean":
        case "bigint":
        case "symbol":
        case "null":
        case "nan":
        case "date":
        case "object":
        case "array":
        case "tuple":
        case "record":
        case "map":
        case "set":
        case "file":
        case "template_literal":
        case "never":
        case "success":
            return false;
        case "literal":
            return !!def.values?.includes(undefined);
        case "enum":
            return !!schema._zod.values?.has(undefined);
        case "optional":
            return true;
        case "nullable":
        case "readonly":
        case "nonoptional":
            return def.innerType ? mayOutputUndefined(def.innerType) : true;
        case "union":
            return def.options ? def.options.some(mayOutputUndefined) : true;
        case "intersection":
            return !def.left || !def.right || mayOutputUndefined(def.left) || mayOutputUndefined(def.right);
        case "pipe":
            return def.out ? mayOutputUndefined(def.out) : true;
        default:
            // any/unknown/undefined/void/default/prefault/transform/custom/lazy/catch
            return true;
    }
}
function generateNullableCheck(doc, ctx, schema, accessor, buildsValue = true) {
    const def = schema._zod.def;
    const outputVar = buildsValue ? newVar(ctx) : null;
    if (outputVar)
        doc.write(`let ${outputVar} = null;`);
    doc.write(`if (${accessor} !== null) {`);
    doc.indented((d) => {
        const innerOutput = generateCheck(d, ctx, def.innerType, accessor, buildsValue);
        if (outputVar && innerOutput !== null)
            d.write(`${outputVar} = ${innerOutput};`);
    });
    doc.write(`}`);
    return outputVar;
}
function generateArrayCheck(doc, ctx, schema, accessor, buildsValue = true) {
    const def = schema._zod.def;
    doc.write(`if (!Array.isArray(${accessor})) return INVALID;`);
    // Build a new array with validated/transformed elements.
    const outputVar = buildsValue ? newVar(ctx) : null;
    const iVar = newVar(ctx);
    const elemVar = newVar(ctx);
    if (outputVar)
        doc.write(`const ${outputVar} = new Array(${accessor}.length);`);
    doc.write(`for (let ${iVar} = 0; ${iVar} < ${accessor}.length; ${iVar}++) {`);
    doc.indented((d) => {
        d.write(`const ${elemVar} = ${accessor}[${iVar}];`);
        const elemOutput = compileChild(d, ctx, def.element, elemVar, buildsValue);
        if (outputVar && elemOutput !== null)
            d.write(`${outputVar}[${iVar}] = ${elemOutput};`);
    });
    doc.write(`}`);
    return outputVar;
}
function generateLiteralCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    const values = def.values;
    // Anything but a single value goes through Set.has: multi-value so every value participates, empty so nothing does — values[0] would be undefined and compile to an `!== undefined` check that accepts it. Single-value stays inlined for speed.
    if (values.length !== 1) {
        const literalSet = addConstant(ctx, new Set(values));
        doc.write(`if (!${literalSet}.has(${accessor})) return INVALID;`);
        return accessor;
    }
    const value = values[0];
    // `$ZodLiteral` matches with `values.has`, i.e. SameValueZero, so NaN matches itself. `x !== NaN` is true for every input, which would reject everything — hand it to the same Set form the multi-value path uses.
    if (typeof value === "number" && Number.isNaN(value)) {
        const literalSet = addConstant(ctx, new Set(values));
        doc.write(`if (!${literalSet}.has(${accessor})) return INVALID;`);
        return accessor;
    }
    if (typeof value === "string") {
        doc.write(`if (${accessor} !== ${util.esc(value)}) return INVALID;`);
    }
    else if (typeof value === "number" || typeof value === "boolean") {
        doc.write(`if (${accessor} !== ${value}) return INVALID;`);
    }
    else if (value === null) {
        doc.write(`if (${accessor} !== null) return INVALID;`);
    }
    else if (value === undefined) {
        doc.write(`if (${accessor} !== undefined) return INVALID;`);
    }
    else if (typeof value === "bigint") {
        doc.write(`if (${accessor} !== ${value}n) return INVALID;`);
    }
    else {
        throw new ZodCompileUnsupportedError(`literal type ${typeof value}`);
    }
    return accessor;
}
function generateEnumCheck(doc, ctx, schema, accessor) {
    const values = schema._zod.values;
    // z.partialRecord and friends clear `_zod.values`, leaving no set to test membership against. Throw rather than emit INVALID so a union falls back whole instead of counting a false rejection.
    if (!values) {
        throw new ZodCompileUnsupportedError("enum schema without enumerated values");
    }
    const enumSet = addConstant(ctx, values);
    doc.write(`if (!${enumSet}.has(${accessor})) return INVALID;`);
    return accessor;
}
function generateWrapperCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    return generateCheck(doc, ctx, def.innerType, accessor);
}
function generateDefaultCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    // `defaultValue` is an accessor on schemas built through the classic/mini
    // factories and a plain data property on ones rebuilt programmatically
    // (deepPartial and friends). Read it off the def either way — taking only
    // `descriptor.get` silently dropped the default for the second kind, so
    // `.default(v)` compiled to `undefined` instead of `v`.
    const descriptor = Object.getOwnPropertyDescriptor(schema._zod.def, "defaultValue");
    const defaultGetter = descriptor
        ? () => schema._zod.def.defaultValue
        : undefined;
    // prefault differs from default: undefined-input is first replaced with the prefault value, then run through the inner schema.
    if (schema._zod.def.type === "prefault") {
        if (!defaultGetter) {
            return generateCheck(doc, ctx, def.innerType, accessor);
        }
        const defaultFn = addConstant(ctx, defaultGetter);
        const inputVar = newVar(ctx);
        doc.write(`let ${inputVar} = ${accessor};`);
        doc.write(`if (${accessor} === undefined) ${inputVar} = ${defaultFn}();`);
        return generateCheck(doc, ctx, def.innerType, inputVar);
    }
    const outputVar = newVar(ctx);
    // Default allows undefined (replaces with default value), otherwise validates inner type
    if (defaultGetter) {
        const defaultFn = addConstant(ctx, defaultGetter);
        const cloneFn = addConstant(ctx, util.shallowClone);
        doc.write(`let ${outputVar};`);
        doc.write(`if (${accessor} === undefined) {`);
        doc.indented((d) => {
            // Shallow-clone the default so callers can mutate the result without affecting subsequent parses (#5855 — also covers Map/Set).
            d.write(`${outputVar} = ${cloneFn}(${defaultFn}());`);
        });
        doc.write(`} else {`);
        doc.indented((d) => {
            const innerOutput = generateCheck(d, ctx, def.innerType, accessor);
            d.write(`${outputVar} = ${innerOutput} === undefined ? ${cloneFn}(${defaultFn}()) : ${innerOutput};`);
        });
        doc.write(`}`);
    }
    else {
        doc.write(`let ${outputVar};`);
        doc.write(`if (${accessor} !== undefined) {`);
        doc.indented((d) => {
            const innerOutput = generateCheck(d, ctx, def.innerType, accessor);
            d.write(`${outputVar} = ${innerOutput};`);
        });
        doc.write(`}`);
    }
    return outputVar;
}
function generateNonOptionalCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    // The runtime inspects what the inner produced, not what it was given: a catch can turn a defined input into undefined, a default an absent one into a value.
    const innerOutput = generateCheck(doc, ctx, def.innerType, accessor);
    const outputVar = newVar(ctx);
    doc.write(`const ${outputVar} = ${innerOutput};`);
    doc.write(`if (${outputVar} === undefined) return INVALID;`);
    return outputVar;
}
function generateTupleCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    const items = def.items;
    const rest = def.rest;
    doc.write(`if (!Array.isArray(${accessor})) return INVALID;`);
    // Mirror the runtime's getTupleOptStart: find the first index where every subsequent slot accepts `undefined` (i.e. is optional on input). Anything shorter than this is too_small; trailing absent slots are legal.
    const optinStart = getTupleOptStart(items, "optin");
    const optoutStart = getTupleOptStart(items, "optout");
    // Length bounds
    if (rest) {
        // With rest: minimum length is the last required input slot
        doc.write(`if (${accessor}.length < ${optinStart}) return INVALID;`);
    }
    else {
        // No rest: input must be in [optinStart, items.length]
        doc.write(`if (${accessor}.length < ${optinStart} || ${accessor}.length > ${items.length}) return INVALID;`);
    }
    // Build the output in assignment order so absent optional-output tail slots can truncate while default/prefault slots still fill missing positions.
    const outputVar = newVar(ctx);
    doc.write(`const ${outputVar} = [];`);
    // Validate and collect each fixed item
    for (let i = 0; i < items.length; i++) {
        const itemSchema = items[i];
        if (i >= optoutStart) {
            doc.write(`if (${outputVar}.length === ${i}) {`);
            doc.indented((d) => {
                d.write(`if (${i} < ${accessor}.length) {`);
                d.indented((d2) => {
                    const elemVar = newVar(ctx);
                    d2.write(`const ${elemVar} = ${accessor}[${i}];`);
                    const elemOutput = compileChild(d2, ctx, itemSchema, elemVar);
                    d2.write(`${outputVar}[${i}] = ${elemOutput};`);
                });
                d.write(`} else {`);
                d.indented((d2) => {
                    // Middle rung: absence supplies nothing in its place, so truncate rather than running the item on `undefined` and keeping what it invents. Mirrors the leading gate in `handleTupleResults`.
                    if (dropsWhenAbsent(itemSchema)) {
                        d2.write(`${outputVar}.length = ${i};`);
                        return;
                    }
                    const elemVar = newVar(ctx);
                    const branchVar = newVar(ctx);
                    d2.write(`const ${elemVar} = undefined;`);
                    d2.write(`const ${branchVar} = (() => {`);
                    d2.indented((d3) => {
                        const elemOutput = compileChild(d3, ctx, itemSchema, elemVar);
                        d3.write(`return ${elemOutput};`);
                    });
                    d2.write(`})();`);
                    d2.write(`if (${branchVar} === INVALID || ${branchVar} === undefined) ${outputVar}.length = ${i};`);
                    d2.write(`else ${outputVar}[${i}] = ${branchVar};`);
                });
                d.write(`}`);
            });
            doc.write(`}`);
        }
        else {
            const elemVar = newVar(ctx);
            doc.write(`const ${elemVar} = ${accessor}[${i}];`);
            const elemOutput = compileChild(doc, ctx, itemSchema, elemVar);
            doc.write(`${outputVar}[${i}] = ${elemOutput};`);
        }
    }
    // Validate and collect rest elements if present
    if (rest) {
        const iVar = newVar(ctx);
        const elemVar = newVar(ctx);
        doc.write(`for (let ${iVar} = ${items.length}; ${iVar} < ${accessor}.length; ${iVar}++) {`);
        doc.indented((d) => {
            d.write(`const ${elemVar} = ${accessor}[${iVar}];`);
            const elemOutput = compileChild(d, ctx, rest, elemVar);
            d.write(`${outputVar}[${iVar}] = ${elemOutput};`);
        });
        doc.write(`}`);
    }
    return outputVar;
}
function getTupleOptStart(items, key) {
    for (let i = items.length - 1; i >= 0; i--) {
        // Mirrors the runtime: optin is a three-rung ladder so any rung above `undefined` permits an absent slot; optout stays two-valued.
        const omittable = key === "optin" ? items[i]._zod.optin !== undefined : items[i]._zod.optout === "optional";
        if (!omittable)
            return i + 1;
    }
    return 0;
}
function generateUnionCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    const options = def.options;
    if (def.discriminator) {
        return generateDiscriminatedUnionCheck(doc, ctx, def, accessor);
    }
    // z.xor requires *exactly one* option to match. Match-counting in the fast path is only sound if every branch is exactly as strict as the runtime — any falsely-rejecting branch silently turns a multi-match rejection into an accept. Force the runtime for this rare combinator.
    if (def.inclusive === false) {
        throw new ZodCompileUnsupportedError("exclusive unions (z.xor)");
    }
    if (options.length === 0) {
        doc.write("return INVALID;");
        return accessor;
    }
    if (options.length === 1) {
        return generateCheck(doc, ctx, options[0], accessor);
    }
    // Check if all options are bare literals - use Set optimization. A literal option carrying checks (e.g. .refine) must take the general path or the Set would accept values its checks reject.
    const allLiterals = options.every((opt) => opt._zod.def.type === "literal" && !opt._zod.def.checks?.length);
    if (allLiterals) {
        const values = new Set(options.flatMap((opt) => opt._zod.def.values));
        const valuesConst = addConstant(ctx, values);
        doc.write(`if (!${valuesConst}.has(${accessor})) return INVALID;`);
        return accessor;
    }
    // General case: try each option until one succeeds Use IIFEs that return the output or INVALID
    const outputVar = newVar(ctx);
    doc.write(`let ${outputVar};`);
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (i === 0) {
            doc.write(`${outputVar} = (() => {`);
        }
        else {
            doc.write(`if (${outputVar} === INVALID) ${outputVar} = (() => {`);
        }
        doc.indented((d) => {
            // Generate check inside IIFE - returns INVALID on failure
            const branchOutput = generateCheck(d, ctx, opt, accessor);
            d.write(`return ${branchOutput};`);
        });
        doc.write(`})();`);
    }
    doc.write(`if (${outputVar} === INVALID) return INVALID;`);
    return outputVar;
}
function generateDiscriminatedUnionCheck(doc, ctx, def, accessor) {
    if (def.unionFallback) {
        throw new ZodCompileUnsupportedError("discriminated union with unionFallback");
    }
    if (def.options.length === 0) {
        doc.write("return INVALID;");
        return accessor;
    }
    const discVar = newVar(ctx);
    const outputVar = newVar(ctx);
    doc.write(`const ${discVar} = ${accessor}?.[${util.esc(def.discriminator)}];`);
    doc.write(`let ${outputVar};`);
    let firstBranch = true;
    const claimed = new Set();
    for (const option of def.options) {
        const values = option._zod.propValues?.[def.discriminator];
        if (!values || values.size === 0) {
            throw new ZodCompileUnsupportedError("discriminated union option without static discriminator values");
        }
        // let the interpreter handle collisions instead of compiling first-match dispatch
        for (const value of values) {
            if (claimed.has(value)) {
                throw new ZodCompileUnsupportedError(`duplicate discriminator value ${String(value)}`);
            }
            claimed.add(value);
        }
        const conditions = Array.from(values, (value) => literalEquality(ctx, discVar, value));
        const prefix = firstBranch ? "if" : "else if";
        doc.write(`${prefix} (${conditions.join(" || ")}) {`);
        doc.indented((d) => {
            const branchOutput = generateCheck(d, ctx, option, accessor);
            d.write(`${outputVar} = ${branchOutput};`);
        });
        doc.write(`}`);
        firstBranch = false;
    }
    doc.write(`else { return INVALID; }`);
    return outputVar;
}
function literalEquality(ctx, accessor, value) {
    if (typeof value === "string")
        return `${accessor} === ${util.esc(value)}`;
    if (typeof value === "number") {
        if (Number.isNaN(value))
            return `Number.isNaN(${accessor})`;
        return `${accessor} === ${value}`;
    }
    if (typeof value === "boolean")
        return `${accessor} === ${value}`;
    if (value === null)
        return `${accessor} === null`;
    if (value === undefined)
        return `${accessor} === undefined`;
    if (typeof value === "bigint")
        return `${accessor} === ${value}n`;
    if (typeof value === "symbol") {
        const symbolConst = addConstant(ctx, value);
        return `${accessor} === ${symbolConst}`;
    }
    throw new ZodCompileUnsupportedError(`literal discriminator value ${String(value)}`);
}
function generateIntersectionCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    // An unmergeable merge, and a child failing before the merge is even reached, both return INVALID for a case the interpreter answers with a throw.
    ctx.definite = false;
    const leftOutput = compileChild(doc, ctx, def.left, accessor);
    const rightOutput = compileChild(doc, ctx, def.right, accessor);
    // Hoist the runtime merge helper so recursive object/array merge semantics stay in one place. If the merge is invalid, return INVALID and let the runtime fallback construct canonical errors.
    const mergeConst = addConstant(ctx, schemas_js_1.mergeValues);
    const mergedVar = newVar(ctx);
    doc.write(`const ${mergedVar} = ${mergeConst}(${leftOutput}, ${rightOutput});`);
    doc.write(`if (!${mergedVar}.valid) return INVALID;`);
    return `${mergedVar}.data`;
}
function generateRecordCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    // Use util.isPlainObject (rejects Date, Map, Set, class instances, etc.) to match runtime behavior. Hoisted call instead of inline so this stays a single source of truth with the runtime parser.
    const isPlainObjectConst = addConstant(ctx, util.isPlainObject);
    doc.write(`if (!${isPlainObjectConst}(${accessor})) return INVALID;`);
    const outputVar = newVar(ctx);
    const kVar = newVar(ctx);
    const valVar = newVar(ctx);
    doc.write(`const ${outputVar} = {};`);
    // Exhaustive record. The runtime gates this on `values && !def.partial`, since z.partialRecord keeps its value set but makes every key optional; a loose record passes unrecognized keys through, which the per-key scan cannot express.
    const recordDef = def;
    const keyValues = recordDef.partial ? undefined : def.keyType._zod.values;
    if (keyValues) {
        const inputKeys = [];
        for (const key of keyValues) {
            if (!(typeof key === "string" || typeof key === "number" || typeof key === "symbol")) {
                throw new ZodCompileUnsupportedError(`record key value ${String(key)}`);
            }
            const inputKey = typeof key === "number" ? key.toString() : key;
            if (inputKey === "__proto__") {
                // `out["__proto__"] = v` would hit the prototype setter on the output.
                throw new ZodCompileUnsupportedError('record key "__proto__"');
            }
            inputKeys.push(inputKey);
            const keyConst = addConstant(ctx, key);
            const outKey = generateCheck(doc, ctx, def.keyType, keyConst);
            // Read the property once. Passing the raw expression let compileChild validate one read while the output write performed a second, so a getter could hand back a value nothing had checked.
            const valueVar = newVar(ctx);
            doc.write(`const ${valueVar} = ${accessor}[${literalPropertyKey(ctx, inputKey)}];`);
            const valOutput = compileChild(doc, ctx, def.valueType, valueVar);
            doc.write(`${outputVar}[${outKey}] = ${valOutput};`);
        }
        // `mode: "loose"` changes only what happens to unrecognized keys, so it belongs here rather than the per-present-key scan. Passing them through matches the runtime, which skips `__proto__`.
        const knownKeysConst = addConstant(ctx, new Set(inputKeys));
        doc.write(`for (const ${kVar} in ${accessor}) {`);
        doc.indented((d) => {
            d.write(`if (${knownKeysConst}.has(${kVar})) continue;`);
            if (recordDef.mode === "loose") {
                d.write(`if (${kVar} !== "__proto__") ${outputVar}[${kVar}] = ${accessor}[${kVar}];`);
            }
            else {
                d.write(`return INVALID;`);
            }
        });
        doc.write(`}`);
        return outputVar;
    }
    // The bare-string shortcut below only tests `typeof key === "string"`, so it
    // is correct exclusively for a `z.string()` carrying nothing else. A string
    // *format* lives on the def rather than in `checks` — `z.record(z.email(), …)`
    // reads as a plain string here — and coercion rewrites the key, so both have
    // to take the general path or the shortcut accepts keys the runtime rejects.
    const keyDef = def.keyType._zod.def;
    const keyIsBareString = keyDef.type === "string" && keyDef.format === undefined && !keyDef.coerce && (keyDef.checks?.length ?? 0) === 0;
    if (!keyIsBareString) {
        // A key schema with no value set is a constraint every key must satisfy
        // (`z.email()`, `z.string().min(3)`, `z.number()`, a template literal).
        // The runtime runs it against each own enumerable key and writes the value
        // under the key it produced, so compile it once and call it per key.
        const isLoose = def.mode === "loose";
        // the key compiles in its own context, so carry its verdict out: a key schema that can answer INVALID undecidably makes this validator undecidable too
        const keyFn = compileFn(def.keyType);
        if (keyFn.definite === false)
            ctx.definite = false;
        const keyFast = addConstant(ctx, keyFn);
        const numericConst = addConstant(ctx, regexes.number);
        const outKeyVar = newVar(ctx);
        // the body runs once per string key and once per symbol key, since a key schema can accept symbols
        emitOwnKeys(doc, ctx, accessor, kVar, (d) => {
            d.write(`let ${outKeyVar} = ${keyFast}(${kVar});`);
            // Numeric-string retry, mirroring the runtime: a key the schema rejects as a string is tried again as a number, so z.record(z.number(), …) matches the numeric keys JavaScript stringified on the way in.
            d.write(`if (${outKeyVar} === INVALID && typeof ${kVar} === "string" && ${numericConst}.test(${kVar})) ${outKeyVar} = ${keyFast}(Number(${kVar}));`);
            if (isLoose) {
                // A loose record keeps a key its schema rejects, copying the value across unvalidated rather than failing the parse.
                d.write(`if (${outKeyVar} === INVALID) { ${outputVar}[${kVar}] = ${accessor}[${kVar}]; continue; }`);
            }
            else {
                d.write(`if (${outKeyVar} === INVALID) return INVALID;`);
            }
            // The guard above tested the input key, but the schema can normalize an ordinary key into __proto__; re-check the one actually written under.
            d.write(`if (${outKeyVar} === "__proto__") continue;`);
            // Read once: the raw expression would be evaluated again by the output write below, so an accessor could return an unvalidated second value.
            const valueVar = newVar(ctx);
            d.write(`const ${valueVar} = ${accessor}[${kVar}];`);
            const valOutput = compileChild(d, ctx, def.valueType, valueVar);
            d.write(`${outputVar}[${outKeyVar}] = ${valOutput};`);
        });
        return outputVar;
    }
    // Plain z.string() keys: every own enumerable string key's value is validated, and an own enumerable symbol key fails the string key schema, as it does in the runtime's Reflect.ownKeys walk.
    emitOwnKeys(doc, ctx, accessor, kVar, (d) => {
        d.write(`const ${valVar} = ${accessor}[${kVar}];`);
        const valOutput = compileChild(d, ctx, def.valueType, valVar);
        d.write(`${outputVar}[${kVar}] = ${valOutput};`);
    }, `return INVALID;`);
    return outputVar;
}
// Walks the own enumerable keys of a plain object in Reflect.ownKeys order — strings from getOwnPropertyNames, then symbols — instead of Reflect.ownKeys, whose accumulator made that walk 3–6x the cost of the loop it fed. Both snapshots are taken before any value is read and every key is rechecked with propertyIsEnumerable when visited, exactly the runtime's walk, so a getter that adds, deletes, hides or reveals a key mid-walk sees the runtime's verdict; for-in and Object.keys were no faster and each lost a case (for-in enumerates the prototype chain after the own keys, Object.keys drops a key that is non-enumerable at snapshot time). `body` is written once for the string loop and once for the symbol loop unless `onSymbol` replaces the latter.
function emitOwnKeys(doc, ctx, accessor, kVar, body, onSymbol) {
    const propIsEnumerableConst = addConstant(ctx, Object.prototype.propertyIsEnumerable);
    const symsVar = newVar(ctx);
    const keysVar = newVar(ctx);
    const iVar = newVar(ctx);
    doc.write(`const ${symsVar} = Object.getOwnPropertySymbols(${accessor});`);
    doc.write(`const ${keysVar} = Object.getOwnPropertyNames(${accessor});`);
    doc.write(`for (let ${iVar} = 0; ${iVar} < ${keysVar}.length; ${iVar}++) {`);
    doc.indented((d) => {
        d.write(`const ${kVar} = ${keysVar}[${iVar}];`);
        d.write(`if (${kVar} === "__proto__" || !${propIsEnumerableConst}.call(${accessor}, ${kVar})) continue;`);
        body(d);
    });
    doc.write(`}`);
    doc.write(`for (let ${iVar} = 0; ${iVar} < ${symsVar}.length; ${iVar}++) {`);
    doc.indented((d) => {
        d.write(`const ${kVar} = ${symsVar}[${iVar}];`);
        d.write(`if (!${propIsEnumerableConst}.call(${accessor}, ${kVar})) continue;`);
        if (onSymbol)
            d.write(onSymbol);
        else
            body(d);
    });
    doc.write(`}`);
}
function literalPropertyKey(ctx, key) {
    if (typeof key === "string")
        return util.esc(key);
    return addConstant(ctx, key);
}
function generateMapCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    doc.write(`if (!(${accessor} instanceof Map)) return INVALID;`);
    const outputVar = newVar(ctx);
    const kVar = newVar(ctx);
    const valVar = newVar(ctx);
    doc.write(`const ${outputVar} = new Map();`);
    doc.write(`for (const [${kVar}, ${valVar}] of ${accessor}) {`);
    doc.indented((d) => {
        const keyOutput = generateCheck(d, ctx, def.keyType, kVar);
        const valOutput = generateCheck(d, ctx, def.valueType, valVar);
        d.write(`${outputVar}.set(${keyOutput}, ${valOutput});`);
    });
    doc.write(`}`);
    return outputVar;
}
function generateSetCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    doc.write(`if (!(${accessor} instanceof Set)) return INVALID;`);
    const outputVar = newVar(ctx);
    const valVar = newVar(ctx);
    doc.write(`const ${outputVar} = new Set();`);
    doc.write(`for (const ${valVar} of ${accessor}) {`);
    doc.indented((d) => {
        const valOutput = generateCheck(d, ctx, def.valueType, valVar);
        d.write(`${outputVar}.add(${valOutput});`);
    });
    doc.write(`}`);
    return outputVar;
}
function generateFileCheck(doc, accessor) {
    // Runtime $ZodFile is a bare `instanceof File`, including the implicit global lookup. The previous duck-typed fallback accepted arbitrary {name, size} objects in File-less environments — behavior the runtime never had.
    doc.write(`if (!(${accessor} instanceof File)) return INVALID;`);
    return accessor;
}
function generateTemplateLiteralCheck(doc, ctx, schema, accessor) {
    doc.write(`if (typeof ${accessor} !== "string") return INVALID;`);
    // Template literal schemas have a pre-computed pattern in _zod.pattern
    const pattern = schema._zod.pattern;
    if (pattern) {
        const patternConst = addConstant(ctx, pattern);
        doc.write(`${patternConst}.lastIndex = 0;`);
        doc.write(`if (!${patternConst}.test(${accessor})) return INVALID;`);
    }
    return accessor;
}
function generateLazyCheck(doc, ctx, schema, accessor) {
    // For lazy schemas, we use a cached parser that falls back to runtime Zod parsing This handles recursive schemas correctly by avoiding infinite compilation loops
    const def = schema._zod.def;
    const getterConst = addUserConstant(ctx, def.getter);
    const cacheConst = addConstant(ctx, { parser: null });
    doc.write(`if (!${cacheConst}.parser) {`);
    doc.indented((d) => {
        d.write(`const inner = ${getterConst}();`);
        d.write(`${cacheConst}.parser = function(input) {`);
        d.indented((d2) => {
            // Use runtime Zod parsing - this correctly handles recursive schemas Pass an empty ctx like runtimeRun does — runtime parsers read ctx.skipChecks/ctx.direction unconditionally and crash on undefined.
            d2.write(`const result = inner._zod.run({ value: input, issues: [] }, {});`);
            d2.write(`return result.issues.length === 0 ? result.value : INVALID;`);
        });
        d.write(`};`);
    });
    doc.write(`}`);
    const outputVar = newVar(ctx);
    doc.write(`const ${outputVar} = ${cacheConst}.parser(${accessor});`);
    doc.write(`if (${outputVar} === INVALID) return INVALID;`);
    return outputVar;
}
function generatePipeCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    // Validate input type first
    const inputOutput = generateCheck(doc, ctx, def.in, accessor);
    if (def.transform) {
        // Apply transform and validate output. The transform may read its second `payload` argument (codec transforms like z.stringbool() push issues there) so wrap the call in a helper that spoofs a payload. Pushed issues signal INVALID and the wrapper falls back to the runtime, and a plain function handing back a promise answers INVALID too — union parity, but not a decidable rejection at the top level.
        if (isAsyncFunction(def.transform)) {
            throw new ZodCompileAsyncError("z.compile: async transforms in pipes are not supported");
        }
        const transformFn = def.transform;
        const helperFn = (value) => {
            // `addIssue` has to be here: a transform reporting through it is reporting, not failing. Without it the call threw a TypeError that the old catch swallowed into a fallback, so every ctx.addIssue transform quietly lost its fast path and the real error was never visible.
            const fakePayload = { value, issues: [], addIssue: pushIssue };
            // A throw is deliberately not caught. The interpreter lets one propagate out of the whole parse; swallowing it into INVALID turned a thrown error into a merely-rejected union branch, so a later branch answered instead.
            const result = transformFn(value, fakePayload);
            if (result instanceof Promise)
                return exports.INVALID;
            return fakePayload.issues.length === 0 ? result : exports.INVALID;
        };
        const helperConst = addUserConstant(ctx, helperFn);
        const transformedVar = newVar(ctx);
        doc.write(`const ${transformedVar} = ${helperConst}(${inputOutput});`);
        doc.write(`if (${transformedVar} === INVALID) return INVALID;`);
        return generateCheck(doc, ctx, def.out, transformedVar);
    }
    else {
        // No transform - validate output type on same value
        return generateCheck(doc, ctx, def.out, inputOutput);
    }
}
function isAsyncFunction(fn) {
    return (typeof fn === "function" &&
        (fn.constructor.name === "AsyncFunction" ||
            fn[Symbol.toStringTag] === "AsyncFunction"));
}
function generateCustomCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    if (def.fn) {
        // Check for async function
        if (isAsyncFunction(def.fn)) {
            throw new ZodCompileAsyncError("z.compile: async custom predicates are not supported");
        }
        // Custom schema with a predicate function (e.g. z.instanceof). `isAsyncFunction` above is syntactic, so a plain function returning a promise reaches here, and a promise is truthy — it would read as a pass where the interpreter throws.
        const fnConst = addUserConstant(ctx, def.fn);
        const throwAsyncConst = addConstant(ctx, throwAsync);
        const resVar = newVar(ctx);
        doc.write(`const ${resVar} = ${fnConst}(${accessor});`);
        doc.write(`if (${resVar} instanceof Promise) ${throwAsyncConst}();`);
        doc.write(`if (!${resVar}) return INVALID;`);
    }
    else {
        throw new ZodCompileUnsupportedError("custom schema without a predicate function");
    }
    return accessor;
}
// Runtime helper for a compiled `catch`: runs the inner schema once and returns its value when it succeeded. Anything else — a failure the catch would handle, or an async inner — returns INVALID so the interpreter takes over.
function runtimeCatch(innerSchema, catchValue, value) {
    const result = innerSchema._zod.run({ value, issues: [] }, {});
    if (result && typeof result.then === "function")
        return exports.INVALID;
    const r = result;
    if (r.issues.length === 0)
        return r.value;
    // Only reached for a catch value that ignores the parse context — codegen refuses the rest — so there are no issues to finalize and nothing here needs the caller's error map.
    return catchValue();
}
function generateCatchCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    // An untagged catchValue is a user callback, and one reading `ctx.error` needs the caller's per-parse error map. Catch *succeeds*, so a wrong message there is unobservable — refuse at codegen, and not islandable either, since `runtimeRun` has no context to hand it.
    if (!def.catchValue[util.CONSTANT_CATCH]) {
        throw new ZodCompileUnsupportedError("catch with a callback (only a constant catch value compiles)", false);
    }
    const outputVar = newVar(ctx);
    doc.write(`let ${outputVar} = (() => {`);
    doc.indented((d) => {
        const innerOut = compileChild(d, ctx, def.innerType, accessor);
        d.write(`return ${innerOut};`);
    });
    doc.write(`})();`);
    const innerConst = addConstant(ctx, def.innerType);
    const catchConst = addUserConstant(ctx, def.catchValue);
    const catchHelperConst = addConstant(ctx, runtimeCatch);
    doc.write(`if (${outputVar} === INVALID) {`);
    doc.indented((d) => {
        d.write(`${outputVar} = ${catchHelperConst}(${innerConst}, ${catchConst}, ${accessor});`);
        d.write(`if (${outputVar} === INVALID) return INVALID;`);
    });
    doc.write(`}`);
    return outputVar;
}
function generateTransformCheck(doc, ctx, schema, accessor) {
    const def = schema._zod.def;
    if (def.transform) {
        // Check for async transform
        if (isAsyncFunction(def.transform)) {
            throw new ZodCompileAsyncError("z.compile: async transforms are not supported");
        }
        // Create a helper that runs the transform and returns the result or INVALID on error
        const transformFn = def.transform;
        const helperFn = (value) => {
            const fakePayload = { value, issues: [], addIssue: pushIssue };
            // As in the pipe helper: a throw propagates, because the interpreter lets it out of the whole parse rather than treating it as a failed branch.
            const result = transformFn(value, fakePayload);
            if (result instanceof Promise)
                return exports.INVALID;
            return fakePayload.issues.length === 0 ? result : exports.INVALID;
        };
        const helperConst = addUserConstant(ctx, helperFn);
        const outputVar = newVar(ctx);
        doc.write(`const ${outputVar} = ${helperConst}(${accessor});`);
        doc.write(`if (${outputVar} === INVALID) return INVALID;`);
        return outputVar;
    }
    return accessor;
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
