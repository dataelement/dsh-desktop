/**
 * Configurable Host plugins contributed to the shared Plugins section.
 *
 * The tab enumerates settings namespaces but never interprets one — a card
 * arrives through `settings.plugin.item` keyed by the namespace it edits, so a
 * plugin that ships a browser half owns its own card and this tab only decides
 * which keys to dispatch.
 */
import type { InjectFace, PropsLocale, PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ConfigurablePluginsTabFace } from './tab-store.ts';
/** Props the renderer binds for the configurable tab. */
export type ConfigurablePluginsTabProps = PropsRuntime<'settings.plugins.tab'> & PropsLocale<'settings.plugins'> & PropsRenderSlots<'settings.plugin.item'> & InjectFace<ConfigurablePluginsTabFace>;
/**
 * Render cards registered by plugins that expose editable settings.
 * @param props - locale copy, slot rendering, and the namespaces to dispatch.
 * @returns the card list, or the empty line once the Host has answered.
 */
export declare function ConfigurablePluginsTab(props: ConfigurablePluginsTabProps): import("react").JSX.Element | null;
//# sourceMappingURL=ConfigurablePluginsTab.d.ts.map