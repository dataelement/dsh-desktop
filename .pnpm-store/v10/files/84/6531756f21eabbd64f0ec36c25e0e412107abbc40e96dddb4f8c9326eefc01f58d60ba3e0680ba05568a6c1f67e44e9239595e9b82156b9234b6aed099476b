/** Visual state rendered by {@link ConnectionIndicator}. */
export type ConnectionIndicatorState = 'disconnected' | 'connecting' | 'recovered';
/**
 * Render an inline connection-recovery control.
 * @param props.state - visible outage, retry-attempt, or recovered state.
 * @param props.disconnectedLabel - localized outage text.
 * @param props.reconnectLabel - localized action text shown on hover or focus.
 * @param props.connectingLabel - localized retry text followed by the attempt dots.
 * @param props.recoveredLabel - localized recovery confirmation.
 * @param props.reconnectActionLabel - accessible label for the outage action.
 * @param props.restartActionLabel - accessible label for replacing an active attempt.
 * @param props.onReconnect - request an immediate reconnect attempt.
 * @returns the indicator, or null when no connection feedback is active.
 */
export declare function ConnectionIndicator({ state, disconnectedLabel, reconnectLabel, connectingLabel, recoveredLabel, reconnectActionLabel, restartActionLabel, onReconnect, }: {
    state: ConnectionIndicatorState | undefined;
    disconnectedLabel: string;
    reconnectLabel: string;
    connectingLabel: string;
    recoveredLabel: string;
    reconnectActionLabel: string;
    restartActionLabel: string;
    onReconnect: () => void;
}): import("react").JSX.Element | null;
//# sourceMappingURL=ConnectionIndicator.d.ts.map