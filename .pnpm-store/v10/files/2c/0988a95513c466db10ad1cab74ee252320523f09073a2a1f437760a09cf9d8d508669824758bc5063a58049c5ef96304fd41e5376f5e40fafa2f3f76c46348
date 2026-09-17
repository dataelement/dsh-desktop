import { type ReactNode } from 'react';
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
type AgentPresetGroup = NonNullable<PluginInventorySnapshot['agentPresets']>[number];
/** Registration-side Remote face used by the section. */
export interface PluginInventorySettingsTabInjected {
    /** Read a current Host inventory snapshot. */
    list: () => Promise<PluginInventorySnapshot>;
    /**
     * Display name for one preset: shipped presets resolve through the
     * agent-preset dictionaries, user-authored ones keep their own metadata.
     */
    presetName: (preset: AgentPresetGroup) => string;
}
/** Full component props assembled by the Settings slot renderer. */
export type PluginInventorySettingsTabProps = PropsRuntime<'settings.plugins.tab'> & PropsLocale<'settings.pluginInventory'> & InjectFace<PluginInventorySettingsTabInjected>;
/** Render the read-only plugin inventory: agent presets first, then the global plane. */
export declare function PluginInventorySettingsTab({ list, presetName, t }: PluginInventorySettingsTabProps): ReactNode;
export {};
//# sourceMappingURL=PluginInventorySettingsTab.d.ts.map