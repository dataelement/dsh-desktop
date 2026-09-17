/**
 * The tree's asynchronous half: listing directories into the store.
 *
 * The component never awaits anything. It calls `start` / `load` / `toggle`, and
 * this face performs the listing and writes the outcome through the store's own
 * actions — the Slot-standard `inject` shape, so the session id is resolved by
 * the framework and the write set stays the store's.
 *
 * The listing itself is bound here to the Client Remote face: the tree keys
 * every level by absolute path and hands the endpoint that same absolute path;
 * the endpoint answers with the directory's workspace-relative path as well,
 * which the tree has no use for and drops.
 *
 * One level has one listing in force: asking for a level again — the reload
 * gesture, a directory reopened after a reset — retires the listing still in
 * flight for it, whose settlement then writes nothing. Cleanup rides the owner's
 * `signal`: a request is not made for a record that already ended, and when the
 * record goes away the bucket and the tab's listing bookkeeping are forgotten,
 * so no later settlement writes to it.
 */
import type { ClientRemote, RemoteResult } from '@deepseek-ai/dsh-api-remotes/client';
import type { BoundActions } from '@deepseek-ai/dsh-client-store';
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { DirLevel, createFilesStore } from './store.ts';
/**
 * One directory listing, bound to a Remote face.
 *
 * The session travels with the call because the endpoint resolves the workspace
 * root from it: the same path means different directories in different sessions.
 * A Remote call does not reject — the result carries the failure.
 */
export type ListWorkspaceDirectory = (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<RemoteResult<DirLevel>>;
/**
 * The slice of the Client Remote face this package calls: the `workspaceFiles`
 * namespace's `list`, exactly as the Host's generated client declares it.
 */
export type WorkspaceFilesListRemote = {
    readonly workspaceFiles: Pick<ClientRemote['workspaceFiles'], 'list'>;
};
/**
 * Bind the listing to one Remote face, keeping only what the tree stores.
 * @param remote - the Client Remote face carrying the `workspaceFiles` namespace.
 * @returns the listing the tree's face performs.
 */
export declare function createList(remote: WorkspaceFilesListRemote): ListWorkspaceDirectory;
/**
 * The absolute path of one child entry.
 *
 * Joined with `/` whatever the parent's separators: the Host resolves mixed
 * separators, and the tree only needs a stable key.
 * @param parent - absolute path of the listed directory.
 * @param name - the entry's basename.
 * @returns the child's absolute path.
 */
export declare function childPath(parent: string, name: string): string;
/** The tree's injected business face, as the body receives it. */
export interface FilesInjected {
    /**
     * Seed this tab's tree and list its root.
     * @param tabId - the tab being drawn.
     * @param root - absolute path of the workspace root.
     * @param signal - the tab record's lifetime.
     */
    readonly start: (tabId: TabId, root: string, signal: AbortSignal) => void;
    /**
     * List one directory into the store.
     * @param tabId - the tab being drawn.
     * @param path - absolute directory path.
     * @param signal - the tab record's lifetime.
     */
    readonly load: (tabId: TabId, path: string, signal: AbortSignal) => void;
    /**
     * Open or collapse one directory, listing it the first time it opens.
     * @param tabId - the tab being drawn.
     * @param path - absolute directory path.
     * @param loaded - whether this level already has state.
     * @param signal - the tab record's lifetime.
     */
    readonly toggle: (tabId: TabId, path: string, loaded: boolean, signal: AbortSignal) => void;
}
/**
 * Bind the tree's face to one directory listing.
 * @param list - the bound `workspaceFiles.list` call.
 * @returns the Slot `inject` factory: session and bound actions in, face out.
 */
export declare function filesFace(list: ListWorkspaceDirectory): (sessionId: SessionId, actions: BoundActions<ReturnType<typeof createFilesStore>>) => FilesInjected;
//# sourceMappingURL=face.d.ts.map