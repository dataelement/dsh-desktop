import type { WireStream } from "./stream.js";
/**
 * Any JSON-RPC message that can pass through an ACP stream.
 */
export type AnyMessage = AnyRequest | AnyResponse | AnyNotification;
/**
 * JSON-RPC request or notification that may appear in a batch call.
 */
export type AnyCall = AnyRequest | AnyNotification;
/**
 * Non-empty JSON-RPC batch call containing requests and/or notifications.
 */
export type AnyBatchCall = readonly [AnyCall, ...AnyCall[]];
/**
 * Non-empty JSON-RPC batch response.
 */
export type AnyBatchResponse = readonly [AnyResponse, ...AnyResponse[]];
/**
 * Valid non-empty JSON-RPC batch call or batch response.
 */
export type AnyBatchMessage = AnyBatchCall | AnyBatchResponse;
/**
 * Valid individual or non-empty batch JSON-RPC transport message.
 */
export type AnyWireMessage = AnyMessage | AnyBatchMessage;
/**
 * Raw JSON-RPC request message.
 */
export type AnyRequest = {
    /**
     * JSON-RPC protocol version.
     */
    jsonrpc: "2.0";
    /**
     * Request identifier echoed by the response.
     */
    id: string | number | null;
    /**
     * Method name to invoke.
     */
    method: string;
    /**
     * Optional method params.
     */
    params?: unknown;
};
/**
 * Raw JSON-RPC response message.
 */
export type AnyResponse = {
    /**
     * JSON-RPC protocol version.
     */
    jsonrpc: "2.0";
    /**
     * Request identifier this response resolves.
     */
    id: string | number | null;
} & Result<unknown>;
/**
 * Raw JSON-RPC notification message.
 */
export type AnyNotification = {
    /**
     * JSON-RPC protocol version.
     */
    jsonrpc: "2.0";
    /**
     * Notification method name.
     */
    method: string;
    /**
     * Optional notification params.
     */
    params?: unknown;
};
/**
 * JSON-RPC request identifier.
 */
export type JsonRpcId = string | number | null;
/**
 * Options for sending a JSON-RPC request.
 */
export type SendRequestOptions = {
    /**
     * Aborting this signal sends `$/cancel_request` for the outgoing request.
     * Cancellation is cooperative: the returned promise is still settled by the
     * peer's eventual response, which may be a normal result, partial result, or
     * `RequestError.requestCancelled()`.
     */
    cancellationSignal?: AbortSignal;
};
/**
 * One request entry passed to `Connection.sendBatch`.
 */
export type BatchRequest<Req = unknown, Resp = unknown, Output = Resp> = {
    readonly kind: "request";
    readonly method: string;
    readonly params?: Req;
    readonly mapResponse?: (response: Resp) => Output;
    readonly options?: SendRequestOptions;
};
/**
 * One notification entry passed to `Connection.sendBatch`.
 */
export type BatchNotification<Params = unknown> = {
    readonly kind: "notification";
    readonly method: string;
    readonly params?: Params;
};
/**
 * One outgoing JSON-RPC batch entry.
 */
export type BatchEntry = {
    readonly kind: "request";
    readonly method: string;
    readonly params?: unknown;
    readonly mapResponse?: (response: never) => unknown;
    readonly options?: SendRequestOptions;
} | BatchNotification;
/**
 * Creates a typed request descriptor for `Connection.sendBatch`.
 */
export declare function batchRequest<Req, Resp>(method: string, params?: Req, options?: SendRequestOptions): BatchRequest<Req, Resp>;
export declare function batchRequest<Req, Resp, Output>(method: string, params: Req | undefined, mapResponse: (response: Resp) => Output, options?: SendRequestOptions): BatchRequest<Req, Resp, Output>;
export declare function batchRequest<Req, Resp>(method: string, params: Req | undefined, mapResponse: undefined, options?: SendRequestOptions): BatchRequest<Req, Resp>;
/**
 * Creates a typed notification descriptor for `Connection.sendBatch`.
 */
export declare function batchNotification<Params>(method: string, params?: Params): BatchNotification<Params>;
export type BatchOutputs<Entries extends readonly BatchEntry[]> = {
    -readonly [Index in keyof Entries]: Entries[Index] extends BatchRequest<infer Req, infer Resp, infer Output> ? [Req, Resp] extends [unknown, unknown] ? Output : never : void;
};
/**
 * JSON-RPC result payload, either a successful result or an error.
 */
export type Result<T> = {
    /**
     * Successful result value.
     */
    result: T;
} | {
    /**
     * JSON-RPC error result.
     */
    error: ErrorResponse;
};
/**
 * JSON-RPC error response payload.
 */
