/**
 * ClientSessions: root sessions service — list snapshot store (manager
 * projection; carries `current`, the persisted selection every
 * session-scoped surface keys off), Agent scope tree (mintScope pattern: no-op plugin
 * Fiber + ctx.extend scope tag; one scope per session, agent id === session
 * id), stable SessionBinding cache, breadcrumb-route projection.
 *
 * Scope lifecycle is stage-driven: a scope is minted lazily on first
 * resolution (pure — resolution has no side effects and is render-safe);
 * the event window and deferred teardown key off the STAGED session, which
 * follows `list.current` exactly. Staging is the open signal: the window
 * opens ⟺ the session is on stage (the stage is `current`; the staged
 * state can widen to a multi-pane list later). A session leaving the list
 * tears its scope down immediately unless it is the staged one, whose scope
 * survives frozen (read-only view) until the stage moves on.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SubagentAddress } from '@deepseek-ai/dsh-subagent/client';
import { type SessionId } from '@deepseek-ai/dsh-session/types';
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types';
import type { SessionJob as JobView } from '../../types.ts';
import type { SessionProjectionMap } from '@deepseek-ai/dsh-session-projection/types';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { RemoteFailure, RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionEventSource } from '../contract/events.ts';
import type { SessionFace } from '../contract/session.ts';
import type { AgentContext, ISessions } from '../contract/sessions.ts';
import { SessionManager } from './manager.ts';
import type { SessionRemotes } from './remotes.ts';
import type { SessionListPhase, SessionSearchResultItem, SubagentCatalogSnapshot } from './manager.ts';
/** Session list row projected from the host list RPC plus live stream increments. */
export interface SessionSummary {
    id: SessionId;
    /** Latest durable log-backed title, absent until the host projects one. */
    title?: string;
    /** Human-facing label: durable title, project basename, then session id. */
    displayTitle: string;
    cwd?: string;
    parentId?: SessionId;
    /** Coarse durable origin for navigation filtering; not a continuation capability. */
    origin?: 'subagent';
    running: boolean;
    /** Finished while not selected and not yet opened — the sidebar's green "done" reminder. Absent = false. */
    completed?: boolean;
    /**
     * Empty-log bit (host summary derivation mirror). New Session reuses a blank
     * one targeting the same workspace. Filtering stays with the consumer: the
     * store carries every row, while the Workspace browser shows only the
     * selected blank entry.
     */
    blank: boolean;
    updatedAt: number;
    /** Current host-computed projection values retained by the object layer. */
    projectionValues?: Readonly<Partial<SessionProjectionMap>>;
}
/**
 * Session list store shape. `current` rides the same snapshot (arbitrated:
 * the single useSessions standard hook reads list and selection together —
 * sidebar highlighting and current-session consumers share one fact source).
 */
