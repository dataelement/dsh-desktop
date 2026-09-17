/**
 * Shared ranking for `/` menu candidates: the query must be a
 * case-insensitive ordered subsequence of the candidate name. Prefix hits
 * rank first, then the strongest alignment score, then the source order of
 * the input. Decision record:
 * .agents/notes/archived/feature/2026-08-04-web-slash-command-fuzzy-discovery.md
 */
/**
 * Rank named items by a menu query.
 * @param items - candidates in source order (a host catalog, then client contributions).
 * @param rawQuery - the text typed after the trigger, matched case-insensitively.
 * @returns the matching items: prefix hits first, then by alignment score,
 * then in source order. The input list itself for an empty query.
 */
export declare function rankByName<T extends {
    readonly name: string;
}>(items: readonly T[], rawQuery: string): readonly T[];
//# sourceMappingURL=rank-by-name.d.ts.map