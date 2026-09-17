/**
 * Service Definition and drive registry for the session-projection capability seam: the merge-extensible state and client-view type
 * tables, the `ProjectionDefinition` state-driven computation unit contract,
 * and the `ctx.sessionProjections` registry that DRIVES every registered unit
 * forward eagerly over committed session events. Domain host plugins
 * contribute pure folds and optional client views; the framework owns the
 * subscription, the per-session watermark cache, and change notification;
 * carriers consume the snapshot read face and the change feed. Neither side
 * knows the other
 * (capability-seam three-way split). Design authority: the session-projection
 * RFC (.agents/notes/proposed/architecture/2026-07-27-session-projection-and-command-log.md).
 *
 * Whole-value event rule (load-bearing): a state-carrying log event MUST
 * carry the complete post-change state, never a bare delta — it keeps every
 * unit's transition trivially cheap and every served value self-describing.
 *
 * @module @deepseek-ai/dsh-session-projection
 */
import { Context, Service } from '@deepseek-ai/cordis';
import type { ZodType } from 'zod';
import { SessionLogOffset, SessionSeq } from '@deepseek-ai/dsh-session';
import type { Session, SessionEvent, SessionHeader, SessionSeqCursor } from '@deepseek-ai/dsh-session';
declare module '@deepseek-ai/cordis' {
    interface Context {
        sessionProjections: SessionProjectionRegistry;
    }
}
import type { SessionProjectionMap, SessionProjectionStateMap } from './types.ts';
export type { SessionProjectionMap, SessionProjectionStateMap } from './types.ts';
/**
 * One domain's state-driven computation unit: a pure synchronous fold plus
 * declarations and an optional client view — never an opaque getter. The framework drives
 * `apply` on every committed session event; the domain holds no
 * subscriptions and owns only the computation. All functions MUST be
 * synchronous (an async unit would tear the carriers' consistency cut), and
 * `state` MUST be plain JSON (the persisted-cache precondition).
 */
export interface ProjectionDefinition<K extends keyof SessionProjectionStateMap, S extends SessionProjectionStateMap[K] = SessionProjectionStateMap[K]> {
    /** The projection key this unit owns (its `SessionProjectionStateMap` entry). */
    key: K;
    /** Validates persisted state before it seeds a fold. */
    stateSchema: ZodType<S>;
    /**
     * State for the empty log and its immutable Session metadata.
     * @param header - immutable metadata for the Session being projected.
     * @param inheritedEventCount - exact fork-inherited prefix length.
     * @returns the initial state.
     */
    init(header: SessionHeader, inheritedEventCount: SessionLogOffset): NoInfer<S>;
    /**
     * Pure transition: previous state + one committed event → next state. A
     * unit uninterested in an event MUST return the same state reference — an
     * unchanged reference (`Object.is`) produces zero downstream work.
     * @param state - the state covering all prior events.
     * @param event - the next committed session event.
     * @returns the next state (same reference when the event is not the unit's).
     */
    apply(state: NoInfer<S>, event: SessionEvent): NoInfer<S>;
    /** Client view. Omit for host-only units. */
    wire?: K extends keyof SessionProjectionMap ? {
        /** Validates the wire payload before it leaves the host. */
        viewSchema: ZodType<SessionProjectionMap[K]>;
        /**
         * State → wire payload (the read-side projection). The live drive keeps
         * the two latest raw results and compares them with `Object.is`; an
         * object-valued view must reuse its reference to suppress publication
         * across internal-only state changes.
         * @param state - the current state.
         * @returns the whole current value for this unit's key.
         */
        view(state: NoInfer<S>): SessionProjectionMap[K];
    } : never;
    /**
     * Persisted-cache invalidation version: bump whenever the serialized state fields or the
     * fold semantics change, so persisted `(sessionId, key, ver, seq, val)`
     * rows from an older unit are discarded instead of being forward-applied
     * into garbage. Non-negative integer.
     */
    stateVersion: number;
}
/**
 * Change-feed listener: one unit's raw `view` result changed by `Object.is`
 * for one session. `value` is the schema-validated output; `seq` is the
 * unit's watermark at emission (the seq of the event that caused the change).
 */
export type ProjectionChangeListener = (session: Session, key: Extract<keyof SessionProjectionMap, string>, value: unknown, seq: SessionSeq) => void;
/**
 * One consistent read cut over every registered client-visible unit for one session.
 * `asOfSeq` is the shared watermark — the seq of the last event every value
 * reflects (`-1` for an empty log).
 */
export interface ProjectionSnapshot {
    /** Seq of the last event the values reflect; -1 for an empty log. */
    asOfSeq: SessionSeqCursor;
    /** Whole current client value per registered key. */
    values: Partial<SessionProjectionMap>;
}
/**
 * One unit's checkpoint: its internal state (plain JSON by the unit
 * contract), the seq of the last event folded into it, and the unit
 * `stateVersion` that produced it — the persisted projection-cache row
 * `(sessionId, key, ver, seq, val)` minus the two outer keys. A row is
 * never authoritative, only a fold shortcut: `restore` discards it on a
 * version mismatch or when it claims events past the stored log end.
 */
