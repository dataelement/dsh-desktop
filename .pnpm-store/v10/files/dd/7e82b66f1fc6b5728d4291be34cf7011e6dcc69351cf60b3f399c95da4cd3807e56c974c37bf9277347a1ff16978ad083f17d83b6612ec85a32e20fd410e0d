/**
 * Experimental TypeScript API for the draft ACP v2 protocol.
 *
 * @remarks
 * ACP v2 is still a draft. Its wire protocol and this API may change
 * incompatibly in any SDK release. The stable package entry point remains ACP
 * v1; consumers must opt in through
 * `@agentclientprotocol/sdk/experimental/v2`.
 *
 * @packageDocumentation
 * @experimental
 */
import * as schema from "./schema/index.js";
import * as validate from "./schema/zod.gen.js";
import * as guards from "./schema/guards.gen.js";
import { ndJsonStream as createJsonStream } from "../stream.js";
// Runtime narrowing helpers for extensible unions, exposed as companion values
// that merge (declaration merging) with the like-named types — e.g.
// `CreateElicitationResponse.isAccept(response)`. See schema/guards.gen.ts.
//
// Listed explicitly (not `export *`) so each value+type pair merges rather than
// colliding with the `export type *` above. The guards.gen re-export test
// asserts this list stays in sync as new extensible unions are added.
export { AuthMethod, AvailableCommandInput, ContentBlock, CreateElicitationRequest, CreateElicitationResponse, DiffChange, ElicitationPropertySchema, McpServer, MultiSelectItems, NesSuggestion, PlanUpdateContent, ReplayFrom, RequestPermissionOutcome, RequestPermissionSubject, SessionConfigOption, SessionUpdate, SetSessionConfigOptionRequest, StateUpdate, ToolCallContent, } from "./schema/guards.gen.js";
export { AGENT_METHODS, CLIENT_METHODS, PROTOCOL_METHODS, PROTOCOL_VERSION, } from "./schema/index.js";
/**
 * Creates an experimental draft ACP v2 stream from newline-delimited JSON.
 *
 * Individual and batch JSON-RPC messages are accepted by default.
 *
 * @experimental
 */
