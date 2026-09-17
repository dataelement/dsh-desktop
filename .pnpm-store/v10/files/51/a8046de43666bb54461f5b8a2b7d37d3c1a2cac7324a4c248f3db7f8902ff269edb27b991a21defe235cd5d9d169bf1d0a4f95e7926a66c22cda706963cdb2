import * as schema from "./schema/index.js";
import * as validate from "./schema/zod.gen.js";
import { ndJsonStream as createJsonStream } from "./stream.js";
// Runtime narrowing helpers for extensible unions, exposed as companion values
// that merge (declaration merging) with the like-named types — e.g.
// `CreateElicitationResponse.isAccept(response)`. See schema/guards.gen.ts.
//
// Listed explicitly (not `export *`) so each value+type pair merges rather than
// colliding with the `export type *` above. The guards.gen re-export test
// asserts this list stays in sync as new extensible unions are added.
export { CreateElicitationRequest, CreateElicitationResponse, ElicitationPropertySchema, MultiSelectItems, } from "./schema/guards.gen.js";
export { AGENT_METHODS, CLIENT_METHODS, PROTOCOL_METHODS, PROTOCOL_VERSION, } from "./schema/index.js";
/**
 * Creates a stable ACP v1 stream from newline-delimited JSON streams.
 *
 * @param output - The writable stream to send encoded messages to
 * @param input - The readable stream to receive encoded messages from
 * @returns A stream for bidirectional ACP v1 communication
 */
