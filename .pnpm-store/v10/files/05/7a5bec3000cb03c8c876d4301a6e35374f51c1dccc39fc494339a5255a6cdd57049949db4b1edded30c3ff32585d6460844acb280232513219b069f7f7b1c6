/** Optional settings-header action for opening a file-backed Host document. */
import type { ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SettingsDocumentStore } from './settings-document-store.ts';
/** Registrant-owned dependencies of {@link SettingsDocumentAction}. */
export interface SettingsDocumentActionInjected {
    /** Provider metadata and action state owner. */
    controller: SettingsDocumentStore;
    hooks: {
        /** Controller snapshot bound by the UI renderer as useSnapshot. */
        snapshot: SettingsDocumentStore['store'];
    };
}
/** Header-action owner share, localized copy, and the registrant's state face. */
export type SettingsDocumentActionProps = PropsRuntime<'settings.action'> & PropsLocale<'settings'> & InjectFace<SettingsDocumentActionInjected>;
/**
 * Render the open-document action only after Host metadata confirms document availability.
 * @param props - header owner props, localized copy, and injected document state.
 * @returns the action, or null while unavailable or unresolved.
 */
export declare function SettingsDocumentAction({ controller, useSnapshot, t }: SettingsDocumentActionProps): ReactNode;
//# sourceMappingURL=SettingsDocumentAction.d.ts.map