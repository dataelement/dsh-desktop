import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { QWEN_TOKEN_PLAN_MODELS } from "./qwen-token-plan.models.js";
export function qwenTokenPlanProvider() {
    return createProvider({
        id: "qwen-token-plan",
        name: "Qwen Token Plan",
        baseUrl: "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        auth: { apiKey: envApiKeyAuth("Qwen Token Plan API key", ["QWEN_TOKEN_PLAN_API_KEY"]) },
        models: Object.values(QWEN_TOKEN_PLAN_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=qwen-token-plan.js.map