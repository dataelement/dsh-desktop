/**
 * Plain-text reference scan (the plain-text-reference decision;
 * see .agents/notes/archived/architecture/2026-07-25-web-input-machine-and-slash-pipeline.md):
 * a `/name` or `@name` token whose name is on the trigger's lexicon, and
 * syntax-recognizable `@dir/` folder tokens. Pure derivation — the editor's
 * text-ref entity transform consumes these ranges; editing the text out of
 * match shape simply drops the range next scan.
 */
/**
 * One plain-text reference range (the plain-text-reference decision;
 * see .agents/notes/archived/architecture/2026-07-25-web-input-machine-and-slash-pipeline.md):
 * a `/name` or `@name` token
 * whose name is on the trigger's lexicon. Pure derivation — editing the text
 * out of match shape simply drops the range next scan.
 */
export interface TextRefRange {
    readonly start: number;
    readonly end: number;
    readonly trigger: '/' | '@';
}
/**
 * Scan the draft for plain-text reference tokens against the hot lexicons.
 * Word-boundary discipline: the trigger must sit at the draft
 * start or after whitespace ('x/name' never matches); the name must be an
 * exact lexicon member; a `/name` token must end at whitespace or the draft
 * end ('/name/x' is a path, '/name。' is prose).
 * @param draft - draft text.
 * @param lexicon - per-trigger name lists (a missing trigger scans nothing).
 * @returns matched ranges in draft order.
 */
export declare function scanTextRefs(draft: string, lexicon: ReadonlyMap<'/' | '@', readonly string[]>): TextRefRange[];
//# sourceMappingURL=decorations.d.ts.map