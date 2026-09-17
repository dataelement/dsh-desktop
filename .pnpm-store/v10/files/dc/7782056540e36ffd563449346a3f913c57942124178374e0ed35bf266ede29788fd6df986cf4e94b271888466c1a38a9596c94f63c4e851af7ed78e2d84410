const CANCEL_REQUEST_METHOD = "$/cancel_request";
export function batchRequest(method, params, mapResponseOrOptions, options) {
    const mapResponse = typeof mapResponseOrOptions === "function"
        ? mapResponseOrOptions
        : undefined;
    const requestOptions = typeof mapResponseOrOptions === "function"
        ? options
        : (mapResponseOrOptions ?? options);
    return {
        kind: "request",
        method,
        params,
        mapResponse,
        options: requestOptions,
    };
}
/**
 * Creates a typed notification descriptor for `Connection.sendBatch`.
 */
export function batchNotification(method, params) {
    return { kind: "notification", method, params };
}
export function isJsonRpcMessage(value) {
    return (isRequestMessage(value) ||
        isResponseMessage(value) ||
        isNotificationMessage(value));
}
/**
 * Returns whether a value is a non-empty batch of valid JSON-RPC messages.
 */
export function isJsonRpcBatchMessage(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return false;
    }
    return (value.every((message) => isRequestMessage(message) || isNotificationMessage(message)) || value.every((message) => isResponseMessage(message)));
}
/**
 * Returns whether a value is a valid individual or batch JSON-RPC message.
 */
export function isJsonRpcWireMessage(value) {
    return isJsonRpcMessage(value) || isJsonRpcBatchMessage(value);
}
export function isRequestMessage(value) {
    return (isJsonRpcEnvelope(value) &&
        "id" in value &&
        typeof value["method"] === "string" &&
        isJsonRpcId(value["id"]));
}
export function isResponseMessage(value) {
    if (!isJsonRpcEnvelope(value) || "method" in value) {
        return false;
    }
    if (!("id" in value) || !isJsonRpcId(value["id"])) {
        return false;
    }
    const hasResult = Object.hasOwn(value, "result");
    const hasError = Object.hasOwn(value, "error");
    if (hasResult === hasError) {
        return false;
    }
    return !hasError || isErrorResponse(value["error"]);
}
export function isNotificationMessage(value) {
    return (isJsonRpcEnvelope(value) &&
        !("id" in value) &&
        typeof value["method"] === "string");
}
export function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function isJsonRpcEnvelope(value) {
    return isRecord(value) && value["jsonrpc"] === "2.0";
}
function isJsonRpcId(value) {
    return (value === null ||
        typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value)));
}
/**
 * Detects response-shaped objects, including malformed responses, so they are
 * never handled as calls that require a JSON-RPC response.
 *
 * @internal
 */
export function isResponseShapedMessage(value) {
    return (isRecord(value) &&
        !("method" in value) &&
        ("id" in value || "result" in value || "error" in value));
}
/**
 * Classifies a potentially malformed batch using the direction established by
 * its valid entries. A valid call takes precedence because response members in
 * a call batch must be rejected. Otherwise, a valid response establishes
 * response semantics so malformed siblings cannot provoke another response.
 * Shape hints are used only when the batch has no valid messages; an `id` alone
 * is ambiguous, and batches without a direction hint default to call semantics.
 *
 * @internal
 */
export function isResponseBatch(batch) {
    let hasValidCall = false;
    let hasValidResponse = false;
    let hasCallShape = false;
    let hasResponseShape = false;
    for (const entry of batch) {
        hasValidCall ||= isRequestMessage(entry) || isNotificationMessage(entry);
        hasValidResponse ||= isResponseMessage(entry);
        if (!isRecord(entry)) {
            continue;
        }
        hasCallShape ||= "method" in entry;
        hasResponseShape ||= "result" in entry || "error" in entry;
    }
    if (hasValidCall) {
        return false;
    }
    if (hasValidResponse) {
        return true;
    }
    return hasResponseShape && !hasCallShape;
}
function cancelRequestId(params) {
    if (!isRecord(params) || !isJsonRpcId(params["requestId"])) {
        return undefined;
    }
    return params["requestId"];
}
function isErrorResponse(value) {
    return (isRecord(value) &&
        typeof value["code"] === "number" &&
        Number.isInteger(value["code"]) &&
        typeof value["message"] === "string");
}
/**
 * Helpers for constructing `HandleResult` values.
 */
