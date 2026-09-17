import z from "@deepseek-ai/schemastery";
import { CompactionEngine, CompactionId, ManualCompactionError, compactCheckpointSource, toolPairingBalancedAfter, toolPairingBalancedBefore } from "@deepseek-ai/dsh-compaction";
import { BlockAssembler, CONTEXT_WINDOW_EXCEEDED_CODE, LlmError, contentHasImage, createUserMessage, errorChain } from "@deepseek-ai/dsh-llm";
import { assertNever, deepFreeze } from "@deepseek-ai/dsh-util-values";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { SessionSeq } from "@deepseek-ai/dsh-session";
//#region lib/types/config.js
/**
* Load-time validation and routed-model policy resolution for compaction-basic.
*
* @module @deepseek-ai/dsh-compaction-basic/config
*/
/** Default request-pressure fraction for every routed model. */
const DEFAULT_THRESHOLD_RATIO = .8;
/** Default verbatim-tail fraction for every routed model. */
const DEFAULT_RETAIN_RATIO = .16;
/** Fields shared by top-level defaults and exact-target overrides. */
const POLICY_CONFIG_KEYS = [
	"thresholdRatio",
	"retainRatio",
	"retainTokens",
	"summarizationProvider",
	"summarizationModel",
	"maxTokens",
	"compactionRetries",
	"maxOverflowRetries"
];
/** Complete public top-level configuration key set. */
const BASIC_COMPACT_CONFIG_KEYS = new Set([
	...POLICY_CONFIG_KEYS,
	"modelPolicies",
	"auto"
]);
/** Complete exact-target override key set. */
const MODEL_POLICY_KEYS = new Set([
	"provider",
	"model",
	...POLICY_CONFIG_KEYS
]);
/** Target-specific pressure configuration failure eligible for warning suppression. */
var TargetPressureConfigError = class extends Error {
	targetKey;
	/**
	* @param targetKey - exact provider/model route used as the warning key.
	* @param message - actionable configuration failure detail.
	*/
	constructor(targetKey, message) {
		super(message);
		this.targetKey = targetKey;
	}
};
/**
* Resolve and validate service defaults plus exact-target partial overrides.
* @param config - untrusted plugin configuration after Loader normalization.
* @returns detached immutable defaults and validated exact-target overrides.
*/
function resolveConfig(config = {}) {
	validateKeys(config, BASIC_COMPACT_CONFIG_KEYS, "BasicCompactionConfig");
	validatePolicy(config, "BasicCompactionConfig");
	if (config.auto !== void 0 && typeof config.auto !== "boolean") throw new Error("BasicCompactionConfig: auto must be a boolean");
	const thresholdRatio = config.thresholdRatio ?? DEFAULT_THRESHOLD_RATIO;
	const retention = resolveRetention(config, { retainRatio: DEFAULT_RETAIN_RATIO });
	validateRatioRetention(thresholdRatio, retention, "BasicCompactionConfig");
	const modelPolicies = resolveModelPolicies(config.modelPolicies);
	for (const [index, policy] of modelPolicies.entries()) validateRatioRetention(policy.thresholdRatio ?? thresholdRatio, resolveRetention(policy, retention), `BasicCompactionConfig: modelPolicies[${index}]`);
	return deepFreeze({
		thresholdRatio,
		...retention,
		summarizationProvider: config.summarizationProvider ?? "",
		summarizationModel: config.summarizationModel ?? "",
		maxTokens: config.maxTokens ?? 8192,
		compactionRetries: config.compactionRetries ?? 1,
		maxOverflowRetries: config.maxOverflowRetries ?? 1,
		modelPolicies,
		auto: config.auto ?? true
	});
}
/**
* Merge the exact provider/model override over the validated default policy.
* @param config - validated service defaults and override table.
* @param target - exact durable provider/model route to match.
* @returns detached immutable policy before model-capacity scaling.
*/
function resolveTargetPolicy(config, target) {
	const override = config.modelPolicies.find((policy) => policy.provider === target.provider && policy.model === target.model);
	const inheritedRetention = config.retainTokens === void 0 ? { retainRatio: config.retainRatio } : { retainTokens: config.retainTokens };
	return deepFreeze({
		target: {
			provider: target.provider,
			model: target.model
		},
		thresholdRatio: override?.thresholdRatio ?? config.thresholdRatio,
		...resolveRetention(override ?? {}, inheritedRetention),
		summarizationProvider: override?.summarizationProvider ?? config.summarizationProvider,
		summarizationModel: override?.summarizationModel ?? config.summarizationModel,
		maxTokens: override?.maxTokens ?? config.maxTokens,
		compactionRetries: override?.compactionRetries ?? config.compactionRetries,
		maxOverflowRetries: override?.maxOverflowRetries ?? config.maxOverflowRetries
	});
}
/**
* Scale one routed policy into concrete token budgets for its model capacity.
* @param policy - merged policy for the exact routed target.
* @param contextWindow - positive adapter-owned capacity for that target.
* @returns detached immutable pressure and retention budgets.
*/
function resolveCompactSpec(policy, contextWindow) {
	const targetKey = `${policy.target.provider}/${policy.target.model}`;
	if (!Number.isInteger(contextWindow) || contextWindow <= 0) throw new TargetPressureConfigError(targetKey, `BasicCompactionConfig: contextWindow (${contextWindow}) must be a positive integer`);
	const thresholdTokens = Math.floor(contextWindow * policy.thresholdRatio);
	const retainTokens = policy.retainTokens === void 0 ? Math.floor(contextWindow * policy.retainRatio) : policy.retainTokens;
	if (retainTokens >= thresholdTokens) throw new TargetPressureConfigError(targetKey, `BasicCompactionConfig: ${policy.target.provider}/${policy.target.model} retainTokens (${retainTokens}) must be less than threshold tokens ${thresholdTokens}`);
	return deepFreeze({
		target: { ...policy.target },
		contextWindow,
		thresholdRatio: policy.thresholdRatio,
		thresholdTokens,
		retainTokens,
		summarizationProvider: policy.summarizationProvider,
		summarizationModel: policy.summarizationModel,
		maxTokens: policy.maxTokens,
		compactionRetries: policy.compactionRetries,
		maxOverflowRetries: policy.maxOverflowRetries
	});
}
/** Choose an explicit retention form or inherit the already-resolved fallback. */
function resolveRetention(config, fallback) {
	if (config.retainTokens !== void 0) return { retainTokens: config.retainTokens };
	if (config.retainRatio !== void 0) return { retainRatio: config.retainRatio };
	return fallback;
}
/** Reject a capacity-independent retention conflict at plugin load. */
function validateRatioRetention(thresholdRatio, retention, name) {
	if (retention.retainRatio !== void 0 && retention.retainRatio >= thresholdRatio) throw new Error(`${name}: retainRatio (${retention.retainRatio}) must be less than the resolved thresholdRatio (${thresholdRatio})`);
}
/** Validate, detach, and reject duplicate exact-target policies. */
function resolveModelPolicies(configured) {
	if (configured === void 0) return [];
	if (!Array.isArray(configured)) throw new Error("BasicCompactionConfig: modelPolicies must be an array");
	const seen = /* @__PURE__ */ new Set();
	return configured.map((source, index) => {
		assertModelPolicy(source, `BasicCompactionConfig: modelPolicies[${index}]`);
		const key = `${source.provider}\u0000${source.model}`;
		if (seen.has(key)) throw new Error(`BasicCompactionConfig: duplicate model policy for ${source.provider}/${source.model}`);
		seen.add(key);
		return { ...source };
	});
}
/** Validate one untrusted exact-target override and narrow its public type. */
function assertModelPolicy(source, name) {
	if (!isUnknownRecord(source)) throw new Error(`${name} must be an object`);
	validateKeys(source, MODEL_POLICY_KEYS, name);
	assertNonEmptyString(`${name}.provider`, source.provider);
	assertNonEmptyString(`${name}.model`, source.model);
	validatePolicy(source, name);
}
/** Validate the fields common to defaults and exact-target partial overrides. */
function validatePolicy(config, name) {
	const thresholdRatio = config.thresholdRatio;
	const retainRatio = config.retainRatio;
	const retainTokens = config.retainTokens;
	const maxTokens = config.maxTokens;
	const compactionRetries = config.compactionRetries;
	const maxOverflowRetries = config.maxOverflowRetries;
	if (thresholdRatio !== void 0) assertRatio(`${name}.thresholdRatio`, thresholdRatio);
	if (retainRatio !== void 0) assertRatio(`${name}.retainRatio`, retainRatio);
	if (retainTokens !== void 0) assertNonNegativeInteger(`${name}.retainTokens`, retainTokens);
	if (retainRatio !== void 0 && retainTokens !== void 0) throw new Error(`${name}: retainRatio and retainTokens are mutually exclusive`);
	if (maxTokens !== void 0) assertPositiveInteger(`${name}.maxTokens`, maxTokens);
	if (compactionRetries !== void 0) assertNonNegativeInteger(`${name}.compactionRetries`, compactionRetries);
	if (maxOverflowRetries !== void 0) assertNonNegativeInteger(`${name}.maxOverflowRetries`, maxOverflowRetries);
	validateSummarizationPair(config, name);
}
/** Require one scope to omit, clear, or replace the summarization target as a pair. */
function validateSummarizationPair(config, name) {
	const provider = config.summarizationProvider;
	const model = config.summarizationModel;
	if (provider !== void 0 && typeof provider !== "string") throw new Error(`${name}.summarizationProvider must be a string`);
	if (model !== void 0 && typeof model !== "string") throw new Error(`${name}.summarizationModel must be a string`);
	if (provider === void 0 && model === void 0) return;
	if (provider === void 0 || model === void 0 || provider.length === 0 !== (model.length === 0)) throw new Error(`${name}: summarizationProvider and summarizationModel must be set together as an empty or non-empty pair`);
}
/** Reject stale or misspelled keys before defaults can hide them. */
function validateKeys(config, keys, name) {
	for (const key of Object.keys(config)) if (!keys.has(key)) throw new Error(`${name}: unknown key "${key}"`);
}
function isUnknownRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function assertNonEmptyString(name, value) {
	if (typeof value !== "string" || value.length === 0) throw new Error(`${name} must be a non-empty string`);
}
function assertPositiveInteger(name, value) {
	if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new Error(`${name} (${String(value)}) must be a positive integer`);
}
function assertNonNegativeInteger(name, value) {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error(`${name} (${String(value)}) must be a non-negative integer`);
}
function assertRatio(name, value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1) throw new Error(`${name} (${String(value)}) must be a number in (0, 1]`);
}
//#endregion
//#region lib/types/summarizer.js
/**
* Default one-shot summarization and durable checkpoint framing.
*
* @module @deepseek-ai/dsh-compaction-basic/summarizer
*/
/** Tags wrapping the structured summary inside the landed checkpoint node. */
const SUMMARY_OPEN_TAG = "<compacted-summary>";
const SUMMARY_CLOSE_TAG = "</compacted-summary>";
/**
* The summarization directive, delivered as the FINAL user message after the
* replayed conversation rather than as a distinct summarizer system prompt.
* Keeping the conversation's own system prompt, tools, and message prefix in
* front of it makes the auxiliary call a genuine prefix of the last routed
* request, so the provider's KV cache is reused instead of invalidated.
*/
const COMPACTION_INSTRUCTION = [
	"You are now acting as a compaction engine for this AI coding assistant. Condense the conversation ABOVE into a structured checkpoint that lets another model resume the work with no loss of essential context.",
	"",
	"Output EXACTLY the Markdown structure below: keep every section, in order. Use terse bullets, not prose paragraphs. Write \"(none)\" for an empty section — never drop a section.",
	"",
	"## Primary Request and Intent",
	"- [the user's original and evolving goals; quote verbatim where the exact wording matters]",
	"",
	"## Key Technical Concepts",
	"- [technologies, frameworks, patterns, and conventions in play]",
	"",
	"## Files and Code",
	"- [exact path: why it matters, key changes or snippets]",
	"",
	"## Errors and Fixes",
	"- [error: how it was resolved, plus any related user feedback]",
	"",
	"## Pending Jobs",
	"- [explicitly requested work not yet completed]",
	"",
	"## Current Work",
	"- [precisely what was in progress at this checkpoint]",
	"",
	"## Next Step",
	"- [the single next action, directly in line with the most recent request, or \"(none)\"]",
	"",
	"## Critical Context",
	"- [decisions and their rationale, constraints, user preferences, open questions, data needed to continue]",
	"",
	"Rules:",
	"- Write concise English engineering prose. Preserve exact file paths, commands, error strings, identifiers, numeric values, function signatures, and syntax fragments.",
	"- Capture user feedback and explicit instructions faithfully, especially corrections.",
	"- Do NOT mention this summarization request or that the context was compacted.",
	"- Output only the checkpoint text: do not call any tool or take any other action.",
	`- If the conversation already contains a ${SUMMARY_OPEN_TAG} block, it is a PRIOR checkpoint. Do not copy it forward verbatim: preserve still-true facts, drop stale ones, and merge newer information into a single consolidated summary under the same structure.`
].join("\n");
/** Framing that makes the replacement user message established context. */
const CHECKPOINT_PREAMBLE = "This is an automatically generated checkpoint condensing an earlier span of the conversation to free up context. Treat the captured context as established background and build on it without restating it. Continue the task directly from the messages that follow, without acknowledging this checkpoint.";
/**
* Run the default cache-reusing `ctx.llm.stream()` summarization call: replay
* the conversation prefix, then append the compaction instruction as the final
* user message so the provider's warm prefix cache is reused.
* @param ctx - context providing the LLM service.
* @param config - resolved backend configuration.
* @param input - replayed conversation prefix (system, tools, and leading messages) to condense.
* @param agent - supplies routed-model history, fallback model, and session id.
* @param signal - optional cancellation forwarded to the adapter.
* @returns safe text-only summary blocks and the exact call envelope and output.
*/
async function summarizeWithLlm(ctx, config, input, agent, signal) {
	const latest = agent.session.requestHeader()?.config;
	const configured = config.summarizationProvider.length === 0 ? void 0 : {
		provider: config.summarizationProvider,
		model: config.summarizationModel
	};
	const agentTarget = agent.options.provider !== void 0 && agent.options.provider.length > 0 && agent.options.model !== void 0 && agent.options.model.length > 0 ? {
		provider: agent.options.provider,
		model: agent.options.model
	} : void 0;
	const target = configured ?? latest ?? agentTarget;
	if (target === void 0) throw new Error("no provider/model available for summarization: set both BasicCompactionConfig summarization fields, route one request, or set both AgentOptions fields");
	const assembler = new BlockAssembler();
	const messages = [...input.messages, createUserMessage({
		content: [{
			type: "text",
			text: COMPACTION_INSTRUCTION
		}],
		source: {
			kind: "plugin",
			plugin: "dsh-compaction-basic"
		}
	})];
	const options = {
		provider: target.provider,
		model: target.model,
		messages,
		...input.tools === void 0 ? {} : { tools: [...input.tools] },
		maxTokens: config.maxTokens,
		sessionId: agent.session.id,
		purpose: "compaction",
		...signal === void 0 ? {} : { signal }
	};
	for await (const chunk of ctx.llm.stream(options)) assembler.push(chunk);
	const error = finishError(assembler.finish);
	if (error !== void 0) throw error;
	const rawOutput = assembler.blocks();
	const summary = summaryText(rawOutput);
	if (!summary.some((block) => block.text.trim().length > 0)) throw new Error("summarization produced no text summary content");
	return {
		summary,
		rawOutput,
		llmStreamCall: true,
		provider: options.provider,
		model: options.model,
		maxTokens: config.maxTokens,
		...assembler.usage === void 0 ? {} : { usage: assembler.usage }
	};
}
/**
* Wrap raw summary blocks in the durable checkpoint framing.
* @param summary - safe text-only model output.
* @returns content for the synthesized replacement user message.
*/
function frameSummary(summary) {
	return [
		{
			type: "text",
			text: `${CHECKPOINT_PREAMBLE}\n\n${SUMMARY_OPEN_TAG}`
		},
		...summary,
		{
			type: "text",
			text: SUMMARY_CLOSE_TAG
		}
	];
}
/** Map a terminal summarization finish to its fail-closed error. */
function finishError(finish) {
	switch (finish.kind) {
		case "error":
		case "aborted": {
			const error = new Error(finish.failure.message);
			error.code = finish.failure.code;
			return error;
		}
		case "max-tokens": {
			const error = /* @__PURE__ */ new Error("summarization truncated at the token cap (incomplete checkpoint)");
			error.code = "MAX_TOKENS";
			return error;
		}
		default: return;
	}
}
/** Reject visual output and keep only text before synthesizing a user message. */
function summaryText(blocks) {
	if (contentHasImage(blocks)) throw new LlmError("compaction summary cannot contain image output", "UNSUPPORTED_CONTENT");
	return blocks.filter((block) => block.type === "text");
}
//#endregion
//#region lib/types/region.js
/**
* Surface retention selection and the shared log-recorded compaction
* transaction for automatic open-turn and manual idle-session compaction.
*
* @module @deepseek-ai/dsh-compaction-basic/region
*/
/**
* Rejects a summary whose replacement boundaries are no longer the ones it was
* built from, distinguished from summarizer and shrink failures so a manual
* caller can report the two causes differently.
*/
var SurfaceChangedError = class extends Error {};
/**
* The `system/message` holding surface node 0, or `undefined` when another
* message-producing event starts the surface.
* @param session - session supplying the log behind the current surface.
* @param headSeq - seq at surface node 0 of a non-empty surface.
* @returns the system head event, or `undefined` without one.
*/
function systemHead(session, headSeq) {
	const head = session.eventAt(headSeq);
	return head.type === "system/message" ? head : void 0;
}
/**
* Resolve the next range starting at the first non-system surface node while
* retaining a priced recent tail and never splitting an assistant
* tool-call/result pair. A `system/message` at surface node 0 is never inside
* the range; without one the range starts at node 0.
* @param session - session supplying authoritative current surface positions.
* @param measurement - unified pressure and surface measurement from the conversation meter.
* @param retainTokens - minimum recent tail budget retained verbatim.
* @returns the inclusive positional seq range to compact, or `null`.
*/
function selectCompactableRange(session, measurement, retainTokens) {
	const pricedNodes = measurement.nodes;
	if (pricedNodes.length === 0) return null;
	const surfaceNodes = session.surface.nodes;
	if (surfaceNodes.length !== pricedNodes.length || surfaceNodes.some((seq, index) => seq !== pricedNodes[index]?.seq)) throw new Error("compaction: token-meter surface does not match the current session surface");
	const firstIdx = systemHead(session, surfaceNodes[0]) === void 0 ? 0 : 1;
	let accumulated = 0;
	let keepFromIdx = pricedNodes.length;
	for (let index = pricedNodes.length - 1; index >= 0; index -= 1) {
		accumulated += pricedNodes[index].tokens;
		keepFromIdx = index;
		if (accumulated >= retainTokens) break;
	}
	if (keepFromIdx <= firstIdx) return null;
	while (keepFromIdx > firstIdx) {
		if (toolPairingBalancedBefore(session, surfaceNodes[keepFromIdx])) break;
		keepFromIdx -= 1;
	}
	if (keepFromIdx <= firstIdx) return null;
	return {
		start: surfaceNodes[firstIdx],
		end: surfaceNodes[keepFromIdx - 1]
	};
}
/**
* Run the single compaction transaction over one selected positional span.
* Selection and validation are read-only. Idle/log validation and
* `compaction/start` are synchronously adjacent, so the durable opening marker is
* the compaction lock before summarization yields. Every later failure makes
* exactly one `compaction/end` attempt; a failed close deliberately leaves the
* unmatched start detectable.
* @param dependencies - conversation meter and dynamically dispatched summarizer hook.
* @param session - session whose surface is mutated.
* @param start - inclusive first surface-node seq.
* @param end - inclusive last surface-node seq.
* @param agent - agent used by the summarizer.
* @param options - bracket owner, stability rule, and optional durability checkpoint.
* @param signal - optional summarization cancellation signal.
* @returns the successful durable compaction result.
*/
async function compactSurfaceRegion(dependencies, session, start, end, agent, options, signal) {
	if (options.owner === null) signal?.throwIfAborted();
	const selection = validateSurfaceRegion(session, start, end);
	const entryState = inspectCompactionEntryState(session);
	assertCompactionInactive(entryState.unmatchedCompactionStart, entryState.latestEndSeedSeq, "compaction");
	let owner;
	if (options.owner === null) {
		if (entryState.openTurn !== null) throw new ManualCompactionError("busy", "manual compaction: the session already has an open turn");
		owner = null;
	} else {
		if (entryState.openTurn === null) throw new Error("compactRegion: no open turn — automatic compaction events must be enclosed in a turn");
		owner = entryState.openTurn;
	}
	const compactionId = CompactionId(randomUUID());
	const lifecycle = {
		compactionId,
		...options.sourceCommandId === void 0 ? {} : { sourceCommandId: options.sourceCommandId },
		turn: owner
	};
	const startEvent = session.append("compaction/start", lifecycle);
	const assertStable = options.stability === "whole-surface" ? assertWholeSurfaceUnchanged : assertSelectedSpanStable;
	let failure;
	let flushFailure;
	let result;
	let closed = false;
	let closing = false;
	let stage = "summary";
	try {
		const summarized = await summarizeCompaction(dependencies, prepareCompaction(dependencies, session, selection), agent, compactionId, options.sourceCommandId, signal);
		if (options.owner === null) signal?.throwIfAborted();
		assertStable(dependencies, session, summarized);
		stage = "commit";
		const pending = commitCompactionBody(session, startEvent, summarized);
		closing = true;
		const endEvent = session.append("compaction/end", lifecycle);
		closed = true;
		result = completeCompaction(pending, endEvent);
	} catch (error) {
		failure = {
			error,
			stage: closing ? "commit" : stage
		};
		if (!closing) {
			closing = true;
			try {
				session.append("compaction/end", {
					...lifecycle,
					error: errorChain(error)
				});
				closed = true;
			} catch (closeError) {
				failure = {
					error: closeError,
					stage: "commit"
				};
			}
		}
	}
	if (closed && options.flush !== void 0) try {
		await options.flush();
	} catch (error) {
		flushFailure = error;
	}
	if (options.owner === null) signal?.throwIfAborted();
	if (failure !== void 0) {
		if (options.owner === null) throwManualFailure(failure);
		throw failure.error;
	}
	if (flushFailure !== void 0) throw new ManualCompactionError("persistence", "manual compaction durability checkpoint failed", { cause: flushFailure });
	/* v8 ignore next -- every path without a result records and throws a failure above. */
	if (result === void 0) throw new Error("compaction committed without a result");
	return result;
}
/** Classify one closed manual attempt without weakening cancellation precedence. */
function throwManualFailure(failure) {
	if (failure.stage === "commit") throw new ManualCompactionError("commit", "manual compaction did not commit cleanly", { cause: failure.error });
	if (failure.error instanceof SurfaceChangedError) throw new ManualCompactionError("changed", "the compacted history changed during manual compaction", { cause: failure.error });
	throw new ManualCompactionError("summary", "manual compaction could not produce a smaller summary", { cause: failure.error });
}
/**
* Reject a durable unmatched compaction marker unless a later constructor-seed
* boundary proves that its owner belongs to an earlier session lifecycle.
* @param unmatchedCompactionStart - latest unmatched opening marker, if any.
* @param latestEndSeedSeq - newest constructor-seed boundary, if any.
* @param stage - operation label included in the busy diagnostic.
*/
function assertCompactionInactive(unmatchedCompactionStart, latestEndSeedSeq, stage) {
	if (unmatchedCompactionStart === void 0 || latestEndSeedSeq !== void 0 && latestEndSeedSeq > unmatchedCompactionStart.seq) return;
	throw new ManualCompactionError("busy", `${stage}: compaction already in progress; the session compaction lock is already active`);
}
/**
* Recheck the durable compaction lock after an asynchronous policy decision.
* @param session - session whose latest marker state is inspected.
* @param stage - operation label included in the busy diagnostic.
*/
function assertNoActiveCompaction(session, stage) {
	const entryState = inspectCompactionEntryState(session);
	assertCompactionInactive(entryState.unmatchedCompactionStart, entryState.latestEndSeedSeq, stage);
}
/** Validate one requested surface-position span before asynchronous work begins. */
function validateSurfaceRegion(session, start, end) {
	const nodes = session.surface.nodes;
	const startIdx = nodes.indexOf(start);
	const endIdx = nodes.indexOf(end);
	if (startIdx === -1) throw new Error(`compactRegion: start seq ${start} not found in surface`);
	if (endIdx === -1) throw new Error(`compactRegion: end seq ${end} not found in surface`);
	if (startIdx > endIdx) throw new Error(`compactRegion: start seq ${start} (position ${startIdx}) is after end seq ${end} (position ${endIdx}) on the surface`);
	if (!toolPairingBalancedBefore(session, nodes[startIdx])) throw new Error(`compactRegion: start seq ${start} is not a balanced boundary (would split a step's tool-call/result pair)`);
	if (!toolPairingBalancedAfter(session, nodes[endIdx])) throw new Error(`compactRegion: end seq ${end} is not a balanced boundary (would split a step, or the step is still open)`);
	return {
		start,
		end,
		startIdx,
		endIdx,
		shadowedSeqs: nodes.slice(startIdx, endIdx + 1)
	};
}
/** Snapshot pricing and replay input for a validated surface range. */
function prepareCompaction(dependencies, session, selection) {
	const measurement = dependencies.meter.measure(session);
	const selectedNodes = measurement.nodes.slice(selection.startIdx, selection.endIdx + 1);
	if (selectedNodes.length !== selection.shadowedSeqs.length || selectedNodes.some((node, index) => node.seq !== selection.shadowedSeqs[index])) throw new SurfaceChangedError("compaction: selected surface changed before summarization began");
	return {
		...selection,
		measurement,
		selectedNodes,
		shadowedTokenCount: selectedNodes.reduce((total, node) => total + node.heuristicTokens, 0),
		shadowedRouteTokenCount: selectedNodes.reduce((total, node) => total + node.tokens, 0),
		input: buildSummarizationInput(session, selection.shadowedSeqs)
	};
}
/** Run the summarizer and frame its replacement checkpoint. */
async function summarizeCompaction(dependencies, prepared, agent, compactionId, sourceCommandId, signal) {
	const summaryResult = await dependencies.summarize(prepared.input, agent, signal);
	const checkpointMessage = createUserMessage({
		content: frameSummary(summaryResult.summary),
		source: compactCheckpointSource(compactionId, sourceCommandId)
	});
	const framedSummaryTokenCount = dependencies.meter.estimateMessage(checkpointMessage);
	if (framedSummaryTokenCount >= prepared.shadowedRouteTokenCount) throw new Error(`summary is not smaller than the shadowed content (${framedSummaryTokenCount} estimated framed tokens >= ${prepared.shadowedRouteTokenCount})`);
	return {
		...prepared,
		...summaryResult,
		checkpointMessage
	};
}
/** Reject a summary prepared against any earlier surface generation. */
function assertWholeSurfaceUnchanged(dependencies, session, prepared) {
	if (!isDeepStrictEqual(dependencies.meter.measure(session).nodes, prepared.measurement.nodes)) throw new SurfaceChangedError("compaction: session surface changed during summarization");
}
/**
* Require only that the selected span remain the same present, contiguous,
* equally priced, balanced replacement target. Nodes added outside it remain
* visible and do not invalidate the summary.
*/
function assertSelectedSpanStable(dependencies, session, prepared) {
	let current;
	try {
		current = validateSurfaceRegion(session, prepared.start, prepared.end);
	} catch (error) {
		throw new SurfaceChangedError("compaction: the selected span is no longer a valid replacement target", { cause: error });
	}
	if (!isDeepStrictEqual([...current.shadowedSeqs], [...prepared.shadowedSeqs])) throw new SurfaceChangedError("compaction: the selected span changed during summarization");
	if (!isDeepStrictEqual(dependencies.meter.measure(session).nodes.slice(current.startIdx, current.endIdx + 1), prepared.selectedNodes)) throw new SurfaceChangedError("compaction: the selected span was rewritten during summarization");
}
/** Append one completed summary record and replacement body without yielding. */
function commitCompactionBody(session, startEvent, summarized) {
	const { start, end, shadowedSeqs, shadowedTokenCount, summary, provider, model, maxTokens, usage, checkpointMessage } = summarized;
	const callProvenance = summarized.llmStreamCall === true ? {
		rawOutput: summarized.rawOutput,
		llmStreamCall: true
	} : summarized.rawOutput === void 0 ? {} : { rawOutput: summarized.rawOutput };
	const summaryEvent = session.append("compaction/summary", {
		compactionId: startEvent.data.compactionId,
		...startEvent.data.sourceCommandId === void 0 ? {} : { sourceCommandId: startEvent.data.sourceCommandId },
		summary,
		...callProvenance,
		shadowedRange: {
			start,
			end
		},
		shadowedSeqs: [...shadowedSeqs],
		shadowedTokenCount,
		provider,
		model,
		...maxTokens === void 0 ? {} : { maxTokens },
		...usage === void 0 ? {} : { usage }
	});
	session.append("user/message", checkpointMessage, {
		surfaceOp: {
			op: "replace",
			startSeq: start,
			endSeq: end
		},
		sourceEventSeqs: [
			startEvent.seq,
			summaryEvent.seq,
			...shadowedSeqs
		]
	});
	return {
		compactionId: startEvent.data.compactionId,
		...startEvent.data.sourceCommandId === void 0 ? {} : { sourceCommandId: startEvent.data.sourceCommandId },
		startSeq: startEvent.seq,
		summarySeq: summaryEvent.seq,
		summary,
		shadowedRange: {
			start,
			end
		},
		shadowedSeqs: [...shadowedSeqs],
		shadowedTokenCount
	};
}
/** Attach the successfully appended close event to a pending result. */
function completeCompaction(pending, endEvent) {
	return {
		...pending,
		endSeq: endEvent.seq
	};
}
/**
* Reconstruct the last routed request's cacheable prefix for the shadowed
* region: the system prompt held by the `system/message` at surface node 0,
* the header's tool schemas, then the region's own derived messages in surface
* order. The summarizer appends only the compaction instruction after this, so
* the call is a genuine prefix of the conversation and reuses the provider's
* KV cache. A surface without a system head, or whose head projects to no
* message, contributes no leading system message.
* @param session - session supplying the surface head, request header, and per-node projection.
* @param shadowedSeqs - the surface-node seqs, in order, being compacted.
* @returns the replayed conversation prefix to condense.
*/
function buildSummarizationInput(session, shadowedSeqs) {
	const header = session.requestHeader();
	const head = systemHead(session, session.surface.nodes[0]);
	const system = head === void 0 ? null : session.deriveEventMessage(head);
	const regionMessages = shadowedSeqs.map((seq) => session.deriveEventMessage(session.eventAt(seq))).filter((message) => message !== null);
	return {
		...header?.tools === void 0 ? {} : { tools: header.tools },
		messages: system === null ? regionMessages : [system, ...regionMessages]
	};
}
/** Inspect open-turn, unmatched-compaction, and latest seed-boundary state independently. */
function inspectCompactionEntryState(session) {
	let openTurn = null;
	let openTurnStateKnown = false;
	let unmatchedCompactionStart;
	let compactionEntryStateKnown = false;
	let latestEndSeedSeq;
	for (let seq = session.seq - 1; seq >= 0; seq -= 1) {
		const event = session.eventAt(SessionSeq(seq));
		if (latestEndSeedSeq === void 0 && event.type === "session/end-seed") latestEndSeedSeq = event.seq;
		if (!compactionEntryStateKnown) {
			if (event.type === "compaction/start") {
				unmatchedCompactionStart = event;
				compactionEntryStateKnown = true;
			} else if (event.type === "compaction/end") compactionEntryStateKnown = true;
		}
		if (!openTurnStateKnown) {
			if (event.type === "turn/start") {
				openTurn = event.data.turn;
				openTurnStateKnown = true;
			} else if (event.type === "turn/end") openTurnStateKnown = true;
		}
		if (openTurnStateKnown && compactionEntryStateKnown && latestEndSeedSeq !== void 0) break;
	}
	return {
		openTurn,
		unmatchedCompactionStart,
		latestEndSeedSeq
	};
}
//#endregion
//#region lib/types/index.js
/**
* Basic replay-aware compaction backend.
*
* @module @deepseek-ai/dsh-compaction-basic
*/
/** Resolve the exact provider/model durably routed for the latest request. */
function routedTarget(session) {
	const config = session.requestHeader()?.config;
	if (config === void 0 || config.provider.length === 0 || config.model.length === 0) return;
	return {
		provider: config.provider,
		model: config.model
	};
}
/** Resolve the conversation target used to select an optional policy override. */
function conversationTarget(agent) {
	const routed = routedTarget(agent.session);
	if (routed !== void 0) return routed;
	if (agent.options.provider === void 0 || agent.options.provider.length === 0 || agent.options.model === void 0 || agent.options.model.length === 0) return void 0;
	return {
		provider: agent.options.provider,
		model: agent.options.model
	};
}
const thresholdRatioSchema = z.number();
const retainRatioSchema = z.number();
const retainTokensSchema = z.number().step(1).min(0);
const summarizationProviderSchema = z.string();
const summarizationModelSchema = z.string();
const maxTokensSchema = z.number().step(1).min(1);
const compactionRetriesSchema = z.number().step(1).min(0);
const maxOverflowRetriesSchema = z.number().step(1).min(0);
const modelPolicy = z.object({
	provider: z.string().required(),
	model: z.string().required(),
	thresholdRatio: thresholdRatioSchema,
	retainRatio: retainRatioSchema,
	retainTokens: retainTokensSchema,
	summarizationProvider: summarizationProviderSchema,
	summarizationModel: summarizationModelSchema,
	maxTokens: maxTokensSchema,
	compactionRetries: compactionRetriesSchema,
	maxOverflowRetries: maxOverflowRetriesSchema
});
/**
* Dependency-light compaction backend using `ctx.tokenMeter` for pressure,
* retention, cited source events, and summary-convergence pricing.
*
* `summarize()` is the sole subclass customization hook; the replay and durable
* mutation strategy stays fixed so every pricing decision uses the singleton
* token meter.
*/
var BasicCompactionEngine = class extends CompactionEngine {
	static inject = [
		"llm",
		"tokenMeter",
		"sessions"
	];
	static Config = z.object({
		thresholdRatio: thresholdRatioSchema,
		retainRatio: retainRatioSchema,
		retainTokens: retainTokensSchema,
		summarizationProvider: summarizationProviderSchema,
		summarizationModel: summarizationModelSchema,
		maxTokens: maxTokensSchema,
		compactionRetries: compactionRetriesSchema,
		maxOverflowRetries: maxOverflowRetriesSchema,
		modelPolicies: z.array(modelPolicy),
		auto: z.boolean()
	});
	/** Resolved and validated compaction configuration. */
	config;
	warnedPressureConfigTargets = /* @__PURE__ */ new Set();
	overflowRetries = /* @__PURE__ */ new WeakMap();
	overflowAgents = /* @__PURE__ */ new WeakMap();
	constructor(ctx, config = {}) {
		super(ctx);
		this.config = resolveConfig(config);
		if (this.config.auto) this._registerAutomaticCompaction();
	}
	/**
	* Register automatic between-step pressure and model-request overflow
	* recovery. `compactIfNeeded` stays dynamically dispatched so subclass
	* overrides are honored at event time.
	*/
	_registerAutomaticCompaction() {
		const { ctx } = this;
		const logResult = (result, trigger) => {
			ctx.logger.info(`compaction (${trigger}): shadowed ${result.shadowedSeqs.length} surface nodes (seqs ${result.shadowedRange.start}-${result.shadowedRange.end}, ~${result.shadowedTokenCount} tokens)`);
		};
		ctx.on("agent/pre-step", async ({ agent, signal }, next) => {
			if (!signal.aborted) try {
				const result = await this.compactIfNeeded(agent, "pressure", signal);
				if (result !== null) logResult(result, "step pressure");
			} catch (error) {
				if (error instanceof TargetPressureConfigError) {
					if (this.warnedPressureConfigTargets.has(error.targetKey)) return next();
					this.warnedPressureConfigTargets.add(error.targetKey);
				}
				const message = error instanceof Error ? error.message : String(error);
				ctx.logger.warn(`step compaction failed: ${message}; continuing the turn`);
			}
			return next();
		});
		ctx.on("agent/status", ({ agent, status }) => {
			if (status === "idle") this.overflowRetries.delete(agent);
		});
		ctx.on("session/event", (session, event) => {
			if (event.type !== "assistant/message") return;
			const agent = this.overflowAgents.get(session);
			if (agent !== void 0) this.overflowRetries.delete(agent);
		});
		ctx.on("agent/request-error", async ({ agent, failure, signal }, next) => {
			if (failure.code !== CONTEXT_WINDOW_EXCEEDED_CODE || signal.aborted) return next();
			this.overflowAgents.set(agent.session, agent);
			const target = routedTarget(agent.session);
			if (target === void 0) return next();
			const policy = resolveTargetPolicy(this.config, target);
			const retries = this.overflowRetries.get(agent) ?? 0;
			if (retries >= policy.maxOverflowRetries) return next();
			const generation = agent.session.surface.replaceGeneration;
			let result;
			try {
				result = await this.compactIfNeeded(agent, "context-overflow", signal);
			} catch (recoveryError) {
				const message = recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
				if (!signal.aborted && agent.session.surface.replaceGeneration > generation) {
					ctx.logger.warn(`context-overflow compaction failed after durable surface progress: ${message}; retrying from the replacement surface`);
					this.overflowRetries.set(agent, retries + 1);
					return { kind: "retry" };
				}
				ctx.logger.warn(`context-overflow compaction failed: ${message}; ${signal.aborted ? "cancellation prevents retry" : "preserving the original request error"}`);
				return next();
			}
			if (signal.aborted || agent.session.surface.replaceGeneration <= generation) return next();
			if (result !== null) logResult(result, "context overflow recovery");
			this.overflowRetries.set(agent, retries + 1);
			return { kind: "retry" };
		});
	}
	/**
	* Summarize the replayed conversation region through a direct one-shot
	* `ctx.llm.stream()` call whose prefix reuses the conversation's own system
	* prompt, tools, and messages so the provider's KV cache is not invalidated.
	* Override this sole hook for a template or remote summarizer.
	* @param input - replayed conversation prefix (system, tools, and leading messages) to condense.
	* @param agent - supplies routed-model history, fallback model, and session id.
	* @param signal - optional cancellation forwarded to the adapter.
	* @returns safe text summary blocks and the exact auxiliary call envelope and output.
	*/
	async summarize(input, agent, signal) {
		const target = conversationTarget(agent);
		const config = target === void 0 ? this.config : resolveTargetPolicy(this.config, target);
		return summarizeWithLlm(this.ctx, config, input, agent, signal);
	}
	/**
	* Compact for replayed step-boundary pressure or one provider-confirmed context
	* overflow. Both triggers price the latest durable routed request envelope;
	* overflow bypasses the normal threshold and retained-tail policy so it can
	* force one useful balanced reduction.
	* @param agent - agent whose latest durable routed request is measured.
	* @param trigger - normal step-boundary pressure or context-overflow recovery.
	* @param signal - live turn cancellation signal forwarded to summarization.
	* @returns the latest summary compaction result, or `null` when no summary ran.
	*/
	async compactIfNeeded(agent, trigger, signal) {
		const target = routedTarget(agent.session);
		if (target === void 0) return null;
		const policy = resolveTargetPolicy(this.config, target);
		const meter = this.ctx.tokenMeter;
		let measurement = meter.measure(agent.session);
		switch (trigger) {
			case "context-overflow": break;
			case "pressure": break;
			/* v8 ignore next -- closed-union exhaustiveness guard */
			default: assertNever(trigger, "compaction trigger");
		}
		const prune = this.ctx.get("toolResultPruner");
		if (trigger === "context-overflow") {
			if (prune !== void 0) {
				prune.pruneSession(agent.session);
				measurement = meter.measure(agent.session);
			}
			const range = selectCompactableRange(agent.session, measurement, 0);
			if (range === null) return null;
			return this.compactRegion(range.start, range.end, agent, signal);
		}
		const context = (await this.ctx.llm.resolveModelInfo(target.provider, target.model, signal)).context;
		assertNoActiveCompaction(agent.session, "automatic pressure compaction");
		const targetKey = `${target.provider}/${target.model}`;
		if (context === void 0) throw new TargetPressureConfigError(targetKey, `compaction-basic: no context capacity for ${targetKey}; configure contextWindow on that adapter model`);
		const spec = resolveCompactSpec(policy, context.contextWindow);
		if (measurement.totalTokens < spec.thresholdTokens) return null;
		if (prune !== void 0) {
			prune.pruneSession(agent.session);
			measurement = meter.measure(agent.session);
		}
		if (measurement.totalTokens < spec.thresholdTokens) return null;
		let result = null;
		for (let attempt = 0; attempt <= spec.compactionRetries; attempt += 1) {
			const range = selectCompactableRange(agent.session, measurement, spec.retainTokens);
			if (range === null) {
				/* v8 ignore else -- concrete replacement preserves a compactable checkpoint; subclass hooks cannot mutate it. */
				if (result === null) return null;
				/* v8 ignore next -- paired with the defensive post-success branch above. */
				break;
			}
			result = await this.compactRegion(range.start, range.end, agent, signal);
			measurement = meter.measure(agent.session);
			if (measurement.totalTokens < spec.thresholdTokens) return result;
		}
		throw new Error(`compaction still above threshold after ${spec.compactionRetries + 1} compaction attempts (${measurement.totalTokens} estimated tokens >= threshold ${spec.thresholdTokens})`);
	}
	/**
	* Compact one inclusive positional range from the agent-owned surface using
	* the effective token meter for all retention and shrink pricing.
	* @param start - inclusive first surface-node seq.
	* @param end - inclusive last surface-node seq.
	* @param agent - owner of the target session, used by the summarizer.
	* @param signal - optional summarization cancellation signal.
	* @returns the successful durable compaction result.
	*/
	async compactRegion(start, end, agent, signal) {
		return compactSurfaceRegion(this.regionDependencies(), agent.session, start, end, agent, {
			owner: "current-turn",
			stability: "whole-surface"
		}, signal);
	}
	/**
	* Force one useful idle-session compaction below the pressure threshold, and
	* resolve only after its standalone marker pair is durably checkpointed.
	* @param agent - idle agent whose next-turn admission this call reserves.
	* @param signal - cancellation scoped to this compaction request.
	* @param sourceCommandId - initiating command identity for presentation correlation.
	* @returns the committed result, or `null` when no safe useful range exists.
	*/
	compactNow(agent, signal, sourceCommandId) {
		signal.throwIfAborted();
		try {
			return agent.runMaintenance(async (agentSignal) => {
				const operationSignal = AbortSignal.any([agentSignal, signal]);
				try {
					operationSignal.throwIfAborted();
					const range = selectCompactableRange(agent.session, this.ctx.tokenMeter.measure(agent.session), 0);
					if (range === null) return null;
					return await compactSurfaceRegion(this.regionDependencies(), agent.session, range.start, range.end, agent, {
						owner: null,
						stability: "selected-span",
						...sourceCommandId === void 0 ? {} : { sourceCommandId },
						flush: async () => {
							await this.ctx.sessions.flush(agent.session);
						}
					}, operationSignal);
				} catch (error) {
					if (agentSignal.aborted && operationSignal.reason === agentSignal.reason) throw new ManualCompactionError("cancelled", "manual compaction was cancelled", { cause: error });
					operationSignal.throwIfAborted();
					throw error;
				}
			});
		} catch (error) {
			throw new ManualCompactionError("busy", "manual compaction requires an idle agent with no waking queued work", { cause: error });
		}
	}
	/** Bind the effective token meter and dynamically dispatched summarizer hook. */
	regionDependencies() {
		return {
			meter: this.ctx.tokenMeter,
			summarize: (input, owner, abort) => this.summarize(input, owner, abort)
		};
	}
};
//#endregion
export { BasicCompactionEngine, BasicCompactionEngine as default };
