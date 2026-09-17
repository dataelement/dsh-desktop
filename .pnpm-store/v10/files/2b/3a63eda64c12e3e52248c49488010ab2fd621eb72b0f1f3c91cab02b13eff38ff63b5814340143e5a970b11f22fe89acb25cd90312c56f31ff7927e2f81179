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
export type * from "./schema/types.gen.js";
export { AuthMethod, AvailableCommandInput, ContentBlock, CreateElicitationRequest, CreateElicitationResponse, DiffChange, ElicitationPropertySchema, McpServer, MultiSelectItems, NesSuggestion, PlanUpdateContent, ReplayFrom, RequestPermissionOutcome, RequestPermissionSubject, SessionConfigOption, SessionUpdate, SetSessionConfigOptionRequest, StateUpdate, ToolCallContent, } from "./schema/guards.gen.js";
export { AGENT_METHODS, CLIENT_METHODS, PROTOCOL_METHODS, PROTOCOL_VERSION, } from "./schema/index.js";
/**
 * Experimental draft ACP v2 transport stream supporting individual and batch
 * JSON-RPC messages.
 *
 * @experimental
 */
export type WireStream = {
    /** Outgoing individual or batch JSON-RPC messages. */
    writable: WritableStream<AnyWireMessage>;
    /** Incoming individual or batch JSON-RPC messages. */
    readable: ReadableStream<AnyWireMessage>;
};
/**
 * Consumer-facing alias for the experimental draft ACP v2 wire stream.
 *
 * @experimental
 */
export type Stream = WireStream;
/**
 * Creates an experimental draft ACP v2 stream from newline-delimited JSON.
 *
 * Individual and batch JSON-RPC messages are accepted by default.
 *
 * @experimental
 */
export declare function ndJsonStream(output: WritableStream<Uint8Array>, input: ReadableStream<Uint8Array>): Stream;
export { RequestError } from "../jsonrpc.js";
export { AgentProtocolRouter, agentProtocolRouter, } from "../protocol-router.js";
export type { AgentConnectOptions, AgentConnectionLifecycle, AgentConnector, } from "../connection.js";
export type { AnyBatchCall, AnyBatchMessage, AnyBatchResponse, AnyCall, AnyMessage, AnyNotification, AnyRequest, AnyResponse, AnyWireMessage, BatchEntry, BatchNotification, BatchOutputs, BatchRequest, ErrorResponse, JsonRpcId, MaybePromise, Result, SendRequestOptions, } from "../jsonrpc.js";
import type { AnyWireMessage, BatchEntry, BatchNotification, BatchOutputs, BatchRequest, JsonRpcId, MaybePromise, SendRequestOptions } from "../jsonrpc.js";
/**
 * ACP v2 extension method name.
 *
 * New custom methods should begin with `_` so they cannot collide with present
 * or future protocol methods.
 *
 * @experimental
 */
export type ExtensionMethod = `_${string}`;
/**
 * A method name that is not part of the current ACP v2 draft.
 *
 * This compatibility type permits methods from older or newer unstable ACP
 * revisions while preventing current built-in method literals from falling
 * through the untyped overloads. Prefer {@link ExtensionMethod} for new custom
 * methods.
 *
 * @experimental
 */
export type UnrecognizedMethod<Method extends string> = string extends Method ? Method : Method extends AgentRequestMethod | AgentNotificationMethod | ClientRequestMethod | ClientNotificationMethod | typeof schema.PROTOCOL_METHODS.cancel_request ? never : Method;
/**
 * Creates a typed request descriptor for an ACP v2 batch.
 *
 * Built-in method literals infer their params and response types. Extension
 * methods retain the low-level helper's explicit params/response generics.
 *
 * @experimental
 */
