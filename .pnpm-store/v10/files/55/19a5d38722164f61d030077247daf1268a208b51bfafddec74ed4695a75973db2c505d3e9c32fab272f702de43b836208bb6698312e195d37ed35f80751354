/**
 * Settings shell and ownerless-copy plugin, browser half: renders the
 * `sidebar.settings` occupant — panel chrome, section navigation, and the
 * onboarding stage — and registers everything on the Settings pages that
 * belongs to no single feature: the trigger/header chrome content,
 * local-document action, General section, and `settings` dictionaries.
 * Feature-owned rows and sections stay with their features.
 * Export discipline: packages/client/AGENTS.md.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type SettingsKey } from './locales.ts';
export type { CloseLabelProps, HeaderContentProps, TriggerContentProps, } from './chrome.tsx';
export type { GeneralSectionComponentProps, } from './GeneralSection.tsx';
export type { SettingsDocumentActionInjected, SettingsDocumentActionProps } from './SettingsDocumentAction.tsx';
export type { SettingsDocumentState } from './settings-document-store.ts';
export { SettingsDocumentStore } from './settings-document-store.ts';
export type { SettingsKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Shell chrome + shell-owned General section copy. */
        settings: SettingsKey;
    }
}
/**
 * Required services (cordis fiber inject). The target slots are declared by
 * ui-settings' apply, whose activation order relative to this one is NOT
 * constrained; registrations depend on their slots through `slots.inject()`.
 */
export declare const inject: string[];
/**
 * Register the `settings` dictionaries, the chrome content, and the General
 * section, each once its slot declaration is on the ledger.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map