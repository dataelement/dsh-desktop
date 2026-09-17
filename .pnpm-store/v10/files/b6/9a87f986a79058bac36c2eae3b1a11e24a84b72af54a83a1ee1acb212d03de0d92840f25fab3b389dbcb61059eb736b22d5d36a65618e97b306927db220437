import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.js";
import { openAICompletionsApi } from "../api/openai-completions.lazy.js";
import { openAIResponsesApi } from "../api/openai-responses.lazy.js";
import { createProvider } from "../models.js";
import { CLOUDFLARE_AI_GATEWAY_MODELS } from "./cloudflare-ai-gateway.models.js";
import { cloudflareAIGatewayAuth } from "./cloudflare-auth.js";
import { cloudflareStreams } from "./cloudflare-stream.js";
export function cloudflareAIGatewayProvider() {
    // The api map is pinned to all three APIs: models.dev's gateway catalog drops and
    // restores `workers-ai/*` (openai-completions) entries over time, and inference from
    // `models` alone would otherwise reject the openai-completions entry whenever the
    // generated catalog happens to contain none.
    return createProvider({
        id: "cloudflare-ai-gateway",
        name: "Cloudflare AI Gateway",
        auth: { apiKey: cloudflareAIGatewayAuth() },
        models: Object.values(CLOUDFLARE_AI_GATEWAY_MODELS),
        api: {
            "anthropic-messages": cloudflareStreams(anthropicMessagesApi()),
            "openai-completions": cloudflareStreams(openAICompletionsApi()),
            "openai-responses": cloudflareStreams(openAIResponsesApi()),
        },
    });
}
//# sourceMappingURL=cloudflare-ai-gateway.js.map