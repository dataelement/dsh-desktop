/**
 * Canonical Session-log feedback for finalized assistant messages.
 * @module @deepseek-ai/dsh-message-feedback
 */
import { Context, Service } from '@deepseek-ai/cordis';
import s from '@deepseek-ai/schemastery';
import type { SessionInspection } from '@deepseek-ai/dsh-session-persistence';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { MessageFeedbackDeleteRequest, MessageFeedbackDeleteResult, MessageFeedbackListRequest, MessageFeedbackListResult, MessageFeedbackPutRequest, MessageFeedbackPutResult } from './types.ts';
export type * from './types.ts';
/** Required deployment policy for optional notes. */
export interface Config {
    /** Maximum UTF-8 byte length accepted for one note. */
    readonly maxNoteBytes: number;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        messageFeedback: MessageFeedbackService;
    }
    interface Events {
        /**
         * Observe a durable cold feedback mutation without publishing a live Session.
         * Observers run before write ownership is released and must not await
         * another message-feedback operation for this Session. The payload is borrowed
         * read-only; deep-clone it before transferring ownership (for example, to Session.fromRestore).
         * @param inspection - committed canonical prefix, including the feedback as its last event.
         * @mode parallel
         */
        'feedback/committed'(inspection: SessionInspection): void;
    }
}
/** Session-log service; cold operations never construct a Session or Agent. */
export declare class MessageFeedbackService extends TypertRemoteService {
    static inject: string[];
    /** Loader validation for the required note-size policy. */
    static Config: s<Config>;
    private readonly maxNoteBytes;
    private readonly operationTails;
    private mutationAdmissionOpen;
    /**
     * @param ctx - Host context carrying Session persistence and live owners.
     * @param config - Required note-size policy.
     */
    constructor(ctx: Context, config: Config);
    protected [Service.init](): void;
    /**
     * Read current feedback from the canonical log.
     * @param request - Session to inspect.
     * @returns immutable items or a definite persistence miss.
     */
    list(request: MessageFeedbackListRequest): Promise<MessageFeedbackListResult>;
    /**
     * Create or replace feedback after checking its current version.
     * Matching no-ops retain the version and append no event.
     * @param request - Target, desired value, and observed item version.
     * @returns the durable item or an explicit business failure.
     */
    put(request: MessageFeedbackPutRequest): Promise<MessageFeedbackPutResult>;
    /**
     * Delete one item after checking its version; absence succeeds without an event.
     * @param request - Session, message, and observed item version.
     * @returns the stable absent postcondition or an explicit failure.
     */
    delete(request: MessageFeedbackDeleteRequest): Promise<MessageFeedbackDeleteResult>;
    /** Hold cold write ownership across read/compare/append; use live owners directly. */
    private withSession;
    private resolveNote;
    private versionConflict;
    /** Serialize complete operations and drain their handles before disposal. */
    private enqueue;
}
export default MessageFeedbackService;
//# sourceMappingURL=index.d.ts.map