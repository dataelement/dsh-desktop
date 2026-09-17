import { describe, expect, it, vi } from "vitest";
import { ConnectionRegistry, OutboundMailbox, } from "./connection.js";
import { messageIdKey } from "./protocol.js";
import { createTestAgentApp } from "./test-support/test-agent.js";
const initializeRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
        protocolVersion: 1,
        clientCapabilities: {},
    },
};
const sessionNewRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "session/new",
    params: {
        cwd: "/tmp",
        mcpServers: [],
    },
};
function createPromptRequest(id, sessionId) {
    return {
        jsonrpc: "2.0",
        id,
        method: "session/prompt",
        params: {
            sessionId,
            prompt: [{ type: "text", text: "Hello" }],
        },
    };
}
const messageOne = { jsonrpc: "2.0", id: 1, result: "one" };
const messageTwo = { jsonrpc: "2.0", id: 2, result: "two" };
const messageThree = { jsonrpc: "2.0", id: 3, result: "three" };
const messageFour = { jsonrpc: "2.0", id: 4, result: "four" };
describe("ConnectionRegistry", () => {
    it("creates retrievable connections with unique UUID connection IDs", async () => {
        const registry = new ConnectionRegistry();
        const first = registry.createConnection(createTestAgentApp());
        const second = registry.createConnection(createTestAgentApp());
        expect(first.connectionId).toMatch(/^[0-9a-f-]{36}$/);
        expect(second.connectionId).toMatch(/^[0-9a-f-]{36}$/);
        expect(first.connectionId).not.toBe(second.connectionId);
        expect(registry.get(first.connectionId)).toBe(first);
        expect(registry.get(second.connectionId)).toBe(second);
        await registry.closeAll();
    });
    it("removes connections", () => {
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection(createTestAgentApp());
        expect(registry.remove(connection.connectionId)).toBe(connection);
        expect(registry.get(connection.connectionId)).toBeUndefined();
        expect(registry.remove(connection.connectionId)).toBeUndefined();
    });
    it("receives the initialize response directly from the agent", async () => {
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection(createTestAgentApp());
        await writeInbound(connection.inboundTx, initializeRequest);
        const response = await connection.recvInitial(initializeRequest.id);
        expect(response).toMatchObject({
            jsonrpc: "2.0",
            id: initializeRequest.id,
            result: {
                protocolVersion: 1,
                agentCapabilities: {
                    loadSession: false,
                },
            },
        });
        await registry.closeAll();
    });
    it("cancels a pending initialize reader during shutdown", async () => {
        const initialize = createDeferred();
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection(createTestAgentApp({ initialize: () => initialize.promise }));
        await writeInbound(connection.inboundTx, initializeRequest);
        const initialResponse = connection.recvInitial(initializeRequest.id);
        initialResponse.catch(() => undefined);
        await connection.shutdown();
        await expect(withTimeout(initialResponse)).rejects.toThrow("Expected initialize response from agent");
        await registry.closeAll();
    });
    it("rejects outbound JSON-RPC batches before routing them", async () => {
        let agentStream;
        const error = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection({
            connect(stream) {
                agentStream = stream;
            },
        }, "websocket");
        try {
            const lease = connection.allOutbound.tryAcquire();
            expect(lease).toBeDefined();
            connection.startRouter();
            if (!agentStream) {
                throw new Error("Expected agent stream");
            }
            const writer = agentStream.writable.getWriter();
            try {
                await expect(writer.write([
                    {
                        jsonrpc: "2.0",
                        id: 1,
                        method: "_vendor/acme/request",
                        params: {},
                    },
                ])).rejects.toThrow("AcpServer transports do not support outbound JSON-RPC batch messages");
            }
            finally {
                writer.releaseLock();
            }
            expect(await lease?.receive()).toEqual({
                done: true,
                value: undefined,
            });
        }
        finally {
            error.mockRestore();
            await registry.closeAll();
        }
    });
    it("preserves batch frames and applies outbound routing per entry when enabled", async () => {
        let agentStream;
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection({
            connect(stream) {
                agentStream = stream;
            },
        });
        connection.enableBatches();
        const sessionId = "session-1";
        const batch = [
            {
                jsonrpc: "2.0",
                id: 10,
                method: "_vendor/acme/session-request",
                params: { sessionId },
            },
            {
                jsonrpc: "2.0",
                id: 11,
                method: "_vendor/acme/connection-request",
                params: {},
            },
            {
                jsonrpc: "2.0",
                method: "_vendor/acme/session-notification",
                params: { sessionId },
            },
        ];
        try {
            const sessionOutbound = connection.ensureSession(sessionId).tryAcquire();
            const connectionOutbound = connection.connectionStream.tryAcquire();
            expect(sessionOutbound).toBeDefined();
            expect(connectionOutbound).toBeDefined();
            connection.startRouter();
            if (!agentStream) {
                throw new Error("Expected agent stream");
            }
            const writer = agentStream.writable.getWriter();
            try {
                await writer.write(batch);
            }
            finally {
                writer.releaseLock();
            }
            expect(await readLease(sessionOutbound)).toEqual(batch[0]);
            expect(await readLease(sessionOutbound)).toEqual(batch[2]);
            expect(await readLease(connectionOutbound)).toEqual(batch[1]);
            expect(connection.clientResponseRoutes).toEqual(new Map([
                ["number:10", { session: sessionId }],
                ["number:11", "connection"],
            ]));
        }
        finally {
            await registry.closeAll();
        }
    });
    it("forwards inbound batch frames to batch-enabled agent connections", async () => {
        let agentStream;
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection({
            connect(stream) {
                agentStream = stream;
            },
        });
        connection.enableBatches();
        const batch = [
            {
                jsonrpc: "2.0",
                id: 12,
                method: "_vendor/acme/request",
                params: {},
            },
        ];
        try {
            if (!agentStream) {
                throw new Error("Expected agent stream");
            }
            const reader = agentStream.readable.getReader();
            try {
                const write = connection.writeInbound(batch);
                expect(await reader.read()).toEqual({ done: false, value: batch });
                await write;
            }
            finally {
                reader.releaseLock();
            }
        }
        finally {
            await registry.closeAll();
        }
    });
    it("drains the final agent frame before natural connection close", async () => {
        const agentClosed = createDeferred();
        let agentStream;
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection({
            connect(stream) {
                agentStream = stream;
                return { closed: agentClosed.promise };
            },
        }, "websocket");
        const lease = connection.allOutbound.tryAcquire();
        expect(lease).toBeDefined();
        connection.startRouter();
        if (!agentStream) {
            throw new Error("Expected agent stream");
        }
        const writer = agentStream.writable.getWriter();
        try {
            await writer.write(messageOne);
        }
        finally {
            writer.releaseLock();
        }
        agentClosed.resolve();
        await connection.closed;
        expect(await readLease(lease)).toEqual(messageOne);
        expect(await lease?.receive()).toEqual({
            done: true,
            value: undefined,
        });
        await registry.closeAll();
    });
    it("waits for active and pending connection shutdowns before closeAll resolves", async () => {
        const registry = new ConnectionRegistry();
        const active = registry.createConnection(createTestAgentApp());
        const pending = registry.createPendingConnection(createTestAgentApp());
        const activeShutdownStarted = createDeferred();
        const pendingShutdownStarted = createDeferred();
        const allowActiveShutdown = createDeferred();
        const allowPendingShutdown = createDeferred();
        const originalActiveShutdown = active.shutdown.bind(active);
        const originalPendingShutdown = pending.shutdown.bind(pending);
        vi.spyOn(active, "shutdown").mockImplementation(async () => {
            activeShutdownStarted.resolve();
            await allowActiveShutdown.promise;
            await originalActiveShutdown();
        });
        vi.spyOn(pending, "shutdown").mockImplementation(async () => {
            pendingShutdownStarted.resolve();
            await allowPendingShutdown.promise;
            await originalPendingShutdown();
        });
        let closeResolved = false;
        const close = registry.closeAll().then(() => {
            closeResolved = true;
        });
        await activeShutdownStarted.promise;
        await pendingShutdownStarted.promise;
        await flushMicrotasks();
        expect(registry.get(active.connectionId)).toBeUndefined();
        expect(closeResolved).toBe(false);
        allowActiveShutdown.resolve();
        await flushMicrotasks();
        expect(closeResolved).toBe(false);
        allowPendingShutdown.resolve();
        await close;
        expect(closeResolved).toBe(true);
    });
    it("routes pending responses to the connection mailbox", async () => {
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection(createTestAgentApp());
        await initializeConnection(connection);
        const connectionLease = connection.connectionStream.tryAcquire();
        expect(connectionLease).toBeDefined();
        const key = messageIdKey(sessionNewRequest.id);
        expect(key).toBe("number:2");
        connection.pendingRoutes.set(key ?? "", "connection");
        await writeInbound(connection.inboundTx, sessionNewRequest);
        const connectionMessage = await readLease(connectionLease);
        expect(connectionMessage).toMatchObject({
            jsonrpc: "2.0",
            id: sessionNewRequest.id,
            result: {
                sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
            },
        });
        expect(connection.pendingRoutes.has(key ?? "")).toBe(false);
        await registry.closeAll();
    });
    it("falls back to the connection stream for responses without a pending route", async () => {
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection(createTestAgentApp());
        await initializeConnection(connection);
        const lease = connection.connectionStream.tryAcquire();
        expect(lease).toBeDefined();
        await writeInbound(connection.inboundTx, sessionNewRequest);
        expect(await readLease(lease)).toMatchObject({
            jsonrpc: "2.0",
            id: sessionNewRequest.id,
            result: {
                sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
            },
        });
        await registry.closeAll();
    });
    it("returns the same session stream for repeated ensureSession calls", async () => {
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection(createTestAgentApp());
        const sessionId = globalThis.crypto.randomUUID();
        expect(connection.ensureSession(sessionId)).toBe(connection.ensureSession(sessionId));
        expect(connection.sessionStreams.get(sessionId)).toBe(connection.ensureSession(sessionId));
        await registry.closeAll();
    });
    it("routes session responses and notifications to the session stream", async () => {
        const registry = new ConnectionRegistry();
        const connection = registry.createConnection(createTestAgentApp({ chunkCount: 1 }));
        const sessionId = globalThis.crypto.randomUUID();
        const promptRequest = createPromptRequest(3, sessionId);
        await initializeConnection(connection);
        const sessionLease = connection.ensureSession(sessionId).tryAcquire();
        const connectionLease = connection.connectionStream.tryAcquire();
        expect(sessionLease).toBeDefined();
        expect(connectionLease).toBeDefined();
        const key = messageIdKey(promptRequest.id);
        expect(key).toBe("number:3");
        connection.pendingRoutes.set(key ?? "", { session: sessionId });
        await writeInbound(connection.inboundTx, promptRequest);
        expect(await readLease(sessionLease)).toMatchObject({
            jsonrpc: "2.0",
            method: "session/update",
            params: {
                sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        text: "chunk-1",
                    },
                },
            },
        });
        expect(await readLease(sessionLease)).toMatchObject({
            jsonrpc: "2.0",
            id: promptRequest.id,
            result: {
                stopReason: "end_turn",
            },
        });
        expect(connection.pendingRoutes.has(key ?? "")).toBe(false);
        expect(await readLeaseOrUndefined(connectionLease)).toBeUndefined();
        await registry.closeAll();
    });
});
describe("OutboundMailbox", () => {
    it("buffers an ordered burst without a receiver", async () => {
        const mailbox = new OutboundMailbox();
        const count = 1_025;
        for (let index = 0; index < count; index++) {
            mailbox.push({
                jsonrpc: "2.0",
                id: index,
                result: `message-${index}`,
            });
        }
        const lease = mailbox.tryAcquire();
        expect(lease).toBeDefined();
        for (let index = 0; index < count; index++) {
            expect(await readLease(lease)).toEqual({
                jsonrpc: "2.0",
                id: index,
                result: `message-${index}`,
            });
        }
    });
    it("allows one active receiver and preserves FIFO across handoff", async () => {
        const mailbox = new OutboundMailbox();
        mailbox.push(messageOne);
        mailbox.push(messageTwo);
        mailbox.push(messageThree);
        const first = mailbox.tryAcquire();
        expect(first).toBeDefined();
        expect(mailbox.tryAcquire()).toBeUndefined();
        expect(await readLease(first)).toEqual(messageOne);
        first?.release();
        mailbox.push(messageFour);
        const resumed = mailbox.tryAcquire();
        expect(resumed).toBeDefined();
        expect(await readLease(resumed)).toEqual(messageTwo);
        expect(await readLease(resumed)).toEqual(messageThree);
        expect(await readLease(resumed)).toEqual(messageFour);
    });
    it("drains queued messages before a finished mailbox ends", async () => {
        const mailbox = new OutboundMailbox();
        const lease = mailbox.tryAcquire();
        expect(lease).toBeDefined();
        mailbox.push(messageOne);
        mailbox.push(messageTwo);
        mailbox.finish();
        expect(await readLease(lease)).toEqual(messageOne);
        expect(await readLease(lease)).toEqual(messageTwo);
        expect(await lease?.receive()).toEqual({
            done: true,
            value: undefined,
        });
    });
    it("discards queued messages on abortive shutdown", async () => {
        const mailbox = new OutboundMailbox();
        const lease = mailbox.tryAcquire();
        expect(lease).toBeDefined();
        mailbox.push(messageOne);
        mailbox.abort();
        expect(await lease?.receive()).toEqual({
            done: true,
            value: undefined,
        });
        expect(mailbox.tryAcquire()).toBeUndefined();
    });
});
async function initializeConnection(connection) {
    await writeInbound(connection.inboundTx, initializeRequest);
    await connection.recvInitial(initializeRequest.id);
    connection.startRouter();
}
async function writeInbound(stream, message) {
    const writer = stream.getWriter();
    try {
        await writer.write(message);
    }
    finally {
        writer.releaseLock();
    }
}
async function readLease(lease) {
    if (!lease) {
        throw new Error("Expected outbound mailbox lease");
    }
    const result = await lease.receive();
    if (result.done) {
        throw new Error("Expected mailbox message");
    }
    return result.value;
}
async function readLeaseOrUndefined(lease) {
    if (!lease) {
        throw new Error("Expected outbound mailbox lease");
    }
    return await Promise.race([
        lease.receive().then((result) => (result.done ? undefined : result.value)),
        delay(50).then(() => undefined),
    ]);
}
function createDeferred() {
    let resolve = () => { };
    let reject = () => { };
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}
async function withTimeout(promise, timeoutMs = 100) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    reject(new Error("Timed out waiting for promise"));
                }, timeoutMs);
            }),
        ]);
    }
    finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}
function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
}
const routeShapeCheck = "connection";
void routeShapeCheck;
//# sourceMappingURL=connection.test.js.map