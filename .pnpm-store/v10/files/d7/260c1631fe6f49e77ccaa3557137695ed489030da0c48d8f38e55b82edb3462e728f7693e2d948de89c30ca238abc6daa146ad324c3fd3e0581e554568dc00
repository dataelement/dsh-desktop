import type { Context } from '@deepseek-ai/cordis';
import type { ConversationNodeDefinition, RequestPromptInspector, SystemPromptState, SystemPromptInspector } from '@deepseek-ai/dsh-client-ui-conversation/client';
declare module '../contract/chat-nodes.ts' {
    interface ChatNodeDataMap {
        /** Complete system prompt rendered for one model request, or an in-history prompt update at its own position. */
        'system-prompt': {
            readonly text: string;
            readonly update?: true;
        };
    }
}
interface RequestPromptState extends ReturnType<RequestPromptInspector> {
    readonly anchorSeq: number;
    readonly showsPrompt: boolean;
    readonly turn?: number;
    readonly step?: number;
}
/**
 * System-prompt surface node Definition for the Chat target. It owns every
 * `system/message` event on the Chat target so the unknown-surface fallback
 * never renders the prompt as a transcript row. Each nonempty append owns a
 * prompt card, even without a loaded request header. Initial cards precede
 * their step's input; in-history updates stay at their own positions. The
 * request-prompt Definition owns replacement and later-series cards. Positional
 * replacements advance the effective prompt without changing historical cards.
 * @param inspect - Pure surface interpretation supplied by uiConversation.
 * @returns The Chat system-prompt Definition.
 */
export declare function systemMessageDefinition(inspect: SystemPromptInspector): ConversationNodeDefinition<SystemPromptState>;
/**
 * Request-header prompt Definition for the Chat target. Resume and explicit
 * series starts retain a prompt card even when the system text is unchanged.
 * @param inspect - the shared prompt interpretation, supplied by the
 * uiConversation service (a client bundle cannot value-import it).
 * @returns the Chat request-prompt Definition.
 */
export declare function requestPromptDefinition(inspect: RequestPromptInspector): ConversationNodeDefinition<RequestPromptState>;
/**
 * Register the system-prompt surface node and the model-request prompt card in the Chat flow.
 * @param ctx - Owning UI Conversation context.
 */
export declare function registerRequestPromptConversationNode(ctx: Context): void;
export {};
//# sourceMappingURL=request-prompt.d.ts.map