import { AgentSideConnection } from "./acp.js";
import type { WebSocketServerSocket } from "./ws-server.js";
import type { AgentConnector } from "./connection.js";
import type { Agent } from "./acp.js";
export type AgentFactory = () => AgentConnector;
/** @deprecated Prefer {@link AgentFactory}. */
export type LegacyAgentFactory = (conn: AgentSideConnection) => Agent;
type AgentOption = {
    /** Agent app or protocol router used for each accepted ACP connection. */
    readonly agent: AgentConnector;
    readonly createAgent?: never;
    readonly createLegacyAgent?: never;
} | {
    readonly agent?: never;
    /** Creates an agent app or protocol router for each accepted connection. */
    readonly createAgent: AgentFactory;
    readonly createLegacyAgent?: never;
} | {
    readonly agent?: never;
    readonly createAgent?: never;
    /**
     * Creates a legacy agent implementation for each accepted ACP connection.
     *
     * @deprecated Prefer `agent` or `createAgent`.
     */
    readonly createLegacyAgent: LegacyAgentFactory;
};
type OptionalAgentOption = {
    /** Agent app or protocol router used for this accepted ACP connection. */
    readonly agent?: AgentConnector;
    readonly createAgent?: never;
    readonly createLegacyAgent?: never;
} | {
    readonly agent?: never;
    /** Creates the agent app or router for this accepted connection. */
    readonly createAgent?: AgentFactory;
    readonly createLegacyAgent?: never;
} | {
    readonly agent?: never;
    readonly createAgent?: never;
    /**
     * Creates the legacy agent implementation for this accepted ACP connection.
     *
     * @deprecated Prefer `agent` or `createAgent`.
     */
    readonly createLegacyAgent?: LegacyAgentFactory;
};
/** Options for creating an ACP server transport. */
export type AcpServerOptions = AgentOption;
export type HandleRequestOptions = OptionalAgentOption;
export type PrepareWebSocketUpgradeOptions = OptionalAgentOption;
export interface PreparedWebSocketUpgrade {
    readonly connectionId: string;
    accept(socket: WebSocketServerSocket): void;
    reject(): void;
}
/**
 * ACP server transport for Streamable HTTP and WebSocket connections.
 *
 * Route HTTP requests to {@link handleRequest}. For WebSocket upgrades, use
 * {@link prepareWebSocketUpgrade} so adapters can attach `Acp-Connection-Id` to
 * the `101 Switching Protocols` response.
 */
export declare class AcpServer {
    private readonly agent;
    private readonly registry;
    private readonly webSocketSessions;
    constructor(options: AcpServerOptions);
    /** Handles one Streamable HTTP ACP request. */
    handleRequest(req: Request, options?: HandleRequestOptions): Promise<Response>;
    /** Creates a WebSocket connection before accepting the HTTP upgrade. */
    prepareWebSocketUpgrade(options?: PrepareWebSocketUpgradeOptions): PreparedWebSocketUpgrade;
    /** Closes all active ACP connections owned by this server. */
    close(): Promise<void>;
    private handlePost;
    private handleGet;
    private handleDelete;
    private handleInitialize;
    private forwardConnectedMessage;
}
export {};
