/**
 * Local sandbox backend. It selects the platform runner chain (Linux bwrap then
 * Landlock; macOS Seatbelt; Windows the ACL restricted-token runner), functionally probes
 * competing candidates once, and reports each wrap's enforcement and stderr
 * classification facts. Missing or unusable confinement fails closed rather
 * than returning the original argv.
 *
 * The windows-acl rung additionally owns the write grants: the write SID is
 * the per-WORKSPACE identity derived from the canonical workspace path
 * (`workspaceWriteSid`), while every live session receives a RANDOM private
 * temp directory and its own derived capability (`tempWriteSid`). The
 * workspace-root ACE materializes once per workspace per server lifetime
 * and STANDS (the cross-session reuse cache — the exact-ACE skip makes
 * every later provision O(1) instead of re-propagating the tree per
 * session); the private-temp ACEs are revoked on dispose. The runner
 * receives both SIDs (their presence marks the seam-managed contract) and
 * stops managing DACLs itself. The rung reports partial enforcement because
 * WRITE_RESTRICTED must retain Everyone in its
 * restricting list and NTFS hard links alias one file object across paths.
 * @module @deepseek-ai/dsh-sandbox-local
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { SandboxProvider } from '@deepseek-ai/dsh-sandbox';
import type { ConfinedArgv, SandboxEnforcement, SandboxPolicy } from '@deepseek-ai/dsh-sandbox';
/** Plugin config. All optional — `static Config` supplies the defaults. */
export interface Config {
    /**
     * Override the runner argv; bwrap-compatible profile arguments are appended. A
     * non-empty override asserts full enforcement and skips built-in selection and
     * probing. A runner that starts but refuses its profile must be identifiable by
     * {@link runnerFailureSignatures}. Consumers classify a spawn rejection only after
     * confirming the workdir is usable. `ENOENT` or `EACCES` identifies the runner when
     * `error.path` equals argv[0] and `error.syscall` is `spawn` or `spawn <runner>`, or
     * when `error.path` is absent and `error.syscall` is exactly `spawn <runner>`.
     */
    runnerCommand?: string[];
    /**
     * Case-insensitive stderr substrings emitted when a configured
     * {@link runnerCommand} refuses its profile before executing the wrapped
     * command. Required and non-empty with `runnerCommand`; rejected without
     * it. Each entry is a non-empty, single-line, case-insensitive substring
     * covering the executable runner's own failure dialect.
     */
    runnerFailureSignatures?: string[];
    /** Positive timeout for each functional probe; zero would mean unbounded to Node. */
    probeTimeoutMs?: number;
}
/** Test hook: inject probe verdicts / a fake launcher / a platform without real runners. */
export interface SandboxInternals {
    /** Replaces `process.platform` for chain selection (exercise any platform's chain from any host). */
    platform?: string;
    /** Replaces the platform's chain wholesale (walk mechanics — e.g. probing a rung the product chains only reach unprobed). */
    chain?: readonly SelectedRunner['runner'][];
    /** Replaces the functional `bwrap` probe (the Linux chain's first rung). */
    probeBwrap?: () => boolean;
    /** Replaces the functional Landlock launcher probe (the Linux chain's second rung). */
    probeLandlock?: (launcher: string) => SandboxEnforcement | 'unusable';
    /** Replaces the functional Seatbelt probe (the darwin chain's sole rung — only consulted if that chain ever grows). */
    probeSeatbelt?: (seatbeltExec: string) => boolean;
    /** Replaces the resolved `landlock-run` launcher path (a fake launcher script). */
    landlockLauncher?: string;
    /** Replaces the `sandbox-exec` executable the probe and wraps invoke (a fake script). */
    seatbeltExec?: string;
    /** Replaces the resolved windows-acl runner argv prefix (a fake runner). */
    windowsAclRunnerArgs?: string[];
    /** Replaces the resolved windows-acl runner built entry path (a fake lib/runner.js location). */
    windowsAclRunnerEntry?: string;
    /** Replaces the functional windows-acl probe (the win32 chain's sole rung — only consulted if that chain ever grows). */
    probeWindowsAcl?: () => boolean;
    /** Replaces the private-temp-directory removal at provider dispose (a throwing fake exercises the cleanup-failure path). */
    rmTempDir?: (path: string) => void;
}
/** The chain's verdict: which runner confines, and how completely it enforces. */
type SelectedRunner = {
    runner: 'bwrap' | 'landlock' | 'seatbelt' | 'windows-acl';
    enforcement: SandboxEnforcement;
};
/**
 * Local process-sandbox provider. Registers as `ctx.sandbox`. Caches the
 * chain verdict and, on the windows-acl rung, the write grants
 * ({@link AclWriteGrant}: the standing workspace-root grant per workspace
 * and the revocable private-temp grant per live session/workspace pair, the
 * latter revoked on provider dispose); the one-time probes spawn nothing
 * else.
 */
