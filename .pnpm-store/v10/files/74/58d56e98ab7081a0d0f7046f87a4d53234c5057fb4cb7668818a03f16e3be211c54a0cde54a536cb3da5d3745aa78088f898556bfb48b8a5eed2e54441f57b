import type { AnyMessage, AnyResponse, AnyWireMessage } from "./jsonrpc.js";
import type { WireStream } from "./stream.js";
export interface AgentConnectOptions {
    readonly deferConnectHandlers?: boolean;
}
export interface AgentConnectionLifecycle {
    readonly closed?: Promise<void>;
    startConnectHandlers?(): void;
}
export interface AgentConnector {
    connect(stream: WireStream, options?: AgentConnectOptions): AgentConnectionLifecycle | unknown;
}
export type ResponseRoute = "connection" | {
    readonly session: string;
};
export interface OutboundLease<Message extends AnyWireMessage = AnyMessage> {
    receive(): Promise<IteratorResult<Message>>;
    release(): void;
}
export declare class OutboundMailbox<Message extends AnyWireMessage = AnyMessage> {
    private readonly enabled;
    private readonly queue;
    private activeLease;
    private isFinished;
    private isAborted;
    constructor(enabled?: boolean);
    push(message: Message): void;
    tryAcquire(): OutboundLease<Message> | undefined;
    finish(): void;
    abort(): void;
}
export type ConnectionTransport = "http" | "websocket";
export declare class ConnectionState {
    private readonly transport;
    readonly connectionId: string;
    readonly inboundTx: WritableStream<AnyWireMessage>;
    readonly outboundRx: ReadableStream<AnyWireMessage>;
    readonly connectionStream: OutboundMailbox;
    readonly allOutbound: OutboundMailbox<AnyWireMessage>;
    readonly sessionStreams: Map<string, OutboundMailbox<AnyMessage>>;
    readonly pendingRoutes: Map<string, ResponseRoute>;
    readonly clientResponseRoutes: Map<string, ResponseRoute>;
    readonly closed: Promise<void>;
    private readonly agentConnection;
    private supportsBatches;
    private hasStartedRouter;
    private inboundWriteChain;
    private initialReader;
    private outboundReader;
    private routerPromise;
    private shutdownPromise;
    private hasResolvedClosed;
    private finishAgentOutbound;
    private resolveClosed;
    constructor(agent: AgentConnector, transport?: ConnectionTransport);
    recvInitial(initializeId: string | number): Promise<AnyResponse>;
    writeInbound(message: AnyWireMessage): Promise<void>;
    startRouter(): void;
    startConnectHandlers(): void;
    /** Enables JSON-RPC batch frames after ACP v2 is negotiated. */
    enableBatches(): void;
    get batchesEnabled(): boolean;
    ensureSession(sessionId: string): OutboundMailbox;
    shutdown(): Promise<void>;
    private runShutdown;
    private observeAgentConnection;
    private cancelOutboundReader;
    private writeInboundMessage;
    private runRouter;
    private resolveClosedOnce;
    private routeOutbound;
    private routeOutboundMessage;
    private routeOutboundResponse;
    private routeOutboundRequestOrNotification;
    private trackClientResponseRoute;
    private pushToRoute;
}
export declare class ConnectionRegistry {
    private readonly connections;
    private readonly pendingConnections;
    createConnection(agent: AgentConnector, transport?: ConnectionTransport): ConnectionState;
    createPendingConnection(agent: AgentConnector, transport?: ConnectionTransport): ConnectionState;
    register(connection: ConnectionState): void;
    get(connectionId: string): ConnectionState | undefined;
    remove(connectionId: string): ConnectionState | undefined;
    discard(connectionId: string): ConnectionState | undefined;
    closeAll(): Promise<void>;
    private trackConnectionClose;
}
