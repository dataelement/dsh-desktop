/** SQLite schema for the disposable session full-text read model. */
import type { DatabaseSync } from 'node:sqlite';
/** Current derived-index schema version. Incompatible versions reset in place. */
export declare const SESSION_QUERY_SQLITE_SCHEMA_VERSION = 8;
/** SQLite application id protecting unrelated databases from derived resets. */
export declare const SESSION_QUERY_SQLITE_APPLICATION_ID = 1146308689;
/** Supported SQLite journal modes. */
export type JournalMode = 'wal' | 'delete' | 'truncate' | 'persist';
/**
 * Open, validate, and initialize persistent and connection-local schemas.
 * @param path - dedicated derived-index path or `:memory:`; missing filesystem paths are created owner-only.
 * @param journalMode - validated SQLite journal mode.
 * @returns initialized database handle owned by the search service.
 */
export declare function openSearchDatabase(path: string, journalMode: JournalMode): Promise<DatabaseSync>;
//# sourceMappingURL=schema.d.ts.map