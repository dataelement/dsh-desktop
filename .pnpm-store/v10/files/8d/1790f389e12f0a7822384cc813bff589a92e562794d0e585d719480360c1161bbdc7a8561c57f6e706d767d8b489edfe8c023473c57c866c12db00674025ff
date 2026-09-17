/** Session Remote owner: cold reads, explicit Agent commands, and live control state. */
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
import { hostname } from 'node:os';
import z from '@deepseek-ai/schemastery';
import { errorChain } from '@deepseek-ai/dsh-llm';
import { canOpenNativePath, nativeFileManager, openNativePath, revealNativePath } from '@deepseek-ai/dsh-native-command';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { ApiSessionAgentController, inspectApiSession, } from "./agent.js";
import { SessionCommandController } from "./commands.js";
import { SessionControlController } from "./control.js";
import { SessionHistoryController } from "./history.js";
import { SessionFileReferences } from "./file-references.js";
import { ApiSessionList } from "./list.js";
import { buildModelCatalog } from "./catalog.js";
import { installModelSelectionProjection } from "./model-selection-projection.js";
import { SessionSkillCatalog } from "./skill-catalog.js";
import { SessionMediaReferences } from "./media-references.js";
export { ApiSessionNotFound } from "./agent.js";
export { SessionFileReferences } from "./file-references.js";
export { SessionSkillCatalog } from "./skill-catalog.js";
/** Host service backing the generated `ctx.remote.session` namespace. */
let SessionController = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _search_decorators;
    let _create_decorators;
    let _selectModel_decorators;
    let _modelCatalog_decorators;
    let _canOpenWorkspacePath_decorators;
    let _openWorkspacePath_decorators;
    let _rename_decorators;
    let _fork_decorators;
    let _prompt_decorators;
    let _attachment_decorators;
    let _updateQueue_decorators;
    let _cancel_decorators;
    let _page_decorators;
    let _follow_decorators;
    let _control_decorators;
    return class SessionController extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _list_decorators = [Remote('list')];
            _search_decorators = [Remote('search')];
            _create_decorators = [Remote('create')];
            _selectModel_decorators = [Remote('selectModel')];
            _modelCatalog_decorators = [Remote('modelCatalog')];
            _canOpenWorkspacePath_decorators = [Remote];
            _openWorkspacePath_decorators = [Remote('openWorkspacePath')];
            _rename_decorators = [Remote('rename')];
            _fork_decorators = [Remote('fork')];
            _prompt_decorators = [Remote('prompt')];
            _attachment_decorators = [Remote('attachment')];
            _updateQueue_decorators = [Remote('updateQueue')];
            _cancel_decorators = [Remote('cancel')];
            _page_decorators = [Remote('page')];
            _follow_decorators = [Remote({ mode: 'stream' })];
            _control_decorators = [Remote({ mode: 'stream' })];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _search_decorators, { kind: "method", name: "search", static: false, private: false, access: { has: obj => "search" in obj, get: obj => obj.search }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _selectModel_decorators, { kind: "method", name: "selectModel", static: false, private: false, access: { has: obj => "selectModel" in obj, get: obj => obj.selectModel }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _modelCatalog_decorators, { kind: "method", name: "modelCatalog", static: false, private: false, access: { has: obj => "modelCatalog" in obj, get: obj => obj.modelCatalog }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _canOpenWorkspacePath_decorators, { kind: "method", name: "canOpenWorkspacePath", static: false, private: false, access: { has: obj => "canOpenWorkspacePath" in obj, get: obj => obj.canOpenWorkspacePath }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _openWorkspacePath_decorators, { kind: "method", name: "openWorkspacePath", static: false, private: false, access: { has: obj => "openWorkspacePath" in obj, get: obj => obj.openWorkspacePath }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _rename_decorators, { kind: "method", name: "rename", static: false, private: false, access: { has: obj => "rename" in obj, get: obj => obj.rename }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _fork_decorators, { kind: "method", name: "fork", static: false, private: false, access: { has: obj => "fork" in obj, get: obj => obj.fork }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _prompt_decorators, { kind: "method", name: "prompt", static: false, private: false, access: { has: obj => "prompt" in obj, get: obj => obj.prompt }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _attachment_decorators, { kind: "method", name: "attachment", static: false, private: false, access: { has: obj => "attachment" in obj, get: obj => obj.attachment }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _updateQueue_decorators, { kind: "method", name: "updateQueue", static: false, private: false, access: { has: obj => "updateQueue" in obj, get: obj => obj.updateQueue }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _cancel_decorators, { kind: "method", name: "cancel", static: false, private: false, access: { has: obj => "cancel" in obj, get: obj => obj.cancel }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _page_decorators, { kind: "method", name: "page", static: false, private: false, access: { has: obj => "page" in obj, get: obj => obj.page }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _follow_decorators, { kind: "method", name: "follow", static: false, private: false, access: { has: obj => "follow" in obj, get: obj => obj.follow }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _control_decorators, { kind: "method", name: "control", static: false, private: false, access: { has: obj => "control" in obj, get: obj => obj.control }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = [
            'agentDefaultModel',
            'agents',
            'attachments',
            'fileUploads',
            'llm',
            'sessions',
            'sessionProjections',
            'sessionQuery',
            'typert',
            'workspaceRegistry',
        ];
        static Config = z.object({
            nativeOpen: z.boolean(),
        });
        agents = __runInitializers(this, _instanceExtraInitializers);
        commands;
        controlState;
        history;
        listState;
        openPath;
        revealPath;
        canOpenPath;
        promotions = new Set();
        /**
         * @param ctx - Host context containing the Session capability assembly.
         * @param config - native-opener deployment policy.
         * @param internals - host integrations replaceable by direct unit tests.
         */
        constructor(ctx, config, internals = {}) {
            super(ctx, 'sessionController', { namespace: 'session' });
            installModelSelectionProjection(ctx);
            this.agents = new ApiSessionAgentController(ctx);
            this.commands = new SessionCommandController(ctx, this.agents, process.cwd());
            ctx.effect(() => ctx.fileUploads.registerAgentResolver(async (sessionId) => {
                const result = await this.agents.resolveAgent(sessionId);
                if ('error' in result)
                    throw result.error;
                return result.agent;
            }), 'session-controller: file-upload Agent resolver');
            this.controlState = new SessionControlController(ctx);
            // Registered before history so reverse-order teardown closes every
            // follower before waiting for already-admitted promotions.
            ctx.effect(() => async () => {
                await Promise.allSettled([...this.promotions]);
            }, 'session-controller.promotions');
            this.history = new SessionHistoryController(ctx, (observation) => { this.promote(observation); });
            this.listState = new ApiSessionList(ctx);
            this.openPath = internals.openPath ?? openNativePath;
            this.revealPath = internals.revealPath ?? revealNativePath;
            this.canOpenPath = internals.canOpenPath
                ?? (() => config.nativeOpen ?? (internals.openPath !== undefined || canOpenNativePath()));
            ctx.plugin(SessionFileReferences);
            ctx.plugin(SessionMediaReferences);
            ctx.plugin(SessionSkillCatalog);
            ctx.on('session/created', (session) => {
                ctx.emit('api-session/added', this.listState.summaryFor(session));
            });
            ctx.on('session/disposed', (session) => {
                ctx.emit('api-session/removed', session.id);
            });
            ctx.on('agent/status', ({ agent, status }) => {
                ctx.emit('api-session/status', agent.id, status === 'running');
            });
            ctx.on('agent/error', ({ agent, error }) => {
                ctx.emit('api-session/error', agent.id, errorChain(error));
            });
            ctx.on('session/event', (session, event) => {
                if (event.type === 'request/header') {
                    const agent = ctx.agents.get(session.id);
                    if (agent?.session === session)
                        this.agents.consumeSelection(agent, event.data.header.config.provider, event.data.header.config.model, event.data.header.config.reasoningEffort);
                }
                if (event.type !== 'user/message' || event.data.source.kind !== 'user')
                    return;
                ctx.emit('api-session/activity', session.id, event.time);
            });
        }
        promote(observation) {
            const sessionId = observation.header.id;
            const task = (async () => {
                const env_1 = { stack: [], error: void 0, hasError: false };
                try {
                    const ownedObservation = __addDisposableResource(env_1, observation, false);
                    const result = await this.agents.resolveObservedAgent(ownedObservation);
                    if ('error' in result)
                        this.ctx.emit('api-session/error', sessionId, result.error.message);
                }
                catch (e_1) {
                    env_1.error = e_1;
                    env_1.hasError = true;
                }
                finally {
                    __disposeResources(env_1);
                }
            })().catch((error) => {
                this.ctx.logger.error(`session-controller: background activation for "${sessionId}" failed: ${errorChain(error)}`);
            });
            this.promotions.add(task);
            void task.finally(() => { this.promotions.delete(task); });
        }
        /**
         * Resolve or resume one ordinary Session for another Host API domain.
         * @param sessionId - Session identity whose Agent owns the operation.
         * @returns the live Agent or the stable Session-domain failure.
         */
        resolveAgent(sessionId) {
            return this.agents.resolveAgent(sessionId);
        }
        /**
         * Inspect one attached or persisted Session without activating its Agent.
         * @param sessionId - durable Session identity.
         * @param signal - optional caller cancellation for persistence reads.
         * @returns the current attached state or persisted header and event prefix.
         */
        inspect(sessionId, signal) {
            const attached = this.ctx.sessions.get(sessionId);
            if (attached !== undefined) {
                return Promise.resolve({
                    meta: attached.header,
                    inheritedEventCount: attached.inheritedEventCount,
                    events: attached.snapshotEvents(),
                });
            }
            return inspectApiSession(this.ctx, sessionId, signal);
        }
        /**
         * Read all visible Session rows without resuming an Agent.
         * @param _request - reserved empty list request.
         * @param signal - cancellation for persistence reads.
         * @returns visible Session summaries ordered by activity.
         */
        async list(_request, signal) {
            return { items: await this.listState.list(signal) };
        }
        /**
         * Search visible Session content without resuming an Agent.
         * @param request - literal message-content query.
         * @param signal - cancellation for list and search reads.
         * @returns authorized bounded Session search results.
         */
        search(request, signal) {
            return this.listState.search(request.query, signal);
        }
        /**
         * Create or idempotently adopt one ordinary Session.
         * @param request - requested identity, location, and Agent preset.
         * @returns the Session identity and resolved preset when configured.
         */
        create(request) {
            return this.commands.create(request);
        }
        /**
         * Select one Session-local model after explicitly resuming the Session.
         * @param request - Session identity and requested model selection.
         * @returns the normalized selection installed for the Session.
         */
        selectModel(request) {
            return this.commands.selectModel(request);
        }
        /**
         * Describe every currently routable model for Host-generation selectors.
         * @returns provider-grouped models, the deployment default, and isolated provider failures.
         */
        modelCatalog() {
            return buildModelCatalog(this.ctx);
        }
        /**
         * Report whether this deployment can hand a Session workspace path to a native desktop.
         * @returns true when the matching open operation is available.
         */
        canOpenWorkspacePath() {
            return this.canOpenPath();
        }
        /**
         * Describe the serving desktop for authenticated file-action routes.
         * @returns Host name, configured availability, and platform-specific file-manager behavior.
         */
        workspaceDesktop() {
            const fileManager = nativeFileManager();
            return { name: hostname(), available: fileManager !== null && this.canOpenPath(), fileManager };
        }
        /**
         * Open one path prepared by a Session-aware caller on the Host desktop.
         * @param request - path after best-effort Session workspace resolution.
         * @param signal - caller lifetime; abort terminates the native command.
         * @returns confirmation after the native opener accepts the path.
         * @throws RemoteError when the request is invalid, cancelled, or the opener fails.
         */
        async openWorkspacePath(request, signal) {
            if (request.path.length === 0) {
                throw new RemoteError('gateway/bad-request', 'session.openWorkspacePath requires a non-empty path', {});
            }
            signal.throwIfAborted();
            try {
                if (request.action === 'reveal')
                    await this.revealPath(request.path, signal);
                else
                    await this.openPath(request.path, signal);
                return { opened: true };
            }
            catch (error) {
                if (signal.aborted)
                    throw new RemoteError('gateway/cancelled', 'path open was aborted', {});
                throw new RemoteError('gateway/internal', `path open failed: ${error instanceof Error ? error.message : String(error)}`, {});
            }
        }
        /**
         * Rename one Session after explicitly resuming it.
         * @param request - Session identity and proposed title.
         * @returns the accepted title and durable event sequence.
         */
        rename(request) {
            return this.commands.rename(request);
        }
        /**
         * Fork one cold-readable completed-turn prefix into a new Session.
         * @param request - source Session and optional event anchor.
         * @returns the new Session identity.
         */
        fork(request) {
            return this.commands.fork(request);
        }
        /**
         * Admit one prompt after explicitly resuming its Session.
         * @param request - Session identity, prompt content, source metadata, and delivery mode.
         * @param signal - caller cancellation before prompt admission begins.
         * @returns acknowledgement that the Agent accepted the prompt.
         */
        prompt(request, signal) {
            signal.throwIfAborted();
            return this.commands.prompt(request);
        }
        /**
         * Read one image proven reachable from the addressed Session log.
         * @param request - Session and attachment identities used for authorization.
         * @returns the durable attachment reference and base64-encoded bytes.
         */
        attachment(request) {
            return this.commands.attachment(request);
        }
        /**
         * Mutate one still-pending queue occurrence on a live Agent.
         * @param request - Session, queue item, and requested mutation.
         * @returns acknowledgement that the queue mutation was applied.
         */
        updateQueue(request) {
            return this.commands.updateQueue(request);
        }
        /**
         * Cancel one active Agent turn without dropping its pending inbox.
         * @param request - Session whose active Agent turn is cancelled.
         * @returns acknowledgement that cancellation was requested.
         */
        cancel(request) {
            return this.commands.cancel(request);
        }
        /**
         * Read one cold-safe, message-aligned Session history page.
         * @param request - durable address, backward cursor, and page budget.
         * @param signal - cancellation for persistence reads.
         * @returns one chronological page.
         */
        page(request, signal) {
            return this.history.page(request, signal);
        }
        /**
         * Follow one Session log from its opening or resume cursor.
         * @param request - durable address and last committed sequence already held by the caller.
         * @param signal - cancellation owned by the Remote stream carrier.
         * @returns a complete opening snapshot followed by gap-free durable event
         *   frames and optional cursorless assistant-stream frames.
         */
        follow(request, signal) {
            return this.history.follow(request, signal);
        }
        /**
         * Stream a complete live-control baseline followed by replacement frames.
         * @param signal - cancellation owned by the Remote stream carrier.
         * @returns one complete baseline followed by live replacement frames.
         */
        control(signal) {
            return this.controlState.control(signal);
        }
    };
})();
export { SessionController };
export { buildModelCatalog };
export default SessionController;
//# sourceMappingURL=index.js.map