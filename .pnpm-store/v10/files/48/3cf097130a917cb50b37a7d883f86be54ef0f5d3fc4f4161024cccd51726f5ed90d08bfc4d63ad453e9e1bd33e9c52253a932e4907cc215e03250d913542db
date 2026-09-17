import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.js";
import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { openAIResponsesApi } from "../api/openai-responses.lazy.js";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.js";
import { loadGitHubCopilotOAuth } from "../auth/oauth/load.js";
import { createProvider } from "../models.js";
import { GITHUB_COPILOT_MODELS } from "./github-copilot.models.js";
export function githubCopilotProvider() {
    return createProvider({
        id: "github-copilot",
        name: "GitHub Copilot",
        baseUrl: "https://api.individual.githubcopilot.com",
        auth: {
            apiKey: envApiKeyAuth("GitHub Copilot token", ["COPILOT_GITHUB_TOKEN"]),
            oauth: lazyOAuth({ name: "GitHub Copilot", isSubscription: true, load: loadGitHubCopilotOAuth }),
        },
        models: Object.values(GITHUB_COPILOT_MODELS),
        filterModels: (models, credential) => {
            if (credential?.type !== "oauth")
                return models;
            const availableModelIds = credential.availableModelIds;
            if (!Array.isArray(availableModelIds) || !availableModelIds.every((id) => typeof id === "string")) {
                return models;
            }
            const available = new Set(availableModelIds);
            return models.filter((model) => available.has(model.id));
        },
        api: {
            "anthropic-messages": anthropicMessagesApi(),
            "openai-completions": openAICompletionsApi(),
            "openai-responses": openAIResponsesApi(),
        },
    });
}
//# sourceMappingURL=github-copilot.js.map