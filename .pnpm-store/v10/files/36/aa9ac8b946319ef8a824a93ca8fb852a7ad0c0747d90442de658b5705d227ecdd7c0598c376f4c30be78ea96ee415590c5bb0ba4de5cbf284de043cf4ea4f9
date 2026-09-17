import type { RequestError } from "@octokit/request-error";
import type { webhooks as OpenAPIWebhooks } from "@octokit/openapi-webhooks-types";
import type { EventPayloadMap } from "./generated/webhook-identifiers.ts";
import type { Logger } from "./create-logger.ts";
import type { EventHandler } from "./event-handler/index.ts";
import type { emitterEventNames } from "./generated/webhook-names.ts";
export type WebhookEventName = keyof EventPayloadMap;
export type ExtractEvents<TEventName> = TEventName extends `${infer _TWebhookEvent}.${infer _TAction}` ? never : TEventName;
export type WebhookEvents = ExtractEvents<EmitterWebhookEventName>;
export type WebhookEventDefinition<TEventName extends keyof OpenAPIWebhooks> = OpenAPIWebhooks[TEventName]["post"]["requestBody"]["content"]["application/json"];
export type EmitterWebhookEventName = (typeof emitterEventNames)[number];
export type EmitterWebhookEvent<TEmitterEvent extends EmitterWebhookEventName = EmitterWebhookEventName> = TEmitterEvent extends `${infer TWebhookEvent}.${infer TAction}` ? BaseWebhookEvent<Extract<TWebhookEvent, WebhookEventName>> & {
    payload: {
        action: TAction;
    };
} : BaseWebhookEvent<Extract<TEmitterEvent, WebhookEventName>>;
export type EmitterWebhookEventWithStringPayloadAndSignature = {
    id: string;
    name: string;
    payload: string;
    signature: string;
};
interface BaseWebhookEvent<TName extends WebhookEventName> {
    id: string;
    name: TName;
    payload: EventPayloadMap[TName];
}
export interface Options<TTransformed = unknown> {
    secret?: string;
    additionalSecrets?: string[] | undefined;
    transform?: TransformMethod<TTransformed>;
    log?: Partial<Logger>;
}
type TransformMethod<T> = (event: EmitterWebhookEvent) => T | PromiseLike<T>;
export type HandlerFunction<TName extends EmitterWebhookEventName, TTransformed = unknown> = (event: EmitterWebhookEvent<TName> & TTransformed) => any;
export type RemoveHandlerFunction<TName extends EmitterWebhookEventName | "*", TTransformed = unknown> = (event: EmitterWebhookEvent<Exclude<TName, "*">> & TTransformed) => any;
type Hooks = {
    [key: string]: Function[];
};
export interface State extends Options<any> {
    eventHandler?: EventHandler<unknown>;
    hooks: Hooks;
    log: Logger;
}
/**
 * Error object with optional properties coming from `octokit.request` errors
 */
export type WebhookError = Error & Partial<RequestError> & {
    event?: EmitterWebhookEventWithStringPayloadAndSignature | undefined;
};
export interface AggregateWebhookError extends AggregateError {
    errors: WebhookError[];
}
export interface WebhookEventHandlerError<TTransformed = unknown> extends AggregateWebhookError {
    event: TTransformed extends unknown ? EmitterWebhookEvent : EmitterWebhookEvent & TTransformed;
}
export {};
