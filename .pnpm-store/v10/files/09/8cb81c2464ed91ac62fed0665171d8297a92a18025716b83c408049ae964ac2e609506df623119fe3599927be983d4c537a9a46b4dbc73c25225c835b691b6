/** Workspace archive and directory UI capability. */
import { Service, type Context } from '@deepseek-ai/cordis';
import type { ClientRemote, DirectoryListing, RemoteFailure } from '@deepseek-ai/dsh-api-remotes/client';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { IWorkspaces, WorkspaceId } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Workspace archive and directory operations consumed by Client UI domains. */
export interface UiWorkspace {
    /**
     * Select a Session and show its Conversation as one UI navigation action.
     * @param sessionId - listed or retained Session to display.
     */
    openSession(sessionId: SessionId): void;
    /**
     * Connect a Workspace and open its Session unless a later navigation supersedes it.
     * @param workspaceId - target Workspace.
     * @param beforeOpen - optional synchronous preparation for the selected Session, skipped after supersession.
     * @returns completion; a superseded request may create a Session but does not open it.
     */
    openWorkspace(workspaceId: WorkspaceId, beforeOpen?: (sessionId: SessionId) => void): Promise<void>;
    /**
     * Fork a Session and open the child unless a later navigation supersedes it.
     * @param sessionId - source Session.
     * @returns completion; a superseded request leaves its child available without selecting it.
     */
    forkSession(sessionId: SessionId): Promise<void>;
    /**
     * Resolve the reusable or newly created blank Session for a Workspace.
     * @param workspaceId - target Workspace.
     * @returns a Session already addressable through the Session Controller.
     */
    connectWorkspace(workspaceId: WorkspaceId): Promise<SessionId>;
    /**
     * Start a New Session flow and navigate to its Session.
     * @param workspaceId - explicit target; absent inherits the current or most recent Workspace.
     */
    startSession(workspaceId?: WorkspaceId): void;
    /**
     * Archive a Session and clear it when it is the current selection.
     * @param sessionId - Session to archive.
     */
    archiveSession(sessionId: SessionId): Promise<void>;
    /**
     * Open the Host-native directory picker.
     * @returns the selected directory, or null when cancelled.
     */
    pickDirectory(): Promise<string | null>;
    /**
     * List one Host directory level.
     * @param path - directory path; absent selects the Host home.
     * @param signal - cancellation for a superseded scan.
     * @returns directory entries and breadcrumb ancestry.
     */
    listDirectory(path?: string, signal?: AbortSignal): Promise<DirectoryListing>;
    /**
     * Create a child directory.
     * @param path - existing parent directory.
     * @param name - child directory name.
     * @returns created absolute path.
     */
    createDirectory(path: string, name: string): Promise<string>;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Cross-Controller Workspace navigation and directory UI capability. */
        uiWorkspace: UiWorkspace;
    }
}
/** Structured directory failure exposed to directory UI consumers. */
export declare class DirectoryBrowseError extends Error {
    readonly rpcError: RemoteFailure;
    readonly name = "DirectoryBrowseError";
    /** @param rpcError - Host directory business failure. */
    constructor(rpcError: RemoteFailure);
}
/** Implements Workspace archive and directory UI operations. */
declare class UiWorkspaceService extends Service implements UiWorkspace {
    private readonly directoryPicker;
    private readonly workspaces;
    private readonly sessions;
    private readonly connecting;
    private readonly lifetime;
    /**
     * @param ctx - Client root Context.
     * @param directoryPicker - the directory-picking Remote namespace.
     * @param workspaces - pure Workspace Controller.
     * @param sessions - pure Session Controller.
     */
    constructor(ctx: Context, directoryPicker: ClientRemote['directoryPicker'], workspaces: IWorkspaces, sessions: ISessions);
    connectWorkspace(workspaceId: WorkspaceId): Promise<SessionId>;
    openSession(sessionId: SessionId): void;
    openWorkspace(workspaceId: WorkspaceId, beforeOpen?: (sessionId: SessionId) => void): Promise<void>;
    forkSession(sessionId: SessionId): Promise<void>;
    startSession(workspaceId?: WorkspaceId): void;
    archiveSession(sessionId: SessionId): Promise<void>;
    pickDirectory(): Promise<string | null>;
    listDirectory(path?: string, signal?: AbortSignal): Promise<DirectoryListing>;
    createDirectory(path: string, name: string): Promise<string>;
    private watchNavigation;
    /** @returns true when an archived current selection was cleared. */
    private clearArchivedCurrent;
}
export { UiWorkspaceService };
//# sourceMappingURL=navigation.d.ts.map