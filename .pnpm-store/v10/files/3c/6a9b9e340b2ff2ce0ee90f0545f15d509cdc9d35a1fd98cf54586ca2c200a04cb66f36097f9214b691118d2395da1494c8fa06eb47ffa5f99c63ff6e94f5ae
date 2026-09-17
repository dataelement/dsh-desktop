/** React-free Client Workspace service and command facade. */
import { Service, type Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { RemoteFailure } from '@deepseek-ai/dsh-typert-protocol';
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types';
import type { WorkspaceView } from '../types.ts';
import type { ClientWorkspaceModel, WorkspaceSnapshot } from './model.ts';
/** Structured create failure for callers that distinguish Host business errors. */
export declare class WorkspaceCreateError extends Error {
    readonly rpcError: RemoteFailure;
    readonly name = "WorkspaceCreateError";
    /** @param rpcError - Host business or folded carrier failure. */
    constructor(rpcError: RemoteFailure);
}
/** Bare observable source for the Workspace Controller snapshot. */
export interface WorkspaceSource {
    /** Read the identity-stable current snapshot. */
    getSnapshot(): WorkspaceSnapshot;
    /**
     * Subscribe to snapshot changes.
     * @param listener - invalidation callback.
     * @returns unsubscribe function.
     */
    subscribe(listener: () => void): () => void;
}
/** Workspace Controller's Client service face. */
export interface IWorkspaces {
    /** Host-authoritative Workspace rows, order, archive set, and follow lifecycle. */
    readonly list: WorkspaceSource;
    /**
     * Register an existing path as a Workspace.
     * @param input - Host create payload.
     * @returns the created or idempotently resolved Workspace.
     */
    create(input: {
        path: string;
    }): Promise<WorkspaceView>;
    /**
     * Rename a Workspace.
     * @param workspaceId - target Workspace.
     * @param title - new display title.
     * @returns the renamed Workspace.
     */
    rename(workspaceId: WorkspaceId, title: string): Promise<WorkspaceView>;
    /**
     * Delete a Workspace registration without deleting Sessions or files.
     * @param workspaceId - target Workspace.
     */
    delete(workspaceId: WorkspaceId): Promise<void>;
    /**
     * Move a Workspace within the Host registry order.
     * @param workspaceId - Workspace to move.
     * @param beforeWorkspaceId - anchor Workspace; omitted appends.
     */
    insertBefore(workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId): Promise<void>;
    /**
     * Archive a Session from Workspace grouping surfaces.
     * @param sessionId - Session to archive.
     */
    archiveSession(sessionId: SessionId): Promise<void>;
    /**
     * Move a Session within one Workspace account.
     * @param workspaceId - owning Workspace.
     * @param sessionId - Session to move.
     * @param beforeSessionId - anchor Session; omitted appends.
     * @returns the changed Workspace.
     */
    insertSessionBefore(workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId): Promise<WorkspaceView>;
}
/** Owns the bare Workspace snapshot and Workspace-only commands. */
export declare class WorkspaceController extends Service implements IWorkspaces {
    private readonly model;
    readonly list: WorkspaceSource;
    /**
     * @param ctx - Client root Context.
     * @param model - Remote-backed Workspace state model.
     */
    constructor(ctx: Context, model: ClientWorkspaceModel);
    create(input: {
        path: string;
    }): Promise<WorkspaceView>;
    rename(workspaceId: WorkspaceId, title: string): Promise<WorkspaceView>;
    delete(workspaceId: WorkspaceId): Promise<void>;
    insertBefore(workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId): Promise<void>;
    archiveSession(sessionId: SessionId): Promise<void>;
    insertSessionBefore(workspaceId: WorkspaceId, sessionId: SessionId, beforeSessionId?: SessionId): Promise<WorkspaceView>;
}
//# sourceMappingURL=service.d.ts.map