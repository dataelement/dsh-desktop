import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { MINIMAX_CN_MODELS } from "./minimax-cn.models.js";
export function minimaxCnProvider() {
    return createProvider({
        id: "minimax-cn",
        name: "MiniMax CN",
        baseUrl: "https://api.minimaxi.com/anthropic",
        auth: { apiKey: envApiKeyAuth("MiniMax CN API key", ["MINIMAX_CN_API_KEY"]) },
        models: Object.values(MINIMAX_CN_MODELS),
        api: anthropicMessagesApi(),
    });
}
//# sourceMappingURL=minimax-cn.js.map