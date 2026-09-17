/** Process-local assistant attempt framing and durable stream accumulation. */
import { LlmAttemptId, type ContentBlock, type FinishReason, type ReplayEnvelope, type StreamChunk, type TokenUsage } from '@deepseek-ai/dsh-llm';
import type { AssistantStreamFrame } from '@deepseek-ai/dsh-agent';
import type { SessionEventMap, SessionId, SessionSeq } from '@deepseek-ai/dsh-session';
/** Folds one model attempt into one compact stream plus ordered transient frames. */
export declare class AssistantStreamAttempt {
    private readonly nextRevision;
    readonly turn: number;
    readonly step: number;
    private readonly emit;
    private readonly accumulator;
    private readonly assembler;
    private index;
    private terminal;
    /** Attempt identity unique within this Agent lifecycle. */
    readonly attemptId: LlmAttemptId;
    /** Whether this started attempt has emitted its terminal frame. */
    get ended(): boolean;
    /**
     * @param sessionId - identity embedded only in the Agent-lifecycle-local attempt id.
     * @param attempt - attached-Session-local attempt counter.
     * @param nextRevision - allocates the next emitted frame revision.
     * @param turn - durable turn owning the request.
     * @param step - durable step owning the request.
     * @param emit - agent-scoped notification publisher.
     */
    constructor(sessionId: SessionId, attempt: number, nextRevision: () => number, turn: number, step: number, emit: (frame: AssistantStreamFrame) => void);
    /** Publish the opening marker before the first delivered chunk. */
    start(): void;
    /** Snapshot one chunk once, then feed durable compaction, assembly, and live publication. */
    push(chunk: StreamChunk): void;
    /**
     * Publish terminal settlement after the matching durable event commits.
     * @param eventType - durable settlement type.
     * @param append - synchronous durable append returning its committed seq.
     */
    settle(eventType: 'assistant/message' | 'assistant/attempt', append: () => SessionSeq): void;
    /** Publish abandonment when no durable attempt event can be committed. */
    abandon(): void;
    /** Exact compact stream for the final durable event. */
    get stream(): SessionEventMap['assistant/attempt']['stream'];
    /** Canonical completed-message blocks from the same chunks. */
    blocks(): ContentBlock[];
    /** Safe visible prefix when cancellation interrupts the attempt. */
    interruptedBlocks(): ContentBlock[];
    /** Latest adapter-reported usage in the stream. */
    get usage(): TokenUsage | undefined;
    /** Terminal reason, defaulting to stop when the stream omitted one. */
    get finish(): FinishReason;
    /** Replay state carried by the terminal finish record. */
    get replayState(): ReplayEnvelope | undefined;
}
//# sourceMappingURL=assistant-stream.d.ts.map