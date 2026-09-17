/**
 * Service Definition for the subagent capability seam (`ctx.subagents`): a named-provider registry plus a
 * capability-validating asynchronous start API. Providers establish a
 * child before returning its run, so fulfillment is the single publication and
 * ownership-transfer boundary.
 *
 * Multiple providers coexist: each registers under a unique name and callers
 * select one by name.
 *
 * This package owns the Service Definition role of the capability seam. Service Providers
 * (`@deepseek-ai/dsh-subagent-spawn-in-process`, `-fork`, `-acp`) and the model-facing
 * consumer (`@deepseek-ai/dsh-tool-subagent`) are separate packages.
 *
 * Public operations express caller intent: `start` returns one published owned
 * one-shot run, `startContinuable` establishes a durable continuable child, and
 * `sendMessage` steers between adjacent Agents without exposing whether a child
 * is resident. Continuable children never become a {@link SubagentRun}: the
 * continuation manager holds their `AgentHandle` directly and orders every turn
 * through the child's own inbox, so providers contribute only the detached
 * creation spec and see no handle, turn, or teardown. Child and descendant
 * discovery read the live session store and optional session persistence
 * directly and do not require that continuation runtime.
 *
 * Same-process providers are trusted typed collaborators. Requests, provider
 * descriptors, results, and lifecycle payloads are borrowed immutable values;
 * serialization and hostile-input validation belong at real process, worker,
 * persistence, and model boundaries.
 *
 * @module @deepseek-ai/dsh-subagent
 */
