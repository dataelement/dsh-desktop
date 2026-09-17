/**
 * Session feedback: the `feedback/record` event, its command-independent
 * producer, the `sessionFeedback` Host Remote a product surface records
 * through, and the human-facing `/feedback` command. Recording appends one
 * authoritative log-only event and does not start model work. The append is
 * eager but unflushed, so acknowledgement reports that the entry is logged,
 * not that it reached disk.
 * @module @deepseek-ai/dsh-command-feedback
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Session } from '@deepseek-ai/dsh-session';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { FeedbackRecord, SessionFeedbackRecordRequest, SessionFeedbackRecordResult } from './types.ts';
export type * from './types.ts';
/**
 * Every feedback category in the order product surfaces present them; each
 * surface owns its localized labels.
 */
export declare const FEEDBACK_CATEGORIES: readonly ["task-result", "instruction-following", "product-interaction", "service-stability", "resource-cost", "security-privacy-permission", "other"];
export declare const name = "command-feedback";
export declare const inject: string[];
declare module '@deepseek-ai/cordis' {
    interface Context {
        sessionFeedback: SessionFeedbackService;
    }
}
/**
 * Record feedback independently of any UI trigger. Surrounding whitespace is
 * discarded and a blank text is recorded as absent; an entry with neither
 * text nor category is still recorded.
 * @param session - session the feedback describes.
 * @param entry - human-authored remark and its category.
 */
export declare function recordFeedback(session: Session, entry: FeedbackRecord): void;
/** Host Remote through which a product surface records a Session-level remark. */
export declare class SessionFeedbackService extends TypertRemoteService {
    static inject: string[];
    /**
     * @param ctx - Host context carrying the live Session store.
     */
    constructor(ctx: Context);
    /**
     * Record one remark on a live Session.
     * @param request - target Session plus the optional text and category.
     * @returns the recorded postcondition, or `session-not-found` when no live
     * Session carries the id.
     */
    record(request: SessionFeedbackRecordRequest): Promise<SessionFeedbackRecordResult>;
}
/**
 * Register the global `/feedback` command for every composed command adapter
 * and mount the `sessionFeedback` Remote.
 * @param ctx - Host context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map