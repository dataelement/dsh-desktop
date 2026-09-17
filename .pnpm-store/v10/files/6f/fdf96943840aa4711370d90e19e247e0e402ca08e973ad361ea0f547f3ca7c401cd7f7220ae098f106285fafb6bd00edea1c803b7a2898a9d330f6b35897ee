/**
 * dsh-llm's owned branded ids: tool-call correlation and provider request
 * diagnostics.
 *
 * The `Branded<B>` primitive and stateless constructor live in
 * `@deepseek-ai/dsh-brand` so every owner of a cross-boundary id can brand it
 * without depending on dsh-llm; see that package's README for the
 * nominal-typing policy.
 *
 * @module @deepseek-ai/dsh-llm/brand
 */
import { brandString } from '@deepseek-ai/dsh-brand';
/**
 * Brand a message identifier.
 * @param id - the opaque message identifier.
 * @returns the same string with the message-id brand.
 */
export function MessageId(id) {
    return brandString(id);
}
/**
 * Brand a string as a {@link ToolCallId}.
 * @param id - the provider-issued or synthesized call id.
 * @returns the same string with the tool-call-id brand.
 */
export function ToolCallId(id) {
    return brandString(id);
}
/**
 * Brand a provider-issued request identifier.
 * @param id - the opaque provider-issued string.
 * @returns the same string, branded; no validation is performed.
 */
export function ProviderRequestId(id) {
    return brandString(id);
}
/**
 * Brand one loop-owned streaming attempt identifier.
 * @param id - the opaque Agent-lifecycle-local identifier.
 * @returns the same string with the attempt-id brand.
 */
export function LlmAttemptId(id) {
    return brandString(id);
}
/**
 * Brand an adapter-owned reasoning-effort identifier.
 * @param id - the opaque identifier exposed by one model capability.
 * @returns the same string, branded; no validation is performed.
 */
export function ReasoningEffortId(id) {
    return brandString(id);
}
//# sourceMappingURL=brand.js.map