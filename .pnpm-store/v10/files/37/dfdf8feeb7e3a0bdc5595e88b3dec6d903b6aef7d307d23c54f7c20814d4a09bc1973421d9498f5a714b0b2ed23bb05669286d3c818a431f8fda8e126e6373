/**
 * Producer of the `changes` stream: every `fs/observed` emission whose target
 * lies inside a generation's workspace root becomes one frame of that
 * generation. Instrumented filesystem operations emit these observations; the
 * operating system is not watched.
 * Each generation acknowledges its observation queue and resolved workspace
 * root with `ready` before emitting any queued or live changes.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { WorkspaceFileWatchFrame } from './types.ts';
/** Owns `fs/observed` observation and every open `changes` generation. */
export declare class WorkspaceChangeFeed {
    private readonly ctx;
    private readonly followers;
    /** @param ctx - Host context carrying the filesystem the observations come from. */
    constructor(ctx: Context);
    /**
     * Open one generation reporting observations inside `workspaceRoot`.
     * @param workspaceRoot - the session's workspace root path.
     * @param signal - generation cancellation.
     * @returns `ready` after observation is active and the root resolves, then
     *   observations made after the generation was first pulled, in emission order.
     */
    follow(workspaceRoot: string, signal: AbortSignal): AsyncIterable<WorkspaceFileWatchFrame>;
}
//# sourceMappingURL=changes.d.ts.map