import type { Context } from '@deepseek-ai/cordis';
import type { ConversationTimelineSnapshot, ConversationViewBuilder, ConversationViewDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ChatConversationViewNode } from '../contract/chat-nodes.ts';
import type { ChatNodeStore, ChatSnapshot } from '../contract/snapshot.ts';
/**
 * Order visible Chat Nodes without changing existing relative order as process
 * eligibility changes. Opening human input precedes process candidates, while
 * each synthetic process control sits between them.
 * @param nodes - currently materialized Chat Nodes.
 * @returns visible Nodes in presentation order.
 */
export declare function orderedVisibleChatNodes(nodes: readonly ChatConversationViewNode[]): ChatConversationViewNode[];
/**
 * Attaches each direct message's step-loaded skill names to its Node.
 *
 * A step's `skill-invocation` injections follow the direct messages the host
 * scanned for `/name` gestures and precede the step's first Node of any other
 * kind, so every non-message, non-context Node closes a batch. Every ended
 * Turn publishes its `turn-tail` Node on `turn/end` whatever the reason, so a
 * batch never spans Turns, and `step/start` precedes the direct message in
 * the log, so no boundary separates a message from its injections. Names
 * attach to every direct message of the batch: the bubble decorates only the
 * tokens its own text carries.
 *
 * The index holds only messages, skill injections, and boundaries, ordered by
 * `anchorSeq`. An apply re-reads just the batches around the Nodes whose
 * classification changed and never scans the store, so an assistant
 * streaming frame costs nothing here (the append hot path never scans the
 * Chat Nodes).
 */
export declare class SkillNameProjector {
    private readonly entries;
    /** Every indexed entry in `anchorSeq` order. */
    private sorted;
    /**
     * Rebuild the index from a whole Node set and attach names to its messages.
     * @param nodes - every materialized Chat Node, in any order.
     * @returns the same Nodes, direct messages carrying their batch's names.
     */
    replace(nodes: readonly ChatConversationViewNode[]): readonly ChatConversationViewNode[];
    /**
     * Fold one incremental upsert set: re-read only the batches around the
     * Nodes whose classification changed.
     * @param upserts - the changed Nodes.
     * @param store - the resident Nodes, read by key for the messages of an affected batch.
     * @returns the upserts plus any resident message whose names changed.
     */
    apply(upserts: readonly ChatConversationViewNode[], store: ChatNodeStore): readonly ChatConversationViewNode[];
    private insert;
    private remove;
    /** First index whose seq is at least `seq`. */
    private lowerBound;
    /** Last index of the boundary-free run containing `index`. */
    private runEnd;
    /** First index of the boundary-free run containing `index`. */
    private runStart;
    /** Record the names every message of the run `[start, end]` carries. */
    private assignRun;
    /**
     * Re-read the run(s) around one changed seq: the run holding a message or
     * skill entry, or — for a boundary, or a seq that left the index — the runs
     * on both sides of that position.
     */
    private collectAround;
}
/** Incremental keyed Chat builder registered under the `chat` target. */
export declare class ChatSnapshotBuilder implements ConversationViewBuilder<ChatConversationViewNode, ChatSnapshot> {
    private readonly store;
    private readonly locations;
    private readonly navigation;
    private readonly legacy;
    private readonly referenceLabels;
    private readonly skillNames;
    private order;
    /** Last published timeline: a Turn boundary can land without a new node. */
    private timeline;
    readonly empty: ChatSnapshot;
    constructor();
    replace(input: {
        readonly nodes: readonly ChatConversationViewNode[];
        readonly timeline: ConversationTimelineSnapshot;
    }): ChatSnapshot;
    apply(input: {
        readonly upserts: readonly ChatConversationViewNode[];
        readonly timeline: ConversationTimelineSnapshot;
    }): ChatSnapshot;
    private snapshot;
}
/** Chat target factory contributed to the Conversation view registry. */
export declare const chatViewDefinition: ConversationViewDefinition<ChatConversationViewNode, ChatSnapshot>;
/**
 * Register the incremental Chat target builder.
 * @param ctx - owning UI Conversation context.
 */
export declare function registerChatConversationView(ctx: Context): void;
//# sourceMappingURL=chat-snapshot-builder.d.ts.map