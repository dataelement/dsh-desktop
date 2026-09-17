/**
 * The in-process FORK subagent backend: registers a {@link SubagentProvider} on
 * `ctx.subagents` that runs each child as a child {@link Agent} SEEDED with a prefix of the
 * parent's session log — so the child inherits the parent's conversation context instead of
 * starting fresh. The seed ends at the last `turn/end`: the current tool-call turn is
 * unbalanced and cannot be replayed as a valid child session.
 * @module @deepseek-ai/dsh-subagent-fork-in-process
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "subagent-fork-in-process";
export declare const inject: string[];
/** Config: the registry name to register the provider under. */
export interface Config {
    /** Provider name on `ctx.subagents` (default `fork`). */
    providerName: string;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map