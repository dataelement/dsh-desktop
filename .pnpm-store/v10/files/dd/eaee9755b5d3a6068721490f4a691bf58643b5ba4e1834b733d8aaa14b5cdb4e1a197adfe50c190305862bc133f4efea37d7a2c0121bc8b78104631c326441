/** Per-Session Chat view store. */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import type { ChatStoreState, TurnProcessViewEntry } from './contract/store.ts';
type ChatActions = {
    setTurnProcessOpen: (draft: ChatStoreState, turn: number, answerStep: number, open: boolean) => void;
};
/**
 * Resolve the manually expanded answer for one Turn.
 * @param state - Chat store snapshot.
 * @param turn - owning Turn.
 * @returns the Turn's stored entry, when present.
 */
export declare function storedTurnProcessEntry(state: Readonly<ChatStoreState>, turn: number): Readonly<TurnProcessViewEntry> | undefined;
/**
 * Create the Chat view store handle.
 * @returns a handle instantiated once per rendered Session scope.
 */
export declare function createChatStore(): EngineStoreHandle<ChatStoreState, ChatActions>;
export {};
//# sourceMappingURL=stores.d.ts.map