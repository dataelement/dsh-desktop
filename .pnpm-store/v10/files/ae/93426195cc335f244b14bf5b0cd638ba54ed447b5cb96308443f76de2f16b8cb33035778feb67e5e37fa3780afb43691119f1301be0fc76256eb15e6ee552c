/** Process-local assistant state retained for reconnecting Web followers. */
import type { AssistantStreamFrame } from '@deepseek-ai/dsh-agent';
import type { SessionSeqCursor } from '@deepseek-ai/dsh-session';
import type { SessionAssistantStreamBaseline } from './types.ts';
/**
 * Folds dense Agent frames and materializes one shared immutable reconnect
 * baseline per accepted revision.
 */
export declare class SessionAssistantStreamAccumulator {
    private activeAttempt;
    private revision;
    private snapshotValue;
    private dirty;
    /**
     * Fold one trusted frame from the current attached Agent lifecycle.
     * @param frame - next dense process-local Assistant frame.
     * @param durableCursor - last committed Session seq when this frame was observed.
     */
    accept(frame: AssistantStreamFrame, durableCursor: SessionSeqCursor): void;
    /**
     * Read the cached reconnect baseline, materializing it after a state change.
     * @returns the identity-stable baseline for the latest accepted revision.
     */
    snapshot(): SessionAssistantStreamBaseline;
}
//# sourceMappingURL=assistant-stream.d.ts.map