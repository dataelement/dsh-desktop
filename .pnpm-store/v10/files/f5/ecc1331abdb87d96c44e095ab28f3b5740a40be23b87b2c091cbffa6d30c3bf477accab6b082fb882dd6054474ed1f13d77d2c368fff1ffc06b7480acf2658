import type { ConversationViewDefinition } from '../contract/conversation.ts';
import { ConversationDefinitionRegistry } from './definition-registry.ts';
/** Runtime registry of per-target Conversation snapshot builders. */
export declare class ConversationViewRegistry extends ConversationDefinitionRegistry<ConversationViewDefinition> {
    /**
     * Register a uniquely named view builder factory for the caller's lifetime.
     * @param definition - target builder contribution.
     * @returns idempotent disposer.
     */
    register(definition: ConversationViewDefinition): () => void;
}
//# sourceMappingURL=view-registry.d.ts.map