/**
 * Session-scoped draft state for the generic question composer. The Slot
 * registry owns store instances; this module exports only the factory so a
 * plugin reload cannot reuse a module-global handle.
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
/** One in-progress answer, including an explicit skip. */
export interface QuestionDraftAnswer {
    /** Offered labels currently selected. */
    selected: string[];
    /** Human-authored alternative or additional answer. */
    custom: string;
    /** Whether the user explicitly skipped this question. */
    skipped: boolean;
}
/** Navigation and answer drafts for one pending request. */
export interface QuestionDraftProgress {
    /** Current question index. */
    index: number;
    /** One draft per question, in request order. */
    drafts: QuestionDraftAnswer[];
}
interface QuestionDraftState {
    requestKey?: string;
    progress: QuestionDraftProgress;
}
type QuestionDraftActions = {
    replace: (draft: QuestionDraftState, requestKey: string, progress: QuestionDraftProgress) => void;
    clear: (draft: QuestionDraftState, requestKey: string) => void;
};
/**
 * Declare the question composer's transient Session store.
 * @returns a non-persisted store handle whose instance is owned by the Slot registry.
 */
export declare function createQuestionDraftStore(): EngineStoreHandle<QuestionDraftState, QuestionDraftActions>;
export {};
//# sourceMappingURL=draft-store.d.ts.map