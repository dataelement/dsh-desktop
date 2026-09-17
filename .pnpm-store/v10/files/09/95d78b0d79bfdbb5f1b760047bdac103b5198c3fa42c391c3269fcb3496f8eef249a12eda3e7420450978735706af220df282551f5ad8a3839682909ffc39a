import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { NVIDIA_MODELS } from "./nvidia.models.js";
export function nvidiaProvider() {
    return createProvider({
        id: "nvidia",
        name: "NVIDIA",
        baseUrl: "https://integrate.api.nvidia.com/v1",
        auth: { apiKey: envApiKeyAuth("NVIDIA API key", ["NVIDIA_API_KEY"]) },
        models: Object.values(NVIDIA_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=nvidia.js.map