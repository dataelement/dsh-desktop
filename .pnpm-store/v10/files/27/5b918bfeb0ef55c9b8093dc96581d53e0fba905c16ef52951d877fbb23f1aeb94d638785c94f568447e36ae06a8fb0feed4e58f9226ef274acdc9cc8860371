import { openAIResponsesApi } from "../api/openai-responses.lazy.js";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.js";
import { loadXaiOAuth } from "../auth/oauth/load.js";
import { createProvider } from "../models.js";
import { XAI_MODELS } from "./xai.models.js";
export function xaiProvider() {
    return createProvider({
        id: "xai",
        name: "xAI",
        baseUrl: "https://api.x.ai/v1",
        auth: {
            apiKey: envApiKeyAuth("xAI API key", ["XAI_API_KEY"]),
            oauth: lazyOAuth({
                name: "xAI (Grok/X subscription)",
                isSubscription: true,
                loginLabel: "Sign in with SuperGrok or X Premium",
                load: loadXaiOAuth,
            }),
        },
        models: Object.values(XAI_MODELS),
        api: openAIResponsesApi(),
    });
}
//# sourceMappingURL=xai.js.map