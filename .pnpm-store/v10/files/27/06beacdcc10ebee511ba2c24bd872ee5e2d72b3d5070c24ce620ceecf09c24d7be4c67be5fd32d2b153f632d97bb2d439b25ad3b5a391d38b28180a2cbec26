import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { envApiKeyAuth } from "../auth/helpers.js";
import { createProvider } from "../models.js";
import { GROQ_MODELS } from "./groq.models.js";
export function groqProvider() {
    return createProvider({
        id: "groq",
        name: "Groq",
        baseUrl: "https://api.groq.com/openai/v1",
        auth: { apiKey: envApiKeyAuth("Groq API key", ["GROQ_API_KEY"]) },
        models: Object.values(GROQ_MODELS),
        api: openAICompletionsApi(),
    });
}
//# sourceMappingURL=groq.js.map