import { describe, it, expect } from "vitest";
import { LineBuffer } from "./line-buffer.js";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function pushAll(buffer, chunks) {
    const lines = [];
    for (const chunk of chunks) {
        for (const line of buffer.push(encoder.encode(chunk))) {
            lines.push(decoder.decode(line));
        }
    }
    return lines;
}
describe("LineBuffer", () => {
    it("splits complete lines within one chunk", () => {
        const buffer = new LineBuffer();
        expect(pushAll(buffer, ["a\nbb\nccc\n"])).toEqual(["a", "bb", "ccc"]);
        expect(buffer.flush()).toBeUndefined();
    });
    it("carries an incomplete line across chunks", () => {
        const buffer = new LineBuffer();
        expect(pushAll(buffer, ["ab", "cd ef", "gh\nnext"])).toEqual(["abcd efgh"]);
        expect(decoder.decode(buffer.flush())).toBe("next");
    });
    it("handles a newline at a chunk boundary", () => {
        const buffer = new LineBuffer();
        expect(pushAll(buffer, ["one", "\ntwo\n"])).toEqual(["one", "two"]);
        expect(buffer.flush()).toBeUndefined();
    });
    it("yields empty lines", () => {
        const buffer = new LineBuffer();
        expect(pushAll(buffer, ["a\n\nb\n"])).toEqual(["a", "", "b"]);
    });
    it("flushes a trailing unterminated line once", () => {
        const buffer = new LineBuffer();
        expect(pushAll(buffer, ["tail"])).toEqual([]);
        expect(decoder.decode(buffer.flush())).toBe("tail");
        expect(buffer.flush()).toBeUndefined();
    });
    it("handles empty chunks", () => {
        const buffer = new LineBuffer();
        expect(pushAll(buffer, ["", "a", "", "\n"])).toEqual(["a"]);
    });
});
//# sourceMappingURL=line-buffer.test.js.map