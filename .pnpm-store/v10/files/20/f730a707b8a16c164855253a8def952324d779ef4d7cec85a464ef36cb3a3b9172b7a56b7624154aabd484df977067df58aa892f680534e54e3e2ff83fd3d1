import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { CONTEXT_WINDOW_EXCEEDED_CODE, EMPTY_RESPONSE_CODE, INVALID_CREDENTIAL_CODE, LlmAdapter, LlmError, QUOTA_EXCEEDED_CODE, ReasoningEffortId, RetryPolicySchema, assertUsableApiKey, attributionHeaders, contentHasImage, isContextWindowExceededError, isQuotaExceededError, normalizeApiKey, offloadRequestImagesWithPolicy, offloadedImageText, requestImageHandleText, resolveImageAttachmentAccess, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { deepEqualJson } from "@deepseek-ai/dsh-util-values";
import { createModels, createProvider, getSupportedThinkingLevels, isContextOverflow } from "@earendil-works/pi-ai";
import { MAX_TIMER_DELAY_MS, idleWatchdog, timeoutOf } from "@deepseek-ai/dsh-timeout";
import { brandString } from "@deepseek-ai/dsh-brand";
import z from "@deepseek-ai/schemastery";
import { credentialKey, credentialKeyId, credentialKeyScope, credentialRef, isCredentialKeySegment, isCredentialRefName } from "@deepseek-ai/dsh-credentials";
import { builtinProviders, getBuiltinModels, getBuiltinProviders } from "@earendil-works/pi-ai/providers/all";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { openAIResponsesApi } from "@earendil-works/pi-ai/api/openai-responses.lazy";
import { homedir } from "node:os";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
//#region lib/types/replay.js
/**
* Durable pi-ai replay metadata and assistant-history reconstruction.
*
* Harness content remains the durable source for text and tool calls. This
* module stores only the provider-native metadata needed to reconstruct a
* pi-ai assistant message on a later request.
*
* @module dsh-llm-pi-ai/replay
*/
/** Parse tool-call argument JSON; tolerate model malformations with {}. */
function parseArguments(raw) {
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
	} catch {}
	return {};
}
/** Construct the zero usage value required by historical pi-ai messages. */
function emptyPiUsage() {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			total: 0
		}
	};
}
/**
* Project a successful pi-ai response into the minimal durable replay state.
* The per-block half is index-aligned with the streamed blocks (pi-ai content
* order), so `BlockAssembler` prunes an entry with its block whenever assembly
* removes one.
* @param message - completed native pi-ai assistant response.
* @param requestedModel - request identity stored in the assistant source; defaults to the native model.
* @returns the versioned lossless-JSON replay projection.
*/
function toPiReplayState(message, requestedModel = message.model) {
	const responseModel = message.api === "anthropic-messages" && message.model !== requestedModel ? message.model : message.responseModel;
	return {
		response: {
			kind: "pi-ai",
			version: 2,
			api: message.api,
			provider: message.provider,
			model: requestedModel,
			...responseModel === void 0 ? {} : { responseModel },
			...message.responseId === void 0 ? {} : { responseId: message.responseId },
			...message.providerThinkingLevel === void 0 ? {} : { providerThinkingLevel: message.providerThinkingLevel },
			stopReason: message.stopReason
		},
		blocks: message.content.map((block) => {
			switch (block.type) {
				case "text": return {
					type: "text",
					...block.textSignature === void 0 ? {} : { textSignature: block.textSignature }
				};
				case "thinking": return {
					type: "reasoning",
					...block.thinkingSignature === void 0 ? {} : { thinkingSignature: block.thinkingSignature },
					...block.redacted === void 0 ? {} : { redacted: block.redacted }
				};
				case "toolCall": return {
					type: "tool-call",
					...block.thoughtSignature === void 0 ? {} : { thoughtSignature: block.thoughtSignature }
				};
			}
		})
	};
}
function invalidReplay(message) {
	throw new LlmError(`invalid pi-ai replay state: ${message}`, "INVALID_REPLAY_STATE");
}
/** Validate the durable adapter-private envelope before it reaches pi-ai. */
function readReplayState(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return invalidReplay("expected a replay envelope");
	const envelope = value;
	const rawResponse = envelope["response"];
	if (typeof rawResponse !== "object" || rawResponse === null || Array.isArray(rawResponse)) return invalidReplay("expected a response object");
	const response = rawResponse;
	if (response["kind"] !== "pi-ai") return invalidReplay("unknown state kind");
	if (response["version"] !== 2) return invalidReplay(`unsupported version ${String(response["version"])}`);
	for (const key of [
		"api",
		"provider",
		"model"
	]) if (typeof response[key] !== "string" || response[key].length === 0) return invalidReplay(`${key} must be a non-empty string`);
	if (![
		"stop",
		"length",
		"toolUse",
		"error",
		"aborted"
	].includes(String(response["stopReason"]))) return invalidReplay("unknown stopReason");
	if (response["responseModel"] !== void 0 && typeof response["responseModel"] !== "string") return invalidReplay("responseModel must be a string");
	if (response["responseId"] !== void 0 && typeof response["responseId"] !== "string") return invalidReplay("responseId must be a string");
	if (response["providerThinkingLevel"] !== void 0 && typeof response["providerThinkingLevel"] !== "string") return invalidReplay("providerThinkingLevel must be a string");
	const blocks = envelope["blocks"];
	if (!Array.isArray(blocks)) return invalidReplay("blocks must be an array");
	for (const [index, value] of blocks.entries()) {
		if (typeof value !== "object" || value === null || Array.isArray(value)) return invalidReplay(`block ${index} must be an object`);
		const block = value;
		if (![
			"text",
			"reasoning",
			"tool-call"
		].includes(String(block["type"]))) return invalidReplay(`block ${index} has an unknown type`);
		for (const signature of [
			"textSignature",
			"thinkingSignature",
			"thoughtSignature"
		]) if (block[signature] !== void 0 && typeof block[signature] !== "string") return invalidReplay(`block ${index} ${signature} must be a string`);
		if (block["redacted"] !== void 0 && typeof block["redacted"] !== "boolean") return invalidReplay(`block ${index} redacted must be boolean`);
	}
	return {
		response,
		blocks
	};
}
/** Convert provider-neutral blocks without trusting them as same-model replay. */
function foreignAssistant(message) {
	const source = message.source.kind === "model" ? message.source : void 0;
	const content = [];
	for (const block of message.content) switch (block.type) {
		case "text":
			content.push({
				type: "text",
				text: block.text
			});
			break;
		case "reasoning":
			content.push({
				type: "thinking",
				thinking: block.text
			});
			break;
		case "tool-call":
			content.push({
				type: "toolCall",
				id: block.id,
				name: block.name,
				arguments: parseArguments(block.arguments)
			});
			break;
		case "image": throw new LlmError("pi-ai chat history cannot represent structured assistant image output", "UNSUPPORTED_CONTENT");
		default: break;
	}
	return {
		role: "assistant",
		content,
		api: "dsh-foreign",
		provider: source?.provider ?? "dsh-foreign",
		model: source?.model ?? "dsh-foreign",
		usage: emptyPiUsage(),
		stopReason: content.some((piece) => piece.type === "toolCall") ? "toolUse" : "stop",
		timestamp: 0
	};
}
/** Recombine durable Harness content with validated pi-ai replay metadata. */
function replayedAssistant(message, source, rawState) {
	const state = readReplayState(rawState);
	if (state.response.provider !== source.provider) return invalidReplay("provider does not match assistant source");
	if (state.response.model !== source.model) return invalidReplay("model does not match assistant source");
	if (state.blocks.length !== message.content.length) return invalidReplay("block count does not match assistant content");
	return {
		role: "assistant",
		content: message.content.map((block, index) => {
			const replay = state.blocks[index];
			if (replay === void 0 || replay.type !== block.type) return invalidReplay(`block ${index} does not match assistant content`);
			switch (block.type) {
				case "text": return {
					type: "text",
					text: block.text,
					...replay.type === "text" && replay.textSignature !== void 0 ? { textSignature: replay.textSignature } : {}
				};
				case "reasoning": return {
					type: "thinking",
					thinking: block.text,
					...replay.type === "reasoning" && replay.thinkingSignature !== void 0 ? { thinkingSignature: replay.thinkingSignature } : {},
					...replay.type === "reasoning" && replay.redacted !== void 0 ? { redacted: replay.redacted } : {}
				};
				case "tool-call": return {
					type: "toolCall",
					id: block.id,
					name: block.name,
					arguments: parseArguments(block.arguments),
					...replay.type === "tool-call" && replay.thoughtSignature !== void 0 ? { thoughtSignature: replay.thoughtSignature } : {}
				};
				/* v8 ignore next -- readReplayState rejects unknown replay tags, so an equal plugin-added Harness tag cannot reach this switch */
				default: return invalidReplay(`block ${index} has an unsupported Harness type`);
			}
		}),
		api: state.response.api,
		provider: state.response.provider,
		model: state.response.api === "anthropic-messages" ? state.response.responseModel ?? state.response.model : state.response.model,
		...state.response.responseModel === void 0 ? {} : { responseModel: state.response.responseModel },
		...state.response.responseId === void 0 ? {} : { responseId: state.response.responseId },
		...state.response.providerThinkingLevel === void 0 ? {} : { providerThinkingLevel: state.response.providerThinkingLevel },
		usage: emptyPiUsage(),
		stopReason: state.response.stopReason,
		timestamp: 0
	};
}
/**
* Convert one durable Harness assistant message into pi-ai history.
*
* Durable content is the authoritative record; replay metadata only restores
* native fidelity (ids, signatures). A replay state this build cannot use —
* another adapter's kind, another version, a malformed value, or metadata that
* no longer matches the content — therefore degrades the one message to
* provider-neutral history instead of failing the request.
* @param message - assistant content with required source and optional adapter-owned replay metadata.
* @param onDegrade - called with the diagnostic reason when an unusable replay
*   state falls back to provider-neutral conversion.
* @returns a native pi-ai assistant message reconstructed from durable content.
*/
function toPiAssistant(message, onDegrade) {
	const source = message.source;
	if (source.kind !== "model" || source.replayState === void 0) return foreignAssistant(message);
	try {
		return replayedAssistant(message, source, source.replayState);
	} catch (error) {
		/* v8 ignore next -- replayedAssistant throws only INVALID_REPLAY_STATE LlmErrors; the
		guard keeps a future non-replay failure loud instead of silently degrading it */
		if (!(error instanceof LlmError) || error.code !== "INVALID_REPLAY_STATE") throw error;
		onDegrade?.(error.message);
		return foreignAssistant(message);
	}
}
//#endregion
//#region lib/types/catalog.js
/**
* Materialization of one provider route's model catalog. The installed pi-ai
* catalog supplies defaults keyed by model id, and a profile's own model
* entries override them field by field, so a route naming a catalog provider
* stays configuration-free while a route pi-ai has never heard of is fully
* describable from `settings.yaml`.
*
* Strict resolution rejects unserviceable models before settings writes.
* Deferred resolution retains their diagnostics so stored catalog drift does
* not prevent inspection, repair, or requests to independently valid models.
*
* @module dsh-llm-pi-ai/catalog
*/
/**
* Pricing for a model the installed catalog does not describe. The harness
* never reads pi-ai's cost metadata — `replay.ts` zeroes it and no consumer
* reports spend — so this is the absence of a fact, not a configurable rate.
*/
const NO_COST = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0
};
/** Every request modality a profile may declare. */
const MODALITIES = Object.keys({
	text: true,
	image: true
});
/**
* One entry's modality list, or `undefined` when it states no answer. Absent
* and empty mean the same thing — `[]` describes a model that accepts nothing
* and could serve no request — which is what makes an entry naming a catalog
* model without declaring modalities keep the catalog's, since the config
* schema materializes `[]` for an absent array.
* @param configured - the list a `models` or `modelOverrides` entry supplied.
* @returns the declared modalities, or `undefined` to ask the next level.
*/
function declaredInput(configured) {
	return configured === void 0 || configured.length === 0 ? void 0 : [...configured];
}
/** Every pi-ai thinking level a profile may declare, in escalation order. */
const THINKING_LEVELS = Object.keys({
	off: true,
	minimal: true,
	low: true,
	medium: true,
	high: true,
	xhigh: true,
	max: true
});
/** Reasoning-dispatch wire formats a profile may name, most-reached first. */
const SUPPORTED_THINKING_FORMATS = Object.keys({
	"openai": true,
	"deepseek": true,
	"openrouter": true,
	"together": true,
	"baseten": true,
	"zai": true,
	"qwen": true,
	"chat-template": true,
	"qwen-chat-template": true,
	"string-thinking": true,
	"ant-ling": true
});
/** The output-cap field spellings a profile may name. */
const MAX_TOKENS_FIELDS = Object.keys({
	max_completion_tokens: true,
	max_tokens: true
});
/** The reasoning-budget field spellings a profile may name. */
const THINKING_TOKEN_BUDGET_FIELDS = Object.keys({
	thinking_token_budget: true,
	thinking_budget: true,
	thinking_budget_tokens: true
});
/** The prompt-cache marker conventions a profile may name. */
const CACHE_CONTROL_FORMATS = Object.keys({ anthropic: true });
/** The request-state placeholders a profile may name. */
const CHAT_TEMPLATE_VARS = Object.keys({
	"thinking.enabled": true,
	"thinking.effort": true,
	"thinking.budget": true
});
let providerIndex;
/**
* Installed catalog providers by id, constructed once. Each entry owns the API
* implementations for its own models, which is why a catalog route reuses this
* provider instead of being rebuilt from parts.
* @returns the catalog provider index.
*/
function catalogProviders() {
	providerIndex ??= new Map(builtinProviders().map((provider) => [provider.id, provider]));
	return providerIndex;
}
/**
* The installed catalog provider for one route, when pi-ai ships one.
* @param provider - provider route key.
* @returns the catalog provider, or `undefined` for a route pi-ai does not ship.
*/
function catalogProvider(provider) {
	return catalogProviders().get(provider);
}
/**
* Every provider route the installed pi-ai catalog ships.
* @returns the catalog provider ids.
*/
function catalogProviderIds() {
	return getBuiltinProviders();
}
/**
* The installed catalog models for one route, indexed by model id.
* @param provider - provider route key.
* @returns catalog models by id; empty for a route pi-ai does not ship.
*/
function catalogModels(provider) {
	if (!catalogProviders().has(provider)) return /* @__PURE__ */ new Map();
	const models = getBuiltinModels(provider);
	return new Map(models.map((model) => [model.id, model]));
}
/**
* Disposition of every `OpenAICompletionsCompat` field. The `Record` key type
* is a drift gate: a pi-ai upgrade that adds a field fails compilation here
* until it is classified, so the offer never silently lags the upstream set.
*/
const COMPLETIONS_COMPAT_GATE = {
	supportsStore: "offer",
	supportsDeveloperRole: "offer",
	supportsReasoningEffort: "offer",
	supportsUsageInStreaming: "offer",
	supportsFinishReason: "offer",
	maxTokensField: "offer",
	requiresToolResultName: "offer",
	requiresAssistantAfterToolResult: "offer",
	requiresThinkingAsText: "offer",
	requiresReasoningContentOnAssistantMessages: "offer",
	thinkingFormat: "offer",
	chatTemplateKwargs: "offer",
	chatTemplateArgs: "offer",
	supportsThinkingTokenBudget: "offer",
	thinkingTokenBudgetField: "offer",
	vllmPriority: "offer",
	supportsStrictMode: "offer",
	cacheControlFormat: "offer",
	supportsLongCacheRetention: "offer",
	openRouterRouting: "withhold",
	vercelGatewayRouting: "withhold",
	zaiToolStream: "withhold",
	supportsOpenAIGrammarTools: "withhold",
	sendSessionAffinityHeaders: "withhold",
	deferredToolsMode: "withhold",
	sessionAffinityFormat: "withhold"
};
/** Disposition of every `OpenAIResponsesCompat` field; a drift gate like the one above. */
const RESPONSES_COMPAT_GATE = {
	supportsDeveloperRole: "offer",
	supportsMaxOutputTokens: "offer",
	supportsStrictMode: "offer",
	supportsLongCacheRetention: "offer",
	sessionAffinityFormat: "withhold",
	supportsOpenAIGrammarTools: "withhold",
	supportsAdditionalTools: "withhold",
	supportsToolSearch: "withhold",
	supportsExplicitPromptCacheMode: "withhold"
};
/**
* The compat gate of every wire protocol a profile may configure.
*
* Keyed by protocol, but grouped by pi-ai's compat *type*: the three Responses
* protocols share `OpenAIResponsesCompat`, so a switch settable on one is
* settable on all three. Keying by protocol alone would refuse
* `azure-openai-responses` and `openai-codex-responses` the fields their own
* models declare.
*/
const COMPAT_GATES = {
	"openai-completions": COMPLETIONS_COMPAT_GATE,
	"openai-responses": RESPONSES_COMPAT_GATE,
	"azure-openai-responses": RESPONSES_COMPAT_GATE,
	"openai-codex-responses": RESPONSES_COMPAT_GATE,
	"anthropic-messages": {
		supportsEagerToolInputStreaming: "offer",
		supportsLongCacheRetention: "offer",
		supportsCacheControlOnTools: "offer",
		supportsTemperature: "offer",
		forceAdaptiveThinking: "offer",
		allowEmptySignature: "offer",
		supportsStrictTools: "offer",
		sendSessionAffinityHeaders: "withhold",
		supportsToolReferences: "withhold",
		supportsMidConvoEffort: "withhold",
		allowedFallbackModels: "withhold"
	},
	"bedrock-converse-stream": { supportsStrictMode: "offer" }
};
/**
* The compat gate of one resolved protocol. A `string` lookup rather than a
* keyed read: a route's `api` is configuration, so it may name a protocol
* pi-ai gives no compat type — or none at all.
* @param api - resolved wire protocol.
* @returns that protocol's field gate, or `undefined` when it takes no compat.
*/
function compatGate(api) {
	return COMPAT_GATES[api];
}
/**
* The compat entries a profile actually set.
*
* schemastery materializes an absent dict as `{}` — the behavior
* `reasoningEfforts` works around with a union — so every parsed profile
* carries both template-argument keys whether or not anyone wrote them. An
* empty one states nothing here: it would send no arguments, which is exactly
* what leaving the field out does, so absent and empty are the same request
* and neither may make a route look like it configured a switch. A valueless
* scalar is the other thing schemastery lets through, and it is refused by
* {@link assertOfferedCompatFields} before this runs rather than filtered.
* @param compat - the configured switches, when any.
* @returns the entries carrying a value, in declaration order.
*/
function configuredCompatEntries(compat) {
	return Object.entries(compat ?? {}).flatMap(([field, value]) => {
		return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 0 ? [] : [[field, value]];
	});
}
/**
* The protocols offering one compat field, in {@link COMPAT_GATES} order.
* @param field - configured compat field name.
* @returns the protocols whose compat takes it; empty when none does, which
*   is either a withheld field or a name no upstream compat type declares.
*/
function compatProtocols(field) {
	return Object.entries(COMPAT_GATES).flatMap(([api, gate]) => gate[field] === "offer" ? [api] : []);
}
/**
* The compat fields one protocol offers, for a diagnostic that has to show
* what was available instead of the name that missed.
* @param api - wire protocol.
* @returns the offered field names, or an empty list for a protocol taking no compat.
*/
function offeredCompatFields(api) {
	return Object.entries(compatGate(api) ?? {}).flatMap(([field, disposition]) => disposition === "offer" ? [field] : []);
}
/**
* Every offered field name, deduplicated, for the one diagnostic that cannot
* narrow by protocol: the vocabulary check runs before any protocol resolves,
* which is what lets it refuse a misspelling on a route whose models would
* never have reached the protocol that declares the intended field.
* @returns the offered field names across every protocol, in gate order.
*/
function allOfferedCompatFields() {
	const fields = /* @__PURE__ */ new Set();
	for (const api of Object.keys(COMPAT_GATES)) for (const field of offeredCompatFields(api)) fields.add(field);
	return [...fields];
}
/**
* Reject a compat key no protocol offers. Runs before any protocol is
* resolved, so a withheld field or a misspelling fails even on a route whose
* models never reach the protocol that would have taken it — the alternative
* being the silent drop that let an unreadable switch look applied.
* @param provider - provider route key, for diagnostics.
* @param site - the configuration site, for diagnostics.
* @param compat - the configured switches, when any.
* @throws Error naming the offending key.
*/
function assertOfferedCompatFields(provider, site, compat) {
	for (const [field, value] of Object.entries(compat ?? {})) {
		if (compatProtocols(field).length === 0) {
			if (Object.values(COMPAT_GATES).some((gate) => gate[field] !== void 0)) invalid(provider, `${site} sets compat "${field}", which is not configurable here: pi-ai's installed catalog sets it for the vendors that need it, so name that provider as the route instead`);
			invalid(provider, `${site} sets compat "${field}", which no wire protocol declares; the configurable switches are ${allOfferedCompatFields().join(", ")}`);
		}
		if (value == null) invalid(provider, `${site} sets compat "${field}" with no value; give it one, or remove the key to leave the field to the next layer — the installed catalog entry, then pi-ai's own detection`);
	}
}
/** An expected configuration failure that stored-catalog reads may retain for repair. */
var PiAiCatalogError = class extends Error {};
/** Report a route the deployment cannot serve, naming the settings key at fault. */
function invalid(provider, detail) {
	throw new PiAiCatalogError(`llm-pi-ai: provider "${provider}" ${detail}`);
}
/**
* The one wire protocol a catalog route's shipped models agree on. This is what
* lets a deployment add a model the installed catalog has not caught up with —
* a provider's newest release — without restating the protocol its siblings
* already use. A route whose shipped models disagree (an OpenAI-style catalog
* spanning Responses and Chat Completions) has no such answer, so a model it
* does not describe must name its protocol at the route.
*/
function sharedCatalogApi(defaults) {
	const apis = /* @__PURE__ */ new Set();
	for (const model of defaults.values()) apis.add(model.api);
	return apis.size === 1 ? [...apis][0] : void 0;
}
/**
* Resolve one model's reasoning capability from its declared efforts.
*
* A declared dict translates to pi-ai's `thinkingLevelMap` with every level
* decided explicitly: declared levels carry their wire spelling, undeclared
* levels are pinned to `null` (unsupported). Pinning matters because pi-ai's
* own defaulting is asymmetric — an absent key means "supported" for the five
* base levels but "unsupported" for `xhigh`/`max` — and a profile author
* should not need to know that. A declared `off` with no value is the one
* exception: it stays absent from the map, which pi-ai reads as "supported,
* send nothing" — the correct dispatch where not thinking is the parameter's
* absence — while `off` with a value sends that value.
* @param provider - provider route key, for diagnostics.
* @param entry - the configured model entry.
* @param base - the installed catalog entry of the same id, when one exists.
* @returns the reasoning fields the materialized model carries.
*/
function resolveModelReasoning(provider, entry, base) {
	const efforts = entry.reasoningEfforts;
	if (efforts === void 0) return { reasoning: base?.reasoning ?? false };
	if (efforts === false) return { reasoning: false };
	if (efforts === null || Object.keys(efforts).length === 0) invalid(provider, `model "${entry.id}" has an empty reasoningEfforts; declare the offered levels, set false for a non-reasoning model, or omit the field to keep the installed catalog's capability`);
	const declared = THINKING_LEVELS.flatMap((level) => {
		const wire = efforts[level];
		return wire === void 0 ? [] : [[level, wire]];
	});
	for (const [level, wire] of declared) if (wire === null) {
		if (level !== "off") invalid(provider, `model "${entry.id}" reasoningEfforts.${level} needs the wire value dispatch should send; only "off" may leave it empty`);
	} else if (wire.length === 0) invalid(provider, `model "${entry.id}" reasoningEfforts.${level} must not be an empty string`);
	if (!declared.some(([level]) => level !== "off")) invalid(provider, `model "${entry.id}" reasoningEfforts offers no level beyond "off"; declare a thinking level, or set reasoningEfforts to false for a non-reasoning model`);
	const map = {};
	for (const level of THINKING_LEVELS) {
		const wire = efforts[level];
		if (wire === void 0) map[level] = null;
		else if (wire !== null) map[level] = wire;
	}
	return {
		reasoning: true,
		thinkingLevelMap: map
	};
}
/**
* Resolve one model's compat block from the profile's switches.
*
* A model switch wins over the route switch field by field; whatever neither
* sets keeps the installed entry's value, and a field no layer decides falls
* through to pi-ai's own detection. A model-level switch its protocol does not
* take fails resolution — about one named model it can only be a mistake —
* while a route-level one skips past such models, since a route default must
* stay settable on a route whose models do not all speak one protocol. Every
* field reaching here is offered by some protocol; {@link
* assertOfferedCompatFields} has already refused the rest.
* @param provider - provider route key, for diagnostics.
* @param entry - the configured model entry.
* @param route - the route-level switches, when any.
* @param base - the installed catalog entry of the same id, when one exists.
* @param api - the model's resolved wire protocol.
* @returns a `compat` field to spread into the model, or nothing.
*/
function resolveModelCompat(provider, entry, route, base, api) {
	const gate = compatGate(api);
	const configured = {};
	for (const [field, value] of configuredCompatEntries(route)) {
		if (gate?.[field] !== "offer") continue;
		configured[field] = value;
	}
	for (const [field, value] of configuredCompatEntries(entry.compat)) {
		if (gate?.[field] !== "offer") {
			const offered = offeredCompatFields(api);
			invalid(provider, `model "${entry.id}" sets compat "${field}", but its api is "${api}", which does not take it; that switch exists on ${compatProtocols(field).join(", ")}, and "${api}" offers ${offered.length === 0 ? "no configurable compat" : offered.join(", ")}`);
		}
		configured[field] = value;
	}
	if (Object.keys(configured).length === 0) return {};
	return { compat: {
		...base?.api === api ? base.compat : void 0,
		...configured
	} };
}
/**
* Materialize one route's catalog by merging the installed catalog defaults
* under the configured entries. A route with no configured `models` serves the
* installed catalog unchanged, which is what keeps an existing
* `providers: { deepseek: { apiKeyEnv: … } }` profile working untouched.
* @param request - the route-level catalog facts.
* @param validation - strict writes reject every error; deferred reads retain model diagnostics.
* @returns the materialized models and the explicitly configured request caps.
*/
function resolveRouteModels(request, validation = "strict") {
	const { provider } = request;
	const defaults = catalogModels(provider);
	const providerBaseUrl = catalogProvider(provider)?.baseUrl;
	const configured = request.models ?? [];
	const overrides = request.modelOverrides ?? {};
	const modelErrors = /* @__PURE__ */ new Map();
	for (const [id, override] of Object.entries(overrides)) {
		if (id.length === 0) invalid(provider, "has a modelOverrides entry with an empty model id");
		if (defaults.size === 0) invalid(provider, `sets modelOverrides for "${id}", but the installed catalog does not describe this route; a declared route spells every model out in its models list`);
		if (configured.length > 0) invalid(provider, `sets modelOverrides for "${id}" beside a models list; models already replaces the served catalog, so declare the fields on its entries`);
		if (!defaults.has(id)) {
			const message = `modelOverrides names "${id}", which the installed catalog does not describe`;
			if (validation === "strict") invalid(provider, message);
			modelErrors.set(id, `llm-pi-ai: provider "${provider}" ${message}`);
		}
		if ("id" in override) invalid(provider, `modelOverrides entry "${id}" sets "id", which is the dict key`);
	}
	const entries = configured.length > 0 ? configured : [...defaults.values()].map((model) => ({
		id: model.id,
		...overrides[model.id]
	}));
	if (entries.length === 0) invalid(provider, "resolves no models; the installed catalog does not describe this route, so its models must be listed in configuration");
	const routeApi = sharedCatalogApi(defaults);
	assertOfferedCompatFields(provider, "route", request.compat);
	const seen = /* @__PURE__ */ new Set();
	const configuredMaxTokens = /* @__PURE__ */ new Map();
	const resolveEntry = (entry) => {
		assertOfferedCompatFields(provider, `model "${entry.id}"`, entry.compat);
		if (entry.id.length === 0) invalid(provider, "has a model with an empty id");
		if (seen.has(entry.id)) invalid(provider, `lists model "${entry.id}" more than once`);
		seen.add(entry.id);
		const base = defaults.get(entry.id);
		const api = request.api ?? base?.api ?? routeApi;
		if (api === void 0) invalid(provider, `model "${entry.id}" needs an api; the installed catalog does not describe it, so set the route's api to the wire protocol its endpoint speaks`);
		const baseUrl = request.baseURL ?? base?.baseUrl ?? providerBaseUrl;
		if (baseUrl === void 0) invalid(provider, `model "${entry.id}" needs a baseURL; the installed catalog does not describe this route`);
		const contextWindow = entry.contextWindow ?? base?.contextWindow ?? request.defaultContextWindow;
		if (!Number.isInteger(contextWindow) || contextWindow <= 0) invalid(provider, `model "${entry.id}" contextWindow must be a positive integer`);
		const maxTokens = entry.maxTokens ?? base?.maxTokens ?? request.defaultMaxTokens;
		if (!Number.isInteger(maxTokens) || maxTokens <= 0) invalid(provider, `model "${entry.id}" maxTokens must be a positive integer`);
		if (entry.maxTokens !== void 0) configuredMaxTokens.set(entry.id, entry.maxTokens);
		return {
			...base,
			id: entry.id,
			name: entry.name ?? base?.name ?? entry.id,
			api,
			provider,
			baseUrl,
			input: declaredInput(entry.input) ?? base?.input ?? [...request.defaultInput],
			cost: base?.cost ?? NO_COST,
			contextWindow,
			maxTokens,
			...resolveModelReasoning(provider, entry, base),
			...resolveModelCompat(provider, entry, request.compat, base, api)
		};
	};
	const models = [];
	for (const entry of entries) {
		let model;
		try {
			model = resolveEntry(entry);
		} catch (error) {
			if (validation === "strict" || !(error instanceof PiAiCatalogError)) throw error;
			modelErrors.set(entry.id, error.message);
			continue;
		}
		models.push(model);
	}
	const serviceableModels = models.filter((model) => !modelErrors.has(model.id));
	for (const [field] of configuredCompatEntries(request.compat)) {
		const takers = compatProtocols(field);
		if (serviceableModels.some((model) => takers.includes(model.api))) continue;
		invalid(provider, `sets compat "${field}", but no model on the route speaks a protocol that takes it; it exists on ${takers.join(", ")}`);
	}
	return {
		models: serviceableModels,
		configuredMaxTokens,
		modelErrors
	};
}
//#endregion
//#region lib/types/provider.js
/**
* Construction of the pi-ai `Provider` that one configured route registers into
* the adapter's `Models` collection.
*
* Two constructions, one decision: a route the installed catalog ships, whose
* profile does not override the wire protocol, **reuses that catalog provider**
* with its models replaced — the catalog provider owns API implementations this
* package cannot reconstruct (Bedrock loads its Smithy module through a
* separate entry point), so rebuilding it from parts would silently narrow
* which providers work. Every other route — one pi-ai has never heard of, or a
* catalog route pointed at a different protocol — is built by `createProvider`
* over the protocol table below.
*
* Credentials never reach this module's storage: the harness resolves a route's
* key through `ctx.credentials` before the request enters pi-ai and hands it
* over as a stream option, which `Models` presents to `resolve()` as the
* credential key.
*
* @module dsh-llm-pi-ai/provider
*/
/**
* Wire protocols a configured route may name, mapped to pi-ai's lazily loaded
* implementations. Each entry is the factory that pi-ai's matching provider
* factory uses, so a hand-declared route reaches exactly the implementation a
* catalog route would.
*
* The table is deliberately narrow: the protocols a hand-declared route
* actually reads, each completely describable with a key, an
* endpoint, and headers. Bedrock signs with SigV4 over AWS credentials and a
* region, Vertex needs a project, a location, and application-default
* credentials, Azure needs provider environment plus an api-version, and Codex
* authenticates through OAuth — none of which this configuration shape can
* express, so offering them would hand back a provider that cannot
* authenticate. The remainder are absent for want of a consumer rather than a
* blocker: each is one line here once a deployment needs it. Catalog routes
* still reach every protocol through their own provider; only an explicit
* override is refused.
*/
const PROTOCOLS = {
	"openai-completions": openAICompletionsApi,
	"openai-responses": openAIResponsesApi,
	"anthropic-messages": anthropicMessagesApi
};
/**
* Every wire protocol a configured route may name, most-reached first. The
* order is the table's and therefore stable; a configuration surface offering
* a choice presents the first as its default, which is why the protocol a
* hand-declared gateway most often speaks — and the one endpoint interrogation
* can read — leads.
* @returns the supported protocol identifiers.
*/
function supportedProtocols() {
	return Object.keys(PROTOCOLS);
}
/**
* Api-key auth for a route the harness authenticates itself. `Models` calls
* this after the adapter has already resolved the route's credential, so a
* missing key here is not this layer's failure: a named-but-unresolvable
* reference has already failed the request with `MISSING_CREDENTIAL`, and a
* route naming no credential at all is deliberately unauthenticated. Reporting
* it as configured hands the decision to the protocol, which is where the
* requirement actually lives — pi-ai's OpenAI-compatible implementation, for
* one, still insists on a key or an `Authorization` header of its own.
* @param name - display name used as the resolution's status label.
* @returns the api-key auth for a harness-authenticated route.
*/
function harnessApiKeyAuth(name) {
	return {
		name,
		resolve: ({ credential }) => Promise.resolve({
			auth: credential?.key === void 0 ? {} : { apiKey: credential.key },
			source: name
		})
	};
}
/**
* The auth one route resolves its credential through.
*
* A catalog route keeps the installed provider's own auth, which is what
* preserves provider-native ambient discovery for a profile naming no
* credential. That holds even when the profile repoints the protocol: which
* environment a provider reads is a property of the provider, not of the wire
* format its models speak.
*
* The single addition covers a catalog provider that offers no api-key method
* at all. pi-ai resolves a request's `apiKey` override only when the provider
* declares one (`resolveProviderAuth` checks `provider.auth.apiKey` before
* honouring the override), so an OAuth-only provider — `openai-codex` is the
* one the installed catalog ships — would refuse a profile's explicit key with
* `Provider is not configured` before any request went out. Adding the harness
* method beside the provider's own restores that route. A keyless profile adds
* nothing and still reports the honest refusal, because this adapter resolves
* credentials through its own seam and holds no OAuth store to fall back on.
* @param spec - the resolved route facts.
* @param catalog - the installed catalog provider, when pi-ai ships one.
* @returns the auth to construct this route's provider with.
*/
function routeAuth(spec, catalog) {
	if (catalog === void 0) return { apiKey: harnessApiKeyAuth(spec.displayName) };
	if (catalog.auth.apiKey !== void 0 || !spec.namesCredential) return catalog.auth;
	return {
		...catalog.auth,
		apiKey: harnessApiKeyAuth(spec.displayName)
	};
}
/**
* Reuse an installed catalog provider with this route's models and identity.
* Model dispatch stays with the catalog provider, so its API implementations,
* compatibility quirks, and ambient credential discovery are preserved exactly.
* Catalog-owned dynamic refresh is dropped: this route's catalog is the
* settings document, and a background refresh would contradict it.
*/
function reuseCatalogProvider(base, spec) {
	const baseUrl = spec.baseURL ?? base.baseUrl;
	return {
		id: spec.provider,
		name: spec.displayName,
		...baseUrl === void 0 ? {} : { baseUrl },
		auth: routeAuth(spec, base),
		getModels: () => spec.models,
		stream: (model, context, options) => base.stream(model, context, options),
		streamSimple: (model, context, options) => base.streamSimple(model, context, options)
	};
}
/**
* Build the pi-ai provider for one resolved route.
* @param spec - the resolved route facts.
* @returns the provider to register in the adapter's `Models` collection.
* @throws Error when the route names a wire protocol this build cannot serve.
*/
function buildProvider(spec) {
	const catalog = catalogProvider(spec.provider);
	if (catalog !== void 0 && spec.api === void 0) return reuseCatalogProvider(catalog, spec);
	const factory = spec.api === void 0 ? void 0 : PROTOCOLS[spec.api];
	if (factory === void 0) throw new PiAiCatalogError(`llm-pi-ai: provider "${spec.provider}" names api "${spec.api}", which this build cannot serve; supported protocols are ${supportedProtocols().join(", ")}`);
	return createProvider({
		id: spec.provider,
		name: spec.displayName,
		...spec.baseURL === void 0 ? {} : { baseUrl: spec.baseURL },
		auth: routeAuth(spec, catalog),
		models: spec.models,
		api: factory()
	});
}
//#endregion
//#region lib/types/config.js
/**
* Configuration schema and provider-profile validation for the pi-ai adapter.
* Profiles are a dict keyed by provider route, so the composition base and a
* user-settings layer merge per provider and the route set is structural.
*
* A route key is not required to name an installed pi-ai provider. When it does,
* that provider's endpoint, protocol, display name, and model catalog are the
* profile's defaults and the profile overrides them field by field; when it does
* not, the profile is the whole provider declaration. Stored reads retain
* catalog diagnostics beside serviceable models; writes validate every changed
* provider before persistence. Self-contained profile constraints apply to both.
*
* @module dsh-llm-pi-ai/config
*/
/** Default maximum idle interval while an adapter stream read is outstanding. */
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 3e5;
/**
* Default request-level bound on base64-encoded image payload. Every image in
* history is re-encoded into every request body, so an unbounded conversation
* eventually exceeds a provider or gateway request-size cap and the session
* can never complete another request. The 20MiB default admits fifteen 1MiB
* request versions after base64 expansion and reserves request capacity for
* system prompts, history, tools, and JSON.
* Deployments behind stricter gateways lower it per route.
*/
const DEFAULT_MAX_REQUEST_IMAGE_BYTES = 20 * 1024 * 1024;
/** Default total-pixel budget preserves the complete 2048px normalized attachment. */
const DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET = 2048 * 2048;
/** Default raw encoded-byte target before inline base64 expansion; the smallest quality-ladder output is used when no quality fits. */
const DEFAULT_REQUEST_IMAGE_MAX_BYTES = 1024 * 1024;
/** Context capacity assumed for a model neither configuration nor the catalog sizes. */
const DEFAULT_CONTEXT_WINDOW = 262144;
/** Output capability assumed for a model neither configuration nor the catalog sizes. */
const DEFAULT_MAX_TOKENS = 32768;
/**
* Modalities assumed for a model neither configuration nor the catalog
* declares. Text is the floor every supported protocol certainly carries, so
* this is the absence of a declaration rather than a guess at the endpoint:
* nothing can interrogate a gateway for its modalities, and the two wrong
* answers do not cost the same. Under-claiming refuses the image before it is
* attached, naming the model. Over-claiming admits one the provider then
* rejects mid-turn, after the message is durable, leaving the session
* repeating a request that cannot succeed.
*/
const DEFAULT_INPUT = ["text"];
const thinkingBudgets = z.object({
	minimal: z.number(),
	low: z.number(),
	medium: z.number(),
	high: z.number()
});
/**
* One `chat_template_kwargs` or `chat_template_args` value. The `$var` member
* is pi-ai's placeholder for a value dispatch fills from the request's
* thinking state, which makes a template-driven gateway configurable without
* restating its template.
*/
const chatTemplateKwarg = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.const(null),
	z.object({
		$var: z.union(CHAT_TEMPLATE_VARS).required(),
		omitWhenOff: z.boolean()
	})
]);
const compatProfile = z.object({
	supportsStore: z.boolean(),
	supportsDeveloperRole: z.boolean(),
	supportsReasoningEffort: z.boolean(),
	supportsUsageInStreaming: z.boolean(),
	supportsFinishReason: z.boolean(),
	maxTokensField: z.union(MAX_TOKENS_FIELDS),
	requiresToolResultName: z.boolean(),
	requiresAssistantAfterToolResult: z.boolean(),
	requiresThinkingAsText: z.boolean(),
	requiresReasoningContentOnAssistantMessages: z.boolean(),
	thinkingFormat: z.union(SUPPORTED_THINKING_FORMATS),
	chatTemplateKwargs: z.dict(chatTemplateKwarg),
	chatTemplateArgs: z.dict(chatTemplateKwarg),
	supportsThinkingTokenBudget: z.boolean(),
	thinkingTokenBudgetField: z.union(THINKING_TOKEN_BUDGET_FIELDS),
	vllmPriority: z.number().step(1),
	supportsMaxOutputTokens: z.boolean(),
	supportsStrictMode: z.boolean(),
	cacheControlFormat: z.union(CACHE_CONTROL_FORMATS),
	supportsLongCacheRetention: z.boolean(),
	supportsEagerToolInputStreaming: z.boolean(),
	supportsCacheControlOnTools: z.boolean(),
	supportsTemperature: z.boolean(),
	forceAdaptiveThinking: z.boolean(),
	allowEmptySignature: z.boolean(),
	supportsStrictTools: z.boolean()
});
/**
* Keys are the offered levels, values their wire spellings. A valueless key
* (`off:`) survives validation because schemastery passes nullable data
* through before any member schema runs — `z.const(null)` only controls the
* error for non-null wrong values and what a configuration UI renders.
* Only resolution decides which levels may leave the value empty, so the
* diagnostic can name the route and model. The assertion narrows
* schemastery's `Dict`, which types every literal key as required; dict
* validation checks only present keys, so the runtime value is a partial record.
*/
const reasoningEfforts = z.dict(z.union([z.string(), z.const(null)]), z.union(THINKING_LEVELS));
/** The fields a `models` entry and a `modelOverrides` value share; only the id's home differs. */
const modelFields = {
	name: z.string(),
	contextWindow: z.number().step(1).min(1),
	maxTokens: z.number().step(1).min(1),
	input: z.array(z.union(MODALITIES)),
	reasoningEfforts: z.union([z.const(false), reasoningEfforts]),
	compat: compatProfile
};
const modelProfile = z.object({
	id: z.string().required(),
	...modelFields
});
/** A {@link modelProfile} whose id lives in the `modelOverrides` dict key. */
const modelOverride = z.object(modelFields);
const profile = z.object({
	apiKeyEnv: z.string().role("credential-ref"),
	displayName: z.string(),
	api: z.union(supportedProtocols()),
	baseURL: z.string(),
	models: z.array(modelProfile),
	modelOverrides: z.dict(modelOverride),
	compat: compatProfile,
	defaultContextWindow: z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW),
	defaultMaxTokens: z.number().step(1).min(1).default(DEFAULT_MAX_TOKENS),
	defaultInput: z.array(z.union(MODALITIES)).default([...DEFAULT_INPUT]),
	headers: z.dict(z.string()),
	reasoning: z.union(THINKING_LEVELS),
	thinkingBudgets,
	cacheRetention: z.union([
		"none",
		"short",
		"long"
	]),
	transport: z.union([
		"sse",
		"websocket",
		"websocket-cached",
		"auto"
	]),
	timeoutMs: z.natural(),
	websocketConnectTimeoutMs: z.natural(),
	streamIdleTimeoutMs: z.number().min(Number.MIN_VALUE).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TIMEOUT_MS),
	maxRequestImageBytes: z.number().step(1).min(1).default(DEFAULT_MAX_REQUEST_IMAGE_BYTES),
	requestImagePixelBudget: z.number().step(1).min(1).default(DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET),
	requestImageMaxBytes: z.number().step(1).min(1).default(DEFAULT_REQUEST_IMAGE_MAX_BYTES),
	retryPolicy: RetryPolicySchema
});
/** Runtime schema for {@link Config}. */
const Config = z.object({ providers: z.dict(profile).default({}) });
/**
* Reject new or changed provider profiles that cannot be served. Unchanged
* stored profiles may need repair after a catalog upgrade and do not block
* edits to another provider. Removed profiles require no catalog validation.
* @param config - the resolved section to check.
* @param previous - current resolved section; omission checks every provider.
* @throws Error naming the route and configuration entry that cannot be served.
*/
function assertServiceable(config, previous) {
	resolveProfiles(Object.fromEntries(Object.entries(config.providers ?? {}).filter(([provider, profile]) => !deepEqualJson(profile, previous?.providers?.[provider]))));
}
/** Reject removed pre-release profile fields and name their replacements. */
function rejectRemovedFields(provider, source) {
	const legacy = source;
	if ("provider" in legacy) throw new Error(`llm-pi-ai: provider "${provider}" sets "provider", which moved to the providers dict key`);
	if ("maxRetries" in legacy || "maxRetryDelayMs" in legacy) throw new Error(`llm-pi-ai: provider "${provider}" sets maxRetries or maxRetryDelayMs, which were removed; compose agent recovery with dsh-llm-retry`);
}
/** Reject a profile header that Fetch cannot put on a provider request. */
function assertValidHeaders(provider, headers) {
	for (const [name, value] of Object.entries(headers ?? {})) try {
		new Headers([[name, value]]);
	} catch {
		throw new Error(`llm-pi-ai: provider "${provider}" header "${name}" is not valid for Fetch; use a valid HTTP field name and a single-line value representable as bytes`);
	}
}
/**
* Resolve scalar defaults and materialize each route's serviceable models.
* Deferred catalog validation retains diagnostics without deleting configured
* routes. An omitted dict resolves to the empty, dormant route set.
* @param providers - configured provider profiles keyed by route.
* @param validation - writes require a complete catalog; stored reads retain catalog diagnostics.
* @returns validated profiles in configuration order.
*/
function resolveProfiles(providers, validation = "strict") {
	if (Array.isArray(providers)) throw new Error("llm-pi-ai: providers is now a dict keyed by provider route, not an array of profiles");
	const entries = Object.entries(providers ?? {});
	const resolved = /* @__PURE__ */ new Map();
	for (const [provider, source] of entries) {
		rejectRemovedFields(provider, source);
		if (provider.length === 0) throw new Error("llm-pi-ai: provider names must be non-empty");
		if (source.baseURL !== void 0 && source.baseURL.length === 0) throw new Error(`llm-pi-ai: provider "${provider}" has an empty baseURL`);
		if (source.displayName !== void 0 && source.displayName.length === 0) throw new Error(`llm-pi-ai: provider "${provider}" has an empty displayName`);
		assertValidHeaders(provider, source.headers);
		const streamIdleTimeoutMs = source.streamIdleTimeoutMs ?? 3e5;
		if (!Number.isFinite(streamIdleTimeoutMs) || streamIdleTimeoutMs <= 0 || streamIdleTimeoutMs > MAX_TIMER_DELAY_MS) throw new Error(`llm-pi-ai: provider "${provider}" streamIdleTimeoutMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
		const maxRequestImageBytes = source.maxRequestImageBytes ?? 20971520;
		if (!Number.isInteger(maxRequestImageBytes) || maxRequestImageBytes <= 0) throw new Error(`llm-pi-ai: provider "${provider}" maxRequestImageBytes must be a positive integer`);
		const requestImagePixelBudget = source.requestImagePixelBudget ?? 4194304;
		if (!Number.isSafeInteger(requestImagePixelBudget) || requestImagePixelBudget <= 0) throw new Error(`llm-pi-ai: provider "${provider}" requestImagePixelBudget must be a positive safe integer`);
		const requestImageMaxBytes = source.requestImageMaxBytes ?? 1048576;
		if (!Number.isSafeInteger(requestImageMaxBytes) || requestImageMaxBytes <= 0) throw new Error(`llm-pi-ai: provider "${provider}" requestImageMaxBytes must be a positive safe integer`);
		const defaultInput = [...source.defaultInput ?? DEFAULT_INPUT];
		if (defaultInput.length === 0) throw new Error(`llm-pi-ai: provider "${provider}" defaultInput must name at least one modality`);
		const displayName = source.displayName ?? provider;
		let catalog;
		let piProvider;
		let catalogError;
		try {
			catalog = resolveRouteModels({
				provider,
				...source.api === void 0 ? {} : { api: source.api },
				...source.baseURL === void 0 ? {} : { baseURL: source.baseURL },
				...source.models === void 0 ? {} : { models: source.models },
				...source.modelOverrides === void 0 ? {} : { modelOverrides: source.modelOverrides },
				...source.compat === void 0 ? {} : { compat: source.compat },
				defaultInput,
				defaultContextWindow: source.defaultContextWindow ?? 262144,
				defaultMaxTokens: source.defaultMaxTokens ?? 32768
			}, validation);
			catalogError = catalog.modelErrors.values().next().value;
			piProvider = buildProvider({
				provider,
				displayName,
				...source.api === void 0 ? {} : { api: source.api },
				...source.baseURL === void 0 ? {} : { baseURL: source.baseURL },
				models: catalog.models,
				namesCredential: source.apiKeyEnv !== void 0
			});
		} catch (error) {
			if (validation === "strict" || !(error instanceof PiAiCatalogError)) throw error;
			catalogError ??= error.message;
		}
		const { apiKeyEnv, retryPolicy, models: _models, displayName: _displayName, ...rest } = source;
		resolved.set(provider, {
			...rest,
			provider,
			displayName,
			...apiKeyEnv === void 0 ? {} : { apiKeyEnv: credentialRef(apiKeyEnv) },
			streamIdleTimeoutMs,
			maxRequestImageBytes,
			requestImagePixelBudget,
			requestImageMaxBytes,
			retryPolicy: resolveRetryPolicy(retryPolicy, `llm-pi-ai: provider "${provider}" retryPolicy`),
			...rest.headers === void 0 ? {} : { headers: { ...rest.headers } },
			...rest.thinkingBudgets === void 0 ? {} : { thinkingBudgets: { ...rest.thinkingBudgets } },
			configuredMaxTokens: catalog?.configuredMaxTokens ?? /* @__PURE__ */ new Map(),
			modelErrors: catalog?.modelErrors ?? /* @__PURE__ */ new Map(),
			...piProvider === void 0 ? {} : { piProvider },
			...catalogError === void 0 ? {} : { catalogError }
		});
	}
	return resolved;
}
//#endregion
//#region lib/types/context.js
/**
* Harness request-history conversion into pi-ai's Context vocabulary.
*
* @module dsh-llm-pi-ai/context
*/
/** Join the text blocks of a harness message. */
function flattenText(message) {
	return message.content.filter((block) => block.type === "text").map((block) => block.text).join("");
}
/** Flatten text recursively inside one tool result. */
function toolResultText(blocks) {
	return blocks.map((block) => block.type === "text" ? block.text : block.type === "tool-result" ? toolResultText(block.content) : "").join("");
}
/** Reject image roles that pi-ai cannot replay before request-size offloading can replace them. */
function assertSupportedImageRoles(messages) {
	for (const message of messages) if (message.role !== "user" && contentHasImage(message.content)) throw new LlmError(`pi-ai cannot represent an image in an in-history ${message.role} message`, "UNSUPPORTED_CONTENT");
}
async function userContent(blocks, requestImages, resolveImageAccess) {
	const content = [];
	for (const block of blocks) switch (block.type) {
		case "text":
			if (block.text.length > 0) content.push({
				type: "text",
				text: block.text
			});
			break;
		case "image": {
			const version = requestImages.get(block.attachment.attachmentId);
			content.push({
				type: "text",
				text: requestImageHandleText(block.attachment, version, resolveImageAccess(block.attachment))
			});
			content.push({
				type: "image",
				data: Buffer.from(version.data).toString("base64"),
				mimeType: version.mediaType
			});
			break;
		}
		case "tool-result":
			{
				const nested = await userContent(block.content, requestImages, resolveImageAccess);
				if (typeof nested === "string") {
					if (nested.length > 0) content.push({
						type: "text",
						text: nested
					});
				} else content.push(...nested);
			}
			break;
		default: break;
	}
	if (content.every((block) => block.type === "text")) return content.map((block) => block.text).join("");
	return content;
}
function collectImageRefs(blocks, refs) {
	for (const block of blocks) if (block.type === "image") refs.set(block.attachment.attachmentId, block.attachment);
	else if (block.type === "tool-result") collectImageRefs(block.content, refs);
}
async function prepareRequestImages(messages, attachments, policy, signal) {
	const refs = /* @__PURE__ */ new Map();
	for (const message of messages) collectImageRefs(message.content, refs);
	const orderedRefs = [...refs.values()];
	const prepared = await Promise.all(orderedRefs.map((ref) => attachments.readImageRequest(ref, policy, signal)));
	const versions = /* @__PURE__ */ new Map();
	for (const [index, ref] of orderedRefs.entries()) versions.set(ref.attachmentId, prepared[index]);
	return versions;
}
function toolsOf(options) {
	return options.tools?.map((tool) => ({
		name: tool.name,
		description: tool.description,
		parameters: tool.parameters
	}));
}
/**
* Select the pi-ai `systemPrompt` source shared by both conversion paths.
* `options.system` wins when defined and every history message converts,
* including a leading `system` message, which then folds into a `user`
* message. Otherwise a leading `system` history message supplies the prompt
* and leaves the converted history; empty leading text sends no prompt.
*/
function splitSystemPrompt(options) {
	if (options.system !== void 0) return {
		systemPrompt: options.system,
		messages: options.messages
	};
	const [first, ...rest] = options.messages;
	if (first?.role !== "system") return {
		systemPrompt: void 0,
		messages: options.messages
	};
	const text = flattenText(first);
	return {
		systemPrompt: text.length > 0 ? text : void 0,
		messages: rest
	};
}
/** Assemble the request-level pi-ai context envelope shared by both conversion paths. */
function piContext(systemPrompt, options, messages) {
	const tools = toolsOf(options);
	return {
		...systemPrompt !== void 0 ? { systemPrompt } : {},
		messages,
		...tools !== void 0 && tools.length > 0 ? { tools } : {}
	};
}
function appendAssistant(message, messages, toolNames, onReplayDegrade) {
	const assistant = toPiAssistant(message, onReplayDegrade);
	for (const block of assistant.content) if (block.type === "toolCall") toolNames.set(brandString(block.id), block.name);
	messages.push(assistant);
}
function textOnlyContext(options, onReplayDegrade) {
	assertSupportedImageRoles(options.messages);
	const split = splitSystemPrompt(options);
	const toolNames = /* @__PURE__ */ new Map();
	const messages = [];
	for (const message of split.messages) {
		if (contentHasImage(message.content)) throw new LlmError("pi-ai image conversion requires the durable attachment service", "UNSUPPORTED_CONTENT");
		if (message.role === "system") {
			messages.push({
				role: "user",
				content: flattenText(message),
				timestamp: 0
			});
			continue;
		}
		if (message.role === "assistant") {
			appendAssistant(message, messages, toolNames, onReplayDegrade);
			continue;
		}
		const text = flattenText(message);
		const results = message.content.filter((block) => block.type === "tool-result");
		if (text.length > 0 || results.length === 0) messages.push({
			role: "user",
			content: text,
			timestamp: 0
		});
		for (const result of results) messages.push({
			role: "toolResult",
			toolCallId: result.toolCallId,
			toolName: toolNames.get(result.toolCallId) ?? "unknown",
			content: [{
				type: "text",
				text: toolResultText(result.content) || "(no output)"
			}],
			isError: result.isError ?? false,
			timestamp: 0
		});
	}
	return piContext(split.systemPrompt, options, messages);
}
function toPiContext(options, images, onReplayDegrade) {
	return images === void 0 ? textOnlyContext(options, onReplayDegrade) : toPiContextWithImages(options, images, onReplayDegrade);
}
async function toPiContextWithImages(options, images, onReplayDegrade) {
	const { attachments, resolveImageAccess, maxRequestImageBytes } = images;
	const requestImagePolicy = images.requestImagePolicy ?? {
		maxPixels: 4194304,
		maxBytes: 1048576
	};
	assertSupportedImageRoles(options.messages);
	const split = splitSystemPrompt(options);
	const requestMessages = offloadRequestImagesWithPolicy(split.messages, {
		representation: "base64",
		...maxRequestImageBytes === void 0 ? {} : { maxBytes: maxRequestImageBytes },
		byteQuantum: 1,
		byteLength: (ref) => Math.min(ref.bytes, requestImagePolicy.maxBytes),
		placeholder: (ref) => offloadedImageText(ref, resolveImageAccess(ref))
	});
	const requestImages = await prepareRequestImages(requestMessages, attachments, requestImagePolicy, options.signal);
	const exactMessages = offloadRequestImagesWithPolicy(requestMessages, {
		representation: "base64",
		...maxRequestImageBytes === void 0 ? {} : { maxBytes: maxRequestImageBytes },
		byteQuantum: 1,
		byteLength: (ref) => requestImages.get(ref.attachmentId).bytes,
		placeholder: (ref) => offloadedImageText(ref, resolveImageAccess(ref))
	});
	const toolNames = /* @__PURE__ */ new Map();
	const messages = [];
	for (const message of exactMessages) {
		if (message.role === "system") {
			messages.push({
				role: "user",
				content: flattenText(message),
				timestamp: 0
			});
			continue;
		}
		if (message.role === "assistant") {
			appendAssistant(message, messages, toolNames, onReplayDegrade);
			continue;
		}
		const content = await userContent(message.content.filter((block) => block.type !== "tool-result"), requestImages, resolveImageAccess);
		const results = message.content.filter((block) => block.type === "tool-result");
		if (content.length > 0 || results.length === 0) messages.push({
			role: "user",
			content,
			timestamp: 0
		});
		for (const result of results) {
			const resultContent = await userContent(result.content, requestImages, resolveImageAccess);
			messages.push({
				role: "toolResult",
				toolCallId: result.toolCallId,
				toolName: toolNames.get(result.toolCallId) ?? "unknown",
				content: typeof resultContent === "string" ? [{
					type: "text",
					text: resultContent || "(no output)"
				}] : resultContent,
				isError: result.isError ?? false,
				timestamp: 0
			});
		}
	}
	return piContext(split.systemPrompt, options, messages);
}
//#endregion
//#region lib/types/stream.js
/**
* pi-ai assistant event translation into the Harness streaming protocol.
*
* pi-ai tool-call arguments are parsed objects while the Harness keeps their
* raw JSON representation. pi-ai also reports failures as terminal stream
* events, which this module maps into Harness finish chunks.
*
* @module dsh-llm-pi-ai/stream
*/
/**
* Map pi-ai usage (reasoning folded into output by pi-ai).
* @param usage - cumulative usage from the terminal pi-ai event.
* @returns harness counts with pi-ai's exact total; cache fields appear only
*   when non-zero (pi-ai reports zeros, not absence).
*/
function mapUsage(usage) {
	return {
		inputTokens: usage.input,
		outputTokens: usage.output,
		totalTokens: usage.totalTokens,
		...usage.cacheRead > 0 ? { cacheReadTokens: usage.cacheRead } : {},
		...usage.cacheWrite > 0 ? { cacheWriteTokens: usage.cacheWrite } : {}
	};
}
function classifyPiAiError(message) {
	if (/\b(?:401|403)\b/.test(message)) return "AUTH";
	if (isQuotaExceededError(message)) return QUOTA_EXCEEDED_CODE;
	if (/\b429\b|rate.?limit/i.test(message)) return "RATE_LIMIT";
	if (/\b413\b|failed to buffer the request body:\s*length limit exceeded|payload too large|request body too large/i.test(message)) return "INVALID_REQUEST";
	if (/\b400\b|invalid.?request/i.test(message)) return "INVALID_REQUEST";
	if (/\b5\d\d\b/.test(message)) return "SERVER";
	if (/\btime(?:d)?\s*out\b|timeout/i.test(message)) return "TIMEOUT";
	if (/stream ended (?:before|without)\b/i.test(message)) return "TRANSPORT";
	if (/\b(?:network|connection|socket|fetch)\b|\bECONN[A-Z]+\b/i.test(message) || /\b(?:other side closed|HTTP2 request did not get a response|WebSocket closed unexpectedly)\b/i.test(message) || /\bterminated\b|premature close/i.test(message)) return "TRANSPORT";
	return "PI_AI_ERROR";
}
/**
* Map a terminal pi-ai event to the harness finish reason.
* @param message - the assistant message carried by the `done` or `error` event.
* @param contextWindow - resolved catalog capacity for usage-based overflow detection.
* @returns the mapped harness reason. Recognized error text, `stop` usage above
*   `contextWindow`, and zero-output `length` usage that fills the window map
*   to `CONTEXT_WINDOW_EXCEEDED`; a `stop` with no content blocks maps to an
*   `EMPTY_RESPONSE` error, while terminal `pending` and `deferred` states map
*   to non-retryable `PI_AI_ERROR` failures.
*/
function mapStopReason(message, contextWindow) {
	const piAiOverflow = isContextOverflow(message, contextWindow);
	const harnessOverflow = message.stopReason === "error" && message.errorMessage !== void 0 && isContextWindowExceededError(message.errorMessage);
	if (piAiOverflow || harnessOverflow) return {
		kind: "error",
		failure: {
			message: message.errorMessage ?? `pi-ai detected context overflow for model "${message.model}"`,
			code: CONTEXT_WINDOW_EXCEEDED_CODE
		}
	};
	switch (message.stopReason) {
		case "stop":
			if (message.content.length === 0) return {
				kind: "error",
				failure: {
					message: `model "${message.model}" returned a completed response with no content`,
					code: EMPTY_RESPONSE_CODE
				}
			};
			return { kind: "stop" };
		case "length": return { kind: "max-tokens" };
		case "toolUse": return { kind: "tool-calls" };
		case "pending": return {
			kind: "error",
			failure: {
				message: `pi-ai stream for model "${message.model}" ended pending`,
				code: "PI_AI_ERROR"
			}
		};
		case "deferred": return {
			kind: "error",
			failure: {
				message: `pi-ai deferred response for model "${message.model}" is not supported`,
				code: "PI_AI_ERROR"
			}
		};
		case "aborted": return {
			kind: "aborted",
			failure: {
				message: message.errorMessage ?? "pi-ai stream aborted",
				code: "ABORTED"
			}
		};
		case "error": {
			const text = message.errorMessage ?? "pi-ai stream error";
			return {
				kind: "error",
				failure: {
					message: text,
					code: classifyPiAiError(text)
				}
			};
		}
	}
}
/**
* Translate the pi-ai event stream into StreamChunks. pi-ai never throws
* mid-stream — failures arrive as `error` events, which become error/aborted
* `finish` chunks (the harness protocol's other error-delivery style).
* @param events - one assistant turn's pi-ai event stream.
* @param contextWindow - resolved catalog capacity for usage-based overflow detection.
* @param callerSignal - caller cancellation state; an aborted caller makes any
*   in-band terminal error an aborted finish.
* @param requestedModel - request model identity for durable replay provenance.
* @returns the harness chunks, ending with `usage` then `finish`; throws
*   `LlmError` (`STREAM_CLOSED`) if the source ends without a terminal event.
*/
async function* toStreamChunks(events, contextWindow, callerSignal, requestedModel) {
	const toolIds = /* @__PURE__ */ new Map();
	for await (const event of events) switch (event.type) {
		case "start": break;
		case "text_start":
			yield {
				type: "block-start",
				index: event.contentIndex,
				blockType: "text"
			};
			break;
		case "text_delta":
			yield {
				type: "text-delta",
				index: event.contentIndex,
				text: event.delta
			};
			break;
		case "text_end":
			yield {
				type: "block-end",
				index: event.contentIndex,
				block: {
					type: "text",
					text: event.content
				}
			};
			break;
		case "thinking_start":
			yield {
				type: "block-start",
				index: event.contentIndex,
				blockType: "reasoning"
			};
			break;
		case "thinking_delta":
			yield {
				type: "reasoning-delta",
				index: event.contentIndex,
				text: event.delta
			};
			break;
		case "thinking_end":
			yield {
				type: "block-end",
				index: event.contentIndex,
				block: {
					type: "reasoning",
					text: event.content
				}
			};
			break;
		case "toolcall_start": {
			const partial = event.partial.content[event.contentIndex];
			const id = partial?.type === "toolCall" ? partial.id : "";
			const name = partial?.type === "toolCall" ? partial.name : "";
			toolIds.set(event.contentIndex, {
				id,
				name
			});
			yield {
				type: "block-start",
				index: event.contentIndex,
				blockType: "tool-call"
			};
			break;
		}
		case "toolcall_delta": {
			const known = toolIds.get(event.contentIndex);
			yield {
				type: "tool-call-delta",
				index: event.contentIndex,
				id: brandString(known?.id ?? ""),
				...known?.name !== void 0 && known.name.length > 0 ? { name: known.name } : {},
				argumentsDelta: event.delta
			};
			break;
		}
		case "toolcall_end":
			yield {
				type: "block-end",
				index: event.contentIndex,
				block: {
					type: "tool-call",
					id: brandString(event.toolCall.id),
					name: event.toolCall.name,
					arguments: JSON.stringify(event.toolCall.arguments)
				}
			};
			break;
		case "done":
			yield {
				type: "usage",
				usage: mapUsage(event.message.usage)
			};
			yield {
				type: "finish",
				reason: mapStopReason(event.message, contextWindow),
				replayState: toPiReplayState(event.message, requestedModel)
			};
			return;
		case "error":
			yield {
				type: "usage",
				usage: mapUsage(event.error.usage)
			};
			yield {
				type: "finish",
				reason: mapStopReason(callerSignal?.aborted ? {
					...event.error,
					stopReason: "aborted"
				} : event.error, contextWindow)
			};
			return;
	}
	throw new LlmError("pi-ai event stream ended without done/error", "STREAM_CLOSED");
}
//#endregion
//#region lib/types/adapter.js
/**
* Generic pi-ai-backed implementation of the Harness LLM seam.
*
* Each resolution produces one **immutable** snapshot — the profiles plus a
* `Models` collection holding the `Provider` each route built — and an
* operation captures a whole snapshot before its first `await`. A
* configuration change builds a *new* collection rather than mutating the one
* in use, because `Models.streamSimple()` is lazy: it resolves the provider
* when the stream is first consumed, which is after the credential await, so a
* mutated collection would let a request that started under one configuration
* finish under another — or fail with a provider that no longer exists. This is
* what makes the seam's per-step call freeze (`llm.prepareCall()`) hold all the
* way down: switching models mid-reply takes effect on the next step, never
* inside the one in flight.
*
* A route naming a credential reference still resolves it through the harness
* seam and passes it as the request's `apiKey` option, which pi-ai treats as
* the highest-priority auth override — that is what keeps the fail-loud
* reference semantics. Everything that override does not cover reaches pi-ai
* through the collection's own auth: the credential store holds the records a
* login wrote and a refresh rotates, and the auth context answers the ambient
* questions a provider asks while resolving. Both are stable across snapshots,
* so a configuration change rebuilds the collection without forgetting who is
* signed in.
*
* @module dsh-llm-pi-ai/adapter
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
/** Copy profile stream knobs into pi-ai's common option vocabulary. */
function profileOptions(profile, reasoning, apiKey) {
	const enabledReasoning = reasoning === "off" ? void 0 : reasoning;
	return {
		...apiKey === void 0 ? {} : { apiKey },
		...enabledReasoning === void 0 ? {} : { reasoning: enabledReasoning },
		...profile.thinkingBudgets === void 0 ? {} : { thinkingBudgets: profile.thinkingBudgets },
		...profile.cacheRetention === void 0 ? {} : { cacheRetention: profile.cacheRetention },
		...profile.transport === void 0 ? {} : { transport: profile.transport },
		...profile.timeoutMs === void 0 ? {} : { timeoutMs: profile.timeoutMs },
		...profile.websocketConnectTimeoutMs === void 0 ? {} : { websocketConnectTimeoutMs: profile.websocketConnectTimeoutMs },
		maxRetries: 0
	};
}
/**
* The profile default this exact model can actually take, for DESCRIBING it.
* A configured level the model does not support yields none rather than
* throwing: `resolveModel` builds the model catalog, and a catalog that fails
* takes its whole provider out of every picker — so one mis-set profile field
* would hide every model on the route, including the ones that support the
* level. The request path still refuses, which is where a bad configuration
* belongs: describing what a model can do must not fail because a deployment
* asked it for something it cannot.
* @param model - the resolved model descriptor.
* @param effort - the profile's configured level, if any.
* @returns the level when this model supports it, otherwise undefined.
*/
function describableReasoningLevel(model, effort) {
	if (effort === void 0) return void 0;
	return getSupportedThinkingLevels(model).some((level) => level === effort) ? effort : void 0;
}
/** Validate an explicit Harness/profile effort without invoking pi-ai's clamp. */
function resolveReasoningLevel(model, effort) {
	if (effort === void 0) return void 0;
	if (getSupportedThinkingLevels(model).some((level) => level === effort)) return effort;
	throw new LlmError(`pi-ai provider "${model.provider}" model "${model.id}" does not support reasoning effort "${effort}"`, "UNSUPPORTED_REASONING_EFFORT");
}
/**
* Selectable reasoning efforts for one model, or nothing at all.
*
* A model that carries no reasoning metadata — every hand-declared one, and
* every catalog model pi-ai marks as non-reasoning — is reported by pi-ai as
* supporting the single level `off`. Passing that through would offer a control
* that cannot do what it says: `off` is translated to *omitting* the reasoning
* option, which for such a model is byte-for-byte the same request as naming no
* effort — so a provider whose own default is to think would keep thinking with
* `off` selected. Omitting `reasoning` entirely is the seam's way of saying the
* capability is unavailable, which leaves the surface offering only the
* provider's default.
* @param model - the resolved model descriptor.
* @param defaultLevel - the profile's configured effort, already validated.
* @returns the `reasoning` field, or an empty object when none can be offered.
*/
function reasoningInfo(model, defaultLevel) {
	if (!model.reasoning) return {};
	return { reasoning: {
		efforts: getSupportedThinkingLevels(model).map((level) => ({
			id: ReasoningEffortId(level),
			name: `${level.charAt(0).toUpperCase()}${level.slice(1)}`
		})),
		...defaultLevel === void 0 ? {} : { defaultEffort: ReasoningEffortId(defaultLevel) }
	} };
}
/** Merge deployment headers while removing case-insensitive attribution collisions. */
function requestHeaders(headers) {
	const attribution = attributionHeaders();
	const reserved = new Set(Object.keys(attribution).map((name) => name.toLowerCase()));
	return {
		...Object.fromEntries(Object.entries(headers ?? {}).filter(([name]) => !reserved.has(name.toLowerCase()))),
		...attribution
	};
}
/**
* pi-ai-backed multi-provider adapter. Each operation reads the current
* profiles, so a configuration change reaches the next request without a
* restart; model descriptors come from the collection those profiles built.
*/
var PiAiAdapter = class extends LlmAdapter {
	config;
	snapshot;
	constructor(config) {
		super();
		this.config = config;
	}
	/**
	* The snapshot for the current profiles. Resolution memoizes its result, so
	* an unchanged configuration is recognized by identity; a changed one gets a
	* brand-new collection, leaving any snapshot an operation already captured
	* untouched for as long as that operation holds it.
	*/
	current() {
		const profiles = this.config.profiles();
		if (this.snapshot?.profiles === profiles) return this.snapshot;
		const models = createModels(this.config.auth);
		for (const profile of profiles.values()) if (profile.piProvider !== void 0) models.setProvider(profile.piProvider);
		this.snapshot = {
			profiles,
			models
		};
		return this.snapshot;
	}
	/** The profile for one route within one snapshot, or the not-owned failure. */
	profileOf(snapshot, provider) {
		const profile = snapshot.profiles.get(provider);
		if (profile === void 0) throw new LlmError(`pi-ai adapter does not own provider "${provider}"`, "NO_ADAPTER");
		return profile;
	}
	/** The configured descriptor for one exact route/model pair within one snapshot. */
	modelOf(snapshot, provider, model) {
		const profile = this.profileOf(snapshot, provider);
		const failure = profile.modelErrors.get(model) ?? (profile.piProvider === void 0 ? profile.catalogError : void 0);
		if (failure !== void 0) throw new LlmError(failure, "INVALID_CONFIG");
		const resolved = snapshot.models.getModel(provider, model);
		if (resolved === void 0) throw new LlmError(`pi-ai provider "${provider}" has no configured model "${model}"`, "UNKNOWN_MODEL");
		return resolved;
	}
	providerInfo(provider) {
		return {
			id: provider,
			name: this.current().profiles.get(provider)?.displayName ?? provider
		};
	}
	providerRetryPolicy(provider) {
		return this.current().profiles.get(provider)?.retryPolicy;
	}
	listModels(provider) {
		return Promise.resolve().then(() => {
			const snapshot = this.current();
			this.profileOf(snapshot, provider);
			return snapshot.models.getModels(provider).map((model) => ({
				provider,
				id: model.id,
				name: model.name,
				inputModalities: [...model.input]
			}));
		});
	}
	resolveModel(provider, model, _signal) {
		return Promise.resolve().then(() => {
			const snapshot = this.current();
			return this.modelInfo(snapshot, provider, model);
		});
	}
	modelInfo(snapshot, provider, model) {
		const profile = this.profileOf(snapshot, provider);
		const resolvedModel = this.modelOf(snapshot, provider, model);
		const defaultLevel = describableReasoningLevel(resolvedModel, profile.reasoning);
		const configuredMaxTokens = profile.configuredMaxTokens.get(model);
		return {
			provider,
			id: model,
			name: resolvedModel.name,
			inputModalities: [...resolvedModel.input],
			context: { contextWindow: resolvedModel.contextWindow },
			...configuredMaxTokens === void 0 ? {} : { defaultMaxTokens: configuredMaxTokens },
			...reasoningInfo(resolvedModel, defaultLevel)
		};
	}
	prepareCall(provider, model, _signal) {
		const snapshot = this.current();
		return Promise.resolve({
			model: this.modelInfo(snapshot, provider, model),
			stream: (options) => this.streamWithSnapshot(options, snapshot)
		});
	}
	stream(options) {
		return this.streamWithSnapshot(options, this.current());
	}
	async *streamWithSnapshot(options, snapshot) {
		const env_1 = {
			stack: [],
			error: void 0,
			hasError: false
		};
		try {
			if (options.stop !== void 0) throw new LlmError("llm-pi-ai does not support GenerateOptions.stop", "UNSUPPORTED_OPTION");
			const profile = this.profileOf(snapshot, options.provider);
			const model = this.modelOf(snapshot, options.provider, options.model);
			const reasoning = resolveReasoningLevel(model, options.reasoningEffort ?? profile.reasoning);
			const apiKey = await this.config.resolveApiKey(options.provider, profile);
			const consumer = new AbortController();
			const upstream = options.signal === void 0 ? consumer.signal : AbortSignal.any([options.signal, consumer.signal]);
			const streamIdleTimeoutMs = profile.streamIdleTimeoutMs;
			const watchdog = __addDisposableResource(env_1, idleWatchdog(upstream, streamIdleTimeoutMs, "LLM_STREAM_IDLE_TIMEOUT"), false);
			try {
				const containsImage = options.messages.some((message) => contentHasImage(message.content));
				if (containsImage && !model.input.includes("image")) throw new LlmError(`pi-ai model "${model.id}" does not support image input`, "UNSUPPORTED_CONTENT");
				const attachments = containsImage ? this.config.resolveAttachments?.() : void 0;
				if (containsImage && attachments === void 0) throw new LlmError("pi-ai image input requires the durable attachment service", "UNSUPPORTED_CONTENT");
				const onReplayDegrade = (reason) => {
					this.config.onReplayDegrade?.({
						provider: options.provider,
						model: options.model,
						reason
					});
				};
				const context = attachments === void 0 ? toPiContext(options, void 0, onReplayDegrade) : await toPiContext({
					...options,
					signal: watchdog.signal
				}, {
					attachments,
					resolveImageAccess: (ref) => this.config.resolveImageAccess?.(attachments, ref),
					maxRequestImageBytes: profile.maxRequestImageBytes,
					requestImagePolicy: {
						maxPixels: profile.requestImagePixelBudget,
						maxBytes: profile.requestImageMaxBytes
					}
				}, onReplayDegrade);
				const iterator = toStreamChunks(snapshot.models.streamSimple(model, context, {
					...profileOptions(profile, reasoning, apiKey),
					...options.temperature === void 0 ? {} : { temperature: options.temperature },
					...options.maxTokens === void 0 ? {} : { maxTokens: options.maxTokens },
					...options.sessionId === void 0 ? {} : { sessionId: String(options.sessionId) },
					signal: watchdog.signal,
					headers: requestHeaders(profile.headers)
				}), model.contextWindow, options.signal, model.id)[Symbol.asyncIterator]();
				let exhausted = false;
				try {
					while (true) {
						const result = await watchdog.next(iterator);
						const timeout = timeoutOf(watchdog.signal, "LLM_STREAM_IDLE_TIMEOUT");
						if (timeout !== void 0) throw timeout;
						if (result.done) {
							exhausted = true;
							return;
						}
						yield result.value;
					}
				} finally {
					if (!exhausted) {
						consumer.abort("pi-ai stream consumer stopped");
						try {
							await iterator.return(void 0);
						} catch (_abortedSdkTeardown) {}
					}
				}
			} catch (error) {
				if (timeoutOf(watchdog.signal, "LLM_STREAM_IDLE_TIMEOUT") !== void 0) throw new LlmError(`pi-ai stream idle timeout after ${streamIdleTimeoutMs}ms`, "TIMEOUT", { cause: error });
				if (options.signal?.aborted) throw new LlmError("pi-ai request aborted by caller", "ABORTED", { cause: error });
				throw error;
			} finally {
				consumer.abort("pi-ai stream consumer stopped");
			}
		} catch (e_1) {
			env_1.error = e_1;
			env_1.hasError = true;
		} finally {
			__disposeResources(env_1);
		}
	}
};
//#endregion
//#region lib/types/auth.js
/**
* The three adapters between pi-ai's auth model and the harness credential
* plane. Every pi-ai-specific concept stays on this side of them: the harness
* seams they consume — `ctx.credentials` records and `ctx.authorization` flows —
* name nothing from this library, so another adapter family can arrive with a
* different auth model and share the same two seams.
*
* @module dsh-llm-pi-ai/auth
*/
/**
* The record scope every credential this adapter family stores is written
* under. It is the plugin's registered name, which is what tells a later
* reader — a configuration UI, or a second adapter family serving the same
* provider name — that this plugin owns the format inside the record.
*/
const RECORD_SCOPE = "llm-pi-ai";
/**
* The record address for one pi-ai provider id.
* @param providerId - pi-ai's own provider id, which is also the harness route key.
* @returns the scoped credential key this adapter family reads and writes.
*/
function recordKeyFor(providerId) {
	return credentialKey(RECORD_SCOPE, providerId);
}
/**
* The JSON image of one grant payload: plain objects lose their
* explicitly-undefined members and array entries JSON cannot hold become
* null, exactly as `JSON.stringify` would render them. pi-ai credentials
* idiomatically carry optional members as explicit `undefined` (a github.com
* Copilot grant holds `enterpriseUrl: undefined`), which the credential
* store's strict validator refuses as unrepresentable. Everything else —
* non-finite numbers and foreign prototypes included — passes through
* untouched, so a genuinely unstorable value still fails loud at the store.
* @param value - the value to render.
* @returns the value's JSON image.
*/
function jsonImage(value) {
	if (Array.isArray(value)) return value.map((entry) => entry === void 0 ? null : jsonImage(entry));
	if (typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
		const image = {};
		for (const [key, member] of Object.entries(value)) if (member !== void 0) image[key] = jsonImage(member);
		return image;
	}
	return value;
}
/**
* Translate a stored record into the credential pi-ai expects.
*
* An `api-key` record is structural on both sides, so it is rebuilt field by
* field. A `grant` payload is pi-ai's own OAuth credential, stored verbatim:
* the seam treats it as opaque JSON precisely so a library that owns a token
* format keeps owning it, refresh fields and all.
* @param record - the stored record, or undefined when nothing is stored.
* @returns the pi-ai credential, or undefined for an absent record.
*/
function toPiCredential(record) {
	if (record === void 0) return void 0;
	if (record.kind === "api-key") return {
		type: "api_key",
		...record.key === void 0 ? {} : { key: record.key },
		...record.env === void 0 ? {} : { env: { ...record.env } }
	};
	return record.payload;
}
/**
* Translate a pi-ai credential into the record to store.
* @param credential - what a login or refresh produced.
* @returns the record to commit, in the union the credential seam stores.
*/
function toRecord(credential) {
	if (credential.type === "api_key") return {
		kind: "api-key",
		...credential.key === void 0 ? {} : { key: credential.key },
		...credential.env === void 0 ? {} : { env: { ...credential.env } }
	};
	return {
		kind: "grant",
		payload: jsonImage(credential)
	};
}
/**
* The credential service, or the failure that names what is missing. Reads
* answer "nothing stored" without a service, because a composition with no
* credential plane genuinely holds no credential; writes refuse, because a
* login whose grant silently evaporated would report success and then fail
* every request.
* @param ctx - the plugin context.
* @returns the live service.
* @throws {LlmError} code `NO_CREDENTIAL_STORE` when none is mounted.
*/
function writableStore(ctx) {
	const credentials = ctx.get("credentials");
	if (credentials === void 0) throw new LlmError("llm-pi-ai: this composition mounts no credentials service, so there is nowhere to store the credential a sign-in produces; mount one (dsh-credentials-local) to sign in", "NO_CREDENTIAL_STORE");
	return credentials;
}
/**
* A pi-ai `CredentialStore` over the harness credential records.
*
* pi-ai runs OAuth refresh *inside* `modify()`, so this store's exclusion has
* to cover a network round trip rather than a file rename — which is why the
* record write path takes a wait limit of its own rather than the short one a
* local write would need.
*
* pi-ai asks this store about every provider in the collection, hand-declared
* routes included, and a route key is an arbitrary settings dict key while a
* record id is not. An id outside the record grammar can never have stored a
* record, so reads answer "nothing stored" and a delete has nothing to remove;
* only `modify` refuses it, because a write that cannot land must not report
* that it did.
* @param ctx - the plugin context carrying the optional `ctx.credentials`.
* @returns the store to hand `createModels()`.
*/
function credentialStoreFrom(ctx) {
	return {
		async read(providerId) {
			const credentials = ctx.get("credentials");
			if (credentials === void 0) return void 0;
			if (!isCredentialKeySegment(providerId)) return void 0;
			return toPiCredential(await credentials.readRecord(recordKeyFor(providerId)));
		},
		async list() {
			const stored = await ctx.get("credentials")?.listRecords() ?? [];
			const mine = [];
			for (const entry of stored) {
				if (credentialKeyScope(entry.key) !== "llm-pi-ai") continue;
				mine.push({
					providerId: credentialKeyId(entry.key),
					type: entry.kind === "api-key" ? "api_key" : "oauth"
				});
			}
			return mine;
		},
		async modify(providerId, mutate) {
			if (!isCredentialKeySegment(providerId)) throw new LlmError(`llm-pi-ai: provider id "${providerId}" cannot address a stored credential record (a record id is a lowercase hyphenated identifier); authenticate this route through apiKeyEnv instead of a stored credential`, "UNSTORABLE_PROVIDER_ID");
			return toPiCredential(await writableStore(ctx).modifyRecord(recordKeyFor(providerId), async (current) => {
				const next = await mutate(toPiCredential(current));
				return next === void 0 ? void 0 : toRecord(next);
			}));
		},
		async delete(providerId) {
			if (!isCredentialKeySegment(providerId)) return;
			await writableStore(ctx).deleteRecord(recordKeyFor(providerId));
		}
	};
}
/**
* A pi-ai `AuthContext` over the harness credential plane and the host
* filesystem.
*
* `env()` answers from the credential seam first, so a value a deployment
* stored through the harness is found by a provider's own ambient discovery —
* without this, that discovery reads only the process environment and a stored
* `AWS_ACCESS_KEY_ID` is invisible to it. `fileExists()` answers about the host
* process's own filesystem rather than the workspace `ctx.fs` seam, because the
* paths it is asked about (`~/.aws/credentials`, application-default
* credentials) are facts about where this process runs, not about the project
* under edit.
* @param ctx - the plugin context carrying the optional `ctx.credentials`.
* @returns the auth context to hand `createModels()`.
*/
function authContextFrom(ctx) {
	return {
		async env(name) {
			if (isCredentialRefName(name)) {
				const hit = await ctx.get("credentials")?.resolve(credentialRef(name));
				if (hit !== void 0) return hit.value;
			}
			return launchEnvironmentOf(ctx).get(name)?.value;
		},
		async fileExists(path) {
			const expanded = path.startsWith("~/") || path === "~" ? resolve(homedir(), path.slice(1).replace(/^\//, "")) : path;
			try {
				await access(expanded);
				return true;
			} catch {
				return false;
			}
		}
	};
}
//#endregion
//#region lib/types/discovery.js
/**
* Answering "which models can this provider serve?" for the configuration
* surface's "fetch available models" action.
*
* A route the installed pi-ai catalog ships is answered **from that catalog**,
* with no network call at all: pi-ai's registry is the authoritative list for
* its own providers, and it carries the capacities a listing endpoint would
* not disclose. Only a route the catalog does not describe — a gateway, a
* self-hosted server — is interrogated over the wire.
*
* Neither path is a catalog refresh. Nothing here is stored: the request
* carries a draft the user is still editing, and the reply is candidate
* metadata the surface offers for adoption. `settings.yaml` remains the only
* thing that decides what a route serves.
*
* OpenAI-compatible and Anthropic Messages protocols are interrogated through
* their native model-listing endpoints. The parser accepts the standard
* `data` array and the enriched `models` map some compatible gateways expose.
* Every other protocol reports that it cannot be interrogated so the surface
* falls back to hand-entry rather than guessing its response fields.
*
* @module dsh-llm-pi-ai/discovery
*/
/**
* Protocols whose model listing this module can read. OpenAI protocols use
* bearer auth at `GET {baseURL}/models`; Anthropic Messages uses `x-api-key`
* and `anthropic-version` at its native `GET /v1/models`. Azure is absent
* despite its OpenAI lineage — it authenticates with an `api-key` header and
* requires an `api-version` query — and Codex authenticates through OAuth;
* guessing at either would report an authentication failure as a provider
* with no models. pi-ai's remaining protocols are absent for the same reason.
*/
const LISTABLE_PROTOCOLS = new Set([
	"anthropic-messages",
	"openai-completions",
	"openai-responses"
]);
/** Stable API version required by Anthropic's model-listing endpoint. */
const ANTHROPIC_VERSION = "2023-06-01";
/** Largest model-list page accepted by Anthropic's public endpoint; discovery reads one page and does not follow `has_more`. */
const ANTHROPIC_MODEL_LIMIT = 1e3;
/**
* Endpoint replies larger than this are refused. The endpoint is whatever URL
* the user typed, so the ceiling holds on the bytes actually read rather than
* on the length the server claims — the same two-stage shape `dsh-web-fetch`
* uses for its own caller-supplied URLs, except that a truncated model listing
* is not parseable, so overflow rejects instead of truncating.
*/
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
/** A positive integer field of a listing entry, or `undefined` when absent or unusable. */
function capacity(...candidates) {
	for (const candidate of candidates) if (typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0) return candidate;
}
/** A non-empty string field of a listing entry, or `undefined`. */
function label(...candidates) {
	for (const candidate of candidates) if (typeof candidate === "string" && candidate.length > 0) return candidate;
}
/**
* Join the endpoint base with the protocol's listing path. The base is
* treated as a prefix rather than a URL to resolve against, so a deployment
* path such as `https://gateway.example/openai/v1` keeps its segments instead
* of losing them to `URL` resolution. OpenAI protocols list at
* `{baseURL}/models`. Anthropic lists at `{root}/v1/models`, where the root is
* the base without trailing slashes and without one trailing `/v1` segment:
* gateway documentation publishes both spellings of the same root. Only this
* listing URL normalizes that segment; model requests receive the configured
* `baseURL` unchanged.
*/
function listingUrl(baseURL, api) {
	const base = baseURL.replace(/\/+$/, "");
	if (api !== "anthropic-messages") return `${base}/models`;
	return `${base.endsWith("/v1") ? base.slice(0, -3) : base}/v1/models?limit=${String(ANTHROPIC_MODEL_LIMIT)}`;
}
/**
* Read a reply body, refusing one that outgrows the ceiling. A declared length
* is checked first so an honest server is turned away without transferring
* anything; the accumulated total is what actually enforces the bound, because
* a server that under-declares (or streams) tells us nothing up front.
*/
async function readBounded(response, url) {
	const oversized = () => new LlmError(`${url} answered with more than ${MAX_RESPONSE_BYTES} bytes`, "DISCOVERY_FAILED");
	const declared = Number(response.headers.get("content-length") ?? NaN);
	if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
		await response.body?.cancel();
		throw oversized();
	}
	/* v8 ignore next -- fetch always exposes a body stream on a 2xx Response; the null guard is defensive. */
	if (response.body === null) return "";
	const reader = response.body.getReader();
	const chunks = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > MAX_RESPONSE_BYTES) throw oversized();
			chunks.push(value);
		}
	} finally {
		/* v8 ignore next 4 -- cancel() after a completed or abandoned read settles without rejecting; unobserved best-effort cleanup. */
		await reader.cancel().catch(() => {});
	}
	const body = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(body);
}
/**
* Read one supported model-listing reply. The standard `data` array takes
* precedence when both supported formats are present. An enriched `models`
* map uses each property key as the endpoint-facing id; its nested `id` is
* only a fallback for an empty key because gateways may put a canonical model
* identity there instead of the alias they accept on requests. Only
* object-valued map entries are models; primitive properties are ignored
* because they may be directory metadata rather than model records.
*
* Entries without a usable id are skipped rather than failing the whole
* interrogation: a single malformed row should not deny the user the rest of
* a working endpoint's catalog. Missing names fall back to the adopted id so
* the Web form receives a complete human-readable row.
*/
function readListing(body) {
	const listing = body;
	const data = listing?.data;
	let listed;
	if (Array.isArray(data)) listed = data.map((raw) => ({ raw }));
	else {
		const models = listing?.models;
		if (models === null || typeof models !== "object" || Array.isArray(models)) throw new LlmError("the endpoint's model listing has neither a \"data\" array nor a \"models\" object; enter this provider's models by hand", "DISCOVERY_FAILED");
		listed = Object.entries(models).filter(([, raw]) => raw !== null && typeof raw === "object" && !Array.isArray(raw)).map(([key, raw]) => ({
			key,
			raw
		}));
	}
	const models = [];
	for (const { key, raw } of listed) {
		const entry = raw;
		const id = label(key, entry?.id);
		if (id === void 0) continue;
		const name = label(entry?.name, entry?.display_name, entry?.displayName) ?? id;
		const contextWindow = capacity(entry?.contextWindow, entry?.context_window, entry?.context_length, entry?.max_input_tokens, entry?.limit?.context);
		const maxTokens = capacity(entry?.maxOutputTokens, entry?.max_output_tokens, entry?.maxTokens, entry?.max_tokens, entry?.limit?.output, entry?.top_provider?.max_completion_tokens);
		models.push({
			id,
			name,
			...contextWindow === void 0 ? {} : { contextWindow },
			...maxTokens === void 0 ? {} : { maxTokens }
		});
	}
	return models;
}
/**
* Accept one probe key, or refuse it before the header is built. Without this
* the `fetch` below would throw a ByteString `TypeError` that this function's
* catch reports as `could not reach <url>` — blaming the network for a local,
* deterministic fault.
* @param raw - the key typed into the form or read from storage.
* @returns the trimmed, usable key.
*/
function usableProbeKey(raw) {
	const checked = normalizeApiKey(raw);
	if (checked.ok) return checked.value;
	throw new LlmError(checked.reason === "empty" ? "this provider's API key is blank; enter it on the Models page, or clear it to probe unauthenticated" : "this provider's API key contains characters no HTTP header can carry; paste the raw key only", INVALID_CREDENTIAL_CODE);
}
/**
* Interrogate one draft provider endpoint for the models it advertises.
* @param request - the endpoint, protocol, and one-shot credential to use.
* @param storedProfile - Host-owned headers and lazy credential resolution for
*   the named route. It is read only on the path that reaches the network; the
*   credential is resolved only when the draft carries none.
* @returns the advertised models in endpoint order.
* @throws LlmError when the protocol has no readable listing, the endpoint
*   refuses or fails the request, or the reply is not a model listing.
*/
async function discoverModels(request, storedProfile) {
	if (request.provider !== void 0) {
		const installed = catalogModels(request.provider);
		if (installed.size > 0) return [...installed.values()].map((model) => ({
			id: model.id,
			name: model.name,
			contextWindow: model.contextWindow,
			maxTokens: model.maxTokens
		}));
	}
	if (request.baseURL === void 0 || request.baseURL.length === 0) throw new LlmError(`pi-ai ships no catalog for provider "${request.provider ?? ""}", so its models can only come from its endpoint; set a baseURL, or enter this provider's models by hand`, "DISCOVERY_FAILED");
	const api = request.api ?? "openai-completions";
	if (!LISTABLE_PROTOCOLS.has(api)) throw new LlmError(`pi-ai protocol "${api}" has no model listing this build can read; enter this provider's models by hand`, "DISCOVERY_UNSUPPORTED");
	const url = listingUrl(request.baseURL, api);
	const stored = storedProfile?.();
	const supplied = request.apiKey ?? await stored?.resolveApiKey();
	const apiKey = supplied === void 0 ? void 0 : usableProbeKey(supplied);
	let response;
	try {
		const headers = new Headers(stored?.headers === void 0 ? void 0 : Object.entries(stored.headers));
		headers.set("accept", "application/json");
		if (api === "anthropic-messages") {
			headers.set("anthropic-version", ANTHROPIC_VERSION);
			if (apiKey !== void 0) headers.set("x-api-key", apiKey);
		} else if (apiKey !== void 0) headers.set("authorization", `Bearer ${apiKey}`);
		for (const [name, value] of Object.entries(attributionHeaders())) headers.set(name, value);
		response = await fetch(url, {
			method: "GET",
			headers,
			...request.signal === void 0 ? {} : { signal: request.signal }
		});
	} catch (error) {
		if (request.signal?.aborted) throw new LlmError("model discovery aborted by caller", "ABORTED", { cause: error });
		throw new LlmError(`could not reach ${url}`, "DISCOVERY_FAILED", { cause: error });
	}
	if (!response.ok) throw new LlmError(`${url} answered ${response.status}${response.status === 401 || response.status === 403 ? "; check the API key" : ""}`, "DISCOVERY_FAILED");
	let text;
	try {
		text = await readBounded(response, url);
	} catch (error) {
		if (request.signal?.aborted) throw new LlmError("model discovery aborted by caller", "ABORTED", { cause: error });
		throw error;
	}
	let body;
	try {
		body = JSON.parse(text);
	} catch (error) {
		throw new LlmError(`${url} did not answer with JSON`, "DISCOVERY_FAILED", { cause: error });
	}
	return readListing(body);
}
//#endregion
//#region lib/types/login.js
/**
* Authorization flows for the pi-ai providers that ship a login. This is the
* whole of the translation between the harness's neutral notice/prompt
* vocabulary and pi-ai's `AuthInteraction`; nothing above it knows which
* library ran the conversation.
*
* @module dsh-llm-pi-ai/login
*/
/**
* The login methods one catalog provider offers.
*
* A method appears only when pi-ai can actually run it: `oauth` always carries
* a `login`, while an api-key method has one only when the provider collects
* its key interactively — which every installed one currently does, so a key is
* typed into pi-ai's own prompt rather than into the settings form.
* @param provider - the installed catalog provider, if pi-ai ships one.
* @returns its methods, most preferred first; empty when it offers no login.
*/
function loginMethods(provider) {
	const methods = [];
	const oauth = provider?.auth.oauth;
	if (oauth !== void 0) methods.push({
		id: "oauth",
		label: oauth.loginLabel ?? oauth.name
	});
	const apiKey = provider?.auth.apiKey;
	if (apiKey?.login !== void 0) methods.push({
		id: "api-key",
		label: apiKey.name
	});
	return methods;
}
/**
* Restate one pi-ai login event in the seam's vocabulary.
*
* A device-code grant is the one event carrying two things the human needs at
* once — where to go and what to type there — which is why the neutral notice
* has a `code` beside its `url` rather than folding the code into the message.
* @param event - what pi-ai reported.
* @param session - the attempt to report it to.
*/
function relay(event, session) {
	switch (event.type) {
		case "info": {
			const link = event.links?.[0];
			session.notify({
				message: event.message,
				...link === void 0 ? {} : { url: link.url }
			});
			return;
		}
		case "auth_url":
			session.notify({
				message: event.instructions ?? "Open this page to continue signing in.",
				url: event.url
			});
			return;
		case "device_code":
			session.notify({
				message: "Enter this code on the verification page to finish signing in.",
				url: event.verificationUri,
				code: event.userCode
			});
			return;
		case "progress":
			session.notify({ message: event.message });
			return;
		default: session.notify({ message: "Signing in…" });
	}
}
/**
* Restate one pi-ai prompt in the seam's vocabulary.
*
* `manual_code` becomes a plain text question because the difference pi-ai
* draws — a code the human copies from a browser rather than a value they know
* — changes nothing a surface renders. Its own `signal` is carried through, and
* that is the part which matters: it is how a flow racing a typed code against
* a browser callback withdraws the losing question.
* @param prompt - what pi-ai asked.
* @returns the neutral prompt to put to the human.
*/
function restate(prompt) {
	const signal = prompt.signal === void 0 ? {} : { signal: prompt.signal };
	switch (prompt.type) {
		case "select": return {
			...signal,
			kind: "select",
			message: prompt.message,
			options: prompt.options
		};
		case "secret": return {
			...signal,
			kind: "secret",
			message: prompt.message,
			...prompt.placeholder === void 0 ? {} : { placeholder: prompt.placeholder }
		};
		default: return {
			...signal,
			kind: "text",
			message: prompt.message,
			...prompt.placeholder === void 0 ? {} : { placeholder: prompt.placeholder }
		};
	}
}
/**
* Register one authorization flow per installed provider that ships a login.
*
* Registration is unconditional on configuration: a provider has to be signed
* into before a route for it is worth adding, so the flow exists from the
* moment the plugin mounts rather than appearing once a profile does.
* @param ctx - the plugin context carrying `ctx.authorization`.
* @param auth - the injectables every collection here is built with.
*/
function registerPiAiFlows(ctx, auth) {
	for (const providerId of catalogProviderIds()) {
		const provider = catalogProvider(providerId);
		const [first, ...rest] = loginMethods(provider);
		/* v8 ignore next 3 -- every id here names an installed provider and every
		installed provider ships a login, so no entry is skipped; the guard
		is what keeps that from becoming a crash if either stops being true. */
		if (provider === void 0 || first === void 0) continue;
		/* v8 ignore next 7 -- every installed catalog id is a lowercase
		hyphenated identifier; the guard keeps a future upstream id outside the
		record grammar (dotted or uppercase, as vendor ids elsewhere already
		are) from throwing in `recordKeyFor` and failing the whole mount. */
		if (!isCredentialKeySegment(providerId)) {
			ctx.logger.warn("llm-pi-ai: catalog provider \"%s\" cannot address a credential record; its sign-in is not offered", providerId);
			continue;
		}
		ctx.authorization.registerFlow({
			key: recordKeyFor(providerId),
			label: provider.name,
			methods: [first, ...rest],
			async run(session) {
				const models = createModels(auth);
				models.setProvider(provider);
				const type = session.method === "oauth" ? "oauth" : "api_key";
				await models.login(providerId, type, {
					signal: session.signal,
					notify: (event) => {
						relay(event, session);
					},
					prompt: (prompt) => session.prompt(restate(prompt))
				});
			}
		});
	}
}
//#endregion
//#region lib/types/index.js
/**
* Generic pi-ai-backed LLM adapter plugin. One plugin instance owns a dict of
* provider routes; a route naming an installed pi-ai provider inherits that
* provider's endpoint, protocol, and model catalog as defaults, and a route
* pi-ai does not ship is declared outright. Profile facts resolve per request
* over the optional `llm-pi-ai` user-settings section and the optional
* credential seam, so a changed key, endpoint, model, or knob reaches the next
* request without a restart; a changed *route set* (or a route's
* registration-captured retry policy) re-registers the same adapter instance
* in place.
*
* ```yaml
* - id: llm
*   name: '@deepseek-ai/dsh-llm-pi-ai'
*   config:
*     providers:
*       # Catalog route: everything but the credential comes from pi-ai.
*       openai:
*         apiKeyEnv: OPENAI_API_KEY
*         retryPolicy:
*           mode: normal
*           maxRetries: 2
*       # Catalog route with the catalog narrowed and one capacity corrected.
*       anthropic:
*         apiKeyEnv: ANTHROPIC_API_KEY
*         models:
*           - id: claude-sonnet-4-5
*             contextWindow: 200000
*       # Hand-declared route: pi-ai ships nothing under this key.
*       acme-gateway:
*         displayName: Acme Gateway
*         apiKeyEnv: ACME_GATEWAY_API_KEY
*         api: openai-completions
*         baseURL: https://gateway.acme.example/v1
*         # Reasoning dialect for a URL pi-ai cannot recognize.
*         compat:
*           thinkingFormat: deepseek
*         models:
*           - id: acme-large
*             name: Acme Large
*             contextWindow: 65536
*             maxTokens: 4096
*           - id: acme-think
*             name: Acme Think
*             contextWindow: 262144
*             maxTokens: 32768
*             # key = selectable level, value = wire spelling; only off may
*             # leave the value empty (supported, send nothing).
*             reasoningEfforts:
*               off:
*               high: high
*               max: ultra
* ```
*
* @module @deepseek-ai/dsh-llm-pi-ai
*/
const name = "llm-pi-ai";
const inject = ["llm"];
const NS = "llm-pi-ai";
/**
* The registry captures these per route; a change here must re-register.
* Sorted by provider so a settings document that merely reorders its keys is
* not mistaken for a route change.
*/
function registrationFacts(profiles) {
	return [...profiles.entries()].map(([provider, profile]) => ({
		provider,
		displayName: profile.displayName,
		retryPolicy: profile.retryPolicy
	})).sort((left, right) => left.provider.localeCompare(right.provider));
}
/**
* The configurable-provider directory: every installed catalog route, plus
* every route the current profiles declare. A hand-declared route has no
* catalog entry, so without this union it would have no settings address and
* configuration surfaces could neither show nor edit it.
* @param profiles - the currently resolved provider profiles.
* @returns the directory entries in catalog order, declared routes last.
*/
function directoryEntries(profiles) {
	const catalog = new Set(catalogProviderIds());
	const entries = /* @__PURE__ */ new Map();
	const declare = (provider, displayName, error) => {
		entries.set(provider, {
			provider,
			displayName,
			settingsNs: NS,
			settingsPath: ["providers", provider],
			declared: !catalog.has(provider),
			...error === void 0 ? {} : { error }
		});
	};
	for (const provider of catalog) declare(provider, provider);
	for (const [provider, profile] of profiles) declare(provider, profile.displayName, profile.catalogError);
	return [...entries.values()];
}
/** Register one generic pi-ai adapter for all configured provider routes. */
function apply(ctx, config) {
	let current = () => config;
	let lastRaw;
	let memoized;
	/**
	* The resolved profiles for the current configuration, memoized by the raw
	* snapshot's identity — which is also what makes the adapter's own snapshot
	* stable across operations that observe no change.
	*
	* Catalog diagnostics stay in the snapshot beside serviceable models, so
	* stored configuration remains visible after an installed catalog changes.
	* Scalar configuration errors still reject resolution.
	*/
	const profiles = () => {
		const raw = current();
		if (raw === lastRaw && memoized !== void 0) return memoized;
		const next = resolveProfiles(raw.providers, "deferred");
		lastRaw = raw;
		memoized = next;
		return next;
	};
	profiles();
	const resolveApiKey = async (provider, profile) => {
		const ref = profile.apiKeyEnv;
		if (ref === void 0) return void 0;
		const credentials = ctx.get("credentials");
		const hit = credentials !== void 0 ? (await credentials.resolve(ref))?.value : launchEnvironmentOf(ctx).get(ref)?.value;
		if (hit !== void 0 && hit.length > 0) return assertUsableApiKey(hit, "llm-pi-ai", ref);
		throw new LlmError(`llm-pi-ai: no credential for provider route "${provider}"; its profile resolves ${ref}, which is not set — store ${ref} through the credentials service (the web Models page writes it) or export it, and remove apiKeyEnv only if this provider should authenticate from pi-ai's own environment discovery`, "MISSING_CREDENTIAL");
	};
	const auth = {
		credentials: credentialStoreFrom(ctx),
		authContext: authContextFrom(ctx)
	};
	const adapter = new PiAiAdapter({
		profiles,
		resolveApiKey,
		auth,
		resolveAttachments: () => ctx.get("attachments"),
		resolveImageAccess: (attachments, ref) => resolveImageAttachmentAccess(attachments, (hostPath) => ctx.get("fs")?.processPathFromHostPath(hostPath), ref),
		onReplayDegrade: ({ provider, model, reason }) => {
			ctx.logger.warn(`llm-pi-ai: unusable replay state on assistant history for route "${provider}/${model}"; sending that message as provider-neutral content (${reason})`);
		}
	});
	ctx.inject(["authorization"], (authorized) => {
		registerPiAiFlows(authorized, auth);
	});
	let directory;
	let directoryFacts;
	const ensureDirectory = () => {
		const entries = directoryEntries(profiles());
		if (deepEqualJson(entries, directoryFacts)) return;
		if (directory === void 0) directory = ctx.llm.registerConfigurableProviders(entries);
		else directory.replace(entries);
		directoryFacts = entries;
	};
	ensureDirectory();
	/** Host-owned request inputs for discovery of one configured route. */
	const storedDiscoveryProfile = (provider) => {
		if (provider === void 0) return void 0;
		const profile = profiles().get(provider);
		if (profile === void 0) return void 0;
		return {
			headers: profile.headers,
			resolveApiKey: () => resolveApiKey(provider, profile)
		};
	};
	ctx.llm.registerModelDiscovery(NS, (request, signal) => discoverModels({
		...request,
		...signal === void 0 ? {} : { signal }
	}, () => storedDiscoveryProfile(request.provider)));
	let registration;
	let registeredFacts;
	const ensureRegistrationFacts = () => {
		const facts = registrationFacts(profiles());
		if (deepEqualJson(facts, registeredFacts)) return;
		const routes = [...profiles().keys()];
		if (registration === void 0) {
			if (routes.length === 0) {
				registeredFacts = facts;
				return;
			}
			registration = ctx.llm.registerAdapter(routes, adapter);
		} else registration.replace(routes);
		registeredFacts = facts;
	};
	ensureRegistrationFacts();
	ctx.inject(["settings"], (settingsCtx) => {
		let registering = true;
		settingsCtx.settings.installSection(ctx, NS, Config, config, {
			validate: (value) => {
				if (registering) resolveProfiles(value.providers, "deferred");
				else assertServiceable(value, current());
			},
			setSource: (source) => {
				current = source;
			},
			onChange: () => {
				try {
					ensureRegistrationFacts();
				} catch (error) {
					ctx.logger.error("llm-pi-ai: keeping the previously registered routes after a refused update");
					ctx.logger.error(error);
				}
				try {
					ensureDirectory();
				} catch (error) {
					ctx.logger.error("llm-pi-ai: keeping the previous configurable-provider directory after a refused update");
					ctx.logger.error(error);
				}
			}
		});
		registering = false;
	});
}
//#endregion
export { Config, PiAiAdapter, apply, inject, name, recordKeyFor, supportedProtocols };
