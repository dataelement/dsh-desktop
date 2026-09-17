import type { ProviderEnv } from "../types.ts";
import type { AuthContext, AuthResult, CredentialStore, ProviderAuth } from "./types.ts";
export type ModelsErrorCode = "model_source" | "model_validation" | "provider" | "stream" | "auth" | "oauth";
export interface AuthResolutionOverrides {
    apiKey?: string;
    env?: ProviderEnv;
    /** Require this much remaining OAuth-token validity; defaults to five minutes. */
    minOAuthValidityMs?: number;
    signal?: AbortSignal;
}
export declare class ModelsError extends Error {
    readonly code: ModelsErrorCode;
    constructor(code: ModelsErrorCode, message: string, options?: {
        cause?: unknown;
    });
}
/**
 * Auth resolution shared by the `Models` and `ImagesModels` collections.
 * A stored credential owns the provider: ambient/env is consulted only when
 * nothing is stored. No silent env fallback after a failed refresh or for a
 * credential type without a matching handler.
 */
export declare function resolveProviderAuth(provider: {
    id: string;
    auth: ProviderAuth;
}, credentials: CredentialStore, authContext: AuthContext, overrides?: AuthResolutionOverrides): Promise<AuthResult | undefined>;
//# sourceMappingURL=resolve.d.ts.map