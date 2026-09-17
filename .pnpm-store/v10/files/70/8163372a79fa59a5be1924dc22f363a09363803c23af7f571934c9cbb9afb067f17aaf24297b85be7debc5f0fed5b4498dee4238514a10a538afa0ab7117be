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
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { randomUUID } from 'node:crypto';
import { brandString } from '@deepseek-ai/dsh-brand';
import { ReasoningEffortId, contentHasImage, createUserMessage } from '@deepseek-ai/dsh-llm';
import { SessionLogOffset } from '@deepseek-ai/dsh-session';
import { childSessionMeta, captureDelegatedPolicyOverrides, resolveChildAgentOptions, resolveChildDepth, } from "./child-agent.js";
import { ContinuableActivationRegistry, } from "./continuation-activation.js";
import { createAgentMessage, withContinuableReturnGuidance, } from "./continuation-messages.js";
import { assertSubagentMaxDepth } from "./depth.js";
import { foldSubagentDescriptor, snapshotSubagentDescriptor } from "./descriptor.js";
import { establishCatalogChild } from "./catalog.js";
import { SubagentError } from "./error.js";
import { isAdjacentAgentSendMessageTool } from "./internal.js";
/**
 * The continuable-subagent orchestration service behind `ctx.subagents`. Tool
 * schema and host adapters are consumers of this one contract; foreground
 * one-shot delegation keeps calling `ctx.subagents.start()` and never enters
 * this lifecycle.
 */
