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
import type { Api, Model, Provider } from '@earendil-works/pi-ai';
/**
 * Every wire protocol a configured route may name, most-reached first. The
 * order is the table's and therefore stable; a configuration surface offering
 * a choice presents the first as its default, which is why the protocol a
 * hand-declared gateway most often speaks — and the one endpoint interrogation
 * can read — leads.
 * @returns the supported protocol identifiers.
 */
export declare function supportedProtocols(): readonly string[];
/** The resolved route facts provider construction reads. */
export interface ProviderSpec {
    /** Provider route key; also the `Models` collection key and each model's `provider`. */
    provider: string;
    /** Display name for selectors and status labels. */
    displayName: string;
    /** Wire protocol override; absent means each model keeps its catalog protocol. */
    api?: string;
    /** Endpoint override already applied to {@link models}; kept for provider-level display. */
    baseURL?: string;
    /** The route's materialized models, in configuration order. */
    models: readonly Model<Api>[];
    /**
     * Whether the profile names a credential, which it does through `apiKeyEnv`
     * alone: configuration carries the reference, never the secret. Only that
     * decides whether {@link routeAuth} adds the harness's own api-key method to
     * a catalog provider that offers none; the key itself still arrives per
     * request, never at construction.
     */
    namesCredential: boolean;
}
/**
 * Build the pi-ai provider for one resolved route.
 * @param spec - the resolved route facts.
 * @returns the provider to register in the adapter's `Models` collection.
 * @throws Error when the route names a wire protocol this build cannot serve.
 */
export declare function buildProvider(spec: ProviderSpec): Provider;
//# sourceMappingURL=provider.d.ts.map