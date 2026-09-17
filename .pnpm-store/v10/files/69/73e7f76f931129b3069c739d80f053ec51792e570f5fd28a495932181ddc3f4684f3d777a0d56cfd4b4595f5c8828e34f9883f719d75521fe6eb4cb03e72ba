/**
 * Incrementally splits a byte stream into newline-terminated lines.
 *
 * Only the newly pushed chunk is scanned for newlines, so splitting costs
 * O(total bytes) no matter how many chunks a line spans.
 *
 * Chunks passed to {@link push} must not be mutated afterwards; a chunk
 * without a newline is retained until its line completes.
 */
export declare class LineBuffer {
    #private;
    /**
     * Consumes a chunk, returning each complete line without its trailing
     * newline.
     */
    push(chunk: Uint8Array): Uint8Array[];
    /**
     * Returns the trailing unterminated line and resets the buffer, or
     * undefined if no bytes are buffered.
     */
    flush(): Uint8Array | undefined;
}
