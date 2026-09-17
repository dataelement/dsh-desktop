import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { MINIMAX_MODELS } from "./minimax.models.js";
export function minimaxProvider() {
    return createProvider({
        id: "minimax",
        name: "MiniMax",
        baseUrl: "https://api.minimax.io/anthropic",
        auth: { apiKey: envApiKeyAuth("MiniMax API key", ["MINIMAX_API_KEY"]) },
        models: Object.values(MINIMAX_MODELS),
        api: anthropicMessagesApi(),
    });
}
//# sourceMappingURL=minimax.js.map