import { Context } from '@deepseek-ai/cordis';
import type { Scoped } from '@deepseek-ai/dsh-scope';
import type { ContentBlock, MessageId } from '@deepseek-ai/dsh-llm';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { SessionId } from '@deepseek-ai/dsh-session';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { SubagentCatalog, SubagentInterruptReceipt, SubagentPromptReceipt, SubagentPromptRequest } from './control-types.ts';
import type { ContinuableStart, ContinuableStartSpec, SubagentInterruptAuthority, SubagentProvider, SubagentRun, SubagentRunEndInfo, SubagentRunInfo, SubagentSendMessageOptions, SubagentStartRequest } from './types.ts';
import type { SubagentDescendantListEntry, SubagentListEntry } from './list-children.ts';
import { deliverSubagentPrompt } from './internal.ts';
export type {} from './catalog.ts';
export * from './out-of-process.ts';
export { AssistantOutputFold, finalAssistantOutput } from './assistant-output.ts';
export { SubagentRunId } from './types.ts';
export type { ContinuableCreateRequest, ContinuableCreateSpec, ContinuableStart, ContinuableStartSpec, ResolvedSubagentStartRequest, SubagentCapabilities, SubagentInterruptAuthority, SubagentProvider, SubagentResult, SubagentRun, SubagentSendMessageOptions, SubagentStartRequest, SubagentStopReason, SubagentStopReasonMap, } from './types.ts';
export { foldSubagentDescriptor, snapshotSubagentDescriptor, SUBAGENT_DESCRIPTOR_VERSION, } from './descriptor.ts';
export type { ContinuableSubagentDescriptorData, ContinuableSubagentDescriptorInput, OneShotSubagentDescriptorData, OneShotSubagentDescriptorInput, SubagentDescriptorData, SubagentDescriptorInput, } from './descriptor.ts';
export { SubagentError } from './error.ts';
export { settleRun } from './run-settlement.ts';
export { assertSubagentMaxDepth, delegationDepthOf } from './depth.ts';
export { appendDelegatedPolicyOverrides, applyChildComposition, captureDelegatedPolicyOverrides, childSessionMeta, parentAgentOptionsForDelegation, resolveChildAgentOptions, resolveChildDepth, SubagentDepthError, } from './child-agent.ts';
export type { ChildComposition, DelegatedPolicyOverrides } from './child-agent.ts';
export type { AgentMessageSource, SubagentSettledMessageSource } from './continuation-messages.ts';
export type * from './control-types.ts';
export type { SubagentDescendantListEntry } from './list-children.ts';
export type { SubagentRunEndInfo, SubagentRunInfo } from './types.ts';
export type { SubagentIdentityProjection, SubagentTimingProjection } from './projection-types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        subagents: SubagentRuntime;
    }
    interface Events {
        /**
         * A provider became resolvable in the registry.
         * @param provider - the registered provider.
         * @mode emit
         */
        'subagent/provider-added'(provider: SubagentProvider): void;
        /**
         * A provider left the registry. Accepted runs remain holder-owned.
         * @param name - the provider name that no longer resolves.
         * @mode emit
         */
        'subagent/provider-removed'(name: string): void;
        /**
         * A provider established a published child. For in-process providers,
         * `ctx.agents.get(info.id)` resolves during this notification.
         * Scope-filtered dispatch keys the carrier by the delegating parent, so a
         * parent-scoped listener observes only its own delegations. Paired with
         * `subagent/end`.
         * @param info - the provider and published child identity.
         * @dshScopeScan unsupported
         * @mode emit
         */
        'subagent/start'(this: Scoped<SubagentRuntime>, info: SubagentRunInfo): void;
        /**
         * A published child settled. Scope-filtered dispatch uses the same delegating
         * parent carrier as `subagent/start`, so the lifecycle pair reaches the
         * same scoped audience.
         * @param info - the run identity and terminal outcome.
         * @dshScopeScan unsupported
         * @mode emit
         */
        'subagent/end'(this: Scoped<SubagentRuntime>, info: SubagentRunEndInfo): void;
    }
}
/** Named provider registry with one-shot runs, durable discovery, and continuable-child operations. */
export declare class SubagentRuntime extends TypertRemoteService {
    private providers;
    private continuations;
    /**
     * The contained lifecycle-edge publisher. Built here because scoped dispatch
     * keys its carrier by this exact service instance, whose own context filter
     * composes into the carrier.
     */
    private readonly emitLifecycle;
    constructor(ctx: Context);
    /**
     * Establish one durable continuable child and deliver its initial prompt.
     * Resolves when the child's inbox accepts that prompt, without waiting for the
     * turn to start or for the message to reach the Session log; any earlier
     * failure rejects with no ids and rolls back the child entirely.
     * @param spec - provider, delegation request, and caller cancellation.
     * @returns the durable child id and the accepted prompt's message id.
     * @throws when continuation services are unavailable or materialization fails.
     */
    startContinuable(spec: ContinuableStartSpec): Promise<ContinuableStart>;
    /**
     * Steer one model-authored message to the sender's direct parent or direct
     * continuable child. A running target admits it at the nearest step boundary;
     * an idle target starts a turn, and an absent direct child cold-resumes from
     * persistence. The service derives durable sender attribution from the exact
     * live sender. Caller cancellation stops only pre-acceptance work.
     * @param sender - exact live Agent authorizing and originating the message.
     * @param targetId - durable direct-parent or direct-child session id.
     * @param content - model-authored content to deliver.
     * @param options - caller cancellation before inbox acceptance.
     * @returns the accepted message's inbox id.
     * @throws when continuation services are unavailable, adjacency is rejected,
     *   or the message was not admitted.
     */
    sendMessage(sender: Agent, targetId: SessionId, content: ContentBlock[], options: SubagentSendMessageOptions): Promise<MessageId>;
    /**
     * Deliver one host-protocol message to a direct continuable child.
     * Symbol-keyed so host adapters can preserve their own provenance without
     * widening the public Service Definition or impersonating an Agent sender.
     * @param parent - exact live direct parent authorizing delivery.
     * @param childId - durable direct-child session id.
     * @param content - host-authored content to deliver.
     * @param source - durable host-protocol provenance.
     * @param signal - caller cancellation before inbox acceptance.
     * @param delivery - Queue as a distinct turn or Steer at the nearest step.
     * @returns the accepted message's inbox id.
     */
    private [deliverSubagentPrompt];
    /**
     * Interrupt one live continuable child's current turn under a human parent
     * address or an exact live ancestor Agent. Fire-and-return: the cancel
     * signal is issued before this returns, but the target may keep running
     * until it observes the signal. Unclaimed pending inbox work, the Activation,
     * and published descendants are preserved; claimed work is not requeued.
     * Once the interrupted driver is idle, a waking send resumes the parked FIFO
     * queue. An absent target — including a one-shot or unknown id —
     * is an accepted no-op, as is a manager-less composition, which cannot own a
     * live Activation.
     * @param targetSessionId - the durable child session id to interrupt.
     * @param authority - the human parent address or exact live ancestor Agent.
     * @throws {SubagentError} `UNAUTHORIZED` when the authority does not own the
     *   live target.
     */
    interrupt(targetSessionId: SessionId, authority: SubagentInterruptAuthority): void;
    /**
     * Close continuable admission below exact live parent Agents, stop only their
     * visible descendant Activations synchronously, then await admitted scoped
     * materializations and release those forests child-first. The scoped cutoff
     * lasts until each exact parent leaves the registry; unrelated parent trees
     * remain live.
     * @param parents - exact host-owned parent Agents entering teardown.
     * @returns once every retained descendant Activation released its `AgentHandle`.
     * @throws an aggregate error after all branches settle when any failed.
     */
    drainContinuableDescendants(parents: readonly Agent[]): Promise<void>;
    /**
     * Release selected resident continuable direct children of one exact live
     * parent. Other children of the same parent remain admitted and resident.
     * Absent targets and a manager-less composition are accepted no-ops.
     * @param parent - exact live direct parent authorizing the selected release.
     * @param childIds - durable direct-child ids to release when resident.
     * @returns once every selected Activation released its `AgentHandle`.
     * @throws {SubagentError} `UNAUTHORIZED` when a resident target belongs to a
     *   different parent or the supplied parent identity is stale.
     */
    drainContinuableChildren(parent: Agent, childIds: readonly SessionId[]): Promise<void>;
    /**
     * Enumerate the parent's direct session-backed subagents without loading or
     * resuming an Agent. The Session query service supplies one live-preferred
     * corpus and shared point observations; the projection cache supplies
     * immutable descriptor hits without opening cold logs. The registered
     * `subagent` projection remains the sole mode/label classifier.
     *
     * Every query receives `signal`, and the listing rechecks cancellation
     * around each await. Read rejections that settle
     * after an abort become a stable `SubagentError` with code `CANCELLED`.
     * @param parentSessionId - parent session whose direct children are listed.
     * @param signal - caller-owned cancellation forwarded to Session queries
     *   and observed around every read await.
     * @returns children and per-child diagnostics ordered by `createdAt`, then id.
     * @throws {@link SubagentError} when the projection registry or the session
     *   store is not mounted, or the caller cancels the listing.
     */
    listChildren(parentSessionId: SessionId, signal?: AbortSignal): Promise<SubagentListEntry[]>;
    /**
     * Enumerate the root's complete session-backed subagent tree in stable
     * pre-order from one live-preferred corpus, without loading or resuming an
     * Agent. Ordinary sessions and one-shot children remain traversal nodes so
     * continuable descendants below them are discovered; each returned entry
     * adds its durable `parentId` and root-relative `depth`. Identity resolution,
     * diagnostics, optional persistence, and cancellation follow the same
     * projection-backed contract as {@link listChildren}.
     * @param rootSessionId - session whose complete descendant tree is listed.
     * @param signal - caller-owned cancellation forwarded to persistence reads
     *   and observed around every read await.
     * @returns children and per-candidate diagnostics with tree position, in
     *   stable pre-order.
     * @throws {@link SubagentError} under the same conditions as {@link listChildren}.
     */
    listDescendants(rootSessionId: SessionId, signal?: AbortSignal): Promise<SubagentDescendantListEntry[]>;
    /**
     * Remote face of {@link listChildren} for one browser: the durable listing
     * plus live Agent activity and the delivery-time parent availability hint.
     * Parent availability is a hint; {@link prompt} performs the authoritative
     * check. Named apart from the provider-name {@link list}, which owns the
     * member.
     * @param parentSessionId - parent session whose direct children are listed.
     * @param signal - carrier cancellation forwarded to Session queries.
     * @returns the catalog view for that parent.
     * @throws {RemoteError} `gateway/bad-request` for an empty parent id,
     *   `gateway/cancelled` for an aborted read, `subagent/projections-unavailable` when
     *   the deployment has no projection registry, otherwise `gateway/internal`.
     */
    remoteExportList(parentSessionId: SessionId, signal: AbortSignal): Promise<SubagentCatalog>;
    /**
     * Deliver one browser-authored message to a continuable child through the
     * exact live direct parent, retaining the caller-minted request identity and
     * validated browser zone on the accepted message. Success identifies the
     * message the child's inbox accepted; later execution is independent of this
     * call. Queue delivery targets a later turn; steer delivery targets the
     * nearest step and retains the Agent loop's best-effort fallback semantics.
     * Image parts are admitted and persisted through the attachment store
     * before delivery, and the child's model must accept image input.
     * @param request - durable address, delivery, minted identity, content, and optional browser zone.
     * @param signal - carrier cancellation, owning the call until inbox acceptance.
     * @returns the accepted message's inbox identity.
     * @throws {RemoteError} `gateway/bad-request`, `subagent/attachment-invalid`,
     *   `subagent/invalid-time-zone`, `subagent/parent-unavailable`,
     *   `subagent/not-resumable`, `subagent/unauthorized`,
     *   `subagent/delivery-unavailable`, `gateway/cancelled`, or `gateway/internal`.
     */
    prompt(request: SubagentPromptRequest, signal: AbortSignal): Promise<SubagentPromptReceipt>;
    /**
     * Remote face of {@link interrupt} under one durable parent address. No
     * catalog, history, persistence, or parent Agent lookup runs: the core
     * primitive alone authorizes the address against the live Activation, which
     * is what keeps a live child interruptible while its parent Agent is offline.
     * Absent, idle, and already-completed targets are accepted no-ops there.
     * @param childSessionId - durable child session id to interrupt.
     * @param parentSessionId - durable direct parent whose authority is claimed.
     * @param mode - required continuable-address discriminator.
     * @returns acknowledgement that the cancel signal was admitted, not that the target is quiescent.
     * @throws {RemoteError} `gateway/bad-request` for an empty id,
     *   `subagent/unauthorized` when the address does not own the live target,
     *   otherwise `gateway/internal`.
     */
    interruptByParent(childSessionId: SessionId, parentSessionId: SessionId, mode: 'continuable'): SubagentInterruptReceipt;
    /**
     * Register a provider under its name. Registration is effect-scoped and HMR
     * safe; removing a provider blocks new starts but does not revoke runs that
     * were already returned to their holders.
     * @param provider - the trusted provider implementation.
     * @returns the exact Cordis effect disposer.
     */
    registerProvider(provider: SubagentProvider): () => void;
    /**
     * Look up a provider by name.
     * @param name - the provider name.
     * @returns the provider, or undefined when absent.
     */
    getProvider(name: string): SubagentProvider | undefined;
    /**
     * List registered provider names in insertion order.
     * @returns the registered names.
     */
    list(): string[];
    /**
     * Establish a published child on the named provider. Capability and semantic
     * checks run before delegation. Provider ownership lasts until its promise
     * fulfills; a rejection therefore has no run for the caller to dispose and
     * emits no run lifecycle events. Post-publication turn and infrastructure
     * failures settle through the returned run.
     * A catalog append failure disposes the run and handles its result rejection;
     * the caller receives the catalog error even if disposal also fails.
     * @param name - the provider to use.
     * @param request - child label, prompt, parent, signal, and optional capabilities.
     * @returns the published holder-owned run.
     */
    start(name: string, request: SubagentStartRequest): Promise<SubagentRun>;
    /**
     * Resolve one provider's detached continuable-creation contribution. Method
     * presence on the provider IS the capability, so a provider without it is
     * rejected before the manager reserves any child resources.
     */
    private prepareContinuable;
    /** Look up a provider for dispatch or fail loud. */
    private expectProvider;
    /** Resolve the optional continuable-subagent manager or fail loud. */
    private requireContinuations;
    /**
     * Build the lifecycle observer for one continuable Activation's residency
     * epoch, so the manager publishes its edges without owning event dispatch.
     */
    private observeActivation;
    /** Reject the first requested capability that the provider lacks. */
    private assertCapabilities;
}
export default SubagentRuntime;
//# sourceMappingURL=index.d.ts.map