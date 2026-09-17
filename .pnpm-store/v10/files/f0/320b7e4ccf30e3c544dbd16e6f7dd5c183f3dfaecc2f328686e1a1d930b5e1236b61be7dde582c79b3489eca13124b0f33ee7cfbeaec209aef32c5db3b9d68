import type { Context } from '@deepseek-ai/cordis';
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { type TurnProcessSpec } from '../contract/turn-process.ts';
declare module '../contract/chat-nodes.ts' {
    interface ChatNodeDataMap {
        /** Turn-level disclosure controlling process rows before the finalized answer. */
        'turn-process': import('../contract/chat-nodes.ts').TurnProcessChatData;
    }
}
declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
    interface ConversationTurnDataMap {
        /** Process range and finalized answer boundary for this Turn. */
        'turn-process': TurnProcessSpec;
    }
}
interface TurnProcessState {
    readonly turn: number;
    readonly assistantStartByStep: ReadonlyMap<number, number>;
    readonly messageCountByStep: ReadonlyMap<number, number>;
    readonly otherStartSeq?: number;
    readonly controlAnchorSeq?: number;
    readonly messageCount: number;
    readonly toolCallCount: number;
    readonly subagentCount: number;
}
/** Turn-scoped process range and answer-boundary Definition. */
export declare const turnProcessDefinition: ConversationNodeDefinition<TurnProcessState>;
/**
 * Register the Turn-scoped process disclosure projection.
 * @param ctx - owning UI Conversation context.
 */
export declare function registerTurnProcess(ctx: Context): void;
export {};
//# sourceMappingURL=turn-process.d.ts.map