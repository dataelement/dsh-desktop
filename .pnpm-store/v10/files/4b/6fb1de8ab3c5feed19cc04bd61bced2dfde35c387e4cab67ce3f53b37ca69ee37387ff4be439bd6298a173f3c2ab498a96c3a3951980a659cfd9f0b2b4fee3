import { isAgentLoopRequest } from "@deepseek-ai/dsh-llm";
import { foldRequestHeader } from "@deepseek-ai/dsh-session";
//#region lib/types/invariant.js
/**
* Package-owned request-reconstruction invariant for loop-built LLM calls.
* @module @deepseek-ai/dsh-agent-loop/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-agent-loop";
/** Cordis companion plugin name. */
const name = "agent-loop-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/** Install the request-reconstruction contribution into its child registration fiber. */
const install = Object.assign((ctx, fail) => {
	ctx.on("llm/stream", (options, next) => {
		if (!isAgentLoopRequest(options)) return next();
		if (!Object.isFrozen(options)) fail("a loop-built request must be frozen");
		if (options.sessionId === void 0) fail("a loop-built request must carry a session id");
		const session = ctx.sessions.get(options.sessionId);
		if (!session) fail(`a loop-built request must carry a live session id, got "${String(options.sessionId)}"`);
		if (!Object.isFrozen(options.messages)) fail("a loop-built request must carry a frozen messages array");
		const events = session.snapshotEvents();
		if (!events.some((event) => event.type === "step/start")) return fail("a loop-built request with no step/start in its session log");
		const header = foldRequestHeader(events);
		if (header === void 0) return fail("a loop-built request with no request/header event in its session log");
		const expected = session.deriveMessages();
		if (JSON.stringify(options.messages) !== JSON.stringify(expected)) fail(`llm request for session "${String(session.id)}" diverges from the dispatch-time durable derivation (log-reconstruction desync)`);
		if (!(options.model === header.config.model && options.system === void 0 && options.temperature === header.config.temperature && options.maxTokens === header.config.maxTokens && JSON.stringify(options.stop) === JSON.stringify(header.config.stop) && JSON.stringify(options.tools ?? []) === JSON.stringify(header.tools ?? []))) fail(`llm request for session "${String(session.id)}" diverges from the folded request header`);
		return next();
	}, {
		global: true,
		prepend: true
	});
}, { inject: ["sessions"] });
/**
* Register the agent-loop invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
