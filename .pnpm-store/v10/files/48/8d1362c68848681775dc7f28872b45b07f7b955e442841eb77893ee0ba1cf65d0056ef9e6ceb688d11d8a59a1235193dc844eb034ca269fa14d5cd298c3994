import { Service } from "@deepseek-ai/cordis";
import { HarnessError } from "@deepseek-ai/dsh-llm";
import { scopeTarget } from "@deepseek-ai/dsh-scope";
//#region lib/types/index.js
/**
* Service Definition for the user-questions capability seam (`ctx.userQuestions`): a UI-backed service for
* pausing an agent tool call until the human answers a question. The model-
* facing tool lives in `@deepseek-ai/dsh-tool-ask-user`; UI packages compose
* answerers on the Agent-scoped Cordis waterfall.
*
* @module @deepseek-ai/dsh-user-questions
*/
/** Stable error taxonomy for user-questions failures. */
var UserQuestionError = class extends HarnessError {
	constructor(message, code, options) {
		super(message, code, options);
		this.name = "UserQuestionError";
	}
};
function abortedQuestion(cause) {
	return new UserQuestionError("ask_user_question was aborted before the user answered", "ASK_ABORTED", cause === void 0 ? void 0 : { cause });
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function restoreUserQuestionError(reason) {
	if (reason instanceof UserQuestionError) return reason;
	if (isRecord(reason) && reason.name === "UserQuestionError" && typeof reason.message === "string" && typeof reason.code === "string") return new UserQuestionError(reason.message, reason.code, { cause: reason });
	return reason;
}
/** `ctx.userQuestions`: validation plus the scoped answerer waterfall. */
var UserQuestionService = class extends Service {
	constructor(ctx) {
		super(ctx, "userQuestions");
	}
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
	async ask(request) {
		if (request.signal?.aborted) throw abortedQuestion();
		if (request.questions.length === 0) throw new UserQuestionError("ask_user_question requires at least one question", "EMPTY_QUESTIONS");
		const agent = request.agent;
		if (agent !== void 0) {
			const agents = this.ctx.get("agents");
			if (agents === void 0 || agents.get(agent.id) !== agent) throw new UserQuestionError("human interaction requires the exact live calling agent when an agent is supplied", "CALLER_NOT_LIVE");
			if (!agents.roots().includes(agent)) throw new UserQuestionError("human interaction is unavailable while the calling agent is owned by another live agent; include the unresolved question or decision in the child agent's final result", "DELEGATED_CALLER");
		}
		for (const question of request.questions) {
			const intent = question.intent;
			if (intent === void 0) continue;
			if (!(question.options ?? []).some((option) => option.label === intent.approve)) throw new UserQuestionError(`question ${question.id} declares intent ${intent.kind} whose approve label ${JSON.stringify(intent.approve)} names none of its options`, "BAD_INTENT");
			if (question.detail === void 0) throw new UserQuestionError(`question ${question.id} declares intent ${intent.kind} without the detail it reviews`, "BAD_INTENT");
		}
		const noAnswerer = () => Promise.reject(new UserQuestionError("no user-questions answerer accepted the request", "NO_PROVIDER"));
		try {
			return await (agent === void 0 ? this.ctx.waterfall("user-questions/request", request, noAnswerer) : this.ctx.waterfall(scopeTarget(agent, agent), "user-questions/request", {
				...request,
				agent
			}, noAnswerer));
		} catch (error) {
			const restored = restoreUserQuestionError(error);
			if (restored instanceof UserQuestionError) throw restored;
			if (request.signal?.aborted) throw abortedQuestion(error);
			throw restored;
		}
	}
};
//#endregion
export { UserQuestionError, UserQuestionService, UserQuestionService as default };