export type ErrorResponse = {
    /**
     * JSON-RPC error code.
     */
    code: number;
    /**
     * Human-readable error message.
     */
    message: string;
    /**
     * Optional structured error data.
     */
    data?: unknown;
};
/**
 * Legacy request dispatcher callback.
 */
export type RequestHandler = (method: string, params: unknown, cx: ConnectionContext) => MaybePromise<unknown>;
/**
 * Legacy notification dispatcher callback.
 */
export type NotificationHandler = (method: string, params: unknown, cx: ConnectionContext) => MaybePromise<void>;
export declare function isJsonRpcMessage(value: unknown): value is AnyMessage;
/**
 * Returns whether a value is a non-empty batch of valid JSON-RPC messages.
 */
export declare function isJsonRpcBatchMessage(value: unknown): value is AnyBatchMessage;
/**
 * Returns whether a value is a valid individual or batch JSON-RPC message.
 */
export declare function isJsonRpcWireMessage(value: unknown): value is AnyWireMessage;
export declare function isRequestMessage(value: unknown): value is AnyRequest;
export declare function isResponseMessage(value: unknown): value is AnyResponse;
export declare function isNotificationMessage(value: unknown): value is AnyNotification;
export declare function isRecord(value: unknown): value is Record<string, unknown>;
/**
 * Value that may be returned synchronously or through a promise.
 */
export type MaybePromise<T> = T | Promise<T>;
/**
 * Incoming request passed to JSON-RPC handlers.
 */
export type IncomingRequest = {
    /**
     * Discriminates incoming requests from notifications.
     */
    kind: "request";
    /**
     * Request method name.
     */
    method: string;
    /**
     * Raw request params.
     */
    params: unknown;
    /**
     * Original wire request.
     */
    raw: AnyRequest;
    /**
     * AbortSignal that aborts when the peer sends `$/cancel_request` for this
     * request or when the connection closes.
     */
    signal: AbortSignal;
    /**
     * Responder used to complete the request.
     */
    responder: RequestResponder<unknown>;
};
/**
 * Incoming notification passed to JSON-RPC handlers.
 */
export type IncomingNotification = {
    /**
     * Discriminates incoming notifications from requests.
     */
    kind: "notification";
    /**
     * Notification method name.
     */
    method: string;
    /**
     * Raw notification params.
     */
    params: unknown;
    /**
     * Original wire notification.
     */
    raw: AnyNotification;
};
/**
 * Incoming request or notification.
 */
export type IncomingMessage = IncomingRequest | IncomingNotification;
/**
 * Result returned by a JSON-RPC handler.
 */
export type HandleResult = {
    /**
     * Indicates that no later handlers should see the message.
     */
    handled: true;
} | {
    /**
     * Indicates that later handlers may try to handle the message.
     */
    handled: false;
    /**
     * Optional replacement message to pass to later handlers.
     */
    message?: IncomingMessage;
    /**
     * Requeue this message if it remains unhandled.
     */
    retry?: boolean;
};
/**
 * Helpers for constructing `HandleResult` values.
 */
export declare const Handled: {
    /**
     * Marks a message as handled.
     */
    yes(): HandleResult;
    /**
     * Leaves a message unhandled so later handlers can process it.
     */
    no(message?: IncomingMessage, retry?: boolean): HandleResult;
};
/**
 * Handler in the lower-level JSON-RPC dispatch chain.
 */
export interface JsonRpcHandler {
    /**
     * Handles or passes through one incoming request or notification.
     */
    handleMessage(message: IncomingMessage, cx: ConnectionContext): MaybePromise<HandleResult | void>;
    /**
     * Optional label used for diagnostics.
     */
    describe?(): string;
}
/**
 * Typed request callback registered with `ConnectionBuilder.onReceiveRequest`.
 */
export type RequestCallback<Req, Resp> = (request: Req, responder: RequestResponder<Resp>, cx: ConnectionContext) => MaybePromise<HandleResult | void>;
/**
 * Typed notification callback registered with
 * `ConnectionBuilder.onReceiveNotification`.
 */
export type NotificationCallback<Notif> = (notification: Notif, cx: ConnectionContext) => MaybePromise<HandleResult | void>;
/**
 * Responder for one incoming JSON-RPC request.
 *
 * Handlers may use this when they need to decide exactly when or how the
 * response is sent.
 */
