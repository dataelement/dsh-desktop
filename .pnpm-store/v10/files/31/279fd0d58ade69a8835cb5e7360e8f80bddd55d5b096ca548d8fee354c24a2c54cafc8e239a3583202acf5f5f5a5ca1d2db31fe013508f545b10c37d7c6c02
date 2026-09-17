/**
 * Activation-local admission around one continuable subagent's Agent inbox.
 *
 * @module @deepseek-ai/dsh-subagent/inbox
 */
import { SubagentError } from "./error.js";
/** Delegate Queue and Steer to one live Agent until its Activation starts closing. */
export class SubagentInbox {
    agent;
    closingPromise;
    /**
     * Wrap one live continuable Agent.
     * @param agent - the Agent whose inbox receives accepted deliveries.
     */
    constructor(agent) {
        this.agent = agent;
    }
    /**
     * Read the Activation's close transaction.
     * @returns the memoized transaction, or `undefined` while delivery remains open.
     */
    get closing() {
        return this.closingPromise;
    }
    /**
     * Read whether the underlying Agent still has accepted work to claim.
     * @returns whether either Agent inbox destination is non-empty.
     */
    get hasPending() {
        return this.agent.inbox.nextTurn.length > 0 || this.agent.inbox.nextStep.length > 0;
    }
    /**
     * Submit through the Agent only while its Activation remains resident.
     * @param message - the accepted input to submit.
     * @param delivery - whether to queue a distinct turn or steer the nearest step.
     */
    deliver(message, delivery) {
        if (this.closingPromise !== undefined) {
            throw new SubagentError(`subagent "${this.agent.id}" activation is being disposed; the message was not accepted`, 'ACTIVATION_CLOSING');
        }
        if (delivery === 'steer')
            this.agent.steer(message);
        else
            this.agent.followup(message);
    }
    /**
     * Close delivery synchronously and share one asynchronous release.
     * @param release - the one release operation to start after closing admission.
     * @returns the memoized release transaction.
     */
    close(release) {
        const existing = this.closingPromise;
        if (existing !== undefined)
            return existing;
        const completion = Promise.withResolvers();
        this.closingPromise = completion.promise;
        void release().then(completion.resolve, completion.reject);
        return completion.promise;
    }
}
//# sourceMappingURL=inbox.js.map