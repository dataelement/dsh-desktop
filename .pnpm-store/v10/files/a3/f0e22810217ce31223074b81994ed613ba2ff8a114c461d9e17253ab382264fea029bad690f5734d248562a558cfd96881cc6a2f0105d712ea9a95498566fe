/** Host registry and HTTP adapter for generic Connection RPC channels. */
import { Context, Service } from '@deepseek-ai/cordis';
import type { BrowserAuth } from './browser-auth.ts';
import type { ConnectionIndexRequest, ConnectionIndexResponse, ConnectionFetchHandler, HostConnectionFetch, ConnectionRequestRejection, ConnectionTrustRequest, HostConnectionHandle, HostConnectionRpc } from './rpc.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host Connection transport and RPC registrations. */
        connection: HostConnectionHandle;
    }
}
/** Host Connection service whose channel registrations belong to the caller fiber. */
export declare class HostConnectionService extends Service implements HostConnectionHandle {
    private readonly trustedHosts;
    private readonly browserAuth;
    private readonly interceptors;
    private readonly fetchRoutes;
    /**
     * Provide the Host half over the active HTTP server.
     * @param ctx - owning Connection plugin context.
     * @param trustedHosts - deployment authorities accepted by the Host/Origin fence.
     * @param browserAuth - process token and persistent browser-session owner.
     */
    constructor(ctx: Context, trustedHosts: readonly string[], browserAuth: BrowserAuth);
    /** Generic channel registry scoped to the Context reading this service. */
    get rpc(): HostConnectionRpc;
    /** Exact Fetch-route registry scoped to the Context reading this service. */
    get fetch(): HostConnectionFetch;
    /** Apply the configured Host/Origin fence, then browser authentication. */
    requestRejection(request: ConnectionTrustRequest): ConnectionRequestRejection;
    /** Authenticate an index request through the process-token exchange or cookie. */
    authorizeIndex(request: ConnectionIndexRequest, response: ConnectionIndexResponse): boolean;
    /** Add this process's launch token to the clean application URL. */
    authenticatedUrl(baseUrl: string): string;
    /**
     * Compose one shared-channel Fetch handler from exact routes and its interceptor.
     * @param channel - shared channel mounted by Connection.
     * @returns Fetch handler that selects one owner or returns 404.
     */
    createSharedFetchHandler(channel: '/api'): ConnectionFetchHandler;
    private registerFetchRoute;
    private register;
    private registerInterceptor;
}
//# sourceMappingURL=rpc-host.d.ts.map