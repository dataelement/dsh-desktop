import { type ReactNode } from 'react';
import type { ChatViewSlotProps } from '../contract/slots.ts';
export interface MessageIconActionsProps {
    /** Plain text the copy action writes. */
    text: string;
    /** Unix epoch ms for the clock label; omitted for transient messages. */
    time?: number | undefined;
    /** Clock before icons (user) or after (assistant). */
    clock: 'start' | 'end';
    /** Fork the session at this message; omission hides the branch action. */
    onBranch?: (() => void) | undefined;
    /** The message is not a completed transcript tail, so branch stays visible but unavailable. */
    branchUnavailable?: boolean | undefined;
    /** Parent layout class composed onto the actions row. */
    className?: string | undefined;
    /**
     * Slot-rendered actions owned by independent plugins, placed between the
     * built-in copy and branch controls.
     */
    extraActions?: ReactNode;
    /**
     * Icon-row Turn-usage trigger (the TurnUsagePanel pill), seated after the
     * branch control at the end of the icon cluster.
     */
    usageAction?: ReactNode;
    /** The owning view's locale seat, passed down as a plain prop. */
    t: ChatViewSlotProps['t'];
}
/**
 * Copy / branch (/ clock) IconActions row shared by user and assistant chrome.
 * @param props - Copy text, event time, clock side, branch callback, className.
 * @returns The actions row element.
 */
export declare function MessageIconActions({ text, time, clock, onBranch, branchUnavailable, className, extraActions, usageAction, t, }: MessageIconActionsProps): import("react").JSX.Element;
//# sourceMappingURL=MessageIconActions.d.ts.map