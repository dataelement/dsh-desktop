/** Session-specific adapters for Gateway-owned Remote stream lifecycles. */
import { RemoteJournalStream, RemoteSnapshotStream, RemoteStreamCarrierError, type ClientRemote, type RemoteJournalFrame } from '@deepseek-ai/dsh-api-gateway/client';
import type { SessionAddress, SessionAssistantStreamBaseline, SessionAssistantStreamFrame, SessionControlFrame, SessionHistoryRecord, SessionPage, SessionPageRequest, SessionProjectionBaseline } from '../types.ts';
import type { SessionEventLikeEntry, SessionLiveEventEntry } from './contract/events.ts';
import type { SessionRemotes } from './sessions/remotes.ts';
export { SESSION_SEARCH_RESULT_LIMIT, SESSION_SEARCH_SNIPPET_MAX_CODE_POINTS, } from '../types.ts';
/** Pagination fields bound to an already-addressed Session journal. */
export type ClientSessionPageRequest = Omit<SessionPageRequest, 'address' | 'throughSeq'>;
/** Complete generated `ctx.remote.session` namespace. */
export type SessionRemote = ClientRemote['session'];
/** Opening metadata carried only by a follow snapshot, never by loadOlder pages. */
interface SessionJournalPage extends SessionPage {
    readonly projections?: SessionProjectionBaseline;
    readonly assistantStream?: SessionAssistantStreamBaseline;
}
/** One complete publication from the Session journal stream. */
export type SessionJournalChange = {
    readonly type: 'replace' | 'prepend';
    readonly page: SessionJournalPage;
    readonly entries: readonly SessionEventLikeEntry[];
    readonly hasMore: boolean;
} | {
    readonly type: 'append';
    readonly entry: SessionLiveEventEntry;
} | {
    readonly type: 'assistant-stream';
    readonly frame: SessionAssistantStreamFrame;
};
type SessionControlBaselineFrame = Extract<SessionControlFrame, {
    type: 'baseline';
}>;
type SessionControlDeltaFrame = Exclude<SessionControlFrame, SessionControlBaselineFrame>;
/** Gateway-owned control snapshot stream configured for Session frames. */
export type SessionControlStream = RemoteSnapshotStream<SessionControlBaselineFrame, SessionControlDeltaFrame>;
/** Domain sinks used by the Host-wide Session control stream. */
export interface SessionControlStreamOptions {
    /** Apply a complete baseline or one later update. */
    readonly accept: (frame: SessionControlFrame) => void;
    /** Observe a retryable carrier loss before reconnection. */
    readonly carrierFailed?: (error: RemoteStreamCarrierError) => void;
    /** Publish a terminal business or protocol failure. */
    readonly failed: (error: unknown) => void;
}
/** Domain sinks used by one addressed Session event journal. */
export interface SessionEventStreamOptions {
    /** Apply one complete event-window change. */
    readonly publish: (change: SessionJournalChange) => void;
    /** Observe a retryable carrier loss before reconnection. */
    readonly carrierFailed?: (error: RemoteStreamCarrierError) => void;
    /** Publish a terminal stream, page, or protocol failure after opening. */
    readonly failed: (error: unknown) => void;
}
/**
 * Create the Host-wide Session control snapshot stream.
 * @param remote - generated Session namespace and Gateway stream factory.
 * @param options - Session state destinations.
 * @returns an unstarted stream owned by the Client Session runtime.
 */
export declare function createSessionControlStream(remote: SessionRemotes, options: SessionControlStreamOptions): SessionControlStream;
/** Gateway-owned event journal bound to one ordinary or direct-subagent Session address. */
export declare class SessionEventStream extends RemoteJournalStream<SessionJournalPage, SessionHistoryRecord, number, ClientSessionPageRequest, SessionAssistantStreamFrame> {
    private readonly remote;
    private readonly address;
    /**
     * @param remote - generated Session namespace and Gateway stream factory.
     * @param address - durable ordinary-Session or direct-subagent address.
     * @param options - Session event-window destinations.
     */
    constructor(remote: SessionRemotes, address: SessionAddress, options: SessionEventStreamOptions);
    /** @inheritdoc */
    protected follow(request: ClientSessionPageRequest, signal: AbortSignal): AsyncIterable<RemoteJournalFrame<SessionHistoryRecord, number, SessionJournalPage, SessionAssistantStreamFrame>>;
    /** @inheritdoc */
    protected readPage(request: ClientSessionPageRequest, throughSeq: number, signal: AbortSignal): Promise<SessionJournalPage>;
    /** @inheritdoc */
    protected repairRequest(request: ClientSessionPageRequest): ClientSessionPageRequest;
}
//# sourceMappingURL=transport.d.ts.map