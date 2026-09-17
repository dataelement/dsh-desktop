/** Agent activation, composition, and model-selection policy owned by API Session. */
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
import { mkdir } from 'node:fs/promises';
import { installModelSelection } from '@deepseek-ai/dsh-agent';
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm';
import { SessionQueryError } from '@deepseek-ai/dsh-session-query';
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
/** Cold Session identity absent from persistence. */
export class ApiSessionNotFound extends Error {
}
/** Session identity whose lifecycle belongs to subagent routing. */
export class ApiSessionSubagentOwnership extends Error {
    sessionId;
    /** @param sessionId - identity reserved to subagent routing. */
    constructor(sessionId) {
        super(`session "${sessionId}" is a subagent session; use subagent delivery`);
        this.sessionId = sessionId;
    }
}
/** Explicit-id creation attempted to adopt a Session under another cwd. */
export class ApiSessionCwdConflict extends Error {
    sessionId;
    requestedCwd;
    existingCwd;
    constructor(sessionId, requestedCwd, existingCwd) {
        super(existingCwd === undefined
            ? `session "${sessionId}" records no cwd and cannot be adopted for "${requestedCwd}"`
            : `session "${sessionId}" belongs to "${existingCwd}", not "${requestedCwd}"`);
        this.sessionId = sessionId;
        this.requestedCwd = requestedCwd;
        this.existingCwd = existingCwd;
    }
}
/** Explicit-id creation attempted to adopt a Session under another preset. */
export class ApiSessionPresetConflict extends Error {
    sessionId;
    requestedPreset;
    existingPreset;
    constructor(sessionId, requestedPreset, existingPreset) {
        super(existingPreset === undefined
            ? `session "${sessionId}" records no agent preset and cannot be adopted under "${requestedPreset}"`
            : `session "${sessionId}" runs agent preset "${existingPreset}", not "${requestedPreset}"`);
        this.sessionId = sessionId;
        this.requestedPreset = requestedPreset;
        this.existingPreset = existingPreset;
    }
}
/**
 * Test whether generic Session routing must leave an identity to subagent routing.
 * @param ctx - Host context carrying the Agent ownership registry.
 * @param session - attached or live Session whose ownership is tested.
 * @param agent - live Agent when one exists for the Session.
 * @returns whether subagent routing owns the Session identity.
 */
export function hasApiSessionSubagentOwner(ctx, session, agent) {
    if (session.header.origin === 'subagent')
        return true;
    const parentId = session.header.parentSession;
    if (parentId === undefined || agent === undefined)
        return false;
    const parent = ctx.agents.get(parentId);
    return parent !== undefined && ctx.agents.isOwnedBy(agent.id, parent);
}
/**
 * Build the stable caller-facing subagent ownership rejection.
 * @param sessionId - Session identity owned by subagent routing.
 * @returns a stable Session-domain failure.
 */
export function apiSessionSubagentOwnershipError(sessionId) {
    return new RemoteError('session/agent-busy', `session "${sessionId}" is owned by subagent routing`, { reason: 'use subagent delivery for this child session' });
}
/**
 * Inspect one cold Session without repairing, resuming, or publishing it.
 * @param ctx - Host context carrying Session persistence.
 * @param sessionId - durable Session identity.
 * @param signal - optional cancellation for persistence reads.
 * @returns the persisted header and complete event prefix.
 */
