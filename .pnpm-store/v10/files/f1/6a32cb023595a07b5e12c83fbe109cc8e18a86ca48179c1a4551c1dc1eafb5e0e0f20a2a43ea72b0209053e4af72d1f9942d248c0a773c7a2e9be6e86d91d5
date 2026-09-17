/**
 * Host-workspace discovery for `@file` completion. The index contains paths
 * only: selected values remain ordinary prompt text and file contents stay
 * behind the model-facing `read` tool.
 *
 * @module @deepseek-ai/dsh-file-reference-local/search
 */
import type { FileReferenceCandidate } from '@deepseek-ai/dsh-file-reference';
export { activeAtToken, formatFileMention } from '@deepseek-ai/dsh-file-reference/grammar';
/** Default maximum file and directory candidates rendered for one query. */
export declare const DEFAULT_FILE_SEARCH_MAX_RESULTS = 20;
/** Default maximum entries retained in one workspace search index. */
export declare const DEFAULT_FILE_SEARCH_MAX_ENTRIES = 50000;
/**
 * Directory basenames omitted from traversal unless the deployment overrides
 * them: version-control and dependency stores plus build-output names that no
 * ecosystem also uses for sources. Generated files carry the basenames of the
 * sources that produced them, so an unfiltered tree both spends the entry
 * budget twice and ranks `dist/x.js` beside `src/x.ts` for every query.
 *
 * `lib` is deliberately absent: Ruby gems and many npm packages keep their
 * sources there, and excluding it would make `@` miss those sources entirely
 * and silently. A workspace that builds into `lib` adds it through
 * `excludedDirectories`.
 */
export declare const DEFAULT_FILE_SEARCH_EXCLUDED_DIRECTORIES: readonly [".git", "node_modules", "dist", "build", "out", "coverage", "target", ".next", ".nuxt", ".turbo", ".venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".gradle"];
/** Resolved limits and exclusions for one workspace index. */
export interface FileSearchConfig {
    /** Maximum ranked candidates returned for one query. */
    maxResults: number;
    /** Maximum indexed files and directories. */
    maxEntries: number;
    /** Directory basenames never traversed or offered. */
    excludedDirectories: readonly string[];
}
/**
 * Cancellable, reusable fuzzy index rooted at one agent working directory.
 * Directory-scoped queries list live state; bare fuzzy queries share one
 * bounded traversal. Only the first query of a workspace waits for that
 * traversal — an invalidated index keeps answering while its replacement
 * builds behind the caret.
 */
export declare class WorkspaceFileSearch {
    private readonly root;
    private readonly config;
    private readonly excludedDirectories;
    private settled;
    private generation;
    /** Monotonic invalidation counter; a settled index below it is stale. */
    private invalidations;
    private disposed;
    constructor(root: string, config: FileSearchConfig);
    /**
     * Return ranked path candidates for the current token.
     * @param rawQuery - path text following `@` or `@"`.
     * @param signal - cancels this caller's wait without killing an index shared by a newer query.
     * @returns at most `maxResults` deterministic candidates.
     */
    list(rawQuery: string, signal: AbortSignal): Promise<FileReferenceCandidate[]>;
    /**
     * Mark the index stale so a later bare query observes a fresh tree.
     *
     * The stale entries are kept and keep answering: a rebuild costs one
     * traversal of the whole workspace, and putting that in front of the caret
     * is what a caller invalidating on every tool result would otherwise pay.
     */
    invalidate(): void;
    /** Abort traversal and make later queries return no candidates. */
    dispose(): void;
    /**
     * The entries a bare fuzzy query ranks. Only the first query of a workspace
     * waits for a traversal; afterwards a stale index answers immediately and
     * its replacement builds in the background.
     * @param signal - cancels this caller's wait without killing a shared traversal.
     * @returns indexed paths, at most one invalidation behind the tree.
     */
    private indexFor;
    private ensureIndex;
    private scanWorkspace;
    private listDirectory;
}
//# sourceMappingURL=search.d.ts.map