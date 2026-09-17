/**
 * Cooperative tool-call timeout enforcer. A tool declares `timeoutMs` and
 * promises to honor `exec.signal`; this wrapper arms that deadline and maps its
 * own expiry to `TOOL_TIMEOUT` without racing or abandoning the tool promise.
 *
 * FIXME: settle the intended `@deepseek-ai/dsh-timeout-guard` rename before the
 * first tagged release — suggestion only, aligning the name with its `guard/`
 * home; decide at resolution time
 * ([regrouping Agent Note](../../../../.agents/notes/archived/architecture/2026-07-29-package-regrouping.md)).
 *
 * @module @deepseek-ai/dsh-tool-call-timeout-policy
 */
import type { Context } from '@deepseek-ai/cordis';
/**
 * The code owned by this plugin, used BOTH as the internal {@link deadline}
 * classification code AND as the structured error `code` on the replacement
 * tool result. Scoping {@link timeoutOf} to it keeps a nested outer deadline
 * (another `tools/execute` wrapper's timer that fired first) from being misread
 * as this plugin's own timeout — it reads as an ordinary upstream cancel.
 */
export declare const TOOL_TIMEOUT = "TOOL_TIMEOUT";
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "timeout-policy";
/** The tool registry service this plugin wraps (`tools/execute`) and reads (`get`). */
export declare const inject: string[];
/**
 * Register the timeout wrapper. It resolves the caller-visible tool definition,
 * temporarily replaces `exec.signal`, delegates, restores the upstream signal,
 * and replaces the result only when this wrapper's own timer fired.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map