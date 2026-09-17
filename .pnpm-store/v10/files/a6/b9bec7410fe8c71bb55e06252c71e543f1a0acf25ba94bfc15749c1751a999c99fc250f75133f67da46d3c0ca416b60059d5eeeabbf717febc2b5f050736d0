/** Session commands whose activation policy is explicit at each Remote method. */
import type { Context } from '@deepseek-ai/cordis';
import { ApiSessionAgentController } from './agent.ts';
import type { SessionAttachmentRequest, SessionAttachmentValue, SessionCancelRequest, SessionCancelValue, SessionCreateRequest, SessionCreateValue, SessionForkRequest, SessionForkValue, SessionPromptRequest, SessionPromptValue, SessionRenameRequest, SessionRenameValue, SessionSelectModelRequest, SessionSelectModelValue, SessionUpdateQueueRequest, SessionUpdateQueueValue } from './types.ts';
/** Implements Session business commands delegated by the Session Controller Remote service. */
export declare class SessionCommandController {
    private readonly ctx;
    private readonly agents;
    private readonly defaultCwd;
    /**
     * @param ctx - Host context carrying Agent, model, attachment, title, and Workspace services.
     * @param agents - sole owner of create, resume, and Session-local model selection.
     * @param defaultCwd - project directory used when create names neither a Workspace nor a cwd.
     */
    constructor(ctx: Context, agents: ApiSessionAgentController, defaultCwd: string);
    /**
     * Create or idempotently adopt one ordinary Session.
     * @param request - requested identity, location, and Agent preset.
     * @returns the Session identity and resolved preset when configured.
     */
    create(request: SessionCreateRequest): Promise<SessionCreateValue>;
    /**
     * Validate and install one Session-local model selection.
     * @param request - Session identity and requested model selection.
     * @returns the normalized selection installed for the Session.
     */
    selectModel(request: SessionSelectModelRequest): Promise<SessionSelectModelValue>;
    /**
     * Normalize and append a user-owned Session title.
     * @param request - Session identity and proposed title.
     * @returns the accepted title and durable event sequence.
     */
    rename(request: SessionRenameRequest): Promise<SessionRenameValue>;
    /**
     * Create a new ordinary Session from one completed-turn prefix.
     * @param request - source Session and optional event anchor.
     * @returns the new Session identity.
     */
    fork(request: SessionForkRequest): Promise<SessionForkValue>;
    /**
     * Reject empty content, then admit one prompt after Agent and attachment validation.
     * @param request - Session identity, prompt content, source metadata, and delivery mode.
     * @returns acknowledgement that the Agent accepted the prompt.
     */
    prompt(request: SessionPromptRequest): Promise<SessionPromptValue>;
    /**
     * Read one durable image after proving the Session log references it.
     * @param request - Session and attachment identities used for authorization.
     * @returns the durable attachment reference and base64-encoded bytes.
     */
    attachment(request: SessionAttachmentRequest): Promise<SessionAttachmentValue>;
    /**
     * Mutate one still-pending queue occurrence without resuming a cold Agent.
     * @param request - Session, queue item, and requested mutation.
     * @returns acknowledgement that the queue mutation was applied.
     */
    updateQueue(request: SessionUpdateQueueRequest): SessionUpdateQueueValue;
    /**
     * Cancel one live ordinary Agent while retaining pending inbox work.
     * @param request - Session whose active Agent turn is cancelled.
     * @returns acknowledgement that cancellation was requested.
     */
    cancel(request: SessionCancelRequest): SessionCancelValue;
    private resolveAgent;
    private rejectCreation;
    private readSessionState;
    private forkWorkspace;
}
//# sourceMappingURL=commands.d.ts.map