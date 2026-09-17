import { openAICodexResponsesApi } from "../api/openai-codex-responses.lazy.js";
import { lazyOAuth } from "../auth/helpers.js";
import { loadOpenAICodexOAuth } from "../auth/oauth/load.js";
import { createProvider } from "../models.js";
import { OPENAI_CODEX_MODELS } from "./openai-codex.models.js";
export function openaiCodexProvider() {
    return createProvider({
        id: "openai-codex",
        name: "OpenAI Codex",
        baseUrl: "https://chatgpt.com/backend-api",
        auth: {
            oauth: lazyOAuth({
                name: "OpenAI (ChatGPT Plus/Pro)",
                isSubscription: true,
                load: loadOpenAICodexOAuth,
            }),
        },
        models: Object.values(OPENAI_CODEX_MODELS),
        api: openAICodexResponsesApi(),
    });
}
//# sourceMappingURL=openai-codex.js.map