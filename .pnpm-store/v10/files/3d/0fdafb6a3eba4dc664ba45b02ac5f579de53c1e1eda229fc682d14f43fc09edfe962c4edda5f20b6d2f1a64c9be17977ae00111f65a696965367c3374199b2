/** Canonical session URI and inline mention encoding. */
import { brandString } from '@deepseek-ai/dsh-brand';
import { SessionReferenceError } from "./config.js";
/** URI scheme reserved for DeepSeek Harness session snapshots. */
export const SESSION_REFERENCE_SCHEME = 'dsh-session:';
/**
 * Encode any JavaScript session-id string as a canonical lossless URI.
 * @param sessionId - opaque session id to serialize.
 * @returns canonical `dsh-session:` URI.
 */
export function encodeSessionReferenceUri(sessionId) {
    const payload = Buffer.from(JSON.stringify(sessionId), 'utf8').toString('base64url');
    return `${SESSION_REFERENCE_SCHEME}${payload}`;
}
/**
 * Decode and canonicalize one session-reference URI.
 * @param uri - complete canonical URI.
 * @returns decoded session id.
 */
export function decodeSessionReferenceUri(uri) {
    if (!uri.startsWith(SESSION_REFERENCE_SCHEME)) {
        throw invalidUri(uri);
    }
    const payload = uri.slice(SESSION_REFERENCE_SCHEME.length);
    if (!/^[A-Za-z0-9_-]+$/.test(payload))
        throw invalidUri(uri);
    try {
        const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (typeof parsed !== 'string')
            throw new TypeError('decoded session id is not a string');
        const sessionId = brandString(parsed);
        if (encodeSessionReferenceUri(sessionId) !== uri)
            throw new TypeError('URI is not canonical');
        return sessionId;
    }
    catch (error) {
        throw invalidUri(uri, error);
    }
}
/**
 * Render a host-neutral Markdown mention carrying the canonical URI.
 * @param reference - structured id and optional display label.
 * @returns escaped `@[label](uri)` mention.
 */
export function formatSessionReferenceMention(reference) {
    const label = escapeLabel(reference.label ?? reference.sessionId);
    return `@[${label}](${encodeSessionReferenceUri(reference.sessionId)})`;
}
/**
 * Extract Markdown mentions and bare canonical URIs from one text value.
 * Explicit Markdown mentions fail on any malformed URI. Bare text is treated
 * as a reference only when it has a non-empty base64url-shaped payload, then
 * still fails if that candidate is not canonical.
 * @param text - host text to normalize.
 * @returns readable text and structured references in appearance order.
 */
export function parseSessionReferenceText(text) {
    const references = [];
    const pattern = /@\[((?:\\.|[^\\\]])*)\]\((dsh-session:[^\s)]*)\)|(dsh-session:[A-Za-z0-9_-]+)/gu;
    const rendered = text.replace(pattern, (_match, rawLabel, markdownUri, bareUri) => {
        const uri = markdownUri ?? bareUri;
        /* v8 ignore next -- the two-alternative regex always captures exactly one URI group. */
        if (uri === undefined)
            throw new SessionReferenceError('session reference URI is missing', 'SESSION_REFERENCE_INVALID_REFERENCE');
        const sessionId = decodeSessionReferenceUri(uri);
        const label = rawLabel === undefined ? sessionId : unescapeLabel(rawLabel);
        references.push({ sessionId, label });
        return `@${label}`;
    });
    return { text: rendered, references };
}
function escapeLabel(label) {
    return label.replace(/[\\\]]/gu, match => `\\${match}`);
}
function unescapeLabel(label) {
    return label.replace(/\\(.)/gu, '$1');
}
function invalidUri(uri, cause) {
    return new SessionReferenceError(`invalid session reference URI ${JSON.stringify(uri)}`, 'SESSION_REFERENCE_INVALID_REFERENCE', cause === undefined ? undefined : { cause });
}
//# sourceMappingURL=uri.js.map