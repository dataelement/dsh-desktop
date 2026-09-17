import type { TurnTokenUsage } from '../contract/chat-nodes.ts';
import type { ChatViewSlotProps } from '../contract/slots.ts';
export interface TurnUsagePanelProps {
    usage: TurnTokenUsage;
    /** The owning view's locale seat, passed down as a plain prop. */
    t: ChatViewSlotProps['t'];
}
export interface TurnTimePanelProps {
    /** Turn wall time in ms, the pill's label. */
    runMs: number;
    /** Turn decode throughput, a dialog row when known. */
    tokensPerSecond?: number | undefined;
    /** Turn first-step TTFT in ms, a dialog row when known. */
    ttftMs?: number | undefined;
    /** The owning view's locale seat, passed down as a plain prop. */
    t: ChatViewSlotProps['t'];
}
/**
 * Turn-usage IconActions pill with a click-open Turn-usage details dialog.
 * @param props - Turn usage buckets and locale seat.
 * @returns The trigger and, while open, its portaled dialog anchored above the trigger.
 */
export declare function TurnUsagePanel({ usage, t }: TurnUsagePanelProps): import("react").JSX.Element;
/**
 * Turn-time IconActions pill with a click-open Turn-time details dialog.
 * @param props - Turn timing facts and locale seat.
 * @returns The clock-and-duration trigger and, while open, its portaled dialog anchored above the trigger.
 */
export declare function TurnTimePanel({ runMs, tokensPerSecond, ttftMs, t }: TurnTimePanelProps): import("react").JSX.Element;
//# sourceMappingURL=TurnUsagePanel.d.ts.map