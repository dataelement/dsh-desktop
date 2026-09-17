import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { HUGGINGFACE_MODELS } from "./huggingface.models.js";
export function huggingfaceProvider() {
    return createProvider({
        id: "huggingface",
        name: "Hugging Face",
        baseUrl: "https://router.huggingface.co/v1",
        auth: { apiKey: envApiKeyAuth("Hugging Face token", ["HF_TOKEN"]) },
        models: Object.values(HUGGINGFACE_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=huggingface.js.map