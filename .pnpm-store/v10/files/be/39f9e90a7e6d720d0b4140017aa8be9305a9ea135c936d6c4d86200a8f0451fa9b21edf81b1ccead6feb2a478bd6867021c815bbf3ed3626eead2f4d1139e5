import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { TOGETHER_MODELS } from "./together.models.js";
export function togetherProvider() {
    return createProvider({
        id: "together",
        name: "Together",
        baseUrl: "https://api.together.ai/v1",
        auth: { apiKey: envApiKeyAuth("Together API key", ["TOGETHER_API_KEY"]) },
        models: Object.values(TOGETHER_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=together.js.map