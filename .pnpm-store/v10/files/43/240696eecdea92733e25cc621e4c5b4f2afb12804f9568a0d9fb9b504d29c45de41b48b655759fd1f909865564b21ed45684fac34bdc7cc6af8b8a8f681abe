import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { ToolWorkflowAgentStartData } from '@deepseek-ai/dsh-tool-workflow/types';
import type { WorkflowAgentOutcome, WorkflowStopReason } from '@deepseek-ai/dsh-workflow/types';
/** Status shown for a workflow, phase, or member. */
export type WorkflowRunStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
/** Final renderer data for one member. */
export interface WorkflowRunMemberData {
    readonly seq: number;
    readonly label: string;
    readonly childId: SessionId;
    readonly status: WorkflowRunStatus;
}
/** Final renderer data for one exact phase identity. */
export interface WorkflowRunPhaseData {
    readonly key: string;
    /** `null` is the absent field; the empty string remains a distinct identity. */
    readonly phase: string | null;
    readonly members: readonly WorkflowRunMemberData[];
}
/** Final keyed Chat payload for one workflow run. */
export interface WorkflowRunChatData {
    readonly name: string;
    readonly status: WorkflowRunStatus;
    readonly phases: readonly WorkflowRunPhaseData[];
}
declare module '@deepseek-ai/dsh-client-ui-chat/client' {
    interface ChatNodeDataMap {
        /** Durable top-level workflow run and all members that actually started. */
        'workflow-run': WorkflowRunChatData;
    }
}
interface WorkflowMemberState extends Omit<ToolWorkflowAgentStartData, 'runId'> {
    readonly outcome?: WorkflowAgentOutcome;
}
interface WorkflowState {
    readonly name: string;
    readonly stopReason?: WorkflowStopReason;
    readonly members: readonly WorkflowMemberState[];
}
/**
 * Build a collision-free phase key preserving absent versus empty identity.
 * @param phase - exact phase string, or null for an omitted field.
 * @returns the stable renderer key for that phase identity.
 */
export declare function workflowPhaseKey(phase: string | null): string;
/** Durable workflow event family folded into one keyed Chat node. */
export declare const workflowRunDefinition: ConversationNodeDefinition<WorkflowState>;
export {};
//# sourceMappingURL=workflow-definition.d.ts.map