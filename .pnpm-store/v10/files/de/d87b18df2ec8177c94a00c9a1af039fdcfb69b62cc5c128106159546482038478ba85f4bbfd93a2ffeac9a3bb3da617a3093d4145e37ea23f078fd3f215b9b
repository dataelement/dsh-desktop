import type { ApiKeyAuth, OAuthAuth } from "./types.ts";
/**
 * Standard api-key auth: a stored credential key wins, otherwise the first
 * set env var resolves. Includes a `login` that prompts for the key.
 * Providers with non-standard resolution (provider env, ambient files, IAM)
 * write their own `ApiKeyAuth`.
 */
export declare function envApiKeyAuth(name: string, envVars: readonly string[]): ApiKeyAuth;
/**
 * Wraps a dynamically imported `OAuthAuth` so provider definitions can
 * advertise OAuth without importing the implementation. The flow loads on
 * first `login`/`refresh`/`toAuth` call; callers keep Node-only flow code out
 * of bundles by loading through a bundler-opaque dynamic import (variable
 * specifier, see the bedrock lazy wrapper).
 */
export declare function lazyOAuth(input: {
    name: string;
    isSubscription?: boolean;
    loginLabel?: string;
    load: () => Promise<OAuthAuth>;
}): OAuthAuth;
//# sourceMappingURL=helpers.d.ts.map