export interface ProjectionCheckpointRow {
    /** The registering unit's `stateVersion` at fold time. */
    ver: number;
    /** Seq of the last event folded into `val`; -1 for the empty log. */
    seq: SessionSeqCursor;
    /** The unit's internal state — plain JSON per the unit contract. */
    val: unknown;
}
/** Checkpoint rows keyed by projection key (one session's persisted cache value). */
export type ProjectionCheckpoint = Record<string, ProjectionCheckpointRow>;
/**
 * `ctx.sessionProjections`: the projection unit table and its drive. The
 * service subscribes to `session/event` once; every committed event passes
 * every registered unit's `apply` (eager drive). A changed state reference
 * computes the next client view; the change feed is notified only when its
 * raw result changes by `Object.is`.
 * Cells build lazily — a unit registered after events flowed, or a session
 * older than the registry, folds `init` over the in-memory log on first
 * touch (event or read). Registration is an effect (disposer rides the
 * calling fiber): an unloaded domain plugin's key disappears from snapshots
 * and clients read it as capability absence. A host reader either declares
 * `sessionProjections` in its plugin `inject` or fails explicitly when the
 * registry or required key is absent. Contributors may preserve optional
 * registration through `ctx.inject(['sessionProjections'], ...)`. Registrants sharing a key
 * share one unit and are counted: the same tool package mounted in N agent
 * presets registers N times, and the key survives until the last one
 * unloads.
 */
