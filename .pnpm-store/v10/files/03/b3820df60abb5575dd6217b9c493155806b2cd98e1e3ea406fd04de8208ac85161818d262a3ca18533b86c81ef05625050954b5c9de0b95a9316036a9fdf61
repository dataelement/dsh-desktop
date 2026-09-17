/**
 * The store shell over the docking kit: one surface per session, held as plain
 * data so the kit's pure functions are the only thing that ever computes a
 * layout.
 *
 * Every action follows the same steps — mint the ids the intent needs, ask the
 * kit's planner what operations carry it out, let the settle planner keep every
 * pane populated, record it all as one history entry — and then assigns the
 * session's whole surface back in one go. Nothing here reaches into a draft to
 * edit a layout in place, which is what keeps the kit testable without a store
 * and keeps snapshot identity honest.
 *
 * The settle step is this product's rule, not the kit's: an intent never leaves
 * an expanded column with an empty pane — emptied side panes merge away, and an
 * empty root pane seeds the default page. A collapsed column may stand empty;
 * the seed waits for the expansion that would otherwise show nothing.
 *
 * A focus that changes nothing — a tab already active in its already-active
 * pane, a pane already active — plans nothing and records nothing, whoever
 * asks: the kit's chip click and `ctx.sidebarRight.focus` alike.
 *
 * So is page uniqueness: a pane holds at most one tab of each page kind (a tab
 * whose content is the kind's own page address — the guide, the explorer).
 * Opening a page into a pane that shows it focuses that tab, in that pane and
 * nowhere else, and a page dragged, dropped, or docked into such a pane merges
 * into the pane's own — the arriving tab closes and the pane's own is focused.
 * The kit plans none of this; it is decided here before its planners run.
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import type { DockMode, DockZone, FloatRect, History, LayoutState, PaneId, SplitId, TabId } from '@deepseek-ai/dsh-client-ui-dockkit';
import { type SidebarRightSeed } from './contract/seed.ts';
/** One session's docking surface: the layout, its sequence, and the id counter. */
export interface SurfaceState {
    readonly layout: LayoutState;
    readonly history: History;
    /** How many ids this surface has minted; carried so replay stays reproducible. */
    readonly minted: number;
}
/**
 * Every session's surface, keyed by session id.
 *
 * Written mutable because an action receives this type as its draft; the
 * immutability that matters is behavioural — actions only ever assign a whole
 * new map, never reach into one.
 */
export interface SidebarRightState {
    bySession: Record<string, SurfaceState>;
}
/**
 * Decide whether an explicit close may remove a tab.
 * @param surface - current surface.
 * @param tabId - tab requested for closing.
 * @returns false for a missing tab or the guide standing as the only docked tab.
 */
export declare function canCloseTab(surface: SurfaceState, tabId: TabId): boolean;
/**
 * What the navigation controller asks the store to open, the address already
 * claimed. Placement is by `replaceTab` first, then `paneId`, then the active pane.
 */
export interface OpenContentIntent {
    readonly kind: string;
    readonly contentId: string;
    readonly title: string;
    /** Land a new tab in this pane. */
    readonly paneId?: PaneId;
    /** Take this tab's pane and slot, and close it in the same entry. */
    readonly replaceTab?: TabId;
    /** Resource tabs reveal an existing identity by default; `false` permits duplicates. Pages always deduplicate within the target pane. */
    readonly revealIfOpened?: boolean;
}
/**
 * The surface a session starts with: collapsed, one pane, no tabs. The default
 * page is not seeded here — the settle rule seeds it when the column first
 * expands still empty, so a collapsed column never holds a page nobody asked
 * for, and an open into a fresh surface shows only what it opened.
 * @returns the initial surface.
 */
export declare function createSurface(): SurfaceState;
/**
 * Whether a tab stands alone on the docked surface: its pane is the sole docked
 * pane and holds nothing else. Floating panels do not count — they render
 * whether or not the column is expanded.
 * @param state - current layout.
 * @param tabId - the tab asked about.
 * @returns `true` for the docked surface's only tab.
 */
export declare function soleDockedTab(state: LayoutState, tabId: TabId): boolean;
/** Declared write set; each entry is one settled intent. */
type SidebarRightActions = {
    open: (draft: SidebarRightState, sessionId: string) => void;
    setExpanded: (draft: SidebarRightState, sessionId: string, expanded: boolean) => void;
    toggleExpanded: (draft: SidebarRightState, sessionId: string) => void;
    setMode: (draft: SidebarRightState, sessionId: string, mode: DockMode) => void;
    splitPane: (draft: SidebarRightState, sessionId: string, paneId?: PaneId, settled?: (paneId: PaneId) => void) => void;
    openContent: (draft: SidebarRightState, sessionId: string, intent: OpenContentIntent, settled: (tabId: TabId) => void) => void;
    duplicateTab: (draft: SidebarRightState, sessionId: string, tabId: TabId) => void;
    closeTab: (draft: SidebarRightState, sessionId: string, tabId: TabId) => void;
    focusTab: (draft: SidebarRightState, sessionId: string, tabId: TabId) => void;
    focusPane: (draft: SidebarRightState, sessionId: string, paneId: PaneId) => void;
    placeTab: (draft: SidebarRightState, sessionId: string, tabId: TabId, toPaneId: PaneId, index: number) => void;
    dropTab: (draft: SidebarRightState, sessionId: string, tabId: TabId, paneId: PaneId, zone: DockZone) => void;
    floatTab: (draft: SidebarRightState, sessionId: string, tabId: TabId, rect?: FloatRect) => void;
    unfloatPane: (draft: SidebarRightState, sessionId: string, paneId: PaneId) => void;
    moveFloat: (draft: SidebarRightState, sessionId: string, paneId: PaneId, x: number, y: number) => void;
    resizeFloat: (draft: SidebarRightState, sessionId: string, paneId: PaneId, rect: FloatRect) => void;
    resizeSplit: (draft: SidebarRightState, sessionId: string, splitId: SplitId, sizes: readonly number[]) => void;
    undo: (draft: SidebarRightState, sessionId: string) => void;
    redo: (draft: SidebarRightState, sessionId: string) => void;
};
/**
 * Create the Sidebar store handle.
 *
 * The default page arrives as a thunk: a pane is seeded when a split or an
 * expansion of an empty column needs one, which can be long after the store was
 * built and in a language the user has since changed to.
 * @param seed - the registered default page, read at each mint.
 * @returns the handle (spec, type, identity, and factory in one).
 */
export declare function createSidebarRightStore(seed: () => SidebarRightSeed): EngineStoreHandle<SidebarRightState, SidebarRightActions>;
export {};
//# sourceMappingURL=stores.d.ts.map