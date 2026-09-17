/** Question composer props and one pending Remote waterfall response. */
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { AskUserQuestionAnswer, AskUserQuestionItem } from '@deepseek-ai/dsh-user-questions';
import type { createQuestionDraftStore } from '../draft-store.ts';
declare module '@deepseek-ai/dsh-client-ui-session/client' {
    interface SessionPendingInteractionMap {
        /** Pending question or plan-review request. */
        question: PendingQuestion;
    }
}
/** One structured answer batch covering every question of the request. */
export type QuestionAnswer = AskUserQuestionAnswer;
/** One question of the request. */
type QuestionItem = AskUserQuestionItem;
/** One option the asker offered on a question. */
type QuestionOption = NonNullable<QuestionItem['options']>[number];
/**
 * A request narrowed to the `plan-review` presentation intent: everything the
 * decision card renders and answers with, so the panel never re-reads the
 * request fields. `approve` and `decline` are the asker's own options — an
 * answer must carry one of those labels verbatim — and `plan` is the markdown
 * body under review.
 */
export interface PlanReview {
    /** The reviewed question's id, echoed in the answer. */
    id: string;
    /** The question text, kept as the card's accessible name. */
    question: string;
    /** The plan markdown under review. */
    plan: string;
    /** The option that approves the plan. */
    approve: QuestionOption;
    /** The option that declines it; absent when the asker offered no other option. */
    decline?: QuestionOption;
}
/**
 * Narrow a request to a renderable plan review, or return undefined to leave it
 * to the generic question flow.
 *
 * The card is one decision over one plan, and it claims a request only when it
 * can send every answer that request allows — an intent changes the layout,
 * never which answers are reachable. So the batch must be a single question
 * that declares the intent, carries the plan as its detail, offers the approve
 * label the intent names, and is a binary single choice: at most one option
 * besides approve, and not multi-select. A third option or a multi-select batch
 * has answers two buttons cannot express, so the generic flow keeps it — as it
 * keeps any request whose intent the asker's own service would have rejected,
 * because the client sits downstream of a wire boundary and every request must
 * stay answerable.
 *
 * @param questions - the request's whole question batch.
 * @returns The narrowed review, or undefined when the generic flow owns it.
 */
export declare function planReviewOf(questions: readonly QuestionItem[]): PlanReview | undefined;
/** One answerable Client presentation of a pending Host waterfall. */
export declare class PendingQuestion {
    #private;
    readonly sessionId: SessionId;
    /** Presentation discriminator used by Session pending-interaction consumers. */
    readonly kind: 'question' | 'plan-review';
    /** Opaque render identity and request key for the Session-scoped draft store. */
    readonly key: string;
    /** The request's question list. */
    readonly questions: readonly AskUserQuestionItem[];
    /** Result returned by the Remote Event listener to the Host waterfall. */
    readonly result: Promise<QuestionAnswer>;
    /**
     * @param sessionId - Agent/Session identity owning the scoped request.
     * @param questions - complete question batch.
     * @param signal - Host request and delivery lifetime.
     */
    constructor(sessionId: SessionId, questions: readonly AskUserQuestionItem[], signal?: AbortSignal);
    /**
     * Resolve the Host waterfall with the whole answer batch.
     * @param answer - complete structured answer batch.
     */
    answer(answer: QuestionAnswer): Promise<void>;
    /** Delegate an unanswered request to the next waterfall listener. */
    delegate(): void;
    /**
     * Test whether a rejection requests waterfall delegation.
     * @param reason - rejection received from {@link PendingQuestion.result}.
     * @returns whether {@link PendingQuestion.delegate} produced it.
     */
    isDelegation(reason: unknown): boolean;
    /** Reject the Host waterfall because the user closed the question. */
    cancel(): Promise<void>;
    /**
     * End an unanswered presentation when its transport, scope, or plugin lifetime ends.
     * @param reason - rejection exposed to the waiting Remote Event listener.
     */
    abort(reason: unknown): void;
    private finish;
}
/** Pending value returned by the composer-chain selector. */
export type QuestionWait = PendingQuestion;
/**
 * Full component props: the framework runtime share (chain currency +
 * session/global standard kit) plus the chain `matched` share — the entry's
 * selector result, already narrowed to the question carrier — plus the
 * standard locale seat; the carrier plus the domain face above carry the
 * whole behavior surface.
 */
export type QuestionComposerProps = PropsRuntime<'conversation.composer'> & PropsStore<ReturnType<typeof createQuestionDraftStore>> & {
    matched: QuestionWait;
} & PropsLocale<'question'>;
export {};
//# sourceMappingURL=slots.d.ts.map