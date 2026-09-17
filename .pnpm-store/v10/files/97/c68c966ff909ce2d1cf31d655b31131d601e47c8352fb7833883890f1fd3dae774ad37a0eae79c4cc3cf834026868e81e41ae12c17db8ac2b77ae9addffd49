import type { ReactNode } from 'react';
import type { HostObservable, InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { DockIntents, TabRecord } from '@deepseek-ai/dsh-client-ui-dockkit';
import type { HalvesFit, PaneId } from '@deepseek-ai/dsh-client-ui-dockkit';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SidebarRightOpenTabOptions } from '../service.ts';
import type { SidebarRightTabDefinition } from '../tab-registry.ts';
import type { createSidebarRightStore, SurfaceState } from '../stores.ts';
import type { TabOccurrence } from '../tab-domain.ts';
import type { SidebarRightTabNavigation } from '../contract/slots.ts';
/** The store share the seat receives. */
type Store = PropsStore<ReturnType<typeof createSidebarRightStore>>;
/** The child seats this component renders. */
type Children = PropsRenderSlots<'sidebar.right.pane.tab' | 'sidebar.right.pane.tab.title' | 'sidebar.right.tab.menu.item'>;
/** What the panel reports to the frame: drawn or not, and whether it wants a track. */
export interface SidebarRightPresentation {
    /** Whether the panel is drawn at all. */
    readonly shown: boolean;
    /** Whether the drawn panel wants the conversation to make room for it. */
    readonly track: boolean;
    /** Whether the panel fills the viewport, independently of its retained track. */
    readonly fullscreen: boolean;
}
/** What this package needs from its host beyond the framework shares. */
export interface SidebarRightInjected {
    /**
     * Report the panel's presentation to the frame.
     *
     * The frame sizes the track and places the resize handle; this only tells it
     * the composition of the facts this package owns, and is called whenever that
     * composition changes.
     */
    readonly syncPresentation: (presentation: SidebarRightPresentation) => void;
    /**
     * Publish this seat's session, actions, and the store's surfaces to `ctx.sidebarRight`.
     *
     * The service is root-scoped and cannot read a per-entry store, so the only
     * honest source is the mounted seat. Held for as long as the seat is mounted.
     * @param binding - what a command needs to act on this session, and what a tab's own action needs to act on its.
     * @returns a release callback.
     */
    readonly bindService: (binding: {
        sessionId: SessionId;
        actions: Store['actions'];
        /** Every session's surface as last committed; the mounted one is `surfaces[sessionId]`. */
        surfaces: Readonly<Record<string, SurfaceState>>;
        /** The room rule's verdict for a docked pane, as the kit last measured it. */
        canSplitPane: (paneId: PaneId) => boolean;
    }) => () => void;
    /**
     * The navigation face's `openTab`, for the strip's add control: a new tab is
     * the guide opened by kind, through the same path as every other open.
     */
    readonly openTab: (kind: string, options?: SidebarRightOpenTabOptions) => void;
    readonly hooks: {
        readonly tabTypes: HostObservable<readonly SidebarRightTabDefinition[]>;
    };
    readonly keyedHooks: {
        readonly tabNavigation: (key: string) => HostObservable<SidebarRightTabNavigation>;
    };
    /** Read a committed record's lifetime; never creates an occurrence. */
    readonly occurrence: (tab: Pick<TabRecord, 'id'>) => TabOccurrence;
}
/** The column seat's props: session scope, so the session arrives as a standard prop. */
export type RightbarSeatProps = PropsRuntime<'rightbar.session'> & Children & Store & PropsLocale<'sidebarRight'> & InjectFace<SidebarRightInjected>;
/** Everything the panel needs, already bound to one session. */
interface PanelProps {
    readonly sessionId: SessionId;
    readonly surface: SurfaceState;
    readonly actions: Store['actions'];
    readonly t: RightbarSeatProps['t'];
    readonly renderSlot: Children['renderSlot'];
    readonly openTab: SidebarRightInjected['openTab'];
    readonly useTabTypes: RightbarSeatProps['useTabTypes'];
    readonly useTabNavigation: RightbarSeatProps['useTabNavigation'];
    readonly useStore: Store['useStore'];
    readonly occurrence: SidebarRightInjected['occurrence'];
    readonly fullscreen: boolean;
    readonly autoFullscreen: boolean;
    /** Receives the kit's room-rule readings for the service's `split`. */
    readonly reportRoom: (fits: ReadonlyMap<PaneId, HalvesFit>) => void;
}
/**
 * Build the kit's intent face for one session out of the store's actions.
 * @param sessionId - the session the seat draws; every action is bound to it.
 * @param actions - the seat's bound store actions.
 * @param openTab - the navigation face's `openTab`, which the strip's add control asks for a guide through.
 * @returns the intents the kit reports gestures to.
 */
export declare function intentsFor(sessionId: SessionId, actions: Store['actions'], openTab: PanelProps['openTab']): DockIntents;
/**
 * The right column's occupant: the panel, anchored to the column's edge and
 * shown or hidden by sliding, plus the floating layer. It is also where the
 * frame learns the panel's presentation, and where `ctx.sidebarRight` learns
 * which session it is acting on, because this is the seat that knows both.
 */
export declare function RightbarSeat({ sessionId, width, viewportWidth, canShow, useStore, actions, t, renderSlot, syncPresentation, bindService, openTab, useTabTypes, useTabNavigation, occurrence, }: RightbarSeatProps): ReactNode;
export {};
//# sourceMappingURL=SidebarRight.d.ts.map