export declare function batchRequest<Method extends AgentRequestMethod>(method: Method, params: AgentRequestParamsByMethod[Method], options?: SendRequestOptions): BatchRequest<AgentRequestParamsByMethod[Method], AgentRequestResponsesByMethod[Method]> & {
    readonly method: Method;
};
export declare function batchRequest<Method extends AgentRequestMethod, Output>(method: Method, params: AgentRequestParamsByMethod[Method], mapResponse: (response: AgentRequestResponsesByMethod[Method]) => Output, options?: SendRequestOptions): BatchRequest<AgentRequestParamsByMethod[Method], AgentRequestResponsesByMethod[Method], Output> & {
    readonly method: Method;
};
export declare function batchRequest<Method extends ClientRequestMethod>(method: Method, params: ClientRequestParamsByMethod[Method], options?: SendRequestOptions): BatchRequest<ClientRequestParamsByMethod[Method], ClientRequestResponsesByMethod[Method]> & {
    readonly method: Method;
};
export declare function batchRequest<Method extends ClientRequestMethod, Output>(method: Method, params: ClientRequestParamsByMethod[Method], mapResponse: (response: ClientRequestResponsesByMethod[Method]) => Output, options?: SendRequestOptions): BatchRequest<ClientRequestParamsByMethod[Method], ClientRequestResponsesByMethod[Method], Output> & {
    readonly method: Method;
};
export declare function batchRequest<Params, Response>(method: ExtensionMethod, params?: Params, options?: SendRequestOptions): BatchRequest<Params, Response> & {
    readonly method: ExtensionMethod;
};
export declare function batchRequest<Params, Response, Output>(method: ExtensionMethod, params: Params | undefined, mapResponse: (response: Response) => Output, options?: SendRequestOptions): BatchRequest<Params, Response, Output> & {
    readonly method: ExtensionMethod;
};
export declare function batchRequest<Params = unknown, Response = unknown, const Method extends string = never>(method: UnrecognizedMethod<Method>, params?: Params, options?: SendRequestOptions): BatchRequest<Params, Response> & {
    readonly method: Method;
};
export declare function batchRequest<Params = unknown, Response = unknown, Output = Response, const Method extends string = never>(method: UnrecognizedMethod<Method>, params: Params | undefined, mapResponse: (response: Response) => Output, options?: SendRequestOptions): BatchRequest<Params, Response, Output> & {
    readonly method: Method;
};
/**
 * Creates a typed notification descriptor for an ACP v2 batch.
 *
 * @experimental
 */
export declare function batchNotification<Method extends AgentNotificationMethod>(method: Method, params: AgentNotificationParamsByMethod[Method]): BatchNotification<AgentNotificationParamsByMethod[Method]> & {
    readonly method: Method;
};
export declare function batchNotification<Method extends ClientNotificationMethod>(method: Method, params: ClientNotificationParamsByMethod[Method]): BatchNotification<ClientNotificationParamsByMethod[Method]> & {
    readonly method: Method;
};
export declare function batchNotification(method: typeof schema.PROTOCOL_METHODS.cancel_request, params: schema.CancelRequestNotification): BatchNotification<schema.CancelRequestNotification> & {
    readonly method: typeof schema.PROTOCOL_METHODS.cancel_request;
};
export declare function batchNotification<Params>(method: ExtensionMethod, params?: Params): BatchNotification<Params> & {
    readonly method: ExtensionMethod;
};
export declare function batchNotification<Params = unknown, const Method extends string = never>(method: UnrecognizedMethod<Method>, params?: Params): BatchNotification<Params> & {
    readonly method: Method;
};
/**
 * Validated initialize request and response for one ACP v2 connection.
 *
 * The snapshot becomes available only after the initialize response has been
 * validated and sent or received successfully.
 *
 * @experimental
 */
export type InitializationSnapshot = Readonly<{
    request: schema.InitializeRequest;
    response: schema.InitializeResponse;
}>;
/**
 * ACP method-name constants for the experimental draft v2 API.
 *
 * Use these with `onRequest(...)`, `onNotification(...)`, `request(...)`, and
 * `notify(...)` when you want literal-string type inference without spelling
 * protocol strings inline.
 *
 * @experimental
 */
