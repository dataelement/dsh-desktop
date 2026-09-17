import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { CEREBRAS_MODELS } from "./cerebras.models.js";
export function cerebrasProvider() {
    return createProvider({
        id: "cerebras",
        name: "Cerebras",
        baseUrl: "https://api.cerebras.ai/v1",
        auth: { apiKey: envApiKeyAuth("Cerebras API key", ["CEREBRAS_API_KEY"]) },
        models: Object.values(CEREBRAS_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=cerebras.js.map