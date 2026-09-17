/** Web presentation fold joining transient Assistant frames to one durable v2 settlement. */
import type { SessionAssistantStreamBaseline, SessionAssistantStreamFrame } from '../../types.ts';
import type { LlmAttemptId } from '@deepseek-ai/dsh-llm/brand';
import type { SessionAssistantSettlementEntry, SessionEventLikeEntry, SessionLiveEventEntry, SessionTransientEventEntry } from '../contract/events.ts';
/** One Web publication decision from the assistant stream fold. */
export type ClientAssistantStreamResult = {
    readonly type: 'publish';
    readonly entry: SessionLiveEventEntry;
} | {
    readonly type: 'settlement';
    readonly attemptId: LlmAttemptId;
    readonly entry: SessionAssistantSettlementEntry;
} | {
    readonly type: 'abandonment';
    readonly attemptId: LlmAttemptId;
} | {
    readonly type: 'transient';
    readonly entry: SessionTransientEventEntry;
} | {
    readonly type: 'rebaseline';
} | undefined;
/** Keeps transient Assistant presentation behind one settlement-aware interface. */
export declare class ClientAssistantStream {
    private activeAttempt;
    private readonly pending;
    private publishedSeqs;
    private durableCursor;
    private transientInGap;
    /**
     * Replace the durable Web window and adopt an optional reconnect baseline.
     * @param entries - durable entries in the replacement window.
     * @param baseline - compact prefix for an Assistant attempt that is still live.
     * @returns immediately visible durable entries plus reconstructed transient chunks.
     */
    replace(entries: readonly SessionEventLikeEntry[], baseline?: SessionAssistantStreamBaseline): readonly SessionEventLikeEntry[];
    /**
     * Stage one durable v2 settlement while its matching live attempt is open.
     * @param entry - newly followed durable entry.
     * @returns a publication decision, or `undefined` when no entry becomes visible.
     */
    acceptDurable(entry: SessionLiveEventEntry): ClientAssistantStreamResult;
    /**
     * Fold one dense transient frame and release its named durable settlement.
     * @param frame - next Assistant stream frame received by the follow connection.
     * @returns a transient, publication, or rebaseline decision, or `undefined` when no entry becomes visible.
     */
    acceptFrame(frame: SessionAssistantStreamFrame): ClientAssistantStreamResult;
    private attemptForSettlement;
    private publish;
}
//# sourceMappingURL=assistant-stream.d.ts.map