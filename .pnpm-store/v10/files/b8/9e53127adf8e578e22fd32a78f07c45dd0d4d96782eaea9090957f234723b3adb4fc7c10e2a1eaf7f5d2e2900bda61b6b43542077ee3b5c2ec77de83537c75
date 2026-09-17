/**
 * Keep a fixed-position floating element anchored to a trigger.
 *
 * A portaled panel is positioned from its anchor's viewport rect, which stops
 * being true the moment anything scrolls or the window resizes. This owns that
 * one concern: measure the anchor, offset the panel below or above it, clamp
 * the result inside the viewport, and re-run on scroll (capture phase, so
 * scrollers nested inside the page are caught too), on resize, and on the
 * panel's own size changes while the element is open.
 * @module @deepseek-ai/dsh-client-ui-primitives/useAnchoredPosition
 */
import { type CSSProperties, type RefObject } from 'react';
/** Inputs for {@link useAnchoredPosition}. */
export interface AnchoredPositionOptions {
    /** Whether the floating element is mounted and should track its anchor. */
    open: boolean;
    /** The element the panel is placed from. */
    anchorRef: RefObject<HTMLElement | null>;
    /** The floating element, measured so the clamp uses real dimensions. */
    panelRef: RefObject<HTMLElement | null>;
    /** Which anchor edge the panel hangs from: below it (`bottom`, the default) or above it (`top`). */
    side?: 'top' | 'bottom';
    /** Distance kept between the anchor edge named by `side` and the panel. */
    gap: number;
    /** Distance kept between the panel and each viewport edge. */
    margin: number;
}
/**
 * Track an anchor and return the panel's fixed coordinates.
 * @param options - the open state, the two refs, the placement side, and the gap/margin distances.
 * @returns `left`/`top` for the panel, or `null` before the first measurement.
 */
export declare function useAnchoredPosition(options: AnchoredPositionOptions): CSSProperties | null;
//# sourceMappingURL=useAnchoredPosition.d.ts.map