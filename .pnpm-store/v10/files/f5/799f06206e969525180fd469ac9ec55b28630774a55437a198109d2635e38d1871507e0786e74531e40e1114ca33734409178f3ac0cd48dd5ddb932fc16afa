import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { createProvider } from "../models.js";
import { cloudflareWorkersAIAuth } from "./cloudflare-auth.js";
import { cloudflareStreams } from "./cloudflare-stream.js";
import { CLOUDFLARE_WORKERS_AI_MODELS } from "./cloudflare-workers-ai.models.js";
export function cloudflareWorkersAIProvider() {
    return createProvider({
        id: "cloudflare-workers-ai",
        name: "Cloudflare Workers AI",
        auth: { apiKey: cloudflareWorkersAIAuth() },
        models: Object.values(CLOUDFLARE_WORKERS_AI_MODELS),
        api: cloudflareStreams(openAICompletionsApi()),
    });
}
//# sourceMappingURL=cloudflare-workers-ai.js.map