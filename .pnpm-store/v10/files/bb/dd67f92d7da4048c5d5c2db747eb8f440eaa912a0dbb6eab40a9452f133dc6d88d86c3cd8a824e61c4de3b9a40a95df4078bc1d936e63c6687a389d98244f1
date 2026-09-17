/**
 * Cordis-free storage mechanics for the local spill backend: private
 * session-scoped directory selection, safe-name derivation, path-traversal
 * protection, and the exclusive owner-only write.
 *
 * @module @deepseek-ai/dsh-spill-local/store
 */
/** Prefix shared by default-root creation and startup discovery. */
export declare const DEFAULT_ROOT_PREFIX = "dsh-spill-";
/**
 * Test a caught value for a Node system error code.
 *
 * @param error The caught value.
 * @param code The expected system error code.
 * @returns Whether the code matches.
 */
export declare function isErrno(error: unknown, code: string): boolean;
/**
 * Return the lazily-created private per-process spill root.
 *
 * @returns The private root path.
 */
export declare function privateRoot(): string;
/**
 * Encode an arbitrary string as one safe path segment, injectively over ALL JS
 * (UTF-16) strings. A session id / suggested name is untrusted input, so this
 * neutralizes `../`, absolute paths, NUL, and separators before any filesystem
 * use. Each code unit is kept literal (`[A-Za-z0-9._-]`, minus `~`) or escaped
 * as `~XXXX`; `~` is itself escaped, so the mapping is reversible and distinct
 * inputs never collide. The whole-segment tokens `.`/`..` are escaped so they
 * can never traverse. An empty string encodes to `~` (never an empty segment).
 *
 * @param raw Untrusted text.
 * @returns One injective filesystem-safe path segment.
 */
export declare function encodeSegment(raw: string): string;
/**
 * Derive the stable session-scoped directory under a spill root.
 *
 * @param root The spill root.
 * @param sessionId The owning session id.
 * @returns The stable session-scoped directory.
 */
export declare function sessionDir(root: string, sessionId: string): string;
/** Inputs needed to save a local spill file. */
export interface SaveTextOptions {
    /** Spill root. */
    root: string;
    /** Owning session id. */
    sessionId: string;
    /** Caller-suggested filename. */
    suggestedName: string;
    /** Full text to persist. */
    content: string;
}
/** A written spill file. */
export interface SavedText {
    /** Absolute saved path. */
    path: string;
    /** UTF-8 content length. */
    bytes: number;
}
/**
 * Write text to a fresh 0600 file below its private session directory.
 * @param options The save request.
 * @returns The saved path and UTF-8 byte length.
 */
export declare function saveTextFile(options: SaveTextOptions): Promise<SavedText>;
//# sourceMappingURL=store.d.ts.map