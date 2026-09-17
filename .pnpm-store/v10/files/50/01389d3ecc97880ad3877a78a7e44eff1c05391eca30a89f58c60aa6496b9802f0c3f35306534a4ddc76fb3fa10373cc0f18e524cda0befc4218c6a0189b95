/**
 * Windows ACL write-restriction sandbox backend for the DeepSeek Harness
 * sandbox seam. Mirrors the mechanism of github.com/huoyaoyuan/
 * windows-acl-restrict-poc @ 10e4dfb (the fixed revision): a WRITE_RESTRICTED
 * token whose restricting SIDs include distinct workspace and temp write
 * SIDs that this sandbox adds to their owning directories' DACLs — the
 * intersection check then allows writes exactly where either capability has
 * a Write ACE, and nowhere else those SIDs are concerned (the check ALSO
 * inherits the ambient write ACEs of the other restricting SIDs — the
 * keep-alive group logon SID + Everyone; Authenticated Users, INTERACTIVE,
 * and LOCAL are absent from both lists — see the seam's dual-list contract
 * in `packages/sandbox/sandbox-local` and the package README's Modes section
 * for the complete boundary). The write SID is the per-WORKSPACE identity
 * ({@link workspaceWriteSid}): deterministic from the canonical workspace
 * path, so the workspace-root ACE materializes once per workspace per
 * machine and every later provision hits the exact-ACE skip — the
 * grant-reuse story the per-session random SID paid a full tree propagation
 * per session for. Each private temp directory instead receives its own SID,
 * so sibling sessions sharing a workspace cannot enter one another's temp
 * trees. Unlike the POC, every API failure throws with the API
 * name and exact Win32 code; a child is NEVER spawned unrestricted.
 *
 * Known boundaries (inherent to restricted tokens, not this port):
 *  - writes are restricted; reads, network, and process visibility are NOT
 *    (WRITE_RESTRICTED intersects only write accesses);
 *  - console isolation is unavailable — children share the host console
 *    (CREATE_NO_WINDOW / CREATE_NEW_CONSOLE children die with
 *    STATUS_DLL_INIT_FAILED under the restriction);
 *  - the private temp directory and every writable directory must be owned by the
 *    caller (owner-implicit WRITE_DAC);
 *  - grants are standing ACE mutations on real directories. WORKSPACE grants
 *    are deliberately never revoked — the ACE is the cross-session reuse
 *    cache (revoking would force the next session to re-propagate the whole
 *    tree). TEMP grants are revocable: dispose() removes them so a standing
 *    inheritable ACE never outlives its session's temp directory. The
 *    ambient temp root is never granted implicitly. With `manageDacls: false`
 *    the CALLER owns the DACLs (the sandbox seam's grant reuse):
 *    init()/dispose() skip grant/revoke entirely and the caller must not
 *    revoke under live children.
 * @module @deepseek-ai/dsh-sandbox-windows-acl
 */
