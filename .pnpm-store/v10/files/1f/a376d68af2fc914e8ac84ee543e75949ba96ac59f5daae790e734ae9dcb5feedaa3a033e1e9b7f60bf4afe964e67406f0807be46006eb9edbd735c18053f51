/** Live Session queue, jobs, and projection state with reconnect baselines. */
import { Deque } from '@deepseek-ai/dsh-deque';
/** Owns the Host-wide Session control stream. */
export class SessionControlController {
    ctx;
    streams = new Set();
    /** @param ctx - Host context carrying live Agent, projection, and jobs services. */
    constructor(ctx) {
        this.ctx = ctx;
        ctx.sessionProjections.onChanged((session, key, value, seq) => {
            this.broadcast({
                type: 'projection',
                sessionId: session.id,
                key,
                value: value,
                seq,
            });
            if (key !== 'inbox')
                return;
            const agent = this.ctx.agents.get(session.id);
            if (agent?.session !== session)
                return;
            this.broadcast({
                type: 'queue',
                sessionId: session.id,
                items: queueItemsFromInbox(value),
            });
        });
        ctx.inject(['jobs'], (jobsCtx) => {
            jobsCtx.jobs.onJobsChanged((owner) => { this.onJobsChanged(owner); });
        });
        ctx.on('session/created', (session) => {
            const jobs = this.jobsFor(this.ctx.agents.get(session.id));
            if (jobs.length > 0)
                this.broadcast({ type: 'jobs', sessionId: session.id, jobs });
        });
        ctx.effect(() => () => {
            for (const stream of this.streams)
                stream.end();
            this.streams.clear();
        }, 'session-controller.control');
    }
    /**
     * Open one generation of Host-wide live control state.
     * @param signal - Remote stream cancellation.
     * @returns one complete baseline followed by live replacement frames.
     */
    async *control(signal) {
        signal.throwIfAborted();
        const queue = new ControlQueue();
        this.streams.add(queue);
        try {
            yield { type: 'baseline', value: this.baseline() };
            yield* queue.iterate(signal);
        }
        finally {
            this.streams.delete(queue);
            queue.end();
        }
    }
    baseline() {
        const sessions = this.ctx.sessions.list();
        const queues = Object.create(null);
        const jobs = Object.create(null);
        for (const session of sessions) {
            const agent = this.ctx.agents.get(session.id);
            queues[session.id] = agent?.session === session ? queueItems(agent) : [];
            jobs[session.id] = this.jobsFor(agent);
        }
        return {
            queues,
            jobs,
            projections: this.projectionBaseline(sessions),
        };
    }
    projectionBaseline(sessions) {
        const blocks = Object.create(null);
        for (const session of sessions) {
            const snapshot = this.ctx.sessionProjections.snapshot(session);
            blocks[session.id] = {
                asOfSeq: snapshot.asOfSeq,
                // Every projection definition validates its value before snapshot publication.
                values: snapshot.values,
            };
        }
        return blocks;
    }
    onJobsChanged(owner) {
        if (owner !== undefined) {
            this.broadcast({ type: 'jobs', sessionId: owner.id, jobs: this.jobsFor(owner) });
            return;
        }
        for (const session of this.ctx.sessions.list()) {
            this.broadcast({
                type: 'jobs',
                sessionId: session.id,
                jobs: this.jobsFor(this.ctx.agents.get(session.id)),
            });
        }
    }
    jobsFor(agent) {
        const jobs = this.ctx.get('jobs');
        return jobs === undefined ? [] : jobs.list(agent).map(jobView);
    }
    broadcast(frame) {
        for (const stream of this.streams)
            stream.push(frame);
    }
}
class ControlQueue {
    buffer = new Deque();
    wake;
    done = false;
    push(frame) {
        if (this.done)
            return;
        this.buffer.pushBack(frame);
        const wake = this.wake;
        this.wake = undefined;
        wake?.();
    }
    end() {
        if (this.done)
            return;
        this.done = true;
        const wake = this.wake;
        this.wake = undefined;
        wake?.();
    }
    async *iterate(signal) {
        const onAbort = () => { this.end(); };
        signal.addEventListener('abort', onAbort, { once: true });
        try {
            while (!this.done && !signal.aborted) {
                const frame = this.buffer.popFront();
                if (frame !== undefined) {
                    yield frame;
                    continue;
                }
                await new Promise((resolve) => { this.wake = resolve; });
            }
            while (this.buffer.size > 0 && !signal.aborted)
                yield this.buffer.popFront();
        }
        finally {
            signal.removeEventListener('abort', onAbort);
            this.end();
        }
    }
}
function queueItems(agent) {
    return queueItemsFromInbox({
        'next-turn': agent.inbox.nextTurn,
        'next-step': agent.inbox.nextStep,
    });
}
function queueItemsFromInbox(inbox) {
    return [
        ...inbox['next-turn'].map(message => ({
            id: message.id,
            placement: 'queued',
            ...promptRpcId(message),
            message: { id: message.id, content: message.content },
        })),
        ...inbox['next-step'].map(message => ({
            id: message.id,
            placement: message.source.kind === 'user' ? 'steering' : 'context',
            ...promptRpcId(message),
            message: { id: message.id, content: message.content },
        })),
    ];
}
/** Prompt-RPC identity carried by a browser-submitted message's user source. */
function promptRpcId(message) {
    const source = message.source;
    return source.kind === 'user' && 'rpcId' in source ? { rpcId: source.rpcId } : {};
}
function jobView(job) {
    return {
        id: job.id,
        kind: job.kind,
        label: job.label,
        status: job.status,
        ...(job.detail === undefined ? {} : { detail: job.detail }),
        startedAt: job.startedAt,
        ...(job.finishedAt === undefined ? {} : { finishedAt: job.finishedAt }),
    };
}
//# sourceMappingURL=control.js.map