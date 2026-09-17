import type { ReactNode } from 'react';
import type { RemoteFailure } from '@deepseek-ai/dsh-api-remotes/client';
import type { PropsLocale, PropsRuntime, PropsStore, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { WorkspaceDirectoryEntry } from '@deepseek-ai/dsh-api-workspace-files/types';
import type { FilesInjected } from './face.ts';
import type { createFilesStore } from './store.ts';
/** The body's composed props: the tab it draws, its store, its face, and its copy. */
export type FilesBodyProps = PropsRuntime<'sidebar.right.pane.tab'> & PropsStore<ReturnType<typeof createFilesStore>> & FilesInjected & PropsLocale<'sidebarFiles'>;
/**
 * Order one level's entries for display: directories first, then everything
 * else, each group by name. The endpoint's order is a listing fact; this is the
 * reader's.
 * @param entries - the listing as the endpoint returned it.
 * @returns a new array, directories first, then by name within each group.
 */
export declare function orderEntries(entries: readonly WorkspaceDirectoryEntry[]): WorkspaceDirectoryEntry[];
/**
 * Say why a directory could not be listed, in terms of the directory.
 * @param t - namespace-bound translate.
 * @param failure - the settled Remote failure.
 * @returns the line to show under the directory.
 */
export declare function failureLine(t: TranslateNS<'sidebarFiles'>, failure: RemoteFailure): string;
/** The file tree's body: the workspace root and whatever the reader has opened under it. */
export declare function FilesBody({ useTabInfo, sessionId, useSessions, useStore, actions, start, load, toggle, t, }: FilesBodyProps): ReactNode;
//# sourceMappingURL=FilesBody.d.ts.map