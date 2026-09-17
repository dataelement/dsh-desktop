/**
 * Content identity for workspace instruction duplicate suppression.
 *
 * @module @deepseek-ai/dsh-agent-instructions/digest
 */
/**
 * Compute the content identity used across instruction loading and session state.
 * @param content - exact UTF-8 instruction text.
 * @returns lowercase SHA-1 digest in hexadecimal form.
 */
export declare function instructionContentSha1(content: string): string;
/**
 * Compute the whitespace-insensitive identity used for per-directory duplicate
 * suppression. Leading and trailing whitespace is trimmed before hashing so a
 * symlinked or byte-copied sibling that differs only by surrounding whitespace
 * still collapses to a single rendered file.
 * @param content - exact UTF-8 instruction text.
 * @returns SHA-1 digest of the trimmed content.
 */
export declare function trimmedInstructionDigest(content: string): string;
//# sourceMappingURL=digest.d.ts.map