/**
 * Minimal ACP affinity cookie store.
 *
 * This helper stores cookie name/value pairs from `Set-Cookie` response
 * headers and applies them to outgoing `Cookie` request headers. It is meant
 * for ACP routing affinity across reconnects, not authentication or
 * authorization, and not as a general-purpose browser cookie jar: it
 * intentionally does not implement domain/path matching,
 * expiry, `Secure`, `HttpOnly`, or `SameSite` handling.
 */
export interface AcpCookieStore {
    /** Stores cookies from response headers. */
    store(headers: Headers): void;
    /** Applies stored cookies to outgoing request headers. */
    apply(headers: Headers): void;
    /** Clears all stored cookies. */
    clear(): void;
}
/** In-memory implementation of {@link AcpCookieStore}. */
export declare class MemoryAcpCookieStore implements AcpCookieStore {
    private readonly cookies;
    store(headers: Headers): void;
    apply(headers: Headers): void;
    clear(): void;
    private cookieHeader;
}
