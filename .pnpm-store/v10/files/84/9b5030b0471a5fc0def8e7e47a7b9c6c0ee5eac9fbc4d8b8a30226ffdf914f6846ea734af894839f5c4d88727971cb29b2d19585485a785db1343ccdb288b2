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
/**
 * Filesystem options for {@link writeFileAtomic}; `mode` is required so the
 * permission decision stays visible at every call site.
 */
export interface WriteFileAtomicOptions {
    /**
     * Permission bits stamped on the fresh temp inode and carried through the
     * rename (subject to the process umask, like every fresh inode).
     */
    mode: number;
    /**
     * Permission bits for parent directories this call creates (subject to the
     * umask; existing directories keep their mode). Omission uses the mkdir
     * default — pass `0o700` when the tree holds user-private data.
     */
    dirMode?: number;
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
export declare function writeFileAtomic(filename: string, content: string, options: WriteFileAtomicOptions): Promise<void>;
/** Options for one {@link withFileLock} acquisition. */
export interface FileLockOptions {
    /**
     * Maximum time to wait for the lock, in milliseconds. State one when the
     * holder's operation legitimately runs longer than file work — a credential
     * mutation that refreshes a token performs a network round trip while
     * holding the lock, and leaving the default in place would fail every other
     * writer of the same file for the duration. Waiting is productive: a
     * contender that acquires the lock afterwards re-reads the committed state.
     */
    waitMs?: number;
}
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
export declare function withFileLock<T>(filename: string, operation: () => Promise<T>, options?: FileLockOptions): Promise<T>;
//# sourceMappingURL=index.d.ts.map