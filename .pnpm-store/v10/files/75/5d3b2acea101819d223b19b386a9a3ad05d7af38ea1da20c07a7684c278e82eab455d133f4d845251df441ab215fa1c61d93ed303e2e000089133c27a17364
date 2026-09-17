import { type CSSProperties, type MutableRefObject } from 'react';
/**
 * Unplaced portal panel: hidden but laid out so the clamp measures real
 * dimensions (the `useAnchoredPosition` measure pass).
 */
export declare const MEASURE_STYLE: CSSProperties;
/** Open state, refs, and clamped placement for one stat dialog. */
export interface StatDialogSeat {
    open: boolean;
    setOpen: (open: boolean) => void;
    rootRef: MutableRefObject<HTMLSpanElement | null>;
    panelRef: MutableRefObject<HTMLDivElement | null>;
    pos: CSSProperties | null;
}
/**
 * One trigger-anchored dialog seat: open state, viewport-clamped placement, outside-close.
 * @param controlled - external open state; when given the seat reads and writes
 * it instead of owning its own, letting sibling dialogs share one exclusive slot.
 * @returns the seat; spread `pos ?? MEASURE_STYLE` onto the portaled panel.
 */
export declare function useStatDialog(controlled?: Pick<StatDialogSeat, 'open' | 'setOpen'>): StatDialogSeat;
//# sourceMappingURL=stat-dialog.d.ts.map