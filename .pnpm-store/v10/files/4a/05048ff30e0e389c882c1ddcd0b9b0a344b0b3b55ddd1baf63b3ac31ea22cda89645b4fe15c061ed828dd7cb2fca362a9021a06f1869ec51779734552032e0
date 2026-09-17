import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { XIAOMI_TOKEN_PLAN_AMS_MODELS } from "./xiaomi-token-plan-ams.models.js";
export function xiaomiTokenPlanAmsProvider() {
    return createProvider({
        id: "xiaomi-token-plan-ams",
        name: "Xiaomi Token Plan AMS",
        baseUrl: "https://token-plan-ams.xiaomimimo.com/v1",
        auth: { apiKey: envApiKeyAuth("Xiaomi Token Plan AMS API key", ["XIAOMI_TOKEN_PLAN_AMS_API_KEY"]) },
        models: Object.values(XIAOMI_TOKEN_PLAN_AMS_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=xiaomi-token-plan-ams.js.map