import type { OAuthAuth } from "../types.ts";
type OAuthFlowLoaders = {
    anthropic: () => OAuthAuth | Promise<OAuthAuth>;
    openaiCodex: () => OAuthAuth | Promise<OAuthAuth>;
    githubCopilot: () => OAuthAuth | Promise<OAuthAuth>;
    openrouter: () => OAuthAuth | Promise<OAuthAuth>;
    kimiCoding: () => OAuthAuth | Promise<OAuthAuth>;
    xai: () => OAuthAuth | Promise<OAuthAuth>;
    radius: (options: {
        name: string;
        gateway: string;
    }) => OAuthAuth | Promise<OAuthAuth>;
};
/** Registers statically bundled OAuth flows for standalone Bun binaries. */
export declare function registerBundledOAuthFlowLoaders(loaders: OAuthFlowLoaders): void;
export declare const loadAnthropicOAuth: () => Promise<OAuthAuth>;
export declare const loadOpenAICodexOAuth: () => Promise<OAuthAuth>;
export declare const loadGitHubCopilotOAuth: () => Promise<OAuthAuth>;
export declare const loadOpenRouterOAuth: () => Promise<OAuthAuth>;
export declare const loadKimiCodingOAuth: () => Promise<OAuthAuth>;
export declare const loadXaiOAuth: () => Promise<OAuthAuth>;
export declare const loadRadiusOAuth: (options: {
    name: string;
    gateway: string;
}) => Promise<OAuthAuth>;
export {};
//# sourceMappingURL=load.d.ts.map