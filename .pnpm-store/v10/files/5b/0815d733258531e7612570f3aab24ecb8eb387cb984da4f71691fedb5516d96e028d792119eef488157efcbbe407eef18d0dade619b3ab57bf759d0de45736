/**
 * Per-harness-home anonymous user id shared by telemetry and feedback.
 *
 * The id is a random UUID persisted as a bare line in `.anonymous-user-id` inside the
 * harness home resolved by {@link resolveDshHome} (`$DSH_HOME` > `~/.dsh`),
 * and never derived from the hostname, network address, git remote, or any
 * other identifying source. It is scoped to the harness home, not the
 * machine: every process sharing one `$DSH_HOME` reports the same id, and
 * deleting the file mints a fresh identity on the next launch.
 *
 * Reads and writes are synchronous so boot-time and command consumers can
 * use one API. The result is memoized per resolved file path: one process
 * touches the disk once, and a file deleted mid-run keeps the process's id
 * until the next launch.
 *
 * @module @deepseek-ai/dsh-anonymous-user-id
 */
import type { Branded } from '@deepseek-ai/dsh-brand';
/** A harness-home-scoped anonymous user id (random UUID v4). */
export type AnonymousUserId = Branded<'AnonymousUserId'>;
/** File inside the harness home storing the id: a bare UUID line, no wrapper format. */
export declare const ANONYMOUS_USER_ID_FILE_NAME = ".anonymous-user-id";
/** Ambient hooks for locating and generating the id; every field has a default. */
export interface AnonymousUserIdOptions {
    /** Environment consulted for `DSH_HOME`; defaults to `process.env`. */
    env?: NodeJS.ProcessEnv;
    /** UUID generator; defaults to `crypto.randomUUID` (test hook). */
    randomUUID?: () => string;
}
/**
 * Return the harness home's anonymous user id, creating and persisting one on
 * first use. A concurrent first launch is settled by an exclusive-create
 * write: the loser rereads the winner's id. (A reread landing in the winner's
 * narrow create-to-write window can still yield two per-process ids for that
 * run; the next launch converges on the persisted one.) Persistence is
 * best-effort — a write failure (read-only home) still returns a usable id
 * for the current run so feedback and telemetry are never blocked.
 * @param options - home-location and UUID-generation seams.
 * @returns the stable per-harness-home anonymous user id.
 */
export declare function getOrCreateAnonymousUserId(options?: AnonymousUserIdOptions): AnonymousUserId;
//# sourceMappingURL=index.d.ts.map