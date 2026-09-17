import type { ReactElement } from 'react';
import type { DirectoryListing } from '@deepseek-ai/dsh-api-remotes/client';
import type { Translate } from '@deepseek-ai/dsh-client-locale/client';
import type { DirectoryFlowOwnerProps } from '@deepseek-ai/dsh-client-ui-workspace/client';
/** Injected face: the browse wire calls and copy the dialog drives (bound in apply's closure). */
export interface BrowseFlowInjected {
    /** List one directory level (absent path = the Host home directory); the signal aborts a superseded scan. */
    listDirectory: (path?: string, signal?: AbortSignal) => Promise<DirectoryListing>;
    /** Create one child directory under an existing parent. */
    createDirectory: (path: string, name: string) => Promise<string>;
    /** Localized dialog copy (this package's namespace). */
    t: Translate;
}
/**
 * Flow occupant: adapts the hole's owner conversation onto the browser
 * dialog — a confirmed directory is the picked path, dismissal is the
 * cancellation. Browse failures (unreadable targets, create conflicts) stay
 * inside the dialog's own alert surfaces, so the owner's `onError` arm is
 * never driven by this occupant.
 * @param props - owner conversation plus the injected browse face.
 * @returns the dialog element (renders nothing while closed).
 */
export declare function BrowseDirectoryFlow(props: DirectoryFlowOwnerProps & BrowseFlowInjected): ReactElement;
//# sourceMappingURL=flow.d.ts.map