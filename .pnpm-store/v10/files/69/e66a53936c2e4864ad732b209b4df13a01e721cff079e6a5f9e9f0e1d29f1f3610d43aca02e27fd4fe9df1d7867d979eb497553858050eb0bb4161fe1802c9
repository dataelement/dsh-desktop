import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { ZAI_MODELS } from "./zai.models.js";
export function zaiProvider() {
    return createProvider({
        id: "zai",
        name: "Z.AI",
        baseUrl: "https://api.z.ai/api/coding/paas/v4",
        auth: { apiKey: envApiKeyAuth("Z.AI API key", ["ZAI_API_KEY"]) },
        models: Object.values(ZAI_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=zai.js.map