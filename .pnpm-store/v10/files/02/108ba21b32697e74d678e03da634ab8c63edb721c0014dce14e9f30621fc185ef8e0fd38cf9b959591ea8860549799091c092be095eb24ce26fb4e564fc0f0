/**
 * Model-facing result rendering for the bash tool.
 *
 * @module @deepseek-ai/dsh-tool-bash/render
 */
import type { ShellProcessRead, ShellRunResult, ShellSandboxInfo } from '@deepseek-ai/dsh-shell';
import type { SandboxMode } from '@deepseek-ai/dsh-sandbox';
/**
 * Shape one finished run into the text the model sees: stdout, then a marked
 * stderr section, then exit-status markers. Non-zero exits are reported, not
 * errored — the model decides how to react; only infrastructure failures
 * (spawn errors, aborts) surface as isError results.
 * @param result - the completed foreground run from the executor.
 * @param escalationModes - the escalation targets this composition advertises;
 *   non-empty adds the same-turn escalation hint after a denial marker
 *   (default `[]`: no hint).
 * @returns the model-facing text: output body (or `(no output)`), then any timeout/signal/exit markers, each on its own line.
 */
export declare function renderResult(result: ShellRunResult, escalationModes?: readonly SandboxMode[]): string;
/**
 * Shape one background-process read into the `job_output` delta the model
 * sees: the incremental delta, plus the lossy-read notice (with full-stream
 * spill paths) when in-memory truncation dropped unread bytes. Empty-delta
 * rendering (`(no new output)`) is the generic job controller's job.
 * @param read - one incremental read from the process handle.
 * @param sandbox - settled sandbox facts, when this was a confined process.
 * @param escalationModes - escalation targets advertised by this composition.
 * @returns the delta text with any loss or sandbox notice appended.
 */
export declare function renderProcessRead(read: ShellProcessRead, sandbox?: ShellSandboxInfo, escalationModes?: readonly SandboxMode[]): string;
/**
 * The exit-status parse is the shared marker-contract half of the shell-tool
 * rendering story, owned by `@deepseek-ai/dsh-shell` so `dsh-tool-pwsh` reuses
 * it (its renderer emits the same markers). Re-exported here to keep
 * `../src/render.ts` a single import root for bash-tool consumers.
 */
export { parseExitStatus, type ParsedExitStatus } from '@deepseek-ai/dsh-shell';
//# sourceMappingURL=render.d.ts.map