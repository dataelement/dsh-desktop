/** Reconnect-safe Workspace baseline and increment producer. */
import { Deque } from '@deepseek-ai/dsh-deque';
import { workspaceDomainState, workspaceRecord, WorkspaceId, } from '@deepseek-ai/dsh-workspace';
/**
 * Project one authoritative Workspace entity into its Remote value.
 * @param workspace - authoritative registry entity.
 * @returns detached Workspace projection for Remote consumers.
 */
export function workspaceView(workspace) {
    return {
        workspaceId: workspace.id,
        path: workspace.path,
        title: workspace.title,
        sessionIds: [...workspace.sessionIds],
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
    };
}
function changedWorkspaceView(workspaceId, value) {
    const record = workspaceRecord.parse(value);
    return {
        workspaceId: WorkspaceId(workspaceId),
        path: record.path,
        title: record.title,
        sessionIds: [...record.sessionIds],
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
}
/** Owns Workspace domain observation and all active follow generations. */
export class WorkspaceFeed {
    ctx;
    followers = new Set();
    knownIds;
    order;
    archived;
    /** @param ctx - Host context containing the authoritative Workspace registry. */
    constructor(ctx) {
        this.ctx = ctx;
        const baseline = ctx.workspaceRegistry.list();
        this.knownIds = new Set(baseline.map(workspace => String(workspace.id)));
        this.order = baseline.map(workspace => String(workspace.id));
        this.archived = ctx.workspaceRegistry.archivedSessionIds.map(String);
        ctx.on('domain/changed', (change) => { this.changed(change); });
        ctx.effect(() => () => {
            for (const follower of this.followers)
                follower.close();
            this.followers.clear();
        }, 'workspace-controller.feed');
    }
    /**
     * Read the complete current projection synchronously.
     * @returns all active Workspaces and archived Session identities.
     */
    baseline() {
        return {
            items: this.ctx.workspaceRegistry.list().map(workspaceView),
            archivedSessionIds: [...this.ctx.workspaceRegistry.archivedSessionIds],
        };
    }
    /**
     * Open one generation beginning with a complete baseline.
     * @param signal - generation cancellation.
     * @returns baseline followed by ordered Workspace increments.
     */
    async *follow(signal) {
        signal.throwIfAborted();
        const follower = new WorkspaceFollower();
        this.followers.add(follower);
        try {
            yield { type: 'baseline', value: this.baseline() };
            yield* follower.read(signal);
        }
        finally {
            this.followers.delete(follower);
            follower.close();
        }
    }
    changed(change) {
        if (change.domain !== 'workspace')
            return;
        if (change.table === '') {
            if (change.operation !== 'put')
                return;
            const state = workspaceDomainState.parse(change.value);
            const nextOrder = state.workspaceIds.map(String);
            const orderChanged = !sameStrings(this.order, nextOrder);
            for (const id of state.workspaceIds) {
                if (this.knownIds.has(id))
                    continue;
                const workspace = this.ctx.workspaceRegistry.get(id);
                if (workspace === undefined) {
                    throw new Error(`committed Workspace registry references missing Workspace "${id}"`);
                }
                this.knownIds.add(id);
                this.publish({ type: 'upsert', workspace: workspaceView(workspace) });
            }
            this.order = nextOrder;
            if (orderChanged)
                this.publish({ type: 'order', workspaceIds: [...state.workspaceIds] });
            const nextArchived = state.archivedSessionIds.map(String);
            if (!sameStrings(this.archived, nextArchived)) {
                this.archived = nextArchived;
                this.publish({ type: 'archived', archivedSessionIds: [...state.archivedSessionIds] });
            }
            return;
        }
        if (change.table !== 'workspaces')
            return;
        if (change.operation === 'deleted') {
            if (!this.knownIds.delete(change.key))
                return;
            this.publish({ type: 'remove', workspaceId: WorkspaceId(change.key) });
            return;
        }
        if (!this.knownIds.has(change.key))
            return;
        this.publish({
            type: 'upsert',
            workspace: changedWorkspaceView(change.key, change.value),
        });
    }
    publish(frame) {
        for (const follower of this.followers)
            follower.push(frame);
    }
}
function sameStrings(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
class WorkspaceFollower {
    frames = new Deque();
    waiting;
    closed = false;
    push(frame) {
        /* v8 ignore next -- closed followers are removed before later publication can reach them. */
        if (this.closed)
            return;
        this.frames.pushBack(frame);
        this.waiting?.();
    }
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.waiting?.();
    }
    async *read(signal) {
        while (!this.closed && !signal.aborted) {
            const frame = this.frames.popFront();
            if (frame !== undefined) {
                yield frame;
                continue;
            }
            await this.wait(signal);
        }
    }
    wait(signal) {
        return new Promise((resolve) => {
            const finish = () => {
                signal.removeEventListener('abort', finish);
                /* v8 ignore next -- one read owns the sole installed wait callback. */
                if (this.waiting === finish)
                    this.waiting = undefined;
                resolve();
            };
            this.waiting = finish;
            signal.addEventListener('abort', finish, { once: true });
            /* v8 ignore next -- native signals and the private queue cannot change during this synchronous setup. */
            if (signal.aborted || this.closed || this.frames.size > 0)
                finish();
        });
    }
}
//# sourceMappingURL=feed.js.map