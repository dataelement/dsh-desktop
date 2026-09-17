/**
 * The model-facing `workflow` tool: run a JavaScript orchestration script that fans out
 * subagents, and return the script's final value. It owns the model-facing schema and run lifecycle; script
 * parsing, execution, caps, and cancellation live behind `ctx.workflowEngine`
 * (`@deepseek-ai/dsh-workflow`), so a hardened engine swaps in without touching what the model
 * sees. Execution awaits `run.result` and always disposes the run; non-completed reasons become tool
 * errors, and background collection remains deferred. Presentation is an args-only generic card
 * titled from `meta.name`. Explicit-ask usage guidance is registered as the tool's own prompt
 * section rather than deployment persona prose.
 * @module @deepseek-ai/dsh-tool-workflow
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "tool-workflow";
export declare const inject: string[];
/** Config: the model-facing tool name plus result rendering caps. */
export interface Config {
    /** The model-facing tool name to register (default `workflow`). */
    toolName?: string;
    /** Rendered-result ceiling, in characters: a longer JSON value is truncated with a notice (default 50000). */
    maxResultChars?: number;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map