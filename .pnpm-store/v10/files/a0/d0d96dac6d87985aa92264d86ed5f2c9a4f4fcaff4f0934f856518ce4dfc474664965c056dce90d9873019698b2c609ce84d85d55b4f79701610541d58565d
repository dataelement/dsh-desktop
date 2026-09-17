/** Host BFF entry and Loader shell for the Remote contribution assembly. */
import { homedir } from 'node:os';
import { Deque } from '@deepseek-ai/dsh-deque';
import { carrierKeyOf } from '@deepseek-ai/dsh-scope';
import { isJsonValue } from '@deepseek-ai/dsh-util-values';
import { API_REMOTE_FORWARDED_EVENTS } from "./remote-events.js";
export { API_REMOTE_FORWARDED_EVENTS } from "./remote-events.js";
/** Required Host service: the Gateway owns the physical Remote stream mux. */
export const inject = ['typertGateway'];
/** Host plugin body registering this application's selected Cordis event source. */
export function apply(ctx) {
    ctx.effect(() => ctx.typertGateway.registerRemoteEvents(remoteEventSource(ctx), { home: homedir() }), 'api-remotes: forwarded Cordis event source');
}
/** Create the sole queue and listener set consumed by the registered Gateway. */
function remoteEventSource(ctx) {
    return (signal) => {
        const queue = new RemoteEventQueue();
        const disposers = API_REMOTE_FORWARDED_EVENTS.map(({ event, mode }) => {
            if (mode === 'emit') {
                return ctx.on(event, ((...args) => {
                    queue.push({ event, args: assertJsonArgs(event, args) });
                }));
            }
            return ctx.on(event, (function (request, next) {
                const carrierAgent = carrierKeyOf(this);
                if (carrierAgent === undefined)
                    return next();
                const agent = request.agent;
                if (agent === undefined || agent !== carrierAgent) {
                    throw new TypeError(`forwarded scoped event ${JSON.stringify(event)} must carry its Agent directly`);
                }
                return forwardWaterfall(queue, event, request, { value: agent.ctx, subject: agent, agentId: agent.id }, next);
            }));
        });
        return queue.iterate(signal, () => {
            for (const dispose of disposers)
                dispose();
        });
    };
}
/** One pull-driven queue bridging synchronous Cordis listeners to an AsyncIterable. */
class RemoteEventQueue {
    buffer = new Deque();
    waiter;
    done = false;
    push(frame) {
        if (this.done)
            return false;
        this.buffer.pushBack(frame);
        this.waiter?.();
        return true;
    }
    end(reason) {
        if (this.done)
            return;
        this.done = true;
        while (this.buffer.size > 0) {
            const dispatch = this.buffer.popFront();
            if ('context' in dispatch)
                dispatch.reject(reason);
        }
        this.waiter?.();
    }
    async *iterate(signal, cleanup) {
        const abort = () => { this.end(remoteEventSourceEndReason(signal)); };
        signal.addEventListener('abort', abort, { once: true });
        try {
            while (true) {
                if (this.done || signal.aborted)
                    return;
                while (this.buffer.size > 0)
                    yield this.buffer.popFront();
                await new Promise((resolve) => { this.waiter = resolve; });
                this.waiter = undefined;
            }
        }
        finally {
            signal.removeEventListener('abort', abort);
            this.end(remoteEventSourceEndReason(signal));
            cleanup();
        }
    }
}
/**
 * Normalize an event-source shutdown for pending Host waterfalls.
 * @param signal - source lifetime whose reason wins after cancellation.
 * @returns the cancellation reason or an unexpected-end failure.
 */
function remoteEventSourceEndReason(signal) {
    if (signal.aborted)
        return signal.reason;
    return new Error('api-remotes: forwarded Remote event source ended');
}
/** Bridge one Cordis waterfall listener through the Gateway-owned pending event. */
function forwardWaterfall(queue, event, request, context, next) {
    const settled = Promise.withResolvers();
    const dispatch = {
        event,
        request,
        context,
        resolve: (outcome) => {
            if (outcome.kind === 'result') {
                settled.resolve(outcome.value);
                return;
            }
            void Promise.resolve().then(next).then(settled.resolve, settled.reject);
        },
        reject: settled.reject,
    };
    if (!queue.push(dispatch))
        void Promise.resolve().then(next).then(settled.resolve, settled.reject);
    return settled.promise;
}
/** Reject an allowlisted event whose runtime arguments are not lossless JSON data. */
function assertJsonArgs(event, args) {
    for (const [index, arg] of args.entries()) {
        if (!isJsonValue(arg)) {
            throw new Error(`forwarded host event "${event}" argument ${String(index)} is not lossless JSON data`);
        }
    }
    return args;
}
//# sourceMappingURL=index.js.map