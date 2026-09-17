/**
 * Host-side session-log download: streams one ZIP archive whose files are the
 * sessions' logical session logs plus every referenced attachment. Each log
 * is read through a persistence read handle and serialized here as canonical
 * JSONL — one header line, then one line per validated event — so every
 * backend (JSONL, SQLite, future) exports identically. The root log uses the
 * current generation's canonical `session[.vN].jsonl` name; each subagent
 * descendant uses `subagents/<id>/session[.vN].jsonl`; each image referenced by any included log
 * under `media/<attachmentId>.<ext>` (content-addressed, so one archive never
 * duplicates a shared image); each generic file sits under
 * `files/<prefix>/<digest>/<name>` and streams from the attachment store. No
 * manifest is written. Before each live session's log read, the SessionStore
 * flush barrier makes the current in-memory log durable; cold sessions need no
 * barrier. Request abort and response-consumer cancellation share one producer
 * signal and terminate the active compressor.
 * Compression runs on the host with fflate's streaming Zip API, so the archive
 * bytes are produced incrementally and the host never holds the whole archive
 * in one buffer; production waits for consumer pull whenever the response queue
 * reaches its byte high-water mark, so a slow consumer bounds accumulation to
 * the fixed 64 KiB response queue plus one synchronous fflate push.
 * @module
 */
import type { Context } from '@deepseek-ai/cordis';
import type { AttachmentStore } from '@deepseek-ai/dsh-attachment';
import type { SessionQueryEngine } from '@deepseek-ai/dsh-session-query';
import type { SessionEvent, SessionHeader, SessionId, SessionStore } from '@deepseek-ai/dsh-session';
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence';
/** Valid fflate DEFLATE levels accepted by session-log export. */
export type SessionLogCompressionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
/** Balanced default used when Session export configuration omits a compression level. */
export declare const DEFAULT_SESSION_LOG_COMPRESSION_LEVEL: SessionLogCompressionLevel;
/** The services a session-log export needs (the live-session store is optional). */
export interface SessionLogExportDeps {
    readonly sessionQuery: SessionQueryEngine | undefined;
    readonly sessionPersistence: SessionPersistence | undefined;
    readonly attachments: AttachmentStore | undefined;
    readonly sessions: SessionStore | undefined;
}
/** The export services narrowed to the mounted ones streaming actually reads. */
export interface SessionLogExportReady {
    readonly sessionQuery: SessionQueryEngine;
    readonly sessionPersistence: SessionPersistence;
    readonly attachments: AttachmentStore;
    readonly sessions: SessionStore | undefined;
}
/**
 * Resolve the persistence, session-query, and attachment services a log export needs.
 * @param ctx - the composed host context.
 * @returns the export services (absent when the deployment does not mount them).
 */
export declare function sessionLogExportDeps(ctx: Context): SessionLogExportDeps;
/**
 * Flush one currently live session through the store's authoritative durability
 * barrier immediately before its logical log is read. A cold or absent id has
 * no in-memory work to flush.
 * @param deps - export services, including the optional live-session store.
 * @param id - the session whose artifact is about to be read.
 * @param signal - optional cancellation observed around the flush barrier.
 */
export declare function flushLiveSessionLog(deps: Pick<SessionLogExportDeps, 'sessions'>, id: SessionId, signal?: AbortSignal): Promise<void>;
/** One exported file: a serialized session log or one referenced attachment object. */
export type SessionLogZipEntry = {
    readonly path: string;
    readonly content: string;
} | {
    readonly path: string;
    readonly data: Uint8Array;
} | {
    readonly path: string;
    readonly chunks: AsyncIterable<Uint8Array>;
};
/** The current generation's canonical base filename for every exported session log. */
export declare const SESSION_LOG_FILENAME: string;
/**
 * Serialize one session's logical log as canonical JSONL text: the header
 * line, then one line per event, with a trailing newline.
 * @param header - the session's immutable header.
 * @param events - the validated committed events in seq order.
 * @returns the JSONL text.
 */
export declare function serializeSessionLog(header: SessionHeader, events: readonly SessionEvent[]): string;
/**
 * Read one session's complete logical log through a read handle and serialize
 * it. The read observes the committed log only — persistence never returns a
 * torn tail — and a handle read after a resolved flush observes at least the
 * flushed prefix.
 * @param persistence - the mounted persistence backend.
 * @param id - the session to read.
 * @param signal - optional cancellation forwarded to the open and read.
 * @returns the serialized JSONL text, or `undefined` when the session does not exist.
 */
export declare function readSessionLogText(persistence: SessionPersistence, id: SessionId, signal?: AbortSignal): Promise<string | undefined>;
/**
 * The export archive filename for one root session.
 * @param sessionId - the root session id (sanitized to one safe path segment).
 * @returns the attachment filename for the session's export archive.
 */
export declare function sessionLogZipFilename(sessionId: string): string;
/**
 * Yield the export entries in zip order: the preloaded root log first, then
 * every subagent descendant in lineage order (each flushed when live, read
 * through a persistence read handle right before it is yielded, and dropped
 * after the consumer moves on), then every distinct attachment referenced by
 * the included logs. Images are read and verified as bounded stored objects;
 * generic files remain streamed through the ZIP writer. The host holds at most
 * one descendant log, one image, and one file chunk beyond the root.
 * @param deps - the mounted export services (the caller answered 500 before this runs).
 * @param rootContent - the already-serialized root log (read by the caller so
 * the missing-session path can answer cleanly before streaming starts).
 * @param sessionId - the root session id.
 * @param includeDescendants - whether to include every subagent descendant.
 * @param signal - optional cancellation forwarded to lineage, persistence, and attachment reads.
 * @returns the export entries in zip order.
 */
export declare function sessionLogZipEntries(deps: SessionLogExportReady, rootContent: string, sessionId: SessionId, includeDescendants: boolean, signal?: AbortSignal): AsyncGenerator<SessionLogZipEntry>;
/**
 * Stream one session-log ZIP as a WHATWG ReadableStream. The root log is read
 * and serialized by the caller before this is called (a missing root or
 * missing services answer cleanly before any byte is produced); each entry is
 * then encoded and deflated in bounded chunks as it is produced, so the
 * archive bytes arrive incrementally. A descendant that fails to read errors
 * the stream (fail-loud, never silent under-export).
 * @param deps - the mounted export services (the caller answered 500 before this runs).
 * @param rootContent - the already-serialized root log (first zip entry).
 * @param sessionId - the root session id.
 * @param includeDescendants - whether to include every subagent descendant.
 * @param compressionLevel - validated fflate DEFLATE level for every ZIP entry.
 * @param signal - request cancellation combined with response-consumer cancellation.
 * @returns the zip byte stream.
 */
export declare function streamSessionLogZip(deps: SessionLogExportReady, rootContent: string, sessionId: SessionId, includeDescendants: boolean, compressionLevel: SessionLogCompressionLevel, signal: AbortSignal): ReadableStream<Uint8Array>;
//# sourceMappingURL=archive.d.ts.map