/**
 * Continuation integration markers and host adapters outside the public
 * Service Definition and model-facing Agent messaging contract.
 * @module @deepseek-ai/dsh-subagent/internal
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ContentBlock, MessageId, MessageSource } from '@deepseek-ai/dsh-llm';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type SubagentRuntime from './index.ts';
import type { SubagentDelivery } from './inbox.ts';
/** Process-stable identity carried only by the standard adjacent-Agent messaging tool. */
export declare const adjacentAgentSendMessageTool: unique symbol;
/**
 * Mark the standard adjacent-Agent messaging tool without changing its model-visible schema.
 * @param definition - the standard `send_message` definition.
 * @returns the same definition with its internal identity installed.
 */
export declare function markAdjacentAgentSendMessageTool(definition: ToolDefinition): ToolDefinition;
/**
 * Test whether one visible definition is the standard adjacent-Agent messaging tool.
 * @param definition - the scope-resolved `send_message` candidate.
 * @returns whether the definition carries the internal standard-tool identity.
 */
export declare function isAdjacentAgentSendMessageTool(definition: ToolDefinition | undefined): boolean;
/**
 * Process-stable symbol-keyed host delivery shared by the bundled runtime
 * entry and this unbundled internal subpath.
 * @internal
 */
export declare const deliverSubagentPrompt: unique symbol;
/** Runtime face required by the host-only prompt adapters. */
export interface HostPromptDeliverer {
    [deliverSubagentPrompt](parent: Agent, childId: SessionId, content: ContentBlock[], source: MessageSource, signal: AbortSignal, delivery: SubagentDelivery): Promise<MessageId>;
}
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
export declare function queueHostSubagentPrompt(runtime: SubagentRuntime, parent: Agent, childId: SessionId, content: ContentBlock[], source: MessageSource, signal: AbortSignal): Promise<MessageId>;
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
export declare function steerHostSubagentPrompt(runtime: SubagentRuntime, parent: Agent, childId: SessionId, content: ContentBlock[], source: MessageSource, signal: AbortSignal): Promise<MessageId>;
//# sourceMappingURL=internal.d.ts.map