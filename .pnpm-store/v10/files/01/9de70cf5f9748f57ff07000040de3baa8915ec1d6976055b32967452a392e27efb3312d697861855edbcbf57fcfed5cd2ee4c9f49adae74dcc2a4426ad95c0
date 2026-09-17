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
exports.sha1_base64 = exports.sha1_hex = exports.md5_base64url = exports.md5_base64 = exports.md5_hex = exports.hex = exports.uppercase = exports.lowercase = exports.undefined = exports.null = exports.boolean = exports.number = exports.integer = exports.bigint = exports.string = exports.anyString = exports.date = exports.iban = exports.currencyCode = exports.creditCard = exports.e164 = exports.httpProtocol = exports.domain = exports.hostname = exports.base64url = exports.base64 = exports.cidrv6 = exports.cidrv4 = exports.mac = exports.ipv6 = exports.ipv4 = exports.browserEmail = exports.idnEmail = exports.unicodeEmail = exports.rfc5322Email = exports.html5Email = exports.email = exports.uuid7 = exports.uuid6 = exports.uuid4 = exports.uuid = exports.guid = exports.extendedDuration = exports.duration = exports.nanoid = exports.ksuid = exports.xid = exports.ulid = exports.cuid2 = exports.cuid = void 0;
exports.sha512_base64url = exports.sha512_base64 = exports.sha512_hex = exports.sha384_base64url = exports.sha384_base64 = exports.sha384_hex = exports.sha256_base64url = exports.sha256_base64 = exports.sha256_hex = exports.sha1_base64url = void 0;
exports.nanoidOfLength = nanoidOfLength;
exports.emoji = emoji;
exports.time = time;
exports.datetime = datetime;
const util = __importStar(require("./util.cjs"));
/**
 * @deprecated CUID v1 is deprecated by its authors due to information leakage
 * (timestamps embedded in the id). Use {@link cuid2} instead.
 * See https://github.com/paralleldrive/cuid.
 */
exports.cuid = /^[cC][0-9a-z]{6,}$/;
exports.cuid2 = /^[0-9a-z]+$/;
exports.ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
exports.xid = /^[0-9a-vA-V]{20}$/;
exports.ksuid = /^[A-Za-z0-9]{27}$/;
exports.nanoid = /^[a-zA-Z0-9_-]{21}$/;
function nanoidOfLength(length) {
    return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
}
/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
exports.duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
/** Implements ISO 8601-2 extensions like explicit +- prefixes, mixing weeks with other units, and fractional/negative components. */
exports.extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
exports.guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
/** Returns a regex for validating an RFC 9562/4122 UUID.
 *
 * @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
const uuid = (version) => {
    if (!version)
        return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
exports.uuid = uuid;
exports.uuid4 = (0, exports.uuid)(4);
exports.uuid6 = (0, exports.uuid)(6);
exports.uuid7 = (0, exports.uuid)(7);
/** Practical email validation */
exports.email = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
/** Equivalent to the HTML5 input[type=email] validation implemented by browsers. Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email */
exports.html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
/** The classic emailregex.com regex for RFC 5322-compliant emails */
exports.rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
/** A loose regex that allows Unicode characters, enforces length limits, and that's about it. */
exports.unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
exports.idnEmail = exports.unicodeEmail;
exports.browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
// from https://thekevinscott.com/emojis-in-javascript/#writing-a-regular-expression
// Single character class, not an alternation: the two properties overlap (U+1F9B0-U+1F9B3), so `(A|B)+` backtracks exponentially on a failed match. The leading lookahead then demands one anchor — a pictograph, a regional indicator, or the enclosing keycap — because `\p{Emoji_Component}` on its own covers ASCII digits, `#`, `*`, ZWJ, variation selectors and skin tone modifiers, none of which is an emoji without a base.
const _emoji = `^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$`;
function emoji() {
    return new RegExp(_emoji, "u");
}
exports.ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
exports.ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const mac = (delimiter) => {
    const escapedDelim = util.escapeRegex(delimiter ?? ":");
    return new RegExp(`^(?:[0-9A-F]{2}${escapedDelim}){5}[0-9A-F]{2}$|^(?:[0-9a-f]{2}${escapedDelim}){5}[0-9a-f]{2}$`);
};
exports.mac = mac;
exports.cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
exports.cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
// https://stackoverflow.com/questions/7860392/determine-if-string-is-in-base64-using-javascript
exports.base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
exports.base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
// based on https://stackoverflow.com/questions/106179/regular-expression-to-match-dns-hostname-or-ip-address
// export const hostname: RegExp = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+$/;
exports.hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
exports.domain = /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
exports.httpProtocol = /^https?$/;
// https://blog.stevenlevithan.com/archives/validate-phone-number#r4-3 (regex sans spaces) E.164: leading digit must be 1-9; total digits (excluding '+') between 7-15
exports.e164 = /^\+[1-9]\d{6,14}$/;
// Credit card shape: 12–19 digits, optionally separated by single spaces or single hyphens. ISO/IEC 7812 caps the PAN at 19 digits; 12 is the shortest issued length (Maestro).
exports.creditCard = /^\d(?:[ -]?\d){11,18}$/;
// ISO 4217 alpha codes from the SIX list, regenerated by scripts/update-iso-4217.ts
exports.currencyCode = /^(?:AED|AFN|ALL|AMD|AOA|ARS|AUD|AWG|AZN|BAM|BBD|BDT|BHD|BIF|BMD|BND|BOB|BOV|BRL|BSD|BTN|BWP|BYN|BZD|CAD|CDF|CHE|CHF|CHW|CLF|CLP|CNY|COP|COU|CRC|CUP|CVE|CZK|DJF|DKK|DOP|DZD|EGP|ERN|ETB|EUR|FJD|FKP|GBP|GEL|GHS|GIP|GMD|GNF|GTQ|GYD|HKD|HNL|HTG|HUF|IDR|ILS|INR|IQD|IRR|ISK|JMD|JOD|JPY|KES|KGS|KHR|KMF|KPW|KRW|KWD|KYD|KZT|LAK|LBP|LKR|LRD|LSL|LYD|MAD|MDL|MGA|MKD|MMK|MNT|MOP|MRU|MUR|MVR|MWK|MXN|MXV|MYR|MZN|NAD|NGN|NIO|NOK|NPR|NZD|OMR|PAB|PEN|PGK|PHP|PKR|PLN|PYG|QAR|RON|RSD|RUB|RWF|SAR|SBD|SCR|SDG|SEK|SGD|SHP|SLE|SOS|SRD|SSP|STN|SVC|SYP|SZL|THB|TJS|TMT|TND|TOP|TRY|TTD|TWD|TZS|UAH|UGX|USD|USN|UYI|UYU|UYW|UZS|VED|VES|VND|VUV|WST|XAD|XAF|XAG|XAU|XBA|XBB|XBC|XBD|XCD|XCG|XDR|XOF|XPD|XPF|XPT|XSU|XTS|XUA|XXX|YER|ZAR|ZMW|ZWG)$/;
// iban electronic format: 2-letter country, check digits 02-98 (the only values `98 - remainder` can produce), 11-30 bban characters
exports.iban = /^[A-Z]{2}(?!00|01|99)\d{2}[A-Z0-9]{11,30}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
/** Anchors a pattern source. The interpolation lives here rather than at the call site because
 * esbuild will not drop a `@__PURE__` call whose own argument interpolates a variable, but it
 * will drop `anchor(dateSource)`. Keeping it inline pinned `date` into every bundle. */
