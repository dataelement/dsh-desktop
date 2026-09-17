/**
 * Model-facing Consumer of the `ctx.shell` capability seam. Background calls
 * register process handles with `ctx.jobs`; their work uses job cancellation
 * rather than the tool-call signal after an id is returned.
 *
 * TODO(permissions): deployment policy belongs in `tools/pre-execute` and
 * sandboxing executors; see docs/architecture.md § Where new behavior goes.
 * @module @deepseek-ai/dsh-tool-bash
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "tool-bash";
export declare const inject: string[];
/** Configuration for the bash tool. */
export interface Config {
    /** Expose `run_in_background` (default true); disabled calls are also rejected. */
    enableRunInBackground?: boolean;
}
/** Runtime configuration schema for the bash tool plugin. */
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map