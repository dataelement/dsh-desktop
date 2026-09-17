/**
 * Restricted-token construction: open the current process token, extract its
 * logon SID, build the well-known SIDs, and call CreateRestrictedToken with
 * the POC's restricting-SID allowlist. Every API call is checked; any failure
 * throws with the API name and the exact Win32 code — the original POC ignored
 * all of these and silently ran children with the FULL, unrestricted token.
 * @module @deepseek-ai/dsh-sandbox-windows-acl/token
 */
import type { NativePtr, Win32Bindings } from './ffi.ts';
/**
 * Open the current process's access token with the rights
 * CreateRestrictedToken requires (the POC's OpenProcessToken call; the token
 * handle is obtained through a real OpenProcess handle because the
 * GetCurrentProcess() pseudo-handle is not addressable through koffi).
 * @param api - the binding table.
 * @returns the opened token handle.
 */
export declare function openCurrentProcessToken(api: Win32Bindings): NativePtr;
/**
 * Find and copy the token's logon session SID (S-1-5-5-x-y, attribute
 * SE_GROUP_LOGON_ID). The restricted token needs it for WinSta0/desktop and
 * other per-logon objects; the POC extracts it the same way.
 * @param api - the binding table.
 * @param token - the token whose groups are scanned.
 * @returns a copied logon SID (thrown when the token carries none).
 */
export declare function findLogonSid(api: Win32Bindings, token: NativePtr): NativePtr;
/**
 * Create one well-known SID (68-byte buffer) and assert its validity.
 * @param api - the binding table.
 * @param type - the WELL_KNOWN_SID_TYPE to create.
 * @returns the created SID pointer.
 */
export declare function makeWellKnownSid(api: Win32Bindings, type: number): NativePtr;
/**
 * Merge one full-access allow ACE for `sidPtr` into the token's DEFAULT DACL
 * — the DACL every NEW object the token holder creates (without an explicit
 * security descriptor) takes. The restricted token inherits the user's
 * default DACL verbatim, which names no restricting SID: a new anonymous pipe
 * (child stdio) therefore fails the write pass-2 check at creation
 * (ERROR_ACCESS_DENIED; Node surfaces it as spawn EPERM), breaking every
 * piped-stdio grandchild spawn. The merged ACE names a RESTRICTING SID (the
 * write SID under workspace-write, Everyone under read-only), so each new
 * object's own DACL passes pass-2 while object creation itself stays gated by
 * the parent container's DACL (files outside the granted trees remain
 * uncreatable). Fails closed: any Win32 failure throws before the spawn.
 * @param api - the binding table.
 * @param token - the restricted token to adjust (requires TOKEN_ADJUST_DEFAULT).
 * @param sidPtr - the restricting SID whose full-access ACE joins the default DACL.
 */
export declare function setTokenDefaultDaclGrant(api: Win32Bindings, token: NativePtr, sidPtr: NativePtr): void;
/** The well-known SID packed into every restricted token's restricting list. */
export interface RestrictingSidSet {
    world: NativePtr;
}
/**
 * Create the write-restricted token with the mode-selected restricting list
 * (verified on Win11 26200, see the POC-worktree restrict-variant harness):
 *  - read-only:       [logon SID, EVERYONE]
 *  - workspace-write: [logon SID, EVERYONE, workspace SID, optional temp SID]
 *
 * The logon SID + EVERYONE keep-alive group is shared by both modes: early
 * DLL init dies with 0xC0000142 and CNG (`\Device\CNG` write trustee —
 * pwsh crashes 0xE0434352) fails without them. The write SIDs join ONLY
 * workspace-write — read-only carries no write SID, so a standing grant ACE
 * from an earlier workspace-write period (a `/permission` mode downgrade, or
 * a crash-resumed session) stays INERT under read-only: the WRITE_RESTRICTED
 * pass-2 check grants only what the restricting list carries, keeping that
 * workspace grant inert under read-only while the unrevoked ACE keeps the
 * re-upgrade free (the grant's exact-ACE skip — no re-propagation).
 * Everyone's own ambient grants remain the documented partial boundary.
 * Authenticated Users is absent from BOTH lists: the WMI
 * namespace security check fails (0x80041003), so CIM is unavailable in
 * every confined mode, and the C:\-root tree-creation escape (standing
 * `AU:(AD)` + `AU:(OI)(CI)(IO)(M)` ACEs) is closed in both — documented in
 * README. INTERACTIVE/LOCAL are absent from BOTH lists too — the host's
 * Public tree grants write to INTERACTIVE, so removing it closes that
 * escape. S-1-2-1 (console logon) is intentionally absent: the package
 * README's "Console isolation is unavailable" entry records the verified
 * failure modes. FAILS CLOSED: any failure throws — never
 * spawn unrestricted.
 * @param api - the binding table.
 * @param currentToken - the process token to restrict.
 * @param logonSid - the copied logon session SID.
 * @param writeSids - the distinct write SIDs forming the workspace and
 * optional temp allowlists (workspace-write only; empty under read-only).
 * @param known - the well-known SIDs entering the restricting list.
 * @param mode - selects the restricting list (workspace-write adds the capability SIDs).
 * @returns the restricted token handle.
 */
export declare function createRestrictedToken(api: Win32Bindings, currentToken: NativePtr, logonSid: NativePtr, writeSids: readonly NativePtr[], known: RestrictingSidSet, mode: 'read-only' | 'workspace-write'): NativePtr;
//# sourceMappingURL=token.d.ts.map