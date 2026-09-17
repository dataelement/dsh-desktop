import { anthropicOAuth } from "./auth/oauth/anthropic.js";
import { githubCopilotOAuth } from "./auth/oauth/github-copilot.js";
import { kimiCodingOAuth } from "./auth/oauth/kimi-coding.js";
import { registerBundledOAuthFlowLoaders } from "./auth/oauth/load.js";
import { openaiCodexOAuth } from "./auth/oauth/openai-codex.js";
import { openRouterOAuth } from "./auth/oauth/openrouter.js";
import { createRadiusOAuth } from "./auth/oauth/radius.js";
import { xaiOAuth } from "./auth/oauth/xai.js";
/** Register OAuth flows statically embedded in the standalone Bun binary. */
export function registerBunOAuthFlows() {
    registerBundledOAuthFlowLoaders({
        anthropic: () => anthropicOAuth,
        openaiCodex: () => openaiCodexOAuth,
        githubCopilot: () => githubCopilotOAuth,
        openrouter: () => openRouterOAuth,
        kimiCoding: () => kimiCodingOAuth,
        xai: () => xaiOAuth,
        radius: createRadiusOAuth,
    });
}
//# sourceMappingURL=bun-oauth.js.map