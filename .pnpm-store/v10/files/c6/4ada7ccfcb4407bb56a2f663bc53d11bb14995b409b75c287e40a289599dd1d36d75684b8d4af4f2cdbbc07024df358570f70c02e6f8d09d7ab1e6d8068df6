/**
 * Service Definition for the user-questions capability seam (`ctx.userQuestions`): a UI-backed service for
 * pausing an agent tool call until the human answers a question. The model-
 * facing tool lives in `@deepseek-ai/dsh-tool-ask-user`; UI packages compose
 * answerers on the Agent-scoped Cordis waterfall.
 *
 * @module @deepseek-ai/dsh-user-questions
 */
import { Context, Service } from '@deepseek-ai/cordis';
import { HarnessError } from '@deepseek-ai/dsh-llm';
declare module '@deepseek-ai/cordis' {
    interface Context {
        userQuestions: UserQuestionService;
    }
}
import type { AskUserQuestionAnswer, AskUserQuestionRequestEvent } from './types.ts';
export type { AskUserQuestionAnswer, AskUserQuestionAnswerItem, AskUserQuestionIntent, AskUserQuestionItem, AskUserQuestionOption, } from './types.ts';
/** Request for a human answer. */
export interface AskUserQuestionRequest extends AskUserQuestionRequestEvent {
}
/** Stable error taxonomy for user-questions failures. */
export declare class UserQuestionError extends HarnessError {
    constructor(message: string, code: string, options?: ErrorOptions);
}
/** `ctx.userQuestions`: validation plus the scoped answerer waterfall. */
export declare class UserQuestionService extends Service {
    constructor(ctx: Context);
    /**
     * Ask the scoped answerer waterfall and wait for the user's answer.
     *
     * When a caller supplies an agent, human interaction is valid only for the
     * exact live runtime root. Runtime ownership, not durable session lineage,
     * decides this boundary: an owned child has no human answerer and would
     * block forever, while a lineage-bearing session resumed as a new runtime
     * root may ask normally.
     *
     * @param request Questions, owner agent, and abort signal.
     * @returns The answer chosen or typed by the human.
     * @throws {UserQuestionError} code `ASK_ABORTED` when the supplied signal
     *   is already or becomes aborted, `CALLER_NOT_LIVE` when a supplied agent
     *   is not the registry's exact live instance, or `DELEGATED_CALLER` when
     *   that live agent is owned by another agent.
     */
    ask(request: AskUserQuestionRequest): Promise<AskUserQuestionAnswer>;
}
export default UserQuestionService;
//# sourceMappingURL=index.d.ts.map