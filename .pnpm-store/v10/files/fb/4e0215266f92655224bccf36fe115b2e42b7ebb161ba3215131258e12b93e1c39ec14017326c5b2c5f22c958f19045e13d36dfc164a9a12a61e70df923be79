/** Browser-session authentication for the Host Connection carrier. */
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials';
import type { ConnectionIndexRequest, ConnectionIndexResponse, ConnectionTrustRequest } from './rpc.ts';
/**
 * Process launch-token exchange and persistent signed-cookie verification.
 * Connection loads the credential provider's signing secret during activation
 * and retains it for synchronous request authentication.
 */
export declare class BrowserAuth {
    private readonly secret;
    private readonly launchToken;
    private readonly maxAgeMilliseconds;
    private constructor();
    /**
     * Initialize browser authentication and create its durable signing secret
     * when this Harness home has none.
     * @param processOwner - root application context retaining one token across Connection reloads.
     * @param credentials - persistent credential provider for the Web profile.
     * @param maxAgeDays - positive absolute browser-cookie lifetime in days.
     * @returns initialized authentication owner with the process owner's launch token.
     */
    static create(processOwner: object, credentials: CredentialProvider, maxAgeDays: number): Promise<BrowserAuth>;
    /**
     * Add this process's launch token to the ordinary application root URL.
     * @param baseUrl - canonical browser origin without credentials.
     * @returns root URL carrying the process token as its sole authentication input.
     */
    authenticatedUrl(baseUrl: string): string;
    /**
     * Authenticate an index request. A valid root query token mints the cookie
     * and redirects to clean `/`; a valid cookie lets the caller serve the
     * index; every other request receives the same minimal 401 response.
     * @param req - incoming root or configured-index request.
     * @param res - response owned when this method returns false.
     * @returns true only when the caller may serve index.html.
     */
    authorizeIndex(req: ConnectionIndexRequest, res: ConnectionIndexResponse): boolean;
    /**
     * Verify the authority-bound browser cookie on a Host request.
     * @param request - request headers carrying Host and Cookie.
     * @returns true only for an unexpired cookie signed by this activation's loaded secret.
     */
    isAuthenticated(request: ConnectionTrustRequest): boolean;
    private writeUnauthorized;
}
//# sourceMappingURL=browser-auth.d.ts.map