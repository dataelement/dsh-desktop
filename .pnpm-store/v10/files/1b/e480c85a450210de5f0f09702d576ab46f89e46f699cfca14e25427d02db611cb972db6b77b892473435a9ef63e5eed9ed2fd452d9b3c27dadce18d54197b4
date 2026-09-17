/**
 * LayoutController: the cross-plugin panel-action face behind ctx.layout.
 * Panel geometry and main-panel selection live in the root layout store;
 * the current-session selection lives with the runtime sessions service, and
 * the per-session active view dissolved into ui-conversation's session store
 * (its only consumer). What remains here is the contract other plugins'
 * apply worlds reach for panel transitions (main-panel selection and sidebar toggle,
 * right-panel show/hide from ui-sidebar-right) — writes stay inside the
 * store's declared action set, shared with the root registration.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots';
import type { Branded } from '@deepseek-ai/dsh-brand';
import type { createLayoutStore } from './stores.ts';
/** Identity shared by a sidebar panel entry and its main-slot occupant. */
export type MainPanelId = Branded<'MainPanelId'>;
/** Root-scoped navigation state exposed to panel-aware components. */
export interface PanelInfo {
    /** Selected global panel; null displays the current Conversation. */
    readonly activePanelId: MainPanelId | null;
}
/** The layout store's bound action set (framework-baked, draft params peeled). */
export type PanelActions = BoundActions<ReturnType<typeof createLayoutStore>>;
/** Panel navigation and geometry actions exposed through ctx.layout. */
export interface ILayout {
    /**
     * Select a global central panel without changing the current Session.
     * @param panelId - registered main key, or null to show the Conversation.
     * @throws if the selected main key is not registered; preserves the current selection.
     */
    selectPanel(panelId: MainPanelId | null): void;
    /**
     * Start an asynchronous navigation, superseding any earlier pending navigation.
     * @returns a signal aborted by the next navigation or layout disposal; check it before committing UI state.
     */
    beginNavigation(): AbortSignal;
    /** Toggle the sidebar panel (closed ⟷ contract default width). */
    toggleSidebar(): void;
    /**
     * Report the right panel's presentation without changing its expanded state.
     * @param track - whether the normal panel width reserves a grid track,
     *   including beneath a fullscreen overlay.
     * @param fullscreen - whether the panel covers the frame and hides its outer
     *   resize handle; independent of the underlying grid track.
     */
    openRightbar(track: boolean, fullscreen: boolean): void;
    /** Report the right panel as hidden: no track, no handle. */
    closeRightbar(): void;
}
/** Cross-plugin panel-action face (ctx.layout). */
export declare class LayoutController implements ILayout {
    private readonly panels;
    private readonly hasMainPanel;
    private navigation;
    /**
     * @param panels - actions of the instance shared with the root entry.
     * @param hasMainPanel - checks the live main-slot registry for a panel id.
     */
    constructor(panels: PanelActions, hasMainPanel: (id: MainPanelId) => boolean);
    /** Select a global panel or return to the Conversation. */
    selectPanel(panelId: MainPanelId | null): void;
    /** @returns the new pending navigation's cancellation signal. */
    beginNavigation(): AbortSignal;
    /** Invalidate pending navigations when the layout owner is unloaded. */
    dispose(): void;
    /** Toggle the sidebar panel (closed ⟷ contract default width). */
    toggleSidebar(): void;
    /** Report the right panel's track and fullscreen presentation. */
    openRightbar(track: boolean, fullscreen: boolean): void;
    /** Report the right panel as hidden: no track, no handle. */
    closeRightbar(): void;
}
//# sourceMappingURL=service.d.ts.map