export declare class RequestResponder<Resp = unknown> {
    /**
     * Request ID to include in the response.
     */
    readonly id: string | number | null;
    private sendResult;
    /**
     * AbortSignal for this incoming request.
     */
    readonly signal: AbortSignal;
    private finishRequest?;
    private didRespond;
    constructor(
    /**
     * Request ID to include in the response.
     */
    id: string | number | null, sendResult: (result: Result<Resp>) => Promise<void>, 
    /**
     * AbortSignal for this incoming request.
     */
    signal?: AbortSignal, finishRequest?: (() => void) | undefined);
    /**
     * Whether this request has already received a response.
     */
    get responded(): boolean;
    /**
     * Sends a successful JSON-RPC response.
     */
    respond(response: Resp): Promise<void>;
    /**
     * Sends an error JSON-RPC response.
     */
    respondWithError(error: RequestError | ErrorResponse): Promise<void>;
    /**
     * Sends a complete JSON-RPC result payload.
     */
    respondWithResult(result: Result<Resp>): Promise<void>;
}
/**
 * Disposable handle returned when a handler is registered dynamically.
 */
export declare class HandlerRegistration {
    private disposeHandler;
    private active;
    constructor(disposeHandler: () => void);
    /**
     * Unregisters the associated handler.
     */
    dispose(): void;
    /**
     * Supports explicit resource management with `using`.
     */
    [Symbol.dispose](): void;
    /**
     * Returns this registration for call sites that intentionally keep it active.
     */
    runIndefinitely(): this;
}
/**
 * Per-connection context passed to low-level JSON-RPC handlers.
 */
export declare class ConnectionContext {
    private connection;
    constructor(connection: Connection);
    /**
     * Sends a request over the connection.
     */
    sendRequest<Req, Resp, Output = Resp>(method: string, params?: Req, mapResponse?: (response: Resp) => Output, options?: SendRequestOptions): Promise<Output>;
    /**
     * Sends a notification over the connection.
     */
    sendNotification<N>(method: string, params?: N): Promise<void>;
    /**
     * Sends a non-empty JSON-RPC batch in one transport message.
     */
    sendBatch<const Entries extends readonly BatchEntry[]>(entries: Entries & {
        readonly 0: BatchEntry;
    }): Promise<BatchOutputs<Entries>>;
    /**
     * Sends a protocol-level request cancellation notification.
     */
    sendCancelRequest(requestId: JsonRpcId): Promise<void>;
    /**
     * Registers a handler that can be disposed independently.
     */
    addDynamicHandler(handler: JsonRpcHandler): HandlerRegistration;
    /**
     * AbortSignal that aborts when the connection closes.
     */
    get signal(): AbortSignal;
    /**
     * Promise that resolves when the connection closes.
     */
    get closed(): Promise<void>;
}
/**
 * Options for constructing a lower-level JSON-RPC connection.
 */
export type ConnectionOptions = {
    /**
     * Extra handlers to prepend to the connection's handler chain.
     */
    handlers?: JsonRpcHandler[];
};
/**
 * Lower-level JSON-RPC connection over an ACP `Stream`.
 *
 * Most ACP integrations should use `agent(...)` or `client(...)`. Use this
 * class when building generic JSON-RPC middleware or custom dispatch behavior.
 */
export declare class Connection {
    private pendingResponses;
    private incomingRequests;
    private nextRequestId;
    private staticHandlers;
    private dynamicHandlers;
    private stream;
    private writeQueue;
    private abortController;
    private closedPromise;
    private retryQueue;
    private context;
    private receiveReader?;
    private allowBatches;
    constructor(requestHandler: RequestHandler, notificationHandler: NotificationHandler, stream: WireStream, options?: ConnectionOptions);
    constructor(stream: WireStream, handlers: JsonRpcHandler[], options?: ConnectionOptions);
    /**
     * Creates a builder for configuring a handler-based connection.
     */
    static builder(): ConnectionBuilder;
    /**
     * Runs an operation while the connection is open, then closes the connection.
     *
     * If the stream closes before `op` settles, the returned promise rejects with
     * the connection close reason.
     */
    runUntil<T>(op: (cx: ConnectionContext) => MaybePromise<T>): Promise<T>;
    /**
     * Adds a handler after the connection has started.
     *
     * Any messages queued with `Handled.no(message, true)` are retried after the
     * handler is added.
     */
    addDynamicHandler(handler: JsonRpcHandler): HandlerRegistration;
    /**
     * AbortSignal that aborts when the connection closes.
     */
    get signal(): AbortSignal;
    /**
     * Promise that resolves when the connection closes.
     */
    get closed(): Promise<void>;
    /**
     * Sends a JSON-RPC request.
     *
     * `mapResponse` can convert the raw result before the returned promise
     * resolves.
     */
    sendRequest<Req, Resp, Output = Resp>(method: string, params?: Req, mapResponse?: (response: Resp) => Output, options?: SendRequestOptions): Promise<Output>;
    /**
     * Sends a non-empty JSON-RPC batch in one transport message.
     *
     * Requests and notifications are processed independently by the peer. The
     * returned tuple preserves the input order: request entries resolve to their
     * mapped response, while notification entries resolve to `undefined`.
     */
    sendBatch<const Entries extends readonly BatchEntry[]>(entries: Entries & {
        readonly 0: BatchEntry;
    }): Promise<BatchOutputs<Entries>>;
    /**
     * Sends a protocol-level request cancellation notification.
     */
    sendCancelRequest(requestId: JsonRpcId): Promise<void>;
    /**
     * Sends a JSON-RPC notification.
     */
    sendNotification<N>(method: string, params?: N): Promise<void>;
    private prepareRequest;
    /**
     * Closes the connection and rejects pending requests.
     */
    close(error?: unknown): void;
    private initialize;
    private legacyHandler;
    private receive;
    private receiveWireMessage;
    private receiveBatch;
    private receiveMessage;
    private processIncomingMessage;
    private toIncomingMessage;
    private handleResponse;
    private handleProtocolNotification;
    private closedReason;
    private sendWireMessage;
}
/**
 * Builder for a lower-level handler-based JSON-RPC connection.
 */
