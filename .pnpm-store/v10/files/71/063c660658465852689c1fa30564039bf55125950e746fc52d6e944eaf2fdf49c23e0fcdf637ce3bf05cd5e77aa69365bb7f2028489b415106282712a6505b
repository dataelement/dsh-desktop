/**
 * Browser-safe `@file` token grammar shared by terminal and web clients.
 *
 * @module @deepseek-ai/dsh-file-reference/grammar
 */
import type { FileReferenceCandidate } from './types.ts';
/** Active `@` token ending at the editor cursor. */
export interface ActiveAtToken {
    /** Complete token replaced when the user accepts a completion. */
    prefix: string;
    /** Path query after `@` or `@"`. */
    query: string;
    /** Whether the user opened a quoted path. */
    quoted: boolean;
}
/**
 * Extract an `@path` or `@"path with spaces` token at the cursor. An `@`
 * inside another token, such as an email address, is not a completion trigger.
 * @param line - current editor line.
 * @param cursorCol - cursor column within that line.
 * @returns the active token, or `undefined` outside an `@` token.
 */
export declare function activeAtToken(line: string, cursorCol: number): ActiveAtToken | undefined;
/**
 * Format a selected path as prompt text. Whitespace uses the quoted
 * `@"path"` grammar; a quoted directory keeps that quote open after its
 * trailing slash so completion can descend another level.
 * @param candidate - selected file or directory.
 * @param preserveQuote - retain an explicitly opened quote even when unnecessary.
 * @returns the insertion value, or `undefined` for a path the editor grammar cannot represent safely.
 */
export declare function formatFileMention(candidate: FileReferenceCandidate, preserveQuote: boolean): string | undefined;
//# sourceMappingURL=grammar.d.ts.map