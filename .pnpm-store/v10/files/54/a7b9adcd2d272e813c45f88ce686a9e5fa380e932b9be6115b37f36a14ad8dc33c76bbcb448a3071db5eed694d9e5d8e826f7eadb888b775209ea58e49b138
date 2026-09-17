//#region lib/types/invariant.js
/** Package-owned durable todo-snapshot invariants. @module @deepseek-ai/dsh-tool-todo/invariant */
const PACKAGE_NAME = "@deepseek-ai/dsh-tool-todo";
const TODO_STATUSES = new Set([
	"pending",
	"in_progress",
	"completed"
]);
/** Cordis companion plugin name. */
const name = "tool-todo-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* Validate one whole-list todo snapshot before it reaches the durable log.
*
* Deliberately silent on how many items are `in_progress`. That is the tool's
* per-deployment policy (`Config.allowParallelInProgress`), not a durable-shape
* rule: a log written while parallel work was allowed must still replay after a
* deployment tightens the policy, so tying the invariant to the current config
* would reject history that was valid when it was written.
*/
function validateTodos(value, fail) {
	if (!Array.isArray(value)) fail("todo/write todos must be an array");
	const seen = /* @__PURE__ */ new Set();
	for (const item of value) {
		if (typeof item !== "object" || item === null) fail("todo/write entries must be objects");
		const { content, status } = item;
		if (typeof content !== "string" || content.length === 0 || content.trim() !== content) fail("todo/write content must be non-empty and already trimmed");
		if (seen.has(content)) fail(`todo/write repeats content ${JSON.stringify(content)}`);
		seen.add(content);
		if (typeof status !== "string" || !TODO_STATUSES.has(status)) fail(`todo/write carries unknown status ${JSON.stringify(status)}`);
	}
}
/** Advance the trace after one event has committed. */
function advanceTrace(trace, event) {
	if (event.type === "turn/start") trace.open = true;
	if (event.type === "turn/end") trace.open = false;
}
/** Validate one package-owned event against the preceding committed trace. */
function validateEvent(event, trace, fail) {
	if (event.type !== "todo/write") return;
	validateTodos(event.data.todos, fail);
	if (!trace.open) fail("todo/write appended outside any open turn");
}
/** Validate one existing log in a single pass and return its tail trace. */
function seedTrace(session, fail) {
	const trace = { open: false };
	for (const event of session.snapshotEvents()) {
		validateEvent(event, trace, fail);
		advanceTrace(trace, event);
	}
	return trace;
}
/** Install validation for loaded and newly appended whole-list todo snapshots. */
const install = Object.assign((ctx, fail) => {
	const traces = /* @__PURE__ */ new WeakMap();
	const seed = (session) => {
		traces.set(session, seedTrace(session, fail));
	};
	const traceFor = (session) => {
		let trace = traces.get(session);
		if (trace === void 0) {
			trace = seedTrace(session, fail);
			traces.set(session, trace);
		}
		return trace;
	};
	for (const session of ctx.sessions.list()) seed(session);
	ctx.on("session/created", (session) => {
		seed(session);
	}, { global: true });
	ctx.on("internal/dispatch", (_mode, eventName, args) => {
		if (eventName !== "session/event") return;
		const [session, event] = args;
		validateEvent(event, traceFor(session), fail);
	}, { global: true });
	ctx.on("session/event", (session, event) => {
		advanceTrace(traceFor(session), event);
	}, { global: true });
}, { inject: ["sessions"] });
/**
* Register the todo invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
