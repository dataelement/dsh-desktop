/**
 * Live Typert Remote dispatch over Cordis Services and registered providers.
 * Unary transport and response envelopes belong to Connection; live Remote
 * streams use the Gateway-owned WebSocket mux.
 * @module @deepseek-ai/dsh-api-gateway
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export type { TypertGatewayFaultDetails } from './remote-error-codes.ts';
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import type { InvokeRemoteRequest, TypertGateway, TypertGatewayErrorCode, TypertGatewayWireStream, TypertRemoteEventSource } from './types.ts';
import { type RemoteEventHostInfo } from './stream-protocol.ts';
export type { InvokeRemoteRequest, TypertGateway, TypertGatewayErrorCode, TypertGatewayWireStream, TypertRemoteEventContext, TypertRemoteEventDispatch, TypertRemoteEventFrame, TypertRemoteEventInvocation, TypertRemoteEventOutcome, TypertRemoteEventSource, } from './types.ts';
export type { RemoteEventHostInfo } from './stream-protocol.ts';
interface GatewayErrorOptions {
    readonly cause?: unknown;
    readonly field?: string;
}
/** Gateway transport configuration. */
export interface Config {
    /** WebSocket Ping interval from 1 through 2,147,483,647 milliseconds. @default 2000 */
    readonly websocketHeartbeatIntervalMs?: number;
}
/**
 * Dispatch failure produced outside the invoked business method. Rides the
 * shared Remote failure vocabulary, so its code crosses the wire instead of
 * folding to `internal`.
 */
export declare class TypertGatewayError extends RemoteError<TypertGatewayErrorCode> {
    /** Canonical `<namespace>/<method>` endpoint. */
    readonly endpoint: string;
    /** Affected wire field when the failure is field-specific. */
    readonly field: string | undefined;
    /**
     * Construct a Gateway failure without embedding boundary values in its message.
     * @param code - stable failure category.
     * @param endpoint - canonical Remote endpoint.
     * @param message - correction-oriented diagnostic without sensitive values.
     * @param options - optional field and contained cause.
     */
    constructor(code: TypertGatewayErrorCode, endpoint: string, message: string, options?: GatewayErrorOptions);
}
/**
 * Resolve strict generated definitions or conservative SRC markers against
 * current Cordis Services and Typert providers.
 * @typert service typertGateway
 */
export declare class TypertGatewayService extends Service implements TypertGateway {
    static inject: string[];
    static Config: z<Config>;
    /** Carrier adapter shared by the WebSocket mux and local Host transports. */
    readonly wireStream: TypertGatewayWireStream;
    private srcClaims;
    private remoteEvents;
    private readonly remoteEventClients;
    private readonly pendingRemoteEvents;
    /**
     * Register the Gateway against the active Typert registry.
     * @param ctx - owning Host Context with Typert registry access.
     * @param config - validated Gateway transport configuration.
     */
    constructor(ctx: Context, config: Config);
    /**
     * Register the sole application-selected forwarded-event source.
     * @param source - stream factory installed by the Remote assembly.
     * @param host - stable Host facts included in each Client generation's opening frame.
     * @returns disposer removing this source and cancelling its active streams.
     */
    registerRemoteEvents(source: TypertRemoteEventSource, host: RemoteEventHostInfo): () => Promise<void>;
    private claimsEndpoint;
    private collectSrcClaims;
    /**
     * Invoke one live Remote method through strict generated reflection or SRC markers.
     * @param request - decoded endpoint and exact named wire arguments.
     * @returns the business result without output decoding.
     * @throws {@link TypertGatewayError} for dispatch, provider, or boundary failures; lookup-policy and business errors retain identity.
     */
    invoke(request: InvokeRemoteRequest): Promise<unknown>;
    /**
     * Open one live stream Remote method without assuming a physical carrier.
     * @param request - decoded endpoint and named wire arguments.
     * @returns a cancellation-aware iterable over the business results.
     */
    stream(request: InvokeRemoteRequest): Promise<AsyncIterable<unknown>>;
    private dispatchRpc;
    private openWireStream;
    private openRemoteEvents;
    private consumeRemoteEvents;
    private broadcastRemoteEvent;
    private startRemoteEvent;
    private deliverRemoteEvent;
    private receiveRemoteEventResult;
    private removeRemoteEventDelivery;
    private removeRemoteEventClient;
    private settleRemoteEvent;
    private cancelRemoteEvent;
    private finishRemoteEvent;
    private closeRemoteEvents;
    private invokeRpc;
    private prepareInvocation;
    private resolveDescriptor;
    private resolveSrcDescriptor;
    private srcDescriptor;
    private resolveReceiverContext;
    private resolveParameter;
}
export default TypertGatewayService;
//# sourceMappingURL=index.d.ts.map