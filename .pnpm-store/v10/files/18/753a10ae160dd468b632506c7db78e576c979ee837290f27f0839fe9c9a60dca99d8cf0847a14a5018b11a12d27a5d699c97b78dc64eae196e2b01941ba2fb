/**
 * Feedback surface plugin, browser half: the Like/Dislike entry in the
 * conversation.chat.assistant-actions strip, the feedback dialog and its
 * acknowledgement and failure toasts in conversation.input.overlay, and the `/feedback`
 * decoration that opens the dialog from the composer menu or a bare typed
 * command. One FeedbackSurface per Session backs every entry in that Session.
 * @module @deepseek-ai/dsh-client-ui-message-feedback/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export type { MessageFeedbackActionFailure, MessageFeedbackActionResult, MessageFeedbackStatus, MessageFeedbackView, } from './controller.ts';
export type { FeedbackDialogState, FeedbackDialogTarget, FeedbackSubmit } from './dialog.ts';
export type { FeedbackDialogInjected, FeedbackDialogProps, MessageFeedbackActionProps, MessageFeedbackInjected, } from './slots.ts';
export type { MessageFeedbackKey } from './locales.ts';
/** Required services: the slot registry, the two Remote namespaces, and the copy. */
export declare const inject: string[];
/**
 * Client plugin body: the per-message feedback entry, the Session's dialog
 * entry, the `/feedback` decoration, and their per-session surfaces.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map