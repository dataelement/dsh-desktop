/**
 * Zero-dependency circular deque for queues that retain entries across asynchronous work.
 * @module @deepseek-ai/dsh-deque
 */
/**
 * A circular deque with amortized constant-time insertion and removal.
 * Removed entries are cleared immediately, and sparse storage shrinks after
 * the live entry count reaches one quarter of its capacity.
 */
export declare class Deque<T> {
    private buffer;
    private head;
    private count;
    /** Number of entries available to remove. */
    get size(): number;
    /**
     * Append one entry after the current tail.
     * @param value - entry to append.
     */
    pushBack(value: T): void;
    /**
     * Insert one entry before the current head.
     * @param value - entry to prepend.
     */
    pushFront(value: T): void;
    /**
     * Remove the current head entry and clear its retained reference.
     * Callers whose element type includes `undefined` use {@link size} to
     * distinguish an empty deque from an `undefined` entry.
     * @returns the removed entry, or `undefined` when the deque is empty.
     */
    popFront(): T | undefined;
    /** Drop every entry and release the current backing storage. */
    clear(): void;
    private ensureCapacity;
    private compact;
    private resize;
}
//# sourceMappingURL=index.d.ts.map