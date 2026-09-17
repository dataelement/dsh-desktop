/**
 * Continuation integration markers and host adapters outside the public
 * Service Definition and model-facing Agent messaging contract.
 * @module @deepseek-ai/dsh-subagent/internal
 */
/** Process-stable identity carried only by the standard adjacent-Agent messaging tool. */
export const adjacentAgentSendMessageTool = Symbol.for('dsh.subagent.adjacentAgentSendMessageTool');
/**
 * Mark the standard adjacent-Agent messaging tool without changing its model-visible schema.
 * @param definition - the standard `send_message` definition.
 * @returns the same definition with its internal identity installed.
 */
export function markAdjacentAgentSendMessageTool(definition) {
    Object.defineProperty(definition, adjacentAgentSendMessageTool, { value: true });
    return definition;
}
/**
 * Test whether one visible definition is the standard adjacent-Agent messaging tool.
 * @param definition - the scope-resolved `send_message` candidate.
 * @returns whether the definition carries the internal standard-tool identity.
 */
export function isAdjacentAgentSendMessageTool(definition) {
    return definition !== undefined
        && definition[adjacentAgentSendMessageTool] === true;
}
/**
 * Process-stable symbol-keyed host delivery shared by the bundled runtime
 * entry and this unbundled internal subpath.
 * @internal
 */
export const deliverSubagentPrompt = Symbol.for('dsh.subagent.deliverPrompt');
/**
 * Queue one host-protocol message without exposing another Service operation.
 * @param runtime - subagent runtime owning continuation residency.
 * @param parent - exact live direct parent authorizing delivery.
 * @param childId - durable direct-child session id.
 * @param content - host-authored content to deliver.
 * @param source - durable host-protocol provenance.
 * @param signal - caller cancellation before inbox acceptance.
 * @returns the accepted message's inbox id.
 */
export function queueHostSubagentPrompt(runtime, parent, childId, content, source, signal) {
    return runtime[deliverSubagentPrompt](parent, childId, content, source, signal, 'queue');
}
/**
 * Steer one host-protocol message without exposing another Service operation.
 * @param runtime - subagent runtime owning continuation residency.
 * @param parent - exact live direct parent authorizing delivery.
 * @param childId - durable direct-child session id.
 * @param content - host-authored content to deliver.
 * @param source - durable host-protocol provenance.
 * @param signal - caller cancellation before inbox acceptance.
 * @returns the accepted message's inbox id.
 */
export function steerHostSubagentPrompt(runtime, parent, childId, content, source, signal) {
    return runtime[deliverSubagentPrompt](parent, childId, content, source, signal, 'steer');
}
//# sourceMappingURL=internal.js.map