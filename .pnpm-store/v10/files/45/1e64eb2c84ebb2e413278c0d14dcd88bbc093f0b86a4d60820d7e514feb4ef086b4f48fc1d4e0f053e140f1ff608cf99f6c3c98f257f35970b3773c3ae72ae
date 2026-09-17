/**
 * JSON-RPC methods and notifications for out-of-process harness SDKs.
 * The surrounding context owns plugins, persistence, and configured adapters.
 *
 * @module @deepseek-ai/dsh-sdk-jsonrpc-server/server
 */
import type { Context } from '@deepseek-ai/cordis';
import type { InitializeParams, InitializeResult, JsonRpcTransportPeer, SessionPromptParams, SessionPromptResult } from '@deepseek-ai/dsh-sdk-protocol';
/** Deployment-specific status mapping for SDK turn and subagent outcomes. */
export interface HarnessSdkJsonRpcServerOptions {
    /** Report max-token termination as an accepted result instead of an infrastructure error. */
    maxTokensAsSuccess?: boolean;
}
/**
 * SDK server over one booted harness context and transport peer. Construction
 * subscribes to session, agent, and subagent lifecycle events until shutdown;
 * reinitialization is unsupported.
 */
export declare class HarnessSdkJsonRpcServer {
    private readonly ctx;
    private readonly transport;
    private readonly options;
    private cwd;
    private provider;
    private model;
    private reasoningEffort;
    private maxTokens;
    private llmFiber;
    private readonly sessions;
    private readonly sessionCreations;
    private readonly disposers;
    private shutdownTask;
    private shuttingDown;
    private initialized;
    constructor(ctx: Context, transport: JsonRpcTransportPeer, options?: HarnessSdkJsonRpcServerOptions);
    /**
     * Validate and configure the SDK route, mounting the DeepSeek fallback only when unowned.
     * @param params - SDK handshake parameters.
     * @returns server identity for the handshake.
     */
    initialize(params: InitializeParams): Promise<InitializeResult>;
    /**
     * Queue one identified prompt without assigning later activity to it.
     * @param params - target session and user content.
     * @returns the durable message identity.
     */
    prompt(params: SessionPromptParams): Promise<SessionPromptResult>;
    private assertLiveAgent;
    /**
     * Dispose server-owned agents, adapter, and subscriptions to quiescence.
     * The surrounding context remains running.
     * @returns empty JSON-RPC result.
     */
    shutdown(): Promise<Record<string, never>>;
    private performShutdown;
    /**
     * Dispatch one incoming JSON-RPC request to its typed handler. Throws (→ a
     * JSON-RPC error response) on an unknown method.
     * @param method - the JSON-RPC method name.
     * @param params - the raw params object from the wire.
     * @returns the handler's result, to be serialized as the response.
     */
    handleRequest(method: string, params: Record<string, unknown> | undefined): Promise<unknown>;
    private getOrCreateSession;
    private createSession;
    private hasAdapterFor;
}
//# sourceMappingURL=server.d.ts.map