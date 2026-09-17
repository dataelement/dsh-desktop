/** Validated configuration for the local PTY backend. */
import z from '@deepseek-ai/schemastery';
/** One supported interactive shell dialect. */
export type ShellDialect = 'bash' | 'pwsh';
/** Public plugin configuration. */
export interface Config {
    /** Backend registry type (default: `shell`). */
    backendType?: string;
    /** Interactive shell dialect (default: `bash`); selects the argv/env/startup defaults. */
    shellDialect?: ShellDialect;
    /** Interactive shell executable (default per dialect: `/bin/bash`, or the resolved pwsh). */
    shellPath?: string;
    /** Shell arguments (default per dialect: bash `--noprofile --norc -i`, pwsh `-NoLogo -NoProfile`). */
    shellArgs?: string[];
    /** Terminal rows. */
    rows?: number;
    /** Terminal columns. */
    cols?: number;
    /** Maximum retained logical lines. */
    scrollbackLines?: number;
    /** Maximum retained UTF-8 bytes. */
    scrollbackMaxBytes?: number;
    /** Maximum bytes returned by one read or settled viewport. */
    maxReadBytes?: number;
    /** Readiness polling interval. */
    pollIntervalMs?: number;
    /** Delay before Linux exact syscall probes. */
    exactProbeAfterMs?: number;
    /** Silence duration that yields `inferred_idle`. */
    idleSilenceMs?: number;
    /**
     * Extra wait beyond `idleSilenceMs`, once a prompt marker was seen, for the shell to
     * regain the foreground before `inferred_idle` settles; at least one `pollIntervalMs`.
     */
    handoffGraceMs?: number;
    /** Absolute bound for one send and the complete pwsh startup sequence. */
    timeoutMs?: number;
    /** Grace before teardown escalates to `SIGKILL`. */
    disposeGraceMs?: number;
}
/** Configuration after Schemastery defaults and dialect resolution. */
export type ResolvedConfig = Omit<Required<Config>, 'shellDialect' | 'shellPath' | 'shellArgs'> & {
    shellDialect: ShellDialect;
    shellPath: string;
    shellArgs: string[];
};
/** Bash dialect default executable. */
export declare const DEFAULT_BASH_SHELL = "/bin/bash";
/** Bash dialect default arguments (interactive, profile-free). */
export declare const DEFAULT_BASH_ARGS: string[];
/** Pwsh dialect default arguments (interactive host, profile-free). */
export declare const DEFAULT_PWSH_ARGS: string[];
/**
 * Resolve the effective per-dialect shell specification. Defaulting is this
 * explicit step: an unset or empty `shellPath`/`shellArgs` selects the
 * dialect's defaults, while a non-empty explicit value always wins.
 * (Schemastery materializes an absent optional array as `[]`, so emptiness —
 * not just `undefined` — means "dialect default".)
 * @param config - Schemastery-resolved plugin configuration.
 * @returns the fully resolved configuration.
 */
export declare function resolveConfig(config: Config): ResolvedConfig;
/** Schemastery config exposed by the plugin. */
export declare const Config: z<Config>;
/**
 * Assert every effective numeric config field is a positive safe integer and bounds compose.
 * @param config - Schemastery-resolved plugin configuration.
 * @returns Narrows the input to the fully resolved configuration.
 */
export declare function validateConfig(config: Config): asserts config is ResolvedConfig;
//# sourceMappingURL=config.d.ts.map