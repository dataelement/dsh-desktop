/** Drop-overlay strings the owner resolves from its own locale namespace. */
export interface DropOverlayLabels {
    /** Headline inviting the drop, or naming why it is unavailable. */
    title: string;
    /** Limits line under the title; shown only while drops are accepted. */
    desc?: string | undefined;
}
/**
 * Full-viewport invitation shown while a file drag is over the page
 * (DeepSeek Chat's DragMask). Decoration only: `pointer-events: none` keeps
 * drag targeting on the page below, so the owner's document-level listeners
 * keep an accurate enter/leave count and own accept/reject. Rendered through
 * a body portal for the same transformed-ancestor reason as the lightbox.
 *
 * @param props.disabled - drops are currently refused; renders the blocked
 * illustration and drops the desc line.
 * @param props.labels - resolved title and limits strings.
 * @returns the overlay layer.
 */
export declare function DropOverlay({ disabled, labels }: {
    disabled: boolean;
    labels: DropOverlayLabels;
}): import("react").ReactPortal;
//# sourceMappingURL=DropOverlay.d.ts.map