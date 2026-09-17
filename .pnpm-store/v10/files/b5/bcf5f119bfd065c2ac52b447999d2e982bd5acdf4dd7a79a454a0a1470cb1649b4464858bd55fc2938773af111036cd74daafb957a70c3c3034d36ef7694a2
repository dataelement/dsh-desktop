/**
 * Cross-process write-ownership lock for one session's artifact directory,
 * held for the whole life of a write handle. The arbiter is the kernel:
 * POSIX takes a non-blocking `flock(2)` via native system support on `session.lock`
 * beside the log, and Windows holds a named kernel semaphore derived from
 * that path — never a file lock or handle, so readers, searches, and
 * directory removal proceed freely while the lock is held. Contention maps
 * to `SessionAlreadyOwnedError`; the kernel releases the lock when the
 * holder's descriptor or last object handle closes, including on any process
 * death, so a crashed holder never blocks a successor. A live but wedged
 * holder keeps the lock until its process exits: there is deliberately no
 * expiry that could expropriate a stalled writer whose resumed appends would
 * tear the log.
 * A POSIX lock names an inode, not a path, so after locking the holder
 * verifies the locked inode is still the file at the lock path and retries
 * otherwise: an unlinked-and-recreated lock file carries a fresh inode, and
 * a lock on the orphaned one proves nothing. Removing a live session's lock
 * file therefore forfeits exclusion on POSIX (nothing in the harness does
 * so); Windows has no lock file at all. Readers never touch the lock.
 * The lock is acquired at write-open of an existing artifact and, for a
 * created session, only right before its first materializing write — an
 * unmaterialized session has no filesystem footprint. Release never removes
 * the POSIX lock file: every acquired lock belongs to a materialized or
 * materializing session, and the surviving file keeps the stable inode later
 * lockers verify against. The browser worker stubs the native flock entry to
 * immediate success: it is single-process, so the in-process write claim
 * already excludes every writer.
 * @module @deepseek-ai/dsh-session-persistence-jsonl/lease
 */
import type { SessionId } from '@deepseek-ai/dsh-session';
/** Base name of the kernel lock file inside a session's directory. */
export declare const LEASE_FILENAME = "session.lock";
/**
 * One held write lock. Constructed only by {@link SessionWriteLease.acquire};
 * `release` closes the descriptor or handle, which is what releases the lock.
 */
export declare class SessionWriteLease {
    private readonly held;
    private released;
    private constructor();
    /**
     * Acquire the session directory's kernel write lock.
     * @param dir - the session's artifact directory (created if absent).
     * @param id - the session the lock guards, for error identities.
     * @returns the held lock.
     * @throws {SessionAlreadyOwnedError} while another holder keeps the lock.
     */
    static acquire(dir: string, id: SessionId): Promise<SessionWriteLease>;
    /**
     * Release the kernel lock by closing its descriptor or handle. The POSIX
     * lock file is never removed: every acquired lock belongs to a
     * materialized or materializing session, and keeping the file preserves
     * the stable inode later lockers verify against. Idempotent.
     */
    release(): Promise<void>;
}
//# sourceMappingURL=lease.d.ts.map