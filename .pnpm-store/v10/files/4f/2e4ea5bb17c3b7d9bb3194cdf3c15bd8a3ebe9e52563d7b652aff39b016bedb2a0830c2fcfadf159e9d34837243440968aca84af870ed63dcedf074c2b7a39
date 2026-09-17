/**
 * The globally named `send_message` and `interrupt_agent` tools: thin
 * model-facing adapters over `ctx.subagents.sendMessage()` and
 * `ctx.subagents.interrupt()`. They perform no lifecycle routing of their own —
 * residency, cold resume, and interrupt authorization belong to the subagent
 * service — and they live apart from the provider-bound
 * `@deepseek-ai/dsh-tool-subagent` instances so multiple delegation tools share
 * one control API.
 * @module @deepseek-ai/dsh-tool-subagent-control
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "tool-subagent-control";
export declare const inject: string[];
/**
 * Register the `send_message` and `interrupt_agent` tools.
 * @param ctx - context carrying the tool registry and subagent service.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map