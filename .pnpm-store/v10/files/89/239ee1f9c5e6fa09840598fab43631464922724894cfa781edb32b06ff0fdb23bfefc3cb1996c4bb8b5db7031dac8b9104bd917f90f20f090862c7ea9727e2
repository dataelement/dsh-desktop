/** Client-side Workspace state model shared by Remote transport and UI projection. */
import type { RemoteFailure, RemoteResult, TypertClientRemote } from '@deepseek-ai/dsh-typert-protocol';
import type { WorkspaceArchiveSessionRequest, WorkspaceArchiveValue, WorkspaceBaseline, WorkspaceCreateRequest, WorkspaceCreateValue, WorkspaceDeleteValue, WorkspaceInsertSessionBeforeRequest, WorkspaceOrderValue, WorkspaceValue, WorkspaceId, WorkspaceView } from '../types.ts';
/** Complete generated `ctx.remote.workspace` namespace. */
export type WorkspaceRemote = TypertClientRemote['workspace'];
/** Monotone Workspace-list arrival lifecycle. */
export type WorkspaceListPhase = 'pending' | 'ready';
/** Immutable Client Workspace state. */
export interface WorkspaceSnapshot {
    readonly items: readonly WorkspaceView[];
    /** Complete registry-global archive set in Host order. */
    readonly archivedSessionIds: WorkspaceArchiveValue['archivedSessionIds'];
    readonly state: 'idle' | 'loading' | 'error';
    readonly phase: WorkspaceListPhase;
    readonly error: RemoteFailure | null;
}
/** State operations emitted by a decoded Workspace follow generation. */
export interface WorkspaceFollowSink {
    /** Replace all state from the generation baseline. */
    replaceBaseline(value: WorkspaceBaseline): void;
    /** Merge one Workspace row. */
    upsertView(workspace: WorkspaceView): void;
    /** Remove one Workspace row. */
    removeView(workspaceId: WorkspaceId): void;
    /** Replace the Host-confirmed Workspace order. */
    replaceOrder(workspaceIds: readonly WorkspaceId[]): void;
    /** Replace the complete archived Session set. */
    replaceArchived(sessionIds: WorkspaceArchiveValue['archivedSessionIds']): void;
}
/**
 * Owns the Client Workspace projection, mutation echoes, and stream/unary race resolution.
 */
export declare class ClientWorkspaceModel implements WorkspaceFollowSink {
    private readonly remote;
    private items;
    private archivedSessionIds;
    private state;
    private phase;
    private error;
    /** Latest local reorder request; only its unary echo may install order. */
    private orderRequestGeneration;
    /** Increments on stream orders so a later remote commit outranks an older unary echo. */
    private orderFrameGeneration;
    /** Last complete order accepted from a baseline, increment, or current unary echo. */
    private committedOrder;
    /** Host Workspace ids are never reused, so delayed data cannot resurrect a removed row. */
    private readonly removedIds;
    private readonly listeners;
    private snapshotCache;
    private snapshotDirty;
    private notificationPending;
    private notificationScheduled;
    private notificationGeneration;
    /** @param remote - generated Workspace Remote namespace. */
    constructor(remote: WorkspaceRemote);
    /**
     * Create or resolve a Workspace and merge the unary result immediately.
     * @param input - existing absolute path to adopt.
     * @returns generated Remote result.
     */
    create(input: WorkspaceCreateRequest): Promise<RemoteResult<WorkspaceCreateValue>>;
    /**
     * Rename a Workspace and merge the unary result immediately.
     * @param workspaceId - target Workspace.
     * @param title - new display title.
     * @returns generated Remote result.
     */
    rename(workspaceId: WorkspaceId, title: string): Promise<RemoteResult<WorkspaceValue>>;
    /**
     * Delete a Workspace and remove it from the local projection immediately.
     * @param workspaceId - target Workspace.
     * @returns generated Remote result.
     */
    delete(workspaceId: WorkspaceId): Promise<RemoteResult<WorkspaceDeleteValue>>;
    /**
     * Optimistically move a Workspace and reconcile the returned complete order.
     * @param workspaceId - Workspace to move.
     * @param beforeWorkspaceId - anchor Workspace; omitted appends.
     * @returns generated Remote result.
     */
    insertBefore(workspaceId: WorkspaceId, beforeWorkspaceId?: WorkspaceId): Promise<RemoteResult<WorkspaceOrderValue>>;
    /**
     * Move a Session within its Workspace and merge the returned row.
     * @param workspaceId - owning Workspace.
     * @param sessionId - accounted Session to move.
     * @param beforeSessionId - accounted anchor; omitted appends.
     * @returns generated Remote result.
     */
    insertSessionBefore(workspaceId: WorkspaceInsertSessionBeforeRequest['workspaceId'], sessionId: WorkspaceInsertSessionBeforeRequest['sessionId'], beforeSessionId?: WorkspaceInsertSessionBeforeRequest['beforeSessionId']): Promise<RemoteResult<WorkspaceValue>>;
    /**
     * Archive one Session and install the returned complete archive set.
     * @param sessionId - Session to archive.
     * @returns generated Remote result.
     */
    archiveSession(sessionId: WorkspaceArchiveSessionRequest['sessionId']): Promise<RemoteResult<WorkspaceArchiveValue>>;
    /**
     * Replace the projection from one complete stream-generation baseline.
     * @param baseline - complete Workspace and archive projection.
     */
    replaceBaseline(baseline: WorkspaceBaseline): void;
    /** Merge one decoded Workspace upsert from the current follow generation. */
    upsertView(workspace: WorkspaceView): void;
    /** Apply one decoded Workspace removal from the current follow generation. */
    removeView(workspaceId: WorkspaceId): void;
    /** Replace Host-confirmed order from the current follow generation. */
    replaceOrder(workspaceIds: readonly WorkspaceId[]): void;
    /**
     * Replace the archived Session set from the current follow generation.
     * @param archivedSessionIds - complete Host-confirmed archive set.
     */
    replaceArchived(archivedSessionIds: WorkspaceArchiveValue['archivedSessionIds']): void;
    /** Keep the last complete projection visible while a lost carrier reconnects. */
    handleCarrierFailure(): void;
    /**
     * Publish a non-retryable stream or protocol failure.
     * @param error - terminal stream failure.
     */
    handleStreamFailure(error: unknown): void;
    /**
     * Subscribe to Workspace state invalidation.
     * @param listener - invalidation callback.
     * @returns unsubscribe function.
     */
    subscribe(listener: () => void): () => void;
    /**
     * Read the cached state, rebuilding it first when necessary.
     * @returns the current stable Workspace list snapshot.
     */
    getSnapshot(): WorkspaceSnapshot;
    private buildSnapshot;
    private installArchived;
    private installOrder;
    private upsert;
    private remove;
    private installViews;
    private invalidate;
    private flush;
    private refreshSnapshot;
}
//# sourceMappingURL=model.d.ts.map