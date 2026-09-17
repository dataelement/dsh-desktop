/** Host file-upload service: streamed intake and Agent-scoped staged receipts. */
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
import { randomUUID } from 'node:crypto';
import { scopeOf } from '@deepseek-ai/dsh-scope';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { handleFileUploadHttp } from "./http-route.js";
import { FILE_UPLOAD_PATH } from "./protocol.js";
class PromptFileBindingGuard {
    rollback;
    settled = false;
    constructor(rollback) {
        this.rollback = rollback;
    }
    commit() {
        this.settled = true;
    }
    [Symbol.dispose]() {
        if (this.settled)
            return;
        this.settled = true;
        this.rollback();
    }
}
/** Host service owning upload storage and Agent-scoped staged receipts. */
let FileUploads = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _upload_decorators;
    return class FileUploads extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _upload_decorators = [Remote('upload')];
            __esDecorate(this, null, _upload_decorators, { kind: "method", name: "upload", static: false, private: false, access: { has: obj => "upload" in obj, get: obj => obj.upload }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['agents', 'attachments', 'commands', 'connection'];
        stagedFiles = (__runInitializers(this, _instanceExtraInitializers), new WeakMap());
        agentResolver;
        /** @param ctx - Host context carrying Agent, attachment, command, and Connection services. */
        constructor(ctx) {
            super(ctx, 'fileUploads');
            const resolve = (agent, receiptId) => this.resolve(agent, receiptId);
            ctx.effect(() => ctx.commands.registerFileReceiptResolver(resolve), 'file-upload: command file receipt resolver');
            ctx.effect(() => ctx.connection.fetch.register({
                path: FILE_UPLOAD_PATH,
                methods: ['POST'],
                requestBody: 'streaming',
                fetch: request => handleFileUploadHttp(this, request),
            }), 'file-upload: streaming route');
            ctx.on('session/event', (session, event) => { this.observeSessionEvent(session, event); });
            ctx.on('session/disposed', (session) => { this.stagedFiles.delete(session); });
        }
        /**
         * Register the ordinary-Session resolver used when a raw upload addresses a cold Session.
         * @param resolve - resolver that returns the exact live Agent or throws a Remote error.
         * @returns disposer removing this resolver.
         */
        registerAgentResolver(resolve) {
            if (this.agentResolver !== undefined)
                throw new Error('file-upload: Agent resolver is already registered');
            this.agentResolver = resolve;
            return () => {
                if (this.agentResolver === resolve)
                    this.agentResolver = undefined;
            };
        }
        /**
         * Persist one encoded upload and stage it under the Agent receiver selected by Typert.
         * @param agent - receiving Agent resolved from the Remote Agent scope.
         * @param request - canonical base64 bytes and optional display name.
         * @param signal - caller cancellation before storage begins.
         * @returns the staged receipt and durable file reference.
         */
        upload(agent, request, signal) {
            signal.throwIfAborted();
            return this.commit(agent, async () => this.ctx.attachments.admitEncodedFile({
                data: request.data,
                ...(request.name === undefined ? {} : { name: request.name }),
            }));
        }
        /**
         * Persist raw chunks for one Session without aggregating the upload.
         * @param request - Session identity, ordered bytes, cancellation, and optional display name.
         * @returns the staged receipt and durable file reference.
         */
        async uploadStream(request) {
            const agent = await this.resolveAgent(request.sessionId);
            return this.commit(agent, async () => this.ctx.attachments.saveFileStream({
                data: request.data,
                ...(request.signal === undefined ? {} : { signal: request.signal }),
                ...(request.name === undefined ? {} : { name: request.name }),
            }));
        }
        /**
         * Resolve one staged receipt inside its receiving Agent scope.
         * @param agent - receiving Agent.
         * @param receiptId - opaque receipt minted for one completed upload.
         * @returns durable file reference, or `undefined` for an unknown or foreign receipt.
         */
        resolve(agent, receiptId) {
            this.assertAgentScope(agent);
            return this.stagedFiles.get(agent.session)?.get(receiptId)?.file;
        }
        /**
         * Bind receipts while one prompt enters an Agent inbox.
         * Disposal restores every prior binding unless the caller commits successful delivery.
         * @param agent - receiving Agent.
         * @param receiptIds - distinct staged receipts referenced by the prompt.
         * @param requestId - prompt identity later observed in queue or history.
         * @returns binding kept after commit until queue or history observation retires its receipts.
         */
        bindPrompt(agent, receiptIds, requestId) {
            this.assertAgentScope(agent);
            const staged = this.stagedFiles.get(agent.session);
            const bound = receiptIds.map((receiptId) => {
                const upload = staged?.get(receiptId);
                if (upload === undefined)
                    throw fileNotStaged();
                return { upload, previous: upload.requestId };
            });
            for (const { upload } of bound)
                upload.requestId = requestId;
            return new PromptFileBindingGuard(() => {
                for (const { upload, previous } of bound) {
                    if (previous === undefined)
                        delete upload.requestId;
                    else
                        upload.requestId = previous;
                }
            });
        }
        /**
         * Retire every receipt accepted by one removed queue occurrence.
         * @param agent - receiving Agent.
         * @param requestId - prompt identity carried by the queue occurrence.
         */
        retirePrompt(agent, requestId) {
            this.assertAgentScope(agent);
            this.retire(agent.session, requestId);
        }
        async commit(agent, save) {
            this.assertOrdinaryAgent(agent);
            let file;
            try {
                file = await save();
            }
            catch (error) {
                if (this.ctx.attachments.isAttachmentError(error)) {
                    throw new RemoteError('session/attachment-invalid', error.message, { reason: error.code });
                }
                throw new RemoteError('gateway/internal', `failed to store file upload: ${String(error)}`, {}, { cause: error });
            }
            if (this.ctx.agents.get(agent.id) !== agent) {
                throw new RemoteError('session/not-found', `session "${agent.id}" was disposed before its file upload completed`, { sessionId: agent.id });
            }
            let staged = this.stagedFiles.get(agent.session);
            if (staged === undefined) {
                staged = new Map();
                this.stagedFiles.set(agent.session, staged);
            }
            const receiptId = randomUUID();
            staged.set(receiptId, { file });
            return { receiptId, file };
        }
        async resolveAgent(sessionId) {
            const live = this.ctx.agents.get(sessionId);
            if (live !== undefined)
                return live;
            const resolver = this.agentResolver;
            if (resolver === undefined) {
                throw new RemoteError('session/not-found', `session "${sessionId}" is not attached`, { sessionId });
            }
            return resolver(sessionId);
        }
        assertAgentScope(agent) {
            if (scopeOf(agent.ctx) !== agent)
                throw new Error('file-upload: operation requires the Agent\'s own scope');
        }
        assertOrdinaryAgent(agent) {
            this.assertAgentScope(agent);
            if (agent.session.header.origin === 'subagent') {
                throw new RemoteError('subagent/attachment-invalid', 'subagent conversations do not accept file uploads', { reason: 'SUBAGENT_FILE_UNSUPPORTED' });
            }
        }
        observeSessionEvent(session, event) {
            if (event.type !== 'user/message' || event.data.source.kind !== 'user'
                || !('rpcId' in event.data.source))
                return;
            if (typeof event.data.source.rpcId === 'string')
                this.retire(session, event.data.source.rpcId);
        }
        retire(session, requestId) {
            const staged = this.stagedFiles.get(session);
            if (staged === undefined)
                return;
            for (const [receiptId, upload] of staged) {
                if (upload.requestId === requestId)
                    staged.delete(receiptId);
            }
            if (staged.size === 0)
                this.stagedFiles.delete(session);
        }
    };
})();
export { FileUploads };
function fileNotStaged() {
    return new RemoteError('session/attachment-invalid', 'File was not uploaded for this session.', { reason: 'FILE_NOT_STAGED' });
}
export default FileUploads;
//# sourceMappingURL=index.js.map