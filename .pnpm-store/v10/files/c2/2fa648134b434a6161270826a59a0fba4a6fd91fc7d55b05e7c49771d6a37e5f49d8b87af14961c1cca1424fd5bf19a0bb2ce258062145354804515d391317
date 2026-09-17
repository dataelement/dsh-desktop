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
import type { AnthropicMessagesCompat, Api, BedrockCompat, ChatTemplateKwargValue, Model, ModelThinkingLevel, OpenAICompletionsCompat, OpenAIResponsesCompat, Provider } from '@earendil-works/pi-ai';
/** One request modality a pi-ai model may accept. */
export type PiAiModality = Model<Api>['input'][number];
/** Every request modality a profile may declare. */
export declare const MODALITIES: readonly PiAiModality[];
/** Every pi-ai thinking level a profile may declare, in escalation order. */
export declare const THINKING_LEVELS: readonly ModelThinkingLevel[];
/** One reasoning-dispatch wire format a profile may name. */
export type PiAiThinkingFormat = NonNullable<OpenAICompletionsCompat['thinkingFormat']>;
/** Reasoning-dispatch wire formats a profile may name, most-reached first. */
export declare const SUPPORTED_THINKING_FORMATS: readonly PiAiThinkingFormat[];
/** The output-cap field spellings pi-ai accepts. */
export type PiAiMaxTokensField = NonNullable<OpenAICompletionsCompat['maxTokensField']>;
/** The output-cap field spellings a profile may name. */
export declare const MAX_TOKENS_FIELDS: readonly PiAiMaxTokensField[];
/** The reasoning-budget field spellings pi-ai accepts. */
export type PiAiThinkingTokenBudgetField = NonNullable<OpenAICompletionsCompat['thinkingTokenBudgetField']>;
/** The reasoning-budget field spellings a profile may name. */
export declare const THINKING_TOKEN_BUDGET_FIELDS: readonly PiAiThinkingTokenBudgetField[];
/** The prompt-cache marker conventions pi-ai accepts. */
export type PiAiCacheControlFormat = NonNullable<OpenAICompletionsCompat['cacheControlFormat']>;
/** The prompt-cache marker conventions a profile may name. */
export declare const CACHE_CONTROL_FORMATS: readonly PiAiCacheControlFormat[];
/** The request-state placeholders a `chat_template_kwargs` value may name. */
export type PiAiChatTemplateVar = Extract<ChatTemplateKwargValue, {
    $var: string;
}>['$var'];
/** The request-state placeholders a profile may name. */
export declare const CHAT_TEMPLATE_VARS: readonly PiAiChatTemplateVar[];
/**
 * The installed catalog provider for one route, when pi-ai ships one.
 * @param provider - provider route key.
 * @returns the catalog provider, or `undefined` for a route pi-ai does not ship.
 */
export declare function catalogProvider(provider: string): Provider | undefined;
/**
 * Every provider route the installed pi-ai catalog ships.
 * @returns the catalog provider ids.
 */
export declare function catalogProviderIds(): readonly string[];
/**
 * The installed catalog models for one route, indexed by model id.
 * @param provider - provider route key.
 * @returns catalog models by id; empty for a route pi-ai does not ship.
 */
export declare function catalogModels(provider: string): Map<string, Model<Api>>;
/**
 * Selectable reasoning efforts for one model: each key is a level the model
 * offers (and selectors show), and its value is the wire spelling dispatch
 * sends for it. `off` alone may leave its value empty — "supported, send
 * nothing" — because for most providers not thinking is the parameter's
 * absence; every other declared level must name a wire value. A level absent
 * from the dict is not offered.
 */
export type PiAiReasoningEfforts = Partial<Record<ModelThinkingLevel, string | null>>;
/**
 * Disposition of every `OpenAICompletionsCompat` field. The `Record` key type
 * is a drift gate: a pi-ai upgrade that adds a field fails compilation here
 * until it is classified, so the offer never silently lags the upstream set.
 */
