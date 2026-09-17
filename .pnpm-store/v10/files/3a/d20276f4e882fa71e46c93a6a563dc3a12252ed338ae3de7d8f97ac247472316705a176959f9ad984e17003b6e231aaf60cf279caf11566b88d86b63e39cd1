/**
 * Normal column geometry: the right column shrinks, then loses its track,
 * before the center drops below its minimum. The sidebar never concedes here;
 * AppFrame supplies its effective preference after responsive collapse.
 */
/** Resolved widths for one frame. */
export interface Columns {
    sidebar: number;
    center: number;
    rightbar: number;
}
/** Center width protected while the normal right column is open. */
export declare const CENTER_MIN = 400;
/** Sidebar drag clamp floor. */
export declare const SIDEBAR_MIN = 264;
/** Sidebar drag clamp ceiling. */
export declare const SIDEBAR_MAX = 420;
/** Sidebar width before any user drag. */
export declare const SIDEBAR_DEFAULT = 280;
/** Closed-sidebar rail: a 24px icon column between 16px horizontal paddings. */
export declare const SIDEBAR_COLLAPSED = 56;
/** Viewport width below which the sidebar auto-collapses to the rail (deepsuite
 * LG breakpoint); a manual toggle below it re-expands over the squeezed center
 * (stores.ts narrowExpanded). */
export declare const SIDEBAR_AUTO_COLLAPSE = 1024;
/** Right column drag clamp floor. */
export declare const RIGHTBAR_MIN = 300;
/** Maximum normal right panel width as a fraction of the frame. */
export declare const RIGHTBAR_MAX_RATIO = 0.7;
/** First-open right panel preference as a fraction of the frame. */
export declare const RIGHTBAR_DEFAULT_RATIO = 0.45;
/**
 * Clamp a panel width into its contract range.
 * @param px - requested width.
 * @param min - range lower bound.
 * @param max - range upper bound.
 * @returns the clamped width.
 */
export declare function clampWidth(px: number, min: number, max: number): number;
/**
 * Solve the three column widths for one viewport frame.
 * @param viewport - available frame width in px.
 * @param sidebar - sidebar width preference in px (0 = closed).
 * @param rightbar - requested right panel width in px (0 = no track).
 * @returns actual widths after shrinking or removing the right track; only
 *   without that track may the center fall below its minimum, down to zero.
 */
export declare function computeColumns(viewport: number, sidebar: number, rightbar: number): Columns;
//# sourceMappingURL=columns.d.ts.map