import { JSONRPCMessageSchema } from '../types.js';
export const STDIO_DEFAULT_MAX_BUFFER_SIZE = 10 * 1024 * 1024;
/**
 * Buffers a continuous stdio stream into discrete JSON-RPC messages.
 */
export class ReadBuffer {
    constructor(options) {
        this._maxBufferSize = options?.maxBufferSize ?? STDIO_DEFAULT_MAX_BUFFER_SIZE;
    }
    append(chunk) {
        const newSize = (this._buffer?.length ?? 0) + chunk.length;
        if (newSize > this._maxBufferSize) {
            this.clear();
            throw new Error(`ReadBuffer exceeded maximum size of ${this._maxBufferSize} bytes`);
        }
        this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
    }
    readMessage() {
        if (!this._buffer) {
            return null;
        }
        const index = this._buffer.indexOf('\n');
        if (index === -1) {
            return null;
        }
        const line = this._buffer.toString('utf8', 0, index).replace(/\r$/, '');
        this._buffer = this._buffer.subarray(index + 1);
        return deserializeMessage(line);
    }
    clear() {
        this._buffer = undefined;
    }
}
export function deserializeMessage(line) {
    return JSONRPCMessageSchema.parse(JSON.parse(line));
}
export function serializeMessage(message) {
    return JSON.stringify(message) + '\n';
}
//# sourceMappingURL=stdio.js.map