declare const COMPLETIONS_COMPAT_GATE: {
    readonly supportsStore: "offer";
    readonly supportsDeveloperRole: "offer";
    readonly supportsReasoningEffort: "offer";
    readonly supportsUsageInStreaming: "offer";
    readonly supportsFinishReason: "offer";
    readonly maxTokensField: "offer";
    readonly requiresToolResultName: "offer";
    readonly requiresAssistantAfterToolResult: "offer";
    readonly requiresThinkingAsText: "offer";
    readonly requiresReasoningContentOnAssistantMessages: "offer";
    readonly thinkingFormat: "offer";
    readonly chatTemplateKwargs: "offer";
    readonly chatTemplateArgs: "offer";
    readonly supportsThinkingTokenBudget: "offer";
    readonly thinkingTokenBudgetField: "offer";
    readonly vllmPriority: "offer";
    readonly supportsStrictMode: "offer";
    readonly cacheControlFormat: "offer";
    readonly supportsLongCacheRetention: "offer";
    readonly openRouterRouting: "withhold";
    readonly vercelGatewayRouting: "withhold";
    readonly zaiToolStream: "withhold";
    readonly supportsOpenAIGrammarTools: "withhold";
    readonly sendSessionAffinityHeaders: "withhold";
    readonly deferredToolsMode: "withhold";
    readonly sessionAffinityFormat: "withhold";
};
/** Disposition of every `OpenAIResponsesCompat` field; a drift gate like the one above. */
declare const RESPONSES_COMPAT_GATE: {
    readonly supportsDeveloperRole: "offer";
    readonly supportsMaxOutputTokens: "offer";
    readonly supportsStrictMode: "offer";
    readonly supportsLongCacheRetention: "offer";
    readonly sessionAffinityFormat: "withhold";
    readonly supportsOpenAIGrammarTools: "withhold";
    readonly supportsAdditionalTools: "withhold";
    readonly supportsToolSearch: "withhold";
    readonly supportsExplicitPromptCacheMode: "withhold";
};
/** Disposition of every `AnthropicMessagesCompat` field; a drift gate like the one above. */
declare const ANTHROPIC_COMPAT_GATE: {
    readonly supportsEagerToolInputStreaming: "offer";
    readonly supportsLongCacheRetention: "offer";
    readonly supportsCacheControlOnTools: "offer";
    readonly supportsTemperature: "offer";
    readonly forceAdaptiveThinking: "offer";
    readonly allowEmptySignature: "offer";
    readonly supportsStrictTools: "offer";
    readonly sendSessionAffinityHeaders: "withhold";
    readonly supportsToolReferences: "withhold";
    readonly supportsMidConvoEffort: "withhold";
    readonly allowedFallbackModels: "withhold";
};
/** Disposition of every `BedrockCompat` field; a drift gate like the one above. */
declare const BEDROCK_COMPAT_GATE: {
    readonly supportsStrictMode: "offer";
};
/** The field names one gate offers. */
type OfferedIn<G> = {
    [K in keyof G]: G[K] extends 'offer' ? K : never;
}[keyof G];
/** Every compat field name a profile may set, on whichever protocol takes it. */
type OfferedCompatField = OfferedIn<typeof COMPLETIONS_COMPAT_GATE> | OfferedIn<typeof RESPONSES_COMPAT_GATE> | OfferedIn<typeof ANTHROPIC_COMPAT_GATE> | OfferedIn<typeof BEDROCK_COMPAT_GATE>;
/**
 * pi-ai wire-compatibility switches, set on the route (its models' default) or
 * per model (winning over the route, field by field).
 *
 * pi-ai decides each of these from the provider id and baseURL when no layer
 * sets it, and a private gateway's URL says nothing: for an endpoint it does
 * not recognize the detection answers as though it were OpenAI itself, which
 * is wrong for most OpenAI-compatible gateways. So every field here is one a
 * deployment must be able to state because nothing can infer it, while the
 * fields pi-ai's catalog sets for a named vendor stay withheld.
 *
 * A field belongs to the protocols whose upstream compat type declares it: a
 * model-level switch its protocol does not take fails resolution, and a
 * route-level one skips past models it cannot fit. "The three Responses
 * protocols" below means `openai-responses`, `azure-openai-responses`, and
 * `openai-codex-responses`, which pi-ai gives one shared compat type, so a
 * switch settable on one is settable on all three.
 */
