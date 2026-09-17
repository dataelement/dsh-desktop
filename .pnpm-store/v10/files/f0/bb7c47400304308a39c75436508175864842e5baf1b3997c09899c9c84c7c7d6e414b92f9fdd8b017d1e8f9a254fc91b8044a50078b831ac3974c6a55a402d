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
import type { CacheRetention, ModelThinkingLevel, Provider, ThinkingBudgets, Transport } from '@earendil-works/pi-ai';
import z from '@deepseek-ai/schemastery';
import type { CredentialRef } from '@deepseek-ai/dsh-credentials';
import type { ResolvedRetryPolicy, RetryPolicyConfig } from '@deepseek-ai/dsh-llm';
import type { PiAiCompatProfile, PiAiModality, PiAiModelOverride, PiAiModelProfile } from './catalog.ts';
/** Default maximum idle interval while an adapter stream read is outstanding. */
export declare const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300000;
/**
 * Default request-level bound on base64-encoded image payload. Every image in
 * history is re-encoded into every request body, so an unbounded conversation
 * eventually exceeds a provider or gateway request-size cap and the session
 * can never complete another request. The 20MiB default admits fifteen 1MiB
 * request versions after base64 expansion and reserves request capacity for
 * system prompts, history, tools, and JSON.
 * Deployments behind stricter gateways lower it per route.
 */
