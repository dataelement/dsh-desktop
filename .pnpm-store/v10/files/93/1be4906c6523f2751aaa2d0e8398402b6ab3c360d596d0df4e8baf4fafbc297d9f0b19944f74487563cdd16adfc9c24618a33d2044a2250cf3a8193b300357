import { TOOL_ABORTED_BEFORE_DISPATCH } from "@deepseek-ai/dsh-tools";
//#region lib/types/index.js
/**
* Semantic durability checkpoints for model requests, top-level tool dispatch,
* and completed agent steps.
* @module @deepseek-ai/dsh-session-checkpoint-policy
*/
/** Cordis plugin name used by Loader diagnostics. */
const name = "session-checkpoint-policy";
/** Services whose request, tool, session, and persistence boundaries this policy joins. */
const inject = [
	"llm",
	"sessionPersistence",
	"sessions",
	"tools"
];
/**
* Delay construction of the downstream model stream until the complete logged
* request prefix is durable. A checkpoint rejection prevents adapter dispatch.
*
* @param ctx - plugin context that owns the session store.
* @param session - live session named by the model request.
* @param next - downstream `llm/stream` chain.
* @returns a stream that checkpoints before requesting its first chunk.
*/
function afterCheckpoint(ctx, session, next) {
	return (async function* () {
		await ctx.sessions.flush(session);
		yield* next();
	})();
}
/** Materialize the canonical result for a call cancelled before tool dispatch. */
function abortedBeforeDispatchResult() {
	return {
		content: [{
			type: "text",
			text: "Error: tool call aborted before dispatch"
		}],
		isError: true,
		error: {
			message: "tool call aborted before dispatch",
			info: {
				name: "AbortError",
				code: TOOL_ABORTED_BEFORE_DISPATCH
			}
		}
	};
}
/**
* Install semantic checkpoint listeners. Loop-built model calls checkpoint the
* logged request before adapter dispatch; top-level tool calls checkpoint their
* recorded call before the tool body; the next request boundary checkpoints
* the preceding response/result batch. Nested tool dispatches reuse the durable outer call.
*
* Checkpoint failures are fail-closed at the model and tool side-effect
* boundaries: the downstream adapter or tool body is not invoked.
*
* @param ctx - plugin context that owns the listeners.
*/
function apply(ctx) {
	ctx.on("llm/stream", (options, next) => {
		if (options.sessionId === void 0) return next();
		const session = ctx.sessions.get(options.sessionId);
		return session === void 0 ? next() : afterCheckpoint(ctx, session, next);
	});
	ctx.on("tools/execute", async (exec, next) => {
		if (exec.agent === void 0 || exec.parent !== void 0) return next();
		await ctx.sessions.flush(exec.agent.session);
		if (exec.signal.aborted) return abortedBeforeDispatchResult();
		return next();
	});
	ctx.on("agent/pre-step", async ({ agent }, next) => {
		await ctx.sessions.flush(agent.session);
		return next();
	});
}
//#endregion
export { apply, inject, name };