export function ndJsonStream(output, input) {
    return createJsonStream(output, input);
}
export { RequestError } from "../jsonrpc.js";
export { AgentProtocolRouter, agentProtocolRouter, } from "../protocol-router.js";
import { batchNotification as jsonRpcBatchNotification, batchRequest as jsonRpcBatchRequest, Connection, Handled, HandlerRegistration, requestBatchSize, RequestError, } from "../jsonrpc.js";
export function batchRequest(method, params, mapResponseOrOptions, options) {
    const request = typeof mapResponseOrOptions === "function"
        ? jsonRpcBatchRequest(method, params, mapResponseOrOptions, options)
        : jsonRpcBatchRequest(method, params, mapResponseOrOptions);
    return request;
}
export function batchNotification(method, params) {
    return jsonRpcBatchNotification(method, params);
}
function emptyObjectResponse(response) {
    return response ?? {};
}
const knownProtocolMethods = new Set([
    ...Object.values(schema.AGENT_METHODS),
    ...Object.values(schema.CLIENT_METHODS),
    ...Object.values(schema.PROTOCOL_METHODS),
]);
function assertV2MethodDirection(method, builtIns, kind, allowProtocolNotification = false) {
    if (Object.hasOwn(builtIns, method) ||
        (allowProtocolNotification &&
            method === schema.PROTOCOL_METHODS.cancel_request)) {
        return;
    }
    if (knownProtocolMethods.has(method)) {
        throw new TypeError(`ACP v2 ${kind} method '${method}' is not valid in this direction`);
    }
}
function assertUnrecognizedV2Method(method, kind) {
    if (knownProtocolMethods.has(method)) {
        throw new TypeError(`Cannot replace the built-in ACP v2 ${kind} parser for '${method}'`);
    }
}
function assertV2BatchMethods(entries, requestMethods, notificationMethods) {
    for (const entry of entries) {
        assertV2MethodDirection(entry.method, entry.kind === "request" ? requestMethods : notificationMethods, entry.kind, entry.kind === "notification");
    }
}
function parseV2InitializeRequest(params) {
    const request = validate.zInitializeRequest.parse(params);
    if (request.protocolVersion !== schema.PROTOCOL_VERSION) {
        throw RequestError.invalidParams({
            expectedProtocolVersion: schema.PROTOCOL_VERSION,
            receivedProtocolVersion: request.protocolVersion,
        }, `The v2 API only supports protocol version ${schema.PROTOCOL_VERSION}`);
    }
    return structuredClone(request);
}
function normalizeOutgoingV2InitializeRequest(params) {
    const request = typeof params === "object" && params !== null && !Array.isArray(params)
        ? params
        : {};
    return parseV2InitializeRequest({
        ...request,
        protocolVersion: schema.PROTOCOL_VERSION,
    });
}
function mapV2InitializeResponse(response) {
    const parsed = validate.zInitializeResponse.parse(response);
    if (parsed.protocolVersion !== schema.PROTOCOL_VERSION) {
        throw RequestError.invalidRequest({
            expectedProtocolVersion: schema.PROTOCOL_VERSION,
            receivedProtocolVersion: parsed.protocolVersion,
        }, `The v2 API only supports protocol version ${schema.PROTOCOL_VERSION}`);
    }
    return structuredClone(parsed);
}
function cloneInitialization(initialization) {
    return structuredClone(initialization);
}
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}
class InitializationState {
    phase = "uninitialized";
    request;
    barrier = deferred();
    constructor() {
        void this.barrier.promise.catch(() => { });
    }
    get status() {
        return this.phase;
    }
    get initialized() {
        return this.barrier.promise.then(cloneInitialization);
    }
    begin(request) {
        if (this.phase !== "uninitialized") {
            throw RequestError.invalidRequest("ACP v2 initialize may only be requested once per connection");
        }
        const requestSnapshot = structuredClone(request);
        this.request = requestSnapshot;
        this.phase = "initializing";
    }
    complete(response) {
        if (this.phase !== "initializing" || !this.request) {
            throw RequestError.invalidRequest("ACP v2 initialization is not in progress");
        }
        const initialization = {
            request: structuredClone(this.request),
            response: structuredClone(response),
        };
        this.phase = "initialized";
        this.barrier.resolve(initialization);
    }
    fail(error) {
        if (this.phase === "uninitialized" || this.phase === "initializing") {
            this.phase = "failed";
            this.request = undefined;
            this.barrier.reject(error ??
                RequestError.invalidRequest("ACP v2 connection initialization failed"));
        }
    }
    waitUntilInitialized(method) {
        if (this.phase === "initialized") {
            return Promise.resolve();
        }
        if (this.phase === "initializing") {
            return this.barrier.promise.then(() => { });
        }
        return Promise.reject(initializationUnavailable(method));
    }
}
const initializationStates = new WeakMap();
function initializationState(cx) {
    let state = initializationStates.get(cx);
    if (!state) {
        state = new InitializationState();
        initializationStates.set(cx, state);
        if (cx.signal.aborted) {
            state.fail(cx.signal.reason);
        }
        else {
            cx.signal.addEventListener("abort", () => state?.fail(cx.signal.reason), {
                once: true,
            });
        }
    }
    return state;
}
function initializationUnavailable(method) {
    return RequestError.invalidRequest(`ACP v2 connection must be initialized before '${method}'`);
}
async function blockUninitializedIncoming(message, state) {
    const error = initializationUnavailable(message.method);
    state.fail(error);
    return rejectIncoming(message, error);
}
async function rejectIncoming(message, error) {
    if (message.kind === "request") {
        await message.responder.respondWithError(error);
    }
    return Handled.yes();
}
function agentInitializationGuard() {
    return {
        async handleMessage(message, cx) {
            const state = initializationState(cx);
            if (message.kind === "notification" &&
                message.method === schema.PROTOCOL_METHODS.cancel_request) {
                return state.status === "initializing" || state.status === "initialized"
                    ? Handled.yes()
                    : blockUninitializedIncoming(message, state);
            }
            if (message.kind === "request" &&
                message.method === schema.AGENT_METHODS.initialize) {
                if (state.status !== "uninitialized") {
                    return rejectIncoming(message, RequestError.invalidRequest("ACP v2 initialize may only be requested once per connection"));
                }
                const batchSize = requestBatchSize(message.responder);
                if (batchSize !== undefined && batchSize !== 1) {
                    const error = RequestError.invalidRequest("ACP v2 initialize must be the only entry in its batch");
                    state.fail(error);
                    return rejectIncoming(message, error);
                }
                let request;
                try {
                    request = parseV2InitializeRequest(message.params);
                }
                catch (error) {
                    state.fail(error);
                    throw error;
                }
                state.begin(request);
                return Handled.no(message);
            }
            if (state.status === "initialized") {
                return Handled.no(message);
            }
            if (state.status === "initializing") {
                await state.waitUntilInitialized(message.method);
                return Handled.no(message);
            }
            return blockUninitializedIncoming(message, state);
        },
        describe: () => "agent-initialization",
    };
}
function clientInitializationGuard() {
    return {
        async handleMessage(message, cx) {
            const state = initializationState(cx);
            if (message.kind === "notification" &&
                message.method === schema.PROTOCOL_METHODS.cancel_request) {
                return state.status === "initializing" || state.status === "initialized"
                    ? Handled.yes()
                    : blockUninitializedIncoming(message, state);
            }
            if (state.status === "initialized") {
                return Handled.no(message);
            }
            if (state.status === "initializing") {
                await state.waitUntilInitialized(message.method);
                return Handled.no(message);
            }
            return blockUninitializedIncoming(message, state);
        },
        describe: () => "client-initialization",
    };
}
function parseRequestResponse(spec, response) {
    return parseParams(spec.response, response);
}
function normalizeV2Batch(entries, requestSpecs, onInitializeResponse) {
    return entries.map((entry) => {
        if (entry.kind !== "request") {
            return entry;
        }
        const spec = requestSpecs[entry.method];
        const mapResponse = entry.mapResponse;
        return {
            ...entry,
            mapResponse: spec
                ? (response) => {
                    const parsed = parseRequestResponse(spec, response);
                    if (onInitializeResponse &&
                        entry.method === schema.AGENT_METHODS.initialize) {
                        onInitializeResponse(parsed);
                    }
                    return mapResponse ? mapResponse(parsed) : parsed;
                }
                : mapResponse,
        };
    });
}
function isStream(value) {
    return (typeof value === "object" &&
        value !== null &&
        "readable" in value &&
        "writable" in value);
}
function memoryStreamPair() {
    const leftToRight = new TransformStream();
    const rightToLeft = new TransformStream();
    return [
        {
            readable: rightToLeft.readable,
            writable: leftToRight.writable,
        },
        {
            readable: leftToRight.readable,
            writable: rightToLeft.writable,
        },
    ];
}
/**
 * ACP method-name constants for the experimental draft v2 API.
 *
 * Use these with `onRequest(...)`, `onNotification(...)`, `request(...)`, and
 * `notify(...)` when you want literal-string type inference without spelling
 * protocol strings inline.
 *
 * @experimental
 */
