/**
 * Permission preference row: the default preset for subsequently created
 * sessions. Current-session switches remain on the composer `/permission`
 * control.
 */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { PermissionSettingsState } from './settings-store.ts';
import type { PermissionSettingsKey } from './locales.ts';
/** Registration-side business face for the host-backed preference. */
export interface PermissionRowInjected {
    hooks: {
        /** Permission settings snapshot bound by the renderer as usePermission. */
        permission: SnapshotStore<PermissionSettingsState>;
    };
    /** Load the descriptor when the row first renders. */
    load: () => Promise<void>;
    /** Persist one advertised preset. */
    select: (preset: string) => Promise<void>;
}
/** Full component props. */
export type PermissionRowProps = PropsRuntime<'settings.general.item'> & PropsLocale<'settings.permission'> & InjectFace<PermissionRowInjected>;
/**
 * Render the new-session Permission default selector.
 * @param props - composed slot props.
 * @returns the row, or null when the host does not expose permission settings.
 */
export declare function PermissionRow({ load, select, usePermission, t }: PermissionRowProps): import("react").JSX.Element | null;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Permission row copy. */
        'settings.permission': PermissionSettingsKey;
    }
}
//# sourceMappingURL=PermissionRow.d.ts.map