/**
 * The windows-acl confinement runner: the argv-prefix wrapper the sandbox
 * seam spawns in place of the caller's command. It creates the
 * WRITE_RESTRICTED token with the workspace write-SID allowlist, spawns the
 * wrapped argv under it with the CALLER'S stdio inherited (bytes flow
 * straight through), mirrors the child's exit code, and revokes its temp
 * grant on exit (workspace ACEs stay standing as the reuse cache).
 *
 * Stable argv contract (the seam builds it; a native-exe replacement would
 * keep the same contract):
 *   [node, runner.js, '--workspace', <dir>, '--temp', <dir>,
 *    '--mode', <read-only|workspace-write>,
 *    ['--write-sid', <S-1-4-…>,
 *     '--temp-write-sid', <S-1-4-…>], '--', <argv...>]
 *
 * Modes:
 *  - workspace-write: the workspace and temp directories carry distinct
 *    capability-SID Write grants; other ACL-addressable writes are denied
 *    except for the documented Everyone and hard-link boundaries.
 *  - read-only: no capability-SID grants; the restricting list carries no
 *    capability SID, so a standing grant ACE from an earlier
 *    workspace-write period stays inert. BOTH modes drop Authenticated Users
 *    (CIM unavailable — documented in README) and INTERACTIVE/LOCAL (the
 *    Public tree writes are denied); the two lists share the keep-alive group
 *    (logon SID, EVERYONE) and differ only by the capabilities.
 *
 * `--write-sid` + `--temp-write-sid`: the seam's grant contract — the
 * CALLER has already materialized distinct workspace and private-temp ACEs
 * and owns their revocation, so the runner neither grants nor revokes
 * (`manageDacls: false`). Both values are checked against their owning paths.
 * Without the pair (standalone/agentless use), workspace-write treats
 * `--temp` as a ROOT, creates a random private child directory, derives its
 * own temp SID, and removes that directory after the child exits. In both
 * flows the runner rewrites TMP/TEMP in its OWN environment to the private
 * directory before spawning; the child inherits that block (`lpEnvironment`
 * NULL; an explicit block through koffi trips ERROR_INVALID_PARAMETER in
 * CreateProcessAsUserW, verified empirically). Read-only leaves the ambient
 * temp entries untouched (writes there are denied anyway).
 *
 * Failure contract: every runner-side failure (bad args, missing
 * directories, token/grant/spawn errors) prints `windows-acl-run: <detail>`
 * to stderr and exits 127 — the seam's RUNNER_FAILURE_RULES matches that
 * signature. The child is NEVER spawned unrestricted.
 * @module @deepseek-ai/dsh-sandbox-windows-acl/runner
 */
export {};
//# sourceMappingURL=runner.d.ts.map