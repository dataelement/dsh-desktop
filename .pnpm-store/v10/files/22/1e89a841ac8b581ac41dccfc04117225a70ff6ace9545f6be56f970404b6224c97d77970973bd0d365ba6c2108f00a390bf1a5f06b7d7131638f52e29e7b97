/**
 * Result-time search-card presentation for `grep` and `glob`. Both tools land on
 * one `card: 'search'` render intent ({@link SearchResultView}) with two
 * `shape`-discriminated variants: `grep` projects its matches grouped by file
 * ({@link SearchMatchesResultView}), `glob` projects a flat path list
 * ({@link SearchPathsResultView}). This module owns the value→`presentationMeta`
 * projection each tool declares and the defensive `meta`→view narrowing each
 * tool's `presentResult` reads back on replay.
 *
 * The canonical value never crosses the wire — only the model-facing render text
 * and this JSON `meta` do — so the structured shape a UI renders MUST ride in
 * `meta`. Each projection consumes the SAME retained matches/paths the
 * model-facing render consumes ({@link module:@deepseek-ai/dsh-tool-fs-search/search-core}
 * `retainGrepMatches`/`retainGlobPaths`), so text and card agree about which
 * results survived the inline cap, and reports `total` (every result found) and
 * `truncated`, so a UI never presents a capped result as complete.
 *
 * A second, independent cap bounds the JSON `meta` itself: the retained matches
 * of a broad search (hundreds of long lines) can still serialize to hundreds of
 * kilobytes, and `meta` is persisted with the session log and re-sent on every
 * request. {@link capMetaBytes} drops trailing groups/paths until the serialized
 * `meta` fits `maxMetaBytes` and marks the result `truncated`; a deployment's
 * final output budget (`dsh-spill-policy`) only shrinks `content`, never `meta`,
 * so this projection owns keeping `meta` bounded.
 *
 * @module @deepseek-ai/dsh-tool-fs-search/presentation
 */
import type { SearchResultView } from '@deepseek-ai/dsh-tools';
import type { RetainedItems } from '@deepseek-ai/dsh-output-retention';
import type { GrepMatch } from './search-core.ts';
/**
 * The retention fields a meta projection reads: the retained page, whether the
 * complete result was capped, and the pre-cap total. Both a full
 * {@link RetainedItems} (from `retainGrepMatches`) and `glob`'s sampled page
 * satisfy this structural subset, so a projection consumes either without a fake
 * `kept`/`omitted`.
 */
type RetainedPage<T> = Pick<RetainedItems<T>, 'items' | 'truncated' | 'seen'>;
/**
 * The `grep`/`glob` tools' private `tool/result` `meta` payload: the capped,
 * structured search result. Attached opaquely (as `JsonValue`) on the tool result
 * and persisted with the session log, so `presentResult` reproduces the search
 * card on replay. The `matches` shape carries the by-file groups; the `paths`
 * shape carries the flat list. Both carry the pre-cap `total` and the `truncated`
 * flag. The producing tool owns and narrows this opaque shape.
 *
 * The member shapes use object-literal `type` aliases rather than the
 * {@link SearchFileMatches}/{@link SearchLineMatch} interfaces because only a type
 * alias is assignable to the `JsonValue` index signature `presentationMeta`
 * returns; the two are structurally identical, so the projected value still reads
 * back as a {@link SearchResultView}.
 */
export type SearchMeta = {
    shape: 'matches';
    files: MetaFileMatches[];
    truncated: boolean;
    total: number;
} | {
    shape: 'paths';
    paths: string[];
    truncated: boolean;
    total: number;
};
/** One matched line in {@link SearchMeta} (the JSON-assignable form of {@link SearchLineMatch}). */
type MetaLineMatch = {
    lineNumber: number;
    line: string;
};
/** One file's grouped matches in {@link SearchMeta} (the JSON-assignable form of {@link SearchFileMatches}). */
type MetaFileMatches = {
    path: string;
    matches: MetaLineMatch[];
};
/**
 * Group flat matches by file (first-seen order) into the structured by-file shape
 * a UI renders as expandable per-file groups. The grouping matches the
 * model-facing text grouping
 * ({@link module:@deepseek-ai/dsh-tool-fs-search/grep} `formatGrepMatches`), so
 * card and text agree about file order and membership.
 *
 * @param matches - the retained matches to group, in output order.
 * @returns one entry per file, in first-seen order.
 */
export declare function groupMatchesByFile(matches: GrepMatch[]): MetaFileMatches[];
/**
 * Project the retained `grep` matches into {@link SearchMeta} for the search
 * card. Consumes the same {@link RetainedItems} the model-facing render consumes
 * (preview budget and inline match cap already applied), groups the retained
 * matches by file, reports `total` (every parsed match) and `truncated`, then
 * bounds the serialized meta to `maxMetaBytes`.
 *
 * @param retained - the retention outcome over every parsed match (previewed, capped).
 * @param maxMetaBytes - the serialized-meta byte budget.
 * @returns the `matches`-shaped search metadata.
 */
export declare function grepSearchMeta(retained: RetainedPage<GrepMatch>, maxMetaBytes: number): SearchMeta;
/**
 * Project the retained `glob` paths into {@link SearchMeta} for the search card.
 * Consumes the same {@link RetainedItems} the model-facing render consumes (inline
 * path cap already applied), reports `total` (every discovered path) and
 * `truncated`, then bounds the serialized meta to `maxMetaBytes`.
 *
 * @param retained - the retention outcome over every discovered path (capped).
 * @param maxMetaBytes - the serialized-meta byte budget.
 * @returns the `paths`-shaped search metadata.
 */
export declare function globSearchMeta(retained: RetainedPage<string>, maxMetaBytes: number): SearchMeta;
/**
 * Narrow opaque live or replayed result metadata to a {@link SearchResultView}.
 * Malformed metadata returns `undefined` so `presentResult` can fall back to the
 * generic card instead of throwing during replay of an older or hand-edited log.
 * The view carries no result text: a UI without a search card falls back to the
 * raw `tool/result` content.
 *
 * A zero-result meta (`files: []` / `paths: []`) narrows to a valid empty card —
 * unlike the mirrored `diffsFromMeta`, which rejects empty diffs, because a
 * zero-match grep is a legitimate result a UI shows as "no matches", not an
 * absent projection.
 *
 * @param meta - result metadata (the {@link SearchMeta} the tool projected).
 * @returns the search view, or `undefined` for absent or malformed metadata.
 */
export declare function searchViewFromMeta(meta: unknown): SearchResultView | undefined;
export {};
//# sourceMappingURL=presentation.d.ts.map