/** Physical Remote stream socket failure that may be retried by a domain transport. */
export declare class RemoteStreamCarrierError extends Error {
    /**
     * @param message - physical carrier failure description.
     * @param options - optional causal error.
     */
    constructor(message: string, options?: ErrorOptions);
}
/** Keep one physical WebSocket and share it among independently cancellable Remote streams. */
export declare class RemoteStreamMuxClient {
    private socket;
    private cancelCandidate;
    private keepAlive;
    private revision;
    private readonly streams;
    private readonly waiters;
    private running;
    private disposed;
    /** Ensure a physical attempt exists, following the current attempt once if needed. */
    start(): void;
    /** Cancel the current socket or retry wait and start a fresh attempt immediately. */
    reconnect(): void;
    /**
     * Open one logical stream on the persistent physical connection.
     * If no physical attempt is active, opening waits for Connection to request
     * one or for the signal to abort.
     * @param endpoint - Typert Remote stream endpoint.
     * @param payload - endpoint request encoded on the wire.
     * @param signal - cancellation for this logical stream.
     * @returns Host items until completion, cancellation, or failure.
     */
    open(endpoint: string, payload: unknown, signal: AbortSignal): AsyncGenerator;
    /**
     * Permanently stop the carrier, close the physical socket, and fail every
     * active logical stream.
     * @returns once the active connection attempt has stopped.
     */
    close(): Promise<void>;
    private connect;
    private waitForSocket;
    private receive;
    private lost;
    private maintain;
    private failAll;
    private send;
}
//# sourceMappingURL=stream-client.d.ts.map