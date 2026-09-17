/**
 * Durable pi-ai replay metadata and assistant-history reconstruction.
 *
 * Harness content remains the durable source for text and tool calls. This
 * module stores only the provider-native metadata needed to reconstruct a
 * pi-ai assistant message on a later request.
 *
 * @module dsh-llm-pi-ai/replay
 */
import type { Message, ReplayEnvelope } from '@deepseek-ai/dsh-llm';
import type { Api, AssistantMessage } from '@earendil-works/pi-ai';
/** Per-block half of the pi-ai replay envelope, one entry per content block. */
export type PiAiReplayBlock = {
    type: 'text';
    textSignature?: string;
} | {
    type: 'reasoning';
    thinkingSignature?: string;
    redacted?: boolean;
} | {
    type: 'tool-call';
    thoughtSignature?: string;
};
/** Versioned response-level half of the pi-ai replay envelope. */
export interface PiAiReplayResponse {
    kind: 'pi-ai';
    version: 2;
    api: Api;
    provider: string;
    /** Requested model identity, matching the durable assistant source. */
    model: string;
    /** Provider-reported model; only Anthropic replays it as the native model (reported in `message.model`, not `message.responseModel`). */
    responseModel?: string;
    responseId?: string;
    /** Provider-native effort for historical replay; absence is preserved. */
    providerThinkingLevel?: string;
    stopReason: AssistantMessage['stopReason'];
}
/**
 * Project a successful pi-ai response into the minimal durable replay state.
 * The per-block half is index-aligned with the streamed blocks (pi-ai content
 * order), so `BlockAssembler` prunes an entry with its block whenever assembly
 * removes one.
 * @param message - completed native pi-ai assistant response.
 * @param requestedModel - request identity stored in the assistant source; defaults to the native model.
 * @returns the versioned lossless-JSON replay projection.
 */
export declare function toPiReplayState(message: AssistantMessage, requestedModel?: string): ReplayEnvelope;
/**
 * Convert one durable Harness assistant message into pi-ai history.
 *
 * Durable content is the authoritative record; replay metadata only restores
 * native fidelity (ids, signatures). A replay state this build cannot use —
 * another adapter's kind, another version, a malformed value, or metadata that
 * no longer matches the content — therefore degrades the one message to
 * provider-neutral history instead of failing the request.
 * @param message - assistant content with required source and optional adapter-owned replay metadata.
 * @param onDegrade - called with the diagnostic reason when an unusable replay
 *   state falls back to provider-neutral conversion.
 * @returns a native pi-ai assistant message reconstructed from durable content.
 */
export declare function toPiAssistant(message: Message, onDegrade?: (reason: string) => void): AssistantMessage;
//# sourceMappingURL=replay.d.ts.map