/** Cold Session history pagination and live-event source. */
import type { Context } from '@deepseek-ai/cordis';
import { type SessionObservation } from '@deepseek-ai/dsh-session-query';
import type { SessionFollowRequest, SessionFollowFrame, SessionPage, SessionPageRequest } from './types.ts';
/** Implements cold-safe history operations delegated by the Session Controller. */
export declare class SessionHistoryController {
    private readonly ctx;
    private readonly promote;
    private readonly closeFollowers;
    private readonly assistantStreams;
    /**
     * @param ctx - Host context carrying Session query and projection services.
     * @param promote - starts ordinary Session activation after snapshot delivery.
     */
    constructor(ctx: Context, promote: (observation: SessionObservation) => void);
    /**
     * Read one message-aligned history page without activating an Agent.
     * @param request - durable address and backwards-page cursor.
     * @param signal - caller cancellation for persistence reads.
     * @returns a contiguous event page.
     */
    page(request: SessionPageRequest, signal: AbortSignal): Promise<SessionPage>;
    /**
     * Follow events appended after an initial cursor on one durable address.
     * @param request - durable address and last committed sequence already held by the caller.
     * @param signal - stream cancellation owned by the Remote carrier.
     * @returns a complete opening snapshot followed by gap-free durable events and opted-in assistant frames.
     */
    follow(request: SessionFollowRequest, signal: AbortSignal): AsyncIterable<SessionFollowFrame>;
    private sourceFor;
}
//# sourceMappingURL=history.d.ts.map