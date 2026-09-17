/**
 * The file tree's view state: which directories are expanded, and what each
 * loaded level contains.
 *
 * The tree is not one resource. A directory listing per level, expanded lazily,
 * is state the type owns — so it lives in a Slot-standard exclusive store
 * (one instance per session), bucketed by tab id because two tabs of this kind
 * in one session expand independently.
 *
 * Writers run between `start` and `forget`: the owner's `signal` is what ends a
 * bucket's life, and the face stops dispatching once it aborts.
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import type { RemoteFailure } from '@deepseek-ai/dsh-api-remotes/client';
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit';
import type { WorkspaceDirectoryEntry } from '@deepseek-ai/dsh-api-workspace-files/types';
/**
 * One directory's contents, as one expanded level of the tree.
 *
 * The endpoint's listing also names the directory as a workspace-relative path;
 * the tree keys every level by absolute path instead, so the adapter drops it.
 */
export interface DirLevel {
    /** The directory's entries, in the endpoint's order. */
    readonly entries: readonly WorkspaceDirectoryEntry[];
    /** The listing hit the endpoint's entry cap, so entries are missing. */
    readonly truncated: boolean;
}
/** What one directory level is doing right now. */
export type LevelState = {
    readonly kind: 'loading';
} | {
    readonly kind: 'ready';
    readonly level: DirLevel;
} | {
    readonly kind: 'failed';
    readonly failure: RemoteFailure;
};
/**
 * One tab's tree: its root, the levels it has asked for, and what is open.
 *
 * Every path here is absolute: the root is the session's working directory as
 * the Host reports it, and a child is the parent joined with the entry name.
 */
export interface FilesTabState {
    /** Absolute path of the workspace root this tree is rooted at. */
    root: string;
    /** Level state by absolute directory path; a path absent here was never asked for. */
    levels: Record<string, LevelState>;
    /** Expanded absolute directory paths, root included. */
    expanded: string[];
}
/** Every tab's tree, keyed by tab id. */
export interface FilesState {
    byTab: Record<TabId, FilesTabState>;
}
/** The tree store's write set; every action names the tab it writes. */
type FilesActions = {
    start: (draft: FilesState, tabId: TabId, root: string) => void;
    loading: (draft: FilesState, tabId: TabId, path: string) => void;
    loaded: (draft: FilesState, tabId: TabId, path: string, level: DirLevel) => void;
    failed: (draft: FilesState, tabId: TabId, path: string, failure: RemoteFailure) => void;
    toggled: (draft: FilesState, tabId: TabId, path: string) => void;
    reset: (draft: FilesState, tabId: TabId) => void;
    forget: (draft: FilesState, tabId: TabId) => void;
};
/**
 * Declare the file tree's store.
 *
 * A factory rather than a shared handle: the registration declares it as an
 * exclusive store, so the framework mints one instance per session.
 * @returns the store handle to declare on the registration.
 */
export declare function createFilesStore(): EngineStoreHandle<FilesState, FilesActions>;
export {};
//# sourceMappingURL=store.d.ts.map