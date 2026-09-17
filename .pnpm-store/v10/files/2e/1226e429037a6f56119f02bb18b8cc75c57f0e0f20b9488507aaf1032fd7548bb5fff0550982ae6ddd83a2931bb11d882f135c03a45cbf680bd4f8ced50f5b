/**
 * Settings domain base plugin, browser half. Provides `ctx.settingsScope`, the
 * settings-namespace scope service every preference row binds its durable
 * section through, and owns the one `settings.describe` reader in the browser:
 * the describe mirror, whose invalidation subscriptions
 * (`settings/document-updated`, `connection/reset`) live here so every derived
 * surface refreshes from a single wire read. It depends on no `ui-*`
 * presentation package, so any feature that owns a preference can reach it:
 * the settings SHELL — the `sidebar.settings` occupant, its navigation, and
 * the chrome — lives in ui-settings-general, because a shell dependency on
 * ui-sidebar would close a reference cycle through ui-layout and ui-theme.
 * Export discipline: packages/client/AGENTS.md.
 */
import type { Context } from '@deepseek-ai/cordis';
export type { SettingsGeneralItemOwnerProps, SettingsHeaderOwnerProps, SettingsOnboardingOwnerProps, SettingsPluginsTabOwnerProps, SettingsSectionOwnerProps, SettingsTriggerOwnerProps, } from './contract/slots.ts';
export type { SettingsScopeController, SettingsScopeBinder } from './settings-scope.ts';
export type { SettingsScope, SettingsScopeSnapshot, SettingsScopeSpec } from './settings-contract.ts';
export type { SettingsSchemaService } from './schema.ts';
export type { SchemaNode } from './schema.ts';
export type { SettingsDescribeFace, SettingsDescribeView, SettingsMirrorSnapshot, } from './settings-mirror.ts';
/**
 * Required services: the Remote namespace the mirror reads through and the
 * forwarded settings invalidation it refreshes on.
 */
export declare const inject: string[];
/**
 * Provide the settings-namespace scope service over one shared describe
 * mirror, and keep that mirror fresh on the two signals that can move the
 * settings document: a document commit and a (re)connect.
 *
 * Constructing the service in this plugin's fiber keeps its traced methods
 * bound to each consuming plugin's context.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map