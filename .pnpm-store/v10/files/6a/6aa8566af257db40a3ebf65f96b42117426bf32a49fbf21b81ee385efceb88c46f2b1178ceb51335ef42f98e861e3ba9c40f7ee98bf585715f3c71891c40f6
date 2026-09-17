/** Draft-attachment rail: scrollbar-less horizontal overflow paged by edge arrows. */
import type { ReactNode } from 'react';
/** One ordered draft attachment rendered by the rail owner. */
export interface AttachmentRailItem {
    /** Stable identity for the React key. */
    id: string;
}
/** Rail-level strings the owner resolves from its own locale namespace. */
export interface AttachmentRailLabels {
    /** Accessible name of the rail group. */
    group: string;
    /** Accessible label of the left paging arrow. */
    scrollLeft: string;
    /** Accessible label of the right paging arrow. */
    scrollRight: string;
}
/**
 * Horizontal rail over the caller's ordered draft attachments.
 *
 * The rail scrolls with its scrollbar hidden; overflow is announced by edge
 * arrows recomputed from scroll geometry on scroll, item-count changes, and
 * rail size changes (a ResizeObserver on the rail element, so sidebar or
 * panel resizes count, not only window resizes). A vertical wheel pans the
 * rail horizontally and is consumed exclusively (non-passive listener), a
 * newly added item is revealed at the rail's end while a rail that mounts
 * over an existing draft keeps its start position. The owner renders each
 * item and decides mounting; it renders the rail only while items exist.
 *
 * @param props.items - attachments in draft order.
 * @param props.labels - rail-level strings (group name and paging arrows).
 * @param props.renderItem - render one attachment card in draft order.
 * @returns the rail group with its paging arrows.
 */
export declare function AttachmentRail<T extends AttachmentRailItem>({ items, labels, renderItem }: {
    items: readonly T[];
    labels: AttachmentRailLabels;
    renderItem: (item: T) => ReactNode;
}): import("react").JSX.Element;
//# sourceMappingURL=AttachmentRail.d.ts.map