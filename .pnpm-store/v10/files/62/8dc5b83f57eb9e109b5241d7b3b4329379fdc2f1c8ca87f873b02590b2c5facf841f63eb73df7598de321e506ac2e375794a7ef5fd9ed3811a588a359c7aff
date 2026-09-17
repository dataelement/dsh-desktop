/** Session Remote owner: cold reads, explicit Agent commands, and live control state. */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { SessionInspection } from '@deepseek-ai/dsh-session-persistence';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { type ApiSessionAgentResult } from './agent.ts';
import { buildModelCatalog } from './catalog.ts';
import type { ModelCatalog, SessionAttachmentRequest, SessionAttachmentValue, SessionCancelRequest, SessionCancelValue, SessionControlFrame, SessionCreateRequest, SessionCreateValue, SessionFollowFrame, SessionFollowRequest, SessionForkRequest, SessionForkValue, SessionListRequest, SessionListValue, SessionOpenWorkspacePathRequest, SessionOpenWorkspacePathValue, SessionPage, SessionPageRequest, SessionPromptRequest, SessionPromptValue, SessionRenameRequest, SessionRenameValue, SessionSearchRequest, SessionSearchValue, SessionSelectModelRequest, SessionSelectModelValue, SessionUpdateQueueRequest, SessionUpdateQueueValue } from './types.ts';
export type * from './types.ts';
export { ApiSessionNotFound } from './agent.ts';
export { SessionFileReferences } from './file-references.ts';
export { SessionSkillCatalog } from './skill-catalog.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host Session business API and Remote namespace owner. */
        sessionController: SessionController;
    }
}
/** Session Controller deployment policy. */
export interface Config {
    /** Override platform desktop-opener detection. */
    readonly nativeOpen?: boolean;
}
/** Host integrations replaceable by direct unit tests. */
export interface SessionControllerInternals {
    /** Native default-application handoff. */
    readonly openPath?: (path: string, signal: AbortSignal) => Promise<void>;
    /** Native file-manager handoff. */
    readonly revealPath?: (path: string, signal: AbortSignal) => Promise<void>;
    /** Native handoff availability probe. */
    readonly canOpenPath?: () => boolean;
}
/** Host service backing the generated `ctx.remote.session` namespace. */
export declare class SessionController extends TypertRemoteService {
    static inject: string[];
    static Config: z<Config>;
    private readonly agents;
    private readonly commands;
    private readonly controlState;
    private readonly history;
    private readonly listState;
    private readonly openPath;
    private readonly revealPath;
    private readonly canOpenPath;
    private readonly promotions;
    /**
     * @param ctx - Host context containing the Session capability assembly.
     * @param config - native-opener deployment policy.
     * @param internals - host integrations replaceable by direct unit tests.
     */
    constructor(ctx: Context, config: Config, internals?: SessionControllerInternals);
    private promote;
    /**
     * Resolve or resume one ordinary Session for another Host API domain.
     * @param sessionId - Session identity whose Agent owns the operation.
     * @returns the live Agent or the stable Session-domain failure.
     */
    resolveAgent(sessionId: SessionId): Promise<ApiSessionAgentResult>;
    /**
     * Inspect one attached or persisted Session without activating its Agent.
     * @param sessionId - durable Session identity.
     * @param signal - optional caller cancellation for persistence reads.
     * @returns the current attached state or persisted header and event prefix.
     */
    inspect(sessionId: SessionId, signal?: AbortSignal): Promise<SessionInspection>;
    /**
     * Read all visible Session rows without resuming an Agent.
     * @param _request - reserved empty list request.
     * @param signal - cancellation for persistence reads.
     * @returns visible Session summaries ordered by activity.
     */
    list(_request: SessionListRequest, signal: AbortSignal): Promise<SessionListValue>;
    /**
     * Search visible Session content without resuming an Agent.
     * @param request - literal message-content query.
     * @param signal - cancellation for list and search reads.
     * @returns authorized bounded Session search results.
     */
    search(request: SessionSearchRequest, signal: AbortSignal): Promise<SessionSearchValue>;
    /**
     * Create or idempotently adopt one ordinary Session.
     * @param request - requested identity, location, and Agent preset.
     * @returns the Session identity and resolved preset when configured.
     */
    create(request: SessionCreateRequest): Promise<SessionCreateValue>;
    /**
     * Select one Session-local model after explicitly resuming the Session.
     * @param request - Session identity and requested model selection.
     * @returns the normalized selection installed for the Session.
     */
    selectModel(request: SessionSelectModelRequest): Promise<SessionSelectModelValue>;
    /**
     * Describe every currently routable model for Host-generation selectors.
     * @returns provider-grouped models, the deployment default, and isolated provider failures.
     */
    modelCatalog(): Promise<ModelCatalog>;
    /**
     * Report whether this deployment can hand a Session workspace path to a native desktop.
     * @returns true when the matching open operation is available.
     */
    canOpenWorkspacePath(): boolean;
    /**
     * Describe the serving desktop for authenticated file-action routes.
     * @returns Host name, configured availability, and platform-specific file-manager behavior.
     */
    workspaceDesktop(): {
        name: string;
        available: boolean;
        fileManager: 'finder' | 'explorer' | 'directory' | null;
    };
    /**
     * Open one path prepared by a Session-aware caller on the Host desktop.
     * @param request - path after best-effort Session workspace resolution.
     * @param signal - caller lifetime; abort terminates the native command.
     * @returns confirmation after the native opener accepts the path.
     * @throws RemoteError when the request is invalid, cancelled, or the opener fails.
     */
    openWorkspacePath(request: SessionOpenWorkspacePathRequest, signal: AbortSignal): Promise<SessionOpenWorkspacePathValue>;
    /**
     * Rename one Session after explicitly resuming it.
     * @param request - Session identity and proposed title.
     * @returns the accepted title and durable event sequence.
     */
    rename(request: SessionRenameRequest): Promise<SessionRenameValue>;
    /**
     * Fork one cold-readable completed-turn prefix into a new Session.
     * @param request - source Session and optional event anchor.
     * @returns the new Session identity.
     */
    fork(request: SessionForkRequest): Promise<SessionForkValue>;
    /**
     * Admit one prompt after explicitly resuming its Session.
     * @param request - Session identity, prompt content, source metadata, and delivery mode.
     * @param signal - caller cancellation before prompt admission begins.
     * @returns acknowledgement that the Agent accepted the prompt.
     */
    prompt(request: SessionPromptRequest, signal: AbortSignal): Promise<SessionPromptValue>;
    /**
     * Read one image proven reachable from the addressed Session log.
     * @param request - Session and attachment identities used for authorization.
     * @returns the durable attachment reference and base64-encoded bytes.
     */
    attachment(request: SessionAttachmentRequest): Promise<SessionAttachmentValue>;
    /**
     * Mutate one still-pending queue occurrence on a live Agent.
     * @param request - Session, queue item, and requested mutation.
     * @returns acknowledgement that the queue mutation was applied.
     */
    updateQueue(request: SessionUpdateQueueRequest): SessionUpdateQueueValue;
    /**
     * Cancel one active Agent turn without dropping its pending inbox.
     * @param request - Session whose active Agent turn is cancelled.
     * @returns acknowledgement that cancellation was requested.
     */
    cancel(request: SessionCancelRequest): SessionCancelValue;
    /**
     * Read one cold-safe, message-aligned Session history page.
     * @param request - durable address, backward cursor, and page budget.
     * @param signal - cancellation for persistence reads.
     * @returns one chronological page.
     */
    page(request: SessionPageRequest, signal: AbortSignal): Promise<SessionPage>;
    /**
     * Follow one Session log from its opening or resume cursor.
     * @param request - durable address and last committed sequence already held by the caller.
     * @param signal - cancellation owned by the Remote stream carrier.
     * @returns a complete opening snapshot followed by gap-free durable event
     *   frames and optional cursorless assistant-stream frames.
     */
    follow(request: SessionFollowRequest, signal: AbortSignal): AsyncIterable<SessionFollowFrame>;
    /**
     * Stream a complete live-control baseline followed by replacement frames.
     * @param signal - cancellation owned by the Remote stream carrier.
     * @returns one complete baseline followed by live replacement frames.
     */
    control(signal: AbortSignal): AsyncIterable<SessionControlFrame>;
}
export { buildModelCatalog };
export default SessionController;
//# sourceMappingURL=index.d.ts.map