export interface PiAiCompatProfile {
    /** Whether the endpoint accepts `store`; `openai-completions`. */
    supportsStore?: boolean;
    /**
     * Whether the endpoint accepts the `developer` role for the system prompt,
     * which pi-ai sends only to a reasoning model; `false` keeps `system`.
     * `openai-completions` and the three Responses protocols.
     */
    supportsDeveloperRole?: boolean;
    /** Whether the endpoint accepts `reasoning_effort`; `openai-completions`. */
    supportsReasoningEffort?: boolean;
    /** Whether the endpoint accepts `stream_options: {include_usage: true}`; `openai-completions`. */
    supportsUsageInStreaming?: boolean;
    /**
     * Whether streams include `finish_reason`; `false` lets pi-ai infer the
     * terminal reason when the stream ends; `openai-completions`.
     */
    supportsFinishReason?: boolean;
    /** Which output-cap field the endpoint reads; `openai-completions`. */
    maxTokensField?: NonNullable<OpenAICompletionsCompat['maxTokensField']>;
    /** Whether tool results must carry `name`; `openai-completions`. */
    requiresToolResultName?: boolean;
    /** Whether a user message after tool results needs an assistant message between; `openai-completions`. */
    requiresAssistantAfterToolResult?: boolean;
    /** Whether thinking blocks must travel as text in `<thinking>` delimiters; `openai-completions`. */
    requiresThinkingAsText?: boolean;
    /** Whether replayed assistant messages need an empty `reasoning_content` while reasoning is on; `openai-completions`. */
    requiresReasoningContentOnAssistantMessages?: boolean;
    /** Reasoning parameter format the endpoint expects; `openai-completions`. */
    thinkingFormat?: PiAiThinkingFormat;
    /**
     * Kwargs sent as `chat_template_kwargs`, which pi-ai reads only under the
     * two `chat-template` thinking formats; `openai-completions`. Nothing checks
     * that pairing: the format in force may come from the installed catalog
     * entry or from pi-ai's own baseURL detection, neither of which resolution
     * can read, so kwargs set beside another format are sent nowhere.
     */
    chatTemplateKwargs?: NonNullable<OpenAICompletionsCompat['chatTemplateKwargs']>;
    /** Arguments sent as `chat_template_args` under the `baseten` thinking format; `openai-completions`. */
    chatTemplateArgs?: NonNullable<OpenAICompletionsCompat['chatTemplateArgs']>;
    /** Alias for `thinkingTokenBudgetField: "thinking_token_budget"`; an explicit field wins. `openai-completions`. */
    supportsThinkingTokenBudget?: boolean;
    /** Request field carrying the reasoning budget from `thinkingBudgets`; omitted unless configured. `openai-completions`. */
    thinkingTokenBudgetField?: PiAiThinkingTokenBudgetField;
    /** vLLM scheduler `priority`; lower runs earlier, and the server must enable priority scheduling. Omitted unless configured. */
    vllmPriority?: number;
    /** Whether `openai-responses` accepts `max_output_tokens`; `false` omits it. Azure and Codex ignore this shared compat field. */
    supportsMaxOutputTokens?: boolean;
    /**
     * Whether the endpoint accepts `strict` in tool definitions;
     * `openai-completions`, the three Responses protocols, `bedrock-converse-stream`.
     */
    supportsStrictMode?: boolean;
    /** Prompt-cache marker convention; `openai-completions`. */
    cacheControlFormat?: NonNullable<OpenAICompletionsCompat['cacheControlFormat']>;
    /**
     * Whether the endpoint accepts long prompt-cache retention;
     * `openai-completions`, the three Responses protocols, `anthropic-messages`.
     */
    supportsLongCacheRetention?: boolean;
    /** Whether the endpoint accepts per-tool `eager_input_streaming`; `anthropic-messages`. */
    supportsEagerToolInputStreaming?: boolean;
    /** Whether the endpoint accepts `cache_control` on tool definitions; `anthropic-messages`. */
    supportsCacheControlOnTools?: boolean;
    /** Whether the endpoint accepts the `temperature` request field; `anthropic-messages`. */
    supportsTemperature?: boolean;
    /** Whether to force adaptive thinking regardless of model id; `anthropic-messages`. */
    forceAdaptiveThinking?: boolean;
    /** Whether to replay an empty thinking signature instead of converting thinking to text; `anthropic-messages`. */
    allowEmptySignature?: boolean;
    /** Whether the endpoint accepts Anthropic strict tool schemas; `anthropic-messages`. */
    supportsStrictTools?: boolean;
}
/** Compile-time constraint that `T` is `never`. */
type AssertNever<T extends never> = T;
/**
 * Proof that every documented field is one a gate offers. A field the profile
 * declares past the gates fails compilation with its own name in the error.
 */
export type EveryProfileFieldIsOffered = AssertNever<Exclude<keyof PiAiCompatProfile, OfferedCompatField>>;
/**
 * Proof that every offered field is documented. A gate entry flipped to
 * `offer` without a profile field fails compilation with its own name in the
 * error, which is the half a schema alone cannot catch.
 */
export type EveryOfferedFieldIsDocumented = AssertNever<Exclude<OfferedCompatField, keyof PiAiCompatProfile>>;
/** Compile-time constraint that `T` is `true`. */
type AssertTrue<T extends true> = T;
/** Every compat type a gate classifies, merged so one `Pick` reaches all offered fields. */
type UpstreamCompat = OpenAICompletionsCompat & OpenAIResponsesCompat & AnthropicMessagesCompat & BedrockCompat;
/**
 * Proof that each documented field carries its upstream type, not a hand-copied
 * restatement of it. The name gates above pin *which* fields exist; this pins
 * their types, in both directions because each catches a different drift. A
 * profile field wider than upstream accepts a value the provider rejects, and
 * `resolveModelCompat`'s cast to `ModelCompat` would hide it; a narrower one
 * refuses a value the provider accepts, which is how an upgrade that widens a
 * union would otherwise leave configuration silently behind.
 */
