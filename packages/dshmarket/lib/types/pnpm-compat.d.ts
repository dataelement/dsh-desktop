/**
 * pnpm compatibility layer — everything the market needs to know about how
 * different pnpm majors behave inside a dsh profile directory, kept pure and
 * separately testable (test/unit + test/integration exercise this module
 * against real pnpm 9/10/11).
 *
 * Verified behavior matrix (2026-08, pnpm 9.15.9 / 10.28.2 / 11.21.0):
 * - workspace root, `add` without -w:  pnpm 9 fails ERR_PNPM_ADDING_TO_ROOT;
 *   pnpm 10/11 succeed.
 * - `add -w` where NO pnpm-workspace.yaml exists: ALL majors fail with
 *   "--workspace-root may only be used inside a workspace".
 * - modules dir built by pnpm 9, then pnpm 10/11 mutate it: a modules-layout
 *   compatibility error (public-hoist-pattern on Unix; virtual-store path
 *   length can be the first mismatch pnpm reports on Windows).
 */
/**
 * Decide the argv for a `dsh plugin <add|remove> …` call in the given profile.
 *
 * pnpm 9 refuses to add at a workspace root without -w (#17, #20); every
 * pnpm major refuses -w when the directory is NOT a workspace. So the flag
 * is injected exactly when the profile has a pnpm-workspace.yaml.
 * @param profileDir - resolved profile directory (owns pnpm-workspace.yaml, or not).
 * @param pluginArgs - the raw args, e.g. ['add', 'dshmarket@latest'].
 * @returns args with -w injected when — and only when — the profile is a workspace root.
 */
export declare function pluginArgsFor(profileDir: string, pluginArgs: string[]): string[];
/** One recognized pnpm failure, with a bilingual explanation for the UI. */
/**
 * The namespace whose packages the dsh runtime provides rather than npm.
 *
 * A peer dependency on one of these is a statement about the host, not a
 * package to download — and several of them are never published at all.
 */
export declare const HOST_NAMESPACE_RE: RegExp;
export interface PnpmFailure {
    code: 'adding-to-root' | 'not-a-workspace' | 'hoist-pattern-diff' | 'pnpm-missing' | 'release-age-violation' | 'ignored-builds' | 'git-prepare-not-allowed' | 'fetch-404' | 'transient-network' | 'fetch-timeout' | 'unexpected-store' | 'patch-failed' | 'missing-tarball-integrity' | 'windows-file-locked';
    /** Bilingual, actionable message shown to the user instead of the raw wall of text. */
    message: string;
    /** True when re-running `pnpm install` in the profile is the documented recovery. */
    recoverable: boolean;
    /**
     * The package pnpm could not resolve, when the failure names one.
     *
     * Exposed because the NAME alone does not say what went wrong: the same
     * 404 is a ghost entry the user must delete when the package is a direct
     * dependency of the profile, and an unpublished host peer the market can
     * retry around when it is not (#289). Only a caller holding the profile
     * manifest can tell those apart, so the classifier reports the fact and
     * leaves the judgement to it.
     */
    pkg?: string;
}
/**
 * Momentary network failures — worth exactly one automatic retry (#83).
 * pnpm 5xx fetch codes, its meta-fetch give-up, and the raw socket errors
 * that surface through dsh's wrapper. Permanent shapes (404, auth) are
 * deliberately absent: retrying those just doubles the wait for bad news.
 */
export declare function isTransientPnpmFailure(output: string): boolean;
/**
 * pnpm's per-request fetch timeout: the abort surfaces as a DOMException
 * ("The operation was aborted due to timeout", code 23) through undici —
 * pnpm logs it as `GET … error (23)` before giving up. This is the failure
 * shape for large tarballs (github: sources download the WHOLE repo, even
 * for a `#path:` subdirectory plugin) on slow networks: pnpm's default
 * 60-second limit is simply not enough, so a plain retry fails again at the
 * same limit. The market's recovery re-runs once with a longer
 * fetchTimeout (see withHoistRecovery).
 */
export declare function isFetchTimeoutFailure(output: string): boolean;
/**
 * Map a failed pnpm run's combined output to a known failure mode.
 *
 * dsh's own wrapper line ("dsh: pnpm failed in profile directory …") names no
 * cause, so the market must recognize pnpm's real diagnostics itself (#20).
 * @param output - stdout+stderr of the failed run.
 * @returns the classified failure, or null when unrecognized (raw output is then shown as-is).
 */
export declare function classifyPnpmFailure(output: string): PnpmFailure | null;
