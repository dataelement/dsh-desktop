/**
 * The JSONL provider's session storage runtime: its concrete write/read
 * handle with a per-handle mutation chain and a routed live write-behind
 * buffer, the in-process bookkeeping that enforces one active writer per
 * session id, and the backend's live event routing and teardown. Deliberately
 * provider-local: the persistence seam exposes only the service and handle
 * contracts, and the shared contract suites pin equivalent observable
 * behavior across providers.
 * @module
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionEvent, SessionHeader, SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session';
import { SessionPersistenceRevision } from '@deepseek-ai/dsh-session-persistence';
import type { SessionAccess, SessionHandle, SessionHandleAppendOptions, SessionHandleFlushOptions, SessionHandleReadOptions, SessionHandleReadResult } from '@deepseek-ai/dsh-session-persistence';
import type { SessionWriteLease } from './lease.ts';
/** Maximum intentional wait before a routed live session batch starts writing. */
export declare const LIVE_WRITE_BATCH_MAX_DELAY_MS = 200;
/** The file-storage primitives the handle drives on its owning service. */
export interface JsonlHandleStorage {
    /** Append encoded lines; `isMaterialized` selects create-vs-extend publication. */
    persistBatch(header: SessionHeader, events: readonly SessionEvent[], isMaterialized: boolean, inheritedEventCount: SessionLogOffset): Promise<void>;
    /** Materialize the header-only artifact for an explicitly flushed empty session. */
    persistHeader(header: SessionHeader, inheritedEventCount: SessionLogOffset): Promise<void>;
    /** Truncate a torn physical tail before the first new append lands. */
    truncateTornTail(header: SessionHeader, truncateTo: number): Promise<void>;
    /** Resolve the current-generation artifact path, or `undefined` when absent. */
    resolveCurrentLog(id: SessionId, signal?: AbortSignal): Promise<string | undefined>;
    /** Read and validate the stored log at `path`, including its established event aliasing state. */
    readStoredLog(path: string, expectedId: SessionId, signal?: AbortSignal): Promise<SessionHandleReadResult>;
    /** Whether the id is still a created-but-unmaterialized session here. */
    hasPendingSession(id: SessionId): boolean;
    /** Acquire the session's cross-process write lock in its artifact directory. */
    acquireWriteLease(header: SessionHeader): Promise<SessionWriteLease>;
    /** Drop the handle's bookkeeping on close. */
    releaseHandle(handle: JsonlSessionHandle, materialized: boolean): void;
}
/** Mutable per-handle log state; a write handle is its session's single mutator. */
export interface StorageHandleState {
    /** The stored next-seq (the logical end this handle knows). */
    cursor: number;
    /** Whether the session has a durable artifact yet. */
    materialized: boolean;
    /** Torn-tail truncation point, consumed by the first new append. */
    tornTruncateTo?: number | undefined;
    /** Complete events recovered from the torn final frame; the first mutation rewrites them durably. */
    recoveredTail?: SessionEvent[] | undefined;
    /** Exact fork-inherited prefix length stored with the log; `0` when unseeded. */
    inheritedEventCount: SessionLogOffset;
    /** The validated stored prefix from a write open, served to reads until the first append. */
    primed?: SessionHandleReadResult | undefined;
}
/**
 * The JSONL session handle. Mutations serialize on a per-handle promise
 * chain; reads re-scan the artifact on demand and never observe a shorter log
 * than a prior read on this handle. Routed live events buffer in a bounded
 * window and drain through the same chain as explicit appends.
 */
