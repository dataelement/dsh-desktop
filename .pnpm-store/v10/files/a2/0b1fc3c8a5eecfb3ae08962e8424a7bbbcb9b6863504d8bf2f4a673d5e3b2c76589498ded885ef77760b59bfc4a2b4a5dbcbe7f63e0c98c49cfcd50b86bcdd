/** Browser registry for read-only Cordis capability providers. */
import type { Context } from '@deepseek-ai/cordis';
import type { CordisInspectProviderManifest, CordisInspectQueryRequest, CordisInspectQueryResolution, CordisInspectRequestId, SessionId } from '@deepseek-ai/dsh-api-remotes/client';
import type { JsonValue } from '@deepseek-ai/dsh-util-values';
/** Context supplied to a Client inspect provider query. */
export interface ClientCordisInspectQueryContext {
    /** Cancellation broadcast by the Host. */
    signal: AbortSignal;
    /** Session whose model requested the query. */
    sessionId: SessionId;
}
/** Client provider registration retained beside its serializable manifest. */
export interface ClientCordisInspectProviderRegistration {
    /** Provider and explicit query directory. */
    manifest: CordisInspectProviderManifest;
    /** Execute one declared read-only method. */
    query(method: string, input: JsonValue | undefined, context: ClientCordisInspectQueryContext): Promise<JsonValue>;
}
/** Remote operations needed by the Client registry. */
export interface ClientCordisInspectHost {
    /** Replace the Host's mirrored Client manifest. */
    sync(providers: readonly CordisInspectProviderManifest[]): Promise<void>;
    /** Submit one query result; the first accepted page wins. */
    resolve(sessionId: SessionId, requestId: CordisInspectRequestId, resolution: CordisInspectQueryResolution): Promise<void>;
}
/** Client provider registry, manifest publisher, and live query dispatcher. */
export declare class ClientCordisInspectRegistry {
    private readonly host;
    private readonly providers;
    private readonly active;
    private publishQueued;
    private syncChain;
    /** @param host - folded manifest and query result transport. */
    constructor(host: ClientCordisInspectHost);
    /**
     * Register one Client provider and publish a new complete manifest.
     * @param registration - provider manifest and local handler.
     * @returns idempotent disposer.
     */
    register(registration: ClientCordisInspectProviderRegistration): () => void;
    /** Publish the current complete manifest, including after reconnect. */
    publish(): void;
    /**
     * Execute and answer one Host-broadcast query.
     * @param request - exact provider query and Session correlation received from Host.
     * @returns after the first local result has been sent back to Host.
     */
    query(request: CordisInspectQueryRequest): Promise<void>;
    /**
     * Cancel local work after another page answered or the Tool call ended.
     * @param requestId - query correlation that is no longer answerable.
     */
    close(requestId: CordisInspectRequestId): void;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Browser registry for pre-definition Cordis capability discovery. */
        cordisInspect: ClientCordisInspectRegistry;
    }
}
/**
 * Provide the registry as a normal Client service.
 * @param ctx - Client Cordis context receiving the service.
 * @param registry - page-local inspect registry to publish.
 */
export declare function provideClientCordisInspect(ctx: Context, registry: ClientCordisInspectRegistry): void;
//# sourceMappingURL=inspect-registry.d.ts.map