export const Handled = {
    /**
     * Marks a message as handled.
     */
    yes() {
        return { handled: true };
    },
    /**
     * Leaves a message unhandled so later handlers can process it.
     */
    no(message, retry = false) {
        return { handled: false, message, retry };
    },
};
function rejectedPromise(error) {
    const promise = Promise.reject(error);
    promise.catch(() => { });
    return promise;
}
function errorDetails(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === "object" &&
        error != null &&
        "message" in error &&
        typeof error.message === "string") {
        return error.message;
    }
    return undefined;
}
function isZodError(error) {
    return (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "ZodError" &&
        "issues" in error &&
        Array.isArray(error.issues) &&
        "format" in error &&
        typeof error.format === "function");
}
function errorToResult(error) {
    if (error instanceof RequestError) {
        return error.toResult();
    }
    if (isZodError(error)) {
        return RequestError.invalidParams(error.format()).toResult();
    }
    const details = errorDetails(error);
    try {
        return RequestError.internalError(details ? JSON.parse(details) : {}).toResult();
    }
    catch {
        return RequestError.internalError({ details }).toResult();
    }
}
function requestCancelledError(reason) {
    if (reason instanceof RequestError && reason.code === -32800) {
        return reason;
    }
    return RequestError.requestCancelled(reason);
}
function errorToRequestResult(error, signal) {
    const requestCancelled = abortErrorToRequestCancelled(error, signal);
    return requestCancelled ? requestCancelled.toResult() : errorToResult(error);
}
function abortErrorToRequestCancelled(error, signal) {
    if (!signal.aborted || !isAbortError(error)) {
        return undefined;
    }
    return requestCancelledError(signal.reason);
}
function isAbortError(error) {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    const maybeAbortError = error;
    return (maybeAbortError.name === "AbortError" ||
        maybeAbortError.code === "ABORT_ERR");
}
/**
 * Responder for one incoming JSON-RPC request.
 *
 * Handlers may use this when they need to decide exactly when or how the
 * response is sent.
 */
export class RequestResponder {
    id;
    sendResult;
    signal;
    finishRequest;
    didRespond = false;
    constructor(
    /**
     * Request ID to include in the response.
     */
    id, sendResult, 
    /**
     * AbortSignal for this incoming request.
     */
    signal = new AbortController().signal, finishRequest) {
        this.id = id;
        this.sendResult = sendResult;
        this.signal = signal;
        this.finishRequest = finishRequest;
    }
    /**
     * Whether this request has already received a response.
     */
    get responded() {
        return this.didRespond;
    }
    /**
     * Sends a successful JSON-RPC response.
     */
    respond(response) {
        return this.respondWithResult({ result: (response ?? null) });
    }
    /**
     * Sends an error JSON-RPC response.
     */
    respondWithError(error) {
        const errorResponse = error instanceof RequestError ? error.toErrorResponse() : error;
        return this.respondWithResult({ error: errorResponse });
    }
    /**
     * Sends a complete JSON-RPC result payload.
     */
    respondWithResult(result) {
        if (this.didRespond) {
            return rejectedPromise(new Error("JSON-RPC request already responded"));
        }
        this.didRespond = true;
        return this.sendResult(result).finally(() => {
            this.finishRequest?.();
        });
    }
}
const requestBatchSizes = new WeakMap();
/** @internal */
export function requestBatchSize(responder) {
    return requestBatchSizes.get(responder);
}
/**
 * Disposable handle returned when a handler is registered dynamically.
 */
export class HandlerRegistration {
    disposeHandler;
    active = true;
    constructor(disposeHandler) {
        this.disposeHandler = disposeHandler;
    }
    /**
     * Unregisters the associated handler.
     */
    dispose() {
        if (!this.active) {
            return;
        }
        this.active = false;
        this.disposeHandler();
    }
    /**
     * Supports explicit resource management with `using`.
     */
    [Symbol.dispose]() {
        this.dispose();
    }
    /**
     * Returns this registration for call sites that intentionally keep it active.
     */
    runIndefinitely() {
        return this;
    }
}
/**
 * Per-connection context passed to low-level JSON-RPC handlers.
 */
