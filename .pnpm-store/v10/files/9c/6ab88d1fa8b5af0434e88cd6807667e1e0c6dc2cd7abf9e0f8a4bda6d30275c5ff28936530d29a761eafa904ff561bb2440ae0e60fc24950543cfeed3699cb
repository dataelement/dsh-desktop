/**
 * Driver-owned durable agent inbox projection and command facade.
 *
 * @module @deepseek-ai/dsh-agent-loop/inbox
 */
import type { MessageId } from '@deepseek-ai/dsh-llm';
import type SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection';
import type { Session, UserMessage } from '@deepseek-ai/dsh-session';
import type { AgentEventDispatch, Inbox as InboxContract, InboxState, InboxTarget, InboxWireState } from '@deepseek-ai/dsh-agent';
import { z } from 'zod';
/** Wire validation for pending agent input reconstructed from durable inbox splices. */
export declare const inboxProjectionSchema: z.ZodReadonly<z.ZodObject<{
    'next-turn': z.ZodReadonly<z.ZodArray<z.ZodCustom<UserMessage, UserMessage>>>;
    'next-step': z.ZodReadonly<z.ZodArray<z.ZodCustom<UserMessage, UserMessage>>>;
}, z.core.$strip>>;
/** Standard fold that reconstructs pending input and rejects invalid durable splice history. */
export declare const inboxProjectionDefinition: {
    key: "inbox";
    stateSchema: z.ZodReadonly<z.ZodObject<{
        'next-turn': z.ZodReadonly<z.ZodArray<z.ZodCustom<UserMessage, UserMessage>>>;
        'next-step': z.ZodReadonly<z.ZodArray<z.ZodCustom<UserMessage, UserMessage>>>;
    }, z.core.$strip>>;
    init: () => InboxState;
    apply(state: InboxState, event: import("@deepseek-ai/dsh-session").SessionEvent): InboxState;
    wire: {
        viewSchema: z.ZodType<InboxWireState>;
        view: (state: InboxState) => InboxWireState;
    };
    stateVersion: number;
};
/**
 * Driver-owned durable Inbox implementation used by ReactLoopAgent and focused
 * provider tests.
 * @param projections - registry that owns the standard Inbox projection.
 * @param session - session whose durable events store pending input.
 * @param dispatch - agent-scoped notifications for Inbox lifecycle events.
 */
export declare class ReactLoopInbox implements InboxContract {
    private readonly projections;
    private readonly session;
    private readonly dispatch;
    constructor(projections: SessionProjectionRegistry, session: Session, dispatch: AgentEventDispatch);
    /** Prompts awaiting individual turns. */
    get nextTurn(): readonly UserMessage[];
    /** Input awaiting the next step boundary. */
    get nextStep(): readonly UserMessage[];
    /** Whether either pending-message list contains work. */
    get hasPending(): boolean;
    /** Durably cancel all pending input, clearing next-step before next-turn. */
    clear(): void;
    /**
     * Remove and return the complete batch proposed for one step.
     * @param target - whether this boundary also consumes one queued turn.
     * @param turn - turn that will own the claimed batch.
     * @returns next-step input followed by the queued turn, when requested.
     */
    claim(target: InboxTarget, turn: number): UserMessage[];
    /**
     * Append one message to a pending list.
     * @param target - pending list to extend.
     * @param message - message to append.
     */
    append(target: InboxTarget, message: UserMessage): void;
    /**
     * Prepend one message to a pending list.
     * @param target - pending list to extend.
     * @param message - message to prepend.
     */
    prepend(target: InboxTarget, message: UserMessage): void;
    /**
     * Replace one pending message in place.
     * @param messageId - identity of the pending message to replace.
     * @param newMessage - replacement message.
     * @returns whether the message was still pending.
     */
    replace(messageId: MessageId, newMessage: UserMessage): boolean;
    /**
     * Remove one pending message.
     * @param messageId - identity of the pending message to remove.
     * @returns whether the message was still pending.
     */
    remove(messageId: MessageId): boolean;
    /**
     * Apply standard splice semantics and durably record the normalized result.
     * @param target - pending list to mutate.
     * @param start - splice position.
     * @param deleteCount - maximum number of messages to remove.
     * @param inserted - messages to insert at the resolved position.
     * @returns messages removed by the splice.
     */
    splice(target: InboxTarget, start: number, deleteCount: number, inserted: UserMessage[]): UserMessage[];
    /** Locate one pending identity across both owned lists. */
    private locate;
    /** Read the current durable projection state. */
    private current;
    /** Commit one normalized mutation and publish its live events. */
    private mutate;
}
//# sourceMappingURL=inbox.d.ts.map