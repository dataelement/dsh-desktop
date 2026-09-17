import * as core from "./core.js";
import * as errors from "./errors.js";
import * as util from "./util.js";
// Always both keys, so the `_params` read site in `_parse` sees one object shape rather than two.
function finalizeParams(callee, params) {
    return { callee: params?.callee ?? callee, Err: params?.Err };
}
export const _parse = (_Err) => {
    const fn = (schema, value, _ctx, _params) => {
        const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
        const result = schema._zod.run({ value, issues: [] }, ctx);
        if (result instanceof Promise) {
            throw new core.$ZodAsyncError();
        }
        if (result.issues.length) {
            const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())));
            util.captureStackTrace(e, _params?.callee ?? fn);
            throw e;
        }
        return result.value;
    };
    return fn;
};
export const parse = /* @__PURE__*/ _parse(errors.$ZodRealError);
export const _parseAsync = (_Err) => {
    const fn = async (schema, value, _ctx, params) => {
        const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
        let result = schema._zod.run({ value, issues: [] }, ctx);
        if (result instanceof Promise)
            result = await result;
        if (result.issues.length) {
            const e = new (params?.Err ?? _Err)(result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())));
            util.captureStackTrace(e, params?.callee ?? fn);
            throw e;
        }
        return result.value;
    };
    return fn;
};
export const parseAsync = /* @__PURE__*/ _parseAsync(errors.$ZodRealError);
export const _safeParse = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
        throw new core.$ZodAsyncError();
    }
    return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
};
export const safeParse = /* @__PURE__*/ _safeParse(errors.$ZodRealError);
// the error is built on the first read of `error`: finalizing the issues and constructing the instance is most of a failing parse, and a caller that only branches on `success` never pays it. a getter in the literal keeps this small; the alternative, one shared accessor descriptor plus a hidden state slot, reads ~15% faster but costs ~75 B gzipped in every bundle
function failure(Err, issues, ctx) {
    let error;
    return {
        success: false,
        get error() {
            if (!error) {
                error = new Err(issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())));
                // finalizeIssue drops `input`, so the built error holds nothing; keeping the raw issues past this point pins the parsed value for the life of the result
                issues = undefined;
                ctx = undefined;
            }
            return error;
        },
        set error(e) {
            error = e;
            // a replacement makes the getter's branch unreachable, so the captures have to go here too
            issues = undefined;
            ctx = undefined;
        },
    };
}
export const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
        result = await result;
    return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
};
export const safeParseAsync = /* @__PURE__*/ _safeParseAsync(errors.$ZodRealError);
// registry mirrors of the compiler's sentinels, so this module never imports the compiler
const COMPILE_INVALID = /* @__PURE__ */ Symbol.for("zod.compile.invalid");
const COMPILE_FALLBACK = /* @__PURE__ */ Symbol.for("zod.compile.fallback");
// Deliberately tiny, because v8 will not inline a body carrying the fallback's object literals and throw. Everything that is not the compiled happy path lives in validateFallback, and that split is worth ~35% on a compiled schema.
export const validate = ((schema, value, _ctx) => {
    const validator = schema._zod.bag.validator;
    if (validator !== undefined) {
        if (validator(value) !== COMPILE_INVALID)
            return true;
        // a definite sentinel means the runtime would reject, so skip the re-parse; a ctx can still change the answer
        if (validator.definite === true && _ctx === undefined)
            return false;
    }
    return validateFallback(schema, value, _ctx);
});
function validateFallback(schema, value, _ctx) {
    const ctx = _ctx
        ? { ..._ctx, async: false, abortEarly: true }
        : { async: false, abortEarly: true };
    const fallbackRun = schema._zod.bag.fallbackRun;
    let result;
    if (fallbackRun) {
        // skip nested fast paths on the fallback, so user callbacks keep the at-most-twice bound
        ctx[COMPILE_FALLBACK] = true;
        result = fallbackRun({ value, issues: [] }, ctx);
    }
    else {
        result = schema._zod.run({ value, issues: [] }, ctx);
    }
    if (result instanceof Promise) {
        throw new core.$ZodAsyncError();
    }
    return result.issues.length === 0;
}
// no fast path: the compiler keeps async parses on the runtime, because a promise-returning callback that is not declared async compiles to a throw
export const validateAsync = async (schema, value, _ctx) => {
    const ctx = _ctx
        ? { ..._ctx, async: true, abortEarly: true }
        : { async: true, abortEarly: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
        result = await result;
    return result.issues.length === 0;
};
export const _encode = (_Err) => {
    const parse = _parse(_Err);
    const fn = (schema, value, _ctx, _params) => {
        const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
        return parse(schema, value, ctx, finalizeParams(fn, _params));
    };
    return fn;
};
export const encode = /* @__PURE__*/ _encode(errors.$ZodRealError);
export const _decode = (_Err) => {
    const parse = _parse(_Err);
    const fn = (schema, value, _ctx, _params) => {
        return parse(schema, value, _ctx, finalizeParams(fn, _params));
    };
    return fn;
};
export const decode = /* @__PURE__*/ _decode(errors.$ZodRealError);
export const _encodeAsync = (_Err) => {
    const parseAsync = _parseAsync(_Err);
    const fn = async (schema, value, _ctx, _params) => {
        const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
        return (await parseAsync(schema, value, ctx, finalizeParams(fn, _params)));
    };
    return fn;
};
export const encodeAsync = /* @__PURE__*/ _encodeAsync(errors.$ZodRealError);
export const _decodeAsync = (_Err) => {
    const parseAsync = _parseAsync(_Err);
    const fn = async (schema, value, _ctx, _params) => {
        return await parseAsync(schema, value, _ctx, finalizeParams(fn, _params));
    };
    return fn;
};
export const decodeAsync = /* @__PURE__*/ _decodeAsync(errors.$ZodRealError);
export const _safeEncode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return _safeParse(_Err)(schema, value, ctx);
};
export const safeEncode = /* @__PURE__*/ _safeEncode(errors.$ZodRealError);
export const _safeDecode = (_Err) => (schema, value, _ctx) => {
    return _safeParse(_Err)(schema, value, _ctx);
};
export const safeDecode = /* @__PURE__*/ _safeDecode(errors.$ZodRealError);
export const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
    return _safeParseAsync(_Err)(schema, value, ctx);
};
export const safeEncodeAsync = /* @__PURE__*/ _safeEncodeAsync(errors.$ZodRealError);
export const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _safeParseAsync(_Err)(schema, value, _ctx);
};
export const safeDecodeAsync = /* @__PURE__*/ _safeDecodeAsync(errors.$ZodRealError);
