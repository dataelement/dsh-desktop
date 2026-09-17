/**
 * Newline-delimited JSON-RPC 2.0 over byte streams. Frames with `id` and
 * `method` are requests, `id` alone is a response, and `method` alone is a
 * notification. Malformed lines are ignored; handler failures become error frames.
 *
 * @module @deepseek-ai/dsh-sdk-protocol/transport
 */
import type { Readable, Writable } from 'node:stream';
type RequestHandler = (method: string, params: Record<string, unknown>) => Promise<unknown>;
type NotificationHandler = (method: string, params: Record<string, unknown>) => void;
/** A JSON-RPC error response, preserving the wire `code` and optional `data`. */
export declare class JsonRpcResponseError extends Error {
    readonly code: number | undefined;
    readonly data?: unknown | undefined;
    /**
     * @param code - the wire error code, or `undefined` when the peer sent none.
     * @param message - the wire error message.
     * @param data - the optional structured error payload, verbatim.
     */
    constructor(code: number | undefined, message: string, data?: unknown | undefined);
}
/**
 * Outbound request and notification surface used by the runtime server and
 * SDK clients.
 */
export interface JsonRpcTransportPeer {
    /**
     * Send a request and await its response.
     * @param method - the JSON-RPC method name.
     * @param params - the request parameters object.
     * @returns the result; rejects with {@link JsonRpcResponseError} on an error
     * response, and with a plain `Error` on a write failure or closure.
     */
    request(method: string, params: object): Promise<unknown>;
    /**
     * Send a notification; omitted params produce no `params` member.
     * @param method - the JSON-RPC method name.
     * @param params - the optional notification parameters object.
     */
    notify(method: string, params?: object): void;
}
/**
 * Line-delimited endpoint over caller-owned streams. {@link start} attaches
 * listeners; {@link close} detaches them and rejects pending requests without
 * destroying the streams. Missing request handlers return `-32601`; handler
 * failures return `-32603`. Notifications without a handler are dropped.
 */
export declare class JsonRpcLineTransport implements JsonRpcTransportPeer {
    private readonly input;
    private readonly output;
    private buffer;
    private readonly decoder;
    private started;
    private requestHandler;
    private notificationHandler;
    private readonly pending;
    constructor(input: Readable, output: Writable);
    /** Attach the input listeners and begin reading frames. Idempotent. */
    start(): void;
    /**
     * Detach listeners and reject pending requests. Safe before {@link start}.
     */
    close(): void;
    /**
     * Install the request handler, replacing any prior handler.
     * @param handler - resolves to the response `result`; a rejection becomes a
     * `-32603` error response carrying the message.
     */
    onRequest(handler: RequestHandler): void;
    /**
     * Install the notification handler, replacing any prior handler.
     * @param handler - invoked per notification with the method and normalized
     * params object.
     */
    onNotification(handler: NotificationHandler): void;
    /**
     * Send a request and await its response.
     * @param method - the JSON-RPC method name.
     * @param params - the request parameters object.
     * @param signal - optional abandonment signal: aborting removes the pending
     * entry (no state is retained for a response that may never come) and
     * rejects with the signal's reason.
     * @returns the result; rejects per {@link JsonRpcTransportPeer.request}.
     */
    request(method: string, params: object, signal?: AbortSignal): Promise<unknown>;
    notify(method: string, params?: object): void;
    /**
     * Wait for prior frame write callbacks. The empty barrier emits no bytes.
     * @returns a promise that settles with the output write callback.
     */
    flush(): Promise<void>;
    private readonly onData;
    private drainLines;
    private readonly onInputError;
    private readonly onInputEnd;
    private handleLine;
    private handleIncomingRequest;
    private handleIncomingResponse;
    private writeError;
    private write;
    private failPending;
}
export {};
//# sourceMappingURL=transport.d.ts.map