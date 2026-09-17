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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodIntersection = exports.ZodDiscriminatedUnion = exports.ZodXor = exports.ZodUnion = exports.ZodObject = exports.ZodArray = exports.ZodDate = exports.ZodVoid = exports.ZodNever = exports.ZodUnknown = exports.ZodAny = exports.ZodNull = exports.ZodUndefined = exports.ZodSymbol = exports.ZodBigIntFormat = exports.ZodBigInt = exports.ZodBoolean = exports.ZodNumberFormat = exports.ZodNumber = exports.ZodCustomStringFormat = exports.ZodJWT = exports.ZodIBAN = exports.ZodCreditCard = exports.ZodE164 = exports.ZodBase64URL = exports.ZodBase64 = exports.ZodCIDRv6 = exports.ZodCIDRv4 = exports.ZodIPv6 = exports.ZodMAC = exports.ZodIPv4 = exports.ZodKSUID = exports.ZodXID = exports.ZodULID = exports.ZodCUID2 = exports.ZodCUID = exports.ZodNanoID = exports.ZodEmoji = exports.ZodURL = exports.ZodUUID = exports.ZodGUID = exports.ZodEmail = exports.ZodISODuration = exports.ZodISOTime = exports.ZodISODate = exports.ZodISODateTime = exports.ZodStringFormat = exports.ZodString = exports._ZodString = exports.ZodType = void 0;
exports.stringbool = exports.ZodInstanceOf = exports.meta = exports.describe = exports.ZodCustom = exports.ZodFunction = exports.ZodPromise = exports.ZodLazy = exports.ZodTemplateLiteral = exports.ZodReadonly = exports.ZodPreprocess = exports.ZodCodec = exports.ZodPipe = exports.ZodNaN = exports.ZodCatch = exports.ZodSuccess = exports.ZodNonOptional = exports.ZodPrefault = exports.ZodDefault = exports.ZodNullable = exports.ZodExactOptional = exports.ZodOptional = exports.ZodTransform = exports.ZodFile = exports.ZodLiteral = exports.ZodEnum = exports.ZodSet = exports.ZodMap = exports.ZodRecord = exports.ZodTuple = void 0;
exports.string = string;
exports.email = email;
exports.guid = guid;
exports.uuid = uuid;
exports.uuidv4 = uuidv4;
exports.uuidv6 = uuidv6;
exports.uuidv7 = uuidv7;
exports.url = url;
exports.httpUrl = httpUrl;
exports.emoji = emoji;
exports.nanoid = nanoid;
exports.cuid = cuid;
exports.cuid2 = cuid2;
exports.ulid = ulid;
exports.xid = xid;
exports.ksuid = ksuid;
exports.ipv4 = ipv4;
exports.mac = mac;
exports.ipv6 = ipv6;
exports.cidrv4 = cidrv4;
exports.cidrv6 = cidrv6;
exports.base64 = base64;
exports.base64url = base64url;
exports.e164 = e164;
exports.creditCard = creditCard;
exports.iban = iban;
exports.jwt = jwt;
exports.stringFormat = stringFormat;
exports.hostname = hostname;
exports.hex = hex;
exports.currencyCode = currencyCode;
exports.hash = hash;
exports.number = number;
exports.int = int;
exports.float32 = float32;
exports.float64 = float64;
exports.int32 = int32;
exports.uint32 = uint32;
exports.boolean = boolean;
exports.bigint = bigint;
exports.int64 = int64;
exports.uint64 = uint64;
exports.symbol = symbol;
exports.undefined = _undefined;
exports.null = _null;
exports.any = any;
exports.unknown = unknown;
exports.never = never;
exports.void = _void;
exports.date = date;
exports.array = array;
exports.keyof = keyof;
exports.object = object;
exports.strictObject = strictObject;
exports.looseObject = looseObject;
exports.union = union;
exports.xor = xor;
exports.discriminatedUnion = discriminatedUnion;
exports.intersection = intersection;
exports.tuple = tuple;
exports.record = record;
exports.partialRecord = partialRecord;
exports.looseRecord = looseRecord;
exports.map = map;
exports.set = set;
exports.enum = _enum;
exports.nativeEnum = nativeEnum;
exports.literal = literal;
exports.file = file;
exports.transform = transform;
exports.optional = optional;
exports.exactOptional = exactOptional;
exports.nullable = nullable;
exports.nullish = nullish;
exports._default = _default;
exports.prefault = prefault;
exports.nonoptional = nonoptional;
exports.success = success;
exports.catch = _catch;
exports.nan = nan;
exports.pipe = pipe;
exports.codec = codec;
exports.invertCodec = invertCodec;
exports.readonly = readonly;
exports.templateLiteral = templateLiteral;
exports.lazy = lazy;
exports.promise = promise;
exports._function = _function;
exports.function = _function;
exports._function = _function;
exports.function = _function;
exports.check = check;
exports.custom = custom;
exports.refine = refine;
exports.superRefine = superRefine;
exports.instanceof = _instanceof;
exports.json = json;
exports.preprocess = preprocess;
const core = __importStar(require("../core/index.cjs"));
const index_js_1 = require("../core/index.cjs");
const processors = __importStar(require("../core/json-schema-processors.cjs"));
const regexes = __importStar(require("../core/regexes.cjs"));
const to_json_schema_js_1 = require("../core/to-json-schema.cjs");
const en_js_1 = __importDefault(require("../locales/en.cjs"));
const checks = __importStar(require("./checks.cjs"));
const parse = __importStar(require("./parse.cjs"));
// Register English as the default locale on first ZodType construction. Hooked into the `ZodType` `$constructor` (rather than a top-level `config(en())` in `external.ts`) so bundlers honoring `sideEffects: false` can't tree-shake it out — see #5953, #5725. An explicit `z.config(z.locales.xx())` call wins regardless of order, since this only sets the default when none is present.
function _ensureDefaultLocale() {
    if (!core.globalConfig.localeError)
        core.config((0, en_js_1.default)());
}
// the default memoizer is read by the core container init, which runs before `ZodType.init`, so each container calls this first
function _ensureDefaultMemoizer() {
    if (!core.globalConfig.memoizer)
        core.config({ memoizer: core.memoizer() });
}
exports.ZodType = core.$constructor("ZodType", (inst, def) => {
    _ensureDefaultLocale();
    core.$ZodType.init(inst, def);
    inst.def = def;
    inst.type = def.type;
    return inst;
}, {
    check(...chks) {
        const def = this.def;
        return this.clone(index_js_1.util.mergeDefs(def, {
            checks: [
                ...(def.checks ?? []),
                ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch),
            ],
        }), { parent: true });
    },
    with(...chks) {
        return this.check(...chks);
    },
    clone(def, params) {
        return core.clone(this, def, params);
    },
    brand() {
        return this;
    },
    register(reg, meta) {
        reg.add(this, meta);
        return this;
    },
    refine(check, params) {
        return this.check(refine(check, params));
    },
    superRefine(refinement, params) {
        return this.check(superRefine(refinement, params));
    },
    overwrite(fn) {
        return this.check(checks.overwrite(fn));
    },
    optional() {
        return optional(this);
    },
    exactOptional() {
        return exactOptional(this);
    },
    nullable() {
        return nullable(this);
    },
    nullish() {
        return optional(nullable(this));
    },
    nonoptional(params) {
        return nonoptional(this, params);
    },
    array() {
        return array(this);
    },
    or(arg) {
        return union([this, arg]);
    },
    and(arg) {
        return intersection(this, arg);
    },
    transform(tx) {
        return pipe(this, transform(tx));
    },
    default(d) {
        return _default(this, d);
    },
    prefault(d) {
        return prefault(this, d);
    },
    catch(params) {
        return _catch(this, params);
    },
    pipe(target) {
        return pipe(this, target);
    },
    readonly() {
        return readonly(this);
    },
    describe(description) {
        const cl = this.clone();
        core.globalRegistry.add(cl, { description });
        return cl;
    },
    meta(...args) {
        // overloaded: meta() returns the registered metadata, meta(data) returns a clone with `data` registered. The mapped type picks up the second overload, so we accept variadic any-args and return `any` to satisfy both at runtime.
        if (args.length === 0)
            return core.globalRegistry.get(this);
        const cl = this.clone();
        core.globalRegistry.add(cl, args[0]);
        return cl;
    },
    isOptional() {
        return this.safeParse(undefined).success;
    },
    isNullable() {
        return this.safeParse(null).success;
    },
    apply(fn, ...args) {
        return args.length === 0 ? fn(this) : fn(this, ...args);
    },
    // Overrides core's `~standard` to add `jsonSchema`. Must stay a prototype entry: redefining it per instance demotes instances to dictionary mode.
    get "~standard"() {
        return index_js_1.util.hide(this, "~standard", {
            ...core.standardProps(this),
            jsonSchema: {
                input: (0, to_json_schema_js_1.createStandardJSONSchemaMethod)(this, "input"),
                output: (0, to_json_schema_js_1.createStandardJSONSchemaMethod)(this, "output"),
            },
        });
    },
    set "~standard"(value) {
        index_js_1.util.own(this, "~standard", value);
    },
    parse: function _parse(data, params) {
        return parse.parse(this, data, params, { callee: _parse });
    },
    parseAsync: async function _parseAsync(data, params) {
        return await parse.parseAsync(this, data, params, { callee: _parseAsync });
    },
    safeParse(data, params) {
        return parse.safeParse(this, data, params);
    },
    async safeParseAsync(data, params) {
        return parse.safeParseAsync(this, data, params);
    },
    // `spa` is an alias: same function object as `safeParseAsync`, as before.
    get spa() {
        return this?.safeParseAsync;
    },
    set spa(value) {
        index_js_1.util.own(this, "spa", value);
    },
    validate(data, params) {
        return parse.validate(this, data, params);
    },
    validateAsync(data, params) {
        return parse.validateAsync(this, data, params);
    },
    encode: function _encode(data, params) {
        return parse.encode(this, data, params, { callee: _encode });
    },
    decode: function _decode(data, params) {
        return parse.decode(this, data, params, { callee: _decode });
    },
    encodeAsync: async function _encodeAsync(data, params) {
        return await parse.encodeAsync(this, data, params, { callee: _encodeAsync });
    },
    decodeAsync: async function _decodeAsync(data, params) {
        return await parse.decodeAsync(this, data, params, { callee: _decodeAsync });
    },
    safeEncode(data, params) {
        return parse.safeEncode(this, data, params);
    },
    safeDecode(data, params) {
        return parse.safeDecode(this, data, params);
    },
    async safeEncodeAsync(data, params) {
        return parse.safeEncodeAsync(this, data, params);
    },
    async safeDecodeAsync(data, params) {
        return parse.safeDecodeAsync(this, data, params);
    },
    toJSONSchema(params) {
        return (0, to_json_schema_js_1.createToJSONSchemaMethod)(this, {})(params);
    },
    // Reads through to the registry on every access, so it must not cache.
    get description() {
        return core.globalRegistry.get(this)?.description;
    },
    // No setter: `schema._def = x` throws, as it did when `_def` was a non-writable own property.
    get _def() {
        return this._zod.def;
    },
});
/** @internal */
exports._ZodString = core.$constructor("_ZodString", (inst, def) => {
    core.$ZodString.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.stringProcessor(inst, ctx, json, params);
}, 
/*@__PURE__*/ index_js_1.util.derived({
    format: (inst) => processors.aggregateChecks(inst).format ?? null,
    minLength: (inst) => processors.aggregateChecks(inst).minimum ?? null,
    maxLength: (inst) => processors.aggregateChecks(inst).maximum ?? null,
}, {
    regex(...args) {
        return this.check(checks.regex(...args));
    },
    includes(...args) {
        return this.check(checks.includes(...args));
    },
    startsWith(...args) {
        return this.check(checks.startsWith(...args));
    },
    endsWith(...args) {
        return this.check(checks.endsWith(...args));
    },
    min(...args) {
        return this.check(checks.minLength(...args));
    },
    max(...args) {
        return this.check(checks.maxLength(...args));
    },
    length(...args) {
        return this.check(checks.length(...args));
    },
    nonempty(...args) {
        return this.check(checks.minLength(1, ...args));
    },
    lowercase(params) {
        return this.check(checks.lowercase(params));
    },
    uppercase(params) {
        return this.check(checks.uppercase(params));
    },
    trim() {
        return this.check(checks.trim());
    },
    normalize(...args) {
        return this.check(checks.normalize(...args));
    },
    toLowerCase() {
        return this.check(checks.toLowerCase());
    },
    toUpperCase() {
        return this.check(checks.toUpperCase());
    },
    slugify() {
        return this.check(checks.slugify());
    },
}));
exports.ZodString = core.$constructor("ZodString", (inst, def) => {
    core.$ZodString.init(inst, def);
    exports._ZodString.init(inst, def);
}, {
    email(params) {
        return this.check(core._email(exports.ZodEmail, params));
    },
    url(params) {
        return this.check(core._url(exports.ZodURL, params));
    },
    jwt(params) {
        return this.check(core._jwt(exports.ZodJWT, params));
    },
    emoji(params) {
        return this.check(core._emoji(exports.ZodEmoji, params));
    },
    guid(params) {
        return this.check(core._guid(exports.ZodGUID, params));
    },
    uuid(params) {
        return this.check(core._uuid(exports.ZodUUID, params));
    },
    uuidv4(params) {
        return this.check(core._uuidv4(exports.ZodUUID, params));
    },
    uuidv6(params) {
        return this.check(core._uuidv6(exports.ZodUUID, params));
    },
    uuidv7(params) {
        return this.check(core._uuidv7(exports.ZodUUID, params));
    },
    nanoid(params) {
        return this.check(core._nanoid(exports.ZodNanoID, params));
    },
    cuid(params) {
        return this.check(core._cuid(exports.ZodCUID, params));
    },
    cuid2(params) {
        return this.check(core._cuid2(exports.ZodCUID2, params));
    },
    ulid(params) {
        return this.check(core._ulid(exports.ZodULID, params));
    },
    base64(params) {
        return this.check(core._base64(exports.ZodBase64, params));
    },
    base64url(params) {
        return this.check(core._base64url(exports.ZodBase64URL, params));
    },
    xid(params) {
        return this.check(core._xid(exports.ZodXID, params));
    },
    ksuid(params) {
        return this.check(core._ksuid(exports.ZodKSUID, params));
    },
    ipv4(params) {
        return this.check(core._ipv4(exports.ZodIPv4, params));
    },
    ipv6(params) {
        return this.check(core._ipv6(exports.ZodIPv6, params));
    },
    cidrv4(params) {
        return this.check(core._cidrv4(exports.ZodCIDRv4, params));
    },
    cidrv6(params) {
        return this.check(core._cidrv6(exports.ZodCIDRv6, params));
    },
    e164(params) {
        return this.check(core._e164(exports.ZodE164, params));
    },
    datetime(params) {
        return this.check(core._isoDateTime(exports.ZodISODateTime, params));
    },
    date(params) {
        return this.check(core._isoDate(exports.ZodISODate, params));
    },
    time(params) {
        return this.check(core._isoTime(exports.ZodISOTime, params));
    },
    duration(params) {
        return this.check(core._isoDuration(exports.ZodISODuration, params));
    },
});
function string(params) {
    return core._string(exports.ZodString, params);
}
exports.ZodStringFormat = core.$constructor("ZodStringFormat", (inst, def) => {
    core.$ZodStringFormat.init(inst, def);
    exports._ZodString.init(inst, def);
});
exports.ZodISODateTime = core.$constructor("ZodISODateTime", (inst, def) => {
    core.$ZodISODateTime.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
exports.ZodISODate = core.$constructor("ZodISODate", (inst, def) => {
    core.$ZodISODate.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
exports.ZodISOTime = core.$constructor("ZodISOTime", (inst, def) => {
    core.$ZodISOTime.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
exports.ZodISODuration = core.$constructor("ZodISODuration", (inst, def) => {
    core.$ZodISODuration.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
exports.ZodEmail = core.$constructor("ZodEmail", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodEmail.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function email(params) {
    return core._email(exports.ZodEmail, params);
}
exports.ZodGUID = core.$constructor("ZodGUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodGUID.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function guid(params) {
    return core._guid(exports.ZodGUID, params);
}
exports.ZodUUID = core.$constructor("ZodUUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodUUID.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function uuid(params) {
    return core._uuid(exports.ZodUUID, params);
}
function uuidv4(params) {
    return core._uuidv4(exports.ZodUUID, params);
}
// ZodUUIDv6
function uuidv6(params) {
    return core._uuidv6(exports.ZodUUID, params);
}
// ZodUUIDv7
function uuidv7(params) {
    return core._uuidv7(exports.ZodUUID, params);
}
exports.ZodURL = core.$constructor("ZodURL", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodURL.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function url(params) {
    return core._url(exports.ZodURL, params);
}
function httpUrl(params) {
    return core._url(exports.ZodURL, {
        protocol: regexes.httpProtocol,
        hostname: regexes.domain,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodEmoji = core.$constructor("ZodEmoji", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodEmoji.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function emoji(params) {
    return core._emoji(exports.ZodEmoji, params);
}
exports.ZodNanoID = core.$constructor("ZodNanoID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodNanoID.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function nanoid(params) {
    return core._nanoid(exports.ZodNanoID, params);
}
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link ZodCUID2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
exports.ZodCUID = core.$constructor("ZodCUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodCUID.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
/**
 * Validates a CUID v1 string.
 *
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link cuid2 | `z.cuid2()`} instead.
 * See https://github.com/paralleldrive/cuid.
 */
function cuid(params) {
    return core._cuid(exports.ZodCUID, params);
}
exports.ZodCUID2 = core.$constructor("ZodCUID2", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodCUID2.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function cuid2(params) {
    return core._cuid2(exports.ZodCUID2, params);
}
exports.ZodULID = core.$constructor("ZodULID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodULID.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function ulid(params) {
    return core._ulid(exports.ZodULID, params);
}
exports.ZodXID = core.$constructor("ZodXID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodXID.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function xid(params) {
    return core._xid(exports.ZodXID, params);
}
exports.ZodKSUID = core.$constructor("ZodKSUID", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodKSUID.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function ksuid(params) {
    return core._ksuid(exports.ZodKSUID, params);
}
exports.ZodIPv4 = core.$constructor("ZodIPv4", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodIPv4.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function ipv4(params) {
    return core._ipv4(exports.ZodIPv4, params);
}
exports.ZodMAC = core.$constructor("ZodMAC", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodMAC.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function mac(params) {
    return core._mac(exports.ZodMAC, params);
}
exports.ZodIPv6 = core.$constructor("ZodIPv6", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodIPv6.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function ipv6(params) {
    return core._ipv6(exports.ZodIPv6, params);
}
exports.ZodCIDRv4 = core.$constructor("ZodCIDRv4", (inst, def) => {
    core.$ZodCIDRv4.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function cidrv4(params) {
    return core._cidrv4(exports.ZodCIDRv4, params);
}
exports.ZodCIDRv6 = core.$constructor("ZodCIDRv6", (inst, def) => {
    core.$ZodCIDRv6.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function cidrv6(params) {
    return core._cidrv6(exports.ZodCIDRv6, params);
}
exports.ZodBase64 = core.$constructor("ZodBase64", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodBase64.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function base64(params) {
    return core._base64(exports.ZodBase64, params);
}
exports.ZodBase64URL = core.$constructor("ZodBase64URL", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodBase64URL.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function base64url(params) {
    return core._base64url(exports.ZodBase64URL, params);
}
exports.ZodE164 = core.$constructor("ZodE164", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodE164.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function e164(params) {
    return core._e164(exports.ZodE164, params);
}
exports.ZodCreditCard = core.$constructor("ZodCreditCard", (inst, def) => {
    core.$ZodCreditCard.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function creditCard(params) {
    return core._creditCard(exports.ZodCreditCard, params);
}
exports.ZodIBAN = core.$constructor("ZodIBAN", (inst, def) => {
    core.$ZodIBAN.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function iban(params) {
    return core._iban(exports.ZodIBAN, params);
}
exports.ZodJWT = core.$constructor("ZodJWT", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodJWT.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function jwt(params) {
    return core._jwt(exports.ZodJWT, params);
}
exports.ZodCustomStringFormat = core.$constructor("ZodCustomStringFormat", (inst, def) => {
    // ZodStringFormat.init(inst, def);
    core.$ZodCustomStringFormat.init(inst, def);
    exports.ZodStringFormat.init(inst, def);
});
function stringFormat(format, fnOrRegex, _params = {}) {
    return core._stringFormat(exports.ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname(_params) {
    return core._stringFormat(exports.ZodCustomStringFormat, "hostname", regexes.hostname, _params);
}
function hex(_params) {
    return core._stringFormat(exports.ZodCustomStringFormat, "hex", regexes.hex, _params);
}
function currencyCode(_params) {
    return core._stringFormat(exports.ZodCustomStringFormat, "currency_code", regexes.currencyCode, _params);
}
function hash(alg, params) {
    const enc = params?.enc ?? "hex";
    const format = `${alg}_${enc}`;
    const regex = core.regexes[format];
    if (!regex)
        throw new Error(`Unrecognized hash format: ${format}`);
    return core._stringFormat(exports.ZodCustomStringFormat, format, regex, params);
}
exports.ZodNumber = core.$constructor("ZodNumber", (inst, def) => {
    core.$ZodNumber.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.numberProcessor(inst, ctx, json, params);
    inst.isFinite = true;
}, 
/*@__PURE__*/ index_js_1.util.derived({
    minValue: (inst) => {
        const { minimum, exclusiveMinimum } = processors.aggregateChecks(inst);
        return Math.max(minimum ?? Number.NEGATIVE_INFINITY, exclusiveMinimum ?? Number.NEGATIVE_INFINITY);
    },
    maxValue: (inst) => {
        const { maximum, exclusiveMaximum } = processors.aggregateChecks(inst);
        return Math.min(maximum ?? Number.POSITIVE_INFINITY, exclusiveMaximum ?? Number.POSITIVE_INFINITY);
    },
    isInt: (inst) => {
        const { isInt, multipleOf } = processors.aggregateChecks(inst);
        return !!isInt || !!multipleOf?.some(Number.isSafeInteger);
    },
    format: (inst) => processors.aggregateChecks(inst).format ?? null,
}, {
    gt(value, params) {
        return this.check(checks.gt(value, params));
    },
    gte(value, params) {
        return this.check(checks.gte(value, params));
    },
    min(value, params) {
        return this.check(checks.gte(value, params));
    },
    lt(value, params) {
        return this.check(checks.lt(value, params));
    },
    lte(value, params) {
        return this.check(checks.lte(value, params));
    },
    max(value, params) {
        return this.check(checks.lte(value, params));
    },
    int(params) {
        return this.check(int(params));
    },
    safe(params) {
        return this.check(int(params));
    },
    positive(params) {
        return this.check(checks.gt(0, params));
    },
    nonnegative(params) {
        return this.check(checks.gte(0, params));
    },
    negative(params) {
        return this.check(checks.lt(0, params));
    },
    nonpositive(params) {
        return this.check(checks.lte(0, params));
    },
    multipleOf(value, params) {
        return this.check(checks.multipleOf(value, params));
    },
    step(value, params) {
        return this.check(checks.multipleOf(value, params));
    },
    finite() {
        return this;
    },
}));
function number(params) {
    return core._number(exports.ZodNumber, params);
}
exports.ZodNumberFormat = core.$constructor("ZodNumberFormat", (inst, def) => {
    core.$ZodNumberFormat.init(inst, def);
    exports.ZodNumber.init(inst, def);
});
function int(params) {
    return core._int(exports.ZodNumberFormat, params);
}
function float32(params) {
    return core._float32(exports.ZodNumberFormat, params);
}
function float64(params) {
    return core._float64(exports.ZodNumberFormat, params);
}
function int32(params) {
    return core._int32(exports.ZodNumberFormat, params);
}
function uint32(params) {
    return core._uint32(exports.ZodNumberFormat, params);
}
exports.ZodBoolean = core.$constructor("ZodBoolean", (inst, def) => {
    core.$ZodBoolean.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.booleanProcessor(inst, ctx, json, params);
});
function boolean(params) {
    return core._boolean(exports.ZodBoolean, params);
}
exports.ZodBigInt = core.$constructor("ZodBigInt", (inst, def) => {
    core.$ZodBigInt.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.bigintProcessor(inst, ctx, json, params);
}, 
/*@__PURE__*/ index_js_1.util.derived({
    minValue: (inst) => processors.aggregateChecks(inst).minimum ?? null,
    maxValue: (inst) => processors.aggregateChecks(inst).maximum ?? null,
    format: (inst) => processors.aggregateChecks(inst).format ?? null,
}, {
    gte(value, params) {
        return this.check(checks.gte(value, params));
    },
    min(value, params) {
        return this.check(checks.gte(value, params));
    },
    gt(value, params) {
        return this.check(checks.gt(value, params));
    },
    lt(value, params) {
        return this.check(checks.lt(value, params));
    },
    lte(value, params) {
        return this.check(checks.lte(value, params));
    },
    max(value, params) {
        return this.check(checks.lte(value, params));
    },
    positive(params) {
        return this.check(checks.gt(BigInt(0), params));
    },
    negative(params) {
        return this.check(checks.lt(BigInt(0), params));
    },
    nonpositive(params) {
        return this.check(checks.lte(BigInt(0), params));
    },
    nonnegative(params) {
        return this.check(checks.gte(BigInt(0), params));
    },
    multipleOf(value, params) {
        return this.check(checks.multipleOf(value, params));
    },
}));
function bigint(params) {
    return core._bigint(exports.ZodBigInt, params);
}
exports.ZodBigIntFormat = core.$constructor("ZodBigIntFormat", (inst, def) => {
    core.$ZodBigIntFormat.init(inst, def);
    exports.ZodBigInt.init(inst, def);
});
function int64(params) {
    return core._int64(exports.ZodBigIntFormat, params);
}
function uint64(params) {
    return core._uint64(exports.ZodBigIntFormat, params);
}
exports.ZodSymbol = core.$constructor("ZodSymbol", (inst, def) => {
    core.$ZodSymbol.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.symbolProcessor(inst, ctx, json, params);
});
function symbol(params) {
    return core._symbol(exports.ZodSymbol, params);
}
exports.ZodUndefined = core.$constructor("ZodUndefined", (inst, def) => {
    core.$ZodUndefined.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.undefinedProcessor(inst, ctx, json, params);
});
function _undefined(params) {
    return core._undefined(exports.ZodUndefined, params);
}
exports.ZodNull = core.$constructor("ZodNull", (inst, def) => {
    core.$ZodNull.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.nullProcessor(inst, ctx, json, params);
});
function _null(params) {
    return core._null(exports.ZodNull, params);
}
exports.ZodAny = core.$constructor("ZodAny", (inst, def) => {
    core.$ZodAny.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.anyProcessor(inst, ctx, json, params);
});
function any() {
    return core._any(exports.ZodAny);
}
exports.ZodUnknown = core.$constructor("ZodUnknown", (inst, def) => {
    core.$ZodUnknown.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.unknownProcessor(inst, ctx, json, params);
});
function unknown() {
    return core._unknown(exports.ZodUnknown);
}
exports.ZodNever = core.$constructor("ZodNever", (inst, def) => {
    core.$ZodNever.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.neverProcessor(inst, ctx, json, params);
});
function never(params) {
    return core._never(exports.ZodNever, params);
}
exports.ZodVoid = core.$constructor("ZodVoid", (inst, def) => {
    core.$ZodVoid.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.voidProcessor(inst, ctx, json, params);
});
function _void(params) {
    return core._void(exports.ZodVoid, params);
}
exports.ZodDate = core.$constructor("ZodDate", (inst, def) => {
    core.$ZodDate.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.dateProcessor(inst, ctx, json, params);
    inst.min = (value, params) => inst.check(checks.gte(value, params));
    inst.max = (value, params) => inst.check(checks.lte(value, params));
}, 
/*@__PURE__*/ index_js_1.util.derived({
    minDate: (inst) => {
        const { minimum } = processors.aggregateChecks(inst);
        return minimum ? new Date(minimum) : null;
    },
    maxDate: (inst) => {
        const { maximum } = processors.aggregateChecks(inst);
        return maximum ? new Date(maximum) : null;
    },
}, {}));
function date(params) {
    return core._date(exports.ZodDate, params);
}
exports.ZodArray = core.$constructor("ZodArray", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodArray.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.arrayProcessor(inst, ctx, json, params);
    inst.element = def.element;
}, {
    min(n, params) {
        return this.check(checks.minLength(n, params));
    },
    nonempty(params) {
        return this.check(checks.minLength(1, params));
    },
    max(n, params) {
        return this.check(checks.maxLength(n, params));
    },
    length(n, params) {
        return this.check(checks.length(n, params));
    },
    unwrap() {
        return this.element;
    },
});
function array(element, params) {
    return core._array(exports.ZodArray, element, params);
}
// .keyof
function keyof(schema) {
    const shape = schema._zod.def.shape;
    return _enum(Object.keys(shape));
}
exports.ZodObject = core.$constructor("ZodObject", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodObjectJIT.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.objectProcessor(inst, ctx, json, params);
    index_js_1.util.installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
}, {
    keyof() {
        return _enum(Object.keys(this._zod.def.shape));
    },
    catchall(catchall) {
        // `mergeDefs` rather than a spread: spreading reads `shape`, and resolving it can mint a whole fresh subtree
        return this.clone(index_js_1.util.mergeDefs(this._zod.def, { catchall: catchall }));
    },
    passthrough() {
        return this.clone(index_js_1.util.mergeDefs(this._zod.def, { catchall: unknown() }));
    },
    loose() {
        return this.clone(index_js_1.util.mergeDefs(this._zod.def, { catchall: unknown() }));
    },
    strict() {
        return this.clone(index_js_1.util.mergeDefs(this._zod.def, { catchall: never() }));
    },
    strip() {
        return this.clone(index_js_1.util.mergeDefs(this._zod.def, { catchall: undefined }));
    },
    extend(incoming) {
        return index_js_1.util.extend(this, incoming);
    },
    safeExtend(incoming) {
        return index_js_1.util.safeExtend(this, incoming);
    },
    merge(other) {
        return index_js_1.util.merge(this, other);
    },
    pick(mask) {
        return index_js_1.util.pick(this, mask);
    },
    omit(mask) {
        return index_js_1.util.omit(this, mask);
    },
    partial(...args) {
        return index_js_1.util.partial(exports.ZodOptional, this, args[0]);
    },
    exactPartial(...args) {
        return index_js_1.util.partial(exports.ZodExactOptional, this, args[0], "exactPartial");
    },
    required(...args) {
        return index_js_1.util.required(exports.ZodNonOptional, this, args[0]);
    },
});
function object(shape, params) {
    const def = {
        type: "object",
        shape: shape ?? {},
        ...index_js_1.util.normalizeParams(params),
    };
    return new exports.ZodObject(def);
}
// strictObject
function strictObject(shape, params) {
    return new exports.ZodObject({
        type: "object",
        shape,
        catchall: never(),
        ...index_js_1.util.normalizeParams(params),
    });
}
// looseObject
function looseObject(shape, params) {
    return new exports.ZodObject({
        type: "object",
        shape,
        catchall: unknown(),
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodUnion = core.$constructor("ZodUnion", (inst, def) => {
    core.$ZodUnion.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
});
function union(options, params) {
    return new exports.ZodUnion({
        type: "union",
        options: options,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodXor = core.$constructor("ZodXor", (inst, def) => {
    exports.ZodUnion.init(inst, def);
    core.$ZodXor.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.unionProcessor(inst, ctx, json, params);
    inst.options = def.options;
});
/** Creates an exclusive union (XOR) where exactly one option must match.
 * Unlike regular unions that succeed when any option matches, xor fails if
 * zero or more than one option matches the input. */
function xor(options, params) {
    return new exports.ZodXor({
        type: "union",
        options: options,
        inclusive: false,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodDiscriminatedUnion = core.$constructor("ZodDiscriminatedUnion", (inst, def) => {
    exports.ZodUnion.init(inst, def);
    core.$ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
    // const [options, params] = args;
    return new exports.ZodDiscriminatedUnion({
        type: "union",
        options: options,
        discriminator,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodIntersection = core.$constructor("ZodIntersection", (inst, def) => {
    core.$ZodIntersection.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.intersectionProcessor(inst, ctx, json, params);
});
function intersection(left, right) {
    return new exports.ZodIntersection({
        type: "intersection",
        left: left,
        right: right,
    });
}
exports.ZodTuple = core.$constructor("ZodTuple", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodTuple.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.tupleProcessor(inst, ctx, json, params);
}, {
    rest(rest) {
        return this.clone({
            ...this._zod.def,
            rest: rest,
        });
    },
    partial() {
        const def = this._zod.def;
        // a refinement was authored against the full arity; partialing would run it on a shorter array
        if (def.checks?.length)
            throw new Error(".partial() cannot be used on tuple schemas containing refinements");
        return this.clone({
            ...def,
            items: def.items.map((item) => new exports.ZodOptional({ type: "optional", innerType: item })),
        });
    },
});
function tuple(items, _paramsOrRest, _params) {
    const hasRest = _paramsOrRest instanceof core.$ZodType;
    const params = hasRest ? _params : _paramsOrRest;
    const rest = hasRest ? _paramsOrRest : null;
    return new exports.ZodTuple({
        type: "tuple",
        items: items,
        rest,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodRecord = core.$constructor("ZodRecord", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodRecord.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.recordProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
    // v3-compat: z.record(valueType, params?) — defaults keyType to z.string()
    if (!valueType || !valueType._zod) {
        return new exports.ZodRecord({
            type: "record",
            keyType: string(),
            valueType: keyType,
            ...index_js_1.util.normalizeParams(valueType),
        });
    }
    return new exports.ZodRecord({
        type: "record",
        keyType,
        valueType: valueType,
        ...index_js_1.util.normalizeParams(params),
    });
}
// type alksjf = core.output<core.$ZodRecordKey>;
function partialRecord(keyType, valueType, params) {
    return new exports.ZodRecord({
        type: "record",
        keyType,
        valueType: valueType,
        ...index_js_1.util.normalizeParams(params),
        partial: true,
    });
}
function looseRecord(keyType, valueType, params) {
    return new exports.ZodRecord({
        type: "record",
        keyType,
        valueType: valueType,
        mode: "loose",
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodMap = core.$constructor("ZodMap", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodMap.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.mapProcessor(inst, ctx, json, params);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
    inst.min = (...args) => inst.check(core._minSize(...args));
    inst.nonempty = (params) => inst.check(core._minSize(1, params));
    inst.max = (...args) => inst.check(core._maxSize(...args));
    inst.size = (...args) => inst.check(core._size(...args));
});
function map(keyType, valueType, params) {
    return new exports.ZodMap({
        type: "map",
        keyType: keyType,
        valueType: valueType,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodSet = core.$constructor("ZodSet", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodSet.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.setProcessor(inst, ctx, json, params);
    inst.min = (...args) => inst.check(core._minSize(...args));
    inst.nonempty = (params) => inst.check(core._minSize(1, params));
    inst.max = (...args) => inst.check(core._maxSize(...args));
    inst.size = (...args) => inst.check(core._size(...args));
});
function set(valueType, params) {
    return new exports.ZodSet({
        type: "set",
        valueType: valueType,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodEnum = core.$constructor("ZodEnum", (inst, def) => {
    core.$ZodEnum.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.enumProcessor(inst, ctx, json, params);
    inst.enum = def.entries;
    // reuse the parsed value set so a numeric TS enum's reverse-mapping keys stay out
    inst.options = [...inst._zod.values];
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
        const newEntries = {};
        for (const value of values) {
            if (keys.has(value)) {
                newEntries[value] = def.entries[value];
            }
            else
                throw new Error(`Key ${value} not found in enum`);
        }
        return new exports.ZodEnum({
            ...def,
            checks: [],
            ...index_js_1.util.normalizeParams(params),
            entries: newEntries,
        });
    };
    inst.exclude = (values, params) => {
        const newEntries = { ...def.entries };
        for (const value of values) {
            if (keys.has(value)) {
                delete newEntries[value];
            }
            else
                throw new Error(`Key ${value} not found in enum`);
        }
        return new exports.ZodEnum({
            ...def,
            checks: [],
            ...index_js_1.util.normalizeParams(params),
            entries: newEntries,
        });
    };
});
function _enum(values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
    return new exports.ZodEnum({
        type: "enum",
        entries,
        ...index_js_1.util.normalizeParams(params),
    });
}
/** @deprecated This API has been merged into `z.enum()`. Use `z.enum()` instead.
 *
 * ```ts
 * enum Colors { red, green, blue }
 * z.enum(Colors);
 * ```
 */
function nativeEnum(entries, params) {
    return new exports.ZodEnum({
        type: "enum",
        entries,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodLiteral = core.$constructor("ZodLiteral", (inst, def) => {
    core.$ZodLiteral.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.literalProcessor(inst, ctx, json, params);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
        get() {
            if (def.values.length > 1) {
                throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
            }
            return def.values[0];
        },
    });
});
function literal(value, params) {
    return new exports.ZodLiteral({
        type: "literal",
        values: Array.isArray(value) ? value : [value],
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodFile = core.$constructor("ZodFile", (inst, def) => {
    core.$ZodFile.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.fileProcessor(inst, ctx, json, params);
    inst.min = (size, params) => inst.check(core._minSize(size, params));
    inst.max = (size, params) => inst.check(core._maxSize(size, params));
    inst.mime = (types, params) => inst.check(core._mime(Array.isArray(types) ? types : [types], params));
});
function file(params) {
    return core._file(exports.ZodFile, params);
}
exports.ZodTransform = core.$constructor("ZodTransform", (inst, def) => {
    _ensureDefaultMemoizer();
    core.$ZodTransform.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.transformProcessor(inst, ctx, json, params);
    inst._zod.parse = (payload, _ctx) => {
        if (_ctx.direction === "backward") {
            throw new core.$ZodEncodeError(inst.constructor.name);
        }
        payload.addIssue = (issue) => {
            if (typeof issue === "string") {
                payload.issues.push(index_js_1.util.issue(issue, payload.value, def));
            }
            else {
                // for Zod 3 backwards compatibility
                const _issue = issue;
                if (_issue.fatal)
                    _issue.continue = false;
                _issue.code ?? (_issue.code = "custom");
                if (!("input" in _issue))
                    _issue.input = payload.value;
                _issue.inst ?? (_issue.inst = inst);
                // _issue.continue ??= true;
                payload.issues.push(index_js_1.util.issue(_issue));
            }
        };
        const output = def.transform(payload.value, payload);
        if (output instanceof Promise) {
            return output.then((output) => {
                payload.value = output;
                return payload;
            });
        }
        payload.value = output;
        return payload;
    };
});
function transform(fn) {
    return new exports.ZodTransform({
        type: "transform",
        transform: fn,
    });
}
exports.ZodOptional = core.$constructor("ZodOptional", (inst, def) => {
    core.$ZodOptional.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
    return new exports.ZodOptional({
        type: "optional",
        innerType: innerType,
    });
}
exports.ZodExactOptional = core.$constructor("ZodExactOptional", (inst, def) => {
    core.$ZodExactOptional.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.optionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
    return new exports.ZodExactOptional({
        type: "optional",
        innerType: innerType,
    });
}
exports.ZodNullable = core.$constructor("ZodNullable", (inst, def) => {
    core.$ZodNullable.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.nullableProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
    return new exports.ZodNullable({
        type: "nullable",
        innerType: innerType,
    });
}
// nullish
function nullish(innerType) {
    return optional(nullable(innerType));
}
exports.ZodDefault = core.$constructor("ZodDefault", (inst, def) => {
    core.$ZodDefault.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.defaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
    return new exports.ZodDefault({
        type: "default",
        innerType: innerType,
        get defaultValue() {
            return typeof defaultValue === "function" ? defaultValue() : index_js_1.util.shallowClone(defaultValue);
        },
    });
}
exports.ZodPrefault = core.$constructor("ZodPrefault", (inst, def) => {
    core.$ZodPrefault.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.prefaultProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
    return new exports.ZodPrefault({
        type: "prefault",
        innerType: innerType,
        get defaultValue() {
            return typeof defaultValue === "function" ? defaultValue() : index_js_1.util.shallowClone(defaultValue);
        },
    });
}
exports.ZodNonOptional = core.$constructor("ZodNonOptional", (inst, def) => {
    core.$ZodNonOptional.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.nonoptionalProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
    return new exports.ZodNonOptional({
        type: "nonoptional",
        innerType: innerType,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodSuccess = core.$constructor("ZodSuccess", (inst, def) => {
    core.$ZodSuccess.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.successProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function success(innerType) {
    return new exports.ZodSuccess({
        type: "success",
        innerType: innerType,
    });
}
exports.ZodCatch = core.$constructor("ZodCatch", (inst, def) => {
    core.$ZodCatch.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.catchProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
    return new exports.ZodCatch({
        type: "catch",
        innerType: innerType,
        catchValue: (typeof catchValue === "function" ? catchValue : core.util.constantCatch(catchValue)),
    });
}
exports.ZodNaN = core.$constructor("ZodNaN", (inst, def) => {
    core.$ZodNaN.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.nanProcessor(inst, ctx, json, params);
});
function nan(params) {
    return core._nan(exports.ZodNaN, params);
}
exports.ZodPipe = core.$constructor("ZodPipe", (inst, def) => {
    core.$ZodPipe.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.pipeProcessor(inst, ctx, json, params);
    inst.in = def.in;
    inst.out = def.out;
});
function pipe(in_, out) {
    return new exports.ZodPipe({
        type: "pipe",
        in: in_,
        out: out,
        // ...util.normalizeParams(params),
    });
}
exports.ZodCodec = core.$constructor("ZodCodec", (inst, def) => {
    exports.ZodPipe.init(inst, def);
    core.$ZodCodec.init(inst, def);
});
function codec(in_, out, params) {
    return new exports.ZodCodec({
        type: "pipe",
        in: in_,
        out: out,
        transform: params.decode,
        reverseTransform: params.encode,
    });
}
function invertCodec(codec) {
    const def = codec._zod.def;
    return new exports.ZodCodec({
        type: "pipe",
        in: def.out,
        out: def.in,
        transform: def.reverseTransform,
        reverseTransform: def.transform,
    });
}
exports.ZodPreprocess = core.$constructor("ZodPreprocess", (inst, def) => {
    exports.ZodPipe.init(inst, def);
    core.$ZodPreprocess.init(inst, def);
});
exports.ZodReadonly = core.$constructor("ZodReadonly", (inst, def) => {
    core.$ZodReadonly.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.readonlyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
    return new exports.ZodReadonly({
        type: "readonly",
        innerType: innerType,
    });
}
exports.ZodTemplateLiteral = core.$constructor("ZodTemplateLiteral", (inst, def) => {
    core.$ZodTemplateLiteral.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.templateLiteralProcessor(inst, ctx, json, params);
});
function templateLiteral(parts, params) {
    return new exports.ZodTemplateLiteral({
        type: "template_literal",
        parts,
        ...index_js_1.util.normalizeParams(params),
    });
}
exports.ZodLazy = core.$constructor("ZodLazy", (inst, def) => {
    core.$ZodLazy.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.lazyProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
    return new exports.ZodLazy({
        type: "lazy",
        getter: getter,
    });
}
exports.ZodPromise = core.$constructor("ZodPromise", (inst, def) => {
    core.$ZodPromise.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.promiseProcessor(inst, ctx, json, params);
    inst.unwrap = () => inst._zod.def.innerType;
});
function promise(innerType) {
    return new exports.ZodPromise({
        type: "promise",
        innerType: innerType,
    });
}
exports.ZodFunction = core.$constructor("ZodFunction", (inst, def) => {
    core.$ZodFunction.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.functionProcessor(inst, ctx, json, params);
});
function _function(params) {
    return new exports.ZodFunction({
        type: "function",
        input: Array.isArray(params?.input) ? tuple(params?.input) : (params?.input ?? array(unknown())),
        output: params?.output ?? unknown(),
    });
}
exports.ZodCustom = core.$constructor("ZodCustom", (inst, def) => {
    core.$ZodCustom.init(inst, def);
    exports.ZodType.init(inst, def);
    inst._zod.processJSONSchema = (ctx, json, params) => processors.customProcessor(inst, ctx, json, params);
});
// custom checks
function check(fn) {
    const ch = new core.$ZodCheck({
        check: "custom",
        // ...util.normalizeParams(params),
    });
    ch._zod.check = fn;
    return ch;
}
function custom(fn, _params) {
    return core._custom(exports.ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
    return core._refine(exports.ZodCustom, fn, _params);
}
// superRefine
function superRefine(fn, params) {
    return core._superRefine(fn, params);
}
// Re-export describe and meta from core
exports.describe = core.describe;
exports.meta = core.meta;
exports.ZodInstanceOf = core.$constructor("ZodInstanceOf", (inst, def) => {
    exports.ZodCustom.init(inst, def);
}, {
    properties(shape, params) {
        // asserts in place, so the narrowed output type is truthful without a wrapper
        return this.check(core._properties(shape, params));
    },
});
function _instanceof(cls, params = {}) {
    const inst = new exports.ZodInstanceOf({
        type: "custom",
        check: "custom",
        fn: (data) => data instanceof cls,
        abort: true,
        ...index_js_1.util.normalizeParams(params),
    });
    inst._zod.bag.Class = cls;
    // Override check to emit invalid_type instead of custom
    inst._zod.check = (payload) => {
        if (!(payload.value instanceof cls)) {
            payload.issues.push({
                code: "invalid_type",
                expected: cls.name,
                input: payload.value,
                inst,
                path: [...(inst._zod.def.path ?? [])],
            });
        }
    };
    return inst;
}
// stringbool
const stringbool = (...args) => core._stringbool({
    Codec: exports.ZodCodec,
    Boolean: exports.ZodBoolean,
    String: exports.ZodString,
}, ...args);
exports.stringbool = stringbool;
function json(params) {
    const jsonSchema = lazy(() => {
        return union([string(params), number(), boolean(), _null(), array(jsonSchema), record(string(), jsonSchema)]);
    });
    return jsonSchema;
}
// preprocess
function preprocess(fn, schema) {
    return new exports.ZodPreprocess({
        type: "pipe",
        in: transform(fn),
        out: schema,
    });
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
