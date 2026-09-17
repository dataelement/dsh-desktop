/**
 * The guide tab's body: a chain host, and the guide it falls back to.
 *
 * The chain is the replacement seam. A product with its own idea of what an
 * empty sidebar should say registers into `sidebar.right.tab.guide`, and its entry
 * takes the whole body; with no entry, or with every entry declining, the guide
 * below renders. The shipped guide is the owner's fallback rather than a chain
 * entry of its own, so there is always exactly one body and the shipped one
 * cannot be outvoted by accident.
 *
 * The shipped guide is a muted compass over the entry capsules every
 * registered type contributed, centred in the body, and nothing else — no
 * heading, as a browser start page shows its doors without a caption. While
 * at most four entries are listed, a capsule with a description shows it
 * under the title; a longer list drops every description to stay light.
 * Picking one opens that type as a page
 * in this tab's place, so the guide is a doorway rather than a page that stays
 * open.
 */
import type { ReactNode } from 'react';
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SidebarRightGuideBox } from '../../tab-registry.ts';
/** What the guide body needs from its host beyond the framework shares. */
export interface GuideInjected {
    /** The registry's guide entries in `order`; observable, so a type registering later appears. */
    readonly hooks: {
        readonly guideEntries: ObservableSnapshot<readonly SidebarRightGuideBox[]>;
    };
}
/** The guide body's composed props: the tab it draws, its chain child, and the entries. */
export type GuideBodyProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsRenderSlots<'sidebar.right.tab.guide'> & InjectFace<GuideInjected>;
/** The guide tab's body, replaceable through its chain child. */
export declare function GuideBody({ useTabInfo, useGuideEntries, renderSlotChain }: GuideBodyProps): ReactNode;
//# sourceMappingURL=GuideBody.d.ts.map