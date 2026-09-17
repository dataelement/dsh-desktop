/**
 * The configurable-plugins tab's card list.
 *
 * The tab dispatches its slot by settings namespace, so what it renders is
 * the intersection of two ledgers: the namespaces the Host serves and the
 * cards registered into `settings.plugin.item`. A served namespace no card
 * claims renders nothing — another surface owns it, or this deployment ships
 * no browser half for it — and a card whose namespace the Host does not serve
 * is never dispatched, so a plugin this deployment did not compose leaves no
 * trace and does not count toward the empty line.
 */
import type { SettingsDescribeFace } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
/** What the section renders. */
export interface ConfigurablePluginsTabState {
    /**
     * Whether the Host has answered once. The empty line waits for it: an
     * unanswered read is not the same statement as "this deployment configures
     * no plugin", and saying the second while the first is true would flash a
     * wrong answer on every open.
     */
    loaded: boolean;
    /**
     * Namespaces to dispatch, in the order their cards registered, narrowed to
     * those the Host serves. Card registration order rather than the Host's
     * description order: the latter follows plugin activation, which async
     * settings injection can reorder between boots, and a settings page whose
     * cards move between visits is worse than one whose order a registrant
     * chose.
     */
    namespaces: string[];
}
/** The registration-side face the tab's slot entry injects. */
export interface ConfigurablePluginsTabFace {
    hooks: {
        /** Section snapshot bound by the renderer as usePluginConfigSection. */
        configurablePlugins: SnapshotStore<ConfigurablePluginsTabState>;
    };
}
/** Derives the served namespaces from the shared describe mirror and pairs them with the cards that claim them. */
export declare class ConfigurablePluginsTabController {
    private readonly describeFace;
    private readonly entries;
    private readonly store;
    private disposed;
    private readonly unsubscribe;
    /**
     * @param describeFace - the shared mirror's describe face; its refreshes
     * (document commits, reconnects) are what keep the served set current.
     * @param entries - reads the cards currently registered into the section's slot.
     */
    constructor(describeFace: SettingsDescribeFace, entries: () => readonly StoredEntry[]);
    /** Republish after the slot ledger changed; a card registered late joins here. */
    refresh(): void;
    /** Stop publishing and stop following the mirror. */
    dispose(): void;
    /**
     * Build the face the tab's slot registration injects.
     * @returns the tab's snapshot source.
     */
    inject(): ConfigurablePluginsTabFace;
    private publish;
}
//# sourceMappingURL=tab-store.d.ts.map