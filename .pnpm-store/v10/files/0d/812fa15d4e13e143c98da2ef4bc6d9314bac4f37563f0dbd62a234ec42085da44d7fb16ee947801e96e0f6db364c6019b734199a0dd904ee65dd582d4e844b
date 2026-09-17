/** Session-addressed, cold-readable skill catalog Remote. */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
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
import { SessionQueryError } from '@deepseek-ai/dsh-session-query';
import { isUserInvocable } from '@deepseek-ai/dsh-skill';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
/** Host service backing `ctx.remote.skills` without activating a cold Agent. */
let SessionSkillCatalog = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    return class SessionSkillCatalog extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _list_decorators = [Remote];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['agents', 'sessionQuery', 'typert'];
        /** @param ctx - Host context carrying Session reads and optional skill/preset services. */
        constructor(ctx) {
            super(ctx, 'sessionSkillCatalog', { namespace: 'skills' });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /**
         * List the user-invocable skills visible to one Session composition.
         * @param request - Session identity whose cwd and preset select the catalog view.
         * @param signal - caller lifetime carried by the Remote transport; admitted catalog reads retain their existing completion semantics.
         * @returns user-invocable skill metadata without loading skill bodies.
         * @throws RemoteError when the Session cannot be inspected or no registry can serve it.
         */
        async list(request, signal) {
            void signal;
            const { sessionId } = request;
            let cwd;
            let agentPreset;
            try {
                const env_1 = { stack: [], error: void 0, hasError: false };
                try {
                    const observation = __addDisposableResource(env_1, await this.ctx.sessionQuery.observeSession(sessionId), false);
                    if (observation.projections === undefined) {
                        throw new Error('skill catalog requires a projected Session observation');
                    }
                    cwd = observation.header.cwd;
                    agentPreset = observation.projections.values.agentPreset ?? undefined;
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
                    throw new RemoteError('session/not-found', `session "${sessionId}" not found`, { sessionId });
                }
                throw new RemoteError('gateway/internal', `session "${sessionId}" could not be inspected: ${String(error)}`, {});
            }
            if (cwd === undefined) {
                throw new RemoteError('gateway/internal', `session "${sessionId}" has no project cwd`, {});
            }
            const live = this.ctx.agents.get(sessionId);
            const presets = this.ctx.get('agentPresets');
            const scoped = live === undefined ? undefined : presets?.serviceFor(live, 'skills');
            const skillRegistry = scoped ?? this.ctx.get('skills');
            if (skillRegistry === undefined) {
                throw new RemoteError('gateway/internal', 'skill registry is absent: neither this session\'s agent preset nor the host composition mounts @deepseek-ai/dsh-skill', {});
            }
            const scope = await this.scopeFor(sessionId, agentPreset);
            try {
                const skills = (await skillRegistry.list({ cwd, scope })).filter(isUserInvocable);
                return {
                    skills: skills.map(skill => ({
                        name: skill.name,
                        description: skill.description,
                        ...skill.whenToUse === undefined ? {} : { whenToUse: skill.whenToUse },
                        modelInvocable: skill.invocation.modelInvocable,
                    })),
                };
            }
            catch (error) {
                throw new RemoteError('gateway/internal', `skill listing failed: ${String(error)}`, {});
            }
        }
        /** Resolve a live or standing preset scope without creating an Agent. */
        async scopeFor(sessionId, agentPreset) {
            const live = this.ctx.agents.get(sessionId);
            if (live !== undefined)
                return live;
            const presets = this.ctx.get('agentPresets');
            if (presets === undefined)
                return undefined;
            try {
                return await presets.standingKeyFor(agentPreset);
            }
            catch {
                // An unknown or unusable recorded preset falls back to the global registry.
                return undefined;
            }
        }
    };
})();
export { SessionSkillCatalog };
export default SessionSkillCatalog;
//# sourceMappingURL=skill-catalog.js.map