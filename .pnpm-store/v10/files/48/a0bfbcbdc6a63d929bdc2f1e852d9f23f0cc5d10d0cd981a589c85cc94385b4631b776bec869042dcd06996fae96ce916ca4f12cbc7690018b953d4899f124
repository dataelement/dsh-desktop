import type { AcpCookieStore } from "./cookie-store.js";
import type { Stream } from "./stream.js";
export interface HttpStreamOptions {
    /** Fetch implementation to use. Defaults to `globalThis.fetch`. */
    readonly fetch?: typeof globalThis.fetch;
    /** Headers to include on every HTTP/SSE request. */
    readonly headers?: Record<string, string>;
    /** Cookie handling policy for transport requests. Defaults to `include`. */
    readonly cookies?: "include" | "omit";
    /**
     * Caller-owned affinity cookie store to reuse across reconnects.
     *
     * If omitted, the SDK creates an ephemeral per-stream store and clears it
     * when the stream closes/errors.
     */
    readonly cookieStore?: AcpCookieStore;
}
export { MemoryAcpCookieStore } from "./cookie-store.js";
export type { AcpCookieStore } from "./cookie-store.js";
/**
 * Creates an ACP Stream over Streamable HTTP.
 *
 * Uses POST for client messages and SSE GET streams for server messages.
 * Cookies are included by default. Pass a caller-owned `AcpCookieStore` to
 * retain affinity cookies across fresh streams during reconnect.
 *
 * ACP v1 reconnect creates a new transport connection; callers should save the
 * ACP `sessionId`, create a new stream with the same auth headers/cookie store,
 * call `initialize`, verify `agentCapabilities.loadSession`, then call
 * `session/load`. Agents must authorize `session/load`, and ACP v1 does not
 * replay in-flight transport messages emitted while disconnected.
 */
export declare function createHttpStream(serverUrl: string, options?: HttpStreamOptions): Stream;
