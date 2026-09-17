/** Request normalization, parameterized predicates, and result presentation. */
import type { SessionEventMetadataFilter, SessionEventSearchRequest, SessionResultFilter, SessionSearchCursor, SessionSearchRequest } from '@deepseek-ai/dsh-session-query';
/** Collision-free marker inserted before an FTS5 match by `highlight()`. */
export declare const FTS_HIGHLIGHT_START = "\uFDD0";
/** Collision-free marker inserted after an FTS5 match by `highlight()`. */
export declare const FTS_HIGHLIGHT_END = "\uFDD1";
/** Largest page size whose internal lookahead remains an exact SQLite integer binding. */
export declare const SQLITE_MAX_PAGE_LIMIT: number;
/** Portable host-parameter ceiling shared by predicate and statement builders. */
export declare const SQLITE_PORTABLE_VARIABLE_LIMIT = 32766;
/** Supported outer-predicate budget that keeps SQLite FTS5 MATCH usable. */
export declare const SQLITE_FTS5_OUTER_PREDICATE_LIMIT = 14;
/**
 * Reject prospective SQLite binding growth beyond the portable ceiling.
 * @param count - binding count at the current construction boundary.
 */
export declare function assertPortableBindingCount(count: number): void;
/**
 * Reject compiled outer predicates beyond the supported FTS5 planner budget.
 * @param count - predicate count including fixed statement predicates.
 */
export declare function assertFts5OuterPredicateCount(count: number): void;
/** Limit defaults needed to normalize a search request. */
export interface QueryLimits {
    /** Page size used when the request omits one. */
    defaultLimit: number;
    /** Largest accepted page size. */
    maxLimit: number;
}
/** Normalized cross-session request. */
export interface NormalizedSessionRequest {
    query: string;
    sessionFilters: readonly SessionResultFilter[];
    eventFilters: readonly SessionEventMetadataFilter[];
    limit: number;
    cursor?: SessionSearchCursor;
}
/** Normalized within-session request. */
export interface NormalizedEventRequest {
    sessionId: SessionEventSearchRequest['sessionId'];
    query: string;
    filters: readonly SessionEventMetadataFilter[];
    limit: number;
    cursor?: SessionSearchCursor;
}
/** Parameterized SQL predicate fragment. */
export interface SqlWhere {
    /** SQL without the leading `WHERE`. */
    sql: string;
    /** Bindings in placeholder order. */
    params: Array<string | number>;
    /** Number of compiled predicates in `sql`. */
    predicateCount: number;
}
/**
 * Validate and canonicalize a cross-session request.
 * @param request - caller-provided query, filters, limit, and cursor.
 * @param limits - configured default and maximum page sizes.
 * @returns normalized request with explicit arrays and limit.
 */
export declare function normalizeSessionRequest(request: SessionSearchRequest, limits: QueryLimits): NormalizedSessionRequest;
/**
 * Validate and canonicalize a within-session request.
 * @param request - caller-provided target, query, filters, limit, and cursor.
 * @param limits - configured default and maximum page sizes.
 * @returns normalized request with an explicit filter array and limit.
 */
export declare function normalizeEventRequest(request: SessionEventSearchRequest, limits: QueryLimits): NormalizedEventRequest;
/**
 * Compile logical-session predicates against selected-document columns.
 * @param filters - validated ANDed logical-session clauses.
 * @returns parameterized SQL fragment and ordered bindings.
 */
export declare function buildSessionWhere(filters: readonly SessionResultFilter[]): SqlWhere;
/**
 * Compile event metadata predicates against selected-document columns.
 * @param filters - validated ANDed event metadata clauses.
 * @returns parameterized SQL fragment and ordered bindings.
 */
export declare function buildEventWhere(filters: readonly SessionEventMetadataFilter[]): SqlWhere;
/**
 * Quote caller text as one FTS5 phrase so query syntax remains inert data.
 * @param query - normalized caller query.
 * @returns FTS5 expression containing one escaped literal phrase.
 */
export declare function quoteFtsData(query: string): string;
/**
 * Remove reserved marker collisions before text enters FTS5 or MATCH.
 * @param text - extracted document text or normalized caller query.
 * @returns text with reserved noncharacters mapped to replacement characters.
 */
export declare function sanitizeFtsText(text: string): string;
/**
 * Build the stable normalized request identity stored in opaque cursors.
 * @param request - normalized request whose filter ordering is canonicalized.
 * @returns deterministic JSON identity for cursor binding.
 */
export declare function requestFingerprint(request: NormalizedSessionRequest | NormalizedEventRequest): string;
/**
 * Build a whitespace-normalized excerpt no longer than `maxChars`.
 * @param markedText - complete document with FTS5 `highlight()` markers.
 * @param maxChars - maximum result length in Unicode code points.
 * @returns bounded plain-text snippet.
 */
export declare function makeSnippet(markedText: string, maxChars: number): string;
//# sourceMappingURL=query.d.ts.map