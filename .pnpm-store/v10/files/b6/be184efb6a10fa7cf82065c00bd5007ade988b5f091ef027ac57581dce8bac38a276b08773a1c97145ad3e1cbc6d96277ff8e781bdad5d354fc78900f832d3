import * as schema from "./schema/index.js";
import type { AnyMessage } from "./jsonrpc.js";
export type * from "./schema/types.gen.js";
export { CreateElicitationRequest, CreateElicitationResponse, ElicitationPropertySchema, MultiSelectItems, } from "./schema/guards.gen.js";
export { AGENT_METHODS, CLIENT_METHODS, PROTOCOL_METHODS, PROTOCOL_VERSION, } from "./schema/index.js";
/**
 * Stream interface for stable ACP v1 connections.
 *
 * This type powers bidirectional communication for an ACP connection using
 * individual JSON-RPC messages. The experimental v2 entry point exposes the
 * batch-capable stream surface.
 *
 * The most common way to create a Stream is using {@link ndJsonStream}.
 */
export type Stream = {
    /** Outgoing JSON-RPC messages written by this side of the connection. */
    writable: WritableStream<AnyMessage>;
    /** Incoming JSON-RPC messages read by this side of the connection. */
    readable: ReadableStream<AnyMessage>;
};
/**
 * Creates a stable ACP v1 stream from newline-delimited JSON streams.
 *
 * @param output - The writable stream to send encoded messages to
 * @param input - The readable stream to receive encoded messages from
 * @returns A stream for bidirectional ACP v1 communication
 */
export declare function ndJsonStream(output: WritableStream<Uint8Array>, input: ReadableStream<Uint8Array>): Stream;
export { RequestError } from "./jsonrpc.js";
export type { AnyMessage, AnyNotification, AnyRequest, AnyResponse, ErrorResponse, JsonRpcId, MaybePromise, Result, SendRequestOptions, } from "./jsonrpc.js";
import type { JsonRpcId, MaybePromise, SendRequestOptions } from "./jsonrpc.js";
/**
 * ACP method-name constants.
 *
 * Use these with `onRequest(...)`, `onNotification(...)`, `request(...)`, and
 * `notify(...)` when you want literal-string type inference without spelling
 * protocol strings inline.
 */
export declare const methods: {
    readonly agent: {
        readonly initialize: "initialize";
        readonly authenticate: "authenticate";
        readonly logout: "logout";
        readonly providers: {
            readonly list: "providers/list";
            readonly set: "providers/set";
            readonly disable: "providers/disable";
        };
        readonly session: {
            readonly new: "session/new";
            readonly load: "session/load";
            readonly list: "session/list";
            readonly delete: "session/delete";
            readonly fork: "session/fork";
            readonly resume: "session/resume";
            readonly close: "session/close";
            readonly setMode: "session/set_mode";
            readonly setConfigOption: "session/set_config_option";
            readonly prompt: "session/prompt";
            readonly cancel: "session/cancel";
        };
        readonly nes: {
            readonly start: "nes/start";
            readonly suggest: "nes/suggest";
            readonly accept: "nes/accept";
            readonly reject: "nes/reject";
            readonly close: "nes/close";
        };
        readonly document: {
            readonly didOpen: "document/didOpen";
            readonly didChange: "document/didChange";
            readonly didClose: "document/didClose";
            readonly didSave: "document/didSave";
            readonly didFocus: "document/didFocus";
        };
    };
    readonly client: {
        readonly session: {
            readonly requestPermission: "session/request_permission";
            readonly update: "session/update";
        };
        readonly fs: {
            readonly writeTextFile: "fs/write_text_file";
            readonly readTextFile: "fs/read_text_file";
        };
        readonly terminal: {
            readonly create: "terminal/create";
            readonly output: "terminal/output";
            readonly release: "terminal/release";
            readonly waitForExit: "terminal/wait_for_exit";
            readonly kill: "terminal/kill";
        };
        readonly elicitation: {
            readonly create: "elicitation/create";
            readonly complete: "elicitation/complete";
        };
    };
    readonly protocol: {
        readonly cancelRequest: "$/cancel_request";
    };
};
/**
 * Active ACP connection returned by `AgentApp.connect(...)` and
 * `ClientApp.connect(...)`.
 *
 * Use this handle when you need a connection to stay open independently of a
 * single `connectWith(...)` operation.
 */
export interface AcpConnection {
    /**
     * AbortSignal that aborts when the connection closes.
     */
    readonly signal: AbortSignal;
    /**
     * Promise that resolves when the connection closes.
     */
    readonly closed: Promise<void>;
    /**
     * Closes the connection and rejects pending requests.
     */
    close(error?: unknown): void;
}
/**
 * Agent-side connection returned by `AgentApp.connect(...)`.
 *
 * Use `client` to call client-side ACP methods for the lifetime of the
 * connection.
 */
export interface AgentConnection extends AcpConnection {
    /**
     * Context for calling client-side ACP methods.
     */
    readonly client: AgentContext;
}
/**
 * Client-side connection returned by `ClientApp.connect(...)`.
 *
 * Use `agent` to call agent-side ACP methods and session helpers for the
 * lifetime of the connection.
 */
export interface ClientConnection extends AcpConnection {
    /**
     * Context for calling agent-side ACP methods.
     */
    readonly agent: ClientContext;
}
declare class AcpContext {
    private readonly cx;
    private readonly currentRequestId?;
    /**
     * JSON-RPC id of the request currently being handled.
     *
     * This is `undefined` for notification handlers and for contexts created
     * outside an inbound request, such as `connect(...)` and `connectWith(...)`.
     */
    get requestId(): JsonRpcId | undefined;
}
/**
 * Context passed to agent-side handlers.
 *
 * Agents use this context to call client-side ACP methods while handling
 * requests such as `session/prompt`.
 */
