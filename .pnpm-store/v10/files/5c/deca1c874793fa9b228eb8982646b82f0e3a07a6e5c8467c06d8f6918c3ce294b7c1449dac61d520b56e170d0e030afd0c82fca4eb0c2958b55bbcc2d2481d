/** Builds a byte stream that enqueues each chunk and closes. */
export declare function streamFromChunks(chunks: Array<string | Uint8Array>): ReadableStream<Uint8Array>;
/** Splits data into fixed-size byte chunks. */
export declare function chunkBytes(data: string, chunkSize: number): Uint8Array[];
/** Reads a stream to completion, collecting every value. */
export declare function collectStream<T>(readable: ReadableStream<T>): Promise<T[]>;
/** Collects an async iterable to completion. */
export declare function collectAll<T>(source: AsyncIterable<T>): Promise<T[]>;
