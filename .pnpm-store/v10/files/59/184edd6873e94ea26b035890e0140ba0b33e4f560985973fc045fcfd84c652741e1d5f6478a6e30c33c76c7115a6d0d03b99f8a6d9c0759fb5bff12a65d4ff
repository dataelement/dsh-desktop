/** Cursor, page, and live-tail coordination over a reconnecting Remote stream. */
import { RemoteStreamCarrierError } from './stream-client.ts';
import type { RemoteStream, RemoteStreamOptions } from './remote-stream.ts';
/** Transport-neutral opening snapshot, durable entry, or cursorless notification. */
export type RemoteJournalFrame<Entry, Cursor, Page, Notification = never> = {
    readonly type: 'opened';
    readonly cursor: Cursor;
    readonly page: Page;
} | {
    readonly type: 'entry';
    readonly entry: Entry;
} | ([Notification] extends [never] ? never : {
    readonly type: 'notification';
    readonly notification: Notification;
});
/** One journal-window update or cursorless domain notification. */
export type RemoteJournalChange<Page, Entry, Notification = never> = {
    readonly type: 'replace';
    readonly page: Page;
    readonly entries: readonly Entry[];
    readonly hasMore: boolean;
} | {
    readonly type: 'prepend';
    readonly page: Page;
    readonly entries: readonly Entry[];
    readonly hasMore: boolean;
} | {
    readonly type: 'append';
    readonly entry: Entry;
} | ([Notification] extends [never] ? never : {
    readonly type: 'notification';
    readonly notification: Notification;
});
/** Gateway capability used to create one reconnecting Remote stream. */
export interface RemoteStreamFactory {
    /**
     * Create one independently cancellable logical stream.
     * @param options - domain-owned opener and generation-end classification.
     * @returns a reconnecting single-consumer stream.
     */
    $stream<Item>(options: RemoteStreamOptions<Item>): RemoteStream<Item>;
}
/** Domain publication and cursor operations for one addressed journal stream. */
export interface RemoteJournalStreamOptions<Page, Entry, Cursor, Notification = never> {
    /** Diagnostic stream name used in protocol failures. */
    readonly name: string;
    /** Cursor representing a journal with no entries. */
    readonly emptyCursor: Cursor;
    /** Read the ordered entries carried by a page. */
    readonly entries: (page: Page) => readonly Entry[];
    /** Read whether an older page exists. */
    readonly hasMore: (page: Page) => boolean;
    /** Read the inclusive first durable cursor covered by one entry. */
    readonly first: (entry: Entry) => Cursor;
    /** Read the inclusive final cursor, which must not precede the first. */
    readonly last: (entry: Entry) => Cursor;
    /** Compare two cursors. */
    readonly compare: (left: Cursor, right: Cursor) => number;
    /** Test whether the right cursor immediately follows the left cursor. */
    readonly follows: (left: Cursor, right: Cursor) => boolean;
    /** Apply one complete journal-window change or cursorless notification. */
    readonly publish: (change: RemoteJournalChange<Page, Entry, Notification>) => void;
    /** Observe a retryable carrier loss before reconnection. */
    readonly carrierFailed?: (error: RemoteStreamCarrierError) => void;
    /** Publish a terminal stream, page, or protocol failure after opening. */
    readonly failed: (error: unknown) => void;
}
/**
 * Owns snapshot-first opening, ordered live delivery, pagination, and repair.
 *
 * The domain retains its published window during reconnection. A replacement is
 * published only after the opening page reaches the generation's cursor.
 * Notifications never change a cursor and wait behind an in-flight gap repair.
 */
export declare abstract class RemoteJournalStream<Page, Entry, Cursor, PageRequest = void, Notification = never> {
    private readonly options;
    private readonly stream;
    private initialRequest;
    private resumeCursor;
    private hasResumeCursor;
    private generation;
    private firstCursor;
    private lastCursor;
    private started;
    private opened;
    private disposed;
    private done;
    private closing;
    private pendingNext;
    /**
     * @param remote - Gateway factory for the reconnecting physical-generation stream.
     * @param options - cursor algebra and domain publication sinks.
     */
    protected constructor(remote: RemoteStreamFactory, options: RemoteJournalStreamOptions<Page, Entry, Cursor, Notification>);
    /**
     * Open one physical journal generation with a complete current snapshot.
     * @param request - opening-window request retained for later repair.
     * @param signal - cancellation lifetime of the physical generation.
     * @returns opening cursor followed by live entries.
     */
    protected abstract follow(request: PageRequest, signal: AbortSignal): AsyncIterable<RemoteJournalFrame<Entry, Cursor, Page, Notification>>;
    /**
     * Read one journal page through the addressed domain source.
     * @param request - domain page request.
     * @param through - inclusive journal cursor that fixes the source read.
     * @param signal - cancellation lifetime shared with the logical stream.
     * @returns the requested page, whose tail equals `through` unless the domain request selects older entries.
     */
    protected abstract readPage(request: PageRequest, through: Cursor, signal: AbortSignal): Promise<Page>;
    /**
     * Derive an unbounded-tail request from the initial page request.
     * @param initial - request used to open the journal window.
     * @returns request suitable for reconnect and gap repair.
     */
    protected abstract repairRequest(initial: PageRequest): PageRequest;
    /** Cancellation lifetime shared by follow and page calls. */
    get signal(): AbortSignal;
    /**
     * Establish follow and publish the opening snapshot carried by its first frame.
     * @param request - initial tail-page request.
     * @returns after the first complete window is published.
     */
    open(request: PageRequest): Promise<void>;
    /**
     * Read and prepend one older page after a successful open.
     * @param request - domain page request bound to this stream's address.
     * @returns after the page is applied or rejected as discontinuous.
     */
    prepend(request: PageRequest): Promise<void>;
    /** Replace the active physical generation while retaining the published window. */
    restart(): void;
    /**
     * Permanently stop follow, page requests, and the background consumer.
     * @returns when no stream work or publication callback can still run.
     */
    dispose(): Promise<void>;
    private consume;
    private replaceGeneration;
    private opening;
    /** Publish a generation's opening page without issuing a second Remote call. */
    private replaceFromOpening;
    private acceptEntry;
    private replaceThrough;
    private readPageWhileFollowing;
    private awaitReplacementGeneration;
    private mergeReplacement;
    private maxCursor;
    private nextResult;
    private takeNext;
    private releaseNext;
    private publishNotification;
    private repairPageRequest;
    private setResumeCursor;
    private currentCursor;
    private tailCursor;
    private assertPage;
    private entryRange;
    private assertPageThrough;
}
//# sourceMappingURL=journal-stream.d.ts.map