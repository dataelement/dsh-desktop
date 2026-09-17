import { describe, it, expect, beforeEach, vi } from "vitest";
import { z as z3 } from "zod/v3";
import { zAnnotations, zClientCapabilities, zCreateElicitationRequest, zCreateElicitationResponse, zInitializeResponse, zPlan, zToolCall, } from "./schema/zod.gen.js";
import { AGENT_METHODS, CLIENT_METHODS } from "./schema/index.js";
import { ClientSideConnection, AgentSideConnection, PROTOCOL_VERSION, ndJsonStream, CreateElicitationRequest, CreateElicitationResponse, ElicitationPropertySchema, MultiSelectItems, RequestError, agent as createAgent, client as createClient, methods, } from "./acp.js";
import * as sdk from "./acp.js";
import * as guards from "./schema/guards.gen.js";
import { Connection } from "./jsonrpc.js";
describe("Connection", () => {
    let clientToAgent;
    let agentToClient;
    beforeEach(() => {
        clientToAgent = new TransformStream();
        agentToClient = new TransformStream();
    });
    it("handles errors in bidirectional communication", async () => {
        // Create client that throws errors
        class TestClient {
            async writeTextFile(_) {
                throw new Error("Write failed");
            }
            async readTextFile(_) {
                throw new Error("Read failed");
            }
            async requestPermission(_) {
                throw new Error("Permission denied");
            }
            async sessionUpdate(_) {
                // no-op
            }
        }
        // Create agent that throws errors
        class TestAgent {
            async initialize(_) {
                throw new Error("Failed to initialize");
            }
            async newSession(_) {
                throw new Error("Failed to create session");
            }
            async loadSession(_) {
                throw new Error("Failed to load session");
            }
            async authenticate(_) {
                throw new Error("Authentication failed");
            }
            async prompt(_) {
                throw new Error("Prompt failed");
            }
            async cancel(_) {
                // no-op
            }
        }
        // Set up connections
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Test error handling in client->agent direction
        await expect(clientConnection.writeTextFile({
            path: "/test.txt",
            content: "test",
            sessionId: "test-session",
        })).rejects.toThrow();
        // Test error handling in agent->client direction
        await expect(agentConnection.newSession({
            cwd: "/test",
            mcpServers: [],
        })).rejects.toThrow();
    });
    it("handles concurrent requests", async () => {
        let requestCount = 0;
        // Create client
        class TestClient {
            async writeTextFile(_) {
                requestCount++;
                const currentCount = requestCount;
                await new Promise((resolve) => setTimeout(resolve, 40));
                console.log(`Write request ${currentCount} completed`);
                return {};
            }
            async readTextFile(params) {
                return { content: `Content of ${params.path}` };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_) {
                // no-op
            }
        }
        // Create agent
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return {
                    sessionId: "test-session",
                };
            }
            async loadSession(_) {
                return {};
            }
            async authenticate(_) {
                // no-op
            }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) {
                // no-op
            }
        }
        // Set up connections
        new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Send multiple concurrent requests
        const promises = [
            clientConnection.writeTextFile({
                path: "/file1.txt",
                content: "content1",
                sessionId: "session1",
            }),
            clientConnection.writeTextFile({
                path: "/file2.txt",
                content: "content2",
                sessionId: "session1",
            }),
            clientConnection.writeTextFile({
                path: "/file3.txt",
                content: "content3",
                sessionId: "session1",
            }),
        ];
        const results = await Promise.all(promises);
        // Verify all requests completed successfully
        expect(results).toHaveLength(3);
        expect(results[0]).toEqual({});
        expect(results[1]).toEqual({});
        expect(results[2]).toEqual({});
        expect(requestCount).toBe(3);
    });
    it("handles message ordering correctly", async () => {
        const messageLog = [];
        // Create client
        class TestClient {
            async writeTextFile(params) {
                messageLog.push(`writeTextFile called: ${params.path}`);
                return {};
            }
            async readTextFile(params) {
                messageLog.push(`readTextFile called: ${params.path}`);
                return { content: "test content" };
            }
            async requestPermission(params) {
                messageLog.push(`requestPermission called: ${params.toolCall.title}`);
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_params) {
                messageLog.push("sessionUpdate called");
            }
        }
        // Create agent
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(request) {
                messageLog.push(`newSession called: ${request.cwd}`);
                return {
                    sessionId: "test-session",
                };
            }
            async loadSession(params) {
                messageLog.push(`loadSession called: ${params.sessionId}`);
                return {};
            }
            async authenticate(params) {
                messageLog.push(`authenticate called: ${params.methodId}`);
            }
            async prompt(params) {
                messageLog.push(`prompt called: ${params.sessionId}`);
                return { stopReason: "end_turn" };
            }
            async cancel(params) {
                messageLog.push(`cancelled called: ${params.sessionId}`);
            }
        }
        // Set up connections
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Send requests in specific order
        await agentConnection.newSession({
            cwd: "/test",
            mcpServers: [],
        });
        await clientConnection.writeTextFile({
            path: "/test.txt",
            content: "test",
            sessionId: "test-session",
        });
        await clientConnection.readTextFile({
            path: "/test.txt",
            sessionId: "test-session",
        });
        await clientConnection.requestPermission({
            sessionId: "test-session",
            toolCall: {
                title: "Execute command",
                kind: "execute",
                status: "pending",
                toolCallId: "tool-123",
                content: [
                    {
                        type: "content",
                        content: {
                            type: "text",
                            text: "ls -la",
                        },
                    },
                ],
            },
            options: [
                {
                    kind: "allow_once",
                    name: "Allow",
                    optionId: "allow",
                },
                {
                    kind: "reject_once",
                    name: "Reject",
                    optionId: "reject",
                },
            ],
        });
        // Verify order
        expect(messageLog).toEqual([
            "newSession called: /test",
            "writeTextFile called: /test.txt",
            "readTextFile called: /test.txt",
            "requestPermission called: Execute command",
        ]);
    });
    it("handles notifications correctly", async () => {
        const notificationLog = [];
        // Create client
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(notification) {
                if (notification.update &&
                    "sessionUpdate" in notification.update &&
                    notification.update.sessionUpdate === "agent_message_chunk") {
                    notificationLog.push(`agent message: ${notification.update.content.text}`);
                }
            }
        }
        // Create agent
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return {
                    sessionId: "test-session",
                };
            }
            async loadSession(_) {
                return {};
            }
            async authenticate(_) {
                // no-op
            }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(params) {
                notificationLog.push(`cancelled: ${params.sessionId}`);
            }
        }
        // Create shared instances
        const testClient = () => new TestClient();
        const testAgent = () => new TestAgent();
        // Set up connections
        const agentConnection = new ClientSideConnection(testClient, ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(testAgent, ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Send notifications
        await clientConnection.sessionUpdate({
            sessionId: "test-session",
            update: {
                sessionUpdate: "agent_message_chunk",
                content: {
                    type: "text",
                    text: "Hello from agent",
                },
            },
        });
        await agentConnection.cancel({
            sessionId: "test-session",
        });
        // Verify notifications were received
        await vi.waitFor(() => {
            expect(notificationLog).toContain("agent message: Hello from agent");
            expect(notificationLog).toContain("cancelled: test-session");
        });
    });
    it("handles requests from inside a request handler without deadlocking", async () => {
        let agentConnection = null;
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                const listResponse = await agentConnection.listSessions({});
                expect(listResponse.sessions).toEqual([]);
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
            async listSessions(_) {
                return { sessions: [] };
            }
        }
        agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        const permissionResponse = await clientConnection.requestPermission({
            sessionId: "test-session",
            toolCall: {
                title: "Execute command",
                kind: "execute",
                status: "pending",
                toolCallId: "tool-123",
                content: [
                    { type: "content", content: { type: "text", text: "ls -la" } },
                ],
            },
            options: [
                { kind: "allow_once", name: "Allow", optionId: "allow" },
                { kind: "reject_once", name: "Reject", optionId: "reject" },
            ],
        });
        expect(permissionResponse.outcome.outcome).toBe("selected");
    });
    it("supports app handlers over streams", async () => {
        const events = [];
        createAgent({ name: "test-agent" })
            .onRequest(methods.agent.initialize, (c) => {
            events.push(`initialize:${c.params.protocolVersion}`);
            return {
                protocolVersion: c.params.protocolVersion,
                agentCapabilities: { loadSession: false },
                authMethods: [],
            };
        })
            .onRequest(methods.agent.session.new, (c) => {
            events.push(`new:${c.params.cwd}`);
            return { sessionId: "app-session" };
        })
            .onRequest(methods.agent.session.prompt, async (c) => {
            events.push(`prompt:${c.params.sessionId}`);
            await c.client.notify(methods.client.session.update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        type: "text",
                        text: "app update",
                    },
                },
            });
            return { stopReason: "end_turn" };
        })
            .connect(ndJsonStream(agentToClient.writable, clientToAgent.readable));
        const result = await createClient({ name: "test-client" })
            .onNotification(methods.client.session.update, (c) => {
            events.push(`update:${c.params.sessionId}`);
        })
            .connectWith(ndJsonStream(clientToAgent.writable, agentToClient.readable), async (agent) => {
            const initializeResponse = await agent.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            const sessionResponse = await agent.request(methods.agent.session.new, {
                cwd: "/app",
                mcpServers: [],
            });
            const promptResponse = await agent.request(methods.agent.session.prompt, {
                sessionId: sessionResponse.sessionId,
                prompt: [{ type: "text", text: "hello" }],
            });
            return {
                initializeResponse,
                sessionResponse,
                promptResponse,
            };
        });
        expect(result.initializeResponse.protocolVersion).toBe(PROTOCOL_VERSION);
        expect(result.sessionResponse.sessionId).toBe("app-session");
        expect(result.promptResponse.stopReason).toBe("end_turn");
        expect(events).toEqual([
            `initialize:${PROTOCOL_VERSION}`,
            "new:/app",
            "prompt:app-session",
            "update:app-session",
        ]);
    });
    it("connects apps directly without transport setup", async () => {
        const events = [];
        const appAgent = createAgent({ name: "direct-agent" })
            .onRequest(AGENT_METHODS.initialize, (c) => {
            events.push(`initialize:${c.params.protocolVersion}`);
            return {
                protocolVersion: c.params.protocolVersion,
                agentCapabilities: { loadSession: false },
                authMethods: [],
            };
        })
            .onRequest(AGENT_METHODS.session_new, (c) => {
            events.push(`new:${c.params.cwd}`);
            return { sessionId: "direct-session" };
        });
        const result = await createClient({ name: "direct-client" }).connectWith(appAgent, async (agent) => {
            const initializeResponse = await agent.request(AGENT_METHODS.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            const sessionResponse = await agent.request(AGENT_METHODS.session_new, {
                cwd: "/direct-app",
                mcpServers: [],
            });
            return { initializeResponse, sessionResponse };
        });
        expect(result.initializeResponse.protocolVersion).toBe(PROTOCOL_VERSION);
        expect(result.sessionResponse.sessionId).toBe("direct-session");
        expect(events).toEqual([
            `initialize:${PROTOCOL_VERSION}`,
            "new:/direct-app",
        ]);
    });
    it("rejects JSON-RPC batches on stable newline-delimited JSON app connections", async () => {
        let inputController;
        const initializeWritten = Promise.withResolvers();
        let outboundWrites = 0;
        let newSessionCalls = 0;
        const input = new ReadableStream({
            start(controller) {
                inputController = controller;
            },
        });
        const output = new WritableStream({
            write() {
                outboundWrites += 1;
                initializeWritten.resolve();
            },
        });
        const appAgent = createAgent()
            .onRequest(AGENT_METHODS.initialize, (c) => ({
            protocolVersion: c.params.protocolVersion,
            agentCapabilities: { loadSession: false },
            authMethods: [],
        }))
            .onRequest(AGENT_METHODS.session_new, () => {
            newSessionCalls += 1;
            return { sessionId: "must-not-run" };
        });
        const connection = appAgent.connect(ndJsonStream(output, input));
        const encoder = new TextEncoder();
        inputController.enqueue(encoder.encode(`${JSON.stringify({
            jsonrpc: "2.0",
            id: "initialize",
            method: AGENT_METHODS.initialize,
            params: {
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            },
        })}\n`));
        await initializeWritten.promise;
        inputController.enqueue(encoder.encode(`${JSON.stringify([
            {
                jsonrpc: "2.0",
                id: "new-session",
                method: AGENT_METHODS.session_new,
                params: { cwd: "/stable-v1", mcpServers: [] },
            },
        ])}\n`));
        await connection.closed;
        expect(connection.signal.reason).toBeInstanceOf(TypeError);
        expect(newSessionCalls).toBe(0);
        expect(outboundWrites).toBe(1);
    });
    it("connects app-style agents and clients directly", async () => {
        const events = [];
        const appAgent = createAgent({ name: "app-agent" })
            .onRequest(AGENT_METHODS.initialize, (c) => {
            events.push(`initialize:${c.params.protocolVersion}`);
            expect(Object.keys(c).sort()).toEqual([
                "client",
                "params",
                "requestId",
                "signal",
            ]);
            expect(c.requestId).toBe(0);
            expect(c.client.requestId).toBe(0);
            expect(c.signal.aborted).toBe(false);
            return {
                protocolVersion: c.params.protocolVersion,
                agentCapabilities: { loadSession: false },
                authMethods: [],
            };
        })
            .onRequest(AGENT_METHODS.session_new, (c) => {
            events.push(`new:${c.params.cwd}`);
            expect(c.requestId).toBe(1);
            expect(c.client.requestId).toBe(1);
            return { sessionId: "app-session" };
        })
            .onNotification("vendor/agent-notify", {
            parse(params) {
                const message = params.message;
                return { message: `${String(message)}:parsed` };
            },
        }, (c) => {
            expect(Object.keys(c).sort()).toEqual(["client", "params", "signal"]);
            expect("requestId" in c).toBe(false);
            expect(c.client.requestId).toBeUndefined();
            events.push(`agent-route:${String(c.params.message)}`);
        })
            .onRequest(AGENT_METHODS.session_prompt, async (c) => {
            events.push(`prompt:${c.params.sessionId}`);
            expect(c.requestId).toBe(2);
            expect(c.client.requestId).toBe(2);
            const elicitation = await c.client.request(methods.client.elicitation.create, {
                requestId: c.requestId,
                mode: "form",
                message: "Need input",
                requestedSchema: {
                    type: "object",
                    properties: { value: { type: "string" } },
                },
            });
            events.push(`elicitation:${elicitation.action}`);
            const pong = await c.client.request("vendor/ping", {
                message: "hello",
            });
            events.push(`pong:${String(pong.message)}`);
            await c.client.notify(CLIENT_METHODS.session_update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: { type: "text", text: "app update" },
                },
            });
            return { stopReason: "end_turn" };
        });
        const appClient = createClient({ name: "app-client" })
            .onNotification(CLIENT_METHODS.session_update, (c) => {
            expect("requestId" in c).toBe(false);
            expect(c.agent.requestId).toBeUndefined();
            events.push(`update:${c.params.sessionId}`);
        })
            .onRequest(CLIENT_METHODS.elicitation_create, (c) => {
            expect(Object.keys(c).sort()).toEqual([
                "agent",
                "params",
                "requestId",
                "signal",
            ]);
            expect(c.requestId).toBe(0);
            expect(c.agent.requestId).toBe(0);
            if (!("requestId" in c.params)) {
                throw new Error("Expected request-scoped elicitation");
            }
            expect(c.params.requestId).toBe(2);
            events.push(`client-elicitation:${String(c.params.requestId)}`);
            return { action: "decline" };
        })
            .onRequest("vendor/ping", (params) => {
            const message = params.message;
            return { message: String(message).toUpperCase() };
        }, (c) => {
            expect(Object.keys(c).sort()).toEqual([
                "agent",
                "params",
                "requestId",
                "signal",
            ]);
            expect(c.requestId).toBe(1);
            expect(c.agent.requestId).toBe(1);
            expect(c.signal.aborted).toBe(false);
            events.push(`client-route:${String(c.params.message)}`);
            return { message: c.params.message };
        });
        const result = await appClient.connectWith(appAgent, async (agentCx) => {
            const initializeResponse = await agentCx.request(AGENT_METHODS.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            const sessionResponse = await agentCx.request(AGENT_METHODS.session_new, {
                cwd: "/app",
                mcpServers: [],
            });
            await agentCx.notify("vendor/agent-notify", {
                message: "from-client",
            });
            const promptResponse = await agentCx.request(AGENT_METHODS.session_prompt, {
                sessionId: sessionResponse.sessionId,
                prompt: [{ type: "text", text: "hello" }],
            });
            return { initializeResponse, sessionResponse, promptResponse };
        });
        expect(result.initializeResponse.protocolVersion).toBe(PROTOCOL_VERSION);
        expect(result.sessionResponse.sessionId).toBe("app-session");
        expect(result.promptResponse.stopReason).toBe("end_turn");
        expect(events).toEqual([
            `initialize:${PROTOCOL_VERSION}`,
            "new:/app",
            "agent-route:from-client:parsed",
            "prompt:app-session",
            "client-elicitation:2",
            "elicitation:decline",
            "client-route:HELLO",
            "pong:HELLO",
            "update:app-session",
        ]);
    });
    it("aborts app request context signals for protocol cancellation", async () => {
        const requestSignal = Promise.withResolvers();
        const appAgent = createAgent({ name: "cancel-signal-agent" }).onRequest("vendor/slow", (params) => params, async (c) => {
            requestSignal.resolve(c.signal);
            await new Promise((resolve) => {
                c.signal.addEventListener("abort", () => resolve(), { once: true });
            });
            return { cancelled: c.signal.aborted };
        });
        const appClient = createClient({ name: "cancel-signal-client" });
        const result = await appClient.connectWith(appAgent, async (agentCx) => {
            const response = agentCx.request("vendor/slow", {});
            const signal = await requestSignal.promise;
            expect(signal.aborted).toBe(false);
            await agentCx.notify(methods.protocol.cancelRequest, { requestId: 0 });
            return response;
        });
        expect(result).toEqual({ cancelled: true });
    });
    it("maps app request abort errors to request cancellation", async () => {
        const requestSignal = Promise.withResolvers();
        const appAgent = createAgent({ name: "abort-error-agent" }).onRequest("vendor/abort", (params) => params, async (c) => {
            requestSignal.resolve(c.signal);
            await new Promise((_, reject) => {
                c.signal.addEventListener("abort", () => {
                    const error = new Error("aborted");
                    error.name = "AbortError";
                    reject(error);
                }, { once: true });
            });
            return {};
        });
        const appClient = createClient({ name: "abort-error-client" });
        await appClient.connectWith(appAgent, async (agentCx) => {
            const response = agentCx.request("vendor/abort", {});
            const signal = await requestSignal.promise;
            expect(signal.aborted).toBe(false);
            await agentCx.notify(methods.protocol.cancelRequest, { requestId: 0 });
            await expect(response).rejects.toMatchObject({
                code: -32800,
                message: "Request cancelled",
            });
        });
    });
    it("returns peer contexts from app connection handles", async () => {
        const events = [];
        const appAgent = createAgent({ name: "peer-handle-agent" })
            .onRequest(AGENT_METHODS.initialize, (c) => {
            events.push(`initialize:${c.params.protocolVersion}`);
            return {
                protocolVersion: c.params.protocolVersion,
                agentCapabilities: { loadSession: false },
                authMethods: [],
            };
        })
            .onNotification("vendor/agent/notify", (params) => params, (c) => {
            events.push(`agent-notify:${c.params.message}`);
        });
        const appClient = createClient({ name: "peer-handle-client" })
            .onRequest(CLIENT_METHODS.fs_read_text_file, (c) => {
            events.push(`read:${c.params.path}`);
            return { content: "client file" };
        })
            .onNotification(CLIENT_METHODS.session_update, (c) => {
            events.push(`update:${c.params.sessionId}`);
        });
        const agentConnection = appAgent.connect(appClient);
        try {
            const readResponse = await agentConnection.client.request(CLIENT_METHODS.fs_read_text_file, {
                sessionId: "peer-session",
                path: "/peer/file.txt",
            });
            await agentConnection.client.notify(CLIENT_METHODS.session_update, {
                sessionId: "peer-session",
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: { type: "text", text: "from connection" },
                },
            });
            expect(readResponse.content).toBe("client file");
            await vi.waitFor(() => {
                expect(events).toContain("read:/peer/file.txt");
                expect(events).toContain("update:peer-session");
            });
        }
        finally {
            agentConnection.close();
            await agentConnection.closed;
        }
        const clientConnection = appClient.connect(appAgent);
        try {
            const initializeResponse = await clientConnection.agent.request(AGENT_METHODS.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            await clientConnection.agent.notify("vendor/agent/notify", {
                message: "from-client-connection",
            });
            expect(initializeResponse.protocolVersion).toBe(PROTOCOL_VERSION);
            await vi.waitFor(() => {
                expect(events).toContain(`initialize:${PROTOCOL_VERSION}`);
                expect(events).toContain("agent-notify:from-client-connection");
            });
        }
        finally {
            clientConnection.close();
            await clientConnection.closed;
        }
    });
    it("runs app connection hooks with peer-callable handles", async () => {
        const events = [];
        let agentHookConnection;
        let clientHookConnection;
        const appAgent = createAgent({ name: "hook-agent" })
            .onConnect(async (connection) => {
            agentHookConnection = connection;
            events.push("agent-connect");
            connection.signal.addEventListener("abort", () => {
                events.push("agent-close");
            });
            await connection.client.notify(CLIENT_METHODS.session_update, {
                sessionId: "hook-session",
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: { type: "text", text: "from agent hook" },
                },
            });
        })
            .onNotification("vendor/agent/notify", (params) => params, (c) => {
            events.push(`agent-notify:${c.params.message}`);
        });
        const appClient = createClient({ name: "hook-client" })
            .onConnect(async (connection) => {
            clientHookConnection = connection;
            events.push("client-connect");
            connection.signal.addEventListener("abort", () => {
                events.push("client-close");
            });
            await connection.agent.notify("vendor/agent/notify", {
                message: "from-client-hook",
            });
        })
            .onNotification(CLIENT_METHODS.session_update, (c) => {
            events.push(`update:${c.params.sessionId}`);
        });
        const connection = appAgent.connect(appClient);
        try {
            expect(agentHookConnection).toBe(connection);
            await vi.waitFor(() => {
                expect(clientHookConnection).toBeDefined();
                expect(events).toContain("agent-connect");
                expect(events).toContain("client-connect");
                expect(events).toContain("update:hook-session");
                expect(events).toContain("agent-notify:from-client-hook");
            });
        }
        finally {
            connection.close();
            await connection.closed;
        }
        await vi.waitFor(() => {
            expect(events).toContain("agent-close");
            expect(events).toContain("client-close");
        });
    });
    it("normalizes app built-in empty-object handler responses before sending", async () => {
        const appAgent = createAgent({ name: "empty-agent-responses" })
            .onRequest(AGENT_METHODS.session_load, () => { })
            .onRequest(AGENT_METHODS.session_delete, () => { })
            .onRequest(AGENT_METHODS.session_close, () => { })
            .onRequest(AGENT_METHODS.session_set_mode, () => { })
            .onRequest(AGENT_METHODS.authenticate, () => { })
            .onRequest(AGENT_METHODS.providers_set, () => { })
            .onRequest(AGENT_METHODS.providers_disable, () => { })
            .onRequest(AGENT_METHODS.logout, () => { })
            .onRequest(AGENT_METHODS.nes_close, () => { });
        const agentResponses = await createClient({
            name: "empty-agent-response-client",
        }).connectWith(appAgent, async (agent) => ({
            loadSession: await agent.request(AGENT_METHODS.session_load, {
                sessionId: "empty-session",
                cwd: "/empty",
                mcpServers: [],
            }),
            deleteSession: await agent.request(AGENT_METHODS.session_delete, {
                sessionId: "empty-session",
            }),
            closeSession: await agent.request(AGENT_METHODS.session_close, {
                sessionId: "empty-session",
            }),
            setSessionMode: await agent.request(AGENT_METHODS.session_set_mode, {
                sessionId: "empty-session",
                modeId: "ask",
            }),
            authenticate: await agent.request(AGENT_METHODS.authenticate, {
                methodId: "none",
            }),
            setProvider: await agent.request(AGENT_METHODS.providers_set, {
                providerId: "main",
                apiType: "openai",
                baseUrl: "https://api.openai.com/v1",
            }),
            disableProvider: await agent.request(AGENT_METHODS.providers_disable, {
                providerId: "main",
            }),
            logout: await agent.request(AGENT_METHODS.logout, {}),
            closeNes: await agent.request(AGENT_METHODS.nes_close, {
                sessionId: "nes-session",
            }),
        }));
        expect(agentResponses).toEqual({
            loadSession: {},
            deleteSession: {},
            closeSession: {},
            setSessionMode: {},
            authenticate: {},
            setProvider: {},
            disableProvider: {},
            logout: {},
            closeNes: {},
        });
        let clientResponses;
        const appClient = createClient({ name: "empty-client-responses" })
            .onRequest(CLIENT_METHODS.fs_write_text_file, () => { })
            .onRequest(CLIENT_METHODS.terminal_release, () => { })
            .onRequest(CLIENT_METHODS.terminal_kill, () => { });
        await appClient.connectWith(createAgent({ name: "empty-client-response-agent" })
            .onRequest(AGENT_METHODS.session_new, () => ({
            sessionId: "empty-client-session",
        }))
            .onRequest(AGENT_METHODS.session_prompt, async (c) => {
            clientResponses = {
                writeTextFile: await c.client.request(CLIENT_METHODS.fs_write_text_file, {
                    sessionId: c.params.sessionId,
                    path: "/empty-client.txt",
                    content: "hello",
                }),
                releaseTerminal: await c.client.request(CLIENT_METHODS.terminal_release, {
                    sessionId: c.params.sessionId,
                    terminalId: "terminal-1",
                }),
                killTerminal: await c.client.request(CLIENT_METHODS.terminal_kill, {
                    sessionId: c.params.sessionId,
                    terminalId: "terminal-1",
                }),
            };
            return { stopReason: "end_turn" };
        }), async (agent) => {
            const session = await agent.request(AGENT_METHODS.session_new, {
                cwd: "/empty-client",
                mcpServers: [],
            });
            await agent.request(AGENT_METHODS.session_prompt, {
                sessionId: session.sessionId,
                prompt: [{ type: "text", text: "check empty responses" }],
            });
        });
        expect(clientResponses).toEqual({
            writeTextFile: {},
            releaseTerminal: {},
            killTerminal: {},
        });
    });
    it("normalizes raw null terminal handle empty responses in app contexts", async () => {
        let terminalResponses;
        const appAgent = createAgent({ name: "terminal-null-agent" })
            .onRequest(AGENT_METHODS.session_new, () => ({
            sessionId: "terminal-null-session",
        }))
            .onRequest(AGENT_METHODS.session_prompt, async (c) => {
            const terminal = await c.client.request(CLIENT_METHODS.terminal_create, {
                sessionId: c.params.sessionId,
                command: "echo hello",
            });
            terminalResponses = {
                kill: await c.client.request(CLIENT_METHODS.terminal_kill, {
                    sessionId: c.params.sessionId,
                    terminalId: terminal.terminalId,
                }),
                release: await c.client.request(CLIENT_METHODS.terminal_release, {
                    sessionId: c.params.sessionId,
                    terminalId: terminal.terminalId,
                }),
            };
            return { stopReason: "end_turn" };
        });
        await createClient({ name: "terminal-null-client" })
            .onRequest(CLIENT_METHODS.terminal_create, () => ({
            terminalId: "terminal-1",
        }))
            .onRequest(CLIENT_METHODS.terminal_kill, (params) => params, () => null)
            .onRequest(CLIENT_METHODS.terminal_release, (params) => params, () => null)
            .connectWith(appAgent, async (agent) => {
            const session = await agent.request(AGENT_METHODS.session_new, {
                cwd: "/terminal-null",
                mcpServers: [],
            });
            await agent.request(AGENT_METHODS.session_prompt, {
                sessionId: session.sessionId,
                prompt: [{ type: "text", text: "terminal" }],
            });
        });
        expect(terminalResponses).toEqual({
            kill: {},
            release: {},
        });
    });
    describe.each(["legacy", "app"])("%s connection API parity", (api) => {
        it("runs a prompt flow with outbound agent requests and notifications", async () => {
            const events = [];
            async function runPrompt(agent) {
                const initializeResponse = await agent.request(AGENT_METHODS.initialize, {
                    protocolVersion: PROTOCOL_VERSION,
                    clientCapabilities: {},
                });
                const sessionResponse = await agent.request(AGENT_METHODS.session_new, {
                    cwd: "/parity",
                    mcpServers: [],
                });
                const promptResponse = await agent.request(AGENT_METHODS.session_prompt, {
                    sessionId: sessionResponse.sessionId,
                    prompt: [{ type: "text", text: "hello" }],
                });
                return { initializeResponse, sessionResponse, promptResponse };
            }
            let result;
            if (api === "legacy") {
                class TestClient {
                    requestPermission() {
                        events.push("request-permission");
                        return { outcome: { outcome: "selected", optionId: "allow" } };
                    }
                    sessionUpdate(params) {
                        events.push(`update:${params.sessionId}`);
                    }
                }
                class TestAgent {
                    client;
                    constructor(client) {
                        this.client = client;
                    }
                    initialize(params) {
                        events.push(`initialize:${params.protocolVersion}`);
                        return {
                            protocolVersion: params.protocolVersion,
                            agentCapabilities: { loadSession: false },
                            authMethods: [],
                        };
                    }
                    newSession(params) {
                        events.push(`new:${params.cwd}`);
                        return { sessionId: "parity-session" };
                    }
                    async authenticate() { }
                    async prompt(params) {
                        events.push(`prompt:${params.sessionId}`);
                        const permission = await this.client.requestPermission({
                            sessionId: params.sessionId,
                            toolCall: {
                                title: "Execute command",
                                kind: "execute",
                                status: "pending",
                                toolCallId: "parity-tool",
                                content: [],
                            },
                            options: [
                                { kind: "allow_once", name: "Allow", optionId: "allow" },
                            ],
                        });
                        events.push(`permission:${permission.outcome.outcome}`);
                        await this.client.sessionUpdate({
                            sessionId: params.sessionId,
                            update: {
                                sessionUpdate: "agent_message_chunk",
                                content: { type: "text", text: "done" },
                            },
                        });
                        return { stopReason: "end_turn" };
                    }
                    cancel() { }
                }
                const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
                new AgentSideConnection((client) => new TestAgent(client), ndJsonStream(agentToClient.writable, clientToAgent.readable));
                result = await runPrompt(agentConnection);
            }
            else {
                const appAgent = createAgent({ name: "parity-agent" })
                    .onRequest(AGENT_METHODS.initialize, (c) => {
                    events.push(`initialize:${c.params.protocolVersion}`);
                    return {
                        protocolVersion: c.params.protocolVersion,
                        agentCapabilities: { loadSession: false },
                        authMethods: [],
                    };
                })
                    .onRequest(AGENT_METHODS.session_new, (c) => {
                    events.push(`new:${c.params.cwd}`);
                    return { sessionId: "parity-session" };
                })
                    .onRequest(AGENT_METHODS.session_prompt, async (c) => {
                    events.push(`prompt:${c.params.sessionId}`);
                    const permission = await c.client.request(CLIENT_METHODS.session_request_permission, {
                        sessionId: c.params.sessionId,
                        toolCall: {
                            title: "Execute command",
                            kind: "execute",
                            status: "pending",
                            toolCallId: "parity-tool",
                            content: [],
                        },
                        options: [
                            { kind: "allow_once", name: "Allow", optionId: "allow" },
                        ],
                    });
                    events.push(`permission:${permission.outcome.outcome}`);
                    await c.client.notify(CLIENT_METHODS.session_update, {
                        sessionId: c.params.sessionId,
                        update: {
                            sessionUpdate: "agent_message_chunk",
                            content: { type: "text", text: "done" },
                        },
                    });
                    return { stopReason: "end_turn" };
                });
                result = await createClient({ name: "parity-client" })
                    .onRequest(CLIENT_METHODS.session_request_permission, () => {
                    events.push("request-permission");
                    return { outcome: { outcome: "selected", optionId: "allow" } };
                })
                    .onNotification(CLIENT_METHODS.session_update, (c) => {
                    events.push(`update:${c.params.sessionId}`);
                })
                    .connectWith(appAgent, runPrompt);
            }
            expect(result.initializeResponse.protocolVersion).toBe(PROTOCOL_VERSION);
            expect(result.sessionResponse.sessionId).toBe("parity-session");
            expect(result.promptResponse.stopReason).toBe("end_turn");
            expect(events).toEqual([
                `initialize:${PROTOCOL_VERSION}`,
                "new:/parity",
                "prompt:parity-session",
                "request-permission",
                "permission:selected",
                "update:parity-session",
            ]);
        });
        it("supports custom request and notification extensions", async () => {
            const events = [];
            if (api === "legacy") {
                class TestClient {
                    requestPermission() {
                        return { outcome: { outcome: "cancelled" } };
                    }
                    sessionUpdate() { }
                    extMethod(method, params) {
                        events.push(`client-request:${method}`);
                        return { echoed: params.message };
                    }
                    extNotification(method, params) {
                        events.push(`client-notification:${method}:${params.message}`);
                    }
                }
                class TestAgent {
                    initialize(params) {
                        return {
                            protocolVersion: params.protocolVersion,
                            agentCapabilities: { loadSession: false },
                            authMethods: [],
                        };
                    }
                    newSession() {
                        return { sessionId: "extension-session" };
                    }
                    authenticate() { }
                    prompt() {
                        return { stopReason: "end_turn" };
                    }
                    cancel() { }
                    extMethod(method, params) {
                        events.push(`agent-request:${method}`);
                        return { echoed: params.message };
                    }
                    extNotification(method, params) {
                        events.push(`agent-notification:${method}:${params.message}`);
                    }
                }
                const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
                const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
                await expect(agentConnection.request("vendor/agent-echo", {
                    message: "to-agent",
                })).resolves.toEqual({ echoed: "to-agent" });
                await agentConnection.notify("vendor/agent-note", {
                    message: "notify-agent",
                });
                await expect(clientConnection.request("vendor/client-echo", {
                    message: "to-client",
                })).resolves.toEqual({ echoed: "to-client" });
                await clientConnection.notify("vendor/client-note", {
                    message: "notify-client",
                });
            }
            else {
                const appAgent = createAgent({ name: "extension-agent" })
                    .onRequest(AGENT_METHODS.initialize, (c) => ({
                    protocolVersion: c.params.protocolVersion,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                }))
                    .onRequest(AGENT_METHODS.session_new, () => ({
                    sessionId: "extension-session",
                }))
                    .onRequest(AGENT_METHODS.session_prompt, async (c) => {
                    await expect(c.client.request("vendor/client-echo", {
                        message: "to-client",
                    })).resolves.toEqual({ echoed: "to-client" });
                    await c.client.notify("vendor/client-note", {
                        message: "notify-client",
                    });
                    return { stopReason: "end_turn" };
                })
                    .onRequest("vendor/agent-echo", (params) => params, (c) => {
                    events.push("agent-request:vendor/agent-echo");
                    return { echoed: c.params.message };
                })
                    .onNotification("vendor/agent-note", (params) => params, (c) => {
                    events.push(`agent-notification:vendor/agent-note:${c.params.message}`);
                });
                await createClient({ name: "extension-client" })
                    .onRequest("vendor/client-echo", (params) => params, (c) => {
                    events.push("client-request:vendor/client-echo");
                    return { echoed: c.params.message };
                })
                    .onNotification("vendor/client-note", (params) => params, (c) => {
                    events.push(`client-notification:vendor/client-note:${c.params.message}`);
                })
                    .connectWith(appAgent, async (agent) => {
                    await expect(agent.request("vendor/agent-echo", {
                        message: "to-agent",
                    })).resolves.toEqual({ echoed: "to-agent" });
                    await agent.notify("vendor/agent-note", {
                        message: "notify-agent",
                    });
                    const session = await agent.request(AGENT_METHODS.session_new, {
                        cwd: "/extension",
                        mcpServers: [],
                    });
                    await agent.request(AGENT_METHODS.session_prompt, {
                        sessionId: session.sessionId,
                        prompt: [{ type: "text", text: "run extension checks" }],
                    });
                });
            }
            await vi.waitFor(() => {
                expect(events).toEqual([
                    "agent-request:vendor/agent-echo",
                    "agent-notification:vendor/agent-note:notify-agent",
                    "client-request:vendor/client-echo",
                    "client-notification:vendor/client-note:notify-client",
                ]);
            });
        });
        it("reports Zod v3 parser failures as invalid params", async () => {
            if (api !== "app") {
                return;
            }
            const appAgent = createAgent({ name: "zod-v3-parser-agent" }).onRequest("vendor/agent-echo", z3.object({ message: z3.string() }), (c) => ({
                echoed: c.params.message,
            }));
            await expect(createClient({ name: "zod-v3-parser-client" }).connectWith(appAgent, (agent) => agent.request("vendor/agent-echo", {
                message: 123,
            }))).rejects.toMatchObject({
                code: -32602,
                message: "Invalid params",
            });
        });
        it("propagates agent-to-client request errors through prompt handlers", async () => {
            let successCalled = false;
            if (api === "legacy") {
                class TestClient {
                    requestPermission() {
                        throw new RequestError(-32000, "permission failed");
                    }
                    sessionUpdate() { }
                }
                class TestAgent {
                    client;
                    constructor(client) {
                        this.client = client;
                    }
                    initialize(params) {
                        return {
                            protocolVersion: params.protocolVersion,
                            agentCapabilities: { loadSession: false },
                            authMethods: [],
                        };
                    }
                    newSession() {
                        return { sessionId: "error-parity-session" };
                    }
                    authenticate() { }
                    async prompt(params) {
                        await this.client.requestPermission({
                            sessionId: params.sessionId,
                            toolCall: {
                                title: "Execute command",
                                kind: "execute",
                                status: "pending",
                                toolCallId: "error-parity-tool",
                                content: [],
                            },
                            options: [
                                { kind: "allow_once", name: "Allow", optionId: "allow" },
                            ],
                        });
                        successCalled = true;
                        return { stopReason: "end_turn" };
                    }
                    cancel() { }
                }
                const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
                new AgentSideConnection((client) => new TestAgent(client), ndJsonStream(agentToClient.writable, clientToAgent.readable));
                const session = await agentConnection.newSession({
                    cwd: "/error-parity",
                    mcpServers: [],
                });
                await expect(agentConnection.prompt({
                    sessionId: session.sessionId,
                    prompt: [{ type: "text", text: "hello" }],
                })).rejects.toThrow("permission failed");
            }
            else {
                const appAgent = createAgent({ name: "error-parity-agent" })
                    .onRequest(AGENT_METHODS.session_new, () => ({
                    sessionId: "error-parity-session",
                }))
                    .onRequest(AGENT_METHODS.session_prompt, async (c) => {
                    await c.client.request(CLIENT_METHODS.session_request_permission, {
                        sessionId: c.params.sessionId,
                        toolCall: {
                            title: "Execute command",
                            kind: "execute",
                            status: "pending",
                            toolCallId: "error-parity-tool",
                            content: [],
                        },
                        options: [
                            { kind: "allow_once", name: "Allow", optionId: "allow" },
                        ],
                    });
                    successCalled = true;
                    return { stopReason: "end_turn" };
                });
                await expect(createClient({ name: "error-parity-client" })
                    .onRequest(CLIENT_METHODS.session_request_permission, () => {
                    throw new RequestError(-32000, "permission failed");
                })
                    .connectWith(appAgent, async (agent) => {
                    const session = await agent.request(AGENT_METHODS.session_new, {
                        cwd: "/error-parity",
                        mcpServers: [],
                    });
                    return agent.request(AGENT_METHODS.session_prompt, {
                        sessionId: session.sessionId,
                        prompt: [{ type: "text", text: "hello" }],
                    });
                })).rejects.toThrow("permission failed");
            }
            expect(successCalled).toBe(false);
        });
        it("keeps agent lifecycle responses equivalent", async () => {
            async function exerciseAgent(agent) {
                const initializeResponse = await agent.request(AGENT_METHODS.initialize, {
                    protocolVersion: PROTOCOL_VERSION,
                    clientCapabilities: {},
                });
                const sessionResponse = await agent.request(AGENT_METHODS.session_new, {
                    cwd: "/lifecycle",
                    mcpServers: [],
                    additionalDirectories: ["/lifecycle/extra"],
                });
                const loadResponse = await agent.request(AGENT_METHODS.session_load, {
                    sessionId: sessionResponse.sessionId,
                    cwd: "/lifecycle",
                    mcpServers: [],
                    additionalDirectories: ["/lifecycle/extra"],
                });
                const forkResponse = await agent.request(AGENT_METHODS.session_fork, {
                    sessionId: sessionResponse.sessionId,
                    cwd: "/lifecycle",
                    additionalDirectories: ["/lifecycle/extra"],
                });
                const listResponse = await agent.request(AGENT_METHODS.session_list, {});
                const resumeResponse = await agent.request(AGENT_METHODS.session_resume, {
                    sessionId: sessionResponse.sessionId,
                    cwd: "/lifecycle",
                    additionalDirectories: ["/lifecycle/extra"],
                });
                const deleteResponse = await agent.request(AGENT_METHODS.session_delete, {
                    sessionId: sessionResponse.sessionId,
                });
                const closeResponse = await agent.request(AGENT_METHODS.session_close, {
                    sessionId: sessionResponse.sessionId,
                });
                const setModeResponse = await agent.request(AGENT_METHODS.session_set_mode, {
                    sessionId: sessionResponse.sessionId,
                    modeId: "ask",
                });
                const configResponse = await agent.request(AGENT_METHODS.session_set_config_option, {
                    sessionId: sessionResponse.sessionId,
                    configId: "model",
                    value: "fast",
                });
                const authNoneResponse = await agent.request(AGENT_METHODS.authenticate, {
                    methodId: "none",
                });
                const authOauthResponse = await agent.request(AGENT_METHODS.authenticate, {
                    methodId: "oauth",
                });
                return {
                    initializeResponse,
                    sessionResponse,
                    loadResponse,
                    forkResponse,
                    listResponse,
                    resumeResponse,
                    deleteResponse,
                    closeResponse,
                    setModeResponse,
                    configResponse,
                    authNoneResponse,
                    authOauthResponse,
                };
            }
            const received = {};
            const handlers = {
                initialize(params) {
                    received.initialize = params;
                    return {
                        protocolVersion: params.protocolVersion,
                        agentCapabilities: { loadSession: true },
                        authMethods: [],
                        _meta: { api },
                    };
                },
                newSession(params) {
                    received.newSession = params;
                    return {
                        sessionId: "lifecycle-session",
                        _meta: { createdBy: api },
                    };
                },
                loadSession(params) {
                    received.loadSession = params;
                    return {};
                },
                unstable_forkSession(params) {
                    received.forkSession = params;
                    return { sessionId: "forked-lifecycle-session" };
                },
                listSessions(params) {
                    received.listSessions = params;
                    return { sessions: [] };
                },
                resumeSession(params) {
                    received.resumeSession = params;
                    return {};
                },
                deleteSession(_params) { },
                closeSession(_params) { },
                setSessionMode(_params) { },
                setSessionConfigOption(_params) {
                    return {
                        configOptions: [
                            {
                                type: "select",
                                id: "model",
                                name: "Model",
                                currentValue: "fast",
                                options: [
                                    {
                                        value: "fast",
                                        name: "Fast",
                                    },
                                ],
                            },
                        ],
                        currentValues: {
                            model: "fast",
                        },
                    };
                },
                authenticate(params) {
                    if (params.methodId === "none") {
                        return;
                    }
                    return { _meta: { methodId: params.methodId } };
                },
                prompt(_params) {
                    return { stopReason: "end_turn" };
                },
                cancel(_params) { },
            };
            let result;
            if (api === "legacy") {
                const agentConnection = new ClientSideConnection(() => ({
                    requestPermission() {
                        return { outcome: { outcome: "cancelled" } };
                    },
                    sessionUpdate() { },
                }), ndJsonStream(clientToAgent.writable, agentToClient.readable));
                new AgentSideConnection(() => handlers, ndJsonStream(agentToClient.writable, clientToAgent.readable));
                result = await exerciseAgent(agentConnection);
            }
            else {
                const appAgent = createAgent({ name: "lifecycle-parity-agent" })
                    .onRequest(AGENT_METHODS.initialize, (c) => handlers.initialize(c.params))
                    .onRequest(AGENT_METHODS.session_new, (c) => handlers.newSession(c.params))
                    .onRequest(AGENT_METHODS.session_load, (c) => handlers.loadSession(c.params))
                    .onRequest(AGENT_METHODS.session_fork, (c) => handlers.unstable_forkSession(c.params))
                    .onRequest(AGENT_METHODS.session_list, (c) => handlers.listSessions(c.params))
                    .onRequest(AGENT_METHODS.session_resume, (c) => handlers.resumeSession(c.params))
                    .onRequest(AGENT_METHODS.session_delete, (c) => handlers.deleteSession(c.params))
                    .onRequest(AGENT_METHODS.session_close, (c) => handlers.closeSession(c.params))
                    .onRequest(AGENT_METHODS.session_set_mode, (c) => handlers.setSessionMode(c.params))
                    .onRequest(AGENT_METHODS.session_set_config_option, (c) => handlers.setSessionConfigOption(c.params))
                    .onRequest(AGENT_METHODS.authenticate, (c) => handlers.authenticate(c.params))
                    .onRequest(AGENT_METHODS.session_prompt, (c) => handlers.prompt(c.params))
                    .onNotification(AGENT_METHODS.session_cancel, (c) => handlers.cancel(c.params));
                result = await createClient({
                    name: "lifecycle-parity-client",
                }).connectWith(appAgent, exerciseAgent);
            }
            expect(result.initializeResponse).toEqual({
                protocolVersion: PROTOCOL_VERSION,
                agentCapabilities: { loadSession: true },
                authMethods: [],
                _meta: { api },
            });
            expect(result.sessionResponse).toEqual({
                sessionId: "lifecycle-session",
                _meta: { createdBy: api },
            });
            expect(result.loadResponse).toEqual({});
            expect(result.forkResponse).toEqual({
                sessionId: "forked-lifecycle-session",
            });
            expect(result.listResponse).toEqual({ sessions: [] });
            expect(result.resumeResponse).toEqual({});
            expect(result.deleteResponse).toEqual({});
            expect(result.closeResponse).toEqual({});
            expect(result.setModeResponse).toEqual({});
            expect(result.configResponse.configOptions).toEqual([
                {
                    type: "select",
                    id: "model",
                    name: "Model",
                    currentValue: "fast",
                    options: [
                        {
                            value: "fast",
                            name: "Fast",
                        },
                    ],
                },
            ]);
            expect(result.authNoneResponse).toEqual({});
            expect(result.authOauthResponse).toEqual({
                _meta: { methodId: "oauth" },
            });
            expect(received.newSession).toMatchObject({
                cwd: "/lifecycle",
                additionalDirectories: ["/lifecycle/extra"],
            });
            expect(received.loadSession).toMatchObject({
                sessionId: "lifecycle-session",
                additionalDirectories: ["/lifecycle/extra"],
            });
            expect(received.forkSession).toMatchObject({
                sessionId: "lifecycle-session",
                additionalDirectories: ["/lifecycle/extra"],
            });
            expect(received.resumeSession).toMatchObject({
                sessionId: "lifecycle-session",
                additionalDirectories: ["/lifecycle/extra"],
            });
        });
        it("keeps agent-to-client helper calls equivalent", async () => {
            const events = [];
            async function runPrompt(agent) {
                const session = await agent.request(AGENT_METHODS.session_new, {
                    cwd: "/client-helpers",
                    mcpServers: [],
                });
                return agent.request(AGENT_METHODS.session_prompt, {
                    sessionId: session.sessionId,
                    prompt: [{ type: "text", text: "use client helpers" }],
                });
            }
            const clientHandlers = {
                requestPermission(params) {
                    events.push(`permission:${params.toolCall.toolCallId}`);
                    return { outcome: { outcome: "selected", optionId: "allow" } };
                },
                sessionUpdate(params) {
                    events.push(`update:${params.sessionId}`);
                },
                writeTextFile(params) {
                    events.push(`write:${params.path}:${params.content}`);
                    return {};
                },
                readTextFile(params) {
                    events.push(`read:${params.path}`);
                    return { content: "file contents" };
                },
                createTerminal(_params) {
                    events.push("terminal:create");
                    return { terminalId: "terminal-1" };
                },
                terminalOutput(_params) {
                    events.push("terminal:output");
                    return { output: "hello", truncated: false };
                },
                waitForTerminalExit(_params) {
                    events.push("terminal:wait");
                    return { exitCode: 0 };
                },
                killTerminal(_params) {
                    events.push("terminal:kill");
                },
                releaseTerminal(_params) {
                    events.push("terminal:release");
                },
            };
            async function handlePrompt(client, params) {
                await client.request(CLIENT_METHODS.fs_write_text_file, {
                    sessionId: params.sessionId,
                    path: "/client-helpers.txt",
                    content: "hello",
                });
                const read = await client.request(CLIENT_METHODS.fs_read_text_file, {
                    sessionId: params.sessionId,
                    path: "/client-helpers.txt",
                });
                events.push(`content:${read.content}`);
                const permission = await client.request(CLIENT_METHODS.session_request_permission, {
                    sessionId: params.sessionId,
                    toolCall: {
                        title: "Execute command",
                        kind: "execute",
                        status: "pending",
                        toolCallId: "client-helper-tool",
                        content: [],
                    },
                    options: [
                        { kind: "allow_once", name: "Allow", optionId: "allow" },
                    ],
                });
                events.push(`outcome:${permission.outcome.outcome}`);
                const terminal = await client.request(CLIENT_METHODS.terminal_create, {
                    sessionId: params.sessionId,
                    command: "echo hello",
                });
                const output = await client.request(CLIENT_METHODS.terminal_output, {
                    sessionId: params.sessionId,
                    terminalId: terminal.terminalId,
                });
                events.push(`terminal-content:${output.output}`);
                const exit = await client.request(CLIENT_METHODS.terminal_wait_for_exit, {
                    sessionId: params.sessionId,
                    terminalId: terminal.terminalId,
                });
                events.push(`exit:${exit.exitCode}`);
                await client.request(CLIENT_METHODS.terminal_kill, {
                    sessionId: params.sessionId,
                    terminalId: terminal.terminalId,
                });
                await client.request(CLIENT_METHODS.terminal_release, {
                    sessionId: params.sessionId,
                    terminalId: terminal.terminalId,
                });
                await client.notify(CLIENT_METHODS.session_update, {
                    sessionId: params.sessionId,
                    update: {
                        sessionUpdate: "agent_message_chunk",
                        content: { type: "text", text: "done" },
                    },
                });
                return { stopReason: "end_turn" };
            }
            if (api === "legacy") {
                const agentConnection = new ClientSideConnection(() => clientHandlers, ndJsonStream(clientToAgent.writable, agentToClient.readable));
                new AgentSideConnection((client) => ({
                    initialize(params) {
                        return {
                            protocolVersion: params.protocolVersion,
                            agentCapabilities: {},
                            authMethods: [],
                        };
                    },
                    newSession() {
                        return { sessionId: "client-helper-session" };
                    },
                    authenticate() { },
                    prompt(params) {
                        return handlePrompt(client, params);
                    },
                    cancel() { },
                }), ndJsonStream(agentToClient.writable, clientToAgent.readable));
                await expect(runPrompt(agentConnection)).resolves.toEqual({
                    stopReason: "end_turn",
                });
            }
            else {
                const appAgent = createAgent({ name: "client-helper-parity-agent" })
                    .onRequest(AGENT_METHODS.session_new, () => ({
                    sessionId: "client-helper-session",
                }))
                    .onRequest(AGENT_METHODS.session_prompt, (c) => handlePrompt(c.client, c.params));
                await expect(createClient({ name: "client-helper-parity-client" })
                    .onRequest(CLIENT_METHODS.session_request_permission, (c) => clientHandlers.requestPermission(c.params))
                    .onNotification(CLIENT_METHODS.session_update, (c) => clientHandlers.sessionUpdate(c.params))
                    .onRequest(CLIENT_METHODS.fs_write_text_file, (c) => clientHandlers.writeTextFile(c.params))
                    .onRequest(CLIENT_METHODS.fs_read_text_file, (c) => clientHandlers.readTextFile(c.params))
                    .onRequest(CLIENT_METHODS.terminal_create, (c) => clientHandlers.createTerminal(c.params))
                    .onRequest(CLIENT_METHODS.terminal_output, (c) => clientHandlers.terminalOutput(c.params))
                    .onRequest(CLIENT_METHODS.terminal_wait_for_exit, (c) => clientHandlers.waitForTerminalExit(c.params))
                    .onRequest(CLIENT_METHODS.terminal_kill, (c) => clientHandlers.killTerminal(c.params))
                    .onRequest(CLIENT_METHODS.terminal_release, (c) => clientHandlers.releaseTerminal(c.params))
                    .connectWith(appAgent, runPrompt)).resolves.toEqual({ stopReason: "end_turn" });
            }
            expect(events).toEqual([
                "write:/client-helpers.txt:hello",
                "read:/client-helpers.txt",
                "content:file contents",
                "permission:client-helper-tool",
                "outcome:selected",
                "terminal:create",
                "terminal:output",
                "terminal-content:hello",
                "terminal:wait",
                "exit:0",
                "terminal:kill",
                "terminal:release",
                "update:client-helper-session",
            ]);
        });
        it("keeps provider and NES request lifecycles equivalent", async () => {
            async function exerciseAgent(agent) {
                const providers = await agent.request(AGENT_METHODS.providers_list, {});
                const set = await agent.request(AGENT_METHODS.providers_set, {
                    providerId: "main",
                    apiType: "openai",
                    baseUrl: "https://llm-gateway.corp.example.com/openai/v1",
                });
                const disable = await agent.request(AGENT_METHODS.providers_disable, {
                    providerId: "main",
                });
                const start = await agent.request(AGENT_METHODS.nes_start, {
                    workspaceUri: "file:///workspace",
                    workspaceFolders: [{ uri: "file:///workspace/app", name: "app" }],
                });
                const suggest = await agent.request(AGENT_METHODS.nes_suggest, {
                    sessionId: start.sessionId,
                    position: { line: 0, character: 5 },
                    triggerKind: "manual",
                    uri: "file:///workspace/app/main.ts",
                    version: 1,
                });
                const close = await agent.request(AGENT_METHODS.nes_close, {
                    sessionId: start.sessionId,
                });
                return { providers, set, disable, start, suggest, close };
            }
            const events = [];
            const handlers = {
                ...{
                    initialize(params) {
                        return {
                            protocolVersion: params.protocolVersion,
                            agentCapabilities: { providers: {} },
                            authMethods: [],
                        };
                    },
                    newSession() {
                        return { sessionId: "provider-nes-session" };
                    },
                    authenticate() { },
                    prompt() {
                        return { stopReason: "end_turn" };
                    },
                    cancel() { },
                },
                unstable_listProviders(_params) {
                    events.push("providers:list");
                    return {
                        providers: [
                            {
                                providerId: "main",
                                supported: ["openai"],
                                required: true,
                                current: {
                                    apiType: "openai",
                                    baseUrl: "https://api.openai.com/v1",
                                },
                            },
                        ],
                    };
                },
                unstable_setProvider(params) {
                    events.push(`providers:set:${params.providerId}:${params.apiType}`);
                },
                unstable_disableProvider(params) {
                    events.push(`providers:disable:${params.providerId}`);
                    return {};
                },
                unstable_startNes(params) {
                    events.push(`nes:start:${params.workspaceUri}`);
                    return { sessionId: "nes-parity-session" };
                },
                unstable_suggestNes(params) {
                    events.push(`nes:suggest:${params.uri}:${params.triggerKind}`);
                    return {
                        suggestions: [
                            {
                                kind: "edit",
                                id: "suggestion-1",
                                uri: params.uri,
                                edits: [
                                    {
                                        range: {
                                            start: { line: 0, character: 0 },
                                            end: { line: 0, character: 5 },
                                        },
                                        newText: "hello",
                                    },
                                ],
                            },
                        ],
                    };
                },
                unstable_closeNes(params) {
                    events.push(`nes:close:${params.sessionId}`);
                    return {};
                },
            };
            let result;
            if (api === "legacy") {
                const agentConnection = new ClientSideConnection(() => ({
                    requestPermission() {
                        return { outcome: { outcome: "cancelled" } };
                    },
                    sessionUpdate() { },
                }), ndJsonStream(clientToAgent.writable, agentToClient.readable));
                new AgentSideConnection(() => handlers, ndJsonStream(agentToClient.writable, clientToAgent.readable));
                result = await exerciseAgent(agentConnection);
            }
            else {
                const appAgent = createAgent({ name: "provider-nes-parity-agent" })
                    .onRequest(AGENT_METHODS.providers_list, (c) => handlers.unstable_listProviders(c.params))
                    .onRequest(AGENT_METHODS.providers_set, (c) => handlers.unstable_setProvider(c.params))
                    .onRequest(AGENT_METHODS.providers_disable, (c) => handlers.unstable_disableProvider(c.params))
                    .onRequest(AGENT_METHODS.nes_start, (c) => handlers.unstable_startNes(c.params))
                    .onRequest(AGENT_METHODS.nes_suggest, (c) => handlers.unstable_suggestNes(c.params))
                    .onRequest(AGENT_METHODS.nes_close, (c) => handlers.unstable_closeNes(c.params));
                result = await createClient({
                    name: "provider-nes-parity-client",
                }).connectWith(appAgent, exerciseAgent);
            }
            expect(result.providers.providers).toHaveLength(1);
            expect(result.set).toEqual({});
            expect(result.disable).toEqual({});
            expect(result.start).toEqual({ sessionId: "nes-parity-session" });
            expect(result.suggest.suggestions).toEqual([
                {
                    kind: "edit",
                    id: "suggestion-1",
                    uri: "file:///workspace/app/main.ts",
                    edits: [
                        {
                            range: {
                                start: { line: 0, character: 0 },
                                end: { line: 0, character: 5 },
                            },
                            newText: "hello",
                        },
                    ],
                },
            ]);
            expect(result.close).toEqual({});
            expect(events).toEqual([
                "providers:list",
                "providers:set:main:openai",
                "providers:disable:main",
                "nes:start:file:///workspace",
                "nes:suggest:file:///workspace/app/main.ts:manual",
                "nes:close:nes-parity-session",
            ]);
        });
        it("keeps agent notification handlers equivalent", async () => {
            const notifications = [];
            async function sendNotifications(agent) {
                await agent.notify(AGENT_METHODS.document_did_open, {
                    sessionId: "notification-session",
                    uri: "file:///workspace/file.ts",
                    languageId: "typescript",
                    version: 1,
                    text: "const value = 1;",
                });
                await agent.notify(AGENT_METHODS.document_did_change, {
                    sessionId: "notification-session",
                    uri: "file:///workspace/file.ts",
                    version: 2,
                    contentChanges: [{ text: "const value = 2;" }],
                });
                await agent.notify(AGENT_METHODS.document_did_save, {
                    sessionId: "notification-session",
                    uri: "file:///workspace/file.ts",
                });
                await agent.notify(AGENT_METHODS.document_did_focus, {
                    sessionId: "notification-session",
                    uri: "file:///workspace/file.ts",
                    version: 2,
                    position: { line: 0, character: 12 },
                    visibleRange: {
                        start: { line: 0, character: 0 },
                        end: { line: 1, character: 0 },
                    },
                });
                await agent.notify(AGENT_METHODS.document_did_close, {
                    sessionId: "notification-session",
                    uri: "file:///workspace/file.ts",
                });
                await agent.notify(AGENT_METHODS.nes_accept, {
                    sessionId: "notification-session",
                    id: "suggestion-1",
                });
                await agent.notify(AGENT_METHODS.nes_reject, {
                    sessionId: "notification-session",
                    id: "suggestion-2",
                    reason: "rejected",
                });
            }
            const handlers = {
                ...{
                    initialize(params) {
                        return {
                            protocolVersion: params.protocolVersion,
                            agentCapabilities: {},
                            authMethods: [],
                        };
                    },
                    newSession() {
                        return { sessionId: "notification-session" };
                    },
                    authenticate() { },
                    prompt() {
                        return { stopReason: "end_turn" };
                    },
                    cancel() { },
                },
                unstable_didOpenDocument(params) {
                    notifications.push(["open", params.uri, params.version]);
                },
                unstable_didChangeDocument(params) {
                    notifications.push(["change", params.uri, params.version]);
                },
                unstable_didSaveDocument(params) {
                    notifications.push(["save", params.uri]);
                },
                unstable_didFocusDocument(params) {
                    notifications.push(["focus", params.uri, params.version]);
                },
                unstable_didCloseDocument(params) {
                    notifications.push(["close", params.uri]);
                },
                unstable_acceptNes(params) {
                    notifications.push(["accept", params.id]);
                },
                unstable_rejectNes(params) {
                    notifications.push(["reject", params.id, params.reason]);
                },
            };
            if (api === "legacy") {
                const agentConnection = new ClientSideConnection(() => ({
                    requestPermission() {
                        return { outcome: { outcome: "cancelled" } };
                    },
                    sessionUpdate() { },
                }), ndJsonStream(clientToAgent.writable, agentToClient.readable));
                new AgentSideConnection(() => handlers, ndJsonStream(agentToClient.writable, clientToAgent.readable));
                await sendNotifications(agentConnection);
            }
            else {
                const appAgent = createAgent({ name: "notification-parity-agent" })
                    .onNotification(AGENT_METHODS.document_did_open, (c) => handlers.unstable_didOpenDocument(c.params))
                    .onNotification(AGENT_METHODS.document_did_change, (c) => handlers.unstable_didChangeDocument(c.params))
                    .onNotification(AGENT_METHODS.document_did_save, (c) => handlers.unstable_didSaveDocument(c.params))
                    .onNotification(AGENT_METHODS.document_did_focus, (c) => handlers.unstable_didFocusDocument(c.params))
                    .onNotification(AGENT_METHODS.document_did_close, (c) => handlers.unstable_didCloseDocument(c.params))
                    .onNotification(AGENT_METHODS.nes_accept, (c) => handlers.unstable_acceptNes(c.params))
                    .onNotification(AGENT_METHODS.nes_reject, (c) => handlers.unstable_rejectNes(c.params));
                await createClient({
                    name: "notification-parity-client",
                }).connectWith(appAgent, sendNotifications);
            }
            await vi.waitFor(() => {
                expect(notifications).toEqual([
                    ["open", "file:///workspace/file.ts", 1],
                    ["change", "file:///workspace/file.ts", 2],
                    ["save", "file:///workspace/file.ts"],
                    ["focus", "file:///workspace/file.ts", 2],
                    ["close", "file:///workspace/file.ts"],
                    ["accept", "suggestion-1"],
                    ["reject", "suggestion-2", "rejected"],
                ]);
            });
        });
        it("keeps elicitation handlers equivalent", async () => {
            const received = [];
            const elicitationRequest = {
                sessionId: "elicitation-session",
                mode: "form",
                message: "Name",
                requestedSchema: {
                    type: "object",
                    properties: { name: { type: "string" } },
                },
            };
            async function exerciseElicitation(agentClient) {
                const response = await agentClient.createElicitation(elicitationRequest);
                await agentClient.completeElicitation({
                    elicitationId: "elicitation-1",
                });
                return response;
            }
            if (api === "legacy") {
                new ClientSideConnection(() => ({
                    requestPermission() {
                        return { outcome: { outcome: "cancelled" } };
                    },
                    sessionUpdate() { },
                    createElicitation(params) {
                        received.push(["create", params.message]);
                        return {
                            action: "accept",
                            content: { name: "Alice" },
                        };
                    },
                    completeElicitation(params) {
                        received.push(["complete", params.elicitationId]);
                    },
                }), ndJsonStream(clientToAgent.writable, agentToClient.readable));
                const clientConnection = new AgentSideConnection(() => ({
                    initialize(params) {
                        return {
                            protocolVersion: params.protocolVersion,
                            agentCapabilities: {},
                            authMethods: [],
                        };
                    },
                    newSession() {
                        return { sessionId: "elicitation-session" };
                    },
                    authenticate() { },
                    prompt() {
                        return { stopReason: "end_turn" };
                    },
                    cancel() { },
                }), ndJsonStream(agentToClient.writable, clientToAgent.readable));
                await expect(exerciseElicitation(clientConnection)).resolves.toEqual({
                    action: "accept",
                    content: { name: "Alice" },
                });
            }
            else {
                const appClient = createClient({ name: "elicitation-parity-client" })
                    .onRequest(CLIENT_METHODS.elicitation_create, (c) => {
                    received.push(["create", c.params.message]);
                    return {
                        action: "accept",
                        content: { name: "Alice" },
                    };
                })
                    .onNotification(CLIENT_METHODS.elicitation_complete, (c) => {
                    received.push(["complete", c.params.elicitationId]);
                });
                await expect(createAgent({ name: "elicitation-parity-agent" }).connectWith(appClient, async (client) => {
                    const response = await client.request(CLIENT_METHODS.elicitation_create, elicitationRequest);
                    await client.notify(CLIENT_METHODS.elicitation_complete, {
                        elicitationId: "elicitation-1",
                    });
                    return response;
                })).resolves.toEqual({
                    action: "accept",
                    content: { name: "Alice" },
                });
            }
            await vi.waitFor(() => {
                expect(received).toEqual([
                    ["create", "Name"],
                    ["complete", "elicitation-1"],
                ]);
            });
        });
    });
    it("returns promises from typed request methods", async () => {
        const events = [];
        const appAgent = createAgent({ name: "promise-agent" })
            .onRequest(AGENT_METHODS.initialize, (c) => {
            events.push(`initialize:${c.params.protocolVersion}`);
            return {
                protocolVersion: c.params.protocolVersion,
                agentCapabilities: { loadSession: false },
                authMethods: [],
            };
        })
            .onRequest(AGENT_METHODS.session_new, (c) => {
            events.push(`new:${c.params.cwd}`);
            return { sessionId: "promise-session" };
        });
        const result = await createClient({ name: "promise-client" }).connectWith(appAgent, async (agent) => {
            const initializeResponse = await agent.request(AGENT_METHODS.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            const sessionResponse = await agent.request(AGENT_METHODS.session_new, {
                cwd: "/promise-app",
                mcpServers: [],
            });
            return { initializeResponse, sessionResponse };
        });
        expect(result.initializeResponse.protocolVersion).toBe(PROTOCOL_VERSION);
        expect(result.sessionResponse.sessionId).toBe("promise-session");
        expect(events).toEqual([
            `initialize:${PROTOCOL_VERSION}`,
            "new:/promise-app",
        ]);
    });
    it("registers app handlers by method name", async () => {
        const events = [];
        const appAgent = createAgent({ name: "method-name-agent" })
            .onRequest(AGENT_METHODS.initialize, (c) => {
            events.push(`initialize:${c.params.protocolVersion}`);
            return {
                protocolVersion: c.params.protocolVersion,
                agentCapabilities: { loadSession: false },
                authMethods: [],
            };
        })
            .onRequest(AGENT_METHODS.session_new, (c) => {
            events.push(`new:${c.params.cwd}`);
            return { sessionId: "method-name-session" };
        })
            .onRequest("session/prompt", async (c) => {
            events.push(`prompt:${c.params.sessionId}`);
            const permission = await c.client.request(CLIENT_METHODS.session_request_permission, {
                sessionId: c.params.sessionId,
                toolCall: {
                    title: "Edit file",
                    kind: "edit",
                    status: "pending",
                    toolCallId: "method-name-tool",
                    content: [],
                    locations: [],
                },
                options: [{ kind: "allow_once", name: "Allow", optionId: "allow" }],
            });
            events.push(`permission:${permission.outcome.outcome}`);
            await c.client.notify(CLIENT_METHODS.session_update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: { type: "text", text: "ok" },
                },
            });
            return { stopReason: "end_turn" };
        })
            .onNotification(AGENT_METHODS.session_cancel, (c) => {
            events.push(`cancel:${c.params.sessionId}`);
        })
            .onNotification("example.com/agent-event", (params) => ({
            message: String(params.message),
        }), (c) => {
            events.push(`custom:${c.params.message}`);
        });
        const result = await createClient({ name: "method-name-client" })
            .onRequest(CLIENT_METHODS.session_request_permission, (c) => {
            events.push(`request:${c.params.toolCall.toolCallId}`);
            return { outcome: { outcome: "selected", optionId: "allow" } };
        })
            .onNotification("session/update", (c) => {
            events.push(`update:${c.params.sessionId}`);
        })
            .connectWith(appAgent, async (agent) => {
            const initializeResponse = await agent.request(AGENT_METHODS.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {},
            });
            const sessionResponse = await agent.request(AGENT_METHODS.session_new, {
                cwd: "/method-name",
                mcpServers: [],
            });
            const promptResponse = await agent.request(AGENT_METHODS.session_prompt, {
                sessionId: sessionResponse.sessionId,
                prompt: [{ type: "text", text: "hello" }],
            });
            await agent.notify("example.com/agent-event", {
                message: "parsed",
            });
            await agent.notify(AGENT_METHODS.session_cancel, {
                sessionId: sessionResponse.sessionId,
            });
            return { initializeResponse, promptResponse, sessionResponse };
        });
        expect(result.initializeResponse.protocolVersion).toBe(PROTOCOL_VERSION);
        expect(result.sessionResponse.sessionId).toBe("method-name-session");
        expect(result.promptResponse.stopReason).toBe("end_turn");
        expect(events).toEqual([
            `initialize:${PROTOCOL_VERSION}`,
            "new:/method-name",
            "prompt:method-name-session",
            "request:method-name-tool",
            "permission:selected",
            "update:method-name-session",
            "custom:parsed",
            "cancel:method-name-session",
        ]);
    });
    it("accepts synchronous client and agent implementations", () => {
        const client = {
            requestPermission() {
                return { outcome: { outcome: "cancelled" } };
            },
            sessionUpdate() { },
        };
        const agent = {
            initialize(request) {
                return {
                    protocolVersion: request.protocolVersion,
                    agentCapabilities: {},
                    authMethods: [],
                };
            },
            newSession() {
                return { sessionId: "sync-session" };
            },
            authenticate() {
                return {};
            },
            prompt() {
                return { stopReason: "end_turn" };
            },
            cancel() { },
        };
        expect(client.requestPermission({
            sessionId: "sync-session",
            toolCall: {
                title: "Read",
                kind: "read",
                status: "pending",
                toolCallId: "sync-tool",
                content: [],
            },
            options: [{ kind: "reject_once", name: "Reject", optionId: "reject" }],
        })).toEqual({ outcome: { outcome: "cancelled" } });
        expect(agent.newSession({
            cwd: "/sync",
            mcpServers: [],
        })).toEqual({ sessionId: "sync-session" });
    });
    it("supports awaiting outbound requests from handlers", async () => {
        const events = [];
        const appAgent = createAgent({ name: "handler-await-agent" })
            .onRequest(AGENT_METHODS.session_new, () => ({
            sessionId: "handler-await-session",
        }))
            .onRequest(AGENT_METHODS.session_prompt, async (c) => {
            events.push(`prompt:${c.params.sessionId}`);
            const permission = await c.client.request(CLIENT_METHODS.session_request_permission, {
                sessionId: c.params.sessionId,
                toolCall: {
                    title: "Execute command",
                    kind: "execute",
                    status: "pending",
                    toolCallId: "handler-await-tool",
                    content: [
                        { type: "content", content: { type: "text", text: "ls" } },
                    ],
                },
                options: [
                    { kind: "allow_once", name: "Allow", optionId: "allow" },
                    { kind: "reject_once", name: "Reject", optionId: "reject" },
                ],
            });
            events.push(`permission:${permission.outcome.outcome}`);
            return { stopReason: "end_turn" };
        });
        const promptResponse = await createClient({ name: "handler-await-client" })
            .onRequest(CLIENT_METHODS.session_request_permission, (c) => {
            events.push(`request:${c.params.toolCall.toolCallId}`);
            return {
                outcome: { outcome: "selected", optionId: "allow" },
            };
        })
            .connectWith(appAgent, async (agent) => {
            const session = await agent.request(AGENT_METHODS.session_new, {
                cwd: "/handler-await",
                mcpServers: [],
            });
            return agent.request(AGENT_METHODS.session_prompt, {
                sessionId: session.sessionId,
                prompt: [{ type: "text", text: "hello" }],
            });
        });
        expect(promptResponse.stopReason).toBe("end_turn");
        expect(events).toEqual([
            "prompt:handler-await-session",
            "request:handler-await-tool",
            "permission:selected",
        ]);
    });
    it("forwards awaited outbound request errors from handlers", async () => {
        let successCalled = false;
        const appAgent = createAgent({ name: "handler-await-error-agent" })
            .onRequest(AGENT_METHODS.session_new, () => ({
            sessionId: "handler-await-error-session",
        }))
            .onRequest(AGENT_METHODS.session_prompt, async (c) => {
            await c.client.request(CLIENT_METHODS.session_request_permission, {
                sessionId: c.params.sessionId,
                toolCall: {
                    title: "Execute command",
                    kind: "execute",
                    status: "pending",
                    toolCallId: "handler-await-error-tool",
                    content: [
                        {
                            type: "content",
                            content: { type: "text", text: "delete files" },
                        },
                    ],
                },
                options: [
                    { kind: "allow_once", name: "Allow", optionId: "allow" },
                    { kind: "reject_once", name: "Reject", optionId: "reject" },
                ],
            });
            successCalled = true;
            return { stopReason: "end_turn" };
        });
        await expect(createClient({ name: "handler-await-error-client" })
            .onRequest(CLIENT_METHODS.session_request_permission, () => {
            throw new RequestError(-32000, "permission failed");
        })
            .connectWith(appAgent, async (agent) => {
            const session = await agent.request(AGENT_METHODS.session_new, {
                cwd: "/handler-await-error",
                mcpServers: [],
            });
            return agent.request(AGENT_METHODS.session_prompt, {
                sessionId: session.sessionId,
                prompt: [{ type: "text", text: "hello" }],
            });
        })).rejects.toThrow("permission failed");
        expect(successCalled).toBe(false);
    });
    it("supports session builders with active session reads", async () => {
        const events = [];
        createAgent({ name: "session-agent" })
            .onRequest(AGENT_METHODS.session_new, (c) => {
            events.push(`new:${c.params.cwd}:${c.params.additionalDirectories?.join(",")}`);
            return { sessionId: "active-session" };
        })
            .onRequest(AGENT_METHODS.session_prompt, async (c) => {
            events.push(`prompt:${c.params.sessionId}:${c.params.prompt.length}`);
            await c.client.notify(CLIENT_METHODS.session_update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        type: "text",
                        text: "hello ",
                    },
                },
            });
            await c.client.notify(CLIENT_METHODS.session_update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        type: "text",
                        text: "world",
                    },
                },
            });
            return { stopReason: "end_turn" };
        })
            .connect(ndJsonStream(agentToClient.writable, clientToAgent.readable));
        const result = await createClient({ name: "session-client" }).connectWith(ndJsonStream(clientToAgent.writable, agentToClient.readable), async (agent) => agent
            .buildSession("/session-app")
            .withAdditionalDirectories(["/extra"])
            .withSession(async (session) => {
            const promptResponse = session.prompt("hello");
            const output = await session.readText();
            return {
                output,
                response: await promptResponse,
                sessionId: session.sessionId,
            };
        }));
        expect(result.sessionId).toBe("active-session");
        expect(result.output).toBe("hello world");
        expect(result.response.stopReason).toBe("end_turn");
        expect(events).toEqual([
            "new:/session-app:/extra",
            "prompt:active-session:1",
        ]);
    });
    it("delivers session updates to active sessions when a sessionUpdate handler is registered", async () => {
        const observedUpdates = [];
        const appAgent = createAgent({ name: "session-observer-agent" })
            .onRequest(AGENT_METHODS.session_new, () => ({
            sessionId: "observed-session",
        }))
            .onRequest(AGENT_METHODS.session_prompt, async (c) => {
            await c.client.notify(CLIENT_METHODS.session_update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        type: "text",
                        text: "observed ",
                    },
                },
            });
            await c.client.notify(CLIENT_METHODS.session_update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        type: "text",
                        text: "stream",
                    },
                },
            });
            return { stopReason: "end_turn" };
        });
        const result = await createClient({ name: "session-observer-client" })
            .onNotification(CLIENT_METHODS.session_update, (c) => {
            if (c.params.update.sessionUpdate === "agent_message_chunk" &&
                c.params.update.content.type === "text") {
                observedUpdates.push(c.params.update.content.text);
            }
        })
            .connectWith(appAgent, async (agent) => agent
            .buildSession({ cwd: "/session-observer", mcpServers: [] })
            .withSession(async (session) => {
            const response = session.prompt("hello");
            return {
                output: await session.readText(),
                response: await response,
            };
        }));
        expect(result.output).toBe("observed stream");
        expect(result.response.stopReason).toBe("end_turn");
        expect(observedUpdates).toEqual(["observed ", "stream"]);
    });
    it("collects active session updates before the prompt response", async () => {
        const appAgent = createAgent({ name: "active-session-order-agent" })
            .onRequest(AGENT_METHODS.session_new, () => ({
            sessionId: "active-session-order",
        }))
            .onRequest(AGENT_METHODS.session_prompt, async (c) => {
            await c.client.notify(CLIENT_METHODS.session_update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        type: "text",
                        text: "ordered ",
                    },
                },
            });
            await c.client.notify(CLIENT_METHODS.session_update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        type: "text",
                        text: "updates",
                    },
                },
            });
            return { stopReason: "end_turn" };
        });
        const result = await createClient({
            name: "active-session-order-client",
        }).connectWith(appAgent, async (agent) => agent
            .buildSession("/active-session-order")
            .withSession(async (session) => {
            const response = session.prompt("hello");
            return {
                output: await session.readText(),
                response: await response,
            };
        }));
        expect(result.output).toBe("ordered updates");
        expect(result.response.stopReason).toBe("end_turn");
    });
    it("keeps active sessions usable after prompt errors", async () => {
        let promptCalls = 0;
        const appAgent = createAgent({ name: "prompt-error-agent" })
            .onRequest(AGENT_METHODS.session_new, () => ({
            sessionId: "prompt-error-session",
        }))
            .onRequest(AGENT_METHODS.session_prompt, async (c) => {
            promptCalls += 1;
            if (promptCalls === 1) {
                throw new RequestError(-32000, "turn failed");
            }
            await c.client.notify(CLIENT_METHODS.session_update, {
                sessionId: c.params.sessionId,
                update: {
                    sessionUpdate: "agent_message_chunk",
                    content: {
                        type: "text",
                        text: "recovered",
                    },
                },
            });
            return { stopReason: "end_turn" };
        });
        const result = await createClient({
            name: "prompt-error-client",
        }).connectWith(appAgent, async (agent) => {
            const session = await agent.buildSession("/prompt-error").start();
            try {
                await expect(session.prompt("fail")).rejects.toThrow("turn failed");
                const response = session.prompt("recover");
                return {
                    output: await session.readText(),
                    response: await response,
                };
            }
            finally {
                session.dispose();
            }
        });
        expect(result.output).toBe("recovered");
        expect(result.response.stopReason).toBe("end_turn");
        expect(promptCalls).toBe(2);
    });
    it("delivers early session updates to active sessions", async () => {
        const update = await createClient({
            name: "early-update-client",
        }).connectWith(ndJsonStream(clientToAgent.writable, agentToClient.readable), async (agent) => {
            const sessionPromise = agent.buildSession("/early-update").start();
            const requestReader = clientToAgent.readable.getReader();
            const { value: requestChunk } = await requestReader.read();
            requestReader.releaseLock();
            const { id: requestId } = JSON.parse(new TextDecoder().decode(requestChunk));
            const writer = agentToClient.writable.getWriter();
            await writer.write(new TextEncoder().encode(JSON.stringify({
                jsonrpc: "2.0",
                id: requestId,
                result: { sessionId: "early-update-session" },
            }) +
                "\n" +
                JSON.stringify({
                    jsonrpc: "2.0",
                    method: "session/update",
                    params: {
                        sessionId: "early-update-session",
                        update: {
                            sessionUpdate: "agent_message_chunk",
                            content: {
                                type: "text",
                                text: "early",
                            },
                        },
                    },
                }) +
                "\n"));
            writer.releaseLock();
            const session = await sessionPromise;
            try {
                return await Promise.race([
                    session.nextUpdate(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for early session update")), 100)),
                ]);
            }
            finally {
                session.dispose();
            }
        });
        if (update.kind !== "session_update") {
            throw new Error(`Expected session update, got ${update.kind}`);
        }
        expect(update.notification.sessionId).toBe("early-update-session");
        expect(update.update).toEqual({
            sessionUpdate: "agent_message_chunk",
            content: {
                type: "text",
                text: "early",
            },
        });
    });
    it("delivers early session updates when a sessionUpdate handler is registered", async () => {
        const observedUpdates = [];
        const update = await createClient({
            name: "early-update-observer-client",
        })
            .onNotification(CLIENT_METHODS.session_update, (c) => {
            if (c.params.update.sessionUpdate === "agent_message_chunk" &&
                c.params.update.content.type === "text") {
                observedUpdates.push(c.params.update.content.text);
            }
        })
            .connectWith(ndJsonStream(clientToAgent.writable, agentToClient.readable), async (agent) => {
            const sessionPromise = agent
                .buildSession("/early-update-observer")
                .start();
            const requestReader = clientToAgent.readable.getReader();
            const { value: requestChunk } = await requestReader.read();
            requestReader.releaseLock();
            const { id: requestId } = JSON.parse(new TextDecoder().decode(requestChunk));
            const writer = agentToClient.writable.getWriter();
            await writer.write(new TextEncoder().encode(JSON.stringify({
                jsonrpc: "2.0",
                id: requestId,
                result: { sessionId: "early-update-observer-session" },
            }) +
                "\n" +
                JSON.stringify({
                    jsonrpc: "2.0",
                    method: "session/update",
                    params: {
                        sessionId: "early-update-observer-session",
                        update: {
                            sessionUpdate: "agent_message_chunk",
                            content: {
                                type: "text",
                                text: "early-observed",
                            },
                        },
                    },
                }) +
                "\n"));
            writer.releaseLock();
            const session = await sessionPromise;
            try {
                return await Promise.race([
                    session.nextUpdate(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for observed early session update")), 100)),
                ]);
            }
            finally {
                session.dispose();
            }
        });
        if (update.kind !== "session_update") {
            throw new Error(`Expected session update, got ${update.kind}`);
        }
        expect(update.notification.sessionId).toBe("early-update-observer-session");
        expect(update.update).toEqual({
            sessionUpdate: "agent_message_chunk",
            content: {
                type: "text",
                text: "early-observed",
            },
        });
        expect(observedUpdates).toContain("early-observed");
    });
    it("does not cache session updates handled without an active session", async () => {
        const observed = Promise.withResolvers();
        let pendingUpdate;
        const run = createClient({
            name: "observed-update-cache-client",
        })
            .onNotification(CLIENT_METHODS.session_update, (c) => {
            if (c.params.update.sessionUpdate === "agent_message_chunk" &&
                c.params.update.content.type === "text" &&
                c.params.update.content.text === "observed-only") {
                observed.resolve();
            }
        })
            .connectWith(ndJsonStream(clientToAgent.writable, agentToClient.readable), async (agent) => {
            const sessionResponse = agent.request(AGENT_METHODS.session_new, {
                cwd: "/observed-update-cache",
                mcpServers: [],
            });
            const requestReader = clientToAgent.readable.getReader();
            const { value: requestChunk } = await requestReader.read();
            requestReader.releaseLock();
            const { id: requestId } = JSON.parse(new TextDecoder().decode(requestChunk));
            const writer = agentToClient.writable.getWriter();
            await writer.write(new TextEncoder().encode(JSON.stringify({
                jsonrpc: "2.0",
                id: requestId,
                result: { sessionId: "observed-update-cache-session" },
            }) +
                "\n" +
                JSON.stringify({
                    jsonrpc: "2.0",
                    method: "session/update",
                    params: {
                        sessionId: "observed-update-cache-session",
                        update: {
                            sessionUpdate: "agent_message_chunk",
                            content: {
                                type: "text",
                                text: "observed-only",
                            },
                        },
                    },
                }) +
                "\n"));
            writer.releaseLock();
            await sessionResponse;
            await observed.promise;
            const sessionPromise = agent
                .buildSession("/observed-update-cache-active")
                .start();
            const activeRequestReader = clientToAgent.readable.getReader();
            const { value: activeRequestChunk } = await activeRequestReader.read();
            activeRequestReader.releaseLock();
            const { id: activeRequestId } = JSON.parse(new TextDecoder().decode(activeRequestChunk));
            const activeWriter = agentToClient.writable.getWriter();
            await activeWriter.write(new TextEncoder().encode(JSON.stringify({
                jsonrpc: "2.0",
                id: activeRequestId,
                result: { sessionId: "observed-update-cache-active-session" },
            }) + "\n"));
            activeWriter.releaseLock();
            const session = await sessionPromise;
            try {
                pendingUpdate = session.nextUpdate();
                await agentToClient.writable.close();
                return await pendingUpdate;
            }
            finally {
                session.dispose();
            }
        });
        await expect(run).rejects.toThrow("ACP connection closed");
        expect(pendingUpdate).toBeDefined();
        await expect(pendingUpdate).rejects.toThrow("ACP connection closed");
    });
    it("rejects pending active session reads when disposed", async () => {
        const appAgent = createAgent({ name: "dispose-session-agent" }).onRequest(AGENT_METHODS.session_new, () => ({ sessionId: "dispose-session" }));
        await createClient({ name: "dispose-session-client" }).connectWith(appAgent, async (agent) => {
            const session = await agent.buildSession("/dispose-session").start();
            const pendingUpdate = session.nextUpdate();
            session.dispose();
            await expect(pendingUpdate).rejects.toThrow("Active session disposed");
        });
    });
    it("rejects pending active session reads when the connection closes", async () => {
        const disposed = Promise.withResolvers();
        let pendingUpdate;
        const run = createClient({
            name: "closed-session-client",
        }).connectWith(ndJsonStream(clientToAgent.writable, agentToClient.readable), async (agent) => {
            const sessionPromise = agent
                .buildSession("/closed-active-session")
                .start();
            const requestReader = clientToAgent.readable.getReader();
            const { value: requestChunk } = await requestReader.read();
            requestReader.releaseLock();
            const { id: requestId } = JSON.parse(new TextDecoder().decode(requestChunk));
            const writer = agentToClient.writable.getWriter();
            await writer.write(new TextEncoder().encode(JSON.stringify({
                jsonrpc: "2.0",
                id: requestId,
                result: { sessionId: "closed-active-session" },
            }) + "\n"));
            writer.releaseLock();
            const session = await sessionPromise;
            try {
                pendingUpdate = session.nextUpdate();
                await agentToClient.writable.close();
                return await pendingUpdate;
            }
            finally {
                session.dispose();
                disposed.resolve();
            }
        });
        await expect(run).rejects.toThrow("ACP connection closed");
        expect(pendingUpdate).toBeDefined();
        await expect(Promise.race([
            pendingUpdate,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for connection-close session update rejection")), 100)),
        ])).rejects.toThrow("ACP connection closed");
        await expect(Promise.race([
            disposed.promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for active session cleanup")), 100)),
        ])).resolves.toBeUndefined();
    });
    it("processes notification after response when both arrive in quick succession", async () => {
        const events = [];
        const { promise: sessionNotification, resolve: resolveSessionNotification, } = Promise.withResolvers();
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_params) {
                // Record the session notification
                events.push("SessionNotification");
                resolveSessionNotification();
            }
        }
        const connection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const newSessionResponse = connection
            .newSession({ cwd: "/test", mcpServers: [] })
            .then((result) => {
            // Record the new session response event
            events.push("NewSessionResponse");
            return result;
        });
        // Get the NewSessionRequest ID
        const requestReader = clientToAgent.readable.getReader();
        const { value: requestChunk } = await requestReader.read();
        requestReader.releaseLock();
        const { id: requestId } = JSON.parse(new TextDecoder().decode(requestChunk));
        // Write response and notification in quick succession
        const sessionId = "test-session";
        const writer = agentToClient.writable.getWriter();
        await writer.write(new TextEncoder().encode(JSON.stringify({
            jsonrpc: "2.0",
            id: requestId,
            result: { sessionId },
        }) + "\n"));
        await writer.write(new TextEncoder().encode(JSON.stringify({
            jsonrpc: "2.0",
            method: "session/update",
            params: {
                sessionId,
                update: {
                    sessionUpdate: "available_commands_update",
                    availableCommands: [],
                },
            },
        }) + "\n"));
        writer.releaseLock();
        await newSessionResponse;
        await sessionNotification;
        expect(events).toEqual(["NewSessionResponse", "SessionNotification"]);
    });
    it("processes notification after response when both arrive in the same chunk", async () => {
        const events = [];
        const { promise: sessionNotification, resolve: resolveSessionNotification, } = Promise.withResolvers();
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_) {
                events.push("SessionNotification");
                resolveSessionNotification();
            }
        }
        const connection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const newSessionResponse = connection
            .newSession({ cwd: "/test", mcpServers: [] })
            .then((result) => {
            events.push("NewSessionResponse");
            return result;
        });
        const requestReader = clientToAgent.readable.getReader();
        const { value: requestChunk } = await requestReader.read();
        requestReader.releaseLock();
        const { id: requestId } = JSON.parse(new TextDecoder().decode(requestChunk));
        const sessionId = "test-session";
        const writer = agentToClient.writable.getWriter();
        await writer.write(new TextEncoder().encode(JSON.stringify({
            jsonrpc: "2.0",
            id: requestId,
            result: { sessionId },
        }) +
            "\n" +
            JSON.stringify({
                jsonrpc: "2.0",
                method: "session/update",
                params: {
                    sessionId,
                    update: {
                        sessionUpdate: "available_commands_update",
                        availableCommands: [],
                    },
                },
            }) +
            "\n"));
        writer.releaseLock();
        await newSessionResponse;
        await sessionNotification;
        expect(events).toEqual(["NewSessionResponse", "SessionNotification"]);
    });
    it("normalizes null results for known empty object responses", async () => {
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_) { }
        }
        const connection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const authenticateResponse = connection.authenticate({
            methodId: "test",
        });
        const requestReader = clientToAgent.readable.getReader();
        const { value: requestChunk } = await requestReader.read();
        requestReader.releaseLock();
        const { id: requestId } = JSON.parse(new TextDecoder().decode(requestChunk));
        const writer = agentToClient.writable.getWriter();
        await writer.write(new TextEncoder().encode(JSON.stringify({
            jsonrpc: "2.0",
            id: requestId,
            result: null,
        }) + "\n"));
        writer.releaseLock();
        await expect(authenticateResponse).resolves.toEqual({});
    });
    it("handles initialize method", async () => {
        // Create client
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_) {
                // no-op
            }
        }
        // Create agent
        class TestAgent {
            async initialize(params) {
                return {
                    protocolVersion: params.protocolVersion,
                    agentCapabilities: { loadSession: true },
                    authMethods: [
                        {
                            id: "oauth",
                            name: "OAuth",
                            description: "Authenticate with OAuth",
                        },
                    ],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async loadSession(_) {
                return {};
            }
            async authenticate(_) {
                // no-op
            }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) {
                // no-op
            }
        }
        // Set up connections
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Test initialize request
        const response = await agentConnection.initialize({
            protocolVersion: PROTOCOL_VERSION,
            clientCapabilities: {
                fs: {
                    readTextFile: false,
                    writeTextFile: false,
                },
            },
        });
        expect(response.protocolVersion).toBe(PROTOCOL_VERSION);
        expect(response.agentCapabilities?.loadSession).toBe(true);
        expect(response.authMethods).toHaveLength(1);
        expect(response.authMethods?.[0].id).toBe("oauth");
    });
    it("strips unknown properties on known incoming params", async () => {
        let receivedInitializeParams;
        let receivedSessionUpdate;
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(params) {
                receivedSessionUpdate = params;
            }
        }
        class TestAgent {
            async initialize(params) {
                receivedInitializeParams = params;
                return {
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async loadSession(_) {
                return {};
            }
            async authenticate(_) {
                // no-op
            }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) {
                // no-op
            }
        }
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        await agentConnection.initialize({
            protocolVersion: PROTOCOL_VERSION,
            clientCapabilities: {
                fs: {
                    readTextFile: false,
                    writeTextFile: false,
                    experimentalFs: true,
                },
                customCapability: {
                    enabled: true,
                },
            },
            extraTopLevel: "keep me",
        });
        await clientConnection.sessionUpdate({
            sessionId: "test-session",
            update: {
                sessionUpdate: "agent_message_chunk",
                content: {
                    type: "text",
                    text: "Hello from agent",
                },
                extraUpdateField: {
                    keep: true,
                },
            },
            extraNotificationField: "keep this too",
        });
        await vi.waitFor(() => {
            expect(receivedInitializeParams).not.toHaveProperty("extraTopLevel");
            expect(receivedInitializeParams).not.toHaveProperty("clientCapabilities.customCapability");
            expect(receivedInitializeParams).not.toHaveProperty("clientCapabilities.fs.experimentalFs");
            expect(receivedSessionUpdate).not.toHaveProperty("extraNotificationField");
            expect(receivedSessionUpdate).not.toHaveProperty("update.extraUpdateField");
        });
    });
    it("handles extension methods and notifications", async () => {
        const extensionLog = [];
        // Create client with extension method support
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_) {
                // no-op
            }
            async extMethod(method, params) {
                if (method === "example.com/ping") {
                    return { response: "pong", params };
                }
                throw new Error(`Unknown method: ${method}`);
            }
            async extNotification(method, _params) {
                extensionLog.push(`client extNotification: ${method}`);
            }
        }
        // Create agent with extension method support
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: { loadSession: false },
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) {
                // no-op
            }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) {
                // no-op
            }
            async extMethod(method, params) {
                if (method === "example.com/echo") {
                    return { echo: params };
                }
                throw new Error(`Unknown method: ${method}`);
            }
            async extNotification(method, _params) {
                extensionLog.push(`agent extNotification: ${method}`);
            }
        }
        // Set up connections
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Test agent calling client extension method
        const clientResponse = await clientConnection.request("example.com/ping", {
            data: "test",
        });
        expect(clientResponse).toEqual({
            response: "pong",
            params: { data: "test" },
        });
        // Test client calling agent extension method
        const agentResponse = await agentConnection.request("example.com/echo", {
            message: "hello",
        });
        expect(agentResponse).toEqual({ echo: { message: "hello" } });
        // Test extension notifications
        await clientConnection.notify("example.com/client/notify", {
            info: "client notification",
        });
        await agentConnection.notify("example.com/agent/notify", {
            info: "agent notification",
        });
        // Verify notifications were logged
        await vi.waitFor(() => {
            expect(extensionLog).toContain("client extNotification: example.com/client/notify");
            expect(extensionLog).toContain("agent extNotification: example.com/agent/notify");
        });
    });
    it("passes generated MCP routes without legacy typed handlers to extensions", async () => {
        const extensionLog = [];
        class TestClient {
            requestPermission() {
                return { outcome: { outcome: "cancelled" } };
            }
            sessionUpdate() { }
            extMethod(method, params) {
                extensionLog.push(`client request: ${method}`);
                return { side: "client", method, params };
            }
            extNotification(method) {
                extensionLog.push(`client notification: ${method}`);
            }
        }
        class TestAgent {
            initialize(params) {
                return {
                    protocolVersion: params.protocolVersion,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            newSession() {
                return { sessionId: "mcp-extension-session" };
            }
            authenticate() { }
            prompt() {
                return { stopReason: "end_turn" };
            }
            cancel() { }
            extMethod(method, params) {
                extensionLog.push(`agent request: ${method}`);
                return { side: "agent", method, params };
            }
            extNotification(method) {
                extensionLog.push(`agent notification: ${method}`);
            }
        }
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        await expect(agentConnection.request(AGENT_METHODS.mcp_message, {
            connectionId: "agent-mcp",
            message: { jsonrpc: "2.0", method: "ping" },
        })).resolves.toMatchObject({
            side: "agent",
            method: AGENT_METHODS.mcp_message,
        });
        await agentConnection.notify(AGENT_METHODS.mcp_message, {
            connectionId: "agent-mcp",
            message: { jsonrpc: "2.0", method: "notify" },
        });
        await expect(clientConnection.request(CLIENT_METHODS.mcp_connect, {
            acpId: "test-mcp-server",
        })).resolves.toMatchObject({
            side: "client",
            method: CLIENT_METHODS.mcp_connect,
        });
        await expect(clientConnection.request(CLIENT_METHODS.mcp_message, {
            connectionId: "client-mcp",
            message: { jsonrpc: "2.0", method: "ping" },
        })).resolves.toMatchObject({
            side: "client",
            method: CLIENT_METHODS.mcp_message,
        });
        await expect(clientConnection.request(CLIENT_METHODS.mcp_disconnect, {
            connectionId: "client-mcp",
        })).resolves.toMatchObject({
            side: "client",
            method: CLIENT_METHODS.mcp_disconnect,
        });
        await clientConnection.notify(CLIENT_METHODS.mcp_message, {
            connectionId: "client-mcp",
            message: { jsonrpc: "2.0", method: "notify" },
        });
        await vi.waitFor(() => {
            expect(extensionLog).toEqual([
                `agent request: ${AGENT_METHODS.mcp_message}`,
                `agent notification: ${AGENT_METHODS.mcp_message}`,
                `client request: ${CLIENT_METHODS.mcp_connect}`,
                `client request: ${CLIENT_METHODS.mcp_message}`,
                `client request: ${CLIENT_METHODS.mcp_disconnect}`,
                `client notification: ${CLIENT_METHODS.mcp_message}`,
            ]);
        });
    });
    it("handles optional extension methods correctly", async () => {
        // Create client WITHOUT extension methods
        class TestClientWithoutExtensions {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_) {
                // no-op
            }
        }
        // Create agent WITHOUT extension methods
        class TestAgentWithoutExtensions {
            async initialize(_) {
                return {
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: { loadSession: false },
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) {
                // no-op
            }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) {
                // no-op
            }
        }
        // Set up connections
        const agentConnection = new ClientSideConnection(() => new TestClientWithoutExtensions(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgentWithoutExtensions(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Test that calling extension methods on connections without them throws method not found
        try {
            await clientConnection.request("_example.com/ping", { data: "test" });
            expect.fail("Should have thrown method not found error");
        }
        catch (error) {
            expect(error.code).toBe(-32601); // Method not found
            expect(error.data.method).toBe("_example.com/ping");
        }
        try {
            await agentConnection.request("_example.com/echo", {
                message: "hello",
            });
            expect.fail("Should have thrown method not found error");
        }
        catch (error) {
            expect(error.code).toBe(-32601); // Method not found
            expect(error.data.method).toBe("_example.com/echo");
        }
        // Notifications should be ignored when not implemented (no error thrown)
        await clientConnection.notify("example.com/notify", {
            info: "test",
        });
        await agentConnection.notify("example.com/notify", {
            info: "test",
        });
    });
    it("resolves closed promise when stream ends", async () => {
        const closeLog = [];
        // Create simple client and agent
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_) {
                // no-op
            }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: { loadSession: false },
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) {
                // no-op
            }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) {
                // no-op
            }
        }
        // Set up connections
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Listen for close via signal
        agentConnection.signal.addEventListener("abort", () => {
            closeLog.push("agent connection closed (signal)");
        });
        clientConnection.signal.addEventListener("abort", () => {
            closeLog.push("client connection closed (signal)");
        });
        // Verify connections are not closed yet
        expect(agentConnection.signal.aborted).toBe(false);
        expect(clientConnection.signal.aborted).toBe(false);
        expect(closeLog).toHaveLength(0);
        // Close the streams by closing the writable ends
        await clientToAgent.writable.close();
        await agentToClient.writable.close();
        // Wait for closed promises to resolve
        await agentConnection.closed;
        await clientConnection.closed;
        // Verify connections are now closed
        expect(agentConnection.signal.aborted).toBe(true);
        expect(clientConnection.signal.aborted).toBe(true);
        expect(closeLog).toContain("agent connection closed (signal)");
        expect(closeLog).toContain("client connection closed (signal)");
    });
    it("rejects connectWith when the stream closes before the operation finishes", async () => {
        let readableController;
        const run = Connection.builder().connectWith({
            readable: new ReadableStream({
                start(controller) {
                    readableController = controller;
                },
            }),
            writable: new WritableStream(),
        }, async () => new Promise(() => { }));
        readableController.close();
        await expect(run).rejects.toThrow("ACP connection closed");
    });
    it("lets observer receive handlers pass messages through by default", async () => {
        const clientToServer = new TransformStream();
        const serverToClient = new TransformStream();
        const observed = [];
        const server = Connection.builder()
            .onReceiveMessage((message) => {
            observed.push(`${message.kind}:${message.method}`);
        })
            .onReceiveRequest("example/ping", (params) => params, async (request, responder) => {
            await responder.respond({ echoed: request.value });
        })
            .connect({
            readable: clientToServer.readable,
            writable: serverToClient.writable,
        });
        const client = Connection.builder().connect({
            readable: serverToClient.readable,
            writable: clientToServer.writable,
        });
        try {
            await expect(client.sendRequest("example/ping", { value: "hello" })).resolves.toEqual({ echoed: "hello" });
            expect(observed).toEqual(["request:example/ping"]);
        }
        finally {
            client.close();
            server.close();
            await Promise.all([client.closed, server.closed]);
        }
    });
    it("cancels the receive reader when connectWith closes", async () => {
        const { promise: canceled, resolve: resolveCanceled } = Promise.withResolvers();
        await expect(Connection.builder().connectWith({
            readable: new ReadableStream({
                cancel() {
                    resolveCanceled();
                },
            }),
            writable: new WritableStream(),
        }, () => "done")).resolves.toBe("done");
        await expect(canceled).resolves.toBeUndefined();
    });
    it("cancels newline-delimited JSON input when connectWith closes", async () => {
        const { promise: canceled, resolve: resolveCanceled } = Promise.withResolvers();
        const input = new ReadableStream({
            cancel(reason) {
                resolveCanceled(reason);
            },
        });
        await expect(Connection.builder().connectWith(ndJsonStream(new WritableStream(), input), () => "done")).resolves.toBe("done");
        const reason = await canceled;
        expect(reason).toBeInstanceOf(Error);
        expect(reason.message).toBe("ACP connection closed");
        await vi.waitFor(() => {
            const inputReader = input.getReader();
            inputReader.releaseLock();
        });
    });
    it("does not dispatch incoming messages after connectWith closes", async () => {
        const input = new TransformStream();
        const output = new TransformStream();
        const handled = [];
        await expect(Connection.builder()
            .onReceiveNotification("late/notification", (params) => params, (params) => {
            handled.push(params);
        })
            .connectWith({
            readable: input.readable,
            writable: output.writable,
        }, () => "done")).resolves.toBe("done");
        const writer = input.writable.getWriter();
        try {
            await writer.write({
                jsonrpc: "2.0",
                method: "late/notification",
                params: { afterClose: true },
            });
        }
        catch {
            // Closing the connection may cancel the readable side before the peer writes.
        }
        finally {
            writer.releaseLock();
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(handled).toEqual([]);
    });
    it("allows connectWith operations to return synchronously", async () => {
        const result = await Connection.builder().connectWith({
            readable: new ReadableStream(),
            writable: new WritableStream(),
        }, () => "done");
        expect(result).toBe("done");
    });
    it("rejects connectWith with the stream error while the operation is pending", async () => {
        let readableController;
        const run = Connection.builder().connectWith({
            readable: new ReadableStream({
                start(controller) {
                    readableController = controller;
                },
            }),
            writable: new WritableStream(),
        }, async () => new Promise(() => { }));
        readableController.error(new Error("stream exploded"));
        await expect(run).rejects.toThrow("stream exploded");
    });
    class MinimalTestClient {
        async writeTextFile(_) {
            return {};
        }
        async readTextFile(_) {
            return { content: "test" };
        }
        async requestPermission(_) {
            return {
                outcome: {
                    outcome: "selected",
                    optionId: "allow",
                },
            };
        }
        async sessionUpdate(_) {
            // no-op
        }
    }
    it("propagates input stream errors through ndJsonStream", async () => {
        const inputStream = new ReadableStream({
            start(controller) {
                // Simulate a process crash after partial data
                controller.error(new Error("process exited with code 1"));
            },
        });
        const outputStream = new WritableStream();
        const connection = new ClientSideConnection(() => new MinimalTestClient(), ndJsonStream(outputStream, inputStream));
        await expect(connection.closed).resolves.toBeUndefined();
        expect(connection.signal.aborted).toBe(true);
    });
    it("rejects pending requests when input stream errors via ndJsonStream", async () => {
        let errorController;
        const inputStream = new ReadableStream({
            start(controller) {
                errorController = controller;
            },
        });
        const outputStream = new WritableStream();
        const connection = new ClientSideConnection(() => new MinimalTestClient(), ndJsonStream(outputStream, inputStream));
        const requestPromise = connection.newSession({
            cwd: "/test",
            mcpServers: [],
        });
        errorController.error(new Error("process exited with code 1"));
        await expect(requestPromise).rejects.toThrow("process exited with code 1");
    });
    it("rejects pending requests when the stream errors", async () => {
        let readableController;
        const connection = new ClientSideConnection(() => new MinimalTestClient(), {
            readable: new ReadableStream({
                start(controller) {
                    readableController = controller;
                },
            }),
            writable: new WritableStream({
                async write() {
                    // no-op
                },
            }),
        });
        const requestPromise = connection.newSession({
            cwd: "/test",
            mcpServers: [],
        });
        const error = new Error("stream exploded");
        readableController.error(error);
        await expect(requestPromise).rejects.toThrow("stream exploded");
        await expect(connection.closed).resolves.toBeUndefined();
        expect(connection.signal.aborted).toBe(true);
    });
    it("rejects pending requests when the writable stream errors", async () => {
        const writeError = new Error("write failed");
        const connection = new ClientSideConnection(() => new MinimalTestClient(), {
            readable: new ReadableStream({
                // Never produces messages; stays open.
                start() { },
            }),
            writable: new WritableStream({
                async write() {
                    throw writeError;
                },
            }),
        });
        const requestPromise = connection.newSession({
            cwd: "/test",
            mcpServers: [],
        });
        await expect(requestPromise).rejects.toThrow("write failed");
        await expect(connection.closed).resolves.toBeUndefined();
        expect(connection.signal.aborted).toBe(true);
    });
    it("rejects notifications when the writable stream errors", async () => {
        const writeError = new Error("write failed");
        const connection = new ClientSideConnection(() => new MinimalTestClient(), {
            readable: new ReadableStream({
                // Never produces messages; stays open.
                start() { },
            }),
            writable: new WritableStream({
                async write() {
                    throw writeError;
                },
            }),
        });
        await expect(connection.cancel({ sessionId: "test-session" })).rejects.toThrow("write failed");
        await expect(connection.closed).resolves.toBeUndefined();
        expect(connection.signal.aborted).toBe(true);
    });
    it("rejects requests issued after the connection is closed", async () => {
        const connection = new ClientSideConnection(() => new MinimalTestClient(), {
            readable: new ReadableStream({
                start(controller) {
                    // Close the readable stream immediately so the connection closes.
                    controller.close();
                },
            }),
            writable: new WritableStream({
                async write() {
                    // no-op
                },
            }),
        });
        await connection.closed;
        expect(connection.signal.aborted).toBe(true);
        await expect(connection.newSession({ cwd: "/test", mcpServers: [] })).rejects.toThrow("ACP connection closed");
    });
    it("rejects requests issued after the connection closes with a falsy reason", async () => {
        const connection = new ClientSideConnection(() => new MinimalTestClient(), {
            readable: new ReadableStream({
                start(controller) {
                    controller.error(0);
                },
            }),
            writable: new WritableStream({
                async write() {
                    // no-op
                },
            }),
        });
        await connection.closed;
        expect(connection.signal.aborted).toBe(true);
        await expect(connection.newSession({ cwd: "/test", mcpServers: [] })).rejects.toBe(0);
    });
    it("supports removing signal event listeners", async () => {
        const closeLog = [];
        // Create simple client and agent
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "test" };
            }
            async requestPermission(_) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                };
            }
            async sessionUpdate(_) {
                // no-op
            }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: { loadSession: false },
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) {
                // no-op
            }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) {
                // no-op
            }
        }
        // Set up connections
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Register and then remove a listener
        const listener = () => {
            closeLog.push("this should not be called");
        };
        agentConnection.signal.addEventListener("abort", listener);
        agentConnection.signal.removeEventListener("abort", listener);
        // Register another listener that should be called
        agentConnection.signal.addEventListener("abort", () => {
            closeLog.push("agent connection closed");
        });
        // Close the streams
        await clientToAgent.writable.close();
        await agentToClient.writable.close();
        // Wait for closed promise
        await agentConnection.closed;
        // Verify only the non-removed listener was called
        expect(closeLog).toEqual(["agent connection closed"]);
        expect(closeLog).not.toContain("this should not be called");
    });
    it("handles methods returning response objects with _meta or void", async () => {
        // Create client that returns both response objects and void
        class TestClient {
            async writeTextFile(_params) {
                // Return response object with _meta
                return {
                    _meta: {
                        timestamp: new Date().toISOString(),
                        version: "1.0.0",
                    },
                };
            }
            async readTextFile(_params) {
                return {
                    content: "test content",
                    _meta: {
                        encoding: "utf-8",
                    },
                };
            }
            async requestPermission(_params) {
                return {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                    _meta: {
                        userId: "test-user",
                    },
                };
            }
            async sessionUpdate(_params) {
                // Returns void
            }
        }
        // Create agent that returns both response objects and void
        class TestAgent {
            async initialize(params) {
                return {
                    protocolVersion: params.protocolVersion,
                    agentCapabilities: { loadSession: true },
                    _meta: {
                        agentVersion: "2.0.0",
                    },
                };
            }
            async newSession(_params) {
                return {
                    sessionId: "test-session",
                    _meta: {
                        sessionType: "ephemeral",
                    },
                };
            }
            async loadSession(_params) {
                // Test returning minimal response
                return {};
            }
            async authenticate(params) {
                if (params.methodId === "none") {
                    // Test returning void
                    return;
                }
                // Test returning response with _meta
                return {
                    _meta: {
                        authenticated: true,
                        method: params.methodId,
                    },
                };
            }
            async prompt(_params) {
                return { stopReason: "end_turn" };
            }
            async cancel(_params) {
                // Returns void
            }
        }
        // Set up connections
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Test writeTextFile returns response with _meta
        const writeResponse = await clientConnection.writeTextFile({
            path: "/test.txt",
            content: "test",
            sessionId: "test-session",
        });
        expect(writeResponse).toEqual({
            _meta: {
                timestamp: expect.any(String),
                version: "1.0.0",
            },
        });
        // Test readTextFile returns response with content and _meta
        const readResponse = await clientConnection.readTextFile({
            path: "/test.txt",
            sessionId: "test-session",
        });
        expect(readResponse.content).toBe("test content");
        expect(readResponse._meta).toEqual({
            encoding: "utf-8",
        });
        // Test initialize with _meta
        const initResponse = await agentConnection.initialize({
            protocolVersion: PROTOCOL_VERSION,
            clientCapabilities: {},
        });
        expect(initResponse._meta).toEqual({
            agentVersion: "2.0.0",
        });
        // Test authenticate returning void
        const authResponseVoid = await agentConnection.authenticate({
            methodId: "none",
        });
        expect(authResponseVoid).toEqual({});
        // Test authenticate returning response with _meta
        const authResponse = await agentConnection.authenticate({
            methodId: "oauth",
        });
        expect(authResponse).toEqual({
            _meta: {
                authenticated: true,
                method: "oauth",
            },
        });
        // Test newSession with _meta
        const sessionResponse = await agentConnection.newSession({
            cwd: "/test",
            mcpServers: [],
        });
        expect(sessionResponse._meta).toEqual({
            sessionType: "ephemeral",
        });
        // Test loadSession returning minimal response
        const loadResponse = await agentConnection.loadSession({
            sessionId: "test-session",
            mcpServers: [],
            cwd: "/test",
        });
        expect(loadResponse).toEqual({});
    });
    it("handles NES request lifecycle", async () => {
        let receivedStartRequest;
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
            async unstable_startNes(params) {
                receivedStartRequest = params;
                return { sessionId: "nes-session-1" };
            }
            async unstable_suggestNes(_) {
                return {
                    suggestions: [
                        {
                            kind: "edit",
                            id: "sug-1",
                            uri: "file:///test.ts",
                            edits: [
                                {
                                    range: {
                                        start: { line: 0, character: 0 },
                                        end: { line: 0, character: 5 },
                                    },
                                    newText: "hello",
                                },
                            ],
                        },
                    ],
                };
            }
            async unstable_closeNes(_) {
                return {};
            }
        }
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        void clientConnection;
        const startResponse = await agentConnection.unstable_startNes({
            workspaceUri: "file:///workspace",
            workspaceFolders: [
                { uri: "file:///workspace/frontend", name: "frontend" },
                { uri: "file:///workspace/backend", name: "backend" },
            ],
            repository: {
                name: "my-repo",
                owner: "my-org",
                remoteUrl: "https://github.com/my-org/my-repo.git",
            },
        });
        expect(startResponse).toEqual({ sessionId: "nes-session-1" });
        expect(receivedStartRequest?.workspaceUri).toEqual("file:///workspace");
        expect(receivedStartRequest?.workspaceFolders).toEqual([
            { uri: "file:///workspace/frontend", name: "frontend" },
            { uri: "file:///workspace/backend", name: "backend" },
        ]);
        expect(receivedStartRequest?.repository).toEqual({
            name: "my-repo",
            owner: "my-org",
            remoteUrl: "https://github.com/my-org/my-repo.git",
        });
        const suggestResponse = await agentConnection.unstable_suggestNes({
            sessionId: "nes-session-1",
            position: { line: 0, character: 5 },
            triggerKind: "manual",
            uri: "file:///test.ts",
            version: 1,
        });
        expect(suggestResponse).toEqual({
            suggestions: [
                {
                    kind: "edit",
                    id: "sug-1",
                    uri: "file:///test.ts",
                    edits: [
                        {
                            range: {
                                start: { line: 0, character: 0 },
                                end: { line: 0, character: 5 },
                            },
                            newText: "hello",
                        },
                    ],
                },
            ],
        });
        const closeResponse = await agentConnection.unstable_closeNes({
            sessionId: "nes-session-1",
        });
        expect(closeResponse).toEqual({});
    });
    it("handles providers request lifecycle", async () => {
        let receivedSetRequest;
        let receivedDisableRequest;
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false, providers: {} },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
            async unstable_listProviders(_) {
                return {
                    providers: [
                        {
                            providerId: "main",
                            supported: ["anthropic", "openai"],
                            required: true,
                            current: {
                                apiType: "anthropic",
                                baseUrl: "https://api.anthropic.com",
                            },
                        },
                        {
                            providerId: "openai",
                            supported: ["openai"],
                            required: false,
                        },
                        {
                            providerId: "azure",
                            supported: ["azure"],
                            required: false,
                            current: null,
                        },
                    ],
                };
            }
            async unstable_setProvider(params) {
                receivedSetRequest = params;
            }
            async unstable_disableProvider(params) {
                receivedDisableRequest = params;
                return {};
            }
        }
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        void clientConnection;
        const listResponse = await agentConnection.unstable_listProviders({});
        expect(listResponse.providers).toEqual([
            {
                providerId: "main",
                supported: ["anthropic", "openai"],
                required: true,
                current: {
                    apiType: "anthropic",
                    baseUrl: "https://api.anthropic.com",
                },
            },
            {
                providerId: "openai",
                supported: ["openai"],
                required: false,
            },
            {
                providerId: "azure",
                supported: ["azure"],
                required: false,
                current: null,
            },
        ]);
        expect("current" in listResponse.providers[1]).toBe(false);
        const setResponse = await agentConnection.unstable_setProvider({
            providerId: "main",
            apiType: "openai",
            baseUrl: "https://llm-gateway.corp.example.com/openai/v1",
            headers: {
                Authorization: "Bearer token",
                "X-Request-Source": "test-client",
            },
        });
        expect(setResponse).toEqual({});
        expect(receivedSetRequest).toEqual({
            providerId: "main",
            apiType: "openai",
            baseUrl: "https://llm-gateway.corp.example.com/openai/v1",
            headers: {
                Authorization: "Bearer token",
                "X-Request-Source": "test-client",
            },
        });
        const disableResponse = await agentConnection.unstable_disableProvider({
            providerId: "openai",
        });
        expect(disableResponse).toEqual({});
        expect(receivedDisableRequest).toEqual({ providerId: "openai" });
    });
    it("rejects providers requests when agent does not implement handlers", async () => {
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
        }
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        void clientConnection;
        await expect(agentConnection.unstable_listProviders({})).rejects.toMatchObject({
            code: -32601,
            data: { method: "providers/list" },
        });
        await expect(agentConnection.unstable_setProvider({
            providerId: "main",
            apiType: "openai",
            baseUrl: "https://api.openai.com/v1",
        })).rejects.toMatchObject({
            code: -32601,
            data: { method: "providers/set" },
        });
        await expect(agentConnection.unstable_disableProvider({ providerId: "main" })).rejects.toMatchObject({
            code: -32601,
            data: { method: "providers/disable" },
        });
    });
    it("handles NES notifications", async () => {
        const notificationLog = [];
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
            async unstable_acceptNes(params) {
                notificationLog.push({ type: "acceptNes", params });
            }
            async unstable_rejectNes(params) {
                notificationLog.push({ type: "rejectNes", params });
            }
        }
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        void clientConnection;
        await agentConnection.unstable_acceptNes({
            sessionId: "nes-session-1",
            id: "sug-1",
        });
        await agentConnection.unstable_rejectNes({
            sessionId: "nes-session-1",
            id: "sug-2",
            reason: "rejected",
        });
        await vi.waitFor(() => {
            expect(notificationLog).toEqual([
                {
                    type: "acceptNes",
                    params: { sessionId: "nes-session-1", id: "sug-1" },
                },
                {
                    type: "rejectNes",
                    params: {
                        sessionId: "nes-session-1",
                        id: "sug-2",
                        reason: "rejected",
                    },
                },
            ]);
        });
    });
    it("handles document notifications", async () => {
        const notificationLog = [];
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
            async unstable_didOpenDocument(params) {
                notificationLog.push({ type: "didOpen", params });
            }
            async unstable_didChangeDocument(params) {
                notificationLog.push({ type: "didChange", params });
            }
            async unstable_didCloseDocument(params) {
                notificationLog.push({ type: "didClose", params });
            }
            async unstable_didSaveDocument(params) {
                notificationLog.push({ type: "didSave", params });
            }
            async unstable_didFocusDocument(params) {
                notificationLog.push({ type: "didFocus", params });
            }
        }
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        void clientConnection;
        await agentConnection.unstable_didOpenDocument({
            sessionId: "s1",
            uri: "file:///test.ts",
            languageId: "typescript",
            version: 1,
            text: "const x = 1;",
        });
        await agentConnection.unstable_didChangeDocument({
            sessionId: "s1",
            uri: "file:///test.ts",
            version: 2,
            contentChanges: [{ text: "const x = 2;" }],
        });
        await agentConnection.unstable_didSaveDocument({
            sessionId: "s1",
            uri: "file:///test.ts",
        });
        await agentConnection.unstable_didFocusDocument({
            sessionId: "s1",
            uri: "file:///test.ts",
            version: 2,
            position: { line: 0, character: 5 },
            visibleRange: {
                start: { line: 0, character: 0 },
                end: { line: 10, character: 0 },
            },
        });
        await agentConnection.unstable_didCloseDocument({
            sessionId: "s1",
            uri: "file:///test.ts",
        });
        await vi.waitFor(() => {
            expect(notificationLog).toEqual([
                {
                    type: "didOpen",
                    params: {
                        sessionId: "s1",
                        uri: "file:///test.ts",
                        languageId: "typescript",
                        version: 1,
                        text: "const x = 1;",
                    },
                },
                {
                    type: "didChange",
                    params: {
                        sessionId: "s1",
                        uri: "file:///test.ts",
                        version: 2,
                        contentChanges: [{ text: "const x = 2;" }],
                    },
                },
                {
                    type: "didSave",
                    params: {
                        sessionId: "s1",
                        uri: "file:///test.ts",
                    },
                },
                {
                    type: "didFocus",
                    params: {
                        sessionId: "s1",
                        uri: "file:///test.ts",
                        version: 2,
                        position: { line: 0, character: 5 },
                        visibleRange: {
                            start: { line: 0, character: 0 },
                            end: { line: 10, character: 0 },
                        },
                    },
                },
                {
                    type: "didClose",
                    params: {
                        sessionId: "s1",
                        uri: "file:///test.ts",
                    },
                },
            ]);
        });
    });
    it("propagates additionalDirectories on session lifecycle methods", async () => {
        let receivedNewSession;
        let receivedLoadSession;
        let receivedForkSession;
        let receivedResumeSession;
        let receivedListSessions;
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(params) {
                receivedNewSession = params;
                return { sessionId: "new-s1" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
            async loadSession(params) {
                receivedLoadSession = params;
                return {};
            }
            async unstable_forkSession(params) {
                receivedForkSession = params;
                return { sessionId: "forked-s1" };
            }
            async resumeSession(params) {
                receivedResumeSession = params;
                return {};
            }
            async listSessions(params) {
                receivedListSessions = params;
                return { sessions: [] };
            }
        }
        const agentConnection = new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        void clientConnection;
        const newSessionResponse = await agentConnection.newSession({
            cwd: "/test",
            mcpServers: [],
            additionalDirectories: ["/extra/root1", "/extra/root2"],
        });
        expect(newSessionResponse).toEqual({ sessionId: "new-s1" });
        expect(receivedNewSession?.additionalDirectories).toEqual([
            "/extra/root1",
            "/extra/root2",
        ]);
        const loadResponse = await agentConnection.loadSession({
            sessionId: "s1",
            cwd: "/test",
            mcpServers: [],
            additionalDirectories: ["/extra/root1", "/extra/root2"],
        });
        expect(loadResponse).toEqual({});
        expect(receivedLoadSession?.additionalDirectories).toEqual([
            "/extra/root1",
            "/extra/root2",
        ]);
        const forkResponse = await agentConnection.unstable_forkSession({
            sessionId: "s1",
            cwd: "/test",
            additionalDirectories: ["/extra/root1", "/extra/root2"],
        });
        expect(forkResponse).toEqual({ sessionId: "forked-s1" });
        expect(receivedForkSession?.additionalDirectories).toEqual([
            "/extra/root1",
            "/extra/root2",
        ]);
        const resumeResponse = await agentConnection.resumeSession({
            sessionId: "s1",
            cwd: "/test",
            additionalDirectories: ["/extra/root1", "/extra/root2"],
        });
        expect(resumeResponse).toEqual({});
        expect(receivedResumeSession?.additionalDirectories).toEqual([
            "/extra/root1",
            "/extra/root2",
        ]);
        const listResponse = await agentConnection.listSessions({});
        expect(listResponse).toEqual({ sessions: [] });
        expect(receivedListSessions).toEqual({});
    });
    it("handles elicitation request lifecycle", async () => {
        let receivedRequest;
        let receivedNotification;
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
            async createElicitation(params) {
                receivedRequest = params;
                return {
                    action: "accept",
                    content: { name: "Alice" },
                };
            }
            async completeElicitation(params) {
                receivedNotification = params;
            }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
        }
        new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        // Test form-mode elicitation request
        const response = await clientConnection.createElicitation({
            sessionId: "test-session",
            mode: "form",
            message: "Please enter your name",
            requestedSchema: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Your name" },
                },
            },
        });
        expect(response.action).toBe("accept");
        expect(receivedRequest?.message).toBe("Please enter your name");
        expect(receivedRequest?.sessionId).toBe("test-session");
        expect(receivedRequest?.mode).toBe("form");
        // Test url-mode elicitation request
        receivedRequest = undefined;
        const urlResponse = await clientConnection.createElicitation({
            sessionId: "test-session",
            mode: "url",
            message: "Please authenticate",
            elicitationId: "elic-url-1",
            url: "https://example.com/auth",
        });
        expect(urlResponse.action).toBe("accept");
        expect(receivedRequest?.message).toBe("Please authenticate");
        expect(receivedRequest?.mode).toBe("url");
        expect(receivedRequest?.url).toBe("https://example.com/auth");
        expect(receivedRequest?.elicitationId).toBe("elic-url-1");
        // Test elicitation complete notification
        await clientConnection.completeElicitation({
            elicitationId: "elic-1",
        });
        await vi.waitFor(() => {
            expect(receivedNotification?.elicitationId).toBe("elic-1");
        });
    });
    it("silently ignores completeElicitation when client does not implement handler", async () => {
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
        }
        new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        await clientConnection.completeElicitation({
            elicitationId: "elic-1",
        });
    });
    it("rejects elicitation request when client does not implement handler", async () => {
        // Client WITHOUT createElicitation
        class TestClient {
            async writeTextFile(_) {
                return {};
            }
            async readTextFile(_) {
                return { content: "" };
            }
            async requestPermission(_) {
                return { outcome: { outcome: "selected", optionId: "allow" } };
            }
            async sessionUpdate(_) { }
        }
        class TestAgent {
            async initialize(_) {
                return {
                    protocolVersion: 1,
                    agentCapabilities: { loadSession: false },
                    authMethods: [],
                };
            }
            async newSession(_) {
                return { sessionId: "test-session" };
            }
            async authenticate(_) { }
            async prompt(_) {
                return { stopReason: "end_turn" };
            }
            async cancel(_) { }
        }
        new ClientSideConnection(() => new TestClient(), ndJsonStream(clientToAgent.writable, agentToClient.readable));
        const clientConnection = new AgentSideConnection(() => new TestAgent(), ndJsonStream(agentToClient.writable, clientToAgent.readable));
        await expect(clientConnection.createElicitation({
            sessionId: "test-session",
            mode: "form",
            message: "Enter your name",
            requestedSchema: {
                type: "object",
                properties: {
                    name: { type: "string" },
                },
            },
        })).rejects.toMatchObject({ code: -32601 });
    });
});
describe("CreateElicitationRequest schema", () => {
    // These tests verify the post-processed zod schema correctly enforces
    // both the scope union (session vs request) and mode discriminator (form vs url).
    // If the generate.js patches stop applying, these will fail.
    const formSessionRequest = {
        sessionId: "sess-1",
        mode: "form",
        message: "Enter your name",
        requestedSchema: { type: "object", properties: {} },
    };
    it("accepts form-mode request scoped to a session", () => {
        const result = zCreateElicitationRequest.safeParse(formSessionRequest);
        expect(result.success).toBe(true);
    });
    it("accepts form-mode request with optional toolCallId", () => {
        const result = zCreateElicitationRequest.safeParse({
            ...formSessionRequest,
            toolCallId: "tc-1",
        });
        expect(result.success).toBe(true);
    });
    it("accepts form-mode request scoped to a request", () => {
        const result = zCreateElicitationRequest.safeParse({
            requestId: "req-1",
            mode: "form",
            message: "Enter your name",
            requestedSchema: { type: "object", properties: {} },
        });
        expect(result.success).toBe(true);
    });
    it("accepts url-mode request scoped to a session", () => {
        const result = zCreateElicitationRequest.safeParse({
            sessionId: "sess-1",
            mode: "url",
            message: "Please authenticate",
            elicitationId: "elic-1",
            url: "https://example.com/auth",
        });
        expect(result.success).toBe(true);
    });
    it("accepts url-mode request with optional toolCallId", () => {
        const result = zCreateElicitationRequest.safeParse({
            sessionId: "sess-1",
            toolCallId: "tc-1",
            mode: "url",
            message: "Please authenticate",
            elicitationId: "elic-1",
            url: "https://example.com/auth",
        });
        expect(result.success).toBe(true);
    });
    it("accepts url-mode request scoped to a request", () => {
        const result = zCreateElicitationRequest.safeParse({
            requestId: "req-1",
            mode: "url",
            message: "Please authenticate",
            elicitationId: "elic-1",
            url: "https://example.com/auth",
        });
        expect(result.success).toBe(true);
    });
    it("rejects request without mode", () => {
        const result = zCreateElicitationRequest.safeParse({
            sessionId: "sess-1",
            message: "Enter your name",
            requestedSchema: { type: "object", properties: {} },
        });
        expect(result.success).toBe(false);
    });
    it("accepts request with unknown mode for forward compatibility", () => {
        const result = zCreateElicitationRequest.safeParse({
            sessionId: "sess-1",
            mode: "_custom",
            message: "Enter your name",
        });
        expect(result.success).toBe(true);
    });
    it("rejects malformed form-mode request instead of classifying it as custom", () => {
        // The catch-all variant excludes known mode tags (the schema's `not`
        // clause, restored by excludeKnownTags), so a form request missing its
        // requestedSchema fails the union instead of parsing as a custom mode.
        const result = zCreateElicitationRequest.safeParse({
            sessionId: "sess-1",
            mode: "form",
            message: "Enter your name",
        });
        expect(result.success).toBe(false);
    });
    it("rejects request without message", () => {
        const result = zCreateElicitationRequest.safeParse({
            sessionId: "sess-1",
            mode: "form",
            requestedSchema: { type: "object", properties: {} },
        });
        expect(result.success).toBe(false);
    });
    it("rejects form-mode request without scope (no sessionId or requestId)", () => {
        const result = zCreateElicitationRequest.safeParse({
            mode: "form",
            message: "Enter your name",
            requestedSchema: { type: "object", properties: {} },
        });
        expect(result.success).toBe(false);
    });
    it("rejects url-mode request without scope (no sessionId or requestId)", () => {
        const result = zCreateElicitationRequest.safeParse({
            mode: "url",
            message: "Please authenticate",
            elicitationId: "elic-1",
            url: "https://example.com/auth",
        });
        expect(result.success).toBe(false);
    });
    it("strips unknown properties", () => {
        const result = zCreateElicitationRequest.safeParse({
            ...formSessionRequest,
            customField: "custom-value",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.customField).toBeUndefined();
        }
    });
    it("preserves a custom mode's vendor payload", () => {
        // Known variants strip unknown keys (above), but a custom variant's extra
        // properties are its payload (the schema's unevaluatedProperties: true)
        // and must survive parsing.
        const result = zCreateElicitationRequest.safeParse({
            sessionId: "sess-1",
            mode: "_vendorMode",
            message: "hi",
            vendorForm: { fields: ["a", "b"] },
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.vendorForm).toEqual({
                fields: ["a", "b"],
            });
        }
    });
    it("still salvages malformed lenient fields on custom modes", () => {
        // Regression: payload preservation must not fight defaultOnError salvage
        // in the scope union (previously threw from zod's intersection merge).
        const result = zCreateElicitationRequest.safeParse({
            sessionId: "sess-1",
            toolCallId: 123,
            mode: "_vendorMode",
            message: "hi",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.toolCallId).toBeUndefined();
        }
    });
});
describe("CreateElicitationResponse schema", () => {
    it("accepts accept action with content", () => {
        const result = zCreateElicitationResponse.safeParse({
            action: "accept",
            content: { name: "Alice" },
        });
        expect(result.success).toBe(true);
    });
    it("accepts decline action", () => {
        const result = zCreateElicitationResponse.safeParse({
            action: "decline",
        });
        expect(result.success).toBe(true);
    });
    it("accepts cancel action", () => {
        const result = zCreateElicitationResponse.safeParse({
            action: "cancel",
        });
        expect(result.success).toBe(true);
    });
    it("rejects response without action", () => {
        const result = zCreateElicitationResponse.safeParse({
            content: { name: "Alice" },
        });
        expect(result.success).toBe(false);
    });
    it("accepts response with unknown action for forward compatibility", () => {
        const result = zCreateElicitationResponse.safeParse({
            action: "_custom",
        });
        expect(result.success).toBe(true);
    });
    it("preserves a custom action's vendor payload", () => {
        // Custom variants allow arbitrary extra properties (the schema's
        // additionalProperties: true) — that's where the vendor payload lives, so
        // parsing must not strip it.
        const result = zCreateElicitationResponse.safeParse({
            action: "_vendor",
            vendorData: { x: 1 },
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.vendorData).toEqual({
                x: 1,
            });
        }
    });
    it("still salvages malformed lenient fields on custom actions", () => {
        // Regression: payload preservation must not fight the intersection's
        // defaultOnError salvage (zod's intersection merge throws if a member
        // re-attaches a raw value another member parsed differently).
        const result = zCreateElicitationResponse.safeParse({
            action: "_vendor",
            _meta: 5,
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data._meta).toBeUndefined();
        }
    });
});
describe("Schema deserialization compatibility", () => {
    it("preserves inferred types for required default-on-error fields", () => {
        const checks = [true, true, true, true, true, true, true, true, true];
        expect(checks.every(Boolean)).toBe(true);
    });
    it("defaults invalid optional values to undefined", () => {
        const response = zInitializeResponse.parse({
            protocolVersion: 1,
            agentInfo: "invalid",
        });
        expect(response.agentInfo).toBeUndefined();
    });
    it("keeps explicit schema defaults and skips invalid array items", () => {
        const response = zInitializeResponse.parse({
            protocolVersion: 1,
            authMethods: [
                { id: "agent-auth", name: "Agent auth" },
                { type: "terminal", id: "missing-name" },
            ],
        });
        expect(response.authMethods).toEqual([
            { id: "agent-auth", name: "Agent auth" },
        ]);
        expect(zInitializeResponse.parse({
            protocolVersion: 1,
            authMethods: "invalid",
        }).authMethods).toEqual([]);
    });
    it("keeps required default-on-error arrays required when missing", () => {
        expect(zPlan.safeParse({}).success).toBe(false);
        expect(zPlan.parse({ entries: "invalid" }).entries).toEqual([]);
        expect(zPlan.parse({
            entries: [
                { content: "done", priority: "high", status: "completed" },
                { content: "missing status", priority: "low" },
            ],
        }).entries).toEqual([{ content: "done", priority: "high", status: "completed" }]);
    });
    it("defaults optional non-null arrays to [] only for invalid present values", () => {
        expect(zClientCapabilities.parse({}).positionEncodings).toBeUndefined();
        expect(zClientCapabilities.parse({ positionEncodings: "invalid" })
            .positionEncodings).toEqual([]);
    });
    it("defaults optional nullable arrays to undefined for invalid present values", () => {
        expect(zAnnotations.parse({ audience: "invalid" }).audience).toBeUndefined();
        expect(zAnnotations.parse({ audience: ["user", "invalid", "assistant"] })
            .audience).toEqual(["user", "assistant"]);
    });
    it("skips invalid nested tool call content and locations", () => {
        const toolCall = zToolCall.parse({
            content: [
                { type: "content", content: { type: "text", text: "hello" } },
                { type: "terminal" },
            ],
            locations: [{ path: "/tmp/file.ts", line: 1 }, { path: 1 }],
            title: "Read file",
            toolCallId: "tool-call-1",
        });
        expect(toolCall.content).toEqual([
            { type: "content", content: { type: "text", text: "hello" } },
        ]);
        expect(toolCall.locations).toEqual([{ path: "/tmp/file.ts", line: 1 }]);
    });
});
describe("extensible union narrowing helpers", () => {
    // Generated by scripts/generate.js (guards.gen.ts). Extensible unions carry a
    // catch-all variant that TypeScript cannot narrow past, so these guards
    // validate the variant payload rather than just its discriminant tag. A
    // malformed known variant (right tag, wrong payload) matches no guard,
    // mirroring wire validation (excludeKnownTags), which rejects such values
    // instead of classifying them as custom.
    describe("CreateElicitationResponse", () => {
        it("narrows the accept variant and exposes typed content", () => {
            const response = {
                action: "accept",
                content: { name: "Ada" },
            };
            expect(CreateElicitationResponse.isAccept(response)).toBe(true);
            if (CreateElicitationResponse.isAccept(response)) {
                // Compile-time proof that narrowing works: were the catch-all still in
                // the union, `content` would be `unknown` and this assignment would fail.
                const content = response.content;
                expect(content).toEqual({ name: "Ada" });
            }
        });
        it("rejects a malformed accept payload (validates payload, not just the tag)", () => {
            // `action` is the accept tag, but `content` holds a value that is not an
            // ElicitationContentValue. A tag-only guard would wrongly accept this;
            // it is not a custom variant either (the tag is reserved by `accept`),
            // so no guard matches — the value is protocol-invalid.
            const malformed = {
                action: "accept",
                content: { bad: { nested: "object" } },
            };
            expect(CreateElicitationResponse.isAccept(malformed)).toBe(false);
            expect(CreateElicitationResponse.isCustom(malformed)).toBe(false);
            // Wire validation classifies it the same way: the catch-all excludes
            // known tags, so the malformed accept fails the whole union.
            expect(zCreateElicitationResponse.safeParse(malformed).success).toBe(false);
        });
        it("narrows decline and cancel", () => {
            const decline = { action: "decline" };
            const cancel = { action: "cancel" };
            expect(CreateElicitationResponse.isDecline(decline)).toBe(true);
            expect(CreateElicitationResponse.isCancel(decline)).toBe(false);
            expect(CreateElicitationResponse.isCancel(cancel)).toBe(true);
        });
        it("treats unknown/future actions as custom", () => {
            const custom = {
                action: "_vendorAction",
                extra: 1,
            };
            expect(CreateElicitationResponse.isAccept(custom)).toBe(false);
            expect(CreateElicitationResponse.isDecline(custom)).toBe(false);
            expect(CreateElicitationResponse.isCancel(custom)).toBe(false);
            expect(CreateElicitationResponse.isCustom(custom)).toBe(true);
        });
    });
    describe("CreateElicitationRequest", () => {
        it("narrows form and url modes and treats unknown modes as custom", () => {
            const form = {
                sessionId: "sess-1",
                mode: "form",
                message: "Enter your name",
                requestedSchema: { type: "object", properties: {} },
            };
            const custom = {
                sessionId: "sess-1",
                mode: "_vendorMode",
                message: "hi",
            };
            expect(CreateElicitationRequest.isForm(form)).toBe(true);
            expect(CreateElicitationRequest.isUrl(form)).toBe(false);
            expect(CreateElicitationRequest.isCustom(form)).toBe(false);
            expect(CreateElicitationRequest.isCustom(custom)).toBe(true);
        });
        it("requires def-level common properties, not just the variant payload", () => {
            // The predicate narrows to `& Pick<..., "message" | "_meta">`, so the
            // guard must validate required common properties like `message` too.
            const messageless = {
                sessionId: "sess-1",
                mode: "form",
                requestedSchema: { type: "object", properties: {} },
            };
            expect(CreateElicitationRequest.isForm(messageless)).toBe(false);
            expect(CreateElicitationRequest.isCustom(messageless)).toBe(false);
        });
        it("validates the catch-all's own payload, not just its unknown tag", () => {
            // The catch-all still requires a session or request scope; isCustom's
            // predicate narrows to that structure, so it must validate it. The cast
            // is deliberate: this value is not representable in the union.
            const scopeless = {
                mode: "_vendorMode",
                message: "hi",
            };
            expect(CreateElicitationRequest.isCustom(scopeless)).toBe(false);
        });
    });
    describe("ElicitationPropertySchema", () => {
        it("narrows by JSON Schema type and validates the payload", () => {
            const stringProp = { type: "string" };
            const arrayProp = {
                type: "array",
                items: { type: "string", enum: ["a", "b"] },
            };
            expect(ElicitationPropertySchema.isString(stringProp)).toBe(true);
            expect(ElicitationPropertySchema.isArray(stringProp)).toBe(false);
            expect(ElicitationPropertySchema.isArray(arrayProp)).toBe(true);
            const customProp = { type: "_vendor" };
            expect(ElicitationPropertySchema.isCustom(customProp)).toBe(true);
        });
    });
    describe("MultiSelectItems", () => {
        it("narrows string, titled, and custom variants", () => {
            const string = { type: "string", enum: ["a"] };
            const titled = {
                anyOf: [{ const: "a", title: "A" }],
            };
            const custom = { type: "_vendor" };
            expect(MultiSelectItems.isString(string)).toBe(true);
            expect(MultiSelectItems.isTitled(string)).toBe(false);
            expect(MultiSelectItems.isTitled(titled)).toBe(true);
            expect(MultiSelectItems.isCustom(custom)).toBe(true);
        });
        it("treats a custom-tagged value carrying titled-shaped keys as custom", () => {
            // TitledMultiSelectItems declares no `type` at all, and its zod schema
            // ignores unknown keys — so without the discriminant-absence check, a
            // custom-tagged value that happens to carry `anyOf` would be
            // misclassified as titled.
            const vendor = {
                type: "_vendor",
                anyOf: [{ const: "a", title: "A" }],
            };
            expect(MultiSelectItems.isTitled(vendor)).toBe(false);
            expect(MultiSelectItems.isCustom(vendor)).toBe(true);
        });
    });
    it("re-exports every generated guard namespace from the package entry", () => {
        // Safety net: guards must be listed explicitly in acp.ts (not `export *`) so
        // each value merges with its type. This fails if a new extensible union is
        // generated but its guard namespace is not re-exported.
        const guardNames = Object.keys(guards);
        expect(guardNames.length).toBeGreaterThan(0);
        for (const name of guardNames) {
            expect(sdk[name]).toBe(guards[name]);
        }
    });
});
//# sourceMappingURL=acp.test.js.map