export declare class AgentContext extends AcpContext {
    private constructor();
    /**
     * Sends a request to the client by ACP method name.
     *
     * Built-in method literals infer their params and response types. Custom
     * methods can specify their response and params types with generics.
     */
    request<Method extends ClientRequestMethod>(method: Method, params: ClientRequestParamsByMethod[Method], options?: SendRequestOptions): Promise<ClientRequestResponsesByMethod[Method]>;
    request<Response = unknown, Params = unknown>(method: string, params?: Params, options?: SendRequestOptions): Promise<Response>;
    /**
     * Sends a notification to the client by ACP method name.
     *
     * Built-in method literals infer their params type. Custom notifications can
     * specify their params type with a generic.
     */
    notify<Method extends ClientNotificationMethod>(method: Method, params: ClientNotificationParamsByMethod[Method]): Promise<void>;
    notify<Params = unknown>(method: string, params?: Params): Promise<void>;
}
/**
 * Context used by clients to call agent-side ACP methods.
 *
 * `connectWith` passes a `ClientContext` to the callback. Client handlers also
 * receive one as `ctx.agent` when they need to call back into the agent.
 */
export declare class ClientContext extends AcpContext {
    private constructor();
    /**
     * Creates a builder for starting and observing an ACP session.
     *
     * Pass a string for the common case where only `cwd` is needed, or pass a
     * full `NewSessionRequest` when you need MCP servers, `_meta`, or additional
     * session fields.
     */
    buildSession(cwd: string): SessionBuilder;
    buildSession(request: schema.NewSessionRequest): SessionBuilder;
    /**
     * Builds active-session helpers around a `session/new` response.
     */
    private attachSession;
    /**
     * Sends a request to the agent by ACP method name.
     *
     * Built-in method literals infer their params and response types. Custom
     * methods can specify their response and params types with generics.
     */
    request<Method extends AgentRequestMethod>(method: Method, params: AgentRequestParamsByMethod[Method], options?: SendRequestOptions): Promise<AgentRequestResponsesByMethod[Method]>;
    request<Response = unknown, Params = unknown>(method: string, params?: Params, options?: SendRequestOptions): Promise<Response>;
    /**
     * Sends a notification to the agent by ACP method name.
     *
     * Built-in method literals infer their params type. Custom notifications can
     * specify their params type with a generic.
     */
    notify<Method extends AgentNotificationMethod>(method: Method, params: AgentNotificationParamsByMethod[Method]): Promise<void>;
    notify<Params = unknown>(method: string, params?: Params): Promise<void>;
}
/**
 * Message produced by an `ActiveSession`.
 *
 * `session_update` messages expose the typed `session/update` notification and
 * `stop` messages report the final `session/prompt` response. A prompt turn is
 * complete once a `stop` message is returned.
 */
export type ActiveSessionMessage = {
    /**
     * Indicates that this message came from a `session/update` notification.
     */
    kind: "session_update";
    /**
     * Full notification sent by the agent.
     */
    notification: schema.SessionNotification;
    /**
     * Convenience alias for `notification.update`.
     */
    update: schema.SessionUpdate;
} | {
    /**
     * Indicates that the prompt turn has completed.
     */
    kind: "stop";
    /**
     * Final response from `session/prompt`.
     */
    response: schema.PromptResponse;
    /**
     * Convenience alias for `response.stopReason`.
     */
    stopReason: schema.StopReason;
};
/**
 * Builder for creating an `ActiveSession`.
 *
 * Start from `ctx.buildSession("/absolute/cwd")` for the common case, or
 * pass a full `NewSessionRequest` to `ctx.buildSession(...)` when the session
 * needs MCP servers, `_meta`, or additional request fields. All paths in ACP
 * payloads should be absolute.
 */
export declare class SessionBuilder {
    private cx;
    private request;
    private constructor();
    /**
     * Returns the `session/new` request that will be sent.
     *
     * The returned object is a defensive copy, so mutating it does not change the
     * builder.
     */
    toRequest(): schema.NewSessionRequest;
    /**
     * Replaces the additional workspace roots for this session.
     *
     * `additionalDirectories` expand the session's file-system scope without
     * changing `cwd`. Each path should be absolute.
     */
    withAdditionalDirectories(additionalDirectories: string[]): this;
    /**
     * Adds one MCP server to the `session/new` request.
     */
    withMcpServer(mcpServer: schema.McpServer): this;
    /**
     * Starts the session and returns an `ActiveSession` for prompting and reading
     * updates.
     *
     * Call `dispose()` on the returned session when you no longer need update
     * routing, or use `withSession(...)` to scope disposal automatically.
     */
    start(options?: SendRequestOptions): Promise<ActiveSession>;
    /**
     * Starts the session, runs `op`, and disposes the active-session update
     * routing when `op` finishes or throws.
     */
    withSession<T>(op: (session: ActiveSession) => MaybePromise<T>): Promise<T>;
}
/**
 * Convenience wrapper for an active ACP session.
 *
 * An active session routes `session/update` notifications for one session ID
 * into an async queue. Use `prompt(...)` to send user content, then read updates
 * with `nextUpdate()` until a `stop` message is returned.
 */
export declare class ActiveSession {
    private cx;
    private sessionResponse;
    private updates;
    private registrations;
    private constructor();
    /**
     * Session ID returned by `session/new`.
     */
    get sessionId(): schema.SessionId;
    /**
     * Mode state returned when the session was created, if the agent provided it.
     */
    get modes(): schema.SessionModeState | null | undefined;
    /**
     * Metadata returned when the session was created.
     */
    get meta(): {
        [key: string]: unknown;
    } | null | undefined;
    /**
     * Full response returned by `session/new`.
     */
    get newSessionResponse(): schema.NewSessionResponse;
    /**
     * Sends a prompt to this session.
     *
     * Strings are converted to one text content block. A single content block is
     * wrapped in an array. The returned promise resolves with the final
     * `PromptResponse`, and the same completion is also queued as a `stop`
     * message for `nextUpdate()`.
     */
    prompt(prompt: string | schema.ContentBlock | Array<schema.ContentBlock>, options?: SendRequestOptions): Promise<schema.PromptResponse>;
    /**
     * Reads the next update or stop message for this session.
     */
    nextUpdate(): Promise<ActiveSessionMessage>;
    /**
     * Reads text chunks until the current prompt turn stops.
     *
     * Only `agent_message_chunk` updates with text content are appended. Other
     * update types are ignored by this helper; use `nextUpdate()` when you need
     * tool calls, plans, or the final `PromptResponse`.
     */
    readText(): Promise<string>;
    /**
     * Stops routing updates to this active-session helper.
     *
     * This does not close the ACP session on the agent. Use `ClientContext`
     * session lifecycle methods when the protocol session itself should be closed
     * or deleted.
     */
    dispose(): void;
    /**
     * Supports explicit resource management with `using`.
     */
    [Symbol.dispose](): void;
    private promptBlocks;
}
/**
 * Options used when creating an ACP app.
 */
