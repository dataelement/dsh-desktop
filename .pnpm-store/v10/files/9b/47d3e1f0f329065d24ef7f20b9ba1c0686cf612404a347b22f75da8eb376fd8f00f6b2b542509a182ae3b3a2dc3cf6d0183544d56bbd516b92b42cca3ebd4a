import { scopeTarget } from "@deepseek-ai/dsh-scope";
import { assertObjectJsonSchema } from "@deepseek-ai/dsh-tools";
import { canonicalClientTimeZone } from "@deepseek-ai/dsh-util-time";
import { Remote, RemoteError, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { AttachmentError } from "@deepseek-ai/dsh-attachment";
import { z } from "zod";
import { HarnessError, ReasoningEffortId, boundContextSummary, contentHasImage, createUserMessage, errorChain, joinAssistantStreamText } from "@deepseek-ai/dsh-llm";
import { randomUUID } from "node:crypto";
import { foldConsumedWork } from "@deepseek-ai/dsh-agent";
import { SessionLogOffset, SessionSeq } from "@deepseek-ai/dsh-session";
import { brandString } from "@deepseek-ai/dsh-brand";
import { snapshotJsonValue } from "@deepseek-ai/dsh-util-values";
import { appendChunkedList, chunkedListSchema, iterateChunkedList } from "@deepseek-ai/dsh-chunked-list";
import { accessSync, constants, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
//#region lib/types/error.js
/**
* Typed failures shared by subagent service and provider operations.
*
* @module @deepseek-ai/dsh-subagent
*/
/** Typed failure for the subagent seam. */
var SubagentError = class extends HarnessError {
	constructor(message, code, options) {
		super(message, code, options);
		this.name = "SubagentError";
	}
};
//#endregion
//#region lib/types/control.js
/**
* Browser-facing subagent control assembly: the catalog view sampled against
* the live Agent registry, one browser zone's validation, and the stable
* failure codes the Remote surface answers with.
*
* @module @deepseek-ai/dsh-subagent
*/
const SESSION_ID_SCHEMA = z.string().min(1);
const CONTROL_ID_SCHEMAS = {
	"subagent.list": z.object({ parentSessionId: SESSION_ID_SCHEMA }),
	"subagent.prompt": z.object({
		parentSessionId: SESSION_ID_SCHEMA,
		childSessionId: SESSION_ID_SCHEMA,
		mode: z.literal("continuable"),
		delivery: z.enum(["queue", "steer"])
	}),
	"subagent.interrupt": z.object({
		parentSessionId: SESSION_ID_SCHEMA,
		childSessionId: SESSION_ID_SCHEMA,
		mode: z.literal("continuable")
	})
};
/**
* Apply the subagent payload checks that are stricter than generated
* branded-string codecs.
* @param method - method name carried in the failure message.
* @param payload - decoded control fields to validate.
* @throws {RemoteError} `gateway/bad-request` with the original Zod issues.
*/
function validateControlRequest(method, payload) {
	const parsed = CONTROL_ID_SCHEMAS[method].safeParse(payload);
	if (!parsed.success) throw new RemoteError("gateway/bad-request", `invalid payload for ${method}`, { issues: parsed.error.issues });
}
/**
* Project one durable listing onto the catalog view, replacing each row's
* store-derived activity with the live Agent driver's status and reporting
* whether the exact parent Agent is live. Without an Agent registry no driver
* runs at all, so every row is inactive and the parent is unavailable.
* @param ctx - Host context that may carry the Agent registry.
* @param parentSessionId - the listed parent.
* @param entries - the durable direct-child listing.
* @returns the catalog view answered to one browser.
*/
function catalogView(ctx, parentSessionId, entries) {
	const agents = ctx.get("agents");
	return {
		entries: entries.map((entry) => entry.kind === "child" ? {
			...entry,
			activity: agents?.get(entry.id)?.status === "running" ? "running" : "inactive"
		} : entry),
		parentAvailable: agents?.get(parentSessionId) !== void 0
	};
}
/**
* Refuse one catalog read while preserving cancellation and a missing
* projections registry as distinct failures.
* @param error - the thrown value.
* @param signal - the caller's cancellation.
* @returns Never — the refusal is thrown.
* @throws {RemoteError} always.
*/
function rejectCatalogRead(error, signal) {
	if (isCancellation(error, signal)) throw new RemoteError("gateway/cancelled", "subagent catalog read was cancelled", {}, { cause: error });
	if (error instanceof SubagentError && error.code === "SUBAGENT_CONTROL_PROJECTIONS_UNAVAILABLE") throw new RemoteError("subagent/projections-unavailable", "subagent catalog is unavailable: this deployment does not mount the sessionProjections registry (load @deepseek-ai/dsh-session-projection)", {}, { cause: error });
	throw new RemoteError("gateway/internal", "subagent catalog read failed", {}, { cause: error });
}
/**
* Refuse one continuation prompt without exposing provider detail: admission
* failures the caller can act on keep their own code, everything else is
* internal.
* @param error - the thrown value.
* @param childSessionId - the addressed child.
* @param signal - the caller's cancellation.
* @returns Never — the refusal is thrown.
* @throws {RemoteError} always.
*/
function rejectPrompt(error, childSessionId, signal) {
	if (isCancellation(error, signal)) throw new RemoteError("gateway/cancelled", "subagent prompt was cancelled", {}, { cause: error });
	if (error instanceof AttachmentError) throw new RemoteError("subagent/attachment-invalid", error.message, { reason: error.code }, { cause: error });
	if (error instanceof SubagentError) switch (error.code) {
		case "MODEL_DOES_NOT_SUPPORT_IMAGES": throw new RemoteError("subagent/attachment-invalid", error.message, { reason: error.code }, { cause: error });
		case "NOT_RESUMABLE": throw new RemoteError("subagent/not-resumable", "subagent cannot be resumed", { childSessionId }, { cause: error });
		case "UNAUTHORIZED": throw new RemoteError("subagent/unauthorized", "subagent does not belong to this parent", { childSessionId }, { cause: error });
		case "DRAINING":
		case "ACTIVATION_CLOSING":
		case "CONTINUATION_UNAVAILABLE":
		case "PERSISTENCE_UNAVAILABLE": throw new RemoteError("subagent/delivery-unavailable", "subagent follow-up is temporarily unavailable", { childSessionId }, { cause: error });
		default: break;
	}
	throw new RemoteError("gateway/internal", "subagent prompt failed", {}, { cause: error });
}
function isCancellation(error, signal) {
	return signal.aborted || error instanceof SubagentError && error.code === "CANCELLED";
}
//#endregion
//#region lib/types/depth.js
/**
* Delegation-depth accounting: the recursion budget a parent passes to its
* children. Kept apart from the service so composition helpers can read it
* without importing the registry.
*
* @module @deepseek-ai/dsh-subagent/depth
*/
/**
* Read an agent's delegation depth, treating absence as top-level depth zero.
* The persisted session header is authoritative and monotone: runtime
* `AgentOptions.subagentDepth` may DEEPEN the count but can never lower it —
* a resumed child arrives with fresh options, and counting it from zero would
* let it delegate as if it were top-level.
* @param agent - the agent whose header and options carry the depth.
* @returns its non-negative safe-integer depth.
* @throws if the runtime `AgentOptions.subagentDepth` is not a non-negative safe integer.
*/
function delegationDepthOf(agent) {
	const runtime = agent.options.subagentDepth;
	if (runtime !== void 0 && (!Number.isSafeInteger(runtime) || runtime < 0 || Object.is(runtime, -0))) throw new TypeError("agent subagentDepth must be a non-negative safe integer");
	return Math.max(agent.session.header.delegationDepth ?? 0, runtime ?? 0);
}
/**
* Reject a recursion cap that cannot represent an exact delegation depth.
* @param maxDepth - the optional runtime value to validate.
*/
function assertSubagentMaxDepth(maxDepth) {
	if (maxDepth !== void 0 && (typeof maxDepth !== "number" || !Number.isSafeInteger(maxDepth) || maxDepth < 0 || Object.is(maxDepth, -0))) throw new TypeError("subagent maxDepth must be a non-negative safe integer");
}
//#endregion
//#region lib/types/assistant-output.js
/**
* Canonical selection of a child's final assistant output. Backend run results
* and `subagent/end.lastAssistantMessage` apply the same rule: select the last
* non-empty assistant message. An empty-content message records usage only
* when the loop appends it after a max-tokens step with no executable blocks,
* so it does not replace earlier output. If no non-empty message exists,
* select the accumulated assistant text. Selection is independent of the
* run's stop reason.
*
* @module @deepseek-ai/dsh-subagent/assistant-output
*/
/**
* Incremental fold of the selection rule, for backends that observe a child's
* output as it streams: session-event backends {@link push} each event, and
* transports without session events (ACP content chunks) {@link pushText} raw
* text into the same streamed fallback.
*/
var AssistantOutputFold = class {
	message;
	partial = [];
	/**
	* Fold one session event: a non-empty assistant message becomes the
	* candidate final answer, while its embedded stream and any log-only attempt
	* extend the streamed fallback; every other event contributes nothing.
	* @param event - the next observed session event.
	*/
	push(event) {
		if (event.type === "assistant/message") {
			const content = event.data.message.content;
			if (content.length > 0) this.message = content;
		}
		if (event.type === "assistant/message" || event.type === "assistant/attempt") this.pushText(joinAssistantStreamText(event.data.stream));
	}
	/**
	* Extend the streamed fallback with text observed outside session events.
	* @param text - the next streamed text piece (an empty piece is a no-op).
	*/
	pushText(text) {
		if (text.length > 0) this.partial.push(text);
	}
	/**
	* Select the final output folded so far.
	* @returns the last non-empty assistant message, else the accumulated
	*   streamed text, or `undefined` when the child produced neither.
	*/
	collect() {
		if (this.message !== void 0) return this.message;
		const text = this.partial.join("");
		return text.length > 0 ? [{
			type: "text",
			text
		}] : void 0;
	}
};
/**
* Apply the selection rule to one complete child-owned event suffix.
* @param events - the child-owned events (after any seed or epoch boundary).
* @returns the selected output, or `undefined` when the child produced none.
*/
function finalAssistantOutput(events) {
	const fold = new AssistantOutputFold();
	for (const event of events) fold.push(event);
	return fold.collect();
}
//#endregion
//#region lib/types/types.js
/**
* The seam's consumer-facing contracts: request, result, and capability types
* for {@link SubagentProvider}, plus the `subagent/start` and `subagent/end`
* payloads that plugins and hosts observe. Internal control interfaces belong
* with their implementation — the lifecycle observer in `./lifecycle.ts`, the
* continuation host in `./continuation.ts` — so this module stays the published
* surface rather than a bag of everything type-shaped.
*
* @module @deepseek-ai/dsh-subagent/types
*/
/**
* Brand a string as a {@link SubagentRunId}.
* @param id - the raw run id.
* @returns the same string, branded.
*/
function SubagentRunId(id) {
	return id;
}
//#endregion
//#region lib/types/lifecycle.js
/**
* Lifecycle-edge publication for both subagent shapes: the contained emitter,
* the one-shot run observer, and the continuable Activation observer.
*
* The public payload contracts ({@link SubagentRunInfo},
* {@link SubagentRunEndInfo}) live in `./types.ts` with the rest of the seam's
* consumer-facing types; this module owns only the implementation and the
* package-private {@link ActivationObserver} the continuation manager consumes.
* Keeping the internal control interface out of the published surface is
* deliberate: the observer's `start`/`capture`/`settle` ordering is a contract
* between this module and one in-package caller, not something a plugin may
* depend on.
*
* @module @deepseek-ai/dsh-subagent/lifecycle
*/
/**
* Build the contained lifecycle emitter this seam publishes every edge through.
* Every listener is independently contained: a synchronous throw or a rejected
* returned promise is logged without starving peer listeners, changing the run,
* or — for provider removal, which fires from a disposer — breaking teardown.
* @param ctx - the service's own context, owning dispatch and the logger.
* @param carrier - resolve the scoped dispatch carrier for one delegating parent.
* @returns the emitter both observers and the provider registry publish through.
*/
function createLifecycleEmitter(ctx, carrier) {
	return (name, info, parent) => {
		const dispatchArgs = parent === void 0 ? [name, info] : [
			carrier(parent),
			name,
			info
		];
		for (const callback of ctx.events.dispatch("emit", dispatchArgs)) try {
			const returned = callback(info);
			Promise.resolve(returned).catch((error) => {
				ctx.logger.warn(`subagent: ${name} listener rejected: ${renderThrown(error)}`);
			});
		} catch (error) {
			ctx.logger.warn(`subagent: ${name} listener threw: ${renderThrown(error)}`);
		}
	};
}
/**
* Emit the start/end lifecycle pair for one accepted one-shot run.
* @param emit - the contained lifecycle emitter.
* @param provider - the provider that established the run.
* @param parent - the delegating parent keying scoped dispatch.
* @param run - the published run whose settlement closes the pair.
* @returns the same run, unchanged.
*/
function observeRun(emit, provider, parent, run) {
	const identity = {
		runId: SubagentRunId(randomUUID()),
		provider,
		id: run.id,
		local: run.localAgent !== void 0
	};
	run.result.then((result) => {
		emit("subagent/end", {
			...identity,
			stopReason: result.stopReason,
			...result.output.length === 0 ? {} : { lastAssistantMessage: result.output }
		}, parent);
	}, () => {
		emit("subagent/end", {
			...identity,
			stopReason: "error"
		}, parent);
	});
	emit("subagent/start", identity, parent);
	return run;
}
/**
* Build the observer for one continuable Activation's residency epoch. Observers
* see the same vocabulary as a one-shot run, so a child's start and settlement
* remain observable without exposing whether the manager materialized, woke, or
* cold-resumed it. Creation failure before residency emits no lifecycle edge.
* @param emit - the contained lifecycle emitter.
* @param provider - the provider name recorded in the durable descriptor.
* @param childId - the durable child session id.
* @param parent - the exact live direct parent keying scoped dispatch.
* @returns the observer whose edges this epoch publishes.
*/
function createActivationObserver(emit, provider, childId, parent) {
	const identity = {
		runId: SubagentRunId(randomUUID()),
		provider,
		id: childId,
		local: true
	};
	let boundary = SessionLogOffset(0);
	let captured = { stopReason: "completed" };
	const terminal = (failure) => failure === void 0 ? captured : { stopReason: "error" };
	return {
		start: (child) => {
			boundary = child.session.seq;
			emit("subagent/start", identity, parent);
		},
		capture: (child) => {
			const own = child.session.snapshotEvents(boundary);
			const output = finalAssistantOutput(own);
			captured = {
				stopReason: epochStopReason(own),
				...output === void 0 ? {} : { output }
			};
		},
		terminal,
		settle: (failure) => {
			const { stopReason, output } = terminal(failure);
			emit("subagent/end", {
				...identity,
				stopReason,
				...output === void 0 ? {} : { lastAssistantMessage: output }
			}, parent);
		}
	};
}
/**
* Why this child's epoch ended, for the terminal lifecycle edge and the
* manager's own parent delivery. The child's own log is authoritative:
* teardown succeeding says nothing about whether the model errored, hit its
* token ceiling, or was cancelled, so deriving the reason from disposal would
* report failed work as completed.
*
* {@link foldConsumedWork} supplies both halves the raw turn sequence cannot:
* which turn accounts for the work this epoch consumed, and whether accepted
* work was cancelled after it without any turn opening over it. A recorded
* failure still wins over a cancellation — stopping a child that had already
* failed does not turn its failure into a cancellation.
* @param events - this epoch's own event suffix.
* @returns its terminal stop reason; `completed` only for an epoch that both
*   closed cleanly and had nothing left to run.
*/
function epochStopReason(events) {
	const { end, droppedUnrun } = foldConsumedWork(events);
	switch (end?.data.reason.kind) {
		case "max-tokens": return "max-tokens";
		case "aborted":
		case "interrupted": return "aborted";
		case "error": return "error";
		case "blocked": return "refusal";
		case void 0:
		case "completed": return droppedUnrun ? "aborted" : "completed";
		/* v8 ignore next 3 -- `TurnEndReason` is merge-extensible, so this arm needs a
		* backend that adds a variant; treating an unnameable reason as success would
		* report failed work as completed. */
		default: return "error";
	}
}
/** Render any listener-thrown value without letting coercion escape containment. */
function renderThrown(value) {
	try {
		return value instanceof Error ? `${value.name}: ${value.message}` : String(value);
	} catch {
		return "<unrenderable thrown value>";
	}
}
//#endregion
//#region lib/types/child-agent.js
/**
* Shared in-process child composition: the delegation-depth budget, the
* durable session metadata, the resolved child `AgentOptions`, the delegated
* policy seed, and the scoped setup a child agent needs. Both the one-shot
* provider driver and the continuation manager compose children this way, so
* depth accounting, lineage stamping, and delegation policy have one home.
*
* @module @deepseek-ai/dsh-subagent/child-agent
*/
/** Thrown when starting a child would exceed the requested depth cap. */
var SubagentDepthError = class extends Error {
	attemptedDepth;
	maxDepth;
	constructor(attemptedDepth, maxDepth) {
		super(`subagent depth ${attemptedDepth} exceeds maxDepth ${maxDepth}`);
		this.attemptedDepth = attemptedDepth;
		this.maxDepth = maxDepth;
		this.name = "SubagentDepthError";
	}
};
/**
* Resolve the child's delegation depth from its parent and enforce an optional
* cap. The persisted parent header is the monotone floor, so a resumed parent
* cannot delegate as if it were top-level.
* @param parent - the delegating parent agent.
* @param maxDepth - optional absolute cap the resolved depth must not exceed.
* @returns the child's non-negative safe-integer depth.
* @throws {SubagentDepthError} when the resolved depth exceeds `maxDepth`.
* @throws {RangeError} when the resolved depth leaves the safe-integer range.
*/
function resolveChildDepth(parent, maxDepth) {
	const childDepth = delegationDepthOf(parent) + 1;
	if (!Number.isSafeInteger(childDepth)) throw new RangeError("subagent child depth exceeds the safe-integer range");
	if (maxDepth !== void 0 && childDepth > maxDepth) throw new SubagentDepthError(childDepth, maxDepth);
	return childDepth;
}
/**
* Resolve the parent values inherited by a child. The latest request header
* owns provider, model, and reasoning effort after request-time selection;
* creation options remain the fallback before the first request and retain
* the configured output-token limit.
* @param parent - delegating parent Agent.
* @returns detached Agent options for child-option merging.
*/
function parentAgentOptionsForDelegation(parent) {
	const requestConfig = parent.session.requestHeader()?.config;
	if (requestConfig === void 0) return { ...parent.options };
	const { provider: _createdProvider, model: _createdModel, reasoningEffort: _createdReasoningEffort, ...createdOptions } = parent.options;
	return {
		...createdOptions,
		provider: requestConfig.provider,
		model: requestConfig.model,
		...requestConfig.reasoningEffort === void 0 ? {} : { reasoningEffort: requestConfig.reasoningEffort }
	};
}
/**
* Resolve the child's `AgentOptions`: the parent's provider/model,
* reasoning-effort, and maxTokens values unless the request overrides them,
* stamped with the child's own delegation depth. Changing the route without
* naming an effort clears the parent's route-owned effort so the selected
* model resolves its own default.
* @param parent - the delegating parent whose route the child inherits.
* @param requested - per-child overrides, if any.
* @param childDepth - the resolved delegation depth to stamp.
* @returns the resolved options for `ctx.agents.create()`.
*/
function resolveChildAgentOptions(parent, requested, childDepth) {
	const parentOptions = parentAgentOptionsForDelegation(parent);
	const parentProvider = parentOptions.provider;
	const parentModel = parentOptions.model;
	const parentReasoningEffort = parentOptions.reasoningEffort;
	const parentMaxTokens = parentOptions.maxTokens;
	const resolved = {
		...parentProvider !== void 0 ? { provider: parentProvider } : {},
		...parentModel !== void 0 ? { model: parentModel } : {},
		...parentReasoningEffort !== void 0 ? { reasoningEffort: parentReasoningEffort } : {},
		...parentMaxTokens !== void 0 ? { maxTokens: parentMaxTokens } : {},
		...requested,
		subagentDepth: childDepth
	};
	if ((resolved.provider !== parentProvider || resolved.model !== parentModel) && requested?.reasoningEffort === void 0) delete resolved.reasoningEffort;
	return resolved;
}
/**
* Build the child session's durable creation metadata: the parent's workspace,
* its direct lineage, coarse product origin, the recursion budget that must
* survive persistence, the seed boundary that separates inherited parent
* history from child work, and the composition the child runs under.
*
* The preset is read from the parent's LIVE scope chain rather than from its
* header, because a parent that switched preset while blank runs on the newer
* composition and its header still names the older one. Recording it is what
* makes a child's history reconstructable: without it a cold read of the child
* resolves the deployment default and rebuilds turns under a tool set the
* child never had.
* @param parent - the delegating parent agent.
* @param childDepth - the resolved delegation depth to persist.
* @param isSeeded - whether this child inherits a parent-log prefix, including an explicitly empty one.
* @returns the `meta` for `ctx.agents.create()`.
*/
function childSessionMeta(parent, childDepth, isSeeded) {
	const parentHeader = parent.session.header;
	const agentPreset = parent.ctx.get("agentPresets")?.composedPreset(parent.ctx);
	return {
		...parentHeader.cwd !== void 0 ? { cwd: parentHeader.cwd } : {},
		...agentPreset === void 0 ? {} : { agentPreset },
		parentSession: parentHeader.id,
		isSeeded,
		origin: "subagent",
		delegationDepth: childDepth
	};
}
/**
* Model-facing delegation-scope statement for every in-process child. A
* runtime-context contribution rather than a system-prompt section, so the
* deployment's system prompt stays uniform across parents and children.
*/
const SUBAGENT_DELEGATION_CONTEXT = "You are a delegated subagent: your permission scope was fixed when you were started and cannot be widened from inside this session — operations that require approval are rejected automatically. When the task needs access beyond that scope, do not retry the denied operation; state the limitation in your reply so the delegating agent can handle it.";
/**
* Compose one child inside its creation window: join its parent's preset,
* register the fixed delegation-scope statement, then apply the child's own
* shadowing persona section and tool restriction, all owned by the child's
* scope and therefore invisible to its parent and siblings. Creation and cold
* resume both pass through here.
*
* The join comes first and the child's own registrations second, which is the
* order the layering already implies — the nearest scope wins a name, and a
* per-child restriction intersects with everything its chain admits — but
* stating it here keeps the two steps from being read as independent.
*
* The join and the per-child registrations live in ONE call because a child
* composed without the join is exactly the defect this function exists to
* prevent: with every model-facing row on the agent plane, a child that joins
* no preset sees an empty tool registry and none of its parent's prompt
* sections. Taking the parent as a parameter is what makes that omission
* unrepresentable at the call sites.
* @param childCtx - the child agent's scoped creation context.
* @param parent - the delegating parent whose composition the child joins.
* @param composition - the per-child persona and tool filter to install.
*/
function applyChildComposition(childCtx, parent, composition) {
	childCtx.get("agentPresets")?.composeFrom(childCtx, parent.ctx);
	childCtx.systemPrompt.context({
		name: "subagent:delegation",
		order: childCtx.systemPrompt.getContextOrder("SUBAGENT_DELEGATION"),
		text: SUBAGENT_DELEGATION_CONTEXT
	});
	if (composition.persona !== void 0) childCtx.systemPrompt.section({
		name: "deployment:persona-prefix",
		order: childCtx.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX"),
		text: composition.persona
	});
	if (composition.toolFilter !== void 0) childCtx.tools.restrict(composition.toolFilter);
}
/**
* Capture the policy to seed into one delegation. Call synchronously before
* the child start's first await: a later parent switch belongs to the
* parent's future, not to this child. Only the parent session's explicit
* sandbox override is captured — never deployment defaults or one-shot
* grants — and the approval policy is pinned to `'never'` regardless of the
* parent's own policy.
* @param parent - the delegating parent agent.
* @returns the sandbox override (or `undefined` without one) and the approval pin.
*/
function captureDelegatedPolicyOverrides(parent) {
	return {
		sandboxMode: parent.ctx.get("sandboxPolicy")?.overrideOf(parent.session),
		approvalPolicy: parent.ctx.get("approval") === void 0 ? void 0 : "never"
	};
}
/**
* Append the captured delegation policy onto the child's own log as
* `source: 'delegation'` events inside the unpublished creation window, so the
* child's effective policy is reconstructable from its log alone. Appends land
* after any fork seed, so fresh policy wins stale seed state; later child
* switches still win over these events.
* @param childSession - the unpublished child's session.
* @param overrides - the policy captured at delegation.
*/
function appendDelegatedPolicyOverrides(childSession, overrides) {
	if (overrides.sandboxMode !== void 0) childSession.append("sandbox/mode", {
		mode: overrides.sandboxMode,
		source: "delegation"
	});
	if (overrides.approvalPolicy !== void 0) childSession.append("approval/policy", {
		policy: overrides.approvalPolicy,
		source: "delegation"
	});
}
//#endregion
//#region lib/types/continuation-messages.js
/**
* Model-visible messages owned by continuable-subagent orchestration.
*
* @module @deepseek-ai/dsh-subagent/continuation-messages
*/
/** Build durable attribution for one adjacent-Agent message. */
function agentMessageSource(sender) {
	return {
		kind: "agent-message",
		form: "relay",
		senderSessionId: sender.id
	};
}
/**
* Build the model-visible and durable representation of one adjacent-Agent message.
* @param sender - exact live Agent that authored the message.
* @param content - model-visible message blocks supplied by the sender.
* @returns the durable user-message representation delivered to the recipient.
*/
function createAgentMessage(sender, content) {
	return createUserMessage({
		content: [{
			type: "text",
			text: `Agent ${sender.id} sent a message: `
		}, ...content],
		source: agentMessageSource(sender)
	});
}
/**
* Append adjacent-Agent return guidance to a continuable child's initial task.
* @param parentId - durable parent session id named in the guidance.
* @param prompt - initial model-visible task blocks.
* @returns task blocks followed by the continuable return guidance.
*/
function withContinuableReturnGuidance(parentId, prompt) {
	const encodedParentId = JSON.stringify(parentId);
	return [...prompt, {
		type: "text",
		text: `Your parent agent id is ${encodedParentId}. Before you finish, send your result to that agent with send_message({ agent_id: ${encodedParentId}, message: "<self-contained result>" }). The parent shares your workspace but does not automatically receive your transcript, tool output, or reasoning. Send earlier messages as well when a finding changes what the parent should do next; sending a message does not end your turn.`
	}];
}
/**
* One line telling a parent that a background child is finished and why, in
* the parent's own task vocabulary.
* @param childId - the durable child the parent knows by id.
* @param stopReason - how the child's last ordinary turn ended.
* @returns the model-facing opening line of the settlement notice.
*/
function settlementSummary(childId, stopReason) {
	const subject = `Background subagent ${childId}`;
	switch (stopReason) {
		case "completed": return `${subject} finished and will do no further work unless you send it more.`;
		case "aborted": return `${subject} was stopped before it finished.`;
		case "max-tokens": return `${subject} ran out of room before it finished.`;
		case "refusal": return `${subject} declined the task.`;
		case "error": return `${subject} failed before it finished.`;
		/* v8 ignore next 4 -- `SubagentResult['stopReason']` is merge-extensible, so this arm
		* needs a backend that adds a variant; an unnameable ending is reported as unfinished
		* rather than silently as success. */
		default: return `${subject} ended abnormally (${String(stopReason)}) before it finished.`;
	}
}
/**
* Build the runtime-owned settlement notice delivered to a child's parent.
* @param childId - durable child session id named in the notice.
* @param terminal - recorded terminal state for the settled Activation.
* @returns the durable user-message representation delivered to the parent.
*/
function createSettlementMessage(childId, terminal) {
	const summary = settlementSummary(childId, terminal.stopReason);
	return createUserMessage({
		content: [{
			type: "text",
			text: summary
		}, ...terminal.output === void 0 ? [{
			type: "text",
			text: "It left no closing message."
		}] : [{
			type: "text",
			text: "Its closing message:"
		}, ...terminal.output]],
		source: {
			kind: "subagent-settled",
			form: "notice",
			summary: boundContextSummary(summary),
			senderSessionId: childId
		}
	});
}
//#endregion
//#region lib/types/inbox.js
/**
* Activation-local admission around one continuable subagent's Agent inbox.
*
* @module @deepseek-ai/dsh-subagent/inbox
*/
/** Delegate Queue and Steer to one live Agent until its Activation starts closing. */
var SubagentInbox = class {
	agent;
	closingPromise;
	/**
	* Wrap one live continuable Agent.
	* @param agent - the Agent whose inbox receives accepted deliveries.
	*/
	constructor(agent) {
		this.agent = agent;
	}
	/**
	* Read the Activation's close transaction.
	* @returns the memoized transaction, or `undefined` while delivery remains open.
	*/
	get closing() {
		return this.closingPromise;
	}
	/**
	* Read whether the underlying Agent still has accepted work to claim.
	* @returns whether either Agent inbox destination is non-empty.
	*/
	get hasPending() {
		return this.agent.inbox.nextTurn.length > 0 || this.agent.inbox.nextStep.length > 0;
	}
	/**
	* Submit through the Agent only while its Activation remains resident.
	* @param message - the accepted input to submit.
	* @param delivery - whether to queue a distinct turn or steer the nearest step.
	*/
	deliver(message, delivery) {
		if (this.closingPromise !== void 0) throw new SubagentError(`subagent "${this.agent.id}" activation is being disposed; the message was not accepted`, "ACTIVATION_CLOSING");
		if (delivery === "steer") this.agent.steer(message);
		else this.agent.followup(message);
	}
	/**
	* Close delivery synchronously and share one asynchronous release.
	* @param release - the one release operation to start after closing admission.
	* @returns the memoized release transaction.
	*/
	close(release) {
		const existing = this.closingPromise;
		if (existing !== void 0) return existing;
		const completion = Promise.withResolvers();
		this.closingPromise = completion.promise;
		release().then(completion.resolve, completion.reject);
		return completion.promise;
	}
};
//#endregion
//#region lib/types/continuation-activation.js
/**
* Process-local Activation ownership for continuable subagents: admission,
* parent-child residency, serialized delivery, settlement, and disposal.
*
* The continuation manager owns durable request orchestration and delegates
* every mutable residency decision to this registry, so delivery and teardown
* share one child lock and one Activation map.
*
* @module @deepseek-ai/dsh-subagent/continuation-activation
*/
/** Serialize each durable child's delivery, release, and disposal. */
var ChildLock = class {
	tails = /* @__PURE__ */ new Map();
	/**
	* Run `operation` after every previously queued operation for `childId`.
	* @param childId - the durable child whose operations are linearized.
	* @param operation - the critical section to run in order.
	* @returns the operation's own settlement.
	*/
	run(childId, operation) {
		const result = (this.tails.get(childId) ?? Promise.resolve()).then(operation, operation);
		const tail = result.then(() => void 0, () => void 0);
		this.tails.set(childId, tail);
		tail.then(() => {
			if (this.tails.get(childId) === tail) this.tails.delete(childId);
		});
		return result;
	}
};
/** Own the complete process-local lifetime of continuable child Activations. */
var ContinuableActivationRegistry = class {
	ctx;
	observeActivation;
	/** Child session id → its live Activation. Process-local, never durable. */
	resident = /* @__PURE__ */ new Map();
	/** Materializations admitted before drain, tracked through publication or rollback. */
	materializations = /* @__PURE__ */ new Set();
	/** Per-child serializer shared by delivery, release, and disposal. */
	locks = new ChildLock();
	/** Structural Cordis owner of every Activation handle. */
	ownerCtx;
	/**
	* Exact roots whose host teardown has begun, with the live lineage members
	* observed under each root. Entries remain until that exact root leaves the
	* Agent registry, closing admission throughout its host's teardown without
	* poisoning a later same-id replacement.
	*/
	closingScopes = /* @__PURE__ */ new Map();
	draining = false;
	/**
	* Build one registry inside the service's Agent-injected context.
	* @param ctx - context providing Agents, Sessions, and teardown ownership.
	* @param observeActivation - build the lifecycle observer for one residency epoch.
	*/
	constructor(ctx, observeActivation) {
		this.ctx = ctx;
		this.observeActivation = observeActivation;
		const scope = ctx.plugin(function activationOwner() {});
		this.ownerCtx = scope.ctx;
		ctx.on("agent/disposed", ({ agent }) => {
			this.closingScopes.delete(agent);
		});
		ctx.effect(function* () {
			yield scope.dispose;
			yield () => this.drain();
		}.bind(this), "subagents.continuations()");
	}
	/**
	* Return the live Activation for a durable child id, if resident.
	* @param childId - durable child session id to look up.
	* @returns the process-local Activation, or `undefined` when it is not resident.
	*/
	get(childId) {
		return this.resident.get(childId);
	}
	/**
	* Reject one child identity already owned by a live Agent or Session.
	* @param childId - proposed durable child session id.
	*/
	assertChildIdAvailable(childId) {
		if (this.ctx.agents.get(childId) !== void 0 || this.ctx.get("sessions")?.get(childId) !== void 0) throw new SubagentError(`subagent "${childId}" already exists`, "DUPLICATE_CHILD");
	}
	/**
	* Pre-register `childId` in a continuation-managed parent's owned set so the
	* parent cannot settle while a caller is still establishing or resuming that
	* child. Returns a releaser for the failure path; it removes only a hold
	* this call added, and leaves ownership in place once a live Activation for
	* the child exists.
	* @param parent - the live direct parent the operation is admitted under.
	* @param childId - the durable child the operation addresses.
	* @returns the failure-path releaser; a no-op when nothing was added.
	*/
	holdOwnership(parent, childId) {
		const parentActivation = this.resident.get(parent.id);
		if (parentActivation === void 0 || parentActivation.handle.agent !== parent) return () => {};
		if (parentActivation.inbox.closing !== void 0) throw new SubagentError(`subagent parent "${parent.id}" is being disposed; the child was not established`, "ACTIVATION_CLOSING");
		if (parentActivation.ownedChildren.has(childId)) return () => {};
		parentActivation.ownedChildren.add(childId);
		return () => {
			const live = this.resident.get(childId);
			/* v8 ignore next 4 -- reaching this arm needs another delivery to establish the child
			* between this operation's failure and its releaser running, which no test can schedule
			* deterministically: the ownership edge then belongs to that live Activation, so the
			* conservative keep leaves it for finishDisposal's releaseOwnership. */
			if (live !== void 0 && live.inbox.closing === void 0) return;
			if (parentActivation.ownedChildren.delete(childId)) this.wake(parentActivation);
		};
	}
	/**
	* Interrupt one live continuable child's current turn under the supplied authority.
	* @param targetSessionId - the durable child session id to interrupt.
	* @param authority - the human parent address or exact live ancestor Agent.
	*/
	interrupt(targetSessionId, authority) {
		if (authority.kind === "ancestor") {
			const caller = authority.agent;
			if (this.ctx.agents.get(caller.id) !== caller) throw new SubagentError(`interrupting "${targetSessionId}" requires the exact live ancestor agent`, "UNAUTHORIZED");
			if (caller.id === targetSessionId) throw new SubagentError(`agent "${caller.id}" cannot interrupt itself`, "UNAUTHORIZED");
		}
		const activation = this.resident.get(targetSessionId);
		if (activation === void 0) return;
		if (authority.kind === "user") {
			if (activation.handle.agent.session.header.parentSession !== authority.parentSessionId) throw new SubagentError(`subagent "${targetSessionId}" belongs to another parent session`, "UNAUTHORIZED");
		} else if (!activation.ancestry.has(authority.agent)) throw new SubagentError(`subagent "${targetSessionId}" is not a live descendant of agent "${authority.agent.id}"`, "UNAUTHORIZED");
		if (activation.inbox.closing !== void 0) return;
		activation.handle.agent.cancel(authority.kind === "user" ? { kind: "user" } : { kind: "parent" }, { keepInbox: true });
	}
	/**
	* Send through a receiving parent's Activation inbox when it has one.
	* @param parent - exact live Agent receiving the message.
	* @param message - durable user message to deliver.
	* @param delivery - receiving inbox destination.
	*/
	sendWaking(parent, message, delivery) {
		const parentActivation = this.resident.get(parent.id);
		if (parentActivation !== void 0 && parentActivation.handle.agent === parent) {
			try {
				parentActivation.inbox.deliver(message, delivery);
			} finally {
				this.wake(parentActivation);
			}
			return;
		}
		if (delivery === "steer") parent.steer(message);
		else parent.followup(message);
	}
	/**
	* Close admission, await every already-admitted materialization through
	* publication or rollback, then dispose the stable live Activation graph
	* child-first.
	*/
	async drain() {
		this.draining = true;
		await Promise.all([...this.materializations].map((materialization) => materialization.settled));
		const owned = /* @__PURE__ */ new Set();
		for (const activation of this.resident.values()) for (const child of activation.ownedChildren) owned.add(child);
		const roots = [...this.resident.values()].filter((activation) => !owned.has(activation.childId));
		await this.disposeRoots(roots, "activation(s)");
	}
	/**
	* Stop only the continuable descendants of exact live host-owned parents.
	* @param parents - exact live roots whose continuable descendants must stop.
	*/
	async drainDescendants(parents) {
		const roots = new Set(parents.filter((parent) => this.ctx.agents.get(parent.id) === parent));
		if (roots.size === 0) return;
		for (const root of roots) this.closingMembers(root).add(root);
		const targets = [];
		for (const activation of this.resident.values()) {
			const lineage = this.liveLineage(activation.handle.agent);
			const owners = [...roots].filter((root) => activation.handle.agent !== root && activation.ancestry.has(root));
			if (owners.length === 0) continue;
			targets.push(activation);
			for (const owner of owners) {
				const members = this.closingMembers(owner);
				members.add(activation.handle.agent);
				for (const agent of lineage) members.add(agent);
			}
		}
		const materializations = [...this.materializations].filter((materialization) => {
			const owners = [...roots].filter((root) => materialization.lineage.includes(root));
			for (const owner of owners) {
				const members = this.closingMembers(owner);
				for (const agent of materialization.lineage) members.add(agent);
			}
			return owners.length > 0;
		});
		const ownedTargets = /* @__PURE__ */ new Set();
		for (const activation of targets) for (const child of activation.ownedChildren) ownedTargets.add(child);
		const targetRoots = targets.filter((activation) => !ownedTargets.has(activation.childId));
		for (const activation of targets) this.dispose(activation).catch(() => void 0);
		await Promise.all(materializations.map((materialization) => materialization.settled));
		await this.disposeRoots(targetRoots, "scoped activation(s)");
	}
	/**
	* Release selected resident direct children of one exact live parent.
	* @param parent - exact live direct parent authorizing the selected release.
	* @param childIds - durable direct-child ids to release when resident.
	*/
	async drainChildren(parent, childIds) {
		if (this.ctx.agents.get(parent.id) !== parent) throw new SubagentError("selected child teardown requires the exact live parent agent", "UNAUTHORIZED");
		const targets = [];
		for (const childId of new Set(childIds)) {
			const activation = this.resident.get(childId);
			if (activation === void 0) continue;
			if (activation.parentSession !== parent.id || !activation.ancestry.has(parent)) throw new SubagentError(`subagent "${childId}" is not a direct child of agent "${parent.id}"`, "UNAUTHORIZED");
			targets.push(activation);
		}
		for (const activation of targets) this.dispose(activation).catch(() => void 0);
		await this.disposeRoots(targets, "selected activation(s)");
	}
	/**
	* Reject new admission once the registry or this exact parent tree began draining.
	* @param agent - exact live Agent whose lineage determines admission.
	*/
	assertAdmitting(agent) {
		const closing = this.closingTeardownFor(agent);
		if (closing === void 0) return;
		throw new SubagentError(closing === "manager" ? "continuable subagents are draining; the operation was not admitted" : `continuable subagents below parent "${closing.id}" are draining; the operation was not admitted`, "DRAINING");
	}
	/**
	* Authorize one operation against the durable direct-parent lineage.
	* @param parent - exact live Agent claiming direct-parent authority.
	* @param childId - durable child session id addressed by the operation.
	* @param parentSession - durable direct-parent id recorded by the child.
	*/
	authorizeLineage(parent, childId, parentSession) {
		if (this.ctx.agents.get(parent.id) !== parent) throw new SubagentError(`subagent "${childId}" delivery requires the exact live parent agent`, "UNAUTHORIZED");
		if (parentSession !== parent.id) throw new SubagentError(`subagent "${childId}" belongs to another parent session`, "UNAUTHORIZED");
	}
	/**
	* Create or resume one child Agent and publish its Activation.
	* @param inputs - reconstruction and admission inputs for the residency epoch.
	* @returns the published process-local Activation.
	*/
	materialize(inputs) {
		this.assertAdmitting(inputs.parent);
		const settled = Promise.withResolvers();
		const lineage = this.liveLineage(inputs.parent);
		const materialization = {
			lineage,
			settled: settled.promise
		};
		this.materializations.add(materialization);
		return this.materializeTracked(inputs, lineage).finally(() => {
			this.materializations.delete(materialization);
			settled.resolve();
		});
	}
	/**
	* Cross the final admission cutoff and submit without yielding.
	* @param activation - the exact resident child receiving the message.
	* @param message - the already-built durable user message.
	* @param delivery - the Agent inbox destination.
	* @param parent - exact live direct parent authorizing admission.
	* @param signal - caller cancellation before inbox acceptance.
	* @returns the accepted durable message id.
	*/
	submitAdmitted(activation, message, delivery, parent, signal) {
		signal.throwIfAborted();
		this.assertAdmitting(parent);
		this.authorizeLineage(parent, activation.childId, activation.handle.agent.session.header.parentSession);
		this.acquireOwnership(parent, activation.childId);
		try {
			activation.inbox.deliver(message, delivery);
		} finally {
			this.wake(activation);
		}
		return message.id;
	}
	/**
	* Stop and release one Activation through its memoized close transaction.
	* @param activation - exact residency epoch to close.
	* @param finalStateFlushed - whether natural settlement already flushed final state.
	* @returns the shared close transaction.
	*/
	dispose(activation, finalStateFlushed = false) {
		return activation.inbox.close(() => this.finishDisposal(activation, finalStateFlushed));
	}
	/** Dispose independent roots and report every branch failure after all settle. */
	async disposeRoots(roots, failureSubject) {
		const reasons = (await Promise.all(roots.map(async (activation) => {
			try {
				await this.dispose(activation);
				return;
			} catch (error) {
				return error;
			}
		}))).filter((failure) => failure !== void 0);
		if (reasons.length > 0) throw new SubagentError(`continuable subagent teardown failed for ${reasons.length} ${failureSubject}: ` + reasons.map((reason) => errorChain(reason)).join("; "), "ACTIVATION_TEARDOWN_FAILED");
	}
	/** Return the retained member set for one exact scoped-teardown root. */
	closingMembers(root) {
		const existing = this.closingScopes.get(root);
		if (existing !== void 0) return existing;
		const members = /* @__PURE__ */ new Set();
		this.closingScopes.set(root, members);
		return members;
	}
	/** Return the exact currently resolvable ancestry from `agent` upward. */
	liveLineage(agent) {
		const lineage = [agent];
		const seen = new Set([agent.id]);
		let parentSession = agent.session.header.parentSession;
		while (parentSession !== void 0) {
			const parent = this.ctx.agents.get(parentSession);
			if (parent === void 0 || seen.has(parent.id)) break;
			lineage.push(parent);
			seen.add(parent.id);
			parentSession = parent.session.header.parentSession;
		}
		return lineage;
	}
	/** Return the teardown that closed continuable admission for this agent's lineage. */
	closingTeardownFor(agent) {
		if (this.draining) return "manager";
		const lineage = this.liveLineage(agent);
		for (const [root, members] of this.closingScopes) if (members.has(agent) || lineage.includes(root)) return root;
	}
	/** Perform one tracked materialization through publication or rollback. */
	async materializeTracked(inputs, parentLineage) {
		const { childId, provider, parent, create } = inputs;
		inputs.signal.throwIfAborted();
		const setup = (childCtx, child) => {
			if (create !== void 0) {
				child.session.append("subagent/descriptor", create.descriptor);
				appendDelegatedPolicyOverrides(child.session, create.delegatedPolicies);
			}
			applyChildComposition(childCtx, parent, inputs.composition);
		};
		const observer = this.observeActivation(provider, childId, parent);
		const handle = create === void 0 ? await this.ownerCtx.agents.resume({
			resumeSessionId: childId,
			parentAgent: parent,
			agentOptions: inputs.agentOptions,
			signal: inputs.signal,
			setup
		}) : await this.ownerCtx.agents.create({
			sessionId: childId,
			parentAgent: parent,
			meta: create.meta,
			...create.seed === void 0 ? {} : { seed: create.seed },
			inheritedEventCount: create.inheritedEventCount,
			agentOptions: inputs.agentOptions,
			signal: inputs.signal,
			setup
		});
		const activation = {
			childId,
			parentSession: parent.id,
			provider,
			handle,
			inbox: new SubagentInbox(handle.agent),
			ancestry: new WeakSet([handle.agent, ...parentLineage]),
			ownedChildren: /* @__PURE__ */ new Set(),
			observer,
			announced: false,
			poke: Promise.withResolvers()
		};
		this.resident.set(childId, activation);
		try {
			inputs.signal.throwIfAborted();
			this.assertAdmitting(parent);
			this.acquireOwnership(parent, childId);
			const wakeOnInboxRemoval = () => {
				this.wake(activation);
			};
			handle.agent.ctx.on("agent/inbox/claimed", wakeOnInboxRemoval);
			handle.agent.ctx.on("agent/inbox/discarded", wakeOnInboxRemoval);
			observer.start(handle.agent);
		} catch (error) {
			/* v8 ignore next -- rollback failure must not mask the admission failure
			* that prevented this operation from returning an accepted message id. */
			await this.rollbackUnpublished(activation).catch(() => void 0);
			throw error;
		}
		this.watchSettlement(activation);
		return activation;
	}
	/** Release an Activation whose start edge was not published. */
	rollbackUnpublished(activation) {
		return activation.inbox.close(async () => {
			try {
				await activation.handle.dispose();
			} finally {
				this.resident.delete(activation.childId);
				this.releaseOwnership(activation.childId);
			}
		});
	}
	/** Register the child in a continuation-managed parent's owned set. */
	acquireOwnership(parent, childId) {
		const parentActivation = this.resident.get(parent.id);
		if (parentActivation === void 0) return;
		if (parentActivation.inbox.closing !== void 0) throw new SubagentError(`subagent parent "${parent.id}" is being disposed; the child was not established`, "ACTIVATION_CLOSING");
		parentActivation.ownedChildren.add(childId);
	}
	/** Remove one child from its live owner's set and let that owner re-check settlement. */
	releaseOwnership(childId) {
		for (const candidate of this.resident.values()) if (candidate.ownedChildren.delete(childId)) this.wake(candidate);
	}
	/** Let a settlement watcher re-check residency after relevant state changes. */
	wake(activation) {
		activation.poke.resolve();
		activation.poke = Promise.withResolvers();
	}
	/** Follow one Activation to natural settlement. */
	watchSettlement(activation) {
		(async () => {
			while (true) {
				const idleObservation = activation.poke;
				await activation.handle.agent.whenIdle();
				if (activation.inbox.closing !== void 0) return;
				const readiness = await this.locks.run(activation.childId, () => Promise.resolve(this.settlementState(activation, idleObservation)));
				if (readiness === "closed") return;
				if (readiness === "retry") continue;
				if (readiness === "wait") {
					await idleObservation.promise;
					continue;
				}
				const finalSeq = activation.handle.agent.session.seq;
				await this.flushFinalState(activation);
				const attempt = await this.locks.run(activation.childId, () => {
					const state = this.settlementState(activation, idleObservation);
					if (state !== "ready") return Promise.resolve(state);
					if (activation.handle.agent.session.seq !== finalSeq) return Promise.resolve("retry");
					let done;
					try {
						activation.handle.agent.runMaintenance(() => {
							done = this.dispose(activation, true);
							return Promise.resolve();
						});
					} catch {
						return Promise.resolve("retry");
					}
					return Promise.resolve({ done });
				});
				if (attempt === "closed") return;
				if (attempt === "retry") continue;
				if (attempt === "wait") {
					await idleObservation.promise;
					continue;
				}
				try {
					await attempt.done;
				} catch (error) {
					this.ctx.logger.warn(`subagent "${activation.childId}" activation teardown failed: ${errorChain(error)}`);
				}
				return;
			}
		})();
	}
	/** Classify one Inbox and owned-child observation without reading Agent execution state. */
	settlementState(activation, observation) {
		if (activation.inbox.closing !== void 0) return "closed";
		if (activation.poke !== observation) return "retry";
		if (activation.inbox.hasPending || activation.ownedChildren.size > 0) return "wait";
		return "ready";
	}
	/** Propagate stop synchronously, then finish the child-first release. */
	async finishDisposal(activation, finalStateFlushed) {
		this.wake(activation);
		const { childId } = activation;
		const failures = [];
		if (finalStateFlushed) try {
			activation.observer.capture(activation.handle.agent);
		} catch (error) {
			failures.push(new SubagentError(`subagent "${childId}" activation teardown failed: ${errorChain(error)}`, "ACTIVATION_TEARDOWN_FAILED", { cause: error }));
		}
		else {
			activation.handle.agent.cancel({ kind: "parent" });
			const idle = activation.handle.agent.whenIdle();
			const childDisposals = [...activation.ownedChildren].map((child) => this.resident.get(child)).filter((child) => child !== void 0).map((child) => this.dispose(child));
			try {
				const reasons = (await Promise.all(childDisposals.map(async (disposal) => {
					try {
						await disposal;
						return;
					} catch (error) {
						return error;
					}
				}))).filter((reason) => reason !== void 0);
				if (reasons.length > 0) failures.push(new SubagentError(`subagent "${childId}" child teardown failed: ${reasons.map((reason) => errorChain(reason)).join("; ")}`, "ACTIVATION_TEARDOWN_FAILED"));
				await idle;
				await this.flushFinalState(activation);
				activation.observer.capture(activation.handle.agent);
			} catch (error) {
				failures.push(new SubagentError(`subagent "${childId}" activation teardown failed: ${errorChain(error)}`, "ACTIVATION_TEARDOWN_FAILED", { cause: error }));
			}
		}
		try {
			await activation.handle.dispose();
		} catch (error) {
			failures.push(new SubagentError(`subagent "${childId}" activation handle disposal failed: ${errorChain(error)}`, "ACTIVATION_TEARDOWN_FAILED", { cause: error }));
		}
		let failure;
		if (failures.length === 1) failure = failures[0];
		else if (failures.length > 1) failure = new SubagentError(`subagent "${childId}" activation teardown failed at ${failures.length} boundaries: ` + failures.map((item) => errorChain(item)).join("; "), "ACTIVATION_TEARDOWN_FAILED", { cause: new AggregateError(failures) });
		this.resident.delete(childId);
		this.notifySettlement(activation, activation.observer.terminal(failure));
		this.releaseOwnership(childId);
		activation.observer.settle(failure);
		if (failure !== void 0) throw failure;
	}
	/** Tell the durable direct parent how this Activation ended. */
	notifySettlement(activation, terminal) {
		if (!activation.announced) return;
		try {
			const parent = this.ctx.agents.get(activation.parentSession);
			if (parent === void 0) return;
			const message = createSettlementMessage(activation.childId, terminal);
			if (this.closingTeardownFor(parent) !== void 0) {
				parent.inject(message);
				return;
			}
			this.sendWaking(parent, message, parent.status === "idle" ? "queue" : "steer");
		} catch (error) {
			this.ctx.logger.warn(`subagent "${activation.childId}" settlement notice was not delivered to its parent: ` + errorChain(error));
		}
	}
	/** Request a best-effort final session flush before closing natural-settlement admission. */
	async flushFinalState(activation) {
		const child = activation.handle.agent;
		try {
			await child.ctx.sessions.flush(child.session);
		} catch (error) {
			this.ctx.logger.warn(`subagent "${activation.childId}" best-effort final session flush failed; the persisted state may be unavailable or stale on resume: ${errorChain(error)}`);
		}
	}
};
//#endregion
//#region lib/types/descriptor.js
/**
* The durable subagent-child descriptor: the versioned, model-hidden
* `subagent/descriptor` session event that identifies every session-backed
* subagent and records whether it is one-shot or continuable. Continuable
* descriptors additionally preserve the declared composition required for
* cold resume. Providers append it turn-enclosed in the child's initial turn.
*
* The descriptor deliberately snapshots explicit fields rather than the
* merge-extensible `AgentOptions` object: an unrelated extension value cannot
* make continuation fail merely because it is not JSON, and later composition
* inputs require a deliberate {@link SUBAGENT_DESCRIPTOR_VERSION} change. It
* omits `subagentDepth` — cold resume trusts the persisted header's
* `delegationDepth` as the monotone floor — and `outputSchema`, which belongs
* to one activation's result contract rather than durable child composition.
* Per-activation knobs such as `maxTokens` are omitted for the same reason as
* `outputSchema`: they budget one activation. Cold resume requires the exact
* live parent for authorization but reconstructs child options only from the
* durable descriptor, so it neither restores the prior budget nor inherits
* the parent's current one; the resumed route's defaults apply instead.
*
* @module @deepseek-ai/dsh-subagent/descriptor
*/
/**
* The current descriptor format version, stamped into every appended
* `subagent/descriptor` event and required verbatim by {@link foldSubagentDescriptor}.
* Supporting another composition input is a deliberate version change, never
* an implicit extra field.
*/
const SUBAGENT_DESCRIPTOR_VERSION = 3;
const DESCRIPTOR_BASE_KEYS = [
	"version",
	"mode",
	"provider",
	"label"
];
const ONE_SHOT_DESCRIPTOR_KEYS = new Set(DESCRIPTOR_BASE_KEYS);
const CONTINUABLE_DESCRIPTOR_KEYS = new Set([
	...DESCRIPTOR_BASE_KEYS,
	"agentProvider",
	"agentModel",
	"agentReasoningEffort",
	"persona",
	"toolFilter"
]);
const TOOL_FILTER_KEYS = new Set(["allow", "deny"]);
/** Whether a persisted JSON value is an object record. */
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Reject fields outside one versioned record's declared schema. */
function assertKnownKeys(value, keys, path) {
	const unknown = Object.keys(value).find((key) => !keys.has(key));
	if (unknown !== void 0) throw new Error(`persisted subagent descriptor ${path} has unknown field "${unknown}"`);
}
/** Read one optional string field from a persisted descriptor record. */
function optionalString(value, key) {
	if (!Object.hasOwn(value, key)) return void 0;
	const field = value[key];
	if (typeof field !== "string") throw new Error(`persisted subagent descriptor ${key} must be a string`);
	return field;
}
/** Read one optional string-array field from a persisted tool restriction. */
function optionalStringArray(value, key) {
	if (!Object.hasOwn(value, key)) return void 0;
	const field = value[key];
	if (!Array.isArray(field)) throw new Error(`persisted subagent descriptor toolFilter.${key} must be an array of strings`);
	const items = field;
	if (items.some((item) => typeof item !== "string")) throw new Error(`persisted subagent descriptor toolFilter.${key} must be an array of strings`);
	return items;
}
/** Validate and reconstruct a persisted tool restriction. */
function parseToolFilter(value) {
	if (!isRecord(value)) throw new Error("persisted subagent descriptor toolFilter must be an object");
	assertKnownKeys(value, TOOL_FILTER_KEYS, "toolFilter");
	const allow = optionalStringArray(value, "allow");
	const deny = optionalStringArray(value, "deny");
	if (allow === void 0 && deny === void 0) throw new Error("persisted subagent descriptor toolFilter must declare allow and/or deny");
	return {
		...allow !== void 0 ? { allow } : {},
		...deny !== void 0 ? { deny } : {}
	};
}
/** Validate one persisted descriptor payload for the current runtime. */
function parseSubagentDescriptor(value) {
	if (!isRecord(value)) throw new Error("persisted subagent descriptor payload must be an object");
	const version = value["version"];
	if (typeof version !== "number") throw new Error("persisted subagent descriptor version must be a number");
	if (version !== 3) return void 0;
	const mode = value["mode"];
	if (mode !== "one-shot" && mode !== "continuable") throw new Error("persisted subagent descriptor mode must be \"one-shot\" or \"continuable\"");
	assertKnownKeys(value, mode === "one-shot" ? ONE_SHOT_DESCRIPTOR_KEYS : CONTINUABLE_DESCRIPTOR_KEYS, "payload");
	const provider = value["provider"];
	if (typeof provider !== "string") throw new Error("persisted subagent descriptor provider must be a string");
	if (mode === "one-shot") {
		const label = optionalString(value, "label");
		return {
			version: 3,
			mode,
			provider,
			...label !== void 0 ? { label } : {}
		};
	}
	const label = value["label"];
	if (typeof label !== "string") throw new Error("persisted subagent descriptor label must be a string");
	const agentProvider = optionalString(value, "agentProvider");
	const agentModel = optionalString(value, "agentModel");
	const agentReasoningEffort = optionalString(value, "agentReasoningEffort");
	const persona = optionalString(value, "persona");
	const toolFilter = Object.hasOwn(value, "toolFilter") ? parseToolFilter(value["toolFilter"]) : void 0;
	return {
		version: 3,
		mode,
		provider,
		label,
		...agentProvider !== void 0 ? { agentProvider } : {},
		...agentModel !== void 0 ? { agentModel } : {},
		...agentReasoningEffort !== void 0 ? { agentReasoningEffort } : {},
		...persona !== void 0 ? { persona } : {},
		...toolFilter !== void 0 ? { toolFilter } : {}
	};
}
function snapshotSubagentDescriptor(input) {
	const snapshot = snapshotJsonValue(input.mode === "one-shot" ? {
		version: 3,
		mode: input.mode,
		provider: input.provider,
		...input.label !== void 0 ? { label: input.label } : {}
	} : {
		version: 3,
		mode: input.mode,
		provider: input.provider,
		label: input.label,
		...input.agentProvider !== void 0 ? { agentProvider: input.agentProvider } : {},
		...input.agentModel !== void 0 ? { agentModel: input.agentModel } : {},
		...input.agentReasoningEffort !== void 0 ? { agentReasoningEffort: input.agentReasoningEffort } : {},
		...input.persona !== void 0 ? { persona: input.persona } : {},
		...input.toolFilter !== void 0 ? { toolFilter: input.toolFilter } : {}
	});
	if (snapshot === void 0) throw new Error("subagent descriptor is not losslessly JSON-serializable");
	return snapshot;
}
/**
* Fold a persisted child log to its supported descriptor. The first
* `subagent/descriptor` event is authoritative — the establishing provider
* appends exactly one, so a later same-type event cannot rewrite the declared
* composition.
* @param events - the loaded child session events.
* @returns the descriptor, or `undefined` when the log has none or its
*   version is not {@link SUBAGENT_DESCRIPTOR_VERSION} (the child cannot be
*   classified by this runtime).
* @throws when a current-version persisted payload does not match its complete
*   declared schema.
*/
function foldSubagentDescriptor(events) {
	const event = events.find((candidate) => candidate.type === "subagent/descriptor");
	if (event === void 0) return void 0;
	return parseSubagentDescriptor(event.data);
}
const sessionIdSchema = z.string();
const oneShotCatalogSchema = z.object({
	version: z.literal(0),
	childId: sessionIdSchema,
	childCreatedAt: z.number().int().nonnegative(),
	mode: z.literal("one-shot"),
	label: z.string().optional()
}).strict();
const continuableCatalogSchema = z.object({
	version: z.literal(0),
	childId: sessionIdSchema,
	childCreatedAt: z.number().int().nonnegative(),
	mode: z.literal("continuable"),
	label: z.string()
}).strict();
const eventDataSchema = z.union([oneShotCatalogSchema, continuableCatalogSchema]);
const viewSchema = z.array(z.union([oneShotCatalogSchema.omit({
	version: true,
	childId: true,
	childCreatedAt: true
}).extend({
	id: sessionIdSchema,
	createdAt: oneShotCatalogSchema.shape.childCreatedAt
}), continuableCatalogSchema.omit({
	version: true,
	childId: true,
	childCreatedAt: true
}).extend({
	id: sessionIdSchema,
	createdAt: continuableCatalogSchema.shape.childCreatedAt
})]));
const stateSchema = z.object({
	inheritedEventCount: z.number().int().nonnegative(),
	head: chunkedListSchema(eventDataSchema).optional()
}).strict();
/**
* Materialize direct children from their parent's successful creation facts.
* @param state - parent catalog fold state.
* @returns current direct-child rows in parent catalog event order.
*/
function subagentCatalogEntries(state) {
	const entries = [];
	for (const data of iterateChunkedList(state.head)) entries.push(data.mode === "one-shot" ? {
		id: data.childId,
		createdAt: data.childCreatedAt,
		mode: data.mode,
		...data.label === void 0 ? {} : { label: data.label }
	} : {
		id: data.childId,
		createdAt: data.childCreatedAt,
		mode: data.mode,
		label: data.label
	});
	return entries;
}
/** Parent-owned direct-child catalog projection; invalid own facts reject restoration. */
const subagentCatalogProjectionDefinition = {
	key: "subagentCatalog",
	stateSchema,
	init: (_header, inheritedEventCount) => ({ inheritedEventCount }),
	apply: (state, event) => {
		if (event.type !== "subagent/catalog" || event.seq < state.inheritedEventCount) return state;
		return {
			...state,
			head: appendChunkedList(state.head, eventDataSchema.parse(event.data))
		};
	},
	stateVersion: 2,
	wire: {
		viewSchema,
		view: subagentCatalogEntries
	}
};
/**
* Append a complete direct-child discovery fact to its parent Session.
* @param parent - durable direct parent receiving the discovery fact.
* @param child - established child's immutable Session metadata.
* @param descriptor - mode-discriminated creation label frozen with the child.
*/
function establishCatalogChild(parent, child, descriptor) {
	parent.append("subagent/catalog", descriptor.mode === "one-shot" ? {
		version: 0,
		childId: child.id,
		childCreatedAt: child.createdAt,
		mode: descriptor.mode,
		...descriptor.label === void 0 ? {} : { label: descriptor.label }
	} : {
		version: 0,
		childId: child.id,
		childCreatedAt: child.createdAt,
		mode: descriptor.mode,
		label: descriptor.label
	});
}
//#endregion
//#region lib/types/internal.js
/**
* Continuation integration markers and host adapters outside the public
* Service Definition and model-facing Agent messaging contract.
* @module @deepseek-ai/dsh-subagent/internal
*/
/** Process-stable identity carried only by the standard adjacent-Agent messaging tool. */
const adjacentAgentSendMessageTool = Symbol.for("dsh.subagent.adjacentAgentSendMessageTool");
/**
* Test whether one visible definition is the standard adjacent-Agent messaging tool.
* @param definition - the scope-resolved `send_message` candidate.
* @returns whether the definition carries the internal standard-tool identity.
*/
function isAdjacentAgentSendMessageTool(definition) {
	return definition !== void 0 && definition[adjacentAgentSendMessageTool] === true;
}
/**
* Process-stable symbol-keyed host delivery shared by the bundled runtime
* entry and this unbundled internal subpath.
* @internal
*/
const deliverSubagentPrompt = Symbol.for("dsh.subagent.deliverPrompt");
//#endregion
//#region lib/types/continuation.js
/**
* Continuable-subagent orchestration behind `ctx.subagents`: stable child ids,
* descriptor persistence, provider preparation, cold resume, authorization,
* and message routing. {@link ContinuableActivationRegistry} owns the mutable
* process-local Activation graph and its settlement and disposal lifecycle.
*
* A continuable child has one durable Session and at most one process-local
* Activation. The Agent inbox is the only turn queue, so this manager owns
* durable orchestration while the Agent loop owns all turn ordering and
* execution. No continuable path creates a Task or an intermediate
* result-bearing wrapper.
*
* @module @deepseek-ai/dsh-subagent
*/
var __addDisposableResource$1 = function(env, value, async) {
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
var __disposeResources$1 = (function(SuppressedError) {
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
/**
* The continuable-subagent orchestration service behind `ctx.subagents`. Tool
* schema and host adapters are consumers of this one contract; foreground
* one-shot delegation keeps calling `ctx.subagents.start()` and never enters
* this lifecycle.
*/
var SubagentContinuationManager = class {
	ctx;
	host;
	activations;
	constructor(ctx, host) {
		this.ctx = ctx;
		this.host = host;
		this.activations = new ContinuableActivationRegistry(ctx, (provider, childId, parent) => host.observeActivation(provider, childId, parent));
	}
	/**
	* Start one continuable background child and resolve at initial inbox acceptance.
	* Every earlier failure disposes any created handle and rolls back Activation
	* and parent ownership without returning either id.
	* @param spec - provider, delegation request, and caller cancellation.
	* @returns the durable child id and accepted initial prompt message id.
	*/
	async startContinuable(spec) {
		const request = spec.request;
		const parent = request.parent;
		this.activations.assertAdmitting(parent);
		const persistence = this.requirePersistence();
		assertSubagentMaxDepth(request.maxDepth);
		const childId = spec.childId ?? brandString(randomUUID());
		this.activations.assertChildIdAvailable(childId);
		const childDepth = resolveChildDepth(parent, request.maxDepth);
		const agentOptions = resolveChildAgentOptions(parent, request.agentOptions, childDepth);
		const agentProvider = agentOptions.provider;
		const agentModel = agentOptions.model;
		const agentReasoningEffort = agentOptions.reasoningEffort;
		const descriptor = snapshotSubagentDescriptor({
			mode: "continuable",
			provider: spec.provider,
			label: spec.label,
			...agentProvider !== void 0 ? { agentProvider } : {},
			...agentModel !== void 0 ? { agentModel } : {},
			...agentReasoningEffort !== void 0 ? { agentReasoningEffort } : {},
			...request.persona !== void 0 ? { persona: request.persona } : {},
			...request.toolFilter !== void 0 ? { toolFilter: request.toolFilter } : {}
		});
		const delegatedPolicies = captureDelegatedPolicyOverrides(parent);
		const releaseHold = this.activations.holdOwnership(parent, childId);
		try {
			const prepared = await this.host.prepareContinuable(spec.provider, {
				sessionId: childId,
				parent,
				signal: spec.signal
			});
			spec.signal.throwIfAborted();
			this.activations.assertAdmitting(parent);
			const inheritedEventCount = SessionLogOffset(prepared.seed?.length ?? 0);
			const seed = prepared.seed;
			return {
				childId,
				messageId: await this.activations.locks.run(childId, async () => {
					spec.signal.throwIfAborted();
					this.activations.assertAdmitting(parent);
					this.activations.assertChildIdAvailable(childId);
					if (spec.childId !== void 0) {
						const persisted = await persistence.stat(childId, { signal: spec.signal });
						spec.signal.throwIfAborted();
						this.activations.assertAdmitting(parent);
						this.activations.assertChildIdAvailable(childId);
						if (persisted !== void 0) throw new SubagentError(`subagent "${childId}" already exists`, "DUPLICATE_CHILD");
					}
					const activation = await this.activations.materialize({
						childId,
						provider: spec.provider,
						parent,
						create: {
							seed,
							meta: childSessionMeta(parent, childDepth, prepared.seed !== void 0),
							inheritedEventCount,
							delegatedPolicies,
							descriptor
						},
						agentOptions,
						composition: {
							persona: request.persona,
							toolFilter: request.toolFilter
						},
						signal: spec.signal
					});
					const childHeader = activation.handle.agent.session.header;
					return await this.submitMaterialized(activation, isAdjacentAgentSendMessageTool(this.ctx.get("tools")?.get("send_message", activation.handle.agent)) ? withContinuableReturnGuidance(parent.id, request.prompt) : request.prompt, {
						source: { kind: "user" },
						signal: spec.signal,
						delivery: "queue"
					}, parent, () => {
						establishCatalogChild(parent.session, childHeader, descriptor);
					});
				})
			};
		} catch (error) {
			releaseHold();
			throw error;
		}
	}
	/**
	* Deliver one model-authored message to a direct continuable child or to the
	* sender's direct parent. A missing direct child cold-resumes through the
	* ordinary continuation lifecycle.
	* @param sender - exact live Agent authorizing and originating the message.
	* @param targetId - durable direct-parent or direct-child session id.
	* @param content - model-authored content to deliver.
	* @param options - caller cancellation before acceptance.
	* @returns the accepted message's inbox id.
	*/
	async sendMessage(sender, targetId, content, options) {
		if (this.ctx.agents.get(sender.id) !== sender) throw new SubagentError("message delivery requires the exact live sender agent", "UNAUTHORIZED");
		this.activations.assertAdmitting(sender);
		const senderActivation = this.activations.get(sender.id);
		if (senderActivation !== void 0 && senderActivation.handle.agent === sender && senderActivation.parentSession === targetId) {
			options.signal.throwIfAborted();
			return this.sendToParent(senderActivation, sender, content);
		}
		if (sender.session.header.parentSession === targetId) throw new SubagentError(`agent "${sender.id}" is not a resident continuable child and cannot send to parent "${targetId}"`, "UNAUTHORIZED");
		return this.deliverToChild(sender, targetId, content, {
			signal: options.signal,
			delivery: "steer"
		});
	}
	/**
	* Queue one human-authored prompt as a distinct direct-child turn.
	* @param parent - exact live direct parent authorizing delivery.
	* @param childId - durable direct-child session id.
	* @param content - model-visible prompt blocks.
	* @param source - durable attribution for the human prompt.
	* @param signal - caller cancellation before inbox acceptance.
	* @returns the accepted durable message id.
	*/
	async queuePrompt(parent, childId, content, source, signal) {
		return this.deliverToChild(parent, childId, content, {
			source,
			signal,
			delivery: "queue"
		});
	}
	/**
	* Steer one host-authored prompt to a direct continuable child.
	* @param parent - exact live direct parent authorizing delivery.
	* @param childId - durable direct-child session id.
	* @param content - model-visible prompt blocks.
	* @param source - durable attribution for the host prompt.
	* @param signal - caller cancellation before inbox acceptance.
	* @returns the accepted durable message id.
	*/
	async steerPrompt(parent, childId, content, source, signal) {
		return this.deliverToChild(parent, childId, content, {
			source,
			signal,
			delivery: "steer"
		});
	}
	/** Route one parent-originated delivery through residency and cold resume. */
	async deliverToChild(parent, childId, content, options) {
		this.activations.assertAdmitting(parent);
		const releaseHold = this.activations.holdOwnership(parent, childId);
		try {
			return await this.deliverFollowup(parent, childId, content, options);
		} catch (error) {
			releaseHold();
			throw error;
		}
	}
	/** The delivery loop behind {@link deliverToChild}, run under the parent hold. */
	async deliverFollowup(parent, childId, content, options) {
		while (true) {
			const live = await this.activations.locks.run(childId, async () => {
				const activation = this.activations.get(childId);
				if (activation === void 0) return this.coldResume(parent, childId, content, options);
				const disposal = activation.inbox.closing;
				/* v8 ignore next 3 -- the send-versus-dispose cutoff needs a delivery to
				* observe the transaction inside the same critical section that opened it. */
				if (disposal !== void 0) return disposal.then(() => void 0, () => void 0);
				if (contentHasImage(content)) {
					await this.assertImageCapable(activation.handle.agent, options.signal);
					if (activation.inbox.closing !== void 0) {
						await Promise.allSettled([activation.inbox.closing]);
						return;
					}
				}
				const messageId = this.submitAdmitted(activation, content, options, parent);
				activation.announced = true;
				return messageId;
			});
			/* v8 ignore start -- only a delivery that lost the disposal cutoff retries. */
			if (live !== void 0) return live;
			this.activations.assertAdmitting(parent);
			options.signal.throwIfAborted();
		}
	}
	/**
	* Interrupt one live continuable child's current turn. Admission is
	* synchronous and the cancellation effect is asynchronous. An absent or
	* already-closing target is an accepted no-op after authority checks.
	* @param targetSessionId - the durable child session id to interrupt.
	* @param authority - the human parent address or exact live ancestor Agent.
	*/
	interrupt(targetSessionId, authority) {
		this.activations.interrupt(targetSessionId, authority);
	}
	/** Deliver one resident continuable child's message to its live direct parent. */
	sendToParent(activation, sender, content) {
		/* v8 ignore next 6 -- only synchronous re-entrant teardown can open this
		* transaction between exact-agent authorization and this no-await span. */
		if (activation.inbox.closing !== void 0) throw new SubagentError(`subagent "${sender.id}" activation is being disposed; the message was not delivered`, "ACTIVATION_CLOSING");
		const parent = this.ctx.agents.get(activation.parentSession);
		if (parent === void 0) throw new SubagentError("direct parent is not live; the message was not delivered", "PARENT_UNAVAILABLE");
		const message = createAgentMessage(sender, content);
		this.sendAgentMessage(parent, message);
		return message.id;
	}
	/** Send one Agent message while translating only the target's own rejection. */
	sendAgentMessage(parent, message) {
		try {
			this.activations.sendWaking(parent, message, "steer");
		} catch (error) {
			throw new SubagentError("direct parent is not live; the message was not delivered", "PARENT_UNAVAILABLE", { cause: error });
		}
	}
	/** Close manager-wide admission and release every live Activation. */
	async drain() {
		await this.activations.drain();
	}
	/**
	* Stop only the continuable descendants of exact live host-owned parents.
	* @param parents - exact live roots whose continuable descendants must stop.
	*/
	async drainDescendants(parents) {
		await this.activations.drainDescendants(parents);
	}
	/**
	* Release selected resident direct children of one exact live parent.
	* @param parent - exact live direct parent authorizing the selected release.
	* @param childIds - durable direct-child ids to release when resident.
	*/
	async drainChildren(parent, childIds) {
		await this.activations.drainChildren(parent, childIds);
	}
	/**
	* Cold-resume a persisted child and submit the waiting turn. The descriptor
	* supplies every reconstruction input; no subagent provider is dispatched.
	*/
	async coldResume(parent, childId, content, options) {
		const env_1 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			const query = this.requireSessionQuery();
			let observation;
			try {
				observation = await query.observeSession(childId, { signal: options.signal });
			} catch (error) {
				options.signal.throwIfAborted();
				throw new SubagentError(`subagent "${childId}" is unavailable`, "NOT_RESUMABLE", { cause: error });
			}
			const source = __addDisposableResource$1(env_1, observation, false);
			this.activations.assertAdmitting(parent);
			this.activations.authorizeLineage(parent, childId, source.header.parentSession);
			const descriptor = foldSubagentDescriptor(source.events.slice(source.inheritedEventCount));
			if (descriptor === void 0 || descriptor.mode !== "continuable") throw new SubagentError(`subagent "${childId}" has no supported continuation state and cannot be resumed; choose a different target`, "NOT_RESUMABLE");
			let activation;
			try {
				activation = await this.activations.materialize({
					childId,
					provider: descriptor.provider,
					parent,
					agentOptions: {
						...descriptor.agentProvider !== void 0 ? { provider: descriptor.agentProvider } : {},
						...descriptor.agentModel !== void 0 ? { model: descriptor.agentModel } : {},
						...descriptor.agentReasoningEffort !== void 0 ? { reasoningEffort: ReasoningEffortId(descriptor.agentReasoningEffort) } : {}
					},
					composition: {
						persona: descriptor.persona,
						toolFilter: descriptor.toolFilter
					},
					signal: options.signal
				});
			} catch (error) {
				options.signal.throwIfAborted();
				if (error instanceof SubagentError) throw error;
				throw new SubagentError(`subagent "${childId}" is unavailable`, "NOT_RESUMABLE", { cause: error });
			}
			return await this.submitMaterialized(activation, content, options, parent);
		} catch (e_1) {
			env_1.error = e_1;
			env_1.hasError = true;
		} finally {
			__disposeResources$1(env_1);
		}
	}
	/** Admit a materialized child, commit its creation fact, and release it on failure. */
	async submitMaterialized(activation, content, options, parent, commit) {
		try {
			if (contentHasImage(content)) {
				await this.assertImageCapable(activation.handle.agent, options.signal);
				if (activation.inbox.closing !== void 0) throw new SubagentError(`subagent "${activation.childId}" is closing`, "ACTIVATION_CLOSING");
			}
			const messageId = this.submitAdmitted(activation, content, options, parent);
			commit?.();
			activation.announced = true;
			return messageId;
		} catch (error) {
			try {
				await this.activations.dispose(activation);
			} catch (cleanupError) {
				this.ctx.logger.warn(`subagent continuation: disposal after admission or catalog append failure also failed: ${String(cleanupError)}`);
			}
			throw error;
		}
	}
	/** Build and submit one message across the final synchronous admission cutoff. */
	submitAdmitted(activation, content, options, parent) {
		const message = options.source === void 0 ? createAgentMessage(parent, content) : createUserMessage({
			content,
			source: options.source
		});
		return this.activations.submitAdmitted(activation, message, options.delivery, parent, options.signal);
	}
	/** Refuse image content for a child whose fixed model accepts text only. */
	async assertImageCapable(agent, signal) {
		const { provider, model } = agent.options;
		if (provider === void 0 || model === void 0) return;
		const llm = this.ctx.get("llm");
		/* v8 ignore next -- without an LLM registry, delivery defers to projection. */
		if (llm === void 0) return;
		const info = await llm.resolveModelInfo(provider, model, signal);
		if (info.inputModalities !== void 0 && !info.inputModalities.includes("image")) throw new SubagentError(`Model "${model}" does not support image input.`, "MODEL_DOES_NOT_SUPPORT_IMAGES");
	}
	/** Resolve the persistence service continuable children require, or fail loud. */
	requirePersistence() {
		const persistence = this.ctx.get("sessionPersistence");
		if (persistence === void 0) throw new SubagentError("continuable subagents require session persistence (load a dsh-session-persistence backend)", "PERSISTENCE_UNAVAILABLE");
		return persistence;
	}
	/** Resolve the Session query service used for cold child observations. */
	requireSessionQuery() {
		const query = this.ctx.get("sessionQuery");
		if (query === void 0) throw new SubagentError("continuable subagents require session query (load @deepseek-ai/dsh-session-query)", "CONTINUATION_UNAVAILABLE");
		return query;
	}
};
//#endregion
//#region lib/types/list-children.js
/**
* Read-only enumeration of durable subagent children and descendant trees
* through the Session query service. Candidates come from one live-preferred
* corpus; each child's mode/label is the registered `subagent` projection
* unit's value, resolved
* down a three-rung ladder: the registry's watermark cache for a live child,
* an unseeded durable projection-cache row, and one shared Session observation
* otherwise. A seeded header deliberately lacks its exact inherited cut, so
* it takes the body-bearing observation path before classifying an identity.
* The projection fold is the single classification
* authority — this module parses no descriptor
* itself. Absent persistence, enumeration is live-only: a cold child is
* unreachable for resume anyway, so its absence is capability absence, not an
* error. The module owns no catalog state and does not consult Activation,
* Agent-registry, continuation-manager, or provider state.
*
* @module @deepseek-ai/dsh-subagent
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
/**
* Concurrent cold observations per explicit catalog listing. Current Session
* persistence providers are local; a networked provider must promote this to
* a validated deployment setting.
*/
const COLD_READ_CONCURRENCY = 4;
/**
* Enumerate one parent's origin-classified direct children from the
* live-preferred merge of `ctx.sessions` and optional session persistence,
* serving each identity from the `subagent` projection unit: the registry's
* watermark snapshot for a live child; for a cold one, a durable
* projection-cache read for an unseeded lifecycle, else one bounded-concurrency
* shared Session observation carrying the exact inherited cut.
* @see SubagentRuntime.listChildren for the public cancellation and failure contract.
* @param ctx - context carrying the session store, the projection registry,
*   optional persistence, and the optional projection cache.
* @param parentSessionId - parent session whose direct children are listed.
* @param signal - caller-owned cancellation observed around every persistence read.
* @returns children and per-child diagnostics ordered by `createdAt`, then id.
* @throws {@link SubagentError} when the projection registry or the session
*   store is not mounted, or the caller cancels the listing.
*/
async function listChildren(ctx, parentSessionId, signal) {
	const listing = await prepareListing(ctx, signal);
	return (await resolveCandidateRows([...listing.corpus.values()].filter((record) => record.header.parentSession === parentSessionId && record.header.origin === "subagent").sort(compareCorpusRecords), listing, signal)).filter((row) => row !== void 0);
}
/**
* Enumerate every session-backed subagent below one root in stable pre-order.
* Ordinary sessions and one-shot children remain traversal nodes, so a
* continuable child below either is still discovered. Classification uses the
* same projection-backed runtime as {@link listChildren}; no Agent is loaded or
* resumed.
* @see SubagentRuntime.listDescendants for the public cancellation and failure contract.
* @param ctx - context carrying the session store, projection registry, and optional persistence/cache.
* @param rootSessionId - session whose complete descendant tree is listed.
* @param signal - caller-owned cancellation observed around every persistence read.
* @returns interpreted subagents with durable direct-parent and root-relative depth.
* @throws {@link SubagentError} under the same conditions as {@link listChildren}.
*/
async function listDescendants(ctx, rootSessionId, signal) {
	const listing = await prepareListing(ctx, signal);
	const positioned = descendantCandidates(listing.corpus, rootSessionId);
	const rows = await resolveCandidateRows(positioned.map((candidate) => candidate.record), listing, signal);
	const entries = [];
	positioned.forEach((position, index) => {
		const row = rows[index];
		if (row !== void 0) entries.push({
			...row,
			parentId: position.parentId,
			depth: position.depth
		});
	});
	return entries;
}
/** Resolve listing services once and build one live-preferred session corpus. */
async function prepareListing(ctx, signal) {
	const projections = ctx.get("sessionProjections");
	if (projections === void 0) throw new SubagentError("listing subagents requires the sessionProjections registry (load @deepseek-ai/dsh-session-projection)", "SUBAGENT_CONTROL_PROJECTIONS_UNAVAILABLE");
	const sessions = ctx.get("sessions");
	if (sessions === void 0) throw new SubagentError("listing subagents requires the session store (load @deepseek-ai/dsh-session)", "SUBAGENT_CONTROL_SESSION_STORE_UNAVAILABLE");
	assertListingNotCancelled(signal);
	const query = ctx.get("sessionQuery");
	if (query === void 0) throw new SubagentError("listing subagents requires the sessionQuery service (load @deepseek-ai/dsh-session-query)", "SUBAGENT_CONTROL_QUERY_UNAVAILABLE");
	const cache = ctx.get("sessionProjectionCache");
	let records;
	try {
		records = await query.listSessions(signal);
	} catch (error) {
		assertListingNotCancelled(signal);
		throw error;
	}
	assertListingNotCancelled(signal);
	const corpus = /* @__PURE__ */ new Map();
	for (const record of records) {
		const live = sessions.get(record.header.id);
		corpus.set(record.header.id, {
			header: live?.header ?? record.header,
			live
		});
	}
	const subagentParents = /* @__PURE__ */ new Set();
	for (const record of corpus.values()) if (record.header.origin === "subagent" && record.header.parentSession !== void 0) subagentParents.add(record.header.parentSession);
	return {
		projections,
		query,
		cache,
		corpus,
		subagentParents
	};
}
/** Resolve projection-backed rows for aligned candidates with bounded cold reads. */
async function resolveCandidateRows(candidates, listing, signal) {
	const { projections, query, cache, subagentParents } = listing;
	const rows = Array.from({ length: candidates.length });
	const coldReads = [];
	candidates.forEach((candidate, index) => {
		const childId = candidate.header.id;
		if (candidate.live === void 0) {
			coldReads.push({
				index,
				header: candidate.header
			});
			return;
		}
		let identity;
		try {
			identity = projections.snapshot(candidate.live, ["subagent"]).values.subagent;
		} catch {
			rows[index] = {
				kind: "diagnostic",
				id: childId,
				reason: "corrupt"
			};
			return;
		}
		if (identity === void 0 || identity === null || !candidate.live.isOwnSeq(identity.seq)) return;
		rows[index] = childRow(childId, identity, "running", subagentParents.has(childId));
	});
	if (coldReads.length > 0) {
		const queue = [...coldReads];
		await Promise.all(Array.from({ length: Math.min(COLD_READ_CONCURRENCY, queue.length) }, async () => {
			for (let job = queue.shift(); job !== void 0; job = queue.shift()) rows[job.index] = await resolveColdIdentity(query, cache, job.header, subagentParents.has(job.header.id), signal);
		}));
	}
	assertListingNotCancelled(signal);
	return rows;
}
/** Build origin-classified candidates from the complete tree without recursion. */
function descendantCandidates(corpus, rootSessionId) {
	const children = /* @__PURE__ */ new Map();
	for (const record of corpus.values()) {
		const parentId = record.header.parentSession;
		if (parentId === void 0) continue;
		const siblings = children.get(parentId);
		if (siblings === void 0) children.set(parentId, [record]);
		else siblings.push(record);
	}
	for (const siblings of children.values()) siblings.sort(compareCorpusRecords);
	const positioned = [];
	const stack = (children.get(rootSessionId) ?? []).map((record) => ({
		record,
		parentId: rootSessionId,
		depth: 1
	})).reverse();
	const visited = new Set([rootSessionId]);
	while (stack.length > 0) {
		const position = stack.pop();
		const id = position.record.header.id;
		if (visited.has(id)) continue;
		visited.add(id);
		if (position.record.header.origin === "subagent") positioned.push(position);
		const descendants = children.get(id) ?? [];
		for (const record of [...descendants].reverse()) stack.push({
			record,
			parentId: id,
			depth: position.depth + 1
		});
	}
	return positioned;
}
/** Compare siblings by durable creation time, then id. */
function compareCorpusRecords(a, b) {
	return a.header.createdAt - b.header.createdAt || a.header.id.localeCompare(b.header.id);
}
/**
* Resolve one cold candidate down the remaining ladder: an unseeded durable
* projection-cache row, otherwise one shared Session observation. An absent or transiently failed
* observation is one `unavailable` row retried on the next listing; an observation
* source naming another lifecycle, and a
* settled log the fold cannot identify — or that makes any registered unit
* throw — are final, so they report `corrupt`.
*/
async function resolveColdIdentity(query, cache, header, hasChildren, signal) {
	const env_1 = {
		stack: [],
		error: void 0,
		hasError: false
	};
	try {
		const childId = header.id;
		if (cache !== void 0 && !header.isSeeded) {
			let cached;
			try {
				cached = cache.cachedSnapshot(header, SessionLogOffset(0), ["subagent"])?.values.subagent;
			} catch {
				cached = void 0;
			}
			if (cached !== void 0 && cached !== null) return childRow(childId, cached, "inactive", hasChildren);
		}
		assertListingNotCancelled(signal);
		let observation;
		try {
			observation = await query.observeSession(childId, { ...signal === void 0 ? {} : { signal } });
		} catch (error) {
			assertListingNotCancelled(signal);
			return {
				kind: "diagnostic",
				id: childId,
				reason: sessionQueryCode(error) === "SESSION_QUERY_CORRUPT_SESSION" || sessionQueryCode(error) === "SESSION_QUERY_SOURCE_CONFLICT" ? "corrupt" : "unavailable"
			};
		}
		const ownedObservation = __addDisposableResource(env_1, observation, false);
		assertListingNotCancelled(signal);
		if (!sameLifecycle(ownedObservation.header, header)) return {
			kind: "diagnostic",
			id: childId,
			reason: "corrupt"
		};
		const identity = ownedObservation.projections?.values.subagent;
		if (identity === void 0 || identity === null || identity.seq < ownedObservation.inheritedEventCount) return {
			kind: "diagnostic",
			id: childId,
			reason: "corrupt"
		};
		return childRow(childId, identity, "inactive", hasChildren);
	} catch (e_1) {
		env_1.error = e_1;
		env_1.hasError = true;
	} finally {
		__disposeResources(env_1);
	}
}
/** Materialize one served identity as its child row. */
function childRow(id, identity, activity, hasChildren) {
	return identity.mode === "one-shot" ? {
		kind: "child",
		id,
		mode: "one-shot",
		...identity.label !== void 0 ? { label: identity.label } : {},
		activity,
		hasChildren
	} : {
		kind: "child",
		id,
		mode: "continuable",
		label: identity.label,
		activity,
		hasChildren
	};
}
/** Immutable header fields that distinguish one session lifecycle from another under the same id. */
const LIFECYCLE_WITNESS_KEYS = [
	"version",
	"id",
	"createdAt",
	"cwd",
	"parentSession",
	"isSeeded",
	"delegationDepth",
	"origin",
	"agentPreset"
];
/** Whether an inspected log still belongs to the enumerated lifecycle. */
function sameLifecycle(meta, expected) {
	return LIFECYCLE_WITNESS_KEYS.every((key) => meta[key] === expected[key]);
}
/** Stop a listing at its next cancellation checkpoint. */
function assertListingNotCancelled(signal) {
	if (signal?.aborted) throw new SubagentError("subagent listing was cancelled", "CANCELLED");
}
function sessionQueryCode(error) {
	return error instanceof Error && "code" in error ? error.code : void 0;
}
//#endregion
//#region lib/types/projection.js
/**
* Pure session projections for subagent identity (mode/label) and active-turn
* duration.
*
* @module @deepseek-ai/dsh-subagent/projection
*/
const activeIntervalSchema = z.object({
	since: z.number().int().nonnegative(),
	through: z.number().int().nonnegative()
}).strict();
const projectionSchema = z.object({
	settledMs: z.number().int().nonnegative(),
	active: activeIntervalSchema.optional()
}).strict().transform(({ settledMs, active }) => ({
	settledMs,
	...active === void 0 ? {} : { active }
}));
/**
* Fold turn boundaries around the child's own durable descriptor.
*
* A fork seed may contain an ancestor descriptor and completed turns. Every
* descriptor therefore resets the accumulated state; the healthy catalog
* admits only a child with exactly one descriptor in its own suffix, making
* the final reset the child's authoritative timing origin.
*/
const subagentTimingProjectionDefinition = {
	key: "subagentTiming",
	stateSchema: z.object({
		settledMs: z.number().int().nonnegative(),
		active: activeIntervalSchema.optional(),
		pendingTurnStart: z.number().int().nonnegative().optional(),
		descriptorSeen: z.boolean()
	}).strict(),
	init: () => ({
		descriptorSeen: false,
		settledMs: 0
	}),
	apply: (state, event) => {
		if (event.type === "turn/start") return state.descriptorSeen ? {
			...state,
			active: {
				since: event.time,
				through: event.time
			}
		} : {
			...state,
			pendingTurnStart: event.time
		};
		if (event.type === "subagent/descriptor") {
			const activeSince = state.active?.since ?? state.pendingTurnStart;
			return {
				descriptorSeen: true,
				settledMs: 0,
				...activeSince === void 0 ? {} : { active: {
					since: activeSince,
					through: event.time
				} }
			};
		}
		if (event.type === "turn/end") {
			if (!state.descriptorSeen) {
				if (state.pendingTurnStart === void 0) return state;
				const { pendingTurnStart: _closed, ...next } = state;
				return next;
			}
			if (state.active === void 0) return state;
			const { active, ...rest } = state;
			return {
				...rest,
				settledMs: state.settledMs + Math.max(0, event.time - active.since)
			};
		}
		if (state.active === void 0) return state;
		return {
			...state,
			active: {
				...state.active,
				through: event.time
			}
		};
	},
	wire: {
		viewSchema: projectionSchema,
		view: (state) => ({
			settledMs: state.settledMs,
			...state.active === void 0 ? {} : { active: state.active }
		})
	},
	stateVersion: 2
};
const identityValueSchema = z.discriminatedUnion("mode", [z.object({
	mode: z.literal("one-shot"),
	label: z.string().optional(),
	seq: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).transform(SessionSeq)
}).strict(), z.object({
	mode: z.literal("continuable"),
	label: z.string(),
	seq: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).transform(SessionSeq)
}).strict()]);
const identitySchema = identityValueSchema.nullable();
const identityStateSchema = z.object({ identity: identityValueSchema.optional() }).strict();
/** Interpret one `subagent/descriptor` event's identity; no value when the payload cannot be trusted. */
function descriptorIdentity(event) {
	let descriptor;
	try {
		descriptor = foldSubagentDescriptor([event]);
	} catch {
		descriptor = void 0;
	}
	if (descriptor === void 0) return void 0;
	return descriptor.mode === "one-shot" ? {
		mode: "one-shot",
		...descriptor.label !== void 0 ? { label: descriptor.label } : {},
		seq: event.seq
	} : {
		mode: "continuable",
		label: descriptor.label,
		seq: event.seq
	};
}
/**
* Fold the durable mode/label identity from `subagent/descriptor` events,
* last-wins: a fork seed may replay an ancestor's descriptor, and the child's
* own descriptor must override it — the same reset discipline as
* {@link subagentTimingProjectionDefinition}. A malformed or unknown-version
* payload resets to the `null` sentinel instead of throwing, so a fork of a
* healthy ancestor never inherits an identity its own descriptor failed to
* establish — and the reset survives every JSON push frame, so a consumer
* holding the earlier identity replaces it instead of keeping it stale;
* `null` ⟺ no valid descriptor, with the causes deliberately undistinguished.
*/
const subagentIdentityProjectionDefinition = {
	key: "subagent",
	stateSchema: identityStateSchema,
	init: () => ({}),
	apply: (state, event) => {
		if (event.type !== "subagent/descriptor") return state;
		const identity = descriptorIdentity(event);
		return identity === void 0 ? {} : { identity };
	},
	wire: {
		viewSchema: identitySchema,
		view: (state) => state.identity ?? null
	},
	stateVersion: 2
};
//#endregion
//#region lib/types/out-of-process.js
/**
* Provider-side vocabulary for OUT-OF-PROCESS subagent backends — the pieces
* that enforce this seam's own contracts around a child in another process:
* the no-capabilities advertisement, timing-bound validation, child
* working-directory resolution (config override, else the delegating parent
* session's workspace), the never-reject result settlement, and the standard
* run-handle publication. Backends compose these with their own wire drivers;
* the process machinery itself (spawn, env scrub, managed-range teardown)
* belongs to the `dsh-subprocess` seam.
*
* @module @deepseek-ai/dsh-subagent/out-of-process
*/
/** Maximum UTF-8 size of {@link SubagentResult.diagnostic}. */
const MAX_SUBAGENT_DIAGNOSTIC_BYTES = 4096;
const DIAGNOSTIC_TRUNCATION_SUFFIX = "\n[diagnostic truncated]";
const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();
/**
* Limit provider-authored failure detail without splitting a UTF-8 sequence.
* @param diagnostic - safe diagnostic text produced by the provider.
* @returns the original text, or a visibly truncated value within the limit.
*/
function limitSubagentDiagnostic(diagnostic) {
	const bytes = utf8Encoder.encode(diagnostic);
	if (bytes.byteLength <= MAX_SUBAGENT_DIAGNOSTIC_BYTES) return diagnostic;
	let prefixBytes = MAX_SUBAGENT_DIAGNOSTIC_BYTES - utf8Encoder.encode(DIAGNOSTIC_TRUNCATION_SUFFIX).byteLength;
	while ((bytes[prefixBytes] & 192) === 128) prefixBytes -= 1;
	return utf8Decoder.decode(bytes.subarray(0, prefixBytes)) + DIAGNOSTIC_TRUNCATION_SUFFIX;
}
/** Enforce the byte limit on a provider-returned diagnostic. */
function normalizeSubagentDiagnostic(result) {
	return result.diagnostic === void 0 ? result : {
		...result,
		diagnostic: limitSubagentDiagnostic(result.diagnostic)
	};
}
/**
* The capability advertisement of an out-of-process backend: NONE. A child in
* another process cannot honor parent-enforced start features
* (`agentOptions`/`outputSchema`/`maxDepth`/`toolFilter`/`persona`), so the service rejects a
* request needing any of them before `start` runs — never accepted-then-ignored.
*/
const NO_START_CAPABILITIES = Object.freeze({
	agentOptions: false,
	outputSchema: false,
	depthLimit: false,
	toolFilter: false,
	persona: false
});
/**
* Assert a configured timing bound is a positive finite number (it bounds a
* teardown or shutdown wait; zero, negative, or NaN would skip or wedge it).
* @param prefix - the consuming plugin's diagnostic prefix (e.g. `subagent-acp`).
* @param name - the config field name, for the diagnostic.
* @param value - the configured value.
*/
function assertPositiveFinite(prefix, name, value) {
	if (!Number.isFinite(value) || value <= 0) throw new Error(`${prefix}: ${name} must be a positive finite number`);
}
/**
* Whether `path` names an existing directory the harness can ENTER. The
* search-permission probe matters: `statSync().isDirectory()` is true for a
* mode-600 directory, but a subprocess cwd needs `X_OK` or spawn fails EACCES.
*/
function isEnterableDirectory(path) {
	try {
		if (!statSync(path).isDirectory()) return false;
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}
/**
* Assert `cwd` can actually host the child: absolute (it doubles as the
* child's workspace identity, and a relative path would be re-anchored to the
* server process's launch directory) and an existing directory (fail here,
* before the process boundary, instead of as an ambiguous spawn ENOENT).
* @param prefix - the consuming plugin's diagnostic prefix.
* @param label - which source supplied the value, for the diagnostic.
* @param cwd - the candidate working directory.
* @returns `cwd`, validated.
*/
function assertUsableCwd(prefix, label, cwd) {
	if (!isAbsolute(cwd)) throw new Error(`${prefix}: ${label} must be an absolute path: ${cwd}`);
	if (!isEnterableDirectory(cwd)) throw new Error(`${prefix}: ${label} is not an accessible directory: ${cwd}`);
	return cwd;
}
/**
* Validate a configured `cwd` override ONCE, at plugin load: reject the empty
* string (`path.resolve('')` is the process cwd — it would silently
* reintroduce the launch-directory fallback this resolution removes),
* interpret a relative path against the harness launch directory, and require
* an enterable directory.
* @param prefix - the consuming plugin's diagnostic prefix.
* @param cwd - the configured override, or `undefined` when the config omits it.
* @returns the validated absolute override, or `undefined` when omitted.
*/
function validateConfiguredCwd(prefix, cwd) {
	if (cwd === void 0) return void 0;
	if (cwd === "") throw new Error(`${prefix}: config cwd must not be empty — omit the key to inherit the parent session cwd`);
	return assertUsableCwd(prefix, "config cwd", resolve(cwd));
}
/**
* Resolve the child's working directory at start: the deployment override
* when configured (already validated at load), else the parent session's
* workspace cwd (validated here, its earliest resolvable point). Fails loud
* when neither exists — falling back to the harness process cwd would
* silently bind the child to the server's launch directory instead of the
* delegating session's workspace (one server process serves many sessions,
* each with its own cwd).
* @param prefix - the consuming plugin's diagnostic prefix.
* @param configured - the load-validated override, or `undefined`.
* @param parentCwd - the delegating parent session's workspace cwd, if any.
* @returns the absolute child working directory.
*/
function resolveChildCwd(prefix, configured, parentCwd) {
	if (configured !== void 0) return configured;
	if (parentCwd === void 0) throw new Error(`${prefix}: no working directory for the child — configure \`cwd\` or delegate from a parent session that has one`);
	return assertUsableCwd(prefix, "parent session cwd", parentCwd);
}
/** Normalize an unknown thrown value to an Error (the catch binding is `unknown`). */
function toError(value) {
	/* v8 ignore next */
	return value instanceof Error ? value : new Error(String(value));
}
/**
* Settle an out-of-process run result under the seam contract: `result` never
* rejects after publication. A normally completed or rejected attempt resolves
* as `aborted` when cancellation already settled locally; another rejection is
* flattened to `stopReason: 'error'` through the contained diagnostic sink.
* Provider-returned diagnostics use the same byte limit. The abort listener is
* removed on every path.
* @param parts - the attempt, output snapshot, cancellation state, sink, and signal wiring.
* @returns the terminal result (never a rejection).
*/
async function settleRunResult(parts) {
	try {
		const result = await parts.attempt();
		return parts.cancelled() ? {
			output: parts.collectOutput(),
			stopReason: "aborted"
		} : normalizeSubagentDiagnostic(result);
	} catch (error) {
		if (parts.cancelled()) return {
			output: parts.collectOutput(),
			stopReason: "aborted"
		};
		try {
			parts.onError?.(toError(error), "error");
		} catch {}
		const collected = parts.collectDiagnostic?.();
		const diagnostic = collected === void 0 ? void 0 : limitSubagentDiagnostic(collected);
		return {
			output: parts.collectOutput(),
			...diagnostic === void 0 ? {} : { diagnostic },
			stopReason: "error"
		};
	} finally {
		parts.signal.removeEventListener("abort", parts.onAbort);
	}
}
/**
* Publish the seam run handle for an out-of-process child. `dispose()` is
* idempotent (one memoized teardown): it removes the abort listener, settles
* local cancellation — there is no assumption the child cooperates — and then
* awaits the backend's teardown to actual exit.
* @param parts - the run identity, result, cancellation wiring, and teardown.
* @returns the seam run handle (`localAgent` is `undefined` for remote runs).
*/
function subprocessRunHandle(parts) {
	let disposal;
	return {
		id: parts.id,
		localAgent: void 0,
		result: parts.result,
		dispose() {
			if (disposal !== void 0) return disposal;
			parts.signal.removeEventListener("abort", parts.onAbort);
			parts.requestCancel();
			disposal = parts.teardown();
			return disposal;
		}
	};
}
//#endregion
//#region lib/types/run-settlement.js
/**
* Settlement of one ONE-SHOT subagent run into a background-Task outcome. Only
* the one-shot background path uses Jobs; continuable children have no Task,
* no per-message result, and no Task cancellation.
*
* @module @deepseek-ai/dsh-subagent/run-settlement
*/
/** Flatten a child's final output blocks to the task's final text. */
function finalText(blocks) {
	return blocks.filter((block) => block.type === "text").map((block) => block.text).join("");
}
/** Render a failed stop reason with optional provider-authored detail. */
function failureDetail(result) {
	const stopReason = result.stopReason;
	return result.diagnostic === void 0 ? stopReason : `${stopReason}; diagnostic: ${result.diagnostic}`;
}
/**
* Map a child result to the task outcome: completed carries final text, local
* cancellation (`aborted` without a diagnostic) is killed, and provider-
* diagnosed remote aborts plus every other reason are failed without partial
* output.
* @param result - child terminal result.
* @returns outcome for the `ctx.jobs` registration.
*/
function runOutcome(result) {
	switch (result.stopReason) {
		case "completed": return {
			status: "completed",
			output: finalText(result.output)
		};
		case "aborted": return result.diagnostic === void 0 ? { status: "killed" } : {
			status: "failed",
			detail: failureDetail(result)
		};
		case "error":
		case "max-tokens":
		case "refusal": return {
			status: "failed",
			detail: failureDetail(result)
		};
		default: return {
			status: "failed",
			detail: failureDetail(result)
		};
	}
}
/**
* Await the child result, dispose the run, then return its task outcome. Result
* and disposal failures become `failed`; when both fail, both details survive.
* @param run - live run to settle and release.
* @returns outcome after child resources are released.
*/
async function settleRun(run) {
	let outcome;
	try {
		outcome = runOutcome(await run.result);
	} catch (error) {
		outcome = {
			status: "failed",
			detail: String(error)
		};
	}
	try {
		await run.dispose();
	} catch (error) {
		return {
			status: "failed",
			detail: `${outcome.detail === void 0 ? "" : `${outcome.detail}; `}dispose failed: ${String(error)}`
		};
	}
	return outcome;
}
//#endregion
//#region lib/types/index.js
/**
* Service Definition for the subagent capability seam (`ctx.subagents`): a named-provider registry plus a
* capability-validating asynchronous start API. Providers establish a
* child before returning its run, so fulfillment is the single publication and
* ownership-transfer boundary.
*
* Multiple providers coexist: each registers under a unique name and callers
* select one by name.
*
* This package owns the Service Definition role of the capability seam. Service Providers
* (`@deepseek-ai/dsh-subagent-spawn-in-process`, `-fork`, `-acp`) and the model-facing
* consumer (`@deepseek-ai/dsh-tool-subagent`) are separate packages.
*
* Public operations express caller intent: `start` returns one published owned
* one-shot run, `startContinuable` establishes a durable continuable child, and
* `sendMessage` steers between adjacent Agents without exposing whether a child
* is resident. Continuable children never become a {@link SubagentRun}: the
* continuation manager holds their `AgentHandle` directly and orders every turn
* through the child's own inbox, so providers contribute only the detached
* creation spec and see no handle, turn, or teardown. Child and descendant
* discovery read the live session store and optional session persistence
* directly and do not require that continuation runtime.
*
* Same-process providers are trusted typed collaborators. Requests, provider
* descriptors, results, and lifecycle payloads are borrowed immutable values;
* serialization and hostile-input validation belong at real process, worker,
* persistence, and model boundaries.
*
* @module @deepseek-ai/dsh-subagent
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** Named provider registry with one-shot runs, durable discovery, and continuable-child operations. */
let SubagentRuntime = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _remoteExportList_decorators;
	let _prompt_decorators;
	let _interruptByParent_decorators;
	return class SubagentRuntime extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_remoteExportList_decorators = [Remote("list")];
			_prompt_decorators = [Remote("prompt")];
			_interruptByParent_decorators = [Remote("interruptByParent")];
			__esDecorate(this, null, _remoteExportList_decorators, {
				kind: "method",
				name: "remoteExportList",
				static: false,
				private: false,
				access: {
					has: (obj) => "remoteExportList" in obj,
					get: (obj) => obj.remoteExportList
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _prompt_decorators, {
				kind: "method",
				name: "prompt",
				static: false,
				private: false,
				access: {
					has: (obj) => "prompt" in obj,
					get: (obj) => obj.prompt
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _interruptByParent_decorators, {
				kind: "method",
				name: "interruptByParent",
				static: false,
				private: false,
				access: {
					has: (obj) => "interruptByParent" in obj,
					get: (obj) => obj.interruptByParent
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		providers = (__runInitializers(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
		continuations;
		/**
		* The contained lifecycle-edge publisher. Built here because scoped dispatch
		* keys its carrier by this exact service instance, whose own context filter
		* composes into the carrier.
		*/
		emitLifecycle;
		constructor(ctx) {
			super(ctx, "subagents");
			this.emitLifecycle = createLifecycleEmitter(this.ctx, (parent) => scopeTarget(this, parent));
			ctx.inject(["agents"], (childCtx) => {
				const manager = new SubagentContinuationManager(childCtx, {
					prepareContinuable: (name, request) => this.prepareContinuable(name, request),
					observeActivation: (provider, childId, parent) => this.observeActivation(provider, childId, parent)
				});
				this.continuations = manager;
				childCtx.effect(() => () => {
					/* v8 ignore else -- one injected binding owns the slot until its fiber disposes. */
					if (this.continuations === manager) this.continuations = void 0;
				}, "subagents.continuationBinding()");
			});
			ctx.inject(["sessionProjections"], (projectionCtx) => {
				projectionCtx.sessionProjections.register(subagentCatalogProjectionDefinition);
				projectionCtx.sessionProjections.register(subagentTimingProjectionDefinition);
				projectionCtx.sessionProjections.register(subagentIdentityProjectionDefinition);
			});
		}
		/**
		* Establish one durable continuable child and deliver its initial prompt.
		* Resolves when the child's inbox accepts that prompt, without waiting for the
		* turn to start or for the message to reach the Session log; any earlier
		* failure rejects with no ids and rolls back the child entirely.
		* @param spec - provider, delegation request, and caller cancellation.
		* @returns the durable child id and the accepted prompt's message id.
		* @throws when continuation services are unavailable or materialization fails.
		*/
		async startContinuable(spec) {
			return this.requireContinuations().startContinuable(spec);
		}
		/**
		* Steer one model-authored message to the sender's direct parent or direct
		* continuable child. A running target admits it at the nearest step boundary;
		* an idle target starts a turn, and an absent direct child cold-resumes from
		* persistence. The service derives durable sender attribution from the exact
		* live sender. Caller cancellation stops only pre-acceptance work.
		* @param sender - exact live Agent authorizing and originating the message.
		* @param targetId - durable direct-parent or direct-child session id.
		* @param content - model-authored content to deliver.
		* @param options - caller cancellation before inbox acceptance.
		* @returns the accepted message's inbox id.
		* @throws when continuation services are unavailable, adjacency is rejected,
		*   or the message was not admitted.
		*/
		async sendMessage(sender, targetId, content, options) {
			return this.requireContinuations().sendMessage(sender, targetId, content, options);
		}
		/**
		* Deliver one host-protocol message to a direct continuable child.
		* Symbol-keyed so host adapters can preserve their own provenance without
		* widening the public Service Definition or impersonating an Agent sender.
		* @param parent - exact live direct parent authorizing delivery.
		* @param childId - durable direct-child session id.
		* @param content - host-authored content to deliver.
		* @param source - durable host-protocol provenance.
		* @param signal - caller cancellation before inbox acceptance.
		* @param delivery - Queue as a distinct turn or Steer at the nearest step.
		* @returns the accepted message's inbox id.
		*/
		[deliverSubagentPrompt](parent, childId, content, source, signal, delivery) {
			return delivery === "steer" ? this.requireContinuations().steerPrompt(parent, childId, content, source, signal) : this.requireContinuations().queuePrompt(parent, childId, content, source, signal);
		}
		/**
		* Interrupt one live continuable child's current turn under a human parent
		* address or an exact live ancestor Agent. Fire-and-return: the cancel
		* signal is issued before this returns, but the target may keep running
		* until it observes the signal. Unclaimed pending inbox work, the Activation,
		* and published descendants are preserved; claimed work is not requeued.
		* Once the interrupted driver is idle, a waking send resumes the parked FIFO
		* queue. An absent target — including a one-shot or unknown id —
		* is an accepted no-op, as is a manager-less composition, which cannot own a
		* live Activation.
		* @param targetSessionId - the durable child session id to interrupt.
		* @param authority - the human parent address or exact live ancestor Agent.
		* @throws {SubagentError} `UNAUTHORIZED` when the authority does not own the
		*   live target.
		*/
		interrupt(targetSessionId, authority) {
			this.continuations?.interrupt(targetSessionId, authority);
		}
		/**
		* Close continuable admission below exact live parent Agents, stop only their
		* visible descendant Activations synchronously, then await admitted scoped
		* materializations and release those forests child-first. The scoped cutoff
		* lasts until each exact parent leaves the registry; unrelated parent trees
		* remain live.
		* @param parents - exact host-owned parent Agents entering teardown.
		* @returns once every retained descendant Activation released its `AgentHandle`.
		* @throws an aggregate error after all branches settle when any failed.
		*/
		async drainContinuableDescendants(parents) {
			const manager = this.continuations;
			if (manager === void 0) return;
			await manager.drainDescendants(parents);
		}
		/**
		* Release selected resident continuable direct children of one exact live
		* parent. Other children of the same parent remain admitted and resident.
		* Absent targets and a manager-less composition are accepted no-ops.
		* @param parent - exact live direct parent authorizing the selected release.
		* @param childIds - durable direct-child ids to release when resident.
		* @returns once every selected Activation released its `AgentHandle`.
		* @throws {SubagentError} `UNAUTHORIZED` when a resident target belongs to a
		*   different parent or the supplied parent identity is stale.
		*/
		async drainContinuableChildren(parent, childIds) {
			const manager = this.continuations;
			if (manager === void 0) return;
			await manager.drainChildren(parent, childIds);
		}
		/**
		* Enumerate the parent's direct session-backed subagents without loading or
		* resuming an Agent. The Session query service supplies one live-preferred
		* corpus and shared point observations; the projection cache supplies
		* immutable descriptor hits without opening cold logs. The registered
		* `subagent` projection remains the sole mode/label classifier.
		*
		* Every query receives `signal`, and the listing rechecks cancellation
		* around each await. Read rejections that settle
		* after an abort become a stable `SubagentError` with code `CANCELLED`.
		* @param parentSessionId - parent session whose direct children are listed.
		* @param signal - caller-owned cancellation forwarded to Session queries
		*   and observed around every read await.
		* @returns children and per-child diagnostics ordered by `createdAt`, then id.
		* @throws {@link SubagentError} when the projection registry or the session
		*   store is not mounted, or the caller cancels the listing.
		*/
		listChildren(parentSessionId, signal) {
			return listChildren(this.ctx, parentSessionId, signal);
		}
		/**
		* Enumerate the root's complete session-backed subagent tree in stable
		* pre-order from one live-preferred corpus, without loading or resuming an
		* Agent. Ordinary sessions and one-shot children remain traversal nodes so
		* continuable descendants below them are discovered; each returned entry
		* adds its durable `parentId` and root-relative `depth`. Identity resolution,
		* diagnostics, optional persistence, and cancellation follow the same
		* projection-backed contract as {@link listChildren}.
		* @param rootSessionId - session whose complete descendant tree is listed.
		* @param signal - caller-owned cancellation forwarded to persistence reads
		*   and observed around every read await.
		* @returns children and per-candidate diagnostics with tree position, in
		*   stable pre-order.
		* @throws {@link SubagentError} under the same conditions as {@link listChildren}.
		*/
		listDescendants(rootSessionId, signal) {
			return listDescendants(this.ctx, rootSessionId, signal);
		}
		/**
		* Remote face of {@link listChildren} for one browser: the durable listing
		* plus live Agent activity and the delivery-time parent availability hint.
		* Parent availability is a hint; {@link prompt} performs the authoritative
		* check. Named apart from the provider-name {@link list}, which owns the
		* member.
		* @param parentSessionId - parent session whose direct children are listed.
		* @param signal - carrier cancellation forwarded to Session queries.
		* @returns the catalog view for that parent.
		* @throws {RemoteError} `gateway/bad-request` for an empty parent id,
		*   `gateway/cancelled` for an aborted read, `subagent/projections-unavailable` when
		*   the deployment has no projection registry, otherwise `gateway/internal`.
		*/
		async remoteExportList(parentSessionId, signal) {
			validateControlRequest("subagent.list", { parentSessionId });
			try {
				return catalogView(this.ctx, parentSessionId, await this.listChildren(parentSessionId, signal));
			} catch (error) {
				return rejectCatalogRead(error, signal);
			}
		}
		/**
		* Deliver one browser-authored message to a continuable child through the
		* exact live direct parent, retaining the caller-minted request identity and
		* validated browser zone on the accepted message. Success identifies the
		* message the child's inbox accepted; later execution is independent of this
		* call. Queue delivery targets a later turn; steer delivery targets the
		* nearest step and retains the Agent loop's best-effort fallback semantics.
		* Image parts are admitted and persisted through the attachment store
		* before delivery, and the child's model must accept image input.
		* @param request - durable address, delivery, minted identity, content, and optional browser zone.
		* @param signal - carrier cancellation, owning the call until inbox acceptance.
		* @returns the accepted message's inbox identity.
		* @throws {RemoteError} `gateway/bad-request`, `subagent/attachment-invalid`,
		*   `subagent/invalid-time-zone`, `subagent/parent-unavailable`,
		*   `subagent/not-resumable`, `subagent/unauthorized`,
		*   `subagent/delivery-unavailable`, `gateway/cancelled`, or `gateway/internal`.
		*/
		async prompt(request, signal) {
			const { parentSessionId, childSessionId, clientTimeZone, delivery } = request;
			validateControlRequest("subagent.prompt", request);
			const canonicalTimeZone = clientTimeZone === void 0 ? void 0 : canonicalClientTimeZone(clientTimeZone);
			if (clientTimeZone !== void 0 && canonicalTimeZone === void 0) throw new RemoteError("subagent/invalid-time-zone", "clientTimeZone must be UTC or a valid IANA Area/Location name", { value: clientTimeZone });
			const parent = this.ctx.get("agents")?.get(parentSessionId);
			if (parent === void 0) throw new RemoteError("subagent/parent-unavailable", `parent session "${parentSessionId}" is not live`, { parentSessionId });
			const source = {
				kind: "user",
				rpcId: request.requestId,
				...canonicalTimeZone === void 0 ? {} : { clientTimeZone: canonicalTimeZone }
			};
			try {
				let content;
				if (request.content.every((part) => part.type === "text")) content = request.content.map((part) => ({
					type: "text",
					text: part.text
				}));
				else {
					const attachments = this.ctx.get("attachments");
					if (attachments === void 0) throw new Error("subagent image prompt requires an attachment store");
					content = await attachments.admitPromptContent(request.content);
				}
				return { messageId: await this[deliverSubagentPrompt](parent, childSessionId, content, source, signal, delivery) };
			} catch (error) {
				return rejectPrompt(error, childSessionId, signal);
			}
		}
		/**
		* Remote face of {@link interrupt} under one durable parent address. No
		* catalog, history, persistence, or parent Agent lookup runs: the core
		* primitive alone authorizes the address against the live Activation, which
		* is what keeps a live child interruptible while its parent Agent is offline.
		* Absent, idle, and already-completed targets are accepted no-ops there.
		* @param childSessionId - durable child session id to interrupt.
		* @param parentSessionId - durable direct parent whose authority is claimed.
		* @param mode - required continuable-address discriminator.
		* @returns acknowledgement that the cancel signal was admitted, not that the target is quiescent.
		* @throws {RemoteError} `gateway/bad-request` for an empty id,
		*   `subagent/unauthorized` when the address does not own the live target,
		*   otherwise `gateway/internal`.
		*/
		interruptByParent(childSessionId, parentSessionId, mode) {
			validateControlRequest("subagent.interrupt", {
				childSessionId,
				parentSessionId,
				mode
			});
			try {
				this.interrupt(childSessionId, {
					kind: "user",
					parentSessionId
				});
			} catch (error) {
				if (error instanceof SubagentError && error.code === "UNAUTHORIZED") throw new RemoteError("subagent/unauthorized", "subagent does not belong to this parent", { childSessionId }, { cause: error });
				throw new RemoteError("gateway/internal", "subagent interrupt failed", {}, { cause: error });
			}
			return { accepted: true };
		}
		/**
		* Register a provider under its name. Registration is effect-scoped and HMR
		* safe; removing a provider blocks new starts but does not revoke runs that
		* were already returned to their holders.
		* @param provider - the trusted provider implementation.
		* @returns the exact Cordis effect disposer.
		*/
		registerProvider(provider) {
			const name = provider.name;
			return this.ctx.effect(function* () {
				if (this.providers.has(name)) throw new SubagentError(`a subagent provider named "${name}" is already registered`, "DUPLICATE_PROVIDER");
				this.providers.set(name, provider);
				yield () => {
					this.providers.delete(name);
					this.emitLifecycle("subagent/provider-removed", name);
				};
				this.ctx.emit("subagent/provider-added", provider);
			}.bind(this), "subagents.registerProvider()");
		}
		/**
		* Look up a provider by name.
		* @param name - the provider name.
		* @returns the provider, or undefined when absent.
		*/
		getProvider(name) {
			return this.providers.get(name);
		}
		/**
		* List registered provider names in insertion order.
		* @returns the registered names.
		*/
		list() {
			return [...this.providers.keys()];
		}
		/**
		* Establish a published child on the named provider. Capability and semantic
		* checks run before delegation. Provider ownership lasts until its promise
		* fulfills; a rejection therefore has no run for the caller to dispose and
		* emits no run lifecycle events. Post-publication turn and infrastructure
		* failures settle through the returned run.
		* A catalog append failure disposes the run and handles its result rejection;
		* the caller receives the catalog error even if disposal also fails.
		* @param name - the provider to use.
		* @param request - child label, prompt, parent, signal, and optional capabilities.
		* @returns the published holder-owned run.
		*/
		async start(name, request) {
			const provider = this.expectProvider(name);
			this.assertCapabilities(provider, request);
			assertSubagentMaxDepth(request.maxDepth);
			if (request.outputSchema !== void 0) assertObjectJsonSchema(request.outputSchema);
			const descriptor = snapshotSubagentDescriptor({
				mode: "one-shot",
				provider: name,
				...request.label !== void 0 ? { label: request.label } : {}
			});
			const resolved = {
				...request,
				descriptor
			};
			const run = await provider.start(resolved);
			const child = run.localAgent?.session;
			if (child !== void 0) try {
				establishCatalogChild(request.parent.session, child.header, descriptor);
			} catch (error) {
				run.result.catch(() => void 0);
				try {
					await run.dispose();
				} catch (cleanupError) {
					this.ctx.logger.warn(`subagent: disposal after catalog append failure also failed: ${String(cleanupError)}`);
				}
				throw error;
			}
			return observeRun(this.emitLifecycle, name, request.parent, run);
		}
		/**
		* Resolve one provider's detached continuable-creation contribution. Method
		* presence on the provider IS the capability, so a provider without it is
		* rejected before the manager reserves any child resources.
		*/
		async prepareContinuable(name, request) {
			const provider = this.expectProvider(name);
			if (provider.prepareContinuable === void 0) throw new SubagentError(`subagent provider "${provider.name}" does not support continuable children (no prepareContinuable capability)`, "UNSUPPORTED_CAPABILITY");
			return provider.prepareContinuable(request);
		}
		/** Look up a provider for dispatch or fail loud. */
		expectProvider(name) {
			const provider = this.providers.get(name);
			if (provider === void 0) throw new SubagentError(`no subagent provider registered for "${name}"`, "NO_PROVIDER");
			return provider;
		}
		/** Resolve the optional continuable-subagent manager or fail loud. */
		requireContinuations() {
			if (this.continuations === void 0) throw new SubagentError("continuable subagents require the agents service", "CONTINUATION_UNAVAILABLE");
			return this.continuations;
		}
		/**
		* Build the lifecycle observer for one continuable Activation's residency
		* epoch, so the manager publishes its edges without owning event dispatch.
		*/
		observeActivation(provider, childId, parent) {
			return createActivationObserver(this.emitLifecycle, provider, childId, parent);
		}
		/** Reject the first requested capability that the provider lacks. */
		assertCapabilities(provider, request) {
			const needs = [
				{
					when: request.agentOptions !== void 0,
					cap: "agentOptions"
				},
				{
					when: request.outputSchema !== void 0,
					cap: "outputSchema"
				},
				{
					when: request.maxDepth !== void 0,
					cap: "depthLimit"
				},
				{
					when: request.toolFilter !== void 0,
					cap: "toolFilter"
				},
				{
					when: request.persona !== void 0,
					cap: "persona"
				}
			];
			for (const { when, cap } of needs) if (when && !provider.capabilities[cap]) throw new SubagentError(`subagent provider "${provider.name}" does not support the "${cap}" capability`, "UNSUPPORTED_CAPABILITY");
		}
	};
})();
//#endregion
export { AssistantOutputFold, NO_START_CAPABILITIES, SUBAGENT_DESCRIPTOR_VERSION, SubagentDepthError, SubagentError, SubagentRunId, SubagentRuntime, SubagentRuntime as default, appendDelegatedPolicyOverrides, applyChildComposition, assertPositiveFinite, assertSubagentMaxDepth, assertUsableCwd, captureDelegatedPolicyOverrides, childSessionMeta, delegationDepthOf, finalAssistantOutput, foldSubagentDescriptor, parentAgentOptionsForDelegation, resolveChildAgentOptions, resolveChildCwd, resolveChildDepth, settleRun, settleRunResult, snapshotSubagentDescriptor, subprocessRunHandle, validateConfiguredCwd };
