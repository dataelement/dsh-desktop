import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS } from "./qwen-token-plan-individual.models.js";
export function qwenTokenPlanIndividualProvider() {
    return createProvider({
        id: "qwen-token-plan-individual",
        name: "Qwen Token Plan Individual",
        baseUrl: "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        auth: { apiKey: envApiKeyAuth("Qwen Token Plan Individual API key", ["QWEN_TOKEN_PLAN_API_KEY"]) },
        models: Object.values(QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=qwen-token-plan-individual.js.map