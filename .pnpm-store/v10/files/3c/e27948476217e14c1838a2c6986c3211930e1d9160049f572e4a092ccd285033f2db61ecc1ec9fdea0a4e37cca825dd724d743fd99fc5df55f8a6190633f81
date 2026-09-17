/**
 * Agent-scoped Schedule management tools over the durable session fold.
 * @module @deepseek-ai/dsh-schedule
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
/**
 * Register all three Schedule tools in one exact agent scope.
 * @param rootCtx - Global service context owning sessions and durability.
 * @param toolCtx - Exact agent-scoped context receiving the definitions.
 * @param agent - Exact live owner whose session the tools mutate.
 * @param onDurableChange - Called after every successful preflight and again after a create or actual delete barrier succeeds.
 * @returns Idempotent aggregate disposer for the three registrations.
 */
export declare function registerScheduleTools(rootCtx: Context, toolCtx: Context, agent: Agent, onDurableChange: () => void): () => void;
//# sourceMappingURL=tools.d.ts.map