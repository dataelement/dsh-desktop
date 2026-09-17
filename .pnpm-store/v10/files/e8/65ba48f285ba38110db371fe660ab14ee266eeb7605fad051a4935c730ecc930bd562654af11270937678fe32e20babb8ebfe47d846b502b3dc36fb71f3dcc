/** Trajectory toolbar: timeline and ledger fold controls. */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { NS } from './locales.ts';
export interface TrajectoryToolbarProps {
    /** Whether timeline blocks use recorded durations instead of equal widths. */
    actualDuration: boolean;
    /** Select recorded-duration or equal-width blocks. */
    onActualDurationChange: (actualDuration: boolean) => void;
    /** Whether recorded timing retains idle gaps between operations. */
    actualTime: boolean;
    /** Select complete wall-clock timing or idle-compressed timing. */
    onActualTimeChange: (actualTime: boolean) => void;
    /** Whether every collapsible turn is currently folded. */
    allTurnsCollapsed: boolean;
    /** Fold or expand every collapsible turn. */
    onToggleAllTurns: () => void;
    /** Whether every collapsible assistant's tool calls are currently folded. */
    allAssistantsCollapsed: boolean;
    /** Fold or expand tool calls under every collapsible assistant. */
    onToggleAllAssistants: () => void;
    /** Current live ledger search query. */
    searchQuery: string;
    /** Update the live ledger search query. */
    onSearchQueryChange: (query: string) => void;
    /** Translate a toolbar dictionary key. */
    t: TranslateNS<typeof NS>;
}
/**
 * Render the sticky trajectory toolbar.
 * @param props - rendered counts and whole-list fold state.
 * @returns the toolbar element.
 */
export declare function TrajectoryToolbar({ actualDuration, onActualDurationChange, actualTime, onActualTimeChange, allTurnsCollapsed, onToggleAllTurns, allAssistantsCollapsed, onToggleAllAssistants, searchQuery, onSearchQueryChange, t, }: TrajectoryToolbarProps): import("react").JSX.Element;
//# sourceMappingURL=TrajectoryToolbar.d.ts.map