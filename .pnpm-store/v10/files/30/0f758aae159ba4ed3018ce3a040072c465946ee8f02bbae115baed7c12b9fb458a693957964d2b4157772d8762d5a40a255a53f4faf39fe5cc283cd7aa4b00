/**
 * URL validation and content-type classification for the local HTTP(S) fetch
 * provider — the pure, network-free half. The provider's `fetch()` composes
 * these with transport (redirect following, byte caps, decoding).
 *
 * @module @deepseek-ai/dsh-web-fetch-http/policy
 */
/** Maximum accepted request URL length enforced by the public fetch provider. */
export declare const WEB_FETCH_MAX_URL_LENGTH = 2048;
/** The body kinds this provider decodes. */
export type FetchableKind = 'html' | 'text';
/**
 * Parse a request URL and enforce network-independent transport restrictions:
 * HTTP(S) only and no embedded credentials. The provider applies this before
 * resolving a destination.
 *
 * @param input - the raw URL string from the fetch request.
 * @returns the parsed `URL`.
 */
export declare function parseFetchUrl(input: string): URL;
/**
 * Validate a request URL against the provider's complete pre-network policy:
 * bounded length plus the restrictions enforced by {@link parseFetchUrl}.
 * Public-address resolution and connection pinning run after this check.
 *
 * @param input - the raw URL string from the fetch request.
 * @returns the parsed `URL`.
 */
export declare function validateFetchUrl(input: string): URL;
/**
 * Two URLs are same-origin when scheme, hostname, and port match. A redirect
 * that crosses origins is refused so each new origin requires a fresh tool call
 * and public-address validation.
 *
 * @param a - one of the two URLs to compare.
 * @param b - the other URL to compare.
 * @returns true when `a` and `b` share scheme, hostname, and port.
 */
export declare function isSameOrigin(a: URL, b: URL): boolean;
/**
 * Classify a response `Content-Type` into a decodable body kind, or `undefined`
 * for an unsupported (e.g. binary) type. `text/html` and `application/xhtml+xml`
 * are `html`; other `text/*` plus a few structured text types are `text`.
 *
 * @param contentType - the raw `Content-Type` header, or `null` when the
 *   response carries none (unsupported).
 * @returns the decodable kind, or `undefined` for an unsupported type.
 */
export declare function classifyContentType(contentType: string | null): FetchableKind | undefined;
/**
 * Extract the `charset` parameter from a response `Content-Type`, lower-cased,
 * or `undefined` when absent. The provider feeds this label to `TextDecoder`
 * so a non-UTF-8 response is decoded with its declared encoding rather than
 * silently mangled into replacement characters.
 *
 * @param contentType - the raw `Content-Type` header, or `null` when the
 *   response carries none.
 * @returns the lower-cased charset label, or `undefined` when none is declared.
 */
export declare function parseCharset(contentType: string | null): string | undefined;
/**
 * Build a `TextDecoder` for the declared charset, falling back to UTF-8 when
 * none is declared. Throws {@link WebError} `WEB_UNSUPPORTED_CONTENT_TYPE` when
 * the label is present but not a charset `TextDecoder` recognizes — better to
 * fail loudly than return mojibake.
 *
 * @param charset - the declared charset label (from {@link parseCharset}), or
 *   `undefined` to default to UTF-8.
 * @returns a decoder for the declared (or defaulted) encoding.
 */
export declare function decoderForCharset(charset: string | undefined): TextDecoder;
//# sourceMappingURL=policy.d.ts.map