export class SubagentContinuationManager {
    ctx;
    host;
    activations;
    constructor(ctx, host) {
        this.ctx = ctx;
        this.host = host;
        this.activations = new ContinuableActivationRegistry(ctx, (provider, childId, parent) => host.observeActivation(provider, childId, parent));
    }
    /**
     * Start one continuable background child and resolve at initial inbox acceptance.
     * Every earlier failure disposes any created handle and rolls back Activation
     * and parent ownership without returning either id.
     * @param spec - provider, delegation request, and caller cancellation.
     * @returns the durable child id and accepted initial prompt message id.
     */
    async startContinuable(spec) {
        const request = spec.request;
        const parent = request.parent;
        this.activations.assertAdmitting(parent);
        const persistence = this.requirePersistence();
        assertSubagentMaxDepth(request.maxDepth);
        const childId = spec.childId ?? brandString(randomUUID());
        this.activations.assertChildIdAvailable(childId);
        const childDepth = resolveChildDepth(parent, request.maxDepth);
        // Snapshot before any await: invalid descriptor JSON rejects the call
        // before a child exists, and the detached value is what reaches the log.
        const agentOptions = resolveChildAgentOptions(parent, request.agentOptions, childDepth);
        const agentProvider = agentOptions.provider;
        const agentModel = agentOptions.model;
        const agentReasoningEffort = agentOptions.reasoningEffort;
        const descriptor = snapshotSubagentDescriptor({
            mode: 'continuable',
            provider: spec.provider,
            label: spec.label,
            ...agentProvider !== undefined ? { agentProvider } : {},
            ...agentModel !== undefined ? { agentModel } : {},
            ...agentReasoningEffort !== undefined ? { agentReasoningEffort } : {},
            ...request.persona !== undefined ? { persona: request.persona } : {},
            ...request.toolFilter !== undefined ? { toolFilter: request.toolFilter } : {},
        });
        // Capture before the first await: a later parent switch belongs to the
        // parent's future, not to this child.
        const delegatedPolicies = captureDelegatedPolicyOverrides(parent);
        // An idle continuation-managed parent must not settle while a caller is
        // still creating its child. A turn-scoped delegation does not need this,
        // but the service is also callable outside a turn.
        const releaseHold = this.activations.holdOwnership(parent, childId);
        try {
            const prepared = await this.host.prepareContinuable(spec.provider, {
                sessionId: childId,
                parent,
                signal: spec.signal,
            });
            spec.signal.throwIfAborted();
            this.activations.assertAdmitting(parent);
            const inheritedEventCount = SessionLogOffset(prepared.seed?.length ?? 0);
            const seed = prepared.seed;
            const messageId = await this.activations.locks.run(childId, async () => {
                spec.signal.throwIfAborted();
                this.activations.assertAdmitting(parent);
                this.activations.assertChildIdAvailable(childId);
                if (spec.childId !== undefined) {
                    const persisted = await persistence.stat(childId, { signal: spec.signal });
                    spec.signal.throwIfAborted();
                    this.activations.assertAdmitting(parent);
                    this.activations.assertChildIdAvailable(childId);
                    if (persisted !== undefined) {
                        throw new SubagentError(`subagent "${childId}" already exists`, 'DUPLICATE_CHILD');
                    }
                }
                const activation = await this.activations.materialize({
                    childId,
                    provider: spec.provider,
                    parent,
                    create: {
                        seed,
                        meta: childSessionMeta(parent, childDepth, prepared.seed !== undefined),
                        inheritedEventCount,
                        delegatedPolicies,
                        descriptor,
                    },
                    agentOptions,
                    composition: { persona: request.persona, toolFilter: request.toolFilter },
                    signal: spec.signal,
                });
                const childHeader = activation.handle.agent.session.header;
                return await this.submitMaterialized(activation, isAdjacentAgentSendMessageTool(this.ctx.get('tools')?.get('send_message', activation.handle.agent))
                    ? withContinuableReturnGuidance(parent.id, request.prompt)
                    : request.prompt, { source: { kind: 'user' }, signal: spec.signal, delivery: 'queue' }, parent, () => { establishCatalogChild(parent.session, childHeader, descriptor); });
            });
            return { childId, messageId };
        }
        catch (error) {
            releaseHold();
            throw error;
        }
    }
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
    async sendMessage(sender, targetId, content, options) {
        if (this.ctx.agents.get(sender.id) !== sender) {
            throw new SubagentError('message delivery requires the exact live sender agent', 'UNAUTHORIZED');
        }
        this.activations.assertAdmitting(sender);
        const senderActivation = this.activations.get(sender.id);
        if (senderActivation !== undefined
            && senderActivation.handle.agent === sender
            && senderActivation.parentSession === targetId) {
            options.signal.throwIfAborted();
            return this.sendToParent(senderActivation, sender, content);
        }
        if (sender.session.header.parentSession === targetId) {
            throw new SubagentError(`agent "${sender.id}" is not a resident continuable child and cannot send to parent "${targetId}"`, 'UNAUTHORIZED');
        }
        return this.deliverToChild(sender, targetId, content, {
            signal: options.signal,
            delivery: 'steer',
        });
    }
    /**
     * Queue one human-authored prompt as a distinct direct-child turn.
     * @param parent - exact live direct parent authorizing delivery.
     * @param childId - durable direct-child session id.
     * @param content - model-visible prompt blocks.
     * @param source - durable attribution for the human prompt.
     * @param signal - caller cancellation before inbox acceptance.
     * @returns the accepted durable message id.
     */
    async queuePrompt(parent, childId, content, source, signal) {
        return this.deliverToChild(parent, childId, content, { source, signal, delivery: 'queue' });
    }
    /**
     * Steer one host-authored prompt to a direct continuable child.
     * @param parent - exact live direct parent authorizing delivery.
     * @param childId - durable direct-child session id.
     * @param content - model-visible prompt blocks.
     * @param source - durable attribution for the host prompt.
     * @param signal - caller cancellation before inbox acceptance.
     * @returns the accepted durable message id.
     */
    async steerPrompt(parent, childId, content, source, signal) {
        return this.deliverToChild(parent, childId, content, { source, signal, delivery: 'steer' });
    }
    /** Route one parent-originated delivery through residency and cold resume. */
    async deliverToChild(parent, childId, content, options) {
        this.activations.assertAdmitting(parent);
        const releaseHold = this.activations.holdOwnership(parent, childId);
        try {
            return await this.deliverFollowup(parent, childId, content, options);
        }
        catch (error) {
            releaseHold();
            throw error;
        }
    }
    /** The delivery loop behind {@link deliverToChild}, run under the parent hold. */
    async deliverFollowup(parent, childId, content, options) {
        while (true) {
            const live = await this.activations.locks.run(childId, async () => {
                const activation = this.activations.get(childId);
                if (activation === undefined)
                    return this.coldResume(parent, childId, content, options);
                const disposal = activation.inbox.closing;
                /* v8 ignore next 3 -- the send-versus-dispose cutoff needs a delivery to
                 * observe the transaction inside the same critical section that opened it. */
                if (disposal !== undefined) {
                    return disposal.then(() => undefined, () => undefined);
                }
                if (contentHasImage(content)) {
                    await this.assertImageCapable(activation.handle.agent, options.signal);
                    if (activation.inbox.closing !== undefined) {
                        await Promise.allSettled([activation.inbox.closing]);
                        return undefined;
                    }
                }
                const messageId = this.submitAdmitted(activation, content, options, parent);
                activation.announced = true;
                return messageId;
            });
            /* v8 ignore start -- only a delivery that lost the disposal cutoff retries. */
            if (live !== undefined)
                return live;
            this.activations.assertAdmitting(parent);
            options.signal.throwIfAborted();
            /* v8 ignore stop */
        }
    }
    /**
     * Interrupt one live continuable child's current turn. Admission is
     * synchronous and the cancellation effect is asynchronous. An absent or
     * already-closing target is an accepted no-op after authority checks.
     * @param targetSessionId - the durable child session id to interrupt.
     * @param authority - the human parent address or exact live ancestor Agent.
     */
    interrupt(targetSessionId, authority) {
        this.activations.interrupt(targetSessionId, authority);
    }
    /** Deliver one resident continuable child's message to its live direct parent. */
    sendToParent(activation, sender, content) {
        /* v8 ignore next 6 -- only synchronous re-entrant teardown can open this
         * transaction between exact-agent authorization and this no-await span. */
        if (activation.inbox.closing !== undefined) {
            throw new SubagentError(`subagent "${sender.id}" activation is being disposed; the message was not delivered`, 'ACTIVATION_CLOSING');
        }
        const parent = this.ctx.agents.get(activation.parentSession);
        if (parent === undefined) {
            throw new SubagentError('direct parent is not live; the message was not delivered', 'PARENT_UNAVAILABLE');
        }
        const message = createAgentMessage(sender, content);
        this.sendAgentMessage(parent, message);
        return message.id;
    }
    /** Send one Agent message while translating only the target's own rejection. */
    sendAgentMessage(parent, message) {
        try {
            this.activations.sendWaking(parent, message, 'steer');
        }
        catch (error) {
            throw new SubagentError('direct parent is not live; the message was not delivered', 'PARENT_UNAVAILABLE', { cause: error });
        }
    }
    /** Close manager-wide admission and release every live Activation. */
    async drain() {
        await this.activations.drain();
    }
    /**
     * Stop only the continuable descendants of exact live host-owned parents.
     * @param parents - exact live roots whose continuable descendants must stop.
     */
    async drainDescendants(parents) {
        await this.activations.drainDescendants(parents);
    }
    /**
     * Release selected resident direct children of one exact live parent.
     * @param parent - exact live direct parent authorizing the selected release.
     * @param childIds - durable direct-child ids to release when resident.
     */
    async drainChildren(parent, childIds) {
        await this.activations.drainChildren(parent, childIds);
    }
    /**
     * Cold-resume a persisted child and submit the waiting turn. The descriptor
     * supplies every reconstruction input; no subagent provider is dispatched.
     */
    async coldResume(parent, childId, content, options) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const query = this.requireSessionQuery();
            let observation;
            try {
                observation = await query.observeSession(childId, {
                    signal: options.signal,
                });
            }
            catch (error) {
                options.signal.throwIfAborted();
                throw new SubagentError(`subagent "${childId}" is unavailable`, 'NOT_RESUMABLE', { cause: error });
            }
            const source = __addDisposableResource(env_1, observation, false);
            this.activations.assertAdmitting(parent);
            this.activations.authorizeLineage(parent, childId, source.header.parentSession);
            const descriptor = foldSubagentDescriptor(source.events.slice(source.inheritedEventCount));
            if (descriptor === undefined || descriptor.mode !== 'continuable') {
                throw new SubagentError(`subagent "${childId}" has no supported continuation state and cannot be resumed; choose a different target`, 'NOT_RESUMABLE');
            }
            let activation;
            try {
                activation = await this.activations.materialize({
                    childId,
                    provider: descriptor.provider,
                    parent,
                    agentOptions: {
                        ...descriptor.agentProvider !== undefined ? { provider: descriptor.agentProvider } : {},
                        ...descriptor.agentModel !== undefined ? { model: descriptor.agentModel } : {},
                        ...descriptor.agentReasoningEffort !== undefined
                            ? { reasoningEffort: ReasoningEffortId(descriptor.agentReasoningEffort) }
                            : {},
                    },
                    composition: { persona: descriptor.persona, toolFilter: descriptor.toolFilter },
                    signal: options.signal,
                });
            }
            catch (error) {
                options.signal.throwIfAborted();
                if (error instanceof SubagentError)
                    throw error;
                throw new SubagentError(`subagent "${childId}" is unavailable`, 'NOT_RESUMABLE', { cause: error });
            }
            return await this.submitMaterialized(activation, content, options, parent);
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    /** Admit a materialized child, commit its creation fact, and release it on failure. */
    async submitMaterialized(activation, content, options, parent, commit) {
        try {
            if (contentHasImage(content)) {
                await this.assertImageCapable(activation.handle.agent, options.signal);
                if (activation.inbox.closing !== undefined) {
                    throw new SubagentError(`subagent "${activation.childId}" is closing`, 'ACTIVATION_CLOSING');
                }
            }
            const messageId = this.submitAdmitted(activation, content, options, parent);
            commit?.();
            activation.announced = true;
            return messageId;
        }
        catch (error) {
            try {
                await this.activations.dispose(activation);
            }
            catch (cleanupError) {
                this.ctx.logger.warn(`subagent continuation: disposal after admission or catalog append failure also failed: ${String(cleanupError)}`);
            }
            throw error;
        }
    }
    /** Build and submit one message across the final synchronous admission cutoff. */
    submitAdmitted(activation, content, options, parent) {
        const message = options.source === undefined
            ? createAgentMessage(parent, content)
            : createUserMessage({ content, source: options.source });
        return this.activations.submitAdmitted(activation, message, options.delivery, parent, options.signal);
    }
    /** Refuse image content for a child whose fixed model accepts text only. */
    async assertImageCapable(agent, signal) {
        const { provider, model } = agent.options;
        if (provider === undefined || model === undefined)
            return;
        const llm = this.ctx.get('llm');
        /* v8 ignore next -- without an LLM registry, delivery defers to projection. */
        if (llm === undefined)
            return;
        const info = await llm.resolveModelInfo(provider, model, signal);
        if (info.inputModalities !== undefined && !info.inputModalities.includes('image')) {
            throw new SubagentError(`Model "${model}" does not support image input.`, 'MODEL_DOES_NOT_SUPPORT_IMAGES');
        }
    }
    /** Resolve the persistence service continuable children require, or fail loud. */
    requirePersistence() {
        const persistence = this.ctx.get('sessionPersistence');
        if (persistence === undefined) {
            throw new SubagentError('continuable subagents require session persistence (load a dsh-session-persistence backend)', 'PERSISTENCE_UNAVAILABLE');
        }
        return persistence;
    }
    /** Resolve the Session query service used for cold child observations. */
    requireSessionQuery() {
        const query = this.ctx.get('sessionQuery');
        if (query === undefined) {
            throw new SubagentError('continuable subagents require session query (load @deepseek-ai/dsh-session-query)', 'CONTINUATION_UNAVAILABLE');
        }
        return query;
    }
}
export default SubagentContinuationManager;
//# sourceMappingURL=continuation.js.map