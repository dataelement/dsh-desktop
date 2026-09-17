/**
 * Sandbox-consuming PowerShell executor — the pwsh twin of
 * `@deepseek-ai/dsh-bash-sandbox`. It wraps the exact local pwsh argv through
 * `ctx.sandbox` (which on Windows resolves to the ACL restricted-token runner
 * chain), inherits local process mechanics, and reports the selected mode,
 * enforcement, and denial facts. Positive runner-executable evidence
 * identifies a broken confinement runner: foreground calls throw
 * `SANDBOX_UNAVAILABLE`, while background processes carry `runnerFailed`;
 * other provider rejections retain stage-neutral local-executor semantics. The
 * tool layer owns the escalation approval flow through `ctx.approval`; this
 * executor reports the sandbox facts the tool renders.
 * @module @deepseek-ai/dsh-pwsh-sandbox
 */
import { Context } from '@deepseek-ai/cordis';
import type { ShellExecRequest, ShellExecSpec, ShellProcess, ShellRunResult } from '@deepseek-ai/dsh-shell';
import type { SandboxMode } from '@deepseek-ai/dsh-sandbox';
import { PwshLocalExecutor } from '@deepseek-ai/dsh-pwsh-local';
import type { Config as LocalConfig } from '@deepseek-ai/dsh-pwsh-local';
/**
 * Plugin config: the local executor's knobs, verbatim. The sandbox policy —
 * the default mode and fallback `workspace-write` root — is NOT here: it lives
 * on `ctx.sandboxPolicy` (`@deepseek-ai/dsh-sandbox-policy`), which resolves
 * each calling session's mode and cwd for every enforcing capability. The
 * runner choice is likewise the `ctx.sandbox` provider's config, not this
 * executor's.
 */
export type Config = LocalConfig;
/**
 * Registers as `ctx.shell` in place of the local pwsh executor and requires a
 * `ctx.sandbox` provider plus `ctx.sandboxPolicy`; the tool layer carries the
 * sandbox denial rendering and escalation surface (see the
 * pwsh-tool-and-executor Agent Note). Tool calls pass the calling session's
 * resolved policy; direct calls fall back to deployment policy.
 * `result.sandbox` reports the mode, enforcement, and denial facts the tool
 * renders.
 */
export declare class SandboxPwshExecutor extends PwshLocalExecutor {
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
     * Stamp per-process sandbox facts before `done` settles. Full-access
     * processes have no facts; signal deaths are not denials.
     */
    protected onProcessDone(proc: ShellProcess, stderr: string, providerRejected: boolean, providerError?: unknown): void;
    /**
     * Wrap one pwsh invocation via the `ctx.sandbox` provider. Provider errors
     * propagate unchanged; the returned argv is handed directly to the local
     * executor's subprocess path.
     * @param spec - resolved execution spec whose pwsh argv is confined.
     * @param policy - resolved confined execution policy.
     * @returns the provider's exact argv and settlement-classification facts.
     */
    private confine;
}
export default SandboxPwshExecutor;
//# sourceMappingURL=index.d.ts.map