/**
 * Sandbox-consuming bash executor. It wraps the exact local bash argv through
 * `ctx.sandbox`, inherits local process mechanics, and reports the selected
 * mode, enforcement, and denial facts. Positive runner-executable evidence
 * identifies a broken confinement runner: foreground calls throw
 * `SANDBOX_UNAVAILABLE`, while background processes carry `runnerFailed`;
 * other provider rejections retain stage-neutral local-executor semantics. The
 * tool owns approval and passes a complete per-call policy.
 * @module @deepseek-ai/dsh-bash-sandbox
 */
import { Context } from '@deepseek-ai/cordis';
import type { ShellExecRequest, ShellExecSpec, ShellProcess, ShellRunResult } from '@deepseek-ai/dsh-shell';
import type { SandboxMode } from '@deepseek-ai/dsh-sandbox';
import { LocalBashExecutor } from '@deepseek-ai/dsh-bash-local';
import type { Config as LocalConfig } from '@deepseek-ai/dsh-bash-local';
/**
 * Plugin config: the local executor's knobs, verbatim. The sandbox policy —
 * the default mode and fallback `workspace-write` root — is NOT here: it lives
 * on `ctx.sandboxPolicy` (`@deepseek-ai/dsh-sandbox-policy`), which resolves
 * each calling session's mode and cwd for every enforcing capability. The runner
 * choice is likewise the `ctx.sandbox` provider's config, not this executor's.
 */
export type Config = LocalConfig;
/**
 * Registers as `ctx.shell` in place of the local executor and requires a
 * `ctx.sandbox` provider plus `ctx.sandboxPolicy`; the tool layer is
 * unchanged. Tool calls pass the calling session's resolved policy; direct
 * calls fall back to deployment policy. `result.sandbox` reports the mode and
 * enforcement actually used.
 */
export declare class SandboxBashExecutor extends LocalBashExecutor {
    static inject: string[];
    private readonly mode;
    /**
     * Per-process confinement facts retained until settlement. Providers may
     * vary enforcement and diagnostic dialect between overlapping calls, so a
     * shared latest-wrap value would classify a process against the wrong facts.
     * Unconfined processes have no entry.
     */
    private readonly processFacts;
    constructor(ctx: Context, config: Config);
    /** The configured default mode — the capability fact the tool layer reads. */
    get sandboxMode(): SandboxMode;
    /**
     * Stamp a complete per-call policy onto the spec. Tool calls supply the
     * calling session's resolved mode and root; lower-level callers fall back to
     * the deployment policy.
     */
    resolve(request: ShellExecRequest): ShellExecSpec;
    run(spec: ShellExecSpec): Promise<ShellRunResult>;
    start(spec: ShellExecSpec): ShellProcess;
    /**
     * Stamp per-process sandbox facts before `done` settles. Full-access processes
     * have no facts; signal deaths are not denials.
     */
    protected onProcessDone(proc: ShellProcess, stderr: string, providerRejected: boolean, providerError?: unknown): void;
    /**
     * Wrap one shell command via the `ctx.sandbox` provider. Provider errors
     * propagate unchanged; the returned argv is handed directly to the local
     * executor's subprocess path.
     * @param command - shell source for the confined inner `bash -c`.
     * @param policy - resolved confined execution policy.
     * @returns the provider's exact argv and settlement-classification facts.
     */
    private confine;
}
export default SandboxBashExecutor;
//# sourceMappingURL=index.d.ts.map