/**
 * pi-messages API implementation.
 *
 * Streams pi's own message protocol directly to a backend: the request is a
 * single POST of `{ model, context, options }` to `<baseUrl>/messages`, the
 * response is an SSE stream of serialized assistant-message events plus a
 * terminal `done`/`error` event. This is the wire protocol spoken by the
 * Radius gateway, but any backend implementing it can be used, e.g. via a
 * models.json custom provider with `"api": "pi-messages"`.
 */
import type { AssistantMessage, SimpleStreamOptions, StreamFunction, StreamOptions, ThinkingLevel, ToolCall } from "../types.ts";
export interface PiMessagesOptions extends StreamOptions {
    reasoning?: ThinkingLevel;
    toolChoice?: "auto" | "none" | "required" | {
        type: "function";
        function: {
            name: string;
        };
    };
    /** Ask the backend for debug metadata (e.g. routing response headers). */
    debug?: boolean;
}
type PiMessagesUsage = AssistantMessage["usage"];
type PiMessagesStopReason = AssistantMessage["stopReason"];
/** Impact summary of a server-side message rewrite (e.g. a gateway policy). */
export type PiMessagesRewriteImpact = {
    policyId: string;
    policyVersion: number;
    changed: boolean;
    tokenCountChange: number;
    messageCountChange: number;
    systemPromptChanged: boolean;
};
/** Serialized assistant-message event as sent by a pi-messages backend. */
export type PiMessagesEvent = {
    type: "start";
} | {
    type: "text_start";
    contentIndex: number;
} | {
    type: "text_delta";
    contentIndex: number;
    delta: string;
} | {
    type: "text_end";
    contentIndex: number;
    content: string;
    contentSignature?: string;
} | {
    type: "thinking_start";
    contentIndex: number;
} | {
    type: "thinking_delta";
    contentIndex: number;
    delta: string;
} | {
    type: "thinking_end";
    contentIndex: number;
    content: string;
    contentSignature?: string;
    redacted?: boolean;
} | {
    type: "toolcall_start";
    contentIndex: number;
    id: string;
    toolName: string;
} | {
    type: "toolcall_delta";
    contentIndex: number;
    delta: string;
} | {
    type: "toolcall_end";
    contentIndex: number;
    toolCall: ToolCall;
} | {
    type: "done";
    reason: Extract<PiMessagesStopReason, "stop" | "length" | "toolUse">;
    usage: PiMessagesUsage;
    responseId?: string;
    providerThinkingLevel?: string;
    rewrite?: PiMessagesRewriteImpact;
} | {
    type: "error";
    reason: Extract<PiMessagesStopReason, "aborted" | "error">;
    usage: PiMessagesUsage;
    errorMessage?: string;
    responseId?: string;
    providerThinkingLevel?: string;
    rewrite?: PiMessagesRewriteImpact;
};
export declare class PiMessagesResponseError extends Error {
    code?: string;
    readonly diagnosticDetails: Record<string, unknown>;
    constructor(message: string, code: string | undefined, diagnosticDetails: Record<string, unknown>);
}
export declare const stream: StreamFunction<"pi-messages", PiMessagesOptions>;
export declare const streamSimple: StreamFunction<"pi-messages", SimpleStreamOptions>;
export {};
//# sourceMappingURL=pi-messages.d.ts.map