export type AppOptions = {
    /**
     * Human-readable name used in JSON-RPC handler descriptions and diagnostics.
     */
    name?: string;
};
/**
 * Parser used by custom methods to validate or transform raw JSON-RPC params.
 *
 * A Zod schema can be passed directly because schemas expose a compatible
 * `parse(...)` method.
 */
export type ParamsParser<Params> = {
    /**
     * Parses raw JSON-RPC params into the handler's typed params.
     */
    parse: (params: unknown) => Params;
} | ((params: unknown) => Params);
/**
 * Common context passed to agent-side handlers.
 */
export type AgentHandlerContext<Params> = {
    /**
     * Parsed request or notification params.
     */
    params: Params;
    /**
     * AbortSignal for the current request, or the connection signal for
     * notifications.
     */
    signal: AbortSignal;
    /**
     * Typed client context for calling client-side ACP methods.
     */
    client: AgentContext;
};
/**
 * Context passed to agent-side request handlers.
 */
export type AgentRequestContext<Params> = AgentHandlerContext<Params> & {
    /**
     * JSON-RPC id of the request currently being handled.
     */
    requestId: JsonRpcId;
};
/**
 * Context passed to agent-side notification handlers.
 *
 * Notifications do not have JSON-RPC request ids.
 */
export type AgentNotificationContext<Params> = AgentHandlerContext<Params>;
/**
 * Common context passed to client-side handlers.
 */
export type ClientHandlerContext<Params> = {
    /**
     * Parsed request or notification params.
     */
    params: Params;
    /**
     * AbortSignal for the current request, or the connection signal for
     * notifications.
     */
    signal: AbortSignal;
    /**
     * Typed agent context for calling agent-side ACP methods.
     */
    agent: ClientContext;
};
/**
 * Context passed to client-side request handlers.
 */
export type ClientRequestContext<Params> = ClientHandlerContext<Params> & {
    /**
     * JSON-RPC id of the request currently being handled.
     */
    requestId: JsonRpcId;
};
/**
 * Context passed to client-side notification handlers.
 *
 * Notifications do not have JSON-RPC request ids.
 */
export type ClientNotificationContext<Params> = ClientHandlerContext<Params>;
/**
 * Request handler registered on an `AgentApp`.
 */
export type AgentRequestHandler<Params, Response> = (context: AgentRequestContext<Params>) => MaybePromise<Response>;
/**
 * Notification handler registered on an `AgentApp`.
 */
export type AgentNotificationHandler<Params> = (context: AgentNotificationContext<Params>) => MaybePromise<void>;
/**
 * Request handler registered on a `ClientApp`.
 */
export type ClientRequestHandler<Params, Response> = (context: ClientRequestContext<Params>) => MaybePromise<Response>;
/**
 * Notification handler registered on a `ClientApp`.
 */
export type ClientNotificationHandler<Params> = (context: ClientNotificationContext<Params>) => MaybePromise<void>;
/**
 * Handler called when an `AgentApp` opens a connection.
 */
export type AgentConnectHandler = (connection: AgentConnection) => MaybePromise<void>;
/**
 * Handler called when a `ClientApp` opens a connection.
 */
export type ClientConnectHandler = (connection: ClientConnection) => MaybePromise<void>;
/**
 * Agent request handlers keyed by ACP protocol method name.
 */
export type AgentRequestHandlersByMethod = {
    [schema.AGENT_METHODS.initialize]: AgentRequestHandler<schema.InitializeRequest, schema.InitializeResponse>;
    [schema.AGENT_METHODS.session_new]: AgentRequestHandler<schema.NewSessionRequest, schema.NewSessionResponse>;
    [schema.AGENT_METHODS.session_load]: AgentRequestHandler<schema.LoadSessionRequest, schema.LoadSessionResponse | void>;
    [schema.AGENT_METHODS.session_fork]: AgentRequestHandler<schema.ForkSessionRequest, schema.ForkSessionResponse>;
    [schema.AGENT_METHODS.session_list]: AgentRequestHandler<schema.ListSessionsRequest, schema.ListSessionsResponse>;
    [schema.AGENT_METHODS.session_delete]: AgentRequestHandler<schema.DeleteSessionRequest, schema.DeleteSessionResponse | void>;
    [schema.AGENT_METHODS.session_resume]: AgentRequestHandler<schema.ResumeSessionRequest, schema.ResumeSessionResponse>;
    [schema.AGENT_METHODS.session_close]: AgentRequestHandler<schema.CloseSessionRequest, schema.CloseSessionResponse | void>;
    [schema.AGENT_METHODS.session_set_mode]: AgentRequestHandler<schema.SetSessionModeRequest, schema.SetSessionModeResponse | void>;
    [schema.AGENT_METHODS.session_set_config_option]: AgentRequestHandler<schema.SetSessionConfigOptionRequest, schema.SetSessionConfigOptionResponse>;
    [schema.AGENT_METHODS.authenticate]: AgentRequestHandler<schema.AuthenticateRequest, schema.AuthenticateResponse | void>;
    [schema.AGENT_METHODS.providers_list]: AgentRequestHandler<schema.ListProvidersRequest, schema.ListProvidersResponse>;
    [schema.AGENT_METHODS.providers_set]: AgentRequestHandler<schema.SetProviderRequest, schema.SetProviderResponse | void>;
    [schema.AGENT_METHODS.providers_disable]: AgentRequestHandler<schema.DisableProviderRequest, schema.DisableProviderResponse | void>;
    [schema.AGENT_METHODS.logout]: AgentRequestHandler<schema.LogoutRequest, schema.LogoutResponse | void>;
    [schema.AGENT_METHODS.session_prompt]: AgentRequestHandler<schema.PromptRequest, schema.PromptResponse>;
    [schema.AGENT_METHODS.nes_start]: AgentRequestHandler<schema.StartNesRequest, schema.StartNesResponse>;
    [schema.AGENT_METHODS.nes_suggest]: AgentRequestHandler<schema.SuggestNesRequest, schema.SuggestNesResponse>;
    [schema.AGENT_METHODS.nes_close]: AgentRequestHandler<schema.CloseNesRequest, schema.CloseNesResponse | void>;
};
/**
 * ACP request methods that can be handled by an `AgentApp`.
 */
