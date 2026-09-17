import { describe, expect, it } from "vitest";
import { EVENT_STREAM_MIME_TYPE, HEADER_CONNECTION_ID, HEADER_SESSION_ID, JSON_MIME_TYPE, } from "./protocol.js";
import { parseSseStream } from "./sse.js";
import { createTestAgentApp } from "./test-support/test-agent.js";
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
describe("AcpServer permission requests over HTTP", () => {
    it("rejects session-scoped client responses without a session header", async () => {
        const server = await startTestServer(() => createTestAgentApp({ enablePermission: true }));
        try {
            const connectionId = await initialize(server.url);
            const sessionId = await createSession(server.url, connectionId);
            const sessionSse = await openSessionSse(server.url, connectionId, sessionId);
            const sessionEvents = createSseMessageIterator(sessionSse);
            expect(await postJson(server.url, createPromptRequest(3, sessionId), {
                [HEADER_CONNECTION_ID]: connectionId,
                [HEADER_SESSION_ID]: sessionId,
            })).toMatchObject({ status: 202 });
            await readNextSseMessage(sessionEvents);
            const permissionRequest = await readNextSseMessage(sessionEvents);
            const permissionResponse = {
                jsonrpc: "2.0",
                id: readMessageId(permissionRequest),
                result: {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                },
            };
            expect(await postJson(server.url, permissionResponse, {
                [HEADER_CONNECTION_ID]: connectionId,
            })).toMatchObject({ status: 400 });
            expect(await postJson(server.url, permissionResponse, {
                [HEADER_CONNECTION_ID]: connectionId,
                [HEADER_SESSION_ID]: sessionId,
            })).toMatchObject({ status: 202 });
            await readNextSseMessage(sessionEvents);
            await readNextSseMessage(sessionEvents);
            await sessionEvents.return?.();
            await sessionSse.body?.cancel();
        }
        finally {
            await server.close();
        }
    }, 10_000);
    it("routes permission requests over session SSE and accepts client responses", async () => {
        const server = await startTestServer(() => createTestAgentApp({ enablePermission: true }));
        try {
            const connectionId = await initialize(server.url);
            const sessionId = await createSession(server.url, connectionId);
            const connectionAbort = new AbortController();
            const connectionSse = await openConnectionSse(server.url, connectionId, connectionAbort.signal);
            const sessionSse = await openSessionSse(server.url, connectionId, sessionId);
            const sessionEvents = createSseMessageIterator(sessionSse);
            expect(await postJson(server.url, createPromptRequest(3, sessionId), {
                [HEADER_CONNECTION_ID]: connectionId,
                [HEADER_SESSION_ID]: sessionId,
            })).toMatchObject({ status: 202 });
            expect(await readNextSseMessage(sessionEvents)).toMatchObject({
                jsonrpc: "2.0",
                method: "session/update",
                params: {
                    sessionId,
                    update: {
                        sessionUpdate: "agent_message_chunk",
                        content: { text: "chunk-1" },
                    },
                },
            });
            const permissionRequest = await readNextSseMessage(sessionEvents);
            expect(permissionRequest).toMatchObject({
                jsonrpc: "2.0",
                id: expect.any(Number),
                method: "session/request_permission",
                params: {
                    sessionId,
                    toolCall: {
                        toolCallId: "permission-tool",
                        title: "Permission tool",
                    },
                    options: expect.arrayContaining([
                        expect.objectContaining({
                            kind: "allow_once",
                            optionId: "allow",
                        }),
                    ]),
                },
            });
            expect(await readNextMessageOrUndefined(connectionSse, connectionAbort)).toBeUndefined();
            expect(await postJson(server.url, {
                jsonrpc: "2.0",
                id: readMessageId(permissionRequest),
                result: {
                    outcome: {
                        outcome: "selected",
                        optionId: "allow",
                    },
                },
            }, {
                [HEADER_CONNECTION_ID]: connectionId,
                [HEADER_SESSION_ID]: sessionId,
            })).toMatchObject({ status: 202 });
            expect(await readNextSseMessage(sessionEvents)).toMatchObject({
                jsonrpc: "2.0",
                method: "session/update",
                params: {
                    sessionId,
                    update: {
                        sessionUpdate: "agent_message_chunk",
                        content: { text: "permission-selected-allow" },
                    },
                },
            });
            expect(await readNextSseMessage(sessionEvents)).toMatchObject({
                jsonrpc: "2.0",
                id: 3,
                result: { stopReason: "end_turn" },
            });
            await sessionEvents.return?.();
            await sessionSse.body?.cancel();
        }
        finally {
            await server.close();
        }
    }, 10_000);
});
async function initialize(url) {
    const response = await postJson(url, initializeRequest);
    const connectionId = response.headers.get(HEADER_CONNECTION_ID);
    expect(response.status).toBe(200);
    expect(connectionId).toMatch(/^[0-9a-f-]{36}$/);
    return connectionId ?? "";
}
async function createSession(url, connectionId) {
    const response = await openConnectionSse(url, connectionId);
    const events = createSseMessageIterator(response);
    try {
        expect(await postJson(url, sessionNewRequest, {
            [HEADER_CONNECTION_ID]: connectionId,
        })).toMatchObject({ status: 202 });
        return readSessionId(await readNextSseMessage(events));
    }
    finally {
        await events.return?.();
        await response.body?.cancel();
    }
}
function openConnectionSse(url, connectionId, signal) {
    return fetch(url, {
        method: "GET",
        headers: {
            Accept: EVENT_STREAM_MIME_TYPE,
            [HEADER_CONNECTION_ID]: connectionId,
        },
        signal,
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
function createSseMessageIterator(response) {
    if (!response.body) {
        throw new Error("Expected SSE response body");
    }
    return parseSseStream(response.body)[Symbol.asyncIterator]();
}
async function readNextSseMessage(iterator) {
    const result = await iterator.next();
    if (result.done) {
        throw new Error("Expected SSE message");
    }
    return result.value;
}
async function readNextMessageOrUndefined(response, abort) {
    if (!response.body) {
        throw new Error("Expected SSE response body");
    }
    const iterator = parseSseStream(response.body)[Symbol.asyncIterator]();
    try {
        const result = await Promise.race([
            iterator.next(),
            delay(50).then(() => ({ done: true, value: undefined })),
        ]);
        return result.done ? undefined : result.value;
    }
    finally {
        abort.abort();
        await iterator.return?.();
    }
}
function readMessageId(message) {
    if (!("id" in message)) {
        throw new Error("Expected message ID");
    }
    return message.id;
}
function readSessionId(message) {
    if (!("result" in message) || !isRecord(message.result)) {
        throw new Error("Expected session/new response result");
    }
    const sessionId = message.result["sessionId"];
    if (typeof sessionId !== "string") {
        throw new Error("Expected session ID");
    }
    return sessionId;
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
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
//# sourceMappingURL=server-permission.test.js.map