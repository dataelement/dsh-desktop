/** Cursor, page, and live-tail coordination over a reconnecting Remote stream. */
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { RemoteStreamCarrierError } from "./stream-client.js";
/** Host-side stream protocol violation, marked so consumers surface it as an error state. */
function protocolViolation(message) {
    return new RemoteError('gateway/internal', message, {});
}
/**
 * Owns snapshot-first opening, ordered live delivery, pagination, and repair.
 *
 * The domain retains its published window during reconnection. A replacement is
 * published only after the opening page reaches the generation's cursor.
 * Notifications never change a cursor and wait behind an in-flight gap repair.
 */
export class RemoteJournalStream {
    options;
    stream;
    initialRequest;
    resumeCursor;
    hasResumeCursor = false;
    generation = 0;
    firstCursor;
    lastCursor;
    started = false;
    opened = false;
    disposed = false;
    done;
    closing;
    pendingNext;
    /**
     * @param remote - Gateway factory for the reconnecting physical-generation stream.
     * @param options - cursor algebra and domain publication sinks.
     */
    constructor(remote, options) {
        this.options = options;
        this.stream = remote.$stream({
            name: options.name,
            open: signal => this.follow(this.initialRequest, signal),
            ended: accepted => accepted
                ? new RemoteStreamCarrierError(`${options.name} ended without a terminal result`)
                : protocolViolation(`${this.hasResumeCursor ? 'resumed ' : ''}${options.name} ended before its opening cursor`),
            ...(options.carrierFailed === undefined
                ? {}
                : { carrierFailed: options.carrierFailed }),
        });
    }
    /** Cancellation lifetime shared by follow and page calls. */
    get signal() {
        return this.stream.signal;
    }
    /**
     * Establish follow and publish the opening snapshot carried by its first frame.
     * @param request - initial tail-page request.
     * @returns after the first complete window is published.
     */
    async open(request) {
        if (this.started)
            throw new Error(`${this.options.name} already opened`);
        this.started = true;
        this.initialRequest = request;
        const iterator = this.stream[Symbol.asyncIterator]();
        try {
            const first = await this.takeNext(iterator);
            if (first.done)
                throw protocolViolation(`${this.options.name} ended before its opening cursor`);
            this.replaceGeneration(first.value, false);
            this.opened = true;
            this.done = this.consume(iterator);
        }
        catch (error) {
            await this.stream.dispose();
            throw error;
        }
    }
    /**
     * Read and prepend one older page after a successful open.
     * @param request - domain page request bound to this stream's address.
     * @returns after the page is applied or rejected as discontinuous.
     */
    async prepend(request) {
        if (!this.opened || this.disposed)
            throw new Error(`${this.options.name} is not open`);
        const page = await this.readPage(request, this.currentCursor(), this.stream.signal);
        this.stream.signal.throwIfAborted();
        const entries = this.options.entries(page);
        this.assertPage(entries);
        const before = this.firstCursor;
        const accepted = before === undefined
            ? [...entries]
            : entries.filter(entry => this.options.compare(this.options.first(entry), before) < 0);
        const tail = accepted.at(-1);
        if (tail !== undefined && before !== undefined
            && !this.options.follows(this.options.last(tail), before)) {
            this.options.publish({ type: 'prepend', page, entries: [], hasMore: false });
            throw protocolViolation(`${this.options.name} history page is discontinuous`);
        }
        const first = accepted[0];
        if (first !== undefined)
            this.firstCursor = this.options.first(first);
        this.options.publish({
            type: 'prepend',
            page,
            entries: accepted,
            hasMore: this.options.hasMore(page),
        });
    }
    /** Replace the active physical generation while retaining the published window. */
    restart() {
        this.stream.restart();
    }
    /**
     * Permanently stop follow, page requests, and the background consumer.
     * @returns when no stream work or publication callback can still run.
     */
    dispose() {
        if (this.closing !== undefined)
            return this.closing;
        this.disposed = true;
        const done = this.done;
        const closing = (async () => {
            await this.stream.dispose();
            await done;
        })();
        this.closing = closing;
        return closing;
    }
    async consume(iterator) {
        try {
            while (true) {
                const next = await this.takeNext(iterator);
                if (next.done)
                    return;
                const item = next.value;
                if (item.generation !== this.generation) {
                    this.replaceGeneration(item, true);
                    continue;
                }
                if (item.value.type === 'opened') {
                    throw protocolViolation(`${this.options.name} emitted more than one opening cursor`);
                }
                if (item.value.type === 'notification') {
                    this.publishNotification(item.value.notification);
                    continue;
                }
                await this.acceptEntry(item.value.entry, item, iterator);
            }
        }
        catch (error) {
            if (!this.disposed)
                this.options.failed(error);
        }
    }
    replaceGeneration(initial, resumed) {
        const opening = this.opening(initial, resumed);
        this.replaceFromOpening(opening.page, opening.cursor);
    }
    opening(item, resumed) {
        if (item.value.type !== 'opened') {
            throw protocolViolation(`${resumed ? 'resumed ' : ''}${this.options.name} emitted an entry before its opening cursor`);
        }
        const cursor = item.value.cursor;
        if (resumed && this.lastCursor !== undefined
            && this.options.compare(cursor, this.lastCursor) < 0) {
            throw protocolViolation(`${this.options.name} resumed at a cursor behind the last applied entry`);
        }
        this.generation = item.generation;
        item.accept();
        return { cursor, page: item.value.page };
    }
    /** Publish a generation's opening page without issuing a second Remote call. */
    replaceFromOpening(page, cursor) {
        this.assertPageThrough(page, cursor);
        const entries = [...this.options.entries(page)];
        this.assertPage(entries);
        const first = entries[0];
        this.firstCursor = first === undefined ? undefined : this.options.first(first);
        this.lastCursor = cursor;
        this.setResumeCursor(cursor);
        this.options.publish({
            type: 'replace',
            page,
            entries,
            hasMore: this.options.hasMore(page),
        });
    }
    async acceptEntry(entry, item, iterator) {
        const { first, last: cursor } = this.entryRange(entry);
        const last = this.lastCursor;
        if (this.options.compare(cursor, last) <= 0)
            return;
        if (this.options.compare(first, last) <= 0) {
            throw protocolViolation(`${this.options.name} emitted a partially overlapping entry`);
        }
        if (!this.options.follows(last, first)) {
            const request = this.repairPageRequest();
            const superseded = await this.replaceThrough(request, cursor, item.generation, item.signal, iterator, [entry], []);
            if (superseded !== undefined) {
                this.replaceGeneration(superseded, true);
            }
            return;
        }
        if (this.firstCursor === undefined)
            this.firstCursor = first;
        this.lastCursor = cursor;
        this.setResumeCursor(cursor);
        this.options.publish({ type: 'append', entry });
    }
    async replaceThrough(request, requiredCursor, generation, signal, iterator, queued, notifications) {
        let read = await this.readPageWhileFollowing(request, requiredCursor, generation, signal, iterator, queued, notifications);
        if (read.type === 'superseded')
            return read.item;
        let page = read.page;
        this.assertPageThrough(page, requiredCursor);
        let entries = this.mergeReplacement(page, queued);
        let target = this.maxCursor(requiredCursor, queued);
        if (entries === undefined || this.options.compare(this.tailCursor(entries), target) < 0) {
            read = await this.readPageWhileFollowing(this.repairPageRequest(), target, generation, signal, iterator, queued, notifications);
            if (read.type === 'superseded')
                return read.item;
            page = read.page;
            this.assertPageThrough(page, target);
            entries = this.mergeReplacement(page, queued);
            target = this.maxCursor(requiredCursor, queued);
        }
        if (entries === undefined || this.options.compare(this.tailCursor(entries), target) < 0) {
            throw protocolViolation(`${this.options.name} page did not reach its opening cursor`);
        }
        const first = entries[0];
        /* v8 ignore next -- a successful positive-cursor replacement page cannot be empty. */
        this.firstCursor = first === undefined ? undefined : this.options.first(first);
        this.lastCursor = this.tailCursor(entries);
        this.setResumeCursor(this.lastCursor);
        this.options.publish({
            type: 'replace',
            page,
            entries,
            hasMore: this.options.hasMore(page),
        });
        for (const notification of notifications) {
            this.publishNotification(notification);
        }
        return undefined;
    }
    async readPageWhileFollowing(request, through, generation, signal, iterator, queued, notifications) {
        const page = this.readPage(request, through, signal).then(value => ({ type: 'page', value }), (error) => ({ type: 'page-error', error }));
        while (true) {
            const pending = this.nextResult(iterator);
            const next = pending.then(value => ({ type: 'next', value }), (error) => ({ type: 'next-error', error }));
            const result = await Promise.race([page, next]);
            if (result.type === 'page') {
                signal.throwIfAborted();
                return { type: 'page', page: result.value };
            }
            if (result.type === 'page-error') {
                if (!signal.aborted || this.stream.signal.aborted)
                    throw result.error;
                return this.awaitReplacementGeneration(generation, iterator, pending);
            }
            this.releaseNext();
            if (result.type === 'next-error')
                throw result.error;
            if (result.value.done) {
                signal.throwIfAborted();
                throw protocolViolation(`${this.options.name} ended while reading its replacement page`);
            }
            const item = result.value.value;
            if (item.generation !== generation)
                return { type: 'superseded', item };
            if (item.value.type === 'opened') {
                throw protocolViolation(`${this.options.name} emitted more than one opening cursor`);
            }
            if (item.value.type === 'notification') {
                notifications.push(item.value.notification);
                continue;
            }
            queued.push(item.value.entry);
        }
    }
    async awaitReplacementGeneration(generation, iterator, initial) {
        let pending = initial;
        while (true) {
            let next;
            try {
                next = await pending;
            }
            finally {
                this.releaseNext();
            }
            if (next.done) {
                this.stream.signal.throwIfAborted();
                throw protocolViolation(`${this.options.name} ended while replacing an aborted page generation`);
            }
            const item = next.value;
            if (item.generation !== generation)
                return { type: 'superseded', item };
            if (item.value.type === 'opened') {
                throw protocolViolation(`${this.options.name} emitted more than one opening cursor`);
            }
            pending = this.nextResult(iterator);
        }
    }
    mergeReplacement(page, queued) {
        const entries = [...this.options.entries(page)];
        this.assertPage(entries);
        for (const entry of queued)
            this.entryRange(entry);
        const sorted = [...queued].sort((left, right) => (this.options.compare(this.options.first(left), this.options.first(right))));
        let tail = this.tailCursor(entries);
        for (const entry of sorted) {
            const first = this.options.first(entry);
            const last = this.options.last(entry);
            if (this.options.compare(last, tail) <= 0)
                continue;
            if (this.options.compare(first, tail) <= 0) {
                throw protocolViolation(`${this.options.name} replacement contains a partially overlapping entry`);
            }
            if (!this.options.follows(tail, first))
                return undefined;
            entries.push(entry);
            tail = last;
        }
        return entries;
    }
    maxCursor(cursor, entries) {
        let result = cursor;
        for (const entry of entries) {
            const candidate = this.options.last(entry);
            if (this.options.compare(candidate, result) > 0)
                result = candidate;
        }
        return result;
    }
    nextResult(iterator) {
        this.pendingNext ??= iterator.next();
        return this.pendingNext;
    }
    async takeNext(iterator) {
        const pending = this.nextResult(iterator);
        try {
            return await pending;
        }
        finally {
            this.releaseNext();
        }
    }
    releaseNext() {
        this.pendingNext = undefined;
    }
    publishNotification(notification) {
        this.options.publish({
            type: 'notification',
            notification,
        });
    }
    repairPageRequest() {
        return this.repairRequest(this.initialRequest);
    }
    setResumeCursor(cursor) {
        this.resumeCursor = cursor;
        this.hasResumeCursor = true;
    }
    currentCursor() {
        return this.resumeCursor;
    }
    tailCursor(entries) {
        const tail = entries.at(-1);
        return tail === undefined ? this.options.emptyCursor : this.options.last(tail);
    }
    assertPage(entries) {
        const iterator = entries[Symbol.iterator]();
        const first = iterator.next();
        if (first.done)
            return;
        let previousRange = this.entryRange(first.value);
        for (const entry of iterator) {
            const range = this.entryRange(entry);
            if (!this.options.follows(previousRange.last, range.first)) {
                throw protocolViolation(`${this.options.name} page contains discontinuous entries`);
            }
            previousRange = range;
        }
    }
    entryRange(entry) {
        const first = this.options.first(entry);
        const last = this.options.last(entry);
        if (this.options.compare(first, last) > 0) {
            throw protocolViolation(`${this.options.name} entry has an inverted cursor range`);
        }
        return { first, last };
    }
    assertPageThrough(page, through) {
        const tail = this.tailCursor(this.options.entries(page));
        if (this.options.compare(tail, through) !== 0) {
            throw protocolViolation(`${this.options.name} page did not end at its requested cursor`);
        }
    }
}
//# sourceMappingURL=journal-stream.js.map