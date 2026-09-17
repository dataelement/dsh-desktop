import { anthropicMessagesApi } from "../api/anthropic-messages.lazy.js";
import { lazyOAuth } from "../auth/helpers.js";
import { loadAnthropicOAuth } from "../auth/oauth/load.js";
import { ANTHROPIC_API_KEY_ENV, ANTHROPIC_AUTH_TOKEN_ENV, ANTHROPIC_OAUTH_TOKEN_ENV } from "../env-api-keys.js";
import { createProvider } from "../models.js";
import { ANTHROPIC_MODELS } from "./anthropic.models.js";
function anthropicApiKeyAuth() {
    return {
        name: "Anthropic API key",
        login: async (interaction) => {
            interaction.signal.throwIfAborted();
            const key = await interaction.prompt({ type: "secret", message: "Enter Anthropic API key" });
            interaction.signal.throwIfAborted();
            return { type: "api_key", key };
        },
        resolve: async ({ ctx, credential, signal }) => {
            signal.throwIfAborted();
            if (credential?.key) {
                return { auth: { apiKey: credential.key }, env: credential.env, source: "stored credential" };
            }
            const authToken = await ctx.env(ANTHROPIC_AUTH_TOKEN_ENV);
            signal.throwIfAborted();
            if (authToken) {
                return {
                    auth: { headers: { Authorization: `Bearer ${authToken}` } },
                    source: ANTHROPIC_AUTH_TOKEN_ENV,
                };
            }
            for (const envVar of [ANTHROPIC_OAUTH_TOKEN_ENV, ANTHROPIC_API_KEY_ENV]) {
                const apiKey = await ctx.env(envVar);
                signal.throwIfAborted();
                if (apiKey)
                    return { auth: { apiKey }, source: envVar };
            }
            return undefined;
        },
    };
}
export function anthropicProvider() {
    return createProvider({
        id: "anthropic",
        name: "Anthropic",
        baseUrl: "https://api.anthropic.com",
        auth: {
            apiKey: anthropicApiKeyAuth(),
            oauth: lazyOAuth({
                name: "Anthropic (Claude Pro/Max)",
                isSubscription: true,
                load: loadAnthropicOAuth,
            }),
        },
        models: Object.values(ANTHROPIC_MODELS),
        api: anthropicMessagesApi(),
    });
}
//# sourceMappingURL=anthropic.js.map