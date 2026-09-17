/** Staged editor for the Host-owned subagent model allowlist. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ModelProviderGroup } from '@deepseek-ai/dsh-api-remotes/client';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { CardShell } from './card-form.ts';
/** Namespace of the Host-owned subagent model-selection preference. */
export declare const SUBAGENT_MODEL_SELECTION_NS = "subagent-model-selection";
/** One exact provider/model route stored as user authorization. */
export interface AllowedSubagentModel {
    provider: string;
    model: string;
}
/** Settings fields stored for subagent model selection. */
export interface SubagentModelSelectionSettings {
    /** Whether model-facing child route selection applies to new Sessions. */
    enabled: boolean;
    /** Exact child routes offered to newly composed top-level Sessions. */
    allowedModels: AllowedSubagentModel[];
}
/** One catalog row joined with a stored route that may no longer be advertised. */
export interface SubagentModelCandidate extends AllowedSubagentModel {
    /** Stable opaque identity used only for lookup. */
    key: string;
    /** Adapter-owned provider display name. */
    providerName: string;
    /** Adapter-owned model display name. */
    modelName: string;
    /** Whether the current adapter catalog advertises this exact route. */
    available: boolean;
    /** Whether the current draft authorizes this route. */
    selected: boolean;
}
/** State rendered by the staged allowlist card. */
export interface SubagentModelSelectionCardState extends CardShell {
    /** Whether the draft enables model-facing child route selection. */
    enabled: boolean;
    /** Live catalog joined with stored routes. */
    candidates: readonly SubagentModelCandidate[];
    /** Adapter-directory request state. */
    catalogStatus: 'idle' | 'loading' | 'ready' | 'error';
    /** Whether any provider-local catalog request failed. */
    catalogPartial: boolean;
    /** Whether a newer Host revision invalidated the current draft. */
    conflicted: boolean;
}
/** Registration-side face for the subagent model-selection card. */
export interface SubagentModelSelectionCardFace {
    hooks: {
        /** Card snapshot bound by the renderer as useSubagentModelSelectionCard. */
        subagentModelSelectionCard: SnapshotStore<SubagentModelSelectionCardState>;
    };
    /** Stage the enabled state; enabling also loads the adapter directory. */
    toggleEnabled: () => void;
    /** Stage one exact route as allowed or denied. */
    toggleModel: (key: string) => void;
    /** Retry the adapter directory. */
    retryCatalog: () => void;
    /** Persist the switch and exact routes as one revision-fenced mutation. */
    save: () => void;
    /** Drop the staged enabled state and route choices. */
    discard: () => void;
}
/**
 * Stable identity for one exact route; callers resolve it by lookup and never parse it.
 * @param route - Provider/model route to identify.
 * @returns Opaque key for lookup within the card.
 */
export declare function subagentModelKey(route: AllowedSubagentModel): string;
/**
 * Join live adapter metadata with stored routes that remain removable after disappearance.
 * @param groups - Current model directory grouped by provider.
 * @param stored - Routes in the effective settings value.
 * @param selected - Opaque route keys selected in the current draft.
 * @returns Candidate rows for the card.
 */
export declare function subagentModelCandidates(groups: readonly ModelProviderGroup[], stored: readonly AllowedSubagentModel[], selected: ReadonlySet<string>): SubagentModelCandidate[];
/** Bridges one settings scope and the live adapter directory onto a staged card. */
export declare class SubagentModelSelectionCardController {
    private readonly scope;
    private readonly ctx;
    private catalogGroups;
    private catalogPartial;
    private catalogStatus;
    private draftEnabled;
    private draftRoutes;
    private draftRevision;
    private saving;
    private failed;
    private conflicted;
    private disposed;
    private saveGeneration;
    private catalogGeneration;
    private readonly store;
    private readonly unsubscribe;
    /**
     * @param scope - bound `subagent-model-selection` settings scope.
     * @param ctx - the card plugin's context, whose `remote.session` namespace
     * answers the Host model catalog.
     */
    constructor(scope: SettingsScope<SubagentModelSelectionSettings>, ctx: ClientContext);
    /** Stop observing settings and suppress late directory/write settlements. */
    dispose(): void;
    /**
     * Build the renderer face for this card.
     * @returns The snapshot and staged card actions injected into the renderer.
     */
    inject(): SubagentModelSelectionCardFace;
    private currentRoutes;
    private currentEnabled;
    private selected;
    private enabled;
    private beginDraft;
    private toggleEnabled;
    private toggleModel;
    private clearDraft;
    private discard;
    private candidates;
    private desiredRoutes;
    private save;
    /** Invalidate and reload model candidates after a Host model input changes. */
    refreshCatalog(): void;
    /** Drop Host-specific candidates and drafts, then reload after reconnecting. */
    resetConnection(): void;
    private loadCatalog;
    private projection;
    private publish;
}
//# sourceMappingURL=subagent-model-selection-card-controller.d.ts.map