import { SessionSeq } from '@deepseek-ai/dsh-session/types';
import { workspaceTitleOf } from '@deepseek-ai/dsh-util-workspace-path';
import { SESSION_SEARCH_RESULT_LIMIT } from "../../types.js";
import { createSnapshotStore, } from '@deepseek-ai/dsh-client-store';
import { createScope, scopeOf as scopeTagOf } from "../scope.js";
import { SessionManager } from "./manager.js";
/** Structured session-create failure. */
export class SessionCreateError extends Error {
    rpcError;
    requestedSessionId;
    name = 'SessionCreateError';
    /**
     * @param rpcError - Host business or folded transport error.
     * @param requestedSessionId - caller-preallocated id used for later stream/list reconciliation.
     */
    constructor(rpcError, requestedSessionId) {
        super(`session create failed: ${rpcError.code}: ${rpcError.message}`);
        this.rpcError = rpcError;
        this.requestedSessionId = requestedSessionId;
    }
}
/** Structured session-fork failure. */
export class SessionForkError extends Error {
    rpcError;
    sourceSessionId;
    name = 'SessionForkError';
    /**
     * @param rpcError - Host business or folded transport error.
     * @param sourceSessionId - the session the fork was cut from.
     */
    constructor(rpcError, sourceSessionId) {
        super(`session fork failed: ${rpcError.code}: ${rpcError.message}`);
        this.rpcError = rpcError;
        this.sourceSessionId = sourceSessionId;
    }
}
// Scope primitives live in ../scope.ts (the client mirror of host
// dsh-scope, keyed by Agent identity); re-exported here so existing
// consumers keep their import site.
export { scopeOf } from "../scope.js";
/**
 * Display title projection: durable title, project directory basename, then
 * the raw id.
 */
function displayTitleOf(title, cwd, id) {
    if (title !== undefined)
        return title;
    if (cwd !== undefined && cwd !== '') {
        const base = workspaceTitleOf(cwd);
        if (base !== '')
            return base;
    }
    return id;
}
/**
 * Increment a trailing fork number while preserving its half-width or
 * full-width parentheses; an unnumbered title starts with ` (1)`.
 * @param title - source session's durable title.
 * @returns the title assigned to the fork child.
 */
