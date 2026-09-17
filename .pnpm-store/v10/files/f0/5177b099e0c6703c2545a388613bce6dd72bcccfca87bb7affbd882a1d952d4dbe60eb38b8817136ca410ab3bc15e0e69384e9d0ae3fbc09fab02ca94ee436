/**
 * On-disk format helpers for the JSONL session-persistence backend: path
 * sanitization (a {@link SessionId} is an unvalidated branded string, so it
 * MUST be encoded before use in a path — no traversal, no collision), the
 * per-project/session directory layout, header-line (de)serialization, and the
 * truncation-repair offset computation.
 *
 * @module dsh-session-persistence-jsonl/format
 */
import type { SessionEvent, SessionHeader, SessionId, SessionLogOffset as SessionLogOffsetType } from '@deepseek-ai/dsh-session';
import type { SessionFormatRecovery } from '@deepseek-ai/dsh-session-format';
/** Physical encoding selected for JSONL session artifacts. */
export type JsonlCompression = 'zstd' | 'none';
/**
 * Return the artifact suffix for one physical encoding.
 * @param compression - configured JSONL artifact encoding.
 * @returns `.jsonl.zstd` for Zstandard or `.jsonl` for plaintext.
 */
export declare function logSuffix(compression: JsonlCompression): '.jsonl.zstd' | '.jsonl';
/**
 * Return the canonical filename for one immutable Session format generation.
 * Version zero retains the original suffix-only name; every later generation
 * carries a lowercase numeric `vN` component.
 * @param version - non-negative safe Session format version.
 * @param compression - configured JSONL artifact encoding.
 * @returns the generation filename inside one Session directory.
 */
export declare function generationLogFilename(version: number, compression: JsonlCompression): string;
/**
 * Parse one canonical generation filename for the selected physical encoding.
 * Noncanonical, temporary, uppercase, leading-zero, and version-zero-tagged names do
 * not identify committed generations.
 * @param filename - one entry from a Session directory.
 * @param compression - configured JSONL artifact encoding.
 * @returns its format version, or `undefined` when the name is not canonical.
 */
export declare function parseGenerationLogFilename(filename: string, compression: JsonlCompression): number | undefined;
/**
 * The current physical header stored as the first JSONL record. The exact
 * inherited cut lives on the last tagged `session/end-seed` event.
 */
interface HeaderLine {
    type: 'session';
    version: number;
    id: SessionId;
    createdAt: number;
    cwd?: string;
    parentSession?: SessionId;
    isSeeded: boolean;
    origin?: 'subagent';
    delegationDepth: number;
    agentPreset?: string;
}
/**
 * Refuse policy fields that never belong to a released Session header.
 * @param value - parsed physical header candidate.
 * @returns nothing after successful validation.
 */
export declare function assertNoRetiredHeaderFields(value: unknown): void;
/**
 * Build the header line object from a {@link SessionHeader}.
 * @param header - the immutable session metadata to serialize.
 * @param inheritedEventCount - exact inherited prefix length; required for a
 * seeded header and omitted only for an unseeded header.
 * @returns the `type: 'session'`-tagged line object, absent optional fields omitted (never null).
 */
export declare function toHeaderLine(header: SessionHeader, inheritedEventCount?: SessionLogOffsetType): HeaderLine;
/**
 * Encode an arbitrary string as a single safe path segment, injectively over ALL JS (UTF-16)
 * strings — including lone surrogates. A {@link SessionId} is an unvalidated branded string,
 * so this neutralizes `../`, absolute paths, NUL, and separators before any filesystem use.
 * Safe code units remain literal; every other unit, including `~`, becomes
 * `~XXXX`. Operating on code units preserves lone surrogates, while special-
 * casing `.` and `..` prevents traversal by an otherwise safe whole segment.
 *
 * @param raw - the string to encode; must be non-empty (throws on `''`).
 * @returns the escaped single path segment, decodable back to `raw`.
 */
export declare function encodeSegment(raw: string): string;
/**
 * Build the readable directory key for a project path.
 * Filesystem separators and drive separators become `-`; unsafe code units use
 * the same `~XXXX` escape as session ids. The key is bounded for filesystem
 * component limits. Separator replacement and truncation are intentionally
 * lossy, following the common human-navigable project-directory convention.
 * @param cwd - the session's project directory.
 * @returns a single filesystem-safe project directory name.
 */
