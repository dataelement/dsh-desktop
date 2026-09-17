/** Browser download state shared by the Session Header button and `/export`. */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Download phases presented by the shared modal. */
export type SessionLogDownloadStatus = 'downloading' | 'success' | 'error';
/** One Session's current download-dialog state. */
export interface SessionLogDownloadEntry {
    readonly open: boolean;
    readonly status: SessionLogDownloadStatus;
    readonly error: string | null;
}
/** Download states keyed by the Session whose Header owns the dialog. */
export interface SessionLogDownloadState {
    bySession: Record<string, SessionLogDownloadEntry | undefined>;
}
type Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
type Save = (url: string, filename: string) => void;
/**
 * Collapse an untrusted Session id into the filename convention owned by the host endpoint.
 * @param sessionId - Session whose archive is downloaded.
 * @returns one safe browser download filename.
 */
export declare function sessionLogZipFilename(sessionId: SessionId): string;
/**
 * Hand a Host download URL to the browser download manager.
 * @param url - same-origin Host download URL.
 * @param filename - browser download filename.
 */
export declare function downloadUrl(url: string, filename: string): void;
/** Owns one in-flight browser download per Session and publishes modal state. */
export declare class SessionLogDownloadController {
    private readonly fetcher;
    private readonly save;
    /** uSES-safe state source shared by every Session-scoped modal contribution. */
    readonly store: SnapshotStore<SessionLogDownloadState>;
    private readonly active;
    private disposed;
    /**
     * @param fetcher - HTTP carrier used to read the host-streamed ZIP.
     * @param save - browser save operation.
     */
    constructor(fetcher?: Fetch, save?: Save);
    /**
     * Download one Session tree; concurrent gestures for the same Session share one operation.
     * @param sessionId - root Session whose ZIP includes descendants and attachments.
     * @returns after the browser save starts, an error state is published, or a late post-disposal request is ignored.
     */
    download(sessionId: SessionId): Promise<void>;
    /**
     * Close one Session's dialog without cancelling an in-flight browser download.
     * @param sessionId - Session whose modal closes.
     */
    dismiss(sessionId: SessionId): void;
    /**
     * Abort active fetches and reach quiescence.
     * @returns after every active operation settles.
     */
    dispose(): Promise<void>;
    private run;
    private publish;
}
export {};
//# sourceMappingURL=controller.d.ts.map