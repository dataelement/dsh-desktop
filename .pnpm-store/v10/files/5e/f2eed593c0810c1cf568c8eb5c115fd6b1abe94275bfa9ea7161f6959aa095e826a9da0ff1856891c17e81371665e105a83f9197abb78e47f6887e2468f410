//#region lib/types/invariant.js
/** Package-owned hook invocation/result stream invariants. @module @deepseek-ai/dsh-hook-protocol/invariant */
const PACKAGE_NAME = "@deepseek-ai/dsh-hook-protocol";
/** Cordis companion plugin name. */
const name = "hook-protocol-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/** Correlation key shared by an invoked/result pair. */
function hookKey(data) {
	return `${data.turn}\0${data.point}\0${data.handlerId}`;
}
/** Validate one hook event against committed pending invocations. */
function validateHookEvent(trace, event, fail) {
	if (event.type !== "hook/invoked" && event.type !== "hook/result") return void 0;
	if (trace.openTurn === null) fail(`${event.type} appended outside any open turn`);
	if (event.data.turn !== trace.openTurn) fail(`${event.type} names turn ${event.data.turn} but open turn is ${trace.openTurn}`);
	if (event.type === "hook/invoked") {
		if (event.data.point.length === 0 || event.data.handlerId.length === 0) fail("hook/invoked point and handlerId must be non-empty");
		const dialect = event.data.dialect;
		if (dialect !== "claude-code" && dialect !== "codex") fail(`hook/invoked carries unknown dialect ${JSON.stringify(dialect)}`);
		return {
			key: hookKey(event.data),
			delta: 1
		};
	}
	const key = hookKey(event.data);
	if ((trace.pending.get(key) ?? 0) === 0) fail(`hook/result has no matching hook/invoked for ${JSON.stringify(event.data.handlerId)}`);
	if (!Number.isFinite(event.data.durationMs) || event.data.durationMs < 0) fail("hook/result durationMs must be a non-negative finite number");
	return {
		key,
		delta: -1
	};
}
/** Apply one committed hook-pair transition. */
function applyHookTransition(pending, transition) {
	const next = (pending.get(transition.key) ?? 0) + transition.delta;
	if (next === 0) pending.delete(transition.key);
	else pending.set(transition.key, next);
}
/** Install hook invoked/result pairing checks. */
const install = Object.assign((ctx, fail) => {
	const traces = /* @__PURE__ */ new WeakMap();
	const staged = /* @__PURE__ */ new WeakMap();
	const seed = (session) => {
		const trace = {
			openTurn: null,
			pending: /* @__PURE__ */ new Map()
		};
		traces.set(session, trace);
		for (const event of session.snapshotEvents()) {
			if (event.type === "turn/start") trace.openTurn = event.data.turn;
			else if (event.type === "turn/end") trace.openTurn = null;
			const transition = validateHookEvent(trace, event, fail);
			if (transition !== void 0) applyHookTransition(trace.pending, transition);
		}
		return trace;
	};
	const traceFor = (session) => traces.get(session) ?? seed(session);
	for (const session of ctx.sessions.list()) seed(session);
	ctx.on("session/created", (session) => {
		seed(session);
	}, { global: true });
	ctx.on("session/event", (session, event) => {
		const trace = traceFor(session);
		if (event.type === "turn/start") {
			trace.openTurn = event.data.turn;
			return;
		}
		if (event.type === "turn/end") {
			trace.openTurn = null;
			return;
		}
		if (event.type !== "hook/invoked" && event.type !== "hook/result") return;
		const candidate = staged.get(event);
		/* v8 ignore next -- internal/dispatch stages every hook invocation/result event */
		if (candidate === void 0 || candidate.session !== session) return fail("hook event published without pre-commit validation");
		staged.delete(event);
		applyHookTransition(trace.pending, candidate.transition);
	}, { global: true });
	ctx.on("internal/dispatch", (_mode, eventName, args) => {
		if (eventName !== "session/event") return;
		const [session, event] = args;
		const transition = validateHookEvent(traceFor(session), event, fail);
		if (transition !== void 0) staged.set(event, {
			session,
			transition
		});
	}, { global: true });
}, { inject: ["sessions"] });
/**
* Register the hook-protocol invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