export declare function projectKey(cwd: string): string;
/**
 * The configured root's human-navigable project directory. A configured root
 * may be local or shared; this grouping does not prescribe its deployment.
 * @param root - the backend's session root directory.
 * @param cwd - the session's project directory; `undefined` selects `_no-cwd`.
 * @returns the project directory path under `root`.
 */
export declare function projectDir(root: string, cwd: string | undefined): string;
/**
 * The directory owned by one session and available for future session-local
 * artifacts.
 * @param root - the backend's session root directory.
 * @param cwd - the session's project directory.
 * @param id - the session id, encoded to one safe path segment.
 * @returns the session directory beneath its project directory.
 */
export declare function sessionDir(root: string, cwd: string | undefined, id: SessionId): string;
/**
 * Build one immutable Session format generation path.
 * @param root - the backend's session root directory.
 * @param cwd - the session's project directory (`undefined` → `_no-cwd`).
 * @param id - the session id, path-encoded via {@link encodeSegment} before filesystem use.
 * @param version - physical Session format generation.
 * @param compression - physical artifact encoding and filename suffix.
 * @returns the selected generation's configured JSONL artifact path.
 */
export declare function generationLogPath(root: string, cwd: string | undefined, id: SessionId, version: number, compression: JsonlCompression): string;
/**
 * Build the current generation's append target path for a Session.
 * @param root - the backend's session root directory.
 * @param cwd - the session's project directory (`undefined` → `_no-cwd`).
 * @param id - the session id, path-encoded via {@link encodeSegment} before filesystem use.
 * @param compression - physical artifact encoding and filename suffix.
 * @returns the current Session format generation path.
 */
export declare function logPath(root: string, cwd: string | undefined, id: SessionId, compression: JsonlCompression): string;
/**
 * Serialize a current event batch as JSONL lines (no trailing newline). Compact
 * Assistant streams are nested event data; every event occupies one row.
 * @param events - the batch to serialize, in log order.
 * @returns the batch's JSONL text; the writer adds the final newline.
 */
export declare function eventLines(events: readonly SessionEvent[]): string;
/**
 * Serialize one current event as one JSONL record without its trailing newline.
 * @param event - current event to encode.
 * @returns one physical JSON record.
 */
export declare function eventLine(event: SessionEvent): string;
interface SessionLogScan {
    meta: SessionHeader;
    inheritedEventCount: SessionLogOffsetType;
    events: SessionEvent[];
    committedBytes: number;
}
/**
 * Incrementally scan complete JSONL event records after an independently
 * supplied header record. Newline search and byte offsets stay on raw buffers;
 * only complete records are decoded to UTF-8. A fragment crossing writes is
 * copied because a decoder may reuse its output buffer after `write()` returns.
 */
export declare class SessionLogScanner {
    private readonly recovery;
    private readonly meta;
    private readonly restore;
    private eventCount;
    private fragments;
    private fragmentBytes;
    private inputBytes;
    private committedBytes;
    private eventLine;
    private issue;
    private finished;
    /**
     * Create an event scanner from exactly one newline-terminated header record.
     * @param headerRecord - the complete first JSONL record, including its newline.
     */
    constructor(headerRecord: Buffer, recovery?: SessionFormatRecovery);
    /**
     * Consume the next raw plaintext chunk, retaining only an incomplete final record.
     * @param chunk - bytes immediately following all previously supplied bytes.
     */
    write(chunk: Buffer): void;
    /**
     * Snapshot progress before appending a recoverable torn-frame prefix.
     * @returns byte, committed-prefix, and expanded-event cursors.
     */
    checkpoint(): {
        inputBytes: number;
        committedBytes: number;
        eventCount: SessionLogOffsetType;
    };
    /**
     * Finish scanning, ignoring a final record without a newline as a torn tail.
     * @returns the header, contiguous event prefix, and safe truncation offset.
     */
    finish(): SessionLogScan;
    /** Decode one complete event row and update the contiguous prefix. */
    private consumeEventLine;
}
/**
 * Parse a complete or torn JSONL buffer into its preserved event prefix. This
 * compatibility wrapper supplies the first record separately, then delegates
 * event rows to {@link SessionLogScanner}.
 *
 * @param buffer - the raw bytes of the log file (header line first).
 * @returns the header, preserved event prefix, and byte offset safe to append at.
 */
export declare function scanLog(buffer: Buffer): SessionLogScan;
export {};
//# sourceMappingURL=format.d.ts.map