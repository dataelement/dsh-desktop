import { LlmAttemptId } from '@deepseek-ai/dsh-llm/brand';
import type { SessionSeqCursor } from '@deepseek-ai/dsh-session/types';
import type { JsonValue } from '@deepseek-ai/dsh-util-values';
import type { ClientConnectionRpc } from '../rpc.ts';
/** Assistant frame emitted by the standalone fixture; tests pin it to the controller wire type. */
export type FixtureAssistantStreamFrame = {
    readonly type: 'start';
    readonly attemptId: ReturnType<typeof LlmAttemptId>;
    readonly revision: number;
    readonly startedAfterSeq: SessionSeqCursor;
    readonly turn: number;
    readonly step: number;
} | {
    readonly type: 'chunk';
    readonly attemptId: ReturnType<typeof LlmAttemptId>;
    readonly revision: number;
    readonly index: number;
    readonly time: number;
    readonly chunk: JsonValue;
} | {
    readonly type: 'end';
    readonly attemptId: ReturnType<typeof LlmAttemptId>;
    readonly revision: number;
    readonly index: number;
    readonly outcome: {
        readonly kind: 'committed';
        readonly eventType: 'assistant/message' | 'assistant/attempt';
        readonly seq: number;
    } | {
        readonly kind: 'abandoned';
    };
};
/** Deterministic fixture branches used by keyless Web assembly tests. */
export interface FixtureOptions {
    /** Start with no real Workspace or Session. */
    empty?: boolean;
    /** Reject every prompt before appending its user event. */
    rejectPrompt?: boolean;
    /** Publish the Session but fail its Workspace account write. */
    failWorkspaceAttach?: boolean;
    /** Publish and frame the Session, then throw instead of returning create. */
    dropSessionCreateResponse?: boolean;
    /** Order of the two successful create frames. */
    createFrameOrder?: 'session-first' | 'workspace-first';
    /** Announce one Agent write to `notes/demo.txt` shortly after a `workspaceFiles/changes` stream opens. */
    fileChanges?: boolean;
}
/** Fixture RPC face over one in-memory state graph. */
export interface FixtureWorld {
    /** Generic Remote caller for the endpoints business services own. */
    readonly rpc: ClientConnectionRpc;
}
/**
 * Build the fixture RPC face over one in-memory state graph.
 * @param options - fixture branches for empty state and failure timing.
 * @returns the Remote RPC face.
 */
export declare function createFixtureFaces(options?: FixtureOptions): FixtureWorld;
/**
 * Build the browser fixture transport from the current page's query switches.
 * @returns an in-memory Connection RPC transport.
 */
export declare function createFixtureConnectionRpc(): ClientConnectionRpc;
//# sourceMappingURL=fixture.d.ts.map