import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { DEEPSEEK_MODELS } from "./deepseek.models.js";
export function deepseekProvider() {
    return createProvider({
        id: "deepseek",
        name: "DeepSeek",
        baseUrl: "https://api.deepseek.com",
        auth: { apiKey: envApiKeyAuth("DeepSeek API key", ["DEEPSEEK_API_KEY"]) },
        models: Object.values(DEEPSEEK_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=deepseek.js.map