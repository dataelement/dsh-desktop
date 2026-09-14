/**
 * Event log for issue reports: what the market did and how it failed,
 * exportable as plain text from `/dsh-market/logs`.
 *
 * Privacy: entries are sanitized on write — the home directory collapses to
 * `~`, and common credential shapes (API keys, GitHub/npm tokens, bearer
 * headers) are masked. The in-memory buffer dies with the process and holds
 * at most {@link MAX_ENTRIES} entries; a process that also configures a
 * persistent sink appends every event there, capped at
 * {@link PERSISTENT_MAX_BYTES}, because the failures worth reporting most —
 * the ones that only appear after a restart — used to take their story with
 * them when the process died (#341).
 */
export type LogLevel = 'info' | 'warn' | 'error';
/**
 * Append one event, sanitized and truncated.
 * @param level - severity for the export listing.
 * @param event - short machine-ish event name (e.g. `install`, `hot-mount`).
 * @param detail - free-form context; credentials and home paths are masked.
 */
export declare function logEvent(level: LogLevel, event: string, detail: string): void;
/**
 * Append events to a profile-owned file, or stop doing so.
 *
 * Called once per mount with `<profile>/.dsh-market/log.ndjson` and with
 * `null` on dispose. An oversized file is trimmed to its newest half on
 * configure, so one long-lived profile cannot grow it without bound.
 * @param file - the sink file, or null to disable persistence.
 */
export declare function configurePersistentLog(file: string | null): void;
/**
 * The newest persisted lines, for the export's prior-session section.
 * @param file - the sink file to read.
 * @param maxLines - how many trailing lines to return.
 * @returns parsed-or-raw lines, newest last; empty when nothing is readable.
 */
export declare function readPersistentLog(file: string, maxLines?: number): string[];
/**
 * The export document for bug reports.
 * @param header - environment lines to prepend (version, platform — no paths).
 * @returns plain text, newest entry last.
 */
export declare function exportLogs(header: Record<string, string>, snapshot?: string[], priorSessions?: string[]): string;
