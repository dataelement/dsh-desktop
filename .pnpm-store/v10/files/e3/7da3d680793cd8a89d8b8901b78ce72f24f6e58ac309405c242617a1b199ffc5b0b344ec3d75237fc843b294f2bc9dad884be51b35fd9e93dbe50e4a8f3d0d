//#region lib/types/file-address.js
/**
* The `dsh-resource://file/…` address grammar: how a file is named across the
* Sidebar and the resource model, built and parsed without touching a
* filesystem.
* @module
*/
/** The scheme and type every file address opens with. */
const FILE_ADDRESS_PREFIX = "dsh-resource://file/";
/** Component-encode one id or path segment, keeping `:` literal for drive letters. */
function encodeSegment(segment) {
	return encodeURIComponent(segment).replace(/%3A/gi, ":");
}
/** Encode a `/`-separated path segment by segment. */
function encodePath(path) {
	return path.split("/").map(encodeSegment).join("/");
}
/** Whether a decoded first path segment is a Windows drive (`C:`). */
function isDriveSegment(segment) {
	return segment !== void 0 && /^[A-Za-z]:$/.test(segment);
}
/**
* Build the address of a file read through one Session.
* @param sessionId - the Session whose Host workspace resolves the path.
* @param path - absolute or workspace-relative path; backslashes are normalized to `/`, and leading `./` prefixes are dropped.
* @returns the `dsh-resource://file/session/<sessionId>/<path>` address.
*/
function sessionFileAddress(sessionId, path) {
	const normalized = path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");
	return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`;
}
/**
* Build the address of a file by its absolute path.
* @param path - absolute path; backslashes are normalized to `/` and the leading `/` is dropped,
*   except that a UNC path (`\\server\share`) keeps one empty first segment.
* @returns the `dsh-resource://file/absolute/<path>` address.
*/
function absoluteFileAddress(path) {
	const normalized = path.replace(/\\/g, "/");
	const unc = normalized.startsWith("//");
	const absolute = normalized.replace(/^\/+/, "");
	return `${FILE_ADDRESS_PREFIX}absolute/${unc ? "/" : ""}${encodePath(absolute)}`;
}
/**
* Read a file address back into its parts without resolving `.` or `..`.
* Query and fragment suffixes are ignored; encoded path segments are decoded.
* @param address - a candidate address.
* @returns the parts, or `undefined` when the string is not a `dsh-resource://file/` URI in a known scope with a path, or a segment is not validly encoded.
*/
function parseFileAddress(address) {
	try {
		if (!address.startsWith(FILE_ADDRESS_PREFIX)) return void 0;
		const end = address.search(/[?#]/);
		const [scope, ...rest] = address.slice(20, end === -1 ? void 0 : end).split("/");
		if (scope === "session") {
			const [id, ...segments] = rest;
			if (id === void 0 || id === "" || segments.length === 0) return void 0;
			return {
				scope,
				sessionId: decodeURIComponent(id),
				path: segments.map(decodeURIComponent).join("/")
			};
		}
		if (scope === "absolute") {
			const unc = rest[0] === "" && rest.length > 1;
			const segments = (unc ? rest.slice(1) : rest).map(decodeURIComponent);
			if (segments.length === 0 || segments[0] === "") return void 0;
			if (unc) return {
				scope,
				path: `//${segments.join("/")}`
			};
			return {
				scope,
				path: isDriveSegment(segments[0]) ? segments.join("/") : `/${segments.join("/")}`
			};
		}
		return;
	} catch {
		return;
	}
}
//#endregion
//#region lib/types/index.js
/**
* Browser-safe Workspace path and display helpers.
* @module @deepseek-ai/dsh-util-workspace-path
*/
/** Whether a path uses a Windows drive or UNC prefix. */
function isWindowsStylePath(value) {
	return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith("\\\\");
}
/**
* Whether a path is absolute in either spelling the Host accepts: POSIX (`/a/b`) or Windows drive or UNC.
* @param path - the path to classify.
* @returns `true` for an absolute path; `false` for a Workspace-relative one.
*/
function isAbsoluteWorkspacePath(path) {
	return path.startsWith("/") || isWindowsStylePath(path);
}
/**
* Resolve a Workspace-relative path into the Host-facing spelling used by path operations.
* @param cwd - Session Workspace root, when known.
* @param path - Absolute or Workspace-relative path.
* @returns an absolute path when a Workspace root is available, otherwise the original path.
*/
function resolveWorkspacePath(cwd, path) {
	if (isAbsoluteWorkspacePath(path)) return path;
	if (cwd === void 0 || cwd === "") return path;
	const separator = isWindowsStylePath(cwd) && cwd.includes("\\") ? "\\" : "/";
	return `${cwd.replace(/[/\\]+$/, "")}${separator}${path.replace(/^[/\\]+/, "")}`;
}
/**
* Abbreviate a POSIX home directory for display.
* @param path - Absolute or already-short display path.
* @param home - Host account home; absent skips abbreviation.
* @returns `~` or `~/…` for the POSIX home and its descendants, otherwise `path`.
*/
function abbreviateHomePath(path, home) {
	if (home === void 0 || home === "") return path;
	if (isWindowsStylePath(path) || isWindowsStylePath(home)) return path;
	const root = home.replace(/\/+$/, "");
	if (root === "" || root === "/") return path;
	if (path.replace(/\/+$/, "") === root) return "~";
	if (path.startsWith(`${root}/`)) return `~${path.slice(root.length)}`;
	return path;
}
/**
* Read the final non-empty segment of a Workspace path for display.
* Workspace-label surfaces use this helper instead of deriving another basename.
* @param path - Workspace directory path using POSIX or Windows separators.
* @returns the final segment, or an empty string for a separator-only path.
*/
function workspaceTitleOf(path) {
	const trimmed = path.replace(/[/\\]+$/, "");
	const separator = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
	return trimmed.slice(separator + 1);
}
/**
* Split a path for display: the directories through their last separator, and
* the final segment after it. Both `/` and `\` separate, so a Windows path
* splits where its own segments end; trailing separators are dropped first, so
* a directory path names its own last segment. A path with no separator, or a
* separator-only path, is all name.
* @param path - file or directory path using POSIX or Windows separators.
* @returns the directory prefix (possibly empty) and the final segment.
*/
function pathPartsOf(path) {
	const trimmed = path.replace(/[/\\]+$/, "");
	if (trimmed === "") return {
		directory: "",
		name: path
	};
	const cut = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\")) + 1;
	return {
		directory: trimmed.slice(0, cut),
		name: trimmed.slice(cut)
	};
}
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
function fileAddressFor(sessionId, cwd, path) {
	const normalized = path.replace(/\\/g, "/");
	if (!isAbsoluteWorkspacePath(normalized)) return sessionFileAddress(sessionId, normalized);
	const root = cwd === void 0 ? "" : cwd.replace(/\\/g, "/").replace(/\/+$/, "");
	if (root !== "" && normalized === root) return sessionFileAddress(sessionId, "");
	if (root !== "" && normalized.startsWith(`${root}/`)) return sessionFileAddress(sessionId, normalized.slice(root.length + 1));
	return sessionFileAddress(sessionId, normalized);
}
/**
* Strip the workspace root from a workspace-rooted absolute path (display only).
* @param text - the path to shorten.
* @param cwd - session workspace root; absent or empty leaves the path unchanged.
* @returns the path relative to the workspace root, or unchanged when it is not rooted there.
*/
function relativizeToCwd(text, cwd) {
	if (cwd === void 0 || cwd === "") return text;
	const root = cwd.replace(/[/\\]+$/, "");
	if (text.startsWith(`${root}/`) || text.startsWith(`${root}\\`)) return text.slice(root.length + 1);
	return text;
}
//#endregion
export { abbreviateHomePath, absoluteFileAddress, fileAddressFor, isAbsoluteWorkspacePath, parseFileAddress, pathPartsOf, relativizeToCwd, resolveWorkspacePath, sessionFileAddress, workspaceTitleOf };
