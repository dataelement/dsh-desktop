import { randomUUID } from "node:crypto";
import { brandString } from "@deepseek-ai/dsh-brand";
import { foldConsumedWork } from "@deepseek-ai/dsh-agent";
import { SessionLogOffset } from "@deepseek-ai/dsh-session";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { appendDelegatedPolicyOverrides, applyChildComposition, assertSubagentMaxDepth, captureDelegatedPolicyOverrides, childSessionMeta, finalAssistantOutput, resolveChildAgentOptions, resolveChildDepth } from "@deepseek-ai/dsh-subagent";
import { ToolArgsError, validateJsonSchemaValue } from "@deepseek-ai/dsh-tools";
//#region lib/types/structured.js
/**
* Child-scoped structured-output tool, prompt instruction, terminal guard, and authoritative
* result capture for in-process subagents. Each child registers its real schema on its own
* scope, so concurrent runs do not interact and disposal leaves no global residue. The prompt
* contribution is ordinary reconstructed request state.
*
* Capture commits only after the authoritative `tools/result` succeeds; PTC mode capture also
* waits for the enclosing `run_code` result. The terminal result marker and monotonic tool
* guard prevent later calls from reopening a completed structured run.
* @module @deepseek-ai/dsh-subagent-in-process-driver/structured
*/
/** The model-facing tool name a structured child must call to finish. */
const STRUCTURED_OUTPUT_TOOL = "structured_output";
/**
* The instruction registered as the child's trailing scoped prompt section:
* the demand travels with the
* tool, as ordinary prompt state of exactly one agent.
*/
const STRUCTURED_OUTPUT_INSTRUCTION = `When you have your final answer, you MUST report it by calling the \`${STRUCTURED_OUTPUT_TOOL}\` tool with arguments matching its parameter schema exactly. Do not finish with a plain text answer: only the tool call counts as your result.`;
/**
* Attach the scoped capture tool, instruction, and enforcement to a child during
* its creation window. Child disposal removes every registration.
* @param childCtx - the child agent's scope context (`setup`'s argument).
* @param schema - the trusted, already-asserted schema subset to enforce (see
*   `assertObjectJsonSchema` in dsh-tools).
* @returns the attachment handle (read `captured()` after the child settles).
*/
function attachStructuredRuntime(childCtx, schema) {
	/**
	* Validated values staged by the capture tool body, awaiting THEIR OWN
	* authoritative `tools/result` notification. The execution object's identity
	* uniquely identifies a trip through the pipeline: adapter call ids may
	* repeat across steps, but another execution can never reach this WeakMap
	* entry. This is distinct from the opaque `ToolExecutionToken` used to
	* correlate nested transports. The final notification always deletes its own
	* stage, whether the result succeeded or failed.
	*/
	const staged = /* @__PURE__ */ new WeakMap();
	/** Successful nested capture waiting for its enclosing transport to commit. */
	let pending;
	let captured;
	const schemaEntry = {
		name: STRUCTURED_OUTPUT_TOOL,
		description: "Report your final structured result. Call this exactly once, when your answer is complete; the arguments must match this tool's parameter schema exactly.",
		parameters: schema
	};
	childCtx.tools.register({
		...schemaEntry,
		output: {
			schema: {
				type: "object",
				properties: { recorded: {
					type: "boolean",
					const: true
				} },
				required: ["recorded"],
				additionalProperties: false
			},
			render: () => [{
				type: "text",
				text: "Structured output recorded."
			}]
		},
		execute(args, exec) {
			const violations = validateJsonSchemaValue(schema, args);
			if (violations.length > 0) throw new ToolArgsError(violations);
			staged.set(exec, { value: args });
			exec.concludeTurn();
			return Promise.resolve({ recorded: true });
		}
	});
	childCtx.systemPrompt.section({
		name: `tool:${STRUCTURED_OUTPUT_TOOL}`,
		order: childCtx.systemPrompt.getSectionOrder("STRUCTURED_OUTPUT"),
		text: STRUCTURED_OUTPUT_INSTRUCTION
	});
	childCtx.tools.guard((exec) => captured === void 0 && pending === void 0 ? void 0 : `structured output already recorded: the run is complete, so \`${exec.name}\` is not executed`);
	childCtx.on("tools/result", function(exec, result) {
		if (exec.name === "structured_output") {
			const entry = staged.get(exec);
			if (entry === void 0) return;
			staged.delete(exec);
			if (result.isError) return;
			if (exec.parent === void 0) {
				/* v8 ignore else -- sequential agent-loop dispatch lets the guard block every later supported call */
				if (captured === void 0) captured = { value: entry.value };
			} else if (captured === void 0 && pending === void 0) pending = {
				parent: exec.parent,
				value: entry.value
			};
			return;
		}
		if (pending?.parent !== exec.token) return;
		const entry = pending;
		pending = void 0;
		if (result.isError) return;
		/* v8 ignore else -- PTC mode serializes outer executions, so the guard blocks every later supported call */
		if (captured === void 0) captured = { value: entry.value };
	});
	return { captured: () => captured };
}
//#endregion
//#region lib/types/index.js
/**
* Shared driver for in-process ONE-SHOT subagent providers. The agent factory's
* creation transaction owns unpublished setup and rollback; after publication
* the returned AgentHandle is the one quiescent lifecycle owner held by the
* provider's caller.
*
* Continuable children never come through here: the continuation manager
* composes and drives them directly, so this driver owns exactly one turn with
* one result.
*
* @module @deepseek-ai/dsh-subagent-in-process-driver
*/
/** Map a session turn outcome to the subagent seam's terminal vocabulary. */
function toStopReason(reason) {
	switch (reason?.kind) {
		case "completed": return "completed";
		case "max-tokens": return "max-tokens";
		case "aborted": return "aborted";
		case "blocked": return "refusal";
		default: return "error";
	}
}
/** Error used when cancellation wins before the child publication boundary. */
function prePublicationAbort() {
	return /* @__PURE__ */ new Error("subagent request was aborted before child publication");
}
/** Append one one-shot descriptor inside the child's initial turn before its first request. */
function attachDescriptorAppend(childCtx, descriptor) {
	let appended = false;
	childCtx.on("agent/pre-step", async ({ agent }, next) => {
		const decision = await next();
		if (!appended && decision.kind === "enter") {
			appended = true;
			agent.session.append("subagent/descriptor", descriptor);
		}
		return decision;
	});
}
/**
* Establish and drive one in-process one-shot child. Fulfillment means the agent
* is already published in the registry and transfers its turn, cancellation,
* and disposal work through the returned run. Rejection means the agent
* factory's unpublished creation transaction reached quiescence without
* publishing a child. Every start appends its resolved descriptor inside the
* child's initial turn.
* @param request - the trusted typed start request, including its required signal.
* @param options - the optional fork seed.
* @returns a published holder-owned run.
*/
async function startInProcessRun(request, options) {
	assertSubagentMaxDepth(request.maxDepth);
	if (request.signal.aborted) throw prePublicationAbort();
	const parent = request.parent;
	const childDepth = resolveChildDepth(parent, request.maxDepth);
	const childId = brandString(randomUUID());
	const seed = options.seed;
	const activationBoundary = SessionLogOffset(seed?.length ?? 0);
	const inherited = captureDelegatedPolicyOverrides(parent);
	let structured;
	const setup = (childCtx, child) => {
		appendDelegatedPolicyOverrides(child.session, inherited);
		applyChildComposition(childCtx, parent, {
			persona: request.persona,
			toolFilter: request.toolFilter
		});
		if (request.outputSchema !== void 0) structured = attachStructuredRuntime(childCtx, request.outputSchema);
		attachDescriptorAppend(childCtx, request.descriptor);
	};
	return drivePublishedRun(await parent.ctx.agents.create({
		sessionId: childId,
		parentAgent: parent,
		meta: childSessionMeta(parent, childDepth, seed !== void 0),
		...seed !== void 0 ? { seed } : {},
		...seed === void 0 ? {} : { inheritedEventCount: activationBoundary },
		agentOptions: resolveChildAgentOptions(parent, request.agentOptions, childDepth),
		signal: request.signal,
		setup
	}), request.signal, request.prompt, childId, activationBoundary, structured);
}
/**
* Wrap a published child in the single run lifecycle that owns signal handoff,
* one turn, result settlement, and quiescent disposal.
*/
function drivePublishedRun(handle, signal, prompt, childId, boundary, structured) {
	const child = handle.agent;
	const flags = { cancelled: false };
	const onAbort = () => {
		flags.cancelled = true;
		child.cancel({ kind: "parent" });
	};
	signal.addEventListener("abort", onAbort, { once: true });
	if (signal.aborted) onAbort();
	const result = (async () => {
		try {
			if (!flags.cancelled) {
				child.followup(createUserMessage({
					content: prompt,
					source: { kind: "user" }
				}));
				await child.whenIdle();
			}
			return readResult(child, boundary, flags.cancelled, structured ? { captured: structured.captured() } : void 0);
		} finally {
			signal.removeEventListener("abort", onAbort);
		}
	})();
	return {
		id: childId,
		localAgent: child,
		result,
		async dispose() {
			signal.removeEventListener("abort", onAbort);
			flags.cancelled = true;
			const disposal = (await Promise.allSettled([handle.dispose(), result]))[0];
			if (disposal.status === "rejected") throw disposal.reason;
		}
	};
}
/** Read one settled child's result from events after its activation boundary. */
function readResult(child, boundary, cancelled, structured) {
	const own = child.session.snapshotEvents(boundary);
	const lastEnd = foldConsumedWork(own).end;
	const output = finalAssistantOutput(own) ?? [];
	const recorded = toStopReason(lastEnd?.data.reason);
	const stopReason = cancelled && recorded !== "completed" ? "aborted" : recorded;
	if (structured !== void 0) {
		if (structured.captured !== void 0) return {
			output,
			structured: structured.captured.value,
			stopReason
		};
		if (stopReason === "completed") return {
			output,
			stopReason: cancelled ? "aborted" : "error"
		};
	}
	return {
		output,
		stopReason
	};
}
//#endregion
export { STRUCTURED_OUTPUT_INSTRUCTION, STRUCTURED_OUTPUT_TOOL, startInProcessRun };