export type AgentRequestMethod = keyof AgentRequestHandlersByMethod & string;
/**
 * Agent notification handlers keyed by ACP protocol method name.
 */
export type AgentNotificationHandlersByMethod = {
    [schema.AGENT_METHODS
        .session_cancel]: AgentNotificationHandler<schema.CancelNotification>;
    [schema.AGENT_METHODS
        .document_did_open]: AgentNotificationHandler<schema.DidOpenDocumentNotification>;
    [schema.AGENT_METHODS
        .document_did_change]: AgentNotificationHandler<schema.DidChangeDocumentNotification>;
    [schema.AGENT_METHODS
        .document_did_close]: AgentNotificationHandler<schema.DidCloseDocumentNotification>;
    [schema.AGENT_METHODS
        .document_did_save]: AgentNotificationHandler<schema.DidSaveDocumentNotification>;
    [schema.AGENT_METHODS
        .document_did_focus]: AgentNotificationHandler<schema.DidFocusDocumentNotification>;
    [schema.AGENT_METHODS
        .nes_accept]: AgentNotificationHandler<schema.AcceptNesNotification>;
    [schema.AGENT_METHODS
        .nes_reject]: AgentNotificationHandler<schema.RejectNesNotification>;
};
/**
 * ACP notification methods that can be handled by an `AgentApp`.
 */
export type AgentNotificationMethod = keyof AgentNotificationHandlersByMethod & string;
/**
 * Client request handlers keyed by ACP protocol method name.
 */
export type ClientRequestHandlersByMethod = {
    [schema.CLIENT_METHODS.session_request_permission]: ClientRequestHandler<schema.RequestPermissionRequest, schema.RequestPermissionResponse>;
    [schema.CLIENT_METHODS.fs_write_text_file]: ClientRequestHandler<schema.WriteTextFileRequest, schema.WriteTextFileResponse | void>;
    [schema.CLIENT_METHODS.fs_read_text_file]: ClientRequestHandler<schema.ReadTextFileRequest, schema.ReadTextFileResponse>;
    [schema.CLIENT_METHODS.terminal_create]: ClientRequestHandler<schema.CreateTerminalRequest, schema.CreateTerminalResponse>;
    [schema.CLIENT_METHODS.terminal_output]: ClientRequestHandler<schema.TerminalOutputRequest, schema.TerminalOutputResponse>;
    [schema.CLIENT_METHODS.terminal_release]: ClientRequestHandler<schema.ReleaseTerminalRequest, schema.ReleaseTerminalResponse | void>;
    [schema.CLIENT_METHODS.terminal_wait_for_exit]: ClientRequestHandler<schema.WaitForTerminalExitRequest, schema.WaitForTerminalExitResponse>;
    [schema.CLIENT_METHODS.terminal_kill]: ClientRequestHandler<schema.KillTerminalRequest, schema.KillTerminalResponse | void>;
    [schema.CLIENT_METHODS.elicitation_create]: ClientRequestHandler<schema.CreateElicitationRequest, schema.CreateElicitationResponse>;
};
/**
 * ACP request methods that can be handled by a `ClientApp`.
 */
export type ClientRequestMethod = keyof ClientRequestHandlersByMethod & string;
/**
 * Client notification handlers keyed by ACP protocol method name.
 */
export type ClientNotificationHandlersByMethod = {
    [schema.CLIENT_METHODS
        .session_update]: ClientNotificationHandler<schema.SessionNotification>;
    [schema.CLIENT_METHODS
        .elicitation_complete]: ClientNotificationHandler<schema.CompleteElicitationNotification>;
};
/**
 * ACP notification methods that can be handled by a `ClientApp`.
 */
export type ClientNotificationMethod = keyof ClientNotificationHandlersByMethod & string;
/**
 * Agent request params keyed by ACP protocol method name.
 */
export type AgentRequestParamsByMethod = {
    [Method in AgentRequestMethod]: AgentRequestHandlersByMethod[Method] extends (context: infer Context) => MaybePromise<unknown> ? Context extends {
        params: infer Params;
    } ? Params : never : never;
};
/**
 * Agent request responses keyed by ACP protocol method name.
 */
export type AgentRequestResponsesByMethod = {
    [Method in AgentRequestMethod]: AgentRequestHandlersByMethod[Method] extends (context: infer _Context) => MaybePromise<infer Response> ? Exclude<Response, void> : never;
};
/**
 * Agent notification params keyed by ACP protocol method name.
 */
export type AgentNotificationParamsByMethod = {
    [Method in AgentNotificationMethod]: AgentNotificationHandlersByMethod[Method] extends (context: infer Context) => MaybePromise<void> ? Context extends {
        params: infer Params;
    } ? Params : never : never;
};
/**
 * Client request params keyed by ACP protocol method name.
 */
export type ClientRequestParamsByMethod = {
    [Method in ClientRequestMethod]: ClientRequestHandlersByMethod[Method] extends (context: infer Context) => MaybePromise<unknown> ? Context extends {
        params: infer Params;
    } ? Params : never : never;
};
/**
 * Client request responses keyed by ACP protocol method name.
 */
export type ClientRequestResponsesByMethod = {
    [Method in ClientRequestMethod]: ClientRequestHandlersByMethod[Method] extends (context: infer _Context) => MaybePromise<infer Response> ? Exclude<Response, void> : never;
};
/**
 * Client notification params keyed by ACP protocol method name.
 */
export type ClientNotificationParamsByMethod = {
    [Method in ClientNotificationMethod]: ClientNotificationHandlersByMethod[Method] extends (context: infer Context) => MaybePromise<void> ? Context extends {
        params: infer Params;
    } ? Params : never : never;
};
/**
 * Creates an agent-side app.
 *
 * Register request and notification handlers by ACP method name, then call
 * `connect(stream)` to serve an ACP client.
 */
