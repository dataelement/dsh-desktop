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
exports.$ZodObject = exports.$ZodArray = exports.$ZodDate = exports.$ZodVoid = exports.$ZodNever = exports.$ZodUnknown = exports.$ZodAny = exports.$ZodNull = exports.$ZodUndefined = exports.$ZodSymbol = exports.$ZodBigIntFormat = exports.$ZodBigInt = exports.$ZodBoolean = exports.$ZodNumberFormat = exports.$ZodNumber = exports.$ZodCustomStringFormat = exports.$ZodJWT = exports.$ZodIBAN = exports.$ZodCreditCard = exports.$ZodE164 = exports.$ZodBase64URL = exports.base64urlCharset = exports.$ZodBase64 = exports.base64Charset = exports.$ZodCIDRv6 = exports.$ZodCIDRv4 = exports.$ZodMAC = exports.$ZodIPv6 = exports.$ZodIPv4 = exports.$ZodISODuration = exports.$ZodISOTime = exports.$ZodISODate = exports.$ZodISODateTime = exports.$ZodKSUID = exports.$ZodXID = exports.$ZodULID = exports.$ZodCUID2 = exports.$ZodCUID = exports.$ZodNanoID = exports.$ZodEmoji = exports.$ZodURL = exports.URL_UNPARSEABLE = exports.URL_BAD_FORMAT = exports.$ZodEmail = exports.$ZodUUID = exports.$ZodGUID = exports.$ZodStringFormat = exports.$ZodString = exports.clone = exports.$ZodType = void 0;
exports.$ZodCustom = exports.$ZodLazy = exports.$ZodPromise = exports.$ZodFunction = exports.$ZodTemplateLiteral = exports.$ZodReadonly = exports.$ZodPreprocess = exports.$ZodCodec = exports.$ZodPipe = exports.$ZodNaN = exports.$ZodCatch = exports.$ZodSuccess = exports.$ZodNonOptional = exports.$ZodPrefault = exports.$ZodDefault = exports.$ZodNullable = exports.$ZodExactOptional = exports.$ZodOptional = exports.$ZodTransform = exports.$ZodFile = exports.$ZodLiteral = exports.$ZodEnum = exports.$ZodSet = exports.$ZodMap = exports.$ZodRecord = exports.$ZodTuple = exports.$ZodIntersection = exports.$ZodDiscriminatedUnion = exports.$ZodXor = exports.$ZodUnion = exports.$ZodObjectJIT = void 0;
exports.standardProps = standardProps;
exports.canParseURL = canParseURL;
exports.validateURL = validateURL;
exports.parseURLObject = parseURLObject;
exports.stripTabAndNewline = stripTabAndNewline;
exports.urlHostnameOk = urlHostnameOk;
exports.urlProtocolOk = urlProtocolOk;
exports.isValidIPv6 = isValidIPv6;
exports.isValidCIDRv6 = isValidCIDRv6;
exports.isValidBase64 = isValidBase64;
exports.isValidBase64URL = isValidBase64URL;
exports.isValidCreditCard = isValidCreditCard;
exports.isValidIBAN = isValidIBAN;
exports.isValidJWT = isValidJWT;
exports.getDiscriminatedOption = getDiscriminatedOption;
exports.mergeValues = mergeValues;
const checks = __importStar(require("./checks.cjs"));
const core = __importStar(require("./core.cjs"));
const doc_js_1 = require("./doc.cjs");
const parse_js_1 = require("./parse.cjs");
const regexes = __importStar(require("./regexes.cjs"));
const util = __importStar(require("./util.cjs"));
const versions_js_1 = require("./versions.cjs");
exports.$ZodType = core.$constructor("$ZodType", (inst, def) => {
    var _a;
    inst ?? (inst = {});
    inst._zod.def = def; // set _def property
    inst._zod.bag = inst._zod.bag || {}; // initialize _bag object
    inst._zod.version = versions_js_1.version;
    const defChecks = inst._zod.def.checks;
    // if inst is itself a checks.$ZodCheck, run it as a check
    const checks = inst._zod.traits.has("$ZodCheck")
        ? [inst, ...(defChecks ?? [])]
        : defChecks?.length
            ? [...defChecks]
            : [];
    for (const ch of checks) {
        for (const fn of ch._zod.onattach) {
            fn(inst);
        }
    }
    if (checks.length === 0) {
        // deferred initializer inst._zod.parse is not yet defined
        (_a = inst._zod).deferred ?? (_a.deferred = []);
        inst._zod.deferred?.push(() => {
            inst._zod.run = inst._zod.parse;
        });
    }
    else {
        const runChecks = (payload, checks, ctx) => {
            if (payload.memo)
                return payload;
            let isAborted = util.aborted(payload);
            let asyncResult;
            for (const ch of checks) {
                if (ch._zod.def.when) {
                    if (util.explicitlyAborted(payload))
                        continue;
                    const shouldRun = ch._zod.def.when(payload);
                    if (!shouldRun)
                        continue;
                }
                else if (isAborted) {
                    continue;
                }
                const currLen = payload.issues.length;
                const _ = ch._zod.check(payload);
                if (_ instanceof Promise && ctx?.async === false) {
                    throw new core.$ZodAsyncError();
                }
                if (asyncResult || _ instanceof Promise) {
                    asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
                        await _;
                        const nextLen = payload.issues.length;
                        if (nextLen === currLen)
                            return;
                        util.attachSchema(payload.issues, currLen, inst);
                        if (!isAborted)
                            isAborted = util.aborted(payload, currLen);
                    });
                }
                else {
                    const nextLen = payload.issues.length;
                    if (nextLen === currLen)
                        continue;
                    util.attachSchema(payload.issues, currLen, inst);
                    if (!isAborted)
                        isAborted = util.aborted(payload, currLen);
                }
            }
            if (asyncResult) {
                return asyncResult.then(() => {
                    return payload;
                });
            }
            return payload;
        };
        const handleCanaryResult = (canary, payload, ctx) => {
            // abort if the canary is aborted
            if (util.aborted(canary)) {
                canary.aborted = true;
                return canary;
            }
            // run checks first, then
            const checkResult = runChecks(payload, checks, ctx);
            if (checkResult instanceof Promise) {
                if (ctx.async === false)
                    throw new core.$ZodAsyncError();
                return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
            }
            return inst._zod.parse(checkResult, ctx);
        };
        inst._zod.run = (payload, ctx) => {
            if (ctx.skipChecks) {
                return inst._zod.parse(payload, ctx);
            }
            if (ctx.direction === "backward") {
                // run canary initial pass (no checks)
                const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
                if (canary instanceof Promise) {
                    return canary.then((canary) => {
                        return handleCanaryResult(canary, payload, ctx);
                    });
                }
                return handleCanaryResult(canary, payload, ctx);
            }
            // forward
            const result = inst._zod.parse(payload, ctx);
            if (result instanceof Promise) {
                if (ctx.async === false)
                    throw new core.$ZodAsyncError();
                return result.then((result) => runChecks(result, checks, ctx));
            }
            return runChecks(result, checks, ctx);
        };
    }
}, {
    // Wrappers extend this by installing a richer factory over it; reading it eagerly would defeat the laziness.
    get "~standard"() {
        return util.hide(this, "~standard", standardProps(this));
    },
    set "~standard"(value) {
        util.own(this, "~standard", value);
    },
});
/** The Standard Schema surface for `inst`. Shared so wrappers can extend it without forcing it. */
// a Standard Schema result only reports issues, so a failure finalizes them straight off the raw payload: no ZodError, and no lazy result to read through
const toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())) } : { value: r.value };
async function validateAsync(inst, value) {
    const ctx = { async: true };
    return toStandardResult((await inst._zod.run({ value, issues: [] }, ctx)), ctx);
}
function standardProps(inst) {
    return {
        validate: (value) => {
            const ctx = { async: false };
            try {
                const r = inst._zod.run({ value, issues: [] }, ctx);
                if (!(r instanceof Promise))
                    return toStandardResult(r, ctx);
            }
            catch (_) { }
            // async function so a synchronously throwing check rejects instead of escaping validate
            return validateAsync(inst, value);
        },
        vendor: "zod",
        version: 1,
    };
}
var util_js_1 = require("./util.cjs");
Object.defineProperty(exports, "clone", { enumerable: true, get: function () { return util_js_1.clone; } });
exports.$ZodString = core.$constructor("$ZodString", (inst, def) => {
    exports.$ZodType.init(inst, def);
    // a format's own pattern, else unbounded; a template literal derives the check-aware form itself
    inst._zod.pattern = def.pattern ?? regexes.anyString;
    inst._zod.parse = (payload, _) => {
        if (def.coerce)
            try {
                payload.value = String(payload.value);
            }
            catch (_) { }
        if (typeof payload.value === "string")
            return payload;
        payload.issues.push({
            expected: "string",
            code: "invalid_type",
            input: payload.value,
            inst,
        });
        return payload;
    };
});
exports.$ZodStringFormat = core.$constructor("$ZodStringFormat", (inst, def) => {
    // check initialization must come first
    checks.$ZodCheckStringFormat.init(inst, def);
    exports.$ZodString.init(inst, def);
});
exports.$ZodGUID = core.$constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.guid);
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodUUID = core.$constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
        const versionMap = {
            v1: 1,
            v2: 2,
            v3: 3,
            v4: 4,
            v5: 5,
            v6: 6,
            v7: 7,
            v8: 8,
        };
        const v = versionMap[def.version];
        if (v === undefined)
            throw new Error(`Invalid UUID version: "${def.version}"`);
        def.pattern ?? (def.pattern = regexes.uuid(v));
    }
    else
        def.pattern ?? (def.pattern = regexes.uuid());
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodEmail = core.$constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.email);
    exports.$ZodStringFormat.init(inst, def);
});
/** The `://` guard rejected the input before the URL constructor saw it. */
exports.URL_BAD_FORMAT = 1;
/** The URL parser rejected the input. */
exports.URL_UNPARSEABLE = 2;
function canParseURL(input) {
    try {
        if (typeof URL !== "undefined" && typeof URL.canParse === "function")
            return URL.canParse(input);
        new URL(input);
        return true;
    }
    catch {
        return false;
    }
}
function validateURL(trimmed, def) {
    if (!("normalize" in def) && !("hostname" in def) && !("protocol" in def)) {
        return canParseURL(trimmed) || exports.URL_UNPARSEABLE;
    }
    return parseURLObject(trimmed, def);
}
/** Parses a URL while preserving the non-normalizing HTTP guard. */
function parseURLObject(trimmed, def) {
    // When normalize is off, require :// for http/https URLs. This prevents strings like "http:example.com" or "https:/path" from being silently accepted
    if (!def.normalize && def.protocol?.source === regexes.httpProtocol.source && !/^https?:\/\//i.test(trimmed)) {
        return exports.URL_BAD_FORMAT;
    }
    try {
        if (typeof URL !== "undefined") {
            const URLStatic = URL;
            if (typeof URLStatic.parse === "function")
                return URLStatic.parse(trimmed) ?? exports.URL_UNPARSEABLE;
        }
        // @ts-ignore
        return new URL(trimmed);
    }
    catch {
        return exports.URL_UNPARSEABLE;
    }
}
const asciiTabOrNewline = /[\t\n\r]/g;
/** The URL parser deletes every ASCII tab, LF and CR from its input before it parses, so `new URL("https://exa\nmple.com")` reports on `example.com`. Applying the same deletion to the returned value closes the half of that divergence which can move the host; the parser's other rewrite, stripping C0 controls at the edges, cannot. */
function stripTabAndNewline(value) {
    return value.replace(asciiTabOrNewline, "");
}
function urlHostnameOk(url, hostname) {
    hostname.lastIndex = 0;
    return hostname.test(url.hostname);
}
function urlProtocolOk(url, protocol) {
    protocol.lastIndex = 0;
    return protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol);
}
exports.$ZodURL = core.$constructor("$ZodURL", (inst, def) => {
    exports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        try {
            // Trim whitespace from input
            const trimmed = payload.value.trim();
            const url = validateURL(trimmed, def);
            if (url === exports.URL_BAD_FORMAT) {
                payload.issues.push({
                    code: "invalid_format",
                    format: "url",
                    note: "Invalid URL format",
                    input: payload.value,
                    inst,
                    continue: !def.abort,
                });
                return;
            }
            if (url === exports.URL_UNPARSEABLE) {
                payload.issues.push({
                    code: "invalid_format",
                    format: "url",
                    input: payload.value,
                    inst,
                    continue: !def.abort,
                });
                return;
            }
            if (url === true) {
                payload.value = stripTabAndNewline(trimmed);
                return;
            }
            if (def.hostname && !urlHostnameOk(url, def.hostname)) {
                payload.issues.push({
                    code: "invalid_format",
                    format: "url",
                    note: "Invalid hostname",
                    pattern: def.hostname.source,
                    input: payload.value,
                    inst,
                    continue: !def.abort,
                });
            }
            if (def.protocol && !urlProtocolOk(url, def.protocol)) {
                payload.issues.push({
                    code: "invalid_format",
                    format: "url",
                    note: "Invalid protocol",
                    pattern: def.protocol.source,
                    input: payload.value,
                    inst,
                    continue: !def.abort,
                });
            }
            // Set the output value based on normalize flag
            payload.value = def.normalize ? url.href : stripTabAndNewline(trimmed);
            return;
        }
        catch (_) {
            payload.issues.push({
                code: "invalid_format",
                format: "url",
                input: payload.value,
                inst,
                continue: !def.abort,
            });
        }
    };
});
exports.$ZodEmoji = core.$constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.emoji());
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodNanoID = core.$constructor("$ZodNanoID", (inst, def) => {
    if (def.length !== undefined && (!Number.isInteger(def.length) || def.length < 1))
        throw new Error(`Invalid nanoid length: ${def.length}`);
    def.pattern ?? (def.pattern = def.length === undefined ? regexes.nanoid : regexes.nanoidOfLength(def.length));
    exports.$ZodStringFormat.init(inst, def);
});
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
exports.$ZodCUID = core.$constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.cuid);
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodCUID2 = core.$constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.cuid2);
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodULID = core.$constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.ulid);
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodXID = core.$constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.xid);
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodKSUID = core.$constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.ksuid);
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodISODateTime = core.$constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.datetime(def));
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodISODate = core.$constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.date);
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodISOTime = core.$constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.time(def));
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodISODuration = core.$constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.duration);
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodIPv4 = core.$constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.ipv4);
    exports.$ZodStringFormat.init(inst, def);
});
/** An IPv6 address is written with hex digits, colons and dots, and nothing else. The guard is what makes the check below an IPv6 check: `new URL("http://[...]")` parses an authority, not an address, so `@` and `\` re-delimit it and `"::@1\\"` validates against the host `0.0.0.1`. The URL parser also deletes ASCII tab, LF and CR rather than failing, which is how `"::1\n"` validated as `::1`. */
const ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
function isValidIPv6(value) {
    if (!ipv6Alphabet.test(value))
        return false;
    return canParseURL(`http://[${value}]`);
}
exports.$ZodIPv6 = core.$constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.ipv6);
    exports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (!isValidIPv6(payload.value)) {
            payload.issues.push({
                code: "invalid_format",
                format: "ipv6",
                input: payload.value,
                inst,
                continue: !def.abort,
            });
        }
    };
});
exports.$ZodMAC = core.$constructor("$ZodMAC", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.mac(def.delimiter));
    exports.$ZodStringFormat.init(inst, def);
});
exports.$ZodCIDRv4 = core.$constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.cidrv4);
    exports.$ZodStringFormat.init(inst, def);
});
function isValidCIDRv6(value) {
    const parts = value.split("/");
    if (parts.length !== 2)
        return false;
    const [address, prefix] = parts;
    if (!prefix)
        return false;
    const prefixNum = Number(prefix);
    if (`${prefixNum}` !== prefix)
        return false;
    if (prefixNum < 0 || prefixNum > 128)
        return false;
    return isValidIPv6(address);
}
exports.$ZodCIDRv6 = core.$constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.cidrv6); // not used for validation
    exports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (!isValidCIDRv6(payload.value)) {
            payload.issues.push({
                code: "invalid_format",
                format: "cidrv6",
                input: payload.value,
                inst,
                continue: !def.abort,
            });
        }
    };
});
//////////////////////////////   ZodBase64   //////////////////////////////
function isValidBase64(data) {
    if (data === "")
        return true;
    // atob ignores whitespace, so reject it up front.
    if (/\s/.test(data))
        return false;
    if (data.length % 4 !== 0)
        return false;
    try {
        // @ts-ignore
        atob(data);
        return true;
    }
    catch {
        return false;
    }
}
// lax on purpose: the quantified regexes.base64 overflows the regex stack on multi-MB input and its leading ^$| alternation leaks through template-literal composition; isValidBase64 enforces length and padding
exports.base64Charset = /^[0-9a-zA-Z+/]*={0,2}$/;
exports.$ZodBase64 = core.$constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = exports.base64Charset);
    exports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (isValidBase64(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "base64",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
//////////////////////////////   ZodBase64URL   //////////////////////////////
// lax on purpose: the quantified regexes.base64url overflows the regex stack on multi-MB input; isValidBase64 enforces length on the padded string
exports.base64urlCharset = /^[A-Za-z0-9_-]*$/;
function isValidBase64URL(data) {
    if (!exports.base64urlCharset.test(data))
        return false;
    const base64 = data.replace(/[-_]/g, (c) => (c === "-" ? "+" : "/"));
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return isValidBase64(padded);
}
exports.$ZodBase64URL = core.$constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = exports.base64urlCharset);
    exports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (isValidBase64URL(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "base64url",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
exports.$ZodE164 = core.$constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = regexes.e164);
    exports.$ZodStringFormat.init(inst, def);
});
//////////////////////////////   ZodCreditCard   //////////////////////////////
const CC_SANITIZE = /[- ]/g;
/** Luhn checksum on a digit-only string. Adapted from valibot (MIT). */
function isLuhnAlgo(digits) {
    let length = digits.length;
    let bit = 1;
    let sum = 0;
    while (length) {
        const value = digits.charCodeAt(--length) - 48;
        bit ^= 1;
        sum += bit ? [0, 2, 4, 6, 8, 1, 3, 5, 7, 9][value] : value;
    }
    return sum % 10 === 0;
}
function isValidCreditCard(input) {
    if (!regexes.creditCard.test(input))
        return false;
    return isLuhnAlgo(input.replace(CC_SANITIZE, ""));
}
exports.$ZodCreditCard = core.$constructor("$ZodCreditCard", (inst, def) => {
    // Shape only — the Luhn check below is not expressible as a pattern, so consumers of `pattern` (JSON Schema, template literals) get the length and separator rules alone.
    def.pattern ?? (def.pattern = regexes.creditCard);
    exports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (isValidCreditCard(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "credit_card",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
//////////////////////////////   ZodIBAN   //////////////////////////////
// iso 7064 mod 97-10 checksum without BigInt
function isIso7064Mod97(iban) {
    let remainder = 0;
    const len = iban.length;
    for (let i = 4; i < len; i++) {
        const code = iban.charCodeAt(i);
        remainder = (code >= 65 ? remainder * 100 + (code - 55) : remainder * 10 + (code - 48)) % 97;
    }
    for (let i = 0; i < 4; i++) {
        const code = iban.charCodeAt(i);
        remainder = (code >= 65 ? remainder * 100 + (code - 55) : remainder * 10 + (code - 48)) % 97;
    }
    return remainder === 1;
}
function isValidIBAN(input) {
    if (!regexes.iban.test(input))
        return false;
    return isIso7064Mod97(input);
}
exports.$ZodIBAN = core.$constructor("$ZodIBAN", (inst, def) => {
    // shape only — checksum is not expressible as a pattern
    def.pattern ?? (def.pattern = regexes.iban);
    exports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (isValidIBAN(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "iban",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
//////////////////////////////   ZodJWT   //////////////////////////////
function isValidJWT(token, algorithm = null) {
    try {
        const tokensParts = token.split(".");
        if (tokensParts.length !== 3)
            return false;
        const [header] = tokensParts;
        if (!header)
            return false;
        // @ts-ignore
        const parsedHeader = JSON.parse(atob(header));
        if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
            return false;
        if (!parsedHeader.alg)
            return false;
        if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
            return false;
        return true;
    }
    catch {
        return false;
    }
}
exports.$ZodJWT = core.$constructor("$ZodJWT", (inst, def) => {
    exports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (isValidJWT(payload.value, def.alg))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: "jwt",
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
exports.$ZodCustomStringFormat = core.$constructor("$ZodCustomStringFormat", (inst, def) => {
    exports.$ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
        if (def.fn(payload.value))
            return;
        payload.issues.push({
            code: "invalid_format",
            format: def.format,
            input: payload.value,
            inst,
            continue: !def.abort,
        });
    };
});
exports.$ZodNumber = core.$constructor("$ZodNumber", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.number;
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
            try {
                payload.value = Number(payload.value);
            }
            catch (_) { }
        const input = payload.value;
        if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
            return payload;
        }
        const received = typeof input === "number"
            ? Number.isNaN(input)
                ? "NaN"
                : !Number.isFinite(input)
                    ? String(input)
                    : undefined
            : undefined;
        payload.issues.push({
            expected: "number",
            code: "invalid_type",
            input,
            inst,
            ...(received ? { received } : {}),
        });
        return payload;
    };
});
exports.$ZodNumberFormat = core.$constructor("$ZodNumberFormat", (inst, def) => {
    checks.$ZodCheckNumberFormat.init(inst, def);
    exports.$ZodNumber.init(inst, def); // no format checks
});
exports.$ZodBoolean = core.$constructor("$ZodBoolean", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.boolean;
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
            try {
                payload.value = Boolean(payload.value);
            }
            catch (_) { }
        const input = payload.value;
        if (typeof input === "boolean")
            return payload;
        payload.issues.push({
            expected: "boolean",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
exports.$ZodBigInt = core.$constructor("$ZodBigInt", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.bigint;
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
            try {
                payload.value = BigInt(payload.value);
            }
            catch (_) { }
        if (typeof payload.value === "bigint")
            return payload;
        payload.issues.push({
            expected: "bigint",
            code: "invalid_type",
            input: payload.value,
            inst,
        });
        return payload;
    };
});
exports.$ZodBigIntFormat = core.$constructor("$ZodBigIntFormat", (inst, def) => {
    checks.$ZodCheckBigIntFormat.init(inst, def);
    exports.$ZodBigInt.init(inst, def); // no format checks
});
exports.$ZodSymbol = core.$constructor("$ZodSymbol", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "symbol")
            return payload;
        payload.issues.push({
            expected: "symbol",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
exports.$ZodUndefined = core.$constructor("$ZodUndefined", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.undefined;
    inst._zod.values = new Set([undefined]);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "undefined")
            return payload;
        payload.issues.push({
            expected: "undefined",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
exports.$ZodNull = core.$constructor("$ZodNull", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.pattern = regexes.null;
    inst._zod.values = new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (input === null)
            return payload;
        payload.issues.push({
            expected: "null",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
exports.$ZodAny = core.$constructor("$ZodAny", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
});
exports.$ZodUnknown = core.$constructor("$ZodUnknown", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
});
exports.$ZodNever = core.$constructor("$ZodNever", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        payload.issues.push({
            expected: "never",
            code: "invalid_type",
            input: payload.value,
            inst,
        });
        return payload;
    };
});
exports.$ZodVoid = core.$constructor("$ZodVoid", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "undefined")
            return payload;
        payload.issues.push({
            expected: "void",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
exports.$ZodDate = core.$constructor("$ZodDate", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        if (def.coerce) {
            try {
                payload.value = new Date(payload.value);
            }
            catch (_err) { }
        }
        const input = payload.value;
        const isDate = input instanceof Date;
        const isValidDate = isDate && !Number.isNaN(input.getTime());
        if (isValidDate)
            return payload;
        payload.issues.push({
            expected: "date",
            code: "invalid_type",
            input,
            ...(isDate ? { received: "Invalid Date" } : {}),
            inst,
        });
        return payload;
    };
});
function handleArrayResult(result, final, index) {
    if (result.issues.length) {
        final.issues.push(...util.prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
}
exports.$ZodArray = core.$constructor("$ZodArray", (inst, def) => {
    exports.$ZodType.init(inst, def);
    const memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
            payload.issues.push({
                expected: "array",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
        const proms = [];
        const abortEarly = ctx?.abortEarly;
        for (let i = 0; i < input.length; i++) {
            const item = input[i];
            const result = def.element._zod.run({
                value: item,
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                proms.push(result.then((result) => handleArrayResult(result, payload, i)));
            }
            else {
                handleArrayResult(result, payload, i);
                // the element's payload is authoritative here, since handleArrayResult forwards every issue; an object's is not, because it drops a failed absent optional
                if (abortEarly && result.issues.length !== 0 && util.aborted(result))
                    break;
            }
        }
        if (proms.length) {
            return Promise.all(proms).then(() => payload);
        }
        return payload; //handleArrayResultsAsync(parseResults, final);
    };
});
function handlePropertyResult(result, final, key, input, optin, optout) {
    const isPresent = key in input;
    const isOptionalOut = optout === "optional";
    // The middle rung means "absence permitted, nothing supplied in its place", so an absent key contributes nothing — whatever the schema made of `undefined` is invented, not substituted. Only `optional` reaches this with a value: `defaulted` substitutes, and a schema that isn't optional-out has to keep the key.
    if (!isPresent && isOptionalOut && optin === "optional") {
        return;
    }
    if (result.issues.length) {
        // For optional-in/out schemas, ignore errors on absent keys.
        if (optin !== undefined && isOptionalOut && !isPresent) {
            return;
        }
        final.issues.push(...util.prefixIssues(key, result.issues));
    }
    if (!isPresent && optin === undefined) {
        if (!result.issues.length) {
            final.issues.push({
                code: "invalid_type",
                expected: "nonoptional",
                input: undefined,
                path: [key],
            });
        }
        return;
    }
    if (result.value === undefined) {
        if (isPresent || (optin === "defaulted" && !isOptionalOut)) {
            final.value[key] = undefined;
        }
    }
    else {
        final.value[key] = result.value;
    }
}
// one shared instance; a fresh [] per schema cost 56 bytes retained
const NO_SYMBOL_KEYS = [];
function normalizeDef(def) {
    const keys = Object.keys(def.shape);
    const ownSymbols = Object.getOwnPropertySymbols(def.shape);
    const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
    // aliases `keys` when there are no symbols, so a string-only shape keeps one array
    const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
    for (const k of allKeys) {
        if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
            throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
        }
    }
    const okeys = util.optionalKeys(def.shape);
    return {
        ...def,
        allKeys,
        symbolKeys,
        // string-only: handleCatchall matches it against `for...in`, which never yields a symbol
        keySet: new Set(keys),
        numKeys: keys.length,
        optionalKeys: new Set(okeys),
    };
}
function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
    const unrecognized = [];
    const keySet = def.keySet;
    const _catchall = def.catchall._zod;
    const t = _catchall.def.type;
    const optin = _catchall.optin;
    const optout = _catchall.optout;
    // starts at 0, not the current length: the shape phase already ran and may have aborted
    let seen = 0;
    for (const key in input) {
        if (abortEarly && payload.issues.length !== seen) {
            if (util.aborted(payload, seen))
                break;
            seen = payload.issues.length;
        }
        // Must precede the __proto__ branch: a declared key is not unrecognized, even though the shape loop deliberately strips __proto__ from the parsed output.
        if (keySet.has(key))
            continue;
        // Don't copy an undeclared __proto__ into the result; assignment to a plain {} would replace the result prototype. But in strict mode it is still an unknown key, so report it before skipping.
        if (key === "__proto__") {
            if (t === "never")
                unrecognized.push(key);
            continue;
        }
        if (t === "never") {
            unrecognized.push(key);
            continue;
        }
        const r = _catchall.run({ value: input[key], issues: [] }, ctx);
        if (r instanceof Promise) {
            proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
        }
        else {
            handlePropertyResult(r, payload, key, input, optin, optout);
        }
    }
    if (unrecognized.length) {
        payload.issues.push({
            code: "unrecognized_keys",
            keys: unrecognized,
            input,
            inst,
            // Describes the shape of the input, not the validity of the parsed value, so it never aborts. The parse still fails; the schema's own checks just get to run first, and an enclosing intersection can reconcile the key against a sibling operand.
            continue: true,
        });
    }
    if (!proms.length)
        return payload;
    return Promise.all(proms).then(() => {
        return payload;
    });
}
exports.$ZodObject = core.$constructor("$ZodObject", (inst, def) => {
    // requires cast because technically $ZodObject doesn't extend
    exports.$ZodType.init(inst, def);
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    // a cloned def carries its source's accessor, which knows the shape it answers from; adopting that keeps the clone's keys readable without running it
    const sh = desc?.get ? desc.get.raw : (def.shape ?? {});
    if (sh) {
        // Freezes the shape on first read, so its getters resolve once and every later read sees the same schemas.
        const get = () => {
            const newSh = { ...sh };
            Object.defineProperty(def, "shape", { value: newSh });
            get.raw = newSh;
            return newSh;
        };
        get.raw = sh;
        Object.defineProperty(def, "shape", { get });
    }
    const _normalized = util.cached(() => normalizeDef(def));
    util.defineLazyInternal(inst, "propValues", (zod) => {
        const shape = zod.def.shape;
        const propValues = {};
        for (const key in shape) {
            const field = shape[key]._zod;
            if (field.values) {
                if (!Object.prototype.hasOwnProperty.call(propValues, key)) {
                    util.assignProp(propValues, key, new Set());
                }
                for (const v of field.values)
                    propValues[key].add(v);
                // An omittable slot reads back as undefined at a discriminator lookup, so it has to claim undefined: two options that can both omit the key are not discriminable on it.
                if (field.optin !== undefined)
                    propValues[key].add(undefined);
            }
        }
        return propValues;
    });
    const isObject = util.isObject;
    const catchall = def.catchall;
    let value;
    const memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject(input)) {
            payload.issues.push({
                expected: "object",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
        const proms = [];
        const shape = value.shape;
        const abortEarly = ctx?.abortEarly;
        let seen = payload.issues.length;
        for (const key of value.allKeys) {
            if (abortEarly && payload.issues.length !== seen) {
                if (util.aborted(payload, seen))
                    break;
                seen = payload.issues.length;
            }
            if (key === "__proto__")
                continue;
            const el = shape[key];
            const optin = el._zod.optin;
            const optout = el._zod.optout;
            const r = el._zod.run({ value: input[key], issues: [] }, ctx);
            if (r instanceof Promise) {
                proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
            }
            else {
                handlePropertyResult(r, payload, key, input, optin, optout);
            }
        }
        if (!catchall) {
            return proms.length ? Promise.all(proms).then(() => payload) : payload;
        }
        return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
    };
});
exports.$ZodObjectJIT = core.$constructor("$ZodObjectJIT", (inst, def) => {
    // requires cast because technically $ZodObject doesn't extend
    exports.$ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = util.cached(() => normalizeDef(def));
    const memo = core.globalConfig.memoizer;
    const generateFastpass = (shape) => {
        const normalized = _normalized.value;
        const syms = normalized.symbolKeys;
        // a symbol has no source literal, so it is read as `syms[i]` off the closed-over scope
        const doc = new doc_js_1.Doc(["payload", "ctx"], { shape, inst, memo, syms });
        const parseStr = (k) => `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
        // prefixes in place, like util.prefixIssues. newResult must land before the early return: a catchall runs after this and would otherwise write onto the caller's input
        const prefixStr = (id, k) => `
          let ${id}_ab = false;
          for (let i = 0; i < ${id}.issues.length; i++) {
            const iss = ${id}.issues[i];
            iss.path = iss.path ? [${k}, ...iss.path] : [${k}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${id}_ab = true;
          }
          if (${id}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
        doc.write(`const input = payload.value;`);
        const ids = Object.create(null);
        let counter = 0;
        for (const key of normalized.allKeys) {
            ids[key] = `key_${counter++}`;
        }
        // A: preserve key order {
        doc.write(memo ? `const newResult = memo.alloc(inst, payload, {}, ctx);` : `const newResult = {};`);
        for (const key of normalized.allKeys) {
            if (key === "__proto__")
                continue;
            const id = ids[key];
            const k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : util.esc(key);
            const isPresent = `${k} in input`;
            const schema = shape[key];
            const optin = schema?._zod?.optin;
            const isOptionalIn = optin !== undefined;
            const isOptionalOut = schema?._zod?.optout === "optional";
            doc.write(`const ${id} = ${parseStr(k)};`);
            if (isOptionalIn && isOptionalOut) {
                // For optional-in/out schemas, ignore errors on absent keys — and, like the interpreted path, drop the value produced alongside them. The middle rung goes further: it permits absence without supplying anything in its place, so an absent key contributes nothing at all.
                const assign = optin === "optional" ? `${id}_present` : `${id}.value !== undefined || ${id}_present`;
                doc.write(`
        const ${id}_present = ${isPresent};
        if (!${id}.issues.length || ${id}_present) {
          if (${id}.issues.length) {${prefixStr(id, k)}
          }

          if (${assign}) {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
            }
            else if (!isOptionalIn) {
                doc.write(`
        const ${id}_present = ${isPresent};
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${id}_present) {
          newResult[${k}] = ${id}.value;
        }

      `);
            }
            else {
                doc.write(`
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
      `);
                if (optin === "defaulted") {
                    doc.write(`newResult[${k}] = ${id}.value;`);
                }
                else {
                    doc.write(`
        if (${id}.value !== undefined || ${isPresent}) {
          newResult[${k}] = ${id}.value;
        }
      `);
                }
            }
        }
        doc.write(`payload.value = newResult;`);
        doc.write(`return payload;`);
        // closing `shape` in is what pays: turbofan specializes the parser against that one shape object, so every `shape[k]._zod.run` folds to a known callee. as a parameter it stays a generic load and measures 13% slower even with the forwarding frame gone
        return doc.compile();
    };
    let fastpass;
    const isObject = util.isObject;
    const jit = !core.globalConfig.jitless;
    const allowsEval = util.allowsEval;
    const fastEnabled = jit && allowsEval.value; // && !def.catchall;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject(input)) {
            payload.issues.push({
                expected: "object",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
            // always synchronous
            if (!fastpass)
                fastpass = generateFastpass(def.shape);
            payload = fastpass(payload, ctx);
            if (!catchall)
                return payload;
            return handleCatchall([], input, payload, ctx, value, inst, ctx?.abortEarly === true);
        }
        return superParse(payload, ctx);
    };
});
function handleUnionResults(results, final, inst, ctx) {
    for (const result of results) {
        if (result.issues.length === 0) {
            final.value = result.value;
            return final;
        }
    }
    const nonaborted = results.filter((r) => !util.aborted(r));
    if (nonaborted.length === 1) {
        final.value = nonaborted[0].value;
        return nonaborted[0];
    }
    final.issues.push({
        code: "invalid_union",
        input: final.value,
        inst,
        errors: results.map((result) => result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config()))),
    });
    return final;
}
exports.$ZodUnion = core.$constructor("$ZodUnion", (inst, def) => {
    exports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted")
        ? "defaulted"
        : zod.def.options.some((o) => o._zod.optin !== undefined)
            ? "optional"
            : undefined);
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : undefined);
    util.defineLazyInternal(inst, "values", (zod) => {
        if (zod.def.options.every((o) => o._zod.values)) {
            return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
        }
        return undefined;
    });
    util.defineLazyInternal(inst, "pattern", (zod) => {
        if (zod.def.options.every((o) => o._zod.pattern)) {
            const patterns = zod.def.options.map((o) => o._zod.pattern);
            return new RegExp(`^(${patterns.map((p) => util.cleanRegex(p.source)).join("|")})$`);
        }
        return undefined;
    });
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
        if (first) {
            return first(payload, ctx);
        }
        let async = false;
        const results = [];
        for (const option of def.options) {
            const result = option._zod.run({
                value: payload.value,
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                results.push(result);
                async = true;
            }
            else {
                if (result.issues.length === 0)
                    return result;
                results.push(result);
            }
        }
        if (!async)
            return handleUnionResults(results, payload, inst, ctx);
        return Promise.all(results).then((results) => {
            return handleUnionResults(results, payload, inst, ctx);
        });
    };
});
function handleExclusiveUnionResults(results, final, inst, ctx) {
    const matches = [];
    for (let i = 0; i < results.length; i++) {
        if (results[i].issues.length === 0)
            matches.push(i);
    }
    if (matches.length === 1) {
        final.value = results[matches[0]].value;
        return final;
    }
    if (matches.length === 0) {
        // No matches - same as regular union
        final.issues.push({
            code: "invalid_union",
            input: final.value,
            inst,
            errors: results.map((result) => result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config()))),
        });
    }
    else {
        // Multiple matches - exclusive union failure
        final.issues.push({
            code: "invalid_union",
            input: final.value,
            inst,
            errors: [],
            inclusive: false,
            matches,
        });
    }
    return final;
}
exports.$ZodXor = core.$constructor("$ZodXor", (inst, def) => {
    exports.$ZodUnion.init(inst, def);
    def.inclusive = false;
    const first = def.options.length === 1 ? def.options[0]._zod.run : null;
    inst._zod.parse = (payload, ctx) => {
        if (first) {
            return first(payload, ctx);
        }
        let async = false;
        const results = [];
        for (const option of def.options) {
            const result = option._zod.run({
                value: payload.value,
                issues: [],
            }, ctx);
            if (result instanceof Promise) {
                results.push(result);
                async = true;
            }
            else {
                results.push(result);
            }
        }
        if (!async)
            return handleExclusiveUnionResults(results, payload, inst, ctx);
        return Promise.all(results).then((results) => {
            return handleExclusiveUnionResults(results, payload, inst, ctx);
        });
    };
});
/** Returns the option whose discriminator claims `value`, or throws if ambiguous. */
function getDiscriminatedOption(union, value) {
    const internals = union._zod;
    let map = internals.bag.optionsMap;
    if (!map) {
        map = discriminatorMap(internals.def);
        internals.bag.optionsMap = map;
    }
    const option = map.get(value);
    if (option === null)
        throw new Error(`Ambiguous discriminator value "${String(value)}"`);
    return option;
}
function discriminatorMap(def) {
    const map = new Map();
    for (const option of def.options) {
        const values = option._zod.propValues?.[def.discriminator];
        if (!values || values.size === 0)
            throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
        for (const value of values) {
            if (map.has(value)) {
                if (value !== undefined)
                    throw new Error(`Duplicate discriminator value "${String(value)}"`);
                // keep the collision marked so a later member cannot reclaim it
                map.set(value, null);
            }
            else {
                map.set(value, option);
            }
        }
    }
    return map;
}
exports.$ZodDiscriminatedUnion = 
/*@__PURE__*/
core.$constructor("$ZodDiscriminatedUnion", (inst, def) => {
    def.inclusive = false;
    exports.$ZodUnion.init(inst, def);
    const _super = inst._zod.parse;
    util.defineLazyInternal(inst, "propValues", (zod) => {
        const propValues = {};
        let undefinedCount = 0;
        for (const option of zod.def.options) {
            const pv = option._zod.propValues;
            if (!pv || Object.keys(pv).length === 0)
                throw new Error(`Invalid discriminated union option at index "${zod.def.options.indexOf(option)}"`);
            if (pv[zod.def.discriminator]?.has(undefined))
                undefinedCount++;
            for (const [k, v] of Object.entries(pv)) {
                if (!Object.prototype.hasOwnProperty.call(propValues, k)) {
                    util.assignProp(propValues, k, new Set());
                }
                for (const val of v) {
                    propValues[k].add(val);
                }
            }
        }
        if (!zod.def.unionFallback && undefinedCount > 1)
            propValues[zod.def.discriminator]?.delete(undefined);
        return propValues;
    });
    // Checked now rather than in the lookup map below, so an option that lacks the discriminator fails at the `discriminatedUnion` call instead of on the first object parsed. Options whose shape cannot be enumerated without resolving it — pipes and lazies — are left to the map.
    def.options.forEach((option, i) => {
        const propShape = util.rawShape(option._zod.def);
        if (propShape && !Object.prototype.hasOwnProperty.call(propShape, def.discriminator)) {
            throw new Error(`Invalid discriminated union option at index "${i}"`);
        }
    });
    const disc = util.cached(() => discriminatorMap(def));
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!util.isObject(input)) {
            payload.issues.push({
                code: "invalid_type",
                expected: "object",
                input,
                inst,
            });
            return payload;
        }
        const value = input?.[def.discriminator];
        const opt = disc.value.get(value);
        // forward metadata cannot choose an encoder for an absent tag
        if (opt && (value !== undefined || ctx.direction !== "backward")) {
            return opt._zod.run(payload, ctx);
        }
        // Fall back to union matching when the fast discriminator path fails:
        // - explicitly enabled via unionFallback, or
        // - during backward direction (encode), since codec-based discriminators have different values in forward vs backward directions
        if (def.unionFallback || ctx.direction === "backward") {
            return _super(payload, ctx);
        }
        // no matching discriminator
        payload.issues.push({
            code: "invalid_union",
            errors: [],
            note: "No matching discriminator",
            discriminator: def.discriminator,
            options: Array.from(disc.value.keys()).filter((value) => disc.value.get(value) !== null),
            input,
            path: [def.discriminator],
            inst,
        });
        return payload;
    };
});
exports.$ZodIntersection = core.$constructor("$ZodIntersection", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        const left = def.left._zod.run({ value: input, issues: [] }, ctx);
        const right = def.right._zod.run({ value: input, issues: [] }, ctx);
        const async = left instanceof Promise || right instanceof Promise;
        if (async) {
            return Promise.all([left, right]).then(([left, right]) => {
                return handleIntersectionResults(payload, left, right);
            });
        }
        return handleIntersectionResults(payload, left, right);
    };
});
function mergeValues(a, b) {
    // const aType = parse.t(a);
    // const bType = parse.t(b);
    if (a === b) {
        return { valid: true, data: a };
    }
    if (a instanceof Date && b instanceof Date && +a === +b) {
        return { valid: true, data: a };
    }
    if (util.isPlainObject(a) && util.isPlainObject(b)) {
        const bKeys = Object.keys(b);
        const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
        const newObj = { ...a, ...b };
        if (Object.prototype.hasOwnProperty.call(newObj, "__proto__"))
            delete newObj.__proto__;
        for (const key of sharedKeys) {
            if (key === "__proto__")
                continue;
            const sharedValue = mergeValues(a[key], b[key]);
            if (!sharedValue.valid) {
                return {
                    valid: false,
                    mergeErrorPath: [key, ...sharedValue.mergeErrorPath],
                };
            }
            newObj[key] = sharedValue.data;
        }
        return { valid: true, data: newObj };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return { valid: false, mergeErrorPath: [] };
        }
        const newArray = [];
        for (let index = 0; index < a.length; index++) {
            const itemA = a[index];
            const itemB = b[index];
            const sharedValue = mergeValues(itemA, itemB);
            if (!sharedValue.valid) {
                return {
                    valid: false,
                    mergeErrorPath: [index, ...sharedValue.mergeErrorPath],
                };
            }
            newArray.push(sharedValue.data);
        }
        return { valid: true, data: newArray };
    }
    return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
    // Track which side(s) reject each key. A key rejection is reported only when BOTH sides reject it, so a key owned by one branch survives the other's key schema. strictObject reports these as unrecognized_keys; a record with an open key schema reports one invalid_key per key.
    const unrecKeys = new Map();
    let unrecIssue;
    const keyIssues = new Map();
    const collect = (iss, side) => {
        let keys;
        if (iss.code === "unrecognized_keys" && !iss.path?.length) {
            unrecIssue ?? (unrecIssue = iss);
            keys = iss.keys;
        }
        else if (iss.code === "invalid_key" && iss.origin === "record" && iss.path?.length === 1) {
            const k = String(iss.path[0]);
            if (!keyIssues.has(k))
                keyIssues.set(k, iss);
            keys = [k];
        }
        else {
            return false;
        }
        for (const k of keys) {
            if (!unrecKeys.has(k))
                unrecKeys.set(k, {});
            unrecKeys.get(k)[side] = true;
        }
        return true;
    };
    for (const iss of left.issues) {
        if (!collect(iss, "l"))
            result.issues.push(iss);
    }
    for (const iss of right.issues) {
        if (!collect(iss, "r"))
            result.issues.push(iss);
    }
    // Report only keys rejected by BOTH sides
    const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
    if (bothKeys.length) {
        const aggregated = unrecIssue ? bothKeys.filter((k) => unrecIssue.keys.includes(k)) : [];
        if (aggregated.length)
            result.issues.push({ ...unrecIssue, keys: aggregated });
        for (const k of bothKeys) {
            if (!aggregated.includes(k) && keyIssues.has(k))
                result.issues.push(keyIssues.get(k));
        }
    }
    const merged = mergeValues(left.value, right.value);
    if (!merged.valid) {
        if (util.aborted(result))
            return result;
        throw new Error(`Unmergable intersection. Error path: ` + `${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result.value = merged.data;
    return result;
}
exports.$ZodTuple = core.$constructor("$ZodTuple", (inst, def) => {
    exports.$ZodType.init(inst, def);
    const items = def.items;
    const memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
            payload.issues.push({
                input,
                inst,
                expected: "tuple",
                code: "invalid_type",
            });
            return payload;
        }
        payload.value = memo ? memo.alloc(inst, payload, [], ctx) : [];
        const proms = [];
        const optinStart = getTupleOptStart(items, "optin");
        const optoutStart = getTupleOptStart(items, "optout");
        if (!def.rest) {
            if (input.length < optinStart) {
                payload.issues.push({
                    code: "too_small",
                    minimum: optinStart,
                    inclusive: true,
                    input,
                    inst,
                    origin: "array",
                });
                return payload;
            }
            if (input.length > items.length) {
                payload.issues.push({
                    code: "too_big",
                    maximum: items.length,
                    inclusive: true,
                    input,
                    inst,
                    origin: "array",
                });
            }
        }
        // Run every item in parallel, collecting results into an indexed array. The post-processing in `handleTupleResults` walks them in order so it can decide whether an absent optional-output error can truncate the tail or must be reported to preserve required output.
        const itemResults = new Array(items.length);
        // only tracked when there is a rest loop to skip
        const abortEarly = def.rest ? ctx?.abortEarly : undefined;
        let itemAborted = false;
        for (let i = 0; i < items.length; i++) {
            const r = items[i]._zod.run({ value: input[i], issues: [] }, ctx);
            if (r instanceof Promise) {
                proms.push(r.then((rr) => {
                    itemResults[i] = rr;
                }));
            }
            else {
                itemResults[i] = r;
                if (abortEarly && !itemAborted && r.issues.length)
                    itemAborted = util.aborted(r);
            }
        }
        // sound because rest is non-empty exactly when every fixed index is present, the one case handleTupleResults cannot discard an item's issues
        if (def.rest && !itemAborted) {
            let i = items.length - 1;
            const rest = input.slice(items.length);
            let seen = payload.issues.length;
            for (const el of rest) {
                if (abortEarly && payload.issues.length !== seen) {
                    if (util.aborted(payload, seen))
                        break;
                    seen = payload.issues.length;
                }
                i++;
                const result = def.rest._zod.run({ value: el, issues: [] }, ctx);
                if (result instanceof Promise) {
                    proms.push(result.then((r) => handleTupleResult(r, payload, i)));
                }
                else {
                    handleTupleResult(result, payload, i);
                }
            }
        }
        if (proms.length) {
            return Promise.all(proms).then(() => handleTupleResults(itemResults, payload, items, input, optoutStart));
        }
        return handleTupleResults(itemResults, payload, items, input, optoutStart);
    };
});
function getTupleOptStart(items, key) {
    for (let i = items.length - 1; i >= 0; i--) {
        // optin is a three-rung ladder so any rung above `undefined` permits an absent slot; optout stays two-valued.
        const omittable = key === "optin" ? items[i]._zod.optin !== undefined : items[i]._zod.optout === "optional";
        if (!omittable)
            return i + 1;
    }
    return 0;
}
function handleTupleResult(result, final, index) {
    if (result.issues.length) {
        final.issues.push(...util.prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
}
function handleTupleResults(itemResults, final, items, input, optoutStart) {
    // Walk results in order. Mirror $ZodObject's swallow-on-absent-optional rule, but only after `optoutStart`: the first index where the output tuple tail can be absent.
    for (let i = 0; i < items.length; i++) {
        const r = itemResults[i];
        const isPresent = i < input.length;
        // The array analog of `handlePropertyResult`'s absent-key early return: the middle rung permits absence without supplying anything in its place, so the tail truncates here instead of materializing whatever the item made of `undefined`.
        if (!isPresent && i >= optoutStart && items[i]._zod.optin === "optional") {
            final.value.length = i;
            break;
        }
        if (r.issues.length) {
            if (!isPresent && i >= optoutStart) {
                final.value.length = i;
                break;
            }
            final.issues.push(...util.prefixIssues(i, r.issues));
        }
        final.value[i] = r.value;
    }
    // Drop trailing slots that produced `undefined` for absent input
    // (the array analog of an absent optional key on an object). The
    // `i >= input.length` floor is critical: an explicit `undefined`
    // *inside* the input must be preserved even when the schema is
    // optional-out (e.g. `z.string().or(z.undefined())` accepting an
    // explicit undefined value).
    for (let i = final.value.length - 1; i >= input.length; i--) {
        if (items[i]._zod.optout === "optional" && final.value[i] === undefined) {
            final.value.length = i;
        }
        else {
            break;
        }
    }
    return final;
}
exports.$ZodRecord = core.$constructor("$ZodRecord", (inst, def) => {
    exports.$ZodType.init(inst, def);
    const memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!util.isPlainObject(input)) {
            payload.issues.push({
                expected: "record",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        // no guard in either loop below: a record's invalid_key aborts but an enclosing intersection can reconcile it, so a stopped loop hides keys the sibling does not own and the intersection then rejects nothing
        const proms = [];
        const values = def.keyType._zod.values;
        if (values && !def.partial) {
            payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
            const recordKeys = new Set();
            for (const key of values) {
                if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
                    recordKeys.add(typeof key === "number" ? key.toString() : key);
                    // A declared __proto__ is stripped but is not an unrecognized key.
                    if (key === "__proto__")
                        continue;
                    const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
                    if (keyResult instanceof Promise) {
                        throw new Error("Async schemas not supported in object keys currently");
                    }
                    if (keyResult.issues.length) {
                        payload.issues.push({
                            code: "invalid_key",
                            origin: "record",
                            issues: keyResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
                            input: key,
                            path: [key],
                            inst,
                        });
                        continue;
                    }
                    const outKey = keyResult.value;
                    if (outKey === "__proto__")
                        continue;
                    const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
                    if (result instanceof Promise) {
                        proms.push(result.then((result) => {
                            if (result.issues.length) {
                                payload.issues.push(...util.prefixIssues(key, result.issues));
                            }
                            payload.value[outKey] = result.value;
                        }));
                    }
                    else {
                        if (result.issues.length) {
                            payload.issues.push(...util.prefixIssues(key, result.issues));
                        }
                        payload.value[outKey] = result.value;
                    }
                }
            }
            let unrecognized;
            for (const key in input) {
                if (!recordKeys.has(key)) {
                    if (def.mode === "loose") {
                        // skip __proto__ so it can't replace the result prototype via the assignment setter on the plain {} we build into
                        if (key === "__proto__")
                            continue;
                        payload.value[key] = input[key];
                    }
                    else {
                        unrecognized = unrecognized ?? [];
                        unrecognized.push(key);
                    }
                }
            }
            if (unrecognized && unrecognized.length > 0) {
                payload.issues.push({
                    code: "unrecognized_keys",
                    input,
                    inst,
                    keys: unrecognized,
                    continue: true,
                });
            }
        }
        else {
            payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
            // An enumerable key schema declares which keys the record owns, so a key outside the set is unrecognized. A non-enumerable one (regex, refine) is a constraint every key must satisfy, so a failing key is invalid. Only the former is reconcilable against the other side of an intersection.
            let unrecognized;
            // Reflect.ownKeys for Symbol-key support; filter non-enumerable to match z.object()
            for (const key of Reflect.ownKeys(input)) {
                if (key === "__proto__")
                    continue;
                if (!Object.prototype.propertyIsEnumerable.call(input, key))
                    continue;
                let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
                if (keyResult instanceof Promise) {
                    throw new Error("Async schemas not supported in object keys currently");
                }
                // Numeric string fallback: if key is a numeric string and failed, retry with Number(key). This handles z.number(), z.literal([1, 2, 3]), and unions containing numeric literals
                const checkNumericKey = typeof key === "string" && regexes.number.test(key) && keyResult.issues.length;
                if (checkNumericKey) {
                    const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
                    if (retryResult instanceof Promise) {
                        throw new Error("Async schemas not supported in object keys currently");
                    }
                    if (retryResult.issues.length === 0) {
                        keyResult = retryResult;
                    }
                }
                if (keyResult.issues.length) {
                    if (def.mode === "loose") {
                        // Pass through unchanged
                        payload.value[key] = input[key];
                    }
                    else if (values) {
                        unrecognized = unrecognized ?? [];
                        unrecognized.push(key);
                    }
                    else {
                        // Default "strict" behavior: error on invalid key
                        payload.issues.push({
                            code: "invalid_key",
                            origin: "record",
                            issues: keyResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
                            input: key,
                            path: [key],
                            inst,
                        });
                    }
                    continue;
                }
                // the guard above tests the raw input key, but the key schema can normalize an ordinary key into __proto__; re-check the key we actually write under
                const outKey = keyResult.value;
                if (outKey === "__proto__")
                    continue;
                const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
                if (result instanceof Promise) {
                    proms.push(result.then((result) => {
                        if (result.issues.length) {
                            payload.issues.push(...util.prefixIssues(key, result.issues));
                        }
                        payload.value[outKey] = result.value;
                    }));
                }
                else {
                    if (result.issues.length) {
                        payload.issues.push(...util.prefixIssues(key, result.issues));
                    }
                    payload.value[outKey] = result.value;
                }
            }
            if (unrecognized && unrecognized.length > 0) {
                payload.issues.push({
                    code: "unrecognized_keys",
                    input,
                    inst,
                    keys: unrecognized,
                    continue: true,
                });
            }
        }
        if (proms.length) {
            return Promise.all(proms).then(() => payload);
        }
        return payload;
    };
});
exports.$ZodMap = core.$constructor("$ZodMap", (inst, def) => {
    exports.$ZodType.init(inst, def);
    const memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!(input instanceof Map)) {
            payload.issues.push({
                expected: "map",
                code: "invalid_type",
                input,
                inst,
            });
            return payload;
        }
        const proms = [];
        payload.value = memo ? memo.alloc(inst, payload, new Map(), ctx) : new Map();
        const abortEarly = ctx?.abortEarly;
        let seen = payload.issues.length;
        for (const [key, value] of input) {
            if (abortEarly && payload.issues.length !== seen) {
                if (util.aborted(payload, seen))
                    break;
                seen = payload.issues.length;
            }
            const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
            const valueResult = def.valueType._zod.run({ value: value, issues: [] }, ctx);
            if (keyResult instanceof Promise || valueResult instanceof Promise) {
                proms.push(Promise.all([keyResult, valueResult]).then(([keyResult, valueResult]) => {
                    handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
                }));
            }
            else {
                handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
            }
        }
        if (proms.length)
            return Promise.all(proms).then(() => payload);
        return payload;
    };
});
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
    if (keyResult.issues.length) {
        if (util.propertyKeyTypes.has(typeof key)) {
            final.issues.push(...util.prefixIssues(key, keyResult.issues));
        }
        else {
            final.issues.push({
                code: "invalid_key",
                origin: "map",
                input,
                inst,
                issues: keyResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
            });
        }
    }
    if (valueResult.issues.length) {
        if (util.propertyKeyTypes.has(typeof key)) {
            final.issues.push(...util.prefixIssues(key, valueResult.issues));
        }
        else {
            final.issues.push({
                origin: "map",
                code: "invalid_element",
                input,
                inst,
                key: key,
                issues: valueResult.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
            });
        }
    }
    final.value.set(keyResult.value, valueResult.value);
}
exports.$ZodSet = core.$constructor("$ZodSet", (inst, def) => {
    exports.$ZodType.init(inst, def);
    const memo = core.globalConfig.memoizer;
    memo?.attach(inst);
    inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!(input instanceof Set)) {
            payload.issues.push({
                input,
                inst,
                expected: "set",
                code: "invalid_type",
            });
            return payload;
        }
        const proms = [];
        payload.value = memo ? memo.alloc(inst, payload, new Set(), ctx) : new Set();
        const abortEarly = ctx?.abortEarly;
        let seen = payload.issues.length;
        for (const item of input) {
            if (abortEarly && payload.issues.length !== seen) {
                if (util.aborted(payload, seen))
                    break;
                seen = payload.issues.length;
            }
            const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
            if (result instanceof Promise) {
                proms.push(result.then((result) => handleSetResult(result, payload)));
            }
            else
                handleSetResult(result, payload);
        }
        if (proms.length)
            return Promise.all(proms).then(() => payload);
        return payload;
    };
});
function handleSetResult(result, final) {
    if (result.issues.length) {
        final.issues.push(...result.issues);
    }
    final.value.add(result.value);
}
exports.$ZodEnum = core.$constructor("$ZodEnum", (inst, def) => {
    exports.$ZodType.init(inst, def);
    const values = util.getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    util.defineLazyInternal(inst, "pattern", (zod) => {
        const patternValues = util.getEnumValues(zod.def.entries).filter((k) => util.propertyKeyTypes.has(typeof k));
        // unmatchable fallback, RE2-safe: an empty alternation would compile to /^()$/, which matches ""
        return new RegExp(patternValues.length ? `^(${patternValues.map((o) => util.escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
    });
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (valuesSet.has(input)) {
            return payload;
        }
        payload.issues.push({
            code: "invalid_value",
            values,
            input,
            inst,
        });
        return payload;
    };
});
exports.$ZodLiteral = core.$constructor("$ZodLiteral", (inst, def) => {
    exports.$ZodType.init(inst, def);
    const values = new Set(def.values);
    inst._zod.values = values;
    util.defineLazyInternal(inst, "pattern", (zod) => {
        const vals = zod.def.values;
        // unmatchable fallback, RE2-safe: an empty alternation would compile to /^()$/, which matches ""
        return new RegExp(vals.length
            ? `^(${vals
                .map((o) => typeof o === "string" ? util.escapeRegex(o) : o ? util.escapeRegex(o.toString()) : String(o))
                .join("|")})$`
            : "^[^\\s\\S]$");
    });
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (values.has(input)) {
            return payload;
        }
        payload.issues.push({
            code: "invalid_value",
            values: def.values,
            input,
            inst,
        });
        return payload;
    };
});
exports.$ZodFile = core.$constructor("$ZodFile", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        // @ts-ignore
        if (input instanceof File)
            return payload;
        payload.issues.push({
            expected: "file",
            code: "invalid_type",
            input,
            inst,
        });
        return payload;
    };
});
exports.$ZodTransform = core.$constructor("$ZodTransform", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.optin = "optional";
    core.globalConfig.memoizer?.guard(inst);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            throw new core.$ZodEncodeError(inst.constructor.name);
        }
        const _out = def.transform(payload.value, payload);
        if (ctx.async) {
            const output = _out instanceof Promise ? _out : Promise.resolve(_out);
            return output.then((output) => {
                payload.value = output;
                return payload;
            });
        }
        if (_out instanceof Promise) {
            throw new core.$ZodAsyncError();
        }
        payload.value = _out;
        return payload;
    };
});
function handleOptionalResult(payload, result) {
    // A substituting schema that still failed has no usable answer; yield undefined. Its issues are simply dropped: it ran on a payload of its own, so there is no shared array to truncate and nothing of the caller's to lose with it.
    payload.value = result.issues.length ? undefined : result.value;
    return payload;
}
exports.$ZodOptional = core.$constructor("$ZodOptional", (inst, def) => {
    exports.$ZodType.init(inst, def);
    // .optional() propagates absence rather than substituting for it, so a defaulted inner keeps its rung.
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
    inst._zod.optout = "optional";
    util.defineLazyInternal(inst, "values", (zod) => {
        const values = zod.def.innerType._zod.values;
        return values ? new Set([...values, undefined]) : undefined;
    });
    util.defineLazyInternal(inst, "pattern", (zod) => {
        const pattern = zod.def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${util.cleanRegex(pattern.source)})?$`) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
        if (payload.value === undefined) {
            // Only the top rung substitutes a value for absence; everything else leaves it intact, which is what .optional() means.
            if (def.innerType._zod.optin !== "defaulted")
                return payload;
            // Its own payload, for the same reason $ZodCatch gets one: a pipe forwards an unrecognized key through the caller's issues array, and this must not read that as the substituting schema failing and drop it.
            const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
            if (result instanceof Promise)
                return result.then((result) => handleOptionalResult(payload, result));
            return handleOptionalResult(payload, result);
        }
        return def.innerType._zod.run(payload, ctx);
    };
});
exports.$ZodExactOptional = core.$constructor("$ZodExactOptional", (inst, def) => {
    // Call parent init - inherits optin/optout = "optional"
    exports.$ZodOptional.init(inst, def);
    // Override values/pattern to NOT add undefined
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    util.defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
    // Override parse to just delegate (no undefined handling)
    inst._zod.parse = (payload, ctx) => {
        return def.innerType._zod.run(payload, ctx);
    };
});
exports.$ZodNullable = core.$constructor("$ZodNullable", (inst, def) => {
    exports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
    util.defineLazyInternal(inst, "pattern", (zod) => {
        const pattern = zod.def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${util.cleanRegex(pattern.source)}|null)$`) : undefined;
    });
    util.defineLazyInternal(inst, "values", (zod) => {
        return zod.def.innerType._zod.values ? new Set([...zod.def.innerType._zod.values, null]) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
        // Forward direction (decode): allow null to pass through
        if (payload.value === null)
            return payload;
        return def.innerType._zod.run(payload, ctx);
    };
});
exports.$ZodDefault = core.$constructor("$ZodDefault", (inst, def) => {
    exports.$ZodType.init(inst, def);
    // inst._zod.qin = "true";
    inst._zod.optin = "defaulted";
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        // Forward direction (decode): apply defaults for undefined input
        if (payload.value === undefined) {
            payload.value = def.defaultValue;
            /**
             * $ZodDefault returns the default value immediately in forward direction.
             * It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
            return payload;
        }
        // Forward direction: continue with default handling
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => handleDefaultResult(result, def));
        }
        return handleDefaultResult(result, def);
    };
});
function handleDefaultResult(payload, def) {
    if (payload.value === undefined) {
        payload.value = def.defaultValue;
    }
    return payload;
}
exports.$ZodPrefault = core.$constructor("$ZodPrefault", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.optin = "defaulted";
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        // Forward direction (decode): apply prefault for undefined input
        if (payload.value === undefined) {
            payload.value = def.defaultValue;
        }
        return def.innerType._zod.run(payload, ctx);
    };
});
exports.$ZodNonOptional = core.$constructor("$ZodNonOptional", (inst, def) => {
    exports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "values", (zod) => {
        const v = zod.def.innerType._zod.values;
        return v ? new Set([...v].filter((x) => x !== undefined)) : undefined;
    });
    inst._zod.parse = (payload, ctx) => {
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => handleNonOptionalResult(result, inst));
        }
        return handleNonOptionalResult(result, inst);
    };
});
function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === undefined) {
        payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: payload.value,
            inst,
        });
    }
    return payload;
}
exports.$ZodSuccess = core.$constructor("$ZodSuccess", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            throw new core.$ZodEncodeError("ZodSuccess");
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then((result) => {
                payload.value = result.issues.length === 0;
                return payload;
            });
        }
        payload.value = result.issues.length === 0;
        return payload;
    };
});
function handleCatchResult(payload, result, def, ctx) {
    if (!result.issues.length) {
        payload.value = result.value;
        // The value carries up, so the flag describing it has to carry with it: a back-edge into a node still being parsed must not be frozen by an enclosing readonly, and its checks belong to the node itself. Guarded so the ordinary case adds no own property.
        if (result.memo)
            payload.memo = true;
        return payload;
    }
    // Spread the inner's own payload, not ours: `value` has to stay the input the catch was handed, and the inner ran on a payload of its own so its issues are already private to this call.
    payload.value = def.catchValue({
        ...result,
        value: payload.value,
        error: {
            issues: result.issues.map((iss) => util.finalizeIssue(iss, ctx, core.config())),
        },
        input: payload.value,
    });
    return payload;
}
exports.$ZodCatch = core.$constructor("$ZodCatch", (inst, def) => {
    exports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        // Forward direction (decode): apply catch logic
        const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
        if (result instanceof Promise) {
            return result.then((result) => handleCatchResult(payload, result, def, ctx));
        }
        return handleCatchResult(payload, result, def, ctx);
    };
});
exports.$ZodNaN = core.$constructor("$ZodNaN", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
            payload.issues.push({
                input: payload.value,
                inst,
                expected: "nan",
                code: "invalid_type",
            });
            return payload;
        }
        return payload;
    };
});
exports.$ZodPipe = core.$constructor("$ZodPipe", (inst, def) => {
    exports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
    util.defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            const right = def.out._zod.run(payload, ctx);
            if (right instanceof Promise) {
                return right.then((right) => handlePipeResult(right, def.in, ctx));
            }
            return handlePipeResult(right, def.in, ctx);
        }
        const left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) {
            return left.then((left) => handlePipeResult(left, def.out, ctx));
        }
        return handlePipeResult(left, def.out, ctx);
    };
});
function handlePipeResult(left, next, ctx) {
    // Any issue stops the pipe, so a failing refinement never feeds its transform. An unrecognized key is the exception: it describes the input's extra properties, not the value being piped, and an enclosing intersection may yet reconcile it.
    if (left.issues.some((iss) => iss.code !== "unrecognized_keys")) {
        // prevent further checks
        left.aborted = true;
        return left;
    }
    return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
exports.$ZodCodec = core.$constructor("$ZodCodec", (inst, def) => {
    exports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
    util.defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
        const direction = ctx.direction || "forward";
        if (direction === "forward") {
            const left = def.in._zod.run(payload, ctx);
            if (left instanceof Promise) {
                return left.then((left) => handleCodecAResult(left, def, ctx));
            }
            return handleCodecAResult(left, def, ctx);
        }
        else {
            const right = def.out._zod.run(payload, ctx);
            if (right instanceof Promise) {
                return right.then((right) => handleCodecAResult(right, def, ctx));
            }
            return handleCodecAResult(right, def, ctx);
        }
    };
});
function handleCodecAResult(result, def, ctx) {
    if (result.issues.length) {
        // prevent further checks
        result.aborted = true;
        return result;
    }
    const direction = ctx.direction || "forward";
    if (direction === "forward") {
        const transformed = def.transform(result.value, result);
        if (transformed instanceof Promise) {
            return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
        }
        return handleCodecTxResult(result, transformed, def.out, ctx);
    }
    else {
        const transformed = def.reverseTransform(result.value, result);
        if (transformed instanceof Promise) {
            return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
        }
        return handleCodecTxResult(result, transformed, def.in, ctx);
    }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
    // Check if transform added any issues
    if (left.issues.length) {
        left.aborted = true;
        return left;
    }
    return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
exports.$ZodPreprocess = core.$constructor("$ZodPreprocess", (inst, def) => {
    exports.$ZodPipe.init(inst, def);
});
exports.$ZodReadonly = core.$constructor("$ZodReadonly", (inst, def) => {
    exports.$ZodType.init(inst, def);
    util.defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
    util.defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
    util.defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
    util.defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
    inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
            return def.innerType._zod.run(payload, ctx);
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
            return result.then(handleReadonlyResult);
        }
        return handleReadonlyResult(result);
    };
});
function handleReadonlyResult(payload) {
    // A repeat visit hands back a node that is still being built; freezing it here would make the rest of its keys fail to assign.
    if (!payload.memo)
        payload.value = Object.freeze(payload.value);
    return payload;
}
// a leaf's pattern source with its own checks folded in: the last pattern-carrying check wins, else length bounds narrow the catch-all, else an integer format narrows the number form. the fold lives here instead of on `_zod.pattern` so a bundle without template literals never pays for it
function leafPattern(schema) {
    const def = schema._zod.def;
    let pattern = def.pattern;
    let isInt = !!def.format?.includes("int");
    let minimum;
    let maximum;
    for (const ch of def.checks ?? []) {
        const d = ch._zod.def;
        if (d.pattern)
            pattern = d.pattern;
        isInt || (isInt = !!d.format?.includes("int"));
        const lo = d.minimum ?? d.length;
        const hi = d.maximum ?? d.length;
        if (lo !== undefined && (minimum === undefined || lo > minimum))
            minimum = lo;
        if (hi !== undefined && (maximum === undefined || hi < maximum))
            maximum = hi;
    }
    if (pattern)
        return pattern.source;
    // an empty range matches nothing at runtime, and `{8,5}` is not a legal quantifier
    if (minimum !== undefined && maximum !== undefined && minimum > maximum)
        return "(?!)";
    if (minimum !== undefined || maximum !== undefined)
        return regexes.string({ minimum, maximum }).source;
    const own = schema._zod.pattern;
    return (isInt && own === regexes.number ? regexes.integer : own)?.source;
}
// a part's pattern source. a wrapper's pattern embeds its inner pattern's source verbatim, so the folded form is substituted in place without knowing the wrapper's own composition; a union's options are joined the way the union builds its own pattern
function partPattern(schema) {
    const def = schema._zod.def;
    const own = schema._zod.pattern?.source;
    // lazy resolves its inner on the internals, not the def
    const inner = def.innerType ?? schema._zod.innerType;
    if (inner) {
        const before = inner._zod.pattern?.source;
        const after = partPattern(inner);
        if (own && before && after && after !== before) {
            return own.replace(util.cleanRegex(before), () => util.cleanRegex(after));
        }
        return own;
    }
    if (def.options) {
        const sources = def.options.map(partPattern);
        if (sources.every(Boolean))
            return `^(${sources.map((s) => util.cleanRegex(s)).join("|")})$`;
    }
    return leafPattern(schema);
}
exports.$ZodTemplateLiteral = core.$constructor("$ZodTemplateLiteral", (inst, def) => {
    exports.$ZodType.init(inst, def);
    const regexParts = [];
    for (const part of def.parts) {
        if (typeof part === "object" && part !== null) {
            // is Zod schema
            const source = partPattern(part);
            if (!source) {
                throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
            }
            regexParts.push(util.cleanRegex(source));
        }
        else if (part === null || util.primitiveTypes.has(typeof part)) {
            regexParts.push(util.escapeRegex(`${part}`));
        }
        else {
            throw new Error(`Invalid template literal part: ${part}`);
        }
    }
    inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
    inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "string") {
            payload.issues.push({
                input: payload.value,
                inst,
                expected: "string",
                code: "invalid_type",
            });
            return payload;
        }
        inst._zod.pattern.lastIndex = 0;
        if (!inst._zod.pattern.test(payload.value)) {
            payload.issues.push({
                input: payload.value,
                inst,
                code: "invalid_format",
                format: def.format ?? "template_literal",
                pattern: inst._zod.pattern.source,
            });
            return payload;
        }
        return payload;
    };
});
exports.$ZodFunction = core.$constructor("$ZodFunction", (inst, def) => {
    exports.$ZodType.init(inst, def);
    // Defined, not assigned: the classic prototype exposes `_def` as a getter with no setter.
    Object.defineProperty(inst, "_def", { value: def });
    inst._zod.def = def;
    inst.implement = (func) => {
        if (typeof func !== "function") {
            throw new Error("implement() must be called with a function");
        }
        // Defined inline so the closure stays anonymous: binding it to a `const` first names it, which costs 256 bytes per implemented function.
        return Object.defineProperty(function (...args) {
            const parsedArgs = inst._def.input ? (0, parse_js_1.parse)(inst._def.input, args) : args;
            const result = Reflect.apply(func, this, parsedArgs);
            if (inst._def.output) {
                return (0, parse_js_1.parse)(inst._def.output, result);
            }
            return result;
        }, "_zod", { value: inst._zod, enumerable: false });
    };
    inst.implementAsync = (func) => {
        if (typeof func !== "function") {
            throw new Error("implementAsync() must be called with a function");
        }
        return Object.defineProperty(async function (...args) {
            const parsedArgs = inst._def.input ? await (0, parse_js_1.parseAsync)(inst._def.input, args) : args;
            const result = await Reflect.apply(func, this, parsedArgs);
            if (inst._def.output) {
                return await (0, parse_js_1.parseAsync)(inst._def.output, result);
            }
            return result;
        }, "_zod", { value: inst._zod, enumerable: false });
    };
    inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "function") {
            payload.issues.push({
                code: "invalid_type",
                expected: "function",
                input: payload.value,
                inst,
            });
            return payload;
        }
        // Check if output is a promise type to determine if we should use async implementation
        const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
        if (hasPromiseOutput) {
            payload.value = inst.implementAsync(payload.value);
        }
        else {
            payload.value = inst.implement(payload.value);
        }
        return payload;
    };
    inst.input = (...args) => {
        const F = inst.constructor;
        if (Array.isArray(args[0])) {
            return new F({
                type: "function",
                input: new exports.$ZodTuple({
                    type: "tuple",
                    items: args[0],
                    rest: args[1],
                }),
                output: inst._def.output,
            });
        }
        return new F({
            type: "function",
            input: args[0],
            output: inst._def.output,
        });
    };
    inst.output = (output) => {
        const F = inst.constructor;
        return new F({
            type: "function",
            input: inst._def.input,
            output,
        });
    };
    return inst;
});
exports.$ZodPromise = core.$constructor("$ZodPromise", (inst, def) => {
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
        return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
    };
});
exports.$ZodLazy = core.$constructor("$ZodLazy", (inst, def) => {
    exports.$ZodType.init(inst, def);
    // Cache the resolved inner type on the shared `def` so all clones of this lazy (e.g. via `.describe()`/`.meta()`) share the same inner instance, preserving identity for cycle detection on recursive schemas.
    util.defineLazy(inst._zod, "innerType", () => {
        const d = def;
        if (!d._cachedInner)
            d._cachedInner = def.getter();
        return d._cachedInner;
    });
    util.defineLazyInternal(inst, "pattern", (zod) => zod.innerType?._zod?.pattern);
    util.defineLazyInternal(inst, "propValues", (zod) => zod.innerType?._zod?.propValues);
    util.defineLazyInternal(inst, "optin", (zod) => zod.innerType?._zod?.optin ?? undefined);
    util.defineLazyInternal(inst, "optout", (zod) => zod.innerType?._zod?.optout ?? undefined);
    inst._zod.parse = (payload, ctx) => {
        const inner = inst._zod.innerType;
        return inner._zod.run(payload, ctx);
    };
});
exports.$ZodCustom = core.$constructor("$ZodCustom", (inst, def) => {
    checks.$ZodCheck.init(inst, def);
    exports.$ZodType.init(inst, def);
    inst._zod.parse = (payload, _) => {
        return payload;
    };
    inst._zod.check = (payload) => {
        const input = payload.value;
        const r = def.fn(input);
        if (r instanceof Promise) {
            return r.then((r) => handleRefineResult(r, payload, input, inst));
        }
        handleRefineResult(r, payload, input, inst);
        return;
    };
});
function handleRefineResult(result, payload, input, inst) {
    if (!result) {
        const _iss = {
            code: "custom",
            input,
            inst, // incorporates params.error into issue reporting
            path: [...(inst._zod.def.path ?? [])], // incorporates params.error into issue reporting
            continue: !inst._zod.def.abort,
            // params: inst._zod.def.params,
        };
        if (inst._zod.def.params)
            _iss.params = inst._zod.def.params;
        payload.issues.push(util.issue(_iss));
    }
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
