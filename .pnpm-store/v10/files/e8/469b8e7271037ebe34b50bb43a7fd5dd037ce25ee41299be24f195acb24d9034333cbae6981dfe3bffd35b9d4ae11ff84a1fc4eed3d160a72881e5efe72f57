import { SessionSeq, isReplacementSurfaceEvent } from "@deepseek-ai/dsh-session";
import { SurfaceManager } from "@deepseek-ai/dsh-session/surface";
//#region lib/types/checkpoint.js
/**
* Compaction checkpoint provenance: the correlated source constructor and type
* every backend uses for its replacement user message, plus the predicate that
* recognizes persisted checkpoints.
*
* The seam itself lives in `@deepseek-ai/dsh-compaction`, which re-exports these
* contracts; this module is a pure type/value/predicate outlet (no cordis
* imports, no module augmentation) so client and wire programs can name the
* checkpoint source without loading the host plugin's Context merges — the
* `dsh-commands/brand` shape.
*
* @module @deepseek-ai/dsh-compaction/checkpoint
*/
const COMPACT_CHECKPOINT_MARKER = Object.freeze({
	kind: "plugin",
	plugin: "compact"
});
/**
* Test whether a persisted message source identifies a compaction checkpoint.
* @param source - source restored from a surface user message.
* @returns whether the source carries the backend-independent checkpoint marker.
*/
function isCompactCheckpointSource(source) {
	return source.kind === "plugin" && source.plugin === COMPACT_CHECKPOINT_MARKER.plugin;
}
//#endregion
//#region lib/types/invariant.js
/** Package-owned compaction log-stream invariants. @module @deepseek-ai/dsh-compaction/invariant */
const PACKAGE_NAME = "@deepseek-ai/dsh-compaction";
/** Cordis companion plugin name. */
const name = "compaction-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/** Require a durable opaque identity to be a non-empty string. */
function validateId(value, label, fail) {
	if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
}
/** Validate a durable event-sequence identity at this package's event boundary. */
function validateSeq(value, label, fail) {
	if (typeof value !== "number") return fail(`${label} must be a non-negative safe integer event seq`);
	try {
		return SessionSeq(value);
	} catch {
		return fail(`${label} must be a non-negative safe integer event seq`);
	}
}
/** Validate one shadowed surface span and its complete ordered identity list. */
function validateShadowedSeqs(trace, event, fail) {
	const eventType = event.type;
	const { data } = event;
	const start = validateSeq(data.shadowedRange.start, `${eventType} shadowedRange.start`, fail);
	const end = validateSeq(data.shadowedRange.end, `${eventType} shadowedRange.end`, fail);
	const seqs = data.shadowedSeqs.map((seq, index) => validateSeq(seq, `${eventType} shadowedSeqs[${index}]`, fail));
	if (seqs.length === 0) fail(`${eventType} shadowedSeqs must be non-empty`);
	if (seqs[0] !== start || seqs.at(-1) !== end) fail(`${eventType} shadowedRange must match the first and last shadowedSeqs`);
	const surface = trace.surface.nodes;
	const startIndex = surface.indexOf(start);
	const endIndex = surface.indexOf(end);
	if (startIndex < 0 || endIndex < startIndex) fail(`${eventType} shadowed seqs must name an earlier current surface span`);
	const expected = surface.slice(startIndex, endIndex + 1);
	if (expected.length !== seqs.length || expected.some((seq, index) => seq !== seqs[index])) fail(`${eventType} shadowedSeqs must list every node in the current surface span`);
}
/** Keep the optional initiating command identity stable across one transaction. */
function validateSourceCommandId(eventType, value, expected, fail) {
	if (value !== void 0) validateId(value, `${eventType} sourceCommandId`, fail);
	if (value !== expected) fail(`${eventType} sourceCommandId ${String(value)} does not match compaction/start sourceCommandId ${String(expected)}`);
}
/** Validate one replacement checkpoint against its open compaction transaction. */
function validateCheckpoint(trace, event, fail) {
	const source = event.data.source;
	validateId(source.compactionId, "compaction checkpoint compactionId", fail);
	if (source.sourceCommandId !== void 0) validateId(source.sourceCommandId, "compaction checkpoint sourceCommandId", fail);
	const open = trace.compaction;
	if (open === void 0) fail("compaction checkpoint has no matching compaction/start");
	if (source.compactionId !== open.compactionId) fail(`compaction checkpoint id ${source.compactionId} does not match compaction/start id ${open.compactionId}`);
	validateSourceCommandId("compaction checkpoint", source.sourceCommandId, open.sourceCommandId, fail);
}
/** Compaction starts still unmatched when a later seed boundary made them stale. */
function inheritedOrphanStartSeqs(events) {
	const stale = /* @__PURE__ */ new Set();
	let openStartSeq;
	for (const event of events) if (event.type === "compaction/start") openStartSeq = event.seq;
	else if (event.type === "compaction/end") openStartSeq = void 0;
	else if (event.type === "session/end-seed") {
		if (openStartSeq !== void 0) stale.add(openStartSeq);
		openStartSeq = void 0;
	}
	return stale;
}
/** Keep every live compaction bracket on one side of each turn boundary. */
function validateTurnBoundary(trace, event, fail) {
	if (event.type !== "turn/start" && event.type !== "turn/end" || trace.compaction === void 0) return;
	const owner = trace.compaction.turn === null ? "standalone compaction" : `compaction for turn ${trace.compaction.turn}`;
	fail(`${event.type} cannot cross an open ${owner}`);
}
/** Advance the committed turn cursor after its boundary has been accepted. */
function applyTurnBoundary(trace, event) {
	if (event.type === "turn/start") {
		trace.openTurn = event.data.turn;
		return true;
	}
	if (event.type === "turn/end") {
		trace.openTurn = null;
		return true;
	}
	return false;
}
/** Require a numbered bracket inside its exact turn, or a standalone bracket between turns. */
function validateOwner(owner, openTurn, eventType, fail) {
	if (owner === null) {
		if (openTurn !== null) fail(`${eventType} is standalone but turn ${openTurn} is open`);
		return;
	}
	if (openTurn === null) fail(`${eventType} for turn ${owner} appended outside any open turn`);
	if (owner !== openTurn) fail(`${eventType} names turn ${owner} but open turn is ${openTurn}`);
}
/** Validate one compaction event without advancing committed trace state. */
function validateCompactionEvent(trace, event, fail) {
	if (event.type === "session/end-seed") return { kind: "end-seed" };
	if (event.type === "compaction/prune") {
		validateShadowedSeqs(trace, event, fail);
		return;
	}
	if (event.type === "user/message" && isReplacementSurfaceEvent(event) && isCompactCheckpointSource(event.data.source)) {
		validateCheckpoint(trace, event, fail);
		return;
	}
	if (event.type !== "compaction/start" && event.type !== "compaction/summary" && event.type !== "compaction/end") return;
	const open = trace.compaction;
	if (event.type === "compaction/start") {
		validateId(event.data.compactionId, "compaction/start compactionId", fail);
		if (event.data.sourceCommandId !== void 0) validateId(event.data.sourceCommandId, "compaction/start sourceCommandId", fail);
		if (open !== void 0) fail(`compaction/start while ${open.turn === null ? "standalone compaction" : `turn ${open.turn}`} is still compacting`);
		validateOwner(event.data.turn, trace.openTurn, event.type, fail);
		return {
			kind: "start",
			compactionId: event.data.compactionId,
			sourceCommandId: event.data.sourceCommandId,
			startSeq: event.seq,
			turn: event.data.turn
		};
	}
	if (event.type === "compaction/summary") {
		validateId(event.data.compactionId, "compaction/summary compactionId", fail);
		if (event.data.sourceCommandId !== void 0) validateId(event.data.sourceCommandId, "compaction/summary sourceCommandId", fail);
		if (open === void 0) fail("compaction/summary has no matching compaction/start");
		if (event.data.compactionId !== open.compactionId) fail(`compaction/summary id ${event.data.compactionId} does not match compaction/start id ${open.compactionId}`);
		validateSourceCommandId("compaction/summary", event.data.sourceCommandId, open.sourceCommandId, fail);
		validateOwner(open.turn, trace.openTurn, event.type, fail);
		if (open.summarized) fail("compaction/summary repeated within one compaction");
		validateShadowedSeqs(trace, event, fail);
		if (!Number.isSafeInteger(event.data.shadowedTokenCount) || event.data.shadowedTokenCount < 0) fail("compaction/summary shadowedTokenCount must be a non-negative safe integer");
		return {
			kind: "summary",
			compactionId: open.compactionId,
			sourceCommandId: open.sourceCommandId,
			startSeq: open.startSeq,
			turn: open.turn
		};
	}
	validateId(event.data.compactionId, "compaction/end compactionId", fail);
	if (event.data.sourceCommandId !== void 0) validateId(event.data.sourceCommandId, "compaction/end sourceCommandId", fail);
	if (open === void 0) fail("compaction/end has no matching compaction/start");
	if (event.data.compactionId !== open.compactionId) fail(`compaction/end id ${event.data.compactionId} does not match compaction/start id ${open.compactionId}`);
	validateSourceCommandId("compaction/end", event.data.sourceCommandId, open.sourceCommandId, fail);
	if (event.data.turn !== open.turn) fail(`compaction/end owner ${String(event.data.turn)} does not match compaction/start owner ${String(open.turn)}`);
	validateOwner(open.turn, trace.openTurn, event.type, fail);
	if (event.data.error === void 0 && !open.summarized) fail("successful compaction/end requires one compaction/summary");
	return { kind: "end" };
}
/** Apply one committed compaction transition. */
function applyCompactionTransition(transition) {
	if (transition.kind === "start") return {
		compactionId: transition.compactionId,
		sourceCommandId: transition.sourceCommandId,
		startSeq: transition.startSeq,
		turn: transition.turn,
		summarized: false
	};
	if (transition.kind === "summary") return {
		compactionId: transition.compactionId,
		sourceCommandId: transition.sourceCommandId,
		startSeq: transition.startSeq,
		turn: transition.turn,
		summarized: true
	};
}
/** Install compaction start/summary/end checks. */
const install = Object.assign((ctx, fail) => {
	const traces = /* @__PURE__ */ new WeakMap();
	const staged = /* @__PURE__ */ new WeakMap();
	const seed = (session) => {
		const surfaceEvents = [];
		const trace = {
			openTurn: null,
			compaction: void 0,
			surfaceEvents,
			surface: new SurfaceManager(surfaceEvents)
		};
		traces.set(session, trace);
		const events = session.snapshotEvents();
		const staleOrphanStartSeqs = inheritedOrphanStartSeqs(events);
		for (const event of events) {
			if (trace.compaction === void 0 || !staleOrphanStartSeqs.has(trace.compaction.startSeq)) validateTurnBoundary(trace, event, fail);
			const transition = validateCompactionEvent(trace, event, fail);
			if (transition !== void 0) trace.compaction = applyCompactionTransition(transition);
			applyTurnBoundary(trace, event);
			trace.surfaceEvents.push(event);
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
		validateTurnBoundary(trace, event, fail);
		const changedTurn = applyTurnBoundary(trace, event);
		if (!changedTurn && event.type !== "session/end-seed" && event.type !== "compaction/start" && event.type !== "compaction/summary" && event.type !== "compaction/end") {
			trace.surfaceEvents.push(event);
			return;
		}
		if (!changedTurn) {
			const candidate = staged.get(event);
			/* v8 ignore next -- internal/dispatch stages every compaction event */
			if (candidate === void 0 || candidate.session !== session) return fail("compaction event published without pre-commit validation");
			staged.delete(event);
			trace.compaction = applyCompactionTransition(candidate.transition);
		}
		trace.surfaceEvents.push(event);
	}, { global: true });
	ctx.on("internal/dispatch", (_mode, eventName, args) => {
		if (eventName !== "session/event") return;
		const [session, event] = args;
		const trace = traceFor(session);
		validateTurnBoundary(trace, event, fail);
		const transition = validateCompactionEvent(trace, event, fail);
		if (transition !== void 0) staged.set(event, {
			session,
			transition
		});
	}, { global: true });
}, { inject: ["sessions"] });
/**
* Register the compact invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
