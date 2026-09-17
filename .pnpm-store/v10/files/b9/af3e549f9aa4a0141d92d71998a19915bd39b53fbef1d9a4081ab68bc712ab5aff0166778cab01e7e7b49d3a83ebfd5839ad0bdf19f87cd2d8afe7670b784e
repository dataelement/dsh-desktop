/**
 * Shared route, framing, timeout, assembly, and validation policy for
 * model-backed session-title providers.
 * @module @deepseek-ai/dsh-session-title-llm
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { Message } from '@deepseek-ai/dsh-llm';
import type { SessionSeq } from '@deepseek-ai/dsh-session';
import { SessionTitleProviderId } from '@deepseek-ai/dsh-session-title';
import type { SessionTitleAutomaticMode, SessionTitleModelProvenance, SessionTitleProviderRequest, SessionTitleProviderResult, SessionTitleUserMessage } from '@deepseek-ai/dsh-session-title';
/** Exact model-visible request recorded before one auxiliary title dispatch. */
export interface SessionTitleLlmRequestEventData {
    /** Registered title-provider identity responsible for the request. */
    readonly titleProvider: SessionTitleProviderId;
    /** Exact human `user/message` seqs represented in `messages`. */
    readonly messageSeqs: SessionSeq[];
    /** Exact auxiliary LLM route. */
    readonly route: SessionTitleModelProvenance;
    /** Exact auxiliary system prompt. */
    readonly system: string;
    /** Exact auxiliary message list. */
    readonly messages: Message[];
    /** Exact auxiliary output-token cap. */
    readonly maxTokens: number;
}
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        /** Log-only pre-dispatch record of one session-title model request. */
        'session/title-llm-request': SessionTitleLlmRequestEventData;
    }
}
/** Capability-owned timeout reason code for auxiliary title requests. */
export declare const SESSION_TITLE_TIMEOUT_CODE = "SESSION_TITLE_TIMEOUT";
/** Required deployment policy for one model-backed title plugin. */
export interface SessionTitleLlmConfig {
    /** Target word count for non-CJK titles. */
    readonly targetWords: number;
    /** Target character count for Chinese, Japanese, or Korean titles. */
    readonly targetCjkCharacters: number;
    /** Maximum UTF-8 bytes in the final JSON-framed user prompt. */
    readonly maxInputBytes: number;
    /** Auxiliary generation output-token cap. */
    readonly maxOutputTokens: number;
    /** End-to-end auxiliary request deadline in milliseconds. */
    readonly timeoutMs: number;
    /** Optional explicit provider route; must be paired with `model`. */
    readonly provider?: string;
    /** Optional explicit model id; must be paired with `provider`. */
    readonly model?: string;
}
/** Validated immutable model-provider policy. */
export interface ResolvedSessionTitleLlmConfig extends SessionTitleLlmConfig {
}
/** Shared Loader field schemas with no library defaults. */
export declare const SessionTitleLlmConfigFields: {
    targetWords: z<number, number>;
    targetCjkCharacters: z<number, number>;
    maxInputBytes: z<number, number>;
    maxOutputTokens: z<number, number>;
    timeoutMs: z<number, number>;
    provider: z<string, string>;
    model: z<string, string>;
};
/** Shared Loader schema with no library defaults. */
export declare const SessionTitleLlmConfigSchema: z<SessionTitleLlmConfig>;
/**
 * Validate and detach required model-provider configuration.
 * @param config - untrusted plugin configuration.
 * @returns immutable policy with optional route absence preserved.
 */
export declare function resolveSessionTitleLlmConfig(config: SessionTitleLlmConfig): ResolvedSessionTitleLlmConfig;
/** Select the provider-owned message subset from one fixed service revision. */
export type SessionTitleLlmMessageSelector = (messages: readonly SessionTitleUserMessage[]) => readonly SessionTitleUserMessage[];
/**
 * Register one model-backed provider through the shared configuration and call policy.
 * @param ctx - context exposing the title and LLM services.
 * @param config - untrusted required deployment policy.
 * @param id - stable plugin id recorded with generated titles.
 * @param automatic - provider-owned automatic generation cadence.
 * @param selectMessages - exact source-message selection for one revision.
 */
export declare function registerSessionTitleLlmProvider(ctx: Context, config: SessionTitleLlmConfig, id: string, automatic: SessionTitleAutomaticMode, selectMessages: SessionTitleLlmMessageSelector): void;
/**
 * Generate one title through the shared auxiliary LLM call.
 * @param ctx - context exposing the registered LLM service.
 * @param config - validated model-provider policy.
 * @param request - service-owned session, route, message snapshot, and cancellation.
 * @param selectedMessages - exact provider-selected subset to frame and attribute.
 * @param titleProvider - registered title-provider identity recorded with the request.
 * @returns normalized non-empty title, exact source seqs, and used model route.
 */
export declare function generateSessionTitleWithLlm(ctx: Context, config: ResolvedSessionTitleLlmConfig, request: SessionTitleProviderRequest, selectedMessages: readonly SessionTitleUserMessage[], titleProvider: SessionTitleProviderId): Promise<SessionTitleProviderResult>;
//# sourceMappingURL=index.d.ts.map