/**
 * Browser-local object layer over one Session's durable message-feedback
 * sidecar. The Host owns per-item compare-and-set: every mutation carries the
 * version this controller last observed, and a `version-conflict` reply carries
 * the authoritative item, so a lost race reconciles from the reply itself
 * instead of refetching the whole Session.
 * @module @deepseek-ai/dsh-client-ui-message-feedback/client/controller
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { MessageId } from '@deepseek-ai/dsh-api-remotes/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { FeedbackRecord } from '@deepseek-ai/dsh-command-feedback/types';
import type { MessageFeedbackItem, MessageFeedbackRating } from '@deepseek-ai/dsh-message-feedback/types';
/** Load state of the one list read that seeds every per-message control. */
export type MessageFeedbackStatus = 'cold' | 'loading' | 'ready' | 'error';
/** Immutable view published to every per-message control in one Session. */
export interface MessageFeedbackView {
    status: MessageFeedbackStatus;
    /** Current item per message, keyed by the addressed message id. */
    items: ReadonlyMap<MessageId, MessageFeedbackItem>;
    /** Reason the last load failed, cleared by the next successful load. */
    error: string | null;
}
/** Rejected branch shared by every settled action. */
export interface MessageFeedbackActionFailure {
    ok: false;
    error: {
        code: string;
        message: string;
    };
}
/** Settled action shape rendered by the message-level controls. */
export type MessageFeedbackActionResult = {
    ok: true;
} | MessageFeedbackActionFailure;
/**
 * Human-readable text for one business failure code.
 * @param code - the Host's business failure code.
 * @returns the developer-facing description carried in the failure branch.
 */
export declare function describe(code: string): string;
/**
 * Per-session feedback object layer. One instance backs every per-message
 * control in that Session, so a single list read seeds them all.
 */
export declare class MessageFeedbackController implements HostObservable<MessageFeedbackView> {
    private readonly ctx;
    private readonly sessionId;
    private view;
    private readonly listeners;
    private loadPromise;
    private operationTail;
    private disposed;
    /**
     * @param ctx - the browser plugin context carrying the messageFeedback Remote namespace.
     * @param sessionId - Session owning every addressed assistant message.
     */
    constructor(ctx: ClientContext, sessionId: SessionId);
    /** Return the cached immutable view. */
    getSnapshot: () => MessageFeedbackView;
    /** Subscribe to view replacement. */
    subscribe: (listener: () => void) => (() => void);
    /**
     * Load once; a failed load stays retryable.
     * @returns the settled load result, shared by concurrent callers.
     */
    ensure(): Promise<MessageFeedbackActionResult>;
    /**
     * Re-read the authoritative list, collapsing concurrent callers onto one
     * in-flight read.
     *
     * This is the unserialized read used to seed a cold controller, where no
     * mutation can be in flight yet. A reconnect must use {@link resync} instead:
     * an unserialized list response can otherwise arrive after a newer mutation's
     * reply and overwrite the version that mutation just committed.
     * @returns the settled reload result.
     */
    refresh(): Promise<MessageFeedbackActionResult>;
    /**
     * Re-read the list behind this Session's queued mutations, so a reconnect
     * cannot resurrect a version an in-flight mutation already replaced.
     * @returns the settled reload result.
     */
    resync(): Promise<MessageFeedbackActionResult>;
    /**
     * Create or replace feedback for one message, comparing against the version
     * this controller last observed. The item stores exactly `entry`: an entry
     * without a note or category replaces whatever the stored item carried.
     * @param messageId - target assistant message.
     * @param rating - desired judgment.
     * @param entry - explanation and category to store with the judgment.
     * @returns the settled mutation result.
     */
    rate(messageId: MessageId, rating: MessageFeedbackRating, entry?: FeedbackRecord): Promise<MessageFeedbackActionResult>;
    /**
     * Retract one message's matching committed rating. The serialized operation
     * rechecks the current item and becomes a no-op if another operation already
     * changed or removed it, so a stale retraction can never record a bare rating.
     * @param messageId - target assistant message.
     * @param rating - judgment the human asked to retract.
     * @returns the settled mutation result.
     */
    retract(messageId: MessageId, rating: MessageFeedbackRating): Promise<MessageFeedbackActionResult>;
    /** Commit one put against the observed version and reconcile a conflict. */
    private putCommitted;
    /** Commit one delete against the observed version and reconcile a conflict. */
    private deleteCommitted;
    /** Drop subscribers and refuse further work when the owning fiber unloads. */
    dispose(): void;
    /** Fetch the whole sidecar and publish it as the seeded view. */
    private load;
    /**
     * Serialize one mutation behind this Session's prior mutation so queued
     * operations always compare against the committed version.
     */
    private mutate;
    /**
     * Replace one message's entry, keeping every other entry's identity. Only a
     * `mutate` operation reaches this, and `mutate` refuses admission once the
     * controller is disposed, so no disposal guard belongs here; `publish` is
     * the single place that stops notifying after listeners are dropped.
     */
    private commit;
    /** Replace the view and contain subscriber failures at the observable boundary. */
    private publish;
}
//# sourceMappingURL=controller.d.ts.map