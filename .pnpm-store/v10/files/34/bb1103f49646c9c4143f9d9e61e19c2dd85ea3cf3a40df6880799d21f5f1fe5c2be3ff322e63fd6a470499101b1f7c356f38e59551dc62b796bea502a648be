/**
 * Default Agent driver over queued turns and step-boundary input. Every request
 * is derived from the session log.
 * @module dsh-agent-loop/agent
 */
import type { Agent, AgentCancelCause, AgentOptions, AgentStatus, CancelOptions, InboxTarget } from '@deepseek-ai/dsh-agent';
import type { Scope } from '@deepseek-ai/dsh-scope';
import type { Session, SessionId, UserMessage } from '@deepseek-ai/dsh-session';
import type { Context } from '@deepseek-ai/cordis';
import { ReactLoopInbox } from './inbox.ts';
/** Drives one session through turn and step boundaries. */
export declare class ReactLoopAgent implements Agent {
    private loopCtx;
    readonly id: SessionId;
    readonly options: AgentOptions;
    readonly session: Session;
    readonly inbox: ReactLoopInbox;
    private phase;
    private activityDone;
    /** The agent-scoped registration boundary; the lifecycle owner unwinds it after the driver exits. */
    readonly scope: Scope;
    readonly ctx: Context;
    /** Fused dispatcher, built once in the constructor so hot-path dispatches never allocate. */
    private readonly dispatch;
    /** Whether this loop instance has appended its initial/resume request anchor. */
    private requestHeaderLogged;
    /** Surface generation at attachment or the preceding built request. */
    private requestSurfaceGeneration;
    private readonly runtimeContext;
    /** Process-local revision of assistant frames for this attached Session. */
    private assistantStreamRevision;
    private assistantAttemptCounter;
    private readonly systemPrompt;
    /** Identities fully frozen by this loop; weak references do not retain replaced history. */
    private readonly frozenMessages;
    constructor(loopCtx: Context, id: SessionId, options: AgentOptions, session: Session);
    get status(): AgentStatus;
    /** Commit a phase and publish its externally visible status transition. */
    private setPhase;
    send(message: UserMessage, target: InboxTarget, wakeup: boolean): void;
    followup(input: UserMessage): void;
    steer(input: UserMessage): void;
    inject(input: UserMessage): void;
    cancel(cause: AgentCancelCause, options?: CancelOptions): void;
    runMaintenance<T>(job: (signal: AbortSignal) => Promise<T>): Promise<T>;
    /**
     * Start one driver, or latch its wake behind maintenance or an aborted
     * activity. A wake sent while idle always opens its turn boundary, even
     * when its message was cleared; only a latched replay is suppressed when
     * the queue no longer holds the wake.
     * @param wakeAfterAbort - the {@link send} classification, captured before
     *   the inbox insertion so a reentrant cancel cannot reclassify it.
     */
    private wakeDriver;
    whenIdle(): Promise<void>;
    /** Report one failure at its live boundary, then preserve it for driver containment. */
    private throwError;
    private kick;
    private preStep;
    /** Whether the assembled tool schemas differ from the logged request header's. */
    private toolsChanged;
    /** Open one turn before claiming its first proposed step. */
    private turn;
    private step;
    /** Resolve request config and bind its adapter before admitting model-visible input. */
    private prepareRequest;
    /** Log the resolved envelope and derive a frozen request from the admitted surface. */
    private buildRequest;
}
//# sourceMappingURL=agent.d.ts.map