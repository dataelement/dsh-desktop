import type { Context } from '@deepseek-ai/cordis';
import type { ConversationNodeDefinition, ToolCallBlock } from '@deepseek-ai/dsh-client-ui-conversation/client';
declare module '../contract/chat-nodes.ts' {
    interface ChatNodeDataMap {
        /** Root Tool lifecycle with recursively nested subcalls. */
        'tool-call': ToolChatData;
    }
}
interface ToolState {
    readonly root: ToolCallBlock;
    readonly children: ReadonlyMap<string, readonly ToolCallBlock[]>;
    readonly parents: ReadonlyMap<string, string>;
}
/** Root Tool lifecycle and nested PTC dispatch Definition. */
export declare const toolDefinition: ConversationNodeDefinition<ToolState>;
/**
 * Register the root Tool lifecycle and nested-subcall contribution.
 * @param ctx - owning UI Conversation context.
 */
export declare function registerToolConversationNode(ctx: Context): void;
export {};
//# sourceMappingURL=tool.d.ts.map