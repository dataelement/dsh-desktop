/** Target-neutral Conversation state assembled from one Session event window. */
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client';
import type { ConversationViewSnapshotStore } from './conversation.ts';
/** Latest registered target snapshots and their shell-level activity. */
export interface ConversationSnapshot {
    readonly views: ConversationViewSnapshotStore;
    readonly activeTargets: ReadonlySet<string>;
}
/** Empty Conversation value used before a Session binding is available. */
export declare const EMPTY_CONVERSATION_SNAPSHOT: ConversationSnapshot;
/** Shell phase derived from Session lifecycle and registered target activity. */
export type ConversationPhase = 'blank' | 'engaging' | 'active';
/**
 * Resolve the shell phase without adding Conversation data to the Session snapshot.
 * @param session - current Session lifecycle state.
 * @param conversation - current target-neutral Conversation state.
 * @returns the phase used by the header, View ring, and composer layout.
 */
export declare function conversationPhase(session: SessionSnapshot, conversation: ConversationSnapshot): ConversationPhase;
//# sourceMappingURL=snapshot.d.ts.map