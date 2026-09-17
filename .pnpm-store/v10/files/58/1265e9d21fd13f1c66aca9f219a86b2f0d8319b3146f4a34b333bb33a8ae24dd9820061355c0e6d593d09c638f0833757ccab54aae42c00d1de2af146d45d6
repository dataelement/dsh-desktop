/**
 * Pure read presentation: turn provider-decoded text into a bounded, line-numbered window and
 * model-facing envelope. Chunk scanning caps the current line, so even one newline-free giant
 * line cannot grow memory without bound.
 * @module @deepseek-ai/dsh-tool-fs/read-render
 */
/** Default maximum characters returned for a single line (the `readMaxLineLength` config). */
export declare const READ_MAX_LINE_LENGTH = 2000;
/** Default maximum bytes returned for selected file lines (the `readMaxBytes` config). */
export declare const READ_MAX_BYTES: number;
/** Resolved read window. The consumer applies its defaults/caps before calling. */
export interface ReadWindow {
    /** 1-based first line to return. */
    offset: number;
    /** Maximum number of lines to return. */
    limit: number;
    /** Maximum characters returned for a single line; overflow is truncated with a suffix. */
    maxLineLength: number;
    /** Maximum bytes of selected output; overflow stops the scan and marks `truncatedByBytes`. */
    maxBytes: number;
}
/** One line returned from a text file. */
export interface FileTextLine {
    /** 1-based line number in the file. */
    number: number;
    /** Line text without its trailing newline. */
    text: string;
}
/** The windowed result {@link buildWindow} produces from a file's decoded text. */
export interface WindowResult {
    /** Returned lines, already numbered. */
    lines: FileTextLine[];
    /** Exact total line count in the file. */
    totalLines: number;
    /** Whether selected output hit the byte cap. */
    truncatedByBytes: boolean;
}
/** Outcome of a bounded text read — what {@link formatReadOutput} renders. */
export interface FileReadOutcome {
    /** 1-based first line requested. */
    offset: number;
    /** Returned lines, already numbered. */
    lines: FileTextLine[];
    /** Exact total line count in the file. */
    totalLines: number;
    /** Whether selected output hit the byte cap. */
    truncatedByBytes?: true;
}
/**
 * Build one window from streamed or whole-file chunks, enforcing line and byte caps while still
 * scanning to an exact total line count, and throwing `FS_NOT_FOUND` when the requested offset is
 * past EOF.
 * @param chunks - decoded text chunks in file order; chunk boundaries carry no meaning.
 * @param request - the resolved window; the caller has already applied its defaults and caps.
 * @param displayPath - the caller-facing path used in the offset-out-of-range error.
 * @returns the numbered window lines, the total line count seen, and the byte-cap truncation flag.
 */
export declare function buildWindow(chunks: AsyncIterable<string> | Iterable<string>, request: ReadWindow, displayPath: string): Promise<WindowResult>;
/**
 * Format a read outcome as one OpenCode-style line-numbered text block body.
 * @param displayPath - the backend-resolved path rendered in the envelope's `<path>` element.
 * @param outcome - the windowed read to render.
 * @returns the model-facing envelope: numbered lines plus a continuation or end-of-file footer.
 */
export declare function formatReadOutput(displayPath: string, outcome: FileReadOutcome): string;
/**
 * Derive a syntax-highlighting language hint from a read path's file extension.
 * Pure and case-insensitive on the extension; a dotfile with no extension
 * (`.gitignore`) and an unknown extension both yield `undefined`.
 * @param path - the model-facing path the read reported.
 * @returns the language hint for {@link LANG_BY_EXTENSION}, or `undefined` when the extension maps to none.
 */
export declare function langFromPath(path: string): string | undefined;
/**
 * The `read` tool's private `tool/result` `meta` payload: the structured
 * line-numbered window a capable UI renders as a code view. Attached opaquely (as
 * `unknown`) on the tool result and persisted with the session log — it must be
 * JSON-serializable (the session validates this at `append`), so `presentResult`
 * reproduces the read card on replay when the raw structured output is no longer
 * on the wire. The producing tool owns and narrows this opaque shape.
 */
export interface FsReadMeta {
    /** The read file's model-facing path. */
    path: string;
    /** The 1-based first line the window requested, kept even when `lines` is empty. */
    offset: number;
    /** The returned window's lines, each keeping its file line number. */
    lines: FileTextLine[];
    /** Exact total line count in the file. */
    totalLines: number;
    /** Syntax-highlighting language hint from the extension, or omitted for plain text. */
    lang?: string;
}
/**
 * Narrow opaque live or replayed result metadata to a structured read window.
 * Malformed metadata returns `undefined` so presentation can fall back to the
 * generic text card instead of throwing during replay. Beyond shape, the
 * semantic contract of a read window is enforced against replayed JSON that is
 * well-typed but out of range: `offset` must be a 1-based integer, `totalLines`
 * must be a non-negative integer, each line number must be a 1-based integer no
 * less than `offset`, the line numbers must strictly increase, and no line number
 * may exceed `totalLines`. Any violation declines to the generic fallback rather
 * than emitting a card that misnumbers or overcounts.
 * @param meta - result metadata.
 * @returns the validated read window, or `undefined` for absent, malformed, or semantically invalid data.
 */
export declare function readMetaFromMeta(meta: unknown): FsReadMeta | undefined;
//# sourceMappingURL=read-render.d.ts.map