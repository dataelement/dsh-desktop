/** Wire messages for Gateway-owned Remote streams and event-result RPCs. */
import type { Branded } from '@deepseek-ai/dsh-brand';
/** Exact WebSocket route carrying every Typert Remote stream. */
export declare const REMOTE_STREAM_MUX_PATH = "/api/remote.mux";
/** Gateway-internal logical stream carrying application-selected Cordis events. */
export declare const REMOTE_EVENT_STREAM_ENDPOINT = "$events";
/** Gateway-internal unary endpoint returning one Client Remote Event outcome. */
export declare const REMOTE_EVENT_RESULT_ENDPOINT = "$events/result";
/** Empty standard Remote payload used to open the forwarded-event stream. */
export declare const REMOTE_EVENT_STREAM_PAYLOAD: {
    readonly args: {};
};
/** Discriminator for the first item proving the Host event source is ready. */
export declare const REMOTE_EVENT_STREAM_READY: {
    readonly type: "ready";
};
/** Opaque identity for one active Client Remote Event generation. */
export type RemoteEventClientId = Branded<'RemoteEventClientId'>;
/** Opaque correlation id for one pending Host-to-Client Remote Event. */
export type RemoteEventId = Branded<'RemoteEventId'>;
/** Stable Host facts published with every established Client event generation. */
export interface RemoteEventHostInfo {
    /** Host account home used only to abbreviate displayed filesystem paths. */
    readonly home: string;
}
/** Opening item that binds later HTTP results to this active event stream. */
export interface RemoteEventReadyFrame {
    readonly type: 'ready';
    readonly clientId: RemoteEventClientId;
    /** Stable Host facts attached to this connection generation. */
    readonly host: RemoteEventHostInfo;
}
/** Opaque Agent identity carried by one scoped Remote Event. */
export type RemoteEventAgentId = Branded<'RemoteEventAgentId'>;
/** One Host notification delivered to a Client generation. */
export interface RemoteEventEmitFrame {
    readonly type: 'emit';
    readonly event: string;
    readonly args: readonly unknown[];
}
/** One pending Agent-scoped waterfall delivered to a Client generation. */
export interface RemoteEventInvocationFrame {
    readonly type: 'waterfall';
    readonly event: string;
    readonly eventId: RemoteEventId;
    readonly agentId: RemoteEventAgentId;
    readonly request: Readonly<Record<string, unknown>>;
}
/** Cancellation of a pending waterfall previously delivered under the same id. */
export interface RemoteEventCancellationFrame {
    readonly type: 'cancel';
    readonly eventId: RemoteEventId;
}
/** Every item carried by the Gateway-internal forwarded-event stream. */
export type RemoteEventDownlinkFrame = RemoteEventReadyFrame | RemoteEventEmitFrame | RemoteEventInvocationFrame | RemoteEventCancellationFrame;
/** JSON request fields plus the Host cancellation lifetime removed for transport. */
export interface ProjectedRemoteEventRequest {
    readonly request: Readonly<Record<string, unknown>>;
    readonly signal?: AbortSignal;
}
/** Error fields retained when a Client listener rejects a Host waterfall. */
export interface RemoteEventRejection {
    readonly name: string;
    readonly message: string;
    readonly code?: string;
    readonly details?: unknown;
}
/** Client response to one scoped Remote Event delivery. */
export interface RemoteEventResult {
    readonly clientId: RemoteEventClientId;
    readonly eventId: RemoteEventId;
    readonly outcome: {
        readonly kind: 'next';
    } | {
        readonly kind: 'result';
        readonly value?: unknown;
    } | {
        readonly kind: 'rejected';
        readonly error: RemoteEventRejection;
    };
}
/**
 * Parse one result sent through the Client's `$events/result` HTTP RPC.
 * @param value - untrusted result payload.
 * @returns validated event correlation and outcome fields.
 */
export declare function parseRemoteEventResult(value: unknown): RemoteEventResult;
/**
 * Remove the direct Agent and cancellation fields from one waterfall request.
 * @param value - request object before the waterfall's `next` callback.
 * @param subject - Agent used by the Cordis scope carrier.
 * @returns JSON-safe request fields and the optional Host cancellation signal.
 */
export declare function projectRemoteEventRequest(value: unknown, subject: object): ProjectedRemoteEventRequest;
/**
 * Project an arbitrary rejection to stable, JSON-safe error fields.
 * @param reason - value thrown or rejected by a Client listener.
 * @returns wire-safe rejection fields.
 */
export declare function projectRemoteEventRejection(reason: unknown): RemoteEventRejection;
/**
 * Recreate a Client rejection for the Host continuation.
 * @param rejection - validated wire-safe error fields.
 * @returns an Error preserving the remote name, code, and JSON-safe details.
 */
export declare function restoreRemoteEventRejection(rejection: RemoteEventRejection): Error;
/**
 * Test whether a value crosses JSON transport without coercion or omission.
 * @param value - candidate boundary value.
 * @returns whether the value is losslessly JSON-compatible.
 */
export declare function isRemoteJsonValue(value: unknown): boolean;
/**
 * Recognize a non-empty Remote Event correlation id at a wire boundary.
 * @param value - untrusted wire value.
 * @returns whether the value is a valid Remote Event id.
 */
export declare function isRemoteEventId(value: unknown): value is RemoteEventId;
/**
 * Recognize a non-empty Remote Event Client id at a wire boundary.
 * @param value - untrusted wire value.
 * @returns whether the value identifies one event-stream generation.
 */
export declare function isRemoteEventClientId(value: unknown): value is RemoteEventClientId;
/**
 * Recognize the direct Agent identity used by a scoped Remote Event.
 * @param value - untrusted wire value.
 * @returns whether the value is a non-empty Agent identity.
 */
export declare function isRemoteEventAgentId(value: unknown): value is RemoteEventAgentId;
/** One logical stream request sent from the browser. */
export type RemoteStreamClientMessage = {
    readonly type: 'open';
    readonly streamId: string;
    readonly endpoint: string;
    readonly payload: unknown;
} | {
    readonly type: 'cancel';
    readonly streamId: string;
};
/** Carrier-safe failure delivered by the Host. */
export interface RemoteStreamFailure {
    readonly code: string;
    readonly message: string;
    readonly details: object;
}
/** One logical stream frame sent from the Host. */
export type RemoteStreamServerMessage = {
    readonly type: 'item';
    readonly streamId: string;
    readonly value?: unknown;
} | {
    readonly type: 'error';
    readonly streamId: string;
    readonly error: RemoteStreamFailure;
} | {
    readonly type: 'end';
    readonly streamId: string;
};
/**
 * Parse and validate one browser-to-Host text message.
 * @param text - complete WebSocket text message.
 * @returns the validated logical-stream request.
 */
export declare function parseRemoteStreamClientMessage(text: string): RemoteStreamClientMessage;
/**
 * Parse and validate one Host-to-browser text message.
 * @param text - complete WebSocket text message.
 * @returns the validated logical-stream frame.
 */
export declare function parseRemoteStreamServerMessage(text: string): RemoteStreamServerMessage;
//# sourceMappingURL=stream-protocol.d.ts.map