/**
 * Cordis-free local filesystem mechanics. This provider layer returns validated UTF-8 text,
 * streams large files, and rejects binary data; line windows belong to `dsh-tool-fs`. Writes
 * stage an exclusive owner-only file in a private sibling directory and atomically publish it.
 * @module @deepseek-ai/dsh-fs-local/fsio
 */
import type { BigIntStats } from 'node:fs';
import { FsTargetKey, FsVersion } from '@deepseek-ai/dsh-fs';
/**
 * Test hook: lets specs pin the atomic-write temp names (to prove exclusive-open behavior without
 * a name race), override native boundaries, and observe the staged temp file before publication.
 */
export interface FsIoInternals {
    /** Override the host platform for native-publication unit coverage. */
    platform?: NodeJS.Platform;
    /** Override the generated private staging-dir name (relative to the target dir). */
    tempDirName?: (writePath: string) => string;
    /** Override the generated temp-file name (relative to the private staging dir). */
    tempName?: (writePath: string) => string;
    /** Override the Win32 DACL copy boundary. */
    copyFileDacl?: (source: string, destination: string) => Promise<void>;
    /** Override the Win32 security-preserving replacement boundary. */
    replaceFile?: (replaced: string, replacement: string) => Promise<void>;
    /** Override the hard-link no-replace publication boundary. */
    linkFile?: (existingPath: string, newPath: string) => Promise<void>;
    /** Override target inspection after guarded publication fails. */
    inspectPublicationTarget?: (path: string) => Promise<BigIntStats>;
    /** Override staging-directory removal for commit-point failure coverage. */
    removeStagingDir?: (stagingDir: string) => Promise<void>;
    /** Test hook after the temp file is written/synced but before final chmod+publication. */
    inspectTemp?: (paths: {
        stagingDir: string;
        tempPath: string;
    }) => void | Promise<void>;
    /** Test hook after raw-read stat preflight and before bounded content I/O. */
    inspectReadBytesAfterStat?: (target: LocalTarget) => void | Promise<void>;
}
/** A resolved local path: the absolute path shown to callers and its realpath identity. */
export interface LocalTarget {
    /** Absolute path (symlinks not resolved) — used for display. */
    displayPath: string;
    /** Realpath identity — used as the stable target key and the I/O path. */
    targetKey: FsTargetKey;
}
/** Result of probing a path: null when it does not exist. */
export interface PathInfo {
    version: FsVersion;
    mode: number;
    type: 'file' | 'directory' | 'other';
    size: number;
}
/** Result of probing a path without following the final symlink component. */
export interface PathLinkInfo {
    version: FsVersion;
    mode: number;
    type: 'file' | 'directory' | 'symlink' | 'other';
    size: number;
}
/** One local directory child with a resolved target and cheap metadata. */
export interface LocalDirEntry {
    name: string;
    type: 'file' | 'directory' | 'other';
    target: LocalTarget;
    version?: FsVersion;
    size?: number;
}
/**
 * Resolve a path to its absolute display path and realpath identity. For a missing target,
 * realpath the nearest existing ancestor and append the missing suffix, preserving identity
 * across symlinked ancestors before and after creation.
 * @param cwd - base directory a relative `path` resolves against.
 * @param path - absolute or relative path; empty/whitespace-only throws `FS_NOT_FOUND`.
 * @returns the absolute display path plus the realpath-derived stable target key.
 */
export declare function resolveLocalTarget(cwd: string, path: string): Promise<LocalTarget>;
/**
 * Probe a path for its version, mode, type, and size. Null if absent.
 * @param absolutePath - the path to stat (typically a target key; symlinks are followed).
 * @returns the metadata, or null when the path — or a parent segment — does not exist.
 */
export declare function probe(absolutePath: string): Promise<PathInfo | null>;
/**
 * Probe a path without following the final symlink component.
 * @param absolutePath - the path entry to inspect with `lstat` semantics.
 * @returns path-entry metadata, or null when the entry is absent.
 */
export declare function probeNoFollow(absolutePath: string): Promise<PathLinkInfo | null>;
/**
 * List direct children of a directory in stable name order. Each child includes
 * a resolved target plus stat metadata when still available; file contents are
 * never read.
 * @param target - the resolved directory to list; a missing or non-directory target throws.
 * @param signal - aborts the listing, checked between children (`FS_ABORTED`).
 * @returns one entry per direct child, sorted by name.
 */
export declare function listDirectory(target: LocalTarget, signal?: AbortSignal): Promise<LocalDirEntry[]>;
/**
 * Read a whole regular UTF-8 text file into a single decoded string. Rejects
 * non-regular files, invalid UTF-8, and NUL-byte binary samples.
 * @param target - the resolved file to read.
 * @param signal - aborts the read (`FS_ABORTED`).
 * @returns the full decoded text, byte-for-byte (no normalization).
 */
export declare function readWholeText(target: LocalTarget, signal?: AbortSignal): Promise<string>;
/**
 * Read a whole regular file as raw bytes with no decoding or binary rejection.
 * `maxBytes` bounds the complete content: the stat size short-circuits an
 * oversized file before any content I/O, and the stream reads at most one byte
 * beyond the cap so a file growing after stat cannot cause unbounded buffering.
 * @param target - the resolved file to read.
 * @param signal - aborts the read (`FS_ABORTED`).
 * @param maxBytes - inclusive byte cap on the complete content (`FS_TOO_LARGE`).
 * @param internals - test seam for a deterministic post-stat growth race.
 * @returns the full raw content, at most `maxBytes` long.
 */
