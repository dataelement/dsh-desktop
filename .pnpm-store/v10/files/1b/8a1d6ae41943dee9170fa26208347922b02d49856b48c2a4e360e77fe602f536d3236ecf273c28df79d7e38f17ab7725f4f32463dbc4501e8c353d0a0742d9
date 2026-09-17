/**
 * Activation-local admission around one continuable subagent's Agent inbox.
 *
 * @module @deepseek-ai/dsh-subagent/inbox
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { UserMessage } from '@deepseek-ai/dsh-session';
import type { SubagentPromptRequest } from './control-types.ts';
/** One Agent inbox destination, as the wire request selects it. */
export type SubagentDelivery = SubagentPromptRequest['delivery'];
/** Delegate Queue and Steer to one live Agent until its Activation starts closing. */
export declare class SubagentInbox {
    private readonly agent;
    private closingPromise;
    /**
     * Wrap one live continuable Agent.
     * @param agent - the Agent whose inbox receives accepted deliveries.
     */
    constructor(agent: Agent);
    /**
     * Read the Activation's close transaction.
     * @returns the memoized transaction, or `undefined` while delivery remains open.
     */
    get closing(): Promise<void> | undefined;
    /**
     * Read whether the underlying Agent still has accepted work to claim.
     * @returns whether either Agent inbox destination is non-empty.
     */
    get hasPending(): boolean;
    /**
     * Submit through the Agent only while its Activation remains resident.
     * @param message - the accepted input to submit.
     * @param delivery - whether to queue a distinct turn or steer the nearest step.
     */
    deliver(message: UserMessage, delivery: SubagentDelivery): void;
    /**
     * Close delivery synchronously and share one asynchronous release.
     * @param release - the one release operation to start after closing admission.
     * @returns the memoized release transaction.
     */
    close(release: () => Promise<void>): Promise<void>;
}
//# sourceMappingURL=inbox.d.ts.map