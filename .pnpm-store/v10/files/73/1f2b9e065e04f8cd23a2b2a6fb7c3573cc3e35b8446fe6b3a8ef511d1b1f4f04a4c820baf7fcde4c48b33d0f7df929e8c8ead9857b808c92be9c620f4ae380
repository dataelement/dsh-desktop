/**
 * Concrete session-query service with SQLite FTS5 over the live-preferred corpus.
 *
 * @module @deepseek-ai/dsh-session-query-sqlite
 */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import SessionQueryEngine from '@deepseek-ai/dsh-session-query';
import type { Config as SessionQueryConfig, SessionEventSearchPage, SessionEventSearchRequest, SessionSearchExecContext, SessionSearchHit, SessionSearchPage, SessionSearchRequest } from '@deepseek-ai/dsh-session-query';
import { type JournalMode } from './schema.ts';
export { SESSION_QUERY_SQLITE_APPLICATION_ID, SESSION_QUERY_SQLITE_SCHEMA_VERSION, type JournalMode, } from './schema.ts';
/** Boot-context slot for a launcher-owned absolute path to this process's derived query index. */
export declare const SESSION_QUERY_SQLITE_PATH_KEY = "launcherSessionQueryPath";
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Launcher-owned absolute path to this process's disposable derived query index. */
        launcherSessionQueryPath?: string;
    }
}
/** Default result page size. */
export declare const SESSION_QUERY_SQLITE_DEFAULT_LIMIT = 20;
/** Maximum accepted result page size. */
export declare const SESSION_QUERY_SQLITE_MAX_LIMIT = 100;
/** Default maximum snippet length in Unicode code points. */
export declare const SESSION_QUERY_SQLITE_SNIPPET_CHARS = 240;
/** SQLite module/handle opening phase; `never` disables full-text search entirely. */
export type OpenAt = 'startup' | 'first-search' | 'never';
/** Combined session-query configuration backed by SQLite full-text search. */
export interface Config extends SessionQueryConfig {
    /**
     * Dedicated derived-index path; `:memory:` is supported for ephemeral
     * indexes. Missing directories and database files are created owner-only on
     * POSIX filesystems; existing modes are preserved.
     */
    path: string;
    /**
     * Open the SQLite module and handle at service activation or the first
     * search, or `never` to disable full-text search: the inherited exact
     * reads, filters, and traces stay available, while `searchSessions` and
     * `searchEvents` fail with `SESSION_QUERY_SEARCH_DISABLED` and SQLite is
     * never imported or opened. Defaults to `startup`.
     */
    openAt?: OpenAt;
    /** SQLite journal mode. Defaults to `wal`. */
    journalMode?: JournalMode;
    /** Page size when a request omits `limit`. At most `Number.MAX_SAFE_INTEGER - 1`; defaults to 20. */
    defaultLimit?: number;
    /** Largest accepted page size. At most `Number.MAX_SAFE_INTEGER - 1`; defaults to 100. */
    maxLimit?: number;
    /** Maximum snippet length in Unicode code points. Defaults to 240. */
    snippetChars?: number;
    /** Maximum concurrent persisted-log reads in one inherited batch read. Defaults to 4. */
    persistedReadConcurrency?: number;
    /** Maximum cold prepared-Session observations the inherited reader retains for reuse. Defaults to 5. */
    preparedSessionCacheSize?: number;
}
interface ResolvedConfig {
    path: string;
    openAt: OpenAt;
    journalMode: JournalMode;
    defaultLimit: number;
    maxLimit: number;
    snippetChars: number;
    readWindowMax: number;
    persistedReadConcurrency: number;
    preparedSessionCacheSize: number;
}
/** Concrete SQLite owner of the combined `ctx.sessionQuery` service. */
export declare class SqliteSessionQueryEngine extends SessionQueryEngine {
    static inject: string[];
    static Config: z<Config>;
    /** Validated and defaulted backend configuration. */
    readonly config: ResolvedConfig;
    private readonly _instance;
    private _ready;
    private _db;
    private _persistenceBinding;
    private _lastPersistenceIdentity;
    private _persistenceEpoch;
    private _globalGeneration;
    private _localGeneration;
    private _tail;
    private _closed;
    private _closePromise;
    private readonly _optionalPersistenceFiber;
    constructor(ctx: Context, config: Config);
    /** Open eagerly only when activation owns the configured readiness boundary. */
    protected [Service.init](): Promise<void>;
    searchSessions(request: SessionSearchRequest, exec?: SessionSearchExecContext): Promise<SessionSearchPage<SessionSearchHit>>;
    searchEvents(request: SessionEventSearchRequest, exec?: SessionSearchExecContext): Promise<SessionEventSearchPage>;
    /** Close the database after every accepted operation reaches quiescence. */
    close(): Promise<void>;
    /**
     * Refuse full-text calls under `openAt: 'never'` before any request
     * normalization or SQLite work, so a disabled deployment never imports
     * node:sqlite, opens the index, or observes sources.
     */
    private _assertSearchEnabled;
    private _close;
    private _open;
    private _ensureReady;
    private _serialized;
    private _reconcile;
    private _observeStable;
    private _mainGeneration;
    private _deleteSession;
    private _replacePersistedSession;
    private _replaceLiveSession;
    private _querySessions;
    private _queryEvents;
    private _targetObservation;
    private _sessionHit;
    private _eventHit;
    private _requireDb;
    private _isClosed;
}
export default SqliteSessionQueryEngine;
//# sourceMappingURL=index.d.ts.map