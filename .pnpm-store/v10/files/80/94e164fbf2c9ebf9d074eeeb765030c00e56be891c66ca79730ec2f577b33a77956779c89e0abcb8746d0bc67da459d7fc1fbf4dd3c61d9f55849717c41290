/** Connection generation readiness, cancellation, and continuous recovery. */
import { type ConnectionRecoveryConfig } from '../recovery-config.ts';
export type { ConnectionRecoveryConfig } from '../recovery-config.ts';
/** Stable Host facts delivered by one established Remote event generation. */
export interface ConnectionHostInfo {
    /** Host account home used only to abbreviate displayed filesystem paths. */
    readonly home: string;
}
/** One successfully established Host generation. */
export interface ConnectionGeneration {
    /** Monotone generation number within this Client runtime. */
    readonly id: number;
    /** Host facts carried by this generation's opening frame. */
    readonly host: ConnectionHostInfo;
}
/** Connection lifecycle state published after the first attempt has an outcome. */
export type ConnectionState = 'connected' | 'disconnected' | 'connecting';
/** Connection-generation callbacks owned by API Gateway. */
export interface ConnectionSinks {
    /** After the generation source reports ready, first connect included. */
    onConnected?: (host: ConnectionHostInfo) => void;
    /** State transitions after the initial attempt has an outcome. Equivalent states are deduplicated. */
    onStateChange?: (state: ConnectionState) => void;
    /** Start one fresh physical-carrier attempt before each logical retry. */
    onReconnectRequested?: () => void;
}
/**
 * One long-lived source defining a Connection generation. The source must
 * attach its incremental listeners before calling `ready`, then remain pending
 * until the generation is lost or `signal` aborts. On abort it must stop
 * delivery, release its resources, and settle before a replacement can start.
 * @param signal - cancellation for the current generation.
 * @param ready - one-shot report that incremental delivery is attached.
 * @returns a promise settling only when this generation ends or fails.
 */
export type ConnectionGenerationSource = (signal: AbortSignal, ready: (host: ConnectionHostInfo) => void) => Promise<void>;
/**
 * Opens the registered generation source, reconnecting with exponential backoff on loss.
 * State (generation/attempt) is instance-private, never in the store.
 * Sink exceptions do not kill the generation loop.
 */
export declare class ConnectionController {
    private readonly source;
    private readonly sinks;
    private generation;
    private attempt;
    private current;
    private retryDelay;
    private running;
    private immediateRetry;
    private networkAvailable;
    private lastState;
    private readonly config;
    constructor(source: ConnectionGenerationSource, sinks?: ConnectionSinks, config?: ConnectionRecoveryConfig);
    /** Idempotent: begin the connect/pump/reconnect loop. */
    start(): void;
    /** Stop the loop and abort the current generation source. */
    stop(): void;
    /** Reset the retry sequence and replace the current generation or retry delay immediately. */
    reconnect(): void;
    /**
     * Suspend automatic retries while offline and restart backoff when the network returns.
     * @param available - whether the browser reports network access.
     */
    setNetworkAvailable(available: boolean): void;
    private backoffCap;
    private backoffDelay;
    /** Re-read retry inputs after a potentially reentrant state sink. */
    private isRetryInterrupted;
    /** Read through a method: stop() flips the flag across awaits, so narrowing from the loop condition must not stick. */
    private isRunning;
    /** Re-read both mutable liveness guards after a potentially reentrant sink. */
    private isGenerationActive;
    private loop;
    /** Deduplicated state emission (sink isolation applies). */
    private emitState;
    /** Sink exception isolation: a business-layer throw is logged only, never affecting pump or reconnect semantics. */
    private callSink;
}
//# sourceMappingURL=connection.d.ts.map