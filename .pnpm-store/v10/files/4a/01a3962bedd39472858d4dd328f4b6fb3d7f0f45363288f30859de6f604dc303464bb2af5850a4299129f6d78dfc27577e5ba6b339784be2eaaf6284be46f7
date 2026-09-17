/**
 * The card that declares a provider pi-ai does not ship — an OpenAI-compatible
 * gateway, a self-hosted server, or a provider newer than the installed
 * catalog.
 *
 * This is a create, not an edit, which is why it is its own card rather than
 * the provider editor with extra fields: the route id is being *chosen* here,
 * and the settings address does not exist until it is. One `settings.mutate`
 * sets the whole profile at `providers.<route>`; the key travels separately
 * through `credentials/set` under the reference the profile records, exactly as
 * an existing provider's key does.
 *
 * The three fields a hand-declared route cannot default — endpoint, protocol,
 * and at least one model — are required here rather than at load, so the
 * failure names the field while the user is still looking at it.
 *
 * There is deliberately no reasoning-effort control, here or on the editor
 * card: effort is a per-MODEL capability, and the models under one provider
 * disagree about it, so a provider-scoped control can only be set to a value
 * some of them reject. The composer's model picker offers each model its own
 * levels instead.
 */
import type { ReactNode } from 'react';
import type { ModelsOperations } from './operations.ts';
import type { en } from './locales.ts';
/** Props of {@link CustomProviderCard}. */
export interface CustomProviderCardProps {
    /** Route ids already declared, so the card refuses to shadow one. */
    taken: readonly string[];
    /** Wire protocols the adapter can serve, in the order it reports them. */
    protocols: readonly string[];
    /**
     * Revision of the `llm-pi-ai` user section this card opened at, sent with
     * the create so a route another tab declared meanwhile is a refusal rather
     * than a silent overwrite of its whole profile.
     */
    revision: number;
    /** The Host operations this card writes and interrogates through. */
    operations: ModelsOperations;
    /** Section copy. */
    t: (key: keyof typeof en) => string;
    /** Disable writes (read-only settings provider). */
    readOnly: boolean;
    /** Close the card; `changed` reports whether a provider was created. */
    onClose: (changed: boolean) => void;
}
/**
 * Render the custom-provider creation card.
 * @param props - existing routes, protocol choices, wire faces, and copy.
 * @returns the creation card.
 */
export declare function CustomProviderCard(props: CustomProviderCardProps): ReactNode;
//# sourceMappingURL=CustomProviderCard.d.ts.map