/**
 * Continuable-subagent orchestration behind `ctx.subagents`: stable child ids,
 * descriptor persistence, provider preparation, cold resume, authorization,
 * and message routing. {@link ContinuableActivationRegistry} owns the mutable
 * process-local Activation graph and its settlement and disposal lifecycle.
 *
 * A continuable child has one durable Session and at most one process-local
 * Activation. The Agent inbox is the only turn queue, so this manager owns
 * durable orchestration while the Agent loop owns all turn ordering and
 * execution. No continuable path creates a Task or an intermediate
 * result-bearing wrapper.
 *
 * @module @deepseek-ai/dsh-subagent
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ContentBlock, MessageId, MessageSource } from '@deepseek-ai/dsh-llm';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { ActivationObserver } from './lifecycle.ts';
import type { ContinuableCreateRequest, ContinuableCreateSpec, ContinuableStart, ContinuableStartSpec, SubagentInterruptAuthority, SubagentSendMessageOptions } from './types.ts';
/** Package-private hooks supplied by the owning service. */
interface ContinuationHost {
    /** Resolve one provider's detached continuable-creation contribution. */
    prepareContinuable(name: string, request: ContinuableCreateRequest): Promise<ContinuableCreateSpec>;
    /** Build the lifecycle observer for one Activation residency epoch. */
    observeActivation(provider: string, childId: SessionId, parent: Agent): ActivationObserver;
}
/**
 * The continuable-subagent orchestration service behind `ctx.subagents`. Tool
 * schema and host adapters are consumers of this one contract; foreground
 * one-shot delegation keeps calling `ctx.subagents.start()` and never enters
 * this lifecycle.
 */
export declare class SubagentContinuationManager {
    private readonly ctx;
    private readonly host;
    private readonly activations;
    constructor(ctx: Context, host: ContinuationHost);
    /**
     * Start one continuable background child and resolve at initial inbox acceptance.
     * Every earlier failure disposes any created handle and rolls back Activation
     * and parent ownership without returning either id.
     * @param spec - provider, delegation request, and caller cancellation.
     * @returns the durable child id and accepted initial prompt message id.
     */
    startContinuable(spec: ContinuableStartSpec): Promise<ContinuableStart>;
    /**
     * Deliver one model-authored message to a direct continuable child or to the
     * sender's direct parent. A missing direct child cold-resumes through the
     * ordinary continuation lifecycle.
     * @param sender - exact live Agent authorizing and originating the message.
     * @param targetId - durable direct-parent or direct-child session id.
     * @param content - model-authored content to deliver.
     * @param options - caller cancellation before acceptance.
     * @returns the accepted message's inbox id.
     */
    sendMessage(sender: Agent, targetId: SessionId, content: ContentBlock[], options: SubagentSendMessageOptions): Promise<MessageId>;
    /**
     * Queue one human-authored prompt as a distinct direct-child turn.
     * @param parent - exact live direct parent authorizing delivery.
     * @param childId - durable direct-child session id.
     * @param content - model-visible prompt blocks.
     * @param source - durable attribution for the human prompt.
     * @param signal - caller cancellation before inbox acceptance.
     * @returns the accepted durable message id.
     */
    queuePrompt(parent: Agent, childId: SessionId, content: ContentBlock[], source: MessageSource, signal: AbortSignal): Promise<MessageId>;
    /**
     * Steer one host-authored prompt to a direct continuable child.
     * @param parent - exact live direct parent authorizing delivery.
     * @param childId - durable direct-child session id.
     * @param content - model-visible prompt blocks.
     * @param source - durable attribution for the host prompt.
     * @param signal - caller cancellation before inbox acceptance.
     * @returns the accepted durable message id.
     */
    steerPrompt(parent: Agent, childId: SessionId, content: ContentBlock[], source: MessageSource, signal: AbortSignal): Promise<MessageId>;
    /** Route one parent-originated delivery through residency and cold resume. */
    private deliverToChild;
    /** The delivery loop behind {@link deliverToChild}, run under the parent hold. */
    private deliverFollowup;
    /**
     * Interrupt one live continuable child's current turn. Admission is
     * synchronous and the cancellation effect is asynchronous. An absent or
     * already-closing target is an accepted no-op after authority checks.
     * @param targetSessionId - the durable child session id to interrupt.
     * @param authority - the human parent address or exact live ancestor Agent.
     */
    interrupt(targetSessionId: SessionId, authority: SubagentInterruptAuthority): void;
    /** Deliver one resident continuable child's message to its live direct parent. */
    private sendToParent;
    /** Send one Agent message while translating only the target's own rejection. */
    private sendAgentMessage;
    /** Close manager-wide admission and release every live Activation. */
    drain(): Promise<void>;
    /**
     * Stop only the continuable descendants of exact live host-owned parents.
     * @param parents - exact live roots whose continuable descendants must stop.
     */
    drainDescendants(parents: readonly Agent[]): Promise<void>;
    /**
     * Release selected resident direct children of one exact live parent.
     * @param parent - exact live direct parent authorizing the selected release.
     * @param childIds - durable direct-child ids to release when resident.
     */
    drainChildren(parent: Agent, childIds: readonly SessionId[]): Promise<void>;
    /**
     * Cold-resume a persisted child and submit the waiting turn. The descriptor
     * supplies every reconstruction input; no subagent provider is dispatched.
     */
    private coldResume;
    /** Admit a materialized child, commit its creation fact, and release it on failure. */
    private submitMaterialized;
    /** Build and submit one message across the final synchronous admission cutoff. */
    private submitAdmitted;
    /** Refuse image content for a child whose fixed model accepts text only. */
    private assertImageCapable;
    /** Resolve the persistence service continuable children require, or fail loud. */
    private requirePersistence;
    /** Resolve the Session query service used for cold child observations. */
    private requireSessionQuery;
}
export default SubagentContinuationManager;
//# sourceMappingURL=continuation.d.ts.map