export interface SessionListState {
    /** Host-list order; addressed breadcrumb-only rows are excluded. */
    ids: SessionId[];
    /** Host rows plus the current addressed subagent route used by navigation. */
    byId: Record<SessionId, SessionSummary>;
    current: SessionId | undefined;
    /** Arrival lifecycle projected 1:1 from the manager snapshot (see SessionListPhase): empty-with-ready means "truly no sessions". */
    phase: SessionListPhase;
    /** Direct durable catalogs keyed by their selected parent address. */
    subagentsByParent: Readonly<Record<SessionId, SubagentCatalogSnapshot>>;
    /**
     * Background jobs each session can see, mirrored last-wins from Session
     * Controller's control baseline and `jobs` frames. A missing key is an empty
     * set, so consumers read absence rather than a sentinel.
     */
    jobsBySession: Readonly<Record<SessionId, readonly JobView[]>>;
    /** Current session's catalog-derived address, absent on ordinary navigation. */
    currentAddress: SubagentAddress | undefined;
}
/** Structured session-create failure. */
export declare class SessionCreateError extends Error {
    readonly rpcError: RemoteFailure;
    readonly requestedSessionId: SessionId | undefined;
    readonly name = "SessionCreateError";
    /**
     * @param rpcError - Host business or folded transport error.
     * @param requestedSessionId - caller-preallocated id used for later stream/list reconciliation.
     */
    constructor(rpcError: RemoteFailure, requestedSessionId: SessionId | undefined);
}
/** Structured session-fork failure. */
export declare class SessionForkError extends Error {
    readonly rpcError: RemoteFailure;
    readonly sourceSessionId: SessionId;
    readonly name = "SessionForkError";
    /**
     * @param rpcError - Host business or folded transport error.
     * @param sourceSessionId - the session the fork was cut from.
     */
    constructor(rpcError: RemoteFailure, sourceSessionId: SessionId);
}
/** Identity-stable logical binding for one materialized Client Session. */
export interface SessionBinding {
    readonly sessionId: SessionId;
    /** The outward session face only — feature code never sees the concrete class. */
    readonly session: SessionFace;
    /** Contiguous event window reserved for Conversation assembly. */
    readonly eventSource: SessionEventSource;
    readonly ctx: AgentContext;
}
export { scopeOf } from '../scope.ts';
/** Root sessions service: list store, current selection, object-layer manager, scope tree, bindings, and breadcrumb routes. */
export declare class ClientSessions implements ISessions {
    private readonly rootCtx;
    /**
     * The wire schema's own result bound, re-exposed for presentation plugins as
     * injected data. Not per-connection state: the `session.search` response
     * schema caps `items` at this constant, so every transport (fixture included)
     * reports the same number.
     */
    readonly searchResultLimit = 20;
    /** List snapshot store (list RPC + host stream increments; re-pulled on reconnect) — the useSessions standard feed, current included. */
    readonly list: SnapshotStore<SessionListState>;
    /** The object-layer instance cluster and frame dispatch entry. */
    private readonly manager;
    /**
     * Persisted selection cell (the durable half of `list.current`). Private on
     * purpose: reads go through the list snapshot; writes through {@link
     * ClientSessions.open} / {@link ClientSessions.clear}. Projection
     * validates it against the live list instead of destructively pruning, so a
     * selection survives transient list states (reconnect re-pull) and
     * resurfaces when its session returns.
     */
    private readonly selection;
    private readonly scopes;
    /** In-flight scope drops remain here after records leave `scopes`, so root disposal can await quiescence. */
    private readonly scopeDrops;
    /**
     * The staged session id — follows `list.current` exactly, holding its last
     * defined value across masked gaps (a transiently absent selection blanks
     * `current` without moving the stage, so reconnect re-pulls and removals
     * keep the staged scope's frozen view alive until the stage moves on).
     */
    private watched;
    /** Removed-while-staged sessions whose teardown waits for the stage to move away. */
    private readonly deferredRemovals;
    /**
     * @param ctx - client root context (scope fibers mount under it).
     * @param remote - generated Remote namespaces shared with every Session.
     */
    constructor(rootCtx: Context, remote: SessionRemotes);
    /**
     * Select a listed or retained catalog-addressed session as current.
     * @param id - listed or addressed session id.
     */
    open(id: SessionId): void;
    /**
     * Open a healthy catalog child through its direct-parent address.
     * @param address - catalog-derived parent and child ids.
     */
    openSubagent(address: SubagentAddress): void;
    /**
     * Resolve an already discovered direct-parent address without opening it.
     * Feature plugins use this to avoid Agent-bound RPCs in persisted child views.
     * @param id - possible addressed child id.
     * @returns The retained address, when present.
     */
    subagentAddress(id: SessionId): SubagentAddress | undefined;
    /**
     * Inform the Session Controller whether a catalog menu is consuming membership updates.
     * @param parentSessionId - selected parent.
     * @param open - menu state.
     */
    setSubagentCatalogOpen(parentSessionId: SessionId, open: boolean): void;
    /**
     * Refresh one direct-child catalog.
     * @param parentSessionId - catalog owner.
     */
    refreshSubagents(parentSessionId: SessionId): Promise<void>;
    /**
     * Clear the current selection so the layout shows the no-session empty
     * state (new-session affordance and the workspace preselection flow).
     * Wipes the persisted selection too — a reload stays on empty until the
     * user opens or starts a session. The staged scope keeps its frozen view
     * per the masked-gap contract until the next open() moves the stage.
     */
    clear(): void;
    /**
     * Refresh the real Session baseline, reusing an in-flight pull.
     * @returns completion of the current or newly started baseline pull.
     */
    refresh(): Promise<void>;
    /**
     * Search the Host's visible message-content index. Results stay
     * request-local; the list snapshot remains the metadata authority.
     * @param query - non-blank literal phrase.
     * @param signal - cancellation for a superseded search.
     * @returns bounded results or a business/transport error.
     */
    search(query: string, signal: AbortSignal): Promise<RemoteResult<{
        items: SessionSearchResultItem[];
        hasMore: boolean;
    }>>;
    /**
     * Apply one Session Controller live-control frame.
     * @param frame - baseline or live control replacement.
     */
    handleControlFrame(frame: Parameters<SessionManager['handleControlFrame']>[0]): void;
    /**
     * Apply one remotely forwarded Session-list addition.
     * @param summary - current Host summary for the added Session.
     */
    handleSessionAdded(summary: Parameters<SessionManager['handleSessionAdded']>[0]): void;
    /**
     * Apply one remotely forwarded Session removal.
     * @param sessionId - removed Session identity.
     */
    handleSessionRemoved(sessionId: Parameters<SessionManager['handleSessionRemoved']>[0]): void;
    /**
     * Apply one remotely forwarded running-state change.
     * @param args - Session identity and current Agent running state.
     */
    handleSessionStatus(...args: Parameters<SessionManager['handleSessionStatus']>): void;
    /**
     * Apply one remotely forwarded list-activity change.
     * @param args - Session identity and durable activity timestamp.
     */
    handleSessionActivity(...args: Parameters<SessionManager['handleSessionActivity']>): void;
    /**
     * Apply one remotely forwarded Agent failure.
     * @param args - Session identity and caller-visible failure description.
     */
    handleSessionError(...args: Parameters<SessionManager['handleSessionError']>): void;
    /** Rebuild the Session baseline and every opened window after connection. */
    handleConnected(): void;
    /**
     * Create a session on the host. Resolution guarantee: by the time the
     * promise resolves, the created session is in the list store and
     * {@link ClientSessions.binding} resolves it — callers (New Session
     * draft hand-off) may address the scope synchronously, without waiting a
     * notifier flush. The synchronous projection below makes this structural
     * rather than an accident of microtask ordering.
     * @param opts - target workspace or directory and an optional preallocated id.
     * @returns the new session id.
     * @throws {SessionCreateError} with the requested id.
     */
    create(opts?: {
        workspaceId?: WorkspaceId;
        cwd?: string;
        sessionId?: SessionId;
    }): Promise<SessionId>;
    /**
     * Fork a session from a completed-turn prefix of the source (same
     * synchronous-addressability guarantee as {@link ClientSessions.create}:
     * on resolution the child is in the list store and open() can target it).
     * @param opts - source session id, the optional event seq anchoring the
     *   cut (the boundary is the first turn/end at or after it; an in-log
     *   anchor in an open turn is unavailable rather than clipped backward),
     *   and whether to increment an inherited durable title before resolving.
     *   A fractional anchor floors to a real event seq: the frozen nodes of an
     *   interrupted turn carry flow-ordering seqs between two events, and the
     *   wire takes integers only.
     * @returns the child session id.
     * @throws {SessionForkError} with the source id.
     * @throws {Error} when a requested child-title rename fails after creation.
     */
    fork(opts: {
        sessionId: SessionId;
        atSeq?: number;
        increaseTitle?: boolean;
    }): Promise<SessionId>;
    /**
     * Resolve an Agent-scoped context view (use-and-discard).
     * @param id - session id (the agent identity — 1:1 same axis).
     * @returns scoped ctx, or undefined for a session neither listed nor already scoped.
     */
    scope(id: SessionId): AgentContext | undefined;
    /**
     * Materialize the Agent scope named by a validated Host Remote Event.
     * The first successful Session-list baseline becomes authoritative for its
     * lifetime; until then, transport streams may address the scope in either
     * arrival order.
     * @param id - Host-projected Agent identity (the matching Session id).
     * @returns the identity-stable Agent Context.
     */
    resolveAgentScope(id: SessionId): AgentContext;
    /**
     * Read the Agent scope tag off a context. Service-method boundary: fetch
     * bundles must reach scope resolution through ctx.sessions — a cross-bundle
     * value import of the standalone helper would inline a second module
     * instance whose private tag Symbol never matches.
     * @param ctx - any client context.
     * @returns the session id, or undefined on root contexts.
     */
    scopeOf(ctx: Context): SessionId | undefined;
    /**
     * Resolve the business Session behind an Agent-scoped context — the one
     * hop every scoped consumer (event listeners, per-session controllers)
     * takes from ctx-space into object-space (the client mirror of host
     * `agent.session`). Same service-method boundary as
     * {@link ClientSessions.scopeOf}.
     * @param ctx - an Agent-scoped context.
     * @returns the session face, or undefined when the ctx is untagged or its scope was pruned.
     */
    sessionOf(ctx: Context): SessionFace | undefined;
    /**
     * Resolve the stable session binding (scope-addressed assembly feed). Pure
     * resolution — no staging, no window side effects.
     * @param id - session id.
     * @returns binding, or undefined for a session neither listed nor already scoped.
     */
    binding(id: SessionId): SessionBinding | undefined;
    /**
     * Move the stage to the list's current session: sweep teardowns deferred
     * behind the previous occupant and pull the new occupant's history window.
     * Staging IS the open signal — the window opens ⟺ the session is on stage
     * — and open() is idempotent (an in-flight or completed open no-ops; a
     * failed one retries the next time current is touched).
     */
    private followCurrent;
    /**
     * Lazily mint the scope + binding for an eligible session. Eligibility and
     * prune share one predicate: listed on the host or selected
     * through a retained subagent address. Breadcrumb-only ancestors remain
     * summary data and do not keep scopes alive.
     */
    private resolve;
    /** Materialize one scope after its caller establishes that the id may be addressed. */
    private materializeScope;
    /** The one aliveness predicate shared by scope mint and prune: host-listed or currently addressed. */
    private eligible;
    /** Project the manager's list snapshot into the store (title derivation is display-only). */
    private projectList;
    /** Tear down scope + instance for no-longer-eligible sessions off stage; the staged one defers until the stage moves. */
    private pruneScopes;
    private startScopeDrop;
    private drainScopeDrops;
    /**
     * One teardown for the whole per-session axis: the scope
     * fiber (cascading every actx-registered effect: input shell, slash
     * controller, popup, plugin stores, listeners), the session-keyed slot
     * registrations and the Session instance itself — the host session log is the
     * durable truth, a reopen lazily rebuilds and backfills via open().
     */
    private dropScope;
    /** Run deferred teardowns whose session is no longer staged (called when the stage moves). */
    private sweepDeferred;
}
//# sourceMappingURL=service.d.ts.map