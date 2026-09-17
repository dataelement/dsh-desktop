/** Execution-time authority checks for the model-facing goal tools. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { GoalView } from '@deepseek-ai/dsh-goal';
import type { SessionEvent, SessionSeq } from '@deepseek-ai/dsh-session';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
/** The calling agent plus the immutable event cut and open-turn start seq used for authority checks. */
export interface GoalToolExecution {
    readonly agent: Agent;
    readonly events: readonly SessionEvent[];
    readonly openTurnStartSeq: SessionSeq;
}
/** Hard authority granted to one state-changing call. */
export type GoalToolAuthority = {
    readonly kind: 'direct-human';
} | {
    readonly kind: 'goal-round';
    readonly goal: GoalView;
};
/**
 * Resolve and authenticate the calling agent and its driver boundary.
 * @param ctx - Context carrying the live agent registry.
 * @param exec - Tool execution metadata supplied by the registry.
 * @returns The authenticated agent, immutable event cut, and open-turn boundary.
 */
export declare function goalToolExecution(ctx: Context, exec: ToolRunContext): GoalToolExecution;
/**
 * Require authority originating in a human message accepted by a runtime root.
 * @param ctx - Context carrying the live agent graph.
 * @param execution - Authenticated current tool execution.
 */
export declare function requireDirectHuman(ctx: Context, execution: GoalToolExecution): void;
/**
 * Resolve completion authority from either direct human input or the exact goal round.
 * @param ctx - Context carrying live agents and goal state.
 * @param execution - Authenticated current tool execution.
 * @returns The direct-human or exact-goal-round authority grant.
 */
export declare function completionAuthority(ctx: Context, execution: GoalToolExecution): GoalToolAuthority;
//# sourceMappingURL=authority.d.ts.map