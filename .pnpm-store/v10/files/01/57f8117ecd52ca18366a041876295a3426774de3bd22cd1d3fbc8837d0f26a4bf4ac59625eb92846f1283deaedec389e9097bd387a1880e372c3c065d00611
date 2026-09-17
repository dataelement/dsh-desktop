import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.js";
import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { FIREWORKS_MODELS } from "./fireworks.models.js";
export function fireworksProvider() {
    return createProvider({
        id: "fireworks",
        name: "Fireworks",
        baseUrl: "https://api.fireworks.ai/inference",
        auth: { apiKey: envApiKeyAuth("Fireworks API key", ["FIREWORKS_API_KEY"]) },
        models: Object.values(FIREWORKS_MODELS),
        api: {
            "anthropic-messages": anthropicMessagesApi(),
            "openai-completions": openAICompletionsApi(),
        },
    });
}
//# sourceMappingURL=fireworks.js.map