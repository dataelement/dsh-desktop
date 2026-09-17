/**
 * JSONL durable session-persistence backend. It stores a header and contiguous
 * events in immutable generation files under one directory per session and serves the handle-based
 * `SessionPersistence` API: `create`/`open` return per-session handles, and
 * every read validates the same fail-closed storage contract.
 * @module @deepseek-ai/dsh-session-persistence-jsonl
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { SessionPersistence, type SessionAccess, type SessionHandle, type SessionHandleReadResult, type SessionPersistenceCreateOptions, type SessionPersistenceListOptions, type SessionPersistenceOpenOptions, type SessionPersistenceSnapshot, type SessionPersistenceStatOptions, type SessionPersistenceRevision as PersistenceRevision } from '@deepseek-ai/dsh-session-persistence';
import { JsonlSessionHandle } from './storage.ts';
import { SessionWriteLease } from './lease.ts';
import type { SessionEvent, SessionId, SessionHeader, SessionLogOffset as SessionLogOffsetType } from '@deepseek-ai/dsh-session';
import { type JsonlCompression } from './format.ts';
export type { JsonlCompression } from './format.ts';
/** Loader schema for the JSONL artifact's physical encoding. */
export declare const JsonlCompressionSchema: z<JsonlCompression>;
/** Plugin config for the JSONL backend's root and physical encoding. */
export interface Config {
    /**
     * Root directory for all session files. Required (no default): a default of
     * `process.cwd()` would scatter session files as the process's cwd changes
     * (bash calls, subprocesses). Sessions group under human-readable project
     * directories, then per-session directories. An existing root must be a
     * readable directory; an absent root is created on first materialization.
     */
    root: string;
    /** Physical encoding; defaults to checksummed Zstandard frames. */
    compression?: JsonlCompression;
}
/** One stored event graph whose producer has established immutable sharing. */
interface FrozenStoredEvents extends SessionHandleReadResult {
    readonly eventState: 'shared-frozen';
}
/** State shared by prepared historical and published current logs. */
interface StoredLogBase extends FrozenStoredEvents {
    readonly meta: SessionHeader;
    readonly tornTruncateTo: number | undefined;
    /** Complete events recovered from the torn final frame; the write path rewrites them durably. */
    readonly recoveredTail: SessionEvent[];
    /** Exact fork-inherited prefix length stored in the header line. */
    readonly inheritedEventCount: SessionLogOffsetType;
    readonly revision: PersistenceRevision;
}
/** A decoded current generation that is already durable. */
interface CurrentStoredLog extends StoredLogBase {
    readonly status: 'current';
}
/**
 * The JSONL persistence backend. Load as a plugin; it registers as
 * `ctx.sessionPersistence`. Sessions materialize lazily: a created session is
 * visible to this process immediately, reaches disk on its first append or
 * flush, and never existed if the process crashes before that.
 */
