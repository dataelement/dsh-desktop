import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.js";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.js";
import { loadKimiCodingOAuth } from "../auth/oauth/load.js";
import { createProvider } from "../models.js";
import { KIMI_CODING_MODELS } from "./kimi-coding.models.js";
export function kimiCodingProvider() {
    return createProvider({
        id: "kimi-coding",
        name: "Kimi For Coding",
        baseUrl: "https://api.kimi.com/coding",
        auth: {
            apiKey: envApiKeyAuth("Kimi API key", ["KIMI_API_KEY"]),
            oauth: lazyOAuth({
                name: "Kimi Code (subscription)",
                isSubscription: true,
                loginLabel: "Sign in with Kimi Code",
                load: loadKimiCodingOAuth,
            }),
        },
        models: Object.values(KIMI_CODING_MODELS),
        api: anthropicMessagesApi(),
    });
}
//# sourceMappingURL=kimi-coding.js.map