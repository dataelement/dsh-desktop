/** Incremental full-text index for the trajectory ledger. */
import type { TrajectoryTurnModel } from './layout.ts';
/** Session-view-local index that reparses Markdown only when one record's source changes. */
export declare class TrajectorySearchIndex {
    private readonly entries;
    private layouts;
    /**
     * Incrementally synchronize one or more current trajectory layout slices.
     * @param layouts - Finalized and optional streaming layouts from the same view.
     * @returns Whether the indexed layout version changed.
     */
    update(layouts: readonly (readonly TrajectoryTurnModel[])[]): boolean;
    /**
     * Match a query against the latest committed index version.
     * @param query - Space-separated case-insensitive search terms.
     * @returns Matching stable record identities, or `null` without a query.
     */
    search(query: string): ReadonlySet<string> | null;
}
//# sourceMappingURL=trajectory-search-index.d.ts.map