import z from "@deepseek-ai/schemastery";
import { SessionTitleLlmConfigFields, registerSessionTitleLlmProvider } from "@deepseek-ai/dsh-session-title-llm";
//#region lib/types/index.js
/** First-human-message model provider for `ctx.sessionTitle`. */
const name = "session-title-first-prompt-llm";
const inject = [
	"sessionTitle",
	"llm",
	"sessions"
];
/** Loader schema shared with the all-messages provider. */
const Config = z.object({
	targetWords: SessionTitleLlmConfigFields.targetWords,
	targetCjkCharacters: SessionTitleLlmConfigFields.targetCjkCharacters,
	maxInputBytes: SessionTitleLlmConfigFields.maxInputBytes,
	maxOutputTokens: SessionTitleLlmConfigFields.maxOutputTokens,
	timeoutMs: SessionTitleLlmConfigFields.timeoutMs,
	provider: SessionTitleLlmConfigFields.provider,
	model: SessionTitleLlmConfigFields.model
});
/**
* Register the first-prompt model provider.
* @param ctx - context exposing session-title, LLM, and session services.
* @param config - required route, target, byte, token, and timeout policy.
*/
function apply(ctx, config) {
	registerSessionTitleLlmProvider(ctx, config, name, "first-prompt", (messages) => {
		const first = messages[0];
		if (first === void 0) throw new Error("first-prompt title provider requires one human message");
		return [first];
	});
}
//#endregion
export { Config, apply, inject, name };
