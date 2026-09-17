/** Shared live/prepared observations for Session page and lifecycle consumers. */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionEvent, SessionHeader, SessionId, SessionLogOffset as SessionLogOffsetType, SessionSeqCursor } from '@deepseek-ai/dsh-session';
import type { SessionPersistenceRevision } from '@deepseek-ai/dsh-session-persistence';
import type { ProjectionSnapshot } from '@deepseek-ai/dsh-session-projection';
/** One exact immutable Session cut retained for the caller's read lifetime. */
export interface SessionObservation extends Disposable {
    /** Whether the cut came from an attached Session or a retained preparation. */
    readonly source: 'live' | 'prepared';
    /** Immutable Session identity metadata. */
    readonly header: SessionHeader;
    /** Exact fork-inherited event count paired with {@link header}. */
    readonly inheritedEventCount: SessionLogOffsetType;
    /**
     * Immutable contiguous events at {@link cursor}. A live observation
     * materializes this array on first read, so a consumer that reads only the
     * header, cursor, or projections never copies the log.
     */
    readonly events: readonly SessionEvent[];
    /** Last observed event seq, or -1 for an empty log. */
    readonly cursor: SessionSeqCursor;
    /** Durable source revision for a cold prepared observation. */
    readonly revision?: SessionPersistenceRevision;
    /** Exact projection baseline at {@link cursor}, when the registry is mounted. */
    readonly projections?: ProjectionSnapshot;
    /**
     * Retain the same immutable cut for another Host owner.
     * @returns an independently disposable lease over this observation.
     */
    retain(): SessionObservation;
}
/** Projection work and cancellation requested for one exact observation. */
export interface SessionObservationOptions {
    /** Optional cancellation while resolving a cold source. */
    readonly signal?: AbortSignal;
    /** Whether to compute every projection or leave projection state untouched. */
    readonly projectionMode?: 'all' | 'none';
}
/**
 * Builds point observations without a corpus listing preflight.
 *
 * Cold reads are cached per session id, keyed by the persistence instance and
 * the `stat` revision observed before the log read: an unchanged revision
 * reuses the restored Session without re-reading the log. The cache is bounded
 * (least-recently-used unpinned entries are evicted past the capacity), and
 * entries pinned by active leases survive eviction and replacement — a lease's
 * cut stays valid for the lease lifetime even after a newer revision lands.
 */
export declare class SessionObservationReader {
    private readonly ctx;
    private readonly cacheCapacity;
    private readonly cache;
    /**
     * @param ctx - context carrying Session and optional persistence/projection services.
     * @param cacheCapacity - maximum unpinned cold observations retained for reuse.
     */
    constructor(ctx: Context, cacheCapacity?: number);
    /**
     * Observe one live-preferred Session and retain a cold preparation until disposal.
     * @param sessionId - logical Session identity.
     * @param options - cancellation and all-or-none projection computation for this read.
     * @returns one exact immutable observation.
     */
    read(sessionId: SessionId, options?: SessionObservationOptions): Promise<SessionObservation>;
    /** Observe the stored snapshot, mapping absence and backend failures to the query taxonomy. */
    private statSource;
    /** Read the complete balanced cold log, mapping backend failures to the query taxonomy. */
    private loadSource;
    /** Return a still-valid cached entry and mark it most recently used. */
    private cachedEntry;
    /** Insert or replace the entry for one id, then evict past the capacity. */
    private store;
    /**
     * Evict oldest unpinned entries until the cache fits its capacity again.
     * Runs on store and whenever a lease release unpins an entry, so leases
     * that pinned every candidate cannot leave the cache over budget for good.
     * @param keep - the entry being stored, about to be leased; never evicted.
     */
    private evictPastCapacity;
    /** Build one disposable lease over a cached entry, pinning it until every lease releases. */
    private preparedLease;
    private live;
    private preparedProjections;
}
//# sourceMappingURL=observation.d.ts.map