export function ndJsonStream(output, input) {
    return createJsonStream(output, input);
}
export { RequestError } from "./jsonrpc.js";
import { Connection, Handled, HandlerRegistration } from "./jsonrpc.js";
function emptyObjectResponse(response) {
    return response ?? {};
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
 * ACP method-name constants.
 *
 * Use these with `onRequest(...)`, `onNotification(...)`, `request(...)`, and
 * `notify(...)` when you want literal-string type inference without spelling
 * protocol strings inline.
 */
export const methods = {
    agent: {
        initialize: schema.AGENT_METHODS.initialize,
        authenticate: schema.AGENT_METHODS.authenticate,
        logout: schema.AGENT_METHODS.logout,
        providers: {
            list: schema.AGENT_METHODS.providers_list,
            set: schema.AGENT_METHODS.providers_set,
            disable: schema.AGENT_METHODS.providers_disable,
        },
        session: {
            new: schema.AGENT_METHODS.session_new,
            load: schema.AGENT_METHODS.session_load,
            list: schema.AGENT_METHODS.session_list,
            delete: schema.AGENT_METHODS.session_delete,
            fork: schema.AGENT_METHODS.session_fork,
            resume: schema.AGENT_METHODS.session_resume,
            close: schema.AGENT_METHODS.session_close,
            setMode: schema.AGENT_METHODS.session_set_mode,
            setConfigOption: schema.AGENT_METHODS.session_set_config_option,
            prompt: schema.AGENT_METHODS.session_prompt,
            cancel: schema.AGENT_METHODS.session_cancel,
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
        fs: {
            writeTextFile: schema.CLIENT_METHODS.fs_write_text_file,
            readTextFile: schema.CLIENT_METHODS.fs_read_text_file,
        },
        terminal: {
            create: schema.CLIENT_METHODS.terminal_create,
            output: schema.CLIENT_METHODS.terminal_output,
            release: schema.CLIENT_METHODS.terminal_release,
            waitForExit: schema.CLIENT_METHODS.terminal_wait_for_exit,
            kill: schema.CLIENT_METHODS.terminal_kill,
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
    addDynamicHandler(handler) {
        return this.cx.addDynamicHandler(handler);
    }
}
/**
 * Context passed to agent-side handlers.
 *
 * Agents use this context to call client-side ACP methods while handling
 * requests such as `session/prompt`.
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
        const spec = clientRequestSpecsByMethod[method];
        return this.sendRequest(method, params, spec?.mapResponse, options);
    }
    notify(method, params) {
        return this.sendNotification(method, params);
    }
}
/**
 * Context used by clients to call agent-side ACP methods.
 *
 * `connectWith` passes a `ClientContext` to the callback. Client handlers also
 * receive one as `ctx.agent` when they need to call back into the agent.
 */
export class ClientContext extends AcpContext {
    constructor(cx, requestId) {
        super(cx, requestId);
    }
    /** @internal */
    static create(cx, requestId) {
        return new ClientContext(cx, requestId);
    }
    /** @internal */
    [startActiveSession](params, options) {
        return this.sendRequest(schema.AGENT_METHODS.session_new, params, (response) => this.attachSession(response), options);
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
        const sessionRegistration = sessionUpdateRouter(this.connectionContext).attach(response, updates);
        const closeRegistration = new HandlerRegistration(() => {
            closeSignal.removeEventListener("abort", failUpdatesOnClose);
        });
        return ActiveSession.create(this, response, updates, [
            sessionRegistration,
            closeRegistration,
        ]);
    }
    request(method, params, options) {
        const spec = agentRequestSpecsByMethod[method];
        return this.sendRequest(method, params, spec?.mapResponse, options);
    }
    notify(method, params) {
        return this.sendNotification(method, params);
    }
}
class AcpConnectionHandle {
    connection;
    constructor(connection) {
        this.connection = connection;
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
        this.agent = ClientContext.create(connection.getContext());
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
    enqueue(value) {
        if (this.failed) {
            return;
        }
        const waiter = this.waiters.shift();
        if (waiter) {
            waiter.resolve(value);
        }
        else {
            this.values.push({ kind: "value", value });
        }
    }
    reject(error) {
        if (this.failed) {
            return;
        }
        if (this.waiters.length > 0) {
            for (const waiter of this.waiters.splice(0)) {
                waiter.reject(error);
            }
            return;
        }
        this.values.push({ kind: "error", error });
    }
    clearErrors() {
        this.values = this.values.filter((entry) => entry.kind === "value");
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
    next() {
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
            this.waiters.push({ resolve, reject });
        });
    }
}
function cloneNewSessionRequest(request) {
    return {
        ...request,
        additionalDirectories: request.additionalDirectories
            ? [...request.additionalDirectories]
            : undefined,
        mcpServers: [...request.mcpServers],
    };
}
/**
 * Builder for creating an `ActiveSession`.
 *
 * Start from `ctx.buildSession("/absolute/cwd")` for the common case, or
 * pass a full `NewSessionRequest` to `ctx.buildSession(...)` when the session
 * needs MCP servers, `_meta`, or additional request fields. All paths in ACP
 * payloads should be absolute.
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
            mcpServers: [...this.request.mcpServers, mcpServer],
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
 * Convenience wrapper for an active ACP session.
 *
 * An active session routes `session/update` notifications for one session ID
 * into an async queue. Use `prompt(...)` to send user content, then read updates
 * with `nextUpdate()` until a `stop` message is returned.
 */
export class ActiveSession {
    cx;
    sessionResponse;
    updates;
    registrations;
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
     * Mode state returned when the session was created, if the agent provided it.
     */
    get modes() {
        return this.sessionResponse.modes;
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
     * wrapped in an array. The returned promise resolves with the final
     * `PromptResponse`, and the same completion is also queued as a `stop`
     * message for `nextUpdate()`.
     */
    prompt(prompt, options) {
        this.updates.clearErrors();
        const response = this.cx.request(schema.AGENT_METHODS.session_prompt, {
            sessionId: this.sessionId,
            prompt: this.promptBlocks(prompt),
        }, options);
        void response.then((value) => {
            this.updates.enqueue({
                kind: "stop",
                response: value,
                stopReason: value.stopReason,
            });
        }, (error) => {
            this.updates.reject(error);
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
     * Reads text chunks until the current prompt turn stops.
     *
     * Only `agent_message_chunk` updates with text content are appended. Other
     * update types are ignored by this helper; use `nextUpdate()` when you need
     * tool calls, plans, or the final `PromptResponse`.
     */
    async readText() {
        let output = "";
        for (;;) {
            const message = await this.nextUpdate();
            if (message.kind === "stop") {
                return output;
            }
            const { update } = message;
            if (update.sessionUpdate === "agent_message_chunk" &&
                update.content.type === "text") {
                output += update.content.text;
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
function requestSpec(method, params, mapResponse) {
    return { method, params, mapResponse };
}
function notificationSpec(method, params) {
    return { method, params };
}
function registerAppRequest(builder, spec, context, handler) {
    builder.onReceiveRequest(spec.method, (params) => parseParams(spec.params, params), async (params, responder, cx) => {
        const response = await handler(context(params, cx, responder.signal, responder.id));
        await responder.respond((spec.mapResponse
            ? spec.mapResponse(response)
            : response));
    });
}
function registerAppNotification(builder, spec, context, handler) {
    builder.onReceiveNotification(spec.method, (params) => parseParams(spec.params, params), (params, cx) => handler(context(params, cx, cx.signal)));
}
function specsByMethod(specs) {
    const byMethod = {};
    for (const spec of Object.values(specs)) {
        byMethod[spec.method] = spec;
    }
    return byMethod;
}
const agentRequestSpecs = {
    initialize: requestSpec(schema.AGENT_METHODS.initialize, validate.zInitializeRequest),
    newSession: requestSpec(schema.AGENT_METHODS.session_new, validate.zNewSessionRequest),
    loadSession: requestSpec(schema.AGENT_METHODS.session_load, validate.zLoadSessionRequest, emptyObjectResponse),
    unstable_forkSession: requestSpec(schema.AGENT_METHODS.session_fork, validate.zForkSessionRequest),
    listSessions: requestSpec(schema.AGENT_METHODS.session_list, validate.zListSessionsRequest),
    deleteSession: requestSpec(schema.AGENT_METHODS.session_delete, validate.zDeleteSessionRequest, emptyObjectResponse),
    resumeSession: requestSpec(schema.AGENT_METHODS.session_resume, validate.zResumeSessionRequest),
    closeSession: requestSpec(schema.AGENT_METHODS.session_close, validate.zCloseSessionRequest, emptyObjectResponse),
    setSessionMode: requestSpec(schema.AGENT_METHODS.session_set_mode, validate.zSetSessionModeRequest, emptyObjectResponse),
    setSessionConfigOption: requestSpec(schema.AGENT_METHODS.session_set_config_option, validate.zSetSessionConfigOptionRequest),
    authenticate: requestSpec(schema.AGENT_METHODS.authenticate, validate.zAuthenticateRequest, emptyObjectResponse),
    unstable_listProviders: requestSpec(schema.AGENT_METHODS.providers_list, validate.zListProvidersRequest),
    unstable_setProvider: requestSpec(schema.AGENT_METHODS.providers_set, validate.zSetProviderRequest, emptyObjectResponse),
    unstable_disableProvider: requestSpec(schema.AGENT_METHODS.providers_disable, validate.zDisableProviderRequest, emptyObjectResponse),
    logout: requestSpec(schema.AGENT_METHODS.logout, validate.zLogoutRequest, emptyObjectResponse),
    prompt: requestSpec(schema.AGENT_METHODS.session_prompt, validate.zPromptRequest),
    unstable_startNes: requestSpec(schema.AGENT_METHODS.nes_start, validate.zStartNesRequest),
    unstable_suggestNes: requestSpec(schema.AGENT_METHODS.nes_suggest, validate.zSuggestNesRequest),
    unstable_closeNes: requestSpec(schema.AGENT_METHODS.nes_close, validate.zCloseNesRequest, emptyObjectResponse),
};
const agentNotificationSpecs = {
    cancel: notificationSpec(schema.AGENT_METHODS.session_cancel, validate.zCancelNotification),
    unstable_didOpenDocument: notificationSpec(schema.AGENT_METHODS.document_did_open, validate.zDidOpenDocumentNotification),
    unstable_didChangeDocument: notificationSpec(schema.AGENT_METHODS.document_did_change, validate.zDidChangeDocumentNotification),
    unstable_didCloseDocument: notificationSpec(schema.AGENT_METHODS.document_did_close, validate.zDidCloseDocumentNotification),
    unstable_didSaveDocument: notificationSpec(schema.AGENT_METHODS.document_did_save, validate.zDidSaveDocumentNotification),
    unstable_didFocusDocument: notificationSpec(schema.AGENT_METHODS.document_did_focus, validate.zDidFocusDocumentNotification),
    unstable_acceptNes: notificationSpec(schema.AGENT_METHODS.nes_accept, validate.zAcceptNesNotification),
    unstable_rejectNes: notificationSpec(schema.AGENT_METHODS.nes_reject, validate.zRejectNesNotification),
};
const clientRequestSpecs = {
    requestPermission: requestSpec(schema.CLIENT_METHODS.session_request_permission, validate.zRequestPermissionRequest),
    writeTextFile: requestSpec(schema.CLIENT_METHODS.fs_write_text_file, validate.zWriteTextFileRequest, emptyObjectResponse),
    readTextFile: requestSpec(schema.CLIENT_METHODS.fs_read_text_file, validate.zReadTextFileRequest),
    createTerminal: requestSpec(schema.CLIENT_METHODS.terminal_create, validate.zCreateTerminalRequest),
    terminalOutput: requestSpec(schema.CLIENT_METHODS.terminal_output, validate.zTerminalOutputRequest),
    releaseTerminal: requestSpec(schema.CLIENT_METHODS.terminal_release, validate.zReleaseTerminalRequest, emptyObjectResponse),
    waitForTerminalExit: requestSpec(schema.CLIENT_METHODS.terminal_wait_for_exit, validate.zWaitForTerminalExitRequest),
    killTerminal: requestSpec(schema.CLIENT_METHODS.terminal_kill, validate.zKillTerminalRequest, emptyObjectResponse),
    createElicitation: requestSpec(schema.CLIENT_METHODS.elicitation_create, validate.zCreateElicitationRequest),
};
const clientNotificationSpecs = {
    sessionUpdate: notificationSpec(schema.CLIENT_METHODS.session_update, validate.zSessionNotification),
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
        const notification = validate.zSessionNotification.parse(message.params);
        const update = {
            kind: "session_update",
            notification,
            update: notification.update,
        };
        const activeSessions = this.activeSessions.get(notification.sessionId);
        if (activeSessions && activeSessions.size > 0) {
            for (const session of activeSessions) {
                session.enqueue(update);
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
const stableConnectionOptions = { allowBatches: false };
/**
 * Creates an agent-side app.
 *
 * Register request and notification handlers by ACP method name, then call
 * `connect(stream)` to serve an ACP client.
 */
export function agent(options) {
    return new AgentApp(options);
}
/**
 * Agent-side app builder.
 *
 * Methods on this class register typed request or notification handlers and
 * return `this`, so apps can be built with a fluent chain. Handler params are
 * parsed with the generated ACP schemas before your handler runs, and thrown
 * errors are converted to JSON-RPC errors by the connection layer.
 */
export class AgentApp {
    builder = Connection.builder();
    connectHandlers = [];
    constructor(options = {}) {
        if (options.name) {
            this.builder.name(options.name);
        }
    }
    /** @internal */
    [appBuilder]() {
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
            return this.request({ method, params: handlerOrParams }, handler);
        }
        const spec = agentRequestSpecsByMethod[method];
        if (!spec) {
            throw new Error(`Unknown ACP request method '${method}'. Pass a params parser for custom methods.`);
        }
        return this.request(spec, handlerOrParams);
    }
    onNotification(method, handlerOrParams, handler) {
        if (handler) {
            return this.notification({ method, params: handlerOrParams }, handler);
        }
        const spec = agentNotificationSpecsByMethod[method];
        if (!spec) {
            throw new Error(`Unknown ACP notification method '${method}'. Pass a params parser for custom methods.`);
        }
        return this.notification(spec, handlerOrParams);
    }
    request(spec, handler) {
        registerAppRequest(this.builder, spec, (params, cx, signal, requestId) => agentRequestContext(params, AgentContext.create(cx, requestId), signal, requestId), handler);
        return this;
    }
    notification(spec, handler) {
        registerAppNotification(this.builder, spec, (params, cx, signal) => agentNotificationContext(params, AgentContext.create(cx), signal), handler);
        return this;
    }
    connectConnection(target, options = {}) {
        if (isStream(target)) {
            const state = this.openStreamConnection(target);
            if (!options.deferConnectHandlers) {
                this[runAgentConnectHandlers](state.connection);
            }
            return state;
        }
        const [thisStream, peerStream] = memoryStreamPair();
        const peerRawConnection = target[appBuilder]().connect(peerStream, stableConnectionOptions);
        const peerConnection = clientConnection(peerRawConnection);
        const state = this.openStreamConnection(thisStream);
        void state.rawConnection.closed.then(() => peerConnection.close());
        void peerRawConnection.closed.then(() => state.connection.close());
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
        const rawConnection = this.builder.connect(stream, stableConnectionOptions);
        return {
            rawConnection,
            connection: agentConnection(rawConnection, this.connectHandlers),
        };
    }
}
/**
 * Creates a client-side app.
 *
 * Register request and notification handlers by ACP method name, then use
 * `connectWith(...)` to run the workflow that calls agent-side methods.
 */
export function client(options) {
    return new ClientApp(options);
}
/**
 * Client-side app builder.
 *
 * Methods on this class register typed client handlers and return `this`, so
 * apps can be built with a fluent chain. `connectWith(...)` is the usual entry
 * point for clients because it provides a `ClientContext` for calling
 * agent-side requests and session helpers.
 */
export class ClientApp {
    builder = Connection.builder();
    connectHandlers = [];
    constructor(options = {}) {
        if (options.name) {
            this.builder.name(options.name);
        }
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
        const peerRawConnection = target[appBuilder]().connect(peerStream, stableConnectionOptions);
        const peerConnection = agentConnection(peerRawConnection);
        const state = this.openStreamConnection(thisStream);
        void state.rawConnection.closed.then(() => peerConnection.close());
        void peerRawConnection.closed.then(() => state.connection.close());
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
        const rawConnection = this.builder.connect(stream, stableConnectionOptions);
        return {
            rawConnection,
            connection: clientConnection(rawConnection, this.connectHandlers),
        };
    }
}
const legacyAgentRequestMethods = new Set([
    schema.AGENT_METHODS.initialize,
    schema.AGENT_METHODS.authenticate,
    schema.AGENT_METHODS.providers_list,
    schema.AGENT_METHODS.providers_set,
    schema.AGENT_METHODS.providers_disable,
    schema.AGENT_METHODS.session_new,
    schema.AGENT_METHODS.session_load,
    schema.AGENT_METHODS.session_set_mode,
    schema.AGENT_METHODS.session_set_config_option,
    schema.AGENT_METHODS.session_prompt,
    schema.AGENT_METHODS.session_list,
    schema.AGENT_METHODS.session_delete,
    schema.AGENT_METHODS.session_fork,
    schema.AGENT_METHODS.session_resume,
    schema.AGENT_METHODS.session_close,
    schema.AGENT_METHODS.logout,
    schema.AGENT_METHODS.nes_start,
    schema.AGENT_METHODS.nes_suggest,
    schema.AGENT_METHODS.nes_close,
]);
const legacyAgentNotificationMethods = new Set([
    schema.AGENT_METHODS.session_cancel,
    schema.AGENT_METHODS.nes_accept,
    schema.AGENT_METHODS.nes_reject,
    schema.AGENT_METHODS.document_did_open,
    schema.AGENT_METHODS.document_did_change,
    schema.AGENT_METHODS.document_did_close,
    schema.AGENT_METHODS.document_did_save,
    schema.AGENT_METHODS.document_did_focus,
]);
const legacyClientRequestMethods = new Set([
    schema.CLIENT_METHODS.session_request_permission,
    schema.CLIENT_METHODS.fs_write_text_file,
    schema.CLIENT_METHODS.fs_read_text_file,
    schema.CLIENT_METHODS.terminal_create,
    schema.CLIENT_METHODS.terminal_output,
    schema.CLIENT_METHODS.terminal_release,
    schema.CLIENT_METHODS.terminal_wait_for_exit,
    schema.CLIENT_METHODS.terminal_kill,
    schema.CLIENT_METHODS.elicitation_create,
]);
const legacyClientNotificationMethods = new Set([
    schema.CLIENT_METHODS.session_update,
    schema.CLIENT_METHODS.elicitation_complete,
]);
function legacyAgentApp(implementation) {
    const app = agent()
        .onRequest(schema.AGENT_METHODS.initialize, (ctx) => implementation.initialize(ctx.params))
        .onRequest(schema.AGENT_METHODS.session_new, (ctx) => implementation.newSession(ctx.params))
        .onRequest(schema.AGENT_METHODS.authenticate, async (ctx) => (await implementation.authenticate(ctx.params)) ?? {})
        .onRequest(schema.AGENT_METHODS.session_prompt, (ctx) => implementation.prompt(ctx.params))
        .onNotification(schema.AGENT_METHODS.session_cancel, (ctx) => implementation.cancel(ctx.params));
    if (implementation.loadSession) {
        app.onRequest(schema.AGENT_METHODS.session_load, (ctx) => implementation.loadSession(ctx.params));
    }
    if (implementation.listSessions) {
        app.onRequest(schema.AGENT_METHODS.session_list, (ctx) => implementation.listSessions(ctx.params));
    }
    if (implementation.deleteSession) {
        app.onRequest(schema.AGENT_METHODS.session_delete, async (ctx) => (await implementation.deleteSession(ctx.params)) ?? {});
    }
    if (implementation.unstable_forkSession) {
        app.onRequest(schema.AGENT_METHODS.session_fork, (ctx) => implementation.unstable_forkSession(ctx.params));
    }
    if (implementation.resumeSession) {
        app.onRequest(schema.AGENT_METHODS.session_resume, (ctx) => implementation.resumeSession(ctx.params));
    }
    if (implementation.closeSession) {
        app.onRequest(schema.AGENT_METHODS.session_close, async (ctx) => (await implementation.closeSession(ctx.params)) ?? {});
    }
    if (implementation.setSessionMode) {
        app.onRequest(schema.AGENT_METHODS.session_set_mode, async (ctx) => (await implementation.setSessionMode(ctx.params)) ?? {});
    }
    if (implementation.setSessionConfigOption) {
        app.onRequest(schema.AGENT_METHODS.session_set_config_option, (ctx) => implementation.setSessionConfigOption(ctx.params));
    }
    if (implementation.unstable_listProviders) {
        app.onRequest(schema.AGENT_METHODS.providers_list, (ctx) => implementation.unstable_listProviders(ctx.params));
    }
    if (implementation.unstable_setProvider) {
        app.onRequest(schema.AGENT_METHODS.providers_set, async (ctx) => (await implementation.unstable_setProvider(ctx.params)) ?? {});
    }
    if (implementation.unstable_disableProvider) {
        app.onRequest(schema.AGENT_METHODS.providers_disable, async (ctx) => (await implementation.unstable_disableProvider(ctx.params)) ?? {});
    }
    if (implementation.logout) {
        app.onRequest(schema.AGENT_METHODS.logout, async (ctx) => (await implementation.logout(ctx.params)) ?? {});
    }
    if (implementation.unstable_startNes) {
        app.onRequest(schema.AGENT_METHODS.nes_start, (ctx) => implementation.unstable_startNes(ctx.params));
    }
    if (implementation.unstable_suggestNes) {
        app.onRequest(schema.AGENT_METHODS.nes_suggest, (ctx) => implementation.unstable_suggestNes(ctx.params));
    }
    if (implementation.unstable_closeNes) {
        app.onRequest(schema.AGENT_METHODS.nes_close, async (ctx) => (await implementation.unstable_closeNes(ctx.params)) ?? {});
    }
    if (implementation.unstable_didOpenDocument) {
        app.onNotification(schema.AGENT_METHODS.document_did_open, (ctx) => implementation.unstable_didOpenDocument(ctx.params));
    }
    if (implementation.unstable_didChangeDocument) {
        app.onNotification(schema.AGENT_METHODS.document_did_change, (ctx) => implementation.unstable_didChangeDocument(ctx.params));
    }
    if (implementation.unstable_didCloseDocument) {
        app.onNotification(schema.AGENT_METHODS.document_did_close, (ctx) => implementation.unstable_didCloseDocument(ctx.params));
    }
    if (implementation.unstable_didSaveDocument) {
        app.onNotification(schema.AGENT_METHODS.document_did_save, (ctx) => implementation.unstable_didSaveDocument(ctx.params));
    }
    if (implementation.unstable_didFocusDocument) {
        app.onNotification(schema.AGENT_METHODS.document_did_focus, (ctx) => implementation.unstable_didFocusDocument(ctx.params));
    }
    if (implementation.unstable_acceptNes) {
        app.onNotification(schema.AGENT_METHODS.nes_accept, (ctx) => implementation.unstable_acceptNes(ctx.params));
    }
    if (implementation.unstable_rejectNes) {
        app.onNotification(schema.AGENT_METHODS.nes_reject, (ctx) => implementation.unstable_rejectNes(ctx.params));
    }
    if (implementation.extMethod) {
        app[appBuilder]().withHandler({
            handleMessage: async (message) => {
                if (message.kind !== "request" ||
                    legacyAgentRequestMethods.has(message.method)) {
                    return Handled.no(message);
                }
                await message.responder.respond(await implementation.extMethod(message.method, message.params));
                return Handled.yes();
            },
            describe: () => "legacy-agent-extension-request",
        });
    }
    if (implementation.extNotification) {
        app[appBuilder]().withHandler({
            handleMessage: async (message) => {
                if (message.kind !== "notification" ||
                    legacyAgentNotificationMethods.has(message.method)) {
                    return Handled.no(message);
                }
                await implementation.extNotification(message.method, message.params);
                return Handled.yes();
            },
            describe: () => "legacy-agent-extension-notification",
        });
    }
    return app;
}
function legacyClientApp(implementation) {
    const app = client()
        .onRequest(schema.CLIENT_METHODS.session_request_permission, (ctx) => implementation.requestPermission(ctx.params))
        .onNotification(schema.CLIENT_METHODS.session_update, (ctx) => implementation.sessionUpdate(ctx.params))
        .onRequest(schema.CLIENT_METHODS.fs_write_text_file, async (ctx) => (await implementation.writeTextFile?.(ctx.params)) ?? {})
        .onRequest(schema.CLIENT_METHODS.fs_read_text_file, async (ctx) => (await implementation.readTextFile?.(ctx.params)))
        .onRequest(schema.CLIENT_METHODS.terminal_create, async (ctx) => (await implementation.createTerminal?.(ctx.params)))
        .onRequest(schema.CLIENT_METHODS.terminal_output, async (ctx) => (await implementation.terminalOutput?.(ctx.params)))
        .onRequest(schema.CLIENT_METHODS.terminal_release, async (ctx) => (await implementation.releaseTerminal?.(ctx.params)) ?? {})
        .onRequest(schema.CLIENT_METHODS.terminal_wait_for_exit, async (ctx) => (await implementation.waitForTerminalExit?.(ctx.params)))
        .onRequest(schema.CLIENT_METHODS.terminal_kill, async (ctx) => (await implementation.killTerminal?.(ctx.params)) ?? {});
    if (implementation.createElicitation) {
        app.onRequest(schema.CLIENT_METHODS.elicitation_create, (ctx) => implementation.createElicitation(ctx.params));
    }
    if (implementation.completeElicitation) {
        app.onNotification(schema.CLIENT_METHODS.elicitation_complete, (ctx) => implementation.completeElicitation(ctx.params));
    }
    if (implementation.extMethod) {
        app[appBuilder]().withHandler({
            handleMessage: async (message) => {
                if (message.kind !== "request" ||
                    legacyClientRequestMethods.has(message.method)) {
                    return Handled.no(message);
                }
                await message.responder.respond(await implementation.extMethod(message.method, message.params));
                return Handled.yes();
            },
            describe: () => "legacy-client-extension-request",
        });
    }
    if (implementation.extNotification) {
        app[appBuilder]().withHandler({
            handleMessage: async (message) => {
                if (message.kind !== "notification" ||
                    legacyClientNotificationMethods.has(message.method)) {
                    return Handled.no(message);
                }
                await implementation.extNotification(message.method, message.params);
                return Handled.yes();
            },
            describe: () => "legacy-client-extension-notification",
        });
    }
    return app;
}
/**
 * An agent-side connection to a client.
 *
 * This class provides the agent's view of an ACP connection, allowing
 * agents to communicate with clients. It implements the {@link Client} interface
 * to provide methods for requesting permissions, accessing the file system,
 * and sending session updates.
 *
 * See protocol docs: [Agent](https://agentclientprotocol.com/protocol/overview#agent)
 *
 * @deprecated Prefer {@link agent}, which registers typed handlers with a
 * single context object and supports direct app composition.
 */
export class AgentSideConnection {
    connection;
    /**
     * Creates a new agent-side connection to a client.
     *
     * This establishes the communication channel from the agent's perspective
     * following the ACP specification.
     *
     * @param toAgent - A function that creates an Agent handler to process incoming client requests
     * @param stream - The bidirectional message stream for communication. Typically created using
     *                 {@link ndJsonStream} for stdio-based connections.
     *
     * See protocol docs: [Communication Model](https://agentclientprotocol.com/protocol/overview#communication-model)
     *
     * @deprecated Prefer `agent({ name }).connect(stream)`.
     */
    constructor(toAgent, stream) {
        this.connection = legacyAgentApp(toAgent(this))[appBuilder]()
            .connect(stream, stableConnectionOptions);
    }
    /**
     * Handles session update notifications from the agent.
     *
     * This is a notification endpoint (no response expected) that sends
     * real-time updates about session progress, including message chunks,
     * tool calls, and execution plans.
     *
     * Note: Clients SHOULD continue accepting tool call updates even after
     * sending a `session/cancel` notification, as the agent may send final
     * updates before responding with the cancelled stop reason.
     *
     * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
     */
    sessionUpdate(params) {
        return this.connection.sendNotification(schema.CLIENT_METHODS.session_update, params);
    }
    /**
     * Requests permission from the user for a tool call operation.
     *
     * Called by the agent when it needs user authorization before executing
     * a potentially sensitive operation. The client should present the options
     * to the user and return their decision.
     *
     * If the client cancels the prompt turn via `session/cancel`, it MUST
     * respond to this request with `RequestPermissionOutcome::Cancelled`.
     *
     * See protocol docs: [Requesting Permission](https://agentclientprotocol.com/protocol/tool-calls#requesting-permission)
     */
    requestPermission(params) {
        return this.connection.sendRequest(schema.CLIENT_METHODS.session_request_permission, params);
    }
    /**
     * Reads content from a text file in the client's file system.
     *
     * Only available if the client advertises the `fs.readTextFile` capability.
     * Allows the agent to access file contents within the client's environment.
     *
     * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
     */
    readTextFile(params) {
        return this.connection.sendRequest(schema.CLIENT_METHODS.fs_read_text_file, params);
    }
    /**
     * Writes content to a text file in the client's file system.
     *
     * Only available if the client advertises the `fs.writeTextFile` capability.
     * Allows the agent to create or modify files within the client's environment.
     *
     * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
     */
    writeTextFile(params) {
        return this.connection.sendRequest(schema.CLIENT_METHODS.fs_write_text_file, params, emptyObjectResponse);
    }
    /**
     * Executes a command in a new terminal.
     *
     * Returns a `TerminalHandle` that can be used to get output, wait for exit,
     * kill the command, or release the terminal.
     *
     * The terminal can also be embedded in tool calls by using its ID in
     * `ToolCallContent` with type "terminal".
     *
     * @param params - The terminal creation parameters
     * @returns A handle to control and monitor the terminal
     */
    createTerminal(params) {
        return this.connection.sendRequest(schema.CLIENT_METHODS.terminal_create, params, (response) => TerminalHandle.create(response.terminalId, params.sessionId, this.connection));
    }
    /** Creates an elicitation to request input from the user. */
    createElicitation(params) {
        return this.connection.sendRequest(schema.CLIENT_METHODS.elicitation_create, params);
    }
    /** Notifies the client that a URL-based elicitation is complete. */
    completeElicitation(params) {
        return this.connection.sendNotification(schema.CLIENT_METHODS.elicitation_complete, params);
    }
    request(method, params, options) {
        const spec = clientRequestSpecsByMethod[method];
        return this.connection.sendRequest(method, params, spec?.mapResponse, options);
    }
    notify(method, params) {
        return this.connection.sendNotification(method, params);
    }
    /**
     * Extension method.
     *
     * @deprecated Use {@link request}.
     */
    extMethod(method, params) {
        return this.request(method, params);
    }
    /**
     * Extension notification.
     *
     * @deprecated Use {@link notify}.
     */
    extNotification(method, params) {
        return this.notify(method, params);
    }
    /**
     * AbortSignal that aborts when the connection closes.
     *
     * This signal can be used to:
     * - Listen for connection closure: `connection.signal.addEventListener('abort', () => {...})`
     * - Check connection status synchronously: `if (connection.signal.aborted) {...}`
     * - Pass to other APIs (fetch, setTimeout) for automatic cancellation
     *
     * The connection closes when the underlying stream ends, either normally or due to an error.
     *
     * @example
     * ```typescript
     * const connection = new AgentSideConnection(agent, stream);
     *
     * // Listen for closure
     * connection.signal.addEventListener('abort', () => {
     *   console.log('Connection closed - performing cleanup');
     * });
     *
     * // Check status
     * if (connection.signal.aborted) {
     *   console.log('Connection is already closed');
     * }
     *
     * // Pass to other APIs
     * fetch(url, { signal: connection.signal });
     * ```
     */
    get signal() {
        return this.connection.signal;
    }
    /**
     * Promise that resolves when the connection closes.
     *
     * The connection closes when the underlying stream ends, either normally or due to an error.
     * Once closed, the connection cannot send or receive any more messages.
     *
     * This is useful for async/await style cleanup:
     *
     * @example
     * ```typescript
     * const connection = new AgentSideConnection(agent, stream);
     * await connection.closed;
     * console.log('Connection closed - performing cleanup');
     * ```
     */
    get closed() {
        return this.connection.closed;
    }
}
/**
 * Handle for controlling and monitoring a terminal created via `createTerminal`.
 *
 * Provides methods to:
 * - Get current output without waiting
 * - Wait for command completion
 * - Kill the running command
 * - Release terminal resources
 *
 * **Important:** Always call `release()` when done with the terminal to free resources.

 * The terminal supports async disposal via `Symbol.asyncDispose` for automatic cleanup.

 * You can use `await using` to ensure the terminal is automatically released when it
 * goes out of scope.
 */
export class TerminalHandle {
    /**
     * Terminal identifier returned by `terminal/create`.
     */
    id;
    sessionId;
    connection;
    constructor(id, sessionId, conn) {
        this.id = id;
        this.sessionId = sessionId;
        this.connection = conn;
    }
    /** @internal */
    static create(id, sessionId, conn) {
        return new TerminalHandle(id, sessionId, conn);
    }
    /**
     * Gets the current terminal output without waiting for the command to exit.
     */
    currentOutput() {
        return this.connection.sendRequest(schema.CLIENT_METHODS.terminal_output, {
            sessionId: this.sessionId,
            terminalId: this.id,
        });
    }
    /**
     * Waits for the terminal command to complete and returns its exit status.
     */
    waitForExit() {
        return this.connection.sendRequest(schema.CLIENT_METHODS.terminal_wait_for_exit, {
            sessionId: this.sessionId,
            terminalId: this.id,
        });
    }
    /**
     * Kills the terminal command without releasing the terminal.
     *
     * The terminal remains valid after killing, allowing you to:
     * - Get the final output with `currentOutput()`
     * - Check the exit status
     * - Release the terminal when done
     *
     * Useful for implementing timeouts or cancellation.
     */
    kill() {
        return this.connection.sendRequest(schema.CLIENT_METHODS.terminal_kill, {
            sessionId: this.sessionId,
            terminalId: this.id,
        }, emptyObjectResponse);
    }
    /**
     * Releases the terminal and frees all associated resources.
     *
     * If the command is still running, it will be killed.
     * After release, the terminal ID becomes invalid and cannot be used
     * with other terminal methods.
     *
     * Tool calls that already reference this terminal will continue to
     * display its output.
     *
     * **Important:** Always call this method when done with the terminal.
     */
    release() {
        return this.connection.sendRequest(schema.CLIENT_METHODS.terminal_release, {
            sessionId: this.sessionId,
            terminalId: this.id,
        }, emptyObjectResponse);
    }
    /**
     * Releases the terminal when used with `await using`.
     */
    async [Symbol.asyncDispose]() {
        await this.release();
    }
}
/**
 * A client-side connection to an agent.
 *
 * This class provides the client's view of an ACP connection, allowing
 * clients (such as code editors) to communicate with agents. It implements
 * the {@link Agent} interface to provide methods for initializing sessions, sending
 * prompts, and managing the agent lifecycle.
 *
 * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
 *
 * @deprecated Prefer {@link client}, which registers typed handlers with a
 * single context object and supports `connectWith` and session helpers.
 */
export class ClientSideConnection {
    connection;
    /**
     * Creates a new client-side connection to an agent.
     *
     * This establishes the communication channel between a client and agent
     * following the ACP specification.
     *
     * @param toClient - A function that creates a Client handler to process incoming agent requests
     * @param stream - The bidirectional message stream for communication. Typically created using
     *                 {@link ndJsonStream} for stdio-based connections.
     *
     * See protocol docs: [Communication Model](https://agentclientprotocol.com/protocol/overview#communication-model)
     *
     * @deprecated Prefer `client({ name }).connectWith(stream, async (ctx) => ...)`.
     */
    constructor(toClient, stream) {
        this.connection = legacyClientApp(toClient(this))[appBuilder]()
            .connect(stream, stableConnectionOptions);
    }
    /**
     * Establishes the connection with a client and negotiates protocol capabilities.
     *
     * This method is called once at the beginning of the connection to:
     * - Negotiate the protocol version to use
     * - Exchange capability information between client and agent
     * - Determine available authentication methods
     *
     * The agent should respond with its supported protocol version and capabilities.
     *
     * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
     */
    initialize(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.initialize, params);
    }
    /**
     * Creates a new conversation session with the agent.
     *
     * Sessions represent independent conversation contexts with their own history and state.
     *
     * The agent should:
     * - Create a new session context
     * - Connect to any specified MCP servers
     * - Return a unique session ID for future requests
     *
     * The request may include `additionalDirectories` to expand the session's filesystem
     * scope beyond `cwd` without changing the base for relative paths.
     *
     * May return an `auth_required` error if the agent requires authentication.
     *
     * See protocol docs: [Session Setup](https://agentclientprotocol.com/protocol/session-setup)
     */
    newSession(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_new, params);
    }
    /**
     * Loads an existing session to resume a previous conversation.
     *
     * This method is only available if the agent advertises the `loadSession` capability.
     *
     * The agent should:
     * - Restore the session context and conversation history
     * - Connect to the specified MCP servers
     * - Stream the entire conversation history back to the client via notifications
     *
     * The request may include `additionalDirectories` to set the complete list of
     * additional workspace roots for the loaded session.
     *
     * See protocol docs: [Loading Sessions](https://agentclientprotocol.com/protocol/session-setup#loading-sessions)
     */
    loadSession(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_load, params, emptyObjectResponse);
    }
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Forks an existing session to create a new independent session.
     *
     * Creates a new session based on the context of an existing one, allowing
     * operations like generating summaries without affecting the original session's history.
     *
     * The request may include `additionalDirectories` to set the complete list of
     * additional workspace roots for the forked session.
     *
     * This method is only available if the agent advertises the `session.fork` capability.
     *
     * @experimental
     */
    unstable_forkSession(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_fork, params);
    }
    /**
     * Lists existing sessions from the agent.
     *
     * This method is only available if the agent advertises the `listSessions` capability.
     *
     * Returns a list of sessions with metadata like session ID, working directory,
     * title, and last update time. Supports filtering by working directory,
     * `additionalDirectories`, and cursor-based pagination.
     */
    listSessions(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_list, params);
    }
    /**
     * Deletes an existing session returned by `session/list`.
     *
     * This method is only available if the agent advertises the `sessionCapabilities.delete` capability.
     */
    deleteSession(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_delete, params, emptyObjectResponse);
    }
    /**
     * Resumes an existing session without returning previous messages.
     *
     * This method is only available if the agent advertises the `session.resume` capability.
     *
     * The agent should resume the session context, allowing the conversation to continue
     * without replaying the message history (unlike `session/load`).
     *
     * The request may include `additionalDirectories` to set the complete list of
     * additional workspace roots for the resumed session.
     */
    resumeSession(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_resume, params);
    }
    /**
     * Closes an active session and frees up any resources associated with it.
     *
     * This method is only available if the agent advertises the `session.close` capability.
     *
     * The agent must cancel any ongoing work (as if `session/cancel` was called)
     * and then free up any resources associated with the session.
     */
    closeSession(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_close, params, emptyObjectResponse);
    }
    /**
     * Sets the operational mode for a session.
     *
     * Allows switching between different agent modes (e.g., "ask", "architect", "code")
     * that affect system prompts, tool availability, and permission behaviors.
     *
     * The mode must be one of the modes advertised in `availableModes` during session
     * creation or loading. Agents may also change modes autonomously and notify the
     * client via `current_mode_update` notifications.
     *
     * This method can be called at any time during a session, whether the Agent is
     * idle or actively generating a turn.
     *
     * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
     */
    setSessionMode(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_set_mode, params, emptyObjectResponse);
    }
    /**
     * Set a configuration option for a given session.
     *
     * The response contains the full set of configuration options and their current values,
     * as changing one option may affect the available values or state of other options.
     */
    setSessionConfigOption(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_set_config_option, params);
    }
    /**
     * Authenticates the client using the specified authentication method.
     *
     * Called when the agent requires authentication before allowing session creation.
     * The client provides the authentication method ID that was advertised during initialization.
     *
     * After successful authentication, the client can proceed to create sessions with
     * `newSession` without receiving an `auth_required` error.
     *
     * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
     */
    authenticate(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.authenticate, params, emptyObjectResponse);
    }
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Lists providers that can be configured by the client.
     *
     * This method is only available if the agent advertises the `providers` capability.
     *
     * @experimental
     */
    unstable_listProviders(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.providers_list, params);
    }
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Replaces the configuration for a provider.
     *
     * This method is only available if the agent advertises the `providers` capability.
     *
     * @experimental
     */
    unstable_setProvider(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.providers_set, params, emptyObjectResponse);
    }
    /**
     * **UNSTABLE**
     *
     * This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Disables a provider.
     *
     * This method is only available if the agent advertises the `providers` capability.
     *
     * @experimental
     */
    unstable_disableProvider(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.providers_disable, params, emptyObjectResponse);
    }
    /**
     * Logout of the current authentication method.
     */
    logout(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.logout, params, emptyObjectResponse);
    }
    /**
     * Processes a user prompt within a session.
     *
     * This method handles the whole lifecycle of a prompt:
     * - Receives user messages with optional context (files, images, etc.)
     * - Processes the prompt using language models
     * - Reports language model content and tool calls to the Clients
     * - Requests permission to run tools
     * - Executes any requested tool calls
     * - Returns when the turn is complete with a stop reason
     *
     * See protocol docs: [Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
     */
    prompt(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.session_prompt, params);
    }
    /**
     * Cancels ongoing operations for a session.
     *
     * This is a notification sent by the client to cancel an ongoing prompt turn.
     *
     * Upon receiving this notification, the Agent SHOULD:
     * - Stop all language model requests as soon as possible
     * - Abort all tool call invocations in progress
     * - Send any pending `session/update` notifications
     * - Respond to the original `session/prompt` request with `StopReason::Cancelled`
     *
     * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/prompt-turn#cancellation)
     */
    cancel(params) {
        return this.connection.sendNotification(schema.AGENT_METHODS.session_cancel, params);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Starts a NES (Next Edit Suggestions) session.
     *
     * @experimental
     */
    unstable_startNes(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.nes_start, params);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Sends a NES suggestion request.
     *
     * @experimental
     */
    unstable_suggestNes(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.nes_suggest, params);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Closes a NES session.
     *
     * @experimental
     */
    unstable_closeNes(params) {
        return this.connection.sendRequest(schema.AGENT_METHODS.nes_close, params, emptyObjectResponse);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document was opened.
     *
     * @experimental
     */
    unstable_didOpenDocument(params) {
        return this.connection.sendNotification(schema.AGENT_METHODS.document_did_open, params);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document was changed.
     *
     * @experimental
     */
    unstable_didChangeDocument(params) {
        return this.connection.sendNotification(schema.AGENT_METHODS.document_did_change, params);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document was closed.
     *
     * @experimental
     */
    unstable_didCloseDocument(params) {
        return this.connection.sendNotification(schema.AGENT_METHODS.document_did_close, params);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document was saved.
     *
     * @experimental
     */
    unstable_didSaveDocument(params) {
        return this.connection.sendNotification(schema.AGENT_METHODS.document_did_save, params);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document received focus.
     *
     * @experimental
     */
    unstable_didFocusDocument(params) {
        return this.connection.sendNotification(schema.AGENT_METHODS.document_did_focus, params);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a NES suggestion was accepted.
     *
     * @experimental
     */
    unstable_acceptNes(params) {
        return this.connection.sendNotification(schema.AGENT_METHODS.nes_accept, params);
    }
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a NES suggestion was rejected.
     *
     * @experimental
     */
    unstable_rejectNes(params) {
        return this.connection.sendNotification(schema.AGENT_METHODS.nes_reject, params);
    }
    request(method, params, options) {
        const spec = agentRequestSpecsByMethod[method];
        return this.connection.sendRequest(method, params, spec?.mapResponse, options);
    }
    notify(method, params) {
        return this.connection.sendNotification(method, params);
    }
    /**
     * Extension method.
     *
     * @deprecated Use {@link request}.
     */
    extMethod(method, params) {
        return this.request(method, params);
    }
    /**
     * Extension notification.
     *
     * @deprecated Use {@link notify}.
     */
    extNotification(method, params) {
        return this.notify(method, params);
    }
    /**
     * AbortSignal that aborts when the connection closes.
     *
     * This signal can be used to:
     * - Listen for connection closure: `connection.signal.addEventListener('abort', () => {...})`
     * - Check connection status synchronously: `if (connection.signal.aborted) {...}`
     * - Pass to other APIs (fetch, setTimeout) for automatic cancellation
     *
     * The connection closes when the underlying stream ends, either normally or due to an error.
     *
     * @example
     * ```typescript
     * const connection = new ClientSideConnection(client, stream);
     *
     * // Listen for closure
     * connection.signal.addEventListener('abort', () => {
     *   console.log('Connection closed - performing cleanup');
     * });
     *
     * // Check status
     * if (connection.signal.aborted) {
     *   console.log('Connection is already closed');
     * }
     *
     * // Pass to other APIs
     * fetch(url, { signal: connection.signal });
     * ```
     */
    get signal() {
        return this.connection.signal;
    }
    /**
     * Promise that resolves when the connection closes.
     *
     * The connection closes when the underlying stream ends, either normally or due to an error.
     * Once closed, the connection cannot send or receive any more messages.
     *
     * This is useful for async/await style cleanup:
     *
     * @example
     * ```typescript
     * const connection = new ClientSideConnection(client, stream);
     * await connection.closed;
     * console.log('Connection closed - performing cleanup');
     * ```
     */
    get closed() {
        return this.connection.closed;
    }
}
//# sourceMappingURL=acp.js.map