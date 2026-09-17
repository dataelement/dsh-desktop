/** Minimal browser/Node-compatible WebSocket shape used by ACP transports. */
export interface WebSocketLike {
    readonly readyState?: number;
    send(data: string): void;
    close(code?: number, reason?: string): void;
    addEventListener?(type: string, listener: (event: unknown) => void): void;
    removeEventListener?(type: string, listener: (event: unknown) => void): void;
    on?(type: string, listener: (...args: unknown[]) => void): unknown;
    off?(type: string, listener: (...args: unknown[]) => void): unknown;
    removeListener?(type: string, listener: (...args: unknown[]) => void): unknown;
}
export declare function onWebSocket(socket: WebSocketLike, type: string, listener: (...args: unknown[]) => void): () => void;
export declare function webSocketMessageToString(args: unknown[]): string | undefined;
