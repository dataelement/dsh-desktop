/**
 * Canonical directory-boundary checks for the Windows ACL workspace and
 * private-temp capabilities.
 * @module @deepseek-ai/dsh-sandbox-windows-acl/path-boundary
 */
/**
 * Reject a temp parent that is inside the workspace: every child created
 * below it would inherit the standing workspace capability.
 * @param workspaceRoot - the canonical workspace root that receives the standing ACE.
 * @param tempRoot - the existing parent beneath which a private temp child would be created.
 */
export declare function assertTempRootOutsideWorkspace(workspaceRoot: string, tempRoot: string): void;
/**
 * Reject overlap between an actual private temp directory and any writable
 * directory: either inheritance direction would merge the two capabilities.
 * @param writableDirs - directories carrying the standing workspace capability.
 * @param tempDir - the existing directory carrying the revocable temp capability.
 */
export declare function assertPrivateTempDisjoint(writableDirs: readonly string[], tempDir: string): void;
//# sourceMappingURL=path-boundary.d.ts.map