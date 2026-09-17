import type { EmitterWebhookEvent, EmitterWebhookEventName, State, WebhookEventHandlerError } from "../types.ts";
export declare function receiverOn(state: State, webhookNameOrNames: EmitterWebhookEventName | EmitterWebhookEventName[], handler: Function): void;
export declare function receiverOnAny<TTransformed>(state: State, handler: (event: TTransformed extends unknown ? EmitterWebhookEvent : EmitterWebhookEvent & TTransformed) => any): void;
export declare function receiverOnError<TTransformed>(state: State, handler: (event: WebhookEventHandlerError<TTransformed>) => any): void;