export declare class LocalSandboxProvider extends SandboxProvider {
    static Config: z<Config>;
    /** Test hook (mirrors the bash executors' `internals`). */
    internals: SandboxInternals;
    private readonly runnerCommand;
    private readonly configuredRunnerFailureSignatures;
    private readonly probeTimeoutMs;
    /** Cached chain verdict; undefined until the first confined wrap needs it. */
    private selectedRunner;
    /**
     * Server-lifetime write grants (windows-acl rung): the STANDING
     * workspace-root grant per workspace (its ACE is the cross-session reuse
     * cache and outlives the provider — never revoked) and the REVOCABLE
     * private-temp grant per live session/workspace pair (revoked on provider
     * dispose).
     */
    private readonly workspaceGrants;
    private readonly tempCapabilities;
    constructor(ctx: Context, config: Config);
    /**
     * Wrap `argv` in the selected runner's invocation for `policy` — the configured
     * `runnerCommand` when present (the operator's assertion, no probe), else the platform
     * chain's runner speaking its own profile dialect.
     *
     * @param argv - the exact argv the caller is about to spawn.
     * @param policy - the file-effect policy this execution runs under.
     * @returns the wrapped argv plus the selected backend's enforcement completeness, denial
     *   signatures, and structured runner-failure rules; throws the fail-closed
     *   `SANDBOX_UNAVAILABLE` error when the platform has no usable runner.
     */
    confine(argv: readonly string[], policy: SandboxPolicy): ConfinedArgv;
    /** The selected rung's runner invocation (program + profile arguments) for one policy. */
    private runnerArgv;
    /**
     * The windows-acl runner argv for one policy. With a calling session (the
     * policy's `sessionId`) under workspace-write, the grants are materialized
     * once per provider lifetime — the standing workspace-root grant per
     * workspace and a revocable, RANDOM private-temp capability per live
     * session/workspace pair. The runner receives `--write-sid` plus
     * `--temp-write-sid` and grants nothing itself. Agentless workspace-write
     * calls pass the ambient temp ROOT and no SID flags: the runner creates and
     * removes a random private child directory for that one invocation.
     * @param policy - the resolved per-call policy.
     * @returns the runner invocation.
     */
    private windowsAclRunnerArgv;
    /**
     * Materialize one workspace-write policy's ACEs once per provider
     * lifetime. The workspace SID and standing root grant are shared by the
     * workspace. The temp directory is random and carries a distinct SID, so
     * another session on the same workspace cannot use the shared workspace
     * SID to enter it. A fresh provider always chooses a new path; crash
     * residue therefore cannot collide with or authorize a resumed session.
     * Fail-closed: a half-materialized temp grant is revoked and its directory
     * removed before the error propagates.
     * @param sessionId - the policy's calling-session identity.
     * @param workspaceRoot - the resolved policy root.
     * @returns the pair's private temp directory and write capability.
     */
    private materializeAclGrant;
    /**
     * Dispose every write grant (provider dispose): the revocable temp ACEs
     * are revoked, the private temp directories this provider created are
     * removed, and every SID allocation is freed; the standing workspace ACEs
     * stay (the reuse cache). Cleanup failures are reported, not thrown:
     * cordis teardown must not be aborted by grant cleanup. A crash skips all
     * of it, but a new provider never reuses the residue's random path or SID;
     * OS temp hygiene (or manual removal) eventually reclaims it.
     */
    private revokeAclGrants;
    /** Remove one provider-owned private temp directory (injectable for cleanup tests). */
    private removeTempDir;
    /**
     * Resolve which runner confines commands, once, for the provider's
     * lifetime: this platform's chain ({@link PLATFORM_CHAINS}), its sole
     * candidate selected directly, multiple candidates arbitrated by
     * functional probes in chain order. Fail closed when the platform has no
     * chain or no candidate passes — the command never runs.
     */
    private selectRunner;
    /** Walk this platform's chain: sole candidate unprobed, several probed in order, none usable → unavailable. */
    private chainVerdict;
    /** One rung's functional probe (each at most once, via the chain walk). */
    private probeRunner;
    /** The Landlock launcher to probe and exec (test hook over the resolved one). */
    private landlockLauncher;
    /** The `sandbox-exec` executable to probe and exec (test hook over the system one). */
    private seatbeltExec;
    /**
     * The windows-acl runner argv prefix: the built lib/runner.js entry when
     * present (production), else the package source through tsx (development).
     * The prefix stays `[node, runner, ...]` — a future native-exe runner keeps
     * the same argv contract and only swaps these entries.
     */
    private windowsAclRunnerInvocation;
}
export default LocalSandboxProvider;
//# sourceMappingURL=index.d.ts.map