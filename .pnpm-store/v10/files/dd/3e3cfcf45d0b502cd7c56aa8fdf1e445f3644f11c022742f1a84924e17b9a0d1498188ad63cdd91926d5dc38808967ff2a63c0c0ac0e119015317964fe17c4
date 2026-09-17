/** Lightbox strings the owner resolves from its own locale namespace. */
export interface ImageLightboxLabels {
    /** Accessible name of the preview dialog. */
    dialog: string;
    /** Accessible label of the close control. */
    close: string;
}
/**
 * Document-level original-image preview opened by clicking a thumbnail.
 * Closes on Escape, backdrop press, or the close control, and restores focus
 * to the opener on unmount. Rendered through a body portal: an opener inside
 * a transformed or filtered ancestor would otherwise trap the fixed backdrop
 * in that ancestor's box instead of covering the viewport.
 *
 * @param props.src - the original image URL.
 * @param props.alt - the image's alt text.
 * @param props.labels - dialog and close-control strings.
 * @param props.onClose - dismiss callback owned by the opener.
 * @returns the modal preview dialog.
 */
export declare function ImageLightbox({ src, alt, labels, onClose }: {
    src: string;
    alt: string;
    labels: ImageLightboxLabels;
    onClose: () => void;
}): import("react").ReactPortal;
//# sourceMappingURL=ImageLightbox.d.ts.map