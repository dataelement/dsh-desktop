/**
 * Windows durable namespace helpers for the JSONL backend.
 *
 * POSIX publishes a newly-created log by creating a directory entry and then
 * fsyncing the parent directory. Windows does not expose that parent-directory
 * fsync contract through Node, so the Windows path uses the native durable
 * namespace primitive instead: create a staging object in the target directory
 * and publish it with `MoveFileExW(..., MOVEFILE_WRITE_THROUGH)` without
 * replacement or cross-volume copy fallback.
 *
 * @module dsh-session-persistence-jsonl/win32
 */
/**
 * Publish `existing` at `replacement` with Windows write-through rename
 * semantics. The destination must not already exist; the move must stay within
 * the volume (no copy fallback flag is set).
 * @param existing - the synced staging path to move.
 * @param replacement - the final path, which must not already exist.
 */
export declare function publishNewFileWin32(existing: string, replacement: string): Promise<void>;
/**
 * Acquire the session write lock as a named kernel semaphore (count 1) whose
 * name is derived from the canonical lock path. A kernel object never touches
 * the filesystem, so readers, searches, and directory removal proceed freely
 * while the lock is held; a second acquirer's zero-timeout wait times out
 * (`EBUSY`); and when the last handle closes — including on any process
 * death — the object is destroyed, so a successor's create starts fresh.
 * @param path - the lock file path the name is derived from (case-folded:
 *   Windows paths are case-insensitive).
 * @returns the open semaphore handle, released via {@link releaseLockHandleWin32}.
 */
export declare function acquireLockHandleWin32(path: string): Promise<number>;
/**
 * Release a lock from {@link acquireLockHandleWin32}: restore the semaphore
 * count and close the handle (the object dies with its last handle).
 * @param handle - the open semaphore handle.
 */
export declare function releaseLockHandleWin32(handle: number): Promise<void>;
/**
 * Create `target` and its missing ancestors with durable Windows namespace
 * publication. Each missing directory is first created as a random staging
 * sibling, then moved to its final name with `MOVEFILE_WRITE_THROUGH`; races
 * with another creator are accepted only after verifying the winner is a
 * directory.
 * @param target - the absolute directory path to create durably when absent.
 */
export declare function ensureDurableDirectoryWin32(target: string): Promise<void>;
//# sourceMappingURL=win32.d.ts.map