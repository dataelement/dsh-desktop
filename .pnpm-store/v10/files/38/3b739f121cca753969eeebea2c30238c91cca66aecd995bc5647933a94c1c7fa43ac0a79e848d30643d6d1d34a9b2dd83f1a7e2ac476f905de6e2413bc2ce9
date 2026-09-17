/**
 * Whether a path is absolute in either spelling the Host accepts: POSIX (`/a/b`) or Windows drive or UNC.
 * @param path - the path to classify.
 * @returns `true` for an absolute path; `false` for a Workspace-relative one.
 */
export declare function isAbsoluteWorkspacePath(path: string): boolean;
/**
 * Resolve a Workspace-relative path into the Host-facing spelling used by path operations.
 * @param cwd - Session Workspace root, when known.
 * @param path - Absolute or Workspace-relative path.
 * @returns an absolute path when a Workspace root is available, otherwise the original path.
 */
export declare function resolveWorkspacePath(cwd: string | undefined, path: string): string;
/**
 * Abbreviate a POSIX home directory for display.
 * @param path - Absolute or already-short display path.
 * @param home - Host account home; absent skips abbreviation.
 * @returns `~` or `~/…` for the POSIX home and its descendants, otherwise `path`.
 */
export declare function abbreviateHomePath(path: string, home?: string): string;
/**
 * Read the final non-empty segment of a Workspace path for display.
 * Workspace-label surfaces use this helper instead of deriving another basename.
 * @param path - Workspace directory path using POSIX or Windows separators.
 * @returns the final segment, or an empty string for a separator-only path.
 */
export declare function workspaceTitleOf(path: string): string;
/**
 * Split a path for display: the directories through their last separator, and
 * the final segment after it. Both `/` and `\` separate, so a Windows path
 * splits where its own segments end; trailing separators are dropped first, so
 * a directory path names its own last segment. A path with no separator, or a
 * separator-only path, is all name.
 * @param path - file or directory path using POSIX or Windows separators.
 * @returns the directory prefix (possibly empty) and the final segment.
 */
export declare function pathPartsOf(path: string): {
    readonly directory: string;
    readonly name: string;
};
export * from './file-address.ts';
/**
 * The address for a path as a caller holds it: a relative path, or an absolute
 * path inside the Session's workspace, becomes a `session`-scoped address; an
 * absolute path outside it, or one whose workspace root is unknown, keeps its
 * absolute path in that Session's address.
 * @param sessionId - the Session the path is read in.
 * @param cwd - that Session's workspace root, when known.
 * @param path - absolute or workspace-relative path, in either separator spelling.
 * @returns the `dsh-resource://file/…` address.
 */
export declare function fileAddressFor(sessionId: string, cwd: string | undefined, path: string): string;
/**
 * Strip the workspace root from a workspace-rooted absolute path (display only).
 * @param text - the path to shorten.
 * @param cwd - session workspace root; absent or empty leaves the path unchanged.
 * @returns the path relative to the workspace root, or unchanged when it is not rooted there.
 */
export declare function relativizeToCwd(text: string, cwd: string | undefined): string;
//# sourceMappingURL=index.d.ts.map