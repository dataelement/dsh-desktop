/** Workspace-specific adapter for the Gateway-owned snapshot stream lifecycle. */
import type { Context } from '@deepseek-ai/cordis';
import { RemoteSnapshotStream, RemoteStreamCarrierError, type ClientRemote } from '@deepseek-ai/dsh-api-gateway/client';
import type { WorkspaceFollowFrame, WorkspaceFollowIncrement } from '../types.ts';
import type { WorkspaceFollowSink } from './model.ts';
export { ClientWorkspaceModel } from './model.ts';
export type { WorkspaceFollowSink, WorkspaceListPhase, WorkspaceRemote, WorkspaceSnapshot, } from './model.ts';
export { WorkspaceController, WorkspaceCreateError } from './service.ts';
export type { IWorkspaces, WorkspaceSource } from './service.ts';
export type { WorkspaceId, WorkspaceView } from '../types.ts';
type WorkspaceBaselineFrame = Extract<WorkspaceFollowFrame, {
    type: 'baseline';
}>;
/** Gateway-owned snapshot stream configured for Workspace state. */
export type WorkspaceStateStream = RemoteSnapshotStream<WorkspaceBaselineFrame, WorkspaceFollowIncrement>;
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** React-free Client Workspace state and commands. */
        workspaces: import('./service.ts').IWorkspaces;
    }
}
/** Required Client Remote services. */
export declare const inject: string[];
/**
 * Install Client Workspace state, commands, and reconnecting follow control.
 * @param ctx - Client root Context.
 */
export declare function apply(ctx: Context): void;
/** Domain sinks used by the Workspace state stream. */
export interface WorkspaceStateStreamOptions {
    /** Destinations for decoded Workspace state operations. */
    readonly accept: WorkspaceFollowSink;
    /** Observe a retryable carrier loss before reconnection. */
    readonly carrierFailed?: (error: RemoteStreamCarrierError) => void;
    /** Publish a terminal business or protocol failure. */
    readonly failed: (error: unknown) => void;
}
/**
 * Create the reconnecting Workspace state stream.
 * @param remote - Client Remote face carrying the Workspace namespace and the stream factory.
 * @param options - Workspace state destinations.
 * @returns an unstarted stream owned by the Client Workspace runtime.
 */
export declare function createWorkspaceStateStream(remote: ClientRemote, options: WorkspaceStateStreamOptions): WorkspaceStateStream;
//# sourceMappingURL=index.d.ts.map