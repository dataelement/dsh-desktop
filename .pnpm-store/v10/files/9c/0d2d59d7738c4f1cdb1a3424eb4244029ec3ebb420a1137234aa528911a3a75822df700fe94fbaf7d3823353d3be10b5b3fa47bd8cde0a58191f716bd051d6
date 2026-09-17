/**
 * Plugins settings surface, browser half — one section whose feature-owned
 * tabs include configurable Host plugin cards and read-only inventory.
 *
 * The section declares `settings.plugins.tab`; its own `configurable` tab then
 * declares `settings.plugin.item` and renders whatever cards were registered
 * into it. The cards this package ships are the host-plane sections the
 * deployment already exposes; each binds its namespace through the client
 * settings scope, which keeps them unaware of one another and of other tabs.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export type { PluginsSettingsSectionInjected, PluginsSettingsSectionProps } from './PluginsSettingsSection.tsx';
export type { ConfigurablePluginsTabProps } from './ConfigurablePluginsTab.tsx';
export type { ConfigurablePluginsTabFace, ConfigurablePluginsTabState } from './tab-store.ts';
export type { PluginCardProps } from './PluginCard.tsx';
export type { SettingsPluginItemOwnerProps } from './slot-contract.ts';
export type { FieldProps } from './fields.tsx';
export type { CardActions, CardFieldSpec, CardFieldState, CardSecretSpec, CardShell, } from './card-form.ts';
export type { AgentLoopCardFace, AgentLoopCardState } from './agent-loop-card-controller.ts';
export type { BashCardFace, BashCardState } from './bash-card-controller.ts';
export type { WebSearchCardFace, WebSearchCardState } from './web-search-card-controller.ts';
/** Required services (cordis fiber inject). */
export declare const inject: string[];
/**
 * Mount the plugin configuration section and the cards this package ships.
 * @param ctx - the browser plugin context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map