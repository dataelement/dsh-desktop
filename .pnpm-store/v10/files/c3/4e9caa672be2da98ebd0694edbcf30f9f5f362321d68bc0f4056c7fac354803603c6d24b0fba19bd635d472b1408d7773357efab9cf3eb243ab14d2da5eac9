/**
 * Root-owned frame measurement, panel preferences, and presentation reports.
 * The registration supplies a fresh store and binds its actions to ctx.layout.
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import type { MainPanelId } from './service.ts';
/**
 * Transient layout preferences. Responsive concessions never rewrite widths;
 * the right panel's expanded state belongs to its occupant.
 */
type LayoutState = {
    panelInfo: {
        /** Null selects the Conversation; global panels keep the current Session intact. */
        activePanelId: MainPanelId | null;
    };
    layoutInfo: LayoutInfo;
};
type LayoutInfo = {
    sidebar: number;
    /** Last positive frame measurement; window width bootstraps the first render. */
    viewportWidth: number;
    narrowExpanded: boolean;
    /**
     * Saved right panel width in px, or null before its first opening. Resizing
     * the frame and closing the panel preserve this preference.
     */
    rightbar: number | null;
    /**
     * Whether the right panel is drawn at all, in either presentation.
     *
     * Derived chrome, not a source of truth: whether the right surface is
     * expanded is a recorded fact owned by that surface, reported here so the
     * frame can place the panel's resize handle. The occupant reports it; nothing
     * else writes it.
     */
    rightbarShown: boolean;
    /**
     * Whether the normal panel width reserves a grid track, including beneath
     * fullscreen. Reported by the occupant; always false while hidden.
     */
    rightbarTrack: boolean;
    /** Reported fullscreen presentation; hides the outer resize handle. */
    rightbarFullscreen: boolean;
    /** Suppress transitions for a fullscreen exit until another geometry action. */
    rightbarInstant: boolean;
};
/**
 * Annotation twin of the actions literal below (the export needs a declared
 * return type); drift fails assignability at the defineStore call.
 */
type LayoutActions = {
    selectPanel: (draft: LayoutState, panelId: MainPanelId | null) => void;
    retainMainPanels: (draft: LayoutState, panelIds: readonly string[]) => void;
    setSidebar: (draft: LayoutState, px: number) => void;
    toggleSidebar: (draft: LayoutState) => void;
    setViewportWidth: (draft: LayoutState, width: number) => void;
    setRightbar: (draft: LayoutState, px: number) => void;
    openRightbar: (draft: LayoutState, track: boolean, fullscreen: boolean) => void;
    closeRightbar: (draft: LayoutState) => void;
};
/**
 * Create the layout panel store handle. For the sidebar the preference IS the
 * width, so closing it forgets its drag width — reopening restores the contract
 * default. The right panel initializes at 45% of the frame on first opening
 * and keeps that px preference across resizes and close. Drag writes clamp to
 * the current frame's range. Narrow sidebar toggles change only the expansion
 * override; opening the right panel clears that override.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export declare function createLayoutStore(): EngineStoreHandle<LayoutState, LayoutActions>;
export {};
//# sourceMappingURL=stores.d.ts.map