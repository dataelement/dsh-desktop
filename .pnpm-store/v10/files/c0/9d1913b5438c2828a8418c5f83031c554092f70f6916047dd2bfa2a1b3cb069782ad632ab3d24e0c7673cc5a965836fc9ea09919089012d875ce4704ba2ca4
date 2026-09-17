import { Service } from "@deepseek-ai/cordis";
import { randomUUID } from "node:crypto";
import z from "@deepseek-ai/schemastery";
import { z as z$1 } from "zod";
import { brandString } from "@deepseek-ai/dsh-brand";
import { agentEvents, assembleContextFor, emitAgentEvent } from "@deepseek-ai/dsh-agent";
import { AssistantStreamAccumulator, BlockAssembler, LlmAttemptId, LlmError, createAssistantMessage, createSystemMessage, createToolResultMessage, createUserMessage, errorChain, markAgentLoopRequest } from "@deepseek-ai/dsh-llm";
import { SessionLogOffset, SessionPreparation, SessionSeq, canonicalHeader, headerEquals, interruptedTurnClosers, isReplacementSurfaceEvent } from "@deepseek-ai/dsh-session";
import { SessionPersistenceNotFoundError } from "@deepseek-ai/dsh-session-persistence";
import { assertNever, deepFreeze } from "@deepseek-ai/dsh-util-values";
import { createScope } from "@deepseek-ai/dsh-scope";
import { joinContextSections, renderContextSections, renderPrompt } from "@deepseek-ai/dsh-system-prompt";
import { TOOL_ABORTED_BEFORE_DISPATCH, TOOL_RUNTIME_SCHEDULER } from "@deepseek-ai/dsh-tools";
//#region lib/types/inbox.js
/**
* Driver-owned durable agent inbox projection and command facade.
*
* @module @deepseek-ai/dsh-agent-loop/inbox
*/
/** Wire validation for pending agent input reconstructed from durable inbox splices. */
const inboxProjectionSchema = z$1.object({
	"next-turn": z$1.array(z$1.custom()).readonly(),
	"next-step": z$1.array(z$1.custom()).readonly()
}).readonly();
/** Standard fold that reconstructs pending input and rejects invalid durable splice history. */
const inboxProjectionDefinition = {
	key: "inbox",
	stateSchema: inboxProjectionSchema,
	init: () => ({
		"next-turn": [],
		"next-step": []
	}),
	apply(state, event) {
		if (event.type !== "agent/inbox/spliced") return state;
		const splice = event.data;
		try {
			const inbox = state[splice.target];
			const removedCount = splice.removedCount ?? 0;
			if (!Number.isSafeInteger(splice.start) || splice.start < 0 || splice.start > inbox.length || !Number.isSafeInteger(removedCount) || removedCount < 0 || splice.start + removedCount > inbox.length) throw new Error("invalid inbox splice");
			const next = inbox.toSpliced(splice.start, removedCount, ...splice.inserted);
			const ids = /* @__PURE__ */ new Set();
			for (const message of splice.target === "next-turn" ? [...next, ...state["next-step"]] : [...state["next-turn"], ...next]) {
				if (ids.has(message.id)) throw new Error(`message "${message.id}" is already pending`);
				ids.add(message.id);
			}
			return splice.target === "next-turn" ? {
				"next-turn": next,
				"next-step": state["next-step"]
			} : {
				"next-turn": state["next-turn"],
				"next-step": next
			};
		} catch (error) {
			throw new Error(`invalid persisted inbox splice at session seq ${event.seq}`, { cause: error });
		}
	},
	wire: {
		viewSchema: inboxProjectionSchema,
		view: (state) => state
	},
	stateVersion: 1
};
/**
* Driver-owned durable Inbox implementation used by ReactLoopAgent and focused
* provider tests.
* @param projections - registry that owns the standard Inbox projection.
* @param session - session whose durable events store pending input.
* @param dispatch - agent-scoped notifications for Inbox lifecycle events.
*/
var ReactLoopInbox = class {
	projections;
	session;
	dispatch;
	constructor(projections, session, dispatch) {
		this.projections = projections;
		this.session = session;
		this.dispatch = dispatch;
		this.projections.register(inboxProjectionDefinition);
	}
	/** Prompts awaiting individual turns. */
	get nextTurn() {
		return this.current()["next-turn"];
	}
	/** Input awaiting the next step boundary. */
	get nextStep() {
		return this.current()["next-step"];
	}
	/** Whether either pending-message list contains work. */
	get hasPending() {
		const state = this.current();
		return state["next-turn"].length > 0 || state["next-step"].length > 0;
	}
	/** Durably cancel all pending input, clearing next-step before next-turn. */
	clear() {
		this.splice("next-step", 0, this.nextStep.length, []);
		this.splice("next-turn", 0, this.nextTurn.length, []);
	}
	/**
	* Remove and return the complete batch proposed for one step.
	* @param target - whether this boundary also consumes one queued turn.
	* @param turn - turn that will own the claimed batch.
	* @returns next-step input followed by the queued turn, when requested.
	*/
	claim(target, turn) {
		const claimed = this.mutate("next-step", 0, this.nextStep.length, [], false);
		if (target === "next-turn") claimed.push(...this.mutate("next-turn", 0, 1, [], false));
		for (const message of claimed) this.dispatch.emit("agent/inbox/claimed", {
			message,
			turn
		});
		return claimed;
	}
	/**
	* Append one message to a pending list.
	* @param target - pending list to extend.
	* @param message - message to append.
	*/
	append(target, message) {
		this.splice(target, this.current()[target].length, 0, [message]);
	}
	/**
	* Prepend one message to a pending list.
	* @param target - pending list to extend.
	* @param message - message to prepend.
	*/
	prepend(target, message) {
		this.splice(target, 0, 0, [message]);
	}
	/**
	* Replace one pending message in place.
	* @param messageId - identity of the pending message to replace.
	* @param newMessage - replacement message.
	* @returns whether the message was still pending.
	*/
	replace(messageId, newMessage) {
		const location = this.locate(messageId);
		if (location === void 0) return false;
		this.splice(location.target, location.index, 1, [newMessage]);
		return true;
	}
	/**
	* Remove one pending message.
	* @param messageId - identity of the pending message to remove.
	* @returns whether the message was still pending.
	*/
	remove(messageId) {
		const location = this.locate(messageId);
		if (location === void 0) return false;
		this.splice(location.target, location.index, 1, []);
		return true;
	}
	/**
	* Apply standard splice semantics and durably record the normalized result.
	* @param target - pending list to mutate.
	* @param start - splice position.
	* @param deleteCount - maximum number of messages to remove.
	* @param inserted - messages to insert at the resolved position.
	* @returns messages removed by the splice.
	*/
	splice(target, start, deleteCount, inserted) {
		return this.mutate(target, start, deleteCount, inserted, true);
	}
	/** Locate one pending identity across both owned lists. */
	locate(messageId) {
		const state = this.current();
		for (const target of ["next-turn", "next-step"]) {
			const index = state[target].findIndex((message) => message.id === messageId);
			if (index >= 0) return {
				target,
				index
			};
		}
	}
	/** Read the current durable projection state. */
	current() {
		const state = this.projections.stateOf(this.session, "inbox");
		/* v8 ignore next -- the constructor registers this key before any read */
		if (state === void 0) throw new Error(`agent "${this.session.id}" cannot read inbox state: its projection registration is not active`);
		return state;
	}
	/** Commit one normalized mutation and publish its live events. */
	mutate(target, start, deleteCount, inserted, discardRemoved) {
		const state = this.current();
		const inbox = state[target];
		const truncatedStart = Math.trunc(start);
		const offset = Number.isNaN(truncatedStart) ? 0 : truncatedStart;
		const actualStart = offset < 0 ? Math.max(inbox.length + offset, 0) : Math.min(offset, inbox.length);
		const truncatedDeleteCount = Math.trunc(deleteCount);
		const actualDeleteCount = Math.min(Math.max(Number.isNaN(truncatedDeleteCount) ? 0 : truncatedDeleteCount, 0), inbox.length - actualStart);
		if (actualDeleteCount === 0 && inserted.length === 0) return [];
		const candidate = inbox.toSpliced(actualStart, actualDeleteCount, ...inserted);
		const ids = /* @__PURE__ */ new Set();
		for (const message of target === "next-turn" ? [...candidate, ...state["next-step"]] : [...state["next-turn"], ...candidate]) {
			if (ids.has(message.id)) throw new Error(`message "${message.id}" is already pending`);
			ids.add(message.id);
		}
		const outcome = discardRemoved && actualDeleteCount > 0 ? "canceled" : void 0;
		const splice = {
			target,
			start: actualStart,
			...actualDeleteCount === 0 ? {} : { removedCount: actualDeleteCount },
			inserted,
			...outcome === void 0 ? {} : { outcome }
		};
		const removed = inbox.slice(actualStart, actualStart + actualDeleteCount);
		const event = this.session.append("agent/inbox/spliced", splice);
		if (discardRemoved) for (const message of removed) this.dispatch.emit("agent/inbox/discarded", { message });
		for (const message of event.data.inserted) this.dispatch.emit("agent/inbox/inserted", { message });
		return removed;
	}
};
//#endregion
//#region lib/types/runtime-context.js
/**
* Durable projection state for the two loop-owned surface messages the system
* prompt plugin forms: the system prompt (surface node 0 and any in-history
* replacement) and the dynamic runtime-context snapshot.
* @module @deepseek-ai/dsh-agent-loop/runtime-context
*/
const SOURCE = "@deepseek-ai/dsh-system-prompt";
const CLEARED = "Current runtime context: none. Earlier runtime-context snapshots no longer apply.";
function isOwned(message) {
	return message.source.kind === "plugin" && message.source.plugin === SOURCE;
}
function textOf(message) {
	const [block] = message.content;
	return message.content.length === 1 && block?.type === "text" ? block.text : void 0;
}
/** Committed events from the newest backward; the restore scans stop at the first match. */
function eventsNewestFirst(session) {
	return session.snapshotEvents().toReversed();
}
/**
* Decides how a rendered system prompt reaches the surface without owning the
* commit. The first prompt, even empty, reserves surface node 0.
* A capable continuing series appends changed nonempty text after the
* cached history. An incapable route, broken series, or cleared prompt instead
* normalizes the first system node and empties later active nodes. Dormant empty
* tails do not supply effective text or require repeated replacements.
*/
var SystemPromptProjection = class {
	session;
	constructor(session) {
		this.session = session;
	}
	/** The surviving `system/message` nodes in surface order. */
	systemNodes() {
		const nodes = [];
		for (const seq of this.session.surface.nodes) {
			const event = this.session.eventAt(seq);
			if (event?.type !== "system/message") continue;
			const text = event.data.message.content.length === 0 ? "" : textOf(event.data.message);
			nodes.push({
				seq,
				text
			});
		}
		return nodes;
	}
	/**
	* Reconcile effective text and retained nodes with the prepared route and series.
	* @param rendered - the fully rendered system prompt; `''` when none is active.
	* @param input - the route capability and series facts for this step.
	* @returns ordered per-node updates; an empty list means no update is needed.
	*/
	project(rendered, input) {
		const nodes = this.systemNodes();
		const head = nodes[0];
		if (head === void 0) return [{
			message: createSystemMessage(rendered, SOURCE),
			intent: { surfaceOp: "append" }
		}];
		const latest = nodes.findLast((node) => node.text !== "") ?? head;
		if (!input.inHistory || input.startsSeries || rendered.length === 0) {
			const updates = nodes.slice(1).filter((node) => node.text !== "").map((node) => this.replace(node.seq, ""));
			if (head.text !== rendered) updates.push(this.replace(head.seq, rendered));
			return updates;
		}
		if (latest.text === rendered) return [];
		return [{
			message: createSystemMessage(rendered, SOURCE),
			intent: { surfaceOp: "append" }
		}];
	}
	replace(seq, text) {
		return {
			message: createSystemMessage(text, SOURCE),
			intent: {
				surfaceOp: {
					op: "replace",
					startSeq: seq,
					endSeq: seq
				},
				sourceEventSeqs: [seq]
			}
		};
	}
};
/** Tracks the last retained runtime-context snapshot without owning its commit. */
var RuntimeContextProjection = class {
	/** `undefined` means no snapshot ever existed; `null` means none is retained. */
	retained;
	/**
	* Restore projection state once, then follow authoritative session events.
	* @param ctx - agent-scoped event context.
	* @param session - session receiving projected messages.
	*/
	constructor(ctx, session) {
		const surface = new Set(session.surface.nodes);
		for (const event of eventsNewestFirst(session)) {
			if (event.type !== "user/message" || !isOwned(event.data)) continue;
			this.retained ??= null;
			if (surface.has(event.seq)) {
				this.retained = {
					seq: event.seq,
					text: textOf(event.data)
				};
				break;
			}
		}
		ctx.on("session/event", (subject, event) => {
			if (subject !== session) return;
			if (event.type === "user/message" && isOwned(event.data)) this.retained = {
				seq: event.seq,
				text: textOf(event.data)
			};
			else if (this.retained && isReplacementSurfaceEvent(event) && event.sourceEventSeqs?.includes(this.retained.seq) === true) this.retained = null;
		});
	}
	/**
	* Create an uncommitted snapshot only when the retained value differs.
	* @param current - fully rendered dynamic context.
	* @param sections - named contributions that formed the current snapshot.
	* @returns a candidate user message, or `undefined` when no update is needed.
	*/
	project(current, sections) {
		if (this.retained === void 0 && current.length === 0) return;
		const snapshot = current.length === 0 ? CLEARED : current;
		if (this.retained?.text === snapshot) return;
		return createUserMessage({
			content: [{
				type: "text",
				text: snapshot
			}],
			source: sections.length === 0 ? {
				kind: "plugin",
				plugin: SOURCE
			} : {
				kind: "plugin",
				plugin: SOURCE,
				form: "snapshot",
				sections
			}
		});
	}
};
//#endregion
//#region lib/types/assistant-stream.js
/** Process-local assistant attempt framing and durable stream accumulation. */
/** Folds one model attempt into one compact stream plus ordered transient frames. */
var AssistantStreamAttempt = class {
	nextRevision;
	turn;
	step;
	emit;
	accumulator = new AssistantStreamAccumulator();
	assembler = new BlockAssembler();
	index = 0;
	terminal = false;
	/** Attempt identity unique within this Agent lifecycle. */
	attemptId;
	/** Whether this started attempt has emitted its terminal frame. */
	get ended() {
		return this.terminal;
	}
	/**
	* @param sessionId - identity embedded only in the Agent-lifecycle-local attempt id.
	* @param attempt - attached-Session-local attempt counter.
	* @param nextRevision - allocates the next emitted frame revision.
	* @param turn - durable turn owning the request.
	* @param step - durable step owning the request.
	* @param emit - agent-scoped notification publisher.
	*/
	constructor(sessionId, attempt, nextRevision, turn, step, emit) {
		this.nextRevision = nextRevision;
		this.turn = turn;
		this.step = step;
		this.emit = emit;
		this.attemptId = LlmAttemptId(`${sessionId}:${attempt}`);
	}
	/** Publish the opening marker before the first delivered chunk. */
	start() {
		this.emit({
			type: "start",
			attemptId: this.attemptId,
			revision: this.nextRevision(),
			turn: this.turn,
			step: this.step
		});
	}
	/** Snapshot one chunk once, then feed durable compaction, assembly, and live publication. */
	push(chunk) {
		const timed = this.accumulator.push({
			time: Date.now(),
			chunk
		});
		this.assembler.push(timed.chunk);
		this.emit({
			type: "chunk",
			attemptId: this.attemptId,
			revision: this.nextRevision(),
			index: this.index++,
			time: timed.time,
			chunk: timed.chunk
		});
	}
	/**
	* Publish terminal settlement after the matching durable event commits.
	* @param eventType - durable settlement type.
	* @param append - synchronous durable append returning its committed seq.
	*/
	settle(eventType, append) {
		let seq;
		try {
			seq = append();
		} catch (error) {
			this.abandon();
			throw error;
		}
		this.terminal = true;
		this.emit({
			type: "end",
			attemptId: this.attemptId,
			revision: this.nextRevision(),
			index: this.index,
			outcome: {
				kind: "committed",
				eventType,
				seq
			}
		});
	}
	/** Publish abandonment when no durable attempt event can be committed. */
	abandon() {
		this.terminal = true;
		this.emit({
			type: "end",
			attemptId: this.attemptId,
			revision: this.nextRevision(),
			index: this.index,
			outcome: { kind: "abandoned" }
		});
	}
	/** Exact compact stream for the final durable event. */
	get stream() {
		return [...this.accumulator.snapshot()];
	}
	/** Canonical completed-message blocks from the same chunks. */
	blocks() {
		return this.assembler.blocks();
	}
	/** Safe visible prefix when cancellation interrupts the attempt. */
	interruptedBlocks() {
		return this.assembler.interruptedBlocks();
	}
	/** Latest adapter-reported usage in the stream. */
	get usage() {
		return this.assembler.usage;
	}
	/** Terminal reason, defaulting to stop when the stream omitted one. */
	get finish() {
		return this.assembler.finish;
	}
	/** Replay state carried by the terminal finish record. */
	get replayState() {
		return this.assembler.replayState;
	}
};
//#endregion
//#region lib/types/tool-calls.js
/**
* Schedules one assistant step's tool calls. Exclusive calls form barriers;
* parallel calls use a bounded rolling pool and are reclassified before start.
* Dispatch may overlap, while policy, results, and result context remain
* model-ordered. Abort or an internal scheduler failure stops replenishment
* and drains started calls.
*
* Abort records synthetic error results for skipped calls so replay stays
* valid. A terminal scheduler failure preserves already-recorded `tool/call`
* events without fabricating results.
* @module dsh-agent-loop/tool-calls
*/
/**
* Schedule one assistant step's tool calls by their live concurrency mode.
* Ordinary completion and abort commit started-call results in order. Abort
* drains them, records synthetic results for unstarted calls, and returns with
* the signal still aborted after accepting started-call context through the
* caller-supplied acceptor (the machine stages it in its next-step inbox for the
* step boundary). An internal scheduler failure stops new dispatches, drains
* already-started dispatches, and rejects with the first failure without
* fabricating tool results.
* The committed step's AgentLoop driver boundary supplies the initiating Agent
* that becomes each explicit {@link ToolExecutionInput.agent}.
*
* @param ctx - loop context that owns the tool registry and carries the initiating Agent.
* @param turn - current turn number.
* @param step - current step number.
* @param toolCalls - assistant calls in model order.
* @param signal - abort signal shared by the step.
* @param acceptContext - accepts committed result context for the next step boundary.
*/
async function executeToolCalls(ctx, turn, step, toolCalls, signal, acceptContext) {
	const agent = ctx.agents.requireInitiator();
	const { session } = agent;
	const planned = toolCalls.map((block) => ({
		block,
		exec: {
			callId: block.id,
			name: block.name,
			arguments: parseArguments(block.arguments),
			agent,
			signal
		}
	}));
	let next = 0;
	let concluded = false;
	while (next < planned.length) {
		const first = planned[next];
		const mode = ctx.tools.executionMode(first.exec).kind;
		const outcome = await runGroup(ctx, turn, step, mode === "parallel" ? planned.slice(next) : [first], mode, signal, acceptContext);
		next += outcome.consumed;
		concluded ||= outcome.concluded;
		if (outcome.aborted) {
			for (const call of planned.slice(next)) appendSkippedToolCall(session, turn, step, call.block);
			return { concluded };
		}
	}
	return { concluded };
}
/** Parse model arguments, preserving invalid JSON as text and mapping empty input to `{}`. */
function parseArguments(raw) {
	try {
		return raw ? JSON.parse(raw) : {};
	} catch {
		return raw;
	}
}
/**
* Run one exclusive barrier or parallel pool. Later calls are reclassified
* before start; an exclusive reclassification waits for the current pool to
* drain and remains for the caller's next barrier. Results and contexts commit
* in model order. Abort stops starts, drains and commits started calls, accepts
* their contexts into the owning batch, records results for skipped calls, and
* returns an aborted outcome. Scheduler failure drains dispatches without
* committing synthetic recovery results.
*/
async function runGroup(ctx, turn, step, group, mode, signal, acceptContext) {
	const { session } = ctx.agents.requireInitiator();
	const { maxParallelToolCalls } = ctx.agentLoop.config;
	const slots = group.map(() => void 0);
	const callSeqs = group.map(() => void 0);
	let nextToStart = 0;
	let committed = 0;
	let started = 0;
	let aborted = signal.aborted;
	let concluded = false;
	let schedulerFailure;
	const throwSchedulerFailure = () => {
		if (schedulerFailure !== void 0) throw schedulerFailure.error;
	};
	const commitReady = async () => {
		while (committed < group.length) {
			const slot = slots[committed];
			if (slot === void 0) break;
			const call = group[committed];
			const result = slot.needsPost ? await ctx.tools[TOOL_RUNTIME_SCHEDULER].finalize(slot.exec, slot.result) : ctx.tools[TOOL_RUNTIME_SCHEDULER].finish(slot.exec, slot.result);
			appendToolResult(session, turn, step, call.block, result, callSeqs[committed]);
			for (const context of result.additionalContexts ?? []) acceptContext(context);
			concluded ||= result.concludesTurn === true;
			committed++;
		}
	};
	const inFlight = /* @__PURE__ */ new Map();
	const startCall = async (index) => {
		const call = group[index];
		callSeqs[index] = appendToolCall(session, turn, step, call.block);
		started++;
		const prepared = await ctx.tools[TOOL_RUNTIME_SCHEDULER].prepare(call.exec);
		throwSchedulerFailure();
		switch (prepared.kind) {
			case "dispatch": {
				const promise = ctx.tools[TOOL_RUNTIME_SCHEDULER].dispatch(prepared.exec).then((outcome) => {
					slots[index] = {
						exec: prepared.exec,
						result: outcome.result,
						needsPost: outcome.kind === "post-result"
					};
					return index;
				}, (error) => {
					schedulerFailure ??= { error };
					return index;
				});
				inFlight.set(index, promise);
				break;
			}
			case "post-result":
				slots[index] = {
					exec: prepared.exec,
					result: prepared.result,
					needsPost: true
				};
				break;
			case "final-result":
				slots[index] = {
					exec: prepared.exec,
					result: prepared.result,
					needsPost: false
				};
				break;
			/* v8 ignore next -- closed-union exhaustiveness guard */
			default: assertNever(prepared, "tool-call scheduler prepare result");
		}
	};
	const fillPool = async () => {
		while (!aborted && nextToStart < group.length && inFlight.size < maxParallelToolCalls) {
			const nextCall = group[nextToStart];
			if (nextToStart > 0 && mode === "parallel" && ctx.tools.executionMode(nextCall.exec).kind !== "parallel") break;
			await startCall(nextToStart);
			nextToStart++;
			throwSchedulerFailure();
			await commitReady();
			throwSchedulerFailure();
			if (signal.aborted) aborted = true;
		}
	};
	try {
		await fillPool();
		while (inFlight.size > 0) {
			const settledIndex = await Promise.race(inFlight.values());
			inFlight.delete(settledIndex);
			throwSchedulerFailure();
			await commitReady();
			throwSchedulerFailure();
			if (signal.aborted) aborted = true;
			await fillPool();
		}
	} catch (error) {
		schedulerFailure ??= { error };
		await Promise.allSettled(inFlight.values());
		throw schedulerFailure.error;
	}
	if (aborted) {
		for (const call of group.slice(started)) appendSkippedToolCall(session, turn, step, call.block);
		return {
			consumed: group.length,
			aborted: true,
			concluded
		};
	}
	/* v8 ignore next -- unreachable: a non-aborted group commits every started call */
	if (committed !== started) throw new Error("tool-call scheduler: uncommitted settled calls");
	return {
		consumed: started,
		aborted: false,
		concluded
	};
}
/** Append the durable call/result pair for a model call skipped after cancellation. */
function appendSkippedToolCall(session, turn, step, block) {
	const callSeq = appendToolCall(session, turn, step, block);
	appendToolResult(session, turn, step, block, {
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
	}, callSeq);
}
/** Append a started call and return the event seq that its result must cite. */
function appendToolCall(session, turn, step, block) {
	return session.append("tool/call", {
		turn,
		step,
		callId: block.id,
		name: block.name,
		arguments: block.arguments
	}).seq;
}
/** Append a model-ordered result linked to its call event. */
function appendToolResult(session, turn, step, block, result, callSeq) {
	const message = createToolResultMessage({
		callId: block.id,
		content: result.content,
		isError: result.isError
	});
	session.append("tool/result", {
		turn,
		step,
		message,
		...result.error?.info ? { error: result.error.info } : {},
		...result.meta !== void 0 ? { meta: result.meta } : {}
	}, {
		surfaceOp: "append",
		sourceEventSeqs: [callSeq]
	});
}
//#endregion
//#region lib/types/agent.js
/**
* Default Agent driver over queued turns and step-boundary input. Every request
* is derived from the session log.
* @module dsh-agent-loop/agent
*/
/** Remove adapter-derived values before plugins propose the next request config. */
function requestProposal(header) {
	if (header.adapterDefaults === void 0) return header.config;
	const proposal = { ...header.config };
	if (header.adapterDefaults.reasoningEffort === true) delete proposal.reasoningEffort;
	if (header.adapterDefaults.maxTokens === true) delete proposal.maxTokens;
	return proposal;
}
/** Drives one session through turn and step boundaries. */
var ReactLoopAgent = class {
	loopCtx;
	id;
	options;
	session;
	inbox;
	phase;
	activityDone = Promise.resolve();
	/** The agent-scoped registration boundary; the lifecycle owner unwinds it after the driver exits. */
	scope;
	ctx;
	/** Fused dispatcher, built once in the constructor so hot-path dispatches never allocate. */
	dispatch;
	/** Whether this loop instance has appended its initial/resume request anchor. */
	requestHeaderLogged = false;
	/** Surface generation at attachment or the preceding built request. */
	requestSurfaceGeneration;
	runtimeContext;
	/** Process-local revision of assistant frames for this attached Session. */
	assistantStreamRevision = 0;
	assistantAttemptCounter = 0;
	systemPrompt;
	/** Identities fully frozen by this loop; weak references do not retain replaced history. */
	frozenMessages = /* @__PURE__ */ new WeakSet();
	constructor(loopCtx, id, options, session) {
		this.loopCtx = loopCtx;
		this.id = id;
		this.options = options;
		this.session = session;
		this.requestSurfaceGeneration = session.surface.replaceGeneration;
		this.dispatch = agentEvents(loopCtx, this);
		this.scope = createScope(loopCtx, this);
		this.ctx = this.scope.ctx;
		this.inbox = new ReactLoopInbox(this.ctx.sessionProjections, session, this.dispatch);
		/* v8 ignore next -- the loop registers its own turnBoundary unit, so the key is always present */
		const lastTurn = this.loopCtx.sessionProjections.stateOf(session, "turnBoundary")?.lastTurn ?? 0;
		this.phase = {
			kind: "idle",
			lastTurn
		};
		this.runtimeContext = new RuntimeContextProjection(this.ctx, session);
		this.systemPrompt = new SystemPromptProjection(session);
	}
	get status() {
		return this.phase.kind === "idle" || this.phase.kind === "maintenance" ? "idle" : "running";
	}
	/** Commit a phase and publish its externally visible status transition. */
	setPhase(next) {
		const previousStatus = this.status;
		this.phase = next;
		const status = this.status;
		if (status !== previousStatus) this.dispatch.emit("agent/status", { status });
	}
	send(message, target, wakeup) {
		const wakingAfterAbort = wakeup && this.phase.kind !== "idle" && this.phase.abort.signal.aborted;
		const resolvedTarget = wakingAfterAbort ? "next-turn" : target;
		this.inbox.splice(resolvedTarget, Infinity, 0, [message]);
		if (wakeup) this.wakeDriver(wakingAfterAbort);
	}
	followup(input) {
		this.send(input, "next-turn", true);
	}
	steer(input) {
		this.send(input, "next-step", true);
	}
	inject(input) {
		this.send(input, "next-step", false);
	}
	cancel(cause, options = {}) {
		if (!options.keepInbox) {
			this.inbox.clear();
			if (this.phase.kind !== "idle") this.phase.wakeRequested = false;
		}
		if (this.phase.kind !== "idle") this.phase.abort.abort(cause);
	}
	runMaintenance(job) {
		if (this.phase.kind !== "idle") throw new Error(`agent "${this.id}" already has active work`);
		const done = Promise.withResolvers();
		const maintenance = {
			kind: "maintenance",
			abort: new AbortController(),
			lastTurn: this.phase.lastTurn,
			wakeRequested: false
		};
		this.setPhase(maintenance);
		this.activityDone = done.promise;
		return (async () => {
			try {
				return await job(maintenance.abort.signal);
			} finally {
				this.setPhase({
					kind: "idle",
					lastTurn: maintenance.lastTurn
				});
				if (maintenance.wakeRequested && this.inbox.hasPending) this.wakeDriver();
				done.resolve();
			}
		})();
	}
	/**
	* Start one driver, or latch its wake behind maintenance or an aborted
	* activity. A wake sent while idle always opens its turn boundary, even
	* when its message was cleared; only a latched replay is suppressed when
	* the queue no longer holds the wake.
	* @param wakeAfterAbort - the {@link send} classification, captured before
	*   the inbox insertion so a reentrant cancel cannot reclassify it.
	*/
	wakeDriver(wakeAfterAbort = false) {
		if (this.phase.kind !== "idle") {
			if (this.phase.abort.signal.reason?.kind !== "disposed" && (this.phase.kind === "maintenance" || wakeAfterAbort)) this.phase.wakeRequested = true;
			return;
		}
		const driver = Promise.withResolvers();
		this.activityDone = driver.promise;
		this.setPhase({
			kind: "running",
			abort: new AbortController(),
			turn: this.phase.lastTurn,
			step: 0,
			wakeRequested: false
		});
		this.loopCtx.agents.withInitiator(this, () => this.kick()).then(driver.resolve, driver.reject);
	}
	async whenIdle() {
		let activity;
		do
			await (activity = this.activityDone);
		while (activity !== this.activityDone);
	}
	/** Report one failure at its live boundary, then preserve it for driver containment. */
	throwError(error) {
		const turn = this.phase.kind === "running" ? this.phase.turn : this.phase.lastTurn;
		const step = this.phase.kind === "running" ? this.phase.step : 0;
		this.dispatch.emit("agent/error", {
			turn,
			step,
			error
		});
		throw error;
	}
	async kick() {
		try {
			while (await this.turn());
		} catch (_error) {} finally {
			/* v8 ignore next -- kick owns a running phase until this driver boundary */
			if (this.phase.kind === "running") {
				const { turn, wakeRequested } = this.phase;
				this.setPhase({
					kind: "idle",
					lastTurn: turn
				});
				if (wakeRequested && this.inbox.hasPending) this.wakeDriver();
			}
		}
	}
	async preStep(target, position) {
		/* v8 ignore next -- private callers establish the running phase before proposing a step */
		if (this.phase.kind !== "running") throw new Error(`agent "${this.id}": pre-step outside running phase`);
		const signal = this.phase.abort.signal;
		const claimed = this.inbox.claim(target, position.turn);
		const assembly = await this.loopCtx.systemPrompt.assemble(assembleContextFor(this, signal));
		signal.throwIfAborted();
		const sections = renderContextSections(assembly);
		const context = this.runtimeContext.project(joinContextSections(sections), sections);
		const decision = await this.dispatch.waterfall("agent/pre-step", {
			messages: claimed,
			...position,
			signal
		}, () => Promise.resolve({
			kind: "enter",
			messages: context === void 0 ? claimed : [...claimed, context]
		}));
		signal.throwIfAborted();
		if (decision.kind === "reject") return decision;
		return {
			...decision,
			assembly
		};
	}
	/** Whether the assembled tool schemas differ from the logged request header's. */
	toolsChanged(tools) {
		const baseline = this.session.requestHeader();
		if (baseline === void 0) return false;
		return !headerEquals(baseline, canonicalHeader({
			...baseline,
			tools: [...tools]
		}));
	}
	/** Open one turn before claiming its first proposed step. */
	async turn() {
		if (this.phase.kind !== "running") this.throwError(/* @__PURE__ */ new Error(`agent "${this.id}": turn without driver reservation`));
		const phase = this.phase;
		const { signal } = phase.abort;
		signal.throwIfAborted();
		const turn = phase.turn + 1;
		try {
			this.session.append("turn/start", { turn });
		} catch (error) {
			this.throwError(error);
		}
		phase.turn = turn;
		let turnEnds = null;
		let target = "next-turn";
		try {
			while (true) {
				signal.throwIfAborted();
				const step = phase.step + 1;
				const decision = await this.preStep(target, {
					turn,
					step
				});
				if (decision.kind === "reject") {
					turnEnds = { kind: "blocked" };
					return false;
				}
				if (turnEnds && decision.messages.length === 0) break;
				if (phase.step === 0 && decision.messages.length === 0) {
					turnEnds = { kind: "completed" };
					return false;
				}
				signal.throwIfAborted();
				this.session.append("step/start", {
					turn,
					step
				});
				phase.step = step;
				try {
					const stepEnd = await this.step(decision);
					if (turnEnds === null || turnEnds.kind !== "max-tokens") turnEnds = stepEnd;
				} finally {
					this.session.append("step/end", {
						turn,
						step
					});
				}
				signal.throwIfAborted();
				if (turnEnds && this.inbox.nextStep.length === 0) {
					await this.dispatch.serial("agent/turn-stopping", {
						turn,
						signal
					});
					signal.throwIfAborted();
				}
				if (turnEnds && this.inbox.nextStep.length === 0) break;
				target = "next-step";
			}
		} catch (error) {
			if (signal.aborted) {
				turnEnds = {
					kind: "aborted",
					reason: signal.reason
				};
				throw error;
			}
			turnEnds = {
				kind: "error",
				error: error instanceof LlmError ? error.failure : {
					message: errorChain(error),
					code: "UNKNOWN"
				}
			};
			this.throwError(error);
		} finally {
			try {
				this.session.append("turn/end", {
					turn,
					reason: turnEnds
				});
			} catch (error) {
				this.throwError(error);
			}
		}
		if (!this.inbox.hasPending) return false;
		phase.abort = new AbortController();
		phase.wakeRequested = false;
		phase.step = 0;
		return true;
	}
	async step(decision) {
		/* v8 ignore next -- private callers establish the running phase before executing a step */
		if (this.phase.kind !== "running") throw new Error(`agent "${this.id}": step outside running phase`);
		const { turn, step, abort: { signal } } = this.phase;
		signal.throwIfAborted();
		const { assembly } = decision;
		const renderedPrompt = renderPrompt(assembly);
		let firstAttempt = true;
		while (true) {
			const { config, preparedCall } = await this.prepareRequest(turn, step, signal);
			const startsRequestSeries = firstAttempt && decision.startsRequestSeries === true;
			const commits = this.systemPrompt.project(renderedPrompt, {
				inHistory: preparedCall?.systemPromptUpdate === "in-history",
				startsSeries: startsRequestSeries || this.requestSurfaceGeneration !== this.session.surface.replaceGeneration || this.toolsChanged(assembly.tools)
			});
			for (const { message, intent } of commits) this.session.append("system/message", {
				turn,
				step,
				message
			}, intent);
			if (firstAttempt) for (const message of decision.messages) this.session.append("user/message", message, { surfaceOp: "append" });
			firstAttempt = false;
			const request = this.buildRequest(config, preparedCall, assembly.tools, startsRequestSeries, signal);
			const live = new AssistantStreamAttempt(this.session.id, ++this.assistantAttemptCounter, () => ++this.assistantStreamRevision, turn, step, (frame) => {
				this.dispatch.emit("agent/assistant-stream", { frame });
			});
			let started = false;
			try {
				const stream = preparedCall?.stream(request) ?? this.loopCtx.llm.stream(request);
				signal.throwIfAborted();
				live.start();
				started = true;
				for await (const chunk of stream) {
					signal.throwIfAborted();
					live.push(chunk);
				}
				signal.throwIfAborted();
			} catch (error) {
				if (!started) throw error;
				try {
					if (signal.aborted) {
						const content = live.interruptedBlocks();
						if (content.length > 0) live.settle("assistant/message", () => this.session.append("assistant/message", {
							turn,
							step,
							message: createAssistantMessage({
								content,
								source: {
									provider: request.provider,
									model: request.model,
									...live.replayState === void 0 ? {} : { replayState: live.replayState }
								}
							}),
							interrupted: true,
							...live.usage === void 0 ? {} : { usage: live.usage },
							stream: live.stream
						}, { surfaceOp: "append" }).seq);
						else live.settle("assistant/attempt", () => this.session.append("assistant/attempt", {
							turn,
							step,
							stream: live.stream
						}).seq);
					} else live.settle("assistant/attempt", () => this.session.append("assistant/attempt", {
						turn,
						step,
						stream: live.stream
					}).seq);
				} catch (settlementError) {
					throw new AggregateError([error, settlementError], "Assistant stream failed and its durable settlement was rejected", { cause: error });
				}
				throw error;
			}
			try {
				const finish = live.finish;
				if (finish.kind === "error" || finish.kind === "aborted") {
					live.settle("assistant/attempt", () => this.session.append("assistant/attempt", {
						turn,
						step,
						stream: live.stream
					}).seq);
					const action = await this.dispatch.waterfall("agent/request-error", {
						turn,
						step,
						provider: request.provider,
						failure: finish.failure,
						retryPolicy: preparedCall?.retryPolicy,
						signal
					}, () => Promise.resolve(void 0));
					signal.throwIfAborted();
					if (action?.kind !== "retry") throw new LlmError(finish.failure.message, finish.failure.code, finish.failure);
					continue;
				}
				const message = createAssistantMessage({
					content: live.blocks(),
					source: {
						provider: request.provider,
						model: request.model,
						...live.replayState !== void 0 ? { replayState: live.replayState } : {}
					}
				});
				live.settle("assistant/message", () => this.session.append("assistant/message", {
					turn,
					step,
					message,
					...live.usage === void 0 ? {} : { usage: live.usage },
					stream: live.stream
				}, { surfaceOp: "append" }).seq);
				if (finish.kind === "max-tokens") return { kind: "max-tokens" };
				const toolCalls = message.content.filter((block) => block.type === "tool-call");
				if (toolCalls.length === 0) return { kind: "completed" };
				const { concluded } = await executeToolCalls(this.loopCtx, turn, step, toolCalls, signal, (context) => this.inbox.splice("next-step", this.inbox.nextStep.length, 0, [context]));
				return concluded ? { kind: "completed" } : null;
			} catch (error) {
				if (!live.ended) live.abandon();
				throw error;
			}
		}
	}
	/** Resolve request config and bind its adapter before admitting model-visible input. */
	async prepareRequest(turn, step, signal) {
		const { session } = this;
		const persistedHeader = session.requestHeader();
		const persistedConfig = persistedHeader?.config;
		const route = {
			provider: this.options.provider ?? "",
			model: this.options.model ?? ""
		};
		const persistedReasoningEffort = persistedConfig?.provider === route.provider && persistedConfig.model === route.model && persistedHeader?.adapterDefaults?.reasoningEffort !== true ? persistedConfig.reasoningEffort : void 0;
		const reasoningEffort = this.options.reasoningEffort ?? persistedReasoningEffort;
		const maxTokens = this.options.maxTokens;
		const seedConfig = deepFreeze(structuredClone(this.requestHeaderLogged ? requestProposal(persistedHeader) : {
			...route,
			...reasoningEffort === void 0 ? {} : { reasoningEffort },
			...maxTokens === void 0 ? {} : { maxTokens }
		}));
		const proposedConfig = await this.dispatch.waterfall("agent/request", {
			turn,
			step,
			signal
		}, () => Promise.resolve(seedConfig));
		signal.throwIfAborted();
		if (!proposedConfig.provider || !proposedConfig.model) throw new Error(`agent "${this.id}" has no provider/model: set AgentOptions.provider and AgentOptions.model or supply both via the agent/request waterfall`);
		let config;
		let preparedCall;
		try {
			preparedCall = await this.loopCtx.llm.prepareCall(proposedConfig, signal);
			config = preparedCall.config;
		} catch (error) {
			if (!(error instanceof LlmError) || error.code !== "NO_ADAPTER") throw error;
			config = proposedConfig;
		}
		signal.throwIfAborted();
		return {
			config,
			...preparedCall === void 0 ? {} : { preparedCall }
		};
	}
	/** Log the resolved envelope and derive a frozen request from the admitted surface. */
	buildRequest(config, preparedCall, tools, startsRequestSeries, signal) {
		const { session } = this;
		const surfaceGeneration = session.surface.replaceGeneration;
		const header = canonicalHeader({
			config,
			...preparedCall === void 0 ? {} : { adapterDefaults: preparedCall.adapterDefaults },
			...tools.length > 0 ? { tools } : {}
		});
		const baseline = this.session.requestHeader();
		const startsSeries = startsRequestSeries || this.requestSurfaceGeneration !== surfaceGeneration;
		if (!this.requestHeaderLogged) {
			this.session.append("request/header", {
				header,
				reason: baseline === void 0 ? "initial" : "resume"
			});
			this.requestHeaderLogged = true;
		} else if (baseline === void 0 || !headerEquals(baseline, header)) this.session.append("request/header", {
			header,
			reason: "change",
			...startsSeries ? { startsSeries: true } : {}
		});
		else if (startsSeries) this.session.append("request/header", {
			header,
			reason: "series"
		});
		this.requestSurfaceGeneration = surfaceGeneration;
		const contextWindow = preparedCall?.context?.contextWindow;
		const systemPromptUpdate = preparedCall?.systemPromptUpdate;
		const requestContext = {
			provider: config.provider,
			model: config.model,
			...contextWindow === void 0 ? {} : { contextWindow },
			...systemPromptUpdate === void 0 ? {} : { systemPromptUpdate }
		};
		const previousContext = session.requestContext();
		if (previousContext?.provider !== requestContext.provider || previousContext.model !== requestContext.model || previousContext.contextWindow !== requestContext.contextWindow || previousContext.systemPromptUpdate !== requestContext.systemPromptUpdate) session.append("request/context", requestContext);
		signal.throwIfAborted();
		deepFreeze(header);
		const boundaryMessages = session.deriveMessages();
		for (const message of boundaryMessages) {
			if (this.frozenMessages.has(message)) continue;
			deepFreeze(message);
			this.frozenMessages.add(message);
		}
		Object.freeze(boundaryMessages);
		return markAgentLoopRequest(Object.freeze({
			...header.config,
			messages: boundaryMessages,
			...header.tools !== void 0 ? { tools: header.tools } : {},
			sessionId: this.session.id,
			signal
		}));
	}
};
//#endregion
//#region lib/types/constants.js
/** Shared agent-loop scheduler defaults.
* @module dsh-agent-loop/constants
*/
/** Default maximum in-flight parallel-safe calls per agent step. */
const DEFAULT_MAX_PARALLEL_TOOL_CALLS = 10;
//#endregion
//#region lib/types/index.js
/**
* Concrete agent-loop plugin: creates scoped ReactLoopAgents, publishes them
* through the agent/session registries, and owns their ordered teardown.
*
* @module @deepseek-ai/dsh-agent-loop
*/
var __addDisposableResource = function(env, value, async) {
	if (value !== null && value !== void 0) {
		if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
		var dispose, inner;
		if (async) {
			if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
			dispose = value[Symbol.asyncDispose];
		}
		if (dispose === void 0) {
			if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
			dispose = value[Symbol.dispose];
			if (async) inner = dispose;
		}
		if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
		if (inner) dispose = function() {
			try {
				inner.call(this);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		env.stack.push({
			value,
			dispose,
			async
		});
	} else if (async) env.stack.push({ async: true });
	return value;
};
var __disposeResources = (function(SuppressedError) {
	return function(env) {
		function fail(e) {
			env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
			env.hasError = true;
		}
		var r, s = 0;
		function next() {
			while (r = env.stack.pop()) try {
				if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
				if (r.dispose) {
					var result = r.dispose.call(r.value);
					if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
						fail(e);
						return next();
					});
				} else s |= 1;
			} catch (e) {
				fail(e);
			}
			if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
			if (env.hasError) throw env.error;
		}
		return next();
	};
})(typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
	var e = new Error(message);
	return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/** Fiber states that cannot own or serve a new lifecycle. */
const INACTIVE_STATES = new Set([
	5,
	4,
	3
]);
/** Host projection of agent turn and step boundaries. */
const turnBoundaryProjectionDefinition = {
	key: "turnBoundary",
	stateVersion: 2,
	stateSchema: z$1.object({
		openTurnStartSeq: z$1.number().int().nonnegative().transform(SessionSeq).nullable(),
		lastStepStartSeq: z$1.number().int().nonnegative().transform(SessionSeq).nullable(),
		lastStepBoundary: z$1.object({
			kind: z$1.union([z$1.literal("start"), z$1.literal("end")]),
			seq: z$1.number().int().nonnegative().transform(SessionSeq)
		}).nullable(),
		lastTurn: z$1.number().int().nonnegative()
	}),
	init: () => ({
		openTurnStartSeq: null,
		lastStepStartSeq: null,
		lastStepBoundary: null,
		lastTurn: 0
	}),
	apply: (state, event) => {
		switch (event.type) {
			case "turn/start": return {
				...state,
				openTurnStartSeq: event.seq,
				lastTurn: event.data.turn
			};
			case "turn/end": return {
				...state,
				openTurnStartSeq: null
			};
			case "step/start": return {
				...state,
				lastStepStartSeq: event.seq,
				lastStepBoundary: {
					kind: "start",
					seq: event.seq
				}
			};
			case "step/end": return {
				...state,
				lastStepBoundary: {
					kind: "end",
					seq: event.seq
				}
			};
			default: return state;
		}
	}
};
/** Factory-level ownership: live agent teardowns plus config startup work. */
var FactoryOwnership = class {
	fiber;
	accepting = true;
	teardown = new AbortController();
	inactive = Promise.withResolvers();
	liveAgents = /* @__PURE__ */ new Set();
	startupTasks = /* @__PURE__ */ new Set();
	constructor(fiber) {
		this.fiber = fiber;
	}
	/** Aborts (reason: `agent loop is not active` error) when factory teardown begins. */
	get signal() {
		return this.teardown.signal;
	}
	isActive() {
		return this.accepting && !INACTIVE_STATES.has(this.fiber.state);
	}
	/** Track one live agent's shared teardown until it has run. */
	track(dispose) {
		this.liveAgents.add(dispose);
		return () => {
			this.liveAgents.delete(dispose);
		};
	}
	/** Join config startup work that begins before an agent exists. */
	trackStartup(job) {
		this.startupTasks.add(job);
		const forget = () => {
			this.startupTasks.delete(job);
		};
		job.then(forget, forget);
	}
	/** Join one public create/resume continuation; factory dispose awaits its settlement. */
	trackWrapper(job) {
		this.trackStartup(job.then(() => void 0, () => void 0));
	}
	/** Resolve `task`, or stop waiting when factory teardown begins. */
	async waitWhileActive(job) {
		await Promise.race([job, this.inactive.promise]);
	}
	async dispose() {
		this.accepting = false;
		this.teardown.abort(/* @__PURE__ */ new Error("agent loop is not active"));
		this.inactive.resolve();
		await Promise.all([...[...this.liveAgents].map((dispose) => dispose()), ...this.startupTasks]);
	}
};
/** Await `operation`, or throw the signal's reason as soon as it aborts. */
async function raceAbort(operation, signal, id) {
	const toAbortError = () => signal.reason instanceof Error ? signal.reason : new Error(`agent "${id}" creation aborted`, { cause: signal.reason });
	if (signal.aborted) throw toAbortError();
	const aborted = Promise.withResolvers();
	const listener = () => {
		aborted.reject(toAbortError());
	};
	signal.addEventListener("abort", listener, { once: true });
	try {
		return await Promise.race([Promise.resolve(operation), aborted.promise]);
	} finally {
		signal.removeEventListener("abort", listener);
	}
}
/** Start an abortable operation and release a value that arrives after cancellation. */
async function raceAbortCall(operation, signal, id, releaseAbandoned) {
	if (signal.aborted) throw signal.reason instanceof Error ? signal.reason : new Error(`agent "${id}" creation aborted`, { cause: signal.reason });
	const pending = Promise.resolve().then(operation);
	try {
		return await raceAbort(pending, signal, id);
	} catch (error) {
		if (signal.aborted && releaseAbandoned !== void 0) pending.then(releaseAbandoned, () => void 0);
		throw error;
	}
}
/** Resolve the deployment-wide scheduler cap at the owning config boundary. */
function resolveMaxParallelToolCalls(value) {
	const maxParallelToolCalls = value ?? 10;
	if (!Number.isInteger(maxParallelToolCalls) || maxParallelToolCalls < 1) throw new Error("maxParallelToolCalls must be a positive integer");
	return maxParallelToolCalls;
}
/** Reject an output-token cap that cannot be represented exactly on the request wire. */
function assertAgentOptions(options) {
	if (options.maxTokens !== void 0 && (!Number.isSafeInteger(options.maxTokens) || options.maxTokens <= 0)) throw new TypeError("agent maxTokens must be a positive safe integer");
}
/**
* Context key a launcher sets before any Loader entry mounts
* (`ctx.provide(CONFIGURED_AGENT_IDENTITIES_KEY, identities)`) to fix
* configured agents' session identities without a config key, so an overlay
* repointing the row's model route cannot drop them.
*/
const CONFIGURED_AGENT_IDENTITIES_KEY = "configuredAgentIdentities";
/**
* Apply launcher-owned identities over the configured agents, replacing both
* identity keys for every entry the launcher named so a config-supplied
* identity can never survive alongside a launcher-supplied one.
* @param agents - the configured agent entries.
* @param identities - launcher identities keyed by configured agent `id`, or `undefined`.
* @returns the entries with launcher-owned identities applied.
*/
function applyLauncherIdentities(agents, identities) {
	if (identities === void 0) return agents;
	return agents.map((agent) => {
		const identity = identities[agent.id];
		if (identity === void 0) return agent;
		const { sessionId: _sessionId, resumeSessionId: _resumeSessionId, ...rest } = agent;
		return identity.resume ? {
			...rest,
			resumeSessionId: identity.id
		} : {
			...rest,
			sessionId: identity.id
		};
	});
}
/** Settings namespace carrying the tool-call parallelism a user owns. */
const AGENT_LOOP_SETTINGS_NAMESPACE = "agent-loop";
/** Schema of the agent-loop settings section. */
const AGENT_LOOP_SETTINGS_SCHEMA = z.object({ maxParallelToolCalls: z.number().step(1).min(1).default(10) });
/** Reject self-contained identity conflicts before any configured agent starts. */
function validateConfiguredAgents(agents) {
	const exactIdentities = /* @__PURE__ */ new Map();
	for (const { id, sessionId, resumeSessionId } of agents) {
		const hasResumeId = resumeSessionId !== void 0 && resumeSessionId !== "";
		if (sessionId !== void 0 && hasResumeId) throw new Error(`agent "${id}": sessionId and resumeSessionId are mutually exclusive`);
		const exactIdentity = hasResumeId ? resumeSessionId : sessionId;
		if (exactIdentity === void 0) continue;
		const firstId = exactIdentities.get(exactIdentity);
		if (firstId !== void 0) throw new Error(`agents "${firstId}" and "${id}" use duplicate exact session identity "${exactIdentity}"`);
		exactIdentities.set(exactIdentity, id);
	}
}
/** Concrete agent factory and driver service. */
var AgentLoop = class extends Service {
	static inject = [
		"agents",
		"sessions",
		"llm",
		"tools",
		"systemPrompt",
		"sessionProjections"
	];
	/** Runtime schema for declarative agents. */
	static Config = z.object({
		maxParallelToolCalls: z.number().step(1).min(1).default(10),
		agents: z.array(z.object({
			id: z.string().required(),
			sessionId: z.string().min(1),
			provider: z.string(),
			model: z.string(),
			reasoningEffort: z.string().min(1),
			maxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER),
			cwd: z.string(),
			resumeSessionId: z.string()
		})).default([])
	});
	/** Validated configuration owned by the agent-loop service. */
	config;
	ownership;
	/** Plain holder prevents Cordis from re-tracing the factory's dependency context through a caller shadow. */
	runtime;
	constructor(ctx, config) {
		super(ctx, "agentLoop");
		const entry = { maxParallelToolCalls: resolveMaxParallelToolCalls(config.maxParallelToolCalls) };
		let source = () => entry;
		this.config = {
			...config,
			agents: applyLauncherIdentities(config.agents, ctx.get(CONFIGURED_AGENT_IDENTITIES_KEY)),
			get maxParallelToolCalls() {
				return source().maxParallelToolCalls;
			}
		};
		ctx.inject(["settings"], (settingsCtx) => {
			settingsCtx.settings.installSection(ctx, AGENT_LOOP_SETTINGS_NAMESPACE, AGENT_LOOP_SETTINGS_SCHEMA, entry, {
				validate: (value) => void resolveMaxParallelToolCalls(value.maxParallelToolCalls),
				setSource: (current) => {
					source = current;
				},
				onChange: () => {}
			});
		});
		validateConfiguredAgents(this.config.agents);
		ctx.sessionProjections.register(turnBoundaryProjectionDefinition);
		this.ownership = new FactoryOwnership(ctx.fiber);
		this.runtime = { ctx };
		ctx.effect(() => () => this.ownership.dispose(), "agentLoop.transactions()");
		ctx.effect(() => ctx.agents.setFactory(this), "agentLoop.setFactory()");
		ctx.systemPrompt.variable("provider", (context) => context.agent?.options.provider);
		ctx.systemPrompt.variable("model", (context) => context.agent?.options.model);
		ctx.systemPrompt.variable("cwd", (context) => context.agent?.session.header.cwd);
		for (const { id, sessionId, cwd, resumeSessionId, ...options } of this.config.agents) {
			const meta = cwd === void 0 ? {} : { cwd };
			if (resumeSessionId === void 0 || resumeSessionId === "") {
				const configuredId = sessionId ?? brandString(`${id}-session-${randomUUID()}`);
				const persistence = sessionId === void 0 ? void 0 : ctx.get("sessionPersistence");
				if (persistence === void 0) {
					const startup = this.create(configuredId, options, meta).then(() => void 0, (error) => {
						this.reportConfiguredStartupFailure(id, "restore", configuredId, error);
					});
					this.ownership.trackStartup(startup);
				} else {
					const startup = this.restoreOrCreateConfigured(ctx, persistence, configuredId, options, meta).catch((error) => {
						this.reportConfiguredStartupFailure(id, "restore", configuredId, error);
					});
					this.ownership.trackStartup(startup);
				}
				continue;
			}
			ctx.effect(() => {
				return ctx.inject(["sessionPersistence"], (childCtx) => {
					this.resumeWith(ctx, childCtx.sessionPersistence, {
						resumeSessionId,
						agentOptions: options
					}).catch((error) => {
						this.reportConfiguredStartupFailure(id, "resume", resumeSessionId, error);
					});
				}).dispose;
			}, `agentLoop.resume(${id})`);
		}
	}
	/** Report a contained declarative-start failure to identity-bound consumers. */
	reportConfiguredStartupFailure(configId, action, sessionId, error) {
		if (!this.ownership.isActive()) return;
		this.ctx.logger.warn(`agent "${configId}": config-driven ${action} of "${sessionId}" failed: ${errorChain(error)}`);
		const args = ["agent-loop/config-start-failed", {
			sessionId,
			error
		}];
		for (const callback of this.ctx.events.dispatch("emit", args)) try {
			const returned = callback(...args);
			Promise.resolve(returned).catch((listenerError) => {
				this.ctx.logger.warn(`agent "${configId}": config-start-failed listener rejected: ${errorChain(listenerError)}`);
			});
		} catch (listenerError) {
			this.ctx.logger.warn(`agent "${configId}": config-start-failed listener threw: ${errorChain(listenerError)}`);
		}
	}
	/** Restore a materialized exact config identity on remount, or create it on first use. */
	async restoreOrCreateConfigured(ownerCtx, persistence, sessionId, agentOptions, meta) {
		await this.waitForDrainingConfiguredIdentity(ownerCtx, sessionId);
		if (!this.ownership.isActive()) return;
		try {
			await this.resumeWith(ownerCtx, persistence, {
				resumeSessionId: sessionId,
				agentOptions
			});
			return;
		} catch (error) {
			if (!this.ownership.isActive()) return;
			if (!(error instanceof SessionPersistenceNotFoundError)) throw error;
		}
		await this.create(sessionId, agentOptions, meta);
	}
	/** Wait for a draining same-id lifecycle to finish registry teardown. */
	async waitForDrainingConfiguredIdentity(ownerCtx, sessionId) {
		if (ownerCtx.agents.get(sessionId) === void 0 && ownerCtx.sessions.get(sessionId) === void 0) return;
		const released = Promise.withResolvers();
		const checkReleased = () => {
			if (ownerCtx.agents.get(sessionId) === void 0 && ownerCtx.sessions.get(sessionId) === void 0) released.resolve();
		};
		const disposeAgentListener = ownerCtx.on("agent/disposed", () => {
			checkReleased();
		});
		const disposeSessionListener = ownerCtx.on("session/disposed", checkReleased);
		try {
			checkReleased();
			await this.ownership.waitWhileActive(released.promise);
		} finally {
			disposeAgentListener();
			disposeSessionListener();
		}
	}
	/**
	* Construct the driver, scope, and one memoized reverse teardown for a new
	* agent. The teardown is registered with the factory and the owner fiber
	* BEFORE publication, so a mid-setup unload rolls everything back; `signal`
	* fuses caller cancellation with lifecycle teardown for setup awaits.
	*/
	prepare(ownerCtx, id, options, session, callerSignal, handle, parentAgent) {
		assertAgentOptions(options);
		ownerCtx.fiber.assertActive();
		/* v8 ignore next -- unreachable backstop, see above */
		if (!this.ownership.isActive()) throw new Error("agent loop is not active");
		if (callerSignal?.aborted) throw callerSignal.reason instanceof Error ? callerSignal.reason : new Error(`agent "${id}" creation aborted`, { cause: callerSignal.reason });
		const loopCtx = this.runtime.ctx;
		const abort = new AbortController();
		const onCallerAbort = () => {
			abort.abort(callerSignal?.reason instanceof Error ? callerSignal.reason : new Error(`agent "${id}" creation aborted`, { cause: callerSignal?.reason }));
		};
		const onFactoryTeardown = () => {
			abort.abort(this.ownership.signal.reason);
		};
		callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
		this.ownership.signal.addEventListener("abort", onFactoryTeardown, { once: true });
		let machine;
		let detachSession;
		let detachAgent;
		let disposing;
		const machineReady = Promise.withResolvers();
		const dispose = (ownerTriggered = false) => disposing ??= (async () => {
			abort.abort(/* @__PURE__ */ new Error(`agent "${id}" lifecycle disposed`));
			callerSignal?.removeEventListener("abort", onCallerAbort);
			this.ownership.signal.removeEventListener("abort", onFactoryTeardown);
			const failures = [];
			try {
				/* v8 ignore next -- Cordis effect teardown waits for synchronous setup before observing the machine slot. */
				if (machine === void 0) await machineReady.promise;
				/* v8 ignore next -- setup failure untracks this disposer before resolving without a machine. */
				if (machine !== void 0) {
					machine.cancel({ kind: "disposed" });
					await machine.whenIdle();
					await machine.scope.dispose();
				}
			} catch (error) {
				failures.push(error);
			}
			try {
				await handle?.close();
			} catch (error) {
				failures.push(error);
			}
			try {
				detachAgent?.();
				detachSession?.();
			} finally {
				untrack();
				if (!ownerTriggered) await unfollowOwner();
			}
			if (failures.length === 1) throw failures[0];
			if (failures.length > 1) throw new AggregateError(failures, `agent "${id}" disposal failed`);
		})();
		const untrack = this.ownership.track(dispose);
		let unfollowOwner;
		try {
			unfollowOwner = ownerCtx.effect(function* () {
				machine = new ReactLoopAgent(loopCtx, id, options, session);
				machineReady.resolve();
				yield machine.scope.rawDispose;
				yield () => {
					if (disposing !== void 0) return;
					abort.abort(/* @__PURE__ */ new Error(`agent "${id}" setup aborted: owner disposed during setup`));
					return dispose(true);
				};
			}, `agentLoop.lifecycle(${id})`);
		} catch (error) {
			machineReady.resolve();
			untrack();
			callerSignal?.removeEventListener("abort", onCallerAbort);
			this.ownership.signal.removeEventListener("abort", onFactoryTeardown);
			throw error;
		}
		/* v8 ignore stop */
		const assertLive = () => {
			if (!abort.signal.aborted) return;
			/* v8 ignore next -- unreachable String() arm, see above */
			throw abort.signal.reason instanceof Error ? abort.signal.reason : new Error(String(abort.signal.reason));
		};
		try {
			/* v8 ignore next -- a synchronous effect exhausts the generator before returning */
			if (machine === void 0) throw new Error(`agent "${id}" lifecycle did not construct its driver`);
			const agent = machine;
			assertLive();
			return {
				agent,
				signal: abort.signal,
				publish: (source) => {
					assertLive();
					detachSession = agent.ctx.sessions.enter(session);
					detachAgent = loopCtx.agents.enter(agent, parentAgent);
					agent.ctx.sessions.announce(session);
					assertLive();
					loopCtx.agents.announce(agent);
					assertLive();
					emitAgentEvent(loopCtx, agent, "agent/session-start", { source });
					assertLive();
					return {
						agent,
						dispose
					};
				},
				dispose
			};
		} catch (error) {
			machineReady.resolve();
			dispose().catch(() => {});
			throw error;
		}
	}
	/**
	* Create an agent and session under one caller-supplied identity, owned by
	* the accessing fiber. Constructor-driven config calls mint a fresh combined
	* id before entering this boundary. When a persistence backend is mounted,
	* the session's durable identity and any seed are stored before publication.
	* @param id - shared agent/session identity.
	* @param options - concrete loop options.
	* @param meta - optional fresh-session workspace metadata.
	* @returns the published running agent.
	*/
	async create(id, options = {}, meta = {}) {
		const env_1 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			const preparation = __addDisposableResource(env_1, SessionPreparation.create(this.runtime.ctx.sessions.prepare(id, { meta })), false);
			const stored = await this.createStoredSession(preparation.session);
			let prepared;
			try {
				prepared = this.prepare(this.ctx, id, options, preparation.session, void 0, stored?.handle);
			} catch (error) {
				await stored?.handle.close().catch(() => {});
				throw error;
			}
			try {
				await this.appendUnstoredSuffix(stored, preparation.session);
				return prepared.publish("startup").agent;
			} catch (error) {
				prepared.dispose().catch(() => {});
				throw error;
			}
		} catch (e_1) {
			env_1.error = e_1;
			env_1.hasError = true;
		} finally {
			__disposeResources(env_1);
		}
	}
	/**
	* Take a fresh session's write ownership when persistence is mounted.
	* Nothing is appended here: the constructor seed (which never re-emits
	* through `session/event`) is stored by `appendUnstoredSuffix` at the
	* publication commit point, so a failed or cancelled validation or setup
	* closes an unmaterialized handle and leaves no stored residue — the same
	* id can be created again.
	* @param session - the unpublished session to store.
	* @param signal - optional cancellation forwarded to the backend create.
	* @returns the owned handle and stored cursor, or `undefined` without a backend.
	*/
	async createStoredSession(session, signal) {
		const persistence = this.runtime.ctx.get("sessionPersistence");
		if (persistence === void 0) return void 0;
		return {
			handle: await persistence.create(session.header, {
				inheritedEventCount: session.inheritedEventCount,
				...signal === void 0 ? {} : { signal }
			}),
			storedCount: 0
		};
	}
	/**
	* Durably store the session events appended since the last stored cursor.
	* Pre-publication appends (constructor seed markers, setup-window events
	* such as delegation policy records) never re-emit through `session/event`,
	* so publication must flush them through the handle before live events
	* start routing into it.
	* @param stored - the session's owned handle and stored cursor, if any.
	* @param session - the unpublished session whose suffix is stored.
	*/
	async appendUnstoredSuffix(stored, session) {
		if (stored === void 0) return;
		const suffix = session.snapshotEvents(SessionLogOffset(stored.storedCount));
		if (suffix.length > 0) await stored.handle.append(suffix);
		stored.storedCount += suffix.length;
	}
	/**
	* Create an owned agent on a caller-supplied session id.
	* @param ownerCtx - caller context that structurally owns the lifecycle.
	* @param options - identities, optional live parent, session seed/metadata, loop options, setup, and cancellation.
	* @returns the published handle.
	*/
	async createAgent(ownerCtx, options) {
		const preparation = SessionPreparation.create(this.runtime.ctx.sessions.prepare(options.sessionId, {
			...options.seed === void 0 ? {} : { seed: options.seed },
			...options.meta === void 0 ? {} : { meta: options.meta },
			...options.inheritedEventCount === void 0 ? {} : { inheritedEventCount: options.inheritedEventCount }
		}));
		const published = (async () => {
			let stored;
			try {
				stored = options.signal === void 0 ? await this.createStoredSession(preparation.session) : await raceAbortCall(() => this.createStoredSession(preparation.session, options.signal), options.signal, options.sessionId, (abandoned) => {
					abandoned?.handle.close().catch(() => {});
				});
			} catch (error) {
				preparation[Symbol.dispose]();
				throw error;
			}
			return this.setupAndPublish(ownerCtx, options.sessionId, preparation, options.agentOptions ?? {}, options.setup, options.signal, "startup", stored, options.parentAgent);
		})();
		this.ownership.trackWrapper(published);
		return published;
	}
	/** Prepare one Agent around an acquired Session, run setup, and publish it. */
	async setupAndPublish(ownerCtx, id, preparation, agentOptions, setup, signal, source, stored, parentAgent) {
		const env_2 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			const session = __addDisposableResource(env_2, preparation, false).session;
			let prepared;
			try {
				prepared = this.prepare(ownerCtx, id, agentOptions, session, signal, stored?.handle, parentAgent);
			} catch (error) {
				await stored?.handle.close().catch(() => {});
				throw error;
			}
			try {
				(await raceAbort(setup?.(prepared.agent.ctx, prepared.agent), prepared.signal, id))?.commit();
				await this.appendUnstoredSuffix(stored, session);
				return prepared.publish(source);
			} catch (error) {
				await prepared.dispose().catch(() => {});
				throw error;
			}
		} catch (e_2) {
			env_2.error = e_2;
			env_2.hasError = true;
		} finally {
			__disposeResources(env_2);
		}
	}
	/**
	* Resume an owned agent from the configured persistence service.
	* @param ownerCtx - caller context that owns load, setup, and the live lifecycle.
	* @param options - persisted identity, optional live parent, loop options, setup, and cancellation.
	* @returns the published handle.
	*/
	async resume(ownerCtx, options) {
		const persistence = this.runtime.ctx.get("sessionPersistence");
		if (persistence === void 0) throw new Error("cannot resume: session persistence is not configured (load a dsh-session-persistence backend)");
		return this.resumeWith(ownerCtx, persistence, options);
	}
	/** Resume through an explicit persistence handle used by the deferred config path. */
	resumeWith(ownerCtx, persistence, options) {
		const id = options.resumeSessionId;
		const published = (async () => {
			const ownerAbort = new AbortController();
			const unfollowOwner = ownerCtx.effect(() => () => {
				ownerAbort.abort(/* @__PURE__ */ new Error(`agent "${id}" setup aborted: owner disposed during setup`));
			}, `agentLoop.resume-load(${id})`);
			const fused = AbortSignal.any([
				...options.signal === void 0 ? [] : [options.signal],
				ownerAbort.signal,
				this.ownership.signal
			]);
			let handle;
			let stored;
			let preparation;
			try {
				try {
					handle = await raceAbortCall(() => persistence.open(id, "write", { signal: fused }), fused, id, (abandoned) => {
						abandoned.close();
					});
					const coldRead = await handle.read(0, void 0, { signal: fused });
					fused.throwIfAborted();
					const persisted = coldRead.events;
					const closers = interruptedTurnClosers(persisted);
					if (closers.length > 0) await handle.append(closers);
					preparation = SessionPreparation.create(this.runtime.ctx.sessions.prepare(id, {
						seed: [...persisted, ...closers],
						meta: structuredClone(handle.header),
						inheritedEventCount: handle.inheritedEventCount,
						eventState: coldRead.eventState
					}));
					stored = {
						handle,
						storedCount: persisted.length + closers.length
					};
					await this.appendUnstoredSuffix(stored, preparation.session);
				} finally {
					await unfollowOwner();
				}
				ownerCtx.fiber.assertActive();
				if (!this.ownership.isActive()) throw new Error("agent loop is not active");
				const owned = stored;
				handle = void 0;
				return await this.setupAndPublish(ownerCtx, id, preparation, options.agentOptions ?? {}, options.setup, options.signal, "resume", owned, options.parentAgent);
			} finally {
				preparation?.[Symbol.dispose]();
				await handle?.close().catch(() => {});
			}
		})();
		this.ownership.trackWrapper(published);
		return published;
	}
};
//#endregion
export { AGENT_LOOP_SETTINGS_NAMESPACE, AGENT_LOOP_SETTINGS_SCHEMA, AgentLoop, AgentLoop as default, CONFIGURED_AGENT_IDENTITIES_KEY, DEFAULT_MAX_PARALLEL_TOOL_CALLS, turnBoundaryProjectionDefinition };
