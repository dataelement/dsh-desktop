import type { DirectoryListing } from '@deepseek-ai/dsh-api-remotes/client';
import type { Translate } from '@deepseek-ai/dsh-client-locale/client';
/** Owner-supplied browser props: browse calls, pick semantics, and copy. */
export interface DirectoryBrowserProps {
    /** Dialog visibility (owner-local; closed unmounts nothing but resets on reopen). */
    open: boolean;
    /**
     * List one directory level (absent path = the Host home directory); the
     * signal aborts a superseded scan on the wire. A rejection may carry
     * `{ rpcError: { message: string } }`; the dialog prefers that Host
     * business message over the ordinary Error text.
     */
    listDirectory: (path?: string, signal?: AbortSignal) => Promise<DirectoryListing>;
    /**
     * Create one child directory under an existing parent. A rejection may
     * carry `{ rpcError: { message: string } }`; the dialog prefers that Host
     * business message over the ordinary Error text.
     */
    createDirectory: (path: string, name: string) => Promise<string>;
    /** The operator confirmed a directory (the selection, else the listed level). */
    onOpen: (path: string) => void;
    /** Close without picking (mask, Escape, Cancel). */
    onClose: () => void;
    /** The owner's confirm is in flight: Open disables, the view freezes. */
    busy: boolean;
    /** Localized copy. */
    t: Translate;
}
/**
 * Render the directory-browser dialog.
 * @param props - owner-controlled browser props.
 * @returns the dialog element (null while closed, via Modal).
 */
export declare function DirectoryBrowser({ open, listDirectory, createDirectory, onOpen, onClose, busy, t }: DirectoryBrowserProps): import("react").JSX.Element | null;
//# sourceMappingURL=DirectoryBrowser.d.ts.map