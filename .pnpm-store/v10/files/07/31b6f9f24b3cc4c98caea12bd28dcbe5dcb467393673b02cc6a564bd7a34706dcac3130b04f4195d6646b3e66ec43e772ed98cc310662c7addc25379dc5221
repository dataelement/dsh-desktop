/**
 * Function plugin registering the `turnOutline` projection unit: the
 * whole-log turn outline (turn number, `turn/start` seq, bounded prompt
 * preview) served through the session-projection seam — registry snapshot,
 * change feed, and every projection carrier — so a client can offer every
 * turn of a session and target history paging at exact seqs without holding
 * the events. The plugin owns only the fold; delivery is the seam's.
 *
 * @module @deepseek-ai/dsh-session-turn-outline
 */
import type { Context } from '@deepseek-ai/cordis';
export type * from './types.ts';
/** Cordis plugin name. */
export declare const name = "session-turn-outline";
/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
export declare const inject: string[];
/**
 * Register the `turnOutline` unit; the registration is an effect on this
 * plugin's fiber, so unloading removes the key.
 * @param ctx - registrant context carrying the projection registry.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map