export class ConnectionContext {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    /**
     * Sends a request over the connection.
     */
    sendRequest(method, params, mapResponse, options) {
        return this.connection.sendRequest(method, params, mapResponse, options);
    }
    /**
     * Sends a notification over the connection.
     */
    sendNotification(method, params) {
        return this.connection.sendNotification(method, params);
    }
    /**
     * Sends a non-empty JSON-RPC batch in one transport message.
     */
    sendBatch(entries) {
        return this.connection.sendBatch(entries);
    }
    /**
     * Sends a protocol-level request cancellation notification.
     */
    sendCancelRequest(requestId) {
        return this.connection.sendCancelRequest(requestId);
    }
    /**
     * Registers a handler that can be disposed independently.
     */
    addDynamicHandler(handler) {
        return this.connection.addDynamicHandler(handler);
    }
    /**
     * AbortSignal that aborts when the connection closes.
     */
    get signal() {
        return this.connection.signal;
    }
    /**
     * Promise that resolves when the connection closes.
     */
    get closed() {
        return this.connection.closed;
    }
}
/**
 * Lower-level JSON-RPC connection over an ACP `Stream`.
 *
 * Most ACP integrations should use `agent(...)` or `client(...)`. Use this
 * class when building generic JSON-RPC middleware or custom dispatch behavior.
 */
