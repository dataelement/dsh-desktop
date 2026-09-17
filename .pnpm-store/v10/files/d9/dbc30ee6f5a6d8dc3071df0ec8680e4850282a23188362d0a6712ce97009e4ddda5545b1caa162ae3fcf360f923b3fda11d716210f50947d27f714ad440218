import type { Logger } from "../create-logger.ts";
import type { EmitterWebhookEventName } from "../types.ts";
type ValidateEventNameOptions = {
    onUnknownEventName?: undefined | "throw";
} | {
    onUnknownEventName: "ignore";
} | {
    onUnknownEventName: "warn";
    log?: Pick<Logger, "warn">;
};
export declare function validateEventName<TOptions extends ValidateEventNameOptions = ValidateEventNameOptions>(eventName: EmitterWebhookEventName | (string & Record<never, never>), options?: TOptions): asserts eventName is TOptions extends {
    onUnknownEventName: "throw";
} ? EmitterWebhookEventName : Exclude<string, "*" | "error">;
export {};
