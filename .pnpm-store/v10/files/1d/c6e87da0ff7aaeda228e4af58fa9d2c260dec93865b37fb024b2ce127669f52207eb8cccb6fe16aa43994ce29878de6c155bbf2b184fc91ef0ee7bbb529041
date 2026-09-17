import { isResponseMessage } from "./jsonrpc.js";
import { EVENT_STREAM_MIME_TYPE, HEADER_CONNECTION_ID, HEADER_SESSION_ID, JSON_MIME_TYPE, isInitializeRequest, messageIdKey, sessionIdFromMessageParams, sessionIdFromResponseResult, } from "./protocol.js";
import { MemoryAcpCookieStore } from "./cookie-store.js";
import { parseSseStream } from "./sse.js";
export { MemoryAcpCookieStore } from "./cookie-store.js";
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
export function createHttpStream(serverUrl, options = {}) {
    return new HttpStreamTransport(serverUrl, options).stream;
}
class HttpStreamTransport {
    serverUrl;
    stream;
    fetchImpl;
    headers;
    cookiePolicy;
    cookieStore;
    ownsCookieStore;
    abortController = new AbortController();
    knownSessions = new Set();
    sessionSseReady = new Map();
    pendingResponseSessions = new Map();
    pendingSessionRequests = new Map();
    readableController;
    connectionId;
    isClosed = false;
    writeChain = Promise.resolve();
    constructor(serverUrl, options) {
        this.serverUrl = serverUrl;
        this.fetchImpl = resolveFetch(options.fetch);
        this.headers = options.headers ?? {};
        this.cookiePolicy = options.cookies ?? "include";
        this.cookieStore = options.cookieStore ?? new MemoryAcpCookieStore();
        this.ownsCookieStore = options.cookieStore === undefined;
        this.stream = {
            readable: new ReadableStream({
                start: (controller) => {
                    this.readableController = controller;
                },
                cancel: () => this.close(),
            }),
            writable: new WritableStream({
                write: (message) => {
                    this.writeChain = this.writeChain.then(() => this.writeMessage(message));
                    return this.writeChain;
                },
                close: () => this.close(),
                abort: () => this.close(),
            }),
        };
    }
    async writeMessage(message) {
        if (this.isClosed) {
            throw new Error("ACP HTTP stream is closed");
        }
        if (Array.isArray(message)) {
            throw new TypeError("ACP HTTP transport does not support JSON-RPC batch messages");
        }
        if (!this.connectionId) {
            await this.postInitialize(message);
            return;
        }
        await this.postConnectedMessage(message);
    }
    async postInitialize(message) {
        let cleanupConnectionId;
        try {
            if (!isInitializeRequest(message)) {
                throw new Error("ACP HTTP stream first message must be initialize");
            }
            const response = await this.fetchRequest({
                method: "POST",
                headers: {
                    "Content-Type": JSON_MIME_TYPE,
                },
                body: JSON.stringify(message),
                signal: this.abortController.signal,
            });
            if (!response.ok) {
                throw await httpError("ACP initialize failed", response);
            }
            const connectionId = response.headers.get(HEADER_CONNECTION_ID);
            if (!connectionId) {
                throw new Error("ACP initialize response missing Acp-Connection-Id");
            }
            cleanupConnectionId = connectionId;
            this.throwIfClosedDuringInitialize();
            const body = await response.json();
            this.throwIfClosedDuringInitialize();
            if (!isResponseMessage(body)) {
                throw new Error("ACP initialize response was not a JSON-RPC response");
            }
            const responseIdKey = messageIdKey(body.id);
            const requestIdKey = "id" in message ? messageIdKey(message.id) : undefined;
            if (responseIdKey !== requestIdKey) {
                throw new Error("ACP initialize response id did not match initialize request");
            }
            this.connectionId = connectionId;
            this.openConnectionSse();
            this.enqueue(body);
        }
        catch (error) {
            if (this.isClosed && cleanupConnectionId) {
                await this.deleteConnection(cleanupConnectionId).catch(() => undefined);
                this.clearOwnedCookieStore();
            }
            else {
                this.errorReadable(error, cleanupConnectionId);
            }
            throw error;
        }
    }
    throwIfClosedDuringInitialize() {
        if (this.isClosed) {
            throw new Error("ACP HTTP stream is closed");
        }
    }
    async postConnectedMessage(message) {
        const connectionId = this.connectionId;
        if (!connectionId) {
            throw new Error("ACP HTTP stream is not initialized");
        }
        const sessionId = this.sessionIdForOutboundMessage(message);
        if (sessionId) {
            await this.openSessionSse(sessionId);
        }
        const pendingSessionRequestKey = sessionId && "method" in message && "id" in message
            ? messageIdKey(message.id)
            : undefined;
        if (sessionId && pendingSessionRequestKey) {
            this.pendingSessionRequests.set(pendingSessionRequestKey, sessionId);
        }
        try {
            const response = await this.fetchRequest({
                method: "POST",
                headers: {
                    "Content-Type": JSON_MIME_TYPE,
                    [HEADER_CONNECTION_ID]: connectionId,
                    ...(sessionId ? { [HEADER_SESSION_ID]: sessionId } : {}),
                },
                body: JSON.stringify(message),
                signal: this.abortController.signal,
            });
            if (!response.ok) {
                throw await httpError("ACP POST failed", response);
            }
            if (!("method" in message) && "id" in message) {
                const key = messageIdKey(message.id);
                if (key) {
                    this.pendingResponseSessions.delete(key);
                }
            }
        }
        catch (error) {
            if (pendingSessionRequestKey) {
                this.pendingSessionRequests.delete(pendingSessionRequestKey);
            }
            this.errorReadable(error);
            throw error;
        }
    }
    sessionIdForOutboundMessage(message) {
        const paramsSessionId = sessionIdFromMessageParams(message);
        if (paramsSessionId) {
            return paramsSessionId;
        }
        if (!("id" in message) || "method" in message) {
            return undefined;
        }
        const key = messageIdKey(message.id);
        return key ? this.pendingResponseSessions.get(key) : undefined;
    }
    openConnectionSse() {
        const connectionId = this.connectionId;
        if (!connectionId) {
            return;
        }
        void this.openSse({
            [HEADER_CONNECTION_ID]: connectionId,
        });
    }
    openSessionSse(sessionId) {
        const existingReady = this.sessionSseReady.get(sessionId);
        if (existingReady) {
            return existingReady;
        }
        if (this.knownSessions.has(sessionId)) {
            return Promise.resolve();
        }
        const connectionId = this.connectionId;
        if (!connectionId) {
            return Promise.resolve();
        }
        let isReadySettled = false;
        let resolveReady = () => { };
        let rejectReady = () => { };
        const ready = new Promise((resolve, reject) => {
            resolveReady = resolve;
            rejectReady = reject;
        });
        const settleReady = (callback) => {
            if (isReadySettled) {
                return;
            }
            isReadySettled = true;
            callback();
        };
        ready.catch(() => undefined);
        this.knownSessions.add(sessionId);
        this.sessionSseReady.set(sessionId, ready);
        void this.openSse({
            [HEADER_CONNECTION_ID]: connectionId,
            [HEADER_SESSION_ID]: sessionId,
        }, {
            onOpen: () => {
                settleReady(resolveReady);
            },
            onError: (error) => {
                settleReady(() => {
                    rejectReady(error);
                });
            },
            onClose: () => {
                this.sessionSseReady.delete(sessionId);
                settleReady(() => {
                    rejectReady(new Error("ACP session SSE stream closed before opening"));
                });
            },
        });
        return ready;
    }
    async openSse(headers, lifecycle = {}) {
        const streamSessionId = headers[HEADER_SESSION_ID];
        try {
            const response = await this.fetchRequest({
                method: "GET",
                headers: {
                    Accept: EVENT_STREAM_MIME_TYPE,
                    ...headers,
                },
                signal: this.abortController.signal,
            });
            if (!response.ok) {
                throw await httpError("ACP SSE connection failed", response);
            }
            if (!response.body) {
                throw new Error("ACP SSE response missing body");
            }
            lifecycle.onOpen?.();
            for await (const message of parseSseStream(response.body)) {
                if (this.isClosed) {
                    return;
                }
                if (Array.isArray(message)) {
                    throw new TypeError("ACP HTTP transport does not support JSON-RPC batch messages");
                }
                const sessionId = sessionIdFromResponseResult(message);
                if (sessionId) {
                    void this.openSessionSse(sessionId);
                }
                this.trackServerRequestRoute(message, headers[HEADER_SESSION_ID]);
                this.trackInboundResponse(message);
                this.enqueue(message);
            }
            this.handleSseEof(streamSessionId);
        }
        catch (error) {
            if (this.isClosed || this.abortController.signal.aborted) {
                return;
            }
            lifecycle.onError?.(error);
            this.errorReadable(error);
        }
        finally {
            lifecycle.onClose?.();
        }
    }
    handleSseEof(streamSessionId) {
        if (this.isClosed || this.abortController.signal.aborted) {
            return;
        }
        if (!streamSessionId) {
            this.errorReadable(new Error("ACP connection SSE stream closed"));
            return;
        }
        this.knownSessions.delete(streamSessionId);
        this.sessionSseReady.delete(streamSessionId);
        if (this.hasPendingSessionRequest(streamSessionId)) {
            this.errorReadable(new Error("ACP session SSE stream closed"));
        }
    }
    trackServerRequestRoute(message, streamSessionId) {
        if (!streamSessionId || !("method" in message) || !("id" in message)) {
            return;
        }
        const key = messageIdKey(message.id);
        if (key) {
            this.pendingResponseSessions.set(key, streamSessionId);
        }
    }
    trackInboundResponse(message) {
        if (!isResponseMessage(message)) {
            return;
        }
        const key = messageIdKey(message.id);
        if (key) {
            this.pendingSessionRequests.delete(key);
        }
    }
    hasPendingSessionRequest(sessionId) {
        for (const pendingSessionId of this.pendingSessionRequests.values()) {
            if (pendingSessionId === sessionId) {
                return true;
            }
        }
        return false;
    }
    async fetchRequest(init) {
        const response = await this.fetchImpl(this.serverUrl, {
            ...init,
            credentials: this.cookiePolicy,
            headers: this.createRequestHeaders(init.headers),
        });
        if (this.cookiePolicy === "include") {
            this.cookieStore.store(response.headers);
        }
        return response;
    }
    createRequestHeaders(headers) {
        const requestHeaders = new Headers(this.headers);
        const transportHeaders = new Headers(headers);
        transportHeaders.forEach((value, key) => {
            requestHeaders.set(key, value);
        });
        if (this.cookiePolicy === "include") {
            this.cookieStore.apply(requestHeaders);
        }
        return requestHeaders;
    }
    async close() {
        if (this.isClosed) {
            return;
        }
        this.isClosed = true;
        this.abortController.abort();
        try {
            await this.deleteConnection();
        }
        finally {
            this.clearOwnedCookieStore();
            this.closeReadable();
        }
    }
    async deleteConnection(connectionId = this.connectionId) {
        if (!connectionId) {
            return;
        }
        const response = await this.fetchRequest({
            method: "DELETE",
            headers: {
                [HEADER_CONNECTION_ID]: connectionId,
            },
        });
        if (!response.ok) {
            throw await httpError("ACP DELETE failed", response);
        }
    }
    clearOwnedCookieStore() {
        if (this.ownsCookieStore) {
            this.cookieStore.clear();
        }
    }
    enqueue(message) {
        try {
            this.readableController?.enqueue(message);
        }
        catch (error) {
            this.errorReadable(error);
        }
    }
    errorReadable(error, connectionId = this.connectionId) {
        if (this.isClosed) {
            return;
        }
        this.isClosed = true;
        this.abortController.abort();
        void this.deleteConnection(connectionId)
            .catch(() => undefined)
            .finally(() => {
            this.clearOwnedCookieStore();
        });
        try {
            this.readableController?.error(error);
        }
        catch {
            // The readable side may already be closed or cancelled.
        }
    }
    closeReadable() {
        try {
            this.readableController?.close();
        }
        catch {
            // The readable side may already be closed, cancelled, or errored.
        }
    }
}
function resolveFetch(fetchImpl) {
    if (fetchImpl) {
        return fetchImpl;
    }
    if (typeof globalThis.fetch === "function") {
        return (input, init) => globalThis.fetch(input, init);
    }
    throw new Error("createHttpStream requires globalThis.fetch or options.fetch");
}
async function httpError(prefix, response) {
    const text = await response.text().catch(() => "");
    if (text) {
        return new Error(`${prefix}: ${response.status} ${response.statusText}: ${text}`);
    }
    return new Error(`${prefix}: ${response.status} ${response.statusText}`);
}
//# sourceMappingURL=http-stream.js.map