import type { AcpCookieStore } from "./cookie-store.js";
import type { WebSocketLike } from "./ws-utils.js";
import type { AnyMessage, AnyWireMessage } from "./jsonrpc.js";
import type { Stream } from "./stream.js";
export interface WebSocketStreamOptions {
    /** WebSocket subprotocols to request. */
    readonly protocols?: string[];
    /**
     * Headers for WebSocket constructors that support them, such as Node `ws`.
     * Browser WebSocket constructors ignore custom headers.
     */
    readonly headers?: Record<string, string>;
    /** WebSocket constructor to use. Defaults to `globalThis.WebSocket`. */
    readonly WebSocket?: WebSocketConstructor;
    /** Cookie handling policy for transport requests. Defaults to `include`. */
    readonly cookies?: "include" | "omit";
    /**
     * Caller-owned affinity cookie store to reuse across reconnects.
     *
     * Browser WebSocket uses the platform cookie jar; Node/custom constructors
     * that support headers receive cookies from this store.
     */
    readonly cookieStore?: AcpCookieStore;
}
export { MemoryAcpCookieStore } from "./cookie-store.js";
export type { AcpCookieStore } from "./cookie-store.js";
/** Constructor shape used by `createWebSocketStream`. */
export interface WebSocketConstructor {
    new (url: string, protocols?: string | string[], options?: {
        headers?: Record<string, string>;
    }): WebSocketLike;
}
export type { WebSocketLike };
/**
 * Creates an ACP Stream over WebSocket.
 *
 * Sends and receives ACP JSON-RPC messages as WebSocket text frames. In Node,
 * pass a WebSocket constructor such as `ws.WebSocket` via `options.WebSocket`.
 * Browser WebSocket uses the platform cookie jar; Node/custom constructors
 * receive merged `Cookie` headers when supported and can store upgrade
 * `Set-Cookie` headers in a caller-owned `AcpCookieStore`.
 *
 * JSON-RPC batch arrays are supported when `Message` is a batch-capable type.
 * The default message type preserves the stable ACP v1 stream surface; draft
 * ACP v2 callers that access the stream directly can instantiate this function
 * with {@link AnyWireMessage} to write and read batches.
 *
 * ACP v1 reconnect creates a new transport connection; callers should save the
 * ACP `sessionId`, create a new stream with the same auth headers/cookie store,
 * call `initialize`, verify `agentCapabilities.loadSession`, then call
 * `session/load`. Agents must authorize `session/load`, and ACP v1 does not
 * replay in-flight transport messages emitted while disconnected.
 */
export declare function createWebSocketStream<Message extends AnyWireMessage = AnyMessage>(serverUrl: string, options?: WebSocketStreamOptions): Stream<Message>;
