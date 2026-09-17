/** React-free Client Workspace service and command facade. */
import { Service } from '@deepseek-ai/cordis';
/** Structured create failure for callers that distinguish Host business errors. */
export class WorkspaceCreateError extends Error {
    rpcError;
    name = 'WorkspaceCreateError';
    /** @param rpcError - Host business or folded carrier failure. */
    constructor(rpcError) {
        super(`workspace create failed: ${rpcError.code}: ${rpcError.message}`);
        this.rpcError = rpcError;
    }
}
/** Owns the bare Workspace snapshot and Workspace-only commands. */
export class WorkspaceController extends Service {
    model;
    list;
    /**
     * @param ctx - Client root Context.
     * @param model - Remote-backed Workspace state model.
     */
    constructor(ctx, model) {
        super(ctx, 'workspaces');
        this.model = model;
        this.list = model;
    }
    async create(input) {
        const result = await this.model.create(input);
        if (!result.ok)
            throw new WorkspaceCreateError(result.error);
        return result.value.workspace;
    }
    async rename(workspaceId, title) {
        const result = await this.model.rename(workspaceId, title);
        if (!result.ok)
            throw commandError('rename', result.error);
        return result.value.workspace;
    }
    async delete(workspaceId) {
        const result = await this.model.delete(workspaceId);
        if (!result.ok)
            throw commandError('delete', result.error);
    }
    async insertBefore(workspaceId, beforeWorkspaceId) {
        const result = await this.model.insertBefore(workspaceId, beforeWorkspaceId);
        if (!result.ok)
            throw commandError('reorder', result.error);
    }
    async archiveSession(sessionId) {
        const result = await this.model.archiveSession(sessionId);
        if (!result.ok)
            throw commandError('session archive', result.error);
    }
    async insertSessionBefore(workspaceId, sessionId, beforeSessionId) {
        const result = await this.model.insertSessionBefore(workspaceId, sessionId, beforeSessionId);
        if (!result.ok)
            throw commandError('move', result.error);
        return result.value.workspace;
    }
}
function commandError(operation, failure) {
    return new Error(`workspace ${operation} failed: ${failure.code}: ${failure.message}`);
}
//# sourceMappingURL=service.js.map