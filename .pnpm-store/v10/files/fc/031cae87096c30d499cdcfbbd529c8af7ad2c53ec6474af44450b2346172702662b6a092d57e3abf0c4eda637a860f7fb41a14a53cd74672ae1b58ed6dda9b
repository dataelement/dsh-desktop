import type { ResponseCreateParamsStreaming } from "openai/resources/responses/responses.js";
import type { SimpleStreamOptions, StreamFunction, StreamOptions } from "../types.ts";
export interface OpenAICodexResponsesOptions extends StreamOptions {
    reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
    reasoningSummary?: "auto" | "concise" | "detailed" | "off" | "on" | null;
    serviceTier?: ResponseCreateParamsStreaming["service_tier"];
    textVerbosity?: "low" | "medium" | "high";
    toolChoice?: "auto" | "none" | "required";
}
export declare const stream: StreamFunction<"openai-codex-responses", OpenAICodexResponsesOptions>;
export declare const streamSimple: StreamFunction<"openai-codex-responses", SimpleStreamOptions>;
export interface OpenAICodexWebSocketDebugStats {
    requests: number;
    connectionsCreated: number;
    connectionsReused: number;
    cachedContextRequests: number;
    storeTrueRequests: number;
    fullContextRequests: number;
    deltaRequests: number;
    lastInputItems: number;
    lastDeltaInputItems?: number;
    lastPreviousResponseId?: string;
    websocketFailures: number;
    sseFallbacks: number;
    websocketFallbackActive?: boolean;
    lastWebSocketError?: string;
}
export declare function getOpenAICodexWebSocketDebugStats(sessionId: string): OpenAICodexWebSocketDebugStats | undefined;
export declare function resetOpenAICodexWebSocketDebugStats(sessionId?: string): void;
export declare function closeOpenAICodexWebSocketSessions(sessionId?: string): void;
//# sourceMappingURL=openai-codex-responses.d.ts.map