export { AclWriteGrant } from './grant.ts';
export { assertTempRootOutsideWorkspace } from './path-boundary.ts';
export { tempWriteSid, workspaceWriteSid } from './workspace-sid.ts';
/** Construction options: the workspace/temp allowlists and their distinct SID identities. */
export interface AclSandboxOptions {
    /** Directories the confined child may write into (must exist and be caller-owned). */
    writableDirs: readonly string[];
    /**
     * Existing private temp directory to grant. Workspace-write callers must
     * pass it explicitly or pass null to disable temp writes; the ambient temp
     * root is never an implicit grant. Read-only accepts only null/undefined.
     */
    tempDir?: string | null;
    /**
     * The write SID forming the workspace-write allowlist: REQUIRED under
     * workspace-write, ignored (and must be absent) under read-only. Callers
     * derive it from the workspace via {@link workspaceWriteSid} — the identity
     * is per workspace, not per sandbox instance, so the workspace-root ACE
     * outlives every instance and later provisions hit the exact-ACE skip.
     */
    writeSid?: string;
    /**
     * The private temp directory's write SID. Required whenever
     * workspace-write grants a temp directory, absent otherwise. It must be
     * distinct from {@link writeSid}, so sibling sessions sharing a workspace
     * cannot use the standing workspace capability in one another's temp tree.
     */
    tempWriteSid?: string;
    /**
     * The file-effect mode this instance confines under — selects the
     * restricted token's restricting-SID list (I for read-only, J for
     * workspace-write) and MUST match the grant shape: read-only pairs with
     * zero grants. The runner validates the argv-borne mode string at its
     * boundary; this typed seam trusts the union.
     */
    mode: 'read-only' | 'workspace-write';
    /**
     * Whether this instance owns its DACL grants (default true). False means
     * the CALLER has already materialized the ACEs (the sandbox seam's
     * workspace/temp capability lifecycle): init()/dispose() skip grant/revoke entirely —
     * the caller holds the grants for its own lifetime and revokes them.
     */
    manageDacls?: boolean;
}
/** Per-spawn options: the program, its argv/cwd, and the stdio shape. */
export interface AclSandboxSpawnOptions {
    /** Program to run (resolved via PATH search when unqualified, like CreateProcess). */
    command: string;
    /** Arguments, quoted per CommandLineToArgvW rules. */
    args?: readonly string[];
    /** Working directory; defaults to the caller's cwd. */
    cwd?: string;
    /**
     * 'pipe' (default): capture stdout/stderr via anonymous pipes.
     * 'inherit': the child inherits the caller's stdio directly (runner usage —
     * bytes flow straight through), always wrapped in a kill-on-close job so the
     * child dies with the caller; stdout/stderr in the result are empty.
     */
    stdio?: 'pipe' | 'inherit';
}
/** A settled confined child: captured stdio and the exit code. */
export interface AclSandboxChildResult {
    stdout: Buffer;
    stderr: Buffer;
    exitCode: number;
}
/** A running confined child: its pid and a settlement promise. */
export interface AclSandboxChild {
    /** Child process id. */
    pid: number;
    /** Resolve stdout/stderr and the exit code once the child exits. */
    wait(): Promise<AclSandboxChildResult>;
}
/**
 * One write-restricted sandbox instance: token + write-SID grants + spawn.
 * `init()` is fail-closed — any Win32 failure revokes the revocable (temp)
 * grants and throws; `dispose()` revokes the temp grants, leaves the
 * standing workspace ACEs in place (the cross-instance reuse cache), frees
 * every allocation, and reports every cleanup failure. With
 * `manageDacls: false` the caller owns the grants (the sandbox seam's grant
 * reuse): init() applies none and dispose() revokes none.
 */
export declare class AclSandbox {
    /** Absolute writable directories (constructor-validated). */
    readonly writableDirs: string[];
    /** The workspace SID string whose ACEs form the workspace allowlist. */
    readonly writeSid: string | undefined;
    /** The private temp directory's write SID (workspace-write with temp only). */
    readonly tempWriteSid: string | undefined;
    /** The file-effect mode — the restricted token's restricting-SID list selection. */
    readonly mode: 'read-only' | 'workspace-write';
    private readonly tempDirOption;
    private readonly manageDacls;
    private tempDirResolved;
    private api;
    private token;
    private writeSidPtr;
    private tempWriteSidPtr;
    /** The well-known/logon SID allocations init() makes; freed by dispose() alongside the write SIDs. */
    private sidAllocations;
    private grantedPaths;
    constructor(options: AclSandboxOptions);
    /** Resolved temp directory (available after init; null when temp grants are disabled). */
    get tempDir(): string | null | undefined;
    /** Create the restricted token and apply the capability-SID grants. Idempotent-unsafe: once per instance. */
    init(): Promise<void>;
    /**
     * Spawn a process under the restricted token. Fails closed: throws on every
     * Win32 failure; the child is never created unrestricted. With
     * `stdio: 'inherit'` the child shares the caller's stdio directly and is
     * placed in a kill-on-close job (dies with the caller). Call dispose() only
     * after all children have exited — revoking grants under a live child
     * removes its remaining write allowance.
     * @param options - the program, argv/cwd, and stdio shape.
     * @returns the running child.
     */
    spawn(options: AclSandboxSpawnOptions): AclSandboxChild;
    /**
     * Revoke the revocable (temp) grants, free the SID, close the token; the
     * standing workspace ACEs stay (the reuse cache). Reports every cleanup
     * failure.
     */
    dispose(): void;
}
//# sourceMappingURL=index.d.ts.map