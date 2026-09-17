import type { Context } from '@deepseek-ai/cordis';
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
interface PendingSnapshot {
    readonly kind: 'snapshot';
    readonly ids: readonly string[];
}
interface PendingSplice {
    readonly kind: 'splice';
    readonly previous: PendingState;
    readonly start: number;
    readonly removedCount: number;
    readonly inserted: readonly string[];
}
type PendingState = PendingSnapshot | PendingSplice;
/** Persistent next-step state after one durable Inbox splice. */
export interface InboxState {
    /** Persistent splice chain materialized only when a next-step batch is claimed. */
    readonly pending: PendingState;
    /** Message ids in the current claim, shared until the next claim. */
    readonly currentClaimed: ReadonlySet<string>;
}
/** Persistent next-step Inbox state used to classify the current claimed batch as steering. */
export declare const nextStepInboxDefinition: ConversationNodeDefinition<InboxState>;
/**
 * Register the next-step Inbox state used by Chat message classification.
 * @param ctx - owning UI Conversation context.
 */
export declare function registerInboxConversationNodes(ctx: Context): void;
export {};
//# sourceMappingURL=inbox.d.ts.map