import { randomBytes } from "node:crypto";
import { lstat, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
//#region lib/types/index.js
/**
* Zero-dependency atomic file replacement and writer coordination.
* `writeFileAtomic` writes a random-suffix sibling with exclusive create and
* the caller's permission bits, then renames it over the target, so readers
* observe either the old or the new complete content and a replaced file ends
* up with exactly the stated mode. `withFileLock` serializes cross-process
* writers of one file through a `wx`-created `<file>.lock` sibling, so a
* read-modify-write cycle can never resurrect a state another writer just
* replaced; readers stay lock-free because the rename commit is atomic.
* @module @deepseek-ai/dsh-atomic-write
*/
const WINDOWS_TRANSIENT_RENAME_ERRORS = new Set([
	"EACCES",
	"EBUSY",
	"EPERM"
]);
const WINDOWS_RENAME_RETRY_INITIAL_MS = 20;
const WINDOWS_RENAME_RETRY_MAX_MS = 200;
const WINDOWS_RENAME_RETRY_LIMIT = 8;
/** Whether Windows reported temporary interference with an atomic replacement. */
function isTransientWindowsRenameError(error) {
	if (process.platform !== "win32") return false;
	return WINDOWS_TRANSIENT_RENAME_ERRORS.has(error?.code ?? "");
}
/** Replace the target after bounded retries for transient Windows interference. */
async function renameAtomicTemp(temp, filename) {
	let delay = WINDOWS_RENAME_RETRY_INITIAL_MS;
	for (let retries = 0;; retries += 1) {
		try {
			await rename(temp, filename);
			return;
		} catch (error) {
			if (!isTransientWindowsRenameError(error)) throw error;
			if (retries >= WINDOWS_RENAME_RETRY_LIMIT) throw error;
		}
		await new Promise((resolve) => setTimeout(resolve, delay));
		delay = Math.min(delay * 2, WINDOWS_RENAME_RETRY_MAX_MS);
	}
}
/**
* Replace `filename` with `content` in one atomic step, creating parent
* directories. The content is first written to a random-suffix sibling opened
* with exclusive create (`wx`): the open refuses to follow a symlink planted
* at the temp path, and the fresh inode carries `options.mode` through the
* rename, so replacing a wider-permission file narrows it without a chmod
* race. The rename also replaces a symlinked target itself instead of writing
* through to its referent, and the same-directory sibling keeps the rename on
* one filesystem. Windows replacement retries transient `EACCES`, `EBUSY`,
* and `EPERM` failures for a bounded interval while the complete temp file
* remains the rename source. On any remaining failure the temp file is
* removed and the failure rethrown. Crash durability (fsync) is out of scope.
* @param filename - final path receiving the content.
* @param content - complete next file content.
* @param options - permission bits for the replacement inode.
*/
async function writeFileAtomic(filename, content, options) {
	await mkdir(dirname(filename), {
		recursive: true,
		...options.dirMode === void 0 ? {} : { mode: options.dirMode }
	});
	const temp = `${filename}.${randomBytes(6).toString("hex")}.tmp`;
	try {
		await writeFile(temp, content, {
			mode: options.mode,
			flag: "wx"
		});
		await renameAtomicTemp(temp, filename);
	} catch (error) {
		await rm(temp, { force: true });
		throw error;
	}
}
/** Whether an exclusive create found an existing lock. */
async function isLockContention(error, lockPath) {
	const code = error?.code;
	if (code === "EEXIST") return true;
	if (code !== "EPERM") return false;
	try {
		await lstat(lockPath);
		return true;
	} catch {
		return false;
	}
}
/**
* Retry cadence for a contended lock. These stay robustness invariants of the
* cross-process write protocol rather than deployment tunables: they govern how
* often a contender asks, which no caller has a reason to vary.
*/
const LOCK_RETRY_INITIAL_MS = 20;
const LOCK_RETRY_MAX_MS = 200;
/**
* How long a contender waits when the caller states no limit — sized for the
* render-and-rename cycle every call site had when this package was written.
* Expiry fails the contender rather than guessing whether the existing lock
* still has an owner. How long is *worth* waiting is a property of the
* operation the lock holder runs, which is why {@link FileLockOptions.waitMs}
* exists; the value here is the floor for an operation that does file work
* alone.
*/
const DEFAULT_LOCK_WAIT_MS = 2e3;
/**
* Hold the cross-process writer lock for `filename` around one operation. The
* lock is a `wx`-created sibling (`<filename>.lock`); paired with the
* rename-based commit of {@link writeFileAtomic}, readers stay lock-free and
* only writers contend. `EEXIST` is contention directly; an `EPERM` is
* contention only when a fresh `lstat` confirms the lock path exists, covering
* Windows exclusive-create behavior without hiding an unrelated permission
* failure. Contention backs off exponentially and fails with a timed-out error
* after the deadline. The contender never removes an existing lock because
* file age cannot prove that its owner stopped; orphan recovery is an operator
* action. The parent directory must exist.
* @param filename - the file whose writers this lock serializes.
* @param operation - the read-render-commit cycle to run while holding the lock.
* @param options - acquisition options; omitted waits {@link DEFAULT_LOCK_WAIT_MS}.
* @returns the operation's result; the lock releases on both outcomes.
*/
async function withFileLock(filename, operation, options) {
	const lockPath = `${filename}.lock`;
	const deadline = Date.now() + (options?.waitMs ?? DEFAULT_LOCK_WAIT_MS);
	let delay = LOCK_RETRY_INITIAL_MS;
	for (;;) {
		try {
			await writeFile(lockPath, `${process.pid}\n`, {
				mode: 384,
				flag: "wx"
			});
			break;
		} catch (error) {
			if (!await isLockContention(error, lockPath)) throw error;
		}
		if (Date.now() >= deadline) throw new Error(`atomic-write: timed out waiting for the writer lock at ${lockPath}`);
		await new Promise((resolve) => setTimeout(resolve, delay));
		delay = Math.min(delay * 2, LOCK_RETRY_MAX_MS);
	}
	try {
		return await operation();
	} finally {
		await rm(lockPath, { force: true });
	}
}
//#endregion
export { withFileLock, writeFileAtomic };
