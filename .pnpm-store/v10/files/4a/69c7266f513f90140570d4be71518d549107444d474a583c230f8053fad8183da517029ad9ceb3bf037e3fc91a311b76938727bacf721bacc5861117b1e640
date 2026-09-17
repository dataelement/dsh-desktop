/** The agent-loop card's staged form over the `agent-loop` settings namespace. */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client';
import { type CardActions, type CardFieldState, type CardShell } from './card-form.ts';
/**
 * Namespace of the agent loop's user-owned settings. Spelled here rather than
 * imported: a client package must not depend on a Host package.
 */
export declare const AGENT_LOOP_NS = "agent-loop";
/**
 * The agent-loop fields this card edits. The Host section carries only this
 * field — the composed `agents` array is deliberately not part of it.
 */
export interface AgentLoopSettings {
    /** Upper bound on parallel-safe tool calls in flight per step. */
    maxParallelToolCalls?: number;
}
/** What the agent-loop card renders. */
export interface AgentLoopCardState extends CardShell {
    /** Parallel tool-call cap. */
    maxParallelToolCalls: CardFieldState;
}
/** The registration-side face the agent-loop card's slot entry injects. */
export interface AgentLoopCardFace extends CardActions {
    hooks: {
        /** Card snapshot bound by the renderer as useAgentLoopCard. */
        agentLoopCard: SnapshotStore<AgentLoopCardState>;
    };
}
/** Bridges the `agent-loop` scope onto the card's staged form. */
export declare class AgentLoopCardController {
    private readonly form;
    private readonly store;
    /** @param scope - the bound settings scope for the `agent-loop` namespace. */
    constructor(scope: SettingsScope<AgentLoopSettings>);
    private projection;
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject(): AgentLoopCardFace;
}
//# sourceMappingURL=agent-loop-card-controller.d.ts.map