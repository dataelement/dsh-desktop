import type { SessionAssistantSettlementEntry, SessionEventLikeEntry } from '@deepseek-ai/dsh-api-session-controller/client';
import type { LlmAttemptId } from '@deepseek-ai/dsh-llm/brand';
import type { ConversationNodeDefinition, ConversationPublication, ConversationViewDefinition, ConversationViewSnapshotMap, ConversationViewSnapshotStore } from '../contract/conversation.ts';
/** Event Registry subset consumed by a Session-owned Assembler. */
export interface ConversationEventDefinitions {
    /** @returns ordinary Definitions in registration order. */
    entries(): readonly ConversationNodeDefinition[];
    /** @returns unmatched-event fallback, when registered. */
    fallbackEntry(): ConversationNodeDefinition | undefined;
}
/** View Registry subset consumed by a Session-owned Assembler. */
export interface ConversationViewDefinitions {
    /** @returns view builder factories in registration order. */
    entries(): readonly ConversationViewDefinition[];
}
/**
 * Session-owned incremental engine that assembles business Contexts from a
 * contiguous Event window and materializes registered view snapshots.
 */
export declare class ConversationNodeAssembler implements ConversationViewSnapshotStore {
    private readonly eventDefinitions;
    private readonly viewDefinitions;
    private readonly contexts;
    private readonly contextsByKind;
    private readonly contextsBySeq;
    private readonly contextsByTarget;
    private readonly inputs;
    private readonly locationIndex;
    private readonly dirty;
    private readonly dirtyByTarget;
    private readonly revised;
    private readonly dependents;
    private readonly views;
    private readonly activeTargets;
    private hasMore;
    private replacePending;
    private timelineDirty;
    /**
     * @param eventDefinitions - live Event Definition registry.
     * @param viewDefinitions - live view builder registry.
     */
    constructor(eventDefinitions: ConversationEventDefinitions, viewDefinitions: ConversationViewDefinitions);
    /**
     * Replace the complete loaded window after open, resync, or gap repair.
     * @param entries - complete contiguous window.
     * @param hasMore - whether older history remains outside the window.
     * @returns immediate publication request.
     */
    replaceWindow(entries: readonly SessionEventLikeEntry[], hasMore: boolean): ConversationPublication;
    /**
     * Add one contiguous live tail event without scanning existing Contexts.
     * @param record - appended Session event entry.
     * @returns highest requested publication cadence.
     */
    append(record: SessionEventLikeEntry): ConversationPublication;
    /**
     * Retire one Assistant attempt's transient matches and apply its optional durable settlement.
     * @param attemptId - process-local attempt whose transient presentation ended.
     * @param entry - durable message or attempt event committed for the stream.
     * @returns highest requested publication cadence.
     */
    settleAssistant(attemptId: LlmAttemptId, entry?: SessionAssistantSettlementEntry): ConversationPublication;
    /**
     * Add an older page while preserving existing Context and view identities.
     * @param entries - newly loaded older Events.
     * @param hasMore - whether history still precedes the expanded window.
     * @returns highest requested publication cadence.
     */
    prepend(entries: readonly SessionEventLikeEntry[], hasMore: boolean): ConversationPublication;
    /**
     * Rebuild against the current Registry set after a low-frequency plugin change.
     * @returns immediate publication request.
     */
    rebuildRegistry(): ConversationPublication;
    /**
     * Materialize dirty Contexts and advance every active view builder.
     * @returns whether any view snapshot was rebuilt or incrementally applied.
     */
    flush(): boolean;
    /**
     * Add one target to the monotonic active set and materialize its current snapshot.
     * Pending Context work is flushed before the first complete replacement.
     * @param target - registered or subsequently registered view target.
     * @returns whether any active target snapshot changed.
     */
    activateTarget(target: string): boolean;
    /**
     * Read the latest snapshot of a registered target.
     * @param target - registered view target.
     * @returns target snapshot, or undefined before registration or activation.
     */
    snapshot(target: string): unknown;
    get<Target extends Extract<keyof ConversationViewSnapshotMap, string>>(target: Target): ConversationViewSnapshotMap[Target] | undefined;
    /**
     * Read targets whose owners classify their latest snapshot as visible activity.
     * @returns target ids contributing visible activity.
     */
    activityTargets(): ReadonlySet<string>;
    private sortedInputs;
    private matchInput;
    private collectInput;
    private dispatchInput;
    private createContext;
    private acceptMatch;
    private applyPendingMatches;
    private replayContexts;
    private replayContext;
    private indexTargetContext;
    private markDirty;
    private replaceDependencies;
    private replayRevisedDependents;
    private readerFor;
    private previousContext;
    /** Insert one newly discovered start into its Definition's ordered predecessor index. */
    private indexStartedContext;
    private indexStartedContexts;
    private replayDependencies;
    private refreshMatchLocations;
    private buildNode;
    private replaceView;
    private buildTargetNodes;
    private buildTargetUpserts;
    private buildLocationData;
    private replaceLocationData;
    private applyDirtyLocationData;
    private resetViewBuilders;
}
//# sourceMappingURL=assembler.d.ts.map