export const methods = {
    agent: {
        initialize: schema.AGENT_METHODS.initialize,
        auth: {
            login: schema.AGENT_METHODS.auth_login,
            logout: schema.AGENT_METHODS.auth_logout,
        },
        providers: {
            list: schema.AGENT_METHODS.providers_list,
            set: schema.AGENT_METHODS.providers_set,
            disable: schema.AGENT_METHODS.providers_disable,
        },
        session: {
            new: schema.AGENT_METHODS.session_new,
            list: schema.AGENT_METHODS.session_list,
            delete: schema.AGENT_METHODS.session_delete,
            fork: schema.AGENT_METHODS.session_fork,
            resume: schema.AGENT_METHODS.session_resume,
            close: schema.AGENT_METHODS.session_close,
            setConfigOption: schema.AGENT_METHODS.session_set_config_option,
            prompt: schema.AGENT_METHODS.session_prompt,
            cancel: schema.AGENT_METHODS.session_cancel,
        },
        mcp: {
            message: schema.AGENT_METHODS.mcp_message,
        },
        nes: {
            start: schema.AGENT_METHODS.nes_start,
            suggest: schema.AGENT_METHODS.nes_suggest,
            accept: schema.AGENT_METHODS.nes_accept,
            reject: schema.AGENT_METHODS.nes_reject,
            close: schema.AGENT_METHODS.nes_close,
        },
        document: {
            didOpen: schema.AGENT_METHODS.document_did_open,
            didChange: schema.AGENT_METHODS.document_did_change,
            didClose: schema.AGENT_METHODS.document_did_close,
            didSave: schema.AGENT_METHODS.document_did_save,
            didFocus: schema.AGENT_METHODS.document_did_focus,
        },
    },
    client: {
        session: {
            requestPermission: schema.CLIENT_METHODS.session_request_permission,
            update: schema.CLIENT_METHODS.session_update,
        },
        mcp: {
            connect: schema.CLIENT_METHODS.mcp_connect,
            message: schema.CLIENT_METHODS.mcp_message,
            disconnect: schema.CLIENT_METHODS.mcp_disconnect,
        },
        elicitation: {
            create: schema.CLIENT_METHODS.elicitation_create,
            complete: schema.CLIENT_METHODS.elicitation_complete,
        },
    },
    protocol: {
        cancelRequest: schema.PROTOCOL_METHODS.cancel_request,
    },
};
const startActiveSession = Symbol("startActiveSession");
class AcpContext {
    cx;
    currentRequestId;
    /** @internal */
    constructor(cx, currentRequestId) {
        this.cx = cx;
        this.currentRequestId = currentRequestId;
    }
    /**
     * Validated initialize exchange, once this connection is initialized.
     */
    get initialized() {
        return initializationState(this.cx).initialized;
    }
    /** @internal */
    get initializationLifecycle() {
        return initializationState(this.cx);
    }
    /**
     * JSON-RPC id of the request currently being handled.
     *
     * This is `undefined` for notification handlers and for contexts created
     * outside an inbound request, such as `connect(...)` and `connectWith(...)`.
     */
    get requestId() {
        return this.currentRequestId;
    }
    /** @internal */
    get connectionContext() {
        return this.cx;
    }
    /** @internal */
    sendRequest(method, params, mapResponse, options) {
        return this.cx.sendRequest(method, params, mapResponse, options);
    }
    /** @internal */
    sendNotification(method, params) {
        return this.cx.sendNotification(method, params);
    }
    /** @internal */
    sendBatch(entries) {
        return this.cx.sendBatch(entries);
    }
    /** @internal */
    addDynamicHandler(handler) {
        return this.cx.addDynamicHandler(handler);
    }
}
/**
 * Experimental draft ACP v2 context passed to agent-side handlers.
 *
 * Agents use this context to call client-side ACP methods while handling
 * requests such as `session/prompt`.
 *
 * @experimental
 */
export class AgentContext extends AcpContext {
    constructor(cx, requestId) {
        super(cx, requestId);
    }
    /** @internal */
    static create(cx, requestId) {
        return new AgentContext(cx, requestId);
    }
    request(method, params, options) {
        assertV2MethodDirection(method, clientRequestSpecsByMethod, "request");
        const spec = clientRequestSpecsByMethod[method];
        return this.initializationLifecycle
            .waitUntilInitialized(method)
            .then(() => this.sendRequest(method, params, spec ? (response) => parseRequestResponse(spec, response) : undefined, options));
    }
    notify(method, params) {
        assertV2MethodDirection(method, clientNotificationSpecsByMethod, "notification", true);
        return this.initializationLifecycle
            .waitUntilInitialized(method)
            .then(() => this.sendNotification(method, params));
    }
    /**
     * Sends requests and notifications to the client as one JSON-RPC batch.
     */
    batch(entries) {
        assertV2BatchMethods(entries, clientRequestSpecsByMethod, clientNotificationSpecsByMethod);
        return this.initializationLifecycle
            .waitUntilInitialized("batch")
            .then(() => this.sendBatch(normalizeV2Batch(entries, clientRequestSpecsByMethod)));
    }
}
/**
 * Experimental draft ACP v2 context used by clients to call agent-side ACP
 * methods.
 *
 * `connectWith` passes a `ClientContext` to the callback. Client handlers also
 * receive one as `ctx.agent` when they need to call back into the agent.
 *
 * @experimental
 */