export class Connection {
    pendingResponses = new Map();
    incomingRequests = new Map();
    nextRequestId = 0;
    staticHandlers = [];
    dynamicHandlers = new Set();
    stream;
    writeQueue = Promise.resolve();
    abortController = new AbortController();
    closedPromise;
    retryQueue = [];
    context = new ConnectionContext(this);
    receiveReader;
    allowBatches = true;
    constructor(requestHandlerOrStream, notificationHandlerOrHandlers, streamOrOptions, options) {
        if (typeof requestHandlerOrStream === "function") {
            const requestHandler = requestHandlerOrStream;
            const notificationHandler = notificationHandlerOrHandlers;
            const stream = streamOrOptions;
            this.initialize(stream, [
                ...(options?.handlers ?? []),
                this.legacyHandler(requestHandler, notificationHandler),
            ], options);
            return;
        }
        const stream = requestHandlerOrStream;
        const handlers = notificationHandlerOrHandlers;
        const connectionOptions = streamOrOptions;
        this.initialize(stream, [...(connectionOptions?.handlers ?? []), ...handlers], connectionOptions);
    }
    /**
     * Creates a builder for configuring a handler-based connection.
     */
    static builder() {
        return new ConnectionBuilder();
    }
    /**
     * Runs an operation while the connection is open, then closes the connection.
     *
     * If the stream closes before `op` settles, the returned promise rejects with
     * the connection close reason.
     */
    runUntil(op) {
        let opSettled = false;
        const opPromise = Promise.resolve()
            .then(() => op(this.context))
            .finally(() => {
            opSettled = true;
        });
        const closedPromise = this.closed.then(() => {
            if (opSettled) {
                return new Promise(() => { });
            }
            throw this.closedReason();
        });
        return Promise.race([opPromise, closedPromise]).finally(() => {
            opSettled = true;
            this.close();
        });
    }
    /**
     * Adds a handler after the connection has started.
     *
     * Any messages queued with `Handled.no(message, true)` are retried after the
     * handler is added.
     */
    addDynamicHandler(handler) {
        this.dynamicHandlers.add(handler);
        if (this.retryQueue.length > 0) {
            for (const message of this.retryQueue.splice(0)) {
                void this.processIncomingMessage(message).catch((error) => this.close(error));
            }
        }
        return new HandlerRegistration(() => {
            this.dynamicHandlers.delete(handler);
        });
    }
    /**
     * AbortSignal that aborts when the connection closes.
     */
    get signal() {
        return this.abortController.signal;
    }
    /**
     * Promise that resolves when the connection closes.
     */
    get closed() {
        return this.closedPromise;
    }
    /** @internal */
    getContext() {
        return this.context;
    }
    /**
     * Sends a JSON-RPC request.
     *
     * `mapResponse` can convert the raw result before the returned promise
     * resolves.
     */
    sendRequest(method, params, mapResponse, options = {}) {
        if (this.abortController.signal.aborted) {
            return rejectedPromise(this.closedReason());
        }
        const request = this.prepareRequest(method, params, mapResponse, options);
        const requestSent = this.sendWireMessage(request.message);
        void requestSent.catch(() => { });
        if (options.cancellationSignal?.aborted) {
            request.cancel();
        }
        return request.response;
    }
    /**
     * Sends a non-empty JSON-RPC batch in one transport message.
     *
     * Requests and notifications are processed independently by the peer. The
     * returned tuple preserves the input order: request entries resolve to their
     * mapped response, while notification entries resolve to `undefined`.
     */
    sendBatch(entries) {
        if (this.abortController.signal.aborted) {
            return rejectedPromise(this.closedReason());
        }
        if (!this.allowBatches) {
            return rejectedPromise(new TypeError("JSON-RPC batches are not supported on this connection"));
        }
        if (entries.length === 0) {
            return rejectedPromise(new TypeError("JSON-RPC batch must contain at least one entry"));
        }
        const messages = [];
        const cancellations = [];
        const outputs = [];
        for (const entry of entries) {
            if (entry.kind === "notification") {
                messages.push({
                    jsonrpc: "2.0",
                    method: entry.method,
                    params: entry.params,
                });
                outputs.push(Promise.resolve(undefined));
                continue;
            }
            const request = this.prepareRequest(entry.method, entry.params, entry.mapResponse, entry.options);
            messages.push(request.message);
            outputs.push(request.response);
            cancellations.push({
                signal: entry.options?.cancellationSignal,
                cancel: request.cancel,
            });
        }
        const batch = messages;
        const batchSent = this.sendWireMessage(batch);
        for (const cancellation of cancellations) {
            if (cancellation.signal?.aborted) {
                cancellation.cancel();
            }
        }
        const response = Promise.all([batchSent, ...outputs]).then(([, ...resolved]) => resolved);
        response.catch(() => { });
        return response;
    }
    /**
     * Sends a protocol-level request cancellation notification.
     */
    sendCancelRequest(requestId) {
        return this.sendNotification(CANCEL_REQUEST_METHOD, { requestId });
    }
    /**
     * Sends a JSON-RPC notification.
     */
    sendNotification(method, params) {
        if (this.abortController.signal.aborted) {
            return rejectedPromise(this.closedReason());
        }
        return this.sendWireMessage({ jsonrpc: "2.0", method, params });
    }
    prepareRequest(method, params, mapResponse, options = {}) {
        const id = this.nextRequestId++;
        let cancel = () => { };
        const response = new Promise((resolve, reject) => {
            const pendingResponse = {
                resolve: (value) => {
                    try {
                        resolve(mapResponse ? mapResponse(value) : value);
                    }
                    catch (error) {
                        reject(error);
                    }
                },
                reject,
            };
            cancel = () => {
                if (pendingResponse.cancellationSent) {
                    return;
                }
                pendingResponse.cancellationSent = true;
                pendingResponse.cleanup?.();
                void this.sendCancelRequest(id).catch(() => { });
            };
            options.cancellationSignal?.addEventListener("abort", cancel, {
                once: true,
            });
            pendingResponse.cleanup = () => {
                options.cancellationSignal?.removeEventListener("abort", cancel);
            };
            this.pendingResponses.set(id, pendingResponse);
        });
        response.catch(() => { });
        return {
            message: { jsonrpc: "2.0", id, method, params },
            response,
            cancel: () => cancel(),
        };
    }
    /**
     * Closes the connection and rejects pending requests.
     */
    close(error) {
        if (this.abortController.signal.aborted) {
            return;
        }
        const closeError = error ?? new Error("ACP connection closed");
        this.abortController.abort(closeError);
        for (const pendingResponse of this.pendingResponses.values()) {
            pendingResponse.cleanup?.();
            pendingResponse.reject(closeError);
        }
        this.pendingResponses.clear();
        for (const controller of this.incomingRequests.values()) {
            controller.abort(closeError);
        }
        this.incomingRequests.clear();
        void this.receiveReader?.cancel(closeError).catch(() => { });
    }
    initialize(stream, handlers, options) {
        this.stream = stream;
        this.staticHandlers = handlers;
        this.allowBatches = options?.allowBatches ?? true;
        this.closedPromise = new Promise((resolve) => {
            this.abortController.signal.addEventListener("abort", () => resolve());
        });
        void this.receive();
    }
    legacyHandler(requestHandler, notificationHandler) {
        return {
            handleMessage: async (message, cx) => {
                if (message.kind === "request") {
                    const result = await requestHandler(message.method, message.params, cx);
                    await message.responder.respond(result);
                }
                else {
                    await notificationHandler(message.method, message.params, cx);
                }
                return Handled.yes();
            },
        };
    }
    async receive() {
        let closeError = undefined;
        try {
            const reader = this.stream.readable.getReader();
            this.receiveReader = reader;
            try {
                while (!this.abortController.signal.aborted) {
                    const { value: message, done } = await reader.read();
                    if (this.abortController.signal.aborted) {
                        break;
                    }
                    if (done) {
                        break;
                    }
                    this.receiveWireMessage(message);
                }
            }
            finally {
                if (this.receiveReader === reader) {
                    this.receiveReader = undefined;
                }
                reader.releaseLock();
            }
        }
        catch (error) {
            closeError = error;
        }
        finally {
            this.close(closeError);
        }
    }
    receiveWireMessage(message) {
        if (Array.isArray(message)) {
            if (!this.allowBatches) {
                this.close(new TypeError("JSON-RPC batches are not supported on this connection"));
                return;
            }
            this.receiveBatch(message);
            return;
        }
        if (!isRequestMessage(message) &&
            !isNotificationMessage(message) &&
            !isResponseShapedMessage(message)) {
            void this.sendWireMessage(protocolErrorResponse(RequestError.invalidRequest(message))).catch(() => { });
            return;
        }
        this.receiveMessage(message);
    }
    receiveBatch(batch) {
        if (batch.length === 0) {
            void this.sendWireMessage(protocolErrorResponse(RequestError.invalidRequest(batch))).catch(() => { });
            return;
        }
        const responseBatch = isResponseBatch(batch);
        const responseCount = responseBatch
            ? 0
            : batch.reduce((count, message) => count + (isNotificationMessage(message) ? 0 : 1), 0);
        let remaining = responseCount;
        let remainingNotifications = batch.reduce((count, message) => count + (isNotificationMessage(message) ? 1 : 0), 0);
        let responseSent = false;
        const responses = [];
        const sendResponsesIfReady = async () => {
            if (responseSent ||
                remaining !== 0 ||
                remainingNotifications !== 0 ||
                responses.length === 0) {
                return;
            }
            responseSent = true;
            await this.sendWireMessage(responses);
        };
        const collectResponse = async (response) => {
            responses.push(response);
            remaining -= 1;
            await sendResponsesIfReady();
        };
        for (const message of batch) {
            if (responseBatch) {
                // A response batch is not a request, so malformed members must not
                // provoke responses. Still route response-shaped objects so a
                // malformed response with a matching ID rejects its pending request.
                if (isResponseShapedMessage(message)) {
                    this.receiveMessage(message);
                }
                continue;
            }
            if (!isRequestMessage(message) && !isNotificationMessage(message)) {
                void collectResponse(protocolErrorResponse(RequestError.invalidRequest(message))).catch(() => { });
                continue;
            }
            const processing = this.receiveMessage(message, isRequestMessage(message) ? collectResponse : undefined, batch.length);
            if (isNotificationMessage(message)) {
                void processing.finally(() => {
                    remainingNotifications -= 1;
                    void sendResponsesIfReady().catch((error) => this.close(error));
                });
            }
        }
    }
    receiveMessage(message, sendResponse, batchSize) {
        if (this.abortController.signal.aborted) {
            return Promise.resolve();
        }
        // Guard against transports that deliver non-object values; the `in`
        // checks below would throw and tear down the connection.
        if (!isRecord(message)) {
            console.error("Invalid message", { message });
            return Promise.resolve();
        }
        if ("method" in message) {
            if (!("id" in message)) {
                this.handleProtocolNotification(message);
            }
            return this.processIncomingMessage(this.toIncomingMessage(message, sendResponse, batchSize)).catch((error) => this.close(error));
        }
        else if ("id" in message) {
            this.handleResponse(message);
        }
        else {
            console.error("Invalid message", { message });
        }
        return Promise.resolve();
    }
    async processIncomingMessage(message) {
        if (this.abortController.signal.aborted) {
            return;
        }
        let current = message;
        let retry = false;
        try {
            for (const handler of [
                ...this.staticHandlers,
                ...this.dynamicHandlers.values(),
            ]) {
                if (this.abortController.signal.aborted) {
                    return;
                }
                const result = (await handler.handleMessage(current, this.context)) ?? {
                    handled: true,
                };
                if (result.handled) {
                    return;
                }
                current = result.message ?? current;
                retry = retry || Boolean(result.retry);
            }
            if (retry) {
                this.retryQueue.push(current);
            }
            else if (current.kind === "request") {
                await current.responder.respondWithError(RequestError.methodNotFound(current.method));
            }
        }
        catch (error) {
            if (this.abortController.signal.aborted) {
                return;
            }
            if (current.kind === "request" && !current.responder.responded) {
                await current.responder.respondWithResult(errorToRequestResult(error, current.responder.signal));
            }
            else {
                const response = errorToResult(error);
                if ("error" in response) {
                    console.error("Error handling notification", message.raw, response.error);
                }
            }
        }
    }
    toIncomingMessage(message, sendResponse, batchSize) {
        if ("id" in message) {
            const abortController = new AbortController();
            this.incomingRequests.set(message.id, abortController);
            const finishRequest = () => {
                if (this.incomingRequests.get(message.id) === abortController) {
                    this.incomingRequests.delete(message.id);
                }
            };
            const responder = new RequestResponder(message.id, (result) => {
                const response = {
                    jsonrpc: "2.0",
                    id: message.id,
                    ...result,
                };
                return sendResponse
                    ? sendResponse(response)
                    : this.sendWireMessage(response);
            }, abortController.signal, finishRequest);
            if (batchSize !== undefined) {
                requestBatchSizes.set(responder, batchSize);
            }
            return {
                kind: "request",
                method: message.method,
                params: message.params,
                raw: message,
                signal: abortController.signal,
                responder,
            };
        }
        return {
            kind: "notification",
            method: message.method,
            params: message.params,
            raw: message,
        };
    }
    handleResponse(response) {
        const pendingResponse = this.pendingResponses.get(response.id);
        if (pendingResponse) {
            this.pendingResponses.delete(response.id);
            pendingResponse.cleanup?.();
            if (!isResponseMessage(response)) {
                pendingResponse.reject(RequestError.invalidRequest(response));
            }
            else if ("result" in response) {
                pendingResponse.resolve(response.result);
            }
            else {
                const { code, message, data } = response.error;
                pendingResponse.reject(new RequestError(code, message, data));
            }
        }
        else {
            console.error("Got response to unknown request", response.id);
        }
    }
    handleProtocolNotification(message) {
        if (message.method !== CANCEL_REQUEST_METHOD) {
            return;
        }
        const requestId = cancelRequestId(message.params);
        if (requestId === undefined) {
            return;
        }
        const controller = this.incomingRequests.get(requestId);
        if (!controller || controller.signal.aborted) {
            return;
        }
        controller.abort(RequestError.requestCancelled({ requestId }));
    }
    closedReason() {
        return (this.abortController.signal.reason ?? new Error("ACP connection closed"));
    }
    async sendWireMessage(message) {
        if (this.abortController.signal.aborted) {
            return rejectedPromise(this.closedReason());
        }
        this.writeQueue = this.writeQueue
            .then(async () => {
            if (this.abortController.signal.aborted) {
                throw this.closedReason();
            }
            const writer = this.stream.writable.getWriter();
            try {
                await writer.write(message);
            }
            finally {
                writer.releaseLock();
            }
        })
            .catch((error) => {
            this.close(error);
            throw error;
        });
        return this.writeQueue;
    }
}
/**
 * Builder for a lower-level handler-based JSON-RPC connection.
 */
