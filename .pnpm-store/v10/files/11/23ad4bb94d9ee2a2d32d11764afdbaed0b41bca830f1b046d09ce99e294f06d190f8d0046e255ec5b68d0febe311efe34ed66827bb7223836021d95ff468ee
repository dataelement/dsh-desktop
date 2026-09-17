/** Output lines shown before the height cap collapses the middle. */
export declare const DEFAULT_DIFF_MAX_LINES = 16;
/**
 * One file change in the form {@link DiffBlock} renders. It is declared here
 * so this primitive stays independent of the tool contract.
 */
export interface DiffHunk {
    /** The changed file's path, drawn verbatim as the hunk's header (the tool's model-facing path). */
    path: string;
    /** Prior content, or `null` for a new file / an overwrite (nothing on the removed side). */
    oldText: string | null;
    /** Content after the change (the added side). */
    newText: string;
}
export interface DiffBlockProps {
    /** One entry per applied hunk, in file order; empty renders nothing. */
    diffs: DiffHunk[];
    /** Localized chrome supplied by the owning render site. */
    labels: DiffBlockLabels;
    /** Height cap in body lines before the middle collapses (default {@link DEFAULT_DIFF_MAX_LINES}). */
    maxLines?: number | undefined;
    /** Extra class merged onto the wrapper (callers position; this component draws). */
    className?: string | undefined;
}
/** Localized chrome for {@link DiffBlock}. */
export interface DiffBlockLabels {
    copy: string;
    copied: string;
    collapseAria: string;
    expandAria: (hidden: number) => string;
    collapse: string;
    expand: (hidden: number) => string;
    files: (count: number) => string;
}
/**
 * Total added/removed line counts across hunks — the same numbers the footer
 * prints, exported so a summary row can show them without rebuilding the body.
 * Every old-side line counts toward `removed` and every new-side line toward
 * `added`, under {@link contentLines}'s terminator rule.
 * @param diffs - the hunks to count.
 * @returns the +/- totals.
 */
export declare function diffTotals(diffs: DiffHunk[]): {
    added: number;
    removed: number;
};
/**
 * Render a file mutation as an inline diff surface.
 * @param props - see {@link DiffBlockProps}.
 * @returns the diff block element.
 */
export declare function DiffBlock({ diffs, labels, maxLines, className }: DiffBlockProps): import("react").JSX.Element | null;
//# sourceMappingURL=DiffBlock.d.ts.map