/**
 * `DeepSeekAdapter`: fetch + SSE against a DeepSeek (OpenAI-compatible)
 * chat-completions endpoint, emitting harness StreamChunks. The adapter is
 * transport-only: connection facts arrive through a thunk resolved once per
 * operation and the bearer token through a per-request resolver, so the
 * registering plugin owns validation, layering, and credential policy.
 *
 * @module dsh-llm-deepseek/adapter
 */
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, ImageAttachmentAccess, LlmModelInfo, LlmProviderInfo, PreparedAdapterCall, LlmResolvedModelInfo, ModelModality, ResolvedRetryPolicy, StreamChunk, SystemPromptUpdate } from '@deepseek-ai/dsh-llm';
import type { AttachmentStore, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { CredentialRef } from '@deepseek-ai/dsh-credentials';
import type { AnonymousUserId } from '@deepseek-ai/dsh-anonymous-user-id';
import type { DeepSeekLlmApiExtensionRequest, PreparedDeepSeekLlmApiExtensions } from '@deepseek-ai/dsh-deepseek-llm-api-extensions';
import type { RequestDefaults } from './serialize.ts';
import { DeepSeekFileStore } from './file-store.ts';
import type { DeepSeekFilePolicy } from './file-store.ts';
import type { WireError } from './types.ts';
/** One optional model entry advertised by the direct-fetch adapter. */
export interface DeepSeekCatalogModel {
    /** Wire model id accepted by the configured endpoint. */
    id: string;
    /** Selector label; defaults to {@link id}. */
    name?: string;
    /** Optional selector detail for deployments with similar model variants. */
    description?: string;
    /** Known combined request/response context capacity; omitted when deployment metadata is unavailable. */
    contextWindow?: number;
    /** Per-request output cap for this model; omission falls back to the profile's {@link DeepSeekConnectionOptions.maxTokens}. */
    maxTokens?: number;
    /** Accepted request modalities; omission is text-only. */
    inputModalities?: ModelModality[];
    /** Total-pixel budget for one deterministic request preview, or the 512-by-512 `low` preset. */
    imagePixelBudget?: number | 'low';
    /** Encoded-byte target for one deterministic request preview; the smallest quality-ladder output is used when no quality fits. */
    imageMaxBytes?: number;
    /**
     * `'in-history'` declares that the endpoint reads the latest `system`
     * message at any position of the conversation as the complete effective
     * system prompt; omission means only a leading system message is read.
     */
    systemPromptUpdate?: SystemPromptUpdate;
}
/**
 * Validated connection facts for one operation. The plugin's
 * `resolveAdapterOptions` is the one explicit resolve step producing this
 * shape; the adapter trusts it and re-reads it per operation, which is what
 * makes a configuration change reach the next request without re-registration.
 */
export interface DeepSeekConnectionOptions {
    /** Endpoint base; `/chat/completions` is appended. */
    baseURL: string;
    /**
     * Credential reference of this same resolution, resolved per request.
     * Travelling with the endpoint is the point: a request can never pair one
     * generation's URL with another generation's secret. Configuration carries
     * only this name — a literal key is not a configuration value.
     */
    apiKeyEnv: CredentialRef;
    /** Request defaults applied to every call (thinking mode, effort). */
    defaults: RequestDefaults;
    /** Default per-request output cap; explicit request values win. */
    maxTokens: number;
    /** Positive context capacity used when the selected model has no exact value. */
    defaultContextWindow: number;
    /** Advisory models exposed to discovery consumers; requests remain unrestricted. */
    models: readonly DeepSeekCatalogModel[];
    /** Maximum provider idle time while one stream read is outstanding. */
    streamIdleTimeoutMs: number;
    /** Maximum accumulated file-referenced image bytes in one request. */
    maxRequestFilesBytes: number;
    /** Maximum accumulated base64 image payload after Files API fallback. */
    maxInlineRequestImageBytes: number;
    /** Maximum number of represented images in one request. */
    maxImagesPerRequest: number;
    /** Raw-byte removal step after the file-reference bound is exceeded. */
    imageOffloadByteQuantum: number;
    /** Base64-byte removal step after the inline fallback bound is exceeded. */
    inlineImageOffloadByteQuantum: number;
    /** Image-count removal step after the count bound is exceeded. */
    imageOffloadCountQuantum: number;
    /** Maximum duration of one request-image Files API resolution. */
    filesApiTimeoutMs: number;
    /** Upload expiry, refresh, and quota-recovery policy. */
    filePolicy: DeepSeekFilePolicy;
    /** Provider-owned model-request retry policy, already resolved. */
    retryPolicy: ResolvedRetryPolicy;
}
/** Constructor options for {@link DeepSeekAdapter}: the operation-local resolution hooks the plugin owns. */
export interface DeepSeekAdapterOptions {
    /** Current validated connection facts; called once per operation. */
    options: () => DeepSeekConnectionOptions;
    /**
     * Resolve the bearer token for the connection facts of one request. The
     * snapshot is passed in — never re-read — so the key can only ever come
     * from the same resolution as the endpoint it is sent to. Throws `LlmError`
     * `MISSING_CREDENTIAL` when no key is available anywhere.
     */
    resolveApiKey: (connection: DeepSeekConnectionOptions) => Promise<string>;
    /** Resolve the harness-home anonymous id shared with telemetry and feedback. */
    resolveUserId: () => AnonymousUserId;
    /** Resolve the current durable attachment service; absence rejects image input. */
    resolveAttachments?: () => AttachmentStore | undefined;
    /** Bridge one attachment reference into the current model-tool execution world. */
    resolveImageAccess?: (attachments: AttachmentStore, ref: ImageAttachmentRef) => ImageAttachmentAccess | undefined;
    /** Resolve the process-wide upload reuse store. */
    resolveFiles?: () => DeepSeekFileStore;
    /** Prepare the official API's plugin-contributed top-level fields for one exact wire request. */
    prepareExtensions: (request: DeepSeekLlmApiExtensionRequest) => Promise<PreparedDeepSeekLlmApiExtensions>;
}
/** Default maximum idle interval while an adapter stream read is outstanding. */
export declare const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300000;
/** Default combined request/response context capacity. */
export declare const DEFAULT_CONTEXT_WINDOW = 1000000;
/** Default per-request output-token cap. */
export declare const DEFAULT_MAX_TOKENS = 256000;
/** Default bound on accumulated base64 image payload after Files API fallback. */
export declare const DEFAULT_MAX_INLINE_REQUEST_IMAGE_BYTES: number;
/** Deterministic raw-byte removal step. */
export declare const DEFAULT_IMAGE_OFFLOAD_BYTE_QUANTUM: number;
/** Deterministic base64-byte removal step after Files API fallback. */
export declare const DEFAULT_INLINE_IMAGE_OFFLOAD_BYTE_QUANTUM: number;
/** Deterministic image-count removal step. */
export declare const DEFAULT_IMAGE_OFFLOAD_COUNT_QUANTUM = 20;
/** Default explicit lifetime for uploaded images. */
export declare const DEFAULT_FILE_EXPIRY_SECONDS: number;
/** Default proactive refresh window for indexed file ids. */
export declare const DEFAULT_FILE_REFRESH_MARGIN_SECONDS: number;
/** Default number of oldest harness-owned files removed on quota recovery. */
export declare const DEFAULT_FILE_QUOTA_CLEANUP_BATCH = 100;
/** Default deadline for resolving one request image through the Files API. */
export declare const DEFAULT_FILES_API_TIMEOUT_MS = 60000;
/**
 * Map an HTTP status to a stable LlmError code.
 * @param status - status of a non-2xx provider response.
 * @param error - parsed provider error body, when available.
 * @returns the normalized harness error code.
 */
export declare function httpErrorCode(status: number, error?: WireError['error']): string;
/**
 * The first real `LlmAdapter`. One instance serves every model name it was
 * registered under (the harness model name IS the wire model name).
 *
 * One stable signal reaches both initial fetch and body reads. Caller aborts
 * map to `ABORTED`; the configured per-read idle watchdog maps to `TIMEOUT`.
 */
export declare class DeepSeekAdapter extends LlmAdapter {
    private readonly config;
    private readonly files;
    constructor(config: DeepSeekAdapterOptions);
    providerInfo(provider: string): LlmProviderInfo;
    providerRetryPolicy(_provider: string): ResolvedRetryPolicy;
    imageRequestPricing(_provider: string, model: string): ReturnType<LlmAdapter['imageRequestPricing']>;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    resolveModel(provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    private modelInfoFor;
    prepareCall(provider: string, model: string, _signal?: AbortSignal): Promise<PreparedAdapterCall>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
    private streamWithConnection;
    private request;
}
//# sourceMappingURL=adapter.d.ts.map