export type EveryProfileFieldMatchesUpstream = AssertTrue<PiAiCompatProfile extends Partial<Pick<UpstreamCompat, OfferedCompatField>> ? Partial<Pick<UpstreamCompat, OfferedCompatField>> extends PiAiCompatProfile ? true : false : false>;
/** One configured model entry: an id plus the catalog fields it overrides. */
export interface PiAiModelProfile {
    /** Model id sent to the provider and accepted by {@link GenerateOptions.model}. */
    id: string;
    /** Display name for selectors; defaults to the catalog name, then the id. */
    name?: string;
    /** Maximum combined request and response context in tokens. */
    contextWindow?: number;
    /**
     * Maximum output tokens. Configuring one also makes it this model's
     * per-request default; a value inherited from the installed catalog, or the
     * route's fallback, is the model's capability and never becomes a request
     * default on its own.
     */
    maxTokens?: number;
    /**
     * Request modalities this model accepts. Absent — or empty, which describes
     * a model that accepts nothing and so states no answer either — keeps the
     * installed catalog entry's modalities, then the route's `defaultInput`.
     * Declaring images is what makes a hand-declared vision model usable, and
     * declaring text alone corrects a catalog model whose gateway does not serve
     * what the catalog records. This is a claim about the endpoint, not a check
     * of it: nothing interrogates a gateway for what it accepts, so a model
     * claiming images its endpoint refuses is refused by the provider instead,
     * mid-turn.
     */
    input?: PiAiModality[];
    /**
     * Selectable reasoning efforts. Absent inherits the installed catalog
     * entry's capability (a hand-declared model has none and does not reason);
     * `false` declares a non-reasoning model, which is how a profile strips
     * reasoning from a catalog model its gateway cannot serve; a non-empty dict
     * declares the offered levels and their wire spellings.
     */
    reasoningEfforts?: false | PiAiReasoningEfforts;
    /** pi-ai wire-compatibility switches for this model, winning over the route's per field; one its protocol does not declare is refused. */
    compat?: PiAiCompatProfile;
}
/**
 * Customization of one installed catalog model, keyed by its id in the
 * route's `modelOverrides` dict — the same fields a `models` entry may set,
 * with the id living in the key. Unlike a `models` list, overrides leave the
 * rest of the catalog serving untouched, which is what makes "correct one
 * model, keep the other thirty-seven" a three-line edit.
 */
export type PiAiModelOverride = Omit<PiAiModelProfile, 'id'>;
/** The route-level facts model materialization reads. */
export interface RouteCatalogRequest {
    /** Provider route key, stamped onto every materialized model. */
    provider: string;
    /** Wire protocol override; absent defers to each catalog model's own API. */
    api?: string;
    /** Endpoint override; absent defers to the catalog model, then the catalog provider. */
    baseURL?: string;
    /** Configured catalog; absent means the whole installed catalog for this route. */
    models?: readonly PiAiModelProfile[];
    /** Installed-catalog customizations by model id; only meaningful while `models` is absent. */
    modelOverrides?: Readonly<Record<string, PiAiModelOverride>>;
    /** Route-level wire-compatibility switches, landing on each model whose protocol declares them; entries override per field. */
    compat?: PiAiCompatProfile;
    /** Context capacity for a model neither the entry nor the catalog sizes. */
    defaultContextWindow: number;
    /** Output capability for a model neither the entry nor the catalog sizes. */
    defaultMaxTokens: number;
    /** Modalities for a model neither the entry nor the catalog declares. */
    defaultInput: Model<Api>['input'];
}
/** An expected configuration failure that stored-catalog reads may retain for repair. */
export declare class PiAiCatalogError extends Error {
}
/** One route's materialized catalog, plus the request caps its profile chose. */
export interface RouteCatalog {
    /** The materialized models in configuration order. */
    models: readonly Model<Api>[];
    /** Models that cannot be resolved, retained as diagnostics during stored-config reads. */
    modelErrors: ReadonlyMap<string, string>;
    /**
     * Per-request output caps this profile explicitly configured, by model id.
     *
     * Separate from `Model.maxTokens` because the two answer different
     * questions: pi-ai requires `maxTokens` as the model's output *capability*,
     * while the harness seam's `defaultMaxTokens` is a cap the deployment chose
     * to send on requests that name none. Materializing a catalog capability as
     * a request default would start capping every request at a number nobody
     * picked, so only an explicit configuration lands here.
     */
    configuredMaxTokens: ReadonlyMap<string, number>;
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
export declare function resolveRouteModels(request: RouteCatalogRequest, validation?: 'strict' | 'deferred'): RouteCatalog;
export {};
//# sourceMappingURL=catalog.d.ts.map