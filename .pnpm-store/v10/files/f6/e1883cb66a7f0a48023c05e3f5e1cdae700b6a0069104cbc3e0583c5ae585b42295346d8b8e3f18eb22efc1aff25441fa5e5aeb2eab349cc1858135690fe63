/** Standard ACP updates derived from committed DSH session events. */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionUpdate } from '@agentclientprotocol/sdk';
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session';
/**
 * Convert one committed assistant message and its context usage in block order.
 * @param ctx - bridge context carrying attachment and token-meter services.
 * @param session - durable session used for context pressure.
 * @param event - committed assistant message event.
 * @returns ordered standard thought, message, and optional usage updates.
 */
export declare function assistantUpdates(ctx: Context, session: Session, event: SessionEvent<'assistant/message'>): Promise<SessionUpdate[]>;
/**
 * Start one generic ACP tool lifecycle from the durable call fact.
 * @param event - committed DSH tool-call event.
 * @returns the standard generic tool-call update.
 */
export declare function toolCallUpdate(event: SessionEvent<'tool/call'>): SessionUpdate;
/**
 * Finish one generic ACP tool lifecycle from its committed model-facing result.
 * @param ctx - bridge context carrying the attachment store.
 * @param event - committed DSH tool-result event.
 * @returns the standard completed or failed tool-call update.
 */
export declare function toolResultUpdate(ctx: Context, event: SessionEvent<'tool/result'>): Promise<SessionUpdate>;
//# sourceMappingURL=updates.d.ts.map