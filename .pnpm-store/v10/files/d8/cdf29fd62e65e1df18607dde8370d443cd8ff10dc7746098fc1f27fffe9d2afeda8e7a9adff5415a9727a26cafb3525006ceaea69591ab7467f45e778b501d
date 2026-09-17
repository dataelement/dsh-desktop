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
import { errorChain } from '@deepseek-ai/dsh-llm';
import { appendDelegatedPolicyOverrides, applyChildComposition, } from "./child-agent.js";
import { createSettlementMessage } from "./continuation-messages.js";
import { SubagentError } from "./error.js";
import { SubagentInbox } from "./inbox.js";
/** Serialize each durable child's delivery, release, and disposal. */
export class ChildLock {
    tails = new Map();
    /**
     * Run `operation` after every previously queued operation for `childId`.
     * @param childId - the durable child whose operations are linearized.
     * @param operation - the critical section to run in order.
     * @returns the operation's own settlement.
     */
    run(childId, operation) {
        const previous = this.tails.get(childId) ?? Promise.resolve();
        const result = previous.then(operation, operation);
        // Absorb rejections in the chaining tail so one failed critical section
        // cannot reject an unrelated later caller.
        const tail = result.then(() => undefined, () => undefined);
        this.tails.set(childId, tail);
        void tail.then(() => {
            if (this.tails.get(childId) === tail)
                this.tails.delete(childId);
        });
        return result;
    }
}
/** Own the complete process-local lifetime of continuable child Activations. */
export class ContinuableActivationRegistry {
    ctx;
    observeActivation;
    /** Child session id → its live Activation. Process-local, never durable. */
    resident = new Map();
    /** Materializations admitted before drain, tracked through publication or rollback. */
    materializations = new Set();
    /** Per-child serializer shared by delivery, release, and disposal. */
    locks = new ChildLock();
    /** Structural Cordis owner of every Activation handle. */
    ownerCtx;
    /**
     * Exact roots whose host teardown has begun, with the live lineage members
     * observed under each root. Entries remain until that exact root leaves the
     * Agent registry, closing admission throughout its host's teardown without
     * poisoning a later same-id replacement.
     */
    closingScopes = new Map();
    draining = false;
    /**
     * Build one registry inside the service's Agent-injected context.
     * @param ctx - context providing Agents, Sessions, and teardown ownership.
     * @param observeActivation - build the lifecycle observer for one residency epoch.
     */
    constructor(ctx, observeActivation) {
        this.ctx = ctx;
        this.observeActivation = observeActivation;
        // Ordinary Cordis owner effects unwind in reverse registration order, which
        // cannot express the dynamic child graph. Register the private scope's
        // structural disposer FIRST and the drain SECOND, so reverse unwind invokes
        // the drain before releasing the scope; a cleanup effect on the same scope
        // as the Agent handles would let structural handle disposal bypass
        // child-first ordering.
        const scope = ctx.plugin(function activationOwner() { });
        this.ownerCtx = scope.ctx;
        ctx.on('agent/disposed', ({ agent }) => {
            this.closingScopes.delete(agent);
        });
        ctx.effect(function* () {
            yield scope.dispose;
            yield () => this.drain();
        }.bind(this), 'subagents.continuations()');
    }
    /**
     * Return the live Activation for a durable child id, if resident.
     * @param childId - durable child session id to look up.
     * @returns the process-local Activation, or `undefined` when it is not resident.
     */
    get(childId) {
        return this.resident.get(childId);
    }
    /**
     * Reject one child identity already owned by a live Agent or Session.
     * @param childId - proposed durable child session id.
     */
    assertChildIdAvailable(childId) {
        if (this.ctx.agents.get(childId) !== undefined || this.ctx.get('sessions')?.get(childId) !== undefined) {
            throw new SubagentError(`subagent "${childId}" already exists`, 'DUPLICATE_CHILD');
        }
    }
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
    holdOwnership(parent, childId) {
        const parentActivation = this.resident.get(parent.id);
        if (parentActivation === undefined || parentActivation.handle.agent !== parent)
            return () => { };
        if (parentActivation.inbox.closing !== undefined) {
            throw new SubagentError(`subagent parent "${parent.id}" is being disposed; the child was not established`, 'ACTIVATION_CLOSING');
        }
        if (parentActivation.ownedChildren.has(childId))
            return () => { };
        parentActivation.ownedChildren.add(childId);
        return () => {
            const live = this.resident.get(childId);
            /* v8 ignore next 4 -- reaching this arm needs another delivery to establish the child
             * between this operation's failure and its releaser running, which no test can schedule
             * deterministically: the ownership edge then belongs to that live Activation, so the
             * conservative keep leaves it for finishDisposal's releaseOwnership. */
            if (live !== undefined && live.inbox.closing === undefined)
                return;
            if (parentActivation.ownedChildren.delete(childId))
                this.wake(parentActivation);
        };
    }
    /**
     * Interrupt one live continuable child's current turn under the supplied authority.
     * @param targetSessionId - the durable child session id to interrupt.
     * @param authority - the human parent address or exact live ancestor Agent.
     */
    interrupt(targetSessionId, authority) {
        if (authority.kind === 'ancestor') {
            const caller = authority.agent;
            if (this.ctx.agents.get(caller.id) !== caller) {
                throw new SubagentError(`interrupting "${targetSessionId}" requires the exact live ancestor agent`, 'UNAUTHORIZED');
            }
            if (caller.id === targetSessionId) {
                throw new SubagentError(`agent "${caller.id}" cannot interrupt itself`, 'UNAUTHORIZED');
            }
        }
        const activation = this.resident.get(targetSessionId);
        if (activation === undefined)
            return;
        if (authority.kind === 'user') {
            if (activation.handle.agent.session.header.parentSession !== authority.parentSessionId) {
                throw new SubagentError(`subagent "${targetSessionId}" belongs to another parent session`, 'UNAUTHORIZED');
            }
        }
        else if (!activation.ancestry.has(authority.agent)) {
            throw new SubagentError(`subagent "${targetSessionId}" is not a live descendant of agent "${authority.agent.id}"`, 'UNAUTHORIZED');
        }
        // Disposal already stopped the target with a whole-Activation teardown;
        // a second cancel would be a redundant signal on a closing handle.
        if (activation.inbox.closing !== undefined)
            return;
        activation.handle.agent.cancel(authority.kind === 'user' ? { kind: 'user' } : { kind: 'parent' }, { keepInbox: true });
    }
    /**
     * Send through a receiving parent's Activation inbox when it has one.
     * @param parent - exact live Agent receiving the message.
     * @param message - durable user message to deliver.
     * @param delivery - receiving inbox destination.
     */
    sendWaking(parent, message, delivery) {
        const parentActivation = this.resident.get(parent.id);
        if (parentActivation !== undefined && parentActivation.handle.agent === parent) {
            try {
                parentActivation.inbox.deliver(message, delivery);
            }
            finally {
                this.wake(parentActivation);
            }
            return;
        }
        if (delivery === 'steer')
            parent.steer(message);
        else
            parent.followup(message);
    }
    /**
     * Close admission, await every already-admitted materialization through
     * publication or rollback, then dispose the stable live Activation graph
     * child-first.
     */
    async drain() {
        this.draining = true;
        await Promise.all([...this.materializations].map(materialization => materialization.settled));
        const owned = new Set();
        for (const activation of this.resident.values()) {
            for (const child of activation.ownedChildren)
                owned.add(child);
        }
        const roots = [...this.resident.values()].filter(activation => !owned.has(activation.childId));
        await this.disposeRoots(roots, 'activation(s)');
    }
    /**
     * Stop only the continuable descendants of exact live host-owned parents.
     * @param parents - exact live roots whose continuable descendants must stop.
     */
    async drainDescendants(parents) {
        const roots = new Set(parents.filter(parent => this.ctx.agents.get(parent.id) === parent));
        if (roots.size === 0)
            return;
        for (const root of roots) {
            this.closingMembers(root).add(root);
        }
        const targets = [];
        for (const activation of this.resident.values()) {
            const lineage = this.liveLineage(activation.handle.agent);
            const owners = [...roots].filter(root => activation.handle.agent !== root
                && activation.ancestry.has(root));
            if (owners.length === 0)
                continue;
            targets.push(activation);
            for (const owner of owners) {
                const members = this.closingMembers(owner);
                members.add(activation.handle.agent);
                for (const agent of lineage)
                    members.add(agent);
            }
        }
        const materializations = [...this.materializations].filter((materialization) => {
            const owners = [...roots].filter(root => materialization.lineage.includes(root));
            for (const owner of owners) {
                const members = this.closingMembers(owner);
                for (const agent of materialization.lineage)
                    members.add(agent);
            }
            return owners.length > 0;
        });
        const ownedTargets = new Set();
        for (const activation of targets) {
            for (const child of activation.ownedChildren)
                ownedTargets.add(child);
        }
        const targetRoots = targets.filter(activation => !ownedTargets.has(activation.childId));
        for (const activation of targets) {
            const disposal = this.dispose(activation);
            void disposal.catch(() => undefined);
        }
        await Promise.all(materializations.map(materialization => materialization.settled));
        await this.disposeRoots(targetRoots, 'scoped activation(s)');
    }
    /**
     * Release selected resident direct children of one exact live parent.
     * @param parent - exact live direct parent authorizing the selected release.
     * @param childIds - durable direct-child ids to release when resident.
     */
    async drainChildren(parent, childIds) {
        if (this.ctx.agents.get(parent.id) !== parent) {
            throw new SubagentError('selected child teardown requires the exact live parent agent', 'UNAUTHORIZED');
        }
        const targets = [];
        for (const childId of new Set(childIds)) {
            const activation = this.resident.get(childId);
            if (activation === undefined)
                continue;
            if (activation.parentSession !== parent.id || !activation.ancestry.has(parent)) {
                throw new SubagentError(`subagent "${childId}" is not a direct child of agent "${parent.id}"`, 'UNAUTHORIZED');
            }
            targets.push(activation);
        }
        for (const activation of targets) {
            const disposal = this.dispose(activation);
            void disposal.catch(() => undefined);
        }
        await this.disposeRoots(targets, 'selected activation(s)');
    }
    /**
     * Reject new admission once the registry or this exact parent tree began draining.
     * @param agent - exact live Agent whose lineage determines admission.
     */
    assertAdmitting(agent) {
        const closing = this.closingTeardownFor(agent);
        if (closing === undefined)
            return;
        throw new SubagentError(closing === 'manager'
            ? 'continuable subagents are draining; the operation was not admitted'
            : `continuable subagents below parent "${closing.id}" are draining; the operation was not admitted`, 'DRAINING');
    }
    /**
     * Authorize one operation against the durable direct-parent lineage.
     * @param parent - exact live Agent claiming direct-parent authority.
     * @param childId - durable child session id addressed by the operation.
     * @param parentSession - durable direct-parent id recorded by the child.
     */
    authorizeLineage(parent, childId, parentSession) {
        if (this.ctx.agents.get(parent.id) !== parent) {
            throw new SubagentError(`subagent "${childId}" delivery requires the exact live parent agent`, 'UNAUTHORIZED');
        }
        if (parentSession !== parent.id) {
            throw new SubagentError(`subagent "${childId}" belongs to another parent session`, 'UNAUTHORIZED');
        }
    }
    /**
     * Create or resume one child Agent and publish its Activation.
     * @param inputs - reconstruction and admission inputs for the residency epoch.
     * @returns the published process-local Activation.
     */
    materialize(inputs) {
        this.assertAdmitting(inputs.parent);
        const settled = Promise.withResolvers();
        const lineage = this.liveLineage(inputs.parent);
        const materialization = {
            lineage,
            settled: settled.promise,
        };
        this.materializations.add(materialization);
        return this.materializeTracked(inputs, lineage).finally(() => {
            this.materializations.delete(materialization);
            settled.resolve();
        });
    }
    /**
     * Cross the final admission cutoff and submit without yielding.
     * @param activation - the exact resident child receiving the message.
     * @param message - the already-built durable user message.
     * @param delivery - the Agent inbox destination.
     * @param parent - exact live direct parent authorizing admission.
     * @param signal - caller cancellation before inbox acceptance.
     * @returns the accepted durable message id.
     */
    submitAdmitted(activation, message, delivery, parent, signal) {
        signal.throwIfAborted();
        this.assertAdmitting(parent);
        this.authorizeLineage(parent, activation.childId, activation.handle.agent.session.header.parentSession);
        this.acquireOwnership(parent, activation.childId);
        try {
            activation.inbox.deliver(message, delivery);
        }
        finally {
            this.wake(activation);
        }
        return message.id;
    }
    /**
     * Stop and release one Activation through its memoized close transaction.
     * @param activation - exact residency epoch to close.
     * @param finalStateFlushed - whether natural settlement already flushed final state.
     * @returns the shared close transaction.
     */
    dispose(activation, finalStateFlushed = false) {
        return activation.inbox.close(() => this.finishDisposal(activation, finalStateFlushed));
    }
    /** Dispose independent roots and report every branch failure after all settle. */
    async disposeRoots(roots, failureSubject) {
        const failures = await Promise.all(roots.map(async (activation) => {
            try {
                await this.dispose(activation);
                return undefined;
            }
            catch (error) {
                return error;
            }
        }));
        const reasons = failures.filter(failure => failure !== undefined);
        if (reasons.length > 0) {
            throw new SubagentError(`continuable subagent teardown failed for ${reasons.length} ${failureSubject}: `
                + reasons.map(reason => errorChain(reason)).join('; '), 'ACTIVATION_TEARDOWN_FAILED');
        }
    }
    /** Return the retained member set for one exact scoped-teardown root. */
    closingMembers(root) {
        const existing = this.closingScopes.get(root);
        if (existing !== undefined)
            return existing;
        const members = new Set();
        this.closingScopes.set(root, members);
        return members;
    }
    /** Return the exact currently resolvable ancestry from `agent` upward. */
    liveLineage(agent) {
        const lineage = [agent];
        const seen = new Set([agent.id]);
        let parentSession = agent.session.header.parentSession;
        while (parentSession !== undefined) {
            const parent = this.ctx.agents.get(parentSession);
            if (parent === undefined || seen.has(parent.id))
                break;
            lineage.push(parent);
            seen.add(parent.id);
            parentSession = parent.session.header.parentSession;
        }
        return lineage;
    }
    /** Return the teardown that closed continuable admission for this agent's lineage. */
    closingTeardownFor(agent) {
        if (this.draining)
            return 'manager';
        const lineage = this.liveLineage(agent);
        for (const [root, members] of this.closingScopes) {
            if (members.has(agent) || lineage.includes(root))
                return root;
        }
        return undefined;
    }
    /** Perform one tracked materialization through publication or rollback. */
    async materializeTracked(inputs, parentLineage) {
        const { childId, provider, parent, create } = inputs;
        inputs.signal.throwIfAborted();
        const setup = (childCtx, child) => {
            // Only fresh creation appends the descriptor and delegated policy after
            // the inherited marker; a cold resume replays those persisted events.
            if (create !== undefined) {
                child.session.append('subagent/descriptor', create.descriptor);
                appendDelegatedPolicyOverrides(child.session, create.delegatedPolicies);
            }
            applyChildComposition(childCtx, parent, inputs.composition);
        };
        const observer = this.observeActivation(provider, childId, parent);
        const handle = create === undefined
            ? await this.ownerCtx.agents.resume({
                resumeSessionId: childId,
                parentAgent: parent,
                agentOptions: inputs.agentOptions,
                signal: inputs.signal,
                setup,
            })
            : await this.ownerCtx.agents.create({
                sessionId: childId,
                parentAgent: parent,
                meta: create.meta,
                ...(create.seed === undefined ? {} : { seed: create.seed }),
                inheritedEventCount: create.inheritedEventCount,
                agentOptions: inputs.agentOptions,
                signal: inputs.signal,
                setup,
            });
        const activation = {
            childId,
            parentSession: parent.id,
            provider,
            handle,
            inbox: new SubagentInbox(handle.agent),
            ancestry: new WeakSet([handle.agent, ...parentLineage]),
            ownedChildren: new Set(),
            observer,
            announced: false,
            poke: Promise.withResolvers(),
        };
        this.resident.set(childId, activation);
        try {
            inputs.signal.throwIfAborted();
            this.assertAdmitting(parent);
            this.acquireOwnership(parent, childId);
            const wakeOnInboxRemoval = () => { this.wake(activation); };
            handle.agent.ctx.on('agent/inbox/claimed', wakeOnInboxRemoval);
            handle.agent.ctx.on('agent/inbox/discarded', wakeOnInboxRemoval);
            observer.start(handle.agent);
        }
        catch (error) {
            /* v8 ignore next -- rollback failure must not mask the admission failure
             * that prevented this operation from returning an accepted message id. */
            await this.rollbackUnpublished(activation).catch(() => undefined);
            throw error;
        }
        this.watchSettlement(activation);
        return activation;
    }
    /** Release an Activation whose start edge was not published. */
    rollbackUnpublished(activation) {
        return activation.inbox.close(async () => {
            try {
                await activation.handle.dispose();
            }
            finally {
                this.resident.delete(activation.childId);
                this.releaseOwnership(activation.childId);
            }
        });
    }
    /** Register the child in a continuation-managed parent's owned set. */
    acquireOwnership(parent, childId) {
        const parentActivation = this.resident.get(parent.id);
        if (parentActivation === undefined)
            return;
        if (parentActivation.inbox.closing !== undefined) {
            throw new SubagentError(`subagent parent "${parent.id}" is being disposed; the child was not established`, 'ACTIVATION_CLOSING');
        }
        parentActivation.ownedChildren.add(childId);
    }
    /** Remove one child from its live owner's set and let that owner re-check settlement. */
    releaseOwnership(childId) {
        for (const candidate of this.resident.values()) {
            if (candidate.ownedChildren.delete(childId))
                this.wake(candidate);
        }
    }
    /** Let a settlement watcher re-check residency after relevant state changes. */
    wake(activation) {
        activation.poke.resolve();
        activation.poke = Promise.withResolvers();
    }
    /** Follow one Activation to natural settlement. */
    watchSettlement(activation) {
        void (async () => {
            while (true) {
                const idleObservation = activation.poke;
                await activation.handle.agent.whenIdle();
                if (activation.inbox.closing !== undefined)
                    return;
                const readiness = await this.locks.run(activation.childId, () => Promise.resolve(this.settlementState(activation, idleObservation)));
                if (readiness === 'closed')
                    return;
                if (readiness === 'retry')
                    continue;
                if (readiness === 'wait') {
                    await idleObservation.promise;
                    continue;
                }
                const finalSeq = activation.handle.agent.session.seq;
                await this.flushFinalState(activation);
                const attempt = await this.locks.run(activation.childId, () => {
                    const state = this.settlementState(activation, idleObservation);
                    if (state !== 'ready')
                        return Promise.resolve(state);
                    if (activation.handle.agent.session.seq !== finalSeq) {
                        return Promise.resolve('retry');
                    }
                    // The task starts synchronously, so idle ownership and Inbox closure share one turn.
                    let done;
                    try {
                        void activation.handle.agent.runMaintenance(() => {
                            done = this.dispose(activation, true);
                            return Promise.resolve();
                        });
                    }
                    catch {
                        // Another activity won the idle phase after the preceding observation.
                        return Promise.resolve('retry');
                    }
                    return Promise.resolve({ done });
                });
                if (attempt === 'closed')
                    return;
                if (attempt === 'retry')
                    continue;
                if (attempt === 'wait') {
                    await idleObservation.promise;
                    continue;
                }
                try {
                    await attempt.done;
                }
                catch (error) {
                    this.ctx.logger.warn(`subagent "${activation.childId}" activation teardown failed: ${errorChain(error)}`);
                }
                return;
            }
        })();
    }
    /** Classify one Inbox and owned-child observation without reading Agent execution state. */
    settlementState(activation, observation) {
        if (activation.inbox.closing !== undefined)
            return 'closed';
        if (activation.poke !== observation)
            return 'retry';
        if (activation.inbox.hasPending || activation.ownedChildren.size > 0)
            return 'wait';
        return 'ready';
    }
    /** Propagate stop synchronously, then finish the child-first release. */
    async finishDisposal(activation, finalStateFlushed) {
        this.wake(activation);
        const { childId } = activation;
        const failures = [];
        if (finalStateFlushed) {
            try {
                activation.observer.capture(activation.handle.agent);
            }
            catch (error) {
                failures.push(new SubagentError(`subagent "${childId}" activation teardown failed: ${errorChain(error)}`, 'ACTIVATION_TEARDOWN_FAILED', { cause: error }));
            }
        }
        else {
            activation.handle.agent.cancel({ kind: 'parent' });
            const idle = activation.handle.agent.whenIdle();
            const children = [...activation.ownedChildren]
                .map(child => this.resident.get(child))
                .filter((child) => child !== undefined);
            const childDisposals = children.map(child => this.dispose(child));
            try {
                const childFailures = await Promise.all(childDisposals.map(async (disposal) => {
                    try {
                        await disposal;
                        return undefined;
                    }
                    catch (error) {
                        return error;
                    }
                }));
                const reasons = childFailures.filter(reason => reason !== undefined);
                if (reasons.length > 0) {
                    failures.push(new SubagentError(`subagent "${childId}" child teardown failed: ${reasons.map(reason => errorChain(reason)).join('; ')}`, 'ACTIVATION_TEARDOWN_FAILED'));
                }
                await idle;
                await this.flushFinalState(activation);
                activation.observer.capture(activation.handle.agent);
            }
            catch (error) {
                failures.push(new SubagentError(`subagent "${childId}" activation teardown failed: ${errorChain(error)}`, 'ACTIVATION_TEARDOWN_FAILED', { cause: error }));
            }
        }
        try {
            await activation.handle.dispose();
        }
        catch (error) {
            failures.push(new SubagentError(`subagent "${childId}" activation handle disposal failed: ${errorChain(error)}`, 'ACTIVATION_TEARDOWN_FAILED', { cause: error }));
        }
        let failure;
        if (failures.length === 1) {
            failure = failures[0];
        }
        else if (failures.length > 1) {
            failure = new SubagentError(`subagent "${childId}" activation teardown failed at ${failures.length} boundaries: `
                + failures.map(item => errorChain(item)).join('; '), 'ACTIVATION_TEARDOWN_FAILED', { cause: new AggregateError(failures) });
        }
        this.resident.delete(childId);
        this.notifySettlement(activation, activation.observer.terminal(failure));
        this.releaseOwnership(childId);
        activation.observer.settle(failure);
        if (failure !== undefined)
            throw failure;
    }
    /** Tell the durable direct parent how this Activation ended. */
    notifySettlement(activation, terminal) {
        if (!activation.announced)
            return;
        try {
            const parent = this.ctx.agents.get(activation.parentSession);
            if (parent === undefined)
                return;
            const message = createSettlementMessage(activation.childId, terminal);
            if (this.closingTeardownFor(parent) !== undefined) {
                parent.inject(message);
                return;
            }
            this.sendWaking(parent, message, parent.status === 'idle' ? 'queue' : 'steer');
        }
        catch (error) {
            this.ctx.logger.warn(`subagent "${activation.childId}" settlement notice was not delivered to its parent: `
                + errorChain(error));
        }
    }
    /** Request a best-effort final session flush before closing natural-settlement admission. */
    async flushFinalState(activation) {
        const child = activation.handle.agent;
        try {
            await child.ctx.sessions.flush(child.session);
        }
        catch (error) {
            this.ctx.logger.warn(`subagent "${activation.childId}" best-effort final session flush failed; `
                + `the persisted state may be unavailable or stale on resume: ${errorChain(error)}`);
        }
    }
}
//# sourceMappingURL=continuation-activation.js.map