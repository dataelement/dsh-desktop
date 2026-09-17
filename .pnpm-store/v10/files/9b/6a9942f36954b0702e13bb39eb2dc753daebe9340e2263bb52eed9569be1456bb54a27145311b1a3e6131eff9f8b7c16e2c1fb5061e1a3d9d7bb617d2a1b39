/** Client owner for forwarded Remote Event subscriptions and deliveries. */
import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type { TypertClientEventListener, TypertRemoteEvent } from '@deepseek-ai/dsh-typert-protocol';
/** Open the Gateway-internal forwarded-event stream on the selected carrier. */
export type RemoteEventStreamOpener = (endpoint: string, payload: unknown, signal: AbortSignal) => AsyncIterable<unknown>;
/** Own Cordis registrations, generation pumping, waterfall dispatch, and HTTP replies. */
export declare class ClientRemoteEvents {
    private readonly ownerCtx;
    private readonly connection;
    private readonly openStream;
    private readonly eventPrefix;
    private readonly unregisterGeneration;
    private activeGeneration;
    /**
     * @param ownerCtx - Client Gateway root used for Agent Context resolution.
     * @param connection - Connection carrier used for HTTP result calls.
     * @param openStream - selected in-process or WebSocket stream opener.
     */
    constructor(ownerCtx: Context, connection: ConnectionHandle, openStream: RemoteEventStreamOpener);
    /**
     * Register one typed Remote Event listener in its calling fiber.
     * @param callerCtx - fiber Context owning the registration.
     * @param event - selected forwarded event.
     * @param listener - listener derived from that event's declaration.
     * @returns disposer for this exact registration.
     */
    subscribe<Event extends TypertRemoteEvent>(callerCtx: Context, event: Event, listener: TypertClientEventListener<Event>): () => void;
    /** Withdraw the generation source and wait for active listener work to quiesce. */
    dispose(): Promise<void>;
    /** Track the current generation so plugin disposal waits for listener work to stop. */
    private readonly runGeneration;
    /** Deliver one notification through Cordis while containing listener failures. */
    private deliver;
    /** Run one Connection generation over the forwarded-event logical stream. */
    private pumpEvents;
    private answer;
    private dispatchWaterfall;
    private eventKey;
    private reportError;
}
//# sourceMappingURL=remote-events.d.ts.map