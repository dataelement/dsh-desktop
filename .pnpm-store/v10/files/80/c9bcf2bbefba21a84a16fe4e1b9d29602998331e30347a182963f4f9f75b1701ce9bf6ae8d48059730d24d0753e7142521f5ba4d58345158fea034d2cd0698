/**
 * Process-local Activation ownership for continuable subagents: admission,
 * parent-child residency, serialized delivery, settlement, and disposal.
 *
 * The continuation manager owns durable request orchestration and delegates
 * every mutable residency decision to this registry, so delivery and teardown
 * share one child lock and one Activation map.
 *
 * @module @deepseek-ai/dsh-subagent/continuation-activation
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent, AgentHandle, AgentOptions, CreateAgentOptions } from '@deepseek-ai/dsh-agent';
import type { MessageId } from '@deepseek-ai/dsh-llm';
import type { SessionEvent, SessionId, SessionLogOffset as SessionLogOffsetType, UserMessage } from '@deepseek-ai/dsh-session';
import type { ToolRestriction } from '@deepseek-ai/dsh-tools';
import type { DelegatedPolicyOverrides } from './child-agent.ts';
import type { SubagentDescriptorData } from './descriptor.ts';
import { SubagentInbox } from './inbox.ts';
import type { SubagentDelivery } from './inbox.ts';
import type { ActivationObserver } from './lifecycle.ts';
/**
 * One residency epoch for a reconstructed continuable child Agent. It directly
 * owns the published `AgentHandle`; the registry's private activation-owner
 * scope is its structural Cordis owner.
 */
