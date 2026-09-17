/**
 * Local PowerShell Service Provider for the bash capability seam. Each command runs
 * as `pwsh -NoLogo -NoProfile -NonInteractive -Command <command>` in a managed
 * process spawned through `ctx.subprocess`; the executor owns command
 * defaulting, deadlines and cause classification, the model-friendly terminal
 * environment, and the model-facing stdout/stderr merge for background reads.
 *
 * The command string is passed as ONE argv element to `-Command`: PowerShell
 * itself parses the text, and no intermediate shell exists, so there is no
 * shell-quoting layer to escape (the `bash -c` string domain has no
 * equivalent here). Native Win32 paths (`C:\...`) pass through unchanged.
 *
 * @module @deepseek-ai/dsh-pwsh-local
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { ShellExecutor } from '@deepseek-ai/dsh-shell';
import type { ShellExecRequest, ShellExecSpec, ShellProcess, ShellRunResult } from '@deepseek-ai/dsh-shell';
/**
 * Model-friendly environment overrides for PowerShell: disable colors and
 * pagers that would garble tool output. `TERM=dumb` is a POSIX concept and is
 * deliberately absent; `NO_COLOR` is honored by modern pwsh renderers.
 */
export declare const ENV_OVERRIDES: {
    readonly NO_COLOR: "1";
    readonly PAGER: "cat";
    readonly GIT_PAGER: "cat";
};
/**
 * UTF-8 output pinning prepended to every command. The subprocess collector
 * decodes output bytes as UTF-8, but Windows PowerShell 5.1 (the last-resort
 * executable fallback) writes the console/OEM code page by default, which
 * garbles non-ASCII output; pwsh 7 defaults to UTF-8 and is unaffected. The
 * statements ride on line 1 after `; ` separators so PowerShell error line
 * numbers stay accurate.
 */
export declare const ENCODING_PREAMBLE = "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); ";
/** Plugin config (all optional — `static Config` supplies the defaults). */
export interface Config {
    /** Default working directory for commands (default: process.cwd()). */
    cwd?: string;
    /** Default foreground timeout in milliseconds. */
    timeoutMs?: number;
    /** Upper bound for per-call timeout overrides. */
    maxTimeoutMs?: number;
    /** Per-stream in-memory output cap; overflow spills to a temp file. */
    maxOutputBytes?: number;
    /** Per-stream spill-file cap; larger streams retain only their in-memory tail. */
    maxSpillBytes?: number;
    /** Grace period for kill escalation and inherited pipes; at most `MAX_TIMER_DELAY_MS`. */
    graceMs?: number;
    /**
     * Explicit pwsh executable. When omitted, well-known Windows install
     * locations and PATH entries are probed in order (PowerShell 7 install,
     * PATH entries such as the Microsoft Store install, then Windows
     * PowerShell 5.1), falling back to a bare `pwsh` resolved through PATH.
     */
    pwshPath?: string;
}
/** The shape after schemastery applied the defaults (cwd/pwshPath have none). */
type ResolvedConfig = Required<Omit<Config, 'cwd' | 'pwshPath'>> & Pick<Config, 'cwd' | 'pwshPath'>;
export { candidatePwshPaths, resolvePwshPath } from './resolve.ts';
/**
 * Reject a resolved section this executor could not run with. The schema
 * expresses neither "positive and finite" nor the timer bound `graceMs` has to
 * fit, so a stored value is refused where it is written instead of failing at
 * the next command.
 * @param config - the resolved section, schema-valid by construction.
 * @throws Error naming the field that cannot be used.
 */
export declare function assertServiceablePwshConfig(config: Config): void;
/**
 * Local PowerShell executor over `ctx.subprocess`. Bounded output, spill
 * files, and managed-range termination are the subprocess service's mechanics;
 * this executor supplies their configured budgets per spawn.
 */
export declare class PwshLocalExecutor extends ShellExecutor {
    static inject: string[];
    static Config: z<Config>;
    /** The currently authoritative config: the settings section, or the composition entry. */
    private source;
    /** The declared executable the current {@link pwshPath} was resolved from. */
    private declaredPwshPath;
    /** The pwsh executable resolved from the current config. */
    private resolvedPwshPath;
    /** Validated config (schemastery applied the defaults before construction). */
    get config(): ResolvedConfig;
    /** The pwsh executable every command runs through. */
    get pwshPath(): string;
    constructor(ctx: Context, config: Config);
    /**
     * Resolve a request into a fully-specified spec: fill `workdir` from
     * `config.cwd` (else `process.cwd()`), and `timeoutMs` from
     * `config.timeoutMs`, capped at `config.maxTimeoutMs`.
     */
    resolve(request: ShellExecRequest): ShellExecSpec;
    /**
     * The pwsh invocation argv for one resolved spec — the argv-level seam a
     * confining subclass wraps through `ctx.sandbox.confine` (the pwsh twin of
     * `dsh-bash-local`'s `runArgv`/`startArgv` hooks; see
     * `@deepseek-ai/dsh-pwsh-sandbox`).
     */
    protected argv(spec: ShellExecSpec): string[];
    /** Map one resolved spec plus its argv onto a fully-specified subprocess spawn. */
    private spawnSpec;
    /** The collect-mode readers the executor itself requested (present by construction). */
    private static collected;
    run(spec: ShellExecSpec): Promise<ShellRunResult>;
    /** Foreground run of an exact argv (the confining subclass re-wraps it). */
    protected runArgv(spec: ShellExecSpec, argv: readonly string[]): Promise<ShellRunResult>;
    start(spec: ShellExecSpec): ShellProcess;
    /** Background start of an exact argv (the confining subclass re-wraps it). */
    protected startArgv(spec: ShellExecSpec, argv: readonly string[]): ShellProcess;
    /**
     * Settlement hook for subclasses that attach execution facts to a process.
     * The base implementation is intentionally empty. Mirrored from
     * `dsh-bash-local` (whose sandboxing subclass consumes the same hook); the
     * pwsh-confining consumer is `@deepseek-ai/dsh-pwsh-sandbox`.
     * @param _proc - the settled process handle.
     * @param _stderr - the process's retained stderr tail used by subclasses for settlement classification.
     * @param _providerRejected - whether the subprocess promise rejected without a direct outcome.
     * @param _providerError - the provider rejection reason, which may itself be undefined.
     */
    protected onProcessDone(_proc: ShellProcess, _stderr: string, _providerRejected: boolean, _providerError?: unknown): void;
}
export default PwshLocalExecutor;
//# sourceMappingURL=index.d.ts.map