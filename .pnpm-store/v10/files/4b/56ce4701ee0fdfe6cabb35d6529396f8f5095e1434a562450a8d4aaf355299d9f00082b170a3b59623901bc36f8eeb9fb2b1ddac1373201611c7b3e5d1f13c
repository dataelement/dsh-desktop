/**
 * The preview's own state: the pages it has read, and how the reader views them.
 *
 * The `file` resource carries metadata only, so the text is this type's to fetch
 * and keep — page by page, keyed by the 1-based line each page starts at. The
 * view state (scroll offset, wrap, the navigation already answered) must outlive
 * the body: a tab switched away from unmounts its body and must come back where
 * it was rather than re-read or jump to its opening line again. Bucketed by tab
 * id because two tabs of one file scroll independently.
 *
 * A bucket lives as long as its tab record: the face's first read of a tab arms
 * one listener on the owner's `signal` that forgets the bucket when the record
 * ends, and a tab that never read has no bucket to forget.
 */
import type { RemoteFailure } from '@deepseek-ai/dsh-api-remotes/client';
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit';
import type { WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types';
import type { DocumentFileBytes } from './rpc.ts';
import type { DocumentLoadMode } from './document/registry.ts';
/**
 * One page as the store keeps it: its text and the Host's line count, which
 * tells a page past the file's last line (`lines: 0`) from a page holding one
 * empty line (`lines: 1`, `text: ''`).
 */
export interface TextPage {
    readonly text: string;
    readonly lines: number;
}
/** One tab's pages and view. */
export interface TextTabState {
    /** Explicit viewer choice for this tab; absence follows automatic matching. */
    rendererId?: string;
    /** Current display-loading mode; absent before the first read. */
    mode?: DocumentLoadMode;
    /** Full byte result used by complete-file renderers. */
    complete?: DocumentFileBytes;
    /** The file version the loaded pages belong to; absent before the first page. */
    version: string | undefined;
    /** Metadata version observed when this tab began its current read generation. */
    observedVersion: string | undefined;
    /** Pages by the 1-based line each starts at. */
    pages: Record<number, TextPage>;
    /** Whether the last loaded page reached the end of the file. */
    eof: boolean;
    /** A page read is in flight. */
    loading: boolean;
    /** Why the last page read failed; cleared by the next page. */
    failure: RemoteFailure | undefined;
    /** Scroll offset of the body, in px. */
    scrollTop: number;
    /** Whether long lines wrap instead of scrolling horizontally; on until the reader turns it off. */
    wrap: boolean;
    /** The `navigation.revision` the body already answered; absent before the first. */
    revision: number | undefined;
}
/** Every tab's state, keyed by tab id. */
export interface TextState {
    byTab: Record<TabId, TextTabState>;
}
/**
 * A tab's state before it reads, scrolls, toggles, or answers anything.
 * @returns the empty bucket.
 */
export declare function fresh(): TextTabState;
/** The preview store's write set; every action names the tab it writes. */
type TextActions = {
    selected: (draft: TextState, tabId: TabId, rendererId: string | undefined) => void;
    loading: (draft: TextState, tabId: TabId, mode?: DocumentLoadMode, observedVersion?: string) => void;
    complete: (draft: TextState, tabId: TabId, file: DocumentFileBytes) => void;
    page: (draft: TextState, tabId: TabId, page: WorkspaceFileText) => void;
    failed: (draft: TextState, tabId: TabId, failure: RemoteFailure) => void;
    reset: (draft: TextState, tabId: TabId) => void;
    scrolled: (draft: TextState, tabId: TabId, scrollTop: number) => void;
    toggledWrap: (draft: TextState, tabId: TabId) => void;
    navigated: (draft: TextState, tabId: TabId, revision: number) => void;
    forget: (draft: TextState, tabId: TabId) => void;
};
/**
 * Declare the preview's store.
 *
 * Constructed once in apply and shared by the body and the tools registrations,
 * which the slot runtime allows because both are session-scoped.
 * @returns the store handle to declare on both registrations.
 */
export declare function createTextStore(): EngineStoreHandle<TextState, TextActions>;
/** The store handle type both registrations declare. */
export type TextStore = ReturnType<typeof createTextStore>;
export {};
//# sourceMappingURL=store.d.ts.map