export declare class SessionProjectionRegistry extends Service {
    private readonly registrations;
    private readonly listeners;
    /**
     * Create and install the registry as `ctx.sessionProjections`.
     * @param ctx - Cordis context that owns the service.
     */
    constructor(ctx: Context);
    /**
     * Register one domain's unit. The registration is an effect on the calling
     * context's fiber: disposing the fiber (or calling the returned disposer)
     * removes the key — and the unit's cached cells — from subsequent drives
     * and snapshots.
     * @param definition - key, state schema, pure unit functions, and stateVersion.
     * @returns the exact disposer that unregisters this unit.
     */
    register<K extends keyof SessionProjectionMap, S extends SessionProjectionStateMap[K]>(definition: Omit<ProjectionDefinition<K, S>, 'wire'> & {
        wire: NonNullable<ProjectionDefinition<K, S>['wire']>;
    }): () => void;
    /**
     * Register one host-only unit. Its state is omitted from client snapshots
     * and always checkpointed like every other unit.
     * @param definition - key, state schema, pure unit functions, and stateVersion.
     * @returns the exact disposer that unregisters this unit.
     */
    register<K extends Exclude<keyof SessionProjectionStateMap, keyof SessionProjectionMap>, S extends SessionProjectionStateMap[K]>(definition: Omit<ProjectionDefinition<K, S>, 'wire'>): () => void;
    /**
     * Subscribe to the change feed. The registration is an effect on the
     * calling context's fiber.
     * @param listener - called once per client-visible unit whose raw view changed by `Object.is`, per committed event.
     * @returns the exact disposer that unsubscribes.
     */
    onChanged(listener: ProjectionChangeListener): () => void;
    /**
     * Read one unit's current host state after materializing every registered
     * unit at the Session cursor. Unrelated wire views are not produced.
     * The returned value is live; callers must not mutate it.
     * @param session - the session whose state is read.
     * @param key - the registered unit key.
     * @returns current state, or `undefined` when the key is not registered.
     */
    stateOf<K extends keyof SessionProjectionStateMap>(session: Session, key: K): SessionProjectionStateMap[K] | undefined;
    /**
     * One consistent cut over every registered client-visible unit for one session, read from
     * the watermark cache (missing cells fold lazily over the in-memory log).
     * Fully synchronous — every value and `asOfSeq` reflect the same log
     * position. Each value passes its unit's `viewSchema` before leaving.
     * @param session - the session whose projection values are read.
     * @param keys - optional client-visible outputs; state materialization remains complete.
     * @returns the snapshot; `values` is empty when no selected client-visible unit is registered.
     */
    snapshot(session: Session, keys?: readonly Extract<keyof SessionProjectionMap, string>[]): ProjectionSnapshot;
    /**
     * Read only already-materialized client-visible cells without folding history.
     * Values may trail the live Session and are therefore hints, not a complete
     * baseline. Missing cells are omitted.
     * @param session - attached Session whose cached cells are inspected.
     * @param keys - optional wire keys to view.
     * @returns the lowest common cached cut, or `undefined` when no wire cell exists.
     */
    cachedSnapshot(session: Session, keys?: readonly Extract<keyof SessionProjectionMap, string>[]): ProjectionSnapshot | undefined;
    /**
     * State-level checkpoint of every persisted unit for one session, read
     * from the watermark cache (missing cells fold lazily over the in-memory
     * log). This is the write side of the persisted projection cache: the
     * returned rows are the `(key → {ver, seq, val})` part of the durable
     * `(sessionId, key, ver, seq, val)`
     * rows. Every `val` is a DETACHED structured clone — never the live
     * cell reference: the watermark cache is this registry's authoritative
     * mutable state, and a caller reaching the live reference could corrupt
     * every subsequent snapshot and frame through it (plain JSON by the unit
     * contract, so the clone is total).
     * @param session - the session whose unit states are checkpointed.
     * @returns one row per registered key.
     */
    checkpoint(session: Session): ProjectionCheckpoint;
    /**
     * The stored seq a {@link restore} tail read over `checkpoint` must start
     * at: one event BELOW the lowest usable watermark (a row is usable when
     * its `ver` matches the live unit's `stateVersion`; an absent or mismatched row
     * pulls the floor to `0` — that key must refold the full log). The
     * one-below anchor is load-bearing: the tail then proves how far the
     * stored log still extends, so {@link restore} can detect a log that
     * shrank below a row's watermark (crash-repair truncation) instead of
     * serving the stale row as current — an empty tail read from the anchor
     * yields an end below every watermark and the restore rejects for a full
     * re-read.
     * @param checkpoint - persisted rows for one session (possibly stale or empty).
     * @returns the offset for the stored-log suffix read (`SessionHandle.read`),
     *   or `undefined` when no unit is registered (no read needed —
     *   {@link restore} would serve empty values regardless).
     */
    restoreFloor(checkpoint: ProjectionCheckpoint): SessionLogOffset | undefined;
    /**
     * View a checkpoint's rows without any log read: for every registered
     * client-visible unit whose row's `ver` matches, serve the schema-validated
     * `view` of the schema-validated stored state; mismatched, malformed, or absent rows leave their key
     * absent (a cold or listing consumer treats it as not-yet-available and a
     * fuller read path refolds it). The zero-I/O rung of the read ladder —
     * values are as stale as their rows, never wrong.
     * @param checkpoint - persisted rows for one session (possibly stale or empty).
     * @param keys - optional wire keys to view.
     * @returns whole values per key with a usable row; empty when none.
     */
    viewCheckpoint(checkpoint: ProjectionCheckpoint, keys?: readonly Extract<keyof SessionProjectionMap, string>[]): Partial<SessionProjectionMap>;
    /**
     * Cold read: fold every persisted unit over a stored log suffix, seeding
     * each from its checkpoint row when usable — the one read recipe (cached
     * state + forward tail replay + `view`) applied without a live `Session`.
     * Call with the stored events at or past `restoreFloor(checkpoint)` (a
     * `SessionHandle.read` slice) and that same floor as
     * `baseSeq`; the floor's one-below anchor makes the supplied end honest,
     * so a shrunk log is detected here. A row is usable iff its
     * `ver` matches the live unit's `stateVersion`, it does not predate `baseSeq`
     * (`seq >= baseSeq - 1`), and it does not claim events past the
     * supplied end (`seq <= endSeq`); an unusable row is discarded
     * and its key refolds from `init` — which is only sound over the full
     * log, so a discarded row with `baseSeq > 0` throws (the caller re-reads
     * from seq 0, e.g. after a crash-repair truncation shrank the log below
     * a row's watermark).
     * @param checkpoint - persisted rows for one session (possibly stale or empty).
     * @param events - the stored events with `seq >= baseSeq`, in seq order.
     * @param baseSeq - the seq `events` starts at (its first event's seq when non-empty).
     * @param header - immutable metadata for the Session being restored.
     * @param inheritedEventCount - exact fork-inherited prefix length supplied to unit initialization.
     * @returns the snapshot cut at the supplied log end (`asOfSeq` is the last
     *   supplied event's seq, `baseSeq - 1` for an empty tail) plus the
     *   refreshed checkpoint rows at that cut, ready for a durable write-back.
     */
    restore(checkpoint: ProjectionCheckpoint, events: readonly SessionEvent[], baseSeq: SessionLogOffset, header: SessionHeader, inheritedEventCount: SessionLogOffset): {
        snapshot: ProjectionSnapshot;
        checkpoint: ProjectionCheckpoint;
    };
    /**
     * Restore an exact cut and install its states on the supplied prepared Session.
     * A later publication reuses these cells; ordinary live reads and event drive
     * advance any constructor-owned suffix exactly once.
     * @param session - exact prepared Session that owns the restored log prefix.
     * @param checkpoint - persisted rows for this Session lifecycle.
     * @param events - exact events at the observation cut.
     * @param baseSeq - first supplied event sequence.
     * @returns all projection values at the supplied cut.
     */
    hydrate(session: Session, checkpoint: ProjectionCheckpoint, events: readonly SessionEvent[], baseSeq: SessionLogOffset): ProjectionSnapshot;
    /** Materialize every registered unit cell at the Session's current cursor. */
    private materializeCells;
    /** Fold one unit from init over `events`, producing a cell watermarked at the last folded event. */
    private buildCell;
    /** Read (or lazily build, folding the full in-memory log) one unit's cell. */
    private cellFor;
    /** Advance one existing cell through a contiguous Session prefix. */
    private advanceCell;
    /** Eager drive: pass one committed event through every unit; notify on changed raw view references. */
    private drive;
    /** Return one schema-validated wire value. */
    private viewCell;
}
export default SessionProjectionRegistry;
//# sourceMappingURL=index.d.ts.map