export class ClientContext extends AcpContext {
    closeOnInitializationFailure;
    constructor(cx, requestId, closeOnInitializationFailure) {
        super(cx, requestId);
        this.closeOnInitializationFailure = closeOnInitializationFailure;
    }
    /** @internal */
    static create(cx, requestId, closeOnInitializationFailure) {
        return new ClientContext(cx, requestId, closeOnInitializationFailure);
    }
    /** @internal */
    [startActiveSession](params, options) {
        return this.request(schema.AGENT_METHODS.session_new, params, options).then((response) => this.attachSession(response));
    }
    buildSession(cwdOrRequest) {
        if (typeof cwdOrRequest === "string") {
            return SessionBuilder.create(this, {
                cwd: cwdOrRequest,
                mcpServers: [],
            });
        }
        return SessionBuilder.create(this, cwdOrRequest);
    }
    /**
     * Builds active-session helpers around a `session/new` response.
     */
    attachSession(response) {
        const updates = new AsyncQueue();
        const activePrompts = new Set();
        const activeSessionQueue = {
            enqueue: (value) => updates.enqueue(value),
            reject: (error) => updates.reject(error),
            clearErrors: () => updates.clearErrors(),
            fail: (error) => updates.fail(error),
            next: () => updates.next(),
            nextAfter: (cursor, signal) => updates.nextAfter(cursor, signal),
            beginPrompt: () => {
                const prompt = {
                    updateCursor: updates.cursor(),
                    overlapController: new AbortController(),
                };
                if (activePrompts.size > 0) {
                    const error = new Error("readText() cannot attribute updates across overlapping prompts; use nextUpdate() instead");
                    for (const activePrompt of activePrompts) {
                        activePrompt.overlapController.abort(error);
                    }
                    prompt.overlapController.abort(error);
                }
                activePrompts.add(prompt);
                return prompt;
            },
            cancelPrompt: (prompt) => activePrompts.delete(prompt),
            isAwaitingPromptCompletion: () => activePrompts.size > 0,
            completePrompt: () => {
                activePrompts.clear();
            },
        };
        const closeSignal = this.connectionContext.signal;
        const failUpdatesOnClose = () => {
            updates.fail(closeSignal.reason ?? new Error("ACP connection closed"));
        };
        if (closeSignal.aborted) {
            failUpdatesOnClose();
        }
        else {
            closeSignal.addEventListener("abort", failUpdatesOnClose);
        }
        const sessionRegistration = sessionUpdateRouter(this.connectionContext).attach(response, activeSessionQueue);
        const closeRegistration = new HandlerRegistration(() => {
            closeSignal.removeEventListener("abort", failUpdatesOnClose);
        });
        return ActiveSession.create(this, response, activeSessionQueue, [
            sessionRegistration,
            closeRegistration,
        ]);
    }
    request(method, params, options) {
        assertV2MethodDirection(method, agentRequestSpecsByMethod, "request");
        const spec = agentRequestSpecsByMethod[method];
        const state = this.initializationLifecycle;
        if (method === schema.AGENT_METHODS.initialize) {
            const request = normalizeOutgoingV2InitializeRequest(params);
            state.begin(request);
            let response;
            try {
                response = this.sendRequest(method, request, (value) => {
                    const parsed = parseRequestResponse(spec, value);
                    state.complete(parsed);
                    return parsed;
                }, options);
            }
            catch (error) {
                state.fail(error);
                this.closeOnInitializationFailure?.(error);
                throw error;
            }
            void response.catch((error) => {
                if (state.status !== "initialized") {
                    state.fail(error);
                    this.closeOnInitializationFailure?.(error);
                }
            });
            return response;
        }
        return state
            .waitUntilInitialized(method)
            .then(() => this.sendRequest(method, params, spec ? (response) => parseRequestResponse(spec, response) : undefined, options));
    }
    notify(method, params) {
        assertV2MethodDirection(method, agentNotificationSpecsByMethod, "notification", true);
        return this.initializationLifecycle
            .waitUntilInitialized(method)
            .then(() => this.sendNotification(method, params));
    }
    /**
     * Sends requests and notifications to the agent as one JSON-RPC batch.
     */
    batch(entries) {
        assertV2BatchMethods(entries, agentRequestSpecsByMethod, agentNotificationSpecsByMethod);
        const initializeEntries = entries.filter((entry) => entry.kind === "request" &&
            entry.method === schema.AGENT_METHODS.initialize);
        if (initializeEntries.length > 0) {
            if (entries.length !== 1 || initializeEntries.length !== 1) {
                return Promise.reject(RequestError.invalidRequest("ACP v2 initialize must be the only entry in its batch"));
            }
            const state = this.initializationLifecycle;
            const request = normalizeOutgoingV2InitializeRequest(initializeEntries[0].params);
            state.begin(request);
            const normalizedEntries = [
                { ...initializeEntries[0], params: request },
            ];
            let response;
            try {
                response = this.sendBatch(normalizeV2Batch(normalizedEntries, agentRequestSpecsByMethod, (value) => state.complete(value)));
            }
            catch (error) {
                state.fail(error);
                this.closeOnInitializationFailure?.(error);
                throw error;
            }
            void response.catch((error) => {
                if (state.status !== "initialized") {
                    state.fail(error);
                    this.closeOnInitializationFailure?.(error);
                }
            });
            return response;
        }
        return this.initializationLifecycle
            .waitUntilInitialized("batch")
            .then(() => this.sendBatch(normalizeV2Batch(entries, agentRequestSpecsByMethod)));
    }
}
class AcpConnectionHandle {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    get initialized() {
        return initializationState(this.connection.getContext()).initialized;
    }
    get signal() {
        return this.connection.signal;
    }
    get closed() {
        return this.connection.closed;
    }
    close(error) {
        this.connection.close(error);
    }
}
class AgentConnectionHandle extends AcpConnectionHandle {
    connectHandlers;
    client;
    didStartConnectHandlers = false;
    constructor(connection, connectHandlers = []) {
        super(connection);
        this.connectHandlers = connectHandlers;
        this.client = AgentContext.create(connection.getContext());
    }
    /** @internal */
    startConnectHandlers() {
        if (this.didStartConnectHandlers) {
            return;
        }
        this.didStartConnectHandlers = true;
        runConnectHandlers(this, this.connectHandlers);
    }
}
class ClientConnectionHandle extends AcpConnectionHandle {
    connectHandlers;
    agent;
    didStartConnectHandlers = false;
    constructor(connection, connectHandlers = []) {
        super(connection);
        this.connectHandlers = connectHandlers;
        this.agent = ClientContext.create(connection.getContext(), undefined, (error) => connection.close(error));
    }
    /** @internal */
    startConnectHandlers() {
        if (this.didStartConnectHandlers) {
            return;
        }
        this.didStartConnectHandlers = true;
        runConnectHandlers(this, this.connectHandlers);
    }
}
function agentConnection(connection, connectHandlers = []) {
    return new AgentConnectionHandle(connection, connectHandlers);
}
function clientConnection(connection, connectHandlers = []) {
    return new ClientConnectionHandle(connection, connectHandlers);
}
class AsyncQueue {
    values = [];
    waiters = [];
    failed = false;
    failure;
    nextSequence = 0;
    enqueue(value) {
        if (this.failed) {
            return;
        }
        const sequence = this.nextSequence++;
        const waiter = this.waiters.shift();
        if (waiter) {
            waiter.resolve(value);
        }
        else {
            this.values.push({ kind: "value", value, sequence });
        }
    }
    reject(error) {
        if (this.failed) {
            return;
        }
        const sequence = this.nextSequence++;
        if (this.waiters.length > 0) {
            for (const waiter of this.waiters.splice(0)) {
                waiter.reject(error);
            }
            return;
        }
        this.values.push({ kind: "error", error, sequence });
    }
    clearErrors() {
        this.values = this.values.filter((entry) => entry.kind === "value");
    }
    cursor() {
        return this.nextSequence;
    }
    nextAfter(cursor, signal) {
        if (signal?.aborted) {
            return Promise.reject(signal.reason);
        }
        while (this.values[0] && this.values[0].sequence < cursor) {
            this.values.shift();
        }
        return this.next(signal);
    }
    fail(error) {
        if (this.failed) {
            return;
        }
        this.failed = true;
        this.failure = error;
        for (const waiter of this.waiters.splice(0)) {
            waiter.reject(error);
        }
    }
    next(signal) {
        if (signal?.aborted) {
            return Promise.reject(signal.reason);
        }
        if (this.values.length > 0) {
            const entry = this.values.shift();
            if (entry.kind === "error") {
                return Promise.reject(entry.error);
            }
            return Promise.resolve(entry.value);
        }
        if (this.failed) {
            return Promise.reject(this.failure);
        }
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                signal?.removeEventListener("abort", onAbort);
            };
            const waiter = {
                resolve: (value) => {
                    cleanup();
                    resolve(value);
                },
                reject: (error) => {
                    cleanup();
                    reject(error);
                },
            };
            const onAbort = () => {
                const index = this.waiters.indexOf(waiter);
                if (index >= 0) {
                    this.waiters.splice(index, 1);
                }
                waiter.reject(signal?.reason);
            };
            this.waiters.push(waiter);
            signal?.addEventListener("abort", onAbort, { once: true });
            if (signal?.aborted) {
                onAbort();
            }
        });
    }
}
function cloneNewSessionRequest(request) {
    return structuredClone(request);
}
/**
 * Experimental draft ACP v2 builder for creating an `ActiveSession`.
 *
 * Start from `ctx.buildSession("/absolute/cwd")` for the common case, or
 * pass a full `NewSessionRequest` to `ctx.buildSession(...)` when the session
 * needs MCP servers, `_meta`, or additional request fields. All paths in ACP
 * payloads should be absolute.
 *
 * @experimental
 */
