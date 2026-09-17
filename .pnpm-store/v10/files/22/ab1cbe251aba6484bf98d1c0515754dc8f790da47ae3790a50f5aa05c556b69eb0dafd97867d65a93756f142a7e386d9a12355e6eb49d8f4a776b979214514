/**
 * One Session's feedback surface: the message-feedback object layer and the
 * dialog controller, plus the routing between them. A message target puts a
 * selected judgment through the message controller; the Session target records
 * through the `sessionFeedback` Remote.
 * @module @deepseek-ai/dsh-client-ui-message-feedback/client/surface
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { MessageFeedbackController } from './controller.ts';
import { FeedbackDialogController } from './dialog.ts';
/** The per-session pair behind every entry of one Session. */
export declare class FeedbackSurface {
    private readonly ctx;
    private readonly sessionId;
    /** The Session's message-feedback object layer, shared by every message control. */
    readonly feedback: MessageFeedbackController;
    /** The Session's dialog and toast state, shared by the overlay entry and the message controls. */
    readonly dialog: FeedbackDialogController;
    /**
     * @param ctx - the browser plugin context carrying both feedback Remotes.
     * @param sessionId - Session owning the transcript and the remark.
     */
    constructor(ctx: ClientContext, sessionId: SessionId);
    /** Record one Session-level remark through the sessionFeedback Remote. */
    private recordSession;
    /** Drop both controllers when the owning fiber unloads. */
    dispose(): void;
}
//# sourceMappingURL=surface.d.ts.map