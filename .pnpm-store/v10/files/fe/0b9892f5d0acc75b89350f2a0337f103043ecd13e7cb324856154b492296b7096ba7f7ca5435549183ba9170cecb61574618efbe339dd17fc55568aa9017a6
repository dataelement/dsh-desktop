/**
 * Trajectory list fold: expand assistant blocks, attach usage to Message,
 * own-duration times, in-flight partial/runningCalls, and group descriptions.
 */
import type { ConversationLocation, RequestInspectionSnapshot, RequestView } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { TrajectoryCellProps } from './trajectory-record.ts';
import type { TrajectorySnapshot } from './trajectory-contract.ts';
import type { TrajectoryTranslate } from './locales.ts';
/** One Message or Step group inside a turn. */
export interface TrajectoryGroupModel {
    title: string;
    description?: string;
    cells: readonly TrajectoryCellProps[];
}
/** One sticky turn, or a standalone compaction section between turns. */
export interface TrajectoryTurnModel {
    turn: number | null;
    groups: readonly TrajectoryGroupModel[];
}
/** Snapshot slice the trajectory view folds. */
export interface TrajectoryLayoutInput {
    systemPrompts?: TrajectorySnapshot['systemPrompts'];
    nodes: TrajectorySnapshot['eventNodes'];
    eventLocations?: ReadonlyMap<number, ConversationLocation>;
    partial: TrajectorySnapshot['partial'];
    runningCalls: TrajectorySnapshot['runningCalls'];
    requests?: readonly RequestView[];
    callSchemas?: RequestInspectionSnapshot['callSchemas'];
}
/**
 * Fold a snapshot into turn → Message/Step groups with expanded cells.
 * @param input - nodes plus in-flight partial/runningCalls.
 * @param t - Trajectory locale translator.
 * @returns turns ordered by first appearance.
 */
export declare function deriveTrajectoryLayout(input: TrajectoryLayoutInput, t: TrajectoryTranslate): readonly TrajectoryTurnModel[];
/**
 * Append the changing in-flight assistant cells to a stable finalized layout.
 * @param turns - Finalized layout derived with an empty-block partial anchor.
 * @param partial - Current in-flight assistant projection.
 * @param lastIndex - Highest cell index in the finalized layout.
 * @param t - Trajectory locale translator.
 * @returns The original layout without a partial, otherwise a layout sharing every unaffected turn.
 */
export declare function appendTrajectoryPartialLayout(turns: readonly TrajectoryTurnModel[], partial: TrajectorySnapshot['partial'], lastIndex: number, t: TrajectoryTranslate): readonly TrajectoryTurnModel[];
//# sourceMappingURL=layout.d.ts.map