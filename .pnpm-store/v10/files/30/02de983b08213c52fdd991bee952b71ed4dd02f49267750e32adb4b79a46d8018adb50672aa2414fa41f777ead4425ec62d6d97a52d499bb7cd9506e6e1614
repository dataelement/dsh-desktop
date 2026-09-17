import type { SubagentAddress, SubagentCatalog } from '@deepseek-ai/dsh-subagent/client';
import { SessionSeq, type SessionId } from '@deepseek-ai/dsh-session/types';
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types';
import type { SessionControlFrame, SessionSummary, SessionJob as JobView } from '../../types.ts';
import type { RemoteFailure, RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionListEntry } from './lineage.ts';
import { Session } from './session.ts';
import type { SessionRemotes } from './remotes.ts';
/**
 * List arrival lifecycle, orthogonal to the pull-activity `state` axis:
 * `pending` (no successful pull yet — an empty items array means "nothing
 * arrived", not "nothing exists") → `ready` (at least one pull landed).
 * Monotone: `ready` never steps back — later pull failures and reconnect
 * re-pulls ride the `state`/`error` axis, which is where failure is modeled
 * (no `error` phase here; that would duplicate `state`).
 */
export type SessionListPhase = 'pending' | 'ready';
/** Request-local content hit returned to sidebar search consumers. */
export interface SessionSearchResultItem {
    sessionId: SessionId;
    snippet: string;
}
/** Immutable session-list snapshot for useSessionList. */
export interface SessionListSnapshot {
    items: readonly SessionListEntry[];
    /** Selected Session id (validated against items; masked to undefined while its session is off the list). */
    current: SessionId | undefined;
    state: 'idle' | 'loading' | 'error';
    /** Arrival lifecycle (see {@link SessionListPhase}); `state` stays the pull-activity axis. */
    phase: SessionListPhase;
    error: RemoteFailure | null;
    subagentsByParent: Readonly<Record<SessionId, SubagentCatalogSnapshot>>;
    /** Background jobs per session; an absent key is an empty set. */
    jobsBySession: Readonly<Record<SessionId, readonly JobView[]>>;
    currentAddress: SubagentAddress | undefined;
}
/** One parent-addressed durable catalog projected through the sessions snapshot. */
export type SubagentCatalogSnapshot = Omit<SubagentCatalog, 'parentAvailable'> & {
    /** Absent until the first successful catalog read. */
    readonly parentAvailable?: boolean;
    state: 'loading' | 'ready' | 'error';
    error: RemoteFailure | null;
};
/** Instance cluster + frame entry + the session list. */
export declare class SessionManager {
    private readonly remote;
    private readonly sessions;
    /** In-flight Session disposals remain here after instances leave `sessions`, so manager disposal can await quiescence. */
    private readonly sessionDisposals;
    /** Latest transient queues, retained independently of Session object materialization. */
    private readonly queues;
    /**
     * Sessions that finished running while not selected — the sidebar's green
     * "done" reminder (manager-owned, survives connection generations; cleared
     * on select and session-removed, re-armed by the next completion).
     */
    private readonly completedNotifications;
    /** Last-observed running bits per session; the true→false edge here arms {@link completedNotifications}. */
    private readonly prevRunning;
    /** Per-session projection value stores, retained independently of instance arrival (the
     *  title-snapshot precedent, generalized): push frames land here whether or not the Session
     *  is instantiated (list rows read the 'title' key), and an instantiated Session adopts the
     *  same store so history-baseline seeding and frames converge on one row set. */
    private readonly projectionStores;
    private summaries;
    private listState;
    /** Arrival phase; the pending → ready edge fires on the first successful pull (see SessionListPhase). */
    private listPhase;
    private listError;
    private listInflight;
    /** Mutations arriving after a list request starts are replayed over its response. */
    private listMutations;
    private readonly addresses;
    private readonly catalogs;
    private readonly catalogInflight;
    /** Catalog owners whose membership changed while a pull was in flight: one trailing refresh after it settles. */
    private readonly catalogStale;
    private readonly openCatalogs;
    private readonly catalogDebounce;
    /**
     * Background jobs per session, last-wins from Session Controller's control
     * stream. An empty set is stored as an absent key, so absence and `[]` are
     * one representation.
     */
    private readonly jobsBySession;
    private selected;
    private listSnapshotCache;
    /** Entry-identity cache (reference stability): list rebuilds reuse the previous entry
     *  object when every field matches — wire refreshes mint all-new summary objects, so identity
     *  must be recovered by value or every SessionListItem memo misses on every refresh. */
    private entryCache;
    private itemsCache;
    private readonly notifier;
    /**
     * @param remote - generated Remote namespaces the Session cluster calls.
     * @param restoredSelection - persisted real-Session selection candidate.
     */
    constructor(remote: SessionRemotes, restoredSelection?: SessionId, restoredAddress?: SubagentAddress);
    /**
     * Select a listed Session or a retained catalog-addressed child.
     * @param sessionId - listed or catalog-addressed Session id.
     */
    select(sessionId: SessionId): void;
    /**
     * Select a healthy child through its durable direct-parent address.
     * @param address - catalog-derived parent and child ids.
     */
    selectSubagent(address: SubagentAddress): void;
    /** Clear the selection (the layout falls to the no-session view state). */
    clearSelection(): void;
    /**
     * Return the durable catalog address retained for one child.
     * @param sessionId - possible addressed child id.
     * @returns The direct-parent address, when navigation discovered one.
     */
    subagentAddress(sessionId: SessionId): SubagentAddress | undefined;
    /**
     * Resolve an address for breadcrumb navigation without retaining transport authority.
     * @param sessionId - possible child id in an already-loaded catalog.
     * @returns A retained or catalog-derived direct-parent address.
     */
    navigationAddress(sessionId: SessionId): SubagentAddress | undefined;
    /**
     * Drop a session instance (scope-prune companion: instance
     * and scope share one lifecycle). The host session log is the durable
     * truth — a later get() lazily rebuilds and open() backfills history.
     * @param sessionId - the session to drop.
     */
    drop(sessionId: SessionId): Promise<void>;
    /**
     * Stop owned timers and every remaining Session instance.
     * @returns when every Session Remote iterator has completed teardown.
     */
    dispose(): Promise<void>;
    private startSessionDisposal;
    private drainSessionDisposals;
    /**
     * Lazy build: return the existing instance or construct one (no auto-open —
     * open is triggered by the container's select callback).
     * @param sessionId - the session to get.
     * @returns the resident instance.
     */
    get(sessionId: SessionId): Session;
    private createSession;
    /** Resident per-session projection store (create-on-demand; outlives instantiation). */
    private projectionStore;
    /**
     * Refresh one direct-child catalog, reusing its in-flight request.
     * @param parentSessionId - catalog owner.
     */
    refreshSubagents(parentSessionId: SessionId): Promise<void>;
    /**
     * Mark whether a catalog menu is consuming live membership updates.
     * @param parentSessionId - catalog owner.
     * @param open - current menu state.
     */
    setSubagentCatalogOpen(parentSessionId: SessionId, open: boolean): void;
    /** Full refresh via session.list (single-flight: an in-flight call is reused). */
    refreshList(): Promise<void>;
    /**
     * Search visible session message content without adding transient query
     * state to the list snapshot.
     * @param query - non-blank literal phrase.
     * @param signal - cancellation for superseded UI queries.
     * @returns the Host result or a folded transport error.
     */
    search(query: string, signal: AbortSignal): Promise<RemoteResult<{
        items: SessionSearchResultItem[];
        hasMore: boolean;
    }>>;
    /**
     * Contract session.create; on success merge into summaries immediately (no
     * wait for the next refresh). A created session is blank by definition
     * (entity birth precedes the first message).
     * @param opts - target workspace or working directory, plus an optional caller-owned id.
     * @returns the create result.
    */
    create(opts?: {
        workspaceId?: WorkspaceId;
        cwd?: string;
        sessionId?: SessionId;
    }): Promise<RemoteResult<{
        sessionId: SessionId;
    }>>;
    /**
     * Contract session.fork; on success merge the child into summaries
     * immediately (same synchronous-addressability guarantee as create). The
     * child carries the source's history, so it is never blank; lineage rides
     * parentSessionId so the list nests it under its source. A child published
     * before Workspace attachment fails is also reconciled into the list.
     * @param opts - source session and the optional seq anchoring the cut.
     * @returns the fork result (the child session id).
     */
    fork(opts: {
        sessionId: SessionId;
        atSeq?: SessionSeq;
    }): Promise<RemoteResult<{
        sessionId: SessionId;
    }>>;
    /**
     * Insert-or-enrich a locally synthesized summary: a new id prepends; an
     * existing entry only gains fields it lacks (the session-added frame and the
     * create() echo race — whichever lands second must fill the placeholder's
     * missing cwd/parentSessionId, never overwrite list-refresh data).
     */
    private mergeSummary;
    /** Apply immediately and retain for replay when a list response is in flight. */
    private recordMutation;
    /**
     * uSES subscription entry for useSessionList.
     * @param listener - change callback.
     * @returns the unsubscribe function.
     */
    subscribe(listener: () => void): () => void;
    /**
     * Cached list snapshot (rebuilt lazily when dirty with no listeners).
     * @returns the cached reference (stable until the next flush).
     */
    getListSnapshot(): SessionListSnapshot;
    /**
     * Apply a complete control baseline or one later replacement frame.
     * @param frame - baseline or live control replacement from Session Controller.
     */
    handleControlFrame(frame: SessionControlFrame): void;
    private replaceControlBaseline;
    /**
     * Apply one Session-list addition forwarded through `ctx.remote.$on`.
     * @param summary - current Host summary for the added Session.
     */
    handleSessionAdded(summary: SessionSummary): void;
    /**
     * Apply one Session removal forwarded through `ctx.remote.$on`.
     * @param sessionId - removed Session identity.
     */
    handleSessionRemoved(sessionId: SessionId): void;
    /**
     * Apply one live Agent running-state change.
     * @param sessionId - Session whose Agent state changed.
     * @param running - current Agent running state.
     */
    handleSessionStatus(sessionId: SessionId, running: boolean): void;
    /**
     * Advance Session-list activity from one user-authored durable message.
     * @param sessionId - Session whose activity changed.
     * @param updatedAt - durable message timestamp.
     */
    handleSessionActivity(sessionId: SessionId, updatedAt: number): void;
    /**
     * Surface one live Agent failure on an already-materialized Session.
     * @param sessionId - Session whose Agent failed.
     * @param message - caller-visible failure description.
     */
    handleSessionError(sessionId: SessionId, message: string): void;
    /**
     * Repair one re-established Host-event generation with queryable baselines.
     * Opened Session follow streams resume independently through API Gateway.
     */
    handleConnected(): void;
    /** Debounce membership refetches while one parent catalog is selected or open. */
    private scheduleCatalogRefresh;
    /** Apply one Agent-driver transition to loaded and in-flight catalogs. */
    private updateCatalogActivity;
    /** Preserve and project a positive expandability hint after one direct subagent publishes. */
    private markCatalogParentExpandable;
    /** Apply one positive expandability hint to every loaded catalog containing that unique row id. */
    private applyCatalogParentExpandable;
    /** Fold request-local row mutations into one catalog result before publication. */
    private withCatalogMutations;
    /**
     * Reconcile completion reminders against the latest summaries, eagerly after
     * every mutation and pull (a snapshot-build-time pass would collapse
     * consecutive status frames into one observation). A running→idle edge of a
     * non-selected session arms its reminder; running disarms it; removal drops
     * it. First observation only records the running bit — sessions already
     * idle at load get no reminder.
     */
    private syncCompletedNotifications;
    private buildListSnapshot;
}
//# sourceMappingURL=manager.d.ts.map