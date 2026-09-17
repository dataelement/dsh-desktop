/**
 * Persisted projection cache (`ctx.sessionProjectionCache`): durable
 * checkpoints of every projection unit's state, one record per session on
 * the `session_projcache` domain (`per-record` layout — the shipped json
 * backend stores one document per session under its root). Reads and writes
 * share ONE coherent state: the domain's in-memory tables serve every read
 * synchronously, and each write lands on the domain's write chain (durability
 * first, then memory), so a read can never observe a disk write the memory
 * has not applied, or a memory value the disk does not hold. The cache is a
 * fold shortcut, never an authority: a row
 * is possibly stale (its `seq` says how stale) but never wrong, so every
 * write path is fail-soft (a lost write costs a longer tail replay on the
 * next cold read) and a `ver` mismatch discards the row instead of migrating
 * it. Design authority: the session-projection RFC
 * (.agents/notes/proposed/architecture/2026-07-27-session-projection-and-command-log.md).
 * @module @deepseek-ai/dsh-session-projection-cache
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { SessionLogOffset } from '@deepseek-ai/dsh-session';
import type { Session, SessionEvent, SessionHeader } from '@deepseek-ai/dsh-session';
import type { ProjectionSnapshot, SessionProjectionMap } from '@deepseek-ai/dsh-session-projection';
export { checkpointIdentity, checkpointRecord, checkpointRow, projectionCacheDomainSpec } from './spec.ts';
export type { CheckpointIdentity, CheckpointRecord } from './spec.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        sessionProjectionCache: SessionProjectionCache;
    }
}
/**
 * Plugin config. Both throttle triggers are deployment choices with no
 * universally correct value, so the composition states them explicitly
 * (cordis.yml); the three mandatory write points (session creation,
 * `turn/end`, and session disposal) are policy, not tunables, and always
 * fire.
 */
export interface Config {
    /** Committed events per session that force a durable checkpoint write between mandatory points. */
    writeEveryEvents: number;
    /** Longest time (milliseconds) a dirty checkpoint may stay unwritten between mandatory points. */
    writeIntervalMs: number;
}
export declare const Config: z<Config>;
/**
 * The persisted projection cache service. Opens the `session_projcache`
 * domain at init, checkpoints live sessions on a throttled write-behind
 * (count/interval triggers from {@link Config}) plus three mandatory points —
 * session creation, `turn/end`, and session disposal (the live-to-cold
 * moment) — and serves the
 * cached rows for a session header. Every durable write is fail-soft:
 * failures log a warning and the cache self-heals on the next write.
 */
