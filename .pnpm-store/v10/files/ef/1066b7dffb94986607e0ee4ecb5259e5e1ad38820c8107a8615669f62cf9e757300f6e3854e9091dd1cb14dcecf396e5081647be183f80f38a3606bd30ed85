const encoder = new TextEncoder();
/** Builds a byte stream that enqueues each chunk and closes. */
export function streamFromChunks(chunks) {
    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
            }
            controller.close();
        },
    });
}
/** Splits data into fixed-size byte chunks. */
export function chunkBytes(data, chunkSize) {
    if (chunkSize <= 0) {
        throw new RangeError("chunkSize must be positive");
    }
    const bytes = encoder.encode(data);
    const chunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
        chunks.push(bytes.subarray(i, i + chunkSize));
    }
    return chunks;
}
/** Reads a stream to completion, collecting every value. */
export async function collectStream(readable) {
    const values = [];
    const reader = readable.getReader();
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }
            values.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    return values;
}
/** Collects an async iterable to completion. */
export async function collectAll(source) {
    const values = [];
    for await (const value of source) {
        values.push(value);
    }
    return values;
}
//# sourceMappingURL=streams.js.map