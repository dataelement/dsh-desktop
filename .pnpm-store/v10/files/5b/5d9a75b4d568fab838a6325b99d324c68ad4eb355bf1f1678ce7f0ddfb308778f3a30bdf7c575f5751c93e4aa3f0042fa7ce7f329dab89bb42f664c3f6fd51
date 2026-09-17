import type { ChatViewSlotProps } from '../contract/slots.ts';
import type { TurnRailItem } from './turn-rail-items.ts';
interface TurnNavigatorProps {
    readonly items: readonly TurnRailItem[];
    readonly activeTurn: number | null;
    /** Turn whose jump is still paging history in; its mark pulses. */
    readonly busyTurn: number | null;
    readonly onNavigate: (item: TurnRailItem) => void;
    readonly t: ChatViewSlotProps['t'];
}
declare function TurnNavigatorRail({ items, activeTurn, busyTurn, onNavigate, t }: TurnNavigatorProps): import("react").JSX.Element | null;
/**
 * Fixed-pitch rail of every known Turn — loaded marks scroll, unloaded marks
 * page history in first — with hover and focus previews. Overflow scrolls
 * inside the frame, gradient fades marking each scrollable end, and the
 * active mark keeps itself in view while the pointer is elsewhere.
 *
 * Memoized because it renders two host elements per Turn while the
 * enclosing view re-renders on every streaming delta: without the guard a long
 * session rebuilds hundreds of marks per commit for a rail that only changes
 * when a Turn is added, removed, or becomes active. Its props must therefore
 * stay referentially stable across those commits.
 */
export declare const TurnNavigator: import("react").MemoExoticComponent<typeof TurnNavigatorRail>;
export {};
//# sourceMappingURL=TurnNavigator.d.ts.map