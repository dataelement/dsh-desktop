import { describe, it, expect, vi } from "vitest";
import { ndJsonStream } from "./stream.js";
import { chunkBytes, collectStream, streamFromChunks, } from "./test-support/streams.js";
describe("ndJsonStream", () => {
    const nullWritable = new WritableStream();
    it("parses a single message", async () => {
        const msg = { jsonrpc: "2.0", id: 1, method: "test" };
        const input = streamFromChunks([JSON.stringify(msg) + "\n"]);
        const { readable } = ndJsonStream(nullWritable, input);
        const messages = await collectStream(readable);
        expect(messages).toEqual([msg]);
    });
    it("parses multiple messages", async () => {
        const msg1 = { jsonrpc: "2.0", id: 1, method: "first" };
        const msg2 = { jsonrpc: "2.0", id: 2, method: "second" };
        const input = streamFromChunks([
            JSON.stringify(msg1) + "\n" + JSON.stringify(msg2) + "\n",
        ]);
        const { readable } = ndJsonStream(nullWritable, input);
        const messages = await collectStream(readable);
        expect(messages).toEqual([msg1, msg2]);
    });
    it("passes through a JSON-RPC batch as one transport message", async () => {
        const batch = [
            { jsonrpc: "2.0", id: 1, method: "first" },
            { jsonrpc: "2.0", method: "notify" },
        ];
        const input = streamFromChunks([JSON.stringify(batch) + "\n"]);
        const { readable } = ndJsonStream(nullWritable, input);
        const messages = await collectStream(readable);
        expect(messages).toEqual([batch]);
    });
    it("writes a JSON-RPC batch as one NDJSON line", async () => {
        const chunks = [];
        const output = new WritableStream({
            write(chunk) {
                chunks.push(chunk);
            },
        });
        const input = new ReadableStream({
            start(controller) {
                controller.close();
            },
        });
        const batch = [
            { jsonrpc: "2.0", id: 1, method: "first" },
            { jsonrpc: "2.0", method: "notify" },
        ];
        const { writable } = ndJsonStream(output, input);
        const writer = writable.getWriter();
        await writer.write(batch);
        writer.releaseLock();
        expect(new TextDecoder().decode(chunks[0])).toBe(JSON.stringify(batch) + "\n");
    });
    it("parses a message split across chunks", async () => {
        const msg = { jsonrpc: "2.0", id: 1, method: "split" };
        const full = JSON.stringify(msg) + "\n";
        const mid = Math.floor(full.length / 2);
        const input = streamFromChunks([full.slice(0, mid), full.slice(mid)]);
        const { readable } = ndJsonStream(nullWritable, input);
        const messages = await collectStream(readable);
        expect(messages).toEqual([msg]);
    });
    it("parses a large message spanning many chunks", async () => {
        const msg = {
            jsonrpc: "2.0",
            id: 1,
            method: "large",
            params: { data: "héllo wörld ".repeat(10_000) },
        };
        const chunks = chunkBytes(JSON.stringify(msg) + "\n", 1024);
        expect(chunks.length).toBeGreaterThan(100);
        const { readable } = ndJsonStream(nullWritable, streamFromChunks(chunks));
        const messages = await collectStream(readable);
        expect(messages).toEqual([msg]);
    });
    it("parses messages when chunk boundaries fall mid-message", async () => {
        const msg1 = { jsonrpc: "2.0", id: 1, method: "first" };
        const msg2 = { jsonrpc: "2.0", id: 2, method: "second" };
        const msg3 = { jsonrpc: "2.0", id: 3, method: "third" };
        const full = [msg1, msg2, msg3]
            .map((m) => JSON.stringify(m) + "\n")
            .join("");
        // One chunk ends with a complete message plus the start of the next.
        const cut = full.indexOf('"second"');
        const input = streamFromChunks([full.slice(0, cut), full.slice(cut)]);
        const { readable } = ndJsonStream(nullWritable, input);
        const messages = await collectStream(readable);
        expect(messages).toEqual([msg1, msg2, msg3]);
    });
    it("handles multi-byte UTF-8 characters split across chunks", async () => {
        const msg = {
            jsonrpc: "2.0",
            id: 1,
            method: "test",
            params: { text: "héllo wörld" },
        };
        const bytes = new TextEncoder().encode(JSON.stringify(msg) + "\n");
        // Find the byte offset of 'é' (0xC3 0xA9) and split between its two bytes
        const éOffset = bytes.indexOf(0xc3);
        expect(éOffset).toBeGreaterThan(0);
        const input = streamFromChunks([
            bytes.slice(0, éOffset + 1), // includes 0xC3 but not 0xA9
            bytes.slice(éOffset + 1), // starts with 0xA9
        ]);
        const { readable } = ndJsonStream(nullWritable, input);
        const messages = await collectStream(readable);
        expect(messages).toEqual([msg]);
    });
    it("parses a final message without trailing newline", async () => {
        const msg = { jsonrpc: "2.0", id: 1, method: "unterminated" };
        const input = streamFromChunks([JSON.stringify(msg)]); // no \n
        const { readable } = ndJsonStream(nullWritable, input);
        const messages = await collectStream(readable);
        expect(messages).toEqual([msg]);
    });
    it("parses a final message without trailing newline with multi-byte chars split across chunks", async () => {
        const msg = {
            jsonrpc: "2.0",
            id: 1,
            method: "tëst",
        };
        const bytes = new TextEncoder().encode(JSON.stringify(msg)); // no \n
        const éOffset = bytes.indexOf(0xc3);
        expect(éOffset).toBeGreaterThan(0);
        const input = streamFromChunks([
            bytes.slice(0, éOffset + 1), // includes 0xC3 but not 0xAB
            bytes.slice(éOffset + 1),
        ]);
        const { readable } = ndJsonStream(nullWritable, input);
        const messages = await collectStream(readable);
        expect(messages).toEqual([msg]);
    });
    it("responds to malformed and primitive lines and continues parsing", async () => {
        const outputChunks = [];
        const output = new WritableStream({
            write(chunk) {
                outputChunks.push(chunk);
            },
        });
        const msg = { jsonrpc: "2.0", id: 2, method: "after" };
        const input = streamFromChunks([
            "not valid json\n42\n\n" + JSON.stringify(msg) + "\n",
        ]);
        const { readable } = ndJsonStream(output, input);
        const messages = await collectStream(readable);
        const responses = outputChunks
            .map((chunk) => new TextDecoder().decode(chunk))
            .join("")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line));
        expect(messages).toEqual([msg]);
        expect(responses).toMatchObject([
            { jsonrpc: "2.0", id: null, error: { code: -32700 } },
            { jsonrpc: "2.0", id: null, error: { code: -32600 } },
        ]);
    });
    it("passes through object messages without validating their shape", async () => {
        // Lenient peers may omit the jsonrpc field or send unusual response
        // shapes; the connection layer decides how to handle them.
        const lenient = { id: 1, method: "initialize", params: {} };
        const bothMembers = {
            jsonrpc: "2.0",
            id: 2,
            result: {},
            error: null,
        };
        const input = streamFromChunks([
            JSON.stringify(lenient) + "\n" + JSON.stringify(bothMembers) + "\n",
        ]);
        const { readable } = ndJsonStream(nullWritable, input);
        const messages = await collectStream(readable);
        expect(messages).toEqual([lenient, bothMembers]);
    });
    it("cancels the underlying input reader when canceled", async () => {
        const { promise: canceled, resolve: resolveCanceled } = Promise.withResolvers();
        const input = new ReadableStream({
            cancel(reason) {
                resolveCanceled(reason);
            },
        });
        const reason = new Error("connection closed");
        const { readable } = ndJsonStream(nullWritable, input);
        const reader = readable.getReader();
        await reader.cancel(reason);
        reader.releaseLock();
        await expect(canceled).resolves.toBe(reason);
        await vi.waitFor(() => {
            const inputReader = input.getReader();
            inputReader.releaseLock();
        });
    });
});
//# sourceMappingURL=stream.test.js.map