/**
 * Schedules one assistant step's tool calls. Exclusive calls form barriers;
 * parallel calls use a bounded rolling pool and are reclassified before start.
 * Dispatch may overlap, while policy, results, and result context remain
 * model-ordered. Abort or an internal scheduler failure stops replenishment
 * and drains started calls.
 *
 * Abort records synthetic error results for skipped calls so replay stays
 * valid. A terminal scheduler failure preserves already-recorded `tool/call`
 * events without fabricating results.
 * @module dsh-agent-loop/tool-calls
 */
import type { Context } from '@deepseek-ai/cordis';
import { type ToolCallBlock } from '@deepseek-ai/dsh-llm';
import type { UserMessage } from '@deepseek-ai/dsh-session';
/**
 * Schedule one assistant step's tool calls by their live concurrency mode.
 * Ordinary completion and abort commit started-call results in order. Abort
 * drains them, records synthetic results for unstarted calls, and returns with
 * the signal still aborted after accepting started-call context through the
 * caller-supplied acceptor (the machine stages it in its next-step inbox for the
 * step boundary). An internal scheduler failure stops new dispatches, drains
 * already-started dispatches, and rejects with the first failure without
 * fabricating tool results.
 * The committed step's AgentLoop driver boundary supplies the initiating Agent
 * that becomes each explicit {@link ToolExecutionInput.agent}.
 *
 * @param ctx - loop context that owns the tool registry and carries the initiating Agent.
 * @param turn - current turn number.
 * @param step - current step number.
 * @param toolCalls - assistant calls in model order.
 * @param signal - abort signal shared by the step.
 * @param acceptContext - accepts committed result context for the next step boundary.
 */
export declare function executeToolCalls(ctx: Context, turn: number, step: number, toolCalls: ToolCallBlock[], signal: AbortSignal, acceptContext: (context: UserMessage) => void): Promise<{
    concluded: boolean;
}>;
//# sourceMappingURL=tool-calls.d.ts.map