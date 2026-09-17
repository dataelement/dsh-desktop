import { isResponseMessage } from "./jsonrpc.js";
import { messageIdKey, sessionIdFromMessageParams, sessionIdFromResponseResult, } from "./protocol.js";
export class OutboundMailbox {
    enabled;
    queue = [];
    activeLease;
    isFinished = false;
    isAborted = false;
    constructor(enabled = true) {
        this.enabled = enabled;
    }
    push(message) {
        if (!this.enabled || this.isFinished) {
            return;
        }
        this.queue.push(message);
        this.activeLease?.wake();
    }
    tryAcquire() {
        if (!this.enabled || this.isAborted || this.activeLease) {
            return undefined;
        }
        const lease = new MailboxLease(this);
        this.activeLease = lease;
        return lease;
    }
    finish() {
        if (this.isFinished) {
            return;
        }
        this.isFinished = true;
        this.activeLease?.wake();
    }
    abort() {
        if (this.isAborted) {
            return;
        }
        this.isAborted = true;
        this.isFinished = true;
        this.queue.length = 0;
        this.activeLease?.wake();
    }
    /** @internal */
    async receive(lease) {
        for (;;) {
            if (this.isAborted || lease.released || this.activeLease !== lease) {
                return { done: true, value: undefined };
            }
            if (this.queue.length > 0) {
                return {
                    done: false,
                    value: this.queue.shift(),
                };
            }
            if (this.isFinished) {
                return { done: true, value: undefined };
            }
            await lease.wait();
        }
    }
    /** @internal */
    release(lease) {
        if (this.activeLease !== lease) {
            return;
        }
        this.activeLease = undefined;
        lease.markReleased();
    }
}
export class ConnectionState {
    transport;
    connectionId;
    inboundTx;
    outboundRx;
    connectionStream;
    allOutbound;
    sessionStreams = new Map();
    pendingRoutes = new Map();
    clientResponseRoutes = new Map();
    closed;
    agentConnection;
    supportsBatches = false;
    hasStartedRouter = false;
    inboundWriteChain = Promise.resolve();
    initialReader;
    outboundReader;
    routerPromise;
    shutdownPromise;
    hasResolvedClosed = false;
    finishAgentOutbound = () => { };
    resolveClosed = () => { };
    constructor(agent, transport = "http") {
        this.transport = transport;
        this.connectionId = globalThis.crypto.randomUUID();
        this.connectionStream = new OutboundMailbox(transport === "http");
        this.allOutbound = new OutboundMailbox(transport === "websocket");
        this.closed = new Promise((resolve) => {
            this.resolveClosed = resolve;
        });
        const inbound = new TransformStream();
        const outbound = createBufferedOutboundChannel((message) => {
            if (!this.supportsBatches && Array.isArray(message)) {
                throw new TypeError("AcpServer transports do not support outbound JSON-RPC batch messages");
            }
        });
        this.inboundTx = inbound.writable;
        this.outboundRx = outbound.readable;
        this.finishAgentOutbound = outbound.finish;
        const stream = {
            readable: inbound.readable,
            writable: outbound.writable,
        };
        this.agentConnection = agent.connect(stream, {
            deferConnectHandlers: true,
        });
        this.observeAgentConnection();
    }
    async recvInitial(initializeId) {
        const reader = this.outboundRx.getReader();
        this.initialReader = reader;
        try {
            const result = await reader.read();
            if (result.done ||
                !result.value ||
                !isMatchingResponse(result.value, initializeId)) {
                if (!this.shutdownPromise) {
                    await this.shutdown();
                }
                throw new Error("Expected initialize response from agent");
            }
            return result.value;
        }
        finally {
            if (this.initialReader === reader) {
                this.initialReader = undefined;
            }
            reader.releaseLock();
        }
    }
    async writeInbound(message) {
        if (!this.supportsBatches && Array.isArray(message)) {
            throw new TypeError("AcpServer transports do not support inbound JSON-RPC batch messages");
        }
        const write = this.inboundWriteChain.then(() => this.writeInboundMessage(message));
        this.inboundWriteChain = write.catch(() => undefined);
        await write;
    }
    startRouter() {
        if (this.hasStartedRouter) {
            return;
        }
        this.hasStartedRouter = true;
        this.routerPromise = this.runRouter();
    }
    startConnectHandlers() {
        if (typeof this.agentConnection === "object" &&
            this.agentConnection !== null &&
            "startConnectHandlers" in this.agentConnection &&
            typeof this.agentConnection.startConnectHandlers === "function") {
            this.agentConnection.startConnectHandlers();
        }
    }
    /** Enables JSON-RPC batch frames after ACP v2 is negotiated. */
    enableBatches() {
        this.supportsBatches = true;
    }
    get batchesEnabled() {
        return this.supportsBatches;
    }
    ensureSession(sessionId) {
        const existing = this.sessionStreams.get(sessionId);
        if (existing) {
            return existing;
        }
        const stream = new OutboundMailbox(this.transport === "http");
        this.sessionStreams.set(sessionId, stream);
        return stream;
    }
    async shutdown() {
        if (!this.shutdownPromise) {
            this.shutdownPromise = this.runShutdown();
        }
        return this.shutdownPromise;
    }
    async runShutdown() {
        try {
            this.connectionStream.abort();
            this.allOutbound.abort();
            for (const stream of this.sessionStreams.values()) {
                stream.abort();
            }
            this.sessionStreams.clear();
            this.pendingRoutes.clear();
            this.clientResponseRoutes.clear();
            await Promise.allSettled([
                this.inboundTx.close(),
                this.cancelOutboundReader(),
            ]);
        }
        finally {
            this.resolveClosedOnce();
        }
    }
    observeAgentConnection() {
        if (typeof this.agentConnection !== "object" ||
            this.agentConnection === null ||
            !("closed" in this.agentConnection) ||
            !this.agentConnection.closed) {
            return;
        }
        void Promise.resolve(this.agentConnection.closed).finally(async () => {
            if (!this.hasStartedRouter) {
                await this.shutdown();
                return;
            }
            this.finishAgentOutbound();
            await this.routerPromise;
        });
    }
    cancelOutboundReader() {
        const reader = this.initialReader ?? this.outboundReader;
        if (reader) {
            return reader.cancel();
        }
        return this.outboundRx.cancel();
    }
    async writeInboundMessage(message) {
        const writer = this.inboundTx.getWriter();
        try {
            await writer.write(message);
        }
        finally {
            writer.releaseLock();
        }
    }
    async runRouter() {
        const reader = this.outboundRx.getReader();
        this.outboundReader = reader;
        try {
            while (true) {
                const result = await reader.read();
                if (result.done) {
                    return;
                }
                this.routeOutbound(result.value);
            }
        }
        catch (error) {
            console.error("ACP connection router stopped unexpectedly:", error);
        }
        finally {
            if (this.outboundReader === reader) {
                this.outboundReader = undefined;
            }
            reader.releaseLock();
            this.connectionStream.finish();
            this.allOutbound.finish();
            for (const stream of this.sessionStreams.values()) {
                stream.finish();
            }
            this.resolveClosedOnce();
        }
    }
    resolveClosedOnce() {
        if (this.hasResolvedClosed) {
            return;
        }
        this.hasResolvedClosed = true;
        this.resolveClosed();
    }
    routeOutbound(message) {
        this.allOutbound.push(message);
        if (Array.isArray(message)) {
            for (const item of message) {
                this.routeOutboundMessage(item);
            }
            return;
        }
        this.routeOutboundMessage(message);
    }
    routeOutboundMessage(message) {
        if (isResponseMessage(message)) {
            this.routeOutboundResponse(message);
            return;
        }
        this.routeOutboundRequestOrNotification(message);
    }
    routeOutboundResponse(message) {
        const key = messageIdKey(message.id);
        const route = key ? this.pendingRoutes.get(key) : undefined;
        const sessionId = sessionIdFromResponseResult(message);
        if (sessionId) {
            this.ensureSession(sessionId);
        }
        if (key) {
            this.pendingRoutes.delete(key);
        }
        this.pushToRoute(route ?? "connection", message);
    }
    routeOutboundRequestOrNotification(message) {
        const sessionId = sessionIdFromMessageParams(message);
        if (sessionId) {
            this.trackClientResponseRoute(message, { session: sessionId });
            this.ensureSession(sessionId).push(message);
            return;
        }
        this.trackClientResponseRoute(message, "connection");
        this.connectionStream.push(message);
    }
    trackClientResponseRoute(message, route) {
        if (!("id" in message) || !("method" in message)) {
            return;
        }
        const key = messageIdKey(message.id);
        if (key) {
            this.clientResponseRoutes.set(key, route);
        }
    }
    pushToRoute(route, message) {
        if (route === "connection") {
            this.connectionStream.push(message);
            return;
        }
        this.ensureSession(route.session).push(message);
    }
}
export class ConnectionRegistry {
    connections = new Map();
    pendingConnections = new Map();
    createConnection(agent, transport = "http") {
        const connection = new ConnectionState(agent, transport);
        this.connections.set(connection.connectionId, connection);
        this.trackConnectionClose(connection);
        return connection;
    }
    createPendingConnection(agent, transport = "websocket") {
        const connection = new ConnectionState(agent, transport);
        this.pendingConnections.set(connection.connectionId, connection);
        this.trackConnectionClose(connection);
        return connection;
    }
    register(connection) {
        this.pendingConnections.delete(connection.connectionId);
        this.connections.set(connection.connectionId, connection);
    }
    get(connectionId) {
        return this.connections.get(connectionId);
    }
    remove(connectionId) {
        const connection = this.get(connectionId);
        if (!connection) {
            return undefined;
        }
        this.connections.delete(connectionId);
        void connection.shutdown();
        return connection;
    }
    discard(connectionId) {
        const connection = this.connections.get(connectionId) ??
            this.pendingConnections.get(connectionId);
        if (!connection) {
            return undefined;
        }
        this.connections.delete(connectionId);
        this.pendingConnections.delete(connectionId);
        void connection.shutdown();
        return connection;
    }
    async closeAll() {
        const connections = new Set([
            ...this.connections.values(),
            ...this.pendingConnections.values(),
        ]);
        this.connections.clear();
        this.pendingConnections.clear();
        await Promise.all(Array.from(connections, (connection) => connection.shutdown()));
    }
    trackConnectionClose(connection) {
        void connection.closed.then(() => {
            if (this.connections.get(connection.connectionId) === connection) {
                this.connections.delete(connection.connectionId);
            }
            if (this.pendingConnections.get(connection.connectionId) === connection) {
                this.pendingConnections.delete(connection.connectionId);
            }
        });
    }
}
class MailboxLease {
    mailbox;
    released = false;
    receiving = false;
    wakePromise;
    resolveWake;
    constructor(mailbox) {
        this.mailbox = mailbox;
    }
    async receive() {
        if (this.receiving) {
            throw new Error("ACP outbound mailbox lease already has a pending receive");
        }
        this.receiving = true;
        try {
            return await this.mailbox.receive(this);
        }
        finally {
            this.receiving = false;
        }
    }
    release() {
        this.mailbox.release(this);
    }
    wake() {
        this.resolveWake?.();
        this.wakePromise = undefined;
        this.resolveWake = undefined;
    }
    wait() {
        if (!this.wakePromise) {
            this.wakePromise = new Promise((resolve) => {
                this.resolveWake = resolve;
            });
        }
        return this.wakePromise;
    }
    markReleased() {
        this.released = true;
        this.wake();
    }
}
function createBufferedOutboundChannel(validate) {
    let controller;
    let isFinished = false;
    const finish = () => {
        if (isFinished) {
            return;
        }
        isFinished = true;
        try {
            controller?.close();
        }
        catch {
            // The router may already have cancelled the readable side.
        }
    };
    const fail = (error) => {
        if (isFinished) {
            return;
        }
        isFinished = true;
        try {
            controller?.error(error);
        }
        catch {
            // The router may already have cancelled the readable side.
        }
    };
    return {
        readable: new ReadableStream({
            start(readableController) {
                controller = readableController;
            },
            cancel() {
                isFinished = true;
            },
        }),
        writable: new WritableStream({
            write(message) {
                if (isFinished) {
                    throw new Error("ACP outbound channel is closed");
                }
                try {
                    validate(message);
                    controller?.enqueue(message);
                }
                catch (error) {
                    fail(error);
                    throw error;
                }
            },
            close: finish,
            abort: fail,
        }),
        finish,
    };
}
function isMatchingResponse(msg, id) {
    return (!Array.isArray(msg) && "id" in msg && !("method" in msg) && msg.id === id);
}
//# sourceMappingURL=connection.js.map