/**
 * Models settings page store: one snapshot joining the configurable-provider
 * directory (`llm/listProviders` joined with `llm/listConfigurableProviders`),
 * the settings namespaces (shared settings mirror),
 * and the referenced credentials (`credentials/describe`). The host stays the
 * single fact source — every mutation writes through the wire and the page
 * re-renders from the next describe, pushed or refetched.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { CredentialInfo, LlmConfigurableProvider, LlmProviderInfo, SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SettingsDescribeFace } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { SettingsSchemaOperations } from './schema-operations.ts';
/** One provider row after joining the configurable directory with live routes. */
export interface ProviderDirectoryEntry {
    readonly provider: string;
    readonly displayName: string;
    readonly settingsNs: string;
    readonly settingsPath: readonly string[];
    readonly active: boolean;
    readonly declared?: boolean;
    readonly error?: string;
}
/**
 * Join declared configurable providers with the currently registered routes.
 * @param registered - live provider routes in registration order.
 * @param directory - declared configurable providers in declaration order.
 * @returns declared rows followed by live routes with no declaration.
 */
export declare function joinProviderDirectory(registered: readonly LlmProviderInfo[], directory: readonly LlmConfigurableProvider[]): ProviderDirectoryEntry[];
/** One provider row the page renders. */
export interface ProviderRow {
    /** The directory entry (route id, display name, settings address, live state). */
    entry: ProviderDirectoryEntry;
    /** Whether any layer configures this provider (its profile resolves). */
    configured: boolean;
    /** Whether the user layer alone carries the profile (removal restores the base). */
    removable: boolean;
    /** The credential reference the resolved profile names, when one does. */
    apiKeyEnv: string | undefined;
    /** Credential state for {@link apiKeyEnv}, once described. */
    credential: CredentialInfo | undefined;
    /**
     * Credential state for the page's derived `<ROUTE>_API_KEY`, described only
     * while the profile names no reference — the provider-card seat's
     * `keyConfigured` fact for dormant and keyless rows, matching the editor's
     * own derivation rule.
     */
    derivedCredential?: CredentialInfo;
}
/** Page snapshot. */
export interface ModelsSettingsState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    /** Whole-load failure text; row-level write failures stay in the editor. */
    error: string | null;
    /** Credential enrichment failure; provider/settings rows remain usable. */
    credentialError: string | null;
    /** Whether the settings provider accepts writes. */
    writable: boolean;
    /** Every configurable provider joined with its configured/credential state. */
    rows: readonly ProviderRow[];
    /** Namespace views by ns, for the editor's schema/layers/secrets. */
    namespaces: ReadonlyMap<string, SettingsNamespaceView>;
}
/**
 * Derive the conventional credential reference for a provider route: the v1
 * page never asks for an environment-variable name, so a typed key stores
 * under this derived reference and the profile records it as `apiKeyEnv`.
 * @param provider - provider route id (e.g. `anthropic`, `minimax-cn`).
 * @returns the derived reference name (e.g. `MINIMAX_CN_API_KEY`).
 */
export declare function deriveKeyRef(provider: string): string;
/**
 * The wire protocols a hand-declared route may name, read out of the owning
 * namespace's own schema. This stays a schema read rather than a wire field so
 * the choices the page offers cannot drift from the ones the adapter accepts:
 * both come from the same `Config`.
 * @param namespace - the namespace view whose schema declares the profile shape.
 * @param schema - settings schema operations.
 * @returns the protocol identifiers, or an empty list when the schema has none.
 */
export declare function protocolChoices(namespace: SettingsNamespaceView | undefined, schema: SettingsSchemaOperations): string[];
/** The models settings page controller (one per settings surface). */
export declare class ModelsSettingsStore {
    private readonly ctx;
    private readonly schema;
    private readonly describeFace;
    /** The snapshot the section renders from (uSES-safe store). */
    readonly store: SnapshotStore<ModelsSettingsState>;
    /** Latest load wins; an older response never overwrites a newer one. */
    private generation;
    /**
     * @param ctx - the page plugin's context, whose `remote.llm` and
     * `remote.credentials` namespaces carry the directory and credential reads.
     * @param schema - settings-owned schema and immutable path operations.
     * @param describeFace - the shared mirror's describe face (namespace views and writability).
     */
    constructor(ctx: ClientContext, schema: SettingsSchemaOperations, describeFace: SettingsDescribeFace);
    /**
     * Refresh the whole page snapshot: the provider directory and the mirror's
     * settings answer in parallel, then one batched credential describe over
     * every referenced ref. Provider failure or absence of an initial settings
     * answer keeps the last good rows and surfaces an error; a failed settings
     * refresh reuses the mirror's held view.
     * @returns nothing; the snapshot carries the outcome.
     */
    load(): Promise<void>;
    /** Publish one load's failure text, unless a newer load already took over. */
    private failLoad;
}
/**
 * Whether a joined row can serve model requests as it stands: the route is
 * registered with the adapter registry, and whatever credential its resolved
 * profile names is stored. A profile naming no reference authenticates through
 * the provider's own path (the Bedrock chain, Vertex ADC, a gateway that needs
 * nothing), as does a live route with no settings address at all, so neither
 * owes this page a key.
 * @param row - one joined provider row.
 * @returns whether the user already has this provider to talk to.
 */
export declare function providerUsable(row: ProviderRow): boolean;
/** First-run onboarding readiness derived only from the shared Models join. */
export type OnboardingReadiness = {
    kind: 'loading';
} | {
    kind: 'adapter-absent';
} | {
    kind: 'provider-ready';
} | {
    kind: 'credential-missing';
} | {
    kind: 'unavailable';
    reason: 'load-failed' | 'provider-inactive' | 'credentials-unavailable' | 'settings-read-only' | 'credential-read-only';
};
/**
 * Project first-run readiness from the provider/settings/credential join used
 * by the Models page. The step exists to leave the user with a model to talk
 * to, so ANY usable provider ends it; only when none exists does the official
 * DeepSeek route — the one route the prompt can offer a key field for — decide
 * whether prompting can help. A missing official configurable-provider
 * declaration means the adapter is not repairable by navigating to Models.
 * @param state - current shared Models join snapshot.
 * @returns the onboarding state without reading a parallel fact source.
 */
export declare function onboardingReadiness(state: ModelsSettingsState): OnboardingReadiness;
//# sourceMappingURL=store.d.ts.map