export interface Activation {
    /** The durable child this Activation is an epoch of. */
    readonly childId: SessionId;
    /**
     * The durable direct parent, stored because settlement delivery must resolve
     * that parent after the child handle is gone. {@link ancestry} cannot answer
     * it: a `WeakSet` is not enumerable, and the child's own header is only
     * reachable through a handle disposal has already released.
     */
    readonly parentSession: SessionId;
    /** The provider name recorded in the durable descriptor. */
    readonly provider: string;
    /** The retained live Agent handle, disposed exactly once at settlement. */
    readonly handle: AgentHandle;
    /** The Activation-local admission and close wrapper around the handle's Agent inbox. */
    readonly inbox: SubagentInbox;
    /**
     * Exact live Agent ancestry observed when this Activation materialized.
     * Weak membership preserves host-scope identity across an intermediate
     * ancestor leaving the registry without retaining that ancestor's runtime.
     */
    readonly ancestry: WeakSet<Agent>;
    /**
     * Session ids of the child Activations this one owns. Because one Session has
     * at most one live Activation, the id identifies the live child without
     * another runtime-incarnation reference. Non-empty blocks settlement.
     */
    readonly ownedChildren: Set<SessionId>;
    /** The lifecycle observer that emits this epoch's start and terminal edges. */
    readonly observer: ActivationObserver;
    /**
     * Whether any delivery to this child was ever accepted. A materialization
     * rolled back before its first acceptance is a child the caller was told does
     * not exist, so its teardown owes the parent no settlement account.
     */
    announced: boolean;
    /** Renewed whenever a settlement watcher must re-check residency state. */
    poke: PromiseWithResolvers<void>;
}
/** Inputs shared by fresh and resumed Activation materialization. */
export interface MaterializeInputs {
    childId: SessionId;
    provider: string;
    parent: Agent;
    /**
     * Creation inputs; absent for a cold resume, which loads the persisted
     * session — including the delegation policy events a fresh creation seeded,
     * so a resume never re-captures the parent's policy.
     */
    create?: {
        seed: readonly SessionEvent[] | undefined;
        meta: NonNullable<CreateAgentOptions['meta']>;
        /** Exact parent-log prefix length inside {@link seed}. */
        inheritedEventCount: SessionLogOffsetType;
        /** Policy captured at delegation: the parent's sandbox override plus the approval pin. */
        delegatedPolicies: DelegatedPolicyOverrides;
        /** Child-owned composition record appended after the inherited marker. */
        descriptor: SubagentDescriptorData;
    };
    agentOptions: AgentOptions;
    composition: {
        persona?: string | undefined;
        toolFilter?: ToolRestriction | undefined;
    };
    signal: AbortSignal;
}
/** Serialize each durable child's delivery, release, and disposal. */
export declare class ChildLock {
    private tails;
    /**
     * Run `operation` after every previously queued operation for `childId`.
     * @param childId - the durable child whose operations are linearized.
     * @param operation - the critical section to run in order.
     * @returns the operation's own settlement.
     */
    run<T>(childId: SessionId, operation: () => Promise<T>): Promise<T>;
}
/** Own the complete process-local lifetime of continuable child Activations. */
export declare class ContinuableActivationRegistry {
    private readonly ctx;
    private readonly observeActivation;
    /** Child session id → its live Activation. Process-local, never durable. */
    private readonly resident;
    /** Materializations admitted before drain, tracked through publication or rollback. */
    private readonly materializations;
    /** Per-child serializer shared by delivery, release, and disposal. */
    readonly locks: ChildLock;
    /** Structural Cordis owner of every Activation handle. */
    readonly ownerCtx: Context;
    /**
     * Exact roots whose host teardown has begun, with the live lineage members
     * observed under each root. Entries remain until that exact root leaves the
     * Agent registry, closing admission throughout its host's teardown without
     * poisoning a later same-id replacement.
     */
    private readonly closingScopes;
    private draining;
    /**
     * Build one registry inside the service's Agent-injected context.
     * @param ctx - context providing Agents, Sessions, and teardown ownership.
     * @param observeActivation - build the lifecycle observer for one residency epoch.
     */
    constructor(ctx: Context, observeActivation: (provider: string, childId: SessionId, parent: Agent) => ActivationObserver);
    /**
     * Return the live Activation for a durable child id, if resident.
     * @param childId - durable child session id to look up.
     * @returns the process-local Activation, or `undefined` when it is not resident.
     */
    get(childId: SessionId): Activation | undefined;
    /**
     * Reject one child identity already owned by a live Agent or Session.
     * @param childId - proposed durable child session id.
     */
    assertChildIdAvailable(childId: SessionId): void;
    /**
     * Pre-register `childId` in a continuation-managed parent's owned set so the
     * parent cannot settle while a caller is still establishing or resuming that
     * child. Returns a releaser for the failure path; it removes only a hold
     * this call added, and leaves ownership in place once a live Activation for
     * the child exists.
     * @param parent - the live direct parent the operation is admitted under.
     * @param childId - the durable child the operation addresses.
     * @returns the failure-path releaser; a no-op when nothing was added.
     */
    holdOwnership(parent: Agent, childId: SessionId): () => void;
    /**
     * Interrupt one live continuable child's current turn under the supplied authority.
     * @param targetSessionId - the durable child session id to interrupt.
     * @param authority - the human parent address or exact live ancestor Agent.
     */
    interrupt(targetSessionId: SessionId, authority: {
        readonly kind: 'user';
        readonly parentSessionId: SessionId;
    } | {
        readonly kind: 'ancestor';
        readonly agent: Agent;
    }): void;
    /**
     * Send through a receiving parent's Activation inbox when it has one.
     * @param parent - exact live Agent receiving the message.
     * @param message - durable user message to deliver.
     * @param delivery - receiving inbox destination.
     */
    sendWaking(parent: Agent, message: UserMessage, delivery: SubagentDelivery): void;
    /**
     * Close admission, await every already-admitted materialization through
     * publication or rollback, then dispose the stable live Activation graph
     * child-first.
     */
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
     * Reject new admission once the registry or this exact parent tree began draining.
     * @param agent - exact live Agent whose lineage determines admission.
     */
    assertAdmitting(agent: Agent): void;
    /**
     * Authorize one operation against the durable direct-parent lineage.
     * @param parent - exact live Agent claiming direct-parent authority.
     * @param childId - durable child session id addressed by the operation.
     * @param parentSession - durable direct-parent id recorded by the child.
     */
    authorizeLineage(parent: Agent, childId: SessionId, parentSession: SessionId | undefined): void;
    /**
     * Create or resume one child Agent and publish its Activation.
     * @param inputs - reconstruction and admission inputs for the residency epoch.
     * @returns the published process-local Activation.
     */
    materialize(inputs: MaterializeInputs): Promise<Activation>;
    /**
     * Cross the final admission cutoff and submit without yielding.
     * @param activation - the exact resident child receiving the message.
     * @param message - the already-built durable user message.
     * @param delivery - the Agent inbox destination.
     * @param parent - exact live direct parent authorizing admission.
     * @param signal - caller cancellation before inbox acceptance.
     * @returns the accepted durable message id.
     */
    submitAdmitted(activation: Activation, message: UserMessage, delivery: SubagentDelivery, parent: Agent, signal: AbortSignal): MessageId;
    /**
     * Stop and release one Activation through its memoized close transaction.
     * @param activation - exact residency epoch to close.
     * @param finalStateFlushed - whether natural settlement already flushed final state.
     * @returns the shared close transaction.
     */
    dispose(activation: Activation, finalStateFlushed?: boolean): Promise<void>;
    /** Dispose independent roots and report every branch failure after all settle. */
    private disposeRoots;
    /** Return the retained member set for one exact scoped-teardown root. */
    private closingMembers;
    /** Return the exact currently resolvable ancestry from `agent` upward. */
    private liveLineage;
    /** Return the teardown that closed continuable admission for this agent's lineage. */
    private closingTeardownFor;
    /** Perform one tracked materialization through publication or rollback. */
    private materializeTracked;
    /** Release an Activation whose start edge was not published. */
    private rollbackUnpublished;
    /** Register the child in a continuation-managed parent's owned set. */
    private acquireOwnership;
    /** Remove one child from its live owner's set and let that owner re-check settlement. */
    private releaseOwnership;
    /** Let a settlement watcher re-check residency after relevant state changes. */
    private wake;
    /** Follow one Activation to natural settlement. */
    private watchSettlement;
    /** Classify one Inbox and owned-child observation without reading Agent execution state. */
    private settlementState;
    /** Propagate stop synchronously, then finish the child-first release. */
    private finishDisposal;
    /** Tell the durable direct parent how this Activation ended. */
    private notifySettlement;
    /** Request a best-effort final session flush before closing natural-settlement admission. */
    private flushFinalState;
}
//# sourceMappingURL=continuation-activation.d.ts.map