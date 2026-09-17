/**
 * Path-containment mechanics for the filesystem sandbox. Canonical spellings
 * take the fast lexical path; filesystem identity supplies the conservative
 * fallback for alias-equivalent roots such as Windows 8.3 names and casing.
 * @module @deepseek-ai/dsh-fs-sandbox/containment
 */
/**
 * Determine whether a canonical target is a writable root or lies beneath it.
 * The lexical fast path handles normal canonical spellings. When spellings
 * differ, walk the target's existing ancestors and compare filesystem identity
 * with the root; this recognizes Windows long-name/8.3 aliases and casing
 * without weakening containment to a textual approximation.
 * @param path - canonical target key, which may end in a missing suffix.
 * @param root - canonical writable root.
 * @param caseSensitive - whether lexical comparison preserves case; defaults
 *   to the host filesystem convention used by supported platforms.
 * @returns whether the target is the root or a descendant of it.
 */
export declare function isPathUnder(path: string, root: string, caseSensitive?: boolean): Promise<boolean>;
//# sourceMappingURL=containment.d.ts.map