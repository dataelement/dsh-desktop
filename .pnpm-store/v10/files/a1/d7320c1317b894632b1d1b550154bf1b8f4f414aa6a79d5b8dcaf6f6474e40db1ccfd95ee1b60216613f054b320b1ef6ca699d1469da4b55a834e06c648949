import { LocalFileSystem } from "@deepseek-ai/dsh-fs-local";
import { FsError } from "@deepseek-ai/dsh-fs";
import { writableRoots } from "@deepseek-ai/dsh-sandbox";
import { stat } from "node:fs/promises";
import { dirname, sep } from "node:path";
//#region lib/types/containment.js
/**
* Path-containment mechanics for the filesystem sandbox. Canonical spellings
* take the fast lexical path; filesystem identity supplies the conservative
* fallback for alias-equivalent roots such as Windows 8.3 names and casing.
* @module @deepseek-ai/dsh-fs-sandbox/containment
*/
const MISSING_CODES = new Set(["ENOENT", "ENOTDIR"]);
function isMissing(error) {
	const code = error.code;
	return MISSING_CODES.has(code);
}
function comparablePath(path, caseSensitive) {
	return caseSensitive ? path : path.toLowerCase();
}
function isLexicallyUnder(path, root, caseSensitive) {
	const comparableTarget = comparablePath(path, caseSensitive);
	const comparableRoot = comparablePath(root, caseSensitive);
	if (comparableTarget === comparableRoot) return true;
	const prefix = comparableRoot.endsWith(sep) ? comparableRoot : comparableRoot + sep;
	return comparableTarget.startsWith(prefix);
}
async function statIfPresent(path) {
	try {
		return await stat(path, { bigint: true });
	} catch (error) {
		/* v8 ignore else -- a non-missing stat failure requires a host permission or I/O fault after resolve reached this ancestor. */
		if (isMissing(error)) return void 0;
		/* v8 ignore next -- requires a host permission or I/O fault after resolve already reached this ancestor. */
		throw error;
	}
}
function sameIdentity(left, right) {
	return left.dev === right.dev && left.ino === right.ino;
}
/**
* Determine whether a canonical target is a writable root or lies beneath it.
* The lexical fast path handles normal canonical spellings. When spellings
* differ, walk the target's existing ancestors and compare filesystem identity
* with the root; this recognizes Windows long-name/8.3 aliases and casing
* without weakening containment to a textual approximation.
* @param path - canonical target key, which may end in a missing suffix.
* @param root - canonical writable root.
* @param caseSensitive - whether lexical comparison preserves case; defaults
*   to the host filesystem convention used by supported platforms.
* @returns whether the target is the root or a descendant of it.
*/
async function isPathUnder(path, root, caseSensitive = process.platform !== "win32") {
	if (isLexicallyUnder(path, root, caseSensitive)) return true;
	const rootInfo = await statIfPresent(root);
	if (!rootInfo) return false;
	let ancestor = path;
	while (true) {
		const ancestorInfo = await statIfPresent(ancestor);
		if (ancestorInfo && sameIdentity(ancestorInfo, rootInfo)) return true;
		const parent = dirname(ancestor);
		if (parent === ancestor) return false;
		ancestor = parent;
	}
}
//#endregion
//#region lib/types/index.js
/**
* `SandboxedFileSystem`: the sandbox-enforcing implementation of the
* `@deepseek-ai/dsh-fs` Service Definition. It extends `LocalFileSystem` so all
* text-storage mechanics — resolve, stat, read/stream, list, the atomic
* write and the read-match-write edit critical section — are the local
* implementation's, verbatim; this package adds only the per-call POLICY fence
* on the two mutations. Reads pass through untouched: every mode permits
* reading.
*
* The fence is a policy check in TRUSTED code over a MODEL-CONTROLLED path,
* NOT a kernel boundary — the operations are the seam's own (open, rename),
* and only the target path is untrusted, so canonicalize-then-contain is the
* complete answer to this surface. This is containment, not a security
* boundary; kernel-grade isolation of untrusted CODE stays `ctx.shell`'s job
* (`@deepseek-ai/dsh-bash-sandbox`). The residual
* TOCTOU (an ancestor symlink swapped between the containment re-check and the
* syscall) is narrowed by re-canonicalizing immediately before delegating and
* is accepted for this threat model.
*
* Per-call policy: `read-only` denies every mutation; `workspace-write` allows
* a mutation only when the target canonicalizes under the policy's workspace
* root or a platform temp area from the shared `writableRoots` policy;
* `danger-full-access` delegates unfenced. A denial throws the structured
* `FS_SANDBOX_DENIED`.
*
* @module @deepseek-ai/dsh-fs-sandbox
*/
/**
* Sandbox-enforcing filesystem backend. Registers as `ctx.fs` (loading it
* INSTEAD OF `dsh-fs-local`, together with a `ctx.sandboxPolicy`, is the whole
* swap — the model-facing tools are untouched). Its configured default mode is
* the capability fact exposed by {@link sandboxMode}; `dsh-tool-fs` resolves
* each session's mode and cwd into a policy for every mutation, while an
* approved escalation may stamp a strictly wider mode for one call.
*/
var SandboxedFileSystem = class extends LocalFileSystem {
	static inject = ["sandboxPolicy"];
	defaultMode;
	constructor(ctx, config) {
		super(ctx, config);
		this.defaultMode = ctx.sandboxPolicy.defaultMode;
	}
	/** The deployment default mode — the capability fact the tool layer reads to advertise escalation. */
	get sandboxMode() {
		return this.defaultMode;
	}
	/**
	* Fence the write by the per-call policy, then delegate to the inherited
	* atomic write. See {@link checkedTarget}.
	* @param target - the resolved target to write.
	* @param content - the full new file content.
	* @param expected - the write intent guarding the write; omit for unconditional.
	* @param signal - aborts before atomic publication takes effect.
	* @param sandboxPolicy - the per-call mode and workspace root; omit to use
	*   the deployment fallback.
	* @returns the write outcome from the inherited backend.
	*/
	async writeText(target, content, expected, signal, sandboxPolicy) {
		return super.writeText(await this.checkedTarget(target, sandboxPolicy), content, expected, signal);
	}
	/**
	* Fence the edit by the per-call policy, then delegate to the inherited
	* atomic edit. See {@link checkedTarget}.
	* @param target - the resolved target to edit.
	* @param edit - the literal search/replace request.
	* @param expected - the version guard; omit for an unconditional edit.
	* @param signal - aborts before atomic publication takes effect.
	* @param sandboxPolicy - the per-call mode and workspace root; omit to use
	*   the deployment fallback.
	* @returns the edit outcome from the inherited backend.
	*/
	async editText(target, edit, expected, signal, sandboxPolicy) {
		return super.editText(await this.checkedTarget(target, sandboxPolicy), edit, expected, signal);
	}
	/**
	* Enforce the per-call policy against `target` and return the EXACT target the
	* mutation must use, so the checked identity is the mutated one (no
	* check-here-write-there TOCTOU). `read-only` denies; `workspace-write`
	* re-canonicalizes NOW (`resolve` realpaths the deepest existing ancestor,
	* reflecting a concurrently swapped symlink), requires containment under a
	* writable root, and returns THAT fresh target; `danger-full-access` returns
	* the caller's target unfenced. Throws the structured `FS_SANDBOX_DENIED` on
	* refusal — the tool layer maps it to the model-facing `[sandbox: …]` marker
	* and the escalation hint.
	*/
	async checkedTarget(target, sandboxPolicy) {
		const policy = sandboxPolicy ?? this.ctx.sandboxPolicy.resolve();
		const { mode } = policy;
		if (mode === "danger-full-access") return target;
		if (mode === "read-only") throw new FsError(`cannot write "${target.displayPath}": file access denied under read-only mode`, "FS_SANDBOX_DENIED");
		const fresh = await this.resolve(target.displayPath);
		let contained = false;
		for (const root of writableRoots(policy)) if (await isPathUnder(fresh.targetKey, root)) {
			contained = true;
			break;
		}
		if (!contained) throw new FsError(`cannot write "${target.displayPath}": file access denied under workspace-write mode`, "FS_SANDBOX_DENIED");
		return fresh;
	}
};
//#endregion
export { SandboxedFileSystem, SandboxedFileSystem as default };
