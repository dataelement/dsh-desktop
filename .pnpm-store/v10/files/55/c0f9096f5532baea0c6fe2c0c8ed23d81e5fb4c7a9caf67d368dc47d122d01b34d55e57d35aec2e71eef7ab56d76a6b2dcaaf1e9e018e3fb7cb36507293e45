/**
 * The Tab domain: what a tab record carries that the layout does not.
 *
 * One `TabOccurrence` per open record, keyed by (session, tab id): where the
 * tab was navigated to, an abort signal spanning the record's life, and the
 * actions the tab may take on itself. Holding a record also pins its address in
 * the resource model, so switching tabs unmounts a body without dropping its
 * content.
 *
 * `sync` reconciles occurrences against one session's layout after every
 * commit: a record that appeared is pinned, one that vanished (closed, or its
 * open undone) is aborted and dropped. A record restored by undo is a new
 * occurrence and is fetched again if the resource model already let it go. The
 * controller syncs each session from that session's adopted store on every
 * commit, on screen or not, so a record closed from another session's seat is
 * aborted on that commit. The slot framework binds the navigation sources for
 * each record's `useTabInfo` reader.
 */
import type { LayoutState, TabId, TabRecord } from '@deepseek-ai/dsh-client-ui-dockkit';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SidebarRightNavigationParams } from './contract/params.ts';
import type { SidebarRightTabActions, SidebarRightTabNavigation } from './contract/slots.ts';
import type { SidebarRightOpenResourceOptions, SidebarRightOpenTabOptions } from './service.ts';
/**
 * The navigation face a tab's actions call back into, aimed at the session the
 * tab is in; nothing happens for a session whose store is not adopted.
 */
export interface SidebarRightNavigator {
    /** Open a resource in one session; see `ISidebarRight.openResource`. */
    openResourceIn(sessionId: SessionId, address: string, options?: SidebarRightOpenResourceOptions): void;
    /** Open a page type in one session; see `ISidebarRight.openTab`. */
    openTabIn(sessionId: SessionId, kind: string, options?: SidebarRightOpenTabOptions): void;
    /** Close a tab of one session. */
    closeIn(sessionId: SessionId, tabId: TabId): void;
}
/** `ctx.resources.pin`: hold an address's content open for as long as `signal` lives. */
export type PinResource = (address: string, signal: AbortSignal) => void;
/** What one open tab record holds beyond its layout entry. */
export interface TabOccurrence {
    readonly sessionId: SessionId;
    readonly tabId: TabId;
    /** Aborted when the record disappears or this package unloads. */
    readonly signal: AbortSignal;
    /** The latest navigation aimed at the record; `set` on every `navigate`. */
    readonly navigation: SnapshotStore<SidebarRightTabNavigation>;
    /** Stable for the occurrence's life, so a body may hold it. */
    readonly tabActions: SidebarRightTabActions;
}
/** Every session's occurrences. */
export declare class TabDomain {
    private readonly navigator;
    private readonly pin;
    private readonly bySession;
    /**
     * @param navigator - where tab actions go, aimed at the tab's session; the navigation controller.
     * @param pin - `ctx.resources.pin`, called once per occurrence at its first sync.
     */
    constructor(navigator: SidebarRightNavigator, pin: PinResource);
    /**
     * Reconcile one session's occurrences with its committed layout.
     *
     * Called by the seat after every commit, and only then: aborting a vanished
     * record runs the types' cleanup, which writes their stores.
     * @param sessionId - the session whose layout committed.
     * @param layout - that session's layout as committed.
     */
    sync(sessionId: SessionId, layout: LayoutState): void;
    /**
     * Read an occurrence created by navigation or committed-store reconciliation.
     * @param sessionId - the session the record is in.
     * @param tab - the record being drawn.
     * @returns its occurrence.
     * @throws when the record has not been reconciled or has disappeared.
     */
    occurrence(sessionId: SessionId, tab: Pick<TabRecord, 'id'>): TabOccurrence;
    /**
     * Record that an `open` settled on a tab.
     *
     * A record the layout has not yet shown the seat gets its occurrence here, so
     * the body's first render already carries the opener's `params`.
     * @param sessionId - the session opened into.
     * @param tabId - the tab the open settled on.
     * @param target - the address and the opener's params.
     */
    navigate(sessionId: SessionId, tabId: TabId, target: {
        address: string;
        params: SidebarRightNavigationParams;
    }): void;
    /** Abort every occurrence of every session; the package is unloading. */
    dispose(): void;
    private session;
    private hold;
}
//# sourceMappingURL=tab-domain.d.ts.map