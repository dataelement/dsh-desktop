/** Session-log download command and Host-owned streaming route. */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { type SessionLogCompressionLevel } from './archive.ts';
export { DEFAULT_SESSION_LOG_COMPRESSION_LEVEL, flushLiveSessionLog, readSessionLogText, serializeSessionLog, SESSION_LOG_FILENAME, sessionLogExportDeps, sessionLogZipEntries, sessionLogZipFilename, streamSessionLogZip, } from './archive.ts';
export type { SessionLogCompressionLevel, SessionLogExportDeps, SessionLogExportReady, SessionLogZipEntry, } from './archive.ts';
export declare const name = "session-log-download";
export declare const inject: string[];
/** Stable browser download path retained across the transport migration. */
export declare const SESSION_LOG_EXPORT_PATH = "/api/session.export";
/** Session-log archive policy. */
export interface Config {
    /** DEFLATE level for each ZIP entry. @default 6 */
    readonly compressionLevel?: SessionLogCompressionLevel;
}
/** Validate Session-log archive configuration. */
export declare const Config: Schema<Config>;
/**
 * Register the Web-only `/export` command and authenticated ZIP download route.
 * @param ctx - Host context carrying the human-command registry.
 * @param config - resolved compression policy.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map