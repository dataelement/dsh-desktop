/**
 * Register a {@link DeepSeekAdapter} for the `deepseek-official` provider route on
 * `ctx.llm`, with connection facts resolved per request instead of frozen at
 * load: the plugin layers its `cordis.yml` entry config under the optional
 * `llm-deepseek` user-settings section (`ctx.settings`) and resolves the API
 * key through the optional credential seam (`ctx.credentials`), so a changed
 * base URL, catalog, or key reaches the very next request without restarting
 * anything, while an in-flight stream keeps the facts it started with. The
 * one registration-captured fact — the retry policy — re-registers the route
 * in place when it changes.
 * @module @deepseek-ai/dsh-llm-deepseek
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { RetryPolicyConfig } from '@deepseek-ai/dsh-llm';
import { type LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment';
import type { DeepSeekCatalogModel, DeepSeekConnectionOptions } from './adapter.ts';
export { DEFAULT_CONTEXT_WINDOW, DEFAULT_FILE_EXPIRY_SECONDS, DEFAULT_FILE_QUOTA_CLEANUP_BATCH, DEFAULT_FILE_REFRESH_MARGIN_SECONDS, DEFAULT_FILES_API_TIMEOUT_MS, DEFAULT_IMAGE_OFFLOAD_BYTE_QUANTUM, DEFAULT_IMAGE_OFFLOAD_COUNT_QUANTUM, DEFAULT_INLINE_IMAGE_OFFLOAD_BYTE_QUANTUM, DEFAULT_MAX_INLINE_REQUEST_IMAGE_BYTES, DEFAULT_MAX_TOKENS, DEFAULT_STREAM_IDLE_TIMEOUT_MS, DeepSeekAdapter, } from './adapter.ts';
export type { DeepSeekAdapterOptions, DeepSeekCatalogModel, DeepSeekConnectionOptions } from './adapter.ts';
export { DEFAULT_LOW_DETAIL_IMAGE_PIXEL_BUDGET, DEFAULT_MAX_IMAGES_PER_REQUEST, DEFAULT_MAX_REQUEST_FILES_BYTES, DEFAULT_REQUEST_IMAGE_MAX_BYTES, DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET, deepSeekImageRequestPricing, resolveRequestImagePolicy, } from './request-pricing.ts';
export { deepSeekImageTokens } from './image-tokens.ts';
export { DeepSeekFileStore, MAX_CHAT_IMAGE_BYTES } from './file-store.ts';
export type { DeepSeekFileConnection, DeepSeekFilePolicy, DeepSeekFileReference } from './file-store.ts';
export { DeepSeekFilesClient, MAX_FILE_EXPIRY_SECONDS, MAX_FILE_UPLOAD_BYTES, MAX_STORED_FILE_BYTES, MAX_STORED_FILE_COUNT, MIN_FILE_EXPIRY_SECONDS } from './files-api.ts';
export type { DeepSeekFileObject, DeepSeekFilePage } from './files-api.ts';
export { DeepSeekFileId } from './file-id.ts';
export type { DeepSeekFileId as DeepSeekFileIdType } from './file-id.ts';
export { DeepSeekUploadIndex, deepSeekFileScope } from './upload-index.ts';
export type { DeepSeekUploadRecord } from './upload-index.ts';
export type { RequestDefaults } from './serialize.ts';
export type * from './types.ts';
export declare const name = "llm-deepseek";
export declare const inject: string[];
/**
 * Plugin config, validated by the same-named schemastery schema and doubling
 * as the `llm-deepseek` settings-section shape. Every field is optional in
 * yml: a missing API key resolves through {@link Config.apiKeyEnv} at each
 * request (a request without any key fails with `MISSING_CREDENTIAL`, not at
 * plugin load), omitted thinking mode uses the provider default, and omitted
 * reasoning effort resolves to `high`.
 */
export interface Config {
    /** Credential reference (environment-variable name) resolved per request; defaults to `DEEPSEEK_API_KEY`. */
    apiKeyEnv?: string;
    /** Endpoint base; falls back to $DEEPSEEK_BASE_URL from a trusted environment layer, then the public API. */
    baseURL?: string;
    /** Deployment thinking policy; `disabled` limits every conversation request to `off`. */
    thinking?: 'enabled' | 'disabled';
    /** Default thinking effort (default `high`); `off` disables thinking per request. */
    reasoningEffort?: 'off' | 'low' | 'high' | 'max';
    /** Default per-request output cap (default 256,000); a model's own cap and explicit request values win. */
    maxTokens?: number;
    /** Positive context capacity used when the selected model has no exact value (default 1,000,000). */
    defaultContextWindow?: number;
    /** Advisory models shown by discovery consumers; defaults to V41 Flash, V4 Flash, V4 Pro, and V4 Flash Vision Exp. */
    models?: DeepSeekCatalogModel[];
    /** Maximum provider idle time while one stream read is outstanding (default five minutes). */
    streamIdleTimeoutMs?: number;
    /** Maximum accumulated file-referenced image bytes per chat request (default 128 MiB). */
    maxRequestFilesBytes?: number;
    /** Maximum accumulated base64 image payload after Files API fallback (default 20 MiB). */
    maxInlineRequestImageBytes?: number;
    /** Maximum number of represented images per chat request (default 600). */
    maxImagesPerRequest?: number;
    /** Raw-byte removal step after the request exceeds its file bound (default 64 MiB). */
    imageOffloadByteQuantum?: number;
    /** Base64-byte removal step after inline fallback exceeds its bound (default 10 MiB). */
    inlineImageOffloadByteQuantum?: number;
    /** Image-count removal step after the request exceeds its count bound (default 20). */
    imageOffloadCountQuantum?: number;
    /** Maximum duration of one request-image Files API resolution (default one minute). */
    filesApiTimeoutMs?: number;
    /** Explicit lifetime assigned to each uploaded image (default seven days). */
    fileExpiresAfterSeconds?: number;
    /** Remaining lifetime below which an indexed file is replaced (default one hour). */
    fileRefreshMarginSeconds?: number;
    /** Oldest harness-owned files deleted before one quota-recovery upload retry (default 100). */
    fileQuotaCleanupBatch?: number;
    /** Provider-owned model-request retry policy; omission uses normal mode with five retries. */
    retryPolicy?: RetryPolicyConfig;
}
export declare const Config: z<Config>;
/** Public API default; the internal endpoint comes from $DEEPSEEK_BASE_URL. */
export declare const PUBLIC_BASE_URL = "https://api.deepseek.com";
/**
 * One resolution's complete request facts. Connection and credential facts
 * are one value on purpose: a snapshot the resolver rejects keeps the whole
 * previous generation, so a request can never pair a stale endpoint with a
 * newer key.
 */
export type ResolvedDeepSeekOptions = DeepSeekConnectionOptions;
/**
 * The one explicit resolve step from raw config to validated connection
 * facts. Programmatic construction may bypass Schemastery normalization, so
 * every default and bound is re-judged here — for the composition entry at
 * load (fail loud) and for each settings snapshot at its first use.
 * @param config - raw plugin config or resolved settings snapshot.
 * @param environment - this run's environment layers, or `undefined` outside
 * the product CLI. Every layer may supply an endpoint: the product trusts the
 * project it is launched in, so a checkout can point its own agent at the
 * gateway that checkout is meant to use.
 * @returns validated connection facts plus the credential reference.
 */
export declare function resolveAdapterOptions(config: Config, environment?: LaunchEnvironmentSnapshot): ResolvedDeepSeekOptions;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map