export declare function agent(options?: AppOptions): AgentApp;
/**
 * Agent-side app builder.
 *
 * Methods on this class register typed request or notification handlers and
 * return `this`, so apps can be built with a fluent chain. Handler params are
 * parsed with the generated ACP schemas before your handler runs, and thrown
 * errors are converted to JSON-RPC errors by the connection layer.
 */
export declare class AgentApp {
    private readonly builder;
    private readonly connectHandlers;
    constructor(options?: AppOptions);
    /**
     * Connects this agent app to a transport stream.
     */
    connect(stream: Stream): AgentConnection;
    /**
     * Connects this agent app directly to a client app.
     *
     * This is useful for tests and in-process examples that do not need a
     * transport.
     */
    connect(client: ClientApp): AgentConnection;
    /**
     * Connects this agent app to a transport stream for the lifetime of `op`.
     *
     * The callback receives an `AgentContext` for calling client-side methods.
     * When `op` resolves or rejects, the connection is closed.
     */
    connectWith<T>(stream: Stream, op: (context: AgentContext) => MaybePromise<T>): Promise<T>;
    /**
     * Connects this agent app directly to a client app for the lifetime of `op`.
     */
    connectWith<T>(client: ClientApp, op: (context: AgentContext) => MaybePromise<T>): Promise<T>;
    /**
     * Registers a handler that runs when this agent app opens a connection.
     *
     * Use this for connection-scoped work that needs to call client-side ACP
     * methods outside an inbound request handler.
     */
    onConnect(handler: AgentConnectHandler): this;
    /**
     * Registers a request handler by ACP method name.
     *
     * Built-in method literals infer their params and response types from
     * `method`. Pass a parser as the second argument to register custom extension
     * methods.
     */
    onRequest<Method extends AgentRequestMethod>(method: Method, handler: AgentRequestHandlersByMethod[Method]): this;
    onRequest<Params, Response>(method: string, params: ParamsParser<Params>, handler: AgentRequestHandler<Params, Response>): this;
    /**
     * Registers a notification handler by ACP method name.
     *
     * Built-in method literals infer their params type from `method`. Pass a
     * parser as the second argument to register custom extension notifications.
     */
    onNotification<Method extends AgentNotificationMethod>(method: Method, handler: AgentNotificationHandlersByMethod[Method]): this;
    onNotification<Params>(method: string, params: ParamsParser<Params>, handler: AgentNotificationHandler<Params>): this;
    private request;
    private notification;
    private connectConnection;
    private openStreamConnection;
}
/**
 * Creates a client-side app.
 *
 * Register request and notification handlers by ACP method name, then use
 * `connectWith(...)` to run the workflow that calls agent-side methods.
 */
export declare function client(options?: AppOptions): ClientApp;
/**
 * Client-side app builder.
 *
 * Methods on this class register typed client handlers and return `this`, so
 * apps can be built with a fluent chain. `connectWith(...)` is the usual entry
 * point for clients because it provides a `ClientContext` for calling
 * agent-side requests and session helpers.
 */
