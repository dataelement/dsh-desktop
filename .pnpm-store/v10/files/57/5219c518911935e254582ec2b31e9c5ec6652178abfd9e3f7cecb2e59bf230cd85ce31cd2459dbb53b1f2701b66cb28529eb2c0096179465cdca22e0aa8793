/**
 * View-layer union of the host turn outline and the loaded rail items. The
 * conversation snapshot never carries projection values, so this merge is the
 * one place the rail's two sources meet: the `turnOutline` projection names
 * every turn of the session, and the loaded window supplies anchors and
 * richer previews for the turns it holds.
 */
import { SessionSeq } from '@deepseek-ai/dsh-session/types';
import type { TurnNavigationItem } from '../contract/snapshot.ts';
/** One rail mark: a loaded Turn scrolls to its row; an unloaded one pages history through its seq first. */
export interface TurnRailItem {
    readonly turn: number;
    /** Bounded prompt preview (loaded window first, outline fallback). */
    readonly prompt: string;
    /** Bounded response preview (loaded window first, outline fallback). */
    readonly response: string;
    /** How the rail reaches the Turn. */
    readonly anchor: {
        readonly kind: 'loaded';
        readonly key: string;
    } | {
        readonly kind: 'unloaded';
        readonly seq: SessionSeq;
    };
}
/**
 * Merge the host outline with the loaded rail items into the full ladder.
 * A turn present in both sides keeps the loaded anchor, taking an outline
 * preview only where the window's own is empty (a mid-Turn window head, or a
 * turn whose loaded nodes carry no text); turns on one side only pass
 * through. Result ascends by turn.
 * @param loaded - loaded-window rail items (timeline order).
 * @param outline - `turnOutline` projection value, treated as wire data.
 * @returns every known turn, ascending; a stable empty array when none.
 */
export declare function mergeTurnRailItems(loaded: readonly TurnNavigationItem[], outline: unknown): readonly TurnRailItem[];
//# sourceMappingURL=turn-rail-items.d.ts.map