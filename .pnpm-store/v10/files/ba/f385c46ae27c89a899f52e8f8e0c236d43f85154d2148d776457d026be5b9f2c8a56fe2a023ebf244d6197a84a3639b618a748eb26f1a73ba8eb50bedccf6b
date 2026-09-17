import { type AssistantLiveChunkEvent, type SessionEventLike, type SessionEventLikeEntry } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionEvent } from '@deepseek-ai/dsh-session/types';
import type { ConversationLocation, ConversationLocationData, ConversationTimelineSnapshot } from '../contract/conversation.ts';
/** One Context's previous and next Location-data publication. */
export interface ConversationLocationDataChange {
    readonly owner: string;
    readonly previous: ConversationLocationData | null;
    readonly next: ConversationLocationData | null;
}
/** Session-owned Turn/Step timeline and event-to-Location index. */
export declare class ConversationLocationIndex {
    private coordinates;
    private locations;
    private seqsByTurn;
    private timeline;
    private readonly turnDataStores;
    private readonly stepDataStores;
    private readonly dirtyDataStores;
    private currentTurn;
    private currentStep;
    /**
     * Return the current reference-stable timeline.
     * @returns current timeline snapshot.
     */
    snapshot(): ConversationTimelineSnapshot;
    /**
     * Replace all Definition-owned Location values while preserving reader identities.
     * @param entries - complete current set of Definition-owned Location values.
     * @returns whether any published Location data changed.
     */
    replaceData(entries: readonly {
        readonly owner: string;
        readonly data: ConversationLocationData;
    }[]): boolean;
    /**
     * Apply changed Context publications without rebuilding Turn/Step membership.
     * @param changes - incremental removals and replacements from published Contexts.
     * @returns whether any published Location data changed.
     */
    applyData(changes: readonly ConversationLocationDataChange[]): boolean;
    /** Publish committed Location-data changes to their keyed sources. */
    publishData(): void;
    /**
     * Resolve the latest Location for one event.
     * @param event - event already ingested into this index.
     * @returns current Location, falling back to session when it has no Turn/Step affinity.
     */
    locationOf(event: SessionEventLike): ConversationLocation;
    /**
     * Rebuild timeline facts after replace/prepend or a boundary append.
     * @param entries - complete current window in ascending seq order.
     * @returns seqs whose resolved Location changed.
     */
    rebuild(entries: readonly SessionEventLikeEntry[]): ReadonlySet<number>;
    /**
     * Append one Turn/Step boundary while revisiting only the owning Turn.
     * @param event - contiguous tail boundary event.
     * @returns seqs whose immutable Location reference changed.
     */
    appendBoundary(event: SessionEvent): ReadonlySet<number>;
    /**
     * Index one non-boundary tail event without rescanning the window.
     * @param event - contiguous appended event.
     */
    appendNonBoundary(event: SessionEventLike): void;
    /**
     * Remove indexed Assistant transients without rebuilding the Turn/Step timeline.
     * @param events - transient events retired by one Assistant settlement.
     */
    removeAssistantTransients(events: readonly AssistantLiveChunkEvent[]): void;
    /**
     * Index one durable Assistant settlement inserted before an already visible tail.
     * @param event - message or attempt settlement with explicit Turn and Step coordinates.
     */
    insertAssistantSettlement(event: SessionEvent<'assistant/message'> | SessionEvent<'assistant/attempt'>): void;
    private indexTurnSeq;
    private turnData;
    private stepData;
    private mutableTurnData;
    private mutableStepData;
    private createDataStore;
    private storeFor;
    private resolve;
}
//# sourceMappingURL=location-index.d.ts.map