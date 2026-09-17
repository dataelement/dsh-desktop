/**
 * Model-facing whole-list replacement. Each call appends a `todo/write` snapshot to the calling
 * agent's session; replay is last-write-wins, and UIs render from session events. A non-agent
 * caller has no owning list and is rejected. Named exports preserve loader injection metadata.
 * @module @deepseek-ai/dsh-tool-todo
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export type * from './types.ts';
export declare const name = "tool-todo";
export declare const inject: string[];
/** Model-facing todo tool configuration. */
export interface Config {
    /**
     * Required deployment choice for whether several todos may be `in_progress` at once. True suits
     * agents that run work concurrently — subagents, background commands, workflow fan-out — and the
     * description then instructs the model to mark every actively worked task. False restores the
     * single-active discipline: the description asks for exactly one, and a call marking more is
     * rejected.
     */
    allowParallelInProgress: boolean;
}
/** Schemastery configuration for the todo tool consumer. */
export declare const Config: z<Config>;
/**
 * Register the `todo_write` tool on `ctx.tools` and the `todos` unit on
 * `ctx.sessionProjections`.
 * @param ctx - registrant context carrying the tool and session-projection registries.
 * @param config - deployment's explicit todo policy.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map