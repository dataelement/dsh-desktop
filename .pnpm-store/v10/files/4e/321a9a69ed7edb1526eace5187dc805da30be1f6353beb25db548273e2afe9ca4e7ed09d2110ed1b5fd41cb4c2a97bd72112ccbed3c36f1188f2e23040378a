import type { EmitterWebhookEventWithStringPayloadAndSignature, State } from "./types.ts";
import type { EventHandler } from "./event-handler/index.ts";
export declare function verifyAndReceive(state: State & {
    secret: string;
    eventHandler: EventHandler<unknown>;
}, event: EmitterWebhookEventWithStringPayloadAndSignature): Promise<void>;
