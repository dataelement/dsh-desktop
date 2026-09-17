/** One standard ACP session's Agent, configuration, prompt, update, and teardown lifecycle. */
import type { Context } from '@deepseek-ai/cordis';
import { type McpServer, type PromptRequest, type PromptResponse, type SessionConfigOption, type SessionNotification } from '@agentclientprotocol/sdk';
import type { Agent, AgentOptions, ModelSelection } from '@deepseek-ai/dsh-agent';
import { type UserMessage } from '@deepseek-ai/dsh-llm';
import { type Session, type SessionEvent, type SessionId } from '@deepseek-ai/dsh-session';
/** Inputs shared by fresh and resumed ACP session construction. */
interface AcpSessionBuildOptions {
    cwd: string;
    mcpServers: readonly McpServer[];
    agentOptions: AgentOptions;
    fallbackSelection: ModelSelection | undefined;
    signal: AbortSignal;
    notify: (notification: SessionNotification) => Promise<void>;
}
/** Fresh ACP session construction inputs. */
export interface CreateAcpSessionOptions extends AcpSessionBuildOptions {
    sessionId: SessionId;
}
/** Persisted ACP session construction inputs. */
export interface ResumeAcpSessionOptions extends AcpSessionBuildOptions {
    sessionId: SessionId;
}
/**
 * Per-session ACP module. It owns the unpublished Agent composition, selected
 * route, one-prompt admission slot, ordered standard updates, and memoized
 * quiescent teardown.
 */
export declare class AcpSession {
    private readonly ctx;
    private readonly notify;
    /** The exact top-level Agent owned by this ACP session. */
    readonly agent: Agent;
    private readonly modelControl;
    private outputTail;
    private inflight;
    private closing;
    private readonly pendingSelections;
    private constructor();
    private readonly disposeAgent;
    /**
     * Compose a fresh Agent and all requested MCP clients before publication.
     * @param ctx - ACP plugin context with Agent, LLM, and persistence services.
     * @param options - fresh session identity, workspace, route, MCP, and notifier.
     * @returns the fully composed per-session module.
     */
    static create(ctx: Context, options: CreateAcpSessionOptions): Promise<AcpSession>;
    /**
     * Restore a persisted Agent and compose the request's fresh MCP connections.
     * @param ctx - ACP plugin context with Agent, LLM, and persistence services.
     * @param options - persisted identity, workspace, fallback route, MCP, and notifier.
     * @returns the restored per-session module.
     */
    static resume(ctx: Context, options: ResumeAcpSessionOptions): Promise<AcpSession>;
    /**
     * Whether this module owns an exact Agent reference.
     * @param agent - Agent observed on a scoped runtime event.
     * @returns true only for this session's owned Agent.
     */
    owns(agent: Agent): boolean;
    /**
     * Whether this module owns an exact Session reference.
     * @param session - Session observed on a durable event.
     * @returns true only for this session's owned Session.
     */
    ownsSession(session: Session): boolean;
    /**
     * Return the complete standard model configuration state.
     * @param signal - optional request cancellation.
     * @returns provider-grouped model and exact-model reasoning options.
     */
    configOptions(signal?: AbortSignal): Promise<SessionConfigOption[]>;
    /**
     * Apply one standard configuration option to later ACP turns.
     * @param configId - advertised standard option id.
     * @param value - selected standard option value.
     * @param signal - optional request cancellation.
     * @returns the complete resulting option state.
     */
    setConfig(configId: string, value: unknown, signal?: AbortSignal): Promise<SessionConfigOption[]>;
    /** Resolve topology state off-chain, then serialize its notification without blocking execution updates. */
    topologyChanged(): void;
    /**
     * Admit, enqueue, and settle one prompt at whole-Agent quiescence.
     * @param params - standard ACP prompt request for this session.
     * @param imageEnabled - connection capability advertised at initialization.
     * @param requestSignal - JSON-RPC request cancellation signal.
     * @returns the correlated standard stop reason after ordered updates drain.
     */
    prompt(params: PromptRequest, imageEnabled: boolean, requestSignal?: AbortSignal): Promise<PromptResponse>;
    /** Cancel the active prompt, or autonomous work when no ACP prompt exists. */
    cancel(): void;
    /**
     * Process one durable event and enqueue its standard ACP projections.
     * @param session - exact event-owning Session.
     * @param event - committed durable event.
     */
    onSessionEvent(session: Session, event: SessionEvent): void;
    /**
     * Correlate an accepted user message with its Agent turn and pinned route.
     * @param message - claimed durable inbox message.
     * @param turn - allocated Agent turn.
     */
    onInboxClaimed(message: UserMessage, turn: number): void;
    /**
     * Correlate an Agent interval failure with the active ACP prompt.
     * @param turn - failed turn number.
     * @param error - original same-process failure.
     */
    onAgentError(turn: number, error: unknown): void;
    /** Await every update queued before this call. */
    drainUpdates(): Promise<void>;
    /**
     * Cancel, drain, flush, and dispose this session once.
     * @param detail - cancellation detail for any prompt still in admission.
     * @returns the shared quiescent teardown promise.
     */
    close(detail: string): Promise<void>;
    private assertActive;
    private cancelPrompt;
    private settleAfterQuiescence;
}
export {};
//# sourceMappingURL=session.d.ts.map