export class SessionBuilder {
    cx;
    request;
    constructor(cx, request) {
        this.cx = cx;
        this.request = cloneNewSessionRequest(request);
    }
    /** @internal */
    static create(cx, request) {
        return new SessionBuilder(cx, request);
    }
    /**
     * Returns the `session/new` request that will be sent.
     *
     * The returned object is a defensive copy, so mutating it does not change the
     * builder.
     */
    toRequest() {
        return cloneNewSessionRequest(this.request);
    }
    /**
     * Replaces the additional workspace roots for this session.
     *
     * `additionalDirectories` expand the session's file-system scope without
     * changing `cwd`. Each path should be absolute.
     */
    withAdditionalDirectories(additionalDirectories) {
        this.request = {
            ...this.request,
            additionalDirectories: [...additionalDirectories],
        };
        return this;
    }
    /**
     * Adds one MCP server to the `session/new` request.
     */
    withMcpServer(mcpServer) {
        this.request = {
            ...this.request,
            mcpServers: [
                ...(this.request.mcpServers ?? []),
                structuredClone(mcpServer),
            ],
        };
        return this;
    }
    /**
     * Starts the session and returns an `ActiveSession` for prompting and reading
     * updates.
     *
     * Call `dispose()` on the returned session when you no longer need update
     * routing, or use `withSession(...)` to scope disposal automatically.
     */
    async start(options) {
        return this.cx[startActiveSession](this.toRequest(), options);
    }
    /**
     * Starts the session, runs `op`, and disposes the active-session update
     * routing when `op` finishes or throws.
     */
    async withSession(op) {
        const session = await this.start();
        try {
            return await op(session);
        }
        finally {
            session.dispose();
        }
    }
}
/**
 * Experimental draft ACP v2 convenience wrapper for an active session.
 *
 * An active session routes `session/update` notifications for one session ID
 * into an async queue. Use `prompt(...)` to send user content, then read updates
 * with `nextUpdate()` until a `stop` message is returned.
 *
 * @experimental
 */
