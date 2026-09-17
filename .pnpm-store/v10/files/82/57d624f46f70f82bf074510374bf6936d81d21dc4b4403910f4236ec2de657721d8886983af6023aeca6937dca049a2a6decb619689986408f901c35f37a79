import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { ANT_LING_MODELS } from "./ant-ling.models.js";
export function antLingProvider() {
    return createProvider({
        id: "ant-ling",
        name: "Ant Ling",
        baseUrl: "https://api.ant-ling.com/v1",
        auth: { apiKey: envApiKeyAuth("Ant Ling API key", ["ANT_LING_API_KEY"]) },
        models: Object.values(ANT_LING_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=ant-ling.js.map