export declare class ConnectionBuilder {
    private handlers;
    private connectionName?;
    /**
     * Sets a diagnostic name used by handlers created from this builder.
     */
    name(name: string): this;
    /**
     * Adds a raw JSON-RPC handler to the handler chain.
     */
    withHandler(handler: JsonRpcHandler): this;
    /**
     * Adds a handler that can inspect every incoming request or notification.
     *
     * Observer callbacks that return void pass the message through to later
     * handlers. Return `Handled.yes()` to stop dispatch explicitly.
     */
    onReceiveMessage(handler: (message: IncomingMessage, cx: ConnectionContext) => MaybePromise<HandleResult | void>): this;
    /**
     * Adds a typed request handler for one method.
     */
    onReceiveRequest<Req, Resp = unknown>(method: string, parse: (params: unknown) => Req, handler: RequestCallback<Req, Resp>): this;
    /**
     * Adds a typed notification handler for one method.
     */
    onReceiveNotification<Notif>(method: string, parse: (params: unknown) => Notif, handler: NotificationCallback<Notif>): this;
    /**
     * Connects the configured handlers to a stream.
     */
    connect(stream: WireStream, options?: ConnectionOptions): Connection;
    /**
     * Connects to a stream for the lifetime of `op`, then closes the connection.
     */
    connectWith<T>(stream: WireStream, op: (cx: ConnectionContext) => MaybePromise<T>, options?: ConnectionOptions): Promise<T>;
}
/**
 * JSON-RPC error object.
 *
 * Represents an error that occurred during method execution, following the
 * JSON-RPC 2.0 error object specification with optional additional data.
 *
 * See protocol docs: [JSON-RPC Error Object](https://www.jsonrpc.org/specification#error_object)
 */
export declare class RequestError extends Error {
    /**
     * JSON-RPC error code.
     */
    code: number;
    /**
     * Additional JSON-RPC error data.
     */
    data?: unknown;
    constructor(
    /**
     * JSON-RPC error code.
     */
    code: number, message: string, data?: unknown);
    /**
     * Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.
     */
    static parseError(data?: unknown, additionalMessage?: string): RequestError;
    /**
     * The JSON sent is not a valid Request object.
     */
    static invalidRequest(data?: unknown, additionalMessage?: string): RequestError;
    /**
     * The method does not exist / is not available.
     */
    static methodNotFound(method: string): RequestError;
    /**
     * Invalid method parameter(s).
     */
    static invalidParams(data?: unknown, additionalMessage?: string): RequestError;
    /**
     * Internal JSON-RPC error.
     */
    static internalError(data?: unknown, additionalMessage?: string): RequestError;
    /**
     * Execution of the request was aborted.
     */
    static requestCancelled(data?: unknown, additionalMessage?: string): RequestError;
    /**
     * Authentication required.
     */
    static authRequired(data?: unknown, additionalMessage?: string): RequestError;
    /**
     * Resource, such as a file, was not found
     */
    static resourceNotFound(uri?: string): RequestError;
    /**
     * Converts this error to a JSON-RPC result object.
     */
    toResult<T>(): Result<T>;
    /**
     * Converts this error to a JSON-RPC error response payload.
     */
    toErrorResponse(): ErrorResponse;
}
