"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaTypeEssence = mediaTypeEssence;
exports.isJsonContentType = isJsonContentType;
const content_type_1 = __importDefault(require("content-type"));
/**
 * Extracts the media type (the lowercased `type/subtype` pair, without
 * parameters) from a raw `Content-Type` header value, or `undefined` when the
 * header is missing or empty.
 *
 * Content-Type comparisons must use the parsed media type, never a substring
 * search of the raw header: a value like `text/plain; a=application/json`
 * contains the substring `application/json` but its media type is
 * `text/plain`, and case variants or parameters make naive string comparison
 * wrong in both directions.
 *
 * "Essence" is the WHATWG MIME Sniffing standard's term for the bare
 * `type/subtype` pair (https://mimesniff.spec.whatwg.org/#mime-type-essence);
 * the Fetch standard's request classification is defined against it
 * (https://fetch.spec.whatwg.org/#cors-safelisted-request-header).
 *
 * Parsing is RFC 9110 (`content-type` package) first. When the parameter
 * section is malformed (`application/json;`, `application/json; charset=`),
 * browsers and most HTTP stacks still derive the media type from the segment
 * before the first `;` — the fallback matches that widely-implemented
 * behavior, so a header whose media type is unambiguous is not rejected for
 * a sloppy parameter section.
 */
function mediaTypeEssence(header) {
    if (!header) {
        return undefined;
    }
    try {
        return content_type_1.default.parse(header).type;
    }
    catch {
        const essence = (header.split(';', 1)[0] ?? '').trim().toLowerCase();
        // A comma in the parameter tail of an unparseable value indicates
        // joined duplicate headers — ambiguous, so no essence at all (keeps
        // duplicate-header handling uniform whether or not the first copy
        // carries parameters).
        if (essence === '' || header.slice(essence.length).includes(',')) {
            return undefined;
        }
        return essence;
    }
}
/**
 * Whether a raw `Content-Type` header value denotes `application/json`.
 * Parameters (for example `charset=utf-8`) are allowed and ignored; malformed
 * parameter sections do not reject a header whose media type is unambiguously
 * `application/json` (see `mediaTypeEssence` for the exact grammar).
 */
function isJsonContentType(header) {
    // Fast path: the exact literal is what SDK clients send on every POST.
    if (header === 'application/json') {
        return true;
    }
    return mediaTypeEssence(header) === 'application/json';
}
//# sourceMappingURL=mediaType.js.map