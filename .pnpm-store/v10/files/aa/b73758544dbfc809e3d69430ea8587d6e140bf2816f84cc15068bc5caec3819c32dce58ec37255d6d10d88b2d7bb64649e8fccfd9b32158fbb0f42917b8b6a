/**
 * Shared path resolution and regular-file validation for model-facing read tools.
 * @module @deepseek-ai/dsh-tool-fs/src/read-target
 */
import type { Context } from '@deepseek-ai/cordis';
import type { FsInfo, FsTarget } from '@deepseek-ai/dsh-fs';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
/**
 * Resolve a model-supplied path, observe absence, and require a regular file.
 * @param ctx - the plugin context providing filesystem resolution and observation events.
 * @param exec - the current tool execution, including session cwd and cancellation.
 * @param requestedPath - the raw path supplied to the tool.
 * @returns the resolved target and its single stat result.
 */
export declare function resolveRegularReadTarget(ctx: Context, exec: ToolExecution, requestedPath: string): Promise<{
    target: FsTarget;
    info: FsInfo;
}>;
//# sourceMappingURL=read-target.d.ts.map