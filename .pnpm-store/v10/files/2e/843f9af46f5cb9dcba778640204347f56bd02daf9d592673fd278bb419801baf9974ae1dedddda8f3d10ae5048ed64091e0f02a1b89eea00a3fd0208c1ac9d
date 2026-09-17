import { RequestError, isNotificationMessage, isRecord, isRequestMessage, isResponseShapedMessage, protocolErrorResponse, } from "./jsonrpc.js";
import { isInitializeRequest, messageIdKey, sessionIdFromParams, } from "./protocol.js";
import { AGENT_METHODS } from "./schema/index.js";
import { onWebSocket, webSocketMessageToString } from "./ws-utils.js";
export function handleWebSocketConnection(socket, options) {
    const session = new WebSocketServerSession(socket, options);
    session.start();
    return session;
}
class WebSocketServerSession {
    socket;
    options;
    connection;
    preparedConnection;
    outboundLease;
    inboundWriteChain = Promise.resolve();
    messageChain = Promise.resolve();
    isClosed = false;
    closedPromise;
    resolveClosed = () => { };
    detachListeners = [];
    constructor(socket, options) {
        this.socket = socket;
        this.options = options;
        this.preparedConnection = options.connection;
        this.closedPromise = new Promise((resolve) => {
            this.resolveClosed = resolve;
        });
    }
    get closed() {
        return this.closedPromise;
    }
    start() {
        this.detachListeners.push(onWebSocket(this.socket, "message", (...args) => {
            this.enqueueSocketMessage(args);
        }));
        this.detachListeners.push(onWebSocket(this.socket, "close", () => {
            void this.closeSession();
        }));
        this.detachListeners.push(onWebSocket(this.socket, "error", () => {
            void this.shutdown(1011, "WebSocket error");
        }));
    }
    close(code = 1001, reason = "Server shutting down") {
        return this.shutdown(code, reason);
    }
    enqueueSocketMessage(args) {
        const handled = this.messageChain.then(() => this.handleSocketMessage(args));
        this.messageChain = handled.catch((error) => {
            if (!this.isClosed) {
                console.error("ACP WebSocket message handling failed:", error);
                void this.shutdown(1011, "Message handling failed");
            }
        });
    }
    async handleSocketMessage(args) {
        if (this.isClosed) {
            return;
        }
        const text = webSocketMessageToString(args);
        if (text === undefined) {
            console.warn("Ignoring non-text ACP WebSocket frame");
            return;
        }
        let value;
        try {
            value = JSON.parse(text);
        }
        catch {
            this.send(protocolErrorResponse(RequestError.parseError()));
            return;
        }
        if (!Array.isArray(value) && !isRecord(value)) {
            this.send(protocolErrorResponse(RequestError.invalidRequest(value)));
            return;
        }
        if (!this.connection && Array.isArray(value)) {
            if (value.length === 1 && isRequestMessage(value[0])) {
                await this.handleInitialize(value[0], true);
                return;
            }
            console.warn("First ACP WebSocket message must be initialize or a single-entry initialize batch");
            await this.shutdown(1002, "First message must be initialize");
            return;
        }
        const message = value;
        if (!this.connection) {
            if (isResponseShapedMessage(message)) {
                return;
            }
            if (!isRequestMessage(message) && !isNotificationMessage(message)) {
                this.send(protocolErrorResponse(RequestError.invalidRequest(message)));
                return;
            }
            await this.handleInitialize(message, false);
            return;
        }
        const forwarded = await this.forwardMessage(message);
        if (!forwarded.ok) {
            console.warn("Ignoring ACP WebSocket message:", forwarded.message);
        }
    }
    async handleInitialize(message, batched) {
        if (!isInitializeRequest(message)) {
            console.warn("First ACP WebSocket message must be initialize");
            await this.shutdown(1002, "First message must be initialize");
            return;
        }
        if (!("id" in message) || message.id === null) {
            console.warn("ACP WebSocket initialize request must include an ID");
            await this.shutdown(1002, "Initialize request must include an ID");
            return;
        }
        const connection = this.preparedConnection ??
            this.options.registry.createPendingConnection(this.options.agent);
        this.preparedConnection = connection;
        try {
            await writeInbound(connection, message);
            const initialResponse = await connection.recvInitial(message.id);
            if (this.isClosed) {
                this.options.registry.discard(connection.connectionId);
                return;
            }
            this.preparedConnection = undefined;
            if (negotiatedProtocolVersion(initialResponse) === 2) {
                connection.enableBatches();
            }
            this.connection = connection;
            this.options.registry.register(connection);
            connection.startRouter();
            connection.startConnectHandlers();
            this.send((batched ? [initialResponse] : initialResponse));
            this.startOutboundPump(connection);
        }
        catch (error) {
            this.preparedConnection = undefined;
            this.options.registry.discard(connection.connectionId);
            const response = {
                jsonrpc: "2.0",
                id: message.id,
                error: {
                    code: -32603,
                    message: "Initialize failed",
                    data: error instanceof Error ? error.message : undefined,
                },
            };
            this.send((batched ? [response] : response));
            await this.shutdown(1011, "Initialize failed");
        }
    }
    async forwardMessage(message) {
        const connection = this.connection;
        if (!connection) {
            return {
                ok: false,
                message: "ACP WebSocket connection is not initialized",
            };
        }
        if (Array.isArray(message)) {
            if (!connection.batchesEnabled) {
                await this.shutdown(1002, "JSON-RPC batches require ACP v2");
                return {
                    ok: false,
                    message: "JSON-RPC batches require ACP v2",
                };
            }
            if (message.some(isDuplicateInitializeRequest)) {
                await this.shutdown(1002, "Initialize not allowed on existing connection");
                return {
                    ok: false,
                    message: "Initialize not allowed on existing connection",
                };
            }
            for (const item of message) {
                this.trackInboundRoutes(item);
            }
            await this.writeInbound(message);
            return { ok: true };
        }
        if (isRequestMessage(message) && isInitializeRequest(message)) {
            this.send({
                jsonrpc: "2.0",
                id: message.id,
                error: {
                    code: -32600,
                    message: "Initialize not allowed on existing connection",
                },
            });
            return {
                ok: false,
                message: "Initialize not allowed on existing connection",
            };
        }
        this.trackInboundRoutes(message);
        await this.writeInbound(message);
        return { ok: true };
    }
    trackInboundRoutes(message) {
        const connection = this.connection;
        if (!connection) {
            return;
        }
        if (isRequestMessage(message)) {
            const route = determineWebSocketRoute(message);
            if (route !== "connection") {
                connection.ensureSession(route.session);
            }
            const key = messageIdKey(message.id);
            if (key) {
                connection.pendingRoutes.set(key, message.method === AGENT_METHODS.session_load ? "connection" : route);
            }
            return;
        }
        if (isNotificationMessage(message)) {
            const route = determineWebSocketRoute(message);
            if (route !== "connection") {
                connection.ensureSession(route.session);
            }
            return;
        }
        if (isResponseShapedMessage(message)) {
            const id = message["id"];
            const key = id === null ||
                typeof id === "string" ||
                (typeof id === "number" && Number.isFinite(id))
                ? messageIdKey(id)
                : undefined;
            if (key) {
                connection.clientResponseRoutes.delete(key);
            }
        }
    }
    async writeInbound(message) {
        const connection = this.connection;
        if (!connection) {
            throw new Error("ACP WebSocket connection is not initialized");
        }
        const write = this.inboundWriteChain.then(() => writeInbound(connection, message));
        this.inboundWriteChain = write.catch(() => undefined);
        await write;
    }
    startOutboundPump(connection) {
        const lease = connection.allOutbound.tryAcquire();
        if (!lease) {
            void this.shutdown(1011, "Outbound stream already has an active receiver");
            return;
        }
        this.outboundLease = lease;
        void (async () => {
            try {
                while (!this.isClosed) {
                    const result = await lease.receive();
                    if (result.done) {
                        return;
                    }
                    if (!this.send(result.value)) {
                        return;
                    }
                }
            }
            catch (error) {
                if (!this.isClosed) {
                    console.error("ACP WebSocket outbound pump failed:", error);
                }
            }
            finally {
                if (this.outboundLease === lease) {
                    this.outboundLease = undefined;
                }
                lease.release();
                if (!this.isClosed) {
                    void this.shutdown();
                }
            }
        })();
    }
    send(message) {
        if (this.isClosed) {
            return false;
        }
        try {
            this.socket.send(JSON.stringify(message));
            return true;
        }
        catch (error) {
            console.warn("Failed to send ACP WebSocket message:", error);
            void this.shutdown(1011, "Failed to send message");
            return false;
        }
    }
    async shutdownIfUninitialized(code, reason) {
        if (this.connection) {
            return;
        }
        await this.shutdown(code, reason);
    }
    async shutdown(code, reason) {
        this.closeSocket(code, reason);
        await this.closeSession();
    }
    closeSocket(code, reason) {
        try {
            this.socket.close(code, reason);
        }
        catch (error) {
            console.warn("Failed to close ACP WebSocket:", error);
        }
    }
    async closeSession() {
        if (this.isClosed) {
            return;
        }
        this.isClosed = true;
        try {
            for (const detach of this.detachListeners.splice(0)) {
                detach();
            }
            const outboundLease = this.outboundLease;
            this.outboundLease = undefined;
            outboundLease?.release();
            if (this.connection) {
                this.options.registry.discard(this.connection.connectionId);
                this.connection = undefined;
            }
            if (this.preparedConnection) {
                this.options.registry.discard(this.preparedConnection.connectionId);
                this.preparedConnection = undefined;
            }
        }
        finally {
            this.resolveClosed();
        }
    }
}
async function writeInbound(connection, message) {
    await connection.writeInbound(message);
}
function determineWebSocketRoute(message) {
    const sessionId = sessionIdFromParams(message.params);
    if (sessionId) {
        return {
            session: sessionId,
        };
    }
    return "connection";
}
function isDuplicateInitializeRequest(message) {
    return isRequestMessage(message) && isInitializeRequest(message);
}
function negotiatedProtocolVersion(response) {
    if (!("result" in response) || !isRecord(response.result)) {
        return undefined;
    }
    const protocolVersion = response.result["protocolVersion"];
    return typeof protocolVersion === "number" ? protocolVersion : undefined;
}
//# sourceMappingURL=ws-server.js.map