/**
 * Model-facing `web_search` and `web_fetch` tools over `ctx.web`. This package owns schemas,
 * validation, prompt guidance, limits, and presentation, never concrete providers. Enablement
 * controls tool registration; an enabled tool remains visible when its provider is unavailable
 * and fails with a structured error at execution time.
 * @module @deepseek-ai/dsh-tool-web
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export { WEB_SEARCH_MAX_QUERIES, WEB_SEARCH_MAX_RESULTS, applyWebSearchTool, formatSearchOutput, presentSearchCall, presentSearchResult, searchMetaFromValue, searchMetaFromResult } from './search.ts';
export type { WebSearchMeta } from './search.ts';
export { applyWebFetchTool, formatFetchOutput, parseFetchArgs, presentFetchCall, presentFetchResult, fetchMetaFromValue, fetchMetaFromResult } from './fetch.ts';
export type { WebFetchMeta } from './fetch.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "tool-web";
/** Services required by the web tool suite. */
export declare const inject: string[];
/** Default cooperative tool-call timeout budget (ms) for the web tools. */
export declare const DEFAULT_WEB_TOOL_TIMEOUT_MS = 30000;
/**
 * Default cap on one `web_fetch` output and on source characters converted
 * synchronously. This leaves headroom above the local provider's default
 * 100,000-character body cap while bounding custom providers and rendered output.
 */
export declare const DEFAULT_FETCH_MAX_OUTPUT_CHARS = 200000;
/** Plugin config: which web tools to register, search bounds, per-tool budgets, and the fetch output cap. */
export interface Config {
    /** Register `web_search`. Defaults to true. */
    search?: boolean;
    /** Register `web_fetch`. Defaults to true. */
    fetch?: boolean;
    /** Upper bound on sources returned by one `web_search` call. */
    searchMaxResults?: number;
    /** Upper bound on queries accepted by one `web_search` call. */
    searchMaxQueries?: number;
    /** Cooperative timeout budget (ms) for `web_fetch`. Defaults to 30000. */
    fetchTimeoutMs?: number;
    /** Cooperative timeout budget (ms) for `web_search`. Defaults to 30000. */
    searchTimeoutMs?: number;
    /** Cap on source characters converted and complete `web_fetch` output characters. Defaults to 200000. */
    fetchMaxOutputChars?: number;
}
export declare const Config: z<Config>;
/**
 * Register the enabled web tools. `search`/`fetch` default to true; a product
 * that wants only one disables the other in config. Each tool's cooperative
 * timeout budget (`fetchTimeoutMs`/`searchTimeoutMs`, default 30000) is resolved
 * here and attached to the tool as `ToolDefinition.timeoutMs` for
 * `@deepseek-ai/dsh-tool-call-timeout-policy` to enforce. The tools' disposers are
 * fiber-scoped (the effect-based registries clean up on dispose), so no manual
 * teardown is needed.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map