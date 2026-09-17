import { describe, expect, expectTypeOf, it } from "vitest";
import { PROTOCOL_VERSION, agent, batchNotification, batchRequest, client, methods, } from "./acp.js";
import * as sdk from "./acp.js";
import * as guards from "./schema/guards.gen.js";
import { zAnnotations, zDiffPatch, zSessionInfo, zSessionInfoUpdate, } from "./schema/zod.gen.js";
const clientInfo = { name: "test-client", version: "1.0.0" };
const agentInfo = { name: "test-agent", version: "1.0.0" };
function testAgent() {
    return agent().onRequest(methods.agent.initialize, () => ({
        protocolVersion: PROTOCOL_VERSION,
        info: agentInfo,
    }));
}
function assertV2MethodTypes(agentContext, clientContext) {
    // @ts-expect-error Built-in methods must not fall through the extension overload.
    agentContext.request(methods.agent.session.new, { sessionId: "wrong" });
    // @ts-expect-error Built-in notifications must not fall through the extension overload.
    agentContext.notify(methods.agent.session.cancel, {});
    agent().onRequest(
    // @ts-expect-error Built-in handlers cannot replace their generated params parser.
    methods.agent.session.new, (params) => params, () => ({ sessionId: "wrong-parser" }));
    // @ts-expect-error Request methods cannot be sent as notifications.
    agentContext.notify(methods.agent.session.new, {});
    // @ts-expect-error Notification methods cannot be sent as requests.
    agentContext.request(methods.agent.session.cancel, {});
    // @ts-expect-error Client-directed methods cannot be sent to an agent.
    agentContext.request(methods.client.mcp.disconnect, {
        connectionId: "connection-1",
    });
    const parseValue = (params) => params;
    void agentContext.request("session/load", { sessionId: "session-1" });
    void agentContext.request("session/load", { sessionId: "session-1" });
    void agentContext.request("_vendor/acme/echo", { value: "request" });
    void agentContext.notify("session/set_model", { modelId: "model-1" });
    agent().onRequest("session/load", parseValue, ({ params }) => params);
    agent().onNotification("session/set_model", parseValue, () => { });
    const dynamicMethod = "method/from-another-draft";
    void agentContext.request(dynamicMethod, {});
    void agentContext.notify(dynamicMethod, {});
    agent().onRequest(dynamicMethod, parseValue, ({ params }) => params);
    agent().onNotification(dynamicMethod, parseValue, () => { });
    const outputs = agentContext.batch([
        batchRequest(methods.agent.session.new, {
            cwd: "/workspace",
            mcpServers: [],
        }),
        batchNotification(methods.agent.session.cancel, {
            sessionId: "session-1",
        }),
    ]);
    expectTypeOf(outputs).toEqualTypeOf();
    void agentContext.notify(methods.protocol.cancelRequest, { requestId: 1 });
    const clientRequest = batchRequest(methods.client.mcp.disconnect, {
        connectionId: "connection-1",
    });
    // @ts-expect-error Notification methods cannot be used as batch requests.
    batchRequest(methods.agent.session.cancel, { sessionId: "session-1" });
    // @ts-expect-error Request methods cannot be used as batch notifications.
    batchNotification(methods.agent.session.new, {
        cwd: "/workspace",
        mcpServers: [],
    });
    // @ts-expect-error Client-directed methods cannot be sent in an agent-directed batch.
    agentContext.batch([clientRequest]);
    agentContext.batch([
        // @ts-expect-error Raw built-in batch entries must use method-specific params.
        {
            kind: "request",
            method: methods.agent.session.new,
            params: { sessionId: "wrong" },
        },
    ]);
    agentContext.batch([
        batchRequest("session/load", { sessionId: "session-1" }),
        batchNotification("session/set_model", { modelId: "model-1" }),
    ]);
    const legacyAgentEntry = batchRequest("session/load", {
        sessionId: "session-1",
    });
    const legacyClientEntry = batchNotification("authentication/status", {});
    void legacyAgentEntry;
    void legacyClientEntry;
    agentContext.batch([
        { kind: "request", method: dynamicMethod, params: {} },
        { kind: "notification", method: dynamicMethod, params: {} },
    ]);
    clientContext.batch([clientRequest]);
}
void assertV2MethodTypes;
function memoryWireStreamPair() {
    const leftToRight = new TransformStream();
    const rightToLeft = new TransformStream();
    return [
        {
            readable: rightToLeft.readable,
            writable: leftToRight.writable,
        },
        {
            readable: leftToRight.readable,
            writable: rightToLeft.writable,
        },
    ];
}
async function respondToNextRequest(stream, result) {
    const reader = stream.readable.getReader();
    const request = await reader.read();
    reader.releaseLock();
    if (request.done ||
        Array.isArray(request.value) ||
        !("id" in request.value)) {
        throw new Error("Expected one JSON-RPC request");
    }
    const writer = stream.writable.getWriter();
    try {
        await writer.write({
            jsonrpc: "2.0",
            id: request.value.id,
            result,
        });
    }
    finally {
        writer.releaseLock();
    }
}
describe("experimental v2 date-time schemas", () => {
    it("preserves RFC 3339 timestamps with timezone offsets as strings", () => {
        const timestamp = "2026-07-20T01:00:00+01:00";
        const annotations = zAnnotations.parse({
            lastModified: timestamp,
        });
        const sessionInfo = zSessionInfo.parse({
            sessionId: "session-1",
            cwd: "/workspace",
            updatedAt: timestamp,
        });
        const sessionInfoUpdate = zSessionInfoUpdate.parse({
            updatedAt: timestamp,
        });
        expect(annotations.lastModified).toBe(timestamp);
        expect(sessionInfo.updatedAt).toBe(timestamp);
        expect(sessionInfoUpdate.updatedAt).toBe(timestamp);
    });
});
describe("experimental v2 diff schemas", () => {
    it("uses text for git patch payloads", () => {
        const patch = zDiffPatch.parse({
            format: "git_patch",
            text: "diff --git /workspace/a /workspace/a\n",
        });
        expect(patch.text).toBe("diff --git /workspace/a /workspace/a\n");
        expect(zDiffPatch.safeParse({
            format: "git_patch",
            diff: "diff --git /workspace/a /workspace/a\n",
        }).success).toBe(false);
    });
});
describe("experimental v2 streams", () => {
    it("defaults NDJSON streams to batch-capable wire messages", async () => {
        const chunks = [];
        const stream = sdk.ndJsonStream(new WritableStream({
            write(chunk) {
                chunks.push(chunk);
            },
        }), new ReadableStream({
            start(controller) {
                controller.close();
            },
        }));
        const batch = [
            { jsonrpc: "2.0", id: 1, method: "example/request" },
            { jsonrpc: "2.0", method: "example/notification" },
        ];
        const typedStream = stream;
        const writer = typedStream.writable.getWriter();
        await writer.write(batch);
        writer.releaseLock();
        expect(new TextDecoder().decode(chunks[0])).toBe(`${JSON.stringify(batch)}\n`);
    });
});
describe("experimental v2 app API", () => {
    it("defensively copies nested session request values", async () => {
        const requestMeta = { nested: { value: "request" } };
        const httpMeta = { nested: { value: "http" } };
        const headerMeta = { nested: { value: "header" } };
        const headers = [
            {
                name: "Authorization",
                value: "original-header",
                _meta: headerMeta,
            },
        ];
        const httpServer = {
            type: "http",
            name: "http-server",
            url: "https://example.com/mcp",
            headers,
            _meta: httpMeta,
        };
        const stdioMeta = { nested: { value: "stdio" } };
        const envMeta = { nested: { value: "env" } };
        const args = ["--mode", "test"];
        const env = [{ name: "TOKEN", value: "original-env", _meta: envMeta }];
        const stdioServer = {
            type: "stdio",
            name: "stdio-server",
            command: "/usr/bin/example-mcp",
            args,
            env,
            _meta: stdioMeta,
        };
        const acpMeta = { nested: { value: "acp" } };
        const acpServer = {
            type: "acp",
            name: "acp-server",
            serverId: "server-1",
            _meta: acpMeta,
        };
        const customSettings = { nested: { value: "custom" } };
        const customServer = {
            type: "_vendor/custom",
            name: "custom-server",
            settings: customSettings,
        };
        const additionalDirectories = ["/workspace/other"];
        const request = {
            cwd: "/workspace",
            additionalDirectories,
            mcpServers: [httpServer, stdioServer, acpServer, customServer],
            _meta: requestMeta,
        };
        const expected = structuredClone(request);
        await client().connectWith(testAgent(), (agentClient) => {
            const builder = agentClient.buildSession(request);
            additionalDirectories[0] = "/mutated-input";
            requestMeta.nested.value = "mutated-input";
            httpServer.name = "mutated-input";
            headers[0].value = "mutated-input";
            headerMeta.nested.value = "mutated-input";
            httpMeta.nested.value = "mutated-input";
            args[0] = "mutated-input";
            env[0].value = "mutated-input";
            envMeta.nested.value = "mutated-input";
            stdioMeta.nested.value = "mutated-input";
            acpMeta.nested.value = "mutated-input";
            customSettings.nested.value = "mutated-input";
            request.mcpServers.pop();
            expect(builder.toRequest()).toEqual(expected);
            const returned = builder.toRequest();
            returned.additionalDirectories[0] = "/mutated-output";
            returned._meta.nested.value = "mutated-output";
            const returnedHttp = returned.mcpServers[0];
            returnedHttp.name = "mutated-output";
            returnedHttp.headers[0].value = "mutated-output";
            returnedHttp.headers[0]._meta.nested.value =
                "mutated-output";
            returnedHttp._meta.nested.value = "mutated-output";
            const returnedStdio = returned.mcpServers[1];
            returnedStdio.args[0] = "mutated-output";
            returnedStdio.env[0].value = "mutated-output";
            returnedStdio.env[0]._meta.nested.value =
                "mutated-output";
            returnedStdio._meta.nested.value = "mutated-output";
            const returnedAcp = returned.mcpServers[2];
            returnedAcp._meta.nested.value = "mutated-output";
            const returnedCustom = returned.mcpServers[3];
            returnedCustom.settings.nested.value = "mutated-output";
            returned.mcpServers.pop();
            expect(builder.toRequest()).toEqual(expected);
        });
    });
    it("copies MCP servers when adding them to a session builder", async () => {
        const serverMeta = { nested: { value: "server" } };
        const envMeta = { nested: { value: "env" } };
        const args = ["--original"];
        const env = [{ name: "TOKEN", value: "original", _meta: envMeta }];
        const mcpServer = {
            type: "stdio",
            name: "stdio-server",
            command: "/usr/bin/example-mcp",
            args,
            env,
            _meta: serverMeta,
        };
        const expected = structuredClone(mcpServer);
        await client().connectWith(testAgent(), (agentClient) => {
            const builder = agentClient
                .buildSession("/workspace")
                .withMcpServer(mcpServer);
            args[0] = "mutated-input";
            env[0].value = "mutated-input";
            envMeta.nested.value = "mutated-input";
            serverMeta.nested.value = "mutated-input";
            expect(builder.toRequest().mcpServers).toEqual([expected]);
            const returned = builder.toRequest().mcpServers[0];
            returned.args[0] = "mutated-output";
            returned.env[0].value = "mutated-output";
            returned.env[0]._meta.nested.value = "mutated-output";
            returned._meta.nested.value = "mutated-output";
            expect(builder.toRequest().mcpServers).toEqual([expected]);
        });
    });
    it("re-exports every generated extensible-union guard", () => {
        const guardNames = Object.keys(guards);
        expect(guardNames.length).toBeGreaterThan(0);
        for (const name of guardNames) {
            expect(sdk[name]).toBe(guards[name]);
        }
    });
    it("initializes exactly once, queues later calls, and exposes the exchange", async () => {
        const initializeGate = Promise.withResolvers();
        const agentReady = Promise.withResolvers();
        const clientReady = Promise.withResolvers();
        const events = [];
        let newSessionCalls = 0;
        let receivedInitialize;
        const requestMeta = { nested: { source: "client" } };
        const initializeRequest = {
            protocolVersion: PROTOCOL_VERSION,
            info: clientInfo,
            capabilities: {
                _meta: requestMeta,
            },
        };
        const initializeResponse = {
            protocolVersion: PROTOCOL_VERSION,
            info: agentInfo,
            capabilities: {
                session: {},
                _meta: { source: "agent" },
            },
        };
        const expectedInitializeRequest = structuredClone(initializeRequest);
        const agentApp = agent()
            .onConnect(async (connection) => {
            events.push("agent-connect");
            const initialization = await connection.initialized;
            events.push("agent-initialized");
            expect(initialization).toMatchObject({
                request: expectedInitializeRequest,
                response: initializeResponse,
            });
            agentReady.resolve();
        })
            .onRequest(methods.agent.initialize, async ({ params }) => {
            receivedInitialize = params;
            await initializeGate.promise;
            return initializeResponse;
        })
            .onRequest(methods.agent.session.new, () => {
            newSessionCalls += 1;
            return { sessionId: "session-1" };
        });
        const clientApp = client().onConnect(async (connection) => {
            events.push("client-connect");
            const initialization = await connection.initialized;
            events.push("client-initialized");
            expect(initialization).toMatchObject({
                request: expectedInitializeRequest,
                response: initializeResponse,
            });
            clientReady.resolve();
        });
        await clientApp.connectWith(agentApp, async (agentContext) => {
            await expect(agentContext.request(methods.agent.session.new, {
                cwd: "/workspace",
                mcpServers: [],
            })).rejects.toMatchObject({ code: -32600 });
            await expect(agentContext.notify(methods.agent.session.cancel, {
                sessionId: "session-1",
            })).rejects.toMatchObject({ code: -32600 });
            await expect(agentContext.request("_vendor/pre-initialize", {})).rejects.toMatchObject({ code: -32600 });
            expect(() => agentContext.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
                _meta: { notCloneable: () => undefined },
            })).toThrow();
            const initialized = agentContext.request(methods.agent.initialize, initializeRequest);
            requestMeta.nested.source = "mutated";
            const queuedSession = agentContext.request(methods.agent.session.new, {
                cwd: "/workspace",
                mcpServers: [],
            });
            await Promise.resolve();
            expect(newSessionCalls).toBe(0);
            expect(() => agentContext.request(methods.agent.initialize, initializeRequest)).toThrow("Invalid request");
            initializeGate.resolve();
            await expect(initialized).resolves.toMatchObject(initializeResponse);
            await expect(queuedSession).resolves.toEqual({ sessionId: "session-1" });
            await expect(agentContext.initialized).resolves.toMatchObject({
                request: expectedInitializeRequest,
                response: initializeResponse,
            });
            expect(receivedInitialize).toMatchObject(expectedInitializeRequest);
            expect(events.slice(0, 2)).toEqual(["agent-connect", "client-connect"]);
            expect(events).toContain("client-initialized");
            expect(() => agentContext.request(methods.agent.initialize, initializeRequest)).toThrow("Invalid request");
        });
        await Promise.all([agentReady.promise, clientReady.promise]);
        expect(events).toContain("agent-initialized");
    });
    it("supports standalone initialize batches and does not retry failures", async () => {
        let initializedConnections = 0;
        let receivedInitialize;
        const agentInitialized = Promise.withResolvers();
        const validAgent = agent()
            .onConnect(async (connection) => {
            await connection.initialized;
            initializedConnections += 1;
            agentInitialized.resolve();
        })
            .onRequest(methods.agent.initialize, ({ params }) => {
            receivedInitialize = params;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
            };
        });
        const validConnection = client().connect(validAgent);
        const agentContext = validConnection.agent;
        try {
            await expect(agentContext.batch([
                batchRequest(methods.agent.initialize, {
                    protocolVersion: PROTOCOL_VERSION,
                    info: clientInfo,
                }),
                batchNotification(methods.agent.session.cancel, {
                    sessionId: "session-1",
                }),
            ])).rejects.toMatchObject({ code: -32600 });
            await expect(agentContext.batch([
                batchRequest(methods.agent.initialize, {
                    protocolVersion: PROTOCOL_VERSION,
                    info: clientInfo,
                }),
                batchRequest(methods.agent.initialize, {
                    protocolVersion: PROTOCOL_VERSION,
                    info: clientInfo,
                }),
            ])).rejects.toMatchObject({ code: -32600 });
            let metaReads = 0;
            const initializeRequest = {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
                get _meta() {
                    metaReads += 1;
                    return { seen: metaReads };
                },
            };
            const mapperError = new Error("initialize mapper failed");
            await expect(agentContext.batch([
                batchRequest(methods.agent.initialize, initializeRequest, () => {
                    throw mapperError;
                }),
            ])).rejects.toBe(mapperError);
            expect(validConnection.signal.aborted).toBe(false);
            validConnection.close();
            await validConnection.closed;
            await agentInitialized.promise;
            expect(initializedConnections).toBe(1);
            expect(metaReads).toBe(1);
            expect(receivedInitialize?._meta).toEqual({ seen: 1 });
            await expect(agentContext.initialized).resolves.toMatchObject({
                request: { _meta: { seen: 1 } },
            });
        }
        finally {
            validConnection.close();
            await validConnection.closed;
        }
        const invalidAgent = agent().onRequest(methods.agent.initialize, () => ({
            protocolVersion: 1,
            info: agentInfo,
        }));
        const invalidConnection = client().connect(invalidAgent);
        try {
            const initialized = invalidConnection.agent.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            });
            const queued = invalidConnection.agent.request(methods.agent.session.new, {
                cwd: "/workspace",
                mcpServers: [],
            });
            const initializeError = await initialized.catch((error) => error);
            expect(initializeError).toMatchObject({ code: -32600 });
            await expect(invalidConnection.initialized).rejects.toBe(initializeError);
            await expect(queued).rejects.toBe(initializeError);
            await expect(invalidConnection.agent.initialized).rejects.toBe(initializeError);
            await invalidConnection.closed;
            expect(invalidConnection.signal.reason).toBe(initializeError);
            expect(() => invalidConnection.agent.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            })).toThrow("Invalid request");
        }
        finally {
            invalidConnection.close();
            await invalidConnection.closed;
        }
    });
    it("rejects initialize after a pre-initialize request fails the connection", async () => {
        let initializeCalls = 0;
        let newSessionCalls = 0;
        const agentApp = agent()
            .onRequest(methods.agent.initialize, () => {
            initializeCalls += 1;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
            };
        })
            .onRequest(methods.agent.session.new, () => {
            newSessionCalls += 1;
            return { sessionId: "session-1" };
        });
        const [agentStream, peerStream] = memoryWireStreamPair();
        const connection = agentApp.connect(agentStream);
        const writer = peerStream.writable.getWriter();
        const reader = peerStream.readable.getReader();
        try {
            const preInitializeWrite = writer.write({
                jsonrpc: "2.0",
                id: 1,
                method: methods.agent.session.new,
                params: { cwd: "/workspace", mcpServers: [] },
            });
            await expect(reader.read()).resolves.toMatchObject({
                done: false,
                value: {
                    id: 1,
                    error: { code: -32600 },
                },
            });
            await preInitializeWrite;
            const initializeWrite = writer.write({
                jsonrpc: "2.0",
                id: 2,
                method: methods.agent.initialize,
                params: {
                    protocolVersion: PROTOCOL_VERSION,
                    info: clientInfo,
                },
            });
            await expect(reader.read()).resolves.toMatchObject({
                done: false,
                value: {
                    id: 2,
                    error: { code: -32600 },
                },
            });
            await initializeWrite;
            expect(initializeCalls).toBe(0);
            expect(newSessionCalls).toBe(0);
            await expect(connection.initialized).rejects.toMatchObject({
                code: -32600,
            });
        }
        finally {
            writer.releaseLock();
            reader.releaseLock();
            connection.close();
            await connection.closed;
        }
    });
    it("rejects mixed raw initialize batches before dispatching handlers", async () => {
        let initializeCalls = 0;
        let newSessionCalls = 0;
        const agentApp = agent()
            .onRequest(methods.agent.initialize, () => {
            initializeCalls += 1;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
            };
        })
            .onRequest(methods.agent.session.new, () => {
            newSessionCalls += 1;
            return { sessionId: "session-1" };
        });
        const [agentStream, peerStream] = memoryWireStreamPair();
        const connection = agentApp.connect(agentStream);
        const writer = peerStream.writable.getWriter();
        const reader = peerStream.readable.getReader();
        try {
            const batchWrite = writer.write([
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: methods.agent.initialize,
                    params: {
                        protocolVersion: PROTOCOL_VERSION,
                        info: clientInfo,
                    },
                },
                {
                    jsonrpc: "2.0",
                    id: 2,
                    method: methods.agent.session.new,
                    params: { cwd: "/workspace", mcpServers: [] },
                },
            ]);
            await expect(reader.read()).resolves.toMatchObject({
                done: false,
                value: expect.arrayContaining([
                    expect.objectContaining({
                        id: 1,
                        error: expect.objectContaining({ code: -32600 }),
                    }),
                    expect.objectContaining({
                        id: 2,
                        error: expect.objectContaining({ code: -32600 }),
                    }),
                ]),
            });
            await batchWrite;
            expect(initializeCalls).toBe(0);
            expect(newSessionCalls).toBe(0);
            await expect(connection.initialized).rejects.toMatchObject({
                code: -32600,
            });
        }
        finally {
            writer.releaseLock();
            reader.releaseLock();
            connection.close();
            await connection.closed;
        }
    });
    it("requires an initialize handler before opening a connection", async () => {
        const agentApp = agent();
        const [firstStream] = memoryWireStreamPair();
        expect(() => agentApp.connect(firstStream)).toThrow("requires an initialize request handler");
        agentApp.onRequest(methods.agent.initialize, () => ({
            protocolVersion: PROTOCOL_VERSION,
            info: agentInfo,
        }));
        const [secondStream] = memoryWireStreamPair();
        const connection = agentApp.connect(secondStream);
        connection.close();
        await connection.closed;
        await expect(connection.initialized).rejects.toThrow("ACP connection closed");
    });
    it("treats a cancellation notification before initialize as the first message", async () => {
        let initializeCalls = 0;
        const agentApp = agent().onRequest(methods.agent.initialize, () => {
            initializeCalls += 1;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
            };
        });
        const [agentStream, peerStream] = memoryWireStreamPair();
        const connection = agentApp.connect(agentStream);
        const writer = peerStream.writable.getWriter();
        const reader = peerStream.readable.getReader();
        try {
            await writer.write({
                jsonrpc: "2.0",
                method: methods.protocol.cancelRequest,
                params: { requestId: 999 },
            });
            const initializeWrite = writer.write({
                jsonrpc: "2.0",
                id: 1,
                method: methods.agent.initialize,
                params: {
                    protocolVersion: PROTOCOL_VERSION,
                    info: clientInfo,
                },
            });
            await expect(reader.read()).resolves.toMatchObject({
                done: false,
                value: { id: 1, error: { code: -32600 } },
            });
            await initializeWrite;
            expect(initializeCalls).toBe(0);
        }
        finally {
            writer.releaseLock();
            reader.releaseLock();
            connection.close();
            await connection.closed;
        }
    });
    it("queues raw peer requests behind an in-flight initialize", async () => {
        const initializeGate = Promise.withResolvers();
        const initializeStarted = Promise.withResolvers();
        let newSessionCalls = 0;
        const agentApp = agent()
            .onRequest(methods.agent.initialize, async () => {
            initializeStarted.resolve();
            await initializeGate.promise;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
            };
        })
            .onRequest(methods.agent.session.new, () => {
            newSessionCalls += 1;
            return { sessionId: "session-1" };
        });
        const [agentStream, peerStream] = memoryWireStreamPair();
        const connection = agentApp.connect(agentStream);
        const writer = peerStream.writable.getWriter();
        const reader = peerStream.readable.getReader();
        try {
            const initializeWrite = writer.write({
                jsonrpc: "2.0",
                id: 1,
                method: methods.agent.initialize,
                params: {
                    protocolVersion: PROTOCOL_VERSION,
                    info: clientInfo,
                },
            });
            await initializeStarted.promise;
            const malformedDuplicateWrite = writer.write({
                jsonrpc: "2.0",
                id: 3,
                method: methods.agent.initialize,
                params: { protocolVersion: "invalid" },
            });
            await expect(reader.read()).resolves.toMatchObject({
                done: false,
                value: {
                    id: 3,
                    error: { code: -32600 },
                },
            });
            await malformedDuplicateWrite;
            await writer.write({
                jsonrpc: "2.0",
                method: methods.protocol.cancelRequest,
                params: { requestId: 999 },
            });
            const queuedWrite = writer.write({
                jsonrpc: "2.0",
                id: 2,
                method: methods.agent.session.new,
                params: { cwd: "/workspace", mcpServers: [] },
            });
            await Promise.resolve();
            expect(newSessionCalls).toBe(0);
            const initializeResponse = reader.read();
            initializeGate.resolve();
            await expect(initializeResponse).resolves.toMatchObject({
                done: false,
                value: {
                    id: 1,
                    result: { protocolVersion: PROTOCOL_VERSION },
                },
            });
            await initializeWrite;
            await expect(reader.read()).resolves.toMatchObject({
                done: false,
                value: {
                    id: 2,
                    result: { sessionId: "session-1" },
                },
            });
            await queuedWrite;
            expect(newSessionCalls).toBe(1);
            const malformedCancelWrite = writer.write({
                jsonrpc: "2.0",
                id: 4,
                method: methods.protocol.cancelRequest,
                params: { requestId: 999 },
            });
            await expect(reader.read()).resolves.toMatchObject({
                done: false,
                value: { id: 4, error: { code: -32601 } },
            });
            await malformedCancelWrite;
        }
        finally {
            initializeGate.resolve();
            writer.releaseLock();
            reader.releaseLock();
            connection.close();
            await connection.closed;
        }
    });
    it("rejects queued peer calls when an in-flight initialize connection closes", async () => {
        const initializeGate = Promise.withResolvers();
        const initializeStarted = Promise.withResolvers();
        const agentApp = agent().onRequest(methods.agent.initialize, async () => {
            initializeStarted.resolve();
            await initializeGate.promise;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
            };
        });
        const [agentStream, peerStream] = memoryWireStreamPair();
        const connection = agentApp.connect(agentStream);
        const writer = peerStream.writable.getWriter();
        try {
            const initializeWrite = writer.write({
                jsonrpc: "2.0",
                id: 1,
                method: methods.agent.initialize,
                params: {
                    protocolVersion: PROTOCOL_VERSION,
                    info: clientInfo,
                },
            });
            await initializeStarted.promise;
            await initializeWrite;
            const queuedCall = connection.client.request("_vendor/queued", {});
            connection.close();
            await expect(queuedCall).rejects.toThrow("ACP connection closed");
        }
        finally {
            initializeGate.resolve();
            writer.releaseLock();
            connection.close();
            await connection.closed;
        }
    });
    it("does not complete a prompt from an idle update received before it", async () => {
        let updateClient;
        const agentApp = agent()
            .onRequest(methods.agent.initialize, ({ params, client: agentClient }) => {
            updateClient = agentClient;
            return {
                protocolVersion: params.protocolVersion,
                info: agentInfo,
                capabilities: { session: {} },
            };
        })
            .onRequest(methods.agent.session.new, () => ({ sessionId: "session-1" }))
            .onRequest(methods.agent.session.prompt, ({ client: agentClient }) => {
            updateClient = agentClient;
        });
        await client().connectWith(agentApp, async (agentClient) => {
            await expect(agentClient.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
                capabilities: {},
            })).resolves.toMatchObject({ protocolVersion: PROTOCOL_VERSION });
            const session = await agentClient.buildSession("/workspace").start();
            try {
                await updateClient.notify(methods.client.session.update, {
                    sessionId: session.sessionId,
                    update: { sessionUpdate: "state_update", state: "idle" },
                });
                await expect(session.prompt("Hello")).resolves.toEqual({});
                expect(updateClient).toBeDefined();
                const updates = [
                    {
                        sessionUpdate: "agent_message_chunk",
                        messageId: "message-1",
                        content: { type: "text", text: "Hello" },
                    },
                    { sessionUpdate: "state_update", state: "running" },
                    { sessionUpdate: "state_update", state: "idle" },
                ];
                for (const update of updates) {
                    await updateClient.notify(methods.client.session.update, {
                        sessionId: session.sessionId,
                        update,
                    });
                }
                await expect(session.nextUpdate()).resolves.toMatchObject({
                    kind: "session_update",
                    update: { sessionUpdate: "state_update", state: "idle" },
                });
                await expect(session.nextUpdate()).resolves.toMatchObject({
                    kind: "session_update",
                    update: { sessionUpdate: "agent_message_chunk" },
                });
                await expect(session.nextUpdate()).resolves.toMatchObject({
                    kind: "session_update",
                    update: { sessionUpdate: "state_update", state: "running" },
                });
                await expect(session.nextUpdate()).resolves.toMatchObject({
                    kind: "stop",
                    update: { sessionUpdate: "state_update", state: "idle" },
                    stopReason: undefined,
                });
            }
            finally {
                session.dispose();
            }
        });
    });
    it("keeps overlapping prompt activity isolated when one request fails", async () => {
        let updateClient;
        const firstPrompt = Promise.withResolvers();
        const secondPrompt = Promise.withResolvers();
        const bothPromptsReceived = Promise.withResolvers();
        let promptCount = 0;
        const agentApp = agent()
            .onRequest(methods.agent.initialize, ({ client: agentClient }) => {
            updateClient = agentClient;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
                capabilities: { session: {} },
            };
        })
            .onRequest(methods.agent.session.new, () => ({ sessionId: "session-1" }))
            .onRequest(methods.agent.session.prompt, () => {
            promptCount += 1;
            if (promptCount === 2) {
                bothPromptsReceived.resolve();
            }
            return promptCount === 1 ? firstPrompt.promise : secondPrompt.promise;
        });
        await client().connectWith(agentApp, async (agentClient) => {
            await agentClient.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            });
            const session = await agentClient.buildSession("/workspace").start();
            try {
                const first = session.prompt("First");
                const firstText = session.readText();
                const second = session.prompt("Second");
                await bothPromptsReceived.promise;
                await expect(firstText).rejects.toThrow("cannot attribute updates across overlapping prompts");
                await expect(session.readText()).rejects.toThrow("cannot attribute updates across overlapping prompts");
                firstPrompt.reject(new Error("first prompt rejected"));
                await expect(first).rejects.toThrow("Internal error");
                secondPrompt.resolve();
                await expect(second).resolves.toEqual({});
                await updateClient.notify(methods.client.session.update, {
                    sessionId: session.sessionId,
                    update: {
                        sessionUpdate: "state_update",
                        state: "idle",
                        stopReason: "end_turn",
                    },
                });
                await expect(session.nextUpdate()).rejects.toThrow("Internal error");
                await expect(session.nextUpdate()).resolves.toMatchObject({
                    kind: "stop",
                    stopReason: "end_turn",
                });
            }
            finally {
                session.dispose();
            }
        });
    });
    it("reads full agent messages and applies replacement semantics", async () => {
        let updateClient;
        const agentApp = agent()
            .onRequest(methods.agent.initialize, ({ client: agentClient }) => {
            updateClient = agentClient;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
                capabilities: { session: {} },
            };
        })
            .onRequest(methods.agent.session.new, () => ({ sessionId: "session-1" }))
            .onRequest(methods.agent.session.prompt, () => { });
        await client().connectWith(agentApp, async (agentClient) => {
            await agentClient.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            });
            const session = await agentClient.buildSession("/workspace").start();
            try {
                await session.prompt("Hello");
                const text = session.readText();
                const updates = [
                    {
                        sessionUpdate: "agent_message",
                        messageId: "message-1",
                        content: [{ type: "text", text: "old" }],
                    },
                    {
                        sessionUpdate: "agent_message_chunk",
                        messageId: "message-1",
                        content: { type: "text", text: " chunk" },
                    },
                    {
                        sessionUpdate: "agent_message",
                        messageId: "message-1",
                        content: [{ type: "text", text: "replacement" }],
                    },
                    {
                        sessionUpdate: "agent_message",
                        messageId: "message-2",
                        content: [{ type: "text", text: " second" }],
                    },
                    {
                        sessionUpdate: "agent_message_chunk",
                        messageId: "message-2",
                        content: { type: "text", text: "!" },
                    },
                    {
                        sessionUpdate: "state_update",
                        state: "idle",
                        stopReason: "end_turn",
                    },
                ];
                for (const update of updates) {
                    await updateClient.notify(methods.client.session.update, {
                        sessionId: session.sessionId,
                        update,
                    });
                }
                await expect(text).resolves.toBe("replacement second!");
            }
            finally {
                session.dispose();
            }
        });
    });
    it("starts text reads at the latest prompt boundary", async () => {
        let updateClient;
        const agentApp = agent()
            .onRequest(methods.agent.initialize, ({ client: agentClient }) => {
            updateClient = agentClient;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
                capabilities: { session: {} },
            };
        })
            .onRequest(methods.agent.session.new, () => ({ sessionId: "session-1" }))
            .onRequest(methods.agent.session.prompt, () => { });
        await client().connectWith(agentApp, async (agentClient) => {
            await agentClient.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            });
            const session = await agentClient.buildSession("/workspace").start();
            try {
                await session.prompt("First");
                for (const update of [
                    {
                        sessionUpdate: "agent_message",
                        messageId: "message-1",
                        content: [{ type: "text", text: "first" }],
                    },
                    {
                        sessionUpdate: "state_update",
                        state: "idle",
                        stopReason: "end_turn",
                    },
                    {
                        sessionUpdate: "agent_message",
                        messageId: "background-message",
                        content: [{ type: "text", text: "background" }],
                    },
                ]) {
                    await updateClient.notify(methods.client.session.update, {
                        sessionId: session.sessionId,
                        update,
                    });
                }
                await session.prompt("Second");
                const text = session.readText();
                for (const update of [
                    {
                        sessionUpdate: "agent_message",
                        messageId: "message-2",
                        content: [{ type: "text", text: "second" }],
                    },
                    {
                        sessionUpdate: "state_update",
                        state: "idle",
                        stopReason: "end_turn",
                    },
                ]) {
                    await updateClient.notify(methods.client.session.update, {
                        sessionId: session.sessionId,
                        update,
                    });
                }
                await expect(text).resolves.toBe("second");
            }
            finally {
                session.dispose();
            }
        });
    });
    it("fixes initialization to the v2 protocol boundary", async () => {
        let receivedVersion;
        const agentApp = agent().onRequest(methods.agent.initialize, ({ params }) => {
            receivedVersion = params.protocolVersion;
            return {
                protocolVersion: PROTOCOL_VERSION,
                info: agentInfo,
            };
        });
        await expect(client().connectWith(agentApp, async (agentClient) => {
            const [response] = await agentClient.batch([
                batchRequest(methods.agent.initialize, { protocolVersion: 1, info: clientInfo }, (value) => value),
            ]);
            return response;
        })).resolves.toMatchObject({ protocolVersion: PROTOCOL_VERSION });
        expect(receivedVersion).toBe(PROTOCOL_VERSION);
        const wrongVersionAgent = agent().onRequest(methods.agent.initialize, () => ({ protocolVersion: 1, info: agentInfo }));
        await expect(client().connectWith(wrongVersionAgent, (agentClient) => agentClient.request(methods.agent.initialize, {
            protocolVersion: PROTOCOL_VERSION,
            info: clientInfo,
        }))).rejects.toMatchObject({ code: -32600 });
    });
    it("validates every built-in direct response before returning it", async () => {
        const [clientStream, peerStream] = memoryWireStreamPair();
        const response = client().connectWith(clientStream, async (agentContext) => {
            await agentContext.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            });
            return agentContext.request(methods.agent.session.new, {
                cwd: "/workspace",
                mcpServers: [],
            });
        });
        await respondToNextRequest(peerStream, {
            protocolVersion: PROTOCOL_VERSION,
            info: agentInfo,
        });
        await respondToNextRequest(peerStream, { sessionId: 42 });
        await expect(response).rejects.toThrow();
    });
    it("validates built-in batch responses before applying caller mappings", async () => {
        const [clientStream, peerStream] = memoryWireStreamPair();
        let mapped = false;
        const response = client().connectWith(clientStream, async (agentContext) => {
            await agentContext.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            });
            return agentContext.batch([
                batchRequest(methods.agent.session.new, { cwd: "/workspace", mcpServers: [] }, (session) => {
                    mapped = true;
                    return session.sessionId;
                }),
            ]);
        });
        await respondToNextRequest(peerStream, {
            protocolVersion: PROTOCOL_VERSION,
            info: agentInfo,
        });
        const reader = peerStream.readable.getReader();
        const request = await reader.read();
        reader.releaseLock();
        if (request.done ||
            !Array.isArray(request.value) ||
            request.value.length !== 1 ||
            !("id" in request.value[0])) {
            throw new Error("Expected one JSON-RPC batch request");
        }
        const writer = peerStream.writable.getWriter();
        try {
            await writer.write([
                {
                    jsonrpc: "2.0",
                    id: request.value[0].id,
                    result: { sessionId: 42 },
                },
            ]);
        }
        finally {
            writer.releaseLock();
        }
        await expect(response).rejects.toThrow();
        expect(mapped).toBe(false);
    });
    it("rejects peer null for empty responses but preserves local void handlers", async () => {
        const [clientStream, peerStream] = memoryWireStreamPair();
        const invalidResponse = client().connectWith(clientStream, async (agentContext) => {
            await agentContext.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            });
            return agentContext.request(methods.agent.session.delete, {
                sessionId: "session-1",
            });
        });
        await respondToNextRequest(peerStream, {
            protocolVersion: PROTOCOL_VERSION,
            info: agentInfo,
        });
        await respondToNextRequest(peerStream, null);
        await expect(invalidResponse).rejects.toThrow();
        await expect(client().connectWith(agent()
            .onRequest(methods.agent.initialize, () => ({
            protocolVersion: PROTOCOL_VERSION,
            info: agentInfo,
        }))
            .onRequest(methods.agent.session.delete, () => { }), async (agentContext) => {
            await agentContext.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            });
            return agentContext.request(methods.agent.session.delete, {
                sessionId: "session-1",
            });
        })).resolves.toEqual({});
    });
    it("supports unrecognized protocol methods and underscore extensions", async () => {
        const parseValue = (params) => params;
        const returnValue = ({ params }) => params;
        let agentNotificationValue;
        let clientNotificationValue;
        let initializedNotificationValue;
        const notificationSent = Promise.withResolvers();
        const clientApp = client()
            .onRequest("authentication/logout", parseValue, returnValue)
            .onNotification("authentication/status", parseValue, ({ params }) => {
            clientNotificationValue = params.value;
        })
            .onNotification("_vendor/acme/event", parseValue, ({ params }) => {
            initializedNotificationValue = params.value;
        });
        const agentApp = agent()
            .onRequest("session/load", parseValue, async ({ params, client }) => {
            const response = await client.request("authentication/logout", params);
            await client.notify("authentication/status", params);
            return response;
        })
            .onRequest("_vendor/acme/echo", parseValue, returnValue)
            .onNotification("session/set_model", parseValue, ({ params }) => {
            agentNotificationValue = params.value;
        })
            .onConnect(async (connection) => {
            await connection.initialized;
            try {
                await connection.client.notify("_vendor/acme/event", {
                    value: "initialized notification",
                });
                notificationSent.resolve();
            }
            catch (error) {
                notificationSent.reject(error);
                throw error;
            }
        })
            .onRequest(methods.agent.initialize, () => ({
            protocolVersion: PROTOCOL_VERSION,
            info: agentInfo,
        }));
        await clientApp.connectWith(agentApp, async (agentContext) => {
            const wrongDirection = methods.client.mcp.disconnect;
            expect(() => agentContext.request(wrongDirection, { connectionId: "connection-1" })).toThrow("not valid in this direction");
            expect(() => agentContext.batch([
                {
                    kind: "request",
                    method: wrongDirection,
                    params: { connectionId: "connection-1" },
                },
            ])).toThrow("not valid in this direction");
            await agentContext.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                info: clientInfo,
            });
            await notificationSent.promise;
            expect(initializedNotificationValue).toBe("initialized notification");
            await expect(agentContext.request("session/load", { value: "legacy response" })).resolves.toEqual({ value: "legacy response" });
            expect(clientNotificationValue).toBe("legacy response");
            await agentContext.notify("session/set_model", {
                value: "direct notification",
            });
            expect(agentNotificationValue).toBe("direct notification");
            const [batchResponse] = await agentContext.batch([
                batchRequest("session/load", { value: "batch response" }),
                batchNotification("session/set_model", {
                    value: "batch notification",
                }),
            ]);
            expect(batchResponse).toEqual({ value: "batch response" });
            expect(agentNotificationValue).toBe("batch notification");
            await expect(agentContext.request("_vendor/acme/echo", { value: "response" })).resolves.toEqual({ value: "response" });
        });
        const dynamicBuiltIn = methods.agent.session.new;
        expect(() => agent().onRequest(dynamicBuiltIn, parseValue, returnValue)).toThrow("Cannot replace the built-in");
    });
});
//# sourceMappingURL=acp.test.js.map