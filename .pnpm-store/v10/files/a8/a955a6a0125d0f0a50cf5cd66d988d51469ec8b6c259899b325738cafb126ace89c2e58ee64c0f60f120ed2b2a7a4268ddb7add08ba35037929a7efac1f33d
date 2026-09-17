import { Service } from "@deepseek-ai/cordis";
//#region lib/types/brand.js
/**
* Brand an implementation-minted compaction identity.
* @param id - opaque transaction identity.
* @returns the same string, branded; no validation is performed.
*/
function CompactionId(id) {
	return id;
}
//#endregion
//#region lib/types/tool-pairing.js
/**
* Tool-pairing balance over a session surface. Compaction changes surface
* positions, so safe cuts are derived from tool-call/result content in current
* surface order rather than step markers.
* @module @deepseek-ai/dsh-compaction/tool-pairing
*/
const balanceCacheBySession = /* @__PURE__ */ new WeakMap();
/** Return how one surface event changes the in-progress tool-call count. */
function eventDelta(event) {
	switch (event.type) {
		case "assistant/message": return event.data.message.content.filter((block) => block.type === "tool-call").length;
		case "tool/result": return -1;
		default: return 0;
	}
}
/** Fold surface sequences not yet in the cache into its balance state. */
function extendCache(session, cache, seqs) {
	const processed = cache.cutBalanced.length - 1;
	const tail = seqs.slice(processed);
	const pendingCuts = [];
	let inProgressToolCalls = cache.inProgressToolCalls;
	for (const seq of tail) {
		const event = session.eventAt(seq);
		if (event === void 0 || event.seq !== seq) throw new Error(`tool-pairing balance: surface seq ${seq} has no matching session event (corrupt surface)`);
		inProgressToolCalls += eventDelta(event);
		if (inProgressToolCalls < 0) throw new Error(`tool-pairing balance: tool/result at surface seq ${seq} has no matching tool-call (corrupt surface)`);
		pendingCuts.push(inProgressToolCalls === 0);
	}
	tail.forEach((seq, offset) => cache.indexBySeq.set(seq, processed + offset));
	cache.cutBalanced = cache.cutBalanced.concat(pendingCuts);
	cache.inProgressToolCalls = inProgressToolCalls;
	return cache;
}
/** Return balance state synchronized with the current session surface. */
function balanceCache(session) {
	const surface = session.surface;
	const seqs = surface.nodes;
	const generation = surface.replaceGeneration;
	const cached = balanceCacheBySession.get(session);
	if (cached === void 0 || cached.generation !== generation || cached.cutBalanced.length - 1 > seqs.length) {
		const rebuilt = extendCache(session, {
			generation,
			cutBalanced: [true],
			indexBySeq: /* @__PURE__ */ new Map(),
			inProgressToolCalls: 0
		}, seqs);
		balanceCacheBySession.set(session, rebuilt);
		return rebuilt;
	}
	if (cached.cutBalanced.length - 1 < seqs.length) return extendCache(session, cached, seqs);
	return cached;
}
/** Balance of the cut at a sequence's position plus offset, rejecting seqs outside current membership. */
function cutBalance(cache, seq, offset) {
	const index = cache.indexBySeq.get(seq);
	const balanced = index === void 0 ? void 0 : cache.cutBalanced[index + offset];
	if (balanced === void 0) throw new Error(`tool-pairing balance: surface seq ${seq} not found`);
	return balanced;
}
/**
* Whether the cut immediately before a current surface sequence is tool-pairing balanced.
* @param session - session whose surface is checked.
* @param seq - event sequence whose leading cut is checked.
* @returns true when no unanswered tool call crosses the cut.
* @throws when the seq is absent from the current surface, a surface sequence has no
* matching log event, or a tool result has no preceding open call.
*/
function toolPairingBalancedBefore(session, seq) {
	return cutBalance(balanceCache(session), seq, 0);
}
/**
* Whether the cut immediately after a current surface sequence is tool-pairing balanced.
* @param session - session whose surface is checked.
* @param seq - event sequence whose trailing cut is checked.
* @returns true when no unanswered tool call crosses the cut.
* @throws when the seq is absent from the current surface, a surface sequence has no
* matching log event, or a tool result has no preceding open call.
*/
function toolPairingBalancedAfter(session, seq) {
	return cutBalance(balanceCache(session), seq, 1);
}
//#endregion
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
* Create checkpoint provenance correlated with one compaction transaction.
* @param compactionId - owning compaction identity.
* @param sourceCommandId - initiating manual command, when present.
* @returns immutable checkpoint source.
*/
function compactCheckpointSource(compactionId, sourceCommandId) {
	return Object.freeze({
		...COMPACT_CHECKPOINT_MARKER,
		compactionId,
		...sourceCommandId === void 0 ? {} : { sourceCommandId }
	});
}
/**
* Test whether a persisted message source identifies a compaction checkpoint.
* @param source - source restored from a surface user message.
* @returns whether the source carries the backend-independent checkpoint marker.
*/
function isCompactCheckpointSource(source) {
	return source.kind === "plugin" && source.plugin === COMPACT_CHECKPOINT_MARKER.plugin;
}
//#endregion
//#region lib/types/index.js
/**
* Compaction Service Definition (`ctx.compaction`): providers decide when to
* compact and replace a history range with one summary node by subclassing
* {@link CompactionEngine}. This interface necessarily depends on session and LLM
* vocabulary; the rationale is in the
* [compaction Agent Note](../../../../.agents/notes/implemented/feature/2026-06-18-compaction-capability-seam.md).
* @module @deepseek-ai/dsh-compaction
*/
/**
* Expected manual-compaction failure suitable for a direct human-command result.
* Shared durable-lock entry assertions may also throw the `busy` subtype from
* automatic compaction paths.
*/
var ManualCompactionError = class extends Error {
	code;
	name = "ManualCompactionError";
	/**
	* Create one classified compaction failure.
	* @param code - stable failure class; `busy` may originate from any compaction entry path.
	* @param message - backend diagnostic retained as the Error message.
	* @param options - optional original failure.
	*/
	constructor(code, message, options) {
		super(message, options);
		this.code = code;
	}
};
/**
* Abstract compaction service. Implementations own trigger policy, retention,
* and summarization, and may consume a separate measurement service. A
* successful run replaces the selected surface span with one summary node and
* prevents concurrent compaction of the same session. The replacement user
* message uses {@link compactCheckpointSource} with the transaction identity
* so consumers recognize and correlate it independently of the backend. Load
* one implementation per context as `ctx.compaction`.
*/
var CompactionEngine = class extends Service {
	constructor(ctx) {
		super(ctx, "compaction");
	}
};
//#endregion
export { CompactionEngine, CompactionEngine as default, CompactionId, ManualCompactionError, compactCheckpointSource, isCompactCheckpointSource, toolPairingBalancedAfter, toolPairingBalancedBefore };
