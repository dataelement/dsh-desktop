/** Canonical session URI and inline mention encoding. */
import type { SessionId as SessionIdType } from '@deepseek-ai/dsh-session';
import type { SessionReferenceInput } from './types.ts';
/** URI scheme reserved for DeepSeek Harness session snapshots. */
export declare const SESSION_REFERENCE_SCHEME = "dsh-session:";
/**
 * Encode any JavaScript session-id string as a canonical lossless URI.
 * @param sessionId - opaque session id to serialize.
 * @returns canonical `dsh-session:` URI.
 */
export declare function encodeSessionReferenceUri(sessionId: SessionIdType): string;
/**
 * Decode and canonicalize one session-reference URI.
 * @param uri - complete canonical URI.
 * @returns decoded session id.
 */
export declare function decodeSessionReferenceUri(uri: string): SessionIdType;
/**
 * Render a host-neutral Markdown mention carrying the canonical URI.
 * @param reference - structured id and optional display label.
 * @returns escaped `@[label](uri)` mention.
 */
export declare function formatSessionReferenceMention(reference: SessionReferenceInput): string;
/** Result of extracting canonical mentions from plain text. */
export interface ParsedSessionReferenceText {
    /** Text with opaque tokens replaced by readable `@label` spans. */
    text: string;
    /** Structured references in first-appearance order, before service deduplication. */
    references: SessionReferenceInput[];
}
/**
 * Extract Markdown mentions and bare canonical URIs from one text value.
 * Explicit Markdown mentions fail on any malformed URI. Bare text is treated
 * as a reference only when it has a non-empty base64url-shaped payload, then
 * still fails if that candidate is not canonical.
 * @param text - host text to normalize.
 * @returns readable text and structured references in appearance order.
 */
export declare function parseSessionReferenceText(text: string): ParsedSessionReferenceText;
//# sourceMappingURL=uri.d.ts.map