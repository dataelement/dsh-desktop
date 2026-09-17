/** Cold Session history pagination and live-event source. */
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { Deque } from '@deepseek-ai/dsh-deque';
import { isAppendSurfaceEvent, SessionLogOffset, SessionSeq, } from '@deepseek-ai/dsh-session';
import { SessionQueryError } from '@deepseek-ai/dsh-session-query';
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { SessionAssistantStreamAccumulator } from "./assistant-stream.js";
const DEFAULT_MAX_MESSAGES = 50;
const MESSAGE_TYPES = new Set(['user/message', 'assistant/message']);
/** Implements cold-safe history operations delegated by the Session Controller. */
export class SessionHistoryController {
    ctx;
    promote;
    closeFollowers = new Set();
    assistantStreams = new Map();
    /**
     * @param ctx - Host context carrying Session query and projection services.
     * @param promote - starts ordinary Session activation after snapshot delivery.
     */
    constructor(ctx, promote) {
        this.ctx = ctx;
        this.promote = promote;
        ctx.on('agent/assistant-stream', ({ agent, frame }) => {
            let stream = this.assistantStreams.get(agent.session.id);
            if (stream === undefined) {
                stream = new SessionAssistantStreamAccumulator();
                this.assistantStreams.set(agent.session.id, stream);
            }
            stream.accept(frame, cursorBeforeNext(agent.session.seq));
        }, { global: true });
        ctx.on('agent/disposed', ({ agent }) => {
            this.assistantStreams.delete(agent.session.id);
        }, { global: true });
        ctx.effect(() => () => {
            for (const close of this.closeFollowers)
                close();
            this.closeFollowers.clear();
        }, 'session-controller.history');
    }
    /**
     * Read one message-aligned history page without activating an Agent.
     * @param request - durable address and backwards-page cursor.
     * @param signal - caller cancellation for persistence reads.
     * @returns a contiguous event page.
     */
    async page(request, signal) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            validatePageRequest(request);
            const throughSeq = request.throughSeq === -1
                ? -1
                : SessionSeq(request.throughSeq);
            const beforeSeq = request.beforeSeq === undefined
                ? undefined
                : SessionLogOffset(request.beforeSeq);
            const source = __addDisposableResource(env_1, await this.sourceFor(request.address, signal, false), false);
            signal.throwIfAborted();
            const sourceLog = source.events;
            const sourceCursor = sourceLog.at(-1)?.seq ?? -1;
            if (throughSeq > sourceCursor) {
                throw new RemoteError('gateway/bad-request', `session page through seq ${String(throughSeq)} is past cursor ${String(sourceCursor)}`, {});
            }
            /* v8 ignore next -- Session and persistence validation guarantee a dense zero-based event prefix. */
            if (throughSeq >= 0 && sourceLog[throughSeq]?.seq !== throughSeq) {
                throw new RemoteError('gateway/internal', `session log does not contain through seq ${String(throughSeq)}`, {});
            }
            const page = paginate(sourceLog, beforeSeq, request.maxMessages ?? DEFAULT_MAX_MESSAGES, throughSeq);
            const records = pageRecords(page.events);
            return {
                records,
                hasMore: page.hasMore,
            };
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    /**
     * Follow events appended after an initial cursor on one durable address.
     * @param request - durable address and last committed sequence already held by the caller.
     * @param signal - stream cancellation owned by the Remote carrier.
     * @returns a complete opening snapshot followed by gap-free durable events and opted-in assistant frames.
     */
    async *follow(request, signal) {
        validateFollowRequest(request);
        const { address } = request;
        const target = addressId(address);
        const buffered = new Deque();
        let snapshotCursor;
        let assistantStreamOrdinal = 0;
        let wake;
        const notify = () => {
            const resume = wake;
            wake = undefined;
            resume?.();
        };
        const follower = { closed: false };
        const close = () => {
            follower.closed = true;
            notify();
        };
        this.closeFollowers.add(close);
        const disposeEvent = this.ctx.on('session/event', (session, event) => {
            if (session.id !== target)
                return;
            buffered.pushBack({ type: 'event', event });
            notify();
        }, { global: true });
        const disposeCreated = this.ctx.on('session/created', (session) => {
            if (session.id !== target)
                return;
            // Constructor seed events have no session/event notification. Normally
            // only the end-seed suffix is new; if persistence advanced after the
            // opening observation, replay everything beyond that snapshot cursor.
            const suffix = session.snapshotEvents(snapshotCursor === undefined
                ? session.firstLiveSeq
                : SessionLogOffset(snapshotCursor + 1));
            for (let index = suffix.length - 1; index >= 0; index -= 1) {
                buffered.pushFront({ type: 'event', event: suffix[index] });
            }
            notify();
        }, { global: true });
        const disposeAssistantStream = request.assistantStream !== true
            ? undefined
            : this.ctx.on('agent/assistant-stream', ({ agent, frame }) => {
                if (agent.session.id !== target)
                    return;
                buffered.pushBack({
                    type: 'assistant-stream',
                    frame: wireAssistantStreamFrame(frame, cursorBeforeNext(agent.session.seq)),
                    ordinal: ++assistantStreamOrdinal,
                });
                notify();
            }, { global: true });
        const onAbort = () => { notify(); };
        signal.addEventListener('abort', onAbort, { once: true });
        try {
            const env_2 = { stack: [], error: void 0, hasError: false };
            try {
                const source = __addDisposableResource(env_2, await this.sourceFor(address, signal, true), false);
                const events = source.events;
                signal.throwIfAborted();
                const cursor = source.cursor;
                snapshotCursor = cursor;
                const page = paginate(events, undefined, request.maxMessages ?? DEFAULT_MAX_MESSAGES);
                const assistantStream = request.assistantStream === true
                    ? this.assistantStreams.get(target)?.snapshot() ?? { revision: 0 }
                    : undefined;
                // The accumulator snapshot and this watermark are synchronous. Frames
                // through the cut are represented or superseded by that baseline,
                // including larger revisions from a retired Agent; later revision
                // resets reach Client continuity validation.
                const assistantStreamOrdinalCut = assistantStreamOrdinal;
                yield {
                    type: 'snapshot',
                    header: wireHeader(source.header),
                    cursor,
                    records: pageRecords(page.events),
                    hasMore: page.hasMore,
                    projections: source.projections === undefined
                        ? { asOfSeq: cursor, values: {} }
                        : projectionBlock(source.projections),
                    ...assistantStream === undefined ? {} : { assistantStream },
                };
                if (address.kind === 'session' && source.source === 'prepared') {
                    const promotion = source.retain();
                    try {
                        this.promote(promotion);
                    }
                    catch (error) {
                        promotion[Symbol.dispose]();
                        throw error;
                    }
                }
                let nextOffset = SessionLogOffset(cursor + 1);
                while (!follower.closed && !signal.aborted) {
                    const item = buffered.popFront();
                    if (item === undefined) {
                        await new Promise((resolve) => { wake = resolve; });
                        continue;
                    }
                    if (item.type === 'assistant-stream') {
                        if (item.ordinal > assistantStreamOrdinalCut) {
                            yield { type: 'assistant-stream', frame: item.frame };
                        }
                        continue;
                    }
                    const expectedSeq = SessionSeq(nextOffset);
                    if (item.event.seq < expectedSeq)
                        continue;
                    if (item.event.seq !== expectedSeq) {
                        throw new RemoteError('gateway/internal', `session event stream skipped seq ${String(expectedSeq)}`, {});
                    }
                    nextOffset = SessionLogOffset(nextOffset + 1);
                    yield entryFor(item.event);
                }
            }
            catch (e_2) {
                env_2.error = e_2;
                env_2.hasError = true;
            }
            finally {
                __disposeResources(env_2);
            }
        }
        finally {
            this.closeFollowers.delete(close);
            signal.removeEventListener('abort', onAbort);
            disposeCreated();
            disposeEvent();
            disposeAssistantStream?.();
        }
    }
    async sourceFor(address, signal, withProjections) {
        const sessionId = addressId(address);
        try {
            const observation = await this.ctx.sessionQuery.observeSession(sessionId, {
                signal,
                projectionMode: withProjections || address.kind === 'subagent' ? 'all' : 'none',
            });
            if (observation.header.cwd === undefined) {
                observation[Symbol.dispose]();
                rejectNotFound(address);
            }
            try {
                validateAddress(address, observation.header, observation.inheritedEventCount, observation.projections);
            }
            catch (error) {
                observation[Symbol.dispose]();
                throw error;
            }
            return observation;
        }
        catch (error) {
            if (error instanceof SessionQueryError
                && error.code === 'SESSION_QUERY_SESSION_NOT_FOUND')
                rejectNotFound(address);
            throw error;
        }
    }
}
function cursorBeforeNext(nextSeq) {
    return nextSeq === 0 ? -1 : SessionSeq(nextSeq - 1);
}
function wireAssistantStreamFrame(frame, durableCursor) {
    if (frame.type === 'start')
        return { ...frame, startedAfterSeq: durableCursor };
    if (frame.type === 'end')
        return frame;
    return {
        ...frame,
        chunk: frame.chunk,
    };
}
function projectionBlock(snapshot) {
    return {
        asOfSeq: snapshot.asOfSeq,
        // Projection definitions validate whole JSON values before snapshot publication.
        values: snapshot.values,
    };
}
function validatePageRequest(request) {
    if (!Number.isSafeInteger(request.throughSeq)
        || request.throughSeq < -1
        || Object.is(request.throughSeq, -0)) {
        throw new RemoteError('gateway/bad-request', 'throughSeq must be an integer greater than or equal to -1', {});
    }
    if (request.beforeSeq !== undefined
        && (!Number.isSafeInteger(request.beforeSeq)
            || request.beforeSeq < 0
            || Object.is(request.beforeSeq, -0))) {
        throw new RemoteError('gateway/bad-request', 'beforeSeq must be a non-negative safe integer', {});
    }
    if (request.maxMessages !== undefined
        && (!Number.isSafeInteger(request.maxMessages) || request.maxMessages <= 0)) {
        throw new RemoteError('gateway/bad-request', 'maxMessages must be a positive safe integer', {});
    }
}
function validateFollowRequest(request) {
    if (request.maxMessages !== undefined
        && (!Number.isSafeInteger(request.maxMessages) || request.maxMessages <= 0)) {
        throw new RemoteError('gateway/bad-request', 'maxMessages must be a positive safe integer', {});
    }
}
function addressId(address) {
    return address.kind === 'session' ? address.sessionId : address.childSessionId;
}
function validateAddress(address, header, inheritedEventCount, projections) {
    if (address.kind === 'session') {
        if (header.origin === 'subagent') {
            throw new RemoteError('session/agent-busy', 'subagent Sessions require their durable parent address', {
                reason: 'use subagent delivery for this child session',
            });
        }
        return;
    }
    if (header.origin !== 'subagent' || header.parentSession !== address.parentSessionId) {
        throw new RemoteError('subagent/unauthorized', 'subagent does not belong to the supplied parent', {
            childSessionId: address.childSessionId,
        });
    }
    const identity = projections?.values.subagent;
    if (identity === null) {
        throw new RemoteError('subagent/catalog-diagnostic', 'subagent descriptor is corrupt', {
            parentSessionId: address.parentSessionId,
            childSessionId: address.childSessionId,
            reason: 'corrupt',
        });
    }
    if (identity === undefined || identity.seq < inheritedEventCount) {
        throw new RemoteError('subagent/catalog-diagnostic', 'subagent descriptor is unavailable', {
            parentSessionId: address.parentSessionId,
            childSessionId: address.childSessionId,
            reason: 'unsupported',
        });
    }
    if (identity.mode !== address.mode) {
        throw new RemoteError('subagent/unauthorized', 'subagent mode does not match the supplied address', {
            childSessionId: address.childSessionId,
        });
    }
}
function rejectNotFound(address) {
    if (address.kind === 'session') {
        throw new RemoteError('session/not-found', `session "${address.sessionId}" not found`, { sessionId: address.sessionId });
    }
    throw new RemoteError('subagent/not-found', 'subagent is unavailable', {
        parentSessionId: address.parentSessionId,
        childSessionId: address.childSessionId,
    });
}
function paginate(events, beforeSeq, maxMessages, throughSeq = events.at(-1)?.seq ?? -1) {
    const end = SessionLogOffset(Math.min(throughSeq + 1, beforeSeq ?? throughSeq + 1));
    let count = 0;
    let cut = SessionLogOffset(0);
    for (let index = end - 1; index >= 0; index--) {
        const event = events[index];
        if (!MESSAGE_TYPES.has(event.type) || !isAppendSurfaceEvent(event))
            continue;
        count++;
        const sources = event.sourceEventSeqs;
        let groupStart = event.seq;
        if (sources !== undefined) {
            for (const source of sources) {
                if (source < groupStart)
                    groupStart = source;
            }
        }
        if (count >= maxMessages) {
            cut = SessionLogOffset(groupStart);
            break;
        }
    }
    return { events: events.slice(cut, end), hasMore: cut > 0 };
}
/** Translate current logical Session metadata to the browser wire. */
function wireHeader(header) {
    return { ...header };
}
function entryFor(event) {
    return {
        type: 'event',
        // Session.append validates and freezes event data as JSON before publication.
        event: event,
    };
}
/** Encode one bounded logical page without changing its pagination cut. */
function pageRecords(events) {
    return events.map(entryFor);
}
//# sourceMappingURL=history.js.map