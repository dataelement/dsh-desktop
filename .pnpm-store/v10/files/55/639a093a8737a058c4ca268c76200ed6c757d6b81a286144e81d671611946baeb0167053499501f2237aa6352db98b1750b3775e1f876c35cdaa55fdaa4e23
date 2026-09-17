/**
 * Conversation call configuration and freeze utilities. Provider routing,
 * model, reasoning effort, and sampling values are request-header state that
 * can affect cache reuse; request waterfalls replace them and the loop logs
 * changed snapshots instead of allowing silent per-call drift.
 * @module dsh-llm/call-config
 */
/** Process-local identities of request objects assembled by dsh-agent-loop. */
const AGENT_LOOP_REQUESTS = new WeakSet();
/**
 * Field-wise equality over {@link LlmCallConfig} — the comparison a caller
 * runs to decide whether a proposed configuration is a real change (worth a
 * logged header snapshot) or the held one restated.
 * @param a - one configuration.
 * @param b - the other.
 * @returns whether every field (including the `stop` list, element-wise) matches.
 */
export function callConfigEquals(a, b) {
    if (a.provider !== b.provider
        || a.model !== b.model
        || a.reasoningEffort !== b.reasoningEffort
        || a.temperature !== b.temperature
        || a.maxTokens !== b.maxTokens)
        return false;
    if (a.stop === undefined || b.stop === undefined)
        return a.stop === b.stop;
    return a.stop.length === b.stop.length && a.stop.every((s, i) => s === b.stop?.[i]);
}
/**
 * Mark one exact request object as assembled by dsh-agent-loop.
 * @param request - loop-owned request envelope before LLM dispatch.
 * @returns the same request object marked as created by the process-local agent loop.
 */
export function markAgentLoopRequest(request) {
    AGENT_LOOP_REQUESTS.add(request);
    return request;
}
/**
 * Test whether the exact request object was assembled by dsh-agent-loop.
 * @param request - request envelope observed at the LLM waterfall.
 * @returns whether {@link markAgentLoopRequest} recorded this object.
 */
export function isAgentLoopRequest(request) {
    return AGENT_LOOP_REQUESTS.has(request);
}
//# sourceMappingURL=call-config.js.map