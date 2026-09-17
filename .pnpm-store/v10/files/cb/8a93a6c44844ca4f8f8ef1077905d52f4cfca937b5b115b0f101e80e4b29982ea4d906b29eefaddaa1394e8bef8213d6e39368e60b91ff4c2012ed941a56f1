/**
 * Producer of the `changes` stream: every `fs/observed` emission whose target
 * lies inside a generation's workspace root becomes one frame of that
 * generation. Instrumented filesystem operations emit these observations; the
 * operating system is not watched.
 * Each generation acknowledges its observation queue and resolved workspace
 * root with `ready` before emitting any queued or live changes.
 */
import { Deque } from '@deepseek-ai/dsh-deque';
/** Owns `fs/observed` observation and every open `changes` generation. */
export class WorkspaceChangeFeed {
    ctx;
    followers = new Set();
    /** @param ctx - Host context carrying the filesystem the observations come from. */
    constructor(ctx) {
        this.ctx = ctx;
        ctx.on('fs/observed', (target, observation) => {
            for (const follower of this.followers)
                follower.push([target, observation]);
        });
        ctx.effect(() => () => {
            for (const follower of this.followers)
                follower.close();
            this.followers.clear();
        }, 'workspace-files.changes');
    }
    /**
     * Open one generation reporting observations inside `workspaceRoot`.
     * @param workspaceRoot - the session's workspace root path.
     * @param signal - generation cancellation.
     * @returns `ready` after observation is active and the root resolves, then
     *   observations made after the generation was first pulled, in emission order.
     */
    async *follow(workspaceRoot, signal) {
        signal.throwIfAborted();
        // Registered before the root resolves, so nothing observed while it does is
        // missed; the root only filters at drain time.
        const follower = new ChangeFollower();
        this.followers.add(follower);
        try {
            // Under the generation's signal, so a consumer leaving mid-resolve on a slow
            // backend releases the follower now rather than when the resolve settles;
            // a rejection the abort caused is the quiet end every other abort takes here.
            const root = await this.ctx.fs.resolve(workspaceRoot, { signal }).catch((error) => {
                if (signal.aborted)
                    return undefined;
                throw error;
            });
            if (root === undefined || signal.aborted || follower.isClosed)
                return;
            yield { kind: 'ready' };
            for await (const [target, observation] of follower.read(signal)) {
                if (!this.ctx.fs.contains(root, target))
                    continue;
                const absolutePath = this.ctx.fs.processPath(target);
                yield {
                    kind: 'change',
                    change: observation.kind === 'present'
                        ? { absolutePath, version: observation.version }
                        : { absolutePath, absent: true },
                };
            }
        }
        finally {
            this.followers.delete(follower);
            follower.close();
        }
    }
}
/** One generation's queue: observations wait here until its consumer pulls them. */
class ChangeFollower {
    queue = new Deque();
    wake;
    closed = false;
    /** Whether the generation was closed while its workspace root resolved. */
    get isClosed() {
        return this.closed;
    }
    push(observed) {
        this.queue.pushBack(observed);
        this.wake?.();
    }
    close() {
        this.closed = true;
        this.wake?.();
    }
    /** Drain until closed or aborted; anything still queued then is dropped with the generation. */
    async *read(signal) {
        const abort = () => { this.close(); };
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted)
            abort();
        try {
            while (!this.closed) {
                const observed = this.queue.popFront();
                if (observed !== undefined) {
                    yield observed;
                    continue;
                }
                await new Promise((resolve) => { this.wake = resolve; });
                this.wake = undefined;
            }
        }
        finally {
            signal.removeEventListener('abort', abort);
        }
    }
}
//# sourceMappingURL=changes.js.map