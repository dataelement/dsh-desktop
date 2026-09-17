const newline = 0x0a;
/**
 * Incrementally splits a byte stream into newline-terminated lines.
 *
 * Only the newly pushed chunk is scanned for newlines, so splitting costs
 * O(total bytes) no matter how many chunks a line spans.
 *
 * Chunks passed to {@link push} must not be mutated afterwards; a chunk
 * without a newline is retained until its line completes.
 */
export class LineBuffer {
    /** Bytes of the current (incomplete) line, carried across chunks. */
    #pending = [];
    /**
     * Consumes a chunk, returning each complete line without its trailing
     * newline.
     */
    push(chunk) {
        const lines = [];
        let start = 0;
        let newlineIndex = chunk.indexOf(newline, start);
        while (newlineIndex !== -1) {
            lines.push(this.#takeLine(chunk.subarray(start, newlineIndex)));
            start = newlineIndex + 1;
            newlineIndex = chunk.indexOf(newline, start);
        }
        if (start < chunk.byteLength) {
            // Copy a partial tail so a few carried-over bytes don't pin the whole
            // chunk's buffer. The constructor guarantees a copy, unlike slice(),
            // which Node's Buffer subclass overrides to return a view.
            this.#pending.push(start === 0 ? chunk : new Uint8Array(chunk.subarray(start)));
        }
        return lines;
    }
    /**
     * Returns the trailing unterminated line and resets the buffer, or
     * undefined if no bytes are buffered.
     */
    flush() {
        if (this.#pending.length === 0) {
            return undefined;
        }
        return this.#takeLine(new Uint8Array(0));
    }
    #takeLine(tail) {
        if (this.#pending.length === 0) {
            return tail;
        }
        let total = tail.byteLength;
        for (const part of this.#pending) {
            total += part.byteLength;
        }
        const line = new Uint8Array(total);
        let offset = 0;
        for (const part of this.#pending) {
            line.set(part, offset);
            offset += part.byteLength;
        }
        line.set(tail, offset);
        this.#pending = [];
        return line;
    }
}
//# sourceMappingURL=line-buffer.js.map