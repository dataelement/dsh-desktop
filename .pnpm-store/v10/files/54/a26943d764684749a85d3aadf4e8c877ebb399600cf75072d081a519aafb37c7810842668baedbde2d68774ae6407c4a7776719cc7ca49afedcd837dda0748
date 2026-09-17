/**
 * Internal sandbox-result classification helpers — deliberate call-for-call
 * mirror of `@deepseek-ai/dsh-bash-sandbox/src/helpers.ts` (the pwsh twin of
 * the bash consumer shares the identical classification dialect).
 *
 * @module @deepseek-ai/dsh-pwsh-sandbox/helpers
 */
import type { ShellRunResult } from '@deepseek-ai/dsh-shell';
import type { RunnerFailureRule } from '@deepseek-ai/dsh-sandbox';
/**
 * Attribute only Node ENOENT/EACCES failures with positive argv[0] provenance
 * after independently ruling out the caller-owned cwd. A supplied error path
 * must exactly identify the runner; without one, the syscall must. With a
 * usable cwd, these codes describe resolution or execute permission for that
 * argv[0] or its shebang interpreter.
 * The workdir is checked at classification time, not atomically with spawn;
 * concurrent path replacement may change attribution but cannot permit an
 * unconfined execution.
 * @param error - the original spawn rejection.
 * @param runnerProgram - provider argv[0], the executable that establishes confinement.
 * @param workdir - the caller-owned spawn cwd, checked independently for usability.
 * @returns whether the rejection has executable-specific runner evidence.
 */
export declare function isRunnerSpawnFailure(error: unknown, runnerProgram: string | undefined, workdir: string): boolean;
/** Fatal runner evidence retained for infrastructure-error detail. */
interface RunnerFailureMatch {
    /** The original stderr line that matched a fatal signature. */
    detail: string;
}
/**
 * Classify a failed run against the selected backend's denial dialect.
 * @param result - settled foreground run.
 * @param signatures - case-insensitive denial substrings from the active wrap.
 * @returns whether the failed run matches that denial dialect.
 */
export declare function classifyDenial(result: ShellRunResult, signatures: readonly string[]): boolean;
/**
 * Classify one settled process against the selected backend's structured
 * runner-failure rules. Each rule requires a nonzero exit, its optional
 * exit-code gate, and a fatal signature on one stderr line after exact
 * informational lines are excluded.
 * @param exitCode - process exit code; null means signal termination.
 * @param stderr - collected stderr text, left unchanged.
 * @param rules - structured runner-failure rules from the active wrap.
 * @returns the first matching fatal line, or undefined when evidence is insufficient.
 */
export declare function classifyRunnerFailure(exitCode: number | null, stderr: string, rules: readonly RunnerFailureRule[]): RunnerFailureMatch | undefined;
/**
 * Match a non-zero exit against case-insensitive stderr signatures.
 * @param exitCode - process exit code; null means signal termination.
 * @param stderr - collected stderr text.
 * @param signatures - substrings identifying the selected backend's dialect.
 * @returns whether this is a non-zero exit whose stderr matches a signature.
 */
export declare function matchesSignature(exitCode: number | null, stderr: string, signatures: readonly string[]): boolean;
export {};
//# sourceMappingURL=helpers.d.ts.map