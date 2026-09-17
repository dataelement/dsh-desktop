/** Host Workspace Remote owner: explicit commands and reconnect-safe state. */
import { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { WorkspaceArchiveSessionRequest, WorkspaceArchiveValue, WorkspaceCreateRequest, WorkspaceCreateValue, WorkspaceDeleteRequest, WorkspaceDeleteValue, WorkspaceFollowFrame, WorkspaceInsertBeforeRequest, WorkspaceInsertSessionBeforeRequest, WorkspaceOrderValue, WorkspaceRenameRequest, WorkspaceValue } from './types.ts';
export type * from './types.ts';
export { DirectoryPickerController } from './directory-picker.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host Workspace business API and Remote namespace owner. */
        workspaceController: WorkspaceController;
    }
}
/** Host service backing the generated `ctx.remote.workspace` namespace. */
export declare class WorkspaceController extends TypertRemoteService {
    static inject: string[];
    private readonly commands;
    private readonly feed;
    /** @param ctx - Host context containing the Workspace registry. */
    constructor(ctx: Context);
    /**
     * Create or idempotently resolve one Workspace over an existing directory.
     * @param request - directory path to register.
     * @returns the Workspace and whether this call created it.
     */
    create(request: WorkspaceCreateRequest): Promise<WorkspaceCreateValue>;
    /**
     * Rename one Workspace to a unique non-blank title.
     * @param request - Workspace identity and proposed title.
     * @returns the updated Workspace projection.
     */
    rename(request: WorkspaceRenameRequest): Promise<WorkspaceValue>;
    /**
     * Remove one Workspace registration while retaining files and Sessions.
     * @param request - Workspace identity to remove.
     * @returns deletion confirmation.
     */
    delete(request: WorkspaceDeleteRequest): Promise<WorkspaceDeleteValue>;
    /**
     * Move one Workspace within the registry display order.
     * @param request - moved Workspace and optional anchor.
     * @returns the complete resulting Workspace order.
     */
    insertBefore(request: WorkspaceInsertBeforeRequest): Promise<WorkspaceOrderValue>;
    /**
     * Move one accounted Session within a Workspace.
     * @param request - Workspace, Session, and optional anchor identities.
     * @returns the updated Workspace projection.
     */
    insertSessionBefore(request: WorkspaceInsertSessionBeforeRequest): Promise<WorkspaceValue>;
    /**
     * Hide one known Session from Workspace grouping surfaces.
     * @param request - Session identity to archive.
     * @returns the complete resulting archive set.
     */
    archiveSession(request: WorkspaceArchiveSessionRequest): Promise<WorkspaceArchiveValue>;
    /**
     * Stream a complete Workspace baseline followed by ordered increments.
     * @param signal - generation cancellation.
     * @returns baseline followed by ordered Workspace increments.
     */
    follow(signal: AbortSignal): AsyncIterable<WorkspaceFollowFrame>;
}
export default WorkspaceController;
//# sourceMappingURL=index.d.ts.map