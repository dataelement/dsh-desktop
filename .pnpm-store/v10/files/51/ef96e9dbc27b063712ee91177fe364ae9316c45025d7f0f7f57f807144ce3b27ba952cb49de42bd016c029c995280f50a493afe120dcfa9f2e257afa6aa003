/**
 * Semantic durability checkpoints for model requests, top-level tool dispatch,
 * and completed agent steps.
 * @module @deepseek-ai/dsh-session-checkpoint-policy
 */
import type { Context } from '@deepseek-ai/cordis';
/** Cordis plugin name used by Loader diagnostics. */
export declare const name = "session-checkpoint-policy";
/** Services whose request, tool, session, and persistence boundaries this policy joins. */
export declare const inject: string[];
/**
 * Install semantic checkpoint listeners. Loop-built model calls checkpoint the
 * logged request before adapter dispatch; top-level tool calls checkpoint their
 * recorded call before the tool body; the next request boundary checkpoints
 * the preceding response/result batch. Nested tool dispatches reuse the durable outer call.
 *
 * Checkpoint failures are fail-closed at the model and tool side-effect
 * boundaries: the downstream adapter or tool body is not invoked.
 *
 * @param ctx - plugin context that owns the listeners.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map