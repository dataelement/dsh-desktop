import type { AgentConnector, ConnectionRegistry, ConnectionState } from "./connection.js";
import type { WebSocketLike } from "./ws-utils.js";
/** WebSocket shape accepted by prepared ACP WebSocket upgrades. */
export type WebSocketServerSocket = WebSocketLike;
export interface WebSocketConnectionOptions {
    readonly registry: ConnectionRegistry;
    readonly agent: AgentConnector;
    readonly connection?: ConnectionState;
}
export interface WebSocketServerSessionHandle {
    readonly closed: Promise<void>;
    close(code?: number, reason?: string): Promise<void>;
}
export declare function handleWebSocketConnection(socket: WebSocketLike, options: WebSocketConnectionOptions): WebSocketServerSessionHandle;