function anchor(source) {
    return new RegExp(`^${source}$`);
}
exports.date = anchor(dateSource);
function timeSource(args) {
    const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
    const regex = typeof args.precision === "number"
        ? args.precision === -1
            ? `${hhmm}`
            : args.precision === 0
                ? `${hhmm}:[0-5]\\d`
                : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}`
        : args.seconds
            ? `${hhmm}:[0-5]\\d(?:\\.\\d+)?`
            : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
    return regex;
}
function time(args) {
    return new RegExp(`^${timeSource(args)}$`);
}
// Adapted from https://stackoverflow.com/a/3143231
function datetime(args) {
    const opts = ["Z"];
    // if (args.offset) opts.push(`([+-]\\d{2}:\\d{2})`);
    if (args.offset)
        opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
    // RFC 3339 mandates seconds wherever the time carries a `Z` or an offset, so only the unqualified form `local` adds may omit them
    const qualified = `${timeSource({ precision: args.precision, seconds: true })}(?:${opts.join("|")})`;
    const timeRegex = args.local ? `${qualified}|${timeSource({ precision: args.precision })}` : qualified;
    return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
// the unbounded form of `string()` as a literal, so every plain string shares one instance instead of building its own
exports.anyString = /^[\s\S]{0,}$/;
const string = (params) => {
    const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
    return new RegExp(`^${regex}$`);
};
exports.string = string;
exports.bigint = /^-?\d+n?$/;
exports.integer = /^-?\d+$/;
exports.number = /^-?\d+(?:\.\d+)?$/;
exports.boolean = /^(?:true|false)$/i;
const _null = /^null$/i;
exports.null = _null;
const _undefined = /^undefined$/i;
exports.undefined = _undefined;
// regex for string with no uppercase letters
exports.lowercase = /^[^A-Z]*$/;
// regex for string with no lowercase letters
exports.uppercase = /^[^a-z]*$/;
// regex for hexadecimal strings (any length)
exports.hex = /^[0-9a-fA-F]*$/;
// Hash regexes for different algorithms and encodings
// Helper function to create base64 regex with exact length and padding
function fixedBase64(bodyLength, padding) {
    return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
// Helper function to create base64url regex with exact length (no padding)
function fixedBase64url(length) {
    return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
// MD5 (16 bytes): base64 = 24 chars total (22 + "==")
exports.md5_hex = /^[0-9a-fA-F]{32}$/;
exports.md5_base64 = fixedBase64(22, "==");
exports.md5_base64url = fixedBase64url(22);
// SHA1 (20 bytes): base64 = 28 chars total (27 + "=")
exports.sha1_hex = /^[0-9a-fA-F]{40}$/;
exports.sha1_base64 = fixedBase64(27, "=");
exports.sha1_base64url = fixedBase64url(27);
// SHA256 (32 bytes): base64 = 44 chars total (43 + "=")
exports.sha256_hex = /^[0-9a-fA-F]{64}$/;
exports.sha256_base64 = fixedBase64(43, "=");
exports.sha256_base64url = fixedBase64url(43);
// SHA384 (48 bytes): base64 = 64 chars total (no padding)
exports.sha384_hex = /^[0-9a-fA-F]{96}$/;
exports.sha384_base64 = fixedBase64(64, "");
exports.sha384_base64url = fixedBase64url(64);
// SHA512 (64 bytes): base64 = 88 chars total (86 + "==")
exports.sha512_hex = /^[0-9a-fA-F]{128}$/;
exports.sha512_base64 = fixedBase64(86, "==");
exports.sha512_base64url = fixedBase64url(86);

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
