/**
 * Register a DeepSeek-backed provider in `ctx.web`. It calls the Anthropic-compatible Messages API
 * with native `web_search_20250305`. The provider reuses `DEEPSEEK_API_KEY` but not
 * `DEEPSEEK_BASE_URL`, because search and chat-completions use different bases.
 * @module @deepseek-ai/dsh-web-search-deepseek
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export { DeepSeekSearchProvider, DEEPSEEK_DEFAULT_API_VERSION, DEEPSEEK_DEFAULT_BASE_URL, DEEPSEEK_DEFAULT_MAX_TOKENS, DEEPSEEK_DEFAULT_MAX_USES, DEEPSEEK_DEFAULT_MODEL, DEEPSEEK_PROVIDER_ID, } from './provider.ts';
export type { DeepSeekSearchLlmRequest, DeepSeekSearchProviderOptions } from './provider.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "web-search-deepseek";
/** The web seam this provider registers into. */
export declare const inject: string[];
/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
    /** Literal DeepSeek API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
    apiKey?: string;
    /** Credential reference resolved for each search; defaults to `DEEPSEEK_API_KEY`. */
    apiKeyEnv?: string;
    /** Anthropic-compatible endpoint base; `/messages` is appended. */
    baseURL?: string;
    /** Anthropic-format model name. Defaults to `deepseek-v4-flash`. */
    model?: string;
    /** `anthropic-version` header value. Defaults to `2023-06-01`. */
    apiVersion?: string;
    /** Upper bound on generated tokens for the Messages request. Defaults to 4096. */
    maxTokens?: number;
    /** Maximum `web_search` server-tool uses per request. Defaults to 5. */
    maxUses?: number;
}
export declare const Config: z<Config>;
/** Settings namespace carrying this provider's endpoint, model, and key reference. */
export declare const WEB_SEARCH_DEEPSEEK_SETTINGS_NAMESPACE = "web-search-deepseek";
/** Register the DeepSeek search provider with `ctx.web`. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map