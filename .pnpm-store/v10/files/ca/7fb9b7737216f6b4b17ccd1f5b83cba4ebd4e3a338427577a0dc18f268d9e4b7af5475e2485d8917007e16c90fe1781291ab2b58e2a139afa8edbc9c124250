/**
 * The spill-policy PLUGIN: a `tools/post-execute` result transformer that keeps
 * oversized plain-text tool results out of the model's context. When a final
 * result's UTF-8 size exceeds `maxInlineBytes`, it saves the FULL text to a
 * session-scoped spill artifact (`ctx.spillStore`) and replaces the
 * model-facing result with a bounded head/tail preview plus the backend's
 * locator and retrieval guidance.
 *
 * It registers NO service and owns NO storage or preview mechanics: preview is
 * `@deepseek-ai/dsh-output-retention` (`TextRetainer`), storage is `ctx.spillStore`.
 * The policy only decides WHEN to spill and composes the notice.
 *
 * A second arm applies the SAME cap to the durable log: the
 * `tools/ptc-dispatch-log` waterfall bounds the `tool/ptc-dispatch` event's
 * copy of an oversized `run_code` sub-call result (the program's value is
 * untouched; UIs and replay read the full text through the spill artifact).
 *
 * ## Deliberately narrow
 *
 * - Omitted `maxInlineBytes` ⇒ the plugin registers nothing (a true no-op).
 * - Plain-text results only: a result carrying any non-text block is left
 *   untouched (the policy knows only the final formatted text, not tool
 *   internals).
 * - Nested composite calls skip the MODEL-facing arm; their durable log copy
 *   is bounded by the dispatch-log arm instead.
 * - Accepted value replacements pass through for registry revalidation and
 *   rendering; this presentation policy cannot also replace content in the
 *   same mutually exclusive decision.
 * - `read` is skipped by the model-facing arm to avoid a
 *   `read → spill → read again` loop; the dispatch-log arm bounds `read`
 *   sub-calls too (a log copy is not model context, and `read` is precisely
 *   the tool that produces huge logs).
 * - Best-effort: no session owner, no `ctx.spillStore` backend, or a save
 *   failure ⇒ log and return the original result. A spill failure must NEVER
 *   turn a successful tool call into an `isError` or hide the inline result.
 *
 * It COMPOSES with other post-execute listeners: its prepended listener
 * delegates via `next()` and bounds the resulting content projection, so
 * tool-owned asynchronous projection runs before generic bounding, a hook that
 * replaced content still has its replacement bounded, and value replacements
 * and `block` decisions pass through unchanged.
 *
 * @module @deepseek-ai/dsh-spill-policy
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export type { SpillPolicyExec } from './types.ts';
/** Plugin config. */
export interface Config {
    /**
     * The model-facing context cap for a plain-text tool result, in UTF-8 bytes.
     * Omitted disables the policy entirely (no-op). When set, a result larger than
     * this is spilled and replaced with a preview derived from this same budget.
     */
    maxInlineBytes?: number;
}
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "spill-policy";
/** Require the tool registry (its `tools/post-execute` waterfall is the extension point we transform). */
export declare const inject: string[];
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map