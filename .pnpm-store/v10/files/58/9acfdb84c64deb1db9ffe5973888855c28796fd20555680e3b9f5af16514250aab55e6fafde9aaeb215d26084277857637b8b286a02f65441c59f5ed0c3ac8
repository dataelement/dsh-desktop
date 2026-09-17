/** Immutable system-only interpretation of the loaded Session surface. */
import type { SessionEvent } from '@deepseek-ai/dsh-session/types';
import type { SystemPromptNode } from './request-inspection.ts';
interface PositionedSystem {
    readonly position: number;
    readonly node: SystemPromptNode;
}
/** Prompt facts at one log prefix; earlier instances remain valid for historical cards. */
export interface SystemPromptState {
    /** Earliest relevant loaded event; older unindexed endpoints have unknown surface positions. */
    readonly firstSeq: number;
    /** Missing endpoint order makes the prompt unavailable until prepend replay supplies it. */
    readonly uncertain: boolean;
    /** Loaded system nodes in surface order, including empty dormant nodes. */
    readonly nodes: readonly PositionedSystem[];
    /** Surviving replacement endpoints only, mapped to inherited surface positions. */
    readonly replacements: ReadonlyMap<number, number>;
    /** Effective prompt and its change origin; empty text records removal, undefined means unavailable. */
    readonly effective: SystemPromptNode | undefined;
    /** System event at this position, if any; only this node may own an update card. */
    readonly introduced: SystemPromptNode | undefined;
}
/** Pure interpretation supplied to target-owned Definitions through uiConversation. */
export type SystemPromptInspector = (previous: SystemPromptState | undefined, event: SessionEvent) => SystemPromptState;
/**
 * Apply a system event or positional replacement without retaining ordinary messages.
 * Replacement positions inherit their start endpoint, not their chronological seq.
 * Unknown older endpoint order withholds the prompt until prepend replay resolves it.
 * @param previous - Interpretation at the preceding relevant event in the loaded window.
 * @param event - System message or surface replacement already admitted by Session.
 * @returns Immutable surviving system facts and the effective nonempty prompt.
 */
export declare function inspectSystemPrompt(previous: SystemPromptState | undefined, event: SessionEvent): SystemPromptState;
export {};
//# sourceMappingURL=system-prompt.d.ts.map