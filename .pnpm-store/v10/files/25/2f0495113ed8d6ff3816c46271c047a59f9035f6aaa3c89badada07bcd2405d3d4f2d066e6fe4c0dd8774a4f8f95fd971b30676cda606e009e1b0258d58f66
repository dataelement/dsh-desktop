/**
 * One plugin's card: a header naming the plugin and what its settings govern,
 * disclosing that plugin's controls in place, with the save that writes them.
 *
 * The header is its own button rather than a shared disclosure row because a
 * card stacks its name over its description, while that row lays the two side
 * by side — the layout, not the behavior, is what differs. Disclosure is
 * card-local state: which card a user has open is a reading gesture, not
 * something the Host or the section has any stake in. Staged edits outlive
 * collapsing, so the header marks a card holding unsaved edits.
 *
 * A card renders nothing while its namespace is unavailable: a deployment that
 * does not compose the owning plugin should show no trace of it, rather than a
 * disabled card the user cannot act on.
 */
import { type ReactNode } from 'react';
import type { CardShell } from './card-form.ts';
import type { PluginsSettingsLocaleKey } from './locales.ts';
/** Card chrome shared by every plugin section. */
export interface PluginCardProps {
    /** Locale reader for this section's copy. */
    t: (key: PluginsSettingsLocaleKey) => string;
    /** Locale key of the plugin's name. */
    titleKey: PluginsSettingsLocaleKey;
    /** Locale key of the line describing what this plugin's settings govern. */
    descriptionKey: PluginsSettingsLocaleKey;
    /** The card's form state: availability, writability, and what a save would do. */
    state: CardShell;
    /** Write every staged edit. */
    onSave: () => void;
    /** Drop every staged edit. */
    onDiscard: () => void;
    /** The plugin's controls. */
    children: ReactNode;
}
/**
 * Render one plugin card.
 * @param props - the plugin's copy keys, its form state, and its controls.
 * @returns the card, or nothing when the namespace is unavailable.
 */
export declare function PluginCard(props: PluginCardProps): import("react").JSX.Element | null;
//# sourceMappingURL=PluginCard.d.ts.map