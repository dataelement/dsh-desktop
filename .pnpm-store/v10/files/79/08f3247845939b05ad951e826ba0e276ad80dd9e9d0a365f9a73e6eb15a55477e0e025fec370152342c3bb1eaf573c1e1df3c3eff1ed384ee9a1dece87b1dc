import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import z from "@deepseek-ai/schemastery";
import { SpillLocator, SpillStore } from "@deepseek-ai/dsh-spill";
import { lstat, mkdir, open, readdir, realpath, rmdir, unlink } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
//#region lib/types/store.js
/**
* Cordis-free storage mechanics for the local spill backend: private
* session-scoped directory selection, safe-name derivation, path-traversal
* protection, and the exclusive owner-only write.
*
* @module @deepseek-ai/dsh-spill-local/store
*/
/** Prefix shared by default-root creation and startup discovery. */
const DEFAULT_ROOT_PREFIX = "dsh-spill-";
/**
* Test a caught value for a Node system error code.
*
* @param error The caught value.
* @param code The expected system error code.
* @returns Whether the code matches.
*/
function isErrno(error, code) {
	return error instanceof Error && error.code === code;
}
let defaultRoot;
/**
* Return the lazily-created private per-process spill root.
*
* @returns The private root path.
*/
function privateRoot() {
	defaultRoot ??= mkdtempSync(join(tmpdir(), DEFAULT_ROOT_PREFIX));
	return defaultRoot;
}
/**
* Encode an arbitrary string as one safe path segment, injectively over ALL JS
* (UTF-16) strings. A session id / suggested name is untrusted input, so this
* neutralizes `../`, absolute paths, NUL, and separators before any filesystem
* use. Each code unit is kept literal (`[A-Za-z0-9._-]`, minus `~`) or escaped
* as `~XXXX`; `~` is itself escaped, so the mapping is reversible and distinct
* inputs never collide. The whole-segment tokens `.`/`..` are escaped so they
* can never traverse. An empty string encodes to `~` (never an empty segment).
*
* @param raw Untrusted text.
* @returns One injective filesystem-safe path segment.
*/
function encodeSegment(raw) {
	if (raw.length === 0) return "~";
	if (raw === ".") return "~002E";
	if (raw === "..") return "~002E~002E";
	let out = "";
	for (let i = 0; i < raw.length; i++) {
		const code = raw.charCodeAt(i);
		const ch = String.fromCharCode(code);
		out += ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch) ? ch : "~" + code.toString(16).toUpperCase().padStart(4, "0");
	}
	return out;
}
/**
* Derive the stable session-scoped directory under a spill root.
*
* @param root The spill root.
* @param sessionId The owning session id.
* @returns The stable session-scoped directory.
*/
function sessionDir(root, sessionId) {
	return join(root, `session-${createHash("sha256").update(sessionId).digest("hex").slice(0, 12)}`);
}
/**
* Write text to a fresh 0600 file below its private session directory.
* @param options The save request.
* @returns The saved path and UTF-8 byte length.
*/
async function saveTextFile(options) {
	const dir = sessionDir(options.root, options.sessionId);
	const path = join(dir, `${randomBytes(6).toString("hex")}-${encodeSegment(options.suggestedName)}`);
	let handle;
	for (;;) {
		await mkdir(dir, {
			recursive: true,
			mode: 448
		});
		try {
			handle = await open(path, "wx", 384);
			break;
		} catch (error) {
			/* v8 ignore start -- requires another process to remove the directory
			between mkdir and open, or an external permission/IO race. */
			if (isErrno(error, "ENOENT")) continue;
			throw error;
		}
	}
	try {
		await handle.writeFile(options.content);
	} finally {
		await handle.close();
	}
	return {
		path,
		bytes: Buffer.byteLength(options.content, "utf8")
	};
}
//#endregion
//#region lib/types/cleanup.js
/** Startup cleanup mechanics for local spill roots. */
/**
* A backend-generated default root name: `dsh-spill-` plus the 6-character
* suffix `mkdtemp` appends. Discovery matches this
* EXACT shape, not the bare prefix, so an unrelated `dsh-spill-test-*` fixture
* or a foreign tool's differently-shaped `dsh-spill-…` directory is never
* mistaken for a backend root to sweep.
*/
const DEFAULT_ROOT_RE = new RegExp(`^${DEFAULT_ROOT_PREFIX}[A-Za-z0-9]{6}$`);
/**
* A backend-generated session directory name: `session-` plus the 12 lowercase
* hex characters {@link sessionDir} derives from `sha256(sessionId)`. The sweep
* only descends into entries of this EXACT shape, so an unrelated
* `session-backup` directory under a shared configured root is never swept.
*/
const SESSION_DIR_RE = /^session-[0-9a-f]{12}$/;
/** Report a best-effort sweep failure without allowing the warning sink to reject cleanup. */
function warnSafely(warn, message) {
	try {
		warn(message);
	} catch {}
}
/** Whether another local OS user cannot replace children of this directory. */
function isTrustedDirectory(stats) {
	if (!stats.isDirectory()) return false;
	/* v8 ignore next -- POSIX ownership and mode bits have no Windows equivalent. */
	if (process.platform === "win32" || process.geteuid === void 0) return true;
	/* v8 ignore start -- Windows takes the return above; POSIX tests exercise
	owner and mode rejection. */
	return stats.uid === process.geteuid() && (stats.mode & 18) === 0;
	/* v8 ignore stop */
}
/** Stable identity for de-duplicating aliases of one root. */
function rootIdentity(path, stats) {
	/* v8 ignore next -- Windows file indexes are not portable inode identities. */
	if (process.platform === "win32") return path.toLowerCase();
	/* v8 ignore start -- Windows uses the canonical path identity above; POSIX
	tests exercise device and inode identity. */
	return `${String(stats.dev)}:${String(stats.ino)}`;
	/* v8 ignore stop */
}
/**
* Check that no ancestor permits another local OS user to replace the selected
* child. A sticky writable ancestor is safe because the child is owned by the
* current user; this admits normal per-process roots below `/tmp`.
*/
async function hasProtectedAncestors(path) {
	/* v8 ignore next -- POSIX ancestry checks have no Windows ACL equivalent. */
	if (process.platform === "win32" || process.geteuid === void 0) return true;
	/* v8 ignore start -- Windows takes the return above; POSIX tests exercise
	the ancestor ownership and mode policy. */
	const currentUid = process.geteuid();
	let child = path;
	let childStats = await lstat(child);
	for (;;) {
		const parent = dirname(child);
		if (parent === child) return true;
		const stats = await lstat(parent);
		/* v8 ignore next -- every ancestor of a successfully resolved path is a directory. */
		if (!stats.isDirectory()) return false;
		const writableByOthers = (stats.mode & 18) !== 0;
		const sticky = (stats.mode & 512) !== 0;
		if (writableByOthers && !sticky) return false;
		/* v8 ignore next -- requires an ancestor owned by another OS account inside
		a writable sticky parent; ordinary test fixtures cannot change uid. */
		if (writableByOthers && childStats.uid !== currentUid) return false;
		child = parent;
		childStats = stats;
	}
	/* v8 ignore stop */
}
/**
* Resolve one existing root without admitting a directory another local user
* can replace during the path-based sweep. A configured root may be a symlink;
* discovery passes `false` so a symlink cannot impersonate a default root.
*
* @param path Candidate root path.
* @param allowSymlink Whether the candidate itself may be a configured symlink.
* @param warn Sink for skipped or failed inspection.
* @returns The trusted canonical root, or `undefined` when it is absent or unsafe.
*/
async function resolveRoot(path, allowSymlink, warn) {
	let initial;
	try {
		initial = await lstat(path);
	} catch (error) {
		/* v8 ignore start -- non-ENOENT inspection failures depend on host ACL or
		an entry racing away and cannot be reproduced portably. */
		if (!isErrno(error, "ENOENT")) warnSafely(warn, `spill-local: failed to inspect root ${path}: ${String(error)}`);
		return;
	}
	if (initial.isSymbolicLink()) {
		if (!allowSymlink) return void 0;
	} else if (!isTrustedDirectory(initial)) {
		warnSafely(warn, `spill-local: skipped unsafe root ${path}: expected a directory owned by the current user and not writable by group or others`);
		return;
	}
	let canonical;
	let stats;
	try {
		canonical = await realpath(path);
		stats = await lstat(canonical);
	} catch (error) {
		/* v8 ignore start -- a root lstat'd above reaches this only by racing away
		or by a host-specific realpath failure. */
		if (!isErrno(error, "ENOENT")) warnSafely(warn, `spill-local: failed to resolve root ${path}: ${String(error)}`);
		return;
	}
	let protectedAncestors = false;
	try {
		protectedAncestors = await hasProtectedAncestors(canonical);
	} catch (error) {
		/* v8 ignore start -- a canonical ancestor disappears only through a race;
		other failures depend on host ACLs. */
		if (!isErrno(error, "ENOENT")) warnSafely(warn, `spill-local: failed to inspect ancestors of root ${canonical}: ${String(error)}`);
		return;
	}
	/* v8 ignore start -- Windows has no POSIX ownership or mode rejection path;
	POSIX tests exercise both unsafe-directory conditions. */
	if (!isTrustedDirectory(stats) || !protectedAncestors) {
		warnSafely(warn, `spill-local: skipped unsafe root ${canonical}: expected a current-user-owned directory with protected write and ancestor permissions`);
		return;
	}
	/* v8 ignore stop */
	return {
		path: canonical,
		identity: rootIdentity(canonical, stats)
	};
}
/**
* Delete a single path, treating a concurrent-race disappearance as success.
* A parallel process (or another sweep) may `unlink` the same file between our
* scan and our own `unlink` — ENOENT then means the goal (file gone) already
* holds, so it is not a failure. Any other error is reported and swallowed.
*
* @param path The absolute file path to remove.
* @param warn Sink for a non-ENOENT failure message.
* @returns Resolves once the removal was attempted (never rejects).
*/
async function unlinkIdempotent(path, warn) {
	try {
		await unlink(path);
	} catch (error) {
		/* v8 ignore start -- reached only when a file selected for deletion (a
		regular file that passed lstat) then fails to unlink: either it raced away
		(ENOENT) or a permission/IO fault struck between the stat and the unlink.
		Neither is deterministically reproducible in-process. */
		if (isErrno(error, "ENOENT")) return;
		warnSafely(warn, `spill-local: failed to delete ${path}: ${String(error)}`);
	}
}
/**
* Sweep one spill session directory: delete expired regular files, skip
* everything else, and report the directory empty afterward so the caller can
* prune it. The `dir` entry MUST be a real directory — the caller `lstat`s it
* first and skips a symlink, so this never follows a `session-*` symlink into a
* foreign tree. Inside, a symlink or any non-regular entry (socket, fifo, nested
* dir) is left untouched — `lstat` never follows a link, so a planted symlink
* can neither be deleted nor redirect the age check. Every per-entry failure is
* contained: one unreadable file does not abort the directory.
*
* @param dir The absolute session directory to scan (already confirmed a real dir).
* @param cutoffMs Files with `mtime` strictly older than this are deleted.
* @param warn Sink for contained filesystem failures.
* @returns `true` when the directory holds no entries after the sweep (a prune candidate).
*/
async function sweepSessionDir(dir, cutoffMs, warn) {
	let names;
	try {
		names = await readdir(dir);
	} catch (error) {
		/* v8 ignore start -- the caller lstat'd this entry and confirmed a real
		directory just before the call, so readdir fails only when the dir races
		away (ENOENT) or a permission/IO fault strikes in that window; not
		deterministically reproducible. False keeps it out of the prune step. */
		warnSafely(warn, `spill-local: failed to read ${dir}: ${String(error)}`);
		return false;
	}
	let remaining = names.length;
	for (const name of names) {
		const path = join(dir, name);
		let stats;
		try {
			stats = await lstat(path);
		} catch (error) {
			/* v8 ignore start -- an entry that readdir just returned then fails to
			lstat only by racing away (ENOENT) or a permission/IO fault; keep it out
			of the deterministic test surface. */
			if (isErrno(error, "ENOENT")) {
				remaining--;
				continue;
			}
			warnSafely(warn, `spill-local: failed to stat ${path}: ${String(error)}`);
			continue;
		}
		if (!stats.isFile()) continue;
		if (stats.mtimeMs >= cutoffMs) continue;
		await unlinkIdempotent(path, warn);
		remaining--;
	}
	return remaining === 0;
}
/**
* Best-effort one-shot cleanup: across each root, delete expired regular files
* under its `session-*` directories and prune every empty session directory.
* Only a discovered prior-default root is itself removed. Writes recreate a
* session directory when pruning races a local write. Every filesystem and
* warning-sink failure is contained, so a caller can await this during
* activation/disposal without it ever rejecting.
*
* @param options The roots to sweep, the age cutoff, and the failure sink.
* @returns Resolves when the sweep finishes (never rejects).
*/
async function sweepSpillRoots(options) {
	const { cutoffMs, warn } = options;
	const roots = /* @__PURE__ */ new Map();
	for (const candidate of options.roots) {
		const resolved = await resolveRoot(candidate.path, false, warn);
		if (resolved === void 0) continue;
		const existing = roots.get(resolved.identity);
		roots.set(resolved.identity, {
			path: resolved.path,
			pruneWhenEmpty: (existing?.pruneWhenEmpty ?? true) && candidate.pruneWhenEmpty
		});
	}
	for (const root of roots.values()) {
		let entries;
		try {
			entries = await readdir(root.path);
		} catch (error) {
			/* v8 ignore start -- the trusted root was resolved immediately above; a
			read failure now requires a race or host-specific ACL fault. */
			if (!isErrno(error, "ENOENT")) warnSafely(warn, `spill-local: failed to read root ${root.path}: ${String(error)}`);
			continue;
		}
		let rootEmptiable = true;
		for (const name of entries) {
			if (!SESSION_DIR_RE.test(name)) {
				rootEmptiable = false;
				continue;
			}
			const dir = join(root.path, name);
			let stats;
			try {
				stats = await lstat(dir);
			} catch (error) {
				/* v8 ignore start -- an entry readdir just returned fails to lstat only
				by racing away (ENOENT) or a permission/IO fault; not deterministically
				reproducible. */
				if (!isErrno(error, "ENOENT")) warnSafely(warn, `spill-local: failed to stat ${dir}: ${String(error)}`);
				continue;
			}
			if (!isTrustedDirectory(stats)) {
				warnSafely(warn, `spill-local: skipped unsafe session directory ${dir}`);
				rootEmptiable = false;
				continue;
			}
			if (!await sweepSessionDir(dir, cutoffMs, warn)) {
				rootEmptiable = false;
				continue;
			}
			try {
				await rmdir(dir);
			} catch (error) {
				/* v8 ignore start -- prune runs only on a dir observed empty; a failure
				here means a concurrent writer added a file (ENOTEMPTY) or a
				permission/IO fault struck — both are races outside deterministic
				in-process testing. */
				rootEmptiable = false;
				if (!isErrno(error, "ENOENT") && !isErrno(error, "ENOTEMPTY")) warnSafely(warn, `spill-local: failed to prune ${dir}: ${String(error)}`);
			}
		}
		if (root.pruneWhenEmpty && rootEmptiable) try {
			await rmdir(root.path);
		} catch (error) {
			/* v8 ignore start -- prune runs only on a root whose every child was
			reclaimed; a failure here means a concurrent writer added a fresh
			spill after our scan (ENOTEMPTY) or removed the root already (ENOENT)
			or a permission/IO fault struck — all races outside deterministic
			in-process testing. */
			if (!isErrno(error, "ENOENT") && !isErrno(error, "ENOTEMPTY")) warnSafely(warn, `spill-local: failed to prune root ${root.path}: ${String(error)}`);
		}
	}
}
/**
* Discover prior default spill roots: the `dsh-spill-<6 chars>` directories
* directly under `base` (the OS tmpdir) that earlier default-root runs created.
* A long-lived deployment
* with a configured root will find none; a series of default-root runs
* accumulates one per process, so the startup sweep reclaims them all. Matching
* is the EXACT `mkdtemp` shape (see {@link DEFAULT_ROOT_RE}), not the bare
* prefix, so an unrelated `dsh-spill-test-*` fixture or a foreign
* differently-shaped directory is never swept; symlinks and non-directories are
* excluded too — only real directories the backend could have created.
*
* @param warn Sink for a failure reading `base` (returns `[]` on failure).
* @param base The directory to scan; defaults to the OS tmpdir (a test seam).
* @returns Absolute paths of the discovered default roots (possibly empty).
*/
async function discoverDefaultRootRecords(warn, base) {
	let entries;
	try {
		entries = await readdir(base);
	} catch (error) {
		warnSafely(warn, `spill-local: failed to scan ${base} for default roots: ${String(error)}`);
		return [];
	}
	const roots = [];
	for (const name of entries) {
		if (!DEFAULT_ROOT_RE.test(name)) continue;
		const resolved = await resolveRoot(join(base, name), false, warn);
		if (resolved !== void 0) roots.push(resolved);
	}
	return roots;
}
/**
* Discover trusted prior default roots below the OS temporary directory.
*
* @param warn Sink for contained discovery failures.
* @param base Directory to scan; defaults to the OS temporary directory.
* @returns Canonical paths of trusted default roots.
*/
async function discoverDefaultRoots(warn, base = tmpdir()) {
	return (await discoverDefaultRootRecords(warn, base)).map((root) => root.path);
}
/**
* Gather and de-duplicate the trusted roots for one startup sweep. The active
* configured path may be a symlink; its resolved identity overrides a matching
* discovered root so the live target is never marked prunable.
*
* @param activeRoot Active configured root.
* @param warn Sink for contained inspection failures.
* @param defaultRootsBase Directory holding prior default roots.
* @returns Trusted roots with the active identity marked non-prunable.
*/
async function gatherSweepRoots(activeRoot, warn, defaultRootsBase = tmpdir()) {
	const [discovered, active] = await Promise.all([discoverDefaultRootRecords(warn, defaultRootsBase), resolveRoot(activeRoot, true, warn)]);
	const roots = /* @__PURE__ */ new Map();
	for (const root of discovered) roots.set(root.identity, {
		path: root.path,
		pruneWhenEmpty: true
	});
	if (active !== void 0) roots.set(active.identity, {
		path: active.path,
		pruneWhenEmpty: false
	});
	return [...roots.values()];
}
//#endregion
//#region lib/types/index.js
/**
* `LocalSpillStore`: the host-filesystem implementation of the
* `@deepseek-ai/dsh-spill` storage seam. Persists oversized text to a
* private, session-scoped file (see `./store.ts` for the traversal-safe naming
* and exclusive owner-only write) and returns a path locator plus local
* read/grep retrieval guidance. After activation it runs one best-effort
* startup sweep that reclaims spill files older than `cleanupPeriodDays`.
*
* @module @deepseek-ai/dsh-spill-local
*/
/** Milliseconds in one day — converts the `cleanupPeriodDays` config to the sweep cutoff. */
const MS_PER_DAY = 1440 * 60 * 1e3;
/**
* Local-filesystem spill backend. Files land under `<root>/session-<hash>/…`
* with unpredictable names, an exclusive owner-only (0600) write, and a private
* (0700) root — a spilled tool result must not be readable by other local users
* or redirectable via a planted symlink.
*
* After activation it launches ONE best-effort cleanup sweep (see
* {@link cleanupPeriodDays}) that reclaims expired spill files without delaying
* service availability; the sweep is owned by the plugin fiber and awaited
* during disposal, so a fiber unload never returns before it quiesces.
*/
var LocalSpillStore = class extends SpillStore {
	static Config = z.object({
		root: z.string(),
		cleanupPeriodDays: z.number().step(1).min(0).default(30)
	});
	/** Resolved absolute spill root (config `root`, else the private default), fixed at construction. */
	root;
	/** Validated config (schemastery applied the `cleanupPeriodDays` default before construction). */
	config;
	/**
	* The in-flight (or settled) startup cleanup sweep. Held so disposal can await
	* it; `undefined` when cleanup is disabled (`cleanupPeriodDays === 0`).
	*/
	cleanup;
	constructor(ctx, config) {
		super(ctx);
		this.config = config;
		this.root = config.root !== void 0 ? resolve(config.root) : privateRoot();
		ctx.effect(function* () {
			if (this.config.cleanupPeriodDays > 0) {
				const warn = (message) => {
					this.ctx.logger.warn(message);
				};
				this.cleanup = this.runCleanup(warn);
			}
			yield async () => {
				await this.cleanup;
			};
		}.bind(this), "spill-local cleanup sweep");
	}
	/**
	* Run the one-shot cleanup: gather the roots to sweep (see {@link gatherRoots})
	* and sweep all of them at the age cutoff. Best-effort —
	* {@link sweepSpillRoots} contains every filesystem failure, so this never
	* rejects and cannot fail activation or a concurrent spill write.
	*
	* @param warn - sink for a contained filesystem failure.
	* @returns Resolves when the sweep finishes (never rejects).
	*/
	async runCleanup(warn) {
		const cutoffMs = Date.now() - this.config.cleanupPeriodDays * MS_PER_DAY;
		await sweepSpillRoots({
			roots: await this.gatherRoots(warn),
			cutoffMs,
			warn
		});
	}
	/**
	* The roots the startup sweep covers: each discovered prior-default
	* `dsh-spill-*` temp root (see {@link discoverDefaultRoots}), pruned when
	* emptied, plus the active/configured root, which is never itself pruned while
	* the live process may write into it. Empty session directories are pruned in
	* every root. Filesystem identity de-duplicates aliases before the active root
	* overrides a discovered match as non-prunable. A test overrides this to
	* inject an isolated root set — and, being the sweep's one async gather point,
	* to hold the sweep open across a disposal for the quiescence check; it is a
	* test seam, not a deployment knob.
	*
	* @param warn - sink for a contained discovery failure.
	* @returns The roots to sweep, each flagged for prune-when-empty.
	*/
	async gatherRoots(warn) {
		return gatherSweepRoots(this.root, warn, this.defaultRootsBase());
	}
	/**
	* The directory scanned for prior default `dsh-spill-*` roots — the OS tmpdir,
	* where {@link privateRoot} creates them (accumulation only happens there). A
	* test overrides this to point discovery at an isolated fixture instead of the
	* real tmpdir; it is a test seam, not a deployment knob.
	*
	* @returns The base directory to scan for default spill roots.
	*/
	defaultRootsBase() {
		return tmpdir();
	}
	async saveText(input) {
		const saved = await saveTextFile({
			root: this.root,
			sessionId: input.owner.sessionId,
			suggestedName: input.suggestedName,
			content: input.content
		});
		return {
			locator: SpillLocator(saved.path),
			bytes: saved.bytes,
			retrievalHint: "Use read with offset/limit, or grep this path to search within it."
		};
	}
};
//#endregion
export { DEFAULT_ROOT_PREFIX, LocalSpillStore, LocalSpillStore as default, discoverDefaultRoots, encodeSegment, isErrno, privateRoot, saveTextFile, sessionDir, sweepSpillRoots };