export declare const methods: {
    readonly agent: {
        readonly initialize: "initialize";
        readonly auth: {
            readonly login: "auth/login";
            readonly logout: "auth/logout";
        };
        readonly providers: {
            readonly list: "providers/list";
            readonly set: "providers/set";
            readonly disable: "providers/disable";
        };
        readonly session: {
            readonly new: "session/new";
            readonly list: "session/list";
            readonly delete: "session/delete";
            readonly fork: "session/fork";
            readonly resume: "session/resume";
            readonly close: "session/close";
            readonly setConfigOption: "session/set_config_option";
            readonly prompt: "session/prompt";
            readonly cancel: "session/cancel";
        };
        readonly mcp: {
            readonly message: "mcp/message";
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
        readonly mcp: {
            readonly connect: "mcp/connect";
            readonly message: "mcp/message";
            readonly disconnect: "mcp/disconnect";
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
 * Experimental draft ACP v2 connection returned by `AgentApp.connect(...)` and
 * `ClientApp.connect(...)`.
 *
 * Use this handle when you need a connection to stay open independently of a
 * single `connectWith(...)` operation.
 *
 * @experimental
 */
export interface AcpConnection {
    /**
     * Resolves with the validated initialize exchange once initialization
     * succeeds, or rejects if initialization or the connection fails.
     */
    readonly initialized: Promise<InitializationSnapshot>;
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
 * Experimental draft ACP v2 agent-side connection returned by
 * `AgentApp.connect(...)`.
 *
 * Use `client` to call client-side ACP methods for the lifetime of the
 * connection.
 *
 * @experimental
 */
export interface AgentConnection extends AcpConnection {
    /**
     * Context for calling client-side ACP methods.
     */
    readonly client: AgentContext;
}
/**
 * Experimental draft ACP v2 client-side connection returned by
 * `ClientApp.connect(...)`.
 *
 * Use `agent` to call agent-side ACP methods and session helpers for the
 * lifetime of the connection.
 *
 * @experimental
 */
export interface ClientConnection extends AcpConnection {
    /**
     * Context for calling agent-side ACP methods.
     */
    readonly agent: ClientContext;
}
/**
 * One batch entry sent to an ACP v2 agent.
 *
 * @experimental
 */
export type AgentBatchEntry<Method extends string = string> = {
    [Method in AgentRequestMethod]: BatchRequest<AgentRequestParamsByMethod[Method], AgentRequestResponsesByMethod[Method], unknown> & {
        readonly method: Method;
    };
}[AgentRequestMethod] | {
    [Method in AgentNotificationMethod]: BatchNotification<AgentNotificationParamsByMethod[Method]> & {
        readonly method: Method;
    };
}[AgentNotificationMethod] | (BatchNotification<schema.CancelRequestNotification> & {
    readonly method: typeof schema.PROTOCOL_METHODS.cancel_request;
}) | (BatchRequest<unknown, never, unknown> & {
    readonly method: ExtensionMethod | UnrecognizedMethod<Method>;
}) | (BatchNotification<unknown> & {
    readonly method: ExtensionMethod | UnrecognizedMethod<Method>;
});
/**
 * One batch entry sent to an ACP v2 client.
 *
 * @experimental
 */
export type ClientBatchEntry<Method extends string = string> = {
    [Method in ClientRequestMethod]: BatchRequest<ClientRequestParamsByMethod[Method], ClientRequestResponsesByMethod[Method], unknown> & {
        readonly method: Method;
    };
}[ClientRequestMethod] | {
    [Method in ClientNotificationMethod]: BatchNotification<ClientNotificationParamsByMethod[Method]> & {
        readonly method: Method;
    };
}[ClientNotificationMethod] | (BatchNotification<schema.CancelRequestNotification> & {
    readonly method: typeof schema.PROTOCOL_METHODS.cancel_request;
}) | (BatchRequest<unknown, never, unknown> & {
    readonly method: ExtensionMethod | UnrecognizedMethod<Method>;
}) | (BatchNotification<unknown> & {
    readonly method: ExtensionMethod | UnrecognizedMethod<Method>;
});
declare class AcpContext {
    private readonly cx;
    private readonly currentRequestId?;
    /**
     * Validated initialize exchange, once this connection is initialized.
     */
    get initialized(): Promise<InitializationSnapshot>;
    /**
     * JSON-RPC id of the request currently being handled.
     *
     * This is `undefined` for notification handlers and for contexts created
     * outside an inbound request, such as `connect(...)` and `connectWith(...)`.
     */
    get requestId(): JsonRpcId | undefined;
}
/**
 * Experimental draft ACP v2 context passed to agent-side handlers.
 *
 * Agents use this context to call client-side ACP methods while handling
 * requests such as `session/prompt`.
 *
 * @experimental
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
    request<Response = unknown, Params = unknown>(method: ExtensionMethod, params?: Params, options?: SendRequestOptions): Promise<Response>;
    request<Response = unknown, Params = unknown, const Method extends string = never>(method: UnrecognizedMethod<Method>, params?: Params, options?: SendRequestOptions): Promise<Response>;
    /**
     * Sends a notification to the client by ACP method name.
     *
     * Built-in method literals infer their params type. Custom notifications can
     * specify their params type with a generic.
     */
    notify<Method extends ClientNotificationMethod>(method: Method, params: ClientNotificationParamsByMethod[Method]): Promise<void>;
    notify(method: typeof schema.PROTOCOL_METHODS.cancel_request, params: schema.CancelRequestNotification): Promise<void>;
    notify<Params = unknown>(method: ExtensionMethod, params?: Params): Promise<void>;
    notify<Params = unknown, const Method extends string = never>(method: UnrecognizedMethod<Method>, params?: Params): Promise<void>;
    /**
     * Sends requests and notifications to the client as one JSON-RPC batch.
     */
    batch<const Entries extends readonly BatchEntry[]>(entries: Entries & {
        readonly 0: BatchEntry;
    } & {
        [Index in keyof Entries]: Entries[Index] extends BatchEntry ? string extends Entries[Index]["method"] ? Entries[Index] : Entries[Index]["method"] extends AgentRequestMethod | AgentNotificationMethod | ClientRequestMethod | ClientNotificationMethod | typeof schema.PROTOCOL_METHODS.cancel_request ? Entries[Index] extends ClientBatchEntry<never> ? Entries[Index] : never : Entries[Index] : never;
    }): Promise<BatchOutputs<Entries>>;
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
export declare class ClientContext extends AcpContext {
    private readonly closeOnInitializationFailure?;
    private constructor();
    /**
     * Creates a builder for starting and observing an ACP session.
     *
     * Pass an absolute path for the common case where only `cwd` is needed, or
     * pass a full `NewSessionRequest` when you need MCP servers, `_meta`, or
     * additional session fields.
     */
    buildSession(cwd: schema.AbsolutePath): SessionBuilder;
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
    request<Response = unknown, Params = unknown>(method: ExtensionMethod, params?: Params, options?: SendRequestOptions): Promise<Response>;
    request<Response = unknown, Params = unknown, const Method extends string = never>(method: UnrecognizedMethod<Method>, params?: Params, options?: SendRequestOptions): Promise<Response>;
    /**
     * Sends a notification to the agent by ACP method name.
     *
     * Built-in method literals infer their params type. Custom notifications can
     * specify their params type with a generic.
     */
    notify<Method extends AgentNotificationMethod>(method: Method, params: AgentNotificationParamsByMethod[Method]): Promise<void>;
    notify(method: typeof schema.PROTOCOL_METHODS.cancel_request, params: schema.CancelRequestNotification): Promise<void>;
    notify<Params = unknown>(method: ExtensionMethod, params?: Params): Promise<void>;
    notify<Params = unknown, const Method extends string = never>(method: UnrecognizedMethod<Method>, params?: Params): Promise<void>;
    /**
     * Sends requests and notifications to the agent as one JSON-RPC batch.
     */
    batch<const Entries extends readonly BatchEntry[]>(entries: Entries & {
        readonly 0: BatchEntry;
    } & {
        [Index in keyof Entries]: Entries[Index] extends BatchEntry ? string extends Entries[Index]["method"] ? Entries[Index] : Entries[Index]["method"] extends AgentRequestMethod | AgentNotificationMethod | ClientRequestMethod | ClientNotificationMethod | typeof schema.PROTOCOL_METHODS.cancel_request ? Entries[Index] extends AgentBatchEntry<never> ? Entries[Index] : never : Entries[Index] : never;
    }): Promise<BatchOutputs<Entries>>;
}
/**
 * Experimental draft ACP v2 message produced by an `ActiveSession`.
 *
 * `session_update` messages expose the typed `session/update` notification and
 * `stop` messages report an idle `state_update`. A prompt turn is complete once
 * a `stop` message is returned.
 *
 * @experimental
 */
export type ActiveSessionMessage = {
    /**
     * Indicates that this message came from a `session/update` notification.
     */
    kind: "session_update";
    /**
     * Full notification sent by the agent.
     */
    notification: schema.UpdateSessionNotification;
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
     * Full notification containing the idle state update.
     */
    notification: schema.UpdateSessionNotification;
    /**
     * Convenience alias for `notification.update`.
     */
    update: schema.SessionUpdate;
    /**
     * Stop reason reported by the idle state, when provided.
     */
    stopReason: schema.StopReason | null | undefined;
};
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
    withAdditionalDirectories(additionalDirectories: schema.AbsolutePath[]): this;
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
 * Experimental draft ACP v2 convenience wrapper for an active session.
 *
 * An active session routes `session/update` notifications for one session ID
 * into an async queue. Use `prompt(...)` to send user content, then read updates
 * with `nextUpdate()` until a `stop` message is returned.
 *
 * @experimental
 */
export declare class ActiveSession {
    private cx;
    private sessionResponse;
    private updates;
    private registrations;
    private latestPrompt?;
    private constructor();
    /**
     * Session ID returned by `session/new`.
     */
    get sessionId(): schema.SessionId;
    /**
     * Configuration options returned when the session was created, if provided.
     */
    get configOptions(): Array<schema.SessionConfigOption> | undefined;
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
     * wrapped in an array. The returned promise resolves when the agent accepts
     * the prompt. Completion is reported separately by an idle `state_update`,
     * which is queued as a `stop` message for `nextUpdate()`.
     */
    prompt(prompt: string | schema.ContentBlock | Array<schema.ContentBlock>, options?: SendRequestOptions): Promise<schema.PromptResponse>;
    /**
     * Reads the next update or stop message for this session.
     */
    nextUpdate(): Promise<ActiveSessionMessage>;
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
    [schema.AGENT_METHODS.auth_login]: AgentRequestHandler<schema.LoginAuthRequest, schema.LoginAuthResponse | void>;
    [schema.AGENT_METHODS.providers_list]: AgentRequestHandler<schema.ListProvidersRequest, schema.ListProvidersResponse>;
    [schema.AGENT_METHODS.providers_set]: AgentRequestHandler<schema.SetProviderRequest, schema.SetProviderResponse | void>;
    [schema.AGENT_METHODS.providers_disable]: AgentRequestHandler<schema.DisableProviderRequest, schema.DisableProviderResponse | void>;
    [schema.AGENT_METHODS.session_new]: AgentRequestHandler<schema.NewSessionRequest, schema.NewSessionResponse>;
    [schema.AGENT_METHODS.session_set_config_option]: AgentRequestHandler<schema.SetSessionConfigOptionRequest, schema.SetSessionConfigOptionResponse>;
    [schema.AGENT_METHODS.session_prompt]: AgentRequestHandler<schema.PromptRequest, schema.PromptResponse | void>;
    [schema.AGENT_METHODS.mcp_message]: AgentRequestHandler<schema.MessageMcpRequest, schema.MessageMcpResponse>;
    [schema.AGENT_METHODS.session_list]: AgentRequestHandler<schema.ListSessionsRequest, schema.ListSessionsResponse>;
    [schema.AGENT_METHODS.session_delete]: AgentRequestHandler<schema.DeleteSessionRequest, schema.DeleteSessionResponse | void>;
    [schema.AGENT_METHODS.session_fork]: AgentRequestHandler<schema.ForkSessionRequest, schema.ForkSessionResponse>;
    [schema.AGENT_METHODS.session_resume]: AgentRequestHandler<schema.ResumeSessionRequest, schema.ResumeSessionResponse>;
    [schema.AGENT_METHODS.session_close]: AgentRequestHandler<schema.CloseSessionRequest, schema.CloseSessionResponse | void>;
    [schema.AGENT_METHODS.auth_logout]: AgentRequestHandler<schema.LogoutAuthRequest, schema.LogoutAuthResponse | void>;
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
        .session_cancel]: AgentNotificationHandler<schema.CancelSessionNotification>;
    [schema.AGENT_METHODS
        .mcp_message]: AgentNotificationHandler<schema.MessageMcpNotification>;
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
    [schema.CLIENT_METHODS.mcp_connect]: ClientRequestHandler<schema.ConnectMcpRequest, schema.ConnectMcpResponse>;
    [schema.CLIENT_METHODS.mcp_message]: ClientRequestHandler<schema.MessageMcpRequest, schema.MessageMcpResponse>;
    [schema.CLIENT_METHODS.mcp_disconnect]: ClientRequestHandler<schema.DisconnectMcpRequest, schema.DisconnectMcpResponse | void>;
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
        .session_update]: ClientNotificationHandler<schema.UpdateSessionNotification>;
    [schema.CLIENT_METHODS
        .mcp_message]: ClientNotificationHandler<schema.MessageMcpNotification>;
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
 * Creates an agent-side app for the experimental draft ACP v2 API.
 *
 * Register request and notification handlers by ACP method name, then call
 * `connect(stream)` to serve an ACP client.
 *
 * @experimental
 */
export declare function agent(options?: AppOptions): AgentApp;
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
export declare class AgentApp {
    private readonly builder;
    private readonly connectHandlers;
    private hasInitializeHandler;
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
    onRequest<Params, Response>(method: ExtensionMethod, params: ParamsParser<Params>, handler: AgentRequestHandler<Params, Response>): this;
    onRequest<Params, Response, const Method extends string = never>(method: UnrecognizedMethod<Method>, params: ParamsParser<Params>, handler: AgentRequestHandler<Params, Response>): this;
    /**
     * Registers a notification handler by ACP method name.
     *
     * Built-in method literals infer their params type from `method`. Pass a
     * parser as the second argument to register custom extension notifications.
     */
    onNotification<Method extends AgentNotificationMethod>(method: Method, handler: AgentNotificationHandlersByMethod[Method]): this;
    onNotification<Params>(method: ExtensionMethod, params: ParamsParser<Params>, handler: AgentNotificationHandler<Params>): this;
    onNotification<Params, const Method extends string = never>(method: UnrecognizedMethod<Method>, params: ParamsParser<Params>, handler: AgentNotificationHandler<Params>): this;
    private request;
    private notification;
    private connectConnection;
    private openStreamConnection;
    private assertInitializeHandler;
}
/**
 * Creates a client-side app for the experimental draft ACP v2 API.
 *
 * Register request and notification handlers by ACP method name, then use
 * `connectWith(...)` to run the workflow that calls agent-side methods.
 *
 * @experimental
 */
export declare function client(options?: AppOptions): ClientApp;
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
    onRequest<Params, Response>(method: ExtensionMethod, params: ParamsParser<Params>, handler: ClientRequestHandler<Params, Response>): this;
    onRequest<Params, Response, const Method extends string = never>(method: UnrecognizedMethod<Method>, params: ParamsParser<Params>, handler: ClientRequestHandler<Params, Response>): this;
    /**
     * Registers a client notification handler by ACP method name.
     *
     * Built-in method literals infer their params type from `method`. Pass a
     * parser as the second argument to register custom extension notifications.
     */
    onNotification<Method extends ClientNotificationMethod>(method: Method, handler: ClientNotificationHandlersByMethod[Method]): this;
    onNotification<Params>(method: ExtensionMethod, params: ParamsParser<Params>, handler: ClientNotificationHandler<Params>): this;
    onNotification<Params, const Method extends string = never>(method: UnrecognizedMethod<Method>, params: ParamsParser<Params>, handler: ClientNotificationHandler<Params>): this;
    private request;
    private notification;
    private connectConnection;
    private openStreamConnection;
}
