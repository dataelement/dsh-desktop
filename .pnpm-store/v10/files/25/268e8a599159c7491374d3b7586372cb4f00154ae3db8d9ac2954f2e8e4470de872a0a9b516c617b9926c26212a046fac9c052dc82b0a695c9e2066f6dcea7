/**
 * The `dsh-resource://file/…` address grammar: how a file is named across the
 * Sidebar and the resource model, built and parsed without touching a
 * filesystem.
 * @module
 */
/**
 * A file resource address, in one of two scopes.
 *
 * Every resource address is `dsh-resource://<type>/…`, the URI host naming the
 * resource protocol; for `file` the path opens with the scope:
 *
 * - `dsh-resource://file/session/<sessionId>/<path>` names a file by its path,
 *   relative to that Session's workspace root or absolute; the
 *   Host resolves it against the root it holds for the Session.
 * - `dsh-resource://file/absolute/<path>` names a file by its absolute path with
 *   the leading `/` dropped (`dsh-resource://file/absolute/home/ys/notes.txt`;
 *   Windows `dsh-resource://file/absolute/C:/x/y.txt`; a UNC path keeps an empty
 *   first segment, `dsh-resource://file/absolute//server/share/x.txt`). It carries
 *   no Session.
 *
 * Every id and path segment is component-encoded, so a name carrying `#`, `?`,
 * or a space survives the round trip; `:` stays literal so a drive letter reads
 * as written.
 */
export type FileAddress = {
    readonly scope: 'session';
    /** The Session whose Host workspace resolves the path. */
    readonly sessionId: string;
    /** Absolute or workspace-relative `/`-separated path; empty for the workspace root itself. */
    readonly path: string;
} | {
    readonly scope: 'absolute';
    /** Absolute `/`-separated path: `/a/b` on POSIX, `C:/a/b` for a Windows drive, `//server/share/a` for a UNC path. */
    readonly path: string;
};
/**
 * Build the address of a file read through one Session.
 * @param sessionId - the Session whose Host workspace resolves the path.
 * @param path - absolute or workspace-relative path; backslashes are normalized to `/`, and leading `./` prefixes are dropped.
 * @returns the `dsh-resource://file/session/<sessionId>/<path>` address.
 */
export declare function sessionFileAddress(sessionId: string, path: string): string;
/**
 * Build the address of a file by its absolute path.
 * @param path - absolute path; backslashes are normalized to `/` and the leading `/` is dropped,
 *   except that a UNC path (`\\server\share`) keeps one empty first segment.
 * @returns the `dsh-resource://file/absolute/<path>` address.
 */
export declare function absoluteFileAddress(path: string): string;
/**
 * Read a file address back into its parts without resolving `.` or `..`.
 * Query and fragment suffixes are ignored; encoded path segments are decoded.
 * @param address - a candidate address.
 * @returns the parts, or `undefined` when the string is not a `dsh-resource://file/` URI in a known scope with a path, or a segment is not validly encoded.
 */
export declare function parseFileAddress(address: string): FileAddress | undefined;
//# sourceMappingURL=file-address.d.ts.map