export declare class SessionProjectionCache extends Service {
    config: Config;
    static inject: string[];
    static Config: z<Config>;
    private table?;
    private readonly dirty;
    constructor(ctx: Context, config: Config);
    /** Open the domain and install the write-behind listeners. */
    protected [Service.init](): Promise<void>;
    /**
     * The stored record for one session, accepted only when its bound log
     * identity matches `expected`. A session id names a slot, not a lifecycle:
     * a recreated id or a persistence store swapped under a surviving cache
     * must not let an old record seed state folded from an unrelated log.
     * Synchronous from the domain's in-memory state — the same state every
     * write mutated, so a read can never go around the write chain to the
     * medium.
     * @param id - the session whose record is read.
     * @param expected - the log identity the caller holds (live or stored header).
     * @returns the identity-matching record, or `undefined` (absent or unrelated).
     */
    private recordFor;
    /**
     * The zero-I/O listing read: whole values viewed straight from the stored
     * rows (version-matching keys only), each cut carried with its watermark so
     * a client value store can seed under its higher-seq-wins rule — as stale
     * as the last durable checkpoint but never wrong, and never from an
     * unrelated log (the caller's header is the identity witness). Fresher
     * paths (the history tail baseline) supersede these values whenever a
     * session is actually opened.
     * @param meta - the listed session's header (identity witness; no log read).
     * @param inheritedEventCount - exact inherited prefix length that completes
     * the checkpoint identity.
     * @param keys - optional projection keys required by the caller's audience.
     * @returns the cut (`asOfSeq` = lowest served-row watermark), or
     *   `undefined` when no usable row exists for this lifecycle.
     */
    cachedSnapshot(meta: SessionHeader, inheritedEventCount: SessionLogOffset, keys?: readonly Extract<keyof SessionProjectionMap, string>[]): ProjectionSnapshot | undefined;
    /**
     * Read only a predecessor checkpoint's title as a zero-I/O listing hint.
     *
     * The authoritative Session header supplies the lifecycle identity. A cache
     * checkpoint can lag that log but cannot lead it because writes flush the
     * log first, so a matching predecessor title is a genuine (possibly stale)
     * fact from this Session. The registry still requires the current title
     * projection's row version and schema. No other predecessor projection is
     * exposed: format normalization can change their current meaning, and the
     * strict {@link cachedSnapshot} / hydration paths continue to reject them.
     * @param meta - authoritative listed Session header.
     * @param inheritedEventCount - exact inherited cut completing the lifecycle identity.
     * @returns a title-only checkpoint view with `asOfSeq: -1`, or `undefined`
     *   when the record is current, newer, unrelated, missing, or incompatible
     *   with the title unit. The sentinel avoids reusing a sequence that a
     *   cardinality-changing Session migration may have remapped.
     */
    cachedPredecessorTitle(meta: SessionHeader, inheritedEventCount: SessionLogOffset): ProjectionSnapshot | undefined;
    /** View selected wire rows and bind them to their lowest served watermark. */
    private viewRecord;
    /**
     * Hydrate projection cells for an already-prepared Session without another
     * persistence read. The cache seeds matching rows; the supplied exact log
     * advances every unit to the observation cut. No checkpoint is written
     * because the logical observation may contain recovery events not yet durable.
     * @param session - exact unpublished Session retained by persistence.
     * @param events - exact logical event prefix represented by the observation.
     * @returns all projection values at the event cut.
     */
    hydratePrepared(session: Session, events: readonly SessionEvent[]): ProjectionSnapshot;
    /**
     * Durably checkpoint one live session NOW (all mandatory points call
     * this; tests and carriers may too). The registry cut is snapshotted at
     * this boundary (states are live references), then the session's record is
     * replaced on the domain's write chain. NOT fail-soft — callers on the
     * fail-soft paths contain it.
     * @param session - the live session to checkpoint.
     * @returns resolution after durability and event emission.
     */
    write(session: Session): Promise<void>;
    /**
     * Cold-read one session's projections from its complete log. Each unit is
     * seeded from the identity-checked cached rows — the registry skips `apply`
     * for the already-folded prefix (events at or below the row's `seq`) — and
     * the refreshed checkpoint is written back (fail-soft, fire-and-forget), so
     * the first cold read creates the cache row and later ones seed from it.
     * The caller supplies the complete log in seq order: this service never
     * consults the persistence layer.
     * @param meta - the stored session header (identity witness).
     * @param inheritedEventCount - exact inherited prefix length for projection initialization and identity.
     * @param events - the session's complete log, in seq order.
     * @returns the projection cut at the log end.
     */
    coldSnapshot(meta: SessionHeader, inheritedEventCount: SessionLogOffset, events: readonly SessionEvent[]): ProjectionSnapshot;
    private installWritePath;
    /**
     * One fail-soft durable checkpoint. Every caller has work by construction:
     * the throttle triggers only fire dirty (markClean clears the timer with
     * the counter) and the mandatory points write unconditionally.
     */
    private flushSoft;
    /** Reset one session's dirty bookkeeping (its checkpoint is being written). */
    private markClean;
    /** Replace one session's stored record with its log identity and a detached snapshot of `rows`. */
    private put;
    private requireTable;
}
export default SessionProjectionCache;
//# sourceMappingURL=index.d.ts.map