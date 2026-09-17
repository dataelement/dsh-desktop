import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { XIAOMI_TOKEN_PLAN_CN_MODELS } from "./xiaomi-token-plan-cn.models.js";
export function xiaomiTokenPlanCnProvider() {
    return createProvider({
        id: "xiaomi-token-plan-cn",
        name: "Xiaomi Token Plan CN",
        baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
        auth: { apiKey: envApiKeyAuth("Xiaomi Token Plan CN API key", ["XIAOMI_TOKEN_PLAN_CN_API_KEY"]) },
        models: Object.values(XIAOMI_TOKEN_PLAN_CN_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=xiaomi-token-plan-cn.js.map