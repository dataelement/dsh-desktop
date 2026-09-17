import { describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { ClientSideConnection, PROTOCOL_VERSION, agent as createAgentApp, client as createClientApp, methods, } from "./acp.js";
import { HEADER_CONNECTION_ID } from "./protocol.js";
import { MemoryAcpCookieStore, createWebSocketStream } from "./ws-stream.js";
import { createTestAgentApp } from "./test-support/test-agent.js";
import { startTestServer } from "./test-support/test-http-server.js";
import { PROTOCOL_VERSION as V2_PROTOCOL_VERSION, batchNotification as v2BatchNotification, client as createV2ClientApp, methods as v2Methods, } from "./v2/acp.js";
const nodeWebSocket = WebSocket;
const initializeRequest = {
    jsonrpc: "2.0",
    id: 0,
    method: "initialize",
    params: {
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: {},
    },
};
const initializeResponse = {
    jsonrpc: "2.0",
    id: 0,
    result: {
        protocolVersion: PROTOCOL_VERSION,
        agentCapabilities: {
            loadSession: false,
        },
    },
};
const sessionNewRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "session/new",
    params: {
        cwd: "/tmp",
        mcpServers: [],
    },
};
describe("createWebSocketStream", () => {
    it("exposes the ACP connection ID during the WebSocket handshake", async () => {
        const server = await startTestServer();
        const socket = new WebSocket(server.wsUrl);
        const upgrade = new Promise((resolve, reject) => {
            socket.once("upgrade", resolve);
            socket.once("error", reject);
        });
        try {
            const request = await upgrade;
            expect(request.headers[HEADER_CONNECTION_ID.toLowerCase()]).toMatch(/^[0-9a-f-]{36}$/);
        }
        finally {
            socket.close();
            await server.close();
        }
    });
    it("closes pre-created WebSocket connections when the first frame is not initialize", async () => {
        const server = await startTestServer();
        const socket = new WebSocket(server.wsUrl);
        const upgrade = new Promise((resolve, reject) => {
            socket.once("upgrade", resolve);
            socket.once("error", reject);
        });
        const close = new Promise((resolve) => {
            socket.once("close", (code, reason) => {
                resolve({ code, reason: reason.toString("utf8") });
            });
        });
        try {
            const request = await upgrade;
            const connectionId = request.headers[HEADER_CONNECTION_ID.toLowerCase()];
            expect(connectionId).toMatch(/^[0-9a-f-]{36}$/);
            socket.send(JSON.stringify(sessionNewRequest));
            await expect(close).resolves.toEqual({
                code: 1002,
                reason: "First message must be initialize",
            });
            const response = await fetch(server.url, {
                method: "GET",
                headers: {
                    Accept: "text/event-stream",
                    [HEADER_CONNECTION_ID]: String(connectionId),
                },
            });
            expect(response.status).toBe(404);
        }
        finally {
            socket.close();
            await server.close();
        }
    });
    it("ignores binary WebSocket initialize frames", async () => {
        const server = await startTestServer();
        const socket = new WebSocket(server.wsUrl);
        const upgrade = new Promise((resolve, reject) => {
            socket.once("upgrade", resolve);
            socket.once("error", reject);
        });
        const close = new Promise((resolve) => {
            socket.once("close", (code, reason) => {
                resolve({ code, reason: reason.toString("utf8") });
            });
        });
        try {
            const request = await upgrade;
            const connectionId = request.headers[HEADER_CONNECTION_ID.toLowerCase()];
            expect(connectionId).toMatch(/^[0-9a-f-]{36}$/);
            socket.send(Buffer.from(JSON.stringify(initializeRequest)), {
                binary: true,
            });
            socket.send(JSON.stringify(sessionNewRequest));
            await expect(close).resolves.toEqual({
                code: 1002,
                reason: "First message must be initialize",
            });
            const response = await fetch(server.url, {
                method: "GET",
                headers: {
                    Accept: "text/event-stream",
                    [HEADER_CONNECTION_ID]: String(connectionId),
                },
            });
            expect(response.status).toBe(404);
        }
        finally {
            socket.close();
            await server.close();
        }
    });
    it("uses the custom WebSocket constructor and queues writes until the socket opens", async () => {
        const instances = [];
        const stream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket: createFakeWebSocketConstructor(instances),
            protocols: ["acp"],
            headers: { Authorization: "Bearer token" },
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            const socket = fakeSocketAt(instances, 0);
            expect(socket.url).toBe("ws://agent.example/acp");
            expect(socket.protocols).toEqual(["acp"]);
            expect(socket.options).toEqual({
                headers: { Authorization: "Bearer token" },
            });
            const write = writer.write(initializeRequest);
            await Promise.resolve();
            expect(socket.sent).toEqual([]);
            socket.open();
            await write;
            expect(socket.sent).toEqual([JSON.stringify(initializeRequest)]);
            socket.receive(JSON.stringify(initializeResponse));
            expect(await readMessage(reader)).toEqual(initializeResponse);
        }
        finally {
            reader.releaseLock();
            await writer.close().catch(() => undefined);
            writer.releaseLock();
        }
    });
    it("queues batch writes until the socket opens and sends one WebSocket frame", async () => {
        const instances = [];
        const stream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket: createFakeWebSocketConstructor(instances),
        });
        const writer = stream.writable.getWriter();
        const socket = fakeSocketAt(instances, 0);
        const batch = [
            {
                jsonrpc: "2.0",
                method: "_vendor/acme/event",
                params: { value: true },
            },
            {
                jsonrpc: "2.0",
                method: "_vendor/acme/other-event",
            },
        ];
        try {
            const write = writer.write(batch);
            await Promise.resolve();
            expect(socket.sent).toEqual([]);
            socket.open();
            await write;
            expect(socket.sent).toEqual([JSON.stringify(batch)]);
        }
        finally {
            await writer.close().catch(() => undefined);
            writer.releaseLock();
        }
    });
    it("sends v2 client batches after an individual initialize frame", async () => {
        const instances = [];
        const stream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket: createFakeWebSocketConstructor(instances),
        });
        const connection = createV2ClientApp().connect(stream);
        const socket = fakeSocketAt(instances, 0);
        socket.open();
        try {
            const initialize = connection.agent.request(v2Methods.agent.initialize, {
                protocolVersion: V2_PROTOCOL_VERSION,
                info: { name: "test-client", version: "1.0.0" },
                capabilities: {},
            });
            await vi.waitFor(() => expect(socket.sent).toHaveLength(1));
            const initializeFrame = JSON.parse(socket.sent[0]);
            expect(Array.isArray(initializeFrame)).toBe(false);
            expect(initializeFrame).toMatchObject({
                jsonrpc: "2.0",
                method: "initialize",
                params: { protocolVersion: V2_PROTOCOL_VERSION },
            });
            if (!("id" in initializeFrame)) {
                throw new Error("Expected initialize request ID");
            }
            socket.receive(JSON.stringify({
                jsonrpc: "2.0",
                id: initializeFrame.id,
                result: {
                    protocolVersion: V2_PROTOCOL_VERSION,
                    info: { name: "test-agent", version: "1.0.0" },
                },
            }));
            await initialize;
            await connection.agent.batch([
                v2BatchNotification("_vendor/acme/event", { value: true }),
                v2BatchNotification("_vendor/acme/other-event"),
            ]);
            expect(socket.sent).toHaveLength(2);
            expect(JSON.parse(socket.sent[1])).toEqual([
                {
                    jsonrpc: "2.0",
                    method: "_vendor/acme/event",
                    params: { value: true },
                },
                {
                    jsonrpc: "2.0",
                    method: "_vendor/acme/other-event",
                },
            ]);
        }
        finally {
            connection.close();
            await connection.closed;
        }
    });
    it("does not emit unhandled rejections when the socket closes before the first write", async () => {
        const unhandledRejections = [];
        const onUnhandledRejection = (reason) => {
            unhandledRejections.push(reason);
        };
        process.on("unhandledRejection", onUnhandledRejection);
        const instances = [];
        const stream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket: createFakeWebSocketConstructor(instances),
        });
        const reader = stream.readable.getReader();
        try {
            fakeSocketAt(instances, 0).close();
            expect(await reader.read()).toEqual({ done: true, value: undefined });
            await waitForUnhandledRejections();
            expect(unhandledRejections).toEqual([]);
        }
        finally {
            process.off("unhandledRejection", onUnhandledRejection);
            reader.releaseLock();
            await closeStream(stream);
        }
    });
    it("passes managed cookies and custom headers to custom WebSocket constructors", async () => {
        const cookieStore = new MemoryAcpCookieStore();
        cookieStore.store(headersWithSetCookie(["transport=alpha", "route=bravo"]));
        const instances = [];
        const stream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket: createFakeWebSocketConstructor(instances),
            cookieStore,
            headers: {
                Authorization: "Bearer token",
                Cookie: "route=caller; caller=custom",
            },
        });
        try {
            const socket = fakeSocketAt(instances, 0);
            expect(socket.options).toEqual({
                headers: {
                    Authorization: "Bearer token",
                    Cookie: "transport=alpha; route=caller; caller=custom",
                },
            });
            socket.open();
        }
        finally {
            await closeStream(stream);
        }
    });
    it("stores upgrade cookies for reuse by later WebSocket streams", async () => {
        const cookieStore = new MemoryAcpCookieStore();
        const instances = [];
        const WebSocket = createFakeWebSocketConstructor(instances);
        const firstStream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket,
            cookieStore,
        });
        const firstSocket = fakeSocketAt(instances, 0);
        firstSocket.upgrade({
            headers: {
                "set-cookie": ["transport=alpha; Path=/"],
            },
        });
        firstSocket.open();
        await closeStream(firstStream);
        const secondStream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket,
            cookieStore,
        });
        try {
            const secondSocket = fakeSocketAt(instances, 1);
            expect(secondSocket.options).toEqual({
                headers: {
                    Cookie: "transport=alpha",
                },
            });
            secondSocket.open();
        }
        finally {
            await closeStream(secondStream);
        }
    });
    it("omits managed cookies and upgrade cookie storage when cookies are disabled", async () => {
        const cookieStore = new MemoryAcpCookieStore();
        const instances = [];
        const WebSocket = createFakeWebSocketConstructor(instances);
        const firstStream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket,
            cookieStore,
            cookies: "omit",
        });
        const firstSocket = fakeSocketAt(instances, 0);
        expect(firstSocket.options).toEqual({
            headers: undefined,
        });
        firstSocket.upgrade({
            headers: {
                "set-cookie": ["transport=alpha; Path=/"],
            },
        });
        firstSocket.open();
        await closeStream(firstStream);
        const secondStream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket,
            cookieStore,
        });
        try {
            const secondSocket = fakeSocketAt(instances, 1);
            expect(secondSocket.options).toEqual({
                headers: undefined,
            });
            secondSocket.open();
        }
        finally {
            await closeStream(secondStream);
        }
    });
    it("responds to malformed JSON and primitives while passing valid frames through", async () => {
        const instances = [];
        const stream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket: createFakeWebSocketConstructor(instances),
        });
        const reader = stream.readable.getReader();
        try {
            const socket = fakeSocketAt(instances, 0);
            socket.open();
            socket.receive(new Uint8Array([1, 2, 3]), true);
            socket.receive(new TextEncoder().encode(JSON.stringify(initializeResponse)));
            socket.receive(new TextEncoder().encode(JSON.stringify(initializeResponse)).buffer);
            socket.receive("not json");
            socket.receive("42");
            // Lenient shapes are left for the connection layer to validate.
            socket.receive(JSON.stringify({ hello: "world" }));
            const batch = [initializeResponse, initializeResponse];
            socket.receive(JSON.stringify(batch));
            socket.receive(JSON.stringify(initializeResponse));
            expect(await readMessage(reader)).toEqual({ hello: "world" });
            expect(await readWireMessage(reader)).toEqual(batch);
            expect(await readMessage(reader)).toEqual(initializeResponse);
            await vi.waitFor(() => expect(socket.sent).toHaveLength(2));
            expect(socket.sent.map((message) => JSON.parse(message))).toMatchObject([
                { jsonrpc: "2.0", id: null, error: { code: -32700 } },
                { jsonrpc: "2.0", id: null, error: { code: -32600 } },
            ]);
            expect(socket.readyState).toBe(1);
        }
        finally {
            reader.releaseLock();
            await closeStream(stream);
        }
    });
    it("closes the readable stream when the socket closes", async () => {
        const instances = [];
        const stream = createWebSocketStream("ws://agent.example/acp", {
            WebSocket: createFakeWebSocketConstructor(instances),
        });
        const reader = stream.readable.getReader();
        try {
            const socket = fakeSocketAt(instances, 0);
            socket.open();
            socket.close();
            expect(await reader.read()).toEqual({ done: true, value: undefined });
        }
        finally {
            reader.releaseLock();
        }
    });
    it("runs initialize, newSession, and prompt through ClientSideConnection", async () => {
        const updates = [];
        const server = await startTestServer(() => createTestAgentApp({ chunkCount: 2 }));
        const stream = createWebSocketStream(server.wsUrl, {
            WebSocket: nodeWebSocket,
        });
        const conn = new ClientSideConnection(() => createTestClient({ updates }), stream);
        try {
            expect(await conn.initialize({
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            })).toMatchObject({
                protocolVersion: PROTOCOL_VERSION,
                agentCapabilities: { loadSession: false },
            });
            const session = await conn.newSession({ cwd: "/tmp", mcpServers: [] });
            expect(session.sessionId).toMatch(/^[0-9a-f-]{36}$/);
            await expect(conn.prompt({
                sessionId: session.sessionId,
                prompt: [{ type: "text", text: "Hello" }],
            })).resolves.toEqual({ stopReason: "end_turn" });
            expect(updates).toHaveLength(2);
            expect(updates).toMatchObject([
                {
                    sessionId: session.sessionId,
                    update: {
                        sessionUpdate: "agent_message_chunk",
                        content: { text: "chunk-1" },
                    },
                },
                {
                    sessionId: session.sessionId,
                    update: {
                        sessionUpdate: "agent_message_chunk",
                        content: { text: "chunk-2" },
                    },
                },
            ]);
        }
        finally {
            await closeStream(stream);
            await server.close();
        }
    });
    it("runs initialize, newSession, and prompt through a client app", async () => {
        const updates = [];
        const server = await startTestServer(() => createTestAgentApp({ chunkCount: 2 }));
        const stream = createWebSocketStream(server.wsUrl, {
            WebSocket: nodeWebSocket,
        });
        try {
            const result = await createClientApp({ name: "ws-app-client" })
                .onNotification(methods.client.session.update, (c) => {
                updates.push(c.params);
            })
                .connectWith(stream, async (agent) => {
                const initialized = await agent.request(methods.agent.initialize, {
                    protocolVersion: PROTOCOL_VERSION,
                    clientCapabilities: {},
                });
                const session = await agent.request(methods.agent.session.new, {
                    cwd: "/tmp",
                    mcpServers: [],
                });
                const prompt = await agent.request(methods.agent.session.prompt, {
                    sessionId: session.sessionId,
                    prompt: [{ type: "text", text: "Hello" }],
                });
                return { initialized, prompt, session };
            });
            expect(result.initialized).toMatchObject({
                protocolVersion: PROTOCOL_VERSION,
                agentCapabilities: { loadSession: false },
            });
            expect(result.session.sessionId).toMatch(/^[0-9a-f-]{36}$/);
            expect(result.prompt).toEqual({ stopReason: "end_turn" });
            expect(updates).toMatchObject([
                {
                    sessionId: result.session.sessionId,
                    update: {
                        sessionUpdate: "agent_message_chunk",
                        content: { text: "chunk-1" },
                    },
                },
                {
                    sessionId: result.session.sessionId,
                    update: {
                        sessionUpdate: "agent_message_chunk",
                        content: { text: "chunk-2" },
                    },
                },
            ]);
        }
        finally {
            await closeStream(stream);
            await server.close();
        }
    });
    it("round-trips permission requests through ClientSideConnection", async () => {
        const updates = [];
        const permissionRequests = [];
        const server = await startTestServer(() => createTestAgentApp({ enablePermission: true }));
        const stream = createWebSocketStream(server.wsUrl, {
            WebSocket: nodeWebSocket,
        });
        const conn = new ClientSideConnection(() => createTestClient({ updates, permissionRequests }), stream);
        try {
            await conn.initialize({
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            const session = await conn.newSession({ cwd: "/tmp", mcpServers: [] });
            await expect(conn.prompt({
                sessionId: session.sessionId,
                prompt: [{ type: "text", text: "Hello" }],
            })).resolves.toEqual({ stopReason: "end_turn" });
            expect(permissionRequests).toHaveLength(1);
            expect(permissionRequests[0]).toMatchObject({
                sessionId: session.sessionId,
                toolCall: {
                    toolCallId: "permission-tool",
                    title: "Permission tool",
                },
            });
            expect(updates).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    sessionId: session.sessionId,
                    update: expect.objectContaining({
                        sessionUpdate: "agent_message_chunk",
                        content: expect.objectContaining({
                            text: "permission-selected-allow",
                        }),
                    }),
                }),
            ]));
        }
        finally {
            await closeStream(stream);
            await server.close();
        }
    });
    it("loads durable sessions after a WebSocket reconnect", async () => {
        const durableSessions = new Map();
        const connectionIds = [];
        const WebSocket = createRecordingWebSocketConstructor(connectionIds);
        const cookieStore = new MemoryAcpCookieStore();
        const server = await startTestServer(() => createDurableSessionAgent(durableSessions));
        try {
            const firstUpdates = [];
            const firstStream = createWebSocketStream(server.wsUrl, {
                WebSocket,
                cookieStore,
            });
            const firstConn = new ClientSideConnection(() => createTestClient({ updates: firstUpdates }), firstStream);
            const initialized = await firstConn.initialize({
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            expect(initialized.agentCapabilities?.loadSession).toBe(true);
            const session = await firstConn.newSession({
                cwd: "/tmp",
                mcpServers: [],
            });
            await expect(firstConn.prompt({
                sessionId: session.sessionId,
                prompt: [{ type: "text", text: "Remember this" }],
            })).resolves.toEqual({ stopReason: "end_turn" });
            await waitForUpdates(firstUpdates, 1);
            await closeStream(firstStream);
            expect(durableSessions.has(session.sessionId)).toBe(true);
            const secondUpdates = [];
            const secondStream = createWebSocketStream(server.wsUrl, {
                WebSocket,
                cookieStore,
            });
            const secondConn = new ClientSideConnection(() => createTestClient({ updates: secondUpdates }), secondStream);
            const reinitialized = await secondConn.initialize({
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            expect(reinitialized.agentCapabilities?.loadSession).toBe(true);
            // Production agents must authorize session/load against the authenticated
            // principal. This SDK transport test omits auth because there is no
            // generic auth layer in the SDK.
            await expect(secondConn.loadSession({
                sessionId: session.sessionId,
                cwd: "/tmp",
                mcpServers: [],
            })).resolves.toEqual({});
            await waitForUpdates(secondUpdates, firstUpdates.length);
            await closeStream(secondStream);
            expect(connectionIds).toHaveLength(2);
            expect(connectionIds[0]).not.toBe(connectionIds[1]);
            expect(secondUpdates).toEqual(firstUpdates);
        }
        finally {
            await server.close();
        }
    });
    it("keeps multiple sessions isolated through the SDK client abstraction", async () => {
        const updates = [];
        const server = await startTestServer();
        const stream = createWebSocketStream(server.wsUrl, {
            WebSocket: nodeWebSocket,
        });
        const conn = new ClientSideConnection(() => createTestClient({ updates }), stream);
        try {
            await conn.initialize({
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            const firstSession = await conn.newSession({
                cwd: "/tmp",
                mcpServers: [],
            });
            const secondSession = await conn.newSession({
                cwd: "/tmp/other",
                mcpServers: [],
            });
            await Promise.all([
                conn.prompt({
                    sessionId: firstSession.sessionId,
                    prompt: [{ type: "text", text: "First" }],
                }),
                conn.prompt({
                    sessionId: secondSession.sessionId,
                    prompt: [{ type: "text", text: "Second" }],
                }),
            ]);
            expect(updates).toEqual(expect.arrayContaining([
                expect.objectContaining({ sessionId: firstSession.sessionId }),
                expect.objectContaining({ sessionId: secondSession.sessionId }),
            ]));
            expect(updates.filter((update) => update.sessionId === firstSession.sessionId)).toHaveLength(1);
            expect(updates.filter((update) => update.sessionId === secondSession.sessionId)).toHaveLength(1);
        }
        finally {
            await closeStream(stream);
            await server.close();
        }
    });
});
function createDurableSessionAgent(sessions) {
    return createAgentApp({ name: "durable-session-agent" })
        .onRequest(methods.agent.initialize, () => ({
        protocolVersion: PROTOCOL_VERSION,
        agentCapabilities: {
            loadSession: true,
        },
    }))
        .onRequest(methods.agent.session.new, (c) => {
        const sessionId = globalThis.crypto.randomUUID();
        sessions.set(sessionId, {
            cwd: c.params.cwd,
            history: [],
        });
        return { sessionId };
    })
        .onRequest(methods.agent.session.load, async (c) => {
        const session = sessions.get(c.params.sessionId);
        if (!session) {
            throw new Error(`Unknown durable session: ${c.params.sessionId}`);
        }
        for (const update of session.history) {
            await c.client.notify(methods.client.session.update, update);
        }
        return {};
    })
        .onRequest(methods.agent.session.prompt, async (c) => {
        const session = sessions.get(c.params.sessionId);
        if (!session) {
            throw new Error(`Unknown durable session: ${c.params.sessionId}`);
        }
        const update = {
            sessionId: c.params.sessionId,
            update: {
                sessionUpdate: "agent_message_chunk",
                content: {
                    type: "text",
                    text: `durable-history:${session.cwd}`,
                },
            },
        };
        session.history.push(update);
        await c.client.notify(methods.client.session.update, update);
        return { stopReason: "end_turn" };
    })
        .onRequest(methods.agent.authenticate, () => ({}))
        .onNotification(methods.agent.session.cancel, () => { });
}
function createTestClient(state) {
    return {
        requestPermission: (params) => {
            state.permissionRequests?.push(params);
            return Promise.resolve({
                outcome: {
                    outcome: "selected",
                    optionId: "allow",
                },
            });
        },
        sessionUpdate: (params) => {
            state.updates.push(params);
            return Promise.resolve();
        },
    };
}
async function closeStream(stream) {
    await stream.writable.close().catch(() => undefined);
}
async function readMessage(reader) {
    const message = await readWireMessage(reader);
    if (Array.isArray(message)) {
        throw new Error("Expected an individual message");
    }
    return message;
}
async function readWireMessage(reader) {
    const result = await reader.read();
    if (result.done) {
        throw new Error("Expected a message");
    }
    return result.value;
}
async function waitForUpdates(updates, count) {
    const deadline = Date.now() + 1_000;
    while (updates.length < count) {
        if (Date.now() > deadline) {
            throw new Error(`Timed out waiting for ${count} session updates`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1));
    }
}
async function waitForUnhandledRejections() {
    await new Promise((resolve) => setTimeout(resolve, 0));
}
function createRecordingWebSocketConstructor(connectionIds) {
    return class RecordingWebSocket extends WebSocket {
        constructor(url, protocols, options) {
            super(url, protocols, options);
            this.once("upgrade", (message) => {
                const connectionId = message.headers[HEADER_CONNECTION_ID.toLowerCase()];
                if (typeof connectionId === "string") {
                    connectionIds.push(connectionId);
                }
            });
        }
    };
}
function createFakeWebSocketConstructor(instances) {
    return class extends FakeWebSocket {
        constructor(url, protocols, options) {
            super(url, protocols, options);
            instances.push(this);
        }
    };
}
function fakeSocketAt(instances, index) {
    const socket = instances[index];
    if (!socket) {
        throw new Error(`Expected fake WebSocket at index ${index}`);
    }
    return socket;
}
function headersWithSetCookie(values) {
    const headers = new Headers();
    Object.defineProperty(headers, "getSetCookie", {
        value: () => values,
    });
    return headers;
}
class FakeWebSocket {
    url;
    protocols;
    options;
    sent = [];
    listeners = new Map();
    readyState = 0;
    constructor(url, protocols, options) {
        this.url = url;
        this.protocols = protocols;
        this.options = options;
    }
    send(data) {
        if (this.readyState !== 1) {
            throw new Error("Fake WebSocket is not open");
        }
        this.sent.push(data);
    }
    close() {
        if (this.readyState === 3) {
            return;
        }
        this.readyState = 3;
        this.emit("close", {});
    }
    addEventListener(type, listener) {
        let listeners = this.listeners.get(type);
        if (!listeners) {
            listeners = new Set();
            this.listeners.set(type, listeners);
        }
        listeners.add(listener);
    }
    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }
    open() {
        this.readyState = 1;
        this.emit("open", {});
    }
    receive(data, isBinary = false) {
        this.emit("message", { data, isBinary });
    }
    upgrade(message) {
        this.emit("upgrade", message);
    }
    emit(type, event) {
        for (const listener of this.listeners.get(type) ?? []) {
            listener(event);
        }
    }
}
//# sourceMappingURL=ws-stream.test.js.map