declare class JsonlSessionPersistence extends SessionPersistence {
    config: Config;
    static Config: z<Config>;
    /** Backend label for diagnostics and effects; shadows `Service.name` without changing the service key. */
    readonly name = "session-persistence-jsonl";
    private root;
    private compression;
    private rootEncodingCheck;
    private readonly tracker;
    private readonly generationFormat;
    /**
     * Bounded LRU of parsed, validated stored logs keyed by session id and
     * guarded by the stat-derived revision, so an immediate cold-read handoff
     * (observation then resume) parses the artifact once. Every local mutation
     * for an id invalidates its entry; a foreign write misses through the
     * revision guard.
     */
    private readonly coldLogMemo;
    /** One joinable decode/migration operation per selected historical Session file revision. */
    private readonly migrationPreparations;
    constructor(ctx: Context, config: Config);
    /**
     * Refusal-diagnostics hook: the absolute target path, without touching the filesystem.
     * @param meta - the stored header naming the session and its cwd.
     * @returns the artifact kind and absolute path.
     */
    private locate;
    /**
     * Create a new stored session and take its write ownership. The session is
     * visible to this process immediately; the physical artifact appears on the
     * first append or flush.
     * @param header - the immutable header to store; must be losslessly
     *   JSON-serializable with a non-negative safe-integer `createdAt`.
     * @param options - optional cancellation.
     * @returns the owned write handle.
     */
    create(header: SessionHeader, options?: SessionPersistenceCreateOptions): Promise<SessionHandle>;
    /**
     * Open an existing stored session for `read` or single-writer `write`.
     * @param id - the stored session to open.
     * @param access - `read` (no ownership) or `write` (atomic in-process claim).
     * @param options - optional cancellation.
     * @returns the open handle.
     */
    open(id: SessionId, access: SessionAccess, options?: SessionPersistenceOpenOptions): Promise<SessionHandle>;
    /**
     * Flush every active write handle in one durability barrier; see the seam
     * contract.
     * @returns resolution once every write handle active at the call has flushed.
     */
    flush(): Promise<void>;
    /**
     * Observe one stored session without reading its event log.
     * @param id - the stored session to observe.
     * @param options - optional cancellation.
     * @returns the snapshot (`sizeBytes` carries the physical artifact size), or
     *   `undefined` when the session does not exist.
     */
    stat(id: SessionId, options?: SessionPersistenceStatOptions): Promise<SessionPersistenceSnapshot | undefined>;
    /**
     * List every stored session visible to this process: materialized artifacts
     * plus this process's created-but-unmaterialized sessions.
     * @param options - optional cancellation.
     * @returns one snapshot per session, in no promised order.
     */
    list(options?: SessionPersistenceListOptions): Promise<readonly SessionPersistenceSnapshot[]>;
    /** Resolve and read one stored log, refusing loudly when the artifact is absent. */
    private requireStoredLog;
    /** Probe the memo and otherwise decode one historical generation under backend cancellation. */
    private loadStoredMigration;
    /** Await shared preparation for one caller and abort it only after its last waiter leaves. */
    private waitForPreparation;
    /** Decode one historical generation without publishing a successor. */
    private prepareStoredMigration;
    /** Publish a prepared historical log before granting write access. */
    private publishStoredMigration;
    /** Translate generation-layer failures into the persistence seam's error vocabulary. */
    private generationFailure;
    /**
     * Read, parse, and validate one stored log as the current logical prefix.
     * @param path - the artifact file to read.
     * @param expectedId - the session identity the artifact must carry.
     * @param signal - optional cancellation for the stat/read/decode work.
     * @returns the validated stored log with any torn-tail truncation point.
     */
    readStoredLog(path: string, expectedId: SessionId, signal?: AbortSignal): Promise<CurrentStoredLog>;
    /** Decode and memoize one already-stable current physical snapshot. */
    private decodeStoredLog;
    /** Insert one parsed log into the bounded handoff cache. */
    private memoizeStoredLog;
    /**
     * Resolve a session's current-generation log path.
     * @param id - the stored session to locate.
     * @param signal - optional cancellation for the directory scans.
     * @returns the current artifact path, or `undefined` while only a historical generation exists.
     */
    resolveCurrentLog(id: SessionId, signal?: AbortSignal): Promise<string | undefined>;
    /**
     * Durably append one validated batch; lazily materializes on the first write.
     * @param header - the session's stored header.
     * @param events - the validated contiguous batch, in seq order.
     * @param isMaterialized - whether the session already has a durable artifact.
     * @param inheritedEventCount - the exact fork-inherited prefix length written into a materializing header line.
     */
    persistBatch(header: SessionHeader, events: readonly SessionEvent[], isMaterialized: boolean, inheritedEventCount: SessionLogOffsetType): Promise<void>;
    /**
     * Materialize a header-only artifact for an explicitly durable empty session.
     * @param header - the session's stored header.
     * @param inheritedEventCount - the exact fork-inherited prefix length written into the header line.
     */
    persistHeader(header: SessionHeader, inheritedEventCount: SessionLogOffsetType): Promise<void>;
    /**
     * Truncate a torn physical tail durably before this session's first new append.
     * @param header - the session's stored header.
     * @param truncateTo - the byte offset the artifact is truncated to.
     */
    truncateTornTail(header: SessionHeader, truncateTo: number): Promise<void>;
    /**
     * Whether this process still tracks a created-but-unmaterialized session.
     * @param id - the session to test.
     * @returns true while the pending entry exists.
     */
    hasPendingSession(id: SessionId): boolean;
    /**
     * Release one handle's backend bookkeeping on close.
     * @param handle - the closing handle.
     * @param materialized - whether the session reached durable storage.
     */
    releaseHandle(handle: JsonlSessionHandle, materialized: boolean): void;
    /**
     * Acquire the session directory's kernel write lock; the kernel holds it
     * until the handle's close releases the descriptor, including on process death.
     * @param id - the session the lock guards.
     * @param cwd - header cwd used to derive the directory for a fresh session.
     * @param dir - the resolved directory of an existing artifact, when known.
     * @returns the held lock.
     */
    private acquireLease;
    /**
     * Acquire the cross-process write lock for a materializing created session,
     * called by its handle immediately before the first log bytes publish.
     * @param header - the session's stored header (its cwd derives the directory).
     * @returns the held lock.
     */
    acquireWriteLease(header: SessionHeader): Promise<SessionWriteLease>;
    /** Decode complete frames and retain complete JSONL records from a torn final frame. */
    private readZstdPrefix;
    private listArtifacts;
    /** Read and translate one selected generation header without inspecting its body. */
    private readGenerationHeader;
    /** Convert format-catalog string identities to current branded Session metadata. */
    private currentHeader;
    /** Atomically write the header line + first batch (temp-write, fsync, publish). */
    private materialize;
    private materializePosix;
    private materializeWin32;
    private rejectExistingLog;
    private writeSyncedTempFile;
    /** Encode the header and first batch without combining their frame boundaries. */
    private encodeMaterialization;
    /** Encode one durable append batch in the configured physical representation. */
    private encodeEventBatch;
    /** fsync a POSIX directory so a just-created/renamed entry is crash-durable. */
    private syncDirPosix;
    /**
     * Append and fsync event lines. On a partial write or sync failure, restore the
     * previous size before rethrowing because the unchanged cursor will retry the
     * batch; leaving partial bytes would create duplicate sequence numbers.
     */
    private appendLines;
    private rollbackAppend;
    /** Truncate the log file to `offset` bytes and fsync (discard the crash tail). */
    private repair;
    /**
     * Read the first newline-terminated line of a file without loading the whole
     * file. Returns undefined if the file is empty or has no complete first line.
     * Reads in bounded chunks so a huge log costs only the header read.
     */
    private readFirstLine;
    /** Read and validate only the independently compressed header frame. */
    private readFirstZstdLine;
    /** Select the numerically highest canonical generation in one Session directory. */
    private resolveGenerationInDirectory;
    /** Find the unique authoritative generation for an id across project directories. */
    private findLog;
    /** Require an existing configured root to be a readable directory. */
    private assertUsableRoot;
    /** Reject metadata that does not identify the selected physical log. */
    private assertStoredIdentity;
    /** Validate a supported historical header against the selected source path. */
    private validateSourceIdentity;
    /**
     * Whether two path spellings resolve to the same physical file. This admits
     * case aliases on case-insensitive filesystems without weakening identity
     * checks on case-sensitive stores.
     */
    private sameFile;
    /** The human-readable project directories under the configured root. */
    private listProjectDirs;
    /** List session-owned directories and reject the obsolete flat-file layout. */
    private listSessionDirs;
    /** Reject a root that already belongs to the other physical encoding. */
    private ensureRootEncoding;
    private checkRootEncoding;
    private rejectLegacyFlatArtifact;
    private rejectOppositeArtifact;
    /** Return the highest canonical generation encoded with the other configured suffix. */
    private findOppositeGenerationInDirectory;
    private oppositeCompression;
    private encodingMismatch;
    private legacyLayout;
    private exists;
    private assertLogParentAllowsAbsence;
}
/**
 * One open channel onto a JSONL-stored session: the shared storage-handle
 * scaffolding over this backend's file primitives. Reads re-scan the artifact
 * under the stable-read loop.
 */
export default JsonlSessionPersistence;
//# sourceMappingURL=index.d.ts.map