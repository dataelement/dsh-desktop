import type { Context } from '@deepseek-ai/cordis';
import type { ConversationNodeDefinition, TurnErrorNode } from '@deepseek-ai/dsh-client-ui-conversation/client';
declare module '../contract/chat-nodes.ts' {
    interface ChatNodeDataMap {
        /** Terminal turn failure recorded on the turn's end reason. */
        'turn-error': TurnErrorNode;
    }
}
interface TurnErrorState {
    readonly turn: number;
    readonly failure?: {
        readonly seq: number;
        readonly time: number;
        readonly message: string;
        readonly code?: string;
    };
}
/**
 * Terminal turn failure Definition. Retries run inside the failing turn, so the
 * turn's `llm/retry` history never suppresses this terminal row; the model-retry
 * node renders that history separately.
 */
export declare const turnErrorDefinition: ConversationNodeDefinition<TurnErrorState>;
/**
 * Register the terminal Turn-error business contribution.
 * @param ctx - owning UI Conversation context.
 */
export declare function registerTurnErrorConversationNode(ctx: Context): void;
export {};
//# sourceMappingURL=turn-error.d.ts.map