/**
 * GoalBar: the goal indicator docked above the message composer (input dock
 * strip). A present goal shows a goal glyph, a phase label, the truncated
 * objective, and icon actions — resume when active-disarmed or paused, edit
 * (inline form in the same strip), and clear. Goal creation lives on the
 * `/goal` command, not here: loading (undefined), no goal (null), and complete
 * goals render nothing. Durable state arrives as the projected whole snapshot;
 * process-local activation arrives through the injected activation hook.
 */
import type { GoalActivation, GoalSnapshot } from '@deepseek-ai/dsh-goal/client';
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { GoalBarActions, GoalBarInjected } from './slots.ts';
export interface GoalBarProps extends GoalBarActions {
    /** Current goal snapshot; undefined = capability absent or loading, null = no goal set. */
    goal: GoalSnapshot | null | undefined;
    /** Process-local continuation activation; absent while the live read is pending. */
    activation?: GoalActivation;
}
export declare function GoalBar({ goal, activation, onEdit, onPause, onResume, onClear, t }: GoalBarProps & PropsLocale<'goal'>): import("react").JSX.Element | null;
/** Full props of the dock entry: InputZone owner share + injected verbs/activation hook + the locale seat. */
export type GoalDockProps = import('@deepseek-ai/dsh-client-ui-slots').PropsRuntime<'conversation.input.dock'> & InjectFace<GoalBarInjected> & PropsLocale<'goal'>;
/** Dock adapter: overlays process-local activation on the durable goal projection. */
export declare function GoalDock({ useProjection, useGoalActivation, onEdit, onPause, onResume, onClear, t, }: GoalDockProps): import("react").JSX.Element;
//# sourceMappingURL=GoalBar.d.ts.map