export class ConnectionBuilder {
    handlers = [];
    connectionName;
    /**
     * Sets a diagnostic name used by handlers created from this builder.
     */
    name(name) {
        this.connectionName = name;
        return this;
    }
    /**
     * Adds a raw JSON-RPC handler to the handler chain.
     */
    withHandler(handler) {
        this.handlers.push(handler);
        return this;
    }
    /**
     * Adds a handler that can inspect every incoming request or notification.
     *
     * Observer callbacks that return void pass the message through to later
     * handlers. Return `Handled.yes()` to stop dispatch explicitly.
     */
    onReceiveMessage(handler) {
        return this.withHandler({
            handleMessage: async (message, cx) => (await handler(message, cx)) ?? Handled.no(message),
            describe: () => this.connectionName ?? "onReceiveMessage",
        });
    }
    /**
     * Adds a typed request handler for one method.
     */
    onReceiveRequest(method, parse, handler) {
        return this.withHandler({
            handleMessage: async (message, cx) => {
                if (message.kind !== "request" || message.method !== method) {
                    return Handled.no(message);
                }
                const request = parse(message.params);
                return ((await handler(request, message.responder, cx)) ?? Handled.yes());
            },
            describe: () => `${this.connectionName ?? "request"}:${method}`,
        });
    }
    /**
     * Adds a typed notification handler for one method.
     */
    onReceiveNotification(method, parse, handler) {
        return this.withHandler({
            handleMessage: async (message, cx) => {
                if (message.kind !== "notification" || message.method !== method) {
                    return Handled.no(message);
                }
                const notification = parse(message.params);
                return (await handler(notification, cx)) ?? Handled.yes();
            },
            describe: () => `${this.connectionName ?? "notification"}:${method}`,
        });
    }
    /**
     * Connects the configured handlers to a stream.
     */
    connect(stream, options) {
        return new Connection(stream, this.handlers, options);
    }
    /**
     * Connects to a stream for the lifetime of `op`, then closes the connection.
     */
    connectWith(stream, op, options) {
        return this.connect(stream, options).runUntil(op);
    }
}
/**
 * JSON-RPC error object.
 *
 * Represents an error that occurred during method execution, following the
 * JSON-RPC 2.0 error object specification with optional additional data.
 *
 * See protocol docs: [JSON-RPC Error Object](https://www.jsonrpc.org/specification#error_object)
 */
