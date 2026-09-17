/** Host-owned opt-in setting for model-selectable subagent delegation. */
import { Context, Service } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type AllowedModelRoute } from './model-selection.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** User preference sampled when a new Session receives delegation tools. */
        subagentModelSelection: SubagentModelSelectionConfig;
    }
}
/** User-settings section for model-selectable subagent delegation. */
export declare const SUBAGENT_MODEL_SELECTION_SETTINGS_NAMESPACE = "subagent-model-selection";
/** Stored user preference; the shipped composition defaults it off. */
export interface SubagentModelSelectionSettings {
    /** Whether newly composed top-level Sessions receive model selection. */
    enabled: boolean;
    /** Exact child LLM routes offered to newly composed top-level Sessions. */
    allowedModels: AllowedModelRoute[];
}
/** Schema served to settings clients for the opt-in preference. */
export declare const SUBAGENT_MODEL_SELECTION_SETTINGS_SCHEMA: z<SubagentModelSelectionSettings>;
/** Optional deployment base for the preference. */
export interface Config {
    /** Initial enabled state inherited when the user document does not override it. */
    enabled?: boolean;
    /** Initial route list inherited when the user document does not override it. */
    allowedModels?: AllowedModelRoute[];
}
/** Singleton settings owner read when delegation tools are composed for a Session. */
export declare class SubagentModelSelectionConfig extends Service {
    static Config: z<Config>;
    private source;
    constructor(ctx: Context, config?: Config);
    /**
     * Read a detached selection preference for the next eligible Session composition.
     * @returns the enabled state and exact allowed routes.
     */
    current(): SubagentModelSelectionSettings;
    private validate;
}
export declare const name = "subagent-model-selection-settings";
export default SubagentModelSelectionConfig;
//# sourceMappingURL=model-selection-settings.d.ts.map