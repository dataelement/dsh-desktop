/**
 * The model-facing `web_fetch` tool. This module owns its schema, validation, and presentation;
 * `ctx.web` owns retrieval. Timeout is deployment policy, not a model argument: config becomes
 * `ToolDefinition.timeoutMs`, timeout policy enforces it, and this tool forwards the resulting
 * signal. A provider timeout remains a backstop for direct service callers.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { GenericCallView, ToolResult, WebFetchResultView } from '@deepseek-ai/dsh-tools';
import type { WebFetchResult } from '@deepseek-ai/dsh-web';
import { type JsonValue } from '@deepseek-ai/dsh-util-values';
/**
 * Validate value constraints the schema DSL can't express: a non-blank `url`.
 * Throws a plain `Error` otherwise. No timeout parameter — the tool-call budget
 * is deployment policy declared via `fetchTimeoutMs` config and enforced by
 * `@deepseek-ai/dsh-tool-call-timeout-policy`, not a model argument.
 *
 * @param args - the schema-validated `web_fetch` arguments.
 * @returns the arguments as the seam's request fields.
 */
export declare function parseFetchArgs(args: {
    url: string;
}): {
    url: string;
};
/**
 * Format a fetch result as one model-facing text block, bounded as a whole.
 *
 * @param result - the seam's fetch outcome.
 * @param maxOutputChars - cap on the complete returned string.
 * @returns the complete text from {@link renderFetchOutput}.
 */
export declare function formatFetchOutput(result: WebFetchResult, maxOutputChars: number): string;
/**
 * Pending-call presentation: a fetch card titled by the URL.
 *
 * @param args - the raw tool arguments; only `url` feeds the view.
 * @returns the generic card view (`kind: 'fetch'`) shown while the call runs.
 */
export declare function presentFetchCall(args: {
    url: string;
}): GenericCallView;
/**
 * The `web_fetch` tool's private `tool/result` `meta` payload: the fetch summary
 * a UI cannot recover from the model-facing render text without reparsing its
 * header line. Attached opaquely (as `JsonValue`) on the tool result and
 * persisted with the session log, so `presentResult` reproduces the fetch card
 * on replay. The body itself is already markdown in the result content, so it is
 * not duplicated here. `truncated` is the effective truncation the render text
 * reflects, which a client cannot recompute (it does not know the deployment's
 * `fetchMaxOutputChars`); this is why fetch meta is carried, not derived from the
 * header line (see the web-result-card Agent Note).
 */
export interface WebFetchMeta {
    /** The final URL after allowed redirects. */
    url: string;
    /** HTTP status code of the fetched response. */
    statusCode: number;
    /** True when the provider, a source cut, or the output cap trimmed the content. */
    truncated: boolean;
}
/**
 * Project a validated `web_fetch` output value into its replayable presentation
 * meta ({@link WebFetchMeta} as opaque JSON). `truncated` is the effective
 * truncation the model-facing text reflects (via {@link renderFetchOutput}), not
 * the provider-only `WebFetchResult.truncated`, so the fetch card never disagrees
 * with the returned text.
 *
 * @param value - the canonical `web_fetch` output value (the seam's result shape).
 * @param maxOutputChars - the deployment's output cap, the same one
 *   {@link formatFetchOutput} applies to the render text.
 * @returns the URL, status code, and effective truncation flag.
 */
export declare function fetchMetaFromValue(value: WebFetchResult, maxOutputChars: number): JsonValue;
/**
 * Narrow opaque live or replayed result metadata to a {@link WebFetchMeta}.
 * Malformed metadata returns `undefined` so presentation can fall back to the
 * generic card instead of throwing during replay.
 *
 * @param meta - result metadata.
 * @returns the validated fetch meta, or `undefined` for absent or malformed data.
 */
export declare function fetchMetaFromResult(meta: unknown): WebFetchMeta | undefined;
/**
 * Completed-call presentation: a `web` fetch card carrying the retrieval summary
 * from `meta`. It sets no `content` copy — a UI without the `web` capability
 * falls back to the raw `tool/result` content, the already-markdown body (see the
 * web-result-card Agent Note).
 *
 * @param args - the raw tool arguments; `url` becomes the result-state title so a
 *   window-truncated replay that dropped the call head still has one.
 * @param result - the final model-facing tool result; `meta` carries the summary.
 * @returns the fetch result view, or `undefined` (generic card) on failure or
 *   malformed meta.
 */
export declare function presentFetchResult(args: {
    url: string;
}, result: ToolResult): WebFetchResultView | undefined;
/**
 * Register the `web_fetch` tool and its scope-aware system-prompt guidance.
 *
 * @param ctx - context whose `tools` and `systemPrompt` registries receive the
 *   registrations; both are effect-scoped and unregister on plugin dispose.
 * @param timeoutMs - the cooperative tool-call budget (ms) attached as the tool's
 *   `ToolDefinition.timeoutMs` for `@deepseek-ai/dsh-tool-call-timeout-policy` to enforce.
 * @param maxOutputChars - cap on the complete rendered tool output (see
 *   {@link formatFetchOutput}) and on source characters converted synchronously.
 */
export declare function applyWebFetchTool(ctx: Context, timeoutMs: number, maxOutputChars: number): void;
//# sourceMappingURL=fetch.d.ts.map