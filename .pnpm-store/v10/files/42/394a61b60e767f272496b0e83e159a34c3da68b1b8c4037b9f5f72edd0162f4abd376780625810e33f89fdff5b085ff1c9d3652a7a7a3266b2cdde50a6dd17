export interface CompareSlideCounts {
    displaySlideCount: number;
    comparableSlideCount: number;
}
export interface SlideVisualMetricFields {
    ssim: number | null;
    mae: number | null;
    fgIou: number | null;
    fgIouTolerant: number | null;
    chamferScore: number | null;
    colorHistCorr: number | null;
    needsReview: boolean | null;
    hasDiff: boolean;
}
export interface ServerPerSlideMetrics {
    slideIdx: number;
    hidden?: boolean;
    ssim?: number | null;
    mae?: number | null;
    fgIou?: number | null;
    fgIouTolerant?: number | null;
    chamferScore?: number | null;
    colorHistCorr?: number | null;
    needsReview?: boolean | null;
}
export type CompareViewMode = 'diff-first' | 'side-by-side' | 'triple';
export interface ComparePanelState {
    truth: boolean;
    render: boolean;
    diff: boolean;
    compact: boolean;
    expanded: boolean;
    fallback: boolean;
}
export interface ComparableSlideInfo {
    hidden?: boolean;
}
/**
 * Map PPTX slide indexes to exported PDF page indexes.
 * PowerPoint PDF export skips hidden slides, so slides after a hidden slide
 * should compare against the next visible PDF page rather than the same index.
 */
export declare function resolveComparablePdfPages(slides: readonly ComparableSlideInfo[], pdfPageCount: number): (number | null)[];
/**
 * Determine how many slides should be shown in E2E compare mode.
 * - displaySlideCount: all PPTX slides should stay visible to users
 * - comparableSlideCount: only slides with matching PDF pages can be scored visually
 */
export declare function resolveCompareSlideCounts(pptxSlideCount: number, pdfPageCount: number): CompareSlideCounts;
export declare function resolveComparePanelState(mode: CompareViewMode, hasDiff: boolean, expanded: boolean): ComparePanelState;
type MergeableSlide = {
    index: number;
    hasComparablePdf: boolean;
} & SlideVisualMetricFields;
export declare function mergeServerMetricsIntoSlides<T extends MergeableSlide>(slideResults: readonly T[], perSlideMetrics: readonly ServerPerSlideMetrics[] | null | undefined): T[];
export {};
