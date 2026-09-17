import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit';
import type { KeyedSnapshotSelectorHook, PropsStore, SlotHookFactory } from '@deepseek-ai/dsh-client-ui-slots';
import type { SidebarRightTabActions, SidebarRightTabNavigation, UseSidebarRightTabInfo } from './contract/slots.ts';
import type { createSidebarRightStore } from './stores.ts';
/** Stable dispatch identity and framework hooks; never passed as tab component props. */
export interface TabHookContext {
    readonly tabId: TabId;
    readonly title: boolean;
    readonly fullscreen: boolean;
    readonly signal: AbortSignal;
    readonly actions: SidebarRightTabActions;
    readonly useStore: PropsStore<ReturnType<typeof createSidebarRightStore>>['useStore'];
    readonly useTabNavigation: KeyedSnapshotSelectorHook<SidebarRightTabNavigation>;
}
/**
 * Bind a tab occurrence without subscribing or creating records during factory evaluation.
 * @param standard - framework session identity.
 * @param context - stable record lifetime and framework-bound readers.
 * @returns the tab information hook.
 */
export declare const tabInfoFactory: SlotHookFactory<'sidebar.right.pane.tab', UseSidebarRightTabInfo>;
/**
 * Forward the framework-bound tab hook to a guide replacement.
 * @param _standard - the guide's framework standard props.
 * @param useTabInfo - the enclosing tab's framework-bound reader.
 * @returns the same reader for the replacement.
 */
export declare const guideTabInfoFactory: SlotHookFactory<'sidebar.right.tab.guide', UseSidebarRightTabInfo>;
//# sourceMappingURL=tab-info.d.ts.map