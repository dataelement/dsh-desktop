import { opendir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
//#region lib/types/index.js
/**
* Shared filesystem path helpers for DeepSeek Harness user data.
*
* @module @deepseek-ai/dsh-home-paths
*/
/** Directory name for the default DeepSeek Harness home under the OS home. */
const DSH_HOME_DIR_NAME = ".dsh";
/** Stable user-facing display form for the default DeepSeek Harness home. */
const DEFAULT_DSH_HOME_DISPLAY = `~/${DSH_HOME_DIR_NAME}`;
/** Environment variable that overrides the default DeepSeek Harness home. */
const DSH_HOME_ENV = "DSH_HOME";
/**
* Give a native filesystem watcher one canonical spelling of a path, even
* when its final components do not exist yet. The deepest existing ancestor
* is resolved through {@link realpath}; when a suffix is missing, that
* ancestor is also proved to be an enumerable directory before the suffix is
* restored. This prevents Windows from treating a regular-file ancestor as
* ordinary absence, and prevents short-name aliases from being mixed with
* long paths emitted by the native watcher backend.
* @param path - Watch target or root, resolved against the current directory.
* @returns the target with its existing ancestor canonicalized.
* @throws when ancestor traversal encounters an error other than absence, or
* the existing ancestor of a missing suffix is not an enumerable directory.
*/
async function canonicalizeWatchPath(path) {
	let current = resolve(path);
	const missing = [];
	while (true) try {
		const canonical = await realpath(current);
		if (missing.length > 0) await (await opendir(canonical)).close();
		return join(canonical, ...missing.reverse());
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
		const parent = dirname(current);
		/* v8 ignore next -- a filesystem root exists, so traversal resolves before this guard */
		if (parent === current) throw error;
		missing.push(basename(current));
		current = parent;
	}
}
/**
* Resolve the default DeepSeek Harness home using Node's platform path rules.
* @returns the absolute default harness home path.
*/
function defaultDshHome() {
	return join(homedir(), DSH_HOME_DIR_NAME);
}
/**
* Expand supported tilde prefixes against the operating-system home.
* @param path - configured path that may begin with `~`, `~/`, or `~\`.
* @returns the expanded path, or the original value when no supported prefix is present.
*/
function expandHomePath(path) {
	if (path === "~") return homedir();
	if (path.startsWith("~/") || path.startsWith("~\\")) return join(homedir(), path.slice(2));
	return path;
}
/**
* Resolve the single-root DeepSeek Harness home.
*
* Precedence, highest first: an explicit configured path, `$DSH_HOME`, then
* `~/.dsh`. The harness keeps all user data under one root. An empty or
* whitespace-only `$DSH_HOME` is treated as unset, so a blank override never
* resolves the home to the current working directory.
* @param configured - explicit harness-home override, which has highest precedence.
* @param env - environment mapping used to read `DSH_HOME`.
* @returns the normalized absolute harness home path.
*/
function resolveDshHome(configured, env = process.env) {
	const fromEnv = env[DSH_HOME_ENV];
	return resolve(expandHomePath(configured ?? (fromEnv !== void 0 && fromEnv.trim().length > 0 ? fromEnv : defaultDshHome())));
}
/**
* Join path segments onto the resolved DeepSeek Harness home.
* @param segments - path segments appended to the Harness home; an empty list returns the home itself.
* @returns the normalized absolute joined path.
*/
function dshHomePath(...segments) {
	return join(resolveDshHome(), ...segments);
}
/**
* Describe a resolved harness home symbolically for user-facing display.
*
* It never returns an absolute machine path: the default home is labelled
* `~/.dsh`, and any configured home is labelled `$DSH_HOME`.
* @param resolvedHome - the absolute path returned by {@link resolveDshHome}.
* @returns `~/.dsh` for the default home, otherwise `$DSH_HOME`.
*/
function dshHomeDisplay(resolvedHome) {
	return resolvedHome === resolve(defaultDshHome()) ? DEFAULT_DSH_HOME_DISPLAY : `$${DSH_HOME_ENV}`;
}
//#endregion
export { DEFAULT_DSH_HOME_DISPLAY, DSH_HOME_DIR_NAME, DSH_HOME_ENV, canonicalizeWatchPath, defaultDshHome, dshHomeDisplay, dshHomePath, expandHomePath, resolveDshHome };
