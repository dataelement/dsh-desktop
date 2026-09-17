/** Reconnect-safe Workspace baseline and increment producer. */
import type { Context } from '@deepseek-ai/cordis';
import type { Workspace } from '@deepseek-ai/dsh-workspace';
import type { WorkspaceBaseline, WorkspaceFollowFrame, WorkspaceView } from './types.ts';
/**
 * Project one authoritative Workspace entity into its Remote value.
 * @param workspace - authoritative registry entity.
 * @returns detached Workspace projection for Remote consumers.
 */
export declare function workspaceView(workspace: Workspace): WorkspaceView;
/** Owns Workspace domain observation and all active follow generations. */
export declare class WorkspaceFeed {
    private readonly ctx;
    private readonly followers;
    private knownIds;
    private order;
    private archived;
    /** @param ctx - Host context containing the authoritative Workspace registry. */
    constructor(ctx: Context);
    /**
     * Read the complete current projection synchronously.
     * @returns all active Workspaces and archived Session identities.
     */
    baseline(): WorkspaceBaseline;
    /**
     * Open one generation beginning with a complete baseline.
     * @param signal - generation cancellation.
     * @returns baseline followed by ordered Workspace increments.
     */
    follow(signal: AbortSignal): AsyncIterable<WorkspaceFollowFrame>;
    private changed;
    private publish;
}
//# sourceMappingURL=feed.d.ts.map