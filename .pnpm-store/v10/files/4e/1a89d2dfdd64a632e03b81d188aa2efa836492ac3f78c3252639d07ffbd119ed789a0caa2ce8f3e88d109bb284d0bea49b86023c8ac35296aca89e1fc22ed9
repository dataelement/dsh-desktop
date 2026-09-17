/**
 * Model-facing result rendering for the pwsh tool — the PowerShell twin of
 * `dsh-tool-bash`'s renderer: stdout, a marked stderr section, sandbox
 * denial/runner-failure markers (with the same-turn escalation hint), and
 * truncation notices with spill paths, then exit-status markers. Non-zero
 * exits are reported, not errored — the model decides how to react; only
 * infrastructure failures (spawn errors, aborts) surface as isError
 * results.
 *
 * @module @deepseek-ai/dsh-tool-pwsh/render
 */
import type { ShellProcessRead, ShellSandboxInfo, CollectedOutput } from '@deepseek-ai/dsh-shell';
import type { SandboxMode } from '@deepseek-ai/dsh-sandbox';
/** The renderable foreground result shape (the schema-derived value, no `kind`). */
export interface RenderablePwshResult {
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
    timeoutMs: number;
    stdout: CollectedOutput;
    stderr: CollectedOutput;
    sandbox?: ShellSandboxInfo;
}
/**
 * Shape one finished run into the text the model sees: stdout, then a marked
 * stderr section, then exit-status markers, matching the bash tool's story —
 * a clean exit (0, no signal) produces no marker.
 * @param result - the completed foreground run from the executor.
 * @param escalationModes - the escalation targets this composition advertises;
 *   non-empty adds the same-turn escalation hint after a denial marker
 *   (default `[]`: no hint).
 * @returns the model-facing text: output body (or `(no output)`), then any timeout/signal/exit markers, each on its own line.
 */
export declare function renderPwshResult(result: RenderablePwshResult, escalationModes?: readonly SandboxMode[]): string;
/**
 * Shape one background-process read into the `job_output` delta the model
 * sees: the incremental delta, plus the lossy-read notice (with full-stream
 * spill paths) when in-memory truncation dropped unread bytes.
 * @param read - one incremental read from the process handle.
 * @param sandbox - settled sandbox facts, when this was a confined process.
 * @param escalationModes - escalation targets advertised by this composition.
 * @returns the delta text with any loss or sandbox notice appended.
 */
export declare function renderPwshProcessRead(read: ShellProcessRead, sandbox?: ShellSandboxInfo, escalationModes?: readonly SandboxMode[]): string;
//# sourceMappingURL=render.d.ts.map