/** Replay-stable view models for Cordis lifecycle Tool calls. */
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client';
import type { CordisDynamicPackageId, CordisDynamicPluginId, CordisDynamicPluginRunId, CordisDynamicRunMode } from './events.ts';
type Block = ToolCallViewProps['block'];
/** Lifecycle of the tool call itself. */
export type CordisToolState = 'running' | 'ok' | 'error' | 'stopped';
/** Frozen `cordis_define` presentation data. */
export interface CordisDefineCard {
    readonly pluginId: CordisDynamicPluginId | null;
    readonly packageId: CordisDynamicPackageId | null;
    readonly name: string | null;
    readonly purpose: string | null;
    readonly hostCode: string | null;
    readonly clientCode: string | null;
    readonly output: string | null;
    readonly errorSummary: string | null;
    readonly state: CordisToolState;
}
/** Frozen `cordis_run` presentation data. */
export interface CordisRunCard {
    readonly pluginId: CordisDynamicPluginId | null;
    readonly packageId: CordisDynamicPackageId | null;
    readonly pluginRunId: CordisDynamicPluginRunId | null;
    readonly mode: CordisDynamicRunMode | null;
    readonly seq: number | null;
    readonly output: string | null;
    readonly errorSummary: string | null;
    readonly state: CordisToolState;
}
/** Frozen `cordis_stop` or `cordis_undefine` presentation data. */
export interface CordisActionCard {
    readonly pluginId: CordisDynamicPluginId | null;
    readonly output: string | null;
    readonly errorSummary: string | null;
    readonly state: CordisToolState;
}
/**
 * Derive one Define card from its frozen call/result slice.
 * @param block - active or settled tool-call block.
 * @returns normalized Define card fields.
 */
export declare function cordisDefineCard(block: Block): CordisDefineCard;
/**
 * Derive one Run card and its successful activation metadata.
 * @param block - active or settled tool-call block.
 * @returns normalized Run card fields.
 */
export declare function cordisRunCard(block: Block): CordisRunCard;
/**
 * Derive one Stop or Remove card from its frozen call/result slice.
 * @param block - active or settled tool-call block.
 * @returns normalized lifecycle-action card fields.
 */
export declare function cordisActionCard(block: Block): CordisActionCard;
export {};
//# sourceMappingURL=card-model.d.ts.map