export async function inspectApiSession(ctx, sessionId, signal) {
    try {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const observation = __addDisposableResource(env_1, await ctx.sessionQuery.observeSession(sessionId, {
                ...(signal === undefined ? {} : { signal }),
                projectionMode: 'none',
            }), false);
            if (observation.header.cwd === undefined) {
                throw new ApiSessionNotFound(`session "${sessionId}" not found`);
            }
            return {
                meta: observation.header,
                inheritedEventCount: observation.inheritedEventCount,
                events: [...observation.events],
            };
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    catch (error) {
        if (error instanceof SessionQueryError
            && error.code === 'SESSION_QUERY_SESSION_NOT_FOUND') {
            throw new ApiSessionNotFound(`session "${sessionId}" not found`);
        }
        throw error;
    }
}
/** Owns every operation that may create, resume, or configure a Web Agent. */
export class ApiSessionAgentController {
    ctx;
    resumes = new Map();
    creations = new Map();
    selections = new WeakMap();
    imageAdmissionChains = new WeakMap();
    /** @param ctx - Host context carrying Agent, model, persistence, and Typert services. */
    constructor(ctx) {
        this.ctx = ctx;
        ctx.typert.lookups.configure('agent', async (sessionId) => {
            const found = await this.resolveAgent(sessionId);
            if ('error' in found)
                throw found.error;
            return found.agent;
        });
        ctx.typert.lookups.configure('session', async (sessionId) => {
            const found = await this.resolveAgent(sessionId);
            if ('error' in found)
                throw found.error;
            return found.agent.session;
        });
        ctx.typert.contexts.configureHost('agent', async (sessionId) => {
            const found = await this.resolveAgent(sessionId);
            if ('error' in found)
                throw found.error;
            return found.agent.ctx;
        });
    }
    /**
     * Resolve or resume one ordinary Session, deduplicating concurrent resumes.
     * @param sessionId - ordinary Session identity.
     * @returns the live Agent or a stable Session-domain failure.
     */
    async resolveAgent(sessionId) {
        return this.resolve(sessionId);
    }
    /**
     * Resolve one ordinary Session from an already-retained exact observation.
     * @param observation - Host-owned observation whose preparation stays pinned through setup.
     * @returns the live Agent or a stable Session-domain failure.
     */
    async resolveObservedAgent(observation) {
        return this.resolve(observation.header.id, observation);
    }
    async resolve(sessionId, observation) {
        const live = this.liveAgent(sessionId);
        if (live !== undefined)
            return live;
        const attached = this.ctx.sessions.get(sessionId);
        if (attached !== undefined && hasApiSessionSubagentOwner(this.ctx, attached, undefined)) {
            return { error: apiSessionSubagentOwnershipError(sessionId) };
        }
        let resume = this.resumes.get(sessionId);
        if (resume === undefined) {
            resume = this.resume(sessionId, observation).finally(() => { this.resumes.delete(sessionId); });
            this.resumes.set(sessionId, resume);
        }
        try {
            return { agent: await resume };
        }
        catch (error) {
            if (error instanceof ApiSessionNotFound) {
                return { error: new RemoteError('session/not-found', error.message, { sessionId }) };
            }
            if (error instanceof ApiSessionSubagentOwnership) {
                return { error: apiSessionSubagentOwnershipError(error.sessionId) };
            }
            const raced = this.liveAgent(sessionId);
            if (raced !== undefined)
                return raced;
            const racedSession = this.ctx.sessions.get(sessionId);
            if (racedSession !== undefined && hasApiSessionSubagentOwner(this.ctx, racedSession, undefined)) {
                return { error: apiSessionSubagentOwnershipError(sessionId) };
            }
            return {
                error: new RemoteError('gateway/internal', `resume failed for session "${sessionId}": ${String(error)}`, {}),
            };
        }
    }
    /**
     * Resolve one requested identity, creating or resuming it once.
     * @param sessionId - requested Session identity.
     * @param cwd - directory the Session must own.
     * @param checkPersistedIdentity - whether to inspect a cold identity before creation.
     * @param presetId - optional Agent preset the Session must own.
     * @returns the matching live ordinary Agent.
     */
    async ensureSession(sessionId, cwd, checkPersistedIdentity, presetId) {
        let creation = this.creations.get(sessionId);
        if (creation === undefined) {
            creation = this.createOrAdopt(sessionId, cwd, checkPersistedIdentity, presetId)
                .catch((error) => {
                const live = this.ctx.agents.get(sessionId);
                if (live !== undefined) {
                    if (hasApiSessionSubagentOwner(this.ctx, live.session, live)) {
                        throw new ApiSessionSubagentOwnership(sessionId);
                    }
                    return live;
                }
                const attached = this.ctx.sessions.get(sessionId);
                if (attached !== undefined && hasApiSessionSubagentOwner(this.ctx, attached, undefined)) {
                    throw new ApiSessionSubagentOwnership(sessionId);
                }
                throw error;
            })
                .finally(() => { this.creations.delete(sessionId); });
            this.creations.set(sessionId, creation);
        }
        const agent = await creation;
        if (hasApiSessionSubagentOwner(this.ctx, agent.session, agent)) {
            throw new ApiSessionSubagentOwnership(sessionId);
        }
        if (presetId !== undefined) {
            this.assertPresetUnchanged(sessionId, presetId, this.presetForSession(agent.session));
        }
        if (agent.session.header.cwd !== cwd) {
            throw new ApiSessionCwdConflict(sessionId, cwd, agent.session.header.cwd);
        }
        return agent;
    }
    /**
     * Install or return the Session-local model selection used by prompt assembly.
     * @param agent - live Agent that owns the selection.
     * @returns the installed mutable selection reference.
     */
    selectionFor(agent) {
        const installed = this.selections.get(agent);
        if (installed !== undefined)
            return installed;
        const projectionState = this.ctx.sessionProjections.stateOf(agent.session, 'modelSelection');
        if (projectionState === undefined) {
            throw new Error('api-session: required modelSelection projection is not registered');
        }
        let picked = projectionState.pending === null
            ? undefined
            : agentModelSelection(projectionState.pending);
        const defaultModel = this.ctx.agentDefaultModel;
        const selection = {
            get current() {
                if (picked !== undefined)
                    return picked;
                const loggedHeader = agent.session.requestHeader();
                if (loggedHeader === undefined)
                    return defaultModel.currentSelection();
                const logged = loggedHeader.config;
                return {
                    provider: logged.provider,
                    model: logged.model,
                    // An effort the adapter defaulted is not a conversation choice: restoring
                    // it as one would make an unchanged default read as a request change.
                    ...(logged.reasoningEffort === undefined
                        || loggedHeader.adapterDefaults?.reasoningEffort === true
                        ? {}
                        : { reasoningEffort: logged.reasoningEffort }),
                };
            },
            set current(next) {
                picked = next;
            },
            consume(provider, model, reasoningEffort) {
                if (picked?.provider !== provider
                    || picked.model !== model
                    || picked.reasoningEffort !== reasoningEffort)
                    return false;
                picked = undefined;
                return true;
            },
            assembled: undefined,
        };
        installModelSelection(agent.ctx, selection);
        this.selections.set(agent, selection);
        return selection;
    }
    /**
     * Commit and cache one validated selection for the next prompt assembly.
     * @param agent - live Agent that owns the selection.
     * @param selection - validated selection to record and apply.
     */
    selectForNextRequest(agent, selection) {
        agent.session.append('model/selection', selection);
        this.selectionFor(agent).current = selection;
    }
    /**
     * Let a matching durable request header retire the execution cache.
     * @param agent - live Agent whose request was recorded.
     * @param provider - provider route used by the request.
     * @param model - provider-owned model used by the request.
     * @param reasoningEffort - adapter-owned effort used by the request.
     * @returns whether the pending selection was consumed.
     */
    consumeSelection(agent, provider, model, reasoningEffort) {
        return this.selections.get(agent)?.consume(provider, model, reasoningEffort) ?? false;
    }
    /**
     * Read the current Agent preset from the Session projection.
     * @param session - live Session whose projection state is available.
     * @returns the current preset, or undefined when the capability is absent.
     */
    presetForSession(session) {
        return this.ctx.sessionProjections.stateOf(session, 'agentPreset') ?? undefined;
    }
    /**
     * Serialize image admission and model selection for one Agent.
     * @param agent - live Agent that owns the serialization chain.
     * @param operation - asynchronous operation admitted after prior work settles.
     * @returns the operation result or rejection.
     */
    serializeImageAdmission(agent, operation) {
        const result = (this.imageAdmissionChains.get(agent) ?? Promise.resolve()).then(operation);
        this.imageAdmissionChains.set(agent, result.then(() => undefined, () => undefined));
        return result;
    }
    /**
     * Resolve the preset id and pre-publication Agent setup for a create or resume.
     * @param presetId - requested preset or the configured default when omitted.
     * @returns the resolved preset identity and Agent setup callback.
     */
    async composeAgent(presetId) {
        const presets = this.ctx.get('agentPresets');
        if (presets === undefined) {
            return { setup: (_agentCtx, agent) => { this.installSelection(agent); } };
        }
        const resolvedId = (await presets.resolve(presetId)).id;
        return {
            agentPreset: resolvedId,
            setup: async (agentCtx, agent) => {
                this.installSelection(agent);
                await presets.mount(agentCtx, resolvedId);
            },
        };
    }
    liveAgent(sessionId) {
        const agent = this.ctx.agents.get(sessionId);
        if (agent === undefined)
            return undefined;
        return hasApiSessionSubagentOwner(this.ctx, agent.session, agent)
            ? { error: apiSessionSubagentOwnershipError(sessionId) }
            : { agent };
    }
    async resume(sessionId, supplied) {
        if (supplied !== undefined)
            return this.resumeObserved(sessionId, supplied);
        try {
            const env_2 = { stack: [], error: void 0, hasError: false };
            try {
                const observation = __addDisposableResource(env_2, await this.ctx.sessionQuery.observeSession(sessionId), false);
                return await this.resumeObserved(sessionId, observation);
            }
            catch (e_2) {
                env_2.error = e_2;
                env_2.hasError = true;
            }
            finally {
                __disposeResources(env_2);
            }
        }
        catch (error) {
            if (error instanceof SessionQueryError
                && error.code === 'SESSION_QUERY_SESSION_NOT_FOUND') {
                throw new ApiSessionNotFound(`session "${sessionId}" not found`);
            }
            throw error;
        }
    }
    async resumeObserved(sessionId, observation) {
        if (observation.header.id !== sessionId || observation.header.cwd === undefined) {
            throw new ApiSessionNotFound(`session "${sessionId}" not found`);
        }
        if (hasApiSessionSubagentOwner(this.ctx, { header: observation.header }, undefined)) {
            throw new ApiSessionSubagentOwnership(sessionId);
        }
        const composition = await this.composeAgent(this.presetForObservation(observation));
        const published = this.ctx.sessions.get(sessionId);
        const live = this.ctx.agents.get(sessionId);
        if (published !== undefined && hasApiSessionSubagentOwner(this.ctx, published, live)) {
            throw new ApiSessionSubagentOwnership(sessionId);
        }
        return (await this.ctx.agents.resume({
            resumeSessionId: sessionId,
            agentOptions: this.agentOptions(),
            setup: composition.setup,
        })).agent;
    }
    async createOrAdopt(sessionId, cwd, checkPersistedIdentity, presetId) {
        const attached = this.ctx.sessions.get(sessionId);
        const live = this.ctx.agents.get(sessionId);
        if (attached !== undefined && hasApiSessionSubagentOwner(this.ctx, attached, live)) {
            throw new ApiSessionSubagentOwnership(sessionId);
        }
        if (live !== undefined)
            return live;
        if (checkPersistedIdentity) {
            try {
                const env_3 = { stack: [], error: void 0, hasError: false };
                try {
                    const observation = __addDisposableResource(env_3, await this.ctx.sessionQuery.observeSession(sessionId), false);
                    if (hasApiSessionSubagentOwner(this.ctx, { header: observation.header }, undefined)) {
                        throw new ApiSessionSubagentOwnership(sessionId);
                    }
                    if (observation.header.cwd !== cwd) {
                        throw new ApiSessionCwdConflict(sessionId, cwd, observation.header.cwd);
                    }
                    const storedPreset = this.presetForObservation(observation);
                    this.assertPresetUnchanged(sessionId, presetId, storedPreset);
                    const composition = await this.composeAgent(storedPreset);
                    return (await this.ctx.agents.resume({
                        resumeSessionId: sessionId,
                        agentOptions: this.agentOptions(),
                        setup: composition.setup,
                    })).agent;
                }
                catch (e_3) {
                    env_3.error = e_3;
                    env_3.hasError = true;
                }
                finally {
                    __disposeResources(env_3);
                }
            }
            catch (error) {
                if (!(error instanceof SessionQueryError)
                    || error.code !== 'SESSION_QUERY_SESSION_NOT_FOUND')
                    throw error;
            }
        }
        try {
            await mkdir(cwd, { recursive: true });
        }
        catch (error) {
            throw new Error(`failed to ensure project directory "${cwd}": ${String(error)}`, { cause: error });
        }
        const composition = await this.composeAgent(presetId);
        return (await this.ctx.agents.create({
            sessionId,
            agentOptions: this.agentOptions(),
            meta: {
                cwd,
                ...(composition.agentPreset === undefined ? {} : { agentPreset: composition.agentPreset }),
            },
            setup: composition.setup,
        })).agent;
    }
    agentOptions() {
        const { provider, model } = this.ctx.agentDefaultModel.currentSelection();
        return { provider, model };
    }
    installSelection(agent) {
        this.selectionFor(agent);
    }
    /**
     * Read the current Agent preset from an all-projections observation.
     * @param observation - exact Session observation carrying its projection snapshot.
     * @returns the current preset, or undefined when the capability is absent.
     */
    presetForObservation(observation) {
        if (observation.projections === undefined) {
            throw new Error('api-session: Agent activation requires a projected Session observation');
        }
        return observation.projections.values.agentPreset ?? undefined;
    }
    assertPresetUnchanged(sessionId, requested, existing) {
        if (requested === undefined || requested === existing)
            return;
        throw new ApiSessionPresetConflict(sessionId, requested, existing);
    }
}
function agentModelSelection(selection) {
    return {
        provider: selection.provider,
        model: selection.model,
        ...(selection.reasoningEffort === undefined
            ? {}
            : { reasoningEffort: ReasoningEffortId(selection.reasoningEffort) }),
    };
}
//# sourceMappingURL=agent.js.map