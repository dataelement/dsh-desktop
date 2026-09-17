import z from "@deepseek-ai/schemastery";
import { scopeChainOf, scopeOf } from "@deepseek-ai/dsh-scope";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { SessionSeq } from "@deepseek-ai/dsh-session";
import { assertSubagentMaxDepth, parentAgentOptionsForDelegation, settleRun } from "@deepseek-ai/dsh-subagent";
import { ReasoningEffortId } from "@deepseek-ai/dsh-llm";
import { z as z$1 } from "zod";
z.object({
	provider: z.string().min(1).required(),
	model: z.string().min(1).required()
});
/**
* Stable identity for one provider/model pair.
* @param route - Exact provider/model route.
* @returns Opaque key for equality checks.
*/
function modelRouteKey(route) {
	return `${route.provider}\0${route.model}`;
}
/**
* Reject malformed or duplicate route policy entries at a durable or configuration boundary.
* @param routes - Candidate exact routes to validate.
* @returns an assertion that the candidate is a validated exact-route array.
*/
function assertAllowedModelRoutes(routes) {
	if (!Array.isArray(routes)) throw new Error("subagent model selection requires an array of routes");
	const seen = /* @__PURE__ */ new Set();
	const candidates = routes;
	for (const candidate of candidates) {
		if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate) || !("provider" in candidate) || typeof candidate.provider !== "string" || !("model" in candidate) || typeof candidate.model !== "string" || candidate.provider.length === 0 || candidate.model.length === 0) throw new Error("subagent model selection requires non-empty provider and model ids");
		const route = {
			provider: candidate.provider,
			model: candidate.model
		};
		const key = modelRouteKey(route);
		if (seen.has(key)) throw new Error(`subagent model selection repeats route "${route.provider}/${route.model}"`);
		seen.add(key);
	}
}
/**
* Whether a call explicitly selects any child LLM value.
* @param request - Model-facing route fields from the tool call.
* @returns Whether at least one route or effort field is present.
*/
function hasDelegationModelRequest(request) {
	return request.provider !== void 0 || request.model !== void 0 || request.reasoning_effort !== void 0;
}
/** Reject an empty model-facing route value at the tool JSON boundary. */
function assertNonEmpty(value, field) {
	if (value !== void 0 && value.length === 0) throw new Error(`child LLM \`${field}\` must be non-empty`);
}
/**
* Merge model-supplied selection fields over configured child defaults.
* Provider and model form one route and must be supplied together. Changing
* that route without an effort clears the configured route-owned effort.
* @param parentOptions - Current parent values that supply missing child values.
* @param configured - Tool-instance child defaults.
* @param request - Model-facing route override.
* @param enabled - Whether this tool instance permits model-facing selection.
* @returns Child Agent options, preserving omission when no layer contributes one.
*/
function requestedAgentOptions(parentOptions, configured, request, enabled) {
	if (!hasDelegationModelRequest(request)) return configured;
	if (!enabled) throw new Error("child model selection is disabled for this tool instance");
	assertNonEmpty(request.provider, "provider");
	assertNonEmpty(request.model, "model");
	assertNonEmpty(request.reasoning_effort, "reasoning_effort");
	if (request.provider === void 0 !== (request.model === void 0)) throw new Error("child LLM `provider` and `model` must be supplied together");
	const baselineProvider = configured?.provider ?? parentOptions.provider;
	const baselineModel = configured?.model ?? parentOptions.model;
	const routeChanged = request.provider !== void 0 && (request.provider !== baselineProvider || request.model !== baselineModel);
	const { reasoningEffort: _configuredReasoningEffort, ...configuredWithoutReasoning } = configured ?? {};
	return {
		...routeChanged && request.reasoning_effort === void 0 ? configuredWithoutReasoning : configured,
		...request.provider === void 0 ? {} : {
			provider: request.provider,
			model: request.model
		},
		...request.reasoning_effort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(request.reasoning_effort) }
	};
}
/**
* Enforce a settings-owned route list at the operation that creates the child.
* Pure inheritance remains outside this policy because no model-facing choice
* occurred; any explicit route or effort field must resolve to an allowed route.
* @param policy - Selection authority captured for this Session.
* @param parentOptions - Current parent values that supply missing child values.
* @param requested - Effective child options after request/config merging.
* @param request - Model-facing selection fields from the tool call.
*/
function assertAllowedModelSelection(policy, parentOptions, requested, request) {
	if (policy === void 0 || !hasDelegationModelRequest(request)) return;
	const provider = requested?.provider ?? parentOptions.provider;
	const model = requested?.model ?? parentOptions.model;
	if (provider === void 0 || model === void 0) throw new Error("cannot select child LLM values without an effective provider and model");
	if (policy.routes.some((route) => route.provider === provider && route.model === model)) return;
	throw new Error(`child LLM route "${provider}/${model}" is not allowed for this Session`);
}
/**
* Whether configured Agent options require route validation before delegation.
* @param options - Tool-instance child defaults.
* @returns Whether configured provider, model, or effort values must be resolved.
*/
function hasConfiguredLlmSelection(options) {
	return options?.provider !== void 0 || options?.model !== void 0 || options?.reasoningEffort !== void 0;
}
/**
* Resolve an effective child route through its live adapter before the child is
* created. The LLM runtime owns provider lookup, exact-model metadata, effort
* validation, and adapter defaults.
* @param llm - Live LLM runtime.
* @param parentOptions - Current parent values whose compatible fields the child inherits.
* @param requested - Per-child options after request/config merging.
* @param signal - Tool-call cancellation signal.
* @param inheritParentReasoningEffort - Whether an omitted effort may inherit from the parent route.
*/
async function preflightChildLlmRoute(llm, parentOptions, requested, signal, inheritParentReasoningEffort = true) {
	const provider = requested?.provider ?? parentOptions.provider;
	const model = requested?.model ?? parentOptions.model;
	if (provider === void 0 || model === void 0) throw new Error("cannot select child LLM values without an effective provider and model");
	const routeChanged = provider !== parentOptions.provider || model !== parentOptions.model;
	const reasoningEffort = requested?.reasoningEffort ?? (inheritParentReasoningEffort && !routeChanged ? parentOptions.reasoningEffort : void 0);
	await llm.resolveCallConfig({
		provider,
		model,
		...reasoningEffort === void 0 ? {} : { reasoningEffort }
	}, signal);
}
//#endregion
//#region lib/types/list-models.js
/** Model-facing discovery of LLM routes available to child Agents. */
/** Resolve one registered provider with a model-correctable diagnostic. */
function registeredProvider(llm, policy, providerId) {
	const providers = llm.listProviders();
	const provider = providers.find((candidate) => candidate.id === providerId);
	if (provider !== void 0) return provider;
	const available = providers.filter((candidate) => policy.routes.some((route) => route.provider === candidate.id)).map((candidate) => candidate.id).join(", ") || "(none)";
	throw new Error(`LLM provider "${providerId}" is not registered; available providers: ${available}`);
}
/** Render one advertised or resolved model. */
function modelLine(provider, model) {
	return `${provider}/${model.id} — ${model.name}${model.description === void 0 ? "" : `: ${model.description}`}`;
}
/** Read the requested provider, advertised models, or exact-model efforts. */
async function listSubagentModels(ctx, policy, request, signal) {
	const llm = ctx.get("llm");
	if (llm === void 0) throw new Error("cannot discover child LLM routes because the `llm` service is unavailable");
	if (request.model !== void 0 && request.provider === void 0) throw new Error("`model` requires `provider`");
	if (request.provider === void 0) {
		const providers = llm.listProviders().filter((provider) => policy.routes.some((route) => route.provider === provider.id));
		return providers.length === 0 ? "(no LLM providers)" : providers.map((provider) => `${provider.id} — ${provider.name}`).join("\n");
	}
	if (request.provider.length === 0) throw new Error("`provider` must be non-empty");
	const allowedRoutes = policy.routes.filter((route) => route.provider === request.provider);
	if (allowedRoutes.length === 0) throw new Error(`LLM provider "${request.provider}" is not allowed for this Session`);
	const provider = registeredProvider(llm, policy, request.provider);
	if (request.model === void 0) {
		const models = (await llm.listModels(provider.id)).filter((model) => allowedRoutes.some((route) => route.model === model.id));
		return models.length === 0 ? `(no advertised models for ${provider.id})` : models.map((model) => modelLine(provider.id, model)).join("\n");
	}
	if (request.model.length === 0) throw new Error("`model` must be non-empty");
	if (!allowedRoutes.some((route) => route.model === request.model)) throw new Error(`child LLM route "${provider.id}/${request.model}" is not allowed for this Session`);
	const model = await llm.resolveModelInfo(provider.id, request.model, signal);
	const efforts = model.reasoning?.efforts.map((effort) => `${effort.id}${model.reasoning?.defaultEffort === effort.id ? " (default)" : ""} — ${effort.name}` + (effort.description === void 0 ? "" : `: ${effort.description}`)).join("\n") || "(no advertised reasoning efforts)";
	return `${modelLine(provider.id, model)}\nReasoning efforts:\n${efforts}`;
}
/**
* Register `list_subagent_models` for one owning delegation-tool instance.
* @param ctx - Context whose tool registry owns the fixed discovery definition.
* @param policy - Route policy captured for this Session.
*/
function registerListSubagentModels(ctx, policy) {
	ctx.tools.register(defineTool({
		name: "list_subagent_models",
		description: "Discover LLM routes for subagents without changing the current Agent. Call with no arguments to list registered providers, with `provider` to list its advertised models, or with `provider` and `model` to inspect that exact model and its reasoning efforts. Catalog membership is advisory: an adapter may accept an unlisted model id. Use the returned ids with a delegation tool's `provider`, `model`, and `reasoning_effort` fields.",
		parameters: {
			provider: {
				type: "string",
				description: "Registered LLM provider id. Omit to list providers."
			},
			model: {
				type: "string",
				description: "Exact model id to inspect. Requires provider; omit to list that provider's advertised models."
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, result) => [{
				type: "text",
				text: result
			}]
		},
		execute(args, exec) {
			return listSubagentModels(ctx, policy, args, exec.signal);
		}
	}));
}
/** Host-only projection of the durable model-selection policy. */
const subagentModelSelectionProjectionDefinition = {
	key: "subagentModelSelectionPolicy",
	stateVersion: 1,
	stateSchema: z$1.array(z$1.object({
		provider: z$1.string().min(1),
		model: z$1.string().min(1)
	}).strict()).min(1).nullable(),
	init: () => null,
	apply: (policy, event) => {
		if (policy !== null || event.type !== "subagent/model-selection-policy") return policy;
		const { allowedModels } = event.data;
		assertAllowedModelRoutes(allowedModels);
		if (allowedModels.length === 0) throw new Error("subagent/model-selection-policy requires at least one route");
		return allowedModels;
	}
};
/**
* Read the exact route list captured for a model-selectable definition.
* @param projections - registry that owns the policy projection.
* @param session - session whose durable decision is read.
* @returns a detached route list, or undefined for the fixed-route definition.
*/
function subagentModelSelectionPolicy(projections, session) {
	return projections.stateOf(session, "subagentModelSelectionPolicy")?.map((route) => ({ ...route }));
}
/**
* Append the route policy once, before its definition can reach a model request.
* @param projections - registry that owns the policy projection.
* @param session - session receiving the model-selectable definition.
* @param allowedModels - exact routes the definition may select explicitly.
*/
function recordSubagentModelSelection(projections, session, allowedModels) {
	if (subagentModelSelectionPolicy(projections, session) !== void 0) return;
	session.append("subagent/model-selection-policy", { allowedModels: allowedModels.map((route) => ({ ...route })) });
}
//#endregion
//#region lib/types/index.js
/**
* Model-facing delegation through one configured `ctx.subagents` provider.
* Provider lifecycle controls tool registration and context-sensitive schema
* wording. Foreground calls always dispose the run after collection.
* Background policy is selected by this plugin's configuration: one-shot
* calls own a plain Task, while continuable calls use
* `ctx.subagents.startContinuable()`.
* @module @deepseek-ai/dsh-tool-subagent
*/
const name = "tool-subagent";
const inject = [
	"tools",
	"subagents",
	"systemPrompt",
	"sessionProjections"
];
const Config = z.object({
	provider: z.string().required(),
	toolName: z.string().default("subagent"),
	modelSelectionSettings: z.boolean().default(false),
	enableRunInBackground: z.boolean().default(true),
	backgroundMode: z.union(["one-shot", "continuable"]).default("one-shot"),
	agentOptions: z.object({
		provider: z.string(),
		model: z.string(),
		reasoningEffort: z.string().min(1),
		maxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER)
	}).default(void 0),
	persona: z.string(),
	toolFilter: z.object({
		allow: z.array(z.string()).default(void 0),
		deny: z.array(z.string()).default(void 0)
	}).default(void 0),
	maxDepth: z.union([z.natural().max(Number.MAX_SAFE_INTEGER), z.const("provider-managed")]).default(3)
});
/** Render text blocks from the canonical JSON block array without trusting arbitrary values. */
function outputValueText(values) {
	return values.filter((value) => typeof value === "object" && value !== null && !Array.isArray(value) && value.type === "text" && typeof value.text === "string").map((value) => value.text).join("");
}
/** Settle pending startup without rejecting the task producer contract. */
async function settleStart(start, signal) {
	try {
		return await settleRun(await start);
	} catch (error) {
		return signal.aborted && !(error instanceof AggregateError) ? { status: "killed" } : {
			status: "failed",
			detail: String(error)
		};
	}
}
/** A non-`completed` stop reason means the child did not finish cleanly. */
function stopReasonError(result) {
	switch (result.stopReason) {
		case "completed": return;
		case "aborted": return "subagent run was cancelled";
		case "error": return "subagent run failed";
		case "max-tokens": return "subagent run hit its token limit before finishing";
		case "refusal": return "subagent declined the task";
		default: return `subagent run ended abnormally (${String(result.stopReason)})`;
	}
}
/**
* Append provider-authored failure detail and the child's preserved partial
* answer to a stop-reason error, keeping diagnostic text separate from the
* child's assistant output.
* @param error - the stop-reason headline.
* @param result - the child's terminal result.
* @returns the headline, diagnostic, and partial text that are present.
*/
function withDiagnosticAndPartialText(error, result) {
	const diagnostic = result.diagnostic === void 0 ? "" : `\nDiagnostic: ${result.diagnostic}`;
	const text = result.output.filter((block) => block.type === "text").map((block) => block.text).join("");
	return `${error}${diagnostic}${text.length === 0 ? "" : `\nPartial output before the run ended:\n${text}`}`;
}
/**
* Collect and release one foreground run without letting disposal replace an
* independent result failure.
*/
async function settleForegroundRun(run) {
	const [execution] = await Promise.allSettled([run.result.then((result) => {
		const error = stopReasonError(result);
		if (error !== void 0) throw new Error(withDiagnosticAndPartialText(error, result));
		return {
			kind: "foreground",
			runId: run.id,
			output: result.output
		};
	})]);
	const [disposal] = await Promise.allSettled([Promise.resolve().then(() => run.dispose())]);
	if (execution.status === "rejected") {
		if (disposal.status === "rejected") throw new AggregateError([execution.reason, disposal.reason], `subagent run failed: ${String(execution.reason)}; dispose failed: ${String(disposal.reason)}`);
		throw execution.reason;
	}
	if (disposal.status === "rejected") throw disposal.reason;
	return execution.value;
}
/**
* Model-facing wording from the provider's conversation-history descriptor
* ({@link SubagentProvider.inheritsParentContext}).
* A fresh child needs a standalone prompt; a forked child already sees the
* conversation's completed turns — telling the model to restate everything
* (or, worse, that the child "does not see this conversation") would be false
* for a fork.
* @param inheritsConversation - whether the child's conversation is seeded
*   with the parent's completed turns; this says nothing about tool, service,
*   scope, or authority inheritance.
* @returns the tool `description` and the `prompt` parameter description.
*/
function providerWording(inheritsConversation) {
	if (inheritsConversation) return {
		description: "Delegate a task to a subagent that inherits this conversation: a child agent seeded with all completed turns so far (it does not see the current in-flight turn). Use this when the subtask builds on this conversation's context — a follow-up analysis, a review, a continuation — without consuming this conversation's context for the work itself. You receive its result, not its intermediate steps.",
		promptDescription: "The task for the subagent. It already sees this conversation's completed turns, so build on them freely and state only what is new."
	};
	return {
		description: "Delegate a self-contained task to a subagent (a separate agent that works in its own context) to offload focused, independent work — research, a scoped implementation, an analysis — so it does not consume this conversation's context. The subagent returns its result, not its intermediate steps. Give it a complete, standalone prompt: it does not see this conversation.",
		promptDescription: "The complete, self-contained task for the subagent. It does not share this conversation's context, so include everything it needs."
	};
}
/** Resolve the model's optional scheduling request into one execution route. */
function resolveDelegationRun(request, options) {
	if (!options.backgroundEnabled) {
		if (request.run_in_background === true) throw new Error("run_in_background is disabled for this tool instance (enableRunInBackground: false)");
		return { runInBackground: false };
	}
	return { runInBackground: request.run_in_background ?? options.continuable };
}
/**
* Install one delegation-tool composition.
* @param ctx - Context that owns the registrations.
* @param config - delegation-tool configuration.
* @param session - unpublished Session supplied by a direct Agent setup; omit for a standing composition.
*/
function apply(ctx, config, session) {
	if (config.maxDepth !== "provider-managed") assertSubagentMaxDepth(config.maxDepth);
	if (config.toolFilter !== void 0 && config.toolFilter.allow === void 0 && config.toolFilter.deny === void 0) throw new Error("tool-subagent: `toolFilter` is configured but names neither `allow` nor `deny` — remove the key or fill the filter");
	const backgroundEnabled = config.enableRunInBackground !== false;
	const continuable = (config.backgroundMode ?? "one-shot") === "continuable";
	const toolName = config.toolName ?? "subagent";
	const modelSelectionCapable = config.modelSelectionSettings === true;
	ctx.sessionProjections.register(subagentModelSelectionProjectionDefinition);
	const assertSubagentProviderConfiguration = (subagentProvider) => {
		if (typeof config.maxDepth === "number" && !subagentProvider.capabilities.depthLimit) throw new Error(`tool-subagent: provider "${subagentProvider.name}" cannot enforce maxDepth (no depthLimit capability) — set maxDepth: 'provider-managed' to leave the recursion budget to the provider`);
		if (config.agentOptions !== void 0 && !subagentProvider.capabilities.agentOptions) throw new Error(`tool-subagent: provider "${subagentProvider.name}" does not support child agentOptions`);
		if (modelSelectionCapable && !subagentProvider.capabilities.agentOptions) throw new Error(`tool-subagent: provider "${subagentProvider.name}" does not support child model selection`);
		if (continuable && subagentProvider.prepareContinuable === void 0) throw new Error(`tool-subagent: provider "${subagentProvider.name}" does not support \`backgroundMode: continuable\``);
	};
	ctx.on("subagent/provider-added", (subagentProvider) => {
		if (subagentProvider.name === config.provider) assertSubagentProviderConfiguration(subagentProvider);
	});
	const initialProvider = ctx.subagents.getProvider(config.provider);
	if (initialProvider !== void 0) assertSubagentProviderConfiguration(initialProvider);
	const install = (runtimeCtx, modelSelectionPolicy) => {
		const modelSelectionEnabled = modelSelectionPolicy !== void 0;
		if (modelSelectionPolicy !== void 0) registerListSubagentModels(runtimeCtx, modelSelectionPolicy);
		let mounted;
		const mount = (subagentProvider) => {
			assertSubagentProviderConfiguration(subagentProvider);
			const wording = providerWording(subagentProvider.inheritsParentContext);
			const providerRouteDefaults = subagentProvider.agentRouteDefaults;
			const choiceDescription = !modelSelectionEnabled ? "" : (providerRouteDefaults !== void 0 ? " Child LLM selection is optional. Omit `provider`, `model`, and `reasoning_effort` to use configured child defaults and this provider's route defaults. Supply `provider` and `model` together after using `list_subagent_models` to inspect advertised routes and efforts. Changing the effective route without naming an effort uses the selected model's default effort." : " Child LLM selection is optional. Omit `provider`, `model`, and `reasoning_effort` to use configured child defaults and inherit compatible missing values from the parent Agent. Supply `provider` and `model` together after using `list_subagent_models` to inspect advertised routes and efforts. Changing the effective route without naming an effort uses the selected model's default effort.") + (subagentProvider.inheritsParentContext ? " Changing the route can prevent provider-side reuse of the inherited conversation prefix." : "");
			mounted = {
				subagentProvider,
				disposeTool: runtimeCtx.tools.register(defineTool({
					name: toolName,
					description: wording.description + (backgroundEnabled ? continuable ? " This tool runs in the background by default, immediately returns a durable subagent id, and keeps the child conversation available for later turns. When that run settles, the runtime sends the parent a notice containing its outcome and any final assistant message; `send_message` steers the child's nearest step while it is running and starts a turn while it is idle. Set `run_in_background: false` only when your next action depends on receiving the result." : " This call waits for the result by default. Set `run_in_background: true` to return a job id; collect with `job_output` and stop with `job_kill`." : " This call waits for the subagent and returns its result.") + choiceDescription,
					parameters: {
						description: {
							type: "string",
							required: true,
							description: "A short (3-5 word) description of the delegated task, for display."
						},
						prompt: {
							type: "string",
							required: true,
							description: wording.promptDescription
						},
						...modelSelectionEnabled ? {
							provider: {
								type: "string",
								description: providerRouteDefaults !== void 0 ? "LLM provider route for the child. Supply together with model; omit both to use configured child defaults or this provider's route defaults." : "LLM provider route for the child. Supply together with model; omit both to use configured child defaults or inherit the parent route."
							},
							model: {
								type: "string",
								description: providerRouteDefaults !== void 0 ? "Model id interpreted by provider. Supply together with provider; omit both to use configured child defaults or this provider's route defaults." : "Model id interpreted by provider. Supply together with provider; omit both to use configured child defaults or inherit the parent route."
							},
							reasoning_effort: {
								type: "string",
								description: providerRouteDefaults !== void 0 ? "Adapter-owned reasoning effort for the effective child route. Omit to use a compatible configured effort or the selected model's default." : "Adapter-owned reasoning effort for the effective child route. Omit to inherit a compatible configured/parent effort or use a newly selected model's default."
							}
						} : {},
						...backgroundEnabled ? { run_in_background: {
							type: "boolean",
							description: continuable ? "Whether to run in the background and return a durable subagent id immediately. Defaults to true. Set false to wait for the result when your next action depends on it." : "Whether to run as a background job and return its id. Defaults to false; collect with job_output or stop with job_kill."
						} } : {}
					},
					output: {
						schema: { oneOf: [
							{
								type: "object",
								additionalProperties: false,
								properties: {
									kind: {
										type: "string",
										required: true,
										const: "background"
									},
									jobId: {
										type: "string",
										required: true
									}
								}
							},
							{
								type: "object",
								additionalProperties: false,
								properties: {
									kind: {
										type: "string",
										required: true,
										const: "continuable"
									},
									subagentId: {
										type: "string",
										required: true
									}
								}
							},
							{
								type: "object",
								additionalProperties: false,
								properties: {
									kind: {
										type: "string",
										required: true,
										const: "foreground"
									},
									runId: {
										type: "string",
										required: true
									},
									output: {
										type: "array",
										required: true,
										items: { type: "json" }
									}
								}
							}
						] },
						render: (_args, value) => [{
							type: "text",
							text: value.kind === "background" ? `started background subagent job ${value.jobId}` : value.kind === "continuable" ? `started subagent ${value.subagentId}` : outputValueText(value.output)
						}]
					},
					isConcurrencySafe: () => true,
					async execute(args, exec) {
						const parent = exec.agent;
						if (!parent) throw new Error("subagent tool requires a calling agent (exec.agent was undefined)");
						const modelRequest = args;
						const parentOptions = parentAgentOptionsForDelegation(parent);
						const requiresRoutePreflight = hasDelegationModelRequest(modelRequest) || hasConfiguredLlmSelection(config.agentOptions);
						const requestedChildAgentOptions = requestedAgentOptions(parentOptions, requiresRoutePreflight && providerRouteDefaults !== void 0 ? {
							...providerRouteDefaults,
							...config.agentOptions
						} : config.agentOptions, modelRequest, modelSelectionEnabled);
						assertAllowedModelSelection(modelSelectionPolicy, parentOptions, requestedChildAgentOptions, modelRequest);
						if (requiresRoutePreflight) {
							const llm = runtimeCtx.get("llm");
							if (llm === void 0) throw new Error("cannot resolve the selected child LLM route because the `llm` service is unavailable");
							await preflightChildLlmRoute(llm, parentOptions, requestedChildAgentOptions, exec.signal, providerRouteDefaults === void 0);
							if (runtimeCtx.subagents.getProvider(config.provider) !== subagentProvider) throw new Error(`subagent provider "${config.provider}" changed while resolving the child LLM route; retry the delegation`);
						}
						exec.signal.throwIfAborted();
						const maxDepth = typeof config.maxDepth === "number" ? config.maxDepth : void 0;
						const request = {
							label: args.description,
							prompt: [{
								type: "text",
								text: args.prompt
							}],
							parent,
							...requestedChildAgentOptions !== void 0 ? { agentOptions: requestedChildAgentOptions } : {},
							...config.persona !== void 0 ? { persona: config.persona } : {},
							...config.toolFilter !== void 0 ? { toolFilter: config.toolFilter } : {},
							...maxDepth !== void 0 ? { maxDepth } : {}
						};
						if (resolveDelegationRun(args, {
							backgroundEnabled,
							continuable
						}).runInBackground) {
							if (continuable) return {
								kind: "continuable",
								subagentId: (await runtimeCtx.subagents.startContinuable({
									provider: config.provider,
									label: args.description,
									request,
									signal: exec.signal
								})).childId
							};
							const jobs = runtimeCtx.get("jobs");
							if (jobs === void 0) throw new Error("background jobs unavailable: load @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs");
							return {
								kind: "background",
								jobId: jobs.start({
									kind: "subagent",
									label: args.description,
									owner: parent,
									run: () => {
										const controller = new AbortController();
										return {
											cancel: (reason) => {
												controller.abort(reason ?? "background subagent task killed");
											},
											done: settleStart(runtimeCtx.subagents.start(config.provider, {
												...request,
												signal: controller.signal
											}), controller.signal)
										};
									}
								})
							};
						}
						return settleForegroundRun(await runtimeCtx.subagents.start(config.provider, {
							...request,
							signal: exec.signal
						}));
					}
				}))
			};
		};
		runtimeCtx.on("subagent/provider-added", (subagentProvider) => {
			if (subagentProvider.name === config.provider && mounted === void 0) mount(subagentProvider);
		});
		runtimeCtx.on("subagent/provider-removed", (name) => {
			if (name !== config.provider || mounted === void 0) return;
			mounted.disposeTool();
			mounted = void 0;
		});
		const present = runtimeCtx.subagents.getProvider(config.provider);
		if (present !== void 0) mount(present);
		else runtimeCtx.logger.info(`subagent provider "${config.provider}" not registered yet; the "${config.toolName ?? "subagent"}" tool will register when it appears`);
		if (backgroundEnabled && continuable) runtimeCtx.systemPrompt.section({
			name: `tool:${toolName}`,
			order: runtimeCtx.systemPrompt.getSectionOrder("TOOL_SUBAGENT"),
			text: (context) => mounted === void 0 || runtimeCtx.tools.get(toolName, context.scope) === void 0 ? "" : `Use ${toolName} in the background by default. Start independent delegations together in one assistant message and continue useful work while they run. Set \`run_in_background: false\` only when your next action depends on that subagent's result. When a background run settles, the runtime sends you a notice containing its outcome and any final assistant message.`
		});
	};
	if (config.modelSelectionSettings !== true) {
		install(ctx, void 0);
		return;
	}
	const settings = ctx.get("subagentModelSelection");
	if (settings === void 0) throw new Error("tool-subagent: `modelSelectionSettings` requires @deepseek-ai/dsh-tool-subagent/model-selection-settings in the Host scope");
	const selectForSession = (target) => {
		const freshSession = target.firstLiveSeq === 0 && target.eventAt(SessionSeq(0))?.type !== "session/end-seed";
		let allowedModels = subagentModelSelectionPolicy(ctx.sessionProjections, target);
		if (allowedModels === void 0) {
			const parentId = target.header.origin === "subagent" ? target.header.parentSession : void 0;
			if (parentId !== void 0) {
				const sessions = ctx.get("sessions");
				if (sessions === void 0) throw new Error("tool-subagent: child model-selection inheritance requires the Session registry");
				const parent = sessions.get(parentId);
				allowedModels = parent === void 0 ? void 0 : subagentModelSelectionPolicy(ctx.sessionProjections, parent);
			} else if (freshSession) {
				const current = settings.current();
				allowedModels = current.enabled ? current.allowedModels : void 0;
			}
		}
		if (allowedModels !== void 0) recordSubagentModelSelection(ctx.sessionProjections, target, allowedModels);
		return allowedModels === void 0 ? void 0 : { routes: allowedModels };
	};
	if (session !== void 0) {
		install(ctx, selectForSession(session));
		return;
	}
	const compositionScope = scopeOf(ctx);
	if (compositionScope === void 0) throw new Error("tool-subagent: standing `modelSelectionSettings` requires a scoped preset Context");
	const agents = ctx.get("agents");
	/* v8 ignore next -- shipped preset compositions always include the Agent registry. */
	if (agents === void 0) throw new Error("tool-subagent: standing `modelSelectionSettings` requires the Agent registry");
	const scopedInstalls = /* @__PURE__ */ new WeakMap();
	const installing = /* @__PURE__ */ new WeakSet();
	const belongsToComposition = (candidate) => scopeChainOf(scopeOf(candidate.ctx)).includes(compositionScope);
	const installScoped = (candidate) => {
		if (scopedInstalls.has(candidate) || installing.has(candidate)) return;
		installing.add(candidate);
		let fiber;
		try {
			const policy = selectForSession(candidate.session);
			fiber = candidate.ctx.inject([
				"tools",
				"subagents",
				"systemPrompt"
			], (runtimeCtx) => {
				install(runtimeCtx, policy);
			});
		} finally {
			installing.delete(candidate);
		}
		scopedInstalls.set(candidate, fiber);
	};
	const removeScoped = (candidate) => {
		const fiber = scopedInstalls.get(candidate);
		if (fiber === void 0) return;
		scopedInstalls.delete(candidate);
		/* v8 ignore next 3 -- Cordis Fiber disposal contains registration cleanup failures; this is the final diagnostic sink. */
		fiber.dispose().catch((error) => {
			ctx.logger.warn(`tool-subagent: failed to remove recomposed Agent "${candidate.id}" definitions: ${String(error)}`);
		});
	};
	const reconcileComposedAgents = () => {
		for (const candidate of agents.list()) if (belongsToComposition(candidate)) installScoped(candidate);
		else removeScoped(candidate);
	};
	ctx.on("agent/created", ({ agent: created }) => {
		installScoped(created);
	});
	ctx.on("agent/disposed", ({ agent: disposed }) => {
		removeScoped(disposed);
	});
	ctx.on("tools/change", reconcileComposedAgents);
	reconcileComposedAgents();
}
//#endregion
export { Config, apply, inject, name };