export class ActiveSession {
    cx;
    sessionResponse;
    updates;
    registrations;
    latestPrompt;
    constructor(cx, sessionResponse, updates, registrations) {
        this.cx = cx;
        this.sessionResponse = sessionResponse;
        this.updates = updates;
        this.registrations = registrations;
    }
    /** @internal */
    static create(cx, sessionResponse, updates, registrations) {
        return new ActiveSession(cx, sessionResponse, updates, registrations);
    }
    /**
     * Session ID returned by `session/new`.
     */
    get sessionId() {
        return this.sessionResponse.sessionId;
    }
    /**
     * Configuration options returned when the session was created, if provided.
     */
    get configOptions() {
        return this.sessionResponse.configOptions;
    }
    /**
     * Metadata returned when the session was created.
     */
    get meta() {
        return this.sessionResponse._meta;
    }
    /**
     * Full response returned by `session/new`.
     */
    get newSessionResponse() {
        return this.sessionResponse;
    }
    /**
     * Sends a prompt to this session.
     *
     * Strings are converted to one text content block. A single content block is
     * wrapped in an array. The returned promise resolves when the agent accepts
     * the prompt. Completion is reported separately by an idle `state_update`,
     * which is queued as a `stop` message for `nextUpdate()`.
     */
    prompt(prompt, options) {
        this.updates.clearErrors();
        const activePrompt = this.updates.beginPrompt();
        this.latestPrompt = activePrompt;
        const response = this.cx.request(schema.AGENT_METHODS.session_prompt, {
            sessionId: this.sessionId,
            prompt: this.promptBlocks(prompt),
        }, options);
        void response.catch((error) => {
            if (this.updates.cancelPrompt(activePrompt)) {
                this.updates.reject(error);
            }
        });
        return response;
    }
    /**
     * Reads the next update or stop message for this session.
     */
    nextUpdate() {
        return this.updates.next();
    }
    /**
     * Reads agent text until the current prompt turn stops.
     *
     * Updates queued before the most recent call to `prompt(...)` are skipped.
     * Call prompts serially, after the preceding turn reports `stop`: session
     * updates do not carry a prompt ID and cannot be attributed across overlapping
     * prompt requests. Use `nextUpdate()` when coordinating requests directly.
     *
     * Full `agent_message` updates replace content for their `messageId`, while
     * `agent_message_chunk` updates append to it. Non-text content and other
     * update types are ignored; use `nextUpdate()` when you need them.
     */
    async readText() {
        const activePrompt = this.latestPrompt;
        const updateCursor = activePrompt?.updateCursor;
        const messageOrder = [];
        const messageContent = new Map();
        const ensureMessage = (messageId) => {
            let content = messageContent.get(messageId);
            if (!content) {
                content = [];
                messageOrder.push(messageId);
                messageContent.set(messageId, content);
            }
            return content;
        };
        for (;;) {
            const message = updateCursor === undefined
                ? await this.nextUpdate()
                : await this.updates.nextAfter(updateCursor, activePrompt?.overlapController.signal);
            if (message.kind === "stop") {
                return messageOrder
                    .flatMap((messageId) => messageContent.get(messageId) ?? [])
                    .filter(guards.ContentBlock.isText)
                    .map((content) => content.text)
                    .join("");
            }
            const { update } = message;
            if (guards.SessionUpdate.isAgentMessage(update)) {
                ensureMessage(update.messageId);
                if (update.content !== undefined) {
                    messageContent.set(update.messageId, update.content ?? []);
                }
            }
            else if (guards.SessionUpdate.isAgentMessageChunk(update)) {
                ensureMessage(update.messageId).push(update.content);
            }
        }
    }
    /**
     * Stops routing updates to this active-session helper.
     *
     * This does not close the ACP session on the agent. Use `ClientContext`
     * session lifecycle methods when the protocol session itself should be closed
     * or deleted.
     */
    dispose() {
        for (const registration of this.registrations.splice(0)) {
            registration.dispose();
        }
        this.updates.fail(new Error("Active session disposed"));
    }
    /**
     * Supports explicit resource management with `using`.
     */
    [Symbol.dispose]() {
        this.dispose();
    }
    promptBlocks(prompt) {
        if (typeof prompt === "string") {
            return [{ type: "text", text: prompt }];
        }
        if (Array.isArray(prompt)) {
            return prompt;
        }
        return [prompt];
    }
}
function parseParams(parser, params) {
    if (!parser) {
        return params;
    }
    if (typeof parser === "function") {
        return parser(params);
    }
    return parser.parse(params);
}
function requestSpec(method, params, response, serializeResponse) {
    return { method, params, response, serializeResponse };
}
function notificationSpec(method, params) {
    return { method, params };
}
function registerAppRequest(builder, spec, context, handler, lifecycle) {
    builder.onReceiveRequest(spec.method, (params) => parseParams(spec.params, params), async (params, responder, cx) => {
        try {
            const response = await handler(context(params, cx, responder.signal, responder.id));
            const sentResponse = spec.serializeResponse
                ? spec.serializeResponse(response)
                : response;
            await responder.respond(sentResponse);
            lifecycle?.afterResponse(params, sentResponse, cx);
        }
        catch (error) {
            lifecycle?.onError(cx, error);
            throw error;
        }
    });
}
function registerAppNotification(builder, spec, context, handler) {
    builder.onReceiveNotification(spec.method, (params) => parseParams(spec.params, params), (params, cx) => handler(context(params, cx, cx.signal)));
}
function specsByMethod(specs) {
    const byMethod = Object.create(null);
    for (const spec of Object.values(specs)) {
        byMethod[spec.method] = spec;
    }
    return byMethod;
}
const agentRequestSpecs = {
    initialize: requestSpec(schema.AGENT_METHODS.initialize, parseV2InitializeRequest, mapV2InitializeResponse, mapV2InitializeResponse),
    loginAuth: requestSpec(schema.AGENT_METHODS.auth_login, validate.zLoginAuthRequest, validate.zLoginAuthResponse, emptyObjectResponse),
    unstable_listProviders: requestSpec(schema.AGENT_METHODS.providers_list, validate.zListProvidersRequest, validate.zListProvidersResponse),
    unstable_setProvider: requestSpec(schema.AGENT_METHODS.providers_set, validate.zSetProviderRequest, validate.zSetProviderResponse, emptyObjectResponse),
    unstable_disableProvider: requestSpec(schema.AGENT_METHODS.providers_disable, validate.zDisableProviderRequest, validate.zDisableProviderResponse, emptyObjectResponse),
    newSession: requestSpec(schema.AGENT_METHODS.session_new, validate.zNewSessionRequest, validate.zNewSessionResponse),
    setSessionConfigOption: requestSpec(schema.AGENT_METHODS.session_set_config_option, validate.zSetSessionConfigOptionRequest, validate.zSetSessionConfigOptionResponse),
    prompt: requestSpec(schema.AGENT_METHODS.session_prompt, validate.zPromptRequest, validate.zPromptResponse, emptyObjectResponse),
    unstable_messageMcp: requestSpec(schema.AGENT_METHODS.mcp_message, validate.zMessageMcpRequest, validate.zMessageMcpResponse),
    listSessions: requestSpec(schema.AGENT_METHODS.session_list, validate.zListSessionsRequest, validate.zListSessionsResponse),
    deleteSession: requestSpec(schema.AGENT_METHODS.session_delete, validate.zDeleteSessionRequest, validate.zDeleteSessionResponse, emptyObjectResponse),
    unstable_forkSession: requestSpec(schema.AGENT_METHODS.session_fork, validate.zForkSessionRequest, validate.zForkSessionResponse),
    resumeSession: requestSpec(schema.AGENT_METHODS.session_resume, validate.zResumeSessionRequest, validate.zResumeSessionResponse),
    closeSession: requestSpec(schema.AGENT_METHODS.session_close, validate.zCloseSessionRequest, validate.zCloseSessionResponse, emptyObjectResponse),
    logoutAuth: requestSpec(schema.AGENT_METHODS.auth_logout, validate.zLogoutAuthRequest, validate.zLogoutAuthResponse, emptyObjectResponse),
    unstable_startNes: requestSpec(schema.AGENT_METHODS.nes_start, validate.zStartNesRequest, validate.zStartNesResponse),
    unstable_suggestNes: requestSpec(schema.AGENT_METHODS.nes_suggest, validate.zSuggestNesRequest, validate.zSuggestNesResponse),
    unstable_closeNes: requestSpec(schema.AGENT_METHODS.nes_close, validate.zCloseNesRequest, validate.zCloseNesResponse, emptyObjectResponse),
};
const agentNotificationSpecs = {
    cancelSession: notificationSpec(schema.AGENT_METHODS.session_cancel, validate.zCancelSessionNotification),
    unstable_messageMcp: notificationSpec(schema.AGENT_METHODS.mcp_message, validate.zMessageMcpNotification),
    unstable_didOpenDocument: notificationSpec(schema.AGENT_METHODS.document_did_open, validate.zDidOpenDocumentNotification),
    unstable_didChangeDocument: notificationSpec(schema.AGENT_METHODS.document_did_change, validate.zDidChangeDocumentNotification),
    unstable_didCloseDocument: notificationSpec(schema.AGENT_METHODS.document_did_close, validate.zDidCloseDocumentNotification),
    unstable_didSaveDocument: notificationSpec(schema.AGENT_METHODS.document_did_save, validate.zDidSaveDocumentNotification),
    unstable_didFocusDocument: notificationSpec(schema.AGENT_METHODS.document_did_focus, validate.zDidFocusDocumentNotification),
    unstable_acceptNes: notificationSpec(schema.AGENT_METHODS.nes_accept, validate.zAcceptNesNotification),
    unstable_rejectNes: notificationSpec(schema.AGENT_METHODS.nes_reject, validate.zRejectNesNotification),
};
const clientRequestSpecs = {
    requestPermission: requestSpec(schema.CLIENT_METHODS.session_request_permission, validate.zRequestPermissionRequest, validate.zRequestPermissionResponse),
    unstable_connectMcp: requestSpec(schema.CLIENT_METHODS.mcp_connect, validate.zConnectMcpRequest, validate.zConnectMcpResponse),
    unstable_messageMcp: requestSpec(schema.CLIENT_METHODS.mcp_message, validate.zMessageMcpRequest, validate.zMessageMcpResponse),
    unstable_disconnectMcp: requestSpec(schema.CLIENT_METHODS.mcp_disconnect, validate.zDisconnectMcpRequest, validate.zDisconnectMcpResponse, emptyObjectResponse),
    createElicitation: requestSpec(schema.CLIENT_METHODS.elicitation_create, validate.zCreateElicitationRequest, validate.zCreateElicitationResponse),
};
const clientNotificationSpecs = {
    sessionUpdate: notificationSpec(schema.CLIENT_METHODS.session_update, validate.zUpdateSessionNotification),
    unstable_messageMcp: notificationSpec(schema.CLIENT_METHODS.mcp_message, validate.zMessageMcpNotification),
    completeElicitation: notificationSpec(schema.CLIENT_METHODS.elicitation_complete, validate.zCompleteElicitationNotification),
};
const agentRequestSpecsByMethod = specsByMethod(agentRequestSpecs);
const agentNotificationSpecsByMethod = specsByMethod(agentNotificationSpecs);
const clientRequestSpecsByMethod = specsByMethod(clientRequestSpecs);
const clientNotificationSpecsByMethod = specsByMethod(clientNotificationSpecs);
function agentRequestContext(params, client, signal, requestId) {
    return {
        params,
        requestId,
        signal,
        client,
    };
}
function agentNotificationContext(params, client, signal) {
    return {
        params,
        signal,
        client,
    };
}
function clientRequestContext(params, agent, signal, requestId) {
    return {
        params,
        requestId,
        signal,
        agent,
    };
}
function clientNotificationContext(params, agent, signal) {
    return {
        params,
        signal,
        agent,
    };
}
class SessionUpdateRouter {
    activeSessions = new Map();
    handleMessage(message) {
        if (message.kind !== "notification" ||
            message.method !== schema.CLIENT_METHODS.session_update) {
            return Handled.no(message);
        }
        const notification = validate.zUpdateSessionNotification.parse(message.params);
        const { update } = notification;
        const isIdle = guards.SessionUpdate.isStateUpdate(update) &&
            guards.StateUpdate.isIdle(update);
        const activeSessions = this.activeSessions.get(notification.sessionId);
        if (activeSessions && activeSessions.size > 0) {
            for (const session of activeSessions) {
                if (isIdle && session.isAwaitingPromptCompletion()) {
                    session.completePrompt();
                    session.enqueue({
                        kind: "stop",
                        notification,
                        update,
                        stopReason: update.stopReason,
                    });
                }
                else {
                    session.enqueue({
                        kind: "session_update",
                        notification,
                        update,
                    });
                }
            }
        }
        return Handled.no(message);
    }
    attach(response, updates) {
        const sessions = this.activeSessions.get(response.sessionId) ??
            new Set();
        sessions.add(updates);
        this.activeSessions.set(response.sessionId, sessions);
        return new HandlerRegistration(() => {
            sessions.delete(updates);
            if (sessions.size === 0) {
                this.activeSessions.delete(response.sessionId);
            }
        });
    }
}
const sessionUpdateRouters = new WeakMap();
function sessionUpdateRouter(cx) {
    let router = sessionUpdateRouters.get(cx);
    if (!router) {
        router = new SessionUpdateRouter();
        sessionUpdateRouters.set(cx, router);
    }
    return router;
}
function runConnectHandlers(connection, handlers) {
    for (const handler of handlers) {
        let result;
        try {
            result = handler(connection);
        }
        catch (error) {
            connection.close(error);
            throw error;
        }
        void Promise.resolve(result).catch((error) => {
            connection.close(error);
        });
    }
}
const appBuilder = Symbol("appBuilder");
const runAgentConnectHandlers = Symbol("runAgentConnectHandlers");
const runClientConnectHandlers = Symbol("runClientConnectHandlers");
function bridgeConnectionClose(source, peer) {
    void source.closed.then(async () => {
        if (initializationState(source.getContext()).status === "initialized") {
            await peer.initialized.catch(() => { });
        }
        peer.close(source.signal.reason);
    });
}
/**
 * Creates an agent-side app for the experimental draft ACP v2 API.
 *
 * Register request and notification handlers by ACP method name, then call
 * `connect(stream)` to serve an ACP client.
 *
 * @experimental
 */
