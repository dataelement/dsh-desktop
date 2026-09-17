/** Message value types, identity, and immutable construction helpers. */
import { randomUUID } from '@deepseek-ai/dsh-util-crypto';
import { brandString } from '@deepseek-ai/dsh-brand';
import { deepFreeze } from '@deepseek-ai/dsh-util-values';
/**
 * Bound for a `notice` summary. The account rides a collapsed transcript row
 * and is committed to the durable log, while its inputs — task labels, goal
 * objectives, tool arguments — are caller text with no length of their own.
 */
export const CONTEXT_SUMMARY_MAX_CHARS = 120;
/**
 * Bound one `notice` summary to {@link CONTEXT_SUMMARY_MAX_CHARS}.
 * @param summary - the producer's one-line account, of any length.
 * @returns the account, ellipsized when it exceeds the bound.
 */
export function boundContextSummary(summary) {
    return summary.length <= CONTEXT_SUMMARY_MAX_CHARS
        ? summary
        : `${summary.slice(0, CONTEXT_SUMMARY_MAX_CHARS - 1)}…`;
}
/**
 * Detach and deep-freeze a message whose identity already exists.
 * @param message - complete message, including its stable identity.
 * @returns an immutable snapshot that preserves the identity.
 */
export function freezeMessage(message) {
    return deepFreeze(structuredClone(message));
}
/**
 * Create one identified message and freeze it before publication.
 * @param input - complete role, content, and source for a new message.
 * @returns an immutable message with a fresh stable identity.
 */
export function createMessage(input) {
    return freezeMessage({
        ...input,
        id: brandString(randomUUID()),
    });
}
/**
 * Create one identified user-role message and freeze it before publication.
 * @param input - complete content and source for a new user message.
 * @returns an immutable user message with a fresh stable identity.
 */
export function createUserMessage(input) {
    return createMessage({
        ...input,
        role: 'user',
    });
}
/**
 * Create one identified model-produced assistant message and freeze it before publication.
 * @param input - complete content plus the provider, model, and optional replay state for a new assistant message.
 * @returns an immutable assistant message with fixed role/source tags and a fresh stable identity.
 */
export function createAssistantMessage(input) {
    return createMessage({
        role: 'assistant',
        content: input.content,
        source: {
            kind: 'model',
            ...input.source,
        },
    });
}
/**
 * Create and freeze one identified system-role message holding a rendered
 * system prompt.
 * @param text - the complete rendered prompt; `''` records "no system prompt".
 * @param plugin - the plugin that assembled the prompt.
 * @returns an immutable system message with a fresh stable identity.
 */
export function createSystemMessage(text, plugin) {
    return createMessage({
        role: 'system',
        content: text.length === 0 ? [] : [{ type: 'text', text }],
        source: { kind: 'plugin', plugin },
    });
}
/**
 * Create and freeze one identified tool-result message.
 * @param input - call identity, raw result blocks, and outcome.
 * @returns an immutable user-role tool-result message.
 */
export function createToolResultMessage(input) {
    return createUserMessage({
        source: { kind: 'tool', callId: input.callId },
        content: [{
                type: 'tool-result',
                toolCallId: input.callId,
                content: input.content,
                isError: input.isError,
            }],
    });
}
//# sourceMappingURL=message.js.map