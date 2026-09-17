import type { IncomingMessage, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import type { AcpServer } from "./server.js";
import type { WebSocketServerSocket } from "./ws-server.js";
type NodeWebSocketHeadersListener = (headers: string[], request: IncomingMessage) => void;
export declare const DEFAULT_MAX_REQUEST_BODY_BYTES: number;
export interface NodeHttpHandlerOptions {
    readonly maxRequestBodyBytes?: number;
}
export interface NodeWebSocketUpgradeServer {
    on(event: "headers", listener: NodeWebSocketHeadersListener): void;
    off(event: "headers", listener: NodeWebSocketHeadersListener): void;
    handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, callback: (webSocket: WebSocketServerSocket) => void): void;
}
export declare function createNodeHttpHandler(server: AcpServer, options?: NodeHttpHandlerOptions): (req: IncomingMessage, res: ServerResponse) => void;
export declare function createNodeWebSocketUpgradeHandler(server: AcpServer, webSocketServer: NodeWebSocketUpgradeServer): (req: IncomingMessage, socket: Duplex, head: Buffer) => void;
export {};
