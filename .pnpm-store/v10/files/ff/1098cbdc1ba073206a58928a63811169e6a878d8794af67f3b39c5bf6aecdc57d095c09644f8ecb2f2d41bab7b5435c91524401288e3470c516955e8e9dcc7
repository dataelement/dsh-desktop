import { describe, expect, it, vi } from "vitest";
import { ClientSideConnection, PROTOCOL_VERSION, agent as createAgentApp, client as createClientApp, methods, } from "./acp.js";
import { MemoryAcpCookieStore, createHttpStream } from "./http-stream.js";
import { EVENT_STREAM_MIME_TYPE, HEADER_CONNECTION_ID, HEADER_SESSION_ID, JSON_MIME_TYPE, } from "./protocol.js";
import { serializeSseEvent } from "./sse.js";
import { createTestAgentApp } from "./test-support/test-agent.js";
import { startTestServer } from "./test-support/test-http-server.js";
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
const sessionNewResponse = {
    jsonrpc: "2.0",
    id: 1,
    result: {
        sessionId: "session-1",
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
const promptRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "session/prompt",
    params: {
        sessionId: "session-1",
        prompt: [{ type: "text", text: "Hello" }],
    },
};
const loadSessionRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "session/load",
    params: {
        cwd: "/tmp",
        mcpServers: [],
        sessionId: "existing-session",
    },
};
const permissionRequest = {
    jsonrpc: "2.0",
    id: 99,
    method: "session/request_permission",
    params: {
        sessionId: "session-1",
        toolCall: {
            toolCallId: "permission-tool",
            title: "Permission tool",
        },
        options: [
            {
                kind: "allow_once",
                name: "Allow once",
                optionId: "allow",
            },
        ],
    },
};
const permissionResponse = {
    jsonrpc: "2.0",
    id: 99,
    result: {
        outcome: {
            outcome: "selected",
            optionId: "allow",
        },
    },
};
const connectionScopedServerRequest = {
    jsonrpc: "2.0",
    id: 99,
    method: "connection/example",
    params: {},
};
describe("createHttpStream", () => {
    it("posts initialize with custom headers, opens connection SSE, and emits the initialize response", async () => {
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
            headers: {
                Authorization: "Bearer token",
                "X-Test-Header": "phase-5",
            },
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            expect(await readMessage(reader)).toEqual(initializeResponse);
            expect(controlledFetch.requests).toHaveLength(2);
            const initializePost = requestAt(controlledFetch.requests, 0);
            expect(initializePost.url).toBe("https://agent.example/acp");
            expect(initializePost.method).toBe("POST");
            expect(initializePost.headers.get("Authorization")).toBe("Bearer token");
            expect(initializePost.headers.get("X-Test-Header")).toBe("phase-5");
            expect(initializePost.headers.get("Content-Type")).toBe(JSON_MIME_TYPE);
            expect(initializePost.headers.get(HEADER_CONNECTION_ID)).toBeNull();
            expect(JSON.parse(initializePost.body)).toEqual(initializeRequest);
            const connectionGet = requestAt(controlledFetch.requests, 1);
            expect(connectionGet.method).toBe("GET");
            expect(connectionGet.headers.get("Authorization")).toBe("Bearer token");
            expect(connectionGet.headers.get("Accept")).toBe(EVENT_STREAM_MIME_TYPE);
            expect(connectionGet.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(connectionGet.headers.get(HEADER_SESSION_ID)).toBeNull();
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await stream.writable.close();
        }
    });
    it("errors and clears local resources when initialize POST fails", async () => {
        const clearSpy = vi.spyOn(MemoryAcpCookieStore.prototype, "clear");
        const controlledFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
            initializeStatus: 401,
            initializeBody: "expired",
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await expect(writer.write(initializeRequest)).rejects.toThrow("ACP initialize failed: 401");
            expect(controlledFetch.requests).toHaveLength(1);
            await flushMicrotasks();
            expect(clearSpy).toHaveBeenCalledTimes(1);
            await expect(reader.read()).rejects.toThrow("ACP initialize failed");
        }
        finally {
            clearSpy.mockRestore();
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("aborts and deletes late initialize connections when canceled during initialize POST", async () => {
        const clearSpy = vi.spyOn(MemoryAcpCookieStore.prototype, "clear");
        const initializeResponseDeferred = createDeferred();
        const requests = [];
        const fetch = async (_input, init) => {
            const method = init?.method ?? "GET";
            const headers = new Headers(init?.headers);
            requests.push({
                method,
                headers,
                signal: init?.signal,
            });
            if (method === "POST" && !headers.has(HEADER_CONNECTION_ID)) {
                return await initializeResponseDeferred.promise;
            }
            if (method === "DELETE") {
                return new Response(null, { status: 202 });
            }
            throw new Error(`Unexpected ${method} request`);
        };
        const stream = createHttpStream("https://agent.example/acp", { fetch });
        const writer = stream.writable.getWriter();
        try {
            const write = writer.write(initializeRequest);
            await flushMicrotasks();
            expect(requests).toHaveLength(1);
            expect(requests[0].signal?.aborted).toBe(false);
            stream.readable.cancel().catch(() => undefined);
            await flushMicrotasks();
            expect(requests[0].signal?.aborted).toBe(true);
            initializeResponseDeferred.resolve(jsonResponse(initializeResponse, 200, {
                [HEADER_CONNECTION_ID]: "connection-1",
                ...setCookieResponseHeaders(["transport=alpha; Path=/"]),
            }));
            await expect(write).rejects.toThrow("ACP HTTP stream is closed");
            expect(requests).toHaveLength(2);
            expect(requests[1].method).toBe("DELETE");
            expect(requests[1].headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(requests[1].headers.get("Cookie")).toBe("transport=alpha");
            expect(clearSpy).toHaveBeenCalledTimes(2);
        }
        finally {
            clearSpy.mockRestore();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("deletes the initialized connection when the initialize body is not a response", async () => {
        const clearSpy = vi.spyOn(MemoryAcpCookieStore.prototype, "clear");
        const controlledFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
            initializeResponse: {
                jsonrpc: "2.0",
                id: 0,
                method: "session/new",
                params: {},
            },
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await expect(writer.write(initializeRequest)).rejects.toThrow("ACP initialize response was not a JSON-RPC response");
            const deleteRequest = requestAt(controlledFetch.requests, 1);
            expect(deleteRequest.method).toBe("DELETE");
            expect(deleteRequest.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(deleteRequest.headers.get("Cookie")).toBe("transport=alpha");
            expect(controlledFetch.sseRequests).toHaveLength(0);
            await flushMicrotasks();
            expect(clearSpy).toHaveBeenCalledTimes(1);
            await expect(reader.read()).rejects.toThrow("ACP initialize response was not a JSON-RPC response");
        }
        finally {
            clearSpy.mockRestore();
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("deletes the initialized connection when the initialize response id does not match", async () => {
        const clearSpy = vi.spyOn(MemoryAcpCookieStore.prototype, "clear");
        const controlledFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
            initializeResponse: {
                ...initializeResponse,
                id: 999,
            },
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await expect(writer.write(initializeRequest)).rejects.toThrow("ACP initialize response id did not match initialize request");
            const deleteRequest = requestAt(controlledFetch.requests, 1);
            expect(deleteRequest.method).toBe("DELETE");
            expect(deleteRequest.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(deleteRequest.headers.get("Cookie")).toBe("transport=alpha");
            expect(controlledFetch.sseRequests).toHaveLength(0);
            await flushMicrotasks();
            expect(clearSpy).toHaveBeenCalledTimes(1);
            await expect(reader.read()).rejects.toThrow("ACP initialize response id did not match initialize request");
        }
        finally {
            clearSpy.mockRestore();
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("opens session SSE after session creation and includes the session header on session-scoped POSTs", async () => {
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await controlledFetch.sendSse(0, sessionNewResponse);
            expect(await readMessage(reader)).toEqual(sessionNewResponse);
            expect(controlledFetch.requests).toHaveLength(3);
            const sessionGet = requestAt(controlledFetch.requests, 2);
            expect(sessionGet.method).toBe("GET");
            expect(sessionGet.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(sessionGet.headers.get(HEADER_SESSION_ID)).toBe("session-1");
            await writer.write(promptRequest);
            const promptPost = requestAt(controlledFetch.requests, 3);
            expect(promptPost.method).toBe("POST");
            expect(promptPost.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(promptPost.headers.get(HEADER_SESSION_ID)).toBe("session-1");
            expect(JSON.parse(promptPost.body)).toEqual(promptRequest);
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await stream.writable.close();
        }
    });
    it("rejects JSON-RPC batches received over SSE before dispatch", async () => {
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await controlledFetch.sendSse(0, sessionNewResponse);
            await readMessage(reader);
            await controlledFetch.sendSse(1, [
                permissionRequest,
            ]);
            await expect(reader.read()).rejects.toThrow("ACP HTTP transport does not support JSON-RPC batch messages");
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("rejects outbound JSON-RPC batches before POSTing them", async () => {
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await expect(writer.write([sessionNewRequest])).rejects.toThrow("ACP HTTP transport does not support JSON-RPC batch messages");
            expect(controlledFetch.requests).toHaveLength(2);
        }
        finally {
            await reader.cancel().catch(() => undefined);
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("errors the stream when the connection SSE closes cleanly", async () => {
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await controlledFetch.closeSse(0);
            await expect(reader.read()).rejects.toThrow("ACP connection SSE stream closed");
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("waits for a reopened session SSE before posting session-scoped messages", async () => {
        const reopenedSessionSseResponse = createDeferred();
        const controlledFetch = createControlledFetch({
            sseResponseDelays: new Map([[2, reopenedSessionSseResponse.promise]]),
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await controlledFetch.sendSse(0, sessionNewResponse);
            await readMessage(reader);
            await controlledFetch.closeSse(1);
            await flushMicrotasks();
            const promptWrite = writer.write(promptRequest);
            await flushMicrotasks();
            const reopenedSessionGet = requestAt(controlledFetch.requests, 3);
            expect(reopenedSessionGet.method).toBe("GET");
            expect(reopenedSessionGet.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(reopenedSessionGet.headers.get(HEADER_SESSION_ID)).toBe("session-1");
            expect(controlledFetch.requests).toHaveLength(4);
            reopenedSessionSseResponse.resolve();
            await promptWrite;
            const promptPost = requestAt(controlledFetch.requests, 4);
            expect(promptPost.method).toBe("POST");
            expect(promptPost.headers.get(HEADER_SESSION_ID)).toBe("session-1");
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("errors the stream when a session SSE closes with a pending request", async () => {
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await controlledFetch.sendSse(0, sessionNewResponse);
            await readMessage(reader);
            await writer.write(promptRequest);
            await controlledFetch.closeSse(1);
            await expect(reader.read()).rejects.toThrow("ACP session SSE stream closed");
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("opens session SSE before posting session/load for an existing session", async () => {
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await writer.write(loadSessionRequest);
            const sessionGet = requestAt(controlledFetch.requests, 2);
            const loadPost = requestAt(controlledFetch.requests, 3);
            expect(sessionGet.method).toBe("GET");
            expect(sessionGet.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(sessionGet.headers.get(HEADER_SESSION_ID)).toBe("existing-session");
            expect(loadPost.method).toBe("POST");
            expect(loadPost.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(loadPost.headers.get(HEADER_SESSION_ID)).toBe("existing-session");
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await stream.writable.close();
        }
    });
    it("includes the session header only on responses to session-scoped server requests", async () => {
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await controlledFetch.sendSse(0, sessionNewResponse);
            await readMessage(reader);
            await controlledFetch.sendSse(1, permissionRequest);
            await readMessage(reader);
            await writer.write(permissionResponse);
            const responsePost = requestAt(controlledFetch.requests, 3);
            expect(responsePost.method).toBe("POST");
            expect(responsePost.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(responsePost.headers.get(HEADER_SESSION_ID)).toBe("session-1");
            expect(JSON.parse(responsePost.body)).toEqual(permissionResponse);
            await controlledFetch.sendSse(0, connectionScopedServerRequest);
            await readMessage(reader);
            await writer.write(permissionResponse);
            const connectionResponsePost = requestAt(controlledFetch.requests, 4);
            expect(connectionResponsePost.method).toBe("POST");
            expect(connectionResponsePost.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(connectionResponsePost.headers.get(HEADER_SESSION_ID)).toBeNull();
            expect(JSON.parse(connectionResponsePost.body)).toEqual(permissionResponse);
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await stream.writable.close();
        }
    });
    it("propagates cookies across initialize, SSE, session POST, and DELETE", async () => {
        const controlledFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
            getCookies: ["route=bravo; Path=/"],
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
            headers: {
                Cookie: "caller=custom; transport=caller",
            },
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await controlledFetch.sendSse(0, sessionNewResponse);
            await readMessage(reader);
            await writer.write(promptRequest);
            await writer.close();
            expect(requestAt(controlledFetch.requests, 0).credentials).toBe("include");
            expect(requestAt(controlledFetch.requests, 0).headers.get("Cookie")).toBe("caller=custom; transport=caller");
            expect(requestAt(controlledFetch.requests, 1).headers.get("Cookie")).toBe("transport=caller; caller=custom");
            expect(requestAt(controlledFetch.requests, 2).headers.get("Cookie")).toBe("transport=caller; route=bravo; caller=custom");
            expect(requestAt(controlledFetch.requests, 3).headers.get("Cookie")).toBe("transport=caller; route=bravo; caller=custom");
            expect(requestAt(controlledFetch.requests, 4).headers.get("Cookie")).toBe("transport=caller; route=bravo; caller=custom");
            expect(controlledFetch.requests.map((request) => request.credentials)).toEqual(["include", "include", "include", "include", "include"]);
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
        }
    });
    it("omits managed cookies when cookie handling is disabled", async () => {
        const controlledFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
            cookies: "omit",
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            expect(requestAt(controlledFetch.requests, 0).credentials).toBe("omit");
            expect(requestAt(controlledFetch.requests, 1).credentials).toBe("omit");
            expect(requestAt(controlledFetch.requests, 1).headers.get("Cookie")).toBeNull();
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await stream.writable.close();
        }
    });
    it("clears SDK-owned ephemeral cookies when the stream errors", async () => {
        const clearSpy = vi.spyOn(MemoryAcpCookieStore.prototype, "clear");
        const controlledFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
            getStatus: 500,
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            expect(await readMessage(reader)).toEqual(initializeResponse);
            await expect(reader.read()).rejects.toThrow("ACP SSE connection failed");
            expect(clearSpy).toHaveBeenCalledTimes(1);
        }
        finally {
            clearSpy.mockRestore();
            reader.releaseLock();
            writer.releaseLock();
            await stream.writable.close();
        }
    });
    it("preserves caller-owned cookies when the stream errors", async () => {
        const cookieStore = new MemoryAcpCookieStore();
        const clearSpy = vi.spyOn(cookieStore, "clear");
        const firstFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
            getStatus: 500,
        });
        const firstStream = createHttpStream("https://agent.example/acp", {
            fetch: firstFetch.fetch,
            cookieStore,
        });
        const firstWriter = firstStream.writable.getWriter();
        const firstReader = firstStream.readable.getReader();
        try {
            await firstWriter.write(initializeRequest);
            expect(await readMessage(firstReader)).toEqual(initializeResponse);
            await expect(firstReader.read()).rejects.toThrow("ACP SSE connection failed");
            expect(clearSpy).not.toHaveBeenCalled();
        }
        finally {
            clearSpy.mockRestore();
            firstReader.releaseLock();
            firstWriter.releaseLock();
            await firstStream.writable.close();
        }
        const secondFetch = createControlledFetch();
        const secondStream = createHttpStream("https://agent.example/acp", {
            fetch: secondFetch.fetch,
            cookieStore,
        });
        const secondWriter = secondStream.writable.getWriter();
        const secondReader = secondStream.readable.getReader();
        try {
            await secondWriter.write(initializeRequest);
            await readMessage(secondReader);
            expect(requestAt(secondFetch.requests, 0).headers.get("Cookie")).toBe("transport=alpha");
        }
        finally {
            secondReader.releaseLock();
            secondWriter.releaseLock();
            await secondStream.writable.close();
        }
    });
    it("preserves caller-owned cookies across separate stream instances", async () => {
        const cookieStore = new MemoryAcpCookieStore();
        const firstFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
        });
        const firstStream = createHttpStream("https://agent.example/acp", {
            fetch: firstFetch.fetch,
            cookieStore,
        });
        const firstWriter = firstStream.writable.getWriter();
        const firstReader = firstStream.readable.getReader();
        try {
            await firstWriter.write(initializeRequest);
            await readMessage(firstReader);
            await firstWriter.close();
        }
        finally {
            firstReader.releaseLock();
            firstWriter.releaseLock();
        }
        const secondFetch = createControlledFetch();
        const secondStream = createHttpStream("https://agent.example/acp", {
            fetch: secondFetch.fetch,
            cookieStore,
        });
        const secondWriter = secondStream.writable.getWriter();
        const secondReader = secondStream.readable.getReader();
        try {
            await secondWriter.write(initializeRequest);
            await readMessage(secondReader);
            expect(requestAt(secondFetch.requests, 0).headers.get("Cookie")).toBe("transport=alpha");
        }
        finally {
            secondReader.releaseLock();
            secondWriter.releaseLock();
            await secondStream.writable.close();
        }
    });
    it("clears SDK-owned ephemeral cookies when the stream closes", async () => {
        const firstFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
        });
        const firstStream = createHttpStream("https://agent.example/acp", {
            fetch: firstFetch.fetch,
        });
        const firstWriter = firstStream.writable.getWriter();
        const firstReader = firstStream.readable.getReader();
        try {
            await firstWriter.write(initializeRequest);
            await readMessage(firstReader);
            await firstWriter.close();
        }
        finally {
            firstReader.releaseLock();
            firstWriter.releaseLock();
        }
        const secondFetch = createControlledFetch();
        const secondStream = createHttpStream("https://agent.example/acp", {
            fetch: secondFetch.fetch,
        });
        const secondWriter = secondStream.writable.getWriter();
        const secondReader = secondStream.readable.getReader();
        try {
            await secondWriter.write(initializeRequest);
            await readMessage(secondReader);
            expect(requestAt(secondFetch.requests, 0).headers.get("Cookie")).toBeNull();
        }
        finally {
            secondReader.releaseLock();
            secondWriter.releaseLock();
            await secondStream.writable.close();
        }
    });
    it("lets caller Cookie headers override caller-owned store values", async () => {
        const cookieStore = new MemoryAcpCookieStore();
        cookieStore.store(headersWithSetCookie(["transport=alpha", "route=bravo"]));
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
            cookieStore,
            headers: {
                Cookie: "route=caller; caller=custom",
            },
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            expect(requestAt(controlledFetch.requests, 0).headers.get("Cookie")).toBe("transport=alpha; route=caller; caller=custom");
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await stream.writable.close();
        }
    });
    it("sends DELETE and aborts SSE requests when closed", async () => {
        const controlledFetch = createControlledFetch();
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await writer.close();
            const deleteRequest = requestAt(controlledFetch.requests, 2);
            expect(deleteRequest.method).toBe("DELETE");
            expect(deleteRequest.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(sseAt(controlledFetch.sseRequests, 0).signal.aborted).toBe(true);
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
        }
    });
    it("aborts active SSE requests before awaiting DELETE on close", async () => {
        const deleteStarted = createDeferred();
        const allowDelete = createDeferred();
        let sseSignal;
        const fetch = async (_input, init) => {
            const method = init?.method ?? "GET";
            const headers = new Headers(init?.headers);
            if (method === "POST" && !headers.has(HEADER_CONNECTION_ID)) {
                return jsonResponse(initializeResponse, 200, {
                    [HEADER_CONNECTION_ID]: "connection-1",
                });
            }
            if (method === "GET") {
                sseSignal = init?.signal;
                return sseResponse(sseSignal);
            }
            if (method === "DELETE") {
                deleteStarted.resolve();
                await allowDelete.promise;
                return new Response(null, { status: 202 });
            }
            throw new Error(`Unexpected ${method} request`);
        };
        const stream = createHttpStream("https://agent.example/acp", { fetch });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        let closePromise;
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            closePromise = writer.close();
            await deleteStarted.promise;
            expect(sseSignal?.aborted).toBe(true);
            allowDelete.resolve();
            await closePromise;
        }
        finally {
            allowDelete.resolve();
            reader.releaseLock();
            writer.releaseLock();
            await closePromise?.catch(() => undefined);
            await closeStream(stream);
        }
    });
    it("aborts in-flight connected POSTs when closed", async () => {
        const connectedPostAborted = createDeferred();
        const requests = [];
        const fetch = async (input, init) => {
            const method = init?.method ?? "GET";
            const headers = new Headers(init?.headers);
            const signal = init?.signal;
            requests.push({
                url: String(input),
                method,
                headers,
                body: bodyToString(init?.body),
                credentials: init?.credentials,
                signal,
            });
            if (method === "POST" && !headers.has(HEADER_CONNECTION_ID)) {
                return jsonResponse(initializeResponse, 200, {
                    [HEADER_CONNECTION_ID]: "connection-1",
                });
            }
            if (method === "GET") {
                return sseResponse(signal);
            }
            if (method === "POST" && headers.has(HEADER_CONNECTION_ID)) {
                return await new Promise((_resolve, reject) => {
                    signal?.addEventListener("abort", () => {
                        connectedPostAborted.resolve();
                        reject(new Error("connected POST aborted"));
                    }, { once: true });
                });
            }
            if (method === "DELETE") {
                return new Response(null, { status: 202 });
            }
            throw new Error(`Unexpected ${method} request`);
        };
        const stream = createHttpStream("https://agent.example/acp", { fetch });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            const write = writer.write(sessionNewRequest);
            await flushMicrotasks();
            const postRequest = requestAt(requests, 2);
            expect(postRequest.method).toBe("POST");
            expect(postRequest.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(postRequest.signal?.aborted).toBe(false);
            const cancel = reader.cancel();
            await connectedPostAborted.promise;
            expect(postRequest.signal?.aborted).toBe(true);
            await expect(write).rejects.toThrow("connected POST aborted");
            await cancel;
            const deleteRequest = requestAt(requests, 3);
            expect(deleteRequest.method).toBe("DELETE");
            expect(deleteRequest.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
        }
        finally {
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("errors and tears down local resources when connected POST fails", async () => {
        const clearSpy = vi.spyOn(MemoryAcpCookieStore.prototype, "clear");
        const controlledFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
            postStatus: 401,
            postBody: "expired",
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await expect(writer.write(sessionNewRequest)).rejects.toThrow("ACP POST failed: 401");
            const deleteRequest = requestAt(controlledFetch.requests, 3);
            expect(deleteRequest.method).toBe("DELETE");
            expect(deleteRequest.headers.get(HEADER_CONNECTION_ID)).toBe("connection-1");
            expect(deleteRequest.headers.get("Cookie")).toBe("transport=alpha");
            await flushMicrotasks();
            expect(sseAt(controlledFetch.sseRequests, 0).signal.aborted).toBe(true);
            expect(clearSpy).toHaveBeenCalledTimes(1);
            await expect(reader.read()).rejects.toThrow("ACP POST failed");
        }
        finally {
            clearSpy.mockRestore();
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("cleans up local resources when DELETE rejects during close", async () => {
        const clearSpy = vi.spyOn(MemoryAcpCookieStore.prototype, "clear");
        const controlledFetch = createControlledFetch({
            initializeCookies: ["transport=alpha; Path=/"],
            deleteError: new Error("Network dropped"),
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await expect(writer.close()).rejects.toThrow("Network dropped");
            expect(sseAt(controlledFetch.sseRequests, 0).signal.aborted).toBe(true);
            expect(clearSpy).toHaveBeenCalledTimes(1);
            expect((await reader.read()).done).toBe(true);
        }
        finally {
            clearSpy.mockRestore();
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("propagates DELETE failures from readable cancel", async () => {
        const controlledFetch = createControlledFetch({
            deleteError: new Error("Network dropped"),
        });
        const stream = createHttpStream("https://agent.example/acp", {
            fetch: controlledFetch.fetch,
        });
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        try {
            await writer.write(initializeRequest);
            await readMessage(reader);
            await expect(reader.cancel()).rejects.toThrow("Network dropped");
            expect(sseAt(controlledFetch.sseRequests, 0).signal.aborted).toBe(true);
        }
        finally {
            reader.releaseLock();
            writer.releaseLock();
            await closeStream(stream);
        }
    });
    it("runs initialize, newSession, and prompt through ClientSideConnection", async () => {
        const updates = [];
        const server = await startTestServer(() => createTestAgentApp({ chunkCount: 2 }));
        const stream = createHttpStream(server.url);
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
        const stream = createHttpStream(server.url);
        try {
            const result = await createClientApp({ name: "http-app-client" })
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
        const stream = createHttpStream(server.url);
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
    it("loads durable sessions after an HTTP reconnect", async () => {
        const durableSessions = new Map();
        const connectionIds = [];
        const fetch = recordInitializeConnectionIds(connectionIds);
        const server = await startTestServer(() => createDurableSessionAgent(durableSessions));
        try {
            const firstUpdates = [];
            const firstStream = createHttpStream(server.url, { fetch });
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
            const secondStream = createHttpStream(server.url, { fetch });
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
        const stream = createHttpStream(server.url);
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
function recordInitializeConnectionIds(connectionIds) {
    return async (input, init) => {
        const response = await globalThis.fetch(input, init);
        const headers = new Headers(init?.headers);
        if (init?.method === "POST" && !headers.has(HEADER_CONNECTION_ID)) {
            const connectionId = response.headers.get(HEADER_CONNECTION_ID);
            if (connectionId) {
                connectionIds.push(connectionId);
            }
        }
        return response;
    };
}
function createControlledFetch(options = {}) {
    const requests = [];
    const sseRequests = [];
    const encoder = new TextEncoder();
    return {
        requests,
        sseRequests,
        fetch: async (input, init) => {
            const method = init?.method ?? "GET";
            const headers = new Headers(init?.headers);
            requests.push({
                url: String(input),
                method,
                headers,
                body: bodyToString(init?.body),
                credentials: init?.credentials,
                signal: init?.signal,
            });
            if (method === "POST" && !headers.has(HEADER_CONNECTION_ID)) {
                const status = options.initializeStatus ?? 200;
                if (status !== 200) {
                    return new Response(options.initializeBody ?? null, {
                        status,
                        headers: setCookieResponseHeaders(options.initializeCookies),
                    });
                }
                return jsonResponse(options.initializeResponse ?? initializeResponse, 200, {
                    [HEADER_CONNECTION_ID]: "connection-1",
                    ...setCookieResponseHeaders(options.initializeCookies),
                });
            }
            if (method === "DELETE" && options.deleteError) {
                throw options.deleteError;
            }
            if (method === "POST" &&
                headers.has(HEADER_CONNECTION_ID) &&
                options.postStatus !== undefined) {
                return new Response(options.postBody ?? null, {
                    status: options.postStatus,
                });
            }
            if (method === "POST" || method === "DELETE") {
                return new Response(null, { status: 202 });
            }
            if (method === "GET") {
                const status = options.getStatus ?? 200;
                if (status !== 200) {
                    return new Response("SSE failed", {
                        status,
                        headers: setCookieResponseHeaders(options.getCookies),
                    });
                }
                const sseIndex = sseRequests.length;
                await options.sseResponseDelays?.get(sseIndex);
                const stream = new TransformStream();
                const writer = stream.writable.getWriter();
                const signal = init?.signal;
                if (signal) {
                    signal.addEventListener("abort", () => {
                        void writer.close().catch(() => undefined);
                    });
                }
                sseRequests.push({
                    signal: signal ?? new AbortController().signal,
                    writer,
                });
                return new Response(stream.readable, {
                    status: 200,
                    headers: {
                        "Content-Type": EVENT_STREAM_MIME_TYPE,
                        ...setCookieResponseHeaders(options.getCookies),
                    },
                });
            }
            return new Response("Unexpected method", { status: 405 });
        },
        sendSse: async (index, message) => {
            await sseAt(sseRequests, index).writer.write(encoder.encode(serializeSseEvent(message)));
        },
        closeSse: async (index) => {
            await sseAt(sseRequests, index).writer.close();
        },
    };
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
async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
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
async function readMessage(reader) {
    const result = await reader.read();
    if (result.done || Array.isArray(result.value)) {
        throw new Error("Expected an individual message");
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
function requestAt(requests, index) {
    const request = requests[index];
    if (!request) {
        throw new Error(`Expected request at index ${index}`);
    }
    return request;
}
function sseAt(requests, index) {
    const request = requests[index];
    if (!request) {
        throw new Error(`Expected SSE request at index ${index}`);
    }
    return request;
}
function bodyToString(body) {
    return typeof body === "string" ? body : "";
}
function jsonResponse(body, status, headers) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": JSON_MIME_TYPE,
            ...headers,
        },
    });
}
function sseResponse(signal) {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    signal?.addEventListener("abort", () => {
        void writer.close().catch(() => undefined);
    });
    return new Response(stream.readable, {
        status: 200,
        headers: {
            "Content-Type": EVENT_STREAM_MIME_TYPE,
        },
    });
}
function headersWithSetCookie(values) {
    const headers = new Headers();
    Object.defineProperty(headers, "getSetCookie", {
        value: () => values,
    });
    return headers;
}
function setCookieResponseHeaders(cookies) {
    return cookies ? { "Set-Cookie": cookies.join(", ") } : {};
}
//# sourceMappingURL=http-stream.test.js.map