export declare const DEFAULT_MAX_REQUEST_IMAGE_BYTES: number;
/** Default total-pixel budget preserves the complete 2048px normalized attachment. */
export declare const DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET: number;
/** Default raw encoded-byte target before inline base64 expansion; the smallest quality-ladder output is used when no quality fits. */
export declare const DEFAULT_REQUEST_IMAGE_MAX_BYTES: number;
/** Context capacity assumed for a model neither configuration nor the catalog sizes. */
export declare const DEFAULT_CONTEXT_WINDOW = 262144;
/** Output capability assumed for a model neither configuration nor the catalog sizes. */
export declare const DEFAULT_MAX_TOKENS = 32768;
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
export declare const DEFAULT_INPUT: readonly PiAiModality[];
export type { PiAiCompatProfile, PiAiModality, PiAiModelOverride, PiAiModelProfile, PiAiReasoningEfforts, PiAiThinkingFormat, } from './catalog.ts';
/** Configuration for one pi-ai provider route; the `providers` dict key IS the route. */
export interface PiAiProviderProfile {
    /** Credential reference (environment-variable name) resolved per request through `ctx.credentials`. */
    apiKeyEnv?: string;
    /** Name shown by configuration surfaces; defaults to the route key. */
    displayName?: string;
    /**
     * Wire protocol every model on this route speaks. Omission keeps each
     * installed catalog model's own protocol, which is why a catalog route needs
     * no protocol at all; a route the catalog does not ship must name one.
     */
    api?: string;
    /** Endpoint for this route's models; defaults to the installed catalog's endpoint. */
    baseURL?: string;
    /**
     * This route's model catalog. Omission serves the installed catalog for the
     * route unchanged; an explicit list replaces it, each entry defaulting its
     * unset fields from the installed model of the same id.
     */
    models?: PiAiModelProfile[];
    /**
     * Installed-catalog customizations by model id: each entry reshapes that
     * one model with the same fields a {@link models} entry takes, while the
     * rest of the catalog keeps serving untouched. Only meaningful on a catalog
     * route with no `models` list — `models` already replaces the catalog, so
     * an override beside it, on a route the catalog does not ship, or naming a
     * model the catalog does not describe is refused rather than skipped.
     */
    modelOverrides?: Record<string, PiAiModelOverride>;
    /**
     * pi-ai wire-compatibility switches defaulting every model on this route
     * whose protocol declares them; each model's own `compat` overrides per
     * field. What neither sets keeps the installed catalog entry's value, then
     * pi-ai's own detection. A switch no model on the route could read is
     * refused rather than left looking applied.
     */
    compat?: PiAiCompatProfile;
    /**
     * Context capacity for a model this route lists that neither the entry nor
     * the installed catalog sizes (default 262,144). A guess by construction, so
     * a deployment whose gateway serves smaller models corrects it here.
     */
    defaultContextWindow?: number;
    /**
     * Output capability for a model this route lists that neither the entry nor
     * the installed catalog sizes (default 32,768). This sizes the model; it
     * never becomes a per-request cap on its own.
     */
    defaultMaxTokens?: number;
    /**
     * Request modalities for a model this route lists that neither its entry's
     * {@link PiAiModelProfile.input} nor the installed catalog declares (default
     * `[text]`). A fallback like the capacities above, not an override: a
     * catalog model keeps the modalities the catalog records for it, and this
     * value never narrows one. A gateway serving vision models the catalog does
     * not describe declares `[text, image]` once here instead of on every entry.
     * Unlike an entry's list, this one may not be empty — nothing sits below it
     * to answer instead.
     */
    defaultInput?: PiAiModality[];
    /** Provider request headers, validated against Fetch when the profile resolves; Harness attribution wins reserved names. */
    headers?: Record<string, string>;
    /** Provider-neutral pi-ai reasoning level. */
    reasoning?: ModelThinkingLevel;
    /** Token budgets used by reasoning providers that support them. */
    thinkingBudgets?: ThinkingBudgets;
    /** Prompt-cache retention preference. */
    cacheRetention?: CacheRetention;
    /** Streaming transport preference. */
    transport?: Transport;
    /** HTTP/provider SDK timeout in milliseconds. */
    timeoutMs?: number;
    /** WebSocket connection timeout in milliseconds. */
    websocketConnectTimeoutMs?: number;
    /** Maximum provider idle time while one stream read is outstanding. */
    streamIdleTimeoutMs?: number;
    /**
     * Maximum base64-encoded image payload per request. When a request's
     * accumulated images exceed it, the oldest images are replaced by text
     * placeholders until the request fits, so a long session keeps completing
     * requests instead of being rejected by a request-size cap.
     */
    maxRequestImageBytes?: number;
    /** Total-pixel budget for each deterministic inline request version. */
    requestImagePixelBudget?: number;
    /**
     * Raw encoded-byte target for each deterministic inline request version;
     * the smallest quality-ladder output is used when no quality fits.
     */
    requestImageMaxBytes?: number;
    /** Provider-owned model-request retry policy; omission uses normal mode with five retries. */
    retryPolicy?: RetryPolicyConfig;
}
/** Validated profile with its route stamped and every adapter-owned default resolved. */
export interface ResolvedPiAiProviderProfile extends Omit<PiAiProviderProfile, 'apiKeyEnv' | 'retryPolicy' | 'models' | 'displayName'> {
    /** Harness route key and the `Models` collection key (the configuration dict key). */
    provider: string;
    /** Resolved display name for selectors and configuration surfaces. */
    displayName: string;
    /** Validated credential reference, when one is configured. */
    apiKeyEnv?: CredentialRef;
    /** Positive finite provider-idle interval after defaulting. */
    streamIdleTimeoutMs: number;
    /** Positive request-level base64 image payload bound after defaulting. */
    maxRequestImageBytes: number;
    /** Positive total-pixel request-version budget after defaulting. */
    requestImagePixelBudget: number;
    /** Positive raw request-version byte target after defaulting; the smallest quality-ladder output is used when no quality fits. */
    requestImageMaxBytes: number;
    /** Immutable retry policy captured with this provider route. */
    retryPolicy: ResolvedRetryPolicy;
    /**
     * The pi-ai provider containing this route's serviceable models. Absent when
     * a stored route cannot be constructed; its configuration remains editable.
     */
    piProvider?: Provider;
    /** First model diagnostic, or the route failure when no model diagnostic is available. */
    catalogError?: string;
    /** Per-model failures reported before attempting a request. */
    modelErrors: ReadonlyMap<string, string>;
    /**
     * Per-request output caps this profile explicitly configured, by model id.
     * The seam materializes one only into a request that names no cap of its
     * own, so a catalog capability must not appear here.
     */
    configuredMaxTokens: ReadonlyMap<string, number>;
}
/** Plugin configuration: the provider routes this instance owns. */
export interface Config {
    /**
     * pi-ai provider routes, keyed by provider. An empty (or omitted) dict is
     * the dormant settings-driven posture: the adapter mounts with no routes
     * and registers them the moment a settings section supplies profiles.
     */
    providers?: Record<string, PiAiProviderProfile>;
}
/** Runtime schema for {@link Config}. */
export declare const Config: z<Config>;
/**
 * Reject new or changed provider profiles that cannot be served. Unchanged
 * stored profiles may need repair after a catalog upgrade and do not block
 * edits to another provider. Removed profiles require no catalog validation.
 * @param config - the resolved section to check.
 * @param previous - current resolved section; omission checks every provider.
 * @throws Error naming the route and configuration entry that cannot be served.
 */
export declare function assertServiceable(config: Config, previous?: Config): void;
/**
 * Resolve scalar defaults and materialize each route's serviceable models.
 * Deferred catalog validation retains diagnostics without deleting configured
 * routes. An omitted dict resolves to the empty, dormant route set.
 * @param providers - configured provider profiles keyed by route.
 * @param validation - writes require a complete catalog; stored reads retain catalog diagnostics.
 * @returns validated profiles in configuration order.
 */
export declare function resolveProfiles(providers: Readonly<Record<string, PiAiProviderProfile>> | undefined, validation?: 'strict' | 'deferred'): Map<string, ResolvedPiAiProviderProfile>;
//# sourceMappingURL=config.d.ts.map