/**
 * Command-directory cache keyed by session: one entry per served catalog —
 * every session is agent-backed, so `command.list({sessionId})` is the only
 * request fields. Each entry keeps the single-flight / soft-hard invalidation
 * / epoch-guard behavior of the original global cache; the session-key axis
 * is the only extra dimension.
 */
import type { CommandDescriptor } from '@deepseek-ai/dsh-commands/types';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
export type { CommandDescriptor } from '@deepseek-ai/dsh-commands/types';
/**
 * cold = never pulled; pending = pull in flight with nothing servable;
 * ready = snapshot serving (a soft-invalidate repull keeps this status);
 * failed = last winning pull rejected, snapshot dropped.
 */
export type DirectoryStatus = 'cold' | 'pending' | 'ready' | 'failed';
/** Injected pull (the service binds command.list off the root connection). */
export type FetchCommands = (sessionId: SessionId) => Promise<readonly CommandDescriptor[]>;
/** The session-keyed directory cache. Plain class — the owning service wires events and RPC. */
export declare class CommandDirectory {
    private readonly fetchCommands;
    private readonly entries;
    constructor(fetchCommands: FetchCommands);
    /**
     * Current cache status for one session.
     * @param sessionId - session key.
     * @returns the entry status (cold when never touched).
     */
    status(sessionId: SessionId): DirectoryStatus;
    /**
     * Synchronous exact-name lookup over one session's hot snapshot.
     * @param sessionId - session key.
     * @param name - command name without the leading slash.
     * @returns the descriptor, or undefined when absent or the entry is not ready.
     */
    resolve(sessionId: SessionId, name: string): CommandDescriptor | undefined;
    /** Soft invalidation (commands-changed): background repull on every touched key; ready snapshots keep serving. */
    invalidateAll(): void;
    /**
     * Drop one Session's obsolete composition-specific snapshot and prewarm its replacement.
     * @param sessionId - Session whose effective command composition changed.
     */
    resetSession(sessionId: SessionId): void;
    /**
     * Hard reset on reconnect: every entry drops its snapshot (the agent world
     * may have changed shape across the generation) and prewarms.
     */
    resetConnected(): void;
    /**
     * Fire-and-forget prewarm of one session (the command source's scope-birth
     * warm hook lands here).
     * @param sessionId - session key.
     */
    warm(sessionId: SessionId): void;
    /**
     * Start one pull for one session. Publishes ready/failed only while it is
     * still the key's latest pull (epoch guard); a ready snapshot is not
     * demoted while the pull flies.
     * @param sessionId - session key.
     * @returns settled when this pull's outcome is published or discarded.
     */
    refresh(sessionId: SessionId): Promise<void>;
    /**
     * Strong-wait until one session's catalog is servable (the enter-
     * adjudication "directory must be reached" rule): ready returns at once;
     * cold/failed launch a fresh pull; pending joins the flying one. Rejects
     * when the awaited pull fails or the signal aborts.
     * @param sessionId - session key.
     * @param signal - attempt-scoped abort (the SubmitAttempt signal).
     * @returns the hot command snapshot.
     */
    ensureReady(sessionId: SessionId, signal: AbortSignal): Promise<readonly CommandDescriptor[]>;
    private entry;
}
//# sourceMappingURL=directory.d.ts.map