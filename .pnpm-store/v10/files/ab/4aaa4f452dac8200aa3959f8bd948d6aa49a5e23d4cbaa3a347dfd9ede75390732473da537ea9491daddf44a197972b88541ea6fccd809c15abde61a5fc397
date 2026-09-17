import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { XIAOMI_TOKEN_PLAN_SGP_MODELS } from "./xiaomi-token-plan-sgp.models.js";
export function xiaomiTokenPlanSgpProvider() {
    return createProvider({
        id: "xiaomi-token-plan-sgp",
        name: "Xiaomi Token Plan SGP",
        baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1",
        auth: { apiKey: envApiKeyAuth("Xiaomi Token Plan SGP API key", ["XIAOMI_TOKEN_PLAN_SGP_API_KEY"]) },
        models: Object.values(XIAOMI_TOKEN_PLAN_SGP_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=xiaomi-token-plan-sgp.js.map