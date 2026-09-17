/**
 * Model-visible messages owned by continuable-subagent orchestration.
 *
 * @module @deepseek-ai/dsh-subagent/continuation-messages
 */
import { boundContextSummary, createUserMessage } from '@deepseek-ai/dsh-llm';
/** Build durable attribution for one adjacent-Agent message. */
function agentMessageSource(sender) {
    return {
        kind: 'agent-message',
        form: 'relay',
        senderSessionId: sender.id,
    };
}
/**
 * Build the model-visible and durable representation of one adjacent-Agent message.
 * @param sender - exact live Agent that authored the message.
 * @param content - model-visible message blocks supplied by the sender.
 * @returns the durable user-message representation delivered to the recipient.
 */
export function createAgentMessage(sender, content) {
    return createUserMessage({
        content: [
            { type: 'text', text: `Agent ${sender.id} sent a message: ` },
            ...content,
        ],
        source: agentMessageSource(sender),
    });
}
/**
 * Append adjacent-Agent return guidance to a continuable child's initial task.
 * @param parentId - durable parent session id named in the guidance.
 * @param prompt - initial model-visible task blocks.
 * @returns task blocks followed by the continuable return guidance.
 */
export function withContinuableReturnGuidance(parentId, prompt) {
    const encodedParentId = JSON.stringify(parentId);
    return [
        ...prompt,
        {
            type: 'text',
            text: `Your parent agent id is ${encodedParentId}. Before you finish, send your result to that agent with `
                + `send_message({ agent_id: ${encodedParentId}, message: "<self-contained result>" }). The parent shares `
                + 'your workspace but does not automatically receive your transcript, tool output, or reasoning. Send '
                + 'earlier messages as well when a finding changes what the parent should do next; sending a message '
                + 'does not end your turn.',
        },
    ];
}
/**
 * One line telling a parent that a background child is finished and why, in
 * the parent's own task vocabulary.
 * @param childId - the durable child the parent knows by id.
 * @param stopReason - how the child's last ordinary turn ended.
 * @returns the model-facing opening line of the settlement notice.
 */
function settlementSummary(childId, stopReason) {
    const subject = `Background subagent ${childId}`;
    switch (stopReason) {
        case 'completed':
            return `${subject} finished and will do no further work unless you send it more.`;
        case 'aborted':
            return `${subject} was stopped before it finished.`;
        case 'max-tokens':
            return `${subject} ran out of room before it finished.`;
        // A pre-step rejection — a hook deny, a policy plugin — discarded input
        // the child had claimed, so the parent must not treat the task as done.
        case 'refusal':
            return `${subject} declined the task.`;
        case 'error':
            return `${subject} failed before it finished.`;
        /* v8 ignore next 4 -- `SubagentResult['stopReason']` is merge-extensible, so this arm
         * needs a backend that adds a variant; an unnameable ending is reported as unfinished
         * rather than silently as success. */
        default:
            return `${subject} ended abnormally (${String(stopReason)}) before it finished.`;
    }
}
/**
 * Build the runtime-owned settlement notice delivered to a child's parent.
 * @param childId - durable child session id named in the notice.
 * @param terminal - recorded terminal state for the settled Activation.
 * @returns the durable user-message representation delivered to the parent.
 */
export function createSettlementMessage(childId, terminal) {
    const summary = settlementSummary(childId, terminal.stopReason);
    return createUserMessage({
        content: [
            { type: 'text', text: summary },
            ...terminal.output === undefined
                ? [{ type: 'text', text: 'It left no closing message.' }]
                : [{ type: 'text', text: 'Its closing message:' }, ...terminal.output],
        ],
        source: {
            kind: 'subagent-settled',
            form: 'notice',
            summary: boundContextSummary(summary),
            senderSessionId: childId,
        },
    });
}
//# sourceMappingURL=continuation-messages.js.map