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
import type { AuthContext, CredentialStore } from '@earendil-works/pi-ai';
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, ImageAttachmentAccess, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, PreparedAdapterCall, ResolvedRetryPolicy, StreamChunk } from '@deepseek-ai/dsh-llm';
import type { AttachmentStore, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { ResolvedPiAiProviderProfile } from './config.ts';
/** Constructor options for {@link PiAiAdapter}: the two resolution hooks the plugin owns. */
export interface PiAiAdapterOptions {
    /** Current validated profiles by provider route; called once per operation. */
    profiles: () => ReadonlyMap<string, ResolvedPiAiProviderProfile>;
    /**
     * Resolve the credential for one already-resolved profile; called once per
     * stream call and frozen for that call. `undefined` defers to the route's own
     * pi-ai auth, which for an installed catalog route is its provider-native
     * ambient discovery; the plugin allows that only for a profile naming no
     * credential at all, because a named reference that misses throws `LlmError`
     * `MISSING_CREDENTIAL` rather than falling back.
     */
    resolveApiKey: (provider: string, profile: ResolvedPiAiProviderProfile) => Promise<string | undefined>;
    /**
     * How every collection this adapter builds resolves auth the request-level
     * `apiKey` override does not cover. Required rather than optional: a
     * collection built without them gets pi-ai's in-memory default store, which
     * is empty at every boot and discarded on every configuration change, so a
     * route whose only method is a login would report itself unconfigured on
     * every request no matter how often the human signed in.
     */
    auth: PiAiAuthInjection;
    /** Resolve the optional durable attachment service at request time. */
    resolveAttachments?: () => AttachmentStore | undefined;
    /** Bridge one attachment reference into the current model-tool execution world. */
    resolveImageAccess?: (attachments: AttachmentStore, ref: ImageAttachmentRef) => ImageAttachmentAccess | undefined;
    /**
     * Observe one assistant history message degrading to provider-neutral
     * conversion because its stored replay state is unusable by this build.
     */
    onReplayDegrade?: (detail: {
        provider: string;
        model: string;
        reason: string;
    }) => void;
}
/** The two auth injectables a pi-ai collection is built with. */
export interface PiAiAuthInjection {
    /** Durable storage for credentials pi-ai itself writes: logins, and the refreshes it runs under its own lock. */
    credentials: CredentialStore;
    /** Ambient lookups a provider performs while resolving its own auth. */
    authContext: AuthContext;
}
/**
 * pi-ai-backed multi-provider adapter. Each operation reads the current
 * profiles, so a configuration change reaches the next request without a
 * restart; model descriptors come from the collection those profiles built.
 */
export declare class PiAiAdapter extends LlmAdapter {
    private readonly config;
    private snapshot;
    constructor(config: PiAiAdapterOptions);
    /**
     * The snapshot for the current profiles. Resolution memoizes its result, so
     * an unchanged configuration is recognized by identity; a changed one gets a
     * brand-new collection, leaving any snapshot an operation already captured
     * untouched for as long as that operation holds it.
     */
    private current;
    /** The profile for one route within one snapshot, or the not-owned failure. */
    private profileOf;
    /** The configured descriptor for one exact route/model pair within one snapshot. */
    private modelOf;
    providerInfo(provider: string): LlmProviderInfo;
    providerRetryPolicy(provider: string): ResolvedRetryPolicy | undefined;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    resolveModel(provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    private modelInfo;
    prepareCall(provider: string, model: string, _signal?: AbortSignal): Promise<PreparedAdapterCall>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
    private streamWithSnapshot;
}
//# sourceMappingURL=adapter.d.ts.map