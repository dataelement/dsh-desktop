import { piMessagesApi } from "../api/pi-messages.lazy.js";
import { envApiKeyAuth, lazyOAuth } from "../auth/helpers.js";
import { loadRadiusOAuth } from "../auth/oauth/load.js";
import { DEFAULT_RADIUS_GATEWAY, getRadiusModels, getRadiusModelsFromConfig, loadRadiusGatewayConfig, normalizeRadiusGatewayUrl, } from "./radius-config.js";
/** Radius gateway provider with a persisted, dynamically refreshed catalog. */
export function radiusProvider(options = {}) {
    const id = options.id ?? "radius";
    const name = options.name ?? "Radius";
    const gateway = normalizeRadiusGatewayUrl(options.gateway ?? DEFAULT_RADIUS_GATEWAY);
    let models = getRadiusModels(id, undefined);
    const streams = piMessagesApi();
    return {
        id,
        name,
        auth: {
            apiKey: envApiKeyAuth("Radius API key", ["RADIUS_API_KEY"]),
            oauth: lazyOAuth({ name, load: () => loadRadiusOAuth({ name, gateway }) }),
        },
        getModels: () => models,
        refreshModels: async (context) => {
            const stored = context.stored;
            if (stored) {
                const restored = stored.models.filter((model) => model.provider === id);
                if (!(await context.publish({
                    update: () => {
                        models = restored;
                    },
                }))) {
                    return;
                }
            }
            // Import catalogs cached by the pre-ModelsStore Radius implementation.
            if (!stored && context.credential?.type === "oauth") {
                const legacy = getRadiusModels(id, context.credential);
                if (legacy.length > 0) {
                    if (!(await context.publish({
                        persist: { models: legacy, checkedAt: Date.now() },
                        update: () => {
                            models = legacy;
                        },
                    }))) {
                        return;
                    }
                }
            }
            if (!context.allowNetwork || context.signal.aborted)
                return;
            const apiKey = context.credential?.type === "oauth" ? context.credential.access : context.credential?.key;
            const config = await loadRadiusGatewayConfig(gateway, apiKey, context.signal);
            if (context.signal.aborted)
                return;
            const refreshed = getRadiusModelsFromConfig(id, config);
            await context.publish({
                persist: { models: refreshed, checkedAt: Date.now() },
                update: () => {
                    models = refreshed;
                },
            });
        },
        stream: (model, context, streamOptions) => streams.stream(model, context, streamOptions),
        streamSimple: (model, context, streamOptions) => streams.streamSimple(model, context, streamOptions),
    };
}
//# sourceMappingURL=radius.js.map