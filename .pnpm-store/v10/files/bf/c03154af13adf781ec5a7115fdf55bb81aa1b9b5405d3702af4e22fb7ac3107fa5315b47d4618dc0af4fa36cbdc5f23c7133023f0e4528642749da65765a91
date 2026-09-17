import { JSONRPCMessage } from '../types.js';
export declare const STDIO_DEFAULT_MAX_BUFFER_SIZE: number;
/**
 * Buffers a continuous stdio stream into discrete JSON-RPC messages.
 */
export declare class ReadBuffer {
    private _buffer?;
    private _maxBufferSize;
    constructor(options?: {
        maxBufferSize?: number;
    });
    append(chunk: Buffer): void;
    readMessage(): JSONRPCMessage | null;
    clear(): void;
}
export declare function deserializeMessage(line: string): JSONRPCMessage;
export declare function serializeMessage(message: JSONRPCMessage): string;
//# sourceMappingURL=stdio.d.ts.map