import { azureOpenAIResponsesApi } from "../api/azure-openai-responses.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { AZURE_OPENAI_RESPONSES_MODELS } from "./azure-openai-responses.models.js";
export function azureOpenAIResponsesProvider() {
    return createProvider({
        id: "azure-openai-responses",
        name: "Azure OpenAI",
        auth: { apiKey: envApiKeyAuth("Azure OpenAI API key", ["AZURE_OPENAI_API_KEY"]) },
        models: Object.values(AZURE_OPENAI_RESPONSES_MODELS),
        api: azureOpenAIResponsesApi(),
    });
}
//# sourceMappingURL=azure-openai-responses.js.map