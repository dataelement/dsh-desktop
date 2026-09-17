import { describe, expect, expectTypeOf, it } from "vitest";
import { agent as createV1AgentApp, methods as v1Methods } from "./acp.js";
import { AgentProtocolRouter } from "./protocol-router.js";
import { PROTOCOL_VERSION as V2_PROTOCOL_VERSION, agent as createV2AgentApp, methods as v2Methods, } from "./v2/acp.js";
describe("AgentProtocolRouter", () => {
    it("accepts both AgentApp generations as connectors", () => {
        expectTypeOf().toMatchTypeOf();
        expectTypeOf().toMatchTypeOf();
    });
    it("routes v1 and v2 clients to separate implementations", async () => {
        const v1 = new MockAgentConnector();
        const v2 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV1(v1).withV2(v2);
        const first = await openRoutedConnection(router, initializeRequest(1, {
            clientCapabilities: {},
            clientInfo: implementation("v1-client"),
        }));
        expect(await v1.nextMessage()).toMatchObject({
            method: "initialize",
            params: { protocolVersion: 1 },
        });
        expect(v2.connectionCount).toBe(0);
        expect(v1.connectOptions).toEqual([{ deferConnectHandlers: true }]);
        expect(v1.connectHandlersStarted).toBe(1);
        await first.close();
        const second = await openRoutedConnection(router, initializeRequest(2, {
            info: implementation("v2-client"),
            capabilities: {},
        }));
        expect(await v2.nextMessage()).toMatchObject({
            method: "initialize",
            params: { protocolVersion: 2 },
        });
        expect(v2.connectionCount).toBe(1);
        await second.close();
    });
    it("routes a future protocol version to v2 and normalizes initialize", async () => {
        const v1 = new MockAgentConnector();
        const v2 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV1(v1).withV2(v2);
        const connection = await openRoutedConnection(router, initializeRequest(3, {
            info: implementation("future-client"),
            capabilities: {},
        }));
        expect(await v2.nextMessage()).toEqual(initializeRequest(2, {
            info: implementation("future-client"),
            capabilities: {},
        }));
        expect(v1.connectionCount).toBe(0);
        await connection.close();
    });
    it("downgrades v2 initialize metadata and capabilities for a v1 agent", async () => {
        const v1 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV1(v1);
        const connection = await openRoutedConnection(router, initializeRequest(2, {
            info: {
                ...implementation("v2-client"),
                title: "V2 Client",
                _meta: { implementation: true },
                ignored: true,
            },
            capabilities: {
                auth: { terminal: {}, _meta: { auth: true } },
                elicitation: { form: {}, url: { _meta: { url: true } } },
                nes: { jump: {}, searchAndReplace: {} },
                positionEncodings: ["invalid", "utf-8"],
                _meta: { capabilities: true },
            },
            _meta: { initialize: true },
            ignored: true,
        }));
        expect(await v1.nextMessage()).toEqual(initializeRequest(1, {
            clientCapabilities: {
                fs: { readTextFile: false, writeTextFile: false },
                terminal: false,
                session: { configOptions: { boolean: {} } },
                plan: {},
                auth: { terminal: true, _meta: { auth: true } },
                elicitation: { form: {}, url: { _meta: { url: true } } },
                nes: { jump: {}, searchAndReplace: {} },
                positionEncodings: ["utf-8"],
                _meta: { capabilities: true },
            },
            clientInfo: {
                ...implementation("v2-client"),
                title: "V2 Client",
                _meta: { implementation: true },
            },
            _meta: { initialize: true },
        }));
        await connection.close();
    });
    it("forwards every wire item after initialize without conversion", async () => {
        const v1 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV1(v1);
        const connection = await openRoutedConnection(router, initializeRequest(2, {
            info: implementation("v2-client"),
            capabilities: {},
        }));
        await v1.nextMessage();
        const later = [
            {
                jsonrpc: "2.0",
                id: 2,
                method: "session/new",
                params: { cwd: "/workspace", v2Only: true },
            },
            {
                jsonrpc: "2.0",
                method: "_vendor/notification",
                params: { unchanged: true },
            },
        ];
        await connection.write(later);
        expect(await v1.nextMessage()).toBe(later);
        await connection.close();
    });
    it.each([
        [undefined, "missing"],
        [1.5, "fractional"],
        [-1, "negative"],
        [65_536, "larger than uint16"],
        ["2", "string"],
    ])("rejects a %s protocol version (%s)", async (version, _description) => {
        const v1 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV1(v1);
        const { response, closed } = await rejectedConnection(router, initializeRequest(version, { clientCapabilities: {} }));
        expect(response).toMatchObject({
            id: 1,
            error: {
                code: -32602,
                data: "initialize.protocolVersion must be a valid ACP protocol version",
            },
        });
        expect(v1.connectionCount).toBe(0);
        await closed;
    });
    it("rejects an unsupported version with the initialize request id", async () => {
        const v2 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV2(v2);
        const { response, closed } = await rejectedConnection(router, initializeRequest(1, { clientCapabilities: {} }, "initialize-id"));
        expect(response).toMatchObject({
            id: "initialize-id",
            error: {
                code: -32600,
                data: expect.stringContaining("supports ACP protocol version 2"),
            },
        });
        expect(v2.connectionCount).toBe(0);
        await closed;
    });
    it("retains array framing when rejecting a batched initialize", async () => {
        const v2 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV2(v2);
        const [clientStream, agentStream] = memoryStreamPair();
        const lifecycle = router.connect(agentStream);
        const writer = clientStream.writable.getWriter();
        const reader = clientStream.readable.getReader();
        await writer.write([
            initializeRequest(1, { clientCapabilities: {} }, "initialize-id"),
        ]);
        writer.releaseLock();
        await expect(reader.read()).resolves.toMatchObject({
            done: false,
            value: [
                {
                    jsonrpc: "2.0",
                    id: "initialize-id",
                    error: {
                        code: -32600,
                        data: expect.stringContaining("supports ACP protocol version 2"),
                    },
                },
            ],
        });
        await expect(reader.read()).resolves.toEqual({
            done: true,
            value: undefined,
        });
        reader.releaseLock();
        expect(v2.connectionCount).toBe(0);
        await lifecycle.closed;
    });
    it("rejects a non-initialize first request and flushes the error", async () => {
        const v1 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV1(v1);
        const { response, next, closed } = await rejectedConnection(router, {
            jsonrpc: "2.0",
            id: 41,
            method: "session/new",
            params: { cwd: "/workspace" },
        });
        expect(response).toMatchObject({
            id: 41,
            error: {
                code: -32600,
                data: "first ACP request must be initialize",
            },
        });
        await expect(next).resolves.toEqual({ done: true, value: undefined });
        await closed;
    });
    it.each([
        [
            "notification",
            {
                jsonrpc: "2.0",
                method: "_vendor/notification",
                params: { value: true },
            },
        ],
        ["response", { jsonrpc: "2.0", id: 41, result: {} }],
        ["malformed response", { jsonrpc: "2.0", id: 41, error: null }],
        [
            "response batch with a malformed primitive",
            [{ jsonrpc: "2.0", id: 41, result: {} }, 17],
        ],
        [
            "mixed notification and response batch",
            [
                {
                    jsonrpc: "2.0",
                    method: "_vendor/notification",
                    params: { value: true },
                },
                { jsonrpc: "2.0", id: 41, result: {} },
            ],
        ],
        [
            "notification-only batch",
            [
                {
                    jsonrpc: "2.0",
                    method: "_vendor/notification",
                    params: { value: 1 },
                },
                {
                    jsonrpc: "2.0",
                    method: "_vendor/notification",
                    params: { value: 2 },
                },
            ],
        ],
    ])("does not respond to a first %s", async (_kind, message) => {
        const v1 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV1(v1);
        const [clientStream, agentStream] = memoryStreamPair();
        const lifecycle = router.connect(agentStream);
        const writer = clientStream.writable.getWriter();
        const reader = clientStream.readable.getReader();
        await writer.write(message);
        writer.releaseLock();
        await expect(reader.read()).resolves.toEqual({
            done: true,
            value: undefined,
        });
        reader.releaseLock();
        expect(v1.connectionCount).toBe(0);
        await lifecycle.closed;
    });
    it("routes a single-entry v2 initialize batch with array response framing", async () => {
        const v2 = createV2AgentApp().onRequest(v2Methods.agent.initialize, () => ({
            protocolVersion: V2_PROTOCOL_VERSION,
            info: implementation("v2-agent"),
        }));
        const router = new AgentProtocolRouter().withV2(v2);
        const batch = [
            initializeRequest(V2_PROTOCOL_VERSION, {
                info: implementation("v2-client"),
                capabilities: {},
            }),
        ];
        const response = await routedFirstResponse(router, batch);
        expect(response).toEqual([
            expect.objectContaining({
                jsonrpc: "2.0",
                id: 1,
                result: expect.objectContaining({
                    protocolVersion: V2_PROTOCOL_VERSION,
                    info: implementation("v2-agent"),
                }),
            }),
        ]);
    });
    it("unwraps a v2 initialize batch for v1 downgrade and reframes the response", async () => {
        let receivedVersion;
        const v1 = createV1AgentApp().onRequest(v1Methods.agent.initialize, ({ params }) => {
            receivedVersion = params.protocolVersion;
            return {
                protocolVersion: params.protocolVersion,
                agentCapabilities: { loadSession: false },
                authMethods: [],
            };
        });
        const router = new AgentProtocolRouter().withV1(v1);
        const batch = [
            initializeRequest(V2_PROTOCOL_VERSION, {
                info: implementation("v2-client"),
                capabilities: {},
            }),
        ];
        const response = await routedFirstResponse(router, batch);
        expect(receivedVersion).toBe(1);
        expect(response).toEqual([
            expect.objectContaining({
                jsonrpc: "2.0",
                id: 1,
                result: expect.objectContaining({ protocolVersion: 1 }),
            }),
        ]);
    });
    it("rejects an ambiguous malformed first batch", async () => {
        const v1 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV1(v1);
        const batch = [
            { jsonrpc: "2.0", id: 1 },
            { jsonrpc: "2.0", id: 2 },
        ];
        const { response, closed } = await rejectedConnection(router, batch);
        expect(response).toMatchObject({
            id: null,
            error: {
                code: -32600,
                data: "first ACP message must be an initialize request",
            },
        });
        expect(v1.connectionCount).toBe(0);
        await closed;
    });
    it("defers and starts the selected app's connect handlers exactly once", async () => {
        const v2 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV2(v2);
        const [clientStream, agentStream] = memoryStreamPair();
        const connection = router.connect(agentStream, {
            deferConnectHandlers: true,
        });
        const writer = clientStream.writable.getWriter();
        await writer.write(initializeRequest(2, {
            info: implementation("v2-client"),
            capabilities: {},
        }));
        await v2.nextMessage();
        expect(v2.connectHandlersStarted).toBe(0);
        connection.startConnectHandlers?.();
        connection.startConnectHandlers?.();
        expect(v2.connectHandlersStarted).toBe(1);
        await writer.close();
        writer.releaseLock();
        await connection.closed;
    });
    it("rejects unrepresentable v2 initialize capability metadata", async () => {
        const v1 = new MockAgentConnector();
        const router = new AgentProtocolRouter().withV1(v1);
        const { response, closed } = await rejectedConnection(router, initializeRequest(2, {
            info: implementation("v2-client"),
            capabilities: {
                auth: { terminal: { _meta: { cannotConvert: true } } },
            },
        }));
        expect(response).toMatchObject({
            id: 1,
            error: {
                code: -32602,
                data: expect.stringContaining("cannot be represented in v1"),
            },
        });
        expect(v1.connectionCount).toBe(0);
        await closed;
    });
    it("cancels and releases the input when connector setup throws", async () => {
        const connectError = new Error("connector setup failed");
        const router = new AgentProtocolRouter().withV1({
            connect() {
                throw connectError;
            },
        });
        let cancelReason;
        const readable = new ReadableStream({
            start(controller) {
                controller.enqueue(initializeRequest(1, {
                    clientCapabilities: {},
                    clientInfo: implementation("v1-client"),
                }));
            },
            cancel(reason) {
                cancelReason = reason;
            },
        });
        const lifecycle = router.connect({
            readable,
            writable: new WritableStream(),
        });
        await lifecycle.closed;
        expect(cancelReason).toBe(connectError);
        expect(readable.locked).toBe(false);
    });
    it("finishes the lifecycle when aborting the output fails", async () => {
        const routeError = new Error("input failed");
        const abortError = new Error("output abort failed");
        let abortReason;
        const readable = new ReadableStream({
            start(controller) {
                controller.error(routeError);
            },
        });
        const writable = new WritableStream({
            abort(reason) {
                abortReason = reason;
                throw abortError;
            },
        });
        const lifecycle = new AgentProtocolRouter().connect({ readable, writable });
        await expect(Promise.race([
            lifecycle.closed,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error("lifecycle remained open")), 100);
            }),
        ])).resolves.toBeUndefined();
        expect(abortReason).toBe(routeError);
        expect(readable.locked).toBe(false);
    });
});
class MockAgentConnector {
    connectOptions = [];
    connectionCount = 0;
    connectHandlersStarted = 0;
    messages = [];
    waiters = [];
    connect(stream, options) {
        this.connectionCount += 1;
        this.connectOptions.push(options);
        const closed = this.read(stream.readable);
        return {
            closed,
            startConnectHandlers: () => {
                this.connectHandlersStarted += 1;
            },
        };
    }
    nextMessage() {
        const message = this.messages.shift();
        if (message !== undefined) {
            return Promise.resolve(message);
        }
        return new Promise((resolve) => this.waiters.push(resolve));
    }
    async read(readable) {
        for await (const message of readable) {
            const waiter = this.waiters.shift();
            if (waiter) {
                waiter(message);
            }
            else {
                this.messages.push(message);
            }
        }
    }
}
function initializeRequest(protocolVersion, params, id = 1) {
    return {
        jsonrpc: "2.0",
        id,
        method: "initialize",
        params: { protocolVersion, ...params },
    };
}
function implementation(name) {
    return { name, version: "1.0.0" };
}
async function openRoutedConnection(router, first) {
    const [clientStream, agentStream] = memoryStreamPair();
    const lifecycle = router.connect(agentStream);
    const writer = clientStream.writable.getWriter();
    await writer.write(first);
    return {
        write: (message) => writer.write(message),
        async close() {
            await writer.close();
            writer.releaseLock();
            await lifecycle.closed;
        },
    };
}
async function rejectedConnection(router, first) {
    const [clientStream, agentStream] = memoryStreamPair();
    const lifecycle = router.connect(agentStream);
    const writer = clientStream.writable.getWriter();
    const reader = clientStream.readable.getReader();
    await writer.write(first);
    writer.releaseLock();
    const response = await reader.read();
    if (response.done || Array.isArray(response.value)) {
        throw new Error("expected an individual JSON-RPC error response");
    }
    return {
        response: response.value,
        next: reader.read(),
        closed: lifecycle.closed ?? Promise.resolve(),
    };
}
async function routedFirstResponse(router, first) {
    const [clientStream, agentStream] = memoryStreamPair();
    const lifecycle = router.connect(agentStream);
    const writer = clientStream.writable.getWriter();
    const reader = clientStream.readable.getReader();
    try {
        await writer.write(first);
        const response = await reader.read();
        if (response.done) {
            throw new Error("expected an initialize response");
        }
        return response.value;
    }
    finally {
        reader.releaseLock();
        await writer.close();
        writer.releaseLock();
        await lifecycle.closed;
    }
}
function memoryStreamPair() {
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
//# sourceMappingURL=protocol-router.test.js.map