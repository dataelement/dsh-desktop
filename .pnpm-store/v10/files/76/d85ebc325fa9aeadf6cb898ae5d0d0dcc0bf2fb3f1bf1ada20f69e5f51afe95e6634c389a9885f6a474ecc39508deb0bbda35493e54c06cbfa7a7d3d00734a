/**
 * Batches structural updates in microtasks and stream updates by animation
 * frame. Reads may rebuild a dirty snapshot without consuming the pending
 * subscriber notification.
 */
export declare class Notifier {
    private readonly rebuild;
    private listeners;
    private dirty;
    private notifyPending;
    private scheduled;
    private scheduleGeneration;
    /** @param rebuild - snapshot rebuild function injected by the owner (writes the owner's snapshotCache). */
    constructor(rebuild: () => void);
    /**
     * uSES subscription entry.
     * @param listener - change callback.
     * @returns the unsubscribe function.
     */
    subscribe(listener: () => void): () => void;
    /** Mark the snapshot dirty and notify in a microtask. */
    markDirty(): void;
    /** Mark the snapshot dirty and publish cumulative state at most once per frame. */
    markFrameDirty(): void;
    /**
     * Synchronous flush: controlled-input writes must notify in the same tick as
     * onChange, or React rolls the DOM back to the stale value and the caret jumps to the end.
     */
    notifyNow(): void;
    /**
     * Pre-getSnapshot check: rebuild synchronously when dirty (read path
     * before first subscribe / while unobserved). Notification stays pending.
     */
    ensureFresh(): void;
    private schedule;
    private invalidateSchedule;
    private flush;
}
//# sourceMappingURL=notifier.d.ts.map