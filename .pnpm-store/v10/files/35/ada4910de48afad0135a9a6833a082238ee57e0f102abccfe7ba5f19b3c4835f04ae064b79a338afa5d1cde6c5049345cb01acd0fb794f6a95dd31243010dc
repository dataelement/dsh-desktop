/**
 * The web-search card's staged form over the `web-search-deepseek` settings
 * namespace.
 *
 * The key is the one control that does not live in the section: its literal
 * never rides a response, so the card learns only whether one is configured
 * and writes it through the credentials domain, addressed by the reference the
 * section names. It is still staged with the rest of the form, so one save
 * covers everything the card shows.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client';
import { type CardActions, type CardFieldState, type CardShell } from './card-form.ts';
/**
 * Namespace of the DeepSeek search provider. Spelled here rather than
 * imported: a client package must not depend on a Host package.
 */
export declare const WEB_SEARCH_NS = "web-search-deepseek";
/** The search-provider fields this card edits. */
export interface WebSearchSettings {
    /** Credential reference naming the environment key. */
    apiKeyEnv?: string;
    /** Provider endpoint; blank inherits the provider default. */
    baseURL?: string;
    /** Maximum searches served within one request. */
    maxUses?: number;
}
/** What the web-search card renders. */
export interface WebSearchCardState extends CardShell {
    /** Provider endpoint. */
    baseURL: CardFieldState;
    /** Searches allowed per request. */
    maxUses: CardFieldState;
    /** The staged credential, which starts blank on every load. */
    apiKey: CardFieldState;
    /** Whether the Host reports a credential configured for the referenced key. */
    apiKeyConfigured: boolean;
    /** Whether the credentials domain accepts a write for it; false disables the control. */
    apiKeyWritable: boolean;
}
/** The registration-side face the web-search card's slot entry injects. */
export interface WebSearchCardFace extends CardActions {
    hooks: {
        /** Card snapshot bound by the renderer as useWebSearchCard. */
        webSearchCard: SnapshotStore<WebSearchCardState>;
    };
}
/** Bridges the `web-search-deepseek` scope and the credentials domain onto the card. */
export declare class WebSearchCardController {
    private readonly scope;
    private readonly ctx;
    private readonly form;
    private readonly store;
    private credential;
    /**
     * @param scope - the bound settings scope for the `web-search-deepseek` namespace.
     * @param ctx - the card plugin's context, whose `remote.credentials` namespace
     * answers for the credential the section references.
     */
    constructor(scope: SettingsScope<WebSearchSettings>, ctx: ClientContext);
    private projection;
    /**
     * Ask the credentials domain about the reference the section currently names.
     *
     * The answer is stored with the reference it describes: `apiKeyEnv` can
     * change between the request and its response, and two reads can settle out
     * of order, so a response is published only while it still answers for the
     * reference in force.
     */
    private readCredential;
    /**
     * Re-read after the Host reports a change to the reference this card watches.
     *
     * A key can be written from somewhere else — the Models page addresses the
     * same reference — and the settings section does not change when it is, so
     * without this the badge keeps reporting a state the Host already replaced.
     * @param ref - the reference the Host reports as changed.
     */
    refreshCredential(ref: string): void;
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject(): WebSearchCardFace;
    /**
     * Write the staged key, then re-read whether the Host now holds one.
     * @param value - the staged credential literal.
     * @returns whether the Host reports a configured credential afterwards.
     */
    private writeKey;
}
//# sourceMappingURL=web-search-card-controller.d.ts.map