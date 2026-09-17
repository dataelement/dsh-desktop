/**
 * Layout plugin, browser half: one register() call contributes AppFrame into
 * the runtime's built-in 'root' slot and, in the same breath, declares the
 * four child slots (declaration = exclusive render authority), seats the
 * layout store (panel geometry), and wires the panel-action service face.
 * ctx.layout selects the main panel and controls column geometry; Session
 * selection belongs to the Session Controller. A second effect seats the theme
 * presenter, which projects ctx.theme snapshots onto document.body.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots';
import type { PanelInfo } from './service.ts';
export { LayoutController } from './service.ts';
export type { ILayout, MainPanelId, PanelInfo } from './service.ts';
/** Selector hook over root-scoped panel selection. */
export type UsePanelInfo = SnapshotSelectorHook<PanelInfo>;
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The outward face only; the concrete service stays inside this plugin. */
        layout: import('./service.ts').ILayout;
    }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface GlobalStandardProps {
        /** Subscribe to the selected main panel independently of parent renders. */
        usePanelInfo: UsePanelInfo;
    }
    interface SlotMap {
        /**
         * The whole left column. OCCUPIED by ui-sidebar's SidebarRoot, which
         * declares the workspace and settings seats inside it — registering here
         * replaces the navigation column outright rather than adding to it, and
         * the seats it declares disappear with it. To add something to the
         * sidebar, register into one of those inner seats instead.
         *
         * The occupant receives the frame's live column state (collapsed, width)
         * and is expected to render the compact control rail while collapsed.
         */
        'sidebar': {
            kind: 'single';
            scope: 'root';
            owner: SidebarOwnerProps;
        };
        /**
         * Central panel selected by sidebar entry id. The reserved `conversation`
         * key hosts the Conversation; other keys receive no Session binding.
         */
        'main': {
            kind: 'keyed';
            scope: 'root';
        };
        /**
         * The right column: a track the centre makes room for, or nothing. OCCUPIED
         * by the right Sidebar, which uses the resolved column width in normal
         * mode and covers the viewport in fullscreen, retaining the wide-screen
         * column reservation underneath.
         *
         * Whether the panel is shown, and whether it takes a track, is the
         * occupant's own recorded business — it reports the composition of its
         * expanded and presentation state through `ctx.layout`, and the frame sizes
         * the track and places the resize handle from that. The expand control is
         * not this column's: it is a button in the conversation header. The root
         * occupant decides when to render its Session-bound content.
         */
        'rightbar': {
            kind: 'single';
            scope: 'root';
            owner: RightbarOwnerProps;
        };
        /**
         * Frame-wide floating layer, above every column and outside their scroll
         * containers. Deliberately generic and unowned by any feature: a badge, a
         * toast stack or a status pill all belong here, and entries order among
         * themselves. The layer itself is click-through — entries opt back into
         * pointer events — so an occupant never blocks the app underneath.
         *
         * This is the additive seat for a frame-wide surface of your own: a fresh
         * `id` is added beside the shipped entries instead of replacing them.
         */
        'shell.overlay': {
            kind: 'list';
            scope: 'root';
        };
    }
}
/** Sidebar owner share: live column state from the frame's concession solve. */
export interface SidebarOwnerProps {
    /** True when the sidebar is closed (the column renders the compact control rail). */
    collapsed: boolean;
    /** Rendered column width in px (SIDEBAR_COLLAPSED when collapsed). */
    width: number;
}
/** Right column owner share: resolved normal geometry and opening eligibility. */
export interface RightbarOwnerProps {
    /** Resolved normal panel width in px, not the saved preference; zero if it cannot fit. */
    width: number;
    /** Current frame width in px. */
    viewportWidth: number;
    /**
     * Whether a normal right panel can retain 300px beside a 400px center.
     * Before a narrow opening, includes the space from collapsing the left sidebar.
     */
    canShow: boolean;
}
/** Required services (cordis fiber inject — the loader passes all module exports as an object plugin). */
export declare const inject: string[];
/**
 * Client plugin body: provide ctx.layout, then one register() call — AppFrame
 * into 'root' with the four child-slot declarations, the layout store seat,
 * and the shared root instance supplying commands and the panel-info source.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map