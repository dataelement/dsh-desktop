/** Workspace-specific adapter for the Gateway-owned snapshot stream lifecycle. */
import { RemoteSnapshotStream, RemoteStreamCarrierError, } from '@deepseek-ai/dsh-api-gateway/client';
import { ClientWorkspaceModel } from "./model.js";
import { WorkspaceController } from "./service.js";
export { ClientWorkspaceModel } from "./model.js";
export { WorkspaceController, WorkspaceCreateError } from "./service.js";
/** Required Client Remote services. */
export const inject = ['remote', 'remote.workspace'];
/**
 * Install Client Workspace state, commands, and reconnecting follow control.
 * @param ctx - Client root Context.
 */
export function apply(ctx) {
    const model = new ClientWorkspaceModel(ctx.remote.workspace);
    new WorkspaceController(ctx, model);
    const control = createWorkspaceStateStream(ctx.remote, {
        accept: model,
        carrierFailed: () => { model.handleCarrierFailure(); },
        failed: (error) => { model.handleStreamFailure(error); },
    });
    control.start();
    ctx.effect(() => async () => { await control.dispose(); }, 'workspace-controller.client.control');
}
/**
 * Create the reconnecting Workspace state stream.
 * @param remote - Client Remote face carrying the Workspace namespace and the stream factory.
 * @param options - Workspace state destinations.
 * @returns an unstarted stream owned by the Client Workspace runtime.
 */
export function createWorkspaceStateStream(remote, options) {
    const stream = remote.$stream({
        name: 'Workspace state stream',
        open: signal => remote.workspace.follow(signal),
        ended: accepted => accepted
            ? new RemoteStreamCarrierError('Workspace state stream ended without a terminal result')
            : new Error('Workspace state stream ended before its opening snapshot'),
        ...(options.carrierFailed === undefined ? {} : { carrierFailed: options.carrierFailed }),
    });
    return new RemoteSnapshotStream(stream, {
        name: 'Workspace state stream',
        isSnapshot: (frame) => frame.type === 'baseline',
        replace: (frame) => { options.accept.replaceBaseline(frame.value); },
        update: (frame) => { acceptIncrement(options.accept, frame); },
        failed: options.failed,
    });
}
function acceptIncrement(accept, frame) {
    switch (frame.type) {
        case 'upsert':
            accept.upsertView(frame.workspace);
            return;
        case 'remove':
            accept.removeView(frame.workspaceId);
            return;
        case 'order':
            accept.replaceOrder(frame.workspaceIds);
            return;
        case 'archived':
            accept.replaceArchived(frame.archivedSessionIds);
            return;
        /* v8 ignore next -- the generated Remote codec validates this closed union */
        default:
            return assertNever(frame);
    }
}
/* v8 ignore next 3 -- closed-union backstop after generated Remote validation */
function assertNever(value) {
    throw new Error(`unreachable Workspace increment: ${JSON.stringify(value)}`);
}
//# sourceMappingURL=index.js.map