export declare function readWholeBytes(target: LocalTarget, signal: AbortSignal | undefined, maxBytes: number, internals?: FsIoInternals): Promise<Uint8Array>;
/**
 * Read the bytes at `[offset, offset + length)` of a regular file with no
 * decoding or binary rejection. The window is the bound: the stream opens at
 * `offset` and closes after `length` bytes, so no more than the window is ever
 * buffered whatever the file's size; a window at or past the end is empty.
 * @param target - the resolved file to read.
 * @param range - `offset`, the 0-based first byte, and `length`, the largest byte count.
 * @param signal - aborts the read (`FS_ABORTED`).
 * @returns the window's bytes, at most `length` long.
 */
export declare function readByteWindow(target: LocalTarget, range: {
    offset: number;
    length: number;
}, signal?: AbortSignal): Promise<Uint8Array>;
/**
 * Stream a whole regular UTF-8 text file as decoded text chunks. Same text
 * semantics as {@link readWholeText} (regular-file check, binary/NUL rejection,
 * cross-chunk UTF-8 decoding), but never holds the whole file in memory.
 * @param target - the resolved file to stream.
 * @param signal - aborts the stream, including between chunks (`FS_ABORTED`).
 * @returns decoded text chunks in file order; chunk boundaries carry no meaning.
 */
export declare function streamWholeText(target: LocalTarget, signal?: AbortSignal): AsyncIterable<string>;
/**
 * Atomically replace a file through a private, synced staging file in the same directory.
 * POSIX protects the staging directory and file with `0o700` and `0o600`. A new Windows file
 * inherits the destination directory's DACL; a replacement copies the existing target's DACL
 * onto the empty temp before writing and preserves the target descriptor at publication.
 * @param absolutePath - destination; missing parent directories are created.
 * @param content - the full UTF-8 text to write.
 * @param mode - existing destination's POSIX mode to preserve, or `undefined` for a new file;
 * inert as a mode on Windows but identifies replacement security semantics.
 * @param signal - cancellation checked before final publication.
 * @param internals - Test hook for pinning temp names and observing the staged file.
 * @param createIfAbsent - when provided, publish with a hard-link no-replace
 * primitive; a concurrent creator's file is preserved and this write is
 * rejected with `FS_NOT_OBSERVED` using the supplied display path.
 */
export declare function writeFileAtomic(absolutePath: string, content: string, mode: number | undefined, signal: AbortSignal | undefined, internals?: FsIoInternals, createIfAbsent?: {
    displayPath: string;
}): Promise<void>;
/** Line ending style detected before LF normalization. */
export type LineEndings = 'LF' | 'CRLF';
/**
 * Collapse CRLF to LF — the canonical in-memory form every edit/diff basis
 * uses. Lone `\r` bytes (not followed by `\n`) are left untouched.
 * @param content - decoded text in whatever line-ending style the file had.
 * @returns the text with every `\r\n` pair replaced by `\n`.
 */
declare function normalizeLineEndings(content: string): string;
/**
 * Convert LF-normalized content back to the line-ending style detected at read
 * time, for write-back. `LF` returns the content unchanged; `CRLF` re-normalizes
 * first so an already-CRLF sequence is never doubled to `\r\r\n`.
 * @param content - the LF-normalized (edited) text.
 * @param lineEndings - the original file's style, as detected by {@link readForEdit}.
 * @returns the text in the original file's line-ending style.
 */
declare function restoreLineEndings(content: string, lineEndings: LineEndings): string;
/**
 * Read and decode a file for editing: rejects binaries, returns LF-normalized
 * content plus the original line-ending style for write-back.
 * @param absolutePath - the file to read (typically a target key).
 * @param displayPath - the caller-facing path used in error messages.
 * @param signal - aborts the read (`FS_ABORTED`).
 * @returns the LF-normalized content and the detected style to restore on write-back.
 */
export declare function readForEdit(absolutePath: string, displayPath: string, signal?: AbortSignal): Promise<{
    content: string;
    lineEndings: LineEndings;
}>;
/**
 * Best-effort overwrite diff basis. Binary, invalid UTF-8, a file at/above the byte limit,
 * or a file deleted/made unreadable after the caller's preflight returns `null` so the write
 * still succeeds and presentation falls back to a whole-file diff. The bound is enforced on
 * the opened descriptor rather than a prior path stat, so concurrent external replacement or
 * size changes cannot make this helper buffer more than `maxBytes`.
 * @param absolutePath - the file to read (typically a target key).
 * @param maxBytes - exclusive upper bound for bytes held as the contextual-diff basis.
 * @param signal - aborts the read (`FS_ABORTED`); cancellation propagates, unlike I/O failure.
 * @returns the LF-normalized text, or null for a non-regular, at/above-limit, binary, non-UTF-8,
 * descriptor-size-changed, or unreadable file.
 */
export declare function readTextForDiff(absolutePath: string, maxBytes: number, signal?: AbortSignal): Promise<string | null>;
/**
 * Apply a literal replacement to LF-normalized content. Empty or missing search text throws
 * `FS_EDIT_NOT_FOUND`; multiple matches throw `FS_AMBIGUOUS_EDIT` unless `replaceAll` is true.
 * @param content - the current file content, already LF-normalized.
 * @param oldString - literal text to find; CRLF inside it is normalized to LF before
 *   matching.
 * @param newString - literal replacement text, normalized the same way.
 * @param replaceAll - replace every match instead of requiring exactly one.
 * @param displayPath - the caller-facing path used in error messages.
 * @returns the edited LF-normalized content plus how many occurrences were replaced.
 */
export declare function applyLiteralEdit(content: string, oldString: string, newString: string, replaceAll: boolean, displayPath: string): {
    content: string;
    replacements: number;
};
export { normalizeLineEndings, restoreLineEndings };
//# sourceMappingURL=fsio.d.ts.map