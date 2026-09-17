import type { EmitterWebhookEvent, EmitterWebhookEventName, HandlerFunction, Options, WebhookError, WebhookEventHandlerError } from "../types.ts";
export interface EventHandler<TTransformed = unknown> {
    on<E extends EmitterWebhookEventName>(event: E | E[], callback: HandlerFunction<E, TTransformed>): void;
    onAny(handler: (event: TTransformed extends unknown ? EmitterWebhookEvent : EmitterWebhookEvent & TTransformed) => any): void;
    onError(handler: (event: WebhookEventHandlerError<TTransformed>) => any): void;
    removeListener<E extends EmitterWebhookEventName>(event: E | E[], callback: HandlerFunction<E, TTransformed>): void;
    receive(event: EmitterWebhookEvent | WebhookError): Promise<void>;
}
export declare function createEventHandler<TTransformed = unknown>(options: Options<TTransformed>): EventHandler<TTransformed>;
