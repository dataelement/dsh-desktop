/**
 * The model-facing `web_search` tool: discover current information on the web.
 * Execution goes through `ctx.web` — this module owns only the model-facing
 * schema, argument validation, the result-count bound, and result formatting,
 * never provider selection or network access.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { GenericCallView, ToolResult, WebSearchResultView, WebSource } from '@deepseek-ai/dsh-tools';
import type { JsonValue } from '@deepseek-ai/dsh-util-values';
import type { WebSearchResult } from '@deepseek-ai/dsh-web';
/**
 * Default upper bound on returned sources (the `searchMaxResults` config).
 * The consumer owns the returned-context limit; providers and models do not.
 */
export declare const WEB_SEARCH_MAX_RESULTS = 8;
/** Default upper bound on concurrent searches in one tool call. */
export declare const WEB_SEARCH_MAX_QUERIES = 4;
/** Model-facing `web_search` arguments. */
interface WebSearchArgs {
    queries: string[];
}
/**
 * Validate value constraints the schema DSL can't express: `queries` is
 * non-empty, contains only non-blank strings, and fits the deployment's
 * query-count bound. Exact duplicate strings are collapsed after the bound
 * check. Throws a plain `Error` otherwise.
 *
 * @param args - the schema-validated `web_search` arguments.
 * @param maxQueries - the deployment's upper bound on queries in one call.
 * @returns the accepted queries in their first-occurrence order.
 */
export declare function parseSearchArgs(args: WebSearchArgs, maxQueries: number): string[];
/**
 * Format a search result as one model-facing text block.
 *
 * @param result - the seam's search outcome.
 * @returns the provider answer (when any), a markdown source list with snippet
 *   and date metadata (or `No results found.`), a refine-the-query note when
 *   truncated, and a standing cite-your-sources instruction.
 */
export declare function formatSearchOutput(result: WebSearchResult): string;
/**
 * Pending-call presentation: a search card titled by the query list.
 *
 * @param args - the raw tool arguments; only the query text feeds the view.
 * @returns the generic card view (`kind: 'search'`) shown while the call runs.
 */
export declare function presentSearchCall(args: WebSearchArgs): GenericCallView;
/**
 * The `web_search` tool's private `tool/result` `meta` payload: the structured
 * sources, the optional provider answer, and the truncation flag. Attached
 * opaquely (as `JsonValue`) on the tool result and persisted with the session
 * log, so `presentResult` reproduces the search card on replay. This projection
 * is the only faithful route to the per-source fields, which the lossy render
 * text cannot carry (the owning rationale is the web-result-card Agent Note).
 */
export interface WebSearchMeta {
    /** The faithful structured sources, in result order. */
    sources: WebSource[];
    /** True when the seam or multi-query merge cut the source list to honor the result cap. */
    truncated: boolean;
    /** The provider-generated answer text, when any. */
    answer?: string;
}
/**
 * Project a validated `web_search` output value into its replayable
 * presentation meta ({@link WebSearchMeta} as opaque JSON).
 *
 * @param value - the canonical `web_search` output value (the seam's result shape).
 * @returns the structured sources, the truncation flag, and the answer when present.
 */
export declare function searchMetaFromValue(value: WebSearchResult): JsonValue;
/**
 * Narrow opaque live or replayed result metadata to a {@link WebSearchMeta}.
 * Malformed metadata returns `undefined` so presentation can fall back to the
 * generic card instead of throwing during replay.
 *
 * @param meta - result metadata.
 * @returns the validated search meta, or `undefined` for absent or malformed data.
 */
export declare function searchMetaFromResult(meta: unknown): WebSearchMeta | undefined;
/**
 * Completed-call presentation: a `web` search card carrying the faithful
 * structured sources from `meta`. It sets no `content` copy — a UI without the
 * `web` capability falls back to the raw `tool/result` content, which is the
 * same text (see the web-result-card Agent Note).
 *
 * @param args - the raw tool arguments; the queries become the result-state
 *   title so a window-truncated replay that dropped the call head still has one.
 * @param result - the final model-facing tool result; `meta` carries the sources.
 * @returns the search result view, or `undefined` (generic card) on failure or
 *   malformed meta.
 */
export declare function presentSearchResult(args: WebSearchArgs, result: ToolResult): WebSearchResultView | undefined;
/**
 * Register the `web_search` tool and its system-prompt guidance.
 *
 * @param ctx - context whose `tools` and `systemPrompt` registries receive the
 *   registrations; both are effect-scoped and unregister on plugin dispose.
 * @param maxResults - the deployment's source cap, sent as every seam
 *   request's `maxResults`.
 * @param maxQueries - the deployment's query cap enforced before provider calls.
 * @param timeoutMs - the cooperative tool-call budget (ms) attached as the tool's
 *   `ToolDefinition.timeoutMs` for `@deepseek-ai/dsh-tool-call-timeout-policy` to enforce.
 * @param fetchEnabled - whether the same composition exposes `web_fetch`, which
 *   permits recommending that follow-up tool when it is also visible at assembly.
 */
export declare function applyWebSearchTool(ctx: Context, maxResults: number, maxQueries: number, timeoutMs: number, fetchEnabled: boolean): void;
export {};
//# sourceMappingURL=search.d.ts.map