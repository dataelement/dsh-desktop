/** Observable contiguous Session event window consumed by domain assemblers. */
import { type ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { LlmAttemptId, StreamChunk } from '@deepseek-ai/dsh-llm';
import type { SessionEvent } from '@deepseek-ai/dsh-session/types';
/** Client-only live chunk presentation; `seq` orders the transient row between durable Session seqs. */
export interface AssistantLiveChunkEvent {
    readonly type: 'assistant/live-chunk';
    readonly seq: number;
    readonly time: number;
    readonly data: {
        readonly attemptId: LlmAttemptId;
        readonly turn: number;
        readonly step: number;
        readonly chunk: StreamChunk;
    };
}
/** Current durable Session event or one client-only live chunk presentation. */
export type SessionEventLike = SessionEvent | AssistantLiveChunkEvent;
/** Client history entry retaining its coarse transport discriminator. */
export type SessionEventLikeEntry = {
    readonly type: 'event';
    readonly event: SessionEvent;
} | {
    readonly type: 'transient';
    readonly event: AssistantLiveChunkEvent;
};
/** Scalar live entry accepted by append-only Client paths. */
export type SessionLiveEventEntry = Extract<SessionEventLikeEntry, {
    readonly type: 'event';
}>;
/** Durable Assistant event that atomically supersedes one attempt's transient rows. */
export interface SessionAssistantSettlementEntry {
    readonly type: 'event';
    readonly event: SessionEvent<'assistant/message'> | SessionEvent<'assistant/attempt'>;
}
/** Client-only Assistant frame admitted outside durable cursor algebra. */
export type SessionTransientEventEntry = Extract<SessionEventLikeEntry, {
    readonly type: 'transient';
}>;
/** Exact delta that produced the latest event-window revision. */
export type SessionEventChange = {
    readonly kind: 'replace';
    readonly entries: readonly SessionEventLikeEntry[];
} | {
    readonly kind: 'prepend';
    readonly entries: readonly SessionEventLikeEntry[];
} | {
    readonly kind: 'append';
    readonly entries: readonly SessionEventLikeEntry[];
} | {
    readonly kind: 'settle-assistant';
    readonly attemptId: LlmAttemptId;
    readonly entry?: SessionAssistantSettlementEntry;
};
/** Current contiguous event window and its latest synchronous delta. */
export interface SessionEventWindow {
    readonly entries: readonly SessionEventLikeEntry[];
    readonly hasMore: boolean;
    readonly revision: number;
    readonly change: SessionEventChange;
}
/** Conversation-facing event source exposed by one Session binding. */
export type SessionEventSource = ObservableSnapshot<SessionEventWindow>;
/** Session-owned event feed; every accepted window mutation publishes synchronously. */
export declare class MutableSessionEventSource implements SessionEventSource {
    private readonly listeners;
    private window;
    private snapshot;
    /** @returns the cached event-window snapshot. */
    getSnapshot(): SessionEventWindow;
    /**
     * Subscribe to synchronous window publication.
     * @param listener - invalidation callback.
     * @returns unsubscribe function.
     */
    subscribe(listener: () => void): () => void;
    /**
     * Replace the complete contiguous window.
     * @param entries - complete window.
     * @param hasMore - whether older history remains.
     */
    replace(entries: readonly SessionEventLikeEntry[], hasMore: boolean): void;
    /**
     * Prepend one older contiguous page.
     * @param entries - newly loaded older entries.
     * @param hasMore - whether still older history remains.
     */
    prepend(entries: readonly SessionEventLikeEntry[], hasMore: boolean): void;
    /**
     * Append one contiguous live entry.
     * @param entry - live tail entry.
     */
    append(entry: SessionEventLikeEntry): void;
    /**
     * Replace one attempt's transient rows with its committed durable settlement.
     * @param attemptId - process-local attempt whose live rows are now redundant.
     * @param entry - durable settlement committed for that attempt.
     */
    settleAssistant(attemptId: LlmAttemptId, entry?: SessionAssistantSettlementEntry): void;
    private publish;
}
//# sourceMappingURL=events.d.ts.map