export declare class JsonlSessionHandle implements SessionHandle {
    private readonly storage;
    readonly id: SessionId;
    readonly header: SessionHeader;
    readonly access: SessionAccess;
    private readonly state;
    /** The cross-process write lock; a create handle acquires it lazily at first materialization. */
    private lease?;
    private chain;
    private closing;
    private observedLength;
    /** Routed live events awaiting their batching deadline (persistence-owned copies). */
    private buffered;
    private batchTimer;
    /** Set when a drain failed; the automatic timer stays quiet until the next drain. */
    private drainPaused;
    private draining;
    constructor(storage: JsonlHandleStorage, id: SessionId, header: SessionHeader, access: SessionAccess, state: StorageHandleState, 
    /** The cross-process write lock; a create handle acquires it lazily at first materialization. */
    lease?: SessionWriteLease | undefined);
    /** Exact fork-inherited prefix length stored with this session's log. */
    get inheritedEventCount(): SessionLogOffset;
    /**
     * Read a slice of the valid contiguous logical log; see the seam contract.
     * @param offset - first logical seq to include (default 0).
     * @param length - maximum events returned (default: the rest).
     * @param options - optional cancellation.
     * @returns a slice carrying the aliasing state established by its producer.
     */
    read(offset?: number, length?: number, options?: SessionHandleReadOptions): Promise<SessionHandleReadResult>;
    /** Read one slice from the prepared historical prefix retained by this handle. */
    private readPrimed;
    /** Read one current physical generation and enforce this handle's monotonic view. */
    private readCurrent;
    /**
     * Durably append a contiguous batch; see the seam contract.
     * @param events - the contiguous batch in seq order.
     * @param options - optional cancellation observed before the write starts.
     */
    append(events: readonly SessionEvent[], options?: SessionHandleAppendOptions): Promise<void>;
    /**
     * Durability barrier; materializes the artifact when nothing has been
     * appended yet, so an explicitly flushed empty session survives this process.
     * @param options - optional cancellation observed before the barrier starts.
     */
    flush(options?: SessionHandleFlushOptions): Promise<void>;
    /**
     * Release the handle; see the seam contract. Idempotent and uncancellable.
     * A write handle first drains its routed live buffer through the still-open
     * storage, so backend teardown loses nothing regardless of which fiber
     * unwinds first; a drain or lock-release failure still frees the in-process
     * claim, then rejects — both failures together reject as one
     * `AggregateError`.
     * @returns settlement of the release.
     */
    close(): Promise<void>;
    /** `await using` support: delegates to {@link close}. */
    [Symbol.asyncDispose](): Promise<void>;
    /**
     * Buffer one published live session event and arm the bounded batching
     * window when it is idle. The routing installer is the only caller.
     * @param event - the live event, retained as a persistence-owned copy.
     * @param reportBackgroundFailure - observes a deadline-driven drain failure
     *   (the events stay buffered; the next {@link drainLive} retries loudly).
     */
    enqueueLive(event: SessionEvent, reportBackgroundFailure: (error: unknown) => void): void;
    /**
     * Durably drain the routed live buffer through the mutation chain;
     * concurrent callers join one drain, and a failure retains the batch in
     * order so `session/flush` can retry and reject loudly.
     */
    drainLive(): Promise<void>;
    private drainBuffered;
    /** The shared durable-append body: contiguity, ownership, torn-tail repair, storage write, state advance. */
    private persistContiguous;
    /**
     * Hold the cross-process write lock before this session's first durable
     * write. An open write handle holds it from construction; a create handle
     * acquires it here — immediately before the first log bytes publish — and
     * keeps it through close even when materialization then fails, so a
     * materializing session stays exclusively owned across retries.
     */
    private ensureLease;
    /** Serialize one operation onto the chain without the closed-handle refusal (drain-from-close). */
    private enqueueChain;
    /** Serialize one public mutating operation onto this handle's chain. */
    private run;
    private assertOpen;
}
/** One created-but-unmaterialized session tracked in this process only. */
export interface PendingSession {
    readonly header: SessionHeader;
    readonly revision: SessionPersistenceRevision;
    /** Exact fork-inherited prefix length supplied at create. */
    readonly inheritedEventCount: SessionLogOffset;
}
/**
 * The JSONL backend's in-process bookkeeping: the single active writer per
 * session id (doubling as the live event router), the open-handle set the
 * teardown sweep closes, and the created-but-unmaterialized sessions this
 * process can already observe.
 */
export declare class JsonlBackendTracker {
    private readonly name;
    /** Every open handle; teardown closes what remains. */
    readonly openHandles: Set<SessionHandle>;
    /** `null` marks a claim whose handle is still being constructed. */
    private readonly writers;
    private readonly pending;
    private counter;
    /** @param name - backend label used in in-memory revision tokens and teardown errors. */
    constructor(name: string);
    /**
     * Claim write ownership and record the created session as pending, making
     * it observable to this process before it materializes. Before
     * materialization this registration is the only guard — session ids do not
     * collide across processes, and no durable artifact exists for another
     * process to open; the handle takes the cross-process lock at its first
     * materializing write.
     * @param header - the validated detached header.
     * @param inheritedEventCount - the exact fork-inherited prefix length.
     * @throws {SessionAlreadyExistsError} when a concurrent create or an open
     *   write handle holds the id — for create, the duplicate is the fact.
     */
    registerCreated(header: SessionHeader, inheritedEventCount: SessionLogOffset): void;
    /**
     * Claim write ownership for an existing session.
     * @param id - the session to claim.
     * @throws {SessionAlreadyOwnedError} when an active write handle exists.
     */
    claimWrite(id: SessionId): void;
    /**
     * Roll a failed write open back.
     * @param id - the session whose claim is dropped.
     */
    releaseClaim(id: SessionId): void;
    /**
     * The pending entry for a created-but-unmaterialized session, if any.
     * @param id - the session to look up.
     * @returns the pending header and in-memory revision.
     */
    pendingOf(id: SessionId): PendingSession | undefined;
    /**
     * Whether this process still tracks a created-but-unmaterialized session.
     * @param id - the session to test.
     * @returns true while the pending entry exists.
     */
    hasPending(id: SessionId): boolean;
    /**
     * Iterate the pending sessions for listing.
     * @returns the pending entries, keyed by session id.
     */
    pendingEntries(): IterableIterator<[SessionId, PendingSession]>;
    /**
     * Drop a pending entry once the session materialized durably.
     * @param id - the session that reached durable storage.
     */
    materialized(id: SessionId): void;
    /**
     * Track one open handle for teardown and, for a write handle, bind it as
     * the session's live event route.
     * @param handle - the just-constructed handle.
     * @returns the same handle, for construction-site chaining.
     */
    adopt(handle: JsonlSessionHandle): JsonlSessionHandle;
    /**
     * Release one handle's bookkeeping on close. A write handle drops its
     * ownership claim; a creator that never materialized leaves nothing behind —
     * the session never existed.
     * @param handle - the closing handle.
     * @param materialized - whether the session reached durable storage.
     */
    release(handle: JsonlSessionHandle, materialized: boolean): void;
    /**
     * Drain and flush every active write handle — the service-wide durability
     * barrier behind `SessionPersistence.flush`.
     * @throws {AggregateError} naming each session whose flush failed; the
     *   remaining handles still flush.
     */
    flushAll(): Promise<void>;
    /**
     * Install the backend's live session routing and teardown. Persistence
     * enforces one active write handle per id, so the listeners route published
     * sessions' events by id; the teardown effect closes every open handle —
     * close drains the routed buffer — and aggregates failures. This provider
     * owns no separate storage connection, so closing handles is the complete
     * teardown. Registrations are effects of the current fiber.
     * @param ctx - the backend's context.
     */
    install(ctx: Context): void;
}
//# sourceMappingURL=storage.d.ts.map