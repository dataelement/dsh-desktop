/**
 * Function plugin registering the `sessionStats` projection unit: whole-log
 * turn/step counts and LLM/tool/first-token/decode wall times served through
 * the session-projection seam (registry snapshot, change feed, and every
 * projection carrier), so clients render full-session figures that paging and
 * compaction cannot change. The plugin owns only the fold; delivery is the
 * seam's.
 *
 * @module @deepseek-ai/dsh-session-stats
 */
import type { Context } from '@deepseek-ai/cordis';
export type * from './types.ts';
/** Cordis plugin name. */
export declare const name = "session-stats";
/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
export declare const inject: string[];
/**
 * Register the `sessionStats` unit; the registration is an effect on this
 * plugin's fiber, so unloading removes the key.
 * @param ctx - registrant context carrying the projection registry.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map