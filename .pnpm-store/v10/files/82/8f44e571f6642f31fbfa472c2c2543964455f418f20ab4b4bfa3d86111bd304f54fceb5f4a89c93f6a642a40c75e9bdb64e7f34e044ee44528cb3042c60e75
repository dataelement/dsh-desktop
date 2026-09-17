import { mkdir, opendir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, posix, resolve, win32 } from "node:path";
import z from "@deepseek-ai/schemastery";
import { DirectoryPicker, DirectoryPickerError } from "@deepseek-ai/dsh-host-directory-picker";
//#region lib/types/index.js
/**
* Browse backend of the directory-picker seam: registers `ctx.directoryPicker`
* with the `browse` capability — one-level directory listing and child-directory
* creation over the host filesystem via Node's stdlib (which already carries
* the per-OS adaptation). Nothing renders on the host display, so this backend
* serves remote clients the dialog backend cannot. Policy decisions (hidden
* entries flagged but returned, symlinks followed, whole-filesystem scope) are
* recorded in the directory-picker seam Agent Note.
* @module @deepseek-ai/dsh-host-directory-picker-browse
*/
/**
* Ancestor chain from the filesystem root to `target` inclusive — the
* breadcrumb rows of a listing, every one a jump target.
*/
function ancestryCrumbs(target) {
	const crumbs = [];
	let current = target;
	for (;;) {
		const parent = dirname(current);
		crumbs.unshift({
			name: parent === current ? current : basename(current),
			path: current,
			hidden: false
		});
		if (parent === current) return crumbs;
		current = parent;
	}
}
/**
* True when the path names one fixed filesystem location regardless of
* process state: POSIX-absolute on POSIX; on Windows only drive-qualified
* (`C:\…`) or complete UNC (`\\server\share…`) forms. Rooted drive-less
* forms (`\foo`, `/foo`) and incomplete UNC prefixes (`\\`, `\\server`)
* pass `isAbsolute` yet still resolve against the process's current drive.
* @param path - candidate path.
* @param platform - replaces `process.platform` for deterministic tests.
* @returns whether the path is fully qualified on the platform.
*/
function fullyQualified(path, platform = process.platform) {
	return platform === "win32" ? win32.isAbsolute(path) && /^(?:[A-Za-z]:[\\/]|[\\/]{2}[^\\/]+[\\/]+[^\\/]+)/.test(path) : posix.isAbsolute(path);
}
/**
* Insert a streamed candidate into the name-sorted bounded window, evicting
* the name-largest candidate when the window exceeds `keep`. Memory over an
* arbitrarily large level therefore stays O(keep) regardless of how many
* children the directory holds.
* @param window - the name-ascending window, mutated in place.
* @param candidate - the streamed candidate to place.
* @param keep - the window bound.
* @returns true when an eviction happened (the level has candidates beyond the window).
*/
function boundedInsert(window, candidate, keep) {
	if (window.length === keep && candidate.name.localeCompare(window[window.length - 1].name) >= 0) return true;
	let lo = 0;
	let hi = window.length;
	while (lo < hi) {
		const mid = lo + hi >>> 1;
		if (candidate.name.localeCompare(window[mid].name) < 0) hi = mid;
		else lo = mid + 1;
	}
	window.splice(lo, 0, candidate);
	if (window.length <= keep) return false;
	window.pop();
	return true;
}
/**
* Await `operation`, but reject with the signal's reason the moment it
* aborts. Node's filesystem reads are not retractable, so the operation
* itself keeps running against a handle the caller then closes — its late
* settlement is swallowed here so an abandoned read cannot surface as an
* unhandled rejection.
* @param operation - the in-flight filesystem step.
* @param signal - caller lifetime; absent means plain awaiting.
* @returns the operation's value.
*/
function raceAbort(operation, signal) {
	if (signal === void 0) return operation;
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			operation.catch(() => {});
			reject(asError(signal.reason));
		};
		if (signal.aborted) {
			onAbort();
			return;
		}
		signal.addEventListener("abort", onAbort, { once: true });
		operation.then((value) => {
			signal.removeEventListener("abort", onAbort);
			resolve(value);
		}, (reason) => {
			signal.removeEventListener("abort", onAbort);
			reject(asError(reason));
		});
	});
}
/** The thrown value as an Error (wire/abort reasons may be anything). */
function asError(reason) {
	return reason instanceof Error ? reason : new Error(String(reason));
}
/* v8 ignore start -- a close failure of an abandoned handle has no consumer, and forcing one needs a filesystem torn down mid-request. */
/** Swallow the close failure of a handle its caller already departed. */
function swallowCloseFailure() {}
/* v8 ignore stop */
/** Message text of an unknown thrown value. */
function messageOf(error) {
	/* v8 ignore next -- node:fs rejects with Error instances; the String arm only satisfies the unknown narrowing. */
	return error instanceof Error ? error.message : String(error);
}
/**
* One listing row for a dirent, following symlinks to directories; null for
* non-directories and broken/cyclic links (skipped silently — the browser
* shows what can be entered, and a broken link cannot).
*/
async function directoryRow(parent, name, isDirectory, isSymbolicLink, signal) {
	const path = join(parent, name);
	let enterable = isDirectory;
	if (!enterable && isSymbolicLink) try {
		enterable = (await raceAbort(stat(path), signal)).isDirectory();
	} catch {
		/* v8 ignore next 2 -- an abort landing mid-probe needs a stalled stat; the per-candidate check in list covers the settled path. */
		if (signal?.aborted) throw asError(signal.reason);
		return null;
	}
	if (!enterable) return null;
	return {
		name,
		path,
		hidden: name.startsWith(".")
	};
}
/** The `ctx.directoryPicker` browse implementation (stable capability object per service life). */
var BrowseDirectoryPicker = class extends DirectoryPicker {
	config;
	/**
	* `maxEntries` bounds the complete listing level a single `list` call may
	* materialize and put on the wire: at most this many child-directory rows
	* (hidden rows included), with `truncated` flagging a cut level. The
	* default follows GitHub's web UI, which truncates directory listings at
	* 1,000 entries.
	*/
	static Config = z.object({ maxEntries: z.natural().min(1).default(1e3) });
	browseCapability = {
		kind: "browse",
		list: (path, signal) => this.list(path, signal),
		createDirectory: (path, name) => this.createDirectory(path, name)
	};
	constructor(ctx, config) {
		super(ctx);
		this.config = config;
	}
	/**
	* The browse interaction capability.
	* @returns the stable `browse` capability object.
	*/
	capability() {
		return this.browseCapability;
	}
	async list(path, signal) {
		const home = homedir();
		if (path !== void 0 && !fullyQualified(path)) throw new DirectoryPickerError("directory-unreadable", path, `cannot list "${path}": not a fully qualified path`);
		const target = resolve(path ?? home);
		const keep = this.config.maxEntries + 1;
		const window = [];
		let evicted = false;
		try {
			const opening = opendir(target);
			const level = await raceAbort(opening, signal).catch((error) => {
				opening.then((dir) => dir.close().catch(swallowCloseFailure), () => {});
				throw error;
			});
			try {
				for (;;) {
					const dirent = await raceAbort(level.read(), signal);
					if (dirent === null) break;
					if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue;
					if (boundedInsert(window, {
						name: dirent.name,
						isDirectory: dirent.isDirectory(),
						isSymbolicLink: dirent.isSymbolicLink()
					}, keep)) evicted = true;
				}
			} finally {
				const closing = level.close();
				/* v8 ignore next 3 -- an abort between open and close needs a stalled read; the abandoned-close arm has no observable outcome. */
				if (signal?.aborted) closing.catch(swallowCloseFailure);
				else await closing;
			}
		} catch (error) {
			signal?.throwIfAborted();
			throw new DirectoryPickerError("directory-unreadable", target, `cannot list ${target}: ${messageOf(error)}`);
		}
		const entries = [];
		let truncated = evicted;
		for (const candidate of window) {
			signal?.throwIfAborted();
			const row = await directoryRow(target, candidate.name, candidate.isDirectory, candidate.isSymbolicLink, signal);
			if (row === null) continue;
			if (entries.length === this.config.maxEntries) {
				truncated = true;
				break;
			}
			entries.push(row);
		}
		return {
			path: target,
			home,
			crumbs: ancestryCrumbs(target),
			entries,
			truncated
		};
	}
	async createDirectory(path, name) {
		if (!fullyQualified(path)) throw new DirectoryPickerError("directory-create-failed", path, `cannot create under "${path}": not a fully qualified parent path`);
		const parent = resolve(path);
		if (name.trim() === "" || name === "." || name === ".." || /[/\\]/.test(name)) throw new DirectoryPickerError("directory-create-failed", join(parent, name), `"${name}" is not a single path segment`);
		const target = join(parent, name);
		try {
			await mkdir(target);
			return target;
		} catch (error) {
			if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST") throw new DirectoryPickerError("directory-exists", target, `${target} already exists`);
			throw new DirectoryPickerError("directory-create-failed", target, `cannot create ${target}: ${messageOf(error)}`);
		}
	}
};
//#endregion
export { boundedInsert, BrowseDirectoryPicker as default, fullyQualified, raceAbort };