export declare class ClientApp {
    private readonly builder;
    private readonly connectHandlers;
    constructor(options?: AppOptions);
    /**
     * Connects this client app to a transport stream.
     */
    connect(stream: Stream): ClientConnection;
    /**
     * Connects this client app directly to an agent app.
     *
     * This is useful for tests and in-process examples that do not need a
     * transport.
     */
    connect(agent: AgentApp): ClientConnection;
    /**
     * Connects this client app to a transport stream for the lifetime of `op`.
     *
     * The callback receives a `ClientContext` for calling agent-side methods.
     * When `op` resolves or rejects, the connection is closed.
     */
    connectWith<T>(stream: Stream, op: (context: ClientContext) => MaybePromise<T>): Promise<T>;
    /**
     * Connects this client app directly to an agent app for the lifetime of `op`.
     */
    connectWith<T>(agent: AgentApp, op: (context: ClientContext) => MaybePromise<T>): Promise<T>;
    /**
     * Registers a handler that runs when this client app opens a connection.
     *
     * Use this for connection-scoped work that needs to call agent-side ACP
     * methods outside an inbound request handler.
     */
    onConnect(handler: ClientConnectHandler): this;
    /**
     * Registers a client request handler by ACP method name.
     *
     * Built-in method literals infer their params and response types from
     * `method`. Pass a parser as the second argument to register custom extension
     * methods.
     */
    onRequest<Method extends ClientRequestMethod>(method: Method, handler: ClientRequestHandlersByMethod[Method]): this;
    onRequest<Params, Response>(method: string, params: ParamsParser<Params>, handler: ClientRequestHandler<Params, Response>): this;
    /**
     * Registers a client notification handler by ACP method name.
     *
     * Built-in method literals infer their params type from `method`. Pass a
     * parser as the second argument to register custom extension notifications.
     */
    onNotification<Method extends ClientNotificationMethod>(method: Method, handler: ClientNotificationHandlersByMethod[Method]): this;
    onNotification<Params>(method: string, params: ParamsParser<Params>, handler: ClientNotificationHandler<Params>): this;
    private request;
    private notification;
    private connectConnection;
    private openStreamConnection;
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
export declare class AgentSideConnection {
    private connection;
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
    constructor(toAgent: (conn: AgentSideConnection) => Agent, stream: Stream);
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
    sessionUpdate(params: schema.SessionNotification): Promise<void>;
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
    requestPermission(params: schema.RequestPermissionRequest): Promise<schema.RequestPermissionResponse>;
    /**
     * Reads content from a text file in the client's file system.
     *
     * Only available if the client advertises the `fs.readTextFile` capability.
     * Allows the agent to access file contents within the client's environment.
     *
     * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
     */
    readTextFile(params: schema.ReadTextFileRequest): Promise<schema.ReadTextFileResponse>;
    /**
     * Writes content to a text file in the client's file system.
     *
     * Only available if the client advertises the `fs.writeTextFile` capability.
     * Allows the agent to create or modify files within the client's environment.
     *
     * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
     */
    writeTextFile(params: schema.WriteTextFileRequest): Promise<schema.WriteTextFileResponse>;
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
    createTerminal(params: schema.CreateTerminalRequest): Promise<TerminalHandle>;
    /** Creates an elicitation to request input from the user. */
    createElicitation(params: schema.CreateElicitationRequest): Promise<schema.CreateElicitationResponse>;
    /** Notifies the client that a URL-based elicitation is complete. */
    completeElicitation(params: schema.CompleteElicitationNotification): Promise<void>;
    /**
     * Sends a request to the client by ACP method name.
     *
     * Built-in method literals infer their params and response types. Custom
     * methods can specify their response and params types with generics.
     */
    request<Method extends ClientRequestMethod>(method: Method, params: ClientRequestParamsByMethod[Method], options?: SendRequestOptions): Promise<ClientRequestResponsesByMethod[Method]>;
    request<Response = unknown, Params = unknown>(method: string, params?: Params, options?: SendRequestOptions): Promise<Response>;
    /**
     * Sends a notification to the client by ACP method name.
     *
     * Built-in method literals infer their params type. Custom notifications can
     * specify their params type with a generic.
     */
    notify<Method extends ClientNotificationMethod>(method: Method, params: ClientNotificationParamsByMethod[Method]): Promise<void>;
    notify<Params = unknown>(method: string, params?: Params): Promise<void>;
    /**
     * Extension method.
     *
     * @deprecated Use {@link request}.
     */
    extMethod(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
    /**
     * Extension notification.
     *
     * @deprecated Use {@link notify}.
     */
    extNotification(method: string, params: Record<string, unknown>): Promise<void>;
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
    get signal(): AbortSignal;
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
    get closed(): Promise<void>;
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
export declare class TerminalHandle {
    /**
     * Terminal identifier returned by `terminal/create`.
     */
    id: string;
    private sessionId;
    private connection;
    private constructor();
    /**
     * Gets the current terminal output without waiting for the command to exit.
     */
    currentOutput(): Promise<schema.TerminalOutputResponse>;
    /**
     * Waits for the terminal command to complete and returns its exit status.
     */
    waitForExit(): Promise<schema.WaitForTerminalExitResponse>;
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
    kill(): Promise<schema.KillTerminalResponse>;
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
    release(): Promise<schema.ReleaseTerminalResponse | void>;
    /**
     * Releases the terminal when used with `await using`.
     */
    [Symbol.asyncDispose](): Promise<void>;
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
export declare class ClientSideConnection implements Agent {
    private connection;
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
    constructor(toClient: (agent: Agent) => Client, stream: Stream);
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
    initialize(params: schema.InitializeRequest): Promise<schema.InitializeResponse>;
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
    newSession(params: schema.NewSessionRequest): Promise<schema.NewSessionResponse>;
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
    loadSession(params: schema.LoadSessionRequest): Promise<schema.LoadSessionResponse>;
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
    unstable_forkSession(params: schema.ForkSessionRequest): Promise<schema.ForkSessionResponse>;
    /**
     * Lists existing sessions from the agent.
     *
     * This method is only available if the agent advertises the `listSessions` capability.
     *
     * Returns a list of sessions with metadata like session ID, working directory,
     * title, and last update time. Supports filtering by working directory,
     * `additionalDirectories`, and cursor-based pagination.
     */
    listSessions(params: schema.ListSessionsRequest): Promise<schema.ListSessionsResponse>;
    /**
     * Deletes an existing session returned by `session/list`.
     *
     * This method is only available if the agent advertises the `sessionCapabilities.delete` capability.
     */
    deleteSession(params: schema.DeleteSessionRequest): Promise<schema.DeleteSessionResponse>;
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
    resumeSession(params: schema.ResumeSessionRequest): Promise<schema.ResumeSessionResponse>;
    /**
     * Closes an active session and frees up any resources associated with it.
     *
     * This method is only available if the agent advertises the `session.close` capability.
     *
     * The agent must cancel any ongoing work (as if `session/cancel` was called)
     * and then free up any resources associated with the session.
     */
    closeSession(params: schema.CloseSessionRequest): Promise<schema.CloseSessionResponse>;
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
    setSessionMode(params: schema.SetSessionModeRequest): Promise<schema.SetSessionModeResponse>;
    /**
     * Set a configuration option for a given session.
     *
     * The response contains the full set of configuration options and their current values,
     * as changing one option may affect the available values or state of other options.
     */
    setSessionConfigOption(params: schema.SetSessionConfigOptionRequest): Promise<schema.SetSessionConfigOptionResponse>;
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
    authenticate(params: schema.AuthenticateRequest): Promise<schema.AuthenticateResponse>;
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
    unstable_listProviders(params: schema.ListProvidersRequest): Promise<schema.ListProvidersResponse>;
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
    unstable_setProvider(params: schema.SetProviderRequest): Promise<schema.SetProviderResponse>;
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
    unstable_disableProvider(params: schema.DisableProviderRequest): Promise<schema.DisableProviderResponse>;
    /**
     * Logout of the current authentication method.
     */
    logout(params: schema.LogoutRequest): Promise<schema.LogoutResponse>;
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
    prompt(params: schema.PromptRequest): Promise<schema.PromptResponse>;
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
    cancel(params: schema.CancelNotification): Promise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Starts a NES (Next Edit Suggestions) session.
     *
     * @experimental
     */
    unstable_startNes(params: schema.StartNesRequest): Promise<schema.StartNesResponse>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Sends a NES suggestion request.
     *
     * @experimental
     */
    unstable_suggestNes(params: schema.SuggestNesRequest): Promise<schema.SuggestNesResponse>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Closes a NES session.
     *
     * @experimental
     */
    unstable_closeNes(params: schema.CloseNesRequest): Promise<schema.CloseNesResponse>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document was opened.
     *
     * @experimental
     */
    unstable_didOpenDocument(params: schema.DidOpenDocumentNotification): Promise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document was changed.
     *
     * @experimental
     */
    unstable_didChangeDocument(params: schema.DidChangeDocumentNotification): Promise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document was closed.
     *
     * @experimental
     */
    unstable_didCloseDocument(params: schema.DidCloseDocumentNotification): Promise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document was saved.
     *
     * @experimental
     */
    unstable_didSaveDocument(params: schema.DidSaveDocumentNotification): Promise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a document received focus.
     *
     * @experimental
     */
    unstable_didFocusDocument(params: schema.DidFocusDocumentNotification): Promise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a NES suggestion was accepted.
     *
     * @experimental
     */
    unstable_acceptNes(params: schema.AcceptNesNotification): Promise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Notifies the agent that a NES suggestion was rejected.
     *
     * @experimental
     */
    unstable_rejectNes(params: schema.RejectNesNotification): Promise<void>;
    /**
     * Sends a request to the agent by ACP method name.
     *
     * Built-in method literals infer their params and response types. Custom
     * methods can specify their response and params types with generics.
     */
    request<Method extends AgentRequestMethod>(method: Method, params: AgentRequestParamsByMethod[Method], options?: SendRequestOptions): Promise<AgentRequestResponsesByMethod[Method]>;
    request<Response = unknown, Params = unknown>(method: string, params?: Params, options?: SendRequestOptions): Promise<Response>;
    /**
     * Sends a notification to the agent by ACP method name.
     *
     * Built-in method literals infer their params type. Custom notifications can
     * specify their params type with a generic.
     */
    notify<Method extends AgentNotificationMethod>(method: Method, params: AgentNotificationParamsByMethod[Method]): Promise<void>;
    notify<Params = unknown>(method: string, params?: Params): Promise<void>;
    /**
     * Extension method.
     *
     * @deprecated Use {@link request}.
     */
    extMethod(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
    /**
     * Extension notification.
     *
     * @deprecated Use {@link notify}.
     */
    extNotification(method: string, params: Record<string, unknown>): Promise<void>;
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
    get signal(): AbortSignal;
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
    get closed(): Promise<void>;
}
/**
 * The Client interface defines the interface that ACP-compliant clients must implement.
 *
 * Clients are typically code editors (IDEs, text editors) that provide the interface
 * between users and AI agents. They manage the environment, handle user interactions,
 * and control access to resources.
 */
export interface Client {
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
    requestPermission(params: schema.RequestPermissionRequest): MaybePromise<schema.RequestPermissionResponse>;
    /**
     * Handles session update notifications from the agent.
     *
     * This is a notification endpoint (no response expected) that receives
     * real-time updates about session progress, including message chunks,
     * tool calls, and execution plans.
     *
     * Note: Clients SHOULD continue accepting tool call updates even after
     * sending a `session/cancel` notification, as the agent may send final
     * updates before responding with the cancelled stop reason.
     *
     * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
     */
    sessionUpdate(params: schema.SessionNotification): MaybePromise<void>;
    /**
     * Writes content to a text file in the client's file system.
     *
     * Only available if the client advertises the `fs.writeTextFile` capability.
     * Allows the agent to create or modify files within the client's environment.
     *
     * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
     */
    writeTextFile?(params: schema.WriteTextFileRequest): MaybePromise<schema.WriteTextFileResponse | void>;
    /**
     * Reads content from a text file in the client's file system.
     *
     * Only available if the client advertises the `fs.readTextFile` capability.
     * Allows the agent to access file contents within the client's environment.
     *
     * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
     */
    readTextFile?(params: schema.ReadTextFileRequest): MaybePromise<schema.ReadTextFileResponse>;
    /**
     * Creates a new terminal to execute a command.
     *
     * Only available if the `terminal` capability is set to `true`.
     *
     * The Agent must call `releaseTerminal` when done with the terminal
     * to free resources.
  
     * @see {@link https://agentclientprotocol.com/protocol/terminals | Terminal Documentation}
     */
    createTerminal?(params: schema.CreateTerminalRequest): MaybePromise<schema.CreateTerminalResponse>;
    /**
     * Gets the current output and exit status of a terminal.
     *
     * Returns immediately without waiting for the command to complete.
     * If the command has already exited, the exit status is included.
     *
     * @see {@link https://agentclientprotocol.com/protocol/terminals#getting-output | Getting Terminal Output}
     */
    terminalOutput?(params: schema.TerminalOutputRequest): MaybePromise<schema.TerminalOutputResponse>;
    /**
     * Releases a terminal and frees all associated resources.
     *
     * The command is killed if it hasn't exited yet. After release,
     * the terminal ID becomes invalid for all other terminal methods.
     *
     * Tool calls that already contain the terminal ID continue to
     * display its output.
     *
     * @see {@link https://agentclientprotocol.com/protocol/terminals#releasing-terminals | Releasing Terminals}
     */
    releaseTerminal?(params: schema.ReleaseTerminalRequest): MaybePromise<schema.ReleaseTerminalResponse | void>;
    /**
     * Waits for a terminal command to exit and returns its exit status.
     *
     * This method returns once the command completes, providing the
     * exit code and/or signal that terminated the process.
     *
     * @see {@link https://agentclientprotocol.com/protocol/terminals#waiting-for-exit | Waiting for Exit}
     */
    waitForTerminalExit?(params: schema.WaitForTerminalExitRequest): MaybePromise<schema.WaitForTerminalExitResponse>;
    /**
     * Kills a terminal command without releasing the terminal.
     *
     * While `releaseTerminal` also kills the command, this method keeps
     * the terminal ID valid so it can be used with other methods.
     *
     * Useful for implementing command timeouts that terminate the command
     * and then retrieve the final output.
     *
     * Note: Call `releaseTerminal` when the terminal is no longer needed.
     *
     * @see {@link https://agentclientprotocol.com/protocol/terminals#killing-commands | Killing Commands}
     */
    killTerminal?(params: schema.KillTerminalRequest): MaybePromise<schema.KillTerminalResponse | void>;
    /** Creates an elicitation to request input from the user. */
    createElicitation?(params: schema.CreateElicitationRequest): MaybePromise<schema.CreateElicitationResponse>;
    /** Called when a URL-based elicitation is complete. */
    completeElicitation?(params: schema.CompleteElicitationNotification): MaybePromise<void>;
    /**
     * Handles a request that is not otherwise registered by the legacy client.
     *
     * Allows the Agent to send an arbitrary request that is not part of the ACP spec.
     *
     * To help avoid conflicts, it's a good practice to prefix extension
     * methods with a unique identifier such as domain name.
     *
     * @deprecated Prefer `client().onRequest(...)` for custom methods.
     */
    extMethod?(method: string, params: Record<string, unknown>): MaybePromise<Record<string, unknown>>;
    /**
     * Handles a notification that is not otherwise registered by the legacy client.
     *
     * Allows the Agent to send an arbitrary notification that is not part of the ACP spec.
     *
     * @deprecated Prefer `client().onNotification(...)` for custom notifications.
     */
    extNotification?(method: string, params: Record<string, unknown>): MaybePromise<void>;
}
/**
 * The Agent interface defines the interface that all ACP-compliant agents must implement.
 *
 * Agents are programs that use generative AI to autonomously modify code. They handle
 * requests from clients and execute tasks using language models and tools.
 */
export interface Agent {
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
    initialize(params: schema.InitializeRequest): MaybePromise<schema.InitializeResponse>;
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
    newSession(params: schema.NewSessionRequest): MaybePromise<schema.NewSessionResponse>;
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
    loadSession?(params: schema.LoadSessionRequest): MaybePromise<schema.LoadSessionResponse | void>;
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
    unstable_forkSession?(params: schema.ForkSessionRequest): MaybePromise<schema.ForkSessionResponse>;
    /**
     * Lists existing sessions from the agent.
     *
     * This method is only available if the agent advertises the `listSessions` capability.
     *
     * Returns a list of sessions with metadata like session ID, working directory,
     * title, and last update time. Supports filtering by working directory,
     * `additionalDirectories`, and cursor-based pagination.
     */
    listSessions?(params: schema.ListSessionsRequest): MaybePromise<schema.ListSessionsResponse>;
    /**
     * Deletes an existing session returned by `session/list`.
     *
     * This method is only available if the agent advertises the `sessionCapabilities.delete` capability.
     */
    deleteSession?(params: schema.DeleteSessionRequest): MaybePromise<schema.DeleteSessionResponse | void>;
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
    resumeSession?(params: schema.ResumeSessionRequest): MaybePromise<schema.ResumeSessionResponse>;
    /**
     * Closes an active session and frees up any resources associated with it.
     *
     * This method is only available if the agent advertises the `session.close` capability.
     *
     * The agent must cancel any ongoing work (as if `session/cancel` was called)
     * and then free up any resources associated with the session.
     */
    closeSession?(params: schema.CloseSessionRequest): MaybePromise<schema.CloseSessionResponse | void>;
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
    setSessionMode?(params: schema.SetSessionModeRequest): MaybePromise<schema.SetSessionModeResponse | void>;
    /**
     * Set a configuration option for a given session.
     *
     * The response contains the full set of configuration options and their current values,
     * as changing one option may affect the available values or state of other options.
     */
    setSessionConfigOption?(params: schema.SetSessionConfigOptionRequest): MaybePromise<schema.SetSessionConfigOptionResponse>;
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
    authenticate(params: schema.AuthenticateRequest): MaybePromise<schema.AuthenticateResponse | void>;
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
    unstable_listProviders?(params: schema.ListProvidersRequest): MaybePromise<schema.ListProvidersResponse>;
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
    unstable_setProvider?(params: schema.SetProviderRequest): MaybePromise<schema.SetProviderResponse | void>;
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
    unstable_disableProvider?(params: schema.DisableProviderRequest): MaybePromise<schema.DisableProviderResponse | void>;
    /**
     * Logout of the current authentication method.
     */
    logout?(params: schema.LogoutRequest): MaybePromise<schema.LogoutResponse | void>;
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
    prompt(params: schema.PromptRequest): MaybePromise<schema.PromptResponse>;
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
    cancel(params: schema.CancelNotification): MaybePromise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Starts a NES (Next Edit Suggestions) session.
     *
     * @experimental
     */
    unstable_startNes?(params: schema.StartNesRequest): MaybePromise<schema.StartNesResponse>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Sends a NES suggestion request.
     *
     * @experimental
     */
    unstable_suggestNes?(params: schema.SuggestNesRequest): MaybePromise<schema.SuggestNesResponse>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Closes a NES session.
     *
     * @experimental
     */
    unstable_closeNes?(params: schema.CloseNesRequest): MaybePromise<schema.CloseNesResponse | void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Called when a document is opened.
     *
     * @experimental
     */
    unstable_didOpenDocument?(params: schema.DidOpenDocumentNotification): MaybePromise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Called when a document is changed.
     *
     * @experimental
     */
    unstable_didChangeDocument?(params: schema.DidChangeDocumentNotification): MaybePromise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Called when a document is closed.
     *
     * @experimental
     */
    unstable_didCloseDocument?(params: schema.DidCloseDocumentNotification): MaybePromise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Called when a document is saved.
     *
     * @experimental
     */
    unstable_didSaveDocument?(params: schema.DidSaveDocumentNotification): MaybePromise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Called when a document receives focus.
     *
     * @experimental
     */
    unstable_didFocusDocument?(params: schema.DidFocusDocumentNotification): MaybePromise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Called when a NES suggestion is accepted.
     *
     * @experimental
     */
    unstable_acceptNes?(params: schema.AcceptNesNotification): MaybePromise<void>;
    /**
     * **UNSTABLE**: This capability is not part of the spec yet, and may be removed or changed at any point.
     *
     * Called when a NES suggestion is rejected.
     *
     * @experimental
     */
    unstable_rejectNes?(params: schema.RejectNesNotification): MaybePromise<void>;
    /**
     * Handles a request that is not otherwise registered by the legacy agent.
     *
     * Allows the Client to send an arbitrary request that is not part of the ACP spec.
     *
     * To help avoid conflicts, it's a good practice to prefix extension
     * methods with a unique identifier such as domain name.
     *
     * @deprecated Prefer `agent().onRequest(...)` for custom methods.
     */
    extMethod?(method: string, params: Record<string, unknown>): MaybePromise<Record<string, unknown>>;
    /**
     * Handles a notification that is not otherwise registered by the legacy agent.
     *
     * Allows the Client to send an arbitrary notification that is not part of the ACP spec.
     *
     * @deprecated Prefer `agent().onNotification(...)` for custom notifications.
     */
    extNotification?(method: string, params: Record<string, unknown>): MaybePromise<void>;
}
