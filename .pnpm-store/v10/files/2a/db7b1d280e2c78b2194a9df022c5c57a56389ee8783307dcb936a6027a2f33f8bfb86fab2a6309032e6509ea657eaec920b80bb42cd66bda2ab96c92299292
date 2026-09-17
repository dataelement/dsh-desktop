/**
 * OpenRouter OAuth PKCE flow.
 *
 * OpenRouter exchanges an authorization code for a permanent, user-controlled
 * API key rather than an expiring access/refresh token pair. The callback is
 * handled by a one-shot loopback server on an ephemeral port, raced against a
 * manual prompt so remote/headless sessions can paste the redirect URL when
 * the browser cannot reach the loopback server.
 *
 * NOTE: This module uses Node.js http.createServer for the OAuth callback server.
 * It is only intended for CLI use, not browser environments.
 */
import type { OAuthAuth } from "../types.ts";
export declare const openRouterOAuth: OAuthAuth;
//# sourceMappingURL=openrouter.d.ts.map