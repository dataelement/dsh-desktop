/** Process-local assistant state retained for reconnecting Web followers. */
import { AssistantStreamAccumulator } from '@deepseek-ai/dsh-llm';
const EMPTY_BASELINE = { revision: 0 };
/**
 * Folds dense Agent frames and materializes one shared immutable reconnect
 * baseline per accepted revision.
 */
export class SessionAssistantStreamAccumulator {
    activeAttempt;
    revision = 0;
    snapshotValue = EMPTY_BASELINE;
    dirty = false;
    /**
     * Fold one trusted frame from the current attached Agent lifecycle.
     * @param frame - next dense process-local Assistant frame.
     * @param durableCursor - last committed Session seq when this frame was observed.
     */
    accept(frame, durableCursor) {
        if (frame.type === 'start' && frame.revision === 1 && this.revision !== 0) {
            this.activeAttempt = undefined;
            this.revision = 0;
        }
        if (frame.revision !== this.revision + 1) {
            this.activeAttempt = undefined;
            this.revision = frame.revision;
            this.dirty = true;
            return;
        }
        this.revision = frame.revision;
        switch (frame.type) {
            case 'start':
                this.activeAttempt = {
                    attemptId: frame.attemptId,
                    startedAfterSeq: durableCursor,
                    turn: frame.turn,
                    step: frame.step,
                    stream: new AssistantStreamAccumulator(),
                    nextIndex: 0,
                };
                break;
            case 'chunk': {
                const attempt = this.activeAttempt;
                if (attempt === undefined
                    || attempt.attemptId !== frame.attemptId
                    || frame.index !== attempt.nextIndex) {
                    this.activeAttempt = undefined;
                    break;
                }
                attempt.stream.push({ time: frame.time, chunk: frame.chunk });
                attempt.nextIndex += 1;
                break;
            }
            case 'end':
                this.activeAttempt = undefined;
                break;
        }
        this.dirty = true;
    }
    /**
     * Read the cached reconnect baseline, materializing it after a state change.
     * @returns the identity-stable baseline for the latest accepted revision.
     */
    snapshot() {
        if (!this.dirty)
            return this.snapshotValue;
        this.snapshotValue = {
            revision: this.revision,
            ...this.activeAttempt === undefined ? {} : {
                activeAttempt: {
                    attemptId: this.activeAttempt.attemptId,
                    startedAfterSeq: this.activeAttempt.startedAfterSeq,
                    turn: this.activeAttempt.turn,
                    step: this.activeAttempt.step,
                    nextIndex: this.activeAttempt.nextIndex,
                    stream: this.activeAttempt.stream.snapshot(),
                },
            },
        };
        this.dirty = false;
        return this.snapshotValue;
    }
}
//# sourceMappingURL=assistant-stream.js.map