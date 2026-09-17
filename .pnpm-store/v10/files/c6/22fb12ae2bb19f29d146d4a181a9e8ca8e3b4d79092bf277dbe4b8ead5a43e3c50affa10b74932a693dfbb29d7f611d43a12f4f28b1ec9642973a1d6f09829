/** Workspace command implementation and stable Remote failure mapping. */
import type { Context } from '@deepseek-ai/cordis';
import type { WorkspaceArchiveSessionRequest, WorkspaceArchiveValue, WorkspaceCreateRequest, WorkspaceCreateValue, WorkspaceDeleteRequest, WorkspaceDeleteValue, WorkspaceInsertBeforeRequest, WorkspaceInsertSessionBeforeRequest, WorkspaceOrderValue, WorkspaceRenameRequest, WorkspaceValue } from './types.ts';
/** Implements Workspace mutations against the authoritative registry. */
export declare class WorkspaceCommands {
    private readonly ctx;
    private operationTail;
    /** @param ctx - Host context containing the Workspace registry. */
    constructor(ctx: Context);
    /**
     * Create or resolve one Workspace over an existing directory.
     * @param request - directory path to register.
     * @returns the Workspace and whether this call created it.
     */
    create(request: WorkspaceCreateRequest): Promise<WorkspaceCreateValue>;
    /**
     * Rename one Workspace after serializing title ownership checks.
     * @param request - Workspace identity and proposed title.
     * @returns the updated Workspace projection.
     */
    rename(request: WorkspaceRenameRequest): Promise<WorkspaceValue>;
    /**
     * Delete one Workspace registration without deleting its directory or Sessions.
     * @param request - Workspace identity to remove.
     * @returns deletion confirmation.
     */
    delete(request: WorkspaceDeleteRequest): Promise<WorkspaceDeleteValue>;
    /**
     * Move one Workspace within the durable registry order.
     * @param request - moved Workspace and optional anchor.
     * @returns the complete resulting Workspace order.
     */
    insertBefore(request: WorkspaceInsertBeforeRequest): Promise<WorkspaceOrderValue>;
    /**
     * Move one accounted Session within a Workspace's manual order.
     * @param request - Workspace, Session, and optional anchor identities.
     * @returns the updated Workspace projection.
     */
    insertSessionBefore(request: WorkspaceInsertSessionBeforeRequest): Promise<WorkspaceValue>;
    /**
     * Add one known Session to the registry-global archive set.
     * @param request - Session identity to archive.
     * @returns the complete resulting archive set.
     */
    archiveSession(request: WorkspaceArchiveSessionRequest): Promise<WorkspaceArchiveValue>;
    private requireWorkspace;
    private enqueue;
}
//# sourceMappingURL=commands.d.ts.map