export class RequestError extends Error {
    code;
    /**
     * Additional JSON-RPC error data.
     */
    data;
    constructor(
    /**
     * JSON-RPC error code.
     */
    code, message, data) {
        super(message);
        this.code = code;
        this.name = "RequestError";
        this.data = data;
    }
    /**
     * Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.
     */
    static parseError(data, additionalMessage) {
        return new RequestError(-32700, `Parse error${additionalMessage ? `: ${additionalMessage}` : ""}`, data);
    }
    /**
     * The JSON sent is not a valid Request object.
     */
    static invalidRequest(data, additionalMessage) {
        return new RequestError(-32600, `Invalid request${additionalMessage ? `: ${additionalMessage}` : ""}`, data);
    }
    /**
     * The method does not exist / is not available.
     */
    static methodNotFound(method) {
        return new RequestError(-32601, `"Method not found": ${method}`, {
            method,
        });
    }
    /**
     * Invalid method parameter(s).
     */
    static invalidParams(data, additionalMessage) {
        return new RequestError(-32602, `Invalid params${additionalMessage ? `: ${additionalMessage}` : ""}`, data);
    }
    /**
     * Internal JSON-RPC error.
     */
    static internalError(data, additionalMessage) {
        return new RequestError(-32603, `Internal error${additionalMessage ? `: ${additionalMessage}` : ""}`, data);
    }
    /**
     * Execution of the request was aborted.
     */
    static requestCancelled(data, additionalMessage) {
        return new RequestError(-32800, `Request cancelled${additionalMessage ? `: ${additionalMessage}` : ""}`, data);
    }
    /**
     * Authentication required.
     */
    static authRequired(data, additionalMessage) {
        return new RequestError(-32000, `Authentication required${additionalMessage ? `: ${additionalMessage}` : ""}`, data);
    }
    /**
     * Resource, such as a file, was not found
     */
    static resourceNotFound(uri) {
        return new RequestError(-32002, `Resource not found${uri ? `: ${uri}` : ""}`, uri && { uri });
    }
    /**
     * Converts this error to a JSON-RPC result object.
     */
    toResult() {
        return {
            error: {
                code: this.code,
                message: this.message,
                data: this.data,
            },
        };
    }
    /**
     * Converts this error to a JSON-RPC error response payload.
     */
    toErrorResponse() {
        return {
            code: this.code,
            message: this.message,
            data: this.data,
        };
    }
}
/**
 * Creates a JSON-RPC error response for a request whose ID cannot be known.
 *
 * @internal
 */
export function protocolErrorResponse(error) {
    return {
        jsonrpc: "2.0",
        id: null,
        error: error.toErrorResponse(),
    };
}
//# sourceMappingURL=jsonrpc.js.map