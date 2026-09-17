/** Browser wire client: Remote transport and connection generations. */
import type { Context } from '@deepseek-ai/cordis';
import { type ConnectionRecoveryConfig, type ConnectionGeneration, type ConnectionGenerationSource, type ConnectionSinks, type ConnectionState } from './connection.ts';
import { type RpcFetch, type RpcStreamOpen } from './rpc.ts';
import type { ClientConnectionRpc } from '../rpc.ts';
declare module '@deepseek-ai/cordis' {
    interface Events {
        /**
         * A connection generation was established. Wire-derived caches must
         * repull; long-lived streams own their own resume and baseline lifecycle.
         * @mode emit
         */
        'connection/reset'(): void;
    }
}
export type { MessageId, RpcRequest, RpcResponse, RpcResult, ClientRequest, ServerResponse, RpcMessage, SessionId, SessionEvent, ContentBlock, StreamChunk, } from './api.ts';
export { RpcId, transportError, } from './api.ts';
export type { ConnectionRecoveryConfig, ConnectionGeneration, ConnectionGenerationSource, ConnectionHostInfo, ConnectionSinks, ConnectionState, } from './connection.ts';
export type { ClientConnectionRpc, ConnectionRpcFailure, ConnectionRpcResult, } from '../rpc.ts';
export type { RpcFetch } from './rpc.ts';
/** Observable identity and Host facts for the active connection generation. */
export interface ConnectionGenerationState {
    /** Active generation, or undefined before readiness and while reconnecting. */
    getSnapshot(): ConnectionGeneration | undefined;
    /** Subscribe to generation establishment, replacement, and loss. */
    subscribe(listener: () => void): () => void;
}
/** Observable recovery lifecycle of the owned Connection loop. */
export interface ConnectionStateSource {
    /** Current state, or undefined before the first connection outcome. */
    getSnapshot(): ConnectionState | undefined;
    /** Subscribe to state changes. */
    subscribe(listener: () => void): () => void;
}
/** Required services (none — this is the wire root). */
export declare const inject: string[];
/**
 * Carrier override installed on the page global before plugin boot. The served
 * web app leaves it unset and gets HTTP + WebSocket; a shell that owns a
 * different physical transport (the worker preview's postMessage tunnel)
 * provides both halves here instead of forking this plugin.
 */
export interface ClientTransportHooks {
    /** Transport for generic unary RPC channels (the Typert gateway). */
    fetch: RpcFetch;
    /** Worker-local Gateway stream carrier; absent when the page uses the Gateway WebSocket. */
    openStream?: RpcStreamOpen;
    /**
     * Bundle transport for the module system, present when the carrier also owns
     * bundle bytes (the worker tunnel). Absent in the served web app, whose
     * bundles load over HTTP.
     */
    loadBundle?(url: string): Promise<void>;
    /**
     * The transport owner declares the page owns the Host outright: the Host
     * runs inside a worker this page spawned, so no other party can reach it and
     * the loopback stand-in for "the operator's own machine" is vacuous.
     * `ctx.connection.isLoopback` then reports the privileged surface reachable
     * regardless of the page authority. Only a shell that assembles its own
     * transport can set this; served pages never carry the global at all.
     */
    ownsHost?: boolean;
}
/**
 * The ctx.connection service API. API Gateway supplies generation readiness
 * and reset callbacks; Connection stays independent of downstream domain state.
 */
export interface ConnectionHandle {
    /**
     * Whether the privileged surface is reachable: the page authority is
     * loopback, the transport declares the page owns the Host
     * ({@link ClientTransportHooks.ownsHost}), or the context is not a browser.
     */
    readonly isLoopback: boolean;
    /** Current Remote event generation and the Host facts carried by its opening frame. */
    readonly generation: ConnectionGenerationState;
    /** Current recovery lifecycle for connection-specific consumers. */
    readonly state: ConnectionStateSource;
    /** Generic logical RPC channels over the same Connection transport. */
    readonly rpc: ClientConnectionRpc;
    /** Reset retry progression and replace the current attempt immediately. */
    reconnect(): void;
    /**
     * Register the sole source defining Host generations. The source reports
     * ready only after its incremental listeners are attached.
     * @param source - long-lived generation source owned by the push carrier.
     * @returns disposer withdrawing the source and stopping an active loop.
     */
    registerGenerationSource(source: ConnectionGenerationSource): () => void;
    /**
     * Start the connect/reconnect loop with the consumer's state callbacks.
     * API Gateway owns the loop; a second call throws.
     * @param sinks - connection-state callbacks.
     * @param config - explicit timing overrides; omitted fields use Host bootstrap timing.
     * @returns lifecycle controls for the loop.
     */
    start(sinks: ConnectionSinks, config?: ConnectionRecoveryConfig): ConnectionLoop;
}
/** Controls retained by the sole owner of a running connection loop. */
export interface ConnectionLoop {
    /** Stop the loop and withdraw its active generation. */
    stop(): void;
}
/**
 * Client plugin body: pick physical carriers by page mode and provide ctx.connection.
 * @param ctx - client cordis context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map