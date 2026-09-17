/** Observable contiguous Session event window consumed by domain assemblers. */
import { notifySubscribers } from '@deepseek-ai/dsh-client-store';
function leaf(entries) {
    return { kind: 'leaf', entries, length: entries.length };
}
function concat(left, right) {
    return { kind: 'concat', left, right, length: left.length + right.length };
}
function materialize(node) {
    if (node.kind === 'leaf')
        return node.entries;
    const entries = new Array(node.length);
    const pending = [node];
    let index = 0;
    while (pending.length > 0) {
        const current = pending.pop();
        if (current.kind === 'concat') {
            pending.push(current.right, current.left);
            continue;
        }
        for (const entry of current.entries) {
            entries[index] = entry;
            index += 1;
        }
    }
    return entries;
}
function windowSnapshot(node, hasMore, revision, change) {
    let entries;
    return {
        get entries() {
            entries ??= materialize(node);
            return entries;
        },
        hasMore,
        revision,
        change,
    };
}
/** Session-owned event feed; every accepted window mutation publishes synchronously. */
export class MutableSessionEventSource {
    listeners = new Set();
    window = leaf([]);
    snapshot = windowSnapshot(this.window, false, 0, { kind: 'replace', entries: [] });
    /** @returns the cached event-window snapshot. */
    getSnapshot() { return this.snapshot; }
    /**
     * Subscribe to synchronous window publication.
     * @param listener - invalidation callback.
     * @returns unsubscribe function.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /**
     * Replace the complete contiguous window.
     * @param entries - complete window.
     * @param hasMore - whether older history remains.
     */
    replace(entries, hasMore) {
        this.window = leaf(entries);
        this.publish(hasMore, { kind: 'replace', entries });
    }
    /**
     * Prepend one older contiguous page.
     * @param entries - newly loaded older entries.
     * @param hasMore - whether still older history remains.
     */
    prepend(entries, hasMore) {
        this.window = concat(leaf(entries), this.window);
        this.publish(hasMore, { kind: 'prepend', entries });
    }
    /**
     * Append one contiguous live entry.
     * @param entry - live tail entry.
     */
    append(entry) {
        const entries = [entry];
        this.window = concat(this.window, leaf(entries));
        this.publish(this.snapshot.hasMore, {
            kind: 'append',
            entries,
        });
    }
    /**
     * Replace one attempt's transient rows with its committed durable settlement.
     * @param attemptId - process-local attempt whose live rows are now redundant.
     * @param entry - durable settlement committed for that attempt.
     */
    settleAssistant(attemptId, entry) {
        const entries = materialize(this.window).filter(candidate => (candidate.type !== 'transient' || candidate.event.data.attemptId !== attemptId));
        if (entry !== undefined) {
            const index = entries.findIndex(candidate => candidate.event.seq > entry.event.seq);
            if (index < 0)
                entries.push(entry);
            else
                entries.splice(index, 0, entry);
        }
        this.window = leaf(entries);
        this.publish(this.snapshot.hasMore, {
            kind: 'settle-assistant',
            attemptId,
            ...(entry === undefined ? {} : { entry }),
        });
    }
    publish(hasMore, change) {
        this.snapshot = windowSnapshot(this.window, hasMore, this.snapshot.revision + 1, change);
        notifySubscribers(this.listeners, '[session-controller] event feed');
    }
}
//# sourceMappingURL=events.js.map