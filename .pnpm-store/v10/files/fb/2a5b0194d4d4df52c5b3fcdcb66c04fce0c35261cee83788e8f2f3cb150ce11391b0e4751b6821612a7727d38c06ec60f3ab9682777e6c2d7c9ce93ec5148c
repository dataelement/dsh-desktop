import { Notifier } from "./notifier.js";
/**
 * One session's projection values. Framework semantics, uniform across every
 * key: a baseline seeds rows at its cut, a push frame updates one row, and in
 * both paths a lower-or-equal seq loses — a replayed frame cannot regress a
 * value, a stale baseline cannot overwrite a newer frame. A key the store has
 * never seen reads `undefined` (capability absent). Faces are identity-stable
 * per key (create-on-demand, cached) so the React side binds each exactly
 * once; the store-level channel (`subscribeAny`) serves coarse consumers (the
 * manager's list projection reads the `title` key).
 */
export class ProjectionValueStore {
    rows = new Map();
    channels = new Map();
    valuesCache;
    /** Coarse any-key channel (no snapshot cache to rebuild: reads hit rows directly). */
    anyNotifier = new Notifier(() => { });
    /**
     * Key-addressed bare observable face (the useProjection resolution path).
     * Always defined — absence is an `undefined` snapshot, never a missing
     * face, so a component may subscribe before the key ever carries a value.
     * @param key - projection key.
     * @returns the identity-stable face for this key.
     */
    faceOf(key) {
        return this.channel(key).face;
    }
    /**
     * Current whole value for a key (erased framework read; typed reads go
     * through `useProjection`'s map lookup).
     * @param key - projection key.
     * @returns the value, or undefined while the key is absent.
     */
    get(key) {
        return this.rows.get(key)?.value;
    }
    /**
     * Read every current projection value as one reference-stable snapshot.
     * @returns The same frozen value map until a row changes.
     */
    values() {
        if (this.valuesCache === undefined) {
            this.valuesCache = Object.freeze(Object.fromEntries([...this.rows].map(([key, row]) => [key, row.value])));
        }
        return this.valuesCache;
    }
    /**
     * Subscribe to any-key changes (microtask-batched) — the manager's list
     * rebuild channel.
     * @param listener - change callback.
     * @returns the unsubscribe function.
     */
    subscribeAny(listener) {
        return this.anyNotifier.subscribe(listener);
    }
    /**
     * Apply one finished value from the Session control stream.
     * @param key - projection key.
     * @param value - whole value computed by the host unit.
     * @param seq - the unit's watermark at emission.
     */
    apply(key, value, seq) {
        const row = this.rows.get(key);
        if (row !== undefined && seq <= row.seq)
            return; // higher seq wins; replays and stale frames drop
        this.rows.set(key, { value, seq });
        this.changed(key);
    }
    /**
     * Seed from a history tail page's projections block: every carried key
     * lands under the same seq rule as frames; a key the block omits is
     * capability-absent as of the cut — its row clears unless a newer frame
     * already superseded the cut (a stale baseline can neither overwrite nor
     * clear newer values).
     * @param baseline - the response's projections block.
     */
    seed(baseline) {
        // Erased walk: the framework crosses the open key space; per-key typing
        // is re-established at the consumer (useProjection's map lookup).
        const values = baseline.values;
        for (const key of Object.keys(values))
            this.apply(key, values[key], baseline.asOfSeq);
        for (const [key, row] of this.rows) {
            if (Object.hasOwn(values, key))
                continue;
            if (row.seq > baseline.asOfSeq)
                continue;
            this.rows.delete(key);
            this.changed(key);
        }
    }
    /**
     * Drop rows beyond a replacement control baseline. Such rows describe
     * process state the Host lost before persisting it and would otherwise
     * outrank recomputed lower-seq values forever. The caller seeds the new
     * baseline immediately afterward.
     * @param lastSeq - highest durable sequence reflected by the baseline.
     */
    truncate(lastSeq) {
        for (const [key, row] of this.rows) {
            if (row.seq <= lastSeq)
                continue;
            this.rows.delete(key);
            this.changed(key);
        }
    }
    changed(key) {
        this.valuesCache = undefined;
        this.channels.get(key)?.notifier.markDirty();
        this.anyNotifier.markDirty();
    }
    channel(key) {
        let channel = this.channels.get(key);
        if (channel === undefined) {
            // The notifier only batches (no snapshot cache to rebuild: faces read rows directly).
            const notifier = new Notifier(() => { });
            channel = {
                notifier,
                face: {
                    getSnapshot: () => this.rows.get(key)?.value,
                    subscribe: listener => notifier.subscribe(listener),
                },
            };
            this.channels.set(key, channel);
        }
        return channel;
    }
}
//# sourceMappingURL=projection-store.js.map