function increasedForkTitle(title) {
    const ascii = /^(.*?)\((\d+)\)$/u.exec(title);
    if (ascii?.[1] !== undefined && ascii[2] !== undefined) {
        return `${ascii[1]}(${BigInt(ascii[2]) + 1n})`;
    }
    const fullWidth = /^(.*?)（(\d+)）$/u.exec(title);
    if (fullWidth?.[1] !== undefined && fullWidth[2] !== undefined) {
        return `${fullWidth[1]}（${BigInt(fullWidth[2]) + 1n}）`;
    }
    return `${title} (1)`;
}
/** Root sessions service: list store, current selection, object-layer manager, scope tree, bindings, and breadcrumb routes. */
export class ClientSessions {
    rootCtx;
    /**
     * The wire schema's own result bound, re-exposed for presentation plugins as
     * injected data. Not per-connection state: the `session.search` response
     * schema caps `items` at this constant, so every transport (fixture included)
     * reports the same number.
     */
    searchResultLimit = SESSION_SEARCH_RESULT_LIMIT;
    /** List snapshot store (list RPC + host stream increments; re-pulled on reconnect) — the useSessions standard feed, current included. */
    list;
    /** The object-layer instance cluster and frame dispatch entry. */
    manager;
    /**
     * Persisted selection cell (the durable half of `list.current`). Private on
     * purpose: reads go through the list snapshot; writes through {@link
     * ClientSessions.open} / {@link ClientSessions.clear}. Projection
     * validates it against the live list instead of destructively pruning, so a
     * selection survives transient list states (reconnect re-pull) and
     * resurfaces when its session returns.
     */
    selection;
    scopes = new Map();
    /** In-flight scope drops remain here after records leave `scopes`, so root disposal can await quiescence. */
    scopeDrops = new Set();
    /**
     * The staged session id — follows `list.current` exactly, holding its last
     * defined value across masked gaps (a transiently absent selection blanks
     * `current` without moving the stage, so reconnect re-pulls and removals
     * keep the staged scope's frozen view alive until the stage moves on).
     */
    watched;
    /** Removed-while-staged sessions whose teardown waits for the stage to move away. */
    deferredRemovals = new Set();
    /**
     * @param ctx - client root context (scope fibers mount under it).
     * @param remote - generated Remote namespaces shared with every Session.
     */
    constructor(rootCtx, remote) {
        this.rootCtx = rootCtx;
        this.selection = createSnapshotStore({}, { persist: { name: 'dsh.sessions.current' } });
        const restored = this.selection.getSnapshot();
        this.manager = new SessionManager(remote, restored.sessionId, restored.subagentAddress);
        this.list = createSnapshotStore({
            ids: [], byId: {}, current: undefined, phase: 'pending',
            subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
        });
        // The manager owns wire truth; the store is its projection. Manager
        // notifications are already microtask-batched.
        const disposeManagerProjection = this.manager.subscribe(() => {
            this.projectList();
        });
        // Stage follower: every current write (open() and projection alike)
        // re-evaluates staging, so startup restore (persisted selection validated
        // by the projection) and reconnect resurfacing open their window with no
        // dedicated code path. Safe to run synchronously inside the store notify:
        // the follower writes no list state — session.open()'s synchronous prefix
        // touches only session-side state and its own microtask-batched notifier.
        const disposeStageFollower = this.list.subscribe(() => {
            this.followCurrent();
        });
        rootCtx.effect(() => async () => {
            disposeStageFollower();
            disposeManagerProjection();
            const scopes = [...this.scopes];
            this.scopes.clear();
            this.deferredRemovals.clear();
            this.watched = undefined;
            for (const [id, record] of scopes)
                this.startScopeDrop(id, record);
            await this.drainScopeDrops();
            await this.manager.dispose();
        }, 'session-controller.client.sessions');
        rootCtx.reflect.provide('sessions', this, undefined);
    }
    /**
     * Select a listed or retained catalog-addressed session as current.
     * @param id - listed or addressed session id.
     */
    open(id) {
        this.manager.select(id);
    }
    /**
     * Open a healthy catalog child through its direct-parent address.
     * @param address - catalog-derived parent and child ids.
     */
    openSubagent(address) {
        this.manager.selectSubagent(address);
    }
    /**
     * Resolve an already discovered direct-parent address without opening it.
     * Feature plugins use this to avoid Agent-bound RPCs in persisted child views.
     * @param id - possible addressed child id.
     * @returns The retained address, when present.
     */
    subagentAddress(id) {
        return this.manager.subagentAddress(id);
    }
    /**
     * Inform the Session Controller whether a catalog menu is consuming membership updates.
     * @param parentSessionId - selected parent.
     * @param open - menu state.
     */
    setSubagentCatalogOpen(parentSessionId, open) {
        this.manager.setSubagentCatalogOpen(parentSessionId, open);
    }
    /**
     * Refresh one direct-child catalog.
     * @param parentSessionId - catalog owner.
     */
    refreshSubagents(parentSessionId) {
        return this.manager.refreshSubagents(parentSessionId);
    }
    /**
     * Clear the current selection so the layout shows the no-session empty
     * state (new-session affordance and the workspace preselection flow).
     * Wipes the persisted selection too — a reload stays on empty until the
     * user opens or starts a session. The staged scope keeps its frozen view
     * per the masked-gap contract until the next open() moves the stage.
     */
    clear() {
        this.manager.clearSelection();
    }
    /**
     * Refresh the real Session baseline, reusing an in-flight pull.
     * @returns completion of the current or newly started baseline pull.
     */
    refresh() {
        return this.manager.refreshList();
    }
    /**
     * Search the Host's visible message-content index. Results stay
     * request-local; the list snapshot remains the metadata authority.
     * @param query - non-blank literal phrase.
     * @param signal - cancellation for a superseded search.
     * @returns bounded results or a business/transport error.
     */
    search(query, signal) {
        return this.manager.search(query, signal);
    }
    /**
     * Apply one Session Controller live-control frame.
     * @param frame - baseline or live control replacement.
     */
    handleControlFrame(frame) {
        this.manager.handleControlFrame(frame);
    }
    /**
     * Apply one remotely forwarded Session-list addition.
     * @param summary - current Host summary for the added Session.
     */
    handleSessionAdded(summary) {
        this.manager.handleSessionAdded(summary);
    }
    /**
     * Apply one remotely forwarded Session removal.
     * @param sessionId - removed Session identity.
     */
    handleSessionRemoved(sessionId) {
        this.manager.handleSessionRemoved(sessionId);
    }
    /**
     * Apply one remotely forwarded running-state change.
     * @param args - Session identity and current Agent running state.
     */
    handleSessionStatus(...args) {
        this.manager.handleSessionStatus(...args);
    }
    /**
     * Apply one remotely forwarded list-activity change.
     * @param args - Session identity and durable activity timestamp.
     */
    handleSessionActivity(...args) {
        this.manager.handleSessionActivity(...args);
    }
    /**
     * Apply one remotely forwarded Agent failure.
     * @param args - Session identity and caller-visible failure description.
     */
    handleSessionError(...args) {
        this.manager.handleSessionError(...args);
    }
    /** Rebuild the Session baseline and every opened window after connection. */
    handleConnected() {
        this.manager.handleConnected();
    }
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
    async create(opts = {}) {
        const result = await this.manager.create(opts);
        if (!result.ok)
            throw new SessionCreateError(result.error, opts.sessionId);
        this.projectList();
        return result.value.sessionId;
    }
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
    async fork(opts) {
        const sourceTitle = opts.increaseTitle
            ? this.list.getSnapshot().byId[opts.sessionId]?.title
            : undefined;
        const result = await this.manager.fork({
            sessionId: opts.sessionId,
            // Flooring lands inside the anchor's own turn (every turn opens with a
            // turn/start), so the host's first-turn/end-at-or-after cut still ends
            // on that turn — never clipped back to the previous one.
            ...(opts.atSeq === undefined ? {} : { atSeq: SessionSeq(Math.floor(opts.atSeq)) }),
        });
        if (!result.ok)
            throw new SessionForkError(result.error, opts.sessionId);
        this.projectList();
        const childId = result.value.sessionId;
        if (sourceTitle !== undefined) {
            const child = this.binding(childId)?.session;
            if (child === undefined)
                throw new Error(`fork child "${childId}" is not locally addressable`);
            const renamed = await child.rename(increasedForkTitle(sourceTitle));
            if (!renamed.ok)
                throw new Error(`fork child rename failed: ${renamed.error.code}: ${renamed.error.message}`);
        }
        return childId;
    }
    /**
     * Resolve an Agent-scoped context view (use-and-discard).
     * @param id - session id (the agent identity — 1:1 same axis).
     * @returns scoped ctx, or undefined for a session neither listed nor already scoped.
     */
    scope(id) {
        return this.resolve(id)?.ctx;
    }
    /**
     * Materialize the Agent scope named by a validated Host Remote Event.
     * The first successful Session-list baseline becomes authoritative for its
     * lifetime; until then, transport streams may address the scope in either
     * arrival order.
     * @param id - Host-projected Agent identity (the matching Session id).
     * @returns the identity-stable Agent Context.
     */
    resolveAgentScope(id) {
        return (this.scopes.get(id) ?? this.materializeScope(id)).ctx;
    }
    /**
     * Read the Agent scope tag off a context. Service-method boundary: fetch
     * bundles must reach scope resolution through ctx.sessions — a cross-bundle
     * value import of the standalone helper would inline a second module
     * instance whose private tag Symbol never matches.
     * @param ctx - any client context.
     * @returns the session id, or undefined on root contexts.
     */
    scopeOf(ctx) {
        return scopeTagOf(ctx);
    }
    /**
     * Resolve the business Session behind an Agent-scoped context — the one
     * hop every scoped consumer (event listeners, per-session controllers)
     * takes from ctx-space into object-space (the client mirror of host
     * `agent.session`). Same service-method boundary as
     * {@link ClientSessions.scopeOf}.
     * @param ctx - an Agent-scoped context.
     * @returns the session face, or undefined when the ctx is untagged or its scope was pruned.
     */
    sessionOf(ctx) {
        const id = scopeTagOf(ctx);
        if (id === undefined)
            return undefined;
        return this.scopes.get(id)?.binding.session;
    }
    /**
     * Resolve the stable session binding (scope-addressed assembly feed). Pure
     * resolution — no staging, no window side effects.
     * @param id - session id.
     * @returns binding, or undefined for a session neither listed nor already scoped.
     */
    binding(id) {
        return this.resolve(id)?.binding;
    }
    /**
     * Move the stage to the list's current session: sweep teardowns deferred
     * behind the previous occupant and pull the new occupant's history window.
     * Staging IS the open signal — the window opens ⟺ the session is on stage
     * — and open() is idempotent (an in-flight or completed open no-ops; a
     * failed one retries the next time current is touched).
     */
    followCurrent() {
        const snapshot = this.list.getSnapshot();
        const current = snapshot.current;
        // A masked gap (current blanked while the selection's session is
        // transiently absent) holds the stage: tearing down on the gap would
        // destroy exactly the frozen scope the mask exists to preserve.
        if (current === undefined || snapshot.byId[current] === undefined || current === this.watched)
            return;
        this.watched = current;
        this.sweepDeferred();
        const record = this.resolve(current);
        /* v8 ignore next 3 -- defensive: current is always a listed id (open()
         * validates and the projection masks absent selections), so resolve
         * cannot miss; kept so a future current writer cannot crash the notify. */
        if (record !== undefined) {
            void record.session.open();
            void this.manager.refreshSubagents(current);
        }
    }
    /**
     * Lazily mint the scope + binding for an eligible session. Eligibility and
     * prune share one predicate: listed on the host or selected
     * through a retained subagent address. Breadcrumb-only ancestors remain
     * summary data and do not keep scopes alive.
     */
    resolve(id) {
        const existing = this.scopes.get(id);
        if (existing !== undefined)
            return existing;
        if (!this.eligible(id))
            return undefined;
        return this.materializeScope(id);
    }
    /** Materialize one scope after its caller establishes that the id may be addressed. */
    materializeScope(id) {
        const { fiber, ctx } = createScope(this.rootCtx, id);
        const session = this.manager.get(id);
        // The Session owns its scoped dispatch point (host Agent.loopCtx mirror);
        // mint and bind are one step so a live scope record implies a bound actx.
        session.bindScope(ctx);
        const binding = { sessionId: id, session, eventSource: session.eventSource, ctx };
        const record = {
            fiber,
            ctx,
            binding,
            session,
        };
        this.scopes.set(id, record);
        return record;
    }
    /** The one aliveness predicate shared by scope mint and prune: host-listed or currently addressed. */
    eligible(id) {
        const { ids, current } = this.list.getSnapshot();
        return current === id || ids.includes(id);
    }
    /** Project the manager's list snapshot into the store (title derivation is display-only). */
    projectList() {
        const { items, current, phase, subagentsByParent, jobsBySession, currentAddress, } = this.manager.getListSnapshot();
        const ids = [];
        const byId = {};
        for (const entry of items) {
            ids.push(entry.sessionId);
            byId[entry.sessionId] = {
                id: entry.sessionId,
                displayTitle: displayTitleOf(entry.title, entry.cwd, entry.sessionId),
                running: entry.running,
                ...(entry.completed ? { completed: true } : {}),
                blank: entry.blank,
                updatedAt: entry.updatedAt,
                ...(entry.projectionValues === undefined
                    ? {}
                    : { projectionValues: entry.projectionValues }),
                ...(entry.title !== undefined ? { title: entry.title } : {}),
                ...(entry.cwd !== undefined ? { cwd: entry.cwd } : {}),
                ...(entry.parentSessionId !== undefined ? { parentId: entry.parentSessionId } : {}),
                ...(entry.origin !== undefined ? { origin: entry.origin } : {}),
            };
        }
        if (current !== undefined && currentAddress !== undefined) {
            const seen = new Set();
            let address = currentAddress;
            while (address !== undefined && !seen.has(address.childSessionId)) {
                const childId = address.childSessionId;
                seen.add(childId);
                const child = subagentsByParent[address.parentSessionId]?.entries
                    .find(entry => entry.kind === 'child' && entry.id === childId);
                if (child?.kind !== 'child')
                    break;
                const displayTitle = child.label ?? childId;
                const summary = byId[childId];
                if (summary === undefined) {
                    byId[childId] = {
                        id: childId,
                        displayTitle,
                        parentId: address.parentSessionId,
                        origin: 'subagent',
                        running: child.activity === 'running',
                        blank: false,
                        updatedAt: 0,
                    };
                }
                else if (summary.displayTitle !== displayTitle) {
                    byId[childId] = { ...summary, displayTitle };
                }
                const parent = byId[address.parentSessionId];
                if (parent !== undefined && parent.origin !== 'subagent')
                    break;
                address = this.manager.navigationAddress(address.parentSessionId);
            }
        }
        const persisted = this.selection.getSnapshot().sessionId;
        // No current (cleared, or masked gap) wipes the persisted cell — a reload
        // stays on empty; the in-memory selection still resurfaces a masked id.
        if (current === undefined) {
            if (persisted !== undefined)
                this.selection.set({});
        }
        else if (byId[current] !== undefined
            && (persisted !== current
                || this.selection.getSnapshot().subagentAddress?.childSessionId !== currentAddress?.childSessionId
                || this.selection.getSnapshot().subagentAddress?.parentSessionId !== currentAddress?.parentSessionId
                || this.selection.getSnapshot().subagentAddress?.mode !== currentAddress?.mode)) {
            this.selection.set({
                sessionId: current,
                ...(currentAddress === undefined ? {} : { subagentAddress: currentAddress }),
            });
        }
        this.list.set({ ids, byId, current, phase, subagentsByParent, jobsBySession, currentAddress });
        this.pruneScopes();
    }
    /** Tear down scope + instance for no-longer-eligible sessions off stage; the staged one defers until the stage moves. */
    pruneScopes() {
        if (this.list.getSnapshot().phase === 'pending')
            return;
        for (const [id, record] of this.scopes) {
            if (this.eligible(id))
                continue;
            if (id === this.watched) {
                this.deferredRemovals.add(id);
                continue;
            }
            this.scopes.delete(id);
            this.deferredRemovals.delete(id);
            this.startScopeDrop(id, record);
        }
    }
    startScopeDrop(id, record) {
        const drop = this.dropScope(id, record);
        this.scopeDrops.add(drop);
        void drop.then(() => { this.scopeDrops.delete(drop); }, () => { this.scopeDrops.delete(drop); });
    }
    async drainScopeDrops() {
        while (this.scopeDrops.size > 0) {
            await Promise.allSettled([...this.scopeDrops]);
        }
    }
    /**
     * One teardown for the whole per-session axis: the scope
     * fiber (cascading every actx-registered effect: input shell, slash
     * controller, popup, plugin stores, listeners), the session-keyed slot
     * registrations and the Session instance itself — the host session log is the
     * durable truth, a reopen lazily rebuilds and backfills via open().
     */
    async dropScope(id, record) {
        // Release the Session's dispatch point with the scope it belongs to (a
        // surviving instance — the live Intent — rebinds when resolve re-mints).
        record.session.unbindScope();
        await Promise.allSettled([
            record.fiber.dispose(),
            this.manager.drop(id),
        ]);
    }
    /** Run deferred teardowns whose session is no longer staged (called when the stage moves). */
    sweepDeferred() {
        for (const id of [...this.deferredRemovals]) {
            /* v8 ignore next -- defensive: only the staged id ever defers, and every
             * stage move sweeps first, so the set cannot contain the id the stage just
             * moved to; kept as a guard against future extra sweep call sites. */
            if (id === this.watched)
                continue;
            // Eligible again? (A re-added id cancels the deferred teardown.)
            if (this.eligible(id)) {
                this.deferredRemovals.delete(id);
                continue;
            }
            const record = this.scopes.get(id);
            this.deferredRemovals.delete(id);
            /* v8 ignore next -- defensive: prune deletes a scope and its deferral
             * together, so a deferred id always still owns its record; kept so a
             * future teardown path cannot double-dispose. */
            if (record !== undefined) {
                this.scopes.delete(id);
                this.startScopeDrop(id, record);
            }
        }
    }
}
//# sourceMappingURL=service.js.map