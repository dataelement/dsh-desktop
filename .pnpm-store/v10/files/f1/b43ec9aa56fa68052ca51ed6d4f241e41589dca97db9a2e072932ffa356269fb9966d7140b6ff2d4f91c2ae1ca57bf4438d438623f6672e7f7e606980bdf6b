import { describe, expect, it, vi } from "vitest";
import { parseSseStream, serializeSseEvent, serializeSseKeepAlive, } from "./sse.js";
import { chunkBytes, collectAll, streamFromChunks, } from "./test-support/streams.js";
function collectMessages(body) {
    return collectAll(parseSseStream(body));
}
describe("SSE transport helpers", () => {
    it("serializes a message event", () => {
        const message = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: { protocolVersion: 1 },
        };
        expect(serializeSseEvent(message)).toBe(`data: ${JSON.stringify(message)}\n\n`);
    });
    it("serializes a keepalive comment", () => {
        expect(serializeSseKeepAlive()).toBe(":\n\n");
    });
    it("parses one event", async () => {
        const message = { jsonrpc: "2.0", id: 1, result: { ok: true } };
        await expect(collectMessages(streamFromChunks([serializeSseEvent(message)]))).resolves.toEqual([message]);
    });
    it("passes through a response batch as one event", async () => {
        const batch = [
            { jsonrpc: "2.0", id: 1, result: { value: 1 } },
            { jsonrpc: "2.0", id: 2, result: { value: 2 } },
        ];
        await expect(collectMessages(streamFromChunks([serializeSseEvent(batch)]))).resolves.toEqual([batch]);
    });
    it("parses multiple events in one chunk", async () => {
        const first = { jsonrpc: "2.0", id: 1, result: { ok: true } };
        const second = {
            jsonrpc: "2.0",
            method: "session/update",
            params: { sessionId: "s1" },
        };
        await expect(collectMessages(streamFromChunks([
            serializeSseEvent(first) + serializeSseEvent(second),
        ]))).resolves.toEqual([first, second]);
    });
    it("parses events split across chunk boundaries", async () => {
        const message = {
            jsonrpc: "2.0",
            id: "abc",
            result: { ok: true },
        };
        const serialized = serializeSseEvent(message);
        await expect(collectMessages(streamFromChunks([
            serialized.slice(0, 7),
            serialized.slice(7, 18),
            serialized.slice(18),
        ]))).resolves.toEqual([message]);
    });
    it("ignores comments, keepalives, and non-data fields", async () => {
        const message = { jsonrpc: "2.0", id: 1, result: { ok: true } };
        await expect(collectMessages(streamFromChunks([
            `:\n\nevent: message\nid: 1\ndata: ${JSON.stringify(message)}\nretry: 1000\n\n`,
        ]))).resolves.toEqual([message]);
    });
    it("joins multiline data fields", async () => {
        const expected = {
            jsonrpc: "2.0",
            id: 1,
            result: { ok: true },
        };
        const body = [
            'data: {"jsonrpc":"2.0",\n',
            'data: "id":1,\n',
            'data: "result":{"ok":true}}\n\n',
        ];
        await expect(collectMessages(streamFromChunks(body))).resolves.toEqual([
            expected,
        ]);
    });
    it("parses a large event spanning many chunks", async () => {
        const message = {
            jsonrpc: "2.0",
            method: "session/update",
            params: { data: "héllo wörld ".repeat(10_000) },
        };
        const chunks = chunkBytes(serializeSseEvent(message), 1024);
        expect(chunks.length).toBeGreaterThan(100);
        await expect(collectMessages(streamFromChunks(chunks))).resolves.toEqual([
            message,
        ]);
    });
    it("parses events separated by CRLF blank lines", async () => {
        const first = { jsonrpc: "2.0", id: 1, result: { ok: true } };
        const second = {
            jsonrpc: "2.0",
            method: "session/update",
            params: { sessionId: "s1" },
        };
        const body = `data: ${JSON.stringify(first)}\r\n\r\n` +
            `data: ${JSON.stringify(second)}\r\n\r\n`;
        await expect(collectMessages(streamFromChunks([body]))).resolves.toEqual([
            first,
            second,
        ]);
    });
    it("parses a final event without a trailing blank line", async () => {
        const message = { jsonrpc: "2.0", id: 1, result: { ok: true } };
        await expect(collectMessages(streamFromChunks([`data: ${JSON.stringify(message)}\n`]))).resolves.toEqual([message]);
    });
    it("passes through object payloads without validating their shape", async () => {
        // Lenient shapes are left for the connection layer to validate.
        const lenient = { id: 1, result: { ok: true } }; // missing jsonrpc
        await expect(collectMessages(streamFromChunks([`data: ${JSON.stringify(lenient)}\n\n`]))).resolves.toEqual([lenient]);
    });
    it("skips non-object payloads", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const message = { jsonrpc: "2.0", id: 1, result: { ok: true } };
        await expect(collectMessages(streamFromChunks(["data: 42\n\n", serializeSseEvent(message)]))).resolves.toEqual([message]);
        expect(warn).toHaveBeenCalledOnce();
        warn.mockRestore();
    });
    it("skips malformed JSON without throwing", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const message = { jsonrpc: "2.0", id: 1, result: { ok: true } };
        await expect(collectMessages(streamFromChunks(["data: {not-json}\n\n", serializeSseEvent(message)]))).resolves.toEqual([message]);
        expect(warn).toHaveBeenCalledOnce();
        warn.mockRestore();
    });
});
//# sourceMappingURL=sse.test.js.map