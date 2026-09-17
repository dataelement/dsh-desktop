import { describe, expect, it, vi } from "vitest";
import { AgentSideConnection, PROTOCOL_VERSION, agent as createAgentApp, methods, } from "./acp.js";
import { EVENT_STREAM_MIME_TYPE, HEADER_CONNECTION_ID, HEADER_SESSION_ID, JSON_MIME_TYPE, } from "./protocol.js";
import { AcpServer } from "./server.js";
import { parseSseStream } from "./sse.js";
import { createTestAgentApp, TestAgent } from "./test-support/test-agent.js";
import { startTestServer } from "./test-support/test-http-server.js";
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
const promptRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "session/prompt",
    params: {
        sessionId: "session-1",
        prompt: [{ type: "text", text: "Hello" }],
    },
};
describe("AcpServer", () => {
    it("handles initialize over HTTP and returns a connection ID", async () => {
        const server = await startTestServer();
        try {
            const response = await postJson(server.url, initializeRequest);
            const body = await response.json();
            expect(response.status).toBe(200);
            expect(response.headers.get(HEADER_CONNECTION_ID)).toMatch(/^[0-9a-f-]{36}$/);
            expect(body).toMatchObject({
                jsonrpc: "2.0",
                id: 1,
                result: {
                    protocolVersion: 1,
                    agentCapabilities: {
                        loadSession: false,
                    },
                },
            });
        }
        finally {
            await server.close();
        }
    });
    it("accepts an agent app for direct HTTP initialize requests", async () => {
        const appAgent = createAgentApp({ name: "http-app-agent" }).onRequest(methods.agent.initialize, (c) => ({
            protocolVersion: c.params.protocolVersion,
            agentCapabilities: {
                loadSession: false,
            },
            authMethods: [],
        }));
        const server = new AcpServer({ agent: appAgent });
        try {
            const response = await server.handleRequest(jsonRequest(initializeRequest));
            const body = await response.json();
            expect(response.status).toBe(200);
            expect(response.headers.get(HEADER_CONNECTION_ID)).toMatch(/^[0-9a-f-]{36}$/);
            expect(body).toMatchObject({
                jsonrpc: "2.0",
                id: initializeRequest.id,
                result: {
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: {
                        loadSession: false,
                    },
                    authMethods: [],
                },
            });
        }
        finally {
            await server.close();
        }
    });
    it("runs agent app connect hooks after direct HTTP initialize", async () => {
        const appAgent = createAgentApp({ name: "http-connect-hook-agent" })
            .onConnect((connection) => connection.client.notify("vendor/connect-ready", { ready: true }))
            .onRequest(methods.agent.initialize, (c) => ({
            protocolVersion: c.params.protocolVersion,
            agentCapabilities: {
                loadSession: false,
            },
            authMethods: [],
        }));
        const server = new AcpServer({ agent: appAgent });
        try {
            const response = await server.handleRequest(jsonRequest(initializeRequest));
            const body = await response.json();
            const connectionId = response.headers.get(HEADER_CONNECTION_ID) ?? "";
            expect(response.status).toBe(200);
            expect(body).toMatchObject({
                jsonrpc: "2.0",
                id: initializeRequest.id,
                result: {
                    protocolVersion: PROTOCOL_VERSION,
                },
            });
            const sseResponse = await server.handleRequest(new Request("http://127.0.0.1/acp", {
                method: "GET",
                headers: {
                    Accept: EVENT_STREAM_MIME_TYPE,
                    [HEADER_CONNECTION_ID]: connectionId,
                },
            }));
            expect(sseResponse.status).toBe(200);
            await expect(readFirstSseMessage(sseResponse)).resolves.toMatchObject({
                jsonrpc: "2.0",
                method: "vendor/connect-ready",
                params: { ready: true },
            });
        }
        finally {
            await server.close();
        }
    });
    it("forwards deferred connect hooks through HTTP agent factories", async () => {
        let connectHookRuns = 0;
        const server = new AcpServer({
            createAgent: () => createAgentApp({ name: "http-factory-connect-hook-agent" })
                .onConnect((connection) => {
                connectHookRuns += 1;
                return connection.client.notify("vendor/connect-ready", {
                    source: "factory",
                });
            })
                .onRequest(methods.agent.initialize, (c) => ({
                protocolVersion: c.params.protocolVersion,
                agentCapabilities: {
                    loadSession: false,
                },
                authMethods: [],
            })),
        });
        try {
            const response = await server.handleRequest(jsonRequest(initializeRequest));
            const body = await response.json();
            const connectionId = response.headers.get(HEADER_CONNECTION_ID) ?? "";
            expect(response.status).toBe(200);
            expect(body).toMatchObject({
                jsonrpc: "2.0",
                id: initializeRequest.id,
                result: {
                    protocolVersion: PROTOCOL_VERSION,
                },
            });
            expect(connectHookRuns).toBe(1);
            const sseResponse = await server.handleRequest(new Request("http://127.0.0.1/acp", {
                method: "GET",
                headers: {
                    Accept: EVENT_STREAM_MIME_TYPE,
                    [HEADER_CONNECTION_ID]: connectionId,
                },
            }));
            expect(sseResponse.status).toBe(200);
            await expect(readFirstSseMessage(sseResponse)).resolves.toMatchObject({
                jsonrpc: "2.0",
                method: "vendor/connect-ready",
                params: { source: "factory" },
            });
        }
        finally {
            await server.close();
        }
    });
    it("removes HTTP connections when connect hooks close the handle", async () => {
        const server = new AcpServer({
            agent: createAgentApp({ name: "http-connect-hook-close-agent" })
                .onConnect((connection) => {
                connection.close(new Error("connect hook closed"));
            })
                .onRequest(methods.agent.initialize, (c) => ({
                protocolVersion: c.params.protocolVersion,
                agentCapabilities: {
                    loadSession: false,
                },
                authMethods: [],
            })),
        });
        try {
            const response = await server.handleRequest(jsonRequest(initializeRequest));
            const body = await response.json();
            const connectionId = response.headers.get(HEADER_CONNECTION_ID) ?? "";
            expect(response.status).toBe(200);
            expect(body).toMatchObject({
                jsonrpc: "2.0",
                id: initializeRequest.id,
                result: {
                    protocolVersion: PROTOCOL_VERSION,
                },
            });
            await waitForConnectionNotFound(server, connectionId);
        }
        finally {
            await server.close();
        }
    });
    it("removes HTTP connections when async connect hooks reject", async () => {
        let connectHookRuns = 0;
        const server = new AcpServer({
            agent: createAgentApp({ name: "http-connect-hook-reject-agent" })
                .onConnect(() => {
                connectHookRuns += 1;
                return Promise.reject(new Error("connect hook rejected"));
            })
                .onRequest(methods.agent.initialize, (c) => ({
                protocolVersion: c.params.protocolVersion,
                agentCapabilities: {
                    loadSession: false,
                },
                authMethods: [],
            })),
        });
        try {
            const response = await server.handleRequest(jsonRequest(initializeRequest));
            const body = await response.json();
            const connectionId = response.headers.get(HEADER_CONNECTION_ID) ?? "";
            expect(response.status).toBe(200);
            expect(body).toMatchObject({
                jsonrpc: "2.0",
                id: initializeRequest.id,
                result: {
                    protocolVersion: PROTOCOL_VERSION,
                },
            });
            expect(connectHookRuns).toBe(1);
            await waitForConnectionNotFound(server, connectionId);
        }
        finally {
            await server.close();
        }
    });
    it("accepts a deprecated legacy agent factory for direct HTTP initialize requests", async () => {
        const connections = [];
        const server = new AcpServer({
            createLegacyAgent: (conn) => {
                connections.push(conn);
                return new TestAgent(conn);
            },
        });
        try {
            const response = await server.handleRequest(jsonRequest(initializeRequest));
            expect(response.status).toBe(200);
            expect(response.headers.get(HEADER_CONNECTION_ID)).toMatch(/^[0-9a-f-]{36}$/);
            expect(connections).toHaveLength(1);
            expect(connections[0]).toBeInstanceOf(AgentSideConnection);
        }
        finally {
            await server.close();
        }
    });
    it("uses the default factory for direct HTTP initialize requests", async () => {
        const createdBy = [];
        const server = new AcpServer({
            createAgent: () => {
                createdBy.push("default");
                return createTestAgentApp();
            },
        });
        try {
            const response = await server.handleRequest(jsonRequest(initializeRequest));
            expect(response.status).toBe(200);
            expect(response.headers.get(HEADER_CONNECTION_ID)).toMatch(/^[0-9a-f-]{36}$/);
            expect(createdBy).toEqual(["default"]);
        }
        finally {
            await server.close();
        }
    });
    it("uses per-request factory overrides for direct HTTP initialize requests", async () => {
        const createdBy = [];
        const server = new AcpServer({
            createAgent: () => {
                createdBy.push("default");
                return createTestAgentApp();
            },
        });
        try {
            const response = await server.handleRequest(jsonRequest(initializeRequest), {
                createAgent: () => {
                    createdBy.push("override");
                    return createTestAgentApp();
                },
            });
            expect(response.status).toBe(200);
            expect(response.headers.get(HEADER_CONNECTION_ID)).toMatch(/^[0-9a-f-]{36}$/);
            expect(createdBy).toEqual(["override"]);
        }
        finally {
            await server.close();
        }
    });
    it("does not leak HTTP factory overrides to later initialize requests", async () => {
        const createdBy = [];
        const server = new AcpServer({
            createAgent: () => {
                createdBy.push("default");
                return createTestAgentApp();
            },
        });
        try {
            await server.handleRequest(jsonRequest(initializeRequest), {
                createAgent: () => {
                    createdBy.push("override");
                    return createTestAgentApp();
                },
            });
            await server.handleRequest(jsonRequest({ ...initializeRequest, id: 2 }));
            expect(createdBy).toEqual(["override", "default"]);
        }
        finally {
            await server.close();
        }
    });
    it("keeps concurrent HTTP initialize factory overrides isolated", async () => {
        const createdBy = [];
        const server = new AcpServer({
            createAgent: () => {
                createdBy.push("default");
                return createTestAgentApp();
            },
        });
        try {
            const first = server.handleRequest(jsonRequest(initializeRequest), {
                createAgent: () => {
                    createdBy.push("first");
                    return createTestAgentApp();
                },
            });
            const second = server.handleRequest(jsonRequest({ ...initializeRequest, id: 2 }), {
                createAgent: () => {
                    createdBy.push("second");
                    return createTestAgentApp();
                },
            });
            await Promise.all([first, second]);
            expect(createdBy).toEqual(expect.arrayContaining(["first", "second"]));
            expect(createdBy).toHaveLength(2);
        }
        finally {
            await server.close();
        }
    });
    it("waits for registry shutdowns before close resolves", async () => {
        const server = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        const registry = server.registry;
        const shutdownStarted = createDeferred();
        const allowShutdown = createDeferred();
        vi.spyOn(registry, "closeAll").mockImplementation(async () => {
            shutdownStarted.resolve();
            await allowShutdown.promise;
        });
        let closeResolved = false;
        const close = server.close().then(() => {
            closeResolved = true;
        });
        await shutdownStarted.promise;
        await flushMicrotasks();
        expect(closeResolved).toBe(false);
        allowShutdown.resolve();
        await close;
        expect(closeResolved).toBe(true);
    });
    it("discards HTTP initialize connections when the request aborts", async () => {
        const agentCreated = createDeferred();
        const initializeStarted = createDeferred();
        const initializeResponse = createDeferred();
        const abortController = new AbortController();
        const server = new AcpServer({
            createAgent: () => {
                agentCreated.resolve();
                return createTestAgentApp({
                    initialize: () => {
                        initializeStarted.resolve();
                        return initializeResponse.promise;
                    },
                    newSession: () => ({ sessionId: "session-1" }),
                });
            },
        });
        try {
            const responsePromise = server.handleRequest(jsonRequest(initializeRequest, {}, abortController.signal));
            await agentCreated.promise;
            await withTimeout(initializeStarted.promise);
            abortController.abort();
            const response = await withTimeout(responsePromise);
            expect(response.status).toBe(499);
            expect(response.headers.get(HEADER_CONNECTION_ID)).toBeNull();
            initializeResponse.resolve({
                protocolVersion: 1,
                agentCapabilities: { loadSession: false },
            });
            await flushMicrotasks();
        }
        finally {
            await server.close();
        }
    });
    it("ignores HTTP factory overrides for existing-connection POST requests", async () => {
        const createdBy = [];
        const server = new AcpServer({
            createAgent: () => {
                createdBy.push("default");
                return createTestAgentApp();
            },
        });
        try {
            const connectionId = await initializeDirect(server);
            const response = await server.handleRequest(jsonRequest(sessionNewRequest, {
                [HEADER_CONNECTION_ID]: connectionId,
            }), {
                createAgent: () => {
                    createdBy.push("override");
                    return createTestAgentApp();
                },
            });
            expect(response.status).toBe(202);
            expect(createdBy).toEqual(["default"]);
        }
        finally {
            await server.close();
        }
    });
    it("serializes concurrent POST writes for the same connection", async () => {
        const server = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        try {
            const connectionId = await initializeDirect(server);
            const headers = { [HEADER_CONNECTION_ID]: connectionId };
            const first = server.handleRequest(jsonRequest(sessionNewRequest, headers));
            const second = server.handleRequest(jsonRequest({ ...sessionNewRequest, id: 3 }, headers));
            const responses = await Promise.all([first, second]);
            expect(responses.map((response) => response.status)).toEqual([202, 202]);
            const sseResponse = await server.handleRequest(new Request("http://127.0.0.1/acp", {
                method: "GET",
                headers: {
                    Accept: EVENT_STREAM_MIME_TYPE,
                    [HEADER_CONNECTION_ID]: connectionId,
                },
            }));
            expect(sseResponse.status).toBe(200);
            const messages = await readSseMessages(sseResponse, 2);
            expect(messages.map((message) => ("id" in message ? message.id : undefined))).toEqual([2, 3]);
        }
        finally {
            await server.close();
        }
    });
    it("ignores HTTP factory overrides for GET and DELETE requests", async () => {
        const createdBy = [];
        const server = new AcpServer({
            createAgent: () => {
                createdBy.push("default");
                return createTestAgentApp();
            },
        });
        try {
            const connectionId = await initializeDirect(server);
            const createAgent = () => {
                createdBy.push("override");
                return createTestAgentApp();
            };
            const getResponse = await server.handleRequest(new Request("http://127.0.0.1/acp", {
                method: "GET",
                headers: {
                    Accept: EVENT_STREAM_MIME_TYPE,
                    [HEADER_CONNECTION_ID]: connectionId,
                },
            }), { createAgent });
            expect(getResponse.status).toBe(200);
            await getResponse.body?.cancel();
            const deleteResponse = await server.handleRequest(new Request("http://127.0.0.1/acp", {
                method: "DELETE",
                headers: { [HEADER_CONNECTION_ID]: connectionId },
            }), { createAgent });
            expect(deleteResponse.status).toBe(202);
            expect(createdBy).toEqual(["default"]);
        }
        finally {
            await server.close();
        }
    });
    it("streams session/new responses over the connection SSE stream", async () => {
        const server = await startTestServer();
        try {
            const connectionId = await initialize(server.url);
            const sseResponse = await openConnectionSse(server.url, connectionId);
            expect(sseResponse.status).toBe(200);
            expect(sseResponse.headers.get("Content-Type")).toContain(EVENT_STREAM_MIME_TYPE);
            const accepted = await postJson(server.url, sessionNewRequest, {
                [HEADER_CONNECTION_ID]: connectionId,
            });
            expect(accepted.status).toBe(202);
            expect(await accepted.text()).toBe("");
            expect(await readFirstSseMessage(sseResponse)).toMatchObject({
                jsonrpc: "2.0",
                id: sessionNewRequest.id,
                result: {
                    sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
                },
            });
        }
        finally {
            await server.close();
        }
    });
    it("replays buffered connection messages when SSE attaches after POST", async () => {
        const server = await startTestServer();
        try {
            const connectionId = await initialize(server.url);
            const accepted = await postJson(server.url, sessionNewRequest, {
                [HEADER_CONNECTION_ID]: connectionId,
            });
            expect(accepted.status).toBe(202);
            const sseResponse = await openConnectionSse(server.url, connectionId);
            expect(await readFirstSseMessage(sseResponse)).toMatchObject({
                jsonrpc: "2.0",
                id: sessionNewRequest.id,
                result: {
                    sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
                },
            });
        }
        finally {
            await server.close();
        }
    });
    it("allows one active receiver per route and preserves queued messages across handoff", async () => {
        const server = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        const open = (connectionId, sessionId) => server.handleRequest(new Request("http://127.0.0.1/acp", {
            method: "GET",
            headers: {
                Accept: EVENT_STREAM_MIME_TYPE,
                [HEADER_CONNECTION_ID]: connectionId,
                ...(sessionId ? { [HEADER_SESSION_ID]: sessionId } : {}),
            },
        }));
        const bodies = [];
        try {
            const connectionId = await initializeDirect(server);
            const connectionStream = await open(connectionId);
            bodies.push(connectionStream.body);
            expect(connectionStream.status).toBe(200);
            expect((await open(connectionId)).status).toBe(409);
            const firstSession = await open(connectionId, "session-1");
            bodies.push(firstSession.body);
            expect(firstSession.status).toBe(200);
            expect((await open(connectionId, "session-1")).status).toBe(409);
            const secondSession = await open(connectionId, "session-2");
            bodies.push(secondSession.body);
            expect(secondSession.status).toBe(200);
            await connectionStream.body?.cancel();
            const accepted = await server.handleRequest(jsonRequest(sessionNewRequest, {
                [HEADER_CONNECTION_ID]: connectionId,
            }));
            expect(accepted.status).toBe(202);
            const resumed = await open(connectionId);
            bodies.push(resumed.body);
            expect(resumed.status).toBe(200);
            expect(await readFirstSseMessage(resumed)).toMatchObject({
                jsonrpc: "2.0",
                id: sessionNewRequest.id,
                result: {
                    sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
                },
            });
        }
        finally {
            await Promise.all(bodies.map((body) => body?.cancel().catch(() => undefined)));
            await server.close();
        }
    });
    it("preserves an outbound burst for a slow SSE receiver", async () => {
        let resolvePromptDone = () => { };
        const promptDone = new Promise((resolve) => {
            resolvePromptDone = resolve;
        });
        const server = new AcpServer({
            createAgent: () => createBackpressureAgent(resolvePromptDone),
        });
        let iterator;
        let body;
        try {
            const connectionId = await initializeDirect(server);
            const sseResponse = await server.handleRequest(new Request("http://127.0.0.1/acp", {
                method: "GET",
                headers: {
                    Accept: EVENT_STREAM_MIME_TYPE,
                    [HEADER_CONNECTION_ID]: connectionId,
                    [HEADER_SESSION_ID]: "session-1",
                },
            }));
            body = sseResponse.body;
            expect(sseResponse.status).toBe(200);
            expect(body).toBeDefined();
            iterator = parseSseStream(body)[Symbol.asyncIterator]();
            const firstMessage = iterator.next();
            const accepted = await server.handleRequest(jsonRequest(promptRequest, {
                [HEADER_CONNECTION_ID]: connectionId,
                [HEADER_SESSION_ID]: "session-1",
            }));
            expect(accepted.status).toBe(202);
            expect(chunkText(await firstMessage)).toBe("chunk-1");
            await promptDone;
            const chunkNumbers = [1];
            for (let index = 1; index < 1_100; index++) {
                const chunk = chunkText(await iterator.next());
                chunkNumbers.push(Number(chunk.slice("chunk-".length)));
            }
            expect(chunkNumbers).toEqual(Array.from({ length: 1_100 }, (_unused, index) => index + 1));
            expect(await iterator.next()).toMatchObject({
                done: false,
                value: {
                    jsonrpc: "2.0",
                    id: promptRequest.id,
                    result: { stopReason: "end_turn" },
                },
            });
        }
        finally {
            await iterator?.return?.();
            await body?.cancel().catch(() => undefined);
            await server.close();
        }
    });
    it.each(["PUT", "PATCH"])("rejects %s requests", async (method) => {
        const server = await startTestServer();
        try {
            const response = await fetch(server.url, { method });
            expect(response.status).toBe(405);
        }
        finally {
            await server.close();
        }
    });
    it("rejects GET without Accept: text/event-stream", async () => {
        const server = await startTestServer();
        try {
            const response = await fetch(server.url, {
                method: "GET",
                headers: {
                    [HEADER_CONNECTION_ID]: globalThis.crypto.randomUUID(),
                },
            });
            expect(response.status).toBe(406);
        }
        finally {
            await server.close();
        }
    });
    it("rejects GET without a connection ID", async () => {
        const server = await startTestServer();
        try {
            const response = await fetch(server.url, {
                method: "GET",
                headers: {
                    Accept: EVENT_STREAM_MIME_TYPE,
                },
            });
            expect(response.status).toBe(400);
        }
        finally {
            await server.close();
        }
    });
    it("rejects GET with an unknown connection ID", async () => {
        const server = await startTestServer();
        try {
            const response = await openConnectionSse(server.url, globalThis.crypto.randomUUID());
            expect(response.status).toBe(404);
        }
        finally {
            await server.close();
        }
    });
    it("opens session-scoped GETs before session/load creates session state", async () => {
        const server = await startTestServer();
        try {
            const connectionId = await initialize(server.url);
            const response = await openSessionSse(server.url, connectionId, globalThis.crypto.randomUUID());
            expect(response.status).toBe(200);
            await response.body?.cancel();
        }
        finally {
            await server.close();
        }
    });
    it("returns 426 for WebSocket upgrade GETs", async () => {
        const server = new AcpServer({
            createAgent: () => createTestAgentApp(),
        });
        try {
            const response = await server.handleRequest(new Request("http://127.0.0.1/acp", {
                method: "GET",
                headers: {
                    Accept: EVENT_STREAM_MIME_TYPE,
                    Upgrade: "websocket",
                },
            }));
            expect(response.status).toBe(426);
        }
        finally {
            await server.close();
        }
    });
    it("deletes connections and closes SSE streams", async () => {
        const server = await startTestServer();
        try {
            const connectionId = await initialize(server.url);
            const sseResponse = await openConnectionSse(server.url, connectionId);
            const reader = sseResponse.body?.getReader();
            expect(reader).toBeDefined();
            const deleted = await fetch(server.url, {
                method: "DELETE",
                headers: {
                    [HEADER_CONNECTION_ID]: connectionId,
                },
            });
            expect(deleted.status).toBe(202);
            expect(await reader?.read()).toEqual({ done: true, value: undefined });
            reader?.releaseLock();
            const postAfterDelete = await postJson(server.url, sessionNewRequest, {
                [HEADER_CONNECTION_ID]: connectionId,
            });
            expect(postAfterDelete.status).toBe(404);
        }
        finally {
            await server.close();
        }
    });
    it("rejects DELETE without a connection ID", async () => {
        const server = await startTestServer();
        try {
            const response = await fetch(server.url, { method: "DELETE" });
            expect(response.status).toBe(400);
        }
        finally {
            await server.close();
        }
    });
    it("rejects DELETE with an unknown connection ID", async () => {
        const server = await startTestServer();
        try {
            const response = await fetch(server.url, {
                method: "DELETE",
                headers: {
                    [HEADER_CONNECTION_ID]: globalThis.crypto.randomUUID(),
                },
            });
            expect(response.status).toBe(404);
        }
        finally {
            await server.close();
        }
    });
    it("accepts POST with application/json Content-Type parameters", async () => {
        const server = await startTestServer();
        try {
            const response = await fetch(server.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify(initializeRequest),
            });
            expect(response.status).toBe(200);
        }
        finally {
            await server.close();
        }
    });
    it("rejects POST without Content-Type", async () => {
        const server = await startTestServer();
        try {
            const response = await fetch(server.url, { method: "POST" });
            expect(response.status).toBe(415);
        }
        finally {
            await server.close();
        }
    });
    it.each([
        "text/plain",
        "application/jsonfoobar",
        "application/json-patch+json",
    ])("rejects POST with %s Content-Type", async (contentType) => {
        const server = await startTestServer();
        try {
            const response = await fetch(server.url, {
                method: "POST",
                headers: { "Content-Type": contentType },
                body: JSON.stringify(initializeRequest),
            });
            expect(response.status).toBe(415);
        }
        finally {
            await server.close();
        }
    });
    it("rejects invalid JSON", async () => {
        const server = await startTestServer();
        try {
            const response = await fetch(server.url, {
                method: "POST",
                headers: {
                    "Content-Type": JSON_MIME_TYPE,
                },
                body: "{ nope",
            });
            expect(response.status).toBe(400);
        }
        finally {
            await server.close();
        }
    });
    it("rejects JSON-RPC batches", async () => {
        const server = await startTestServer();
        try {
            const response = await postJson(server.url, [initializeRequest]);
            expect(response.status).toBe(501);
        }
        finally {
            await server.close();
        }
    });
    it.each([
        null,
        "initialize",
        1,
        {},
        { jsonrpc: "1.0", method: "initialize" },
    ])("rejects invalid JSON-RPC messages", async (body) => {
        const server = await startTestServer();
        try {
            const response = await postJson(server.url, body);
            expect(response.status).toBe(400);
        }
        finally {
            await server.close();
        }
    });
    it("rejects non-initialize requests without a connection ID", async () => {
        const server = await startTestServer();
        try {
            const response = await postJson(server.url, sessionNewRequest);
            expect(response.status).toBe(400);
        }
        finally {
            await server.close();
        }
    });
    it("rejects initialize requests on existing connections", async () => {
        const server = await startTestServer();
        try {
            const connectionId = await initialize(server.url);
            const response = await postJson(server.url, initializeRequest, {
                [HEADER_CONNECTION_ID]: connectionId,
            });
            expect(response.status).toBe(400);
        }
        finally {
            await server.close();
        }
    });
    it("rejects unknown connection IDs", async () => {
        const server = await startTestServer();
        try {
            const response = await postJson(server.url, sessionNewRequest, {
                [HEADER_CONNECTION_ID]: globalThis.crypto.randomUUID(),
            });
            expect(response.status).toBe(404);
        }
        finally {
            await server.close();
        }
    });
    it("returns an error response when agent creation fails", async () => {
        const server = await startTestServer(() => {
            throw new Error("agent factory failed");
        });
        try {
            const response = await postJson(server.url, initializeRequest);
            const body = await response.json();
            expect(response.status).toBe(500);
            expect(response.headers.get(HEADER_CONNECTION_ID)).toBeNull();
            expect(body).toMatchObject({
                jsonrpc: "2.0",
                id: 1,
                error: {
                    code: -32603,
                    message: "Initialize failed",
                    data: "agent factory failed",
                },
            });
        }
        finally {
            await server.close();
        }
    });
    it("returns JSON-RPC initialize errors as the initialize response", async () => {
        const server = await startTestServer(() => createTestAgentApp({
            initialize: () => Promise.reject(new Error("initialize failed")),
        }));
        try {
            const response = await postJson(server.url, initializeRequest);
            const body = await response.json();
            expect(response.status).toBe(200);
            expect(response.headers.get(HEADER_CONNECTION_ID)).toMatch(/^[0-9a-f-]{36}$/);
            expect(body).toMatchObject({
                jsonrpc: "2.0",
                id: 1,
                error: {
                    code: -32603,
                    message: "Internal error",
                },
            });
        }
        finally {
            await server.close();
        }
    });
});
async function initializeDirect(server) {
    const response = await server.handleRequest(jsonRequest(initializeRequest));
    const connectionId = response.headers.get(HEADER_CONNECTION_ID);
    expect(response.status).toBe(200);
    expect(connectionId).toMatch(/^[0-9a-f-]{36}$/);
    return connectionId ?? "";
}
function jsonRequest(body, headers = {}, signal) {
    return new Request("http://127.0.0.1/acp", {
        method: "POST",
        headers: {
            "Content-Type": JSON_MIME_TYPE,
            ...headers,
        },
        body: JSON.stringify(body),
        signal,
    });
}
async function initialize(url) {
    const response = await postJson(url, initializeRequest);
    const connectionId = response.headers.get(HEADER_CONNECTION_ID);
    expect(response.status).toBe(200);
    expect(connectionId).toMatch(/^[0-9a-f-]{36}$/);
    return connectionId ?? "";
}
function openConnectionSse(url, connectionId) {
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: EVENT_STREAM_MIME_TYPE,
            [HEADER_CONNECTION_ID]: connectionId,
        },
    });
}
function openSessionSse(url, connectionId, sessionId) {
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: EVENT_STREAM_MIME_TYPE,
            [HEADER_CONNECTION_ID]: connectionId,
            [HEADER_SESSION_ID]: sessionId,
        },
    });
}
async function readFirstSseMessage(response) {
    if (!response.body) {
        throw new Error("Expected SSE response body");
    }
    const iterator = parseSseStream(response.body)[Symbol.asyncIterator]();
    const result = await iterator.next();
    await iterator.return?.();
    await response.body.cancel();
    if (result.done) {
        throw new Error("Expected SSE message");
    }
    return result.value;
}
async function readSseMessages(response, count) {
    if (!response.body) {
        throw new Error("Expected SSE response body");
    }
    const iterator = parseSseStream(response.body)[Symbol.asyncIterator]();
    try {
        const messages = [];
        for (const __unused of Array.from({ length: count })) {
            void __unused;
            const result = await iterator.next();
            if (result.done) {
                throw new Error("Expected SSE message");
            }
            messages.push(result.value);
        }
        return messages;
    }
    finally {
        await iterator.return?.();
        await response.body.cancel();
    }
}
function chunkText(result) {
    if (result.done) {
        throw new Error("Expected SSE message");
    }
    const text = result.value.params?.update?.content?.text;
    if (typeof text !== "string") {
        throw new Error("Expected session update chunk text");
    }
    return text;
}
function createBackpressureAgent(onPromptDone) {
    return createAgentApp({ name: "backpressure-agent" })
        .onRequest(methods.agent.initialize, () => ({
        protocolVersion: 1,
        agentCapabilities: {
            loadSession: false,
        },
    }))
        .onRequest(methods.agent.session.new, () => ({ sessionId: "session-1" }))
        .onRequest(methods.agent.authenticate, () => ({}))
        .onRequest(methods.agent.session.prompt, async (c) => {
        for (let index = 0; index < 1_100; index++) {
            await c.client.notify(methods.client.session.update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        type: "text",
                        text: `chunk-${index + 1}`,
                    },
                },
            });
        }
        onPromptDone();
        return { stopReason: "end_turn" };
    })
        .onNotification(methods.agent.session.cancel, () => { });
}
async function waitForConnectionNotFound(server, connectionId) {
    const deadline = Date.now() + 1_000;
    for (;;) {
        const response = await server.handleRequest(new Request("http://127.0.0.1/acp", {
            method: "GET",
            headers: {
                Accept: EVENT_STREAM_MIME_TYPE,
                [HEADER_CONNECTION_ID]: connectionId,
            },
        }));
        if (response.status === 404) {
            return;
        }
        await response.body?.cancel();
        if (Date.now() > deadline) {
            throw new Error("Timed out waiting for connection to be removed");
        }
        await new Promise((resolve) => setTimeout(resolve, 1));
    }
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
async function withTimeout(promise) {
    let timeout;
    try {
        return await Promise.race([
            promise,
            new Promise((_resolve, reject) => {
                timeout = setTimeout(() => {
                    reject(new Error("Timed out waiting for promise"));
                }, 1_000);
            }),
        ]);
    }
    finally {
        clearTimeout(timeout);
    }
}
async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
}
function postJson(url, body, headers = {}) {
    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": JSON_MIME_TYPE,
            ...headers,
        },
        body: JSON.stringify(body),
    });
}
//# sourceMappingURL=server.test.js.map