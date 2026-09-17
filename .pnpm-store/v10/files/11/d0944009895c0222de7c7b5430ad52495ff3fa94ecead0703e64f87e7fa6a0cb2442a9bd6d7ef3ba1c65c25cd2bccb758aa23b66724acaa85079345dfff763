/**
 * Derive the working directory a filesystem tool resolves relative paths against: the calling
 * agent's per-session workspace (`exec.agent.session.header.cwd`), so each session's
 * `read`/`write`/`edit` act on its workspace, not the server's launch directory.
 * Non-agent calls return `undefined`, leaving the fallback in the provider rather than reading
 * `process.cwd()` at the tool boundary.
 * @module @deepseek-ai/dsh-tool-fs/session-cwd
 */
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
/**
 * The session workspace cwd for this call, or `undefined` when none applies.
 * @param exec - the tool-execution context; only its optional `agent` is read.
 * @param requestedPath - the path the provider will resolve; parent traversal
 *   makes a symlinked cwd's filesystem identity observable.
 * @returns the calling agent's session cwd, or undefined for a non-agent caller (the backend then applies its own default).
 */
export declare function sessionCwd(exec: ToolExecution, requestedPath: string): string | undefined;
/**
 * Resolution options shared by all model-facing filesystem tools.
 * @param exec - the tool-execution context supplying session cwd and cancellation.
 * @param requestedPath - the path the provider will resolve.
 * @param policyWorkspaceRoot - resolved per-call root, when a mutation carries sandbox policy.
 * @returns provider resolution options for the current tool call.
 */
export declare function sessionResolveOptions(exec: ToolExecution, requestedPath: string, policyWorkspaceRoot?: string): {
    cwd?: string;
    signal?: AbortSignal;
};
//# sourceMappingURL=session-cwd.d.ts.map