export function agent(options) {
    return new AgentApp(options);
}
/**
 * Agent-side app builder for the experimental draft ACP v2 API.
 *
 * Methods on this class register typed request or notification handlers and
 * return `this`, so apps can be built with a fluent chain. Handler params are
 * parsed with the generated ACP schemas before your handler runs, and thrown
 * errors are converted to JSON-RPC errors by the connection layer.
 *
 * @experimental
 */
export class AgentApp {
    builder = Connection.builder();
    connectHandlers = [];
    hasInitializeHandler = false;
    constructor(options = {}) {
        this.builder.withHandler(agentInitializationGuard());
        if (options.name) {
            this.builder.name(options.name);
        }
    }
    /** @internal */
    [appBuilder]() {
        this.assertInitializeHandler();
        return this.builder;
    }
    /** @internal */
    [runAgentConnectHandlers](connection) {
        runConnectHandlers(connection, this.connectHandlers);
    }
    connect(target, options = {}) {
        return this.connectConnection(target, options).connection;
    }
    connectWith(target, op) {
        const { rawConnection, connection } = this.connectConnection(target);
        return rawConnection.runUntil(() => op(connection.client));
    }
    /**
     * Registers a handler that runs when this agent app opens a connection.
     *
     * Use this for connection-scoped work that needs to call client-side ACP
     * methods outside an inbound request handler.
     */
    onConnect(handler) {
        this.connectHandlers.push(handler);
        return this;
    }
    onRequest(method, handlerOrParams, handler) {
        if (handler) {
            assertUnrecognizedV2Method(method, "request");
            return this.request({ method, params: handlerOrParams }, handler);
        }
        const spec = agentRequestSpecsByMethod[method];
        if (!spec) {
            throw new Error(`Unknown ACP request method '${method}'. Pass a params parser for custom methods.`);
        }
        if (method === schema.AGENT_METHODS.initialize) {
            this.hasInitializeHandler = true;
        }
        return this.request(spec, handlerOrParams);
    }
    onNotification(method, handlerOrParams, handler) {
        if (handler) {
            assertUnrecognizedV2Method(method, "notification");
            return this.notification({ method, params: handlerOrParams }, handler);
        }
        const spec = agentNotificationSpecsByMethod[method];
        if (!spec) {
            throw new Error(`Unknown ACP notification method '${method}'. Pass a params parser for custom methods.`);
        }
        return this.notification(spec, handlerOrParams);
    }
    request(spec, handler) {
        registerAppRequest(this.builder, spec, (params, cx, signal, requestId) => agentRequestContext(params, AgentContext.create(cx, requestId), signal, requestId), handler, spec.method === schema.AGENT_METHODS.initialize
            ? {
                afterResponse: (_params, response, cx) => {
                    initializationState(cx).complete(response);
                },
                onError: (cx, error) => initializationState(cx).fail(error),
            }
            : undefined);
        return this;
    }
    notification(spec, handler) {
        registerAppNotification(this.builder, spec, (params, cx, signal) => agentNotificationContext(params, AgentContext.create(cx), signal), handler);
        return this;
    }
    connectConnection(target, options = {}) {
        this.assertInitializeHandler();
        if (isStream(target)) {
            const state = this.openStreamConnection(target);
            if (!options.deferConnectHandlers) {
                this[runAgentConnectHandlers](state.connection);
            }
            return state;
        }
        const [thisStream, peerStream] = memoryStreamPair();
        const peerRawConnection = target[appBuilder]().connect(peerStream);
        const peerConnection = clientConnection(peerRawConnection);
        const state = this.openStreamConnection(thisStream);
        bridgeConnectionClose(state.rawConnection, peerConnection);
        bridgeConnectionClose(peerRawConnection, state.connection);
        try {
            target[runClientConnectHandlers](peerConnection);
            this[runAgentConnectHandlers](state.connection);
        }
        catch (error) {
            peerConnection.close(error);
            state.connection.close(error);
            throw error;
        }
        return state;
    }
    openStreamConnection(stream) {
        const rawConnection = this.builder.connect(stream);
        return {
            rawConnection,
            connection: agentConnection(rawConnection, this.connectHandlers),
        };
    }
    assertInitializeHandler() {
        if (!this.hasInitializeHandler) {
            throw new Error("AgentApp requires an initialize request handler before connecting");
        }
    }
}
/**
 * Creates a client-side app for the experimental draft ACP v2 API.
 *
 * Register request and notification handlers by ACP method name, then use
 * `connectWith(...)` to run the workflow that calls agent-side methods.
 *
 * @experimental
 */
