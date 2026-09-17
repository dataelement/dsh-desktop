/**
 * Shared driver for in-process ONE-SHOT subagent providers. The agent factory's
 * creation transaction owns unpublished setup and rollback; after publication
 * the returned AgentHandle is the one quiescent lifecycle owner held by the
 * provider's caller.
 *
 * Continuable children never come through here: the continuation manager
 * composes and drives them directly, so this driver owns exactly one turn with
 * one result.
 *
 * @module @deepseek-ai/dsh-subagent-in-process-driver
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { ResolvedSubagentStartRequest, SubagentRun } from '@deepseek-ai/dsh-subagent';
export { STRUCTURED_OUTPUT_TOOL, STRUCTURED_OUTPUT_INSTRUCTION, } from './structured.ts';
/** Extra inputs the spawn and fork providers supply to the shared driver. */
export interface InProcessRunOptions {
    /** Completed-turn seed for fork, or undefined for a fresh spawn. */
    readonly seed?: readonly SessionEvent[];
}
/**
 * Establish and drive one in-process one-shot child. Fulfillment means the agent
 * is already published in the registry and transfers its turn, cancellation,
 * and disposal work through the returned run. Rejection means the agent
 * factory's unpublished creation transaction reached quiescence without
 * publishing a child. Every start appends its resolved descriptor inside the
 * child's initial turn.
 * @param request - the trusted typed start request, including its required signal.
 * @param options - the optional fork seed.
 * @returns a published holder-owned run.
 */
export declare function startInProcessRun(request: ResolvedSubagentStartRequest, options: InProcessRunOptions): Promise<SubagentRun>;
//# sourceMappingURL=index.d.ts.map