export function client(options) {
    return new ClientApp(options);
}
/**
 * Client-side app builder for the experimental draft ACP v2 API.
 *
 * Methods on this class register typed client handlers and return `this`, so
 * apps can be built with a fluent chain. `connectWith(...)` is the usual entry
 * point for clients because it provides a `ClientContext` for calling
 * agent-side requests and session helpers.
 *
 * @experimental
 */
export class ClientApp {
    builder = Connection.builder();
    connectHandlers = [];
    constructor(options = {}) {
        if (options.name) {
            this.builder.name(options.name);
        }
        this.builder.withHandler(clientInitializationGuard());
        this.builder.withHandler({
            handleMessage: (message, cx) => sessionUpdateRouter(cx).handleMessage(message),
            describe: () => "client-session-update-router",
        });
    }
    /** @internal */
    [appBuilder]() {
        return this.builder;
    }
    /** @internal */
    [runClientConnectHandlers](connection) {
        runConnectHandlers(connection, this.connectHandlers);
    }
    connect(target) {
        return this.connectConnection(target).connection;
    }
    connectWith(target, op) {
        const { rawConnection, connection } = this.connectConnection(target);
        return rawConnection.runUntil(() => op(connection.agent));
    }
    /**
     * Registers a handler that runs when this client app opens a connection.
     *
     * Use this for connection-scoped work that needs to call agent-side ACP
     * methods outside an inbound request handler.
     */
    onConnect(handler) {
        this.connectHandlers.push(handler);
        return this;
    }
    onRequest(method, handlerOrParams, handler) {
        if (handler) {
            assertUnrecognizedV2Method(method, "request");
            return this.request({ method, params: handlerOrParams }, handler);
        }
        const spec = clientRequestSpecsByMethod[method];
        if (!spec) {
            throw new Error(`Unknown ACP request method '${method}'. Pass a params parser for custom methods.`);
        }
        return this.request(spec, handlerOrParams);
    }
    onNotification(method, handlerOrParams, handler) {
        if (handler) {
            assertUnrecognizedV2Method(method, "notification");
            return this.notification({ method, params: handlerOrParams }, handler);
        }
        const spec = clientNotificationSpecsByMethod[method];
        if (!spec) {
            throw new Error(`Unknown ACP notification method '${method}'. Pass a params parser for custom methods.`);
        }
        return this.notification(spec, handlerOrParams);
    }
    request(spec, handler) {
        registerAppRequest(this.builder, spec, (params, cx, signal, requestId) => clientRequestContext(params, ClientContext.create(cx, requestId), signal, requestId), handler);
        return this;
    }
    notification(spec, handler) {
        registerAppNotification(this.builder, spec, (params, cx, signal) => clientNotificationContext(params, ClientContext.create(cx), signal), handler);
        return this;
    }
    connectConnection(target) {
        if (isStream(target)) {
            const state = this.openStreamConnection(target);
            this[runClientConnectHandlers](state.connection);
            return state;
        }
        const [thisStream, peerStream] = memoryStreamPair();
        const peerRawConnection = target[appBuilder]().connect(peerStream);
        const peerConnection = agentConnection(peerRawConnection);
        const state = this.openStreamConnection(thisStream);
        bridgeConnectionClose(state.rawConnection, peerConnection);
        bridgeConnectionClose(peerRawConnection, state.connection);
        try {
            target[runAgentConnectHandlers](peerConnection);
            this[runClientConnectHandlers](state.connection);
        }
        catch (error) {
            peerConnection.close(error);
            state.connection.close(error);
            throw error;
        }
        return state;
    }
    openStreamConnection(stream) {
        const rawConnection = this.builder.connect(stream);
        return {
            rawConnection,
            connection: clientConnection(rawConnection, this.